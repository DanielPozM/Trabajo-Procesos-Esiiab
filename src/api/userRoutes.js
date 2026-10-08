import {Router} from 'express';
export function userRoutes(service){const r=Router();
 r.post('/',(q,s)=>{try{s.status(201).json(service.register(q.body?.email));}catch(e){s.status(e.message==='EMAIL_EXISTS'?409:400).json({error:e.message});}});
 r.get('/',(_q,s)=>s.json(service.listUsers()));
 r.get('/:id/active',(q,s)=>{try{s.json({active:service.isActive(q.params.id)});}catch(e){s.status(404).json({error:e.message});}});
 r.delete('/:id',(q,s)=>{try{service.deleteUser(q.session?.userId??q.params.id,q.params.id);s.status(204).end();}catch(e){s.status(e.message==='FORBIDDEN'?403:404).json({error:e.message});}});return r;}
