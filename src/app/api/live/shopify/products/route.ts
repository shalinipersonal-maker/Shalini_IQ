import { fail, json, withAccount } from "@/server/live-api";
import { listProducts, shopifyConfigured } from "@/server/shopify";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAccount(async () => {
    if (!shopifyConfigured()) return fail("Shopify is not connected yet.", 503);
    return json({ ok: true, products: await listProducts() });
  });
}
