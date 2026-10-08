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
  try{
    if (service && typeof service.init === 'function') await service.init();
  }catch(e){
    console.error('Error during service init', e);
  }

  app.listen(port,()=>console.log(`Server listening on ${port}`));
})();
