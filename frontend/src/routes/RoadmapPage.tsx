import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ClientDetail,
  ClientDocument,
  PlanMeta,
  RoadmapStep,
  getClientRoadmap,
  getClientDocuments,
  updateStepStatus
} from "../api/clientApi";
import RoadmapDisplay from "../components/RoadmapDisplay";
import PrintRoadmap from "../components/PrintRoadmap";
import DocumentWallet from "../components/DocumentWallet";
import DocumentReassessPanel from "../components/DocumentReassessPanel";
import CaseNotes from "../components/CaseNotes";

const RoadmapPage: React.FC = () => {
  const { clientId = "" } = useParams<{ clientId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [steps, setSteps] = useState<RoadmapStep[]>([]);
  const [planMeta, setPlanMeta] = useState<PlanMeta>({ finalGoal: "", summary: "" });
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!token) {
        setError("Your session has expired. Please sign in again.");
        setIsLoading(false);
        return;
      }

      try {
        const [roadmapData, docsData] = await Promise.all([
          getClientRoadmap(token, clientId),
          getClientDocuments(token, clientId)
        ]);
        if (!isMounted) return;
        setClient(roadmapData.client);
        setSteps(roadmapData.roadmap);
        setPlanMeta(roadmapData.planMeta ?? { finalGoal: "", summary: "" });
        setDocuments(docsData.documents);
      } catch (err) {
        if (!isMounted) return;
        const message =
          err instanceof Error
            ? err.message
            : "Unable to load roadmap right now.";
        setError(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [clientId, token]);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Housing Roadmap</title>
          <style>
            body { margin: 0; padding: 0; background: white; }
            @media print {
              body { margin: 0; }
              @page { margin: 1.5cm; }
            }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  const handleStepUpdate = async (stepId: string, newStatus: RoadmapStep["status"]) => {
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: newStatus } : s));
    try {
      await updateStepStatus(token!, clientId, stepId, newStatus);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    } catch {
      setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: s.status } : s));
    }
  };

  if (isLoading) {
    return (
      <main className="page page--center" role="main">
        <p role="status" aria-live="polite">
          Loading roadmap…
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page page--center" role="main">
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      </main>
    );
  }

  if (!client) {
    return (
      <main className="page page--center" role="main">
        <p>Individual not found.</p>
      </main>
    );
  }

  return (
    <main className="page" role="main">
      <div style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            border: "1px solid #DDEAF7",
            background: "transparent",
            color: "#6B8BAE",
            borderRadius: "0.375rem",
            padding: "0.45rem 1rem",
            fontSize: "0.85rem",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          ← Back to Dashboard
        </button>
      </div>

      <header className="page__header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h1>{client.name}&rsquo;s roadmap</h1>
          {client.priority && (
            <p className="page__subtitle">
              Priority: <strong>{client.priority}</strong>
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {savedToast && (
            <span style={{ fontSize: "0.82rem", color: "#22c55e", fontWeight: 600 }}>
              ✓ Saved
            </span>
          )}
          <button
            type="button"
            onClick={handlePrint}
            style={{
              padding: "0.5rem 1.1rem",
              borderRadius: "0.375rem",
              border: "1px solid #DDEAF7",
              backgroundColor: "transparent",
              color: "#6B8BAE",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            🖨 Print for individual
          </button>
        </div>
      </header>

      {client.documentStatus && (
        <DocumentReassessPanel
          clientId={clientId}
          currentDocumentStatus={client.documentStatus}
          onRoadmapUpdated={(newSteps, newDocStatus, newPlanMeta) => {
            setSteps(newSteps);
            setPlanMeta(newPlanMeta ?? { finalGoal: "", summary: "" });
            if (newDocStatus) setClient(prev => prev ? { ...prev, documentStatus: newDocStatus } : prev);
          }}
        />
      )}

      <RoadmapDisplay steps={steps} planMeta={planMeta} clientId={clientId} onStepUpdate={handleStepUpdate} />
      <DocumentWallet clientId={clientId} initialDocuments={documents} />
      <CaseNotes clientId={clientId} />

      {/* Hidden print container */}
      <div ref={printRef} style={{ display: "none" }}>
        {steps.length > 0 && (
          <PrintRoadmap
            steps={steps}
            planMeta={planMeta}
            clientName={client.name}
          />
        )}
      </div>
    </main>
  );
};

export default RoadmapPage;
