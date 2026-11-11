import crypto from 'crypto';
import express from 'express';
import session from 'express-session';

import {
    config,
    isGoogleOAuthConfigured,
    isSmtpConfigured
} from './config.js';
import { authRoutes } from './api/authRoutes.js';
import { userRoutes } from './api/userRoutes.js';
import { UserService } from './services/userService.js';
import { createEmailService } from './services/emailService.js';
import { UserRepository } from './repositories/userRepository.js';
import { UserRepositoryFirestore } from './repositories/userRepositoryFirestore.js';
import { FirestoreSessionStore } from './repositories/sessionStoreFirestore.js';
import { info, warn, error as logError } from './lib/logger.js';

export const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    next();
});

app.use(express.json({ limit: '100kb' }));

if (config.isProduction && !config.sessionSecret) {
    throw new Error(
        'SESSION_SECRET es obligatorio en producción. ' +
            'Configúralo como variable de entorno.'
    );
}

if (config.isProduction && !config.appBaseUrlConfigured) {
    throw new Error(
        'APP_BASE_URL es obligatorio en producción. ' +
            'Configúralo con la URL pública del servicio.'
    );
}

if (config.isProduction && !isGoogleOAuthConfigured()) {
    warn(
        'Google OAuth no configurado (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET). ' +
            'El inicio de sesión con Google no estará disponible.'
    );
}

if (config.isProduction && !isSmtpConfigured()) {
    warn(
        'SMTP no configurado (SMTP_HOST/MAIL_FROM). Los registros locales ' +
            'fallarán con EMAIL_NOT_CONFIGURED.'
    );
}

const sessionSecret =
    config.sessionSecret || crypto.randomBytes(32).toString('hex');

if (!config.sessionSecret) {
    warn(
        'SESSION_SECRET no configurado. Se usará un secreto aleatorio ' +
            'temporal (las sesiones se perderán al reiniciar).'
    );
}

const useFirestore =
    config.isProduction ||
    process.env.DB_TYPE === 'firestore' ||
    Boolean(process.env.FIRESTORE_COLLECTION);

let repository;

if (useFirestore) {
    info('Inicializando repositorio Firestore');
    repository = new UserRepositoryFirestore();
} else {
    info(
        'Usando repositorio local, DB_FILE=',
        process.env.DB_FILE || ':memory:'
    );
    repository = new UserRepository(process.env.DB_FILE);
}

const sessionStore =
    repository instanceof UserRepositoryFirestore
        ? new FirestoreSessionStore({ client: repository.client })
        : undefined;

app.use(
    session({
        name: config.sessionCookieName,
        store: sessionStore,
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: config.isProduction,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        }
    })
);

const emailService = createEmailService();

export const service = new UserService(repository, {
    emailService,
    appBaseUrl: config.appBaseUrl
});

app.use('/api/auth', authRoutes(service));
app.use('/api/users', userRoutes(service));

app.use('/api', (req, res) => {
    res.status(404).json({ error: 'NOT_FOUND' });
});

app.use(express.static('public'));

app.get('*', (req, res) => {
    res.sendFile('index.html', { root: 'public' });
});

app.use((error, req, res, next) => {
    if (error?.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'INVALID_JSON' });
    }

    if (error?.type === 'entity.too.large') {
        return res.status(413).json({ error: 'PAYLOAD_TOO_LARGE' });
    }

    logError('Error no controlado', error);

    res.status(500).json({ error: 'INTERNAL_ERROR' });
});

// El servidor se arranca desde src/server.js, que importa `app`.
