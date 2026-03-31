# Claude Code Fix V2 — Rich Multi-Step Intake Form
**Status:** Backend engine is correct and complete — DO NOT touch it.
**Problem:** The current `IntakeForm.tsx` is too minimal. It lost the multi-step wizard structure and collects far less info than the previous version.
**Fix:** Rebuild `IntakeForm.tsx` as a 5-step wizard that merges the old version's richness with the correct NJ document logic.

---

## WHAT NOT TO CHANGE

Do NOT touch any of these files — they are correct:
- `backend/src/engine/` — entire folder
- `backend/src/data/` — entire folder
- `backend/src/services/roadmapService.ts`
- `backend/src/services/clientService.ts`
- `backend/src/routes/clientRoutes.ts`
- `backend/src/models/Client.ts`
- `frontend/src/api/clientApi.ts`
- `frontend/src/components/Dashboard.tsx`
- `frontend/src/components/RoadmapDisplay.tsx`
- Any auth-related files

---

## CHANGE 1 — Add `additionalInfo` to the backend (small addition)

The backend currently stores: `name`, `dateOfBirth`, `currentShelterStatus`, `documentStatus`, `specialCircumstance`.

We need to also store the extra fields from the form (phone, email, dependents, duration homeless, barriers, health needs, notes). Add a single JSON column for all of it.

### 1a. `backend/src/db/index.ts`
Add `additionalInfo TEXT` to the `CREATE TABLE clients` statement. This stores a JSON blob of all supplementary fields. It is optional (DEFAULT `'{}'`).

```sql
additionalInfo TEXT NOT NULL DEFAULT '{}'
```

Delete `data/housing-readiness.db` after this change to reset the database.

### 1b. `backend/src/models/Client.ts`
Add one optional field:
```typescript
additionalInfo?: Record<string, unknown>;
```

### 1c. `backend/src/services/clientService.ts`
In `CreateClientPayload`, add:
```typescript
additionalInfo?: Record<string, unknown>;
```

In the `INSERT INTO clients` SQL and values array, add `additionalInfo`:
- Column: `additionalInfo`
- Value: `JSON.stringify(payload.additionalInfo ?? {})`

In `getClientForCaseManager`, parse it back:
```typescript
additionalInfo: typeof row.additionalInfo === "string"
  ? JSON.parse(row.additionalInfo)
  : {}
```

### 1d. `backend/src/routes/clientRoutes.ts`
In the POST handler, extract `additionalInfo` from `req.body` (no validation needed — just pass it through as-is):
```typescript
const { name, dateOfBirth, currentShelterStatus, documentStatus,
        specialCircumstance = "none", additionalInfo } = req.body ?? {};
```
Pass `additionalInfo` to `createClient(payload, userId)`.

### 1e. `frontend/src/api/clientApi.ts`
Add to `CreateClientPayload`:
```typescript
additionalInfo?: Record<string, unknown>;
```

---

## CHANGE 2 — Rewrite `IntakeForm.tsx` as a 5-step wizard

**File:** `frontend/src/components/IntakeForm.tsx`

Rewrite the entire component. Use local state to track `currentStep` (1–5). Show a progress bar at the top (like the old version had: step circles 1→2→3→4→5 with labels). Only show one step at a time. Back/Continue buttons navigate between steps. Submit only fires on Step 5.

### Full FormState:
```typescript
type FormState = {
  // Step 1 — Personal Info
  name: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  numberOfDependents: string;        // "0", "1", "2", "3", "4+"

  // Step 2 — Housing Situation
  currentShelterStatus: string;      // unsheltered / shelter / transitional / doubled_up
  durationHomeless: string;          // <1 month / 1–6 months / 6–12 months / 1–3 years / 3+ years
  housingGoal: string;               // rapid_rehousing / permanent_housing / transitional / shelter_stabilization
  specialCircumstance: string;       // none / reentry / dv_survivor / veteran / elderly / youth / undocumented / eviction

  // Step 3 — Document Checklist (feeds the engine)
  birthCert: boolean;
  ssn: boolean;
  stateId: boolean;
  address: boolean;
  income: boolean;

  // Step 4 — Barriers & Health
  hasPriorEviction: boolean;
  hasCriminalHistory: boolean;
  hasSubstanceUse: boolean;
  hasMentalHealth: boolean;
  hasDisability: boolean;
  hasMedicalDocs: boolean;           // has disability documentation

  // Step 5 — Notes
  notes: string;
};
```

### Initial state:
```typescript
const INITIAL_STATE: FormState = {
  name: "", dateOfBirth: "", phone: "", email: "", numberOfDependents: "0",
  currentShelterStatus: "", durationHomeless: "", housingGoal: "",
  specialCircumstance: "none",
  birthCert: false, ssn: false, stateId: false, address: false, income: false,
  hasPriorEviction: false, hasCriminalHistory: false, hasSubstanceUse: false,
  hasMentalHealth: false, hasDisability: false, hasMedicalDocs: false,
  notes: ""
};
```

---

### Step 1 — Personal Info

Fields:
- **Full Name** — text input, required
- **Date of Birth** — date input, optional (format hint: MM/DD/YYYY)
- **Phone Number** — text input, optional (placeholder: 555-000-0000)
- **Email Address** — email input, optional (placeholder: optional)
- **Number of Dependents** — select dropdown: 0 / 1 / 2 / 3 / 4+
  - Helper text: "Children or other dependents in the household"

Required for Continue: `name` must not be empty.

---

### Step 2 — Housing Situation

Fields:
- **Current Housing Situation** — select dropdown, required:
  - `unsheltered` → "Unsheltered (street, vehicle, encampment)"
  - `shelter` → "Emergency shelter"
  - `transitional` → "Transitional housing"
  - `doubled_up` → "Doubled up / couch-surfing"
  - `at_risk` → "Housed but at imminent risk of eviction"

- **How long has the client been homeless?** — select dropdown:
  - `less_1_month` → "Less than 1 month"
  - `1_6_months` → "1–6 months"
  - `6_12_months` → "6–12 months"
  - `1_3_years` → "1–3 years"
  - `3_plus_years` → "3+ years (chronic)"

- **Housing Goal** — select dropdown, required:
  - `rapid_rehousing` → "Rapid Rehousing (fastest path to permanent housing)"
  - `permanent_housing` → "Permanent Supportive Housing (with long-term services)"
  - `transitional` → "Transitional housing (step-up program)"
  - `shelter_stabilization` → "Shelter stabilization (immediate safety first)"

- **Special Circumstances** — select dropdown (single-select, shown with a clear label: "Does the client have a special circumstance?"):
  - `none` → "None / General situation"
  - `reentry` → "Recently released from prison or jail"
  - `dv_survivor` → "Domestic violence survivor"
  - `veteran` → "Homeless veteran"
  - `elderly` → "Senior (65+) or limited mobility"
  - `youth` → "Youth under 25 / aging out of foster care"
  - `undocumented` → "Undocumented / no federal ID eligibility"
  - `eviction` → "Facing imminent eviction (has housing, needs to stay)"

Required for Continue: `currentShelterStatus` and `housingGoal` must not be empty.

---

### Step 3 — Document Checklist

Header text: *"Check each document the client currently has in hand."*
Sub-header text: *"These 5 documents determine the client's housing eligibility path."*

Render each as a card-style checkbox row (green border + light green background when checked, gray border when unchecked):

```
[ ] Birth Certificate
    "The foundational document. Must be obtained before applying for SSN card.
     NJ Vital Records: nj.gov/health/vital | 609-292-4087 | $25 (fee waiver available)"

[ ] Social Security Card / SSN
    "Required for NJ State ID, Medicaid, SNAP, Section 8, and all employment.
     Free replacement at any NJ SSA office. Call 1-800-772-1213."

[ ] NJ State ID or Driver's License
    "Primary photo ID. Unlocks housing applications, banking, and benefits enrollment.
     NJ MVC: telegov.njportal.com/njmvc | $24 (free with homeless waiver)"

[ ] Proof of NJ Address / Homeless Verification Letter
    "Shelter letter OR utility bill OR bank statement. NJ MVC accepts shelter letter.
     Request from shelter staff today — same-day possible. NJ PATH: 609-292-3092"

[ ] Income Proof or Zero-Income Self-Certification
    "Pay stubs, SSA award letter, or signed zero-income form (takes minutes, free).
     Zero income is common and expected at housing agencies."
```

No required fields — the case manager checks whatever the client has (none checked = all missing = CRITICAL priority).

Add a live summary below the checklist:
```
Documents confirmed: X of 5
[Show a colored status pill based on count:
  0–1 → 🔴 Critical — urgent action needed
  2   → 🟠 High — act within 48 hours
  3–4 → 🟡 Medium — act within 1–2 weeks
  5   → 🟢 Low — ready to apply for housing]
```

---

### Step 4 — Barriers & Health

Header text: *"Check all that apply to help the shelter manager provide complete support."*

**Sub-section: Identity & Financial**
- [ ] Has an active bank account
  - Helper: "Needed for benefit disbursements and rental payments"

**Sub-section: Housing Barriers**
- [ ] Has prior eviction(s) on record
  - Helper: "May restrict access to some housing programs — workarounds available"
- [ ] Has criminal history that may affect housing eligibility
  - Helper: "NJ has 'ban the box' protections — reentry programs available"

**Sub-section: Health & Support Needs**
- [ ] Has substance use history requiring support services
- [ ] Has mental health needs requiring professional support
- [ ] Has a documented disability (physical or developmental)
  - Helper: "If yes, medical documentation may unlock Section 811 and CoC PSH priority"
- [ ] Has disability documentation (medical records, SSA letter, FQHC evaluation)
  - Helper: "Required for Section 811 and CoC Permanent Supportive Housing applications"

No required fields on this step.

---

### Step 5 — Notes & Submit

- **Case Manager Notes** — textarea (rows: 4)
  - Placeholder: "Any additional context, observations, or follow-up reminders for this client..."
  - Label: "Case Manager Notes (optional)"

- Below the textarea, show a **Summary Card** before the submit button:
  ```
  Ready to generate roadmap for: [client name]
  Documents confirmed: [X of 5]
  Priority: [🔴 CRITICAL / 🟠 HIGH / 🟡 MEDIUM / 🟢 LOW]
  Special circumstance: [label or "None"]
  ```

- Submit button: **"Generate Housing Roadmap →"**

---

### Payload construction on submit:

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
  additionalInfo: {
    phone: form.phone,
    email: form.email,
    numberOfDependents: form.numberOfDependents,
    durationHomeless: form.durationHomeless,
    housingGoal: form.housingGoal,
    hasPriorEviction: form.hasPriorEviction,
    hasCriminalHistory: form.hasCriminalHistory,
    hasSubstanceUse: form.hasSubstanceUse,
    hasMentalHealth: form.hasMentalHealth,
    hasDisability: form.hasDisability,
    hasMedicalDocs: form.hasMedicalDocs,
    notes: form.notes,
  }
};
```

After successful creation, navigate to `/roadmap/${result.id}`.

---

### Progress bar (top of form):

Render a horizontal step indicator with 5 nodes. Completed steps show a checkmark (✓). Current step is highlighted. Future steps are grayed out.

Labels: `Personal Info` → `Housing Situation` → `Documents` → `Barriers & Health` → `Notes & Submit`

Use the same dark-blue color scheme as the existing app (`#1e3a5f` or whatever the app's primary color is from `theme.css`).

---

### Validation per step:

| Step | Required | Error shown on |
|---|---|---|
| 1 | `name` not empty | Continue click |
| 2 | `currentShelterStatus` and `housingGoal` not empty | Continue click |
| 3 | None | — |
| 4 | None | — |
| 5 | None | Submit click |

---

## EXECUTION ORDER

1. `backend/src/db/index.ts` — add `additionalInfo` column, delete `data/housing-readiness.db`
2. `backend/src/models/Client.ts` — add `additionalInfo?` field
3. `backend/src/services/clientService.ts` — add `additionalInfo` to payload, INSERT, and GET
4. `backend/src/routes/clientRoutes.ts` — extract and pass `additionalInfo`
5. `frontend/src/api/clientApi.ts` — add `additionalInfo?` to `CreateClientPayload`
6. `frontend/src/components/IntakeForm.tsx` — full rewrite (the main work)

---

## WHAT THE RESULT SHOULD LOOK LIKE

After these changes, the intake flow is:

**Step 1** → collects who the client is (name, contact, dependents)
**Step 2** → collects how they're currently housed, how long, their goal, any special circumstances
**Step 3** → the 5 NJ document checkboxes that drive the engine (with inline resource hints)
**Step 4** → barriers and health context for the case manager
**Step 5** → notes + summary preview → submit

The roadmap generated is driven 100% by the `documentStatus` + `specialCircumstance` from steps 3 and 2 — the same engine that was already correctly built. The extra fields from steps 1, 4, and 5 are stored in `additionalInfo` for the case manager's reference.

---

*Audit completed March 2026 — V2 supersedes CLAUDE_CODE_FIX_INSTRUCTIONS.md*
