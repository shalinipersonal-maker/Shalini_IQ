import { z } from "zod";
import { amazonConfigured, checkReport, requestReport } from "@/server/amazon";
import { fail, json, withAccount } from "@/server/live-api";
import { replaceAutoSync } from "@/server/sales";
import { notify } from "@/server/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({ reportId: z.string().max(100).optional() });

/**
 * Amazon sync in two steps (Amazon prepares reports in the background):
 * POST {}            → asks for the last-30-days orders report, returns { reportId }
 * POST { reportId }  → { state: "waiting" } until ready, then imports it and returns { state: "done", rows }
 */
export async function POST(request: Request) {
  return withAccount(async (a) => {
    if (!amazonConfigured()) return fail("Amazon is not connected yet (AMAZON_SP_CLIENT_ID / AMAZON_SP_CLIENT_SECRET / AMAZON_SP_REFRESH_TOKEN).", 503);
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return fail("Bad request", 422);
    if (!parsed.data.reportId) return json({ ok: true, state: "requested", reportId: await requestReport(30) });
    const r = await checkReport(parsed.data.reportId);
    if (r.state === "waiting") return json({ ok: true, state: "waiting" });
    if (r.state === "failed") return fail(r.message, 502);
    const rows = await replaceAutoSync(a.id, "Amazon", "Amazon last 30 days", r.rows);
    await notify(`🔄 Amazon orders synced: ${rows} lines (last 30 days).`);
    return json({ ok: true, state: "done", rows });
  });
}
