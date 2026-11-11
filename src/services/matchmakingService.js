function displayNameFor(email) {
    const localPart = String(email || '').split('@')[0] || 'Jugador';
    const cleaned = localPart.replace(/[._-]+/g, ' ').trim();

    return cleaned || 'Jugador';
}

function publicMatch(match) {
    if (!match) return null;

    return {
        id: match.id,
        status: match.status,
        createdAt: match.createdAt,
        players: (match.players || []).map(player => ({
            userId: player.userId,
            email: player.email,
            displayName: player.displayName
        }))
    };
}

/**
 * Reglas de negocio del emparejamiento.
 *
 * No conoce Express ni Firestore: solo habla con el repositorio, que decide
 * dónde se guarda la cola y las partidas.
 */
export class MatchmakingService {
    constructor(repository, { now = () => Date.now() } = {}) {
        this.repository = repository;
        this.now = now;
    }

    _entryFor(user) {
        if (!user?.id || !user?.email) {
            throw new Error('UNAUTHENTICATED');
        }

        const now = this.now();

        return {
            userId: String(user.id),
            email: String(user.email),
            displayName: displayNameFor(user.email),
            joinedAt: now,
            lastSeenAt: now
        };
    }

    async join(user) {
        const result = await this.repository.enqueueOrMatch(
            this._entryFor(user)
        );

        return {
            status: result.status,
            match: publicMatch(result.match)
        };
    }

    async getStatus(user) {
        if (!user?.id) {
            throw new Error('UNAUTHENTICATED');
        }

        const result = await this.repository.getStatus(String(user.id));

        return {
            status: result.status,
            match: publicMatch(result.match)
        };
    }

    async leave(user) {
        if (!user?.id) {
            throw new Error('UNAUTHENTICATED');
        }

        await this.repository.leave(String(user.id));

        return { status: 'idle' };
    }

    async getMatch(user, matchId) {
        if (!user?.id) {
            throw new Error('UNAUTHENTICATED');
        }

        const match = await this.repository.getMatch(matchId);

        if (!match) {
            throw new Error('MATCH_NOT_FOUND');
        }

        const playerIds = (match.playerIds || []).map(String);

        if (!playerIds.includes(String(user.id))) {
            throw new Error('FORBIDDEN');
        }

        return publicMatch(match);
    }
}
