import bcrypt from 'bcryptjs';

import { app, service } from './src/app.js';

const passwordHash = await bcrypt.hash('password123', 10);

for (const email of ['ui-a@test.com', 'ui-b@test.com']) {
    const existing = await service.repository.findByEmail(email);

    if (!existing) {
        await service.repository.create({
            email,
            emailLower: email,
            passwordHash,
            active: true,
            role: 'user',
            oauthProvider: null,
            emailVerifiedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        });
    }
}

app.listen(3000, () => {
    console.log('UI test server on http://localhost:3000');
});
