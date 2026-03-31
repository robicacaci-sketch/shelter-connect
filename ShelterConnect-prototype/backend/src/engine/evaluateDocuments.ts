import {
  DocumentStatus,
  SpecialCircumstance,
  ActionPlan,
  Resource,
  Document,
} from "../types/index";
import { COMBO_MATRIX } from "../data/comboMatrix";
import { SCENARIO_MATRIX } from "../data/scenarioMatrix";
import { RESOURCE_DIRECTORY } from "../data/resourceDirectory";
import { DOCUMENT_CATALOG } from "../data/documentCatalog";
import { buildComboKey } from "./buildComboKey";
import { applyScenarioOverlay } from "./applyScenario";

// PRIMARY: Evaluate document status → return a full action plan
export function evaluateDocumentStatus(
  docs: DocumentStatus,
  circumstance: SpecialCircumstance = "none"
): ActionPlan {
  const key = buildComboKey(docs);
  const combo = COMBO_MATRIX[key];

  if (!combo) {
    throw new Error(`No combo found for key: ${key}`);
  }

  // Inject relevant resources based on missing docs and scenario
  const resources = getResourcesForPlan(docs, circumstance);

  const base: ActionPlan = {
    ...combo,
    rawSteps: combo.steps,
    resources,
    finalGoal: "",
    summary: "",
    steps: [],
  };

  if (circumstance !== "none") {
    const scenario = SCENARIO_MATRIX[circumstance];
    if (scenario) {
      return applyScenarioOverlay(base, scenario);
    }
  }

  return base;
}

// Build combo key from document booleans (re-exported for convenience)
export { buildComboKey };

// Get all programs currently accessible given current docs
export function getProgramsAccessible(docs: DocumentStatus): string[] {
  const key = buildComboKey(docs);
  return COMBO_MATRIX[key]?.programsAccessible ?? [];
}

// Get document details by ID
export function getDocumentDetails(docId: string): Document | undefined {
  return DOCUMENT_CATALOG[docId];
}

// Get resources relevant to missing docs and special circumstance
export function getResourcesForDocument(docId: string): Resource[] {
  return RESOURCE_DIRECTORY.filter(
    (r) =>
      r.category.toLowerCase().replace(/\s+/g, "_") === docId ||
      categoryMatchesDoc(r.category, docId)
  );
}

function categoryMatchesDoc(category: string, docId: string): boolean {
  const map: Record<string, string[]> = {
    birthCert: ["Birth Certificate"],
    ssn: ["Social Security"],
    stateId: ["NJ MVC / State ID"],
    address: ["NJ Emergency"],
    income: ["NJ Benefits"],
    veteran: ["NJ Housing Programs"],
  };
  return (map[docId] ?? []).includes(category);
}

function getResourcesForPlan(
  docs: DocumentStatus,
  circumstance: SpecialCircumstance
): Resource[] {
  const relevant: Resource[] = [];
  const seen = new Set<string>();

  const addResource = (r: Resource) => {
    const key = `${r.name}::${r.phone}`;
    if (!seen.has(key)) {
      seen.add(key);
      relevant.push(r);
    }
  };

  // Always include NJ 211 as the first resource
  const nj211 = RESOURCE_DIRECTORY.find((r) => r.name === "NJ 211");
  if (nj211) addResource(nj211);

  // Add resources for each missing document
  if (!docs.birthCert) {
    RESOURCE_DIRECTORY.filter((r) => r.category === "Birth Certificate").forEach(addResource);
  }
  if (!docs.ssn) {
    RESOURCE_DIRECTORY.filter((r) => r.category === "Social Security").forEach(addResource);
  }
  if (!docs.stateId) {
    RESOURCE_DIRECTORY.filter((r) => r.category === "NJ MVC / State ID").forEach(addResource);
  }
  if (!docs.address) {
    RESOURCE_DIRECTORY.filter((r) => r.name === "NJ PATH Program").forEach(addResource);
  }
  if (!docs.income) {
    RESOURCE_DIRECTORY.filter((r) => r.name === "NJHelps.org" || r.name === "NJ FamilyCare").forEach(addResource);
  }

  // Add scenario-specific resources
  if (circumstance === "veteran") {
    RESOURCE_DIRECTORY.filter(
      (r) => r.name === "VA Homeless Veterans Hotline" || r.name === "NJ Veterans Haven" || r.name === "NJ Division of Veterans Services"
    ).forEach(addResource);
  } else if (circumstance === "dv_survivor") {
    RESOURCE_DIRECTORY.filter((r) => r.name === "NJ DV Hotline").forEach(addResource);
  } else if (circumstance === "youth") {
    RESOURCE_DIRECTORY.filter((r) => r.name === "Covenant House NJ").forEach(addResource);
  } else if (circumstance === "reentry") {
    RESOURCE_DIRECTORY.filter((r) => r.name === "NJ Reentry Support Line").forEach(addResource);
  } else if (circumstance === "undocumented") {
    RESOURCE_DIRECTORY.filter((r) => r.name === "Legal Services of NJ").forEach(addResource);
  } else if (circumstance === "eviction") {
    RESOURCE_DIRECTORY.filter(
      (r) => r.name === "NJ Homelessness Prevention Program (HPP)" || r.name === "Legal Services of NJ"
    ).forEach(addResource);
  }

  // Always include housing programs
  RESOURCE_DIRECTORY.filter((r) => r.category === "NJ Housing Programs").forEach(addResource);

  return relevant;
}
