# Claude Code Fix V4 — Document Re-Assessment + Case Notes

**Context:** Intake form, engine, roadmap display, step progress tracking, and document wallet are all working.
**Goal:** Two features that turn the app from a one-time intake tool into an ongoing case management tool.

---

## WHAT NOT TO CHANGE

- `backend/src/engine/` — entire folder
- `backend/src/data/` — entire folder
- Any auth files
- `frontend/src/components/IntakeForm.tsx`
- `backend/src/services/clientService.ts` (read-only reference)

---

## FEATURE 1 — Document Re-Assessment (Roadmap Regeneration)

### Why this matters:
The roadmap is built at intake based on which 5 documents a client has. When a client gets a new document (e.g., obtains birth certificate), the roadmap should update to reflect the new situation. Right now there is no way to do this after intake — the document status is frozen.

### How it works:
- On the client's roadmap page, add a collapsible "Update Documents" panel showing the 5 NJ document checkboxes pre-filled with current values
- When the case manager saves, the backend updates `documentStatus` on the client record AND regenerates the roadmap (deletes old steps, inserts new ones from the engine)
- The roadmap display immediately reflects the new steps

---

### 1a. New backend route — `PATCH /api/clients/:clientId/documents-status`

**File:** `backend/src/routes/clientRoutes.ts`

Add this route BEFORE `export default router`:

```typescript
router.patch(
  "/:clientId/documents-status",
  requireAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ error: "Unauthenticated" }); return; }

    const { clientId } = req.params;
    const { documentStatus } = req.body ?? {};

    // Validate documentStatus
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

    // Verify client belongs to this case manager
    const client = await getClientForCaseManager(clientId, userId);
    if (!client) { res.status(404).json({ error: "Client not found" }); return; }

    try {
      // 1. Update documentStatus on the client
      db.prepare(
        `UPDATE clients SET documentStatus = ?, updatedAt = datetime('now') WHERE id = ?`
      ).run(JSON.stringify(documentStatus), clientId);

      // 2. Delete old roadmap steps and roadmap record
      const roadmap = db.prepare(`SELECT id FROM roadmaps WHERE clientId = ?`).get(clientId) as { id: string } | undefined;
      if (roadmap) {
        db.prepare(`DELETE FROM roadmapSteps WHERE roadmapId = ?`).run(roadmap.id);
        db.prepare(`DELETE FROM roadmaps WHERE id = ?`).run(roadmap.id);
      }

      // 3. Re-fetch client with updated documentStatus and regenerate roadmap
      const updatedClient = await getClientForCaseManager(clientId, userId);
      if (!updatedClient) { res.status(500).json({ error: "Client disappeared after update" }); return; }

      const { steps } = await getOrCreateRoadmapForClient(updatedClient);

      res.json({ success: true, steps });
    } catch (err) {
      console.error("Failed to re-assess documents", err);
      res.status(500).json({ error: "Failed to update document status" });
    }
  }
);
```

**Important:** The `db.prepare(...).run(...)` syntax is for better-sqlite3 (synchronous). Check that the existing codebase uses this pattern. If it uses `db.run(sql, params, callback)` style (async callback style), then replace with:

```typescript
// async callback style fallback:
db.run(`UPDATE clients SET documentStatus = ?, updatedAt = datetime('now') WHERE id = ?`,
  [JSON.stringify(documentStatus), clientId],
  function(err) { if (err) { res.status(500).json({ error: "DB error" }); return; } }
);
```

Use whichever pattern matches the rest of `clientRoutes.ts`.

---

### 1b. New API function in frontend

**File:** `frontend/src/api/clientApi.ts`

Add at the bottom:

```typescript
export const updateClientDocumentStatus = async (
  token: string,
  clientId: string,
  documentStatus: DocumentStatus
) =>
  apiRequest<{ success: boolean; steps: RoadmapStep[] }>(
    `/api/clients/${encodeURIComponent(clientId)}/documents-status`,
    { method: "PATCH", token, body: { documentStatus } }
  );
```

---

### 1c. New component — `DocumentReassessPanel.tsx`

**File:** `frontend/src/components/DocumentReassessPanel.tsx`

Create this file:

```tsx
import React, { useState } from "react";
import { DocumentStatus, RoadmapStep } from "../api/clientApi";
import { updateClientDocumentStatus } from "../api/clientApi";
import { useAuth } from "../context/AuthContext";

type Props = {
  clientId: string;
  currentDocumentStatus: DocumentStatus;
  onRoadmapUpdated: (newSteps: RoadmapStep[]) => void;
};

const DOC_LABELS: { key: keyof DocumentStatus; label: string; hint: string }[] = [
  { key: "birthCert", label: "Birth Certificate", hint: "NJ Vital Records or hospital of birth" },
  { key: "ssn",       label: "Social Security Card", hint: "SSA office — free replacement" },
  { key: "stateId",   label: "State ID / Driver's License", hint: "NJ MVC — requires 6 pts of ID" },
  { key: "address",   label: "Proof of Address", hint: "Shelter letter, utility bill, or mail" },
  { key: "income",    label: "Proof of Income", hint: "Pay stub, benefits letter, or tax return" },
];

const DocumentReassessPanel: React.FC<Props> = ({ clientId, currentDocumentStatus, onRoadmapUpdated }) => {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<DocumentStatus>({ ...currentDocumentStatus });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const toggle = (key: keyof DocumentStatus) => {
    setDocs(prev => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const result = await updateClientDocumentStatus(token, clientId, docs);
      onRoadmapUpdated(result.steps);
      setSaved(true);
      setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginBottom: "1.5rem", border: "1px solid #374151", borderRadius: "0.5rem", overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          padding: "0.75rem 1rem",
          background: "#111827",
          color: "#9ca3af",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.875rem",
          fontWeight: 600,
        }}
      >
        <span>📋 Update Document Status</span>
        <span style={{ fontSize: "0.75rem" }}>{open ? "▲ Close" : "▼ Edit"}</span>
      </button>

      {open && (
        <div style={{ padding: "1rem", background: "#0f172a" }}>
          <p style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "1rem", margin: "0 0 1rem" }}>
            Check any documents the client now has. Saving will regenerate their roadmap.
          </p>

          {DOC_LABELS.map(({ key, label, hint }) => (
            <label
              key={key}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                marginBottom: "0.75rem",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={docs[key]}
                onChange={() => toggle(key)}
                style={{ marginTop: "2px", accentColor: "#22c55e", width: "16px", height: "16px" }}
              />
              <div>
                <span style={{ color: "#f9fafb", fontSize: "0.875rem", fontWeight: 500 }}>{label}</span>
                <span style={{ display: "block", color: "#6b7280", fontSize: "0.75rem" }}>{hint}</span>
              </div>
            </label>
          ))}

          {error && (
            <p style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "0.5rem" }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "0.5rem 1.25rem",
                background: saving ? "#374151" : "#22c55e",
                color: saving ? "#6b7280" : "#000",
                border: "none",
                borderRadius: "0.375rem",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving..." : "Save & Regenerate Roadmap"}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setDocs({ ...currentDocumentStatus }); }}
              style={{
                padding: "0.5rem 1rem",
                background: "transparent",
                color: "#9ca3af",
                border: "1px solid #374151",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {saved && !open && (
        <p style={{ padding: "0.5rem 1rem", background: "rgba(34,197,94,0.1)", color: "#22c55e", fontSize: "0.8rem", margin: 0 }}>
          ✓ Roadmap updated successfully
        </p>
      )}
    </div>
  );
};

export default DocumentReassessPanel;
```

---

### 1d. Wire DocumentReassessPanel into the roadmap page

**File:** `frontend/src/pages/ClientRoadmapPage.tsx` (or wherever the roadmap and steps are rendered — find the page/component that calls `getClientRoadmap` and renders `<RoadmapDisplay>`)

1. Import the new component and the updated API function:
```typescript
import DocumentReassessPanel from "../components/DocumentReassessPanel";
```

2. The component that renders `<RoadmapDisplay steps={steps} ...>` should also hold the `clientDetail` from `getClientRoadmap`. The API returns `{ client, roadmap }`. Make sure `client` is stored in state.

3. Add this above `<RoadmapDisplay>`:
```tsx
{client && client.documentStatus && (
  <DocumentReassessPanel
    clientId={clientId}
    currentDocumentStatus={client.documentStatus}
    onRoadmapUpdated={(newSteps) => setSteps(newSteps)}
  />
)}
```

4. Update the `ClientDetail` type in `clientApi.ts` to include `documentStatus`:
```typescript
export type ClientDetail = {
  id: string;
  name: string;
  priority?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  documentStatus?: DocumentStatus;
};
```

5. In `clientRoutes.ts`, add `documentStatus` to the roadmap GET response:
```typescript
// In the GET /:clientId/roadmap handler, update the res.json():
res.json({
  client: {
    id: client.id,
    name: client.name,
    documentStatus: client.documentStatus,  // ADD THIS LINE
    priority: steps[0]?.title?.includes("CRITICAL") ? "CRITICAL"
      : steps[0]?.title?.includes("HIGH") ? "HIGH"
      : steps[0]?.title?.includes("MEDIUM") ? "MEDIUM"
      : "LOW"
  },
  roadmap: steps
});
```

---

## FEATURE 2 — Case Notes (Running Timestamped Log)

### Why this matters:
The intake form has a one-time "notes" field. But a shelter manager needs to add notes continuously: "client called back", "appointment booked at DMV", "birth cert denied — need notarized form", etc. These need to be timestamped and persisted.

---

### 2a. Database migration — add `caseNotes` table

**File:** `backend/src/db/index.ts` (or wherever `db.exec(...)` sets up the schema)

Find the block that creates tables and add:

```sql
CREATE TABLE IF NOT EXISTS caseNotes (
  id TEXT PRIMARY KEY,
  clientId TEXT NOT NULL,
  caseManagerId TEXT NOT NULL,
  note TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
);
```

Add it right after the `clientDocuments` table creation if that exists, or after `roadmapSteps`.

---

### 2b. New backend routes for case notes

**File:** `backend/src/routes/clientRoutes.ts`

Add these two routes BEFORE `export default router`:

```typescript
import { v4 as uuidv4 } from "uuid"; // make sure uuid is already imported; if not, add it

// GET all notes for a client
router.get(
  "/:clientId/notes",
  requireAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ error: "Unauthenticated" }); return; }

    const { clientId } = req.params;
    const client = await getClientForCaseManager(clientId, userId);
    if (!client) { res.status(404).json({ error: "Client not found" }); return; }

    try {
      const notes = db.prepare(
        `SELECT id, note, createdAt FROM caseNotes WHERE clientId = ? ORDER BY createdAt DESC`
      ).all(clientId);
      res.json({ notes });
    } catch (err) {
      console.error("Failed to get notes", err);
      res.status(500).json({ error: "Failed to load notes" });
    }
  }
);

// POST a new note
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

    try {
      const id = uuidv4();
      db.prepare(
        `INSERT INTO caseNotes (id, clientId, caseManagerId, note) VALUES (?, ?, ?, ?)`
      ).run(id, clientId, userId, note.trim());

      const created = db.prepare(`SELECT id, note, createdAt FROM caseNotes WHERE id = ?`).get(id) as { id: string; note: string; createdAt: string };
      res.status(201).json(created);
    } catch (err) {
      console.error("Failed to create note", err);
      res.status(500).json({ error: "Failed to save note" });
    }
  }
);

// DELETE a note
router.delete(
  "/:clientId/notes/:noteId",
  requireAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ error: "Unauthenticated" }); return; }

    const { clientId, noteId } = req.params;
    const client = await getClientForCaseManager(clientId, userId);
    if (!client) { res.status(404).json({ error: "Client not found" }); return; }

    try {
      const result = db.prepare(
        `DELETE FROM caseNotes WHERE id = ? AND clientId = ? AND caseManagerId = ?`
      ).run(noteId, clientId, userId);

      if ((result as { changes: number }).changes === 0) {
        res.status(404).json({ error: "Note not found" });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to delete note", err);
      res.status(500).json({ error: "Failed to delete note" });
    }
  }
);
```

**Note:** If the codebase uses the async callback style (`db.run(sql, params, cb)`) instead of `db.prepare().run()`, adapt the syntax to match. Check existing route handlers in `clientRoutes.ts` for the correct pattern.

---

### 2c. New API functions in frontend

**File:** `frontend/src/api/clientApi.ts`

Add at the bottom:

```typescript
export type CaseNote = {
  id: string;
  note: string;
  createdAt: string;
};

export const getCaseNotes = async (token: string, clientId: string) =>
  apiRequest<{ notes: CaseNote[] }>(
    `/api/clients/${encodeURIComponent(clientId)}/notes`,
    { method: "GET", token }
  );

export const createCaseNote = async (token: string, clientId: string, note: string) =>
  apiRequest<CaseNote>(
    `/api/clients/${encodeURIComponent(clientId)}/notes`,
    { method: "POST", token, body: { note } }
  );

export const deleteCaseNote = async (token: string, clientId: string, noteId: string) =>
  apiRequest<{ success: boolean }>(
    `/api/clients/${encodeURIComponent(clientId)}/notes/${encodeURIComponent(noteId)}`,
    { method: "DELETE", token }
  );
```

---

### 2d. New component — `CaseNotes.tsx`

**File:** `frontend/src/components/CaseNotes.tsx`

```tsx
import React, { useEffect, useState, useCallback } from "react";
import { CaseNote, getCaseNotes, createCaseNote, deleteCaseNote } from "../api/clientApi";
import { useAuth } from "../context/AuthContext";

type Props = {
  clientId: string;
};

const CaseNotes: React.FC<Props> = ({ clientId }) => {
  const { token } = useAuth();
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    if (!token) return;
    try {
      const result = await getCaseNotes(token, clientId);
      setNotes(result.notes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [token, clientId]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const handleAdd = async () => {
    if (!token || !newNote.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createCaseNote(token, clientId, newNote.trim());
      setNotes(prev => [created, ...prev]);
      setNewNote("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!token) return;
    // Optimistic removal
    setNotes(prev => prev.filter(n => n.id !== noteId));
    try {
      await deleteCaseNote(token, clientId, noteId);
    } catch {
      // Revert on failure
      loadNotes();
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit"
      });
    } catch { return iso; }
  };

  return (
    <section style={{ marginTop: "2rem" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#f9fafb", marginBottom: "1rem" }}>
        📝 Case Notes
      </h2>

      {/* Add note */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
        <textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Add a note... (e.g. 'Client booked DMV appointment for Tuesday')"
          rows={2}
          style={{
            flex: 1,
            padding: "0.625rem 0.75rem",
            background: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "0.375rem",
            color: "#f9fafb",
            fontSize: "0.875rem",
            resize: "vertical",
            fontFamily: "inherit",
          }}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAdd(); }}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || !newNote.trim()}
          style={{
            padding: "0 1rem",
            background: saving || !newNote.trim() ? "#374151" : "#3b82f6",
            color: saving || !newNote.trim() ? "#6b7280" : "#fff",
            border: "none",
            borderRadius: "0.375rem",
            fontWeight: 600,
            fontSize: "0.875rem",
            cursor: saving || !newNote.trim() ? "not-allowed" : "pointer",
            alignSelf: "flex-start",
            paddingTop: "0.625rem",
            paddingBottom: "0.625rem",
          }}
        >
          {saving ? "..." : "Add"}
        </button>
      </div>

      {error && <p style={{ color: "#ef4444", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{error}</p>}

      {/* Notes list */}
      {loading ? (
        <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Loading notes...</p>
      ) : notes.length === 0 ? (
        <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>No notes yet. Add the first one above.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {notes.map(note => (
            <li
              key={note.id}
              style={{
                padding: "0.75rem",
                background: "#111827",
                border: "1px solid #1f2937",
                borderRadius: "0.375rem",
                marginBottom: "0.5rem",
                display: "flex",
                justifyContent: "space-between",
                gap: "0.75rem",
                alignItems: "flex-start",
              }}
            >
              <div>
                <p style={{ color: "#f9fafb", fontSize: "0.875rem", margin: "0 0 0.25rem" }}>
                  {note.note}
                </p>
                <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>
                  {formatDate(note.createdAt)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(note.id)}
                title="Delete note"
                style={{
                  background: "none",
                  border: "none",
                  color: "#4b5563",
                  cursor: "pointer",
                  fontSize: "1rem",
                  padding: "0",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default CaseNotes;
```

---

### 2e. Wire CaseNotes into the roadmap page

**File:** `frontend/src/pages/ClientRoadmapPage.tsx` (or wherever `<RoadmapDisplay>` is rendered)

1. Import:
```typescript
import CaseNotes from "../components/CaseNotes";
```

2. Add below `<RoadmapDisplay>` and the document wallet (if present on the same page):
```tsx
<CaseNotes clientId={clientId} />
```

---

## APPLY ORDER

1. Run `backend/src/db/index.ts` schema change first (add `caseNotes` table) — restart backend after
2. Apply `clientRoutes.ts` changes (new PATCH + two note routes)
3. Apply `clientApi.ts` additions
4. Create `DocumentReassessPanel.tsx`
5. Create `CaseNotes.tsx`
6. Update the roadmap page to render both new components

---

## KNOWN DB STYLE NOTE

The existing `clientRoutes.ts` PATCH handler (for step status) uses `db.run(sql, params, callback)` style.
But `getOrCreateRoadmapForClient` may use `db.prepare().run()` style internally.
For new routes, match the style already used in `clientRoutes.ts` — use `db.run(sql, params, callback)` if that is what the other routes use, rather than `db.prepare().run()`. Do NOT mix styles in the same file.
