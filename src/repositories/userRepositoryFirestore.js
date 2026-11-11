import { Firestore } from '@google-cloud/firestore';

export class UserRepositoryFirestore {
    constructor() {
        const projectId =
            process.env.GOOGLE_CLOUD_PROJECT ||
            process.env.GCP_PROJECT ||
            process.env.PROJECT_ID ||
            process.env.PROJECT ||
            process.env.npm_config_project;

        const databaseId =
            process.env.FIRESTORE_DATABASE_ID ||
            'procesosusuariosdpm';

        // En Cloud Run el proyecto se puede inferir de las credenciales o del
        // metadata server. Si existe una variable de entorno, se usa.
        const firestoreOptions = { databaseId };
        if (projectId) firestoreOptions.projectId = projectId;

        this.client = new Firestore(firestoreOptions);

        this.collectionName =
            process.env.FIRESTORE_COLLECTION ||
            'procesosusuariosdpm';

        this.collection =
            this.client.collection(this.collectionName);

        console.log(
            `Firestore conectado: project=${this.client.projectId}, ` +
            `database=${databaseId}, ` +
            `collection=${this.collectionName}`
        );
    }

    async create(user) {
        const id = user?.email
            ? encodeURIComponent(user.email)
            : undefined;

        const docRef = id
            ? this.collection.doc(id)
            : this.collection.doc();

        const stored = {
            id: docRef.id,
            ...user
        };
        if (user?.email) {
            stored.emailLower = String(user.email).toLowerCase();
        }

        await docRef.set(stored);
        console.log('User saved to Firestore', {
            projectId: this.client.projectId,
            databaseId: process.env.FIRESTORE_DATABASE_ID || '(default)',
            collection: this.collectionName,
            documentId: docRef.id
        });
        return stored;
    }

    async updateById(id, patch) {
        const docRef = this.collection.doc(String(id));
        const doc = await docRef.get();

        if (!doc.exists) return null;

        const patchToStore = { ...patch, id: docRef.id };
        if (patch?.email) {
            patchToStore.emailLower = String(patch.email).toLowerCase();
        }

        await docRef.set(patchToStore, { merge: true });

        const updated = await docRef.get();
        return updated.data();
    }

    async findAll() {
        const snapshot = await this.collection.get();
        return snapshot.docs.map(doc => doc.data());
    }

    async findById(id) {
        const doc = await this.collection.doc(String(id)).get();
        return doc.exists ? doc.data() : null;
    }

    async findByEmail(email) {
        if (!email) return null;

        const raw = String(email).trim();
        const lower = raw.toLowerCase();

        // Los documentos nuevos usan el email en minúsculas como ID.
        // Se prueban ambas variantes para no romper datos antiguos.
        for (const candidate of [...new Set([raw, lower])]) {
            const doc = await this.collection
                .doc(encodeURIComponent(candidate))
                .get();

            if (doc.exists) return doc.data();
        }

        const byLower = await this.collection
            .where('emailLower', '==', lower)
            .limit(1)
            .get();

        if (!byLower.empty) return byLower.docs[0].data();

        const byExact = await this.collection
            .where('email', '==', raw)
            .limit(1)
            .get();

        if (!byExact.empty) return byExact.docs[0].data();

        // Último recurso para documentos creados antes de emailLower.
        const all = await this.findAll();
        return (
            all.find(
                u => String(u.email || '').toLowerCase() === lower
            ) || null
        );
    }

    async findByVerificationTokenHash(tokenHash) {
        if (!tokenHash) return null;

        const snapshot = await this.collection
            .where('emailVerificationTokenHash', '==', tokenHash)
            .limit(1)
            .get();

        return snapshot.empty
            ? null
            : snapshot.docs[0].data();
    }

    async deleteById(id) {
        const docRef = this.collection.doc(String(id));
        const doc = await docRef.get();

        if (!doc.exists) return false;

        await docRef.delete();
        return true;
    }
}