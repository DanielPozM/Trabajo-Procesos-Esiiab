import bcrypt from 'bcryptjs';

function log(...args){
  if (process.env.NODE_ENV !== 'test') console.log('[UserService]',...args);
}

export class UserService{
  constructor(repository){
    this.repository=repository;
    // try to create initial admin asynchronously (do not block constructor)
    this._ensureInitialAdmin();
  }

  async _ensureInitialAdmin(){
    // allow safe defaults in non-production for convenience
    const defaultEmail = 'dpm@gmail.com';
    const defaultPassword = '123456789';
    const adminEmail = process.env.INIT_ADMIN_EMAIL || (process.env.NODE_ENV === 'production' ? null : defaultEmail);
    const adminPassword = process.env.INIT_ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? null : defaultPassword);
    if (!adminEmail || !adminPassword) return;
    const exists = await this.repository.findByEmail(adminEmail);
    if (!exists) {
      const pwdHash = bcrypt.hashSync(adminPassword,10);
      const u = await this.repository.create({email:adminEmail,passwordHash:pwdHash,active:true,role:'admin'});
      log('Created initial admin', u.email);
    }
  }

  // explicit init to allow callers to await background setup tasks
  async init(){
    await this._ensureInitialAdmin();
  }

  async register(email,password){
    if(!email||!email.includes('@'))throw new Error('EMAIL_INVALID');
    if(!password||password.length<8)throw new Error('PASSWORD_TOO_SHORT');
    if(await this.repository.findByEmail(email))throw new Error('EMAIL_EXISTS');
    const role = 'user';
    const user = {email,passwordHash:await bcrypt.hash(password,10),active:true,role};
    const created = await this.repository.create(user);
    log('register', created.email);
    return created;
  }

  async authenticate(email,password){
    const u=await this.repository.findByEmail(email);
    if(!u||!(await bcrypt.compare(password,u.passwordHash)))throw new Error('INVALID_CREDENTIALS');
    if(!u.active) throw new Error('ACCOUNT_PENDING');
    log('authenticate', u.email);
    return u;
  }

  listUsers(){
    const res = this.repository.findAll();
    if (res && typeof res.then === 'function') {
      return res.then(users => users.map(({passwordHash,...u})=>u));
    }
    return res.map(({passwordHash,...u})=>u);
  }

  isActive(id){
    const res = this.repository.findById(id);
    if (res && typeof res.then === 'function') {
      return res.then(u => { if(!u) throw new Error('USER_NOT_FOUND'); return u.active; });
    }
    const u = res;
    if(!u) throw new Error('USER_NOT_FOUND');
    return u.active;
  }

  deleteUser(requesterId,targetId){
    const requesterRes = this.repository.findById(requesterId);
    if (requesterRes && typeof requesterRes.then === 'function') {
      return requesterRes.then(async requester => {
        if(!requester) throw new Error('USER_NOT_FOUND');
        if(requester.role!=='admin' && String(requesterId)!==String(targetId)) throw new Error('FORBIDDEN');
        const ok = await this.repository.deleteById(targetId);
        if(!ok) throw new Error('USER_NOT_FOUND');
        log('deleteUser', requester.email, '->', targetId);
      });
    }

    const requester = requesterRes;
    if(!requester) throw new Error('USER_NOT_FOUND');
    if(requester.role!=='admin' && String(requesterId)!==String(targetId)) throw new Error('FORBIDDEN');
    const ok = this.repository.deleteById(targetId);
    if (ok && typeof ok.then === 'function') {
      // repository delete returned a promise
      return ok.then(ok2 => { if(!ok2) throw new Error('USER_NOT_FOUND'); log('deleteUser', requester.email, '->', targetId); });
    }
    if(!ok) throw new Error('USER_NOT_FOUND');
    log('deleteUser', requester.email, '->', targetId);
  }
}
