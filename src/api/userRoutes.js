import {Router} from 'express';

function log(...a){ if (process.env.NODE_ENV!=='test') console.log('[userRoutes]',...a); }

export function userRoutes(service){
  const r=Router();

  const auth=(q,s,n)=>q.session.userId?n():s.status(401).json({error:'UNAUTHENTICATED'});

  // list users - only admin allowed
  r.get('/',auth,async(q,s)=>{
    const requester = await service.repository.findById(q.session.userId);
    if(!requester) return s.status(401).json({error:'UNAUTHENTICATED'});
    if(requester.role!=='admin') return s.status(403).json({error:'FORBIDDEN'});
    log('listUsers', requester.email);
    const users = await service.listUsers();
    s.json(users);
  });

  r.get('/:id/active',auth,async(q,s)=>{
    try{
      const requester = await service.repository.findById(q.session.userId);
      if(!requester) return s.status(401).json({error:'UNAUTHENTICATED'});
      if(requester.role!=='admin') return s.status(403).json({error:'FORBIDDEN'});
      const active = await service.isActive(q.params.id);
      s.json({active});
    }catch(e){s.status(404).json({error:e.message});}
  });

  r.delete('/:id',auth,async(q,s)=>{
    try{
      await service.deleteUser(q.session.userId,q.params.id);
      s.status(204).end();
    }catch(e){
      s.status(e.message==='FORBIDDEN'?403:404).json({error:e.message});
    }
  });

  return r;
}
