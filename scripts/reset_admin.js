#!/usr/bin/env node
import 'dotenv/config';

import bcrypt from 'bcryptjs';

import { UserRepository } from '../src/repositories/userRepository.js';
import { UserRepositoryFirestore } from '../src/repositories/userRepositoryFirestore.js';

async function main() {
    const email = (
        process.env.ADMIN_EMAIL ||
        process.env.INIT_ADMIN_EMAIL ||
        ''
    )
        .trim()
        .toLowerCase();

    const password =
        process.env.ADMIN_PASSWORD ||
        process.env.INIT_ADMIN_PASSWORD ||
        '';

    if (!email || !password) {
        console.error(
            'Faltan credenciales. Define ADMIN_EMAIL y ADMIN_PASSWORD ' +
                '(o INIT_ADMIN_EMAIL e INIT_ADMIN_PASSWORD).'
        );
        process.exit(1);
    }

    if (password.length < 8) {
        console.error('La contraseña del administrador debe tener al menos 8 caracteres.');
        process.exit(1);
    }

    const useFirestore =
        process.env.NODE_ENV === 'production' ||
        process.env.DB_TYPE === 'firestore' ||
        Boolean(process.env.FIRESTORE_COLLECTION);

    const repository = useFirestore
        ? new UserRepositoryFirestore()
        : new UserRepository(process.env.DB_FILE);

    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await repository.findByEmail(email);

    if (existing) {
        await repository.updateById(existing.id, {
            email,
            emailLower: email,
            passwordHash,
            role: 'admin',
            active: true,
            emailVerificationTokenHash: null,
            emailVerificationExpiresAt: null,
            emailVerifiedAt:
                existing.emailVerifiedAt || new Date().toISOString()
        });

        console.log('Administrador actualizado:', email);
    } else {
        const created = await repository.create({
            email,
            emailLower: email,
            passwordHash,
            role: 'admin',
            active: true,
            oauthProvider: null,
            emailVerifiedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        });

        console.log('Administrador creado:', created.email);
    }
}

main().catch(error => {
    console.error('No se pudo preparar el administrador:', error.message || error);
    process.exit(1);
});
