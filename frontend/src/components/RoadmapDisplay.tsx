import React, { useMemo } from "react";
import { PlanMeta, RoadmapStep } from "../api/clientApi";

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

// Status cycle: not_started → in_progress → completed → not_started
const nextStatus = (current: RoadmapStep["status"]): RoadmapStep["status"] => {
  if (current === "not_started") return "in_progress";
  if (current === "in_progress") return "completed";
  return "not_started";
};

const STATUS_STYLE: Record<RoadmapStep["status"], { label: string; bg: string; color: string; border: string }> = {
  not_started: { label: "Not started",  bg: "transparent",         color: "#6b7280", border: "#2d3748" },
  in_progress:  { label: "In progress", bg: "rgba(59,130,246,0.08)", color: "#3b82f6", border: "#3b82f6" },
  completed:    { label: "Done",        bg: "rgba(34,197,94,0.08)", color: "#22c55e", border: "#22c55e" },
};

function safeParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ─── Status Dot ──────────────────────────────────────────────────────────────
function StatusDot({ status }: { status: RoadmapStep["status"] }) {
  if (status === "completed") {
    return (
      <div style={{
        width: "16px", height: "16px", borderRadius: "50%",
        background: "#22c55e",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <span style={{ color: "#fff", fontSize: "9px", fontWeight: 900, lineHeight: 1 }}>✓</span>
      </div>
    );
  }
  if (status === "in_progress") {
    return (
      <div
        className="status-dot-progress"
        style={{
          width: "10px", height: "10px", borderRadius: "50%",
          background: "#3b82f6",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div style={{
      width: "10px", height: "10px", borderRadius: "50%",
      background: "transparent",
      border: "2px solid #4b5563",
      flexShrink: 0,
    }} />
  );
}

// ─── Pipeline Card ───────────────────────────────────────────────────────────
function PipelineCard({
  step,
  parsed,
  onStepUpdate,
}: {
  step: RoadmapStep;
  parsed: ActionPlanStep;
  onStepUpdate?: Props["onStepUpdate"];
}) {
  return (
    <div
      style={{
        background: "#1e293b",
        border: `1px solid ${STATUS_STYLE[step.status].border}`,
        borderRadius: "0.5rem",
        padding: "0.75rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
      }}
    >
      {/* Step number + title */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
        <div style={{
          flexShrink: 0,
          width: "1.5rem", height: "1.5rem",
          borderRadius: "50%",
          background: "#2563eb",
          color: "#fff",
          fontSize: "0.65rem",
          fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {parsed.step_number}
        </div>
        <p style={{ fontWeight: 600, color: "#f9fafb", fontSize: "0.82rem", margin: 0, lineHeight: 1.35 }}>
          {parsed.action}
        </p>
      </div>

      {/* Goal */}
      {parsed.goal_of_this_step && (
        <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.78rem", fontStyle: "italic", lineHeight: 1.45 }}>
          <span style={{ fontStyle: "normal", fontWeight: 600, color: "#6b7280" }}>Goal: </span>
          {parsed.goal_of_this_step}
        </p>
      )}

      {/* What to do — highlighted box */}
      {parsed.what_to_ask_for && (
        <div style={{
          background: "#1a2744",
          borderLeft: "3px solid #3b82f6",
          borderRadius: "0.25rem",
          padding: "0.5rem 0.75rem",
        }}>
          <p style={{ margin: "0 0 0.25rem", fontSize: "0.68rem", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            What to do:
          </p>
          <p style={{ margin: 0, color: "#e2e8f0", fontSize: "0.78rem", lineHeight: 1.5 }}>
            {parsed.what_to_ask_for}
          </p>
        </div>
      )}

      {/* Phone */}
      {parsed.phone && (
        <p style={{ margin: 0, color: "#60a5fa", fontSize: "0.75rem", lineHeight: 1.3 }}>
          📞 {parsed.phone}
        </p>
      )}

      {/* Address */}
      {parsed.address && (
        <p style={{ margin: 0, color: "#60a5fa", fontSize: "0.75rem", lineHeight: 1.3 }}>
          📍 {parsed.address}
        </p>
      )}

      {/* Why it matters */}
      {parsed.why_it_matters && (
        <p style={{ margin: 0, fontSize: "0.73rem", color: "#6b7280", lineHeight: 1.45 }}>
          <span style={{ fontWeight: 600 }}>Why it matters: </span>
          {parsed.why_it_matters}
        </p>
      )}

      {/* Status pill button */}
      <button
        type="button"
        title="Click to advance status"
        onClick={() => onStepUpdate?.(step.id, nextStatus(step.status))}
        style={{
          alignSelf: "flex-start",
          display: "flex",
          alignItems: "center",
          gap: "0.3rem",
          padding: "0.25rem 0.625rem",
          borderRadius: "999px",
          border: `1px solid ${STATUS_STYLE[step.status].border}`,
          backgroundColor: STATUS_STYLE[step.status].bg === "transparent"
            ? "transparent"
            : STATUS_STYLE[step.status].bg,
          color: STATUS_STYLE[step.status].color,
          fontSize: "0.7rem",
          fontWeight: 600,
          cursor: "pointer",
          marginTop: "0.1rem",
        }}
      >
        <StatusDot status={step.status} />
        {STATUS_STYLE[step.status].label}
        <span style={{ opacity: 0.6 }}>→</span>
      </button>
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

  // Group action steps by parsed.stage, preserving order of first appearance
  const stageGroups = useMemo(() => {
    const groups = new Map<string, Array<{ step: RoadmapStep; parsed: ActionPlanStep }>>();
    const fallbacks: Array<{ step: RoadmapStep }> = [];

    for (const step of actionSteps) {
      const parsed = safeParseJson<ActionPlanStep>(step.description);
      if (parsed && typeof parsed.action === "string") {
        const stageName = parsed.stage || "Action Steps";
        if (!groups.has(stageName)) groups.set(stageName, []);
        groups.get(stageName)!.push({ step, parsed });
      } else {
        fallbacks.push({ step });
      }
    }

    return { groups: Array.from(groups.entries()), fallbacks };
  }, [actionSteps]);

  if (steps.length === 0) {
    return <p style={{ color: "#6b7280" }}>No roadmap steps available yet.</p>;
  }

  const totalSteps = actionSteps.length;
  const completedSteps = actionSteps.filter(s => s.status === "completed").length;
  const pct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <section aria-label="Housing readiness roadmap">
      {/* Pulse animation for in-progress dots */}
      <style>{`
        @keyframes pulse-blue {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.25); }
        }
        .status-dot-progress { animation: pulse-blue 1.4s ease-in-out infinite; }
      `}</style>

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
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#9ca3af", marginBottom: "0.4rem" }}>
          <span>Progress</span>
          <span>{completedSteps} of {totalSteps} steps completed ({pct}%)</span>
        </div>
        <div style={{ height: "6px", borderRadius: "999px", backgroundColor: "#1f2937", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, backgroundColor: "#22c55e", borderRadius: "999px", transition: "width 0.3s ease" }} />
        </div>
      </div>

      {/* Stage sections */}
      {stageGroups.groups.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {stageGroups.groups.map(([stageName, items]) => {
            const colCompleted = items.filter(i => i.step.status === "completed").length;
            return (
              <div key={stageName}>
                {/* Stage header */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  paddingBottom: "0.5rem",
                  borderBottom: "1px solid #1e293b",
                  marginBottom: "0.75rem",
                }}>
                  <span style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "#60a5fa",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}>
                    {stageName}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "#4b5563" }}>
                    {colCompleted}/{items.length} done
                  </span>
                </div>

                {/* 2-column grid of cards */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
                  gap: "0.75rem",
                }}>
                  {items.map(({ step, parsed }) => (
                    <PipelineCard
                      key={step.id}
                      step={step}
                      parsed={parsed}
                      onStepUpdate={onStepUpdate}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fallback for non-JSON steps */}
      {stageGroups.fallbacks.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          {stageGroups.fallbacks.map(({ step }) => (
            <div
              key={step.id}
              style={{
                padding: "0.875rem 1.25rem",
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "0.75rem",
                marginBottom: "0.75rem",
              }}
            >
              <p style={{ fontWeight: 700, color: "#f9fafb", margin: "0 0 0.25rem" }}>{step.title}</p>
              <p style={{ color: "#9ca3af", margin: 0, fontSize: "0.875rem" }}>{step.description}</p>
            </div>
          ))}
        </div>
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
