import React, { useState, useMemo } from "react";
import { PlanMeta, RoadmapStep, updateStepNote } from "../api/clientApi";
import { useAuth } from "../context/AuthContext";

// ─── Types ───────────────────────────────────────────────────────────────────
type ActionPlanStep = {
  step_number: number;
  action: string;
  phone?: string;
  address?: string;
  stage?: string;
  what_to_ask_for: string;
  goal_of_this_step: string;
  why_it_matters: string;
  expected_outcome: string;
};

type ResourceData = {
  phone?: string;
  description?: string;
  cost?: string;
  coverageArea?: string;
  category?: string;
};

type Props = {
  steps: RoadmapStep[];
  planMeta: PlanMeta;
  clientId: string;
  onStepUpdate?: (stepId: string, newStatus: RoadmapStep["status"]) => void;
};

// ─── Phase definitions (fixed by step_number) ────────────────────────────────
const PHASES = [
  { label: "🪪 Identity & Documents",  min: 1, max: 2 },
  { label: "🏛️ Benefits & Services",   min: 3, max: 4 },
  { label: "🏠 Housing Applications",  min: 5, max: 6 },
  { label: "📋 Next Steps",            min: 7, max: Infinity },
];

function getPhaseLabel(stepNumber: number): string {
  for (const phase of PHASES) {
    if (stepNumber >= phase.min && stepNumber <= phase.max) return phase.label;
  }
  return "📋 Next Steps";
}

// ─── Unchanged helpers ───────────────────────────────────────────────────────
const nextStatus = (current: RoadmapStep["status"]): RoadmapStep["status"] => {
  if (current === "not_started") return "in_progress";
  if (current === "in_progress") return "completed";
  return "not_started";
};

const STATUS_STYLE: Record<RoadmapStep["status"], { label: string; bg: string; color: string; border: string }> = {
  not_started: { label: "Not started",  bg: "transparent",   color: "#6B8BAE", border: "#DDEAF7" },
  in_progress:  { label: "In progress", bg: "#EBF5FF",       color: "#1A7FD4", border: "#1A7FD4" },
  completed:    { label: "✓ Done",      bg: "#EAF7F2",       color: "#2DBD8F", border: "#2DBD8F" },
};

function safeParseJson<T>(raw: string): T | null {
  try { return JSON.parse(raw) as T; }
  catch { return null; }
}

// ─── Timeline dot (on the vertical line) ─────────────────────────────────────
function TimelineDot({ status }: { status: RoadmapStep["status"] }) {
  const dotColor =
    status === "completed"   ? "#2DBD8F" :
    status === "in_progress" ? "#1A7FD4" :
    "#F4F9FF";
  const borderColor =
    status === "completed"   ? "#2DBD8F" :
    status === "in_progress" ? "#1A7FD4" :
    "#DDEAF7";

  return (
    <div style={{
      flexShrink: 0,
      width: "1rem", height: "1rem",
      borderRadius: "50%",
      background: dotColor,
      border: `2px solid ${borderColor}`,
      zIndex: 1,
      marginTop: "0.65rem",
    }} />
  );
}

// ─── Note Input (auto-saves after 1.2s of inactivity) ────────────────────────
function NoteInput({
  stepId,
  clientId,
  initialValue,
  onSave,
}: {
  stepId: string;
  clientId: string;
  initialValue: string;
  onSave: (notes: string) => void;
}) {
  const { token } = useAuth();
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    setSaved(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (!token) return;
      setSaving(true);
      try {
        await updateStepNote(token, clientId, stepId, e.target.value);
        onSave(e.target.value);
        setSaved(true);
      } catch {
        // silent fail — user can retry by typing again
      } finally {
        setSaving(false);
      }
    }, 1200);
  };

  return (
    <div>
      <textarea
        value={value}
        onChange={handleChange}
        rows={2}
        placeholder="Add a note for this step (auto-saves)…"
        style={{
          width: "100%",
          padding: "0.55rem 0.75rem",
          borderRadius: "0.375rem",
          border: "1.5px solid #DDEAF7",
          backgroundColor: "#F4F9FF",
          color: "#0D1F3C",
          fontSize: "0.82rem",
          resize: "vertical",
          boxSizing: "border-box",
          lineHeight: 1.5,
        }}
      />
      {(saving || saved) && (
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.7rem", color: saving ? "#6B8BAE" : "#2DBD8F" }}>
          {saving ? "Saving…" : "✓ Saved"}
        </p>
      )}
    </div>
  );
}

// ─── Collapsible Action Step Card ─────────────────────────────────────────────
function ActionStepCard({
  step,
  parsed,
  clientId,
  onStepUpdate,
  onNoteUpdate,
}: {
  step: RoadmapStep;
  parsed: ActionPlanStep;
  clientId: string;
  onStepUpdate?: Props["onStepUpdate"];
  onNoteUpdate?: (stepId: string, notes: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #DDEAF7",
      borderRadius: "0.75rem",
      overflow: "hidden",
    }}>
      {/* ── Header row (clickable to expand) ── */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(o => !o)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setIsOpen(o => !o); }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.875rem 1.25rem",
          borderBottom: isOpen ? "1px solid #DDEAF7" : "none",
          background: "#F4F9FF",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {/* Step number circle */}
        <div style={{
          flexShrink: 0,
          width: "2rem", height: "2rem",
          borderRadius: "50%",
          background: "#1A7FD4",
          color: "#fff",
          fontSize: "0.8rem",
          fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {parsed.step_number}
        </div>

        {/* Title + contact */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, color: "#0D1F3C", margin: 0, fontSize: "0.95rem", lineHeight: 1.35 }}>
            {parsed.action}
          </p>
          {parsed.phone && (
            <p style={{ color: "#1A7FD4", fontSize: "0.78rem", margin: "0.2rem 0 0" }}>📞 {parsed.phone}</p>
          )}
          {parsed.address && (
            <p style={{ color: "#1A7FD4", fontSize: "0.78rem", margin: "0.2rem 0 0" }}>📍 {parsed.address}</p>
          )}
        </div>

        {/* Status button — stops propagation so it doesn't toggle open */}
        <button
          type="button"
          title="Click to update status"
          onClick={(e) => { e.stopPropagation(); onStepUpdate?.(step.id, nextStatus(step.status)); }}
          style={{
            flexShrink: 0,
            padding: "0.3rem 0.75rem",
            borderRadius: "999px",
            border: `1px solid ${STATUS_STYLE[step.status].border}`,
            backgroundColor: STATUS_STYLE[step.status].bg,
            color: STATUS_STYLE[step.status].color,
            fontSize: "0.72rem",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {STATUS_STYLE[step.status].label}
        </button>

        {/* Chevron */}
        <span style={{
          flexShrink: 0,
          color: "#6B8BAE",
          fontSize: "0.75rem",
          transition: "transform 0.2s ease",
          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          display: "inline-block",
        }}>
          ▼
        </span>
      </div>

      {/* ── Collapsible detail body ── */}
      <div style={{
        maxHeight: isOpen ? "1200px" : "0",
        overflow: "hidden",
        transition: "max-height 0.25s ease",
      }}>
        <div style={{ padding: "1rem 1.25rem", display: "grid", gap: "0.875rem" }}>

          {/* 💬 What to say */}
          {parsed.what_to_ask_for && (
            <div style={{ display: "flex", gap: "0.6rem" }}>
              <span style={{ fontSize: "1.1rem", lineHeight: 1.4 }}>💬</span>
              <div>
                <p style={{ margin: "0 0 0.2rem", fontSize: "0.7rem", fontWeight: 700, color: "#6B8BAE", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  What to say or ask for
                </p>
                <p style={{ margin: 0, color: "#0D1F3C", fontSize: "0.875rem", lineHeight: 1.5 }}>
                  {parsed.what_to_ask_for}
                </p>
              </div>
            </div>
          )}

          {/* 🎯 Goal */}
          {parsed.goal_of_this_step && (
            <div style={{ display: "flex", gap: "0.6rem" }}>
              <span style={{ fontSize: "1.1rem", lineHeight: 1.4 }}>🎯</span>
              <div>
                <p style={{ margin: "0 0 0.2rem", fontSize: "0.7rem", fontWeight: 700, color: "#6B8BAE", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Goal of this step
                </p>
                <p style={{ margin: 0, color: "#0D1F3C", fontSize: "0.875rem", lineHeight: 1.5 }}>
                  {parsed.goal_of_this_step}
                </p>
              </div>
            </div>
          )}

          {/* 🔗 Why it matters */}
          {parsed.why_it_matters && (
            <div style={{
              display: "flex",
              gap: "0.6rem",
              background: "#EAF7F2",
              border: "1px solid #9FE1CB",
              borderRadius: "0.5rem",
              padding: "0.75rem",
            }}>
              <span style={{ fontSize: "1.1rem", lineHeight: 1.4 }}>🔗</span>
              <div>
                <p style={{ margin: "0 0 0.2rem", fontSize: "0.7rem", fontWeight: 700, color: "#2DBD8F", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Why this matters for your case
                </p>
                <p style={{ margin: 0, color: "#0D1F3C", fontSize: "0.875rem", lineHeight: 1.5 }}>
                  {parsed.why_it_matters}
                </p>
              </div>
            </div>
          )}

          {/* ✅ Expected outcome */}
          {parsed.expected_outcome && (
            <div style={{ display: "flex", gap: "0.6rem" }}>
              <span style={{ fontSize: "1.1rem", lineHeight: 1.4 }}>✅</span>
              <div>
                <p style={{ margin: "0 0 0.2rem", fontSize: "0.7rem", fontWeight: 700, color: "#6B8BAE", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  What should happen after
                </p>
                <p style={{ margin: 0, color: "#0D1F3C", fontSize: "0.875rem", lineHeight: 1.5 }}>
                  {parsed.expected_outcome}
                </p>
              </div>
            </div>
          )}

          {/* 📝 Case manager note */}
          <div style={{ borderTop: "1px solid #DDEAF7", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
            <p style={{ margin: "0 0 0.4rem", fontSize: "0.7rem", fontWeight: 700, color: "#6B8BAE", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              📝 Case manager note
            </p>
            <NoteInput
              stepId={step.id}
              clientId={clientId}
              initialValue={step.notes ?? ""}
              onSave={(notes) => onNoteUpdate?.(step.id, notes)}
            />
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Resource Card ────────────────────────────────────────────────────────────
function ResourceCard({ step }: { step: RoadmapStep }) {
  const data = safeParseJson<ResourceData>(step.description);
  return (
    <li style={{
      padding: "0.75rem 1rem",
      background: "#FFFFFF",
      border: "1px solid #DDEAF7",
      borderRadius: "0.5rem",
      marginBottom: "0.5rem",
    }}>
      <p style={{ fontWeight: 600, color: "#0D1F3C", margin: "0 0 0.25rem", fontSize: "0.875rem" }}>
        {step.title}
      </p>
      {data ? (
        <div style={{ fontSize: "0.8rem", color: "#6B8BAE", lineHeight: 1.6 }}>
          {data.description && <span>{data.description}</span>}
          {data.phone && <span style={{ display: "block", color: "#1A7FD4" }}>📞 {data.phone}</span>}
          {data.cost && data.cost !== "Free" && <span style={{ display: "block" }}>Cost: {data.cost}</span>}
          {data.coverageArea && <span style={{ display: "block" }}>Area: {data.coverageArea}</span>}
        </div>
      ) : (
        <p style={{ fontSize: "0.8rem", color: "#6B8BAE", margin: 0 }}>{step.description}</p>
      )}
    </li>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const RoadmapDisplay: React.FC<Props> = ({ steps, planMeta, clientId, onStepUpdate }) => {
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);

  const actionSteps = useMemo(
    () => steps.filter(s => s.stage === "action_step").sort((a, b) => a.order - b.order),
    [steps]
  );
  const resourceSteps = useMemo(
    () => steps.filter(s => s.stage === "resources").sort((a, b) => a.order - b.order),
    [steps]
  );

  // Group action steps into phases by step_number
  const phaseGroups = useMemo(() => {
    const groups = new Map<string, Array<{ step: RoadmapStep; parsed: ActionPlanStep }>>();

    for (const step of actionSteps) {
      const parsed = safeParseJson<ActionPlanStep>(step.description);
      if (!parsed || typeof parsed.action !== "string") continue;
      const label = getPhaseLabel(parsed.step_number);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push({ step, parsed });
    }

    // Return in fixed phase order, skip empty phases
    return PHASES
      .map(p => ({ label: p.label, items: groups.get(p.label) ?? [] }))
      .filter(g => g.items.length > 0);
  }, [actionSteps]);

  // Fallback non-JSON steps
  const fallbackSteps = useMemo(() => {
    return actionSteps.filter(step => {
      const parsed = safeParseJson<ActionPlanStep>(step.description);
      return !parsed || typeof parsed.action !== "string";
    });
  }, [actionSteps]);

  if (steps.length === 0) {
    return <p style={{ color: "#6B8BAE" }}>No roadmap steps available yet.</p>;
  }

  const totalSteps = actionSteps.length;
  const completedSteps = actionSteps.filter(s => s.status === "completed").length;
  const pct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <section
      aria-label="Housing readiness roadmap"
      style={{ width: "100%", maxWidth: "1200px", margin: "0 auto", padding: "0 1.5rem", boxSizing: "border-box" }}
    >
      {/* 1. Final Goal banner */}
      {planMeta.finalGoal && (
        <div style={{
          background: "#eff6ff",
          border: "1.5px solid #bfdbfe",
          borderRadius: "0.75rem",
          padding: "1rem 1.25rem",
          marginBottom: "1rem",
          display: "flex",
          gap: "0.6rem",
          alignItems: "flex-start",
        }}>
          <span style={{ fontSize: "1.2rem", lineHeight: 1.3 }}>🏁</span>
          <div>
            <p style={{ margin: "0 0 0.2rem", fontSize: "0.7rem", fontWeight: 700, color: "#1A7FD4", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Final Goal
            </p>
            <p style={{ margin: 0, color: "#1e3a8a", fontSize: "0.9rem", fontWeight: 500, lineHeight: 1.5 }}>
              {planMeta.finalGoal}
            </p>
          </div>
        </div>
      )}

      {/* 2. Progress bar */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#6B8BAE", marginBottom: "0.4rem" }}>
          <span>Progress</span>
          <span>{completedSteps} of {totalSteps} steps completed ({pct}%)</span>
        </div>
        <div style={{ height: "6px", borderRadius: "999px", backgroundColor: "#EBF5FF", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, backgroundColor: "#1A7FD4", borderRadius: "999px", transition: "width 0.3s ease" }} />
        </div>
      </div>

      {/* 3. Summary banner */}
      {planMeta.summary && (
        <div style={{
          background: "#f0fdf4",
          border: "1.5px solid #bbf7d0",
          borderRadius: "0.75rem",
          padding: "1rem 1.25rem",
          marginBottom: "2rem",
        }}>
          <p style={{ margin: "0 0 0.2rem", fontSize: "0.7rem", fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Why this plan works for your situation
          </p>
          <p style={{ margin: 0, color: "#166534", fontSize: "0.875rem", lineHeight: 1.6 }}>
            {planMeta.summary}
          </p>
        </div>
      )}

      {/* 4. Vertical timeline */}
      {phaseGroups.map(({ label, items }) => (
        <div key={label} style={{ marginBottom: "2rem" }}>
          {/* Phase label */}
          <p style={{
            margin: "0 0 0.75rem",
            paddingLeft: "2rem",
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "#6B8BAE",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}>
            {label}
          </p>

          {/* Steps with vertical line */}
          <div style={{ position: "relative" }}>
            {/* Vertical connecting line */}
            <div style={{
              position: "absolute",
              left: "0.9rem",
              top: 0,
              bottom: 0,
              width: "2px",
              background: "#DDEAF7",
              zIndex: 0,
            }} />

            {items.map(({ step, parsed }) => (
              <div key={step.id} style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
                marginBottom: "1rem",
                position: "relative",
              }}>
                <TimelineDot status={step.status} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <ActionStepCard
                    step={step}
                    parsed={parsed}
                    clientId={clientId}
                    onStepUpdate={onStepUpdate}
                    onNoteUpdate={() => {}}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Fallback for non-JSON steps */}
      {fallbackSteps.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          {fallbackSteps.map((step) => (
            <div key={step.id} style={{
              padding: "0.875rem 1.25rem",
              background: "#FFFFFF",
              border: "1px solid #DDEAF7",
              borderRadius: "0.75rem",
              marginBottom: "0.75rem",
            }}>
              <p style={{ fontWeight: 700, color: "#0D1F3C", margin: "0 0 0.25rem" }}>{step.title}</p>
              <p style={{ color: "#6B8BAE", margin: 0, fontSize: "0.875rem" }}>{step.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* 5. Resources — collapsible */}
      {resourceSteps.length > 0 && (
        <section style={{ marginTop: "1rem" }}>
          <button
            type="button"
            onClick={() => setIsResourcesOpen(o => !o)}
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "none",
              border: "1px solid #DDEAF7",
              borderRadius: isResourcesOpen ? "0.5rem 0.5rem 0 0" : "0.5rem",
              padding: "0.75rem 1rem",
              cursor: "pointer",
              color: "#6B8BAE",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            <span>📞 Key NJ Contacts (tap to expand)</span>
            <span style={{
              fontSize: "0.7rem",
              transition: "transform 0.2s ease",
              transform: isResourcesOpen ? "rotate(180deg)" : "rotate(0deg)",
              display: "inline-block",
            }}>▼</span>
          </button>

          <div style={{
            maxHeight: isResourcesOpen ? "2000px" : "0",
            overflow: "hidden",
            transition: "max-height 0.3s ease",
            border: isResourcesOpen ? "1px solid #DDEAF7" : "none",
            borderTop: "none",
            borderRadius: "0 0 0.5rem 0.5rem",
            padding: isResourcesOpen ? "0.75rem" : "0",
          }}>
            <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {resourceSteps.map((step) => (
                <ResourceCard key={step.id} step={step} />
              ))}
            </ol>
          </div>
        </section>
      )}
    </section>
  );
};

export default RoadmapDisplay;
