import {
    applyBid,
    applyChallenge,
    applyForfeit,
    createGame,
    toPublicGame
} from './liarsDice.js';
import { rollDiceColor } from '../lib/diceColors.js';
import { warn } from '../lib/logger.js';

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
                email: info.email || null,
                diceColor: info.diceColor || 'gray'
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
    constructor(
        repository,
        {
            now = () => Date.now(),
            randomInt,
            rewardRandomInt,
            userService
        } = {}
    ) {
        this.repository = repository;
        this.now = now;
        this.randomInt = randomInt;
        this.rewardRandomInt = rewardRandomInt;
        this.userService = userService;
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
        return {
            ...attachPlayers(
                toPublicGame(match.game, viewerId),
                match
            ),
            reward: match.reward ? { ...match.reward } : null
        };
    }

    /**
     * Concede (una sola vez) el premio de color al ganador. Si el premio ya
     * estaba guardado en la partida no se vuelve a consultar al usuario.
     */
    async _grantReward(match) {
        const game = match?.game;

        if (game?.status !== 'finished' || !game.winnerId) {
            return null;
        }

        if (match.reward) {
            return match.reward;
        }

        if (!this.userService?.claimDiceReward) {
            return null;
        }

        const colorId = rollDiceColor(this.rewardRandomInt);
        let claim;

        try {
            claim = await this.userService.claimDiceReward(
                game.winnerId,
                match.id,
                colorId
            );
        } catch (error) {
            warn(
                'No se pudo conceder el premio de la partida',
                match.id,
                error.message
            );
            return null;
        }

        const reward = {
            matchId: match.id,
            winnerId: game.winnerId,
            colorId: claim.colorId,
            isNew: claim.isNew,
            awardedAt: new Date(this.now()).toISOString()
        };

        match.reward = reward;

        try {
            await this.repository.saveReward(match.id, reward);
        } catch (error) {
            warn(
                'No se pudo guardar el premio de la partida',
                match.id,
                error.message
            );
        }

        return reward;
    }

    async getState(user, matchId) {
        const match = await this._loadMatch(user, matchId);
        const current = await this._ensureGame(match);

        await this._grantReward(current);

        return this._view(current, user.id);
    }

    async _mutate(user, matchId, updater) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
            const match = await this._loadMatch(user, matchId);
            const current = await this._ensureGame(match);
            const nextGame = updater(current.game, String(user.id));

            // Algunas acciones son idempotentes (por ejemplo, abandonar una
            // partida ya terminada) y devuelven el mismo estado. No hace falta
            // volver a escribirlo para no subir la versión sin motivo.
            if (nextGame === current.game) {
                await this._grantReward(current);

                return this._view(current, user.id);
            }

            try {
                const saved = await this.repository.saveGame(current.id, {
                    game: nextGame,
                    expectedVersion: current.version ?? 0
                });

                await this._grantReward(saved);

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

    /**
     * Abandonar la mesa equivale a rendirse: el rival gana la partida y esta
     * se cierra para que el jugador que se queda pueda buscar otra.
     */
    abandon(user, matchId) {
        return this._mutate(user, matchId, (game, playerId) =>
            applyForfeit(game, playerId, { now: this.now })
        );
    }
}
