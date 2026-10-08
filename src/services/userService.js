export class UserService {
  constructor(repository){this.repository=repository;}
  register(email){
    if(!email||!email.includes('@')) throw new Error('EMAIL_INVALID');
    if(this.repository.findByEmail(email)) throw new Error('EMAIL_EXISTS');
    return this.repository.create({email,active:true,role:'user'});
  }
  listUsers(){return this.repository.findAll();}
  isActive(id){const u=this.repository.findById(id);if(!u)throw new Error('USER_NOT_FOUND');return u.active;}
  deleteUser(requesterId,targetId){if(String(requesterId)!==String(targetId))throw new Error('FORBIDDEN');if(!this.repository.deleteById(targetId))throw new Error('USER_NOT_FOUND');}
}
