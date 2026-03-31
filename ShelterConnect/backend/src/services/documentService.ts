import { db } from "../db/index";
import { ClientDocument } from "../models/ClientDocument";
import path from "path";
import fs from "fs";

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const uploadsDir = path.join(__dirname, "../../uploads");

export const saveClientDocument = (
  clientId: string,
  docType: ClientDocument["docType"],
  file: Express.Multer.File,
  notes?: string
): Promise<ClientDocument> => {
  const id = generateId();
  const uploadedAt = new Date().toISOString();
  const ext = path.extname(file.originalname);
  const storedName = `${id}${ext}`;
  const destPath = path.join(uploadsDir, storedName);

  // Move the file from temp to final destination
  fs.renameSync(file.path, destPath);

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO clientDocuments (id, clientId, docType, originalName, storedName, mimeType, uploadedAt, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, clientId, docType, file.originalname, storedName, file.mimetype, uploadedAt, notes ?? null],
      (err) => {
        if (err) { reject(err); return; }
        resolve({ id, clientId, docType, originalName: file.originalname, storedName, mimeType: file.mimetype, uploadedAt, notes });
      }
    );
  });
};

export const getClientDocuments = (clientId: string): Promise<ClientDocument[]> => {
  return new Promise((resolve, reject) => {
    db.all<ClientDocument>(
      `SELECT * FROM clientDocuments WHERE clientId = ? ORDER BY uploadedAt DESC`,
      [clientId],
      (err, rows) => {
        if (err) { reject(err); return; }
        resolve(rows ?? []);
      }
    );
  });
};

export const deleteClientDocument = (docId: string, clientId: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    db.get<ClientDocument>(
      `SELECT storedName FROM clientDocuments WHERE id = ? AND clientId = ?`,
      [docId, clientId],
      (err, row) => {
        if (err) { reject(err); return; }
        if (!row) { resolve(false); return; }

        // Delete file from filesystem
        const filePath = path.join(uploadsDir, row.storedName);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        db.run(`DELETE FROM clientDocuments WHERE id = ?`, [docId], (delErr) => {
          if (delErr) { reject(delErr); return; }
          resolve(true);
        });
      }
    );
  });
};
