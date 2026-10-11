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

        if (!projectId) {
            throw new Error(
                'Falta configurar el ID del proyecto de Google Cloud'
            );
        }

        this.client = new Firestore({
            projectId,
            databaseId
        });

        this.collectionName =
            process.env.FIRESTORE_COLLECTION ||
            'procesosusuariosdpm';

        this.collection =
            this.client.collection(this.collectionName);

        console.log(
            `Firestore conectado: project=${projectId}, ` +
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

        const stored = { id: docRef.id, ...user };

        await docRef.set(stored);
        return stored;
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

        const id = encodeURIComponent(email);
        const doc = await this.collection.doc(id).get();

        if (doc.exists) return doc.data();

        const snapshot = await this.collection
            .where('email', '==', email)
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