# Backend Spec — NJ Shelter Intake Web App
**Source:** `NJ_Housing_Document_Guide_FINAL.xlsx`
**Purpose:** This document is the single source of truth for Claude Code to implement all backend logic. The frontend already exists. Every data model, decision rule, and action sequence defined here comes directly from the Excel database.

---

## 1. Architecture Overview

The backend is a **pure logic engine** — no external database required for MVP. All data is hardcoded from the Excel sheets into structured JavaScript/TypeScript objects. The engine takes a user's document status as input and returns a personalized action plan as output.

```
INPUT:  { birthCert, ssn, stateId, address, income } + optional { specialCircumstance }
ENGINE: Document combo lookup → Scenario overlay → Resource injection
OUTPUT: { priority, firstAction, steps[], fastestPath, workarounds[], timeline, programsAccessible[] }
```

---

## 2. Core Data Models

### 2.1 DocumentStatus (intake input)
```typescript
interface DocumentStatus {
  birthCert: boolean;
  ssn: boolean;
  stateId: boolean;
  address: boolean;       // Homeless verification letter or NJ address proof
  income: boolean;        // Pay stubs OR zero-income self-certification
  // Conditional (optional):
  medicalDocs?: boolean;
  veteranDocs?: boolean;  // DD-214
}
```

### 2.2 SpecialCircumstance (optional overlay)
```typescript
type SpecialCircumstance =
  | 'none'
  | 'reentry'          // Recently released from NJ prison/jail
  | 'dv_survivor'      // Domestic violence survivor
  | 'veteran'          // Homeless NJ veteran
  | 'elderly'          // 65+ / limited mobility
  | 'youth'            // Under 25, unaccompanied
  | 'undocumented'     // No federal ID eligibility
  | 'eviction';        // Has all docs, facing imminent eviction
```

### 2.3 ActionPlan (output)
```typescript
interface ActionPlan {
  comboId: number;                   // 1–32 from the Full Combo Matrix
  scenarioId?: string;               // S-01 through S-12 (if special circumstance)
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  docsHave: string[];
  docsMissing: string[];
  firstAction: string;               // Single most urgent step
  steps: string[];                   // Full ordered action sequence
  fastestPath: string;               // Condensed fastest route to housing-ready
  workarounds: string[];             // Emergency alternatives
  estimatedTime: string;             // e.g. "6–10 weeks"
  programsAccessible: string[];      // Programs unlocked with current docs
  resources: Resource[];             // Relevant contacts from Resource Directory
}
```

### 2.4 Document (reference data)
```typescript
interface Document {
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
```

### 2.5 Resource (reference data)
```typescript
interface Resource {
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
```

### 2.6 HousingProgram (reference data)
```typescript
interface HousingProgram {
  name: string;
  type: string;
  eligibility: string;
  url: string;
  phone: string;
  region: string;
  notes: string;
}
```

---

## 3. Decision Engine Logic

### 3.1 Primary Engine — 32-Combo Matrix
The engine maps any combination of the 5 core boolean document flags to a predefined action plan.

**How to implement:**
1. Take the 5 booleans as input
2. Compute a lookup key: `${birthCert}-${ssn}-${stateId}-${address}-${income}` (e.g. `"N-N-N-N-N"`, `"Y-N-N-N-N"`)
3. Return the matching combo object from `COMBO_MATRIX` (see Section 4.1)

**Priority Rules (from the data):**
- `CRITICAL` — 0 or 1 docs, or address is missing and no useful docs to leverage
- `HIGH` — 2–3 docs missing, OR special high-urgency circumstances (reentry, DV, youth, eviction)
- `MEDIUM` — 1–2 docs missing, manageable gap
- `LOW` — All 5 core docs present (ready to apply for housing)

### 3.2 Special Circumstance Overlay — 12 Scenario Matrix
After the combo lookup, if a `specialCircumstance` is set, apply the scenario overlay. The scenario **overrides** `firstAction`, `steps`, `fastestPath`, and `workarounds` with scenario-specific NJ guidance, while keeping the combo's `priority` unless the scenario has a higher one.

**Scenario ID mapping:**
| Circumstance | Scenario ID | Priority Override |
|---|---|---|
| none | — | no override |
| reentry | S-05 | HIGH |
| dv_survivor | S-06 | HIGH |
| veteran | S-07 | MEDIUM |
| elderly | S-08 | MEDIUM |
| youth | S-09 | HIGH |
| undocumented | S-10 | HIGH |
| eviction | S-12 | HIGH |

---

## 4. Data — Hardcoded from Excel (Seed This Directly)

### 4.1 COMBO_MATRIX (32 entries — Full 32-Combo Decision Matrix sheet)
Each entry covers one unique YES/NO combination of the 5 core docs.

```javascript
// Key format: "BIRTH-SSN-ID-ADDR-INC" (Y or N)
const COMBO_MATRIX = {
  "N-N-N-N-N": {
    comboId: 1,
    priority: "CRITICAL",
    docsHave: ["NONE"],
    docsMissing: ["Birth Cert", "SSN Card", "NJ State ID", "Address Proof", "Income Proof"],
    firstAction: "Call NJ 211 (dial 211) for emergency shelter → get Homeless Verification Letter same day",
    steps: [
      "Call NJ 211 (dial 211) or text ZIP to 898-211 → request emergency shelter placement",
      "Request Homeless Verification Letter from shelter staff (same day)",
      "Order NJ Birth Certificate: nj.gov/health/vital (online, $25 or fee waiver) or call 609-292-4087",
      "Schedule SSA appointment for SSN card: 1-800-772-1213 (run parallel with birth cert)",
      "Book NJ MVC appointment for State ID: telegov.njportal.com/njmvc ($24 or free with waiver)",
      "Complete Zero-Income Self-Certification at housing agency",
      "Submit NJ CoC Coordinated Entry intake",
    ],
    fastestPath: "211 → Shelter + Verification Letter → Birth Cert (2–3 wks) → SSN Card (10–14 days) → NJ MVC State ID (1–2 wks) → CoC intake → Housing waitlist",
    workarounds: [
      "USPS General Delivery at any NJ post office (free, 30-day hold) — usable as mailing address on all applications",
      "NJ 211 can find shelters with on-site caseworkers who start ALL document processes same day",
    ],
    estimatedTime: "8–12 weeks",
    programsAccessible: ["Emergency shelter via NJ 211", "NJ Homelessness Prevention Program (if facing eviction)"],
  },
  "N-N-N-N-Y": {
    comboId: 2,
    priority: "CRITICAL",
    docsHave: ["Income Proof"],
    docsMissing: ["Birth Cert", "SSN Card", "NJ State ID", "Address Proof"],
    firstAction: "Get Homeless Verification Letter from any NJ shelter or NJ PATH (609-292-3092)",
    steps: [
      "Call NJ 211 (dial 211) or text ZIP to 898-211 → request emergency shelter placement",
      "Request Homeless Verification Letter from shelter staff (same day)",
      "Order NJ Birth Certificate: nj.gov/health/vital or call 609-292-4087",
      "Schedule SSA appointment for SSN card (run parallel with birth cert): 1-800-772-1213",
      "Book NJ MVC State ID appointment after SSN arrives: telegov.njportal.com/njmvc",
      "Submit NJ CoC Coordinated Entry intake once ID obtained",
    ],
    fastestPath: "211 → Shelter + Verification Letter → Birth Cert (2–3 wks) → SSN Card (10–14 days) → NJ MVC State ID (1–2 wks) → CoC intake",
    workarounds: [
      "USPS General Delivery at any NJ post office — usable as mailing address",
      "NJ FamilyCare / Medicaid can be applied for with income proof now",
    ],
    estimatedTime: "6–10 weeks",
    programsAccessible: ["NJ FamilyCare / Medicaid", "NJ Homelessness Prevention Program (if facing eviction)"],
  },
  "N-N-N-Y-N": {
    comboId: 3,
    priority: "CRITICAL",
    docsHave: ["Address Proof"],
    docsMissing: ["Birth Cert", "SSN Card", "NJ State ID", "Income Proof"],
    firstAction: "Contact NJ Vital Records (609-292-4087) to order birth certificate — it is the master key",
    steps: [
      "Order NJ Birth Certificate online (nj.gov/health/vital) or call 609-292-4087 — use address proof you have",
      "Schedule SSA appointment (run parallel): 1-800-772-1213",
      "After SSN arrives, book NJ MVC State ID: telegov.njportal.com/njmvc",
      "Complete Zero-Income Self-Certification at housing agency (free, immediate)",
      "Submit NJ CoC Coordinated Entry intake",
    ],
    fastestPath: "Birth Cert (2–3 wks) → SSN Card (10–14 days) → NJ MVC State ID (1–2 wks) → Zero-Income Self-Cert (immediate) → CoC intake",
    workarounds: [
      "NJ Vital Records accepts notarized affidavit as alternative to photo ID for birth cert request",
      "If born outside NJ, use CDC Vital Statistics for out-of-state birth records",
    ],
    estimatedTime: "6–10 weeks",
    programsAccessible: ["NJ CoC Coordinated Entry", "Emergency shelter + NJ PATH outreach", "NJ Homelessness Prevention Program (if facing eviction)"],
  },
  "N-N-Y-N-N": {
    comboId: 4,
    priority: "CRITICAL",
    docsHave: ["NJ State ID"],
    docsMissing: ["Birth Cert", "SSN Card", "Address Proof", "Income Proof"],
    firstAction: "Get Homeless Verification Letter from any NJ shelter or NJ PATH (609-292-3092)",
    steps: [
      "Call NJ 211 (dial 211) → emergency shelter placement",
      "Request Homeless Verification Letter from shelter (same day)",
      "Use NJ State ID to order birth cert online: nj.gov/health/vital",
      "Go to SSA office with State ID to get SSN card: 1-800-772-1213",
      "Complete Zero-Income Self-Certification at housing agency",
      "Submit NJ CoC Coordinated Entry intake",
    ],
    fastestPath: "211 → Shelter + Verification Letter → Birth Cert (2–3 wks) → SSN Card (10–14 days) → Zero-Income Self-Cert → CoC intake",
    workarounds: [
      "USPS General Delivery at any NJ post office — usable as mailing address",
      "NJ State ID alone enables Medicaid, SNAP, and many housing intake processes",
    ],
    estimatedTime: "6–10 weeks",
    programsAccessible: ["Emergency shelter via NJ 211", "NJ Homelessness Prevention Program (if facing eviction)"],
  },
  "N-Y-N-N-N": {
    comboId: 5,
    priority: "CRITICAL",
    docsHave: ["SSN Card"],
    docsMissing: ["Birth Cert", "NJ State ID", "Address Proof", "Income Proof"],
    firstAction: "Get Homeless Verification Letter from any NJ shelter or NJ PATH (609-292-3092)",
    steps: [
      "Call NJ 211 (dial 211) → emergency shelter placement",
      "Request Homeless Verification Letter from shelter (same day)",
      "Order NJ Birth Certificate: nj.gov/health/vital or 609-292-4087",
      "Book NJ MVC appointment for State ID once birth cert arrives: telegov.njportal.com/njmvc",
      "Complete Zero-Income Self-Certification",
      "Submit NJ CoC Coordinated Entry intake",
    ],
    fastestPath: "211 → Shelter + Verification Letter → Birth Cert (2–3 wks) → NJ MVC State ID (1–2 wks) → Zero-Income Self-Cert → CoC intake",
    workarounds: [
      "USPS General Delivery at any NJ post office — usable as mailing address",
    ],
    estimatedTime: "6–10 weeks",
    programsAccessible: ["Emergency shelter via NJ 211", "NJ Homelessness Prevention Program (if facing eviction)"],
  },
  "Y-N-N-N-N": {
    comboId: 6,
    priority: "CRITICAL",
    docsHave: ["Birth Cert"],
    docsMissing: ["SSN Card", "NJ State ID", "Address Proof", "Income Proof"],
    firstAction: "Get Homeless Verification Letter from any NJ shelter or NJ PATH (609-292-3092)",
    steps: [
      "Call NJ 211 (dial 211) → emergency shelter placement",
      "Request Homeless Verification Letter from shelter (same day)",
      "Go to NJ SSA office with birth cert to get SSN card: 1-800-772-1213",
      "Book NJ MVC State ID appointment after SSN arrives",
      "Complete Zero-Income Self-Certification",
      "Submit NJ CoC Coordinated Entry intake",
    ],
    fastestPath: "211 → Shelter + Verification Letter → SSN Card (10–14 days) → NJ MVC State ID (1–2 wks) → Zero-Income Self-Cert → CoC intake",
    workarounds: [
      "USPS General Delivery at any NJ post office — usable as mailing address",
    ],
    estimatedTime: "6–10 weeks",
    programsAccessible: ["Emergency shelter via NJ 211", "NJ Homelessness Prevention Program (if facing eviction)"],
  },
  "N-N-N-Y-Y": {
    comboId: 7,
    priority: "HIGH",
    docsHave: ["Address Proof", "Income Proof"],
    docsMissing: ["Birth Cert", "SSN Card", "NJ State ID"],
    firstAction: "Contact NJ Vital Records (609-292-4087) to order birth certificate — it is the master key",
    steps: [
      "Order NJ Birth Certificate: nj.gov/health/vital or 609-292-4087 (use address proof as ID)",
      "Schedule SSA appointment to run parallel with birth cert: 1-800-772-1213",
      "Book NJ MVC State ID appointment once SSN arrives: telegov.njportal.com/njmvc ($24 or free with waiver)",
      "Submit NJ CoC Coordinated Entry intake once ID obtained",
    ],
    fastestPath: "Birth Cert (2–3 wks) → SSN Card (10–14 days) → NJ MVC State ID (1–2 wks) → NJ CoC Intake → EHV/Rapid Rehousing",
    workarounds: [
      "NJ Vital Records accepts notarized affidavit as alternative to photo ID",
      "If born outside NJ, use CDC vital statistics for out-of-state birth records",
    ],
    estimatedTime: "4–8 weeks",
    programsAccessible: ["NJ CoC Coordinated Entry", "Emergency shelter + NJ PATH outreach", "NJ FamilyCare / Medicaid", "NJ Homelessness Prevention Program (if facing eviction)"],
  },
  "N-N-Y-N-Y": {
    comboId: 8,
    priority: "HIGH",
    docsHave: ["NJ State ID", "Income Proof"],
    docsMissing: ["Birth Cert", "SSN Card", "Address Proof"],
    firstAction: "Get Homeless Verification Letter from any NJ shelter or NJ PATH (609-292-3092)",
    steps: [
      "Call NJ 211 → emergency shelter placement",
      "Request Homeless Verification Letter (same day)",
      "Use State ID to order birth cert online: nj.gov/health/vital",
      "Go to SSA with State ID for SSN card: 1-800-772-1213",
      "Submit NJ CoC Coordinated Entry intake",
    ],
    fastestPath: "211 → Shelter + Verification Letter → Birth Cert (2–3 wks) → SSN Card (10–14 days) → NJ CoC Intake → EHV/Rapid Rehousing",
    workarounds: ["USPS General Delivery — usable as mailing address"],
    estimatedTime: "4–8 weeks",
    programsAccessible: ["NJ FamilyCare / Medicaid", "NJ Homelessness Prevention Program (if facing eviction)"],
  },
  "N-N-Y-Y-N": {
    comboId: 9,
    priority: "HIGH",
    docsHave: ["NJ State ID", "Address Proof"],
    docsMissing: ["Birth Cert", "SSN Card", "Income Proof"],
    firstAction: "Order NJ birth certificate at nj.gov/health/vital — needed before SSN card can be obtained",
    steps: [
      "Order NJ Birth Certificate online: nj.gov/health/vital (use State ID + address)",
      "Schedule SSA appointment to run parallel: 1-800-772-1213",
      "Complete Zero-Income Self-Certification at housing agency (immediate, free)",
      "Submit NJ CoC Coordinated Entry intake once SSN obtained",
    ],
    fastestPath: "Birth Cert (2–3 wks) → SSN Card (10–14 days) → Zero-Income Self-Cert (immediate) → NJ CoC Intake → EHV/Rapid Rehousing",
    workarounds: ["NJ Vital Records accepts notarized affidavit as photo ID alternative"],
    estimatedTime: "4–8 weeks",
    programsAccessible: ["NJ CoC Coordinated Entry", "NJ Homelessness Prevention Program (if facing eviction)"],
  },
  "N-Y-N-N-Y": {
    comboId: 10,
    priority: "HIGH",
    docsHave: ["SSN Card", "Income Proof"],
    docsMissing: ["Birth Cert", "NJ State ID", "Address Proof"],
    firstAction: "Get Homeless Verification Letter from any NJ shelter or NJ PATH (609-292-3092)",
    steps: [
      "Call NJ 211 → emergency shelter placement",
      "Request Homeless Verification Letter (same day)",
      "Order NJ Birth Certificate: nj.gov/health/vital or 609-292-4087",
      "Book NJ MVC State ID once birth cert arrives: telegov.njportal.com/njmvc",
      "Submit NJ CoC Coordinated Entry intake",
    ],
    fastestPath: "211 → Shelter + Verification Letter → Birth Cert (2–3 wks) → NJ MVC State ID (1–2 wks) → NJ CoC Intake → EHV/Rapid Rehousing",
    workarounds: ["USPS General Delivery — usable as mailing address"],
    estimatedTime: "4–8 weeks",
    programsAccessible: ["NJ FamilyCare / Medicaid", "NJ Homelessness Prevention Program (if facing eviction)"],
  },
  "Y-N-N-N-Y": {
    comboId: 11,
    priority: "HIGH",
    docsHave: ["Birth Cert", "Income Proof"],
    docsMissing: ["SSN Card", "NJ State ID", "Address Proof"],
    firstAction: "Get Homeless Verification Letter, then go to NJ SSA with birth cert TODAY: 1-800-772-1213",
    steps: [
      "Call NJ 211 → emergency shelter placement",
      "Request Homeless Verification Letter (same day)",
      "Go to NJ SSA office with birth cert for SSN card: 1-800-772-1213",
      "Book NJ MVC State ID once SSN arrives: telegov.njportal.com/njmvc",
      "Submit NJ CoC Coordinated Entry intake",
    ],
    fastestPath: "211 → Shelter + Verification Letter → SSN Card (10–14 days) → NJ MVC State ID (1–2 wks) → NJ CoC Intake",
    workarounds: ["USPS General Delivery — usable as mailing address"],
    estimatedTime: "4–8 weeks",
    programsAccessible: ["NJ FamilyCare / Medicaid", "NJ Homelessness Prevention Program (if facing eviction)"],
  },
  "Y-N-N-Y-N": {
    comboId: 12,
    priority: "HIGH",
    docsHave: ["Birth Cert", "Address Proof"],
    docsMissing: ["SSN Card", "NJ State ID", "Income Proof"],
    firstAction: "Go to NJ SSA office with birth cert and address proof TODAY: 1-800-772-1213",
    steps: [
      "Go to NJ SSA office with birth cert + address proof: 1-800-772-1213",
      "Book NJ MVC State ID once SSN arrives: telegov.njportal.com/njmvc",
      "Complete Zero-Income Self-Certification at housing agency (free, immediate)",
      "Submit NJ CoC Coordinated Entry intake",
    ],
    fastestPath: "SSN Card (10–14 days) → NJ MVC State ID (1–2 wks) → Zero-Income Self-Cert → NJ CoC Intake → EHV/Rapid Rehousing",
    workarounds: ["NJ ID not required for SSA appointment — birth cert alone is sufficient"],
    estimatedTime: "4–8 weeks",
    programsAccessible: ["NJ CoC Coordinated Entry", "NJ Homelessness Prevention Program (if facing eviction)"],
  },
  "Y-Y-N-N-N": {
    comboId: 13,
    priority: "HIGH",
    docsHave: ["Birth Cert", "SSN Card"],
    docsMissing: ["NJ State ID", "Address Proof", "Income Proof"],
    firstAction: "Get Homeless Verification Letter, then book NJ MVC appointment immediately: telegov.njportal.com/njmvc",
    steps: [
      "Call NJ 211 → emergency shelter placement",
      "Request Homeless Verification Letter (same day)",
      "Book NJ MVC State ID appointment: telegov.njportal.com/njmvc ($24 or free with waiver)",
      "Complete Zero-Income Self-Certification",
      "Submit NJ CoC Coordinated Entry intake",
    ],
    fastestPath: "211 → Shelter + Verification Letter → NJ MVC State ID (1–2 wks) → Zero-Income Self-Cert → NJ CoC Intake",
    workarounds: ["USPS General Delivery — usable as mailing address"],
    estimatedTime: "3–6 weeks",
    programsAccessible: ["NJ FamilyCare / Medicaid (with birth cert + SSN)", "NJ Homelessness Prevention Program"],
  },
  "N-N-Y-Y-Y": {
    comboId: 14,
    priority: "HIGH",
    docsHave: ["NJ State ID", "Address Proof", "Income Proof"],
    docsMissing: ["Birth Cert", "SSN Card"],
    firstAction: "Order NJ birth certificate NOW — fastest path is online: nj.gov/health/vital",
    steps: [
      "Order NJ Birth Certificate online: nj.gov/health/vital (use State ID + address)",
      "Schedule SSA appointment to run parallel: 1-800-772-1213",
      "Submit NJ CoC Coordinated Entry intake once SSN obtained",
    ],
    fastestPath: "Birth Cert (2–3 wks) → SSN Card (10–14 days) → NJ CoC Intake (immediate) → EHV/Rapid Rehousing priority",
    workarounds: ["NJ State ID alone enables Medicaid, SNAP, and many housing intake processes NOW"],
    estimatedTime: "3–6 weeks",
    programsAccessible: ["NJ CoC Coordinated Entry", "NJ FamilyCare / Medicaid", "NJ SNAP", "NJ Homelessness Prevention Program"],
  },
  "N-Y-N-Y-N": {
    comboId: 15,
    priority: "HIGH",
    docsHave: ["SSN Card", "Address Proof"],
    docsMissing: ["Birth Cert", "NJ State ID", "Income Proof"],
    firstAction: "Order NJ birth certificate — the master key you need: nj.gov/health/vital or 609-292-4087",
    steps: [
      "Order NJ Birth Certificate: nj.gov/health/vital or 609-292-4087",
      "Book NJ MVC State ID once birth cert arrives: telegov.njportal.com/njmvc",
      "Complete Zero-Income Self-Certification",
      "Submit NJ CoC Coordinated Entry intake",
    ],
    fastestPath: "Birth Cert (2–3 wks) → NJ MVC State ID (1–2 wks) → Zero-Income Self-Cert → NJ CoC Intake → EHV/Rapid Rehousing",
    workarounds: ["SSN + address proof already unlocks NJ FamilyCare / Medicaid and SNAP NOW"],
    estimatedTime: "4–8 weeks",
    programsAccessible: ["NJ FamilyCare / Medicaid", "NJ SNAP", "NJ Homelessness Prevention Program"],
  },
  "N-Y-N-Y-Y": {
    comboId: 16,
    priority: "HIGH",
    docsHave: ["SSN Card", "Address Proof", "Income Proof"],
    docsMissing: ["Birth Cert", "NJ State ID"],
    firstAction: "Order NJ birth certificate — the single missing piece before State ID: nj.gov/health/vital",
    steps: [
      "Order NJ Birth Certificate: nj.gov/health/vital or 609-292-4087",
      "Book NJ MVC State ID once birth cert arrives: telegov.njportal.com/njmvc ($24 or free)",
      "Submit NJ CoC Coordinated Entry intake once ID obtained",
    ],
    fastestPath: "Birth Cert (2–3 wks) → NJ MVC State ID (1–2 wks) → NJ CoC Intake (immediately) → EHV/Rapid Rehousing priority",
    workarounds: ["SSN + address + income already qualifies for NJ FamilyCare, SNAP, WorkFirst"],
    estimatedTime: "3–5 weeks",
    programsAccessible: ["NJ FamilyCare / Medicaid", "NJ SNAP", "NJ WorkFirst NJ", "NJ Homelessness Prevention Program"],
  },
  "N-Y-Y-N-N": {
    comboId: 17,
    priority: "HIGH",
    docsHave: ["SSN Card", "NJ State ID"],
    docsMissing: ["Birth Cert", "Address Proof", "Income Proof"],
    firstAction: "Get Homeless Verification Letter, then order birth cert — you have the ID to do it online",
    steps: [
      "Call NJ 211 → emergency shelter placement",
      "Request Homeless Verification Letter (same day)",
      "Order NJ Birth Certificate online using State ID: nj.gov/health/vital",
      "Complete Zero-Income Self-Certification",
      "Submit NJ CoC Coordinated Entry intake",
    ],
    fastestPath: "211 → Shelter + Verification Letter → Birth Cert (2–3 wks) → Zero-Income Self-Cert → NJ CoC Intake",
    workarounds: ["SSN + State ID combination already unlocks NJ Medicaid and SNAP NOW"],
    estimatedTime: "3–6 weeks",
    programsAccessible: ["NJ FamilyCare / Medicaid", "NJ SNAP", "Emergency shelter via NJ 211"],
  },
  "N-Y-Y-N-Y": {
    comboId: 18,
    priority: "MEDIUM",
    docsHave: ["SSN Card", "NJ State ID", "Income Proof"],
    docsMissing: ["Birth Cert", "Address Proof"],
    firstAction: "Get Homeless Verification Letter from any NJ shelter or NJ PATH — it's free and same-day",
    steps: [
      "Request Homeless Verification Letter from shelter or NJ PATH: 609-292-3092",
      "Order NJ Birth Certificate online using State ID: nj.gov/health/vital",
      "Submit NJ CoC Coordinated Entry intake (can begin NOW with current docs)",
    ],
    fastestPath: "Homeless Verification Letter (same day) → NJ CoC Intake → EHV/Rapid Rehousing + Birth Cert (2–3 wks) in parallel",
    workarounds: ["Many NJ housing intake processes accept State ID + SSN without birth cert to begin"],
    estimatedTime: "2–5 weeks",
    programsAccessible: ["NJ CoC Coordinated Entry", "NJ FamilyCare / Medicaid", "NJ SNAP", "NJ WorkFirst NJ"],
  },
  "N-Y-Y-Y-N": {
    comboId: 19,
    priority: "MEDIUM",
    docsHave: ["SSN Card", "NJ State ID", "Address Proof"],
    docsMissing: ["Birth Cert", "Income Proof"],
    firstAction: "Order NJ birth certificate online AND complete Zero-Income Self-Certification simultaneously",
    steps: [
      "Order NJ Birth Certificate online: nj.gov/health/vital",
      "Complete Zero-Income Self-Certification at housing agency (free, immediate)",
      "Submit NJ CoC Coordinated Entry intake (can begin NOW)",
    ],
    fastestPath: "Zero-Income Self-Cert (today) → NJ CoC Intake (today) → Birth Cert (2–3 wks, parallel) → EHV/Rapid Rehousing",
    workarounds: ["You can begin CoC intake NOW with current docs — birth cert in parallel"],
    estimatedTime: "2–5 weeks",
    programsAccessible: ["NJ CoC Coordinated Entry", "NJ FamilyCare / Medicaid", "NJ SNAP", "NJ WorkFirst NJ"],
  },
  "N-Y-Y-Y-Y": {
    comboId: 20,
    priority: "MEDIUM",
    docsHave: ["SSN Card", "NJ State ID", "Address Proof", "Income Proof"],
    docsMissing: ["Birth Cert"],
    firstAction: "Order NJ birth certificate immediately — it's the only missing piece: nj.gov/health/vital or 609-292-4087",
    steps: [
      "Order NJ Birth Certificate: nj.gov/health/vital (online, $25 or fee waiver) or call 609-292-4087",
      "Submit NJ CoC Coordinated Entry intake NOW — don't wait for birth cert",
      "Add birth cert to file once it arrives (2–3 weeks)",
    ],
    fastestPath: "NJ CoC Intake (today) → EHV/Rapid Rehousing (priority) → Birth Cert (2–3 wks, in parallel)",
    workarounds: ["Many programs accept State ID + SSN in lieu of birth cert to START the application"],
    estimatedTime: "2–4 weeks for intake; birth cert arrives in parallel",
    programsAccessible: ["NJ CoC Coordinated Entry (NOW)", "NJ FamilyCare / Medicaid", "NJ SNAP", "NJ WorkFirst NJ", "NJ DCA Housing Programs"],
  },
  "Y-N-N-Y-Y": {
    comboId: 21,
    priority: "HIGH",
    docsHave: ["Birth Cert", "Address Proof", "Income Proof"],
    docsMissing: ["SSN Card", "NJ State ID"],
    firstAction: "Go to NJ SSA office TODAY with birth cert + address proof: 1-800-772-1213",
    steps: [
      "Go to NJ SSA office with birth cert + address proof: 1-800-772-1213",
      "Book NJ MVC State ID once SSN arrives: telegov.njportal.com/njmvc",
      "Submit NJ CoC Coordinated Entry intake once ID obtained",
    ],
    fastestPath: "SSN Card (10–14 days) → NJ MVC State ID (1–2 wks) → NJ CoC Intake → EHV/Rapid Rehousing",
    workarounds: ["USPS General Delivery as mailing address for SSN card delivery"],
    estimatedTime: "3–5 weeks",
    programsAccessible: ["NJ Homelessness Prevention Program", "NJ FamilyCare / Medicaid (pending)"],
  },
  "Y-N-Y-N-N": {
    comboId: 22,
    priority: "HIGH",
    docsHave: ["Birth Cert", "NJ State ID"],
    docsMissing: ["SSN Card", "Address Proof", "Income Proof"],
    firstAction: "Go to NJ SSA with birth cert + State ID TODAY to get SSN card: 1-800-772-1213",
    steps: [
      "Go to NJ SSA with birth cert + State ID: 1-800-772-1213 (SSN card in 10–14 days)",
      "Call NJ 211 → emergency shelter + Homeless Verification Letter (same day)",
      "Complete Zero-Income Self-Certification",
      "Submit NJ CoC Coordinated Entry intake",
    ],
    fastestPath: "SSN Card (10–14 days) → 211 + Verification Letter (same day) → Zero-Income Self-Cert → NJ CoC Intake",
    workarounds: ["State ID alone enables Medicaid and SNAP applications NOW"],
    estimatedTime: "3–6 weeks",
    programsAccessible: ["NJ FamilyCare / Medicaid (with ID)", "Emergency shelter via NJ 211"],
  },
  "Y-N-Y-N-Y": {
    comboId: 23,
    priority: "MEDIUM",
    docsHave: ["Birth Cert", "NJ State ID", "Income Proof"],
    docsMissing: ["SSN Card", "Address Proof"],
    firstAction: "Get SSN card AND Homeless Verification Letter simultaneously — both are fast",
    steps: [
      "Go to NJ SSA with birth cert + State ID: 1-800-772-1213",
      "Request Homeless Verification Letter from shelter or NJ PATH: 609-292-3092 (same day)",
      "Submit NJ CoC Coordinated Entry intake once SSN + address obtained",
    ],
    fastestPath: "SSN Card (10–14 days) + Verification Letter (same day) → NJ CoC Intake → EHV/Rapid Rehousing",
    workarounds: ["State ID + income proof already qualifies for NJ FamilyCare and SNAP NOW"],
    estimatedTime: "2–4 weeks",
    programsAccessible: ["NJ FamilyCare / Medicaid", "NJ SNAP", "NJ Homelessness Prevention Program"],
  },
  "Y-N-Y-Y-N": {
    comboId: 24,
    priority: "MEDIUM",
    docsHave: ["Birth Cert", "NJ State ID", "Address Proof"],
    docsMissing: ["SSN Card", "Income Proof"],
    firstAction: "Get SSN card AND complete Zero-Income Self-Certification simultaneously",
    steps: [
      "Go to NJ SSA with birth cert + State ID + address: 1-800-772-1213",
      "Complete Zero-Income Self-Certification at housing agency (free, immediate)",
      "Submit NJ CoC Coordinated Entry intake",
    ],
    fastestPath: "SSN Card (10–14 days) + Zero-Income Self-Cert (today) → NJ CoC Intake → EHV/Rapid Rehousing",
    workarounds: ["CoC intake can begin with current docs — SSN in parallel"],
    estimatedTime: "2–4 weeks",
    programsAccessible: ["NJ CoC Coordinated Entry (can begin)", "NJ FamilyCare / Medicaid", "NJ SNAP"],
  },
  "Y-N-Y-Y-Y": {
    comboId: 25,
    priority: "MEDIUM",
    docsHave: ["Birth Cert", "NJ State ID", "Address Proof", "Income Proof"],
    docsMissing: ["SSN Card"],
    firstAction: "Go to NJ SSA office TODAY — SSN card is the only missing piece: 1-800-772-1213",
    steps: [
      "Go to NJ SSA with birth cert + State ID: 1-800-772-1213",
      "Submit NJ CoC Coordinated Entry intake NOW (can start without SSN)",
      "Add SSN to file once card arrives (10–14 days)",
    ],
    fastestPath: "NJ CoC Intake (today) + SSN Card (10–14 days, parallel) → EHV/Rapid Rehousing priority",
    workarounds: ["CoC can begin intake NOW with birth cert + State ID + address + income"],
    estimatedTime: "2–3 weeks for SSN; intake starts immediately",
    programsAccessible: ["NJ CoC Coordinated Entry (NOW)", "NJ FamilyCare / Medicaid", "NJ SNAP", "NJ DCA Housing Programs"],
  },
  "Y-Y-N-N-N": {
    comboId: 26,
    priority: "HIGH",
    docsHave: ["Birth Cert", "SSN Card"],
    docsMissing: ["NJ State ID", "Address Proof", "Income Proof"],
    firstAction: "Get Homeless Verification Letter, then book NJ MVC State ID immediately: telegov.njportal.com/njmvc",
    steps: [
      "Call NJ 211 → emergency shelter + Homeless Verification Letter (same day)",
      "Book NJ MVC State ID: telegov.njportal.com/njmvc ($24 or free with waiver)",
      "Complete Zero-Income Self-Certification",
      "Submit NJ CoC Coordinated Entry intake",
    ],
    fastestPath: "211 → Shelter + Verification Letter (same day) → NJ MVC State ID (1–2 wks) → Zero-Income Self-Cert → NJ CoC Intake",
    workarounds: ["Birth cert + SSN unlocks NJ FamilyCare and SNAP applications NOW"],
    estimatedTime: "3–6 weeks",
    programsAccessible: ["NJ FamilyCare / Medicaid", "NJ SNAP", "Emergency shelter via NJ 211"],
  },
  "Y-Y-N-N-Y": {
    comboId: 27,
    priority: "HIGH",
    docsHave: ["Birth Cert", "SSN Card", "Income Proof"],
    docsMissing: ["NJ State ID", "Address Proof"],
    firstAction: "Get Homeless Verification Letter, then book NJ MVC State ID immediately",
    steps: [
      "Call NJ 211 → emergency shelter + Homeless Verification Letter (same day)",
      "Book NJ MVC State ID: telegov.njportal.com/njmvc",
      "Submit NJ CoC Coordinated Entry intake once ID obtained",
    ],
    fastestPath: "Verification Letter (same day) → NJ MVC State ID (1–2 wks) → NJ CoC Intake → EHV/Rapid Rehousing",
    workarounds: ["Birth cert + SSN + income = can apply for NJ FamilyCare, SNAP, WorkFirst NOW"],
    estimatedTime: "2–4 weeks",
    programsAccessible: ["NJ FamilyCare / Medicaid", "NJ SNAP", "NJ WorkFirst NJ", "NJ Homelessness Prevention Program"],
  },
  "Y-Y-N-Y-N": {
    comboId: 28,
    priority: "MEDIUM",
    docsHave: ["Birth Cert", "SSN Card", "Address Proof"],
    docsMissing: ["NJ State ID", "Income Proof"],
    firstAction: "Book NJ MVC State ID appointment AND complete Zero-Income Self-Cert simultaneously",
    steps: [
      "Book NJ MVC State ID: telegov.njportal.com/njmvc ($24 or free with waiver)",
      "Complete Zero-Income Self-Certification at housing agency (free, immediate)",
      "Submit NJ CoC Coordinated Entry intake once ID obtained",
    ],
    fastestPath: "NJ MVC State ID (1–2 wks) + Zero-Income Self-Cert (today) → NJ CoC Intake → EHV/Rapid Rehousing",
    workarounds: ["Can begin CoC intake with other 3 docs while waiting for State ID"],
    estimatedTime: "2–3 weeks",
    programsAccessible: ["NJ CoC Coordinated Entry (can begin)", "NJ FamilyCare / Medicaid", "NJ SNAP"],
  },
  "Y-Y-N-Y-Y": {
    comboId: 29,
    priority: "MEDIUM",
    docsHave: ["Birth Cert", "SSN Card", "Address Proof", "Income Proof"],
    docsMissing: ["NJ State ID"],
    firstAction: "Book NJ MVC State ID appointment immediately — it's the only missing piece",
    steps: [
      "Book NJ MVC State ID: telegov.njportal.com/njmvc ($24 or free with waiver; bring birth cert + SSN + address)",
      "Submit NJ CoC Coordinated Entry intake NOW (don't wait for ID card)",
      "Present State ID once card arrives",
    ],
    fastestPath: "NJ CoC Intake (today) + NJ MVC State ID (1–2 wks, parallel) → EHV/Rapid Rehousing priority",
    workarounds: ["4 out of 5 docs is strong enough to begin most intake processes NOW"],
    estimatedTime: "1–2 weeks for ID; intake starts immediately",
    programsAccessible: ["NJ CoC Coordinated Entry (NOW)", "NJ FamilyCare / Medicaid", "NJ SNAP", "NJ WorkFirst NJ", "NJ DCA Housing Programs"],
  },
  "Y-Y-Y-N-N": {
    comboId: 30,
    priority: "MEDIUM",
    docsHave: ["Birth Cert", "SSN Card", "NJ State ID"],
    docsMissing: ["Address Proof", "Income Proof"],
    firstAction: "Get Homeless Verification Letter AND complete Zero-Income Self-Cert today — both are fast and free",
    steps: [
      "Request Homeless Verification Letter from shelter or NJ PATH: 609-292-3092 (same day, free)",
      "Complete Zero-Income Self-Certification at housing agency (same day, free)",
      "Submit NJ CoC Coordinated Entry intake immediately",
    ],
    fastestPath: "Verification Letter + Zero-Income Self-Cert (both TODAY) → NJ CoC Intake → EHV/Rapid Rehousing",
    workarounds: ["Both missing items can be resolved in a single day at no cost"],
    estimatedTime: "1–2 weeks",
    programsAccessible: ["NJ CoC Coordinated Entry", "NJ FamilyCare / Medicaid", "NJ SNAP", "NJ DCA Housing Programs"],
  },
  "Y-Y-Y-N-Y": {
    comboId: 31,
    priority: "LOW",
    docsHave: ["Birth Cert", "SSN Card", "NJ State ID", "Income Proof"],
    docsMissing: ["Address Proof"],
    firstAction: "Get Homeless Verification Letter from any NJ shelter or NJ PATH — it's same day and free",
    steps: [
      "Request Homeless Verification Letter from shelter or NJ PATH: 609-292-3092 (same day, free)",
      "Submit NJ CoC Coordinated Entry intake immediately after",
    ],
    fastestPath: "Verification Letter (today) → NJ CoC Intake (today) → EHV/Rapid Rehousing priority",
    workarounds: ["USPS General Delivery accepted by most housing programs as address"],
    estimatedTime: "Days for intake; placement varies by county",
    programsAccessible: ["NJ CoC Coordinated Entry", "All NJ housing programs", "NJ FamilyCare / Medicaid", "NJ SNAP", "Section 8 NJ", "NJ DCA Housing"],
  },
  "Y-Y-Y-Y-N": {
    comboId: 32,
    priority: "LOW",
    docsHave: ["Birth Cert", "SSN Card", "NJ State ID", "Address Proof"],
    docsMissing: ["Income Proof"],
    firstAction: "Complete Zero-Income Self-Certification today — free, takes minutes, unlocks everything",
    steps: [
      "Complete Zero-Income Self-Certification at any NJ housing agency (free, immediate)",
      "Submit NJ CoC Coordinated Entry intake immediately",
    ],
    fastestPath: "Zero-Income Self-Cert (today) → NJ CoC Intake (today) → EHV/Rapid Rehousing",
    workarounds: ["Zero income is common and expected — caseworkers process this daily"],
    estimatedTime: "Days for intake; placement varies by county",
    programsAccessible: ["NJ CoC Coordinated Entry", "All NJ housing programs", "NJ FamilyCare / Medicaid", "NJ SNAP", "Section 8 NJ", "NJ DCA Housing"],
  },
  "Y-Y-Y-Y-Y": {
    comboId: 33,
    priority: "LOW",
    docsHave: ["Birth Cert", "SSN Card", "NJ State ID", "Address Proof", "Income Proof"],
    docsMissing: [],
    firstAction: "Submit NJ CoC Coordinated Entry intake TODAY and simultaneously apply to all open NJ housing waitlists",
    steps: [
      "Find NJ CoC: hudexchange.info/grantees/?program=CoC&state=NJ or call NJ 211 (dial 211)",
      "Submit Coordinated Entry intake (bring all 5 documents)",
      "Simultaneously apply to: EHV program, Rapid Rehousing programs, Section 8 waitlists in your county",
      "Contact NJ DCA for state housing programs: 609-292-4080",
    ],
    fastestPath: "CoC Intake (today) → EHV + Rapid Rehousing priority → Section 8 waitlist",
    workarounds: ["NJ Section 8 waitlists are often 2–10+ years — focus on EHV and Rapid Rehousing for faster placement"],
    estimatedTime: "Immediate intake; placement 1 week–3 years depending on NJ county",
    programsAccessible: ["ALL NJ housing programs", "NJ CoC Coordinated Entry", "EHV", "Rapid Rehousing", "Section 8 NJ", "NJ DCA Housing", "NJ FamilyCare", "NJ SNAP", "NJ WorkFirst NJ"],
  },
};
```

### 4.2 SCENARIO_MATRIX (12 entries — NJ Scenario Decision Matrix sheet)
```javascript
const SCENARIO_MATRIX = {
  "reentry": {
    id: "S-05",
    description: "Recently released from NJ prison / jail",
    priority: "HIGH",
    firstAction: "Contact NJ Reentry Support Line immediately: 1-844-917-2325. NJDOC provides ID at release — use it.",
    steps: [
      "Use NJDOC-issued State ID (provided at release) as primary ID",
      "Call NJ Reentry Support Line: 1-844-917-2325 for immediate reentry housing referral",
      "Contact county reentry housing coordinator (all 21 NJ counties have one)",
      "Apply for NJ Medicaid reinstatement immediately — suspended at incarceration, reinstated at release",
      "Go to SSA office with NJDOC ID for SSN card if needed",
      "Apply for NJ MVC State ID using NJDOC ID",
    ],
    fastestPath: "NJDOC ID → SSA (SSN card) → NJ MVC ID → Medicaid reinstatement → County reentry housing",
    workarounds: ["NJ has 'ban the box' laws and reentry-specific housing programs. Always disclose reentry status to unlock dedicated programs."],
    estimatedTime: "4–8 weeks",
  },
  "dv_survivor": {
    id: "S-06",
    description: "NJ Domestic Violence Survivor — left home with nothing",
    priority: "HIGH",
    firstAction: "Call NJ DV Hotline: 1-800-572-7233 — they will connect you with a NJ DV shelter that handles all document recovery.",
    steps: [
      "Call NJ DV Hotline: 1-800-572-7233 (24/7) → placed in NJ DV shelter same day if needed",
      "NJ DV shelter staff will request birth certificate, SSN card, and all docs using shelter address (safe address)",
      "Enroll in NJ Address Confidentiality Program (ACP) for safe mailing address on all future documents",
      "Get Emergency Housing Voucher (EHV) referral through NJ DV shelter",
    ],
    fastestPath: "NJ DV hotline → NJ DV shelter → ACP enrollment → documents with safe address → EHV application",
    workarounds: ["Do NOT put abuser's address on any document. Use NJ ACP address or shelter address only."],
    estimatedTime: "2–6 weeks",
  },
  "veteran": {
    id: "S-07",
    description: "NJ Veteran — homeless, unclear discharge status",
    priority: "MEDIUM",
    firstAction: "Call VA Homeless Hotline: 1-877-424-3838 AND NJ DVS: 1-888-865-8387 — both available NOW.",
    steps: [
      "Call VA Homeless Veterans Hotline: 1-877-424-3838 (24/7) for immediate referral",
      "Contact NJ Division of Veterans Services: 1-888-865-8387 for NJ-specific programs",
      "Request DD-214 via eVetRecs: archives.gov/veterans/military-service-records (free, 1–3 weeks)",
      "Enroll in VA healthcare (can be done same day with any VA facility)",
      "Apply for HUD-VASH voucher through VA or NJ Veterans Haven",
    ],
    fastestPath: "VA hotline (today) → VA healthcare enrollment → HUD-VASH referral → NJ Veterans Haven",
    workarounds: ["NJ Veterans Haven has locations in North and South NJ. OTH discharge veterans considered case-by-case."],
    estimatedTime: "2–6 weeks",
  },
  "elderly": {
    id: "S-08",
    description: "Elderly NJ resident (65+) — limited mobility or technology access",
    priority: "MEDIUM",
    firstAction: "Call NJ Area Agency on Aging: 1-877-222-3737 — free in-home assistance available for all document needs.",
    steps: [
      "Call NJ Division of Aging Services: 1-877-222-3737 for in-home document assistance",
      "Get SSA printout confirming Social Security income (use as income proof)",
      "Request birth certificate by mail from NJ Vital Records: 609-292-4087",
      "Contact NJ MVC for mobile or accessibility services for State ID",
      "Apply for Section 202 (elderly housing) through NJ DCA",
    ],
    fastestPath: "SSA income confirmation → birth cert by mail → NJ MVC mobile or in-person → Section 202 application",
    workarounds: ["NJ LIFE Program can provide home and community-based services as alternative to institutional care."],
    estimatedTime: "4–8 weeks",
  },
  "youth": {
    id: "S-09",
    description: "NJ youth (under 25) — aging out of foster care or unaccompanied",
    priority: "HIGH",
    firstAction: "Contact Covenant House NJ in Newark (973-621-8705) or call the National Runaway Safeline: 1-800-786-2929.",
    steps: [
      "Contact Covenant House NJ (Newark): 973-621-8705 for youth shelter and services",
      "Request DCPP case file (if in/exiting foster care) for identity documents",
      "Apply for NJ FamilyCare (Medicaid) — youth under 26 qualify regardless of income",
      "Access NJ DCF transitional housing programs for youth aging out of foster care",
    ],
    fastestPath: "NJ youth shelter → DCPP case file request → documents → NJ FamilyCare → NJ DCF transitional housing",
    workarounds: ["NJ foster care alumni up to age 21 have legal right to state services. DEMAND them if needed."],
    estimatedTime: "4–8 weeks",
  },
  "undocumented": {
    id: "S-10",
    description: "Undocumented immigrant in NJ — no federal ID eligibility",
    priority: "HIGH",
    firstAction: "Contact NJ immigration legal aid immediately: Legal Services of NJ: 1-888-576-5529 (free).",
    steps: [
      "Contact Legal Services of NJ: 1-888-576-5529 for free immigration legal help",
      "Access any NJ emergency shelter — all NJ shelters serve regardless of immigration status",
      "Apply for ITIN (Individual Taxpayer ID) for access to some state benefits",
      "Connect with Catholic Charities, AFSC, or community organizations for undocumented housing support",
    ],
    fastestPath: "Emergency shelter (all NJ shelters) → ITIN → nonprofit/state programs → legal aid for status options",
    workarounds: ["NJ has significant nonprofit housing capacity for undocumented individuals."],
    estimatedTime: "Varies widely",
  },
  "eviction": {
    id: "S-12",
    description: "NJ resident facing eviction — has documents, needs immediate help",
    priority: "HIGH",
    firstAction: "Call NJ 211 immediately for NJ Homelessness Prevention Program (HPP) — emergency rental assistance available.",
    steps: [
      "Call NJ 211 (dial 211) — request Homelessness Prevention Program (HPP) referral",
      "NJ HPP provides emergency rental assistance BEFORE eviction is finalized",
      "Contact Legal Services of NJ for free eviction defense: 1-888-576-5529",
      "File for NJ Emergency Housing Voucher (EHV) simultaneously as backup",
      "Contact NJ DCA for all state rental assistance programs: 609-292-4080",
    ],
    fastestPath: "NJ 211 → HPP application (stops eviction) → Legal Services (eviction defense) → Section 8 waitlist",
    workarounds: ["NJ has strong eviction prevention programs. A 72-hour 'pay or quit' notice does NOT mean you must leave — NJ court process takes weeks."],
    estimatedTime: "Immediate intervention possible; resolution 1 week–3 months",
  },
};
```

### 4.3 DOCUMENT_CATALOG (9 entries — NJ Document Master Guide sheet)
Store these as structured objects. Key fields per document:

| Field | Data |
|---|---|
| `id` | birthCert / ssn / stateId / address / income / medical / veteran / njResidency / medicaid |
| `name` | Display name |
| `required` | yes / conditional |
| `prerequisites` | Array of doc IDs required before this |
| `cost` | String with fee + waiver info |
| `feeWaiverAvailable` | Boolean |
| `estimatedTime` | String |
| `difficulty` | Low / Medium / High |
| `onlineUrl` | URL |
| `phone` | Phone number |
| `officeLocations` | String |
| `programsUnlocked` | Array of program names |
| `specialNotes` | String |

**Key dependency chain** (critical for UI rendering):
```
birthCert → ssn → stateId → (all housing programs)
address: independent, but required alongside stateId for CoC intake
income: independent, zero-income self-cert is immediate + free
```

### 4.4 RESOURCE_DIRECTORY (35+ entries — NJ Resource Directory sheet)
Key resources to seed:

| Category | Name | Phone | Cost |
|---|---|---|---|
| NJ Emergency | NJ 211 | 211 | FREE |
| NJ Emergency | NJ DV Hotline | 1-800-572-7233 | FREE |
| NJ Emergency | Covenant House NJ | 973-621-8705 | FREE |
| NJ Emergency | NJ Veterans Homeless VA | 1-877-424-3838 | FREE |
| NJ Emergency | NJ PATH Program | 609-292-3092 | FREE |
| Birth Certificate | NJ Vital Records | 609-292-4087 | $25 (waiver available) |
| Social Security | NJ SSA – Newark | 877-405-4870 | FREE |
| Social Security | NJ SSA – Camden | 877-405-4876 | FREE |
| Social Security | NJ SSA – Trenton | 877-405-4875 | FREE |
| NJ MVC / State ID | NJ MVC – Newark | 609-292-6500 | $24 (waiver available) |
| NJ MVC / State ID | NJ MVC – Camden | 609-292-6500 | $24 (waiver available) |
| NJ Housing Programs | NJ DCA Housing | 609-292-4080 | Subsidized |
| NJ Housing Programs | NJ HMFA | 609-278-7400 | Subsidized |
| NJ Housing Programs | NJ HPP | 609-292-4080 | FREE |
| NJ Housing Programs | NJ Veterans Haven | 1-888-865-8387 | FREE |
| NJ Benefits | NJHelps.org | 1-800-792-9773 | FREE |
| NJ Benefits | NJ FamilyCare | 1-800-701-0710 | FREE |

---

## 5. Core Backend Functions to Implement

```typescript
// PRIMARY: Evaluate document status → return action plan
function evaluateDocumentStatus(
  docs: DocumentStatus,
  circumstance: SpecialCircumstance = 'none'
): ActionPlan {
  const key = buildComboKey(docs);               // e.g. "Y-N-N-Y-N"
  const baseResult = COMBO_MATRIX[key];
  if (circumstance !== 'none') {
    return applyScenarioOverlay(baseResult, SCENARIO_MATRIX[circumstance]);
  }
  return baseResult;
}

// Build lookup key from booleans
function buildComboKey(docs: DocumentStatus): string {
  return [
    docs.birthCert ? 'Y' : 'N',
    docs.ssn       ? 'Y' : 'N',
    docs.stateId   ? 'Y' : 'N',
    docs.address   ? 'Y' : 'N',
    docs.income    ? 'Y' : 'N',
  ].join('-');
}

// Overlay scenario-specific guidance on top of combo base
function applyScenarioOverlay(base: ActionPlan, scenario: Scenario): ActionPlan {
  return {
    ...base,
    scenarioId: scenario.id,
    priority: higherPriority(base.priority, scenario.priority),
    firstAction: scenario.firstAction,
    steps: scenario.steps,
    fastestPath: scenario.fastestPath,
    workarounds: scenario.workarounds,
    estimatedTime: scenario.estimatedTime,
  };
}

// Get all resources for a given document type
function getResourcesForDocument(docId: string): Resource[] {
  return RESOURCE_DIRECTORY.filter(r => r.category === docId || r.relatedDocs?.includes(docId));
}

// Get document details by ID
function getDocumentDetails(docId: string): Document {
  return DOCUMENT_CATALOG[docId];
}

// Get all programs currently accessible given current docs
function getProgramsAccessible(docs: DocumentStatus): string[] {
  const key = buildComboKey(docs);
  return COMBO_MATRIX[key].programsAccessible;
}
```

---

## 6. Priority Display Rules (UI Guidance)

| Priority | Color | Urgency Message |
|---|---|---|
| CRITICAL | Red 🔴 | "Urgent action needed today" |
| HIGH | Orange 🟠 | "Act within 48 hours" |
| MEDIUM | Yellow 🟡 | "Complete within 1–2 weeks" |
| LOW | Green 🟢 | "Ready to apply for housing" |

---

## 7. Key NJ Principles (Display as Tips in UI)
1. **Start at NJ 211** — Call or text 211. Gateway to all services.
2. **All fees can be waived** for homeless NJ residents — always request the waiver explicitly.
3. **Shelter address is valid** for all applications — NJ MVC accepts shelter letter.
4. **USPS General Delivery** at any NJ post office is a valid mailing address.
5. **Zero income is expected** — the self-certification form takes minutes.
6. **Parallel processing** — always start multiple document requests simultaneously.
7. **NJ has Medicaid expansion** — every uninsured NJ resident with zero income qualifies.

---

## 8. What Claude Code Should NOT Change
- The frontend UI/UX and intake form structure are already approved — do not redesign them.
- The 5 core document fields (`birthCert`, `ssn`, `stateId`, `address`, `income`) are fixed — they map directly to the intake form.
- All phone numbers, URLs, addresses, and program names must come from this spec — do not improvise or genericize NJ-specific content.

---

## 9. Suggested File Structure for Claude Code
```
/src
  /data
    comboMatrix.ts         ← Section 4.1 (32 combo lookup table)
    scenarioMatrix.ts      ← Section 4.2 (12 scenario overlays)
    documentCatalog.ts     ← Section 4.3 (document details)
    resourceDirectory.ts   ← Section 4.4 (agencies + contacts)
  /engine
    evaluateDocuments.ts   ← Section 5 (core decision logic)
    buildComboKey.ts
    applyScenario.ts
  /types
    index.ts               ← Section 2 (all TypeScript interfaces)
```

---

*Spec generated from: `NJ_Housing_Document_Guide_FINAL.xlsx` — all 9 sheets parsed and cross-referenced.*
*Last updated: March 2026*
