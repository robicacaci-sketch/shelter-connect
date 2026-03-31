import { db } from "../db/index";
import { Client } from "../models/Client";
import {
  Roadmap,
  RoadmapStep,
  RoadmapStepStatus
} from "../models/Roadmap";
import { evaluateDocumentStatus } from "../engine/evaluateDocuments";
import { enrichPlanWithAI } from "./planEnricherService";
import { SpecialCircumstance } from "../types/index";

const nowIso = () => new Date().toISOString();

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

interface GeneratedStepInput {
  stage: string;
  title: string;
  description: string;
  status?: RoadmapStepStatus;
}

// Build enriched steps from client intake data via engine + AI
const buildStepsForClient = async (client: Client): Promise<{
  steps: GeneratedStepInput[];
  finalGoal: string;
  summary: string;
}> => {
  // 1. Rule-based engine: determine what steps are needed
  const rawPlan = evaluateDocumentStatus(
    client.documentStatus,
    client.specialCircumstance as SpecialCircumstance
  );

  // 2. AI enricher: generate structured ActionPlanStep objects + finalGoal + summary
  const enrichedPlan = await enrichPlanWithAI(rawPlan, client);

  const steps: GeneratedStepInput[] = [];

  // Each enriched ActionPlanStep → one DB row with JSON in description
  enrichedPlan.steps.forEach((step) => {
    steps.push({
      stage: "action_step",
      title: step.action,
      description: JSON.stringify(step),
      status: "not_started",
    });
  });

  // Keep resources as separate rows (used by any future resource UI)
  enrichedPlan.resources.slice(0, 5).forEach((resource) => {
    steps.push({
      stage: "resources",
      title: resource.name,
      description: JSON.stringify({
        phone: resource.phone,
        description: resource.description,
        cost: resource.cost,
        coverageArea: resource.coverageArea,
        category: resource.category,
      }),
      status: "not_started",
    });
  });

  return {
    steps,
    finalGoal: enrichedPlan.finalGoal,
    summary: enrichedPlan.summary,
  };
};

const getExistingRoadmapWithSteps = (
  clientId: string
): Promise<{ roadmap: Roadmap; steps: RoadmapStep[] } | null> => {
  return new Promise((resolve, reject) => {
    db.get<Roadmap>(
      `SELECT * FROM roadmaps WHERE clientId = ?`,
      [clientId],
      (err, roadmapRow) => {
        if (err) { reject(err); return; }
        if (!roadmapRow) { resolve(null); return; }

        db.all<RoadmapStep>(
          `SELECT id, roadmapId, stage, title, description, status, "order" as "order"
           FROM roadmapSteps WHERE roadmapId = ? ORDER BY "order" ASC`,
          [roadmapRow.id],
          (stepsErr, stepRows) => {
            if (stepsErr) { reject(stepsErr); return; }
            resolve({ roadmap: roadmapRow, steps: stepRows ?? [] });
          }
        );
      }
    );
  });
};

const createRoadmapWithSteps = async (
  client: Client
): Promise<{ roadmap: Roadmap; steps: RoadmapStep[] }> => {
  const id = generateId();
  const createdAt = nowIso();

  const { steps: generatedSteps, finalGoal, summary } = await buildStepsForClient(client);

  const roadmap: Roadmap = {
    id,
    clientId: client.id,
    status: "active",
    finalGoal,
    summary,
    createdAt,
    updatedAt: createdAt,
  };

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO roadmaps (id, clientId, status, finalGoal, summary, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [roadmap.id, roadmap.clientId, roadmap.status, finalGoal, summary, createdAt, createdAt],
      (err) => {
        if (err) { reject(err); return; }

        const steps: RoadmapStep[] = [];

        const insertStep = (index: number, done: (err?: Error | null) => void) => {
          if (index >= generatedSteps.length) { done(); return; }

          const base = generatedSteps[index];
          const stepId = generateId();
          const order = index + 1;

          const step: RoadmapStep = {
            id: stepId,
            roadmapId: roadmap.id,
            stage: base.stage,
            title: base.title,
            description: base.description,
            status: base.status ?? "not_started",
            order,
          };

          db.run(
            `INSERT INTO roadmapSteps (id, roadmapId, stage, title, description, status, "order")
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [step.id, step.roadmapId, step.stage, step.title, step.description, step.status, step.order],
            (stepErr) => {
              if (stepErr) { done(stepErr); return; }
              steps.push(step);
              insertStep(index + 1, done);
            }
          );
        };

        insertStep(0, (stepsErr) => {
          if (stepsErr) { reject(stepsErr); return; }
          resolve({ roadmap, steps });
        });
      }
    );
  });
};

export const getOrCreateRoadmapForClient = (
  client: Client
): Promise<{ roadmap: Roadmap; steps: RoadmapStep[] }> => {
  return getExistingRoadmapWithSteps(client.id).then((existing) => {
    if (existing) return existing;
    return createRoadmapWithSteps(client);
  });
};
