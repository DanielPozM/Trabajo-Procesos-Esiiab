const isProduction = process.env.NODE_ENV === 'production';

const port = Number(process.env.PORT || 3000);

const appBaseUrlConfigured = Boolean(process.env.APP_BASE_URL);

const appBaseUrl = (
    process.env.APP_BASE_URL ||
    `http://localhost:${port}`
).replace(/\/+$/, '');

const sessionCookieName = 'sid';

const google = {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri:
        process.env.GOOGLE_REDIRECT_URI ||
        `${appBaseUrl}/api/auth/oauth/google/callback`
};

const smtp = {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || ''
};

const verificationTokenTtlMinutes = Number(
    process.env.VERIFICATION_TOKEN_TTL_MINUTES || 24 * 60
);

const matchmakingTtlSeconds = Number(
    process.env.MATCHMAKING_TTL_SECONDS || 120
);

export const config = {
    isProduction,
    port,
    appBaseUrl,
    appBaseUrlConfigured,
    sessionCookieName,
    sessionSecret: process.env.SESSION_SECRET || '',
    google,
    smtp,
    verificationTokenTtlMs: verificationTokenTtlMinutes * 60 * 1000,
    matchmaking: {
        ttlMs: matchmakingTtlSeconds * 1000,
        collection: process.env.MATCHMAKING_COLLECTION || 'matchmaking',
        matchesCollection: process.env.MATCHES_COLLECTION || 'matches'
    }
};

export function isGoogleOAuthConfigured() {
    return Boolean(google.clientId && google.clientSecret);
}

export function isSmtpConfigured() {
    return Boolean(smtp.host && smtp.from);
}
