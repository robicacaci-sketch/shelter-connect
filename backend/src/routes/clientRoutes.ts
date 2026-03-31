import express from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  createClient,
  CreateClientPayload,
  getClientForCaseManager,
  listClientsForCaseManager
} from "../services/clientService";
import { getOrCreateRoadmapForClient } from "../services/roadmapService";
import { SpecialCircumstance } from "../types/index";
import { VALID_CASE_STATUSES } from "../models/Client";
import { db } from "../db/index";

const generateId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const router = express.Router();

const VALID_CIRCUMSTANCES: SpecialCircumstance[] = [
  "none", "reentry", "dv_survivor", "veteran", "elderly", "youth", "undocumented", "eviction"
];

const DOC_BOOLEAN_KEYS = ["birthCert", "ssn", "stateId", "address", "income"] as const;

router.post(
  "/",
  requireAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }

    const {
      name,
      dateOfBirth,
      currentShelterStatus,
      documentStatus,
      specialCircumstance = "none",
      additionalInfo
    } = (req.body ?? {}) as Partial<CreateClientPayload> & { specialCircumstance?: string; additionalInfo?: Record<string, unknown> };

    // Required fields
    if (!name || !currentShelterStatus) {
      res.status(400).json({
        error: "Missing required fields: name, currentShelterStatus"
      });
      return;
    }

    // documentStatus validation
    if (!documentStatus || typeof documentStatus !== "object") {
      res.status(400).json({ error: "Missing or invalid 'documentStatus' field" });
      return;
    }

    for (const key of DOC_BOOLEAN_KEYS) {
      if (typeof (documentStatus as Record<string, unknown>)[key] !== "boolean") {
        res.status(400).json({ error: `documentStatus.${key} must be a boolean` });
        return;
      }
    }

    // specialCircumstance validation
    if (!VALID_CIRCUMSTANCES.includes(specialCircumstance as SpecialCircumstance)) {
      res.status(400).json({
        error: `specialCircumstance must be one of: ${VALID_CIRCUMSTANCES.join(", ")}`
      });
      return;
    }

    try {
      const client = await createClient(
        {
          name,
          dateOfBirth,
          currentShelterStatus,
          documentStatus,
          specialCircumstance: specialCircumstance as SpecialCircumstance,
          additionalInfo
        },
        userId
      );

      res.status(201).json(client);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to create client", err);
      res.status(500).json({ error: "Failed to create client" });
    }
  }
);

router.get(
  "/",
  requireAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }

    try {
      const clients = await listClientsForCaseManager(userId);
      res.json({ clients });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to list clients", err);
      res.status(500).json({ error: "Failed to load clients" });
    }
  }
);

router.get(
  "/:clientId/roadmap",
  requireAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }

    const { clientId } = req.params;

    try {
      const client = await getClientForCaseManager(clientId, userId);

      if (!client) {
        res.status(404).json({ error: "Client not found" });
        return;
      }

      const { roadmap, steps } = await getOrCreateRoadmapForClient(client);

      const docCount = [
        client.documentStatus.birthCert, client.documentStatus.ssn,
        client.documentStatus.stateId, client.documentStatus.address,
        client.documentStatus.income
      ].filter(Boolean).length;

      const priority = docCount <= 1 ? "CRITICAL"
        : docCount <= 2 ? "HIGH"
        : docCount <= 4 ? "MEDIUM"
        : "LOW";

      res.json({
        client: {
          id: client.id,
          name: client.name,
          documentStatus: client.documentStatus,
          priority
        },
        roadmap: steps,
        planMeta: {
          finalGoal: roadmap.finalGoal ?? "",
          summary: roadmap.summary ?? "",
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to load roadmap", err);
      res.status(500).json({ error: "Failed to load roadmap" });
    }
  }
);

// PATCH /:clientId/documents-status — update doc status and regenerate roadmap
router.patch(
  "/:clientId/documents-status",
  requireAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ error: "Unauthenticated" }); return; }

    const { clientId } = req.params;
    const { documentStatus } = req.body ?? {};

    if (!documentStatus || typeof documentStatus !== "object") {
      res.status(400).json({ error: "Missing or invalid documentStatus" });
      return;
    }

    const DOC_KEYS = ["birthCert", "ssn", "stateId", "address", "income"] as const;
    for (const key of DOC_KEYS) {
      if (typeof (documentStatus as Record<string, unknown>)[key] !== "boolean") {
        res.status(400).json({ error: `documentStatus.${key} must be a boolean` });
        return;
      }
    }

    const client = await getClientForCaseManager(clientId, userId);
    if (!client) { res.status(404).json({ error: "Client not found" }); return; }

    try {
      // 1. Update documentStatus on the client record
      await new Promise<void>((resolve, reject) => {
        db.run(
          `UPDATE clients SET documentStatus = ?, updatedAt = datetime('now') WHERE id = ?`,
          [JSON.stringify(documentStatus), clientId],
          (err) => { if (err) reject(err); else resolve(); }
        );
      });

      // 2. Delete old roadmap steps and roadmap record
      await new Promise<void>((resolve, reject) => {
        db.get<{ id: string }>(
          `SELECT id FROM roadmaps WHERE clientId = ?`,
          [clientId],
          (err, roadmap) => {
            if (err) { reject(err); return; }
            if (!roadmap) { resolve(); return; }
            db.run(`DELETE FROM roadmapSteps WHERE roadmapId = ?`, [roadmap.id], (e2) => {
              if (e2) { reject(e2); return; }
              db.run(`DELETE FROM roadmaps WHERE id = ?`, [roadmap.id], (e3) => {
                if (e3) reject(e3); else resolve();
              });
            });
          }
        );
      });

      // 3. Re-fetch client with updated documentStatus and regenerate roadmap
      const updatedClient = await getClientForCaseManager(clientId, userId);
      if (!updatedClient) { res.status(500).json({ error: "Client disappeared after update" }); return; }

      const { roadmap: updatedRoadmap, steps } = await getOrCreateRoadmapForClient(updatedClient);
      res.json({
        success: true,
        steps,
        planMeta: {
          finalGoal: updatedRoadmap.finalGoal ?? "",
          summary: updatedRoadmap.summary ?? "",
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to re-assess documents", err);
      res.status(500).json({ error: "Failed to update document status" });
    }
  }
);

// GET /:clientId/notes
router.get(
  "/:clientId/notes",
  requireAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ error: "Unauthenticated" }); return; }

    const { clientId } = req.params;
    const client = await getClientForCaseManager(clientId, userId);
    if (!client) { res.status(404).json({ error: "Client not found" }); return; }

    db.all<{ id: string; note: string; createdAt: string }>(
      `SELECT id, note, createdAt FROM caseNotes WHERE clientId = ? ORDER BY createdAt DESC`,
      [clientId],
      (err, rows) => {
        if (err) { res.status(500).json({ error: "Failed to load notes" }); return; }
        res.json({ notes: rows ?? [] });
      }
    );
  }
);

// POST /:clientId/notes
router.post(
  "/:clientId/notes",
  requireAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ error: "Unauthenticated" }); return; }

    const { clientId } = req.params;
    const { note } = req.body ?? {};

    if (!note || typeof note !== "string" || note.trim().length === 0) {
      res.status(400).json({ error: "note must be a non-empty string" });
      return;
    }

    const client = await getClientForCaseManager(clientId, userId);
    if (!client) { res.status(404).json({ error: "Client not found" }); return; }

    const id = generateId();
    const trimmed = note.trim();

    db.run(
      `INSERT INTO caseNotes (id, clientId, caseManagerId, note) VALUES (?, ?, ?, ?)`,
      [id, clientId, userId, trimmed],
      (err) => {
        if (err) { res.status(500).json({ error: "Failed to save note" }); return; }
        db.get<{ id: string; note: string; createdAt: string }>(
          `SELECT id, note, createdAt FROM caseNotes WHERE id = ?`,
          [id],
          (e2, row) => {
            if (e2 || !row) { res.status(500).json({ error: "Note saved but could not retrieve" }); return; }
            res.status(201).json(row);
          }
        );
      }
    );
  }
);

// DELETE /:clientId/notes/:noteId
router.delete(
  "/:clientId/notes/:noteId",
  requireAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ error: "Unauthenticated" }); return; }

    const { clientId, noteId } = req.params;
    const client = await getClientForCaseManager(clientId, userId);
    if (!client) { res.status(404).json({ error: "Client not found" }); return; }

    db.run(
      `DELETE FROM caseNotes WHERE id = ? AND clientId = ? AND caseManagerId = ?`,
      [noteId, clientId, userId],
      function (err) {
        if (err) { res.status(500).json({ error: "Failed to delete note" }); return; }
        if (this.changes === 0) { res.status(404).json({ error: "Note not found" }); return; }
        res.json({ success: true });
      }
    );
  }
);

router.patch(
  "/:clientId/roadmap/steps/:stepId",
  requireAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ error: "Unauthenticated" }); return; }

    const { clientId, stepId } = req.params;
    const { status } = req.body ?? {};

    const VALID_STATUSES = ["not_started", "in_progress", "completed"];
    if (!status || !VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: "status must be one of: not_started, in_progress, completed" });
      return;
    }

    // Verify client belongs to this case manager
    const client = await getClientForCaseManager(clientId, userId);
    if (!client) { res.status(404).json({ error: "Client not found" }); return; }

    db.run(
      `UPDATE roadmapSteps SET status = ? WHERE id = ? AND roadmapId IN (
         SELECT id FROM roadmaps WHERE clientId = ?
       )`,
      [status, stepId, clientId],
      function (err) {
        if (err) { res.status(500).json({ error: "Failed to update step" }); return; }
        if (this.changes === 0) { res.status(404).json({ error: "Step not found" }); return; }
        res.json({ id: stepId, status });
      }
    );
  }
);

// DELETE /:clientId — permanently remove client and all associated data
router.delete(
  "/:clientId",
  requireAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ error: "Unauthenticated" }); return; }

    const { clientId } = req.params;

    const client = await getClientForCaseManager(clientId, userId);
    if (!client) { res.status(404).json({ error: "Client not found" }); return; }

    try {
      await new Promise<void>((resolve, reject) => {
        db.serialize(() => {
          // 1. Case notes (cascade not guaranteed on all SQLite builds)
          db.run(`DELETE FROM caseNotes WHERE clientId = ?`, [clientId]);
          // 2. Documents
          db.run(`DELETE FROM clientDocuments WHERE clientId = ?`, [clientId]);
          // 3. Roadmap steps (via roadmap id)
          db.run(`DELETE FROM roadmapSteps WHERE roadmapId IN (SELECT id FROM roadmaps WHERE clientId = ?)`, [clientId]);
          // 4. Roadmap
          db.run(`DELETE FROM roadmaps WHERE clientId = ?`, [clientId]);
          // 5. Client
          db.run(`DELETE FROM clients WHERE id = ? AND caseManagerId = ?`, [clientId, userId], function (err) {
            if (err) { reject(err); return; }
            if (this.changes === 0) { reject(new Error("Client not found or already deleted")); return; }
            resolve();
          });
        });
      });

      res.json({ success: true, id: clientId });
    } catch (err) {
      console.error("Failed to delete client", err);
      res.status(500).json({ error: "Failed to delete client" });
    }
  }
);

// PATCH /:clientId/status — update case status inline from dashboard
router.patch(
  "/:clientId/status",
  requireAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ error: "Unauthenticated" }); return; }

    const { clientId } = req.params;
    const { case_status } = req.body ?? {};

    if (!case_status || !VALID_CASE_STATUSES.includes(case_status)) {
      res.status(400).json({
        error: `case_status must be one of: ${VALID_CASE_STATUSES.join(", ")}`
      });
      return;
    }

    const client = await getClientForCaseManager(clientId, userId);
    if (!client) { res.status(404).json({ error: "Client not found" }); return; }

    db.run(
      `UPDATE clients SET case_status = ?, updatedAt = datetime('now') WHERE id = ? AND caseManagerId = ?`,
      [case_status, clientId, userId],
      function (err) {
        if (err) { res.status(500).json({ error: "Failed to update status" }); return; }
        if (this.changes === 0) { res.status(404).json({ error: "Client not found" }); return; }
        res.json({ id: clientId, case_status });
      }
    );
  }
);

export default router;
