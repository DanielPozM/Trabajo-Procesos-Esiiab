import fs from 'fs';
import path from 'path';

// By default use in-memory storage unless DB_FILE is provided.
const DEFAULT_DB_FILE = process.env.DB_FILE ?? ':memory:';

function ensureDirForFile(file) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export class UserRepository {
  constructor(dbFile = DEFAULT_DB_FILE) {
    this.dbFile = dbFile;
    this.inMemory = process.env.NODE_ENV === 'test' || this.dbFile === ':memory:';
    if (!this.inMemory) {
      ensureDirForFile(this.dbFile);
    }
    if (this.inMemory) {
      this.nextId = 1;
      this.users = new Map();
    } else {
      this._load();
    }
  }

  _load() {
    try {
      const raw = fs.existsSync(this.dbFile) ? fs.readFileSync(this.dbFile, 'utf8') : '';
      const parsed = raw ? JSON.parse(raw) : { nextId: 1, users: {} };
      this.nextId = parsed.nextId ?? 1;
      this.users = new Map(Object.entries(parsed.users ?? {}));
    } catch (e) {
      // on corruption, start fresh but do not crash
      this.nextId = 1;
      this.users = new Map();
    }
  }

  _persist() {
    if (this.inMemory) return;
    const data = { nextId: this.nextId, users: Object.fromEntries(this.users) };
    fs.writeFileSync(this.dbFile, JSON.stringify(data, null, 2), 'utf8');
  }

  create(user) {
    const stored = { id: String(this.nextId++), ...user };
    this.users.set(stored.id, stored);
    this._persist();
    return stored;
  }

  findAll() {
    return [...this.users.values()];
  }

  findById(id) {
    return this.users.get(String(id)) ?? null;
  }

  findByEmail(email) {
    if (!email) return null;
    return this.findAll().find(u => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  deleteById(id) {
    const ok = this.users.delete(String(id));
    if (ok) this._persist();
    return ok;
  }
}
