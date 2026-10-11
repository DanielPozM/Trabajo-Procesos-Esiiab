import { Firestore } from '@google-cloud/firestore';

// Minimal Firestore-backed user repository implementing the same interface
// as the file-based/in-memory repository used elsewhere in the project.
export class UserRepositoryFirestore {
  constructor() {
    // Firestore client will pick credentials from GOOGLE_APPLICATION_CREDENTIALS
    // env var or default application creds. To avoid NOT_FOUND errors when the
    // environment doesn't provide a project id, prefer an explicit project id
    // from env vars or fall back to the current project.
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || process.env.PROJECT_ID || process.env.PROJECT || process.env.npm_config_project || undefined;
    try {
      this.client = projectId ? new Firestore({ projectId }) : new Firestore();
    } catch (e) {
      // ensure constructor never throws — log and rethrow to help debugging
      console.error('Firestore client init error', e && e.message ? e.message : e);
      this.client = new Firestore();
    }
    const collectionName = process.env.FIRESTORE_COLLECTION || 'users';
    this.collectionName = collectionName;
    this.collection = this.client.collection(collectionName);
  }

  async create(user) {
    // use email-based id to avoid duplicates across runs
    const id = user && user.email ? encodeURIComponent(user.email) : undefined;
    const docRef = id ? this.collection.doc(id) : this.collection.doc();
    const stored = { id: docRef.id, ...user };
    await docRef.set(stored);
    return stored;
  }

  async findAll() {
    const snapshot = await this.collection.get();
    return snapshot.docs.map(d => d.data());
  }

  async findById(id) {
    const doc = await this.collection.doc(String(id)).get();
    return doc.exists ? doc.data() : null;
  }

  async findByEmail(email) {
    if (!email) return null;
    // try direct lookup by encoded email id (faster and avoids indexes)
    const id = encodeURIComponent(email);
    const doc = await this.collection.doc(id).get();
    if (doc.exists) return doc.data();

    // fallback to querying by email field
    const q = await this.collection.where('email', '==', email).limit(1).get();
    if (q.empty) return null;
    return q.docs[0].data();
  }

  async deleteById(id) {
    const docRef = this.collection.doc(String(id));
    const doc = await docRef.get();
    if (!doc.exists) return false;
    await docRef.delete();
    return true;
  }
}
