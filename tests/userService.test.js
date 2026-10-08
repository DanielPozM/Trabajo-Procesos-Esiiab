import test from 'node:test';import assert from 'node:assert/strict';import {UserRepository} from '../src/repositories/userRepository.js';import {UserService} from '../src/services/userService.js';
const s=()=>new UserService(new UserRepository());
test('registra',()=>assert.equal(s().register('a@test.com').email,'a@test.com'));
test('email inválido',()=>assert.throws(()=>s().register('no'),/EMAIL_INVALID/));
test('email duplicado',()=>{const x=s();x.register('a@test.com');assert.throws(()=>x.register('a@test.com'),/EMAIL_EXISTS/)});
test('lista',()=>{const x=s();x.register('a@test.com');x.register('b@test.com');assert.equal(x.listUsers().length,2)});
test('activo',()=>{const x=s(),u=x.register('a@test.com');assert.equal(x.isActive(u.id),true)});
test('no existe',()=>assert.throws(()=>s().isActive('999'),/USER_NOT_FOUND/));
test('no puede eliminar a otro',()=>{const x=s(),a=x.register('a@test.com'),b=x.register('b@test.com');assert.throws(()=>x.deleteUser(a.id,b.id),/FORBIDDEN/)});
