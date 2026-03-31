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
            padding: "0.625rem 1rem",
            background: saving || !newNote.trim() ? "#374151" : "#3b82f6",
            color: saving || !newNote.trim() ? "#6b7280" : "#fff",
            border: "none",
            borderRadius: "0.375rem",
            fontWeight: 600,
            fontSize: "0.875rem",
            cursor: saving || !newNote.trim() ? "not-allowed" : "pointer",
            alignSelf: "flex-start",
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
                  fontSize: "1.25rem",
                  padding: "0",
                  flexShrink: 0,
                  lineHeight: 1,
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
