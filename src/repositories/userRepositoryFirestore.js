import { Firestore } from '@google-cloud/firestore';

// Minimal Firestore-backed user repository implementing the same interface
// as the file-based/in-memory repository used elsewhere in the project.
export class UserRepositoryFirestore {
  constructor() {
    // Firestore client will pick credentials from
    // GOOGLE_APPLICATION_CREDENTIALS env var or default application creds.
    this.client = new Firestore();
    this.collection = this.client.collection('users');
  }

  async create(user) {
    // create a new document with auto id
    const docRef = this.collection.doc();
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
