import test from 'node:test';import assert from 'node:assert/strict';import {UserRepository} from '../src/repositories/userRepository.js';import {UserService} from '../src/services/userService.js';
test('password is hashed',async()=>{const s=new UserService(new UserRepository());const u=await s.register('a@test.com','password123');assert.notEqual(u.passwordHash,'password123');});
test('bad password rejected',async()=>{const s=new UserService(new UserRepository());await s.register('a@test.com','password123');await assert.rejects(()=>s.authenticate('a@test.com','bad'),/INVALID_CREDENTIALS/);});
