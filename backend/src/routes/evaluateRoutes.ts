import express from "express";
import { DocumentStatus, SpecialCircumstance } from "../types/index";
import { evaluateDocumentStatus, getDocumentDetails, getProgramsAccessible } from "../engine/evaluateDocuments";
import { RESOURCE_DIRECTORY } from "../data/resourceDirectory";
import { DOCUMENT_CATALOG } from "../data/documentCatalog";

const router = express.Router();

const VALID_CIRCUMSTANCES: SpecialCircumstance[] = [
  "none", "reentry", "dv_survivor", "veteran", "elderly", "youth", "undocumented", "eviction",
];

// POST /api/evaluate
// Body: { docs: DocumentStatus, circumstance?: SpecialCircumstance }
// Returns: ActionPlan
router.post("/", (req, res): void => {
  const { docs, circumstance = "none" } = req.body ?? {};

  if (!docs || typeof docs !== "object") {
    res.status(400).json({ error: "Missing or invalid 'docs' field" });
    return;
  }

  const docFields: (keyof DocumentStatus)[] = [
    "birthCert", "ssn", "stateId", "address", "income",
  ];

  for (const field of docFields) {
    if (typeof docs[field] !== "boolean") {
      res.status(400).json({
        error: `docs.${field} must be a boolean (true or false)`,
      });
      return;
    }
  }

  if (!VALID_CIRCUMSTANCES.includes(circumstance)) {
    res.status(400).json({
      error: `circumstance must be one of: ${VALID_CIRCUMSTANCES.join(", ")}`,
    });
    return;
  }

  try {
    const actionPlan = evaluateDocumentStatus(docs as DocumentStatus, circumstance as SpecialCircumstance);
    res.json(actionPlan);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to evaluate document status", err);
    res.status(500).json({ error: "Failed to evaluate document status" });
  }
});

// GET /api/evaluate/documents
// Returns the full document catalog
router.get("/documents", (_req, res): void => {
  res.json(DOCUMENT_CATALOG);
});

// GET /api/evaluate/documents/:docId
// Returns details for a specific document
router.get("/documents/:docId", (req, res): void => {
  const { docId } = req.params;
  const doc = getDocumentDetails(docId);

  if (!doc) {
    res.status(404).json({ error: `Document not found: ${docId}` });
    return;
  }

  res.json(doc);
});

// GET /api/evaluate/resources
// Returns the full resource directory
router.get("/resources", (_req, res): void => {
  res.json(RESOURCE_DIRECTORY);
});

// GET /api/evaluate/programs?birthCert=true&ssn=false&stateId=false&address=true&income=true
// Returns programs accessible given current doc status (via query params)
router.get("/programs", (req, res): void => {
  const toBool = (v: unknown) => v === "true" || v === "1";

  const docs: DocumentStatus = {
    birthCert: toBool(req.query.birthCert),
    ssn:       toBool(req.query.ssn),
    stateId:   toBool(req.query.stateId),
    address:   toBool(req.query.address),
    income:    toBool(req.query.income),
  };

  const programs = getProgramsAccessible(docs);
  res.json({ programs });
});

export default router;
