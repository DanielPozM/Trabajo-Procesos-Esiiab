import crypto from 'crypto';

export const DICE_PER_PLAYER = 4;
export const DICE_FACES = 6;
export const MAX_HISTORY = 40;

function randomFace(randomInt) {
    // crypto.randomInt(min, max) devuelve un entero en [min, max).
    return randomInt(1, DICE_FACES + 1);
}

function rollDice(count, randomInt) {
    return Array.from({ length: count }, () => randomFace(randomInt));
}

function cloneGame(game) {
    return {
        ...game,
        dice: Object.fromEntries(
            Object.entries(game.dice || {}).map(([playerId, dice]) => [
                playerId,
                [...dice]
            ])
        ),
        currentBid: game.currentBid ? { ...game.currentBid } : null,
        history: [...(game.history || [])],
        lastResult: game.lastResult ? { ...game.lastResult } : null
    };
}

function pushHistory(history, entry) {
    const next = [...history, entry];
    return next.length > MAX_HISTORY
        ? next.slice(next.length - MAX_HISTORY)
        : next;
}

function nowIso(now) {
    return new Date(now()).toISOString();
}

export function totalDiceCount(game) {
    return Object.values(game.dice || {}).reduce(
        (total, dice) => total + dice.length,
        0
    );
}

export function otherPlayerId(game, playerId) {
    return Object.keys(game.dice).find(
        id => String(id) !== String(playerId)
    );
}

/**
 * Crea una partida nueva: cuatro dados por jugador y turno inicial aleatorio.
 */
export function createGame({
    playerIds,
    randomInt = crypto.randomInt,
    now = () => Date.now()
} = {}) {
    if (!Array.isArray(playerIds) || playerIds.length !== 2) {
        throw new Error('GAME_REQUIRES_TWO_PLAYERS');
    }

    const ids = playerIds.map(String);

    if (ids[0] === ids[1]) {
        throw new Error('GAME_REQUIRES_TWO_PLAYERS');
    }

    const startingPlayerId = ids[randomInt(0, ids.length)];

    return {
        status: 'playing',
        round: 1,
        startingPlayerId,
        turnPlayerId: startingPlayerId,
        dice: {
            [ids[0]]: rollDice(DICE_PER_PLAYER, randomInt),
            [ids[1]]: rollDice(DICE_PER_PLAYER, randomInt)
        },
        currentBid: null,
        history: [],
        lastResult: null,
        winnerId: null,
        createdAt: nowIso(now),
        updatedAt: nowIso(now)
    };
}

function assertPlaying(game) {
    if (!game || game.status !== 'playing') {
        throw new Error('GAME_FINISHED');
    }
}

function assertTurn(game, playerId) {
    if (String(game.turnPlayerId) !== String(playerId)) {
        throw new Error('NOT_YOUR_TURN');
    }
}

export function nextMinimumBid(game) {
    if (!game.currentBid) {
        return { quantity: 1, face: 1 };
    }

    const { quantity, face } = game.currentBid;

    if (face < DICE_FACES) {
        return { quantity, face: face + 1 };
    }

    return { quantity: quantity + 1, face: 1 };
}

export function assertBidAllowed(game, playerId, bid) {
    assertPlaying(game);
    assertTurn(game, playerId);

    const quantity = Number(bid?.quantity);
    const face = Number(bid?.face);

    if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error('BID_QUANTITY_INVALID');
    }

    if (quantity > totalDiceCount(game)) {
        throw new Error('BID_QUANTITY_INVALID');
    }

    if (!Number.isInteger(face) || face < 1 || face > DICE_FACES) {
        throw new Error('BID_FACE_INVALID');
    }

    if (game.currentBid) {
        const current = game.currentBid;
        const isHigher =
            quantity > current.quantity ||
            (quantity === current.quantity && face > current.face);

        if (!isHigher) {
            throw new Error('BID_TOO_LOW');
        }
    }
}

/**
 * Aplica una apuesta y pasa el turno al otro jugador.
 */
export function applyBid(
    game,
    playerId,
    bid,
    { now = () => Date.now() } = {}
) {
    assertBidAllowed(game, playerId, bid);

    const next = cloneGame(game);
    const quantity = Number(bid.quantity);
    const face = Number(bid.face);

    next.currentBid = {
        quantity,
        face,
        playerId: String(playerId)
    };
    next.turnPlayerId = otherPlayerId(game, playerId);
    next.updatedAt = nowIso(now);
    next.history = pushHistory(next.history, {
        type: 'bid',
        round: game.round,
        playerId: String(playerId),
        quantity,
        face,
        at: next.updatedAt
    });

    return next;
}

function countMatchingDice(dice, face) {
    return Object.values(dice).reduce(
        (total, hand) =>
            total + hand.filter(value => value === face).length,
        0
    );
}

/**
 * Resuelve una acusación de mentira.
 *
 * - Si los dados que coinciden con la cara son menos que la cantidad
 *   apostada, pierde un dado quien apostó.
 * - En caso contrario, pierde un dado quien acusó.
 *
 * Si el jugador que pierde se queda sin dados, la partida termina. Si no,
 * empieza una ronda nueva con los dados restantes y el ganador de la ronda
 * como primer jugador.
 */
export function applyChallenge(
    game,
    playerId,
    { now = () => Date.now(), randomInt = crypto.randomInt } = {}
) {
    assertPlaying(game);
    assertTurn(game, playerId);

    const bid = game.currentBid;

    if (!bid) {
        throw new Error('CANNOT_CHALLENGE');
    }

    const bidderId = String(bid.playerId);
    const challengerId = String(playerId);
    const hands = Object.fromEntries(
        Object.entries(game.dice).map(([id, dice]) => [id, [...dice]])
    );
    const matchingCount = countMatchingDice(hands, bid.face);
    const bidIsTrue = matchingCount >= bid.quantity;
    const loserId = bidIsTrue ? challengerId : bidderId;
    const roundWinnerId = bidIsTrue ? bidderId : challengerId;

    const next = cloneGame(game);
    const remainingDice = hands[loserId].slice(0, -1);
    const at = nowIso(now);

    next.dice = { ...hands, [loserId]: remainingDice };
    next.currentBid = null;
    next.updatedAt = at;
    next.lastResult = {
        round: game.round,
        bid: { ...bid },
        bidderId,
        challengerId,
        matchingCount,
        bidIsTrue,
        loserId,
        winnerId: roundWinnerId,
        hands,
        at
    };

    next.history = pushHistory(next.history, {
        type: 'challenge',
        round: game.round,
        playerId: challengerId,
        bidderId,
        quantity: bid.quantity,
        face: bid.face,
        matchingCount,
        bidIsTrue,
        loserId,
        at
    });

    if (remainingDice.length === 0) {
        next.status = 'finished';
        next.turnPlayerId = null;
        next.winnerId = roundWinnerId;
        next.history = pushHistory(next.history, {
            type: 'gameOver',
            winnerId: roundWinnerId,
            loserId,
            at
        });

        return next;
    }

    next.round = game.round + 1;
    next.startingPlayerId = roundWinnerId;
    next.turnPlayerId = roundWinnerId;
    next.dice = {
        [bidderId]: rollDice(next.dice[bidderId].length, randomInt),
        [challengerId]: rollDice(
            next.dice[challengerId].length,
            randomInt
        )
    };

    return next;
}

/**
 * Resuelve el abandono de una partida en curso: el rival gana.
 *
 * Es idempotente: si la partida ya ha terminado devuelve el mismo estado,
 * para que un doble clic o un reintento no cambien al ganador.
 */
export function applyForfeit(
    game,
    playerId,
    { now = () => Date.now() } = {}
) {
    if (!game || game.status !== 'playing') {
        return game;
    }

    const player = String(playerId);
    const winnerId = otherPlayerId(game, player);

    if (!winnerId) {
        throw new Error('GAME_REQUIRES_TWO_PLAYERS');
    }

    const at = nowIso(now);
    const next = cloneGame(game);

    next.status = 'finished';
    next.turnPlayerId = null;
    next.currentBid = null;
    next.winnerId = winnerId;
    next.forfeitedBy = player;
    next.updatedAt = at;
    next.history = pushHistory(next.history, {
        type: 'forfeit',
        round: game.round,
        playerId: player,
        winnerId,
        at
    });

    return next;
}

/**
 * Vista segura para un jugador: nunca incluye los dados del rival salvo que
 * hayan sido revelados en una acusación.
 */
export function toPublicGame(game, viewerId) {
    const viewer = String(viewerId);
    const players = Object.keys(game.dice || {}).map(userId => {
        const isYou = userId === viewer;
        const dice = game.dice[userId] || [];

        return {
            userId,
            isYou,
            diceCount: dice.length,
            dice: isYou ? [...dice] : null,
            isTurn: String(game.turnPlayerId) === userId
        };
    });

    const yourDice = [...(game.dice[viewer] || [])];
    const canAct = game.status === 'playing' && String(game.turnPlayerId) === viewer;

    return {
        status: game.status,
        round: game.round,
        startingPlayerId: game.startingPlayerId,
        turnPlayerId: game.turnPlayerId,
        currentBid: game.currentBid ? { ...game.currentBid } : null,
        winnerId: game.winnerId,
        forfeitedBy: game.forfeitedBy || null,
        lastResult: game.lastResult ? { ...game.lastResult } : null,
        players,
        yourDice,
        totalDice: totalDiceCount(game),
        minimumBid: nextMinimumBid(game),
        canBid: canAct,
        canChallenge: canAct && Boolean(game.currentBid),
        history: (game.history || []).slice(-20)
    };
}
