const DEFAULT_MODEL = "@cf/zai-org/glm-4.7-flash";
const MAX_COMPLETION_TOKENS = 2400;

const OUTPUT_INSTRUCTIONS = `
Return only one valid JSON object matching the requested schema.
Do not include markdown fences, commentary, preambles, or analysis.
Keep every field concise. Produce the final JSON immediately.
`;

export async function runWorkersAIReview(ai, { model, instructions, input }) {
  const result = await ai.run(model || DEFAULT_MODEL, {
    messages: [
      {
        role: "system",
        content: `${instructions.trim()}\n\n${OUTPUT_INSTRUCTIONS.trim()}`
      },
      { role: "user", content: input }
    ],
    temperature: 0.2,
    reasoning_effort: "low",
    response_format: { type: "json_object" },
    max_completion_tokens: MAX_COMPLETION_TOKENS
  });

  console.log(
    "Workers AI response metadata:",
    JSON.stringify({
      model: result?.model,
      finish_reason: result?.choices?.[0]?.finish_reason,
      usage: result?.usage,
      has_content: Boolean(result?.choices?.[0]?.message?.content)
    })
  );

  const output = extractText(result);
  if (!output) {
    const choice = result?.choices?.[0];
    if (choice?.finish_reason === "length") {
      throw new Error(
        `Workers AI reached the ${MAX_COMPLETION_TOKENS}-token completion limit before producing final JSON`
      );
    }

    throw new Error(
      `Workers AI returned no final text (finish_reason: ${choice?.finish_reason || "unknown"})`
    );
  }

  let review;
  try {
    review = JSON.parse(stripCodeFence(output));
  } catch (error) {
    throw new Error(`Workers AI returned invalid JSON: ${error.message}`);
  }

  validateReview(review);
  return review;
}

function extractText(result) {
  if (typeof result === "string") return result;
  if (typeof result?.response === "string") return result.response;
  if (typeof result?.result?.response === "string") return result.result.response;

  const messageContent = result?.choices?.[0]?.message?.content;

  if (typeof messageContent === "string") {
    return messageContent;
  }

  if (Array.isArray(messageContent)) {
    return messageContent
      .filter((part) => part?.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("");
  }

  if (typeof result?.choices?.[0]?.text === "string") {
    return result.choices[0].text;
  }

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
    if (
      !Array.isArray(review[field]) ||
      review[field].length > 3 ||
      review[field].some((item) => typeof item !== "string")
    ) {
      throw new Error(`Invalid ${field}`);
    }
  }

  if (
    review.milestone_to_record !== null &&
    typeof review.milestone_to_record !== "string"
  ) {
    throw new Error("Invalid milestone_to_record");
  }
}
