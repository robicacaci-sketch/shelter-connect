import React, { useRef, useState } from "react";
import { ClientDocument, uploadClientDocument, deleteClientDocument } from "../api/clientApi";
import { useAuth } from "../context/AuthContext";

type DocType = ClientDocument["docType"];

const DOC_SLOTS: { type: DocType; label: string; icon: string; hint: string }[] = [
  { type: "birth_cert", icon: "📄", label: "Birth Certificate",                     hint: "PDF or photo" },
  { type: "ssn",        icon: "🔢", label: "Social Security Card",                  hint: "PDF or photo" },
  { type: "state_id",   icon: "🪪", label: "NJ State ID / Driver's License",        hint: "PDF or photo" },
  { type: "address",    icon: "📍", label: "Address / Homeless Verification Letter", hint: "PDF or photo" },
  { type: "income",     icon: "💰", label: "Income Proof / Zero-Income Cert.",       hint: "PDF or photo" },
  { type: "other",      icon: "📎", label: "Other Document",                         hint: "Any relevant file" },
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
