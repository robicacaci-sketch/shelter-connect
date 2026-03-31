export type RoadmapStage =
  | "stabilization"
  | "documentation"
  | "income"
  | "housing_search"
  | "move_in";

export type RoadmapStepStatus = "not_started" | "in_progress" | "completed";

export interface Roadmap {
  id: string;
  clientId: string;
  status: "active" | "completed";
  finalGoal: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapStep {
  id: string;
  roadmapId: string;
  stage: RoadmapStage | string;
  title: string;
  description: string;
  status: RoadmapStepStatus;
  order: number;
}

