import express from 'express';
import session from 'express-session';

import { authRoutes } from './api/authRoutes.js';
import { userRoutes } from './api/userRoutes.js';

import { UserService } from './services/userService.js';
import { UserRepository } from './repositories/userRepository.js';
import { UserRepositoryFirestore } from './repositories/userRepositoryFirestore.js';

export const app = express();
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

let repository;
try {
  if (process.env.DB_TYPE === 'firestore' || process.env.FIRESTORE_COLLECTION) {
    console.log('Using Firestore repository, collection=', process.env.FIRESTORE_COLLECTION || 'users');
    repository = new UserRepositoryFirestore();
  } else {
    console.log('Using file/in-memory repository, DB_FILE=', process.env.DB_FILE || ':memory:');
    repository = new UserRepository(process.env.DB_FILE);
  }
} catch (e) {
  console.error('Error initializing repository', e);
  // fall back to in-memory repository to keep the server running
  repository = new UserRepository(':memory:');
}

export const service = new UserService(repository);

app.use('/api/auth', authRoutes(service));
app.use('/api/users', userRoutes(service));

app.use(express.static('public'));

app.get('*', (req, res) => {
    res.sendFile('index.html', { root: 'public' });
});

// server is started from src/server.js which imports `app`
