export class UserRepository {
  constructor(){this.users=new Map();this.nextId=1;}
  create(user){const stored={id:String(this.nextId++),...user};this.users.set(stored.id,stored);return stored;}
  findAll(){return [...this.users.values()];}
  findById(id){return this.users.get(String(id))??null;}
  findByEmail(email){return this.findAll().find(u=>u.email.toLowerCase()===email.toLowerCase())??null;}
  deleteById(id){return this.users.delete(String(id));}
}
