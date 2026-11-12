import "server-only";
import type { MappedRow } from "@/lib/live/csv";

/**
 * Shopify Admin API (GraphQL) for one store.
 * SHOPIFY_STORE_DOMAIN  e.g. yauug8-j8.myshopify.com
 * Either SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET (Dev Dashboard app, the 2026 way: exchanged for a
 * ~24-hour token automatically) or SHOPIFY_ADMIN_TOKEN (an older shpat_ token, if the store still has one).
 * Scopes needed: read_orders, read_products.
 */
const VERSION = process.env.SHOPIFY_API_VERSION || "2026-07";
const domain = () => (process.env.SHOPIFY_STORE_DOMAIN ?? "").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

export const shopifyConfigured = () => !!domain() && (!!process.env.SHOPIFY_ADMIN_TOKEN || (!!process.env.SHOPIFY_CLIENT_ID && !!process.env.SHOPIFY_CLIENT_SECRET));

let cached: { token: string; until: number } | null = null;
async function token(): Promise<string> {
  if (process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN.trim();
  if (cached && cached.until > Date.now()) return cached.token;
  const res = await fetch(`https://${domain()}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID!.trim(), client_secret: process.env.SHOPIFY_CLIENT_SECRET!.trim(), grant_type: "client_credentials" }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !body.access_token) throw new Error(`Shopify sign-in failed: ${body.error_description ?? body.error ?? res.status}`);
  cached = { token: body.access_token, until: Date.now() + Math.max(600, (body.expires_in ?? 86400) - 600) * 1000 };
  return body.access_token;
}

export async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`https://${domain()}/admin/api/${VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": await token() },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const body = (await res.json().catch(() => ({}))) as { data?: T; errors?: { message?: string }[] | string };
  if (!res.ok || body.errors) {
    const msg = typeof body.errors === "string" ? body.errors : body.errors?.[0]?.message;
    throw new Error(`Shopify: ${msg ?? `error ${res.status}`}`);
  }
  return body.data as T;
}

export async function shopInfo(): Promise<{ name: string; url: string }> {
  const d = await gql<{ shop: { name: string; primaryDomain: { url: string } } }>(`{ shop { name primaryDomain { url } } }`);
  return { name: d.shop.name, url: d.shop.primaryDomain.url.replace(/\/$/, "") };
}

interface OrderNode {
  id: string; name: string; createdAt: string; cancelledAt: string | null; displayFinancialStatus: string | null;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  customer: { firstName: string | null } | null;
  lineItems: { nodes: { sku: string | null; title: string; quantity: number; originalTotalSet: { shopMoney: { amount: string } } }[] };
}
const ORDERS = `query($q: String!, $after: String) {
  orders(first: 50, after: $after, query: $q, sortKey: CREATED_AT, reverse: true) {
    pageInfo { hasNextPage endCursor }
    nodes { id name createdAt cancelledAt displayFinancialStatus totalPriceSet { shopMoney { amount currencyCode } } customer { firstName }
      lineItems(first: 50) { nodes { sku title quantity originalTotalSet { shopMoney { amount } } } } }
  }
}`;

async function ordersSince(sinceIso: string, max = 1000): Promise<OrderNode[]> {
  const out: OrderNode[] = [];
  let after: string | null = null;
  for (let i = 0; i < 20 && out.length < max; i++) {
    const d: { orders: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: OrderNode[] } } = await gql(ORDERS, { q: `created_at:>='${sinceIso}'`, after });
    out.push(...d.orders.nodes);
    if (!d.orders.pageInfo.hasNextPage) break;
    after = d.orders.pageInfo.endCursor;
  }
  return out;
}

/** Last `days` days of orders as sales rows (one row per line item). Cancelled and voided orders are left out. */
export async function fetchShopifyOrders(days = 30): Promise<MappedRow[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const orders = await ordersSince(since);
  const rows: MappedRow[] = [];
  for (const o of orders) {
    if (o.cancelledAt || o.displayFinancialStatus === "VOIDED") continue;
    for (const li of o.lineItems.nodes) {
      rows.push({ date: o.createdAt.slice(0, 10), orderId: o.name, sku: li.sku || null, title: li.title.slice(0, 300), quantity: li.quantity, amount: Number(li.originalTotalSet.shopMoney.amount) || 0 });
    }
  }
  return rows;
}

/** Orders created after `sinceIso` (newest first) — used for "new order" alerts. */
export async function newOrders(sinceIso: string): Promise<{ name: string; total: string; currency: string; items: string; customer: string; createdAt: string }[]> {
  const orders = await ordersSince(sinceIso, 50);
  return orders.filter((o) => o.createdAt > sinceIso && !o.cancelledAt).map((o) => ({
    name: o.name, total: o.totalPriceSet.shopMoney.amount, currency: o.totalPriceSet.shopMoney.currencyCode,
    items: o.lineItems.nodes.map((l) => `${l.quantity}× ${l.title}`).join(", ").slice(0, 200), customer: o.customer?.firstName ?? "", createdAt: o.createdAt,
  }));
}

export interface ShopProduct { id: string; title: string; url: string; price: string; image: string | null }
/** Active products with their public page link, for "Buy now" links and product photos in posts. */
export async function listProducts(): Promise<ShopProduct[]> {
  const [info, d] = await Promise.all([
    shopInfo(),
    gql<{ products: { nodes: { id: string; title: string; handle: string; status: string; onlineStoreUrl: string | null; featuredMedia: { preview: { image: { url: string } | null } | null } | null; variants: { nodes: { price: string }[] } }[] } }>(
      `{ products(first: 100, sortKey: UPDATED_AT, reverse: true, query: "status:active") { nodes { id title handle status onlineStoreUrl featuredMedia { preview { image { url } } } variants(first: 1) { nodes { price } } } } }`),
  ]);
  return d.products.nodes.map((p) => ({
    id: p.id, title: p.title, url: p.onlineStoreUrl ?? `${info.url}/products/${p.handle}`,
    price: p.variants.nodes[0]?.price ?? "", image: p.featuredMedia?.preview?.image?.url ?? null,
  }));
}
