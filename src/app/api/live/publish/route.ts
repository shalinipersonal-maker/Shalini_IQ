import { z } from "zod";
import { fail, json, withAccount } from "@/server/live-api";
import { metaConfigured, publish } from "@/server/meta";
import { allow } from "@/server/rate-limit";
import { notify } from "@/server/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  mediaId: z.string().uuid(),
  caption: z.string().trim().max(2200, "Instagram captions are limited to 2,200 characters"),
  targetIds: z.array(z.string().uuid()).min(1, "Choose at least one Page or Instagram account"),
});

/** Posts a stored creative to the chosen Facebook Pages and Instagram accounts. */
export async function POST(request: Request) {
  return withAccount(async (a) => {
    if (!metaConfigured()) return fail("The Meta app is not set up yet.", 503);
    if (!allow(request, 0.05, 3)) return fail("Please wait a moment between posts.", 429);
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form", 422);
    const origin = new URL(request.url).origin;
    const results = await publish(a.id, parsed.data.mediaId, `${origin}/api/live/media/${parsed.data.mediaId}`, parsed.data.caption, parsed.data.targetIds);
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
    await notify(`📣 <b>Posted</b>\n${results.map((r) => `${r.ok ? "✅" : "❌"} ${esc(r.name)}${r.ok ? "" : `: ${esc(r.error ?? "")}`}`).join("\n")}`);
    return json({ ok: true, results });
  });
}
