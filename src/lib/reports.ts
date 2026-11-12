import { computeInsights, CATEGORY_LABEL, type InsightSettings } from "./ai/insights";
import { adRatios, adRows, dailySeries, groupAds, inventoryFor, kpis, productStats, salesRows, sumAds, sumSales, type Scope } from "./analytics/metrics";
import { fmtDate } from "./dates";
import { MP_LABEL, PLATFORM_LABEL, type AdPlatform, type Marketplace } from "./demo/types";
import { inr, mult, num, pct } from "./format";

export type ReportType = "sales" | "advertising" | "marketplace" | "product" | "campaign" | "ai";
export const REPORT_TYPES: { id: ReportType; label: string; blurb: string }[] = [
  { id: "sales", label: "Sales report", blurb: "Daily revenue, orders and average order value" },
  { id: "advertising", label: "Advertising report", blurb: "Spend and returns by ad platform" },
  { id: "marketplace", label: "Marketplace report", blurb: "Amazon and Flipkart side by side" },
  { id: "product", label: "Product report", blurb: "Sales, growth and stock for every product" },
  { id: "campaign", label: "Campaign report", blurb: "Every campaign with spend, ROAS and ACOS" },
  { id: "ai", label: "AI performance summary", blurb: "Findings and recommended actions" },
];
type Kind = "text" | "inr" | "num" | "pct" | "mult";
type Cell = string | number;
export interface Report {
  type: ReportType;
  title: string;
  client: string;
  period: string;
  scopeNote: string;
  summary: { label: string; value: string }[];
  columns: { label: string; kind: Kind }[];
  rows: Cell[][];
  notes: string[];
}

export const formatCell = (v: Cell, kind: Kind) => (typeof v === "string" ? v : kind === "inr" ? inr(v) : kind === "pct" ? pct(v) : kind === "mult" ? mult(v) : num(v));

export function buildReport(type: ReportType, scope: Scope, cfg: InsightSettings): Report {
  const k = kpis(scope);
  const base = {
    type, client: scope.ds.client.name, period: `${fmtDate(scope.from)} – ${fmtDate(scope.to)}`,
    scopeNote: scope.marketplace === "all" ? "All marketplaces" : `${MP_LABEL[scope.marketplace]} only`,
    title: REPORT_TYPES.find((r) => r.id === type)!.label,
  };
  const c = (label: string, kind: Kind = "text") => ({ label, kind });
  const DEMO = "Demo environment: figures are sample data and are not connected to live marketplace or advertising accounts.";
  const ATTR = "Attributed revenue is reported by each ad platform for its own ads. Platforms can credit the same order, so attributed figures are not additive to total sales.";
  const mps = (scope.marketplace === "all" ? ["amazon", "flipkart"] : [scope.marketplace]) as Marketplace[];
  const rows = adRows(scope, scope.from, scope.to, { mp: scope.marketplace });
  const salesSummary = [{ label: "Revenue", value: inr(k.sales.revenue) }, { label: "Orders", value: num(k.sales.orders) }, { label: "Average order value", value: inr(k.aov) }, { label: "Conversion rate", value: pct(k.conversionRate) }];
  const adSummary = [{ label: "Ad spend", value: inr(k.ads.spend) }, { label: "Attributed revenue", value: inr(k.ads.revenue) }, { label: "ROAS", value: mult(k.roas) }, { label: "TACOS", value: pct(k.tacos) }];

  switch (type) {
    case "sales":
      return { ...base, summary: salesSummary, notes: [DEMO],
        columns: [c("Date"), c("Revenue", "inr"), c("Orders", "num"), c("Units", "num"), c("AOV", "inr"), ...mps.map((m) => c(`${MP_LABEL[m]} revenue`, "inr"))],
        rows: dailySeries(scope).map((d) => [d.date, d.revenue, d.orders, d.units, d.orders ? d.revenue / d.orders : 0, ...mps.map((m) => d[m])]) };
    case "advertising": {
      const cmap = new Map(scope.campaigns.map((x) => [x.id, x]));
      const byP = groupAds(rows, (r) => cmap.get(r.campaignId)!.platform);
      const line = (label: string, t = sumAds([])) => { const r = adRatios(t); return [label, t.spend, t.impressions, t.clicks, r.ctr, r.cpc, r.cpm, t.conversions, r.cvr, t.revenue, r.roas, r.acos]; };
      return { ...base, summary: adSummary, notes: [ATTR, "TACOS = total ad spend ÷ total marketplace sales. ACOS = ad spend ÷ attributed revenue.", DEMO],
        columns: [c("Platform"), c("Spend", "inr"), c("Impressions", "num"), c("Clicks", "num"), c("CTR", "pct"), c("CPC", "inr"), c("CPM", "inr"), c("Conversions", "num"), c("Conv. rate", "pct"), c("Attributed revenue", "inr"), c("ROAS", "mult"), c("ACOS", "pct")],
        rows: [...(["amazon_ads", "flipkart_ads", "meta"] as AdPlatform[]).filter((p) => byP.has(p)).map((p) => line(PLATFORM_LABEL[p], byP.get(p))), line("All platforms", sumAds(rows))] };
    }
    case "marketplace":
      return { ...base, summary: salesSummary, notes: ["Marketplace ad figures cover that marketplace's own ad platform only (Amazon Ads or Flipkart Ads).", DEMO],
        columns: [c("Marketplace"), c("Revenue", "inr"), c("Orders", "num"), c("Units", "num"), c("AOV", "inr"), c("Conv. rate", "pct"), c("Return rate", "pct"), c("Marketplace ad spend", "inr"), c("Ad-attributed sales", "inr"), c("Ad share of sales", "pct")],
        rows: mps.map((m) => { const s = sumSales(salesRows(scope.ds, scope.from, scope.to, m)), a = sumAds(adRows(scope, scope.from, scope.to, { platform: m === "amazon" ? "amazon_ads" : "flipkart_ads" })); return [MP_LABEL[m], s.revenue, s.orders, s.units, s.revenue / (s.orders || 1), s.orders / (s.sessions || 1), s.returns / (s.units || 1), a.spend, a.revenue, a.revenue / (s.revenue || 1)]; }) };
    case "product": {
      const stock = new Map<string, number>();
      inventoryFor(scope.ds, scope.marketplace).forEach((r) => stock.set(r.productId, (stock.get(r.productId) ?? 0) + r.onHand));
      return { ...base, summary: salesSummary, notes: ["Change compares revenue with the previous period of equal length.", DEMO],
        columns: [c("Product"), c("SKU"), c("Category"), c("Marketplaces"), c("Selling price", "inr"), c("Units", "num"), c("Orders", "num"), c("Revenue", "inr"), c("Change", "pct"), c("Conv. rate", "pct"), c("Units on hand", "num"), c("Status")],
        rows: productStats(scope).map((p) => [p.product.name, p.product.sku, p.product.category, p.product.listings.map((m) => MP_LABEL[m]).join(" + "), p.product.price, p.units, p.orders, p.revenue, p.growth ?? "n/a", p.conversionRate, stock.get(p.product.id) ?? 0, p.status]) };
    }
    case "campaign": {
      const byC = groupAds(rows, (r) => r.campaignId);
      return { ...base, summary: adSummary, notes: [ATTR, "Campaign status reflects demo state in this workspace, including any pause or resume actions taken in the demo.", DEMO],
        columns: [c("Campaign"), c("Platform"), c("Objective"), c("Status"), c("Daily budget", "inr"), c("Spend", "inr"), c("Impressions", "num"), c("Clicks", "num"), c("Conversions", "num"), c("Attributed revenue", "inr"), c("ROAS", "mult"), c("ACOS", "pct")],
        rows: scope.campaigns.filter((x) => byC.has(x.id)).map((x) => { const t = byC.get(x.id)!, r = adRatios(t); return [x.name, PLATFORM_LABEL[x.platform], x.objective, x.status, x.dailyBudget, t.spend, t.impressions, t.clicks, t.conversions, t.revenue, r.roas, isFinite(r.acos) ? r.acos : "n/a"] as Cell[]; }).sort((a, b) => (b[5] as number) - (a[5] as number)) };
    }
    case "ai": {
      const list = computeInsights(scope, cfg);
      return { ...base, summary: [...salesSummary.slice(0, 2), ...adSummary.slice(0, 2)], notes: ["Insights are demo-generated by a rules engine applied to the sample data in this workspace. No external AI model was used.", "Confidence is a heuristic based on data volume and effect size, not a statistical probability.", DEMO],
        columns: [c("Category"), c("Impact"), c("Insight"), c("Explanation"), c("Suggested action"), c("Confidence")],
        rows: list.map((i) => [CATEGORY_LABEL[i.category], i.impact, i.title, i.explanation, i.action, i.confidence === null ? "n/a" : `${Math.round(i.confidence * 100)}%`]) };
    }
  }
}
