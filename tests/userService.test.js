import test from 'node:test';
import assert from 'node:assert/strict';

import { UserRepository } from '../src/repositories/userRepository.js';
import { UserService } from '../src/services/userService.js';

const s = () => new UserService(new UserRepository());

test('registra', async () => {
    const u = await s().register('a@test.com', 'password123');

    assert.equal(u.email, 'a@test.com');
});

test('email inválido', async () => {
    await assert.rejects(
        () => s().register('no', 'password123'),
        /EMAIL_INVALID/
    );
});

test('email duplicado', async () => {
    const x = s();

    await x.register('a@test.com', 'password123');

    await assert.rejects(
        () => x.register('a@test.com', 'password123'),
        /EMAIL_EXISTS/
    );
});

test('lista', async () => {
    const x = s();

    await x.register('a@test.com', 'password123');
    await x.register('b@test.com', 'password123');

    const users = await Promise.resolve(x.listUsers());

    // allow extra users (e.g. initial admin). Ensure the two we created are present
    const emails = users.map(u => u.email);
    const unique = [...new Set(emails)];
    assert.ok(unique.length >= 2);
    assert.ok(unique.includes('a@test.com'));
    assert.ok(unique.includes('b@test.com'));
});

test('activo', async () => {
    const x = s();

    const u = await x.register('a@test.com', 'password123');

    assert.equal(x.isActive(u.id), true);
});

test('no existe', () => {
    assert.throws(
        () => s().isActive('999'),
        /USER_NOT_FOUND/
    );
});

test('no puede eliminar a otro', async () => {
    const x = s();

    const a = await x.register('a@test.com', 'password123');
    const b = await x.register('b@test.com', 'password123');

    assert.throws(
        () => x.deleteUser(a.id, b.id),
        /FORBIDDEN/
    );
});