import { watch } from "@/server/health";
import { sendDueReport } from "@/server/reports";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Called every 15 minutes by the watchdog (GitHub Actions) with the CRON_SECRET. Returns 200 when all is well. */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Forbidden", { status: 403 });
  const { checks, changed } = await watch();
  const report = await sendDueReport().catch(() => null); // 9 AM, 12 PM, 6 PM, 9 PM IST
  const failing = checks.filter((c) => !c.ok);
  return Response.json({ ok: failing.length === 0, failing: failing.map((c) => c.label), changed, report }, { status: failing.length ? 207 : 200 });
}
