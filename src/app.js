import express from 'express';
import session from 'express-session';

import { authRoutes } from './api/authRoutes.js';
import { userRoutes } from './api/userRoutes.js';

import { UserService } from './services/userService.js';
import { UserRepository } from './repositories/userRepository.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(
    session({
        secret: process.env.SESSION_SECRET || 'hito-2-secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: false
        }
    })
);

const repository = new UserRepository();
const service = new UserService(repository);

app.use('/api/auth', authRoutes(service));
app.use('/api/users', userRoutes(service));

app.use(express.static('public'));

app.get('*', (req, res) => {
    res.sendFile('index.html', { root: 'public' });
});

app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});