import { z } from "zod";
import { askClaude, claudeConfigured, parseJson } from "@/server/claude";
import { fail, json, withAccount } from "@/server/live-api";
import { allow } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const input = z.object({
  marketplace: z.enum(["amazon", "flipkart", "myntra"]),
  brand: z.string().max(80), title: z.string().min(3).max(400), bullets: z.string().max(4000), description: z.string().max(6000),
  faq: z.string().max(4000), price: z.string().max(40), sku: z.string().max(80),
  missing: z.array(z.string().max(300)).max(60),
});

const SYSTEM = `You improve Indian marketplace product listings (Amazon.in, Flipkart, Myntra) for a small jewellery and ornaments shop.
Goal: rank in marketplace and Google search (SEO), answer buyer questions (AEO), be easy for AI assistants to quote (GEO),
suit Google AI Overviews (AIO) and AI shopping agents (AXO).
Rules: never invent facts that are not given (material, size, weight, purity, certification, delivery days, returns) — where a fact is needed but unknown,
write it as [add …] so the seller fills it in. No hype words (best, No.1, guaranteed, 100%). Plain, warm Indian English.
Title: brand first, then product type, key material/colour/size, under the marketplace limit (Amazon 200, Flipkart 150, Myntra 100 characters).
5 key points, each starting with a short benefit in capitals followed by a colon. Description: one-sentence summary first, then 2 short paragraphs.
4–6 FAQs a buyer would really ask, formatted "Q: …? A: …".
Reply with JSON only: {"title":"","bullets":["",""],"description":"","faq":["Q: …? A: …"],"keywords":[""],"tips":[""]}`;

export async function POST(request: Request) {
  return withAccount(async () => {
    if (!claudeConfigured()) return fail("AI is not switched on yet. Add ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables, then redeploy.", 503);
    if (!allow(request, 0.2, 5)) return fail("Please wait a few seconds and try again.", 429);
    const parsed = input.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail("Type at least a title first.");
    const v = parsed.data;
    const user = [
      `Marketplace: ${v.marketplace}`, `Brand: ${v.brand || "(not given)"}`, `Price: ${v.price || "(not given)"}`, `SKU: ${v.sku || "(not given)"}`,
      `Title: ${v.title}`, `Key points:\n${v.bullets || "(none)"}`, `Description:\n${v.description || "(none)"}`, `FAQs:\n${v.faq || "(none)"}`,
      `Problems found by the checker:\n${v.missing.map((m) => `- ${m}`).join("\n") || "(none)"}`,
      "Rewrite the listing to fix every problem.",
    ].join("\n\n");
    const out = parseJson<{ title?: string; bullets?: string[]; description?: string; faq?: string[]; keywords?: string[]; tips?: string[] }>(await askClaude(SYSTEM, user));
    return json({
      ok: true,
      title: String(out.title ?? "").slice(0, 400),
      bullets: (out.bullets ?? []).map(String).slice(0, 10),
      description: String(out.description ?? "").slice(0, 6000),
      faq: (out.faq ?? []).map(String).slice(0, 10),
      keywords: (out.keywords ?? []).map(String).slice(0, 20),
      tips: (out.tips ?? []).map(String).slice(0, 8),
    });
  });
}
