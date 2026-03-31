# Claude Code Fix Instructions — Shelter Intake App
**VERDICT: CONDITIONAL GO ⚠️**

The backend engine is correctly built and complete. The 32-combo matrix, 12 scenarios, document catalog, and `evaluateDocumentStatus()` are all functional. **The problem is that the engine is completely disconnected from the user flow.** The intake form collects the wrong data, and `roadmapService.ts` never calls the engine — it uses its own separate hardcoded logic instead.

This document defines exactly what needs to change. Follow these instructions in order.

---

## THE CORE PROBLEM (read this first)

The app has two parallel systems that never talk to each other:

**System A (the engine — correct and complete):**
- `backend/src/engine/evaluateDocuments.ts` — takes 5 boolean doc flags + special circumstance → returns an `ActionPlan`
- `backend/src/data/comboMatrix.ts` — 32 NJ-specific action plans
- `backend/src/data/scenarioMatrix.ts` — 12 special circumstance overlays

**System B (the actual user flow — wrong and disconnected):**
- `IntakeForm.tsx` — collects `readinessStatus` (abstract stage), `riskFactors` (free text), `incomeSources` (free text)
- `roadmapService.ts` — builds steps from those fields using its own hardcoded logic, never calling the engine
- `Client` model — stores `riskFactors`, `incomeSources`, `readinessStatus`, NOT `documentStatus` or `specialCircumstance`

**Fix: Wire System A into the user flow. Replace System B's data model and form with the engine's input.**

---

## CHANGE 1 — Update the Client model (backend)

**File:** `backend/src/models/Client.ts`

Replace the entire interface with:

```typescript
import { DocumentStatus, SpecialCircumstance } from "../types/index";

export interface Client {
  id: string;
  name: string;
  dateOfBirth?: string;
  currentShelterStatus: string;
  documentStatus: DocumentStatus;            // NEW — the 5 boolean flags
  specialCircumstance: SpecialCircumstance;  // NEW — replaces riskFactors
  caseManagerId: string;
  createdAt: string;
  updatedAt: string;
}
```

Remove `readinessStatus`, `riskFactors`, and `incomeSources` from the Client model entirely. They are no longer needed — `priority` is derived by the engine from `documentStatus`.

---

## CHANGE 2 — Update the database schema (backend)

**File:** `backend/src/db/index.ts`

Find the `CREATE TABLE clients` statement and update it:

- **Remove columns:** `readinessStatus`, `riskFactors`, `incomeSources`
- **Add columns:**
  - `documentStatus TEXT NOT NULL` — store as JSON string (use `JSON.stringify()` on write, `JSON.parse()` on read)
  - `specialCircumstance TEXT NOT NULL DEFAULT 'none'`

Also add a migration or drop-and-recreate if in dev mode.

---

## CHANGE 3 — Update the client service (backend)

**File:** `backend/src/services/clientService.ts`

Update `CreateClientPayload` to:

```typescript
import { DocumentStatus, SpecialCircumstance } from "../types/index";

export interface CreateClientPayload {
  name: string;
  dateOfBirth?: string;
  currentShelterStatus: string;
  documentStatus: DocumentStatus;
  specialCircumstance: SpecialCircumstance;
}
```

When inserting into the database, serialize `documentStatus` as `JSON.stringify(payload.documentStatus)`.
When reading from the database, deserialize with `JSON.parse(row.documentStatus)`.

---

## CHANGE 4 — Update the client route validation (backend)

**File:** `backend/src/routes/clientRoutes.ts`

In the POST `/api/clients` handler:

- **Remove** validation for `readinessStatus`, `riskFactors`, `incomeSources`
- **Add** validation for `documentStatus` (must be an object with 5 boolean keys: `birthCert`, `ssn`, `stateId`, `address`, `income`)
- **Add** validation for `specialCircumstance` (must be one of: `'none' | 'reentry' | 'dv_survivor' | 'veteran' | 'elderly' | 'youth' | 'undocumented' | 'eviction'`)

Required fields for the POST body: `name`, `currentShelterStatus`, `documentStatus`
Optional fields: `dateOfBirth`, `specialCircumstance` (default to `'none'` if not provided)

---

## CHANGE 5 — Replace roadmapService logic (backend)

**File:** `backend/src/services/roadmapService.ts`

This is the most critical change. Replace the `buildStepsForClient()` function with a call to the engine.

**Delete** the entire `buildStepsForClient()` function (lines 29–166).

**Replace it** with:

```typescript
import { evaluateDocumentStatus } from "../engine/evaluateDocuments";
import { SpecialCircumstance } from "../types/index";

const buildStepsForClient = (client: Client): GeneratedStepInput[] => {
  const plan = evaluateDocumentStatus(
    client.documentStatus,
    client.specialCircumstance as SpecialCircumstance
  );

  const steps: GeneratedStepInput[] = [];

  // Step 1: Priority / First Action (always first)
  steps.push({
    stage: "immediate_action",
    title: `🔴 Priority: ${plan.priority} — Do This First`,
    description: plan.firstAction,
    status: "not_started",
  });

  // Steps 2–N: Full action sequence
  plan.steps.forEach((stepText, i) => {
    steps.push({
      stage: "action_sequence",
      title: `Step ${i + 1}`,
      description: stepText,
      status: "not_started",
    });
  });

  // Fastest path summary
  steps.push({
    stage: "fastest_path",
    title: "⚡ Fastest Path to Housing-Ready",
    description: plan.fastestPath,
    status: "not_started",
  });

  // Emergency workarounds (if any)
  if (plan.workarounds.length > 0) {
    steps.push({
      stage: "workarounds",
      title: "🔧 Emergency Workarounds",
      description: plan.workarounds.join(" | "),
      status: "not_started",
    });
  }

  // Programs accessible now
  if (plan.programsAccessible.length > 0) {
    steps.push({
      stage: "programs",
      title: "✅ Programs You Can Access Right Now",
      description: plan.programsAccessible.join(", "),
      status: "not_started",
    });
  }

  // Resources (key contacts)
  plan.resources.slice(0, 5).forEach((resource) => {
    steps.push({
      stage: "resources",
      title: resource.name,
      description: `${resource.description} | ${resource.phone} | ${resource.cost} | ${resource.coverageArea}`,
      status: "not_started",
    });
  });

  return steps;
};
```

Also update the `Client` import at the top of this file to use the updated `Client` interface.

---

## CHANGE 6 — Rewrite the IntakeForm (frontend)

**File:** `frontend/src/components/IntakeForm.tsx`

This is the biggest visible change. Rewrite the form to collect the correct data.

### New FormState:
```typescript
type FormState = {
  name: string;
  dateOfBirth: string;
  currentShelterStatus: string;
  // Document checklist — 5 YES/NO questions
  birthCert: boolean;
  ssn: boolean;
  stateId: boolean;
  address: boolean;
  income: boolean;
  // Special circumstance — single select
  specialCircumstance: string;
};
```

### New INITIAL_STATE:
```typescript
const INITIAL_STATE: FormState = {
  name: "",
  dateOfBirth: "",
  currentShelterStatus: "",
  birthCert: false,
  ssn: false,
  stateId: false,
  address: false,
  income: false,
  specialCircumstance: "none",
};
```

### Form sections to implement:

**SECTION 1 — Basic Information** (unchanged)
- Client name (text input, required)
- Date of birth (date input, optional)

**SECTION 2 — Current Shelter Status** (existing dropdown, keep as-is)
- Options: Unsheltered / Emergency shelter / Transitional housing / Doubled up

**SECTION 3 — Document Checklist** (NEW — replaces the riskFactors and incomeSources textareas)

Replace both textareas with 5 toggle buttons or YES/NO radio button pairs, one per document. Present them as a card-style checklist. Each item has a label and a short explanation:

```
[ ] Birth Certificate
    "The foundational document. Required before getting an SSN card."

[ ] Social Security Card / SSN
    "Required for NJ State ID, Medicaid, SNAP, Section 8, and employment."

[ ] NJ State ID or Driver's License
    "Your primary photo ID. Unlocks housing applications, bank accounts, and benefits."

[ ] Proof of NJ Address / Homeless Verification Letter
    "Shelter letter OR utility bill OR bank statement."

[ ] Income Proof or Zero-Income Self-Certification
    "Pay stubs, benefit award letter, or a signed zero-income form (takes minutes)."
```

Use checkboxes or toggle switches — checked = YES (has it), unchecked = NO (missing).

**SECTION 4 — Special Circumstances** (NEW — single-select, replaces readinessStatus)

A single `<select>` dropdown with these options:

```
None / General situation  (value: "none")
Recently released from prison/jail  (value: "reentry")
Domestic violence survivor  (value: "dv_survivor")
Homeless veteran  (value: "veteran")
Senior (65+) or limited mobility  (value: "elderly")
Youth under 25 / aging out of foster care  (value: "youth")
Undocumented / no federal ID  (value: "undocumented")
Facing imminent eviction  (value: "eviction")
```

### Updated payload:
```typescript
const payload: CreateClientPayload = {
  name: form.name,
  dateOfBirth: form.dateOfBirth || undefined,
  currentShelterStatus: form.currentShelterStatus,
  documentStatus: {
    birthCert: form.birthCert,
    ssn: form.ssn,
    stateId: form.stateId,
    address: form.address,
    income: form.income,
  },
  specialCircumstance: form.specialCircumstance as SpecialCircumstance,
};
```

---

## CHANGE 7 — Update API types (frontend)

**File:** `frontend/src/api/clientApi.ts`

Replace `CreateClientPayload` with:

```typescript
export type DocumentStatus = {
  birthCert: boolean;
  ssn: boolean;
  stateId: boolean;
  address: boolean;
  income: boolean;
};

export type SpecialCircumstance =
  | 'none'
  | 'reentry'
  | 'dv_survivor'
  | 'veteran'
  | 'elderly'
  | 'youth'
  | 'undocumented'
  | 'eviction';

export type CreateClientPayload = {
  name: string;
  dateOfBirth?: string;
  currentShelterStatus: string;
  documentStatus: DocumentStatus;
  specialCircumstance: SpecialCircumstance;
};
```

Also update `ClientSummary` — remove `readinessStatus`, add `priority` (the engine returns this):

```typescript
export type ClientSummary = {
  id: string;
  name: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';  // from engine
  createdAt: string;
};
```

---

## CHANGE 8 — Update the Dashboard display (frontend)

**File:** `frontend/src/components/Dashboard.tsx`

In the client table, replace the `Readiness` column with a `Priority` column that shows a colored badge:
- `CRITICAL` → red badge 🔴
- `HIGH` → orange badge 🟠
- `MEDIUM` → yellow badge 🟡
- `LOW` → green badge 🟢

---

## CHANGE 9 — Enhance the RoadmapDisplay (frontend)

**File:** `frontend/src/components/RoadmapDisplay.tsx`

Update the stage display labels to be human-readable:

```typescript
const stageLabels: Record<string, string> = {
  immediate_action: "🚨 Immediate Action",
  action_sequence: "📋 Your Step-by-Step Plan",
  fastest_path: "⚡ Fastest Path to Housing-Ready",
  workarounds: "🔧 Emergency Workarounds",
  programs: "✅ Programs Accessible Now",
  resources: "📞 Key NJ Contacts",
};
```

For the `immediate_action` stage, render the description text in a highlighted banner style (not a plain list item).

---

## REQUIRED FIELDS SUMMARY

After these changes, the required fields across the stack are:

| Field | Type | Where collected |
|---|---|---|
| `name` | string | IntakeForm — text input |
| `currentShelterStatus` | string | IntakeForm — dropdown |
| `documentStatus.birthCert` | boolean | IntakeForm — checkbox |
| `documentStatus.ssn` | boolean | IntakeForm — checkbox |
| `documentStatus.stateId` | boolean | IntakeForm — checkbox |
| `documentStatus.address` | boolean | IntakeForm — checkbox |
| `documentStatus.income` | boolean | IntakeForm — checkbox |
| `specialCircumstance` | string | IntakeForm — dropdown |
| `dateOfBirth` | string (optional) | IntakeForm — date input |

---

## WHAT NOT TO CHANGE

- Do NOT change the existing routes structure (`/intake`, `/roadmap/:id`, `/dashboard`)
- Do NOT change the authentication flow
- Do NOT change `LoginForm.tsx` or `AuthContext.tsx`
- Do NOT change the visual styling / CSS — just update the form fields
- The engine files (`evaluateDocuments.ts`, `comboMatrix.ts`, `scenarioMatrix.ts`) are correct — do NOT modify them

---

## EXECUTION ORDER

Run these changes in this exact order to avoid breaking the build:

1. `backend/src/types/index.ts` — no changes needed, already correct
2. `backend/src/models/Client.ts` — update interface
3. `backend/src/db/index.ts` — update schema, delete `data/housing-readiness.db` to reset
4. `backend/src/services/clientService.ts` — update payload type and DB serialization
5. `backend/src/routes/clientRoutes.ts` — update validation
6. `backend/src/services/roadmapService.ts` — replace buildStepsForClient
7. `frontend/src/api/clientApi.ts` — update types
8. `frontend/src/components/IntakeForm.tsx` — rewrite form
9. `frontend/src/components/Dashboard.tsx` — update priority column
10. `frontend/src/components/RoadmapDisplay.tsx` — update stage labels

---

*Generated by shelter-app-auditor after full code review — March 2026*
