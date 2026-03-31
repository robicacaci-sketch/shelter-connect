import { ActionPlan, ScenarioEntry } from "../types/index";

type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

const PRIORITY_RANK: Record<Priority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

// Returns the higher of two priorities
export function higherPriority(a: Priority, b: Priority): Priority {
  return PRIORITY_RANK[a] >= PRIORITY_RANK[b] ? a : b;
}

// Overlays scenario-specific guidance on top of the base combo plan.
// The scenario overrides firstAction, steps, fastestPath, workarounds, and estimatedTime.
// Priority is set to whichever is higher between the combo and the scenario.
export function applyScenarioOverlay(
  base: ActionPlan,
  scenario: ScenarioEntry
): ActionPlan {
  return {
    ...base,
    scenarioId: scenario.id,
    priority: higherPriority(base.priority, scenario.priority),
    firstAction: scenario.firstAction,
    rawSteps: scenario.steps,
    fastestPath: scenario.fastestPath,
    workarounds: scenario.workarounds,
    estimatedTime: scenario.estimatedTime,
    // AI-enriched fields reset so they get regenerated for this scenario
    finalGoal: "",
    summary: "",
    steps: [],
  };
}
