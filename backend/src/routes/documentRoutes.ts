import express from "express";
import multer from "multer";
import path from "path";
import { requireAuth, AuthenticatedRequest } from "../middleware/authMiddleware";
import { getClientForCaseManager } from "../services/clientService";
import { saveClientDocument, getClientDocuments, deleteClientDocument } from "../services/documentService";

const router = express.Router({ mergeParams: true }); // gets :clientId from parent router

const upload = multer({
  dest: path.join(__dirname, "../../uploads/tmp"),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    cb(null, allowed.includes(file.mimetype));
  }
});

const VALID_DOC_TYPES = ["birth_cert", "ssn", "state_id", "address", "income", "other"];

// GET /api/clients/:clientId/documents
router.get("/", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const { clientId } = req.params;

  const client = await getClientForCaseManager(clientId, userId);
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }

  try {
    const docs = await getClientDocuments(clientId);
    // Attach a URL for each document
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.json({ documents: docs.map(d => ({ ...d, url: `${baseUrl}/uploads/${d.storedName}` })) });
  } catch {
    res.status(500).json({ error: "Failed to load documents" });
  }
});

// POST /api/clients/:clientId/documents
router.post("/", requireAuth, upload.single("file"), async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const { clientId } = req.params;
  const { docType, notes } = req.body;

  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
  if (!docType || !VALID_DOC_TYPES.includes(docType)) {
    res.status(400).json({ error: `docType must be one of: ${VALID_DOC_TYPES.join(", ")}` });
    return;
  }

  const client = await getClientForCaseManager(clientId, userId);
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }

  try {
    const doc = await saveClientDocument(clientId, docType, req.file, notes);
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.status(201).json({ ...doc, url: `${baseUrl}/uploads/${doc.storedName}` });
  } catch {
    res.status(500).json({ error: "Failed to save document" });
  }
});

// DELETE /api/clients/:clientId/documents/:docId
router.delete("/:docId", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const { clientId, docId } = req.params;

  const client = await getClientForCaseManager(clientId, userId);
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }

  try {
    const deleted = await deleteClientDocument(docId, clientId);
    if (!deleted) { res.status(404).json({ error: "Document not found" }); return; }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;
