import { DocumentStatus, SpecialCircumstance } from "../types/index";

export type CaseStatus = "Active" | "Placed" | "On Hold" | "Closed";

export const VALID_CASE_STATUSES: CaseStatus[] = ["Active", "Placed", "On Hold", "Closed"];

export interface Client {
  id: string;
  name: string;
  dateOfBirth?: string;
  currentShelterStatus: string;
  documentStatus: DocumentStatus;            // the 5 boolean flags
  specialCircumstance: SpecialCircumstance;  // replaces riskFactors
  additionalInfo?: Record<string, unknown>;
  case_status: CaseStatus;
  caseManagerId: string;
  createdAt: string;
  updatedAt: string;
}
