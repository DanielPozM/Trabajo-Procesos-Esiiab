const DEFAULT_TTL_MS = 2 * 60 * 1000;
const LAST_SEEN_UPDATE_MS = 10 * 1000;

/**
 * Cola de emparejamiento en memoria.
 *
 * Se usa en desarrollo y en las pruebas. La partida se crea de forma atómica
 * porque Node ejecuta JavaScript en un único hilo y estas operaciones son
 * síncronas.
 */
export class MatchmakingRepository {
    constructor({ now = () => Date.now(), ttlMs = DEFAULT_TTL_MS } = {}) {
        this.now = now;
        this.ttlMs = ttlMs;
        this.entries = new Map();
        this.matches = new Map();
        this.nextMatchId = 1;
    }

    _isFresh(entry, now) {
        const lastSeen = Number(entry.lastSeenAt || entry.joinedAt || 0);
        return now - lastSeen <= this.ttlMs;
    }

    _prune(now) {
        for (const [userId, entry] of this.entries) {
            if (!this._isFresh(entry, now)) {
                this.entries.delete(userId);
            }
        }
    }

    _findActiveMatch(userId) {
        for (const match of this.matches.values()) {
            if (
                match.status === 'active' &&
                match.playerIds.includes(String(userId))
            ) {
                return match;
            }
        }

        return null;
    }

    _createMatch(entries) {
        const now = this.now();
        const id = `match_${this.nextMatchId++}`;

        const match = {
            id,
            status: 'active',
            playerIds: entries.map(entry => entry.userId),
            players: entries.map(entry => ({
                userId: entry.userId,
                email: entry.email,
                displayName: entry.displayName
            })),
            createdAt: new Date(now).toISOString(),
            game: null
        };

        this.matches.set(id, match);
        return match;
    }

    async enqueueOrMatch(entry) {
        const now = this.now();
        this._prune(now);

        const existingMatch = this._findActiveMatch(entry.userId);
        if (existingMatch) {
            return { status: 'matched', match: existingMatch };
        }

        // Un jugador solo puede estar una vez en la cola.
        this.entries.delete(entry.userId);

        const opponent = [...this.entries.values()]
            .filter(candidate => candidate.userId !== entry.userId)
            .filter(candidate => this._isFresh(candidate, now))
            .sort(
                (a, b) =>
                    Number(a.joinedAt || 0) - Number(b.joinedAt || 0)
            )[0];

        if (opponent) {
            this.entries.delete(opponent.userId);

            const match = this._createMatch([
                opponent,
                { ...entry, joinedAt: now, lastSeenAt: now }
            ]);

            return { status: 'matched', match };
        }

        const stored = { ...entry, joinedAt: now, lastSeenAt: now };
        this.entries.set(stored.userId, stored);

        return { status: 'waiting', entry: stored };
    }

    async getStatus(userId) {
        const now = this.now();
        this._prune(now);

        const match = this._findActiveMatch(userId);
        if (match) {
            return { status: 'matched', match };
        }

        const entry = this.entries.get(String(userId));
        if (!entry) {
            return { status: 'idle' };
        }

        if (now - Number(entry.lastSeenAt || 0) > LAST_SEEN_UPDATE_MS) {
            entry.lastSeenAt = now;
        }

        return { status: 'waiting', entry };
    }

    async leave(userId) {
        return this.entries.delete(String(userId));
    }

    async getMatch(matchId) {
        return this.matches.get(String(matchId)) || null;
    }
}
