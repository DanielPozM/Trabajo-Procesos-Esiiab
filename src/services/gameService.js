import {
    applyBid,
    applyChallenge,
    createGame,
    toPublicGame
} from './liarsDice.js';

function attachPlayers(state, match) {
    const playersById = new Map(
        (match.players || []).map(player => [
            String(player.userId),
            player
        ])
    );

    return {
        ...state,
        matchId: match.id,
        players: state.players.map(player => {
            const info = playersById.get(player.userId) || {};

            return {
                ...player,
                displayName:
                    info.displayName || info.email || 'Jugador',
                email: info.email || null
            };
        })
    };
}

/**
 * Lógica de negocio de la partida de dados.
 *
 * El motor (`liarsDice.js`) es puro; este servicio se encarga de cargar la
 * partida, comprobar permisos, persistir el resultado y devolver una vista
 * privada para cada jugador.
 */
export class GameService {
    constructor(repository, { now = () => Date.now(), randomInt } = {}) {
        this.repository = repository;
        this.now = now;
        this.randomInt = randomInt;
    }

    _createGame(playerIds) {
        return createGame({
            playerIds,
            now: this.now,
            randomInt: this.randomInt
        });
    }

    async _loadMatch(user, matchId) {
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

        return match;
    }

    /**
     * La partida se crea la primera vez que un jugador abre la mesa. El
     * control de versión garantiza que ambos jugadores reciban los mismos
     * dados aunque abran la pantalla a la vez.
     */
    async _ensureGame(match) {
        if (match.game) {
            return match;
        }

        try {
            return await this.repository.saveGame(match.id, {
                game: this._createGame(match.playerIds),
                expectedVersion: match.version ?? 0
            });
        } catch (error) {
            if (error.message !== 'MATCH_VERSION_CONFLICT') {
                throw error;
            }

            const fresh = await this.repository.getMatch(match.id);

            if (!fresh) {
                throw new Error('MATCH_NOT_FOUND');
            }

            if (fresh.game) {
                return fresh;
            }

            return this.repository.saveGame(fresh.id, {
                game: this._createGame(fresh.playerIds),
                expectedVersion: fresh.version ?? 0
            });
        }
    }

    _view(match, viewerId) {
        return attachPlayers(
            toPublicGame(match.game, viewerId),
            match
        );
    }

    async getState(user, matchId) {
        const match = await this._loadMatch(user, matchId);
        const current = await this._ensureGame(match);

        return this._view(current, user.id);
    }

    async _mutate(user, matchId, updater) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
            const match = await this._loadMatch(user, matchId);
            const current = await this._ensureGame(match);
            const nextGame = updater(current.game, String(user.id));

            try {
                const saved = await this.repository.saveGame(current.id, {
                    game: nextGame,
                    expectedVersion: current.version ?? 0
                });

                return this._view(saved, user.id);
            } catch (error) {
                if (error.message !== 'MATCH_VERSION_CONFLICT') {
                    throw error;
                }
            }
        }

        throw new Error('MATCH_VERSION_CONFLICT');
    }

    placeBid(user, matchId, bid) {
        return this._mutate(user, matchId, (game, playerId) =>
            applyBid(game, playerId, bid, { now: this.now })
        );
    }

    challenge(user, matchId) {
        return this._mutate(user, matchId, (game, playerId) =>
            applyChallenge(game, playerId, {
                now: this.now,
                randomInt: this.randomInt
            })
        );
    }
}
