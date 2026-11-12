import "server-only";

/**
 * Claude (Anthropic API) for writing help. Needs ANTHROPIC_API_KEY in Vercel.
 * ANTHROPIC_MODEL is optional (default: a fast, low-cost model).
 */
export const claudeConfigured = () => !!(process.env.ANTHROPIC_API_KEY ?? "").trim();

export async function askClaude(system: string, user: string, maxTokens = 1500): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!.trim(), "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: (process.env.ANTHROPIC_MODEL || "claude-haiku-5-5").trim(), max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    cache: "no-store",
    signal: AbortSignal.timeout(45000),
  });
  const body = (await res.json().catch(() => ({}))) as { content?: { type: string; text?: string }[]; error?: { message?: string } };
  if (!res.ok) throw new Error(`Claude: ${body.error?.message ?? `error ${res.status}`}`);
  return (body.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("").trim();
}

/** Pulls the first {...} JSON object out of a reply. */
export function parseJson<T>(text: string): T {
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  if (s < 0 || e < s) throw new Error("Claude did not return a usable answer. Try again.");
  return JSON.parse(text.slice(s, e + 1)) as T;
}
