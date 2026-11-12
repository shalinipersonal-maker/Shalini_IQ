import { eachDay } from "../dates";
import type { AdPlatform, AdRow, Campaign, Dataset, InventoryRecord, Marketplace, MarketplaceFilter, Product, SalesRow } from "../demo/types";

export interface Scope {
  ds: Dataset;
  campaigns: Campaign[]; // seeded campaigns with local demo edits applied, plus locally created ones
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  days: number;
  marketplace: MarketplaceFilter;
}

export interface SalesTotals { revenue: number; orders: number; units: number; sessions: number; returns: number; cancellations: number }
export interface AdTotals { spend: number; impressions: number; clicks: number; conversions: number; revenue: number; reach: number; days: number }

const mpOf = (c: Campaign): Marketplace => (c.platform === "amazon_ads" ? "amazon" : c.platform === "flipkart_ads" ? "flipkart" : c.destination);

export function salesRows(ds: Dataset, from: string, to: string, mp: MarketplaceFilter = "all", productId?: string): SalesRow[] {
  return ds.sales.filter((r) => r.date >= from && r.date <= to && (mp === "all" || r.marketplace === mp) && (!productId || r.productId === productId));
}
export function sumSales(rows: SalesRow[]): SalesTotals {
  const t = { revenue: 0, orders: 0, units: 0, sessions: 0, returns: 0, cancellations: 0 };
  for (const r of rows) {
    t.revenue += r.revenue; t.orders += r.orders; t.units += r.units; t.sessions += r.sessions; t.returns += r.returns; t.cancellations += r.cancellations;
  }
  return t;
}
export interface AdFilter { mp?: MarketplaceFilter; platform?: AdPlatform | "all"; campaignId?: string }
export function adRows(scope: Pick<Scope, "ds" | "campaigns">, from: string, to: string, f: AdFilter = {}): AdRow[] {
  const cmap = new Map(scope.campaigns.map((c) => [c.id, c]));
  return scope.ds.ads.filter((r) => {
    if (r.date < from || r.date > to) return false;
    if (f.campaignId && r.campaignId !== f.campaignId) return false;
    const c = cmap.get(r.campaignId);
    if (!c) return false;
    if (f.platform && f.platform !== "all" && c.platform !== f.platform) return false;
    if (f.mp && f.mp !== "all" && mpOf(c) !== f.mp) return false;
    return true;
  });
}
export function sumAds(rows: AdRow[]): AdTotals {
  const t = { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0, reach: 0, days: 0 };
  const days = new Set<string>();
  for (const r of rows) {
    t.spend += r.spend; t.impressions += r.impressions; t.clicks += r.clicks; t.conversions += r.conversions; t.revenue += r.revenue; t.reach += r.reach;
    days.add(r.date);
  }
  t.days = days.size;
  return t;
}
export function groupAds<K extends string>(rows: AdRow[], key: (r: AdRow) => K | undefined): Map<K, AdTotals> {
  const buckets = new Map<K, AdRow[]>();
  for (const r of rows) {
    const k = key(r);
    if (k === undefined) continue;
    (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(r);
  }
  return new Map([...buckets].map(([k, v]) => [k, sumAds(v)]));
}

const safe = (a: number, b: number) => (b > 0 ? a / b : NaN);
/** Standard advertising ratios. ROAS and ACOS use the platform's own attributed revenue. */
export function adRatios(t: AdTotals) {
  return {
    roas: safe(t.revenue, t.spend),
    acos: safe(t.spend, t.revenue),
    ctr: safe(t.clicks, t.impressions),
    cpc: safe(t.spend, t.clicks),
    cpm: safe(t.spend * 1000, t.impressions),
    cvr: safe(t.conversions, t.clicks),
    cpa: safe(t.spend, t.conversions),
    avgDailyReach: safe(t.reach, t.days),
    frequency: safe(t.impressions, t.reach),
  };
}

export interface Kpis {
  sales: SalesTotals;
  ads: AdTotals;
  aov: number;
  conversionRate: number;
  roas: number;
  acos: number;
  tacos: number;
}
export function kpis(scope: Scope, from = scope.from, to = scope.to): Kpis {
  const sales = sumSales(salesRows(scope.ds, from, to, scope.marketplace));
  const ads = sumAds(adRows(scope, from, to, { mp: scope.marketplace }));
  return {
    sales, ads,
    aov: safe(sales.revenue, sales.orders),
    conversionRate: safe(sales.orders, sales.sessions),
    roas: safe(ads.revenue, ads.spend),
    acos: safe(ads.spend, ads.revenue),
    tacos: safe(ads.spend, sales.revenue), // total ad spend ÷ total sales
  };
}

export interface DayPoint {
  date: string; revenue: number; orders: number; units: number; amazon: number; flipkart: number; amazonOrders: number; flipkartOrders: number;
  spend: number; adRevenue: number; amazon_ads: number; flipkart_ads: number; meta: number; clicks: number; impressions: number; conversions: number;
}
export function dailySeries(scope: Scope, from = scope.from, to = scope.to, f: AdFilter = { mp: scope.marketplace }): DayPoint[] {
  const map = new Map<string, DayPoint>(eachDay(from, to).map((d) => [d, { date: d, revenue: 0, orders: 0, units: 0, amazon: 0, flipkart: 0, amazonOrders: 0, flipkartOrders: 0, spend: 0, adRevenue: 0, amazon_ads: 0, flipkart_ads: 0, meta: 0, clicks: 0, impressions: 0, conversions: 0 }]));
  for (const r of salesRows(scope.ds, from, to, f.mp ?? "all")) {
    const p = map.get(r.date)!;
    p.revenue += r.revenue; p.orders += r.orders; p.units += r.units;
    p[r.marketplace] += r.revenue;
    p[r.marketplace === "amazon" ? "amazonOrders" : "flipkartOrders"] += r.orders;
  }
  const cmap = new Map(scope.campaigns.map((c) => [c.id, c]));
  for (const r of adRows(scope, from, to, f)) {
    const p = map.get(r.date)!;
    p.spend += r.spend; p.adRevenue += r.revenue; p.clicks += r.clicks; p.impressions += r.impressions; p.conversions += r.conversions;
    p[cmap.get(r.campaignId)!.platform] += r.spend;
  }
  return [...map.values()];
}

export type Bucket = "day" | "week" | "month";
export function bucketSeries(points: DayPoint[], bucket: Bucket, keyOf: (iso: string) => string): DayPoint[] {
  if (bucket === "day") return points;
  const out = new Map<string, DayPoint>();
  for (const p of points) {
    const k = keyOf(p.date);
    const b = out.get(k);
    if (!b) out.set(k, { ...p, date: k });
    else (Object.keys(p) as (keyof DayPoint)[]).forEach((f) => { if (f !== "date") (b[f] as number) += p[f] as number; });
  }
  return [...out.values()];
}

export interface ProductStat {
  product: Product; revenue: number; units: number; orders: number; sessions: number; returns: number; prevRevenue: number; growth: number | null;
  conversionRate: number; share: number; status: "Top performer" | "Growing" | "Stable" | "Declining";
  byMp: Record<Marketplace, number>;
}
export function productStats(scope: Scope): ProductStat[] {
  const cur = new Map<string, SalesTotals & { amazon: number; flipkart: number }>();
  for (const r of salesRows(scope.ds, scope.from, scope.to, scope.marketplace)) {
    const t = cur.get(r.productId) ?? cur.set(r.productId, { revenue: 0, orders: 0, units: 0, sessions: 0, returns: 0, cancellations: 0, amazon: 0, flipkart: 0 }).get(r.productId)!;
    t.revenue += r.revenue; t.orders += r.orders; t.units += r.units; t.sessions += r.sessions; t.returns += r.returns; t[r.marketplace] += r.revenue;
  }
  const prev = new Map<string, number>();
  for (const r of salesRows(scope.ds, scope.prevFrom, scope.prevTo, scope.marketplace)) prev.set(r.productId, (prev.get(r.productId) ?? 0) + r.revenue);
  const total = [...cur.values()].reduce((s, t) => s + t.revenue, 0);
  const list = scope.ds.products
    .filter((p) => scope.marketplace === "all" || p.listings.includes(scope.marketplace))
    .map((product) => {
      const t = cur.get(product.id) ?? { revenue: 0, orders: 0, units: 0, sessions: 0, returns: 0, cancellations: 0, amazon: 0, flipkart: 0 };
      const prevRevenue = prev.get(product.id) ?? 0;
      const growth = prevRevenue > 0 ? (t.revenue - prevRevenue) / prevRevenue : null;
      return { product, revenue: t.revenue, units: t.units, orders: t.orders, sessions: t.sessions, returns: t.returns, prevRevenue, growth, conversionRate: safe(t.orders, t.sessions), share: safe(t.revenue, total), status: "Stable" as ProductStat["status"], byMp: { amazon: t.amazon, flipkart: t.flipkart } };
    })
    .sort((a, b) => b.revenue - a.revenue);
  list.forEach((s, i) => {
    const g = s.growth ?? 0;
    s.status = g <= -0.12 ? "Declining" : i < 3 && g >= -0.03 ? "Top performer" : g >= 0.12 ? "Growing" : "Stable";
  });
  return list;
}

export type StockStatus = "Out of stock" | "Critical" | "Low" | "Healthy" | "Overstock";
export function stockInfo(r: InventoryRecord) {
  const cover = r.dailyVelocity > 0 ? r.onHand / r.dailyVelocity : Infinity;
  const status: StockStatus = r.onHand === 0 ? "Out of stock" : cover < 7 ? "Critical" : cover < 14 ? "Low" : cover > 75 ? "Overstock" : "Healthy";
  return { cover, status };
}
export function inventoryFor(ds: Dataset, mp: MarketplaceFilter) {
  const pmap = new Map(ds.products.map((p) => [p.id, p]));
  return ds.inventory.filter((r) => mp === "all" || r.marketplace === mp).map((r) => ({ ...r, product: pmap.get(r.productId)!, ...stockInfo(r) }));
}
export { mpOf as campaignMarketplace };
