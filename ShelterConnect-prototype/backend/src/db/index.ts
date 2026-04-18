import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";

sqlite3.verbose();

// On Railway the source filesystem is read-only after build — use /tmp which
// is always writable. Locally use the data/ directory next to the source.
// Railway sets RAILWAY_ENVIRONMENT_NAME (not RAILWAY_ENVIRONMENT).
const onRailway = !!(
  process.env.RAILWAY_ENVIRONMENT_NAME ||
  process.env.RAILWAY_PROJECT_ID ||
  process.env.RAILWAY_SERVICE_ID
);
const defaultDbPath = onRailway
  ? "/tmp/housing-readiness.db"
  : path.join(__dirname, "..", "..", "data", "housing-readiness.db");

const dbFile = process.env.SQLITE_PATH || defaultDbPath;

// Ensure the data directory exists (only needed for non-/tmp paths)
const dbDir = path.dirname(dbFile);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new sqlite3.Database(dbFile);

export const initDb = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        provider TEXT NOT NULL,
        providerId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        dateOfBirth TEXT,
        currentShelterStatus TEXT NOT NULL,
        documentStatus TEXT NOT NULL,
        specialCircumstance TEXT NOT NULL DEFAULT 'none',
        additionalInfo TEXT NOT NULL DEFAULT '{}',
        case_status TEXT NOT NULL DEFAULT 'Active',
        caseManagerId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (caseManagerId) REFERENCES users(id)
      )
    `);

    // Migrate existing DBs: add passwordHash column for email/password auth (silently ignored if already exists)
    db.run(`ALTER TABLE users ADD COLUMN passwordHash TEXT`, () => {});

    // Migrate existing DBs that don't yet have this column (error silently ignored)
    db.run(`ALTER TABLE clients ADD COLUMN case_status TEXT NOT NULL DEFAULT 'Active'`, () => {});

    db.run(`
      CREATE TABLE IF NOT EXISTS roadmaps (
        id TEXT PRIMARY KEY,
        clientId TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        finalGoal TEXT NOT NULL DEFAULT '',
        summary TEXT NOT NULL DEFAULT '',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (clientId) REFERENCES clients(id)
      )
    `);

    // Migrate existing DBs that don't yet have these columns (errors silently ignored)
    db.run(`ALTER TABLE roadmaps ADD COLUMN finalGoal TEXT NOT NULL DEFAULT ''`, () => {});
    db.run(`ALTER TABLE roadmaps ADD COLUMN summary TEXT NOT NULL DEFAULT ''`, () => {});

    db.run(`
      CREATE TABLE IF NOT EXISTS roadmapSteps (
        id TEXT PRIMARY KEY,
        roadmapId TEXT NOT NULL,
        stage TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        "order" INTEGER NOT NULL,
        FOREIGN KEY (roadmapId) REFERENCES roadmaps(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS clientDocuments (
        id TEXT PRIMARY KEY,
        clientId TEXT NOT NULL,
        docType TEXT NOT NULL,
        originalName TEXT NOT NULL,
        storedName TEXT NOT NULL,
        mimeType TEXT NOT NULL,
        uploadedAt TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (clientId) REFERENCES clients(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS caseNotes (
        id TEXT PRIMARY KEY,
        clientId TEXT NOT NULL,
        caseManagerId TEXT NOT NULL,
        note TEXT NOT NULL,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
      )
    `);
  });
};

