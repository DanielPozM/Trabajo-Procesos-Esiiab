import test from 'node:test';
import assert from 'node:assert/strict';

import { MatchmakingRepository } from '../src/repositories/matchmakingRepository.js';
import { MatchmakingService } from '../src/services/matchmakingService.js';

const alice = { id: 'alice', email: 'alice@test.com' };
const bob = { id: 'bob', email: 'bob@test.com' };
const carol = { id: 'carol', email: 'carol@test.com' };

function makeService({ ttlMs = 60 * 1000 } = {}) {
    let clock = 1_000_000;
    const now = () => clock;

    const repository = new MatchmakingRepository({ now, ttlMs });
    const service = new MatchmakingService(repository, { now });

    return {
        service,
        repository,
        advance(ms) {
            clock += ms;
        }
    };
}

test('un jugador sin oponente queda en espera', async () => {
    const { service } = makeService();

    const result = await service.join(alice);

    assert.equal(result.status, 'waiting');
    assert.equal(result.match, null);
});

test('dos jugadores se emparejan en una partida', async () => {
    const { service } = makeService();

    await service.join(alice);
    const result = await service.join(bob);

    assert.equal(result.status, 'matched');
    assert.equal(result.match.status, 'active');
    assert.equal(result.match.players.length, 2);
    assert.deepEqual(
        result.match.players.map(player => player.userId).sort(),
        ['alice', 'bob']
    );
});

test('ambos jugadores ven la misma partida', async () => {
    const { service } = makeService();

    await service.join(alice);
    const { match } = await service.join(bob);

    const aliceStatus = await service.getStatus(alice);
    const bobStatus = await service.getStatus(bob);

    assert.equal(aliceStatus.status, 'matched');
    assert.equal(bobStatus.status, 'matched');
    assert.equal(aliceStatus.match.id, match.id);
    assert.equal(bobStatus.match.id, match.id);
});

test('un jugador ya emparejado recibe su partida al volver a entrar', async () => {
    const { service } = makeService();

    await service.join(alice);
    const { match } = await service.join(bob);

    const again = await service.join(alice);

    assert.equal(again.status, 'matched');
    assert.equal(again.match.id, match.id);
});

test('un jugador no se empareja consigo mismo', async () => {
    const { service, repository } = makeService();

    await service.join(alice);
    const result = await service.join(alice);

    assert.equal(result.status, 'waiting');
    assert.equal(repository.entries.size, 1);
});

test('salir de la cola deja el estado inactivo', async () => {
    const { service } = makeService();

    await service.join(alice);
    await service.leave(alice);

    const status = await service.getStatus(alice);

    assert.equal(status.status, 'idle');
});

test('las entradas caducadas no se emparejan', async () => {
    const { service, advance } = makeService({ ttlMs: 60 * 1000 });

    await service.join(alice);
    advance(61 * 1000);

    const result = await service.join(bob);

    assert.equal(result.status, 'waiting');

    const aliceStatus = await service.getStatus(alice);
    assert.equal(aliceStatus.status, 'idle');
});

test('solo los jugadores de la partida pueden consultarla', async () => {
    const { service } = makeService();

    await service.join(alice);
    const { match } = await service.join(bob);

    const own = await service.getMatch(alice, match.id);

    assert.equal(own.id, match.id);

    await assert.rejects(
        () => service.getMatch(carol, match.id),
        /FORBIDDEN/
    );

    await assert.rejects(
        () => service.getMatch(alice, 'partida-inexistente'),
        /MATCH_NOT_FOUND/
    );
});

test('la partida no expone datos internos de los usuarios', async () => {
    const { service } = makeService();

    await service.join(alice);
    const { match } = await service.join(bob);

    assert.deepEqual(Object.keys(match).sort(), [
        'createdAt',
        'id',
        'players',
        'status'
    ]);

    assert.deepEqual(Object.keys(match.players[0]).sort(), [
        'displayName',
        'email',
        'userId'
    ]);

    assert.equal(match.players[0].passwordHash, undefined);
});
