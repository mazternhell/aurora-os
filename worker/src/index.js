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

Return only the requested structured JSON.`;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["focused", "attention", "needs_plan"] },
    summary: { type: "string" },
    recommended_next_action: { type: "string" },
    reasoning: { type: "string" },
    suggested_priority_changes: {
      type: "array",
      items: { type: "string" },
      maxItems: 3
    },
    blockers_to_escalate: {
      type: "array",
      items: { type: "string" },
      maxItems: 3
    },
    milestone_to_record: { type: ["string", "null"] }
  },
  required: [
    "status",
    "summary",
    "recommended_next_action",
    "reasoning",
    "suggested_priority_changes",
    "blockers_to_escalate",
    "milestone_to_record"
  ]
};

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

    if (!env.OPENAI_API_KEY || !env.DASHBOARD_TOKEN) {
      return json({ error: "Worker secrets are not configured" }, 500, cors);
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

    const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "gpt-5-mini",
        instructions: SAM_INSTRUCTIONS,
        input,
        text: {
          format: {
            type: "json_schema",
            name: "aurora_pmo_review",
            strict: true,
            schema: RESPONSE_SCHEMA
          }
        }
      })
    });

    const responseBody = await openAIResponse.json();
    if (!openAIResponse.ok) {
      console.error("OpenAI error", responseBody);
      return json({ error: "Sam could not complete the review" }, 502, cors);
    }

    const outputText = extractOutputText(responseBody);
    if (!outputText) {
      return json({ error: "Sam returned no structured response" }, 502, cors);
    }

    try {
      return json({ review: JSON.parse(outputText) }, 200, cors);
    } catch {
      return json({ error: "Sam returned invalid structured data" }, 502, cors);
    }
  }
};

function extractOutputText(response) {
  if (typeof response.output_text === "string") return response.output_text;
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return "";
}

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
