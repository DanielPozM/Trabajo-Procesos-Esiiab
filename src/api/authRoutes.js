import crypto from 'crypto';
import { Router } from 'express';

import { config, isGoogleOAuthConfigured } from '../config.js';
import { sendError } from './httpErrors.js';
import { info, error as logError } from '../lib/logger.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL =
    'https://openidconnect.googleapis.com/v1/userinfo';

function regenerateSession(req, userId) {
    return new Promise((resolve, reject) => {
        req.session.regenerate(error => {
            if (error) return reject(error);

            req.session.userId = userId;
            req.session.save(saveError => {
                if (saveError) return reject(saveError);
                resolve();
            });
        });
    });
}

function statesMatch(expected, received) {
    if (!expected || !received) return false;

    const a = Buffer.from(String(expected));
    const b = Buffer.from(String(received));

    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function frontendRedirect(res, params = {}) {
    const url = new URL('/', config.appBaseUrl);

    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, String(value));
        }
    }

    res.redirect(url.toString());
}

export function authRoutes(service) {
    const router = Router();

    router.post('/register', async (req, res) => {
        try {
            const user = await service.register(
                req.body?.email,
                req.body?.password
            );

            res.status(201).json({
                id: user.id,
                email: user.email,
                active: user.active,
                message: 'VERIFICATION_EMAIL_SENT'
            });
        } catch (error) {
            sendError(res, error, logError);
        }
    });

    router.post('/login', async (req, res) => {
        try {
            const user = await service.authenticate(
                req.body?.email,
                req.body?.password
            );

            await regenerateSession(req, user.id);

            res.json({
                id: user.id,
                email: user.email,
                role: user.role,
                active: user.active,
                oauthProvider: user.oauthProvider || null
            });
        } catch (error) {
            sendError(res, error, logError);
        }
    });

    router.post('/logout', (req, res) => {
        req.session.destroy(error => {
            if (error) {
                logError('No se pudo destruir la sesión', error);
                return res.status(500).json({ error: 'INTERNAL_ERROR' });
            }

            res.clearCookie(config.sessionCookieName);
            res.status(204).end();
        });
    });

    router.get('/me', async (req, res) => {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'UNAUTHENTICATED' });
        }

        try {
            const user = await service.getUserOrNull(req.session.userId);

            if (!user) {
                return res.status(401).json({ error: 'UNAUTHENTICATED' });
            }

            res.json(user);
        } catch (error) {
            sendError(res, error, logError);
        }
    });

    router.get('/verify-email', async (req, res) => {
        try {
            const user = await service.verifyEmail(req.query?.token);

            frontendRedirect(res, {
                verified: '1',
                email: user.email
            });
        } catch (error) {
            const reason =
                error?.message || 'VERIFICATION_TOKEN_INVALID';

            if (reason === 'INTERNAL_ERROR') {
                logError('Error verificando email', error);
            }

            frontendRedirect(res, {
                verified: '0',
                error: reason
            });
        }
    });

    router.post('/resend-verification', async (req, res) => {
        try {
            await service.resendVerification(req.body?.email);

            // Respuesta genérica para no revelar si el email está registrado.
            res.json({
                message: 'VERIFICATION_EMAIL_SENT_IF_PENDING'
            });
        } catch (error) {
            sendError(res, error, logError);
        }
    });

    router.get('/oauth/google', (req, res) => {
        if (!isGoogleOAuthConfigured()) {
            return frontendRedirect(res, {
                oauth: 'error',
                reason: 'OAUTH_NOT_CONFIGURED'
            });
        }

        const state = crypto.randomBytes(24).toString('hex');
        req.session.oauthState = state;

        const authorizationUrl = new URL(GOOGLE_AUTH_URL);
        authorizationUrl.searchParams.set('client_id', config.google.clientId);
        authorizationUrl.searchParams.set(
            'redirect_uri',
            config.google.redirectUri
        );
        authorizationUrl.searchParams.set('response_type', 'code');
        authorizationUrl.searchParams.set('scope', 'openid email profile');
        authorizationUrl.searchParams.set('state', state);
        authorizationUrl.searchParams.set('prompt', 'select_account');

        req.session.save(error => {
            if (error) {
                logError('No se pudo guardar el estado OAuth', error);
                return res.status(500).json({ error: 'INTERNAL_ERROR' });
            }

            res.redirect(authorizationUrl.toString());
        });
    });

    router.get('/oauth/google/callback', async (req, res) => {
        const expectedState = req.session.oauthState;
        delete req.session.oauthState;

        if (!isGoogleOAuthConfigured()) {
            return frontendRedirect(res, {
                oauth: 'error',
                reason: 'OAUTH_NOT_CONFIGURED'
            });
        }

        if (req.query?.error) {
            info('OAuth cancelado por el usuario', req.query.error);
            return frontendRedirect(res, {
                oauth: 'error',
                reason: 'OAUTH_CANCELLED'
            });
        }

        if (!statesMatch(expectedState, req.query?.state)) {
            return frontendRedirect(res, {
                oauth: 'error',
                reason: 'OAUTH_STATE_INVALID'
            });
        }

        if (!req.query?.code) {
            return frontendRedirect(res, {
                oauth: 'error',
                reason: 'OAUTH_EXCHANGE_FAILED'
            });
        }

        try {
            const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    code: String(req.query.code),
                    client_id: config.google.clientId,
                    client_secret: config.google.clientSecret,
                    redirect_uri: config.google.redirectUri,
                    grant_type: 'authorization_code'
                })
            });

            if (!tokenResponse.ok) {
                const details = await tokenResponse.text();
                logError(
                    'Google rechazó el intercambio de token',
                    tokenResponse.status,
                    details
                );

                return frontendRedirect(res, {
                    oauth: 'error',
                    reason: 'OAUTH_EXCHANGE_FAILED'
                });
            }

            const tokens = await tokenResponse.json();

            if (!tokens.access_token) {
                logError('Google no devolvió access_token');
                return frontendRedirect(res, {
                    oauth: 'error',
                    reason: 'OAUTH_EXCHANGE_FAILED'
                });
            }

            const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
                headers: {
                    Authorization: `Bearer ${tokens.access_token}`
                }
            });

            if (!profileResponse.ok) {
                logError(
                    'No se pudo obtener el perfil de Google',
                    profileResponse.status
                );

                return frontendRedirect(res, {
                    oauth: 'error',
                    reason: 'OAUTH_EXCHANGE_FAILED'
                });
            }

            const profile = await profileResponse.json();

            const user = await service.loginWithOAuth({
                email: profile.email,
                emailVerified: profile.email_verified,
                oauthId: profile.sub,
                provider: 'google'
            });

            await regenerateSession(req, user.id);

            frontendRedirect(res, { oauth: 'success' });
        } catch (error) {
            logError('Error en el callback de Google', error);

            frontendRedirect(res, {
                oauth: 'error',
                reason: error?.message || 'OAUTH_EXCHANGE_FAILED'
            });
        }
    });

    return router;
}
