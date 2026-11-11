import test from 'node:test';
import assert from 'node:assert/strict';

import { UserRepository } from '../src/repositories/userRepository.js';
import { UserService } from '../src/services/userService.js';

function makeService() {
    const sent = [];

    const emailService = {
        async sendVerificationEmail({ to, token }) {
            sent.push({ to, token });
            return { delivered: true };
        }
    };

    return {
        service: new UserService(new UserRepository(), {
            emailService,
            appBaseUrl: 'http://localhost:3000'
        }),
        sent
    };
}

test('la contraseña se guarda con hash, no en texto plano', async () => {
    const { service } = makeService();

    const user = await service.register('a@test.com', 'password123');
    const stored = await service.repository.findById(user.id);

    assert.notEqual(stored.passwordHash, 'password123');
    assert.match(stored.passwordHash, /^\$2/);
});

test('una cuenta pendiente no puede iniciar sesión', async () => {
    const { service } = makeService();

    await service.register('a@test.com', 'password123');

    await assert.rejects(
        () => service.authenticate('a@test.com', 'password123'),
        /ACCOUNT_PENDING/
    );
});

test('contraseña incorrecta rechazada', async () => {
    const { service, sent } = makeService();

    await service.register('a@test.com', 'password123');
    await service.verifyEmail(sent[0].token);

    await assert.rejects(
        () => service.authenticate('a@test.com', 'bad-password'),
        /INVALID_CREDENTIALS/
    );
});
