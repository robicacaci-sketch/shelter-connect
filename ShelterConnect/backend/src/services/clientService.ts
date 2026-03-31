import { db } from "../db/index";
import { Client, CaseStatus } from "../models/Client";
import { DocumentStatus, SpecialCircumstance } from "../types/index";

export interface CreateClientPayload {
  name: string;
  dateOfBirth?: string;
  currentShelterStatus: string;
  documentStatus: DocumentStatus;
  specialCircumstance: SpecialCircumstance;
  additionalInfo?: Record<string, unknown>;
}

const nowIso = () => new Date().toISOString();

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const createClient = (
  payload: CreateClientPayload,
  caseManagerId: string
): Promise<Client> => {
  const id = generateId();
  const createdAt = nowIso();
  const updatedAt = createdAt;

  const documentStatusJson = JSON.stringify(payload.documentStatus);
  const additionalInfoJson = JSON.stringify(payload.additionalInfo ?? {});

  return new Promise<Client>((resolve, reject) => {
    db.run(
      `
        INSERT INTO clients (
          id,
          name,
          dateOfBirth,
          currentShelterStatus,
          documentStatus,
          specialCircumstance,
          additionalInfo,
          caseManagerId,
          createdAt,
          updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        payload.name,
        payload.dateOfBirth ?? null,
        payload.currentShelterStatus,
        documentStatusJson,
        payload.specialCircumstance,
        additionalInfoJson,
        caseManagerId,
        createdAt,
        updatedAt
      ],
      (err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve({
          id,
          name: payload.name,
          dateOfBirth: payload.dateOfBirth,
          currentShelterStatus: payload.currentShelterStatus,
          documentStatus: payload.documentStatus,
          specialCircumstance: payload.specialCircumstance,
          additionalInfo: payload.additionalInfo ?? {},
          case_status: "Active",
          caseManagerId,
          createdAt,
          updatedAt
        });
      }
    );
  });
};

export interface ClientListItem {
  id: string;
  name: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  case_status: CaseStatus;
  createdAt: string;
}

// Row shape coming back from SQLite for the list query
interface ClientListRow {
  id: string;
  name: string;
  documentStatus: string;
  specialCircumstance: string;
  case_status: string;
  createdAt: string;
}

export const listClientsForCaseManager = (
  caseManagerId: string
): Promise<ClientListItem[]> => {
  return new Promise<ClientListItem[]>((resolve, reject) => {
    db.all<ClientListRow>(
      `
        SELECT id, name, documentStatus, specialCircumstance, case_status, createdAt
        FROM clients
        WHERE caseManagerId = ?
        ORDER BY createdAt DESC
      `,
      [caseManagerId],
      (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        const derivePriority = (docStatusJson: string): ClientListItem["priority"] => {
          try {
            const d = JSON.parse(docStatusJson) as DocumentStatus;
            const count = [d.birthCert, d.ssn, d.stateId, d.address, d.income].filter(Boolean).length;
            if (count <= 1) return "CRITICAL";
            if (count <= 2) return "HIGH";
            if (count <= 4) return "MEDIUM";
            return "LOW";
          } catch {
            return "CRITICAL";
          }
        };

        resolve(
          (rows ?? []).map((row) => ({
            id: row.id,
            name: row.name,
            priority: derivePriority(row.documentStatus),
            case_status: (row.case_status as CaseStatus) ?? "Active",
            createdAt: row.createdAt
          }))
        );
      }
    );
  });
};

// Full client row from SQLite
interface ClientRow {
  id: string;
  name: string;
  dateOfBirth?: string;
  currentShelterStatus: string;
  documentStatus: string;
  specialCircumstance: string;
  additionalInfo: string;
  case_status: string;
  caseManagerId: string;
  createdAt: string;
  updatedAt: string;
}

export const getClientForCaseManager = (
  clientId: string,
  caseManagerId: string
): Promise<Client | null> => {
  return new Promise<Client | null>((resolve, reject) => {
    db.get<ClientRow>(
      `
        SELECT *
        FROM clients
        WHERE id = ? AND caseManagerId = ?
      `,
      [clientId, caseManagerId],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (!row) {
          resolve(null);
          return;
        }

        const documentStatus: DocumentStatus =
          typeof row.documentStatus === "string" && row.documentStatus.length > 0
            ? JSON.parse(row.documentStatus)
            : { birthCert: false, ssn: false, stateId: false, address: false, income: false };

        const additionalInfo: Record<string, unknown> =
          typeof row.additionalInfo === "string" && row.additionalInfo.length > 0
            ? JSON.parse(row.additionalInfo)
            : {};

        resolve({
          ...row,
          documentStatus,
          specialCircumstance: row.specialCircumstance as SpecialCircumstance,
          case_status: (row.case_status as CaseStatus) ?? "Active",
          additionalInfo
        });
      }
    );
  });
};
