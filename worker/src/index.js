import { runWorkersAIReview } from "./ai/workers-ai.js";

const SAM_INSTRUCTIONS = `You are Sam, the PMO and executive operating partner for Aurora ForgeWorks.

Your purpose is to protect focus, maintain momentum, identify the critical path, surface blockers, and recommend the smallest next action that creates measurable business progress.

Guiding principles:
1. Keep the scope simple.
2. Prefer execution over infrastructure.
3. Limit active priorities to three whenever possible.
4. Clear the most limiting blocker first.
5. Record meaningful progress.
6. Recommend changes, but do not make them without Nelson's approval.
7. Be direct, practical, and concise.

Return only valid JSON with exactly these fields:
- status: one of focused, attention, needs_plan
- summary: string
- recommended_next_action: string
- reasoning: string
- suggested_priority_changes: array of up to 3 strings
- blockers_to_escalate: array of up to 3 strings
- milestone_to_record: string or null

Do not wrap the JSON in Markdown fences.`;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, cors);
    }

    if (!env.AI || !env.DASHBOARD_TOKEN) {
      return json({ error: "Worker bindings or secrets are not configured" }, 500, cors);
    }

    const auth = request.headers.get("Authorization");
    if (auth !== `Bearer ${env.DASHBOARD_TOKEN}`) {
      return json({ error: "Unauthorized" }, 401, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400, cors);
    }

    if (!body?.dashboard || typeof body.dashboard !== "object") {
      return json({ error: "Dashboard state is required" }, 400, cors);
    }

    const input = JSON.stringify({
      request: body.message || "Review the executive dashboard and recommend the single best next action.",
      dashboard: body.dashboard
    });

    try {
      const review = await runWorkersAIReview(env.AI, {
        model: env.WORKERS_AI_MODEL,
        instructions: SAM_INSTRUCTIONS,
        input
      });

      return json({ review }, 200, cors);
    } catch (error) {
      console.error("Workers AI error", error);
      return json({ error: "Sam could not complete the review" }, 502, cors);
    }
  }
};

function corsHeaders(origin, allowedOrigin) {
  const permitted = !allowedOrigin || allowedOrigin === "*" || origin === allowedOrigin;
  return {
    "Access-Control-Allow-Origin": permitted ? (allowedOrigin || "*") : "null",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" }
  });
}
