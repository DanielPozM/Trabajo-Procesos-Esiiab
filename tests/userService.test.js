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

    const service = new UserService(new UserRepository(), {
        emailService,
        appBaseUrl: 'http://localhost:3000'
    });

    return { service, sent };
}

test('registra y deja la cuenta pendiente de confirmación', async () => {
    const { service } = makeService();

    const user = await service.register('a@test.com', 'password123');

    assert.equal(user.email, 'a@test.com');
    assert.equal(user.active, false);
    assert.equal(user.passwordHash, undefined);

    await assert.rejects(
        () => service.authenticate('a@test.com', 'password123'),
        /ACCOUNT_PENDING/
    );
});

test('email inválido', async () => {
    const { service } = makeService();

    await assert.rejects(
        () => service.register('no', 'password123'),
        /EMAIL_INVALID/
    );
});

test('email duplicado', async () => {
    const { service } = makeService();

    await service.register('a@test.com', 'password123');

    await assert.rejects(
        () => service.register('a@test.com', 'password123'),
        /EMAIL_EXISTS/
    );
});

test('contraseña demasiado corta', async () => {
    const { service } = makeService();

    await assert.rejects(
        () => service.register('a@test.com', 'short'),
        /PASSWORD_TOO_SHORT/
    );
});

test('confirma la cuenta con el token enviado por correo', async () => {
    const { service, sent } = makeService();

    const user = await service.register('a@test.com', 'password123');

    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, 'a@test.com');

    const verified = await service.verifyEmail(sent[0].token);

    assert.equal(verified.active, true);

    const logged = await service.authenticate(
        'a@test.com',
        'password123'
    );

    assert.equal(logged.email, 'a@test.com');
});

test('rechaza un token de confirmación inválido', async () => {
    const { service } = makeService();

    await assert.rejects(
        () => service.verifyEmail('token-inventado'),
        /VERIFICATION_TOKEN_INVALID/
    );
});

test('rechaza un token de confirmación caducado', async () => {
    const { service, sent } = makeService();

    const user = await service.register('a@test.com', 'password123');

    await service.repository.updateById(user.id, {
        emailVerificationExpiresAt: Date.now() - 1000
    });

    await assert.rejects(
        () => service.verifyEmail(sent[0].token),
        /VERIFICATION_TOKEN_EXPIRED/
    );
});

test('reenvía la confirmación y rota el token', async () => {
    const { service, sent } = makeService();

    const user = await service.register('a@test.com', 'password123');

    await service.repository.updateById(user.id, {
        lastVerificationSentAt: 0
    });

    const result = await service.resendVerification('a@test.com');

    assert.equal(result.sent, true);
    assert.equal(sent.length, 2);
    assert.notEqual(sent[0].token, sent[1].token);

    await assert.rejects(
        () => service.verifyEmail(sent[0].token),
        /VERIFICATION_TOKEN_INVALID/
    );

    const verified = await service.verifyEmail(sent[1].token);
    assert.equal(verified.active, true);
});

test('limita el reenvío de confirmación', async () => {
    const { service } = makeService();

    await service.register('a@test.com', 'password123');

    await assert.rejects(
        () => service.resendVerification('a@test.com'),
        /RATE_LIMITED/
    );
});

test('el listado no expone datos sensibles', async () => {
    const { service, sent } = makeService();

    await service.register('a@test.com', 'password123');
    await service.verifyEmail(sent[0].token);

    const users = await service.listUsers();
    const user = users.find(u => u.email === 'a@test.com');

    assert.ok(user);
    assert.equal(user.role, 'user');
    assert.equal(user.active, true);
    assert.equal(user.passwordHash, undefined);
    assert.equal(user.emailVerificationTokenHash, undefined);
    assert.equal(user.emailLower, undefined);
    assert.equal(user.lastVerificationSentAt, undefined);
});

test('comprueba si un usuario está activo', async () => {
    const { service, sent } = makeService();

    const user = await service.register('a@test.com', 'password123');

    assert.equal(await service.isActive(user.id), false);

    await service.verifyEmail(sent[0].token);

    assert.equal(await service.isActive(user.id), true);
});

test('usuario inexistente', async () => {
    const { service } = makeService();

    await assert.rejects(
        () => service.isActive('999'),
        /USER_NOT_FOUND/
    );
});

test('un usuario normal no puede eliminar a otro', async () => {
    const { service } = makeService();

    const a = await service.register('a@test.com', 'password123');
    const b = await service.register('b@test.com', 'password123');

    await assert.rejects(
        () => service.deleteUser(a.id, b.id),
        /FORBIDDEN/
    );
});

test('un usuario puede eliminar su propia cuenta', async () => {
    const { service } = makeService();

    const user = await service.register('a@test.com', 'password123');

    await service.deleteUser(user.id, user.id);

    assert.equal(await service.repository.findById(user.id), null);
});

test('un administrador puede eliminar a otro usuario', async () => {
    const { service } = makeService();

    const admin = await service.repository.create({
        email: 'admin@test.com',
        passwordHash: 'no-usado',
        active: true,
        role: 'admin'
    });

    const user = await service.register('a@test.com', 'password123');

    await service.deleteUser(admin.id, user.id);

    assert.equal(await service.repository.findById(user.id), null);
});

test('OAuth crea una cuenta activa y sin contraseña local', async () => {
    const { service } = makeService();

    const user = await service.loginWithOAuth({
        email: 'oauth@test.com',
        emailVerified: true,
        oauthId: 'google-123',
        provider: 'google'
    });

    assert.equal(user.active, true);
    assert.equal(user.role, 'user');
    assert.equal(user.oauthProvider, 'google');
    assert.equal(user.passwordHash, undefined);

    await assert.rejects(
        () => service.authenticate('oauth@test.com', 'password123'),
        /OAUTH_ONLY/
    );
});

test('OAuth activa una cuenta local pendiente y conserva su contraseña', async () => {
    const { service } = makeService();

    await service.register('a@test.com', 'password123');

    const user = await service.loginWithOAuth({
        email: 'a@test.com',
        emailVerified: true,
        oauthId: 'google-123',
        provider: 'google'
    });

    assert.equal(user.active, true);

    const logged = await service.authenticate(
        'a@test.com',
        'password123'
    );

    assert.equal(logged.email, 'a@test.com');
});

test('OAuth no cambia el rol de un administrador existente', async () => {
    const { service } = makeService();

    await service.repository.create({
        email: 'admin@test.com',
        passwordHash: 'no-usado',
        active: true,
        role: 'admin'
    });

    const user = await service.loginWithOAuth({
        email: 'admin@test.com',
        emailVerified: true,
        oauthId: 'google-admin',
        provider: 'google'
    });

    assert.equal(user.role, 'admin');
});

test('init crea el administrador inicial desde variables de entorno', async () => {
    const previousEmail = process.env.INIT_ADMIN_EMAIL;
    const previousPassword = process.env.INIT_ADMIN_PASSWORD;

    process.env.INIT_ADMIN_EMAIL = 'root@test.com';
    process.env.INIT_ADMIN_PASSWORD = 'password123';

    try {
        const { service } = makeService();

        await service.init();

        const admin = await service.repository.findByEmail(
            'root@test.com'
        );

        assert.ok(admin);
        assert.equal(admin.role, 'admin');
        assert.equal(admin.active, true);
        assert.ok(admin.passwordHash);
    } finally {
        if (previousEmail === undefined) {
            delete process.env.INIT_ADMIN_EMAIL;
        } else {
            process.env.INIT_ADMIN_EMAIL = previousEmail;
        }

        if (previousPassword === undefined) {
            delete process.env.INIT_ADMIN_PASSWORD;
        } else {
            process.env.INIT_ADMIN_PASSWORD = previousPassword;
        }
    }
});

test('el perfil empieza con el dado gris y solo permite colores desbloqueados', async () => {
    const { service } = makeService();

    const user = await service.repository.create({
        email: 'colors@test.com',
        active: true,
        role: 'user'
    });

    const initial = await service.getDiceColors(user.id);
    const gray = initial.colors.find(color => color.id === 'gray');
    const blue = initial.colors.find(color => color.id === 'blue');

    assert.equal(initial.selected, 'gray');
    assert.equal(gray.unlocked, true);
    assert.equal(gray.selected, true);
    assert.equal(blue.unlocked, false);

    await assert.rejects(
        () => service.selectDiceColor(user.id, 'blue'),
        /DICE_COLOR_LOCKED/
    );

    await assert.rejects(
        () => service.selectDiceColor(user.id, 'inventado'),
        /DICE_COLOR_INVALID/
    );

    const state = await service.selectDiceColor(user.id, 'gray');
    assert.equal(state.selected, 'gray');
});

test('un premio desbloquea el color una sola vez por partida', async () => {
    const { service } = makeService();

    const user = await service.repository.create({
        email: 'rewards@test.com',
        active: true,
        role: 'user'
    });

    const first = await service.claimDiceReward(
        user.id,
        'match_1',
        'green'
    );

    assert.equal(first.awarded, true);
    assert.equal(first.colorId, 'green');
    assert.equal(first.isNew, true);

    // Reintento de la misma partida con otro color: se conserva el original
    // y no se desbloquea nada nuevo.
    const retry = await service.claimDiceReward(
        user.id,
        'match_1',
        'blue'
    );

    assert.equal(retry.awarded, false);
    assert.equal(retry.colorId, 'green');
    assert.equal(retry.isNew, true);

    let state = await service.getDiceColors(user.id);

    assert.equal(
        state.colors.find(color => color.id === 'green').unlocked,
        true
    );
    assert.equal(
        state.colors.find(color => color.id === 'blue').unlocked,
        false
    );

    // Repetir un color ya desbloqueado no lo duplica.
    const duplicate = await service.claimDiceReward(
        user.id,
        'match_2',
        'green'
    );

    assert.equal(duplicate.awarded, true);
    assert.equal(duplicate.isNew, false);

    // Una tirada sin premio queda registrada como partida premiada sin color.
    const empty = await service.claimDiceReward(user.id, 'match_3', null);

    assert.equal(empty.awarded, true);
    assert.equal(empty.colorId, null);
    assert.equal(empty.isNew, false);

    const profile = await service.getUser(user.id);

    assert.deepEqual(profile.diceColors, ['gray', 'green']);
    assert.equal(profile.selectedDiceColor, 'gray');
    assert.equal(profile.diceRewards, undefined);

    state = await service.selectDiceColor(user.id, 'green');
    assert.equal(state.selected, 'green');
});
