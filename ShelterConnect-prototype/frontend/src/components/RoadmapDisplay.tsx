import React, { useMemo } from "react";
import { PlanMeta, RoadmapStep } from "../api/clientApi";

type ActionPlanStep = {
  step_number: number;
  action: string;
  phone?: string;
  address?: string;
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

// Status cycle: not_started → in_progress → completed → not_started
const nextStatus = (current: RoadmapStep["status"]): RoadmapStep["status"] => {
  if (current === "not_started") return "in_progress";
  if (current === "in_progress") return "completed";
  return "not_started";
};

const STATUS_STYLE: Record<RoadmapStep["status"], { label: string; bg: string; color: string; border: string }> = {
  not_started: { label: "Not started",  bg: "transparent",         color: "#6b7280", border: "#374151" },
  in_progress:  { label: "In progress", bg: "rgba(234,179,8,0.1)", color: "#eab308", border: "#eab308" },
  completed:    { label: "✓ Done",      bg: "rgba(34,197,94,0.1)", color: "#22c55e", border: "#22c55e" },
};

function safeParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ─── Action Step Card ────────────────────────────────────────────────────────
function ActionStepCard({
  step,
  parsed,
  onStepUpdate,
}: {
  step: RoadmapStep;
  parsed: ActionPlanStep;
  onStepUpdate?: Props["onStepUpdate"];
}) {
  return (
    <div style={{
      background: "#0f172a",
      border: "1px solid #1e293b",
      borderRadius: "0.75rem",
      marginBottom: "1rem",
      overflow: "hidden",
    }}>
      {/* Header row: step number + action title + status button */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.875rem 1.25rem",
        borderBottom: "1px solid #1e293b",
        background: "#111827",
      }}>
        <div style={{
          flexShrink: 0,
          width: "2rem",
          height: "2rem",
          borderRadius: "50%",
          background: "#2563eb",
          color: "#fff",
          fontSize: "0.8rem",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          {parsed.step_number}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, color: "#f9fafb", margin: 0, fontSize: "0.95rem" }}>
            {parsed.action}
          </p>
          {parsed.phone && (
            <p style={{ color: "#60a5fa", fontSize: "0.8rem", margin: "0.2rem 0 0" }}>
              📞 {parsed.phone}
            </p>
          )}
          {parsed.address && (
            <p style={{ color: "#60a5fa", fontSize: "0.8rem", margin: "0.2rem 0 0" }}>
              📍 {parsed.address}
            </p>
          )}
        </div>
        <button
          type="button"
          title="Click to update status"
          onClick={() => onStepUpdate?.(step.id, nextStatus(step.status))}
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
      </div>

      {/* Step detail body */}
      <div style={{ padding: "1rem 1.25rem", display: "grid", gap: "0.875rem" }}>

        {/* What to say or ask for */}
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <span style={{ fontSize: "1.1rem", lineHeight: 1.4 }}>💬</span>
          <div>
            <p style={{ margin: "0 0 0.2rem", fontSize: "0.7rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              What to say or ask for
            </p>
            <p style={{ margin: 0, color: "#d1d5db", fontSize: "0.875rem", lineHeight: 1.5 }}>
              {parsed.what_to_ask_for}
            </p>
          </div>
        </div>

        {/* Goal of this step */}
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <span style={{ fontSize: "1.1rem", lineHeight: 1.4 }}>🎯</span>
          <div>
            <p style={{ margin: "0 0 0.2rem", fontSize: "0.7rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Goal of this step
            </p>
            <p style={{ margin: 0, color: "#d1d5db", fontSize: "0.875rem", lineHeight: 1.5 }}>
              {parsed.goal_of_this_step}
            </p>
          </div>
        </div>

        {/* Why it matters — highlighted */}
        <div style={{
          display: "flex",
          gap: "0.6rem",
          background: "rgba(234,179,8,0.08)",
          border: "1px solid rgba(234,179,8,0.25)",
          borderRadius: "0.5rem",
          padding: "0.75rem",
        }}>
          <span style={{ fontSize: "1.1rem", lineHeight: 1.4 }}>🔗</span>
          <div>
            <p style={{ margin: "0 0 0.2rem", fontSize: "0.7rem", fontWeight: 700, color: "#ca8a04", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Why this matters for your case
            </p>
            <p style={{ margin: 0, color: "#fde68a", fontSize: "0.875rem", lineHeight: 1.5 }}>
              {parsed.why_it_matters}
            </p>
          </div>
        </div>

        {/* Expected outcome */}
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <span style={{ fontSize: "1.1rem", lineHeight: 1.4 }}>✅</span>
          <div>
            <p style={{ margin: "0 0 0.2rem", fontSize: "0.7rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              What should happen after
            </p>
            <p style={{ margin: 0, color: "#d1d5db", fontSize: "0.875rem", lineHeight: 1.5 }}>
              {parsed.expected_outcome}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Resource Card ───────────────────────────────────────────────────────────
function ResourceCard({ step }: { step: RoadmapStep }) {
  const data = safeParseJson<ResourceData>(step.description);
  return (
    <li style={{
      padding: "0.75rem 1rem",
      background: "#0f172a",
      border: "1px solid #1e293b",
      borderRadius: "0.5rem",
      marginBottom: "0.5rem",
    }}>
      <p style={{ fontWeight: 600, color: "#f9fafb", margin: "0 0 0.25rem", fontSize: "0.875rem" }}>
        {step.title}
      </p>
      {data ? (
        <div style={{ fontSize: "0.8rem", color: "#9ca3af", lineHeight: 1.6 }}>
          {data.description && <span>{data.description}</span>}
          {data.phone && <span style={{ display: "block", color: "#60a5fa" }}>📞 {data.phone}</span>}
          {data.cost && data.cost !== "Free" && <span style={{ display: "block" }}>Cost: {data.cost}</span>}
          {data.coverageArea && <span style={{ display: "block" }}>Area: {data.coverageArea}</span>}
        </div>
      ) : (
        <p style={{ fontSize: "0.8rem", color: "#9ca3af", margin: 0 }}>{step.description}</p>
      )}
    </li>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
const RoadmapDisplay: React.FC<Props> = ({ steps, planMeta, onStepUpdate }) => {
  const actionSteps = useMemo(
    () => steps.filter(s => s.stage === "action_step").sort((a, b) => a.order - b.order),
    [steps]
  );
  const resourceSteps = useMemo(
    () => steps.filter(s => s.stage === "resources").sort((a, b) => a.order - b.order),
    [steps]
  );

  if (steps.length === 0) {
    return <p style={{ color: "#6b7280" }}>No roadmap steps available yet.</p>;
  }

  const totalSteps = actionSteps.length;
  const completedSteps = actionSteps.filter(s => s.status === "completed").length;
  const pct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <section aria-label="Housing readiness roadmap">

      {/* Final Goal banner */}
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
            <p style={{ margin: "0 0 0.2rem", fontSize: "0.7rem", fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Final Goal
            </p>
            <p style={{ margin: 0, color: "#1e3a8a", fontSize: "0.9rem", fontWeight: 500, lineHeight: 1.5 }}>
              {planMeta.finalGoal}
            </p>
          </div>
        </div>
      )}

      {/* Summary banner */}
      {planMeta.summary && (
        <div style={{
          background: "#f0fdf4",
          border: "1.5px solid #bbf7d0",
          borderRadius: "0.75rem",
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
        }}>
          <p style={{ margin: "0 0 0.2rem", fontSize: "0.7rem", fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Why this plan works for your situation
          </p>
          <p style={{ margin: 0, color: "#166534", fontSize: "0.875rem", lineHeight: 1.6 }}>
            {planMeta.summary}
          </p>
        </div>
      )}

      {/* Progress bar */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#9ca3af", marginBottom: "0.4rem" }}>
          <span>Progress</span>
          <span>{completedSteps} of {totalSteps} steps completed ({pct}%)</span>
        </div>
        <div style={{ height: "6px", borderRadius: "999px", backgroundColor: "#1f2937", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, backgroundColor: "#22c55e", borderRadius: "999px", transition: "width 0.3s ease" }} />
        </div>
      </div>

      {/* Action steps */}
      {actionSteps.length > 0 && (
        <section>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1rem" }}>
            Your Steps — {actionSteps.length} total
          </p>
          {actionSteps.map((step) => {
            const parsed = safeParseJson<ActionPlanStep>(step.description);
            if (parsed && typeof parsed.action === "string") {
              return (
                <ActionStepCard
                  key={step.id}
                  step={step}
                  parsed={parsed}
                  onStepUpdate={onStepUpdate}
                />
              );
            }
            // Fallback for non-JSON steps
            return (
              <div key={step.id} style={{ padding: "0.875rem 1.25rem", background: "#0f172a", border: "1px solid #1e293b", borderRadius: "0.75rem", marginBottom: "1rem" }}>
                <p style={{ fontWeight: 700, color: "#f9fafb", margin: "0 0 0.25rem" }}>{step.title}</p>
                <p style={{ color: "#9ca3af", margin: 0, fontSize: "0.875rem" }}>{step.description}</p>
              </div>
            );
          })}
        </section>
      )}

      {/* Resources */}
      {resourceSteps.length > 0 && (
        <section style={{ marginTop: "2rem" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1rem" }}>
            📞 Key NJ Contacts
          </p>
          <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {resourceSteps.map((step) => (
              <ResourceCard key={step.id} step={step} />
            ))}
          </ol>
        </section>
      )}

    </section>
  );
};

export default RoadmapDisplay;
