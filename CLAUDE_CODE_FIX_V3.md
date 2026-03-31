# Claude Code Fix V3 — Step Progress Tracking + Digital Document Wallet
**Context:** The intake form, backend engine, and roadmap generation are all working correctly.
**Add two new features:** (1) shelter managers can mark roadmap steps as done, (2) they can upload and store document files per client.

---

## WHAT NOT TO CHANGE

- `backend/src/engine/` — entire folder
- `backend/src/data/` — entire folder
- `backend/src/services/roadmapService.ts`
- `backend/src/services/clientService.ts`
- `backend/src/components/IntakeForm.tsx`
- Any auth files

---

## FEATURE 1 — Step Progress Tracking

### How it works:
Each roadmap step already has a `status` field (`not_started | in_progress | completed`). Right now it's always `not_started` and there's no UI to change it. Add a PATCH endpoint and update the roadmap UI so managers can tap to advance a step's status.

### Status cycle:
`not_started` → click → `in_progress` → click → `completed` → click → `not_started`

---

### 1a. New backend route — `PATCH /api/clients/:clientId/roadmap/steps/:stepId`

**File:** `backend/src/routes/clientRoutes.ts`

Add this route to the existing router:

```typescript
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
```

Import `db` at the top of `clientRoutes.ts`:
```typescript
import { db } from "../db/index";
```

---

### 1b. New frontend API call

**File:** `frontend/src/api/clientApi.ts`

Add:
```typescript
export const updateStepStatus = async (
  token: string,
  clientId: string,
  stepId: string,
  status: RoadmapStep["status"]
) =>
  apiRequest<{ id: string; status: string }>(
    `/api/clients/${encodeURIComponent(clientId)}/roadmap/steps/${encodeURIComponent(stepId)}`,
    { method: "PATCH", token, body: { status } }
  );
```

---

### 1c. Update `RoadmapDisplay.tsx` — add interactive step status buttons

**File:** `frontend/src/components/RoadmapDisplay.tsx`

Change the component signature to accept `clientId` and an `onStepUpdate` callback:

```typescript
type Props = {
  steps: RoadmapStep[];
  clientId: string;
  onStepUpdate?: (stepId: string, newStatus: RoadmapStep["status"]) => void;
};
```

For each step, replace the static status badge with an **interactive button** that cycles through statuses on click:

```typescript
// Status cycle: not_started → in_progress → completed → not_started
const nextStatus = (current: RoadmapStep["status"]): RoadmapStep["status"] => {
  if (current === "not_started") return "in_progress";
  if (current === "in_progress") return "completed";
  return "not_started";
};

const STATUS_STYLE: Record<RoadmapStep["status"], { label: string; bg: string; color: string; border: string }> = {
  not_started: { label: "Not started",  bg: "transparent",         color: "#6b7280", border: "#374151" },
  in_progress:  { label: "In progress", bg: "rgba(234,179,8,0.1)", color: "#eab308", border: "#eab308" },
  completed:    { label: "✓ Done",       bg: "rgba(34,197,94,0.1)", color: "#22c55e", border: "#22c55e" },
};
```

Replace the `<span>` status badge with a `<button>` that:
- Shows the current status (with color)
- On click: calls `onStepUpdate(step.id, nextStatus(step.status))`
- Has a tooltip: `title="Click to update status"`
- Is styled as a small pill button, not a full-width element

```typescript
<button
  type="button"
  title="Click to update status"
  onClick={() => onStepUpdate?.(step.id, nextStatus(step.status))}
  style={{
    padding: "0.3rem 0.8rem",
    borderRadius: "999px",
    border: `1px solid ${STATUS_STYLE[step.status].border}`,
    backgroundColor: STATUS_STYLE[step.status].bg,
    color: STATUS_STYLE[step.status].color,
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.15s"
  }}
>
  {STATUS_STYLE[step.status].label}
</button>
```

Also add a **progress summary bar** at the very top of the roadmap (above all stages):
```typescript
const totalSteps = steps.length;
const completedSteps = steps.filter(s => s.status === "completed").length;
const pct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

// Render above the stages:
<div style={{ marginBottom: "1.5rem" }}>
  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#9ca3af", marginBottom: "0.4rem" }}>
    <span>Progress</span>
    <span>{completedSteps} of {totalSteps} steps completed ({pct}%)</span>
  </div>
  <div style={{ height: "6px", borderRadius: "999px", backgroundColor: "#1f2937", overflow: "hidden" }}>
    <div style={{ height: "100%", width: `${pct}%`, backgroundColor: "#22c55e", borderRadius: "999px", transition: "width 0.3s ease" }} />
  </div>
</div>
```

---

### 1d. Update `RoadmapPage.tsx` — wire up the handler

**File:** `frontend/src/routes/RoadmapPage.tsx`

Add local state for steps (so UI updates instantly without a full refetch):

```typescript
const [steps, setSteps] = useState<RoadmapStep[]>([]);
```

Add handler:
```typescript
const handleStepUpdate = async (stepId: string, newStatus: RoadmapStep["status"]) => {
  // Optimistic UI update
  setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: newStatus } : s));
  try {
    await updateStepStatus(token!, clientId, stepId, newStatus);
  } catch {
    // Revert on error
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: s.status } : s));
  }
};
```

Pass to `RoadmapDisplay`:
```tsx
<RoadmapDisplay steps={steps} clientId={clientId} onStepUpdate={handleStepUpdate} />
```

---

## FEATURE 2 — Digital Document Wallet

### How it works:
Each client gets a document wallet — a section on their roadmap page with 6 slots (one per core document type + "Other"). The manager can upload a PDF or image to each slot. Files are stored on the server filesystem under `/uploads/`. The backend returns a URL to view/download each file.

---

### 2a. Create uploads directory

Add this to `backend/src/server.ts` (after the Express app is configured):
```typescript
import path from "path";
import fs from "fs";

const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use("/uploads", express.static(uploadsDir));
```

---

### 2b. Install multer for file uploads

Run in the backend directory:
```bash
npm install multer
npm install --save-dev @types/multer
```

---

### 2c. New database table — `clientDocuments`

**File:** `backend/src/db/index.ts`

Add this CREATE TABLE statement after the existing ones:

```sql
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
```

---

### 2d. New model — `ClientDocument`

**File:** `backend/src/models/ClientDocument.ts` (create new file)

```typescript
export interface ClientDocument {
  id: string;
  clientId: string;
  docType: "birth_cert" | "ssn" | "state_id" | "address" | "income" | "other";
  originalName: string;
  storedName: string;
  mimeType: string;
  uploadedAt: string;
  notes?: string;
}
```

---

### 2e. New service — `documentService.ts`

**File:** `backend/src/services/documentService.ts` (create new file)

```typescript
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
```

---

### 2f. New routes — document wallet endpoints

**File:** `backend/src/routes/documentRoutes.ts` (create new file)

```typescript
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
```

---

### 2g. Register document routes in `server.ts`

**File:** `backend/src/server.ts`

Add:
```typescript
import documentRouter from "./routes/documentRoutes";
// ...
app.use("/api/clients/:clientId/documents", documentRouter);
```

Also create the temp uploads directory:
```typescript
const tmpDir = path.join(__dirname, "../uploads/tmp");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
```

---

### 2h. New frontend API calls

**File:** `frontend/src/api/clientApi.ts`

Add:
```typescript
export type ClientDocument = {
  id: string;
  clientId: string;
  docType: "birth_cert" | "ssn" | "state_id" | "address" | "income" | "other";
  originalName: string;
  mimeType: string;
  uploadedAt: string;
  notes?: string;
  url: string;
};

export const getClientDocuments = async (token: string, clientId: string) =>
  apiRequest<{ documents: ClientDocument[] }>(
    `/api/clients/${encodeURIComponent(clientId)}/documents`,
    { method: "GET", token }
  );

export const uploadClientDocument = async (
  token: string,
  clientId: string,
  file: File,
  docType: ClientDocument["docType"],
  notes?: string
): Promise<ClientDocument & { url: string }> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("docType", docType);
  if (notes) formData.append("notes", notes);

  // Use fetch directly (apiRequest doesn't handle FormData)
  const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/documents`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Upload failed");
  }
  return res.json();
};

export const deleteClientDocument = async (token: string, clientId: string, docId: string) =>
  apiRequest<{ success: boolean }>(
    `/api/clients/${encodeURIComponent(clientId)}/documents/${encodeURIComponent(docId)}`,
    { method: "DELETE", token }
  );
```

---

### 2i. New component — `DocumentWallet.tsx`

**File:** `frontend/src/components/DocumentWallet.tsx` (create new file)

Build a component that shows 6 document slots. Each slot has an upload button when empty, and shows the file name + a "View" link + a "Remove" button when filled.

```typescript
import React, { useRef, useState } from "react";
import { ClientDocument, uploadClientDocument, deleteClientDocument } from "../api/clientApi";
import { useAuth } from "../context/AuthContext";

type DocType = ClientDocument["docType"];

const DOC_SLOTS: { type: DocType; label: string; icon: string; hint: string }[] = [
  { type: "birth_cert", icon: "📄", label: "Birth Certificate",                    hint: "PDF or photo" },
  { type: "ssn",        icon: "🔢", label: "Social Security Card",                 hint: "PDF or photo" },
  { type: "state_id",   icon: "🪪", label: "NJ State ID / Driver's License",       hint: "PDF or photo" },
  { type: "address",    icon: "📍", label: "Address / Homeless Verification Letter", hint: "PDF or photo" },
  { type: "income",     icon: "💰", label: "Income Proof / Zero-Income Cert.",      hint: "PDF or photo" },
  { type: "other",      icon: "📎", label: "Other Document",                        hint: "Any relevant file" },
];

type Props = {
  clientId: string;
  initialDocuments: ClientDocument[];
};

const DocumentWallet: React.FC<Props> = ({ clientId, initialDocuments }) => {
  const { token } = useAuth();
  const [docs, setDocs] = useState<ClientDocument[]>(initialDocuments);
  const [uploading, setUploading] = useState<DocType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Partial<Record<DocType, HTMLInputElement | null>>>({});

  const getDoc = (type: DocType) => docs.find(d => d.docType === type);

  const handleFileSelect = async (type: DocType, file: File) => {
    if (!token) return;
    setUploading(type);
    setError(null);
    try {
      const uploaded = await uploadClientDocument(token, clientId, file, type);
      setDocs(prev => [...prev.filter(d => d.docType !== type), uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const handleRemove = async (doc: ClientDocument) => {
    if (!token) return;
    if (!confirm(`Remove ${doc.originalName}?`)) return;
    try {
      await deleteClientDocument(token, clientId, doc.id);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
    } catch {
      setError("Failed to remove document");
    }
  };

  return (
    <section style={{ marginTop: "2rem" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ margin: 0, fontWeight: 700, color: "#f9fafb", fontSize: "1.1rem" }}>
          📁 Document Wallet
        </h2>
        <p style={{ margin: "0.3rem 0 0", fontSize: "0.8rem", color: "#9ca3af" }}>
          Upload copies of each document as the client obtains them. Files are stored securely on the server.
        </p>
      </div>

      {error && (
        <div style={{ padding: "0.65rem 1rem", background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444",
          borderRadius: "0.375rem", color: "#fca5a5", fontSize: "0.85rem", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        {DOC_SLOTS.map(({ type, label, icon, hint }) => {
          const doc = getDoc(type);
          const isUploading = uploading === type;

          return (
            <div key={type} style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "0.85rem 1rem",
              border: `2px solid ${doc ? "#16a34a" : "#1f2937"}`,
              borderRadius: "0.5rem",
              backgroundColor: doc ? "rgba(22,163,74,0.06)" : "#111827",
              transition: "border-color 0.15s"
            }}>
              {/* Icon */}
              <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>{icon}</span>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, color: "#f9fafb", fontSize: "0.875rem" }}>{label}</p>
                {doc ? (
                  <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "#22c55e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    ✓ {doc.originalName} · {new Date(doc.uploadedAt).toLocaleDateString()}
                  </p>
                ) : (
                  <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "#6b7280" }}>
                    Not uploaded · {hint}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                {doc ? (
                  <>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "0.3rem 0.7rem",
                        borderRadius: "0.375rem",
                        border: "1px solid #374151",
                        backgroundColor: "transparent",
                        color: "#9ca3af",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        textDecoration: "none"
                      }}
                    >
                      View
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemove(doc)}
                      style={{
                        padding: "0.3rem 0.7rem",
                        borderRadius: "0.375rem",
                        border: "1px solid #374151",
                        backgroundColor: "transparent",
                        color: "#ef4444",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      ref={el => { inputRefs.current[type] = el; }}
                      style={{ display: "none" }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(type, file);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => inputRefs.current[type]?.click()}
                      style={{
                        padding: "0.3rem 0.9rem",
                        borderRadius: "0.375rem",
                        border: "1px solid #374151",
                        backgroundColor: isUploading ? "#1f2937" : "transparent",
                        color: isUploading ? "#6b7280" : "#38bdf8",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: isUploading ? "default" : "pointer"
                      }}
                    >
                      {isUploading ? "Uploading…" : "Upload"}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default DocumentWallet;
```

---

### 2j. Add `DocumentWallet` to the roadmap page

**File:** `frontend/src/routes/RoadmapPage.tsx`

1. Import the new component and API call:
```typescript
import DocumentWallet from "../components/DocumentWallet";
import { getClientDocuments, ClientDocument } from "../api/clientApi";
```

2. Add state for documents:
```typescript
const [documents, setDocuments] = useState<ClientDocument[]>([]);
```

3. In the `useEffect` that loads the roadmap, also load documents in parallel:
```typescript
const [roadmapData, docsData] = await Promise.all([
  getClientRoadmap(token, clientId),
  getClientDocuments(token, clientId)
]);
setSteps(roadmapData.roadmap);
setDocuments(docsData.documents);
```

4. Render `DocumentWallet` below the `RoadmapDisplay`:
```tsx
<RoadmapDisplay steps={steps} clientId={clientId} onStepUpdate={handleStepUpdate} />
<DocumentWallet clientId={clientId} initialDocuments={documents} />
```

---

## EXECUTION ORDER

1. Install multer: `cd backend && npm install multer && npm install --save-dev @types/multer`
2. `backend/src/db/index.ts` — add `clientDocuments` table, delete `data/housing-readiness.db`
3. `backend/src/models/ClientDocument.ts` — create new file
4. `backend/src/services/documentService.ts` — create new file
5. `backend/src/routes/documentRoutes.ts` — create new file
6. `backend/src/routes/clientRoutes.ts` — add PATCH step status route + import `db`
7. `backend/src/server.ts` — register document routes + create uploads dirs
8. `frontend/src/api/clientApi.ts` — add document API functions + types
9. `frontend/src/components/DocumentWallet.tsx` — create new component
10. `frontend/src/components/RoadmapDisplay.tsx` — add step status buttons + progress bar
11. `frontend/src/routes/RoadmapPage.tsx` — wire up handlers + render DocumentWallet

---

## WHAT THE RESULT LOOKS LIKE

**On the roadmap page, the shelter manager can now:**
- See a progress bar at the top showing how many steps are done (e.g. "3 of 7 steps completed")
- Click any step's status pill to cycle it: Not started → In progress → Done
- Status updates persist to the database instantly
- Below the roadmap, a Document Wallet section shows 6 slots
- Each slot: upload a PDF or photo of the document when the client obtains it
- Uploaded docs show green, with a "View" link to open the file and a "Remove" button
- Files are stored on the server and survive page reloads

---

*V3 instructions — generated March 2026*
*Previous instructions: CLAUDE_CODE_FIX_V2.md (do not reapply)*
