import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  CreateClientPayload,
  SpecialCircumstance,
  createClient
} from "../api/clientApi";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  // Step 1 — Personal Info
  name: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  numberOfDependents: string;

  // Step 2 — Housing Situation
  currentShelterStatus: string;
  durationHomeless: string;
  housingGoal: string;
  specialCircumstance: string;

  // Step 3 — Document Checklist
  birthCert: boolean;
  ssn: boolean;
  stateId: boolean;
  address: boolean;
  income: boolean;

  // Step 4 — Barriers & Health
  hasBankAccount: boolean;
  hasPriorEviction: boolean;
  hasCriminalHistory: boolean;
  hasSubstanceUse: boolean;
  hasMentalHealth: boolean;
  hasDisability: boolean;
  hasMedicalDocs: boolean;

  // Step 5 — Notes
  notes: string;
};

const INITIAL_STATE: FormState = {
  name: "", dateOfBirth: "", phone: "", email: "", numberOfDependents: "0",
  currentShelterStatus: "", durationHomeless: "", housingGoal: "",
  specialCircumstance: "none",
  birthCert: false, ssn: false, stateId: false, address: false, income: false,
  hasBankAccount: false, hasPriorEviction: false, hasCriminalHistory: false,
  hasSubstanceUse: false, hasMentalHealth: false, hasDisability: false,
  hasMedicalDocs: false,
  notes: ""
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS = [
  "Personal Info",
  "Housing Situation",
  "Documents",
  "Barriers & Health",
  "Notes & Submit"
];

const SHELTER_OPTIONS = [
  { value: "unsheltered",  label: "Unsheltered (street, vehicle, encampment)" },
  { value: "shelter",      label: "Emergency shelter" },
  { value: "transitional", label: "Transitional housing" },
  { value: "doubled_up",   label: "Doubled up / couch-surfing" },
  { value: "at_risk",      label: "Housed but at imminent risk of eviction" }
];

const DURATION_OPTIONS = [
  { value: "less_1_month", label: "Less than 1 month" },
  { value: "1_6_months",   label: "1–6 months" },
  { value: "6_12_months",  label: "6–12 months" },
  { value: "1_3_years",    label: "1–3 years" },
  { value: "3_plus_years", label: "3+ years (chronic)" }
];

const GOAL_OPTIONS = [
  { value: "rapid_rehousing",       label: "Rapid Rehousing (fastest path to permanent housing)" },
  { value: "permanent_housing",     label: "Permanent Supportive Housing (with long-term services)" },
  { value: "transitional",          label: "Transitional housing (step-up program)" },
  { value: "shelter_stabilization", label: "Shelter stabilization (immediate safety first)" }
];

const CIRCUMSTANCE_OPTIONS = [
  { value: "none",         label: "None / General situation" },
  { value: "reentry",      label: "Recently released from prison or jail" },
  { value: "dv_survivor",  label: "Domestic violence survivor" },
  { value: "veteran",      label: "Homeless veteran" },
  { value: "elderly",      label: "Senior (65+) or limited mobility" },
  { value: "youth",        label: "Youth under 25 / aging out of foster care" },
  { value: "undocumented", label: "Undocumented / no federal ID eligibility" },
  { value: "eviction",     label: "Facing imminent eviction (has housing, needs to stay)" }
];

const DOC_ITEMS: {
  key: "birthCert" | "ssn" | "stateId" | "address" | "income";
  label: string;
  hint: string;
}[] = [
  {
    key: "birthCert",
    label: "Birth Certificate",
    hint: "The foundational document. Must be obtained before applying for SSN card.\nNJ Vital Records: nj.gov/health/vital | 609-292-4087 | $25 (fee waiver available)"
  },
  {
    key: "ssn",
    label: "Social Security Card / SSN",
    hint: "Required for NJ State ID, Medicaid, SNAP, Section 8, and all employment.\nFree replacement at any NJ SSA office. Call 1-800-772-1213."
  },
  {
    key: "stateId",
    label: "NJ State ID or Driver's License",
    hint: "Primary photo ID. Unlocks housing applications, banking, and benefits enrollment.\nNJ MVC: telegov.njportal.com/njmvc | $24 (free with homeless waiver)"
  },
  {
    key: "address",
    label: "Proof of NJ Address / Homeless Verification Letter",
    hint: "Shelter letter OR utility bill OR bank statement. NJ MVC accepts shelter letter.\nRequest from shelter staff today — same-day possible. NJ PATH: 609-292-3092"
  },
  {
    key: "income",
    label: "Income Proof or Zero-Income Self-Certification",
    hint: "Pay stubs, SSA award letter, or signed zero-income form (takes minutes, free).\nZero income is common and expected at housing agencies."
  }
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

const derivePriority = (form: FormState): Priority => {
  const count = [form.birthCert, form.ssn, form.stateId, form.address, form.income].filter(Boolean).length;
  if (count <= 1) return "CRITICAL";
  if (count <= 2) return "HIGH";
  if (count <= 4) return "MEDIUM";
  return "LOW";
};

const PRIORITY_DISPLAY: Record<Priority, { emoji: string; label: string; color: string }> = {
  CRITICAL: { emoji: "🔴", label: "Critical — urgent action needed",  color: "#ef4444" },
  HIGH:     { emoji: "🟠", label: "High — act within 48 hours",       color: "#f97316" },
  MEDIUM:   { emoji: "🟡", label: "Medium — act within 1–2 weeks",    color: "#eab308" },
  LOW:      { emoji: "🟢", label: "Low — ready to apply for housing", color: "#22c55e" }
};

const circumstanceLabel = (value: string): string =>
  CIRCUMSTANCE_OPTIONS.find((o) => o.value === value)?.label ?? "None";

// ─── Sub-components ───────────────────────────────────────────────────────────

// Card wrapper for Step 1 fields — highlights border on focus-within
const FieldCard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        border: `1.5px solid ${focused ? "#1A7FD4" : "#DDEAF7"}`,
        borderRadius: "0.75rem",
        backgroundColor: "#FFFFFF",
        padding: "1.5rem",
        marginBottom: "0.875rem",
        transition: "border-color 0.15s ease",
      }}
    >
      {children}
    </div>
  );
};

const ProgressBar: React.FC<{ step: number }> = ({ step }) => {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative"
      }}>
        {/* Connecting line */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "1.25rem",
          right: "1.25rem",
          height: "2px",
          backgroundColor: "#DDEAF7",
          transform: "translateY(-50%)",
          zIndex: 0
        }} />
        {/* Progress fill */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "1.25rem",
          width: `calc(${((step - 1) / 4) * 100}% - ${((step - 1) / 4) * 2.5}rem)`,
          height: "2px",
          backgroundColor: "#1A7FD4",
          transform: "translateY(-50%)",
          zIndex: 0,
          transition: "width 0.3s ease"
        }} />
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const done = stepNum < step;
          const active = stepNum === step;
          return (
            <div key={stepNum} style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.4rem",
              zIndex: 1,
              flex: 1
            }}>
              <div style={{
                width: "2rem",
                height: "2rem",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: 700,
                border: `2px solid ${done || active ? "#1A7FD4" : "#DDEAF7"}`,
                backgroundColor: done ? "#1A7FD4" : active ? "#FFFFFF" : "#F4F9FF",
                color: done ? "#FFFFFF" : active ? "#1A7FD4" : "#6B8BAE",
                transition: "all 0.2s"
              }}>
                {done ? "✓" : stepNum}
              </div>
              <span style={{
                fontSize: "0.65rem",
                color: active ? "#1A7FD4" : done ? "#1A7FD4" : "#6B8BAE",
                textAlign: "center",
                lineHeight: 1.2,
                maxWidth: "4.5rem"
              }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const IntakeForm: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const set = (field: keyof FormState, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleText = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    set(e.target.name as keyof FormState, e.target.value);
  };

  const handleCheck = (field: keyof FormState) => {
    setForm((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  // ── Navigation ────────────────────────────────────────────────────────────

  const validateStep = (): string | null => {
    if (step === 1 && !form.name.trim()) return "Individual name is required to continue.";
    if (step === 2) {
      if (!form.currentShelterStatus) return "Please select a current housing situation.";
      if (!form.housingGoal) return "Please select a housing goal.";
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep();
    if (err) { setStepError(err); return; }
    setStepError(null);
    setStep((s) => s + 1);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    setStepError(null);
    setStep((s) => s - 1);
    window.scrollTo(0, 0);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!token) {
      setSubmitError("Your session has expired. Please sign in again.");
      return;
    }

    setIsSubmitting(true);

    const payload: CreateClientPayload = {
      name: form.name,
      dateOfBirth: form.dateOfBirth || undefined,
      currentShelterStatus: form.currentShelterStatus,
      documentStatus: {
        birthCert: form.birthCert,
        ssn: form.ssn,
        stateId: form.stateId,
        address: form.address,
        income: form.income
      },
      specialCircumstance: form.specialCircumstance as SpecialCircumstance,
      additionalInfo: {
        phone: form.phone,
        email: form.email,
        numberOfDependents: form.numberOfDependents,
        durationHomeless: form.durationHomeless,
        housingGoal: form.housingGoal,
        hasBankAccount: form.hasBankAccount,
        hasPriorEviction: form.hasPriorEviction,
        hasCriminalHistory: form.hasCriminalHistory,
        hasSubstanceUse: form.hasSubstanceUse,
        hasMentalHealth: form.hasMentalHealth,
        hasDisability: form.hasDisability,
        hasMedicalDocs: form.hasMedicalDocs,
        notes: form.notes
      }
    };

    try {
      const result = await createClient(token, payload);
      navigate(`/roadmap/${encodeURIComponent(result.id)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save intake right now.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const docCount = [form.birthCert, form.ssn, form.stateId, form.address, form.income].filter(Boolean).length;
  const priority = derivePriority(form);
  const priorityDisplay = PRIORITY_DISPLAY[priority];

  // ─── Render steps ─────────────────────────────────────────────────────────

  const renderStep1 = () => {
    const labelStyle: React.CSSProperties = {
      display: "block",
      fontSize: "0.95rem",
      fontWeight: 600,
      color: "#0D1F3C",
      marginBottom: "0.2rem",
    };
    const helperStyle: React.CSSProperties = {
      fontSize: "0.8rem",
      color: "#6B8BAE",
      margin: "0.2rem 0 0.75rem",
    };
    const inputStyle: React.CSSProperties = {
      width: "100%",
      padding: "0.65rem 0.75rem",
      borderRadius: "0.375rem",
      border: "1px solid #DDEAF7",
      backgroundColor: "#F4F9FF",
      color: "#0D1F3C",
      fontSize: "0.95rem",
      boxSizing: "border-box",
      outline: "none",
    };

    return (
      <div>
        <h3 style={{ margin: "0 0 1.25rem", fontWeight: 700, color: "#0D1F3C" }}>Personal Information</h3>

        <FieldCard>
          <label htmlFor="name" style={labelStyle}>
            Full Name <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <p style={helperStyle}>First and last name of the individual</p>
          <input id="name" name="name" type="text" value={form.name} onChange={handleText}
            placeholder="Individual's full name" autoComplete="off" style={inputStyle} />
        </FieldCard>

        <FieldCard>
          <label htmlFor="dateOfBirth" style={labelStyle}>Date of Birth</label>
          <p style={helperStyle}>Used to verify identity for housing applications</p>
          <input id="dateOfBirth" name="dateOfBirth" type="date" value={form.dateOfBirth}
            onChange={handleText} style={inputStyle} />
        </FieldCard>

        <FieldCard>
          <label htmlFor="phone" style={labelStyle}>Phone Number</label>
          <p style={helperStyle}>Best number to reach the individual</p>
          <input id="phone" name="phone" type="text" value={form.phone} onChange={handleText}
            placeholder="555-000-0000" style={inputStyle} />
        </FieldCard>

        <FieldCard>
          <label htmlFor="email" style={labelStyle}>Email Address</label>
          <p style={helperStyle}>Optional — for document delivery</p>
          <input id="email" name="email" type="email" value={form.email} onChange={handleText}
            placeholder="optional" style={inputStyle} />
        </FieldCard>

        <FieldCard>
          <label style={labelStyle}>Number of Dependents</label>
          <p style={helperStyle}>Children or other household members</p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {["0", "1", "2", "3", "4+"].map((v) => {
              const isSelected = form.numberOfDependents === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => set("numberOfDependents", v)}
                  style={{
                    minWidth: "3rem",
                    padding: "0.5rem 0.5rem",
                    borderRadius: "999px",
                    border: `1.5px solid ${isSelected ? "#1A7FD4" : "#DDEAF7"}`,
                    backgroundColor: isSelected ? "#1A7FD4" : "transparent",
                    color: isSelected ? "#ffffff" : "#6B8BAE",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </FieldCard>
      </div>
    );
  };

  const renderStep2 = () => {
    const renderGroup = (
      question: string,
      helper: string,
      field: "currentShelterStatus" | "durationHomeless" | "housingGoal" | "specialCircumstance",
      options: { value: string; label: string }[],
      required: boolean,
      deselectedValue = ""
    ) => (
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0D1F3C", margin: "0 0 0.3rem" }}>
          {question}{required && <span style={{ color: "#ef4444" }}> *</span>}
        </p>
        <p style={{ fontSize: "0.82rem", color: "#6B8BAE", margin: "0 0 1rem" }}>{helper}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {options.map(({ value, label }) => {
            const isSelected = form[field] === value;
            return (
              <div
                key={value}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => {
                  if (required) set(field, value);
                  else set(field, isSelected ? deselectedValue : value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    if (required) set(field, value);
                    else set(field, isSelected ? deselectedValue : value);
                  }
                }}
                style={{
                  padding: "1rem 1.25rem",
                  border: `2px solid ${isSelected ? "#1A7FD4" : "#DDEAF7"}`,
                  borderRadius: "0.625rem",
                  backgroundColor: isSelected ? "#EBF5FF" : "#FFFFFF",
                  cursor: "pointer",
                  transition: "border-color 0.15s, background 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  userSelect: "none",
                }}
              >
                {/* Radio circle */}
                <div style={{
                  width: "1.1rem",
                  height: "1.1rem",
                  borderRadius: "50%",
                  border: `2px solid ${isSelected ? "#1A7FD4" : "#DDEAF7"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {isSelected && (
                    <div style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", backgroundColor: "#1A7FD4" }} />
                  )}
                </div>
                <span style={{ fontSize: "0.92rem", fontWeight: 500, color: "#0D1F3C" }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );

    const durationOptions = [...DURATION_OPTIONS, { value: "", label: "Prefer not to say" }];

    return (
      <div>
        <h3 style={{ margin: "0 0 1.5rem", fontWeight: 700, color: "#0D1F3C" }}>Housing Situation</h3>

        {renderGroup(
          "What is the individual's current housing situation?",
          "Select the option that best describes where they are sleeping right now",
          "currentShelterStatus",
          SHELTER_OPTIONS,
          true
        )}

        {renderGroup(
          "How long has the individual been without stable housing?",
          "Include time in shelters, couch-surfing, or the street",
          "durationHomeless",
          durationOptions,
          false,
          ""
        )}

        {renderGroup(
          "What is the individual's primary housing goal?",
          "This shapes the roadmap priority and service matches",
          "housingGoal",
          GOAL_OPTIONS,
          true
        )}

        {renderGroup(
          "Does the individual have a special circumstance?",
          "Unlocks targeted resources and program pathways",
          "specialCircumstance",
          CIRCUMSTANCE_OPTIONS,
          false,
          "none"
        )}
      </div>
    );
  };

  const renderStep3 = () => (
    <div>
      <div style={{ marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0, fontWeight: 700, color: "#0D1F3C" }}>Document Checklist</h3>
        <p style={{ margin: "0.4rem 0 0", color: "#6B8BAE", fontSize: "0.875rem" }}>
          Check each document the individual currently has in hand.
        </p>
        <p style={{ margin: "0.2rem 0 0", color: "#6B8BAE", fontSize: "0.8rem" }}>
          These 5 documents determine the individual's housing eligibility path.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {DOC_ITEMS.map(({ key, label, hint }) => (
          <label key={key} style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            padding: "0.85rem 1rem",
            border: `2px solid ${form[key] ? "#16a34a" : "#DDEAF7"}`,
            borderRadius: "0.5rem",
            backgroundColor: form[key] ? "#EAF7F2" : "#FFFFFF",
            cursor: "pointer",
            transition: "border-color 0.15s, background 0.15s"
          }}>
            <input
              type="checkbox"
              checked={form[key]}
              onChange={() => handleCheck(key)}
              style={{ marginTop: "0.25rem", width: "1.1rem", height: "1.1rem", flexShrink: 0, accentColor: "#1A7FD4" }}
            />
            <div>
              <p style={{ fontWeight: 600, margin: 0, color: "#0D1F3C" }}>{label}</p>
              {hint.split("\n").map((line, i) => (
                <p key={i} style={{ color: "#6B8BAE", fontSize: "0.78rem", margin: i === 0 ? "0.25rem 0 0" : "0.1rem 0 0" }}>
                  {line}
                </p>
              ))}
            </div>
          </label>
        ))}
      </div>

      {/* Live summary */}
      <div style={{
        padding: "0.85rem 1rem",
        borderRadius: "0.5rem",
        border: `2px solid ${priorityDisplay.color}`,
        backgroundColor: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem"
      }}>
        <span style={{ fontSize: "1.4rem" }}>{priorityDisplay.emoji}</span>
        <div>
          <p style={{ margin: 0, fontWeight: 700, color: "#0D1F3C" }}>Documents confirmed: {docCount} of 5</p>
          <p style={{ margin: "0.15rem 0 0", fontSize: "0.8rem", color: priorityDisplay.color }}>
            {priorityDisplay.label}
          </p>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => {
    type CheckItem = { field: keyof FormState; label: string; helper?: string };

    const renderGroup = (title: string, items: CheckItem[]) => (
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontWeight: 600, color: "#1A7FD4", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.6rem" }}>
          {title}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {items.map(({ field, label, helper }) => (
            <label key={field} style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
              padding: "0.75rem 1rem",
              border: `2px solid ${form[field] ? "#1A7FD4" : "#DDEAF7"}`,
              borderRadius: "0.5rem",
              backgroundColor: form[field] ? "#EBF5FF" : "#FFFFFF",
              cursor: "pointer",
              transition: "border-color 0.15s, background 0.15s"
            }}>
              <input
                type="checkbox"
                checked={form[field] as boolean}
                onChange={() => handleCheck(field)}
                style={{ marginTop: "0.25rem", width: "1.1rem", height: "1.1rem", flexShrink: 0, accentColor: "#1A7FD4" }}
              />
              <div>
                <p style={{ fontWeight: 600, margin: 0, color: "#0D1F3C" }}>{label}</p>
                {helper && <p style={{ color: "#6B8BAE", fontSize: "0.78rem", margin: "0.2rem 0 0" }}>{helper}</p>}
              </div>
            </label>
          ))}
        </div>
      </div>
    );

    return (
      <div>
        <div style={{ marginBottom: "1.25rem" }}>
          <h3 style={{ margin: 0, fontWeight: 700, color: "#0D1F3C" }}>Barriers &amp; Health</h3>
          <p style={{ margin: "0.4rem 0 0", color: "#6B8BAE", fontSize: "0.875rem" }}>
            Check all that apply to help the shelter manager provide complete support.
          </p>
        </div>

        {renderGroup("Identity & Financial", [
          { field: "hasBankAccount", label: "Has an active bank account", helper: "Needed for benefit disbursements and rental payments" }
        ])}

        {renderGroup("Housing Barriers", [
          { field: "hasPriorEviction",   label: "Has prior eviction(s) on record",               helper: "May restrict access to some housing programs — workarounds available" },
          { field: "hasCriminalHistory", label: "Has criminal history that may affect housing eligibility", helper: "NJ has 'ban the box' protections — reentry programs available" }
        ])}

        {renderGroup("Health & Support Needs", [
          { field: "hasSubstanceUse", label: "Has substance use history requiring support services" },
          { field: "hasMentalHealth",  label: "Has mental health needs requiring professional support" },
          { field: "hasDisability",    label: "Has a documented disability (physical or developmental)", helper: "If yes, medical documentation may unlock Section 811 and CoC PSH priority" },
          { field: "hasMedicalDocs",   label: "Has disability documentation (medical records, SSA letter, FQHC evaluation)", helper: "Required for Section 811 and CoC Permanent Supportive Housing applications" }
        ])}
      </div>
    );
  };

  const renderStep5 = () => {
    const circumLabel = circumstanceLabel(form.specialCircumstance);
    return (
      <div>
        <div style={{ marginBottom: "1.25rem" }}>
          <h3 style={{ margin: 0, fontWeight: 700, color: "#0D1F3C" }}>Notes &amp; Submit</h3>
        </div>

        <div className="form__field">
          <label htmlFor="notes">Case Manager Notes (optional)</label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            value={form.notes}
            onChange={handleText}
            placeholder="Any additional context, observations, or follow-up reminders for this individual..."
            style={{
              width: "100%",
              padding: "0.65rem 0.75rem",
              borderRadius: "0.375rem",
              border: "1px solid #DDEAF7",
              backgroundColor: "#F4F9FF",
              color: "#0D1F3C",
              fontSize: "0.9rem",
              resize: "vertical",
              boxSizing: "border-box"
            }}
          />
        </div>

        {/* Summary card */}
        <div style={{
          marginTop: "1.5rem",
          padding: "1.25rem",
          borderRadius: "0.5rem",
          border: `2px solid ${priorityDisplay.color}`,
          backgroundColor: "#FFFFFF"
        }}>
          <p style={{ margin: "0 0 0.75rem", fontWeight: 700, color: "#0D1F3C", fontSize: "0.9rem" }}>
            Ready to generate roadmap for: <span style={{ color: "#1A7FD4" }}>{form.name || "—"}</span>
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <p style={{ margin: 0, color: "#6B8BAE", fontSize: "0.85rem" }}>
              Documents confirmed: <strong style={{ color: "#0D1F3C" }}>{docCount} of 5</strong>
            </p>
            <p style={{ margin: 0, color: "#6B8BAE", fontSize: "0.85rem" }}>
              Priority:{" "}
              <strong style={{ color: priorityDisplay.color }}>
                {priorityDisplay.emoji} {priority}
              </strong>
            </p>
            <p style={{ margin: 0, color: "#6B8BAE", fontSize: "0.85rem" }}>
              Special circumstance: <strong style={{ color: "#0D1F3C" }}>{circumLabel}</strong>
            </p>
          </div>
        </div>

        {submitError && (
          <div role="alert" style={{
            marginTop: "1rem",
            padding: "0.75rem 1rem",
            backgroundColor: "#FEF0EE",
            border: "1px solid #ef4444",
            borderRadius: "0.375rem",
            color: "#C0391B",
            fontSize: "0.875rem"
          }}>
            {submitError}
          </div>
        )}
      </div>
    );
  };

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto" }}>
      <ProgressBar step={step} />

      <form onSubmit={handleSubmit}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}

        {stepError && (
          <div role="alert" style={{
            marginTop: "1rem",
            padding: "0.65rem 0.9rem",
            backgroundColor: "#FEF0EE",
            border: "1px solid #ef4444",
            borderRadius: "0.375rem",
            color: "#C0391B",
            fontSize: "0.875rem"
          }}>
            {stepError}
          </div>
        )}

        <div style={{
          display: "flex",
          justifyContent: step === 1 ? "flex-end" : "space-between",
          marginTop: "1.75rem",
          gap: "0.75rem"
        }}>
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              style={{
                padding: "0.6rem 1.4rem",
                borderRadius: "0.375rem",
                border: "1px solid #DDEAF7",
                backgroundColor: "transparent",
                color: "#6B8BAE",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: 600
              }}
            >
              ← Back
            </button>
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={goNext}
              className="button button--primary"
              style={{ padding: "0.6rem 1.6rem" }}
            >
              Continue →
            </button>
          ) : (
            <button
              type="submit"
              className="button button--primary"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              style={{ padding: "0.6rem 1.6rem" }}
            >
              {isSubmitting ? "Generating roadmap…" : "Generate Housing Roadmap →"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default IntakeForm;
