import test from 'node:test';
import assert from 'node:assert/strict';

import { MatchmakingRepository } from '../src/repositories/matchmakingRepository.js';
import { MatchmakingService } from '../src/services/matchmakingService.js';
import { GameService } from '../src/services/gameService.js';

const alice = { id: 'alice', email: 'alice@test.com' };
const bob = { id: 'bob', email: 'bob@test.com' };
const carol = { id: 'carol', email: 'carol@test.com' };

let clock = 2_000_000;
const now = () => clock;
const lowRandom = min => min;

async function setup() {
    const repository = new MatchmakingRepository({ now, ttlMs: 60_000 });
    const matchmaking = new MatchmakingService(repository, { now });

    await matchmaking.join(alice);
    const { match } = await matchmaking.join(bob);

    const gameService = new GameService(repository, {
        now,
        randomInt: lowRandom
    });

    return { repository, matchmaking, match, gameService };
}

function userById(userId) {
    return [alice, bob].find(user => user.id === userId);
}

test('la primera consulta crea la partida y reparte los dados', async () => {
    const { match, repository, gameService } = await setup();

    const state = await gameService.getState(alice, match.id);
    const stored = await repository.getMatch(match.id);

    assert.equal(state.status, 'playing');
    assert.equal(state.round, 1);
    assert.equal(state.yourDice.length, 4);
    assert.equal(state.totalDice, 8);
    assert.deepEqual(state.yourDice, stored.game.dice.alice);
    assert.equal(stored.version, 1);
});

test('cada jugador ve solo sus propios dados', async () => {
    const { match, gameService } = await setup();

    const aliceView = await gameService.getState(alice, match.id);
    const bobView = await gameService.getState(bob, match.id);

    const aliceSeat = aliceView.players.find(
        player => player.userId === 'alice'
    );
    const bobSeat = aliceView.players.find(
        player => player.userId === 'bob'
    );

    assert.deepEqual(aliceSeat.dice, aliceView.yourDice);
    assert.equal(bobSeat.dice, null);
    assert.equal(bobSeat.diceCount, 4);
    assert.equal(aliceView.matchId, match.id);
    assert.equal(aliceView.round, bobView.round);
});

test('solo los jugadores de la partida pueden consultarla', async () => {
    const { match, gameService } = await setup();

    await assert.rejects(
        () => gameService.getState(carol, match.id),
        /FORBIDDEN/
    );

    await assert.rejects(
        () => gameService.getState(alice, 'partida-inexistente'),
        /MATCH_NOT_FOUND/
    );
});

test('solo el jugador con el turno puede apostar', async () => {
    const { match, gameService } = await setup();

    const initial = await gameService.getState(alice, match.id);
    const waiting = initial.turnPlayerId === 'alice' ? bob : alice;
    const active = userById(initial.turnPlayerId);

    await assert.rejects(
        () => gameService.placeBid(waiting, match.id, {
            quantity: 1,
            face: 1
        }),
        /NOT_YOUR_TURN/
    );

    const state = await gameService.placeBid(active, match.id, {
        quantity: 2,
        face: 3
    });

    assert.deepEqual(state.currentBid, {
        quantity: 2,
        face: 3,
        playerId: active.id
    });
    assert.equal(state.canBid, false);
});

test('la apuesta se comparte y el rival puede acusar', async () => {
    const { match, gameService } = await setup();

    const initial = await gameService.getState(alice, match.id);
    const bidder = userById(initial.turnPlayerId);
    const challengerId =
        initial.turnPlayerId === 'alice' ? 'bob' : 'alice';
    const challenger = userById(challengerId);

    await gameService.placeBid(bidder, match.id, {
        quantity: 1,
        face: 2
    });

    const bobView = await gameService.getState(bob, match.id);
    assert.equal(bobView.canChallenge, true);
    assert.equal(bobView.currentBid.quantity, 1);

    const resolved = await gameService.challenge(challenger, match.id);

    assert.equal(resolved.lastResult.bidIsTrue, false);
    assert.equal(resolved.lastResult.loserId, bidder.id);
    assert.equal(resolved.round, 2);
    assert.equal(resolved.startingPlayerId, challenger.id);
});

test('la partida termina y el repositorio la marca como finalizada', async () => {
    const { match, repository, gameService } = await setup();

    let state = await gameService.getState(alice, match.id);

    for (let round = 0; round < 10 && state.status === 'playing'; round += 1) {
        const bidder = userById(state.turnPlayerId);
        state = await gameService.placeBid(bidder, match.id, {
            quantity: 1,
            face: 2
        });

        const challenger = userById(state.turnPlayerId);
        state = await gameService.challenge(challenger, match.id);
    }

    assert.equal(state.status, 'finished');
    assert.ok(['alice', 'bob'].includes(state.winnerId));
    assert.equal(state.canBid, false);
    assert.equal(state.canChallenge, false);

    const stored = await repository.getMatch(match.id);
    assert.equal(stored.status, 'finished');
    assert.equal(stored.game.status, 'finished');
});

test('dos aperturas simultáneas de la mesa comparten la misma partida', async () => {
    const { match, repository, gameService } = await setup();

    const [aliceView, bobView] = await Promise.all([
        gameService.getState(alice, match.id),
        gameService.getState(bob, match.id)
    ]);

    const stored = await repository.getMatch(match.id);

    assert.equal(aliceView.round, bobView.round);
    assert.deepEqual(aliceView.yourDice, stored.game.dice.alice);
    assert.deepEqual(bobView.yourDice, stored.game.dice.bob);
});

test('una acción inválida no modifica la partida', async () => {
    const { match, repository, gameService } = await setup();

    const initial = await gameService.getState(alice, match.id);
    const storedBefore = await repository.getMatch(match.id);
    const waiting = initial.turnPlayerId === 'alice' ? bob : alice;

    await assert.rejects(
        () =>
            gameService.placeBid(waiting, match.id, {
                quantity: 1,
                face: 1
            }),
        /NOT_YOUR_TURN/
    );

    const storedAfter = await repository.getMatch(match.id);

    assert.equal(storedAfter.version, storedBefore.version);
    assert.deepEqual(storedAfter.game, storedBefore.game);
});
