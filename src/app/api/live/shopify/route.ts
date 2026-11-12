import { fail, json, withAccount } from "@/server/live-api";
import { replaceAutoSync } from "@/server/sales";
import { fetchShopifyOrders, shopifyConfigured } from "@/server/shopify";
import { notify } from "@/server/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Reads the last 30 days of Shopify orders and replaces the previous Shopify auto-sync. */
export async function POST() {
  return withAccount(async (a) => {
    if (!shopifyConfigured()) return fail("Shopify is not connected yet (SHOPIFY_STORE_DOMAIN + SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET).", 503);
    const rows = await fetchShopifyOrders(30);
    const saved = await replaceAutoSync(a.id, "Shopify", "Shopify last 30 days", rows);
    await notify(`🔄 Shopify orders synced: ${saved} lines (last 30 days).`);
    return json({ ok: true, rows: saved });
  });
}
