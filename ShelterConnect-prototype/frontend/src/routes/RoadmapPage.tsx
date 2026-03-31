import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
import DocumentWallet from "../components/DocumentWallet";
import DocumentReassessPanel from "../components/DocumentReassessPanel";
import CaseNotes from "../components/CaseNotes";

const RoadmapPage: React.FC = () => {
  const { clientId = "" } = useParams<{ clientId: string }>();
  const { token } = useAuth();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [steps, setSteps] = useState<RoadmapStep[]>([]);
  const [planMeta, setPlanMeta] = useState<PlanMeta>({ finalGoal: "", summary: "" });
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        <p>Client not found.</p>
      </main>
    );
  }

  return (
    <main className="page" role="main">
      <header className="page__header">
        <h1>{client.name}&rsquo;s roadmap</h1>
        {client.priority && (
          <p className="page__subtitle">
            Priority: <strong>{client.priority}</strong>
          </p>
        )}
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
    </main>
  );
};

export default RoadmapPage;
