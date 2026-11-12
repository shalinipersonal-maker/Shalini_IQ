import { fetchOrders, flipkartConfigured } from "@/server/flipkart";
import { fail, json, withAccount } from "@/server/live-api";
import { replaceAutoSync } from "@/server/sales";
import { notify } from "@/server/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Reads the last 30 days of Flipkart orders and replaces the previous Flipkart auto-sync. */
export async function POST() {
  return withAccount(async (a) => {
    if (!flipkartConfigured()) return fail("Flipkart is not connected yet (FLIPKART_APP_ID / FLIPKART_APP_SECRET).", 503);
    const { rows, partial } = await fetchOrders(30);
    const saved = await replaceAutoSync(a.id, "Flipkart", "Flipkart last 30 days", rows);
    await notify(`🔄 Flipkart orders synced: ${saved} lines (last 30 days).`);
    return json({ ok: true, rows: saved, partial });
  });
}
