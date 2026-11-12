import { adRatios, adRows, campaignMarketplace, dailySeries, groupAds, inventoryFor, kpis, productStats, salesRows, sumAds, sumSales, type Scope } from "../analytics/metrics";
import { forecastRevenue } from "../analytics/forecast";
import { addDays, fmtDay } from "../dates";
import { MP_LABEL, PLATFORM_LABEL, type Marketplace } from "../demo/types";
import { change, inr, mult, num, pct, signedPct } from "../format";

export type InsightCategory = "summary" | "revenue" | "campaign" | "product" | "budget" | "forecast" | "inventory" | "marketplace" | "growth";
export const CATEGORY_LABEL: Record<InsightCategory, string> = {
  summary: "Business summary", revenue: "Revenue trend", campaign: "Campaign optimisation", product: "Product performance", budget: "Budget recommendation",
  forecast: "Sales forecast", inventory: "Inventory risk", marketplace: "Marketplace comparison", growth: "Growth opportunity",
};
export interface Insight {
  id: string;
  category: InsightCategory;
  kind: "risk" | "opportunity" | "info";
  title: string;
  explanation: string;
  metrics: { label: string; value: string }[];
  impact: "High" | "Medium" | "Low";
  action: string;
  /** 0–1 heuristic based on data volume and effect size; null where a confidence figure would not be meaningful. */
  confidence: number | null;
  link?: { href: string; label: string };
  /** Plain-language description of the rule and inputs, shown by "Explain this insight". */
  method: string;
  /** Estimated ₹ at stake over the selected period, used only for ranking. */
  weight: number;
}
export interface InsightSettings { roasFloor: number; minSpendShare: number; categories: { campaigns: boolean; products: boolean; inventory: boolean; budget: boolean; growth: boolean } }

const clamp = (x: number, lo = 0.35, hi = 0.95) => Math.min(hi, Math.max(lo, x));
const impactOf = (share: number): Insight["impact"] => (share >= 0.04 ? "High" : share >= 0.012 ? "Medium" : "Low");

/** Rules engine. Every number below is computed from the dataset in scope — nothing is hard-coded. */
export function computeInsights(scope: Scope, cfg: InsightSettings): Insight[] {
  const out: Insight[] = [];
  const cid = scope.ds.client.id;
  const cur = kpis(scope);
  const prev = kpis(scope, scope.prevFrom, scope.prevTo);
  const period = `${fmtDay(scope.from)} – ${fmtDay(scope.to)}`;
  const vs = `the previous ${scope.days} days`;
  const rev = cur.sales.revenue || 1;
  const revCh = change(cur.sales.revenue, prev.sales.revenue);
  const spendCh = change(cur.ads.spend, prev.ads.spend);

  // 1 — Business summary
  out.push({
    id: `${cid}:summary`, category: "summary", kind: "info", weight: Infinity,
    title: `Revenue ${revCh !== null && revCh < 0 ? "fell" : "grew"} ${pct(Math.abs(revCh ?? 0))} to ${inr(cur.sales.revenue, true)}`,
    explanation: `${scope.ds.client.name} sold ${num(cur.sales.orders)} orders worth ${inr(cur.sales.revenue, true)} in ${period}, ${signedPct(revCh)} against ${vs}. Advertising spend was ${inr(cur.ads.spend, true)} (${signedPct(spendCh)}), which is ${pct(cur.tacos)} of total sales. Platform-reported ROAS averaged ${mult(cur.roas)}.`,
    metrics: [{ label: "Revenue", value: inr(cur.sales.revenue, true) }, { label: "Ad spend", value: inr(cur.ads.spend, true) }, { label: "TACOS", value: pct(cur.tacos) }, { label: "ROAS", value: mult(cur.roas) }],
    impact: "Medium", action: "Start with the highest-impact items below.", confidence: null,
    method: "Sums every sales row and ad-delivery row in the selected period and the equal-length period before it. TACOS is ad spend ÷ total sales; ROAS is platform-attributed revenue ÷ ad spend.",
  });

  // 2 — Marketplace revenue trend
  const mps: Marketplace[] = scope.marketplace === "all" ? ["amazon", "flipkart"] : [scope.marketplace];
  const mpStats = mps.map((mp) => ({ mp, cur: sumSales(salesRows(scope.ds, scope.from, scope.to, mp)), prev: sumSales(salesRows(scope.ds, scope.prevFrom, scope.prevTo, mp)) }));
  for (const m of mpStats) {
    const ch = change(m.cur.revenue, m.prev.revenue);
    if (ch === null || Math.abs(ch) < 0.03) continue;
    out.push({
      id: `${cid}:rev:${m.mp}`, category: "revenue", kind: ch > 0 ? "opportunity" : "risk", weight: Math.abs(m.cur.revenue - m.prev.revenue),
      title: `${MP_LABEL[m.mp]} revenue ${ch > 0 ? "increased" : "decreased"} by ${pct(Math.abs(ch))} compared with the previous period`,
      explanation: `${MP_LABEL[m.mp]} sales moved from ${inr(m.prev.revenue, true)} to ${inr(m.cur.revenue, true)}. Orders changed ${signedPct(change(m.cur.orders, m.prev.orders))} and average order value ${signedPct(change(m.cur.revenue / m.cur.orders, m.prev.revenue / m.prev.orders))}.`,
      metrics: [{ label: "This period", value: inr(m.cur.revenue, true) }, { label: "Previous", value: inr(m.prev.revenue, true) }, { label: "Orders", value: num(m.cur.orders) }],
      impact: impactOf(Math.abs(m.cur.revenue - m.prev.revenue) / rev), action: ch > 0 ? `Check which products drove the lift on ${MP_LABEL[m.mp]} and whether stock cover can sustain it.` : `Review ${MP_LABEL[m.mp]} listings, pricing and ad coverage for the products that slowed.`,
      confidence: clamp(0.55 + Math.abs(ch) * 1.5 + Math.min(0.15, scope.days / 300)), link: { href: `/marketplaces/${m.mp}`, label: `Open ${MP_LABEL[m.mp]}` },
      method: `Compares ${MP_LABEL[m.mp]} revenue for ${period} with ${vs}. Reported only when the change exceeds 3%.`,
    });
  }

  // 3 — Campaign efficiency
  const rows = adRows(scope, scope.from, scope.to, { mp: scope.marketplace });
  const byC = groupAds(rows, (r) => r.campaignId);
  const live = scope.campaigns.filter((c) => byC.has(c.id) && c.objective !== "Awareness");
  const perf = live.map((c) => ({ c, t: byC.get(c.id)!, r: adRatios(byC.get(c.id)!) }));
  const acct = adRatios(sumAds(rows.filter((r) => live.some((c) => c.id === r.campaignId))));
  if (cfg.categories.campaigns) {
    perf.filter((p) => p.c.status === "active" && p.t.spend >= cur.ads.spend * cfg.minSpendShare && p.r.roas < Math.max(cfg.roasFloor, acct.roas * 0.6)).sort((a, b) => b.t.spend - a.t.spend).slice(0, 3).forEach(({ c, t, r }) => {
      const gap = t.spend * acct.roas - t.revenue;
      out.push({
        id: `${cid}:lowroas:${c.id}`, category: "campaign", kind: "risk", weight: gap,
        title: `"${c.name}" is returning ${mult(r.roas)} against an account average of ${mult(acct.roas)}`,
        explanation: `This ${PLATFORM_LABEL[c.platform]} campaign spent ${inr(t.spend, true)} and was credited with ${inr(t.revenue, true)} in sales. At the account's average return the same spend would have been credited with about ${inr(t.spend * acct.roas, true)}.`,
        metrics: [{ label: "Spend", value: inr(t.spend, true) }, { label: "ROAS", value: mult(r.roas) }, { label: "ACOS", value: pct(r.acos) }, { label: "Conv. rate", value: pct(r.cvr) }],
        impact: impactOf(gap / rev), action: `Review targeting and bids. Consider lowering the daily budget from ${inr(c.dailyBudget)} to ${inr(Math.round((c.dailyBudget * 0.6) / 50) * 50)} until ROAS recovers.`,
        confidence: clamp(0.5 + t.clicks / 6000 + Math.min(0.2, (acct.roas - r.roas) / 10)), link: { href: c.platform === "meta" ? `/meta-ads?campaign=${c.id}` : "/advertising", label: "View related campaign" },
        method: `Flags active sales campaigns that account for at least ${pct(cfg.minSpendShare, 0)} of spend and whose ROAS is below the higher of ${mult(cfg.roasFloor)} (workspace floor) and 60% of the account average. Awareness campaigns are excluded because they are not optimised for purchases.`,
      });
    });
    // 4 — High CTR, weak conversion (Meta)
    const meta = perf.filter((p) => p.c.platform === "meta");
    const metaAvg = adRatios(sumAds(rows.filter((r) => meta.some((m) => m.c.id === r.campaignId))));
    meta.filter((p) => p.c.status === "active" && p.r.ctr > metaAvg.ctr * 1.4 && p.r.cvr < metaAvg.cvr * 0.6 && p.t.clicks > 200).slice(0, 2).forEach(({ c, t, r }) =>
      out.push({
        id: `${cid}:ctrcvr:${c.id}`, category: "campaign", kind: "risk", weight: t.spend * 0.5,
        title: `"${c.name}" has a high click-through rate but a lower-than-expected conversion rate`,
        explanation: `People click this ad ${mult(r.ctr / metaAvg.ctr)} as often as your Meta average (${pct(r.ctr, 2)} vs ${pct(metaAvg.ctr, 2)}), but only ${pct(r.cvr)} of clicks convert against ${pct(metaAvg.cvr)} across Meta. The creative earns attention; the click is not turning into a purchase.`,
        metrics: [{ label: "CTR", value: pct(r.ctr, 2) }, { label: "Conv. rate", value: pct(r.cvr) }, { label: "Clicks", value: num(t.clicks) }, { label: "Cost / result", value: inr(r.cpa) }],
        impact: impactOf((t.spend * 0.5) / rev), action: "Review the landing listing (price, images, reviews, delivery promise) and the audience quality of this ad set.",
        confidence: clamp(0.5 + t.clicks / 8000), link: { href: `/meta-ads?campaign=${c.id}`, label: "View related campaign" },
        method: "Flags Meta campaigns whose CTR is more than 1.4× the Meta average while click-to-purchase rate is under 0.6× the Meta average, with at least 200 clicks in the period.",
      }));
  }

  // 5 — Product momentum and decline
  const prods = productStats(scope);
  if (cfg.categories.products) {
    prods.filter((p) => (p.growth ?? 0) >= 0.15 && p.share >= 0.03).sort((a, b) => (b.revenue - b.prevRevenue) - (a.revenue - a.prevRevenue)).slice(0, 2).forEach((p) =>
      out.push({
        id: `${cid}:up:${p.product.id}`, category: "product", kind: "opportunity", weight: p.revenue - p.prevRevenue,
        title: `${p.product.name} has strong sales momentum`,
        explanation: `Revenue rose ${signedPct(p.growth)} to ${inr(p.revenue, true)} and the product now contributes ${pct(p.share)} of sales in view. ${num(p.units)} units sold at a ${pct(p.conversionRate)} session-to-order rate.`,
        metrics: [{ label: "Revenue", value: inr(p.revenue, true) }, { label: "Growth", value: signedPct(p.growth) }, { label: "Units", value: num(p.units) }],
        impact: impactOf((p.revenue - p.prevRevenue) / rev), action: "Consider reviewing its advertising budget and confirm stock cover before scaling.",
        confidence: clamp(0.5 + (p.growth ?? 0) + p.orders / 2000), link: { href: `/products?product=${p.product.id}`, label: "View product" },
        method: `Flags products with at least 3% revenue share whose revenue grew 15% or more against ${vs}.`,
      }));
    prods.filter((p) => (p.growth ?? 0) <= -0.15 && p.prevRevenue > 0).sort((a, b) => (a.revenue - a.prevRevenue) - (b.revenue - b.prevRevenue)).slice(0, 2).forEach((p) =>
      out.push({
        id: `${cid}:down:${p.product.id}`, category: "product", kind: "risk", weight: p.prevRevenue - p.revenue,
        title: `${p.product.name} is losing sales`,
        explanation: `Revenue fell ${signedPct(p.growth)} from ${inr(p.prevRevenue, true)} to ${inr(p.revenue, true)}. Session-to-order rate is ${pct(p.conversionRate)}.`,
        metrics: [{ label: "Revenue", value: inr(p.revenue, true) }, { label: "Change", value: signedPct(p.growth) }, { label: "Conv. rate", value: pct(p.conversionRate) }],
        impact: impactOf((p.prevRevenue - p.revenue) / rev), action: "Check price position, reviews and search rank. Pause broad-match ad spend on this product until conversion improves.",
        confidence: clamp(0.5 + Math.abs(p.growth ?? 0) + p.orders / 2000), link: { href: `/products?product=${p.product.id}`, label: "View product" },
        method: `Flags products whose revenue fell 15% or more against ${vs}.`,
      }));
  }

  // 6 — Budget reallocation
  if (cfg.categories.budget) {
    const active = perf.filter((p) => p.c.status === "active" && p.t.days >= Math.min(7, scope.days));
    const best = [...active].filter((p) => p.t.spend >= p.c.dailyBudget * p.t.days * 0.85).sort((a, b) => b.r.roas - a.r.roas)[0];
    const worst = [...active].sort((a, b) => a.r.roas - b.r.roas)[0];
    if (best && worst && best.c.id !== worst.c.id && best.r.roas > worst.r.roas * 1.5) {
      const shift = Math.round((worst.c.dailyBudget * 0.3) / 50) * 50;
      const gain = shift * scope.days * (best.r.roas * 0.7 - worst.r.roas);
      out.push({
        id: `${cid}:budget:${worst.c.id}:${best.c.id}`, category: "budget", kind: "opportunity", weight: gain,
        title: `Move ${inr(shift)} a day from "${worst.c.name}" to "${best.c.name}"`,
        explanation: `"${best.c.name}" returns ${mult(best.r.roas)} and used ${pct(best.t.spend / (best.c.dailyBudget * best.t.days), 0)} of its budget, so it is likely budget-limited. "${worst.c.name}" returns ${mult(worst.r.roas)}. Assuming the extra spend performs 30% below the campaign's current return, the shift would add an estimated ${inr(gain, true)} in attributed sales over a period this long.`,
        metrics: [{ label: "From ROAS", value: mult(worst.r.roas) }, { label: "To ROAS", value: mult(best.r.roas) }, { label: "Daily shift", value: inr(shift) }, { label: "Est. uplift", value: inr(gain, true) }],
        impact: impactOf(gain / rev), action: "Apply the shift for 7 days, then compare ROAS on both campaigns before making it permanent.",
        confidence: 0.6, link: { href: "/advertising", label: "Open advertising analytics" },
        method: "Picks the highest-ROAS active campaign that spent at least 85% of its budget and the lowest-ROAS active campaign, then models moving 30% of the weaker budget. The uplift is an estimate with an assumed 30% diminishing return, not a guarantee.",
      });
    }
  }

  // 7 — Forecast (uses up to 56 trailing days regardless of the selected range)
  const hist = dailySeries(scope, addDays(scope.ds.lastDate, -55), scope.ds.lastDate);
  const fc = forecastRevenue(hist);
  const fcCh = change(fc.total, fc.lastTotal);
  out.push({
    id: `${cid}:forecast`, category: "forecast", kind: (fcCh ?? 0) >= 0 ? "opportunity" : "risk", weight: Math.abs(fc.total - fc.lastTotal),
    title: `Next ${fc.horizon} days are projected at ${inr(fc.total, true)}`,
    explanation: `That is ${signedPct(fcCh)} against the last ${fc.horizon} days (${inr(fc.lastTotal, true)}). The likely range is ${inr(fc.low, true)} to ${inr(fc.high, true)}. The projection extends the recent trend and weekday pattern; it does not know about upcoming sale events or stock-outs.`,
    metrics: [{ label: "Projected", value: inr(fc.total, true) }, { label: "Range", value: `${inr(fc.low, true)} – ${inr(fc.high, true)}` }, { label: "Daily trend", value: `${fc.trendPerDay >= 0 ? "+" : "−"}${inr(Math.abs(fc.trendPerDay))}` }],
    impact: impactOf(Math.abs(fc.total - fc.lastTotal) / rev), action: "Use the low end of the range for inventory and budget planning.",
    confidence: clamp(1 - (fc.high - fc.low) / (2 * (fc.total || 1)), 0.4, 0.9), link: { href: "/sales", label: "Open sales analytics" },
    method: "Fits a straight-line trend to the last 56 days of revenue after removing the weekday pattern, then re-applies the weekday pattern to the next 14 days. The range is ±1.28 standard deviations of the fit error.",
  });

  // 8 — Inventory
  if (cfg.categories.inventory) {
    const inv = inventoryFor(scope.ds, scope.marketplace);
    inv.filter((r) => r.cover < 14 && r.dailyVelocity > 0).sort((a, b) => a.cover - b.cover).slice(0, 3).forEach((r) => {
      const reorder = Math.max(0, Math.ceil(r.dailyVelocity * 45 - r.onHand - r.inbound));
      const atRisk = Math.max(0, r.leadTimeDays - r.cover) * r.dailyVelocity * r.product.price;
      out.push({
        id: `${cid}:stock:${r.productId}:${r.marketplace}`, category: "inventory", kind: "risk", weight: atRisk,
        title: `${r.product.name} has ${Math.floor(r.cover)} days of stock left on ${MP_LABEL[r.marketplace]}`,
        explanation: `${num(r.onHand)} units on hand at ${r.dailyVelocity.toFixed(1)} units a day. Replenishment takes about ${r.leadTimeDays} days${r.inbound ? `, and ${num(r.inbound)} units are already inbound` : ", and nothing is inbound"}. ${atRisk > 0 ? `Roughly ${inr(atRisk, true)} of sales is exposed before new stock can land.` : ""}`,
        metrics: [{ label: "On hand", value: num(r.onHand) }, { label: "Days of cover", value: String(Math.floor(r.cover)) }, { label: "Inbound", value: num(r.inbound) }, { label: "Suggested reorder", value: `${num(reorder)} units` }],
        impact: r.cover < 7 ? "High" : impactOf(atRisk / rev), action: reorder > 0 ? `Raise a replenishment order for about ${num(reorder)} units (45 days of cover) and hold ad spend on this product steady until it lands.` : "Inbound stock covers the gap; confirm the delivery date.",
        confidence: 0.8, link: { href: `/marketplaces/${r.marketplace}`, label: "Open inventory" },
        method: "Days of cover = units on hand ÷ average daily units over the last 14 days. Flags listings under 14 days of cover.",
      });
    });
    const over = inv.filter((r) => r.cover > 90 && isFinite(r.cover)).sort((a, b) => b.onHand * b.product.price - a.onHand * a.product.price)[0];
    if (over) out.push({
      id: `${cid}:over:${over.productId}:${over.marketplace}`, category: "inventory", kind: "info", weight: over.onHand * over.product.price * 0.05,
      title: `${over.product.name} is overstocked on ${MP_LABEL[over.marketplace]}`,
      explanation: `${num(over.onHand)} units cover about ${Math.round(over.cover)} days of sales at the current rate, tying up roughly ${inr(over.onHand * over.product.price, true)} at selling price.`,
      metrics: [{ label: "On hand", value: num(over.onHand) }, { label: "Days of cover", value: String(Math.round(over.cover)) }], impact: "Low",
      action: "Plan a price promotion or bundle, and pause replenishment for this listing.", confidence: 0.75, link: { href: `/marketplaces/${over.marketplace}`, label: "Open inventory" },
      method: "Flags the highest-value listing with more than 90 days of cover.",
    });
  }

  // 9 — Marketplace comparison
  if (mpStats.length === 2) {
    const [a, f] = mpStats.map((m) => ({ ...m, aov: m.cur.revenue / m.cur.orders, cvr: m.cur.orders / m.cur.sessions }));
    const lead = a.cur.revenue >= f.cur.revenue ? a : f, other = lead === a ? f : a;
    out.push({
      id: `${cid}:mpcompare`, category: "marketplace", kind: "info", weight: rev * 0.01,
      title: `${MP_LABEL[lead.mp]} leads with ${pct(lead.cur.revenue / rev, 0)} of revenue`,
      explanation: `${MP_LABEL[lead.mp]} generated ${inr(lead.cur.revenue, true)} against ${inr(other.cur.revenue, true)} on ${MP_LABEL[other.mp]}. Average order value is ${inr(a.aov)} on Amazon and ${inr(f.aov)} on Flipkart; session-to-order rate is ${pct(a.cvr)} and ${pct(f.cvr)}.`,
      metrics: [{ label: "Amazon", value: inr(a.cur.revenue, true) }, { label: "Flipkart", value: inr(f.cur.revenue, true) }, { label: "AOV gap", value: inr(Math.abs(a.aov - f.aov)) }],
      impact: "Low", action: `Compare the top five products on each marketplace to find listings that under-index on ${MP_LABEL[other.mp]}.`, confidence: null, link: { href: "/sales", label: "Open sales analytics" },
      method: "Compares revenue, average order value (revenue ÷ orders) and session-to-order rate between the two marketplaces for the selected period.",
    });
  }

  // 10 — Growth opportunity: Amazon-only products
  if (cfg.categories.growth && scope.marketplace !== "flipkart") {
    const both = prods.filter((p) => p.product.listings.length === 2 && p.byMp.amazon > 0);
    const ratios = both.map((p) => p.byMp.flipkart / p.byMp.amazon).sort((x, y) => x - y);
    const median = ratios.length ? ratios[Math.floor(ratios.length / 2)] : 0;
    prods.filter((p) => p.product.listings.length === 1 && p.revenue > 0).slice(0, 2).forEach((p) => {
      const est = p.byMp.amazon * median;
      out.push({
        id: `${cid}:expand:${p.product.id}`, category: "growth", kind: "opportunity", weight: est,
        title: `${p.product.name} is not listed on Flipkart`,
        explanation: `It earned ${inr(p.byMp.amazon, true)} on Amazon this period (${signedPct(p.growth)}). Your products listed on both marketplaces typically earn ${pct(median, 0)} of their Amazon revenue on Flipkart, which would suggest about ${inr(est, true)} for a period this long.`,
        metrics: [{ label: "Amazon revenue", value: inr(p.byMp.amazon, true) }, { label: "Typical Flipkart ratio", value: pct(median, 0) }, { label: "Est. opportunity", value: inr(est, true) }],
        impact: impactOf(est / rev), action: "Create the Flipkart listing and include it in the Product Listing Ads campaign for the first 30 days.",
        confidence: 0.5, link: { href: `/products?product=${p.product.id}`, label: "View product" },
        method: "Finds products sold on Amazon only and multiplies their Amazon revenue by the median Flipkart-to-Amazon revenue ratio of your dual-listed products. It is an estimate from your own catalogue, not a market forecast.",
      });
    });
  }

  const order = { High: 0, Medium: 1, Low: 2 };
  return out.sort((a, b) => (a.category === "summary" ? -1 : b.category === "summary" ? 1 : order[a.impact] - order[b.impact] || b.weight - a.weight));
}
export { campaignMarketplace };
