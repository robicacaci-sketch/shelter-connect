import { DocumentStatus } from "../types/index";

// Builds the lookup key for the COMBO_MATRIX
// Format: "BIRTH-SSN-ID-ADDR-INC" using Y or N
// e.g. all docs present → "Y-Y-Y-Y-Y", none present → "N-N-N-N-N"
export function buildComboKey(docs: DocumentStatus): string {
  return [
    docs.birthCert ? "Y" : "N",
    docs.ssn       ? "Y" : "N",
    docs.stateId   ? "Y" : "N",
    docs.address   ? "Y" : "N",
    docs.income    ? "Y" : "N",
  ].join("-");
}
