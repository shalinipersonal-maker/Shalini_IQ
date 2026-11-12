import "server-only";
import type { MappedRow } from "@/lib/live/csv";

/**
 * Flipkart Marketplace Seller API, self-access application (Seller Hub → Manage Profile → Developer Access).
 * FLIPKART_APP_ID / FLIPKART_APP_SECRET, client-credentials token, then the v3 shipments filter.
 * Orders that are being packed, shipped or delivered in the last N days are read; cancelled ones are not.
 */
const API = "https://api.flipkart.net";

export const flipkartConfigured = () => !!process.env.FLIPKART_APP_ID && !!process.env.FLIPKART_APP_SECRET;

async function token(): Promise<string> {
  const basic = Buffer.from(`${process.env.FLIPKART_APP_ID}:${process.env.FLIPKART_APP_SECRET}`).toString("base64");
  const res = await fetch(`${API}/oauth-service/oauth/token?grant_type=client_credentials&scope=Seller_Api`, {
    headers: { Authorization: `Basic ${basic}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  if (!res.ok || !body.access_token) throw new Error(`Flipkart sign-in failed: ${body.error_description ?? res.status}`);
  return body.access_token;
}

interface Item { orderId?: string; orderItemId?: string; sku?: string; fsn?: string; quantity?: number; orderDate?: string; priceComponents?: { totalPrice?: number; sellingPrice?: number; customerPrice?: number } }
interface Page { shipments?: { orderItems?: Item[] }[]; hasMore?: boolean; nextPageUrl?: string }

const FILTERS = [
  { type: "preDispatch", states: ["APPROVED", "PACKING_IN_PROGRESS", "PACKED", "FORM_FAILED", "READY_TO_DISPATCH"] },
  { type: "postDispatch", states: ["SHIPPED", "DELIVERED", "PICKUP_COMPLETE"] },
];

/** Orders from the last `days` days, as sales rows. Stops early if Flipkart has more than the time allows. */
export async function fetchOrders(days = 30): Promise<{ rows: MappedRow[]; partial: boolean }> {
  const auth = { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json", Accept: "application/json" };
  const ist = (d: Date) => new Date(d.getTime() + 5.5 * 3600000).toISOString().slice(0, 19) + "+05:30";
  const orderDate = { from: ist(new Date(Date.now() - days * 86400000)), to: ist(new Date()) };
  const rows: MappedRow[] = [];
  const seen = new Set<string>();
  const deadline = Date.now() + 45000;
  let partial = false;

  for (const f of FILTERS) {
    let res = await fetch(`${API}/sellers/v3/shipments/filter/`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ filter: { type: f.type, states: f.states, orderDate }, pagination: { pageSize: 20 } }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    for (;;) {
      if (!res.ok) throw new Error(`Flipkart orders: error ${res.status}`);
      const page = (await res.json()) as Page;
      for (const s of page.shipments ?? []) {
        for (const it of s.orderItems ?? []) {
          const key = it.orderItemId ?? `${it.orderId}-${it.sku}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const p = it.priceComponents ?? {};
          rows.push({
            date: it.orderDate ? it.orderDate.slice(0, 10) : null,
            orderId: it.orderId ?? null,
            sku: it.sku ?? it.fsn ?? null,
            title: it.sku ?? null, // Flipkart's order list has no product name; the SKU is shown instead
            quantity: typeof it.quantity === "number" ? it.quantity : null,
            amount: p.totalPrice ?? p.sellingPrice ?? p.customerPrice ?? null,
          });
        }
      }
      if (!page.hasMore || !page.nextPageUrl) break;
      if (Date.now() > deadline) { partial = true; break; }
      const next = page.nextPageUrl.startsWith("http") ? page.nextPageUrl : `${API}/sellers${page.nextPageUrl.startsWith("/") ? "" : "/"}${page.nextPageUrl}`;
      res = await fetch(next, { headers: auth, cache: "no-store", signal: AbortSignal.timeout(20000) });
    }
  }
  return { rows, partial };
}
