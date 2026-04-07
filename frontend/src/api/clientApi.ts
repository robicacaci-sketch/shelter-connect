import { apiRequest } from "./httpClient";

export type DocumentStatus = {
  birthCert: boolean;
  ssn: boolean;
  stateId: boolean;
  address: boolean;
  income: boolean;
};

export type SpecialCircumstance =
  | "none"
  | "reentry"
  | "dv_survivor"
  | "veteran"
  | "elderly"
  | "youth"
  | "undocumented"
  | "eviction";

export type RoadmapStep = {
  id: string;
  roadmapId: string;
  stage: string;
  title: string;
  description: string;
  status: "not_started" | "in_progress" | "completed";
  order: number;
  notes?: string;
};

export type CaseStatus = "Active" | "Placed" | "On Hold" | "Closed";

export type ClientSummary = {
  id: string;
  name: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  case_status: CaseStatus;
  createdAt: string;
  roadmapStepsTotal?: number;
  roadmapStepsCompleted?: number;
};

export type ClientDetail = {
  id: string;
  name: string;
  priority?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  documentStatus?: DocumentStatus;
};

export type CreateClientPayload = {
  name: string;
  dateOfBirth?: string;
  currentShelterStatus: string;
  documentStatus: DocumentStatus;
  specialCircumstance: SpecialCircumstance;
  additionalInfo?: Record<string, unknown>;
};

export const createClient = async (token: string, payload: CreateClientPayload) =>
  apiRequest<ClientDetail & { id: string }>("/api/clients", {
    method: "POST",
    token,
    body: payload
  });

export const getClients = async (token: string) =>
  apiRequest<{ clients: ClientSummary[] }>("/api/clients", {
    method: "GET",
    token
  });

export type PlanMeta = {
  finalGoal: string;
  summary: string;
};

export const getClientRoadmap = async (token: string, clientId: string) =>
  apiRequest<{ client: ClientDetail; roadmap: RoadmapStep[]; planMeta: PlanMeta }>(
    `/api/clients/${encodeURIComponent(clientId)}/roadmap`,
    {
      method: "GET",
      token
    }
  );

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

export const updateClientDocumentStatus = async (
  token: string,
  clientId: string,
  documentStatus: DocumentStatus
) =>
  apiRequest<{ success: boolean; steps: RoadmapStep[]; planMeta: PlanMeta }>(
    `/api/clients/${encodeURIComponent(clientId)}/documents-status`,
    { method: "PATCH", token, body: { documentStatus } }
  );

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

export const deleteClient = async (token: string, clientId: string) =>
  apiRequest<{ success: boolean; id: string }>(
    `/api/clients/${encodeURIComponent(clientId)}`,
    { method: "DELETE", token }
  );

export const updateStepNote = async (
  token: string,
  clientId: string,
  stepId: string,
  notes: string
): Promise<void> => {
  await apiRequest<{ success: boolean }>(
    `/api/clients/${encodeURIComponent(clientId)}/roadmap/steps/${encodeURIComponent(stepId)}/notes`,
    { method: "PATCH", token, body: { notes } }
  );
};

export const updateClientCaseStatus = async (
  token: string,
  clientId: string,
  case_status: CaseStatus
) =>
  apiRequest<{ id: string; case_status: CaseStatus }>(
    `/api/clients/${encodeURIComponent(clientId)}/status`,
    { method: "PATCH", token, body: { case_status } }
  );
