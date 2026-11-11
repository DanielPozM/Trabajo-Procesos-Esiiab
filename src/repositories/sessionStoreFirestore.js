import session from 'express-session';

/**
 * Almacén de sesiones sobre Firestore.
 *
 * Express-session usa MemoryStore por defecto, que pierde las sesiones al
 * reiniciar el proceso y no sirve con varias instancias de Cloud Run. Este
 * almacén guarda el payload serializado para evitar problemas con las fechas
 * que Firestore devuelve como Timestamp.
 */
export class FirestoreSessionStore extends session.Store {
    constructor({
        client,
        collectionName = process.env.SESSION_COLLECTION || 'sessions',
        ttlMs = 7 * 24 * 60 * 60 * 1000
    } = {}) {
        super();

        if (!client) {
            throw new Error('FirestoreSessionStore requiere un cliente Firestore');
        }

        this.collection = client.collection(collectionName);
        this.ttlMs = ttlMs;
    }

    _expiresAt() {
        return Date.now() + this.ttlMs;
    }

    get(sid, callback) {
        this.collection
            .doc(String(sid))
            .get()
            .then(async doc => {
                if (!doc.exists) return callback(null, null);

                const data = doc.data() || {};

                if (Number(data.expiresAt || 0) <= Date.now()) {
                    await doc.ref.delete().catch(() => {});
                    return callback(null, null);
                }

                let parsed = null;

                try {
                    parsed = JSON.parse(data.payload || 'null');
                } catch {
                    parsed = null;
                }

                callback(null, parsed);
            })
            .catch(error => callback(error));
    }

    set(sid, sessionData, callback = () => {}) {
        this.collection
            .doc(String(sid))
            .set({
                payload: JSON.stringify(sessionData),
                expiresAt: this._expiresAt()
            })
            .then(() => callback(null))
            .catch(error => callback(error));
    }

    touch(sid, sessionData, callback = () => {}) {
        this.collection
            .doc(String(sid))
            .set(
                {
                    expiresAt: this._expiresAt()
                },
                { merge: true }
            )
            .then(() => callback(null))
            .catch(error => callback(error));
    }

    destroy(sid, callback = () => {}) {
        this.collection
            .doc(String(sid))
            .delete()
            .then(() => callback(null))
            .catch(error => callback(error));
    }
}
