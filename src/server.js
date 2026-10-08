import {app, service} from './app.js';
import fs from 'fs';
import path from 'path';

const port=Number(process.env.PORT||3000);

// if a key file exists in project root, set GOOGLE_APPLICATION_CREDENTIALS
try{
  const p = './gcloud-key.json';
  if (fs.existsSync(p) && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(p);
    console.log('Using local gcloud-key.json for credentials');
  }
}catch(e){/* ignore */}

(async ()=>{
  // Start listening immediately so the container becomes healthy quickly.
  app.listen(port,()=>console.log(`Server listening on ${port}`));

  // Perform initialization asynchronously so it does not block the process from
  // accepting connections (prevents Cloud Run health-check timeouts).
  try{
    if (service && typeof service.init === 'function') {
      service.init().then(() => console.log('Service init completed')).catch(e => console.error('Error during service init', e));
    }
  }catch(e){
    console.error('Error scheduling service init', e);
  }
})();
