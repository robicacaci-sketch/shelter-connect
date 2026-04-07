import sqlite3 from "sqlite3";
import path from "path";

sqlite3.verbose();

const dbFile =
  process.env.DATABASE_URL ||
  path.join(__dirname, "..", "..", "data", "housing-readiness.db");

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
    db.run(`ALTER TABLE roadmapSteps ADD COLUMN notes TEXT DEFAULT ''`, () => {});

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

