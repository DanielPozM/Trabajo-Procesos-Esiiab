import 'dotenv/config';

import fs from 'fs';
import path from 'path';

import { info, error as logError } from './lib/logger.js';

// Si existe una clave local, se configura antes de importar app.js para que
// el cliente de Firestore la use al construirse.
try {
    const keyPath = './gcloud-key.json';

    if (
        fs.existsSync(keyPath) &&
        !process.env.GOOGLE_APPLICATION_CREDENTIALS
    ) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(keyPath);
        info('Usando gcloud-key.json para las credenciales locales');
    }
} catch {
    // La ausencia de clave local no es un error: en Cloud Run se usa la
    // identidad del service account.
}

const { app, service } = await import('./app.js');

const port = Number(process.env.PORT || 3000);

try {
    if (service && typeof service.init === 'function') {
        await service.init();
    }
} catch (error) {
    logError('Error durante la inicialización del servicio', error);
}

app.listen(port, () => {
    info(`Servidor escuchando en el puerto ${port}`);
});
