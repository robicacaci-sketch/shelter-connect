# CLAUDE CODE FIX V11 — Fix AI roadmap falling back to generic steps

## PROBLEM
Even though the Anthropic API key is now set, new roadmaps still show generic fallback text
(e.g., "Complete this step to move forward with your housing plan"). The `enrichPlanWithAI`
function in `planEnricherService.ts` is silently catching an error and returning `buildFallbackPlan()`.

Two likely root causes:
1. `@anthropic-ai/sdk` is at `^0.80.0` — too old to reliably support `claude-haiku-4-5-20251001`
2. The JSON extraction from the response may be failing if Claude wraps the JSON in extra prose

## STEP 1 — Update the Anthropic SDK

In the `backend/` directory, run:

```bash
npm install @anthropic-ai/sdk@latest
```

Verify the installed version is 0.39.0 or higher (confirm in `backend/node_modules/@anthropic-ai/sdk/package.json`).

---

## STEP 2 — Fix `backend/src/services/planEnricherService.ts`

Make the following targeted changes:

### 2a. Change the model constant (line 5)

OLD:
```ts
const MODEL = "claude-haiku-4-5-20251001"; // Fast + cheap for plan enrichment
```

NEW:
```ts
const MODEL = "claude-haiku-4-5-20251001";
const FALLBACK_MODEL = "claude-3-5-haiku-20241022"; // fallback if primary model unavailable
```

### 2b. Improve the catch block error logging (lines 158–161)

Replace the current catch block:
```ts
  } catch (err) {
    console.error("[planEnricher] AI enrichment failed — falling back to basic steps:", err);
    return buildFallbackPlan(plan, client);
  }
```

With this more detailed version that logs the exact failure reason:
```ts
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : undefined;
    console.error("[planEnricher] AI enrichment FAILED");
    console.error("[planEnricher] Error message:", errMsg);
    if (errStack) console.error("[planEnricher] Stack:", errStack);
    return buildFallbackPlan(plan, client);
  }
```

### 2c. Make JSON extraction more robust (around line 131–141)

Find the section that strips markdown and parses JSON:
```ts
    // Strip any accidental markdown code fences
    const jsonText = rawContent.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    const parsed = JSON.parse(jsonText) as {
```

Replace it with a more robust extractor that finds the JSON object even if Claude adds prose before or after it:
```ts
    // Extract JSON — find the first { and last } to handle any prose wrapping
    const rawText = rawContent.text;
    const jsonStart = rawText.indexOf("{");
    const jsonEnd = rawText.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      console.error("[planEnricher] Could not find JSON in response. Raw response:\n", rawText.slice(0, 500));
      throw new Error("No valid JSON object found in Claude response");
    }
    const jsonText = rawText.slice(jsonStart, jsonEnd + 1).trim();

    let parsed: { finalGoal: string; summary: string; steps: ActionPlanStep[] };
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error("[planEnricher] JSON.parse failed. Extracted text:\n", jsonText.slice(0, 500));
      throw new Error("Failed to parse Claude JSON response");
    }
```

### 2d. Add a retry with fallback model

Replace the `anthropic.messages.create` call block (around lines 120–130):

OLD:
```ts
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
```

NEW — try primary model, retry with fallback if it fails:
```ts
    let message;
    try {
      message = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });
    } catch (modelErr) {
      console.warn(`[planEnricher] Primary model ${MODEL} failed, retrying with ${FALLBACK_MODEL}:`, modelErr instanceof Error ? modelErr.message : modelErr);
      message = await anthropic.messages.create({
        model: FALLBACK_MODEL,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });
    }
```

---

## STEP 3 — Test locally

After making these changes, restart the backend dev server and create a new intake for a test individual with at least 2–3 missing documents. Check the backend terminal logs for any `[planEnricher]` output. You should see either:
- No error logs → AI generated the plan successfully
- A specific error message → use that to diagnose further

---

## CONSTRAINTS
- Do NOT modify `buildFallbackPlan()` or `rawStepToBasicStep()` — these are the safety net
- Do NOT touch any frontend files
- Do NOT touch auth, database schema, or other backend routes
- Only modify `planEnricherService.ts` and run `npm install` in `backend/`
