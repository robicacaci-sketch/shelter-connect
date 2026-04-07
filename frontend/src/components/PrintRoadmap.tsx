import React from "react";
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

function safeParseJson<T>(raw: string): T | null {
  try { return JSON.parse(raw) as T; } catch { return null; }
}

type Props = {
  steps: RoadmapStep[];
  planMeta: PlanMeta;
  clientName: string;
};

const PrintRoadmap: React.FC<Props> = ({ steps, planMeta, clientName }) => {
  const actionSteps = steps
    .filter(s => s.stage === "action_step")
    .sort((a, b) => a.order - b.order);
  const resourceSteps = steps
    .filter(s => s.stage === "resources")
    .sort((a, b) => a.order - b.order);

  return (
    <div style={{
      fontFamily: "Georgia, serif",
      color: "#111",
      backgroundColor: "#fff",
      maxWidth: "680px",
      margin: "0 auto",
      padding: "2rem",
      lineHeight: 1.6,
    }}>
      {/* Header */}
      <div style={{ borderBottom: "2px solid #111", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>
          Housing Roadmap
        </h1>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem", color: "#444" }}>
          Prepared for: <strong>{clientName}</strong>
        </p>
        <p style={{ margin: "0.1rem 0 0", fontSize: "0.8rem", color: "#666" }}>
          Printed on {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Final goal */}
      {planMeta.finalGoal && (
        <div style={{ marginBottom: "1.25rem", padding: "0.875rem 1rem", border: "1.5px solid #111", borderRadius: "0.5rem" }}>
          <p style={{ margin: "0 0 0.25rem", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#444" }}>
            Your Goal
          </p>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem" }}>{planMeta.finalGoal}</p>
        </div>
      )}

      {/* Summary */}
      {planMeta.summary && (
        <p style={{ marginBottom: "1.5rem", fontSize: "0.875rem", color: "#333", fontStyle: "italic" }}>
          {planMeta.summary}
        </p>
      )}

      {/* Steps */}
      <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", borderBottom: "1px solid #ccc", paddingBottom: "0.4rem" }}>
        Your Action Steps
      </h2>

      {actionSteps.map((step) => {
        const parsed = safeParseJson<ActionPlanStep>(step.description);
        if (!parsed) return null;
        return (
          <div key={step.id} style={{ marginBottom: "1.5rem", paddingBottom: "1.5rem", borderBottom: "1px solid #e5e5e5" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div style={{
                flexShrink: 0,
                width: "1.75rem",
                height: "1.75rem",
                borderRadius: "50%",
                border: "2px solid #111",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: 700,
              }}>
                {parsed.step_number}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem" }}>{parsed.action}</p>
                {parsed.phone && <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "#333" }}>📞 {parsed.phone}</p>}
                {parsed.address && <p style={{ margin: "0.1rem 0 0", fontSize: "0.82rem", color: "#333" }}>📍 {parsed.address}</p>}
              </div>
            </div>

            <div style={{ paddingLeft: "2.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div>
                <p style={{ margin: "0 0 0.1rem", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#666" }}>What to say or ask for</p>
                <p style={{ margin: 0, fontSize: "0.85rem" }}>{parsed.what_to_ask_for}</p>
              </div>
              <div style={{ background: "#f5f5f5", padding: "0.5rem 0.75rem", borderRadius: "0.375rem" }}>
                <p style={{ margin: "0 0 0.1rem", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#666" }}>Why this matters</p>
                <p style={{ margin: 0, fontSize: "0.85rem" }}>{parsed.why_it_matters}</p>
              </div>
              <div>
                <p style={{ margin: "0 0 0.1rem", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#666" }}>What should happen after</p>
                <p style={{ margin: 0, fontSize: "0.85rem" }}>{parsed.expected_outcome}</p>
              </div>
              {/* Notes lines for the client to write on */}
              <div style={{ marginTop: "0.25rem" }}>
                <p style={{ margin: "0 0 0.1rem", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#666" }}>My notes</p>
                <div style={{ borderBottom: "1px solid #ccc", height: "1.5rem" }} />
                <div style={{ borderBottom: "1px solid #ccc", height: "1.5rem", marginTop: "0.4rem" }} />
              </div>
            </div>
          </div>
        );
      })}

      {/* Resources */}
      {resourceSteps.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem", borderBottom: "1px solid #ccc", paddingBottom: "0.4rem" }}>
            Key NJ Contacts
          </h2>
          {resourceSteps.map((step) => (
            <div key={step.id} style={{ marginBottom: "0.6rem" }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: "0.875rem" }}>{step.title}</p>
              <p style={{ margin: "0.1rem 0 0", fontSize: "0.8rem", color: "#444" }}>{step.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid #ccc", fontSize: "0.75rem", color: "#666", textAlign: "center" }}>
        Generated by ShelterConnect · Keep this document and bring it to each appointment.
      </div>
    </div>
  );
};

export default PrintRoadmap;
