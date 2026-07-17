const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";

export async function runWorkersAIReview(ai, { model, instructions, input }) {
  const result = await ai.run(model || DEFAULT_MODEL, {
    messages: [
      { role: "system", content: instructions },
      { role: "user", content: input }
    ],
    temperature: 0.2,
    max_tokens: 900
  });

  const output = extractText(result);
  if (!output) {
    throw new Error("Workers AI returned no text");
  }

  const review = JSON.parse(stripCodeFence(output));
  validateReview(review);
  return review;
}

function extractText(result) {
  if (typeof result === "string") return result;
  if (typeof result?.response === "string") return result.response;
  if (typeof result?.result?.response === "string") return result.result.response;
  return "";
}

function stripCodeFence(value) {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function validateReview(review) {
  const statuses = new Set(["focused", "attention", "needs_plan"]);
  if (!review || typeof review !== "object" || Array.isArray(review)) {
    throw new Error("Invalid review object");
  }
  if (!statuses.has(review.status)) throw new Error("Invalid review status");

  for (const field of ["summary", "recommended_next_action", "reasoning"]) {
    if (typeof review[field] !== "string") throw new Error(`Invalid ${field}`);
  }

  for (const field of ["suggested_priority_changes", "blockers_to_escalate"]) {
    if (!Array.isArray(review[field]) || review[field].length > 3 || review[field].some((item) => typeof item !== "string")) {
      throw new Error(`Invalid ${field}`);
    }
  }

  if (review.milestone_to_record !== null && typeof review.milestone_to_record !== "string") {
    throw new Error("Invalid milestone_to_record");
  }
}
