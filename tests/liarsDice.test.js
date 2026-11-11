import test from 'node:test';
import assert from 'node:assert/strict';

import {
    DICE_PER_PLAYER,
    applyBid,
    applyChallenge,
    createGame,
    nextMinimumBid,
    toPublicGame,
    totalDiceCount
} from '../src/services/liarsDice.js';

// randomInt(min, max) => min produce siempre el valor mínimo: el jugador
// inicial es el primero y todos los dados valen 1.
const lowRandom = min => min;

let clock = 1_000_000;
const now = () => clock;

function newGame(playerIds = ['alice', 'bob']) {
    return createGame({
        playerIds,
        randomInt: lowRandom,
        now
    });
}

function bid(game, playerId, quantity, face) {
    return applyBid(game, playerId, { quantity, face }, { now });
}

function challenge(game, playerId) {
    return applyChallenge(game, playerId, {
        now,
        randomInt: lowRandom
    });
}

test('crea una partida con cuatro dados por jugador y turno aleatorio', () => {
    const game = newGame();

    assert.equal(game.status, 'playing');
    assert.equal(game.round, 1);
    assert.equal(game.dice.alice.length, DICE_PER_PLAYER);
    assert.equal(game.dice.bob.length, DICE_PER_PLAYER);
    assert.equal(game.currentBid, null);
    assert.equal(totalDiceCount(game), DICE_PER_PLAYER * 2);
    assert.ok(
        [game.turnPlayerId, game.startingPlayerId].every(id =>
            ['alice', 'bob'].includes(id)
        )
    );
    assert.equal(game.turnPlayerId, game.startingPlayerId);
});

test('exige exactamente dos jugadores distintos', () => {
    assert.throws(
        () => createGame({ playerIds: ['alice'] }),
        /GAME_REQUIRES_TWO_PLAYERS/
    );

    assert.throws(
        () => createGame({ playerIds: ['alice', 'alice'] }),
        /GAME_REQUIRES_TWO_PLAYERS/
    );
});

test('una apuesta pasa el turno al rival y queda registrada', () => {
    const game = newGame();
    const next = bid(game, 'alice', 2, 3);

    assert.deepEqual(next.currentBid, {
        quantity: 2,
        face: 3,
        playerId: 'alice'
    });
    assert.equal(next.turnPlayerId, 'bob');
    assert.equal(next.history.length, 1);
    assert.equal(next.history[0].type, 'bid');
    assert.equal(next.history[0].quantity, 2);
    assert.equal(next.history[0].face, 3);
    // El estado original no se muta.
    assert.equal(game.currentBid, null);
});

test('no se puede apostar fuera de turno', () => {
    const game = newGame();

    assert.throws(
        () => bid(game, 'bob', 1, 1),
        /NOT_YOUR_TURN/
    );
});

test('la apuesta debe subir la cantidad o la cara', () => {
    const first = bid(newGame(), 'alice', 2, 3);

    assert.throws(
        () => bid(first, 'bob', 2, 3),
        /BID_TOO_LOW/
    );

    assert.throws(
        () => bid(first, 'bob', 1, 6),
        /BID_TOO_LOW/
    );

    // Misma cantidad, cara mayor: válido.
    assert.equal(bid(first, 'bob', 2, 4).currentBid.face, 4);

    // Cantidad mayor con cualquier cara: válido.
    assert.equal(bid(first, 'bob', 3, 1).currentBid.quantity, 3);
});

test('rechaza cantidades y caras fuera de rango', () => {
    const game = newGame();

    assert.throws(
        () => bid(game, 'alice', 0, 1),
        /BID_QUANTITY_INVALID/
    );
    assert.throws(
        () => bid(game, 'alice', 9, 1),
        /BID_QUANTITY_INVALID/
    );
    assert.throws(
        () => bid(game, 'alice', 1, 0),
        /BID_FACE_INVALID/
    );
    assert.throws(
        () => bid(game, 'alice', 1, 7),
        /BID_FACE_INVALID/
    );
    assert.throws(
        () => bid(game, 'alice', 1.5, 1),
        /BID_QUANTITY_INVALID/
    );
});

test('no se puede acusar sin apuesta previa', () => {
    const game = newGame();

    assert.throws(
        () => challenge(game, 'alice'),
        /CANNOT_CHALLENGE/
    );
});

test('si la apuesta es verdadera, el que acusa pierde un dado', () => {
    const game = newGame();
    const afterBid = bid(game, 'alice', 1, 1);
    const next = challenge(afterBid, 'bob');

    assert.equal(next.lastResult.bidIsTrue, true);
    assert.equal(next.lastResult.matchingCount, 8);
    assert.equal(next.lastResult.loserId, 'bob');
    assert.equal(next.dice.bob.length, 3);
    assert.equal(next.dice.alice.length, 4);
    assert.equal(next.round, 2);
    assert.equal(next.startingPlayerId, 'alice');
    assert.equal(next.turnPlayerId, 'alice');
    assert.equal(next.currentBid, null);
    assert.equal(next.status, 'playing');
});

test('si la apuesta es falsa, el que apuesta pierde un dado', () => {
    const game = newGame();
    const afterBid = bid(game, 'alice', 1, 2);
    const next = challenge(afterBid, 'bob');

    assert.equal(next.lastResult.bidIsTrue, false);
    assert.equal(next.lastResult.matchingCount, 0);
    assert.equal(next.lastResult.loserId, 'alice');
    assert.equal(next.dice.alice.length, 3);
    assert.equal(next.dice.bob.length, 4);
    assert.equal(next.startingPlayerId, 'bob');
    assert.equal(next.turnPlayerId, 'bob');
});

test('la acusación revela ambas manos en el resultado', () => {
    const game = newGame();
    const afterBid = bid(game, 'alice', 1, 1);
    const next = challenge(afterBid, 'bob');

    assert.deepEqual(next.lastResult.hands, {
        alice: [1, 1, 1, 1],
        bob: [1, 1, 1, 1]
    });
    assert.equal(next.history.at(-1).type, 'challenge');
    assert.equal(next.history.at(-1).matchingCount, 8);
});

test('la partida termina cuando un jugador se queda sin dados', () => {
    let game = newGame();

    // En cada ronda el jugador inicial apuesta una cara que no existe y el
    // rival le acusa: el apostador pierde un dado.
    for (let round = 0; round < 7 && game.status === 'playing'; round += 1) {
        const bidder = game.turnPlayerId;
        const afterBid = bid(game, bidder, 1, 2);
        const challenger = afterBid.turnPlayerId;
        game = challenge(afterBid, challenger);

        if (game.status === 'finished') {
            assert.equal(game.lastResult.loserId, bidder);
            assert.notEqual(game.winnerId, bidder);
            assert.equal(game.dice[bidder].length, 0);
            assert.equal(game.turnPlayerId, null);
        }
    }

    assert.equal(game.status, 'finished');
    assert.equal(game.history.at(-1).type, 'gameOver');
    assert.ok(['alice', 'bob'].includes(game.winnerId));
});

test('la vista pública oculta los dados del rival', () => {
    const game = newGame();
    const view = toPublicGame(game, 'alice');

    const alice = view.players.find(player => player.userId === 'alice');
    const bob = view.players.find(player => player.userId === 'bob');

    assert.deepEqual(alice.dice, [1, 1, 1, 1]);
    assert.equal(alice.isYou, true);
    assert.equal(bob.dice, null);
    assert.equal(bob.diceCount, 4);
    assert.deepEqual(view.yourDice, [1, 1, 1, 1]);
    assert.equal(view.totalDice, 8);
});

test('la vista pública indica qué acciones puede hacer el jugador', () => {
    const game = newGame();
    const alice = toPublicGame(game, 'alice');
    const bob = toPublicGame(game, 'bob');

    assert.equal(alice.canBid, true);
    assert.equal(alice.canChallenge, false);
    assert.equal(bob.canBid, false);

    const afterBid = bid(game, 'alice', 1, 1);
    const bobTurn = toPublicGame(afterBid, 'bob');

    assert.equal(bobTurn.canBid, true);
    assert.equal(bobTurn.canChallenge, true);
});

test('la apuesta mínima sube la cara y después la cantidad', () => {
    assert.deepEqual(nextMinimumBid(newGame()), {
        quantity: 1,
        face: 1
    });

    assert.deepEqual(
        nextMinimumBid({
            currentBid: { quantity: 2, face: 3 }
        }),
        { quantity: 2, face: 4 }
    );

    assert.deepEqual(
        nextMinimumBid({
            currentBid: { quantity: 2, face: 6 }
        }),
        { quantity: 3, face: 1 }
    );
});
