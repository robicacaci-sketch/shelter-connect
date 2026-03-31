import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  CaseStatus,
  ClientSummary,
  deleteClient,
  getClients,
  updateClientCaseStatus,
} from "../api/clientApi";

// ─── Priority badge config ───────────────────────────────────────────────────
const PRIORITY_BADGE: Record<string, { emoji: string; label: string; color: string }> = {
  CRITICAL: { emoji: "🔴", label: "CRITICAL", color: "#dc2626" },
  HIGH:     { emoji: "🟠", label: "HIGH",     color: "#ea580c" },
  MEDIUM:   { emoji: "🟡", label: "MEDIUM",   color: "#ca8a04" },
  LOW:      { emoji: "🟢", label: "LOW",       color: "#16a34a" },
};

// ─── Case status badge config ─────────────────────────────────────────────────
const STATUS_BADGE: Record<CaseStatus, { bg: string; color: string; border: string }> = {
  "Active":  { bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" },
  "Placed":  { bg: "#dcfce7", color: "#15803d", border: "#86efac" },
  "On Hold": { bg: "#fef9c3", color: "#a16207", border: "#fde047" },
  "Closed":  { bg: "#f3f4f6", color: "#4b5563", border: "#d1d5db" },
};

const ALL_STATUSES: CaseStatus[] = ["Active", "Placed", "On Hold", "Closed"];

// ─── Inline status dropdown ───────────────────────────────────────────────────
function StatusDropdown({
  clientId,
  current,
  onChange,
}: {
  clientId: string;
  current: CaseStatus;
  onChange: (id: string, status: CaseStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { token } = useAuth();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const select = async (status: CaseStatus) => {
    if (status === current || !token) { setOpen(false); return; }
    setSaving(true);
    setOpen(false);
    try {
      await updateClientCaseStatus(token, clientId, status);
      onChange(clientId, status);
    } catch {
      // silent — badge stays showing old value until next refresh
    } finally {
      setSaving(false);
    }
  };

  const badge = STATUS_BADGE[current];

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        style={{
          padding: "0.2rem 0.6rem",
          borderRadius: "999px",
          border: `1px solid ${badge.border}`,
          background: badge.bg,
          color: badge.color,
          fontSize: "0.75rem",
          fontWeight: 600,
          cursor: saving ? "wait" : "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {saving ? "…" : current} {!saving && "▾"}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          zIndex: 50,
          background: "#1f2937",
          border: "1px solid #374151",
          borderRadius: "0.5rem",
          overflow: "hidden",
          minWidth: "110px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}>
          {ALL_STATUSES.map((s) => {
            const b = STATUS_BADGE[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => select(s)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  textAlign: "left",
                  background: s === current ? "#374151" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: s === current ? 700 : 400,
                  color: b.color,
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Delete confirmation modal ───────────────────────────────────────────────
function DeleteModal({
  client,
  onCancel,
  onConfirm,
}: {
  client: ClientSummary;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed. Please try again.");
      setDeleting(false);
    }
  };

  return (
    // Backdrop
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.65)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
    >
      {/* Modal panel — stop propagation so clicks inside don't close */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#111827",
          border: "1px solid #374151",
          borderRadius: "1rem",
          padding: "2rem",
          maxWidth: "420px",
          width: "100%",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
        }}
      >
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.1rem", color: "#f9fafb" }}>
          Delete {client.name}&rsquo;s case?
        </h2>
        <p style={{ margin: "0 0 1.5rem", fontSize: "0.9rem", color: "#9ca3af", lineHeight: 1.6 }}>
          This will permanently remove their intake data, roadmap, documents, and case notes.
          This cannot be undone.
        </p>

        {error && (
          <p style={{
            margin: "0 0 1rem",
            padding: "0.6rem 0.875rem",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid #ef4444",
            borderRadius: "0.5rem",
            color: "#fca5a5",
            fontSize: "0.85rem",
          }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            style={{
              padding: "0.55rem 1.25rem",
              borderRadius: "999px",
              border: "1px solid #374151",
              background: "transparent",
              color: "#9ca3af",
              fontSize: "0.875rem",
              cursor: deleting ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            style={{
              padding: "0.55rem 1.25rem",
              borderRadius: "999px",
              border: "none",
              background: deleting ? "#7f1d1d" : "#dc2626",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: deleting ? "not-allowed" : "pointer",
            }}
          >
            {deleting ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard component ─────────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<CaseStatus | "All">("Active");
  const [pendingDelete, setPendingDelete] = useState<ClientSummary | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!token) {
        setError("Your session has expired. Please sign in again.");
        setIsLoading(false);
        return;
      }
      try {
        const data = await getClients(token);
        if (!isMounted) return;
        setClients(data.clients);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load clients right now.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [token]);

  const handleStatusChange = (clientId: string, newStatus: CaseStatus) => {
    setClients(prev =>
      prev.map(c => c.id === clientId ? { ...c, case_status: newStatus } : c)
    );
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete || !token) throw new Error("Session expired.");
    await deleteClient(token, pendingDelete.id);
    setClients(prev => prev.filter(c => c.id !== pendingDelete.id));
    setPendingDelete(null);
  };

  const filtered = filter === "All"
    ? clients
    : clients.filter(c => c.case_status === filter);

  const FILTER_OPTIONS: Array<CaseStatus | "All"> = ["All", "Active", "Placed", "On Hold", "Closed"];

  return (
    <section aria-label="Client dashboard">
      <div className="page__actions">
        <button
          type="button"
          className="button button--primary"
          onClick={() => navigate("/intake")}
        >
          New client intake
        </button>
      </div>

      {isLoading && <p role="status" aria-live="polite">Loading clients…</p>}
      {error && <div className="alert alert--error" role="alert">{error}</div>}

      {!isLoading && !error && (
        <>
          {/* Filter bar */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            {FILTER_OPTIONS.map((opt) => {
              const isActive = filter === opt;
              const badge = opt !== "All" ? STATUS_BADGE[opt as CaseStatus] : null;
              const count = opt === "All"
                ? clients.length
                : clients.filter(c => c.case_status === opt).length;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setFilter(opt)}
                  style={{
                    padding: "0.35rem 0.875rem",
                    borderRadius: "999px",
                    border: isActive
                      ? `1.5px solid ${badge?.border ?? "#6b7280"}`
                      : "1.5px solid #374151",
                    background: isActive
                      ? (badge?.bg ?? "#374151")
                      : "transparent",
                    color: isActive
                      ? (badge?.color ?? "#f9fafb")
                      : "#9ca3af",
                    fontSize: "0.8rem",
                    fontWeight: isActive ? 700 : 400,
                    cursor: "pointer",
                  }}
                >
                  {opt} <span style={{ opacity: 0.65 }}>({count})</span>
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <p style={{ color: "#6b7280" }}>
              No {filter !== "All" ? filter.toLowerCase() : ""} clients.
            </p>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <caption className="sr-only">Client list</caption>
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Priority</th>
                    <th scope="col">Status</th>
                    <th scope="col">Created</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((client) => {
                    const pb = PRIORITY_BADGE[client.priority] ?? PRIORITY_BADGE.CRITICAL;
                    return (
                      <tr key={client.id}>
                        <td>{client.name}</td>
                        <td>
                          <span style={{ color: pb.color, fontWeight: 600 }}>
                            {pb.emoji} {pb.label}
                          </span>
                        </td>
                        <td>
                          <StatusDropdown
                            clientId={client.id}
                            current={client.case_status ?? "Active"}
                            onChange={handleStatusChange}
                          />
                        </td>
                        <td>
                          <time dateTime={client.createdAt}>
                            {new Date(client.createdAt).toLocaleDateString()}
                          </time>
                        </td>
                        <td style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                          <Link
                            to={`/roadmap/${encodeURIComponent(client.id)}`}
                            className="link"
                          >
                            View roadmap
                          </Link>
                          <button
                            type="button"
                            title={`Delete ${client.name}'s case`}
                            onClick={() => setPendingDelete(client)}
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "1rem",
                              lineHeight: 1,
                              color: "#6b7280",
                              padding: "0.1rem 0.25rem",
                              borderRadius: "0.25rem",
                              transition: "color 150ms",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                            onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}
                          >
                            🗑
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {pendingDelete && (
        <DeleteModal
          client={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </section>
  );
};

export default Dashboard;
