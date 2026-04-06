import Anthropic from "@anthropic-ai/sdk";
import { ActionPlan, ActionPlanStep } from "../types/index";
import { Client } from "../models/Client";

const MODEL = "claude-haiku-4-5-20251001"; // Fast + cheap for plan enrichment

// ─────────────────────────────────────────────────────────────────────────────
// Fallback: convert raw step strings to basic ActionPlanStep objects
// Used when ANTHROPIC_API_KEY is not set or the API call fails.
// ─────────────────────────────────────────────────────────────────────────────
function rawStepToBasicStep(rawStep: string, index: number): ActionPlanStep {
  const phoneMatch = rawStep.match(/1-\d{3}-\d{3}-\d{4}|\(\d{3}\)\s?\d{3}-\d{4}/);
  const actionPart = rawStep.split("→")[0].split(":")[0].trim();
  return {
    step_number: index + 1,
    action: actionPart.length > 80 ? actionPart.slice(0, 77) + "…" : actionPart,
    phone: phoneMatch?.[0],
    stage: "Action Steps",
    what_to_ask_for: rawStep,
    goal_of_this_step: "Complete this step to move forward with your housing plan",
    why_it_matters: "This step is required to reach your final housing goal",
    expected_outcome: "Step completed — proceed to the next action",
  };
}

function buildFallbackPlan(plan: ActionPlan, client: Client): ActionPlan {
  const missing = plan.docsMissing.join(", ") || "several documents";
  return {
    ...plan,
    finalGoal: `Achieve stable housing placement through NJ housing programs`,
    summary: `${client.name} is missing ${missing}. This plan provides a step-by-step path to obtain all required documents and access NJ housing programs. Estimated timeline: ${plan.estimatedTime}.`,
    steps: plan.rawSteps.map((s, i) => rawStepToBasicStep(s, i)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Build the prompt sent to Claude
// ─────────────────────────────────────────────────────────────────────────────
function buildPrompt(plan: ActionPlan, client: Client): string {
  const docStatusLines = [
    `Birth Certificate: ${client.documentStatus.birthCert ? "✓ Have" : "✗ Missing"}`,
    `SSN Card: ${client.documentStatus.ssn ? "✓ Have" : "✗ Missing"}`,
    `NJ State ID: ${client.documentStatus.stateId ? "✓ Have" : "✗ Missing"}`,
    `Address Proof: ${client.documentStatus.address ? "✓ Have" : "✗ Missing"}`,
    `Income Proof: ${client.documentStatus.income ? "✓ Have" : "✗ Missing"}`,
  ].join("\n");

  const numberedSteps = plan.rawSteps
    .map((s, i) => `${i + 1}. ${s}`)
    .join("\n");

  return `You are a housing case management specialist helping a shelter worker create a personalized action plan.

RESIDENT: ${client.name}
SHELTER STATUS: ${client.currentShelterStatus}
SPECIAL CIRCUMSTANCE: ${client.specialCircumstance}
PRIORITY: ${plan.priority}
ESTIMATED TIMELINE: ${plan.estimatedTime}

DOCUMENT STATUS:
${docStatusLines}

Reference steps from the housing specialist engine:
${numberedSteps}

Most urgent first action: ${plan.firstAction}
Fastest path summary: ${plan.fastestPath}

Your task: Generate a JSON response that builds a two-phase action plan for ${client.name}'s specific situation.

PHASE STRUCTURE — follow this strictly:

PHASE 1 - DOCUMENT GATHERING: Create one dedicated step for each missing document (${plan.docsMissing.join(", ") || "none"}). Each step must explain exactly where to go, what to bring, what to say, and what to expect. Do not skip to shelter placement before addressing every missing document first.

PHASE 2 - SHELTER PLACEMENT: Only after all document steps, include the steps for making calls and applications to shelters and programs. Each of these steps must specify which documents from Phase 1 are required to complete it.

The why_it_matters field for Phase 1 steps must explain which Phase 2 action that document unlocks. For example: "Without this birth certificate, the shelter application in Step 4 cannot be submitted."
The why_it_matters field for Phase 2 steps must reference which documents are needed and confirm they will have been obtained in Phase 1.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "finalGoal": "One specific sentence describing the exact housing outcome ${client.name} is working toward, referencing their specific situation (circumstance: ${client.specialCircumstance}, missing: ${plan.docsMissing.join(", ") || "none"})",
  "summary": "2–3 sentences explaining why this specific plan fits ${client.name}'s situation. Reference their specific missing documents, circumstance, and what makes their path unique. End with the estimated timeline.",
  "steps": [
    {
      "step_number": 1,
      "action": "Concise action title — verb + what to do (max 60 chars)",
      "phone": "Phone number if this step involves calling someone, else omit this field",
      "address": "Physical address if this step involves going somewhere, else omit this field",
      "stage": "Short stage label (2–4 words) grouping this step with related steps. Use consistent labels: all steps targeting the same document share a stage (e.g. 'Identity Documents', 'Birth Certificate', 'SSN Card'). Phase 2 steps use labels like 'Shelter Application', 'Benefits Enrollment', 'Emergency Placement'. Do not use 'Phase 1' or 'Phase 2' as stage names.",
      "what_to_ask_for": "A word-for-word script for what the shelter manager should say when making this call or visit. It must follow this structure: 1. Opening: how to introduce the situation ('I am a shelter manager calling on behalf of [client name], who is currently homeless and needs...') 2. The specific ask: exactly what document, appointment, service, or confirmation they are requesting 3. Key details to mention: which documents the client has, which are missing, and any special circumstance (e.g. has a minor child, is a veteran, recently released from incarceration) that may affect eligibility or speed up the process 4. The closing ask: what specific next step or commitment to request from the person on the other end (e.g. 'Can you schedule an appointment?' or 'Can you mail the form to this address?') Never write a vague description. Write it as if the shelter manager will read it out loud exactly as written.",
      "goal_of_this_step": "The single concrete thing — document, letter, appointment, case number, or confirmation — that this step must produce. Be specific: not 'get help with housing' but 'obtain a written eligibility determination letter for the City Emergency Shelter Program'.",
      "why_it_matters": "One sentence that explains the specific chain reaction this step triggers. It must name the exact next step or outcome it unlocks. Follow one of these patterns depending on the step type: For document-gathering steps: 'Without [this specific document], you cannot [specific action in a later step] — which is required to [specific program or placement goal].' Example: 'Without the SSN card, the PATH program application in Step 4 cannot be submitted, which is the gateway to emergency shelter placement.' For placement/call steps: 'This call secures [specific thing obtained], which moves [client name] from [current situation] to [next concrete stage in the process].' Example: 'This call secures a case number from the City Housing Authority, which officially places Maria in the emergency queue and triggers the 48-hour placement review.' Never write phrases like 'this is required to reach the final goal', 'this step is crucial for housing', or any other generic statement. Every why_it_matters must name a specific document, step number, program, or outcome that is unique to this step.",
      "expected_outcome": "Concrete, observable result the case worker should expect after this step is done"
    }
  ]
}

Generate as many steps as needed to fully cover both phases. Minimum one step per missing document plus one step per placement action.
Extract any phone numbers (format: 1-XXX-XXX-XXXX or dial XXX) from the reference steps above where relevant.
The "why_it_matters" field is the most critical — make it specific to ${client.name}'s situation, never generic.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export: enrich a raw plan with AI-generated structured steps
// ─────────────────────────────────────────────────────────────────────────────
export async function enrichPlanWithAI(
  plan: ActionPlan,
  client: Client
): Promise<ActionPlan> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn("[planEnricher] ANTHROPIC_API_KEY not set — using fallback steps");
    return buildFallbackPlan(plan, client);
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const prompt = buildPrompt(plan, client);

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const rawContent = message.content[0];
    if (rawContent.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Strip any accidental markdown code fences
    const jsonText = rawContent.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    const parsed = JSON.parse(jsonText) as {
      finalGoal: string;
      summary: string;
      steps: ActionPlanStep[];
    };

    // Validate structure
    if (
      typeof parsed.finalGoal !== "string" ||
      typeof parsed.summary !== "string" ||
      !Array.isArray(parsed.steps)
    ) {
      throw new Error("Claude response missing required fields");
    }

    return {
      ...plan,
      finalGoal: parsed.finalGoal,
      summary: parsed.summary,
      steps: parsed.steps,
    };
  } catch (err) {
    console.error("[planEnricher] AI enrichment failed — falling back to basic steps:", err);
    return buildFallbackPlan(plan, client);
  }
}
