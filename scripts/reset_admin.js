#!/usr/bin/env node
import { UserRepository } from '../src/repositories/userRepository.js';
import { UserRepositoryFirestore } from '../src/repositories/userRepositoryFirestore.js';
import bcrypt from 'bcryptjs';

async function maybeAwait(v){ return v && typeof v.then === 'function' ? await v : v; }

async function main(){
  const email = process.env.ADMIN_EMAIL || process.env.INIT_ADMIN_EMAIL || 'dpm@gmail.com';
  const password = process.env.ADMIN_PASSWORD || process.env.INIT_ADMIN_PASSWORD || '123456789';
  const dbType = process.env.DB_TYPE || ':memory:';

  let repo;
  if (dbType === 'firestore') {
    repo = new UserRepositoryFirestore();
  } else {
    repo = new UserRepository(process.env.DB_FILE);
  }

  console.log('Using DB_TYPE=', dbType);

  const existing = await maybeAwait(repo.findByEmail(email));
  if (existing) {
    console.log('Existing user found:', existing.email, 'id=', existing.id);
    try{
      await maybeAwait(repo.deleteById(existing.id));
      console.log('Deleted existing user id=', existing.id);
    }catch(e){ console.error('Could not delete existing user:', e.message || e); }
  }

  const hash = bcrypt.hashSync(password,10);
  const created = await maybeAwait(repo.create({ email, passwordHash: hash, active: true, role: 'admin' }));
  console.log('Admin ensured. email=', created.email, 'id=', created.id);
}

main().catch(e=>{ console.error(e); process.exit(1); });
