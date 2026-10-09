// The only file that talks to the model provider. Swap it out without touching the flow.
import { env } from "../../config/env.ts";

export type ModelResult = { output: unknown; raw: string; model: string };
export interface Top3Model {
  call(input: { system: string; user: string }, signal: AbortSignal): Promise<ModelResult>;
}

const TOOL = {
  name: "submit_top3",
  description: "Submit the 3 best candidates, best first, with reasons.",
  input_schema: {
    type: "object",
    properties: {
      top3: {
        type: "array", minItems: 3, maxItems: 3,
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "Candidate alias such as C3" },
            strengths: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
            risks: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
            questions: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
          },
          required: ["id", "strengths", "risks", "questions"],
        },
      },
    },
    required: ["top3"],
  },
};

/** "Call AI model: structured JSON output" - forced tool call, so the answer is JSON by construction. */
export function anthropicModel(apiKey: string): Top3Model {
  return {
    async call({ system, user }, signal) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal,
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: env.AI_MODEL, max_tokens: 2000, system,
          messages: [{ role: "user", content: user }],
          tools: [TOOL], tool_choice: { type: "tool", name: TOOL.name },
        }),
      });
      if (!res.ok) throw new Error(`model HTTP ${res.status}`);
      const body = (await res.json()) as { model?: string; content?: { type: string; name?: string; input?: unknown }[] };
      const block = body.content?.find((b) => b.type === "tool_use" && b.name === TOOL.name);
      return { output: block?.input, raw: JSON.stringify(body.content ?? []), model: body.model ?? env.AI_MODEL };
    },
  };
}

export const defaultModel = (): Top3Model | null => (env.ANTHROPIC_API_KEY ? anthropicModel(env.ANTHROPIC_API_KEY) : null);
