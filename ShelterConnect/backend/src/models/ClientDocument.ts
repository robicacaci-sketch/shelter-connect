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
