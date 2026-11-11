const DEFAULT_TTL_MS = 2 * 60 * 1000;
const LAST_SEEN_UPDATE_MS = 10 * 1000;
const QUEUE_DOCUMENT_ID = 'queue';

/**
 * Cola de emparejamiento sobre Firestore.
 *
 * La cola vive en un único documento y se modifica con transacciones para que
 * dos jugadores que buscan partida a la vez nunca se emparejen dos veces ni se
 * queden sin pareja por una condición de carrera. Las partidas se guardan en
 * una colección aparte.
 */
export class MatchmakingRepositoryFirestore {
    constructor({
        client,
        now = () => Date.now(),
        ttlMs = DEFAULT_TTL_MS,
        queueCollectionName =
            process.env.MATCHMAKING_COLLECTION || 'matchmaking',
        matchesCollectionName =
            process.env.MATCHES_COLLECTION || 'matches'
    } = {}) {
        if (!client) {
            throw new Error(
                'MatchmakingRepositoryFirestore requiere un cliente Firestore'
            );
        }

        this.client = client;
        this.now = now;
        this.ttlMs = ttlMs;
        this.queueDoc = client
            .collection(queueCollectionName)
            .doc(QUEUE_DOCUMENT_ID);
        this.matchesCollection = client.collection(matchesCollectionName);
    }

    _entriesFrom(snapshot) {
        if (!snapshot.exists) return [];

        const data = snapshot.data() || {};
        return Array.isArray(data.entries) ? data.entries : [];
    }

    _isFresh(entry, now) {
        const lastSeen = Number(entry.lastSeenAt || entry.joinedAt || 0);
        return now - lastSeen <= this.ttlMs;
    }

    _freshEntries(entries, now) {
        return entries.filter(entry => this._isFresh(entry, now));
    }

    async _findActiveMatch(userId) {
        const snapshot = await this.matchesCollection
            .where('playerIds', 'array-contains', String(userId))
            .limit(10)
            .get();

        return (
            snapshot.docs
                .map(doc => doc.data())
                .find(match => match.status === 'active') || null
        );
    }

    async enqueueOrMatch(entry) {
        const existingMatch = await this._findActiveMatch(entry.userId);
        if (existingMatch) {
            return { status: 'matched', match: existingMatch };
        }

        return this.client.runTransaction(async transaction => {
            const now = this.now();
            const snapshot = await transaction.get(this.queueDoc);
            const entries = this._entriesFrom(snapshot);
            const fresh = this._freshEntries(entries, now);

            const opponent = fresh
                .filter(candidate => candidate.userId !== entry.userId)
                .sort(
                    (a, b) =>
                        Number(a.joinedAt || 0) - Number(b.joinedAt || 0)
                )[0];

            if (opponent) {
                const remaining = fresh.filter(
                    candidate =>
                        candidate.userId !== opponent.userId &&
                        candidate.userId !== entry.userId
                );

                const matchRef = this.matchesCollection.doc();
                const match = {
                    id: matchRef.id,
                    status: 'active',
                    version: 0,
                    playerIds: [opponent.userId, entry.userId],
                    players: [
                        {
                            userId: opponent.userId,
                            email: opponent.email,
                            displayName: opponent.displayName
                        },
                        {
                            userId: entry.userId,
                            email: entry.email,
                            displayName: entry.displayName
                        }
                    ],
                    createdAt: new Date(now).toISOString(),
                    game: null
                };

                transaction.set(matchRef, match);
                transaction.set(this.queueDoc, {
                    entries: remaining,
                    updatedAt: now
                });

                return { status: 'matched', match };
            }

            const remaining = fresh.filter(
                candidate => candidate.userId !== entry.userId
            );
            const stored = {
                ...entry,
                joinedAt: now,
                lastSeenAt: now
            };

            remaining.push(stored);
            transaction.set(this.queueDoc, {
                entries: remaining,
                updatedAt: now
            });

            return { status: 'waiting', entry: stored };
        });
    }

    async getStatus(userId) {
        const match = await this._findActiveMatch(userId);
        if (match) {
            return { status: 'matched', match };
        }

        return this.client.runTransaction(async transaction => {
            const now = this.now();
            const snapshot = await transaction.get(this.queueDoc);
            const entries = this._entriesFrom(snapshot);
            const fresh = this._freshEntries(entries, now);

            const entry = fresh.find(
                candidate => candidate.userId === String(userId)
            );

            const pruned = fresh.length !== entries.length;

            if (!entry) {
                if (pruned) {
                    transaction.set(this.queueDoc, {
                        entries: fresh,
                        updatedAt: now
                    });
                }

                return { status: 'idle' };
            }

            const needsTouch =
                now - Number(entry.lastSeenAt || 0) >
                LAST_SEEN_UPDATE_MS;

            if (needsTouch) {
                entry.lastSeenAt = now;
            }

            if (needsTouch || pruned) {
                transaction.set(this.queueDoc, {
                    entries: fresh,
                    updatedAt: now
                });
            }

            return { status: 'waiting', entry };
        });
    }

    async leave(userId) {
        return this.client.runTransaction(async transaction => {
            const now = this.now();
            const snapshot = await transaction.get(this.queueDoc);
            const entries = this._entriesFrom(snapshot);
            const remaining = entries.filter(
                entry => entry.userId !== String(userId)
            );

            if (remaining.length === entries.length) {
                return false;
            }

            transaction.set(this.queueDoc, {
                entries: remaining,
                updatedAt: now
            });

            return true;
        });
    }

    async getMatch(matchId) {
        const doc = await this.matchesCollection.doc(String(matchId)).get();
        return doc.exists ? doc.data() : null;
    }

    /**
     * Guarda el estado de la partida dentro de una transacción. El campo
     * `version` evita que dos acciones simultáneas se pisen entre sí.
     */
    async saveGame(matchId, { game, expectedVersion } = {}) {
        const matchRef = this.matchesCollection.doc(String(matchId));

        return this.client.runTransaction(async transaction => {
            const snapshot = await transaction.get(matchRef);

            if (!snapshot.exists) {
                throw new Error('MATCH_NOT_FOUND');
            }

            const match = snapshot.data() || {};
            const currentVersion = Number(match.version || 0);

            if (
                expectedVersion !== undefined &&
                currentVersion !== Number(expectedVersion)
            ) {
                throw new Error('MATCH_VERSION_CONFLICT');
            }

            const updated = {
                ...match,
                game,
                version: currentVersion + 1,
                status:
                    game?.status === 'finished'
                        ? 'finished'
                        : match.status
            };

            transaction.set(matchRef, updated);

            return updated;
        });
    }
}
