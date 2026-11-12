import { flipkartConfigured, fetchOrders } from "@/server/flipkart";
import { watch } from "@/server/health";
import { listPosts } from "@/server/meta";
import { overview, ownerAccountId } from "@/server/overview";
import { replaceAutoSync } from "@/server/sales";
import { dailyReport, notify } from "@/server/telegram";

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
  await listPosts(acc, true).catch(() => null);
  await notify(dailyReport(await overview(acc)) + synced);
  return Response.json({ ok: true });
}
