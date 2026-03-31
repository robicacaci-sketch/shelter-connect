import React, { useState } from "react";
import { DocumentStatus, PlanMeta, RoadmapStep, updateClientDocumentStatus } from "../api/clientApi";
import { useAuth } from "../context/AuthContext";

type Props = {
  clientId: string;
  currentDocumentStatus: DocumentStatus;
  onRoadmapUpdated: (newSteps: RoadmapStep[], newDocStatus: DocumentStatus, planMeta: PlanMeta) => void;
};

const DOC_LABELS: { key: keyof DocumentStatus; label: string; hint: string }[] = [
  { key: "birthCert", label: "Birth Certificate",      hint: "NJ Vital Records or hospital of birth" },
  { key: "ssn",       label: "Social Security Card",   hint: "SSA office — free replacement" },
  { key: "stateId",   label: "State ID / Driver's License", hint: "NJ MVC — requires 6 pts of ID" },
  { key: "address",   label: "Proof of Address",       hint: "Shelter letter, utility bill, or mail" },
  { key: "income",    label: "Proof of Income",        hint: "Pay stub, benefits letter, or tax return" },
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
      onRoadmapUpdated(result.steps, docs, result.planMeta ?? { finalGoal: "", summary: "" });
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
          <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: "0 0 1rem" }}>
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
