import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import { config } from '../config.js';
import { createEmailService } from './emailService.js';
import { info, error as logError } from '../lib/logger.js';
import {
    diceColorState,
    isDiceColor,
    isRewardColor,
    normalizeDiceColors,
    selectedDiceColor
} from '../lib/diceColors.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;
const RESEND_COOLDOWN_MS = 60 * 1000;

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function createVerificationToken(ttlMs) {
    const token = crypto.randomBytes(32).toString('hex');

    return {
        token,
        hash: hashToken(token),
        expiresAt: Date.now() + ttlMs
    };
}

function publicUser(user) {
    if (!user) return null;

    const {
        passwordHash,
        emailLower,
        emailVerificationTokenHash,
        emailVerificationExpiresAt,
        lastVerificationSentAt,
        oauthId,
        diceRewards,
        ...safe
    } = user;

    return {
        ...safe,
        diceColors: normalizeDiceColors(safe.diceColors),
        selectedDiceColor: selectedDiceColor(safe)
    };
}

export class UserService {
    constructor(repository, { emailService, appBaseUrl } = {}) {
        this.repository = repository;
        this.appBaseUrl = appBaseUrl || config.appBaseUrl;
        this.emailService =
            emailService ||
            createEmailService({ appBaseUrl: this.appBaseUrl });
    }

    async init() {
        await this._ensureInitialAdmin();
    }

    async _ensureInitialAdmin() {
        const adminEmail = normalizeEmail(process.env.INIT_ADMIN_EMAIL);
        const adminPassword = process.env.INIT_ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword) {
            info(
                'INIT_ADMIN_EMAIL/INIT_ADMIN_PASSWORD no configurados; ' +
                    'no se crea administrador inicial'
            );
            return null;
        }

        if (!EMAIL_RE.test(adminEmail)) {
            throw new Error('INIT_ADMIN_EMAIL_INVALID');
        }

        if (adminPassword.length < MIN_PASSWORD_LENGTH) {
            throw new Error('INIT_ADMIN_PASSWORD_TOO_SHORT');
        }

        const existing = await this.repository.findByEmail(adminEmail);

        if (existing) {
            const patch = {
                role: 'admin',
                active: true,
                emailVerificationTokenHash: null,
                emailVerificationExpiresAt: null,
                emailVerifiedAt:
                    existing.emailVerifiedAt || new Date().toISOString()
            };

            if (!existing.passwordHash) {
                patch.passwordHash = await bcrypt.hash(adminPassword, 10);
            }

            await this.repository.updateById(existing.id, patch);
            info('Administrador inicial asegurado', adminEmail);
            return publicUser({ ...existing, ...patch });
        }

        const passwordHash = await bcrypt.hash(adminPassword, 10);

        const created = await this.repository.create({
            email: adminEmail,
            emailLower: adminEmail,
            passwordHash,
            active: true,
            role: 'admin',
            oauthProvider: null,
            emailVerifiedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        });

        info('Administrador inicial creado', adminEmail);
        return publicUser(created);
    }

    async register(email, password) {
        const normalizedEmail = normalizeEmail(email);

        if (!EMAIL_RE.test(normalizedEmail)) {
            throw new Error('EMAIL_INVALID');
        }

        if (!password || password.length < MIN_PASSWORD_LENGTH) {
            throw new Error('PASSWORD_TOO_SHORT');
        }

        if (password.length > MAX_PASSWORD_LENGTH) {
            throw new Error('PASSWORD_TOO_LONG');
        }

        if (await this.repository.findByEmail(normalizedEmail)) {
            throw new Error('EMAIL_EXISTS');
        }

        const verification = createVerificationToken(
            config.verificationTokenTtlMs
        );

        const user = {
            email: normalizedEmail,
            emailLower: normalizedEmail,
            passwordHash: await bcrypt.hash(password, 10),
            active: false,
            role: 'user',
            oauthProvider: null,
            emailVerificationTokenHash: verification.hash,
            emailVerificationExpiresAt: verification.expiresAt,
            lastVerificationSentAt: Date.now(),
            createdAt: new Date().toISOString()
        };

        const created = await this.repository.create(user);

        try {
            await this._sendVerification(created, verification.token);
        } catch (e) {
            // Si el correo no se puede enviar, no dejamos una cuenta pendiente
            // inutilizable: el usuario puede volver a intentar el registro.
            await this.repository.deleteById(created.id).catch(() => {});
            throw e;
        }

        info('Registro pendiente de confirmación', created.email);
        return publicUser(created);
    }

    async _sendVerification(user, token) {
        await this.emailService.sendVerificationEmail({
            to: user.email,
            token,
            expiresAt: user.emailVerificationExpiresAt
        });
    }

    async verifyEmail(token) {
        if (!token || typeof token !== 'string') {
            throw new Error('VERIFICATION_TOKEN_INVALID');
        }

        const tokenHash = hashToken(token);
        const user =
            await this.repository.findByVerificationTokenHash(tokenHash);

        if (!user) {
            throw new Error('VERIFICATION_TOKEN_INVALID');
        }

        if (
            user.emailVerificationExpiresAt &&
            Number(user.emailVerificationExpiresAt) <= Date.now()
        ) {
            await this.repository.updateById(user.id, {
                emailVerificationTokenHash: null,
                emailVerificationExpiresAt: null
            });
            throw new Error('VERIFICATION_TOKEN_EXPIRED');
        }

        if (user.active) {
            return publicUser(user);
        }

        const updated = await this.repository.updateById(user.id, {
            active: true,
            emailVerificationTokenHash: null,
            emailVerificationExpiresAt: null,
            emailVerifiedAt: new Date().toISOString()
        });

        if (!updated) throw new Error('USER_NOT_FOUND');

        info('Cuenta confirmada', updated.email);
        return publicUser(updated);
    }

    async resendVerification(email) {
        const normalizedEmail = normalizeEmail(email);

        if (!EMAIL_RE.test(normalizedEmail)) {
            throw new Error('EMAIL_INVALID');
        }

        const user = await this.repository.findByEmail(normalizedEmail);

        // No revelamos si el email existe o no desde la ruta HTTP.
        if (!user || user.active) {
            return { sent: false };
        }

        const now = Date.now();

        if (
            user.lastVerificationSentAt &&
            now - Number(user.lastVerificationSentAt) < RESEND_COOLDOWN_MS
        ) {
            throw new Error('RATE_LIMITED');
        }

        const verification = createVerificationToken(
            config.verificationTokenTtlMs
        );

        const updated = await this.repository.updateById(user.id, {
            emailVerificationTokenHash: verification.hash,
            emailVerificationExpiresAt: verification.expiresAt,
            lastVerificationSentAt: now
        });

        if (!updated) throw new Error('USER_NOT_FOUND');

        try {
            await this._sendVerification(updated, verification.token);
        } catch (e) {
            await this.repository
                .updateById(user.id, { lastVerificationSentAt: 0 })
                .catch(() => {});
            throw e;
        }

        info('Correo de confirmación reenviado', updated.email);
        return { sent: true };
    }

    async authenticate(email, password) {
        const normalizedEmail = normalizeEmail(email);
        const user = await this.repository.findByEmail(normalizedEmail);

        if (!user) {
            throw new Error('INVALID_CREDENTIALS');
        }

        if (!user.passwordHash) {
            if (user.oauthProvider) {
                throw new Error('OAUTH_ONLY');
            }

            throw new Error('INVALID_CREDENTIALS');
        }

        const passwordOk = await bcrypt.compare(
            password || '',
            user.passwordHash
        );

        if (!passwordOk) {
            throw new Error('INVALID_CREDENTIALS');
        }

        if (!user.active) {
            throw new Error('ACCOUNT_PENDING');
        }

        info('Inicio de sesión local', user.email);
        return publicUser(user);
    }

    async loginWithOAuth(profile = {}) {
        const email = normalizeEmail(profile.email);

        if (!email || !EMAIL_RE.test(email)) {
            throw new Error('OAUTH_EMAIL_MISSING');
        }

        if (profile.emailVerified === false) {
            throw new Error('OAUTH_EMAIL_NOT_VERIFIED');
        }

        const provider = profile.provider || 'google';
        const oauthId = profile.oauthId || profile.sub || null;
        const now = new Date().toISOString();

        const existing = await this.repository.findByEmail(email);

        if (!existing) {
            const created = await this.repository.create({
                email,
                emailLower: email,
                passwordHash: null,
                active: true,
                role: 'user',
                oauthProvider: provider,
                oauthId,
                emailVerifiedAt: now,
                createdAt: now
            });

            info('Usuario OAuth creado', email, provider);
            return publicUser(created);
        }

        const updated = await this.repository.updateById(existing.id, {
            active: true,
            oauthProvider: provider,
            oauthId,
            emailVerifiedAt: existing.emailVerifiedAt || now,
            emailVerificationTokenHash: null,
            emailVerificationExpiresAt: null
        });

        if (!updated) throw new Error('USER_NOT_FOUND');

        info('Inicio de sesión OAuth', email, provider);
        return publicUser(updated);
    }

    async getUser(id) {
        const user = await this.repository.findById(id);

        if (!user) throw new Error('USER_NOT_FOUND');

        return publicUser(user);
    }

    async getUserOrNull(id) {
        if (!id) return null;

        const user = await this.repository.findById(id);

        return publicUser(user);
    }

    async listUsers() {
        const users = await this.repository.findAll();

        return users
            .map(publicUser)
            .sort((a, b) =>
                String(a.email || '').localeCompare(String(b.email || ''))
            );
    }

    async isActive(id) {
        const user = await this.repository.findById(id);

        if (!user) throw new Error('USER_NOT_FOUND');

        return Boolean(user.active);
    }

    async getDiceColors(id) {
        const user = await this.repository.findById(id);

        if (!user) throw new Error('USER_NOT_FOUND');

        return diceColorState(user);
    }

    async selectDiceColor(id, colorId) {
        const normalized = String(colorId || '').trim();

        if (!isDiceColor(normalized)) {
            throw new Error('DICE_COLOR_INVALID');
        }

        const user = await this.repository.findById(id);

        if (!user) throw new Error('USER_NOT_FOUND');

        if (!normalizeDiceColors(user.diceColors).includes(normalized)) {
            throw new Error('DICE_COLOR_LOCKED');
        }

        const updated = await this.repository.updateById(id, {
            selectedDiceColor: normalized
        });

        if (!updated) throw new Error('USER_NOT_FOUND');

        info('Color de dados seleccionado', updated.email, normalized);

        return diceColorState(updated);
    }

    /**
     * Registra el premio de una partida una única vez por jugador y partida.
     * Si la petición se reintenta, el repositorio devuelve el premio ya
     * concedido sin volver a desbloquear ni a sortear nada.
     */
    async claimDiceReward(id, matchId, colorId) {
        if (colorId !== null && !isRewardColor(colorId)) {
            throw new Error('DICE_COLOR_INVALID');
        }

        return this.repository.claimDiceReward(
            id,
            matchId,
            colorId ?? null
        );
    }

    async deleteUser(requesterId, targetId) {
        const requester = await this.repository.findById(requesterId);

        if (!requester) throw new Error('USER_NOT_FOUND');

        if (
            requester.role !== 'admin' &&
            String(requesterId) !== String(targetId)
        ) {
            throw new Error('FORBIDDEN');
        }

        const deleted = await this.repository.deleteById(targetId);

        if (!deleted) throw new Error('USER_NOT_FOUND');

        info('Usuario eliminado', requester.email, '->', targetId);
    }
}
