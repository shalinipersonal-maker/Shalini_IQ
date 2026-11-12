import { flipkartConfigured, fetchOrders } from "@/server/flipkart";
import { watch } from "@/server/health";
import { ownerAccountId } from "@/server/overview";
import { sendDueReport } from "@/server/reports";
import { replaceAutoSync } from "@/server/sales";
import { notify } from "@/server/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Runs every morning (vercel.json): refreshes Flipkart orders, then sends Shalini the report on Telegram. */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Forbidden", { status: 403 });
  const acc = await ownerAccountId();
  if (!acc) return Response.json({ ok: false, reason: "no account yet" });
  let synced = "";
  if (flipkartConfigured()) {
    try { const { rows } = await fetchOrders(30); await replaceAutoSync(acc, "Flipkart", "Flipkart last 30 days", rows); synced = `\n🔄 Flipkart orders refreshed (${rows.length} lines).`; }
    catch (e) { synced = `\n⚠️ Flipkart refresh failed: ${e instanceof Error ? e.message : "error"}`; }
  }
  await watch().catch(() => null);
  // The 9 AM report (sent once; the watchdog sends it instead if it gets there first).
  const sent = await sendDueReport(synced).catch(() => null);
  if (!sent && synced) await notify(synced.trim());
  return Response.json({ ok: true });
}
