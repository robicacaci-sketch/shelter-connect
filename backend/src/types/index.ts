export interface DocumentStatus {
  birthCert: boolean;
  ssn: boolean;
  stateId: boolean;
  address: boolean;       // Homeless verification letter or NJ address proof
  income: boolean;        // Pay stubs OR zero-income self-certification
  // Conditional (optional):
  medicalDocs?: boolean;
  veteranDocs?: boolean;  // DD-214
}

export type SpecialCircumstance =
  | 'none'
  | 'reentry'          // Recently released from NJ prison/jail
  | 'dv_survivor'      // Domestic violence survivor
  | 'veteran'          // Homeless NJ veteran
  | 'elderly'          // 65+ / limited mobility
  | 'youth'            // Under 25, unaccompanied
  | 'undocumented'     // No federal ID eligibility
  | 'eviction';        // Has all docs, facing imminent eviction

export interface Resource {
  category: string;
  name: string;
  description: string;
  url: string;
  phone: string;
  whoItServes: string;
  cost: string;
  coverageArea: string;
  njNotes: string;
}

export interface ActionPlanStep {
  step_number: number;
  action: string;             // What to do (e.g. "Call 1-800-XXX")
  phone?: string;             // Phone number if applicable
  address?: string;           // Address if applicable
  stage?: string;             // Visual pipeline column label (e.g. "Identity Documents")
  what_to_ask_for: string;    // Exactly what to say or request
  goal_of_this_step: string;  // What document/outcome this step produces
  why_it_matters: string;     // One sentence linking this step to the final goal
  expected_outcome: string;   // What should happen after completing this step
}

export interface ActionPlan {
  comboId: number;                   // 1–33 from the Full Combo Matrix
  scenarioId?: string;               // S-01 through S-12 (if special circumstance)
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  docsHave: string[];
  docsMissing: string[];
  firstAction: string;               // Single most urgent step (raw text from matrix)
  rawSteps: string[];                // Raw ordered action sequence from matrix
  fastestPath: string;               // Condensed fastest route to housing-ready
  workarounds: string[];             // Emergency alternatives
  estimatedTime: string;             // e.g. "6–10 weeks"
  programsAccessible: string[];      // Programs unlocked with current docs
  resources: Resource[];             // Relevant contacts from Resource Directory
  // Enriched fields produced by AI:
  finalGoal: string;                 // Determined from intake data before plan generation
  summary: string;                   // 2-3 sentence plain-language explanation
  steps: ActionPlanStep[];           // Structured steps with full field objects
}

export interface Document {
  id: string;
  name: string;
  required: 'yes' | 'conditional';
  prerequisites: string[];
  firstStep: string;
  fullProcess: string;
  alternativePath: string;
  docsRequired: string[];
  cost: string;
  feeWaiverAvailable: boolean;
  estimatedTime: string;
  difficulty: 'Low' | 'Medium' | 'High';
  onlineUrl: string;
  phone: string;
  officeLocations: string;
  specialNotes: string;
  programsUnlocked: string[];
  dependenciesUnlocked: string[];
}

export interface HousingProgram {
  name: string;
  type: string;
  eligibility: string;
  url: string;
  phone: string;
  region: string;
  notes: string;
}

// Internal type used in combo matrix before resources are injected
// steps here are raw strings — enriched into ActionPlanStep[] by planEnricherService
export interface ComboEntry {
  comboId: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  docsHave: string[];
  docsMissing: string[];
  firstAction: string;
  steps: string[];       // raw strings; mapped to rawSteps on ActionPlan
  fastestPath: string;
  workarounds: string[];
  estimatedTime: string;
  programsAccessible: string[];
}

export interface ScenarioEntry {
  id: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  firstAction: string;
  steps: string[];
  fastestPath: string;
  workarounds: string[];
  estimatedTime: string;
}
