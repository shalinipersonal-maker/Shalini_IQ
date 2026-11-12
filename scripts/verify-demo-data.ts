/**
 * Demo-data consistency checks. Run with: npm run verify:data
 * Fails (exit 1) if any invariant from DEMO_MODE.md is violated.
 */
import { addDays } from "../src/lib/dates";
import { CLIENTS } from "../src/lib/demo/catalog";
import { getDataset } from "../src/lib/demo/generate";
import { adRatios, adRows, groupAds, kpis, salesRows, sumAds, sumSales, type Scope } from "../src/lib/analytics/metrics";

let failed = 0;
const check = (ok: boolean, msg: string) => {
  if (!ok) failed++;
  console.log(`${ok ? "  ok  " : " FAIL "} ${msg}`);
};
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));

for (const c of CLIENTS) {
  const ds = getDataset(c.id);
  console.log(`\n${c.name}: ${ds.products.length} products, ${ds.campaigns.length} campaigns, ${ds.sales.length} sales rows, ${ds.ads.length} ad rows, ${ds.firstDate} → ${ds.lastDate}`);
  for (const days of [7, 30, 90]) {
    const from = addDays(ds.lastDate, -(days - 1));
    const scope: Scope = { ds, campaigns: ds.campaigns, from, to: ds.lastDate, prevFrom: addDays(from, -days), prevTo: addDays(from, -1), days, marketplace: "all" };
    const k = kpis(scope);
    const am = sumSales(salesRows(ds, from, ds.lastDate, "amazon"));
    const fk = sumSales(salesRows(ds, from, ds.lastDate, "flipkart"));
    check(near(am.revenue + fk.revenue, k.sales.revenue), `[${days}d] marketplace revenue sums to total (${Math.round(k.sales.revenue)})`);
    const perProduct = ds.products.reduce((s, p) => s + sumSales(salesRows(ds, from, ds.lastDate, "all", p.id)).revenue, 0);
    check(near(perProduct, k.sales.revenue), `[${days}d] product revenue sums to total`);
    const rows = adRows(scope, from, ds.lastDate);
    const byCampaign = groupAds(rows, (r) => r.campaignId);
    check(near([...byCampaign.values()].reduce((s, t) => s + t.spend, 0), k.ads.spend), `[${days}d] campaign spend sums to total spend (${Math.round(k.ads.spend)})`);
    for (const cmp of ds.campaigns.filter((x) => x.platform === "meta")) {
      const cRows = rows.filter((r) => r.campaignId === cmp.id);
      const adsetSum = [...groupAds(cRows, (r) => r.adsetId).values()].reduce((s, t) => s + t.spend, 0);
      const adSum = [...groupAds(cRows, (r) => r.adId).values()].reduce((s, t) => s + t.spend, 0);
      if (!near(adsetSum, sumAds(cRows).spend) || !near(adSum, adsetSum)) check(false, `[${days}d] ${cmp.name}: ads → ad sets → campaign reconcile`);
    }
    check(near(k.roas, k.ads.revenue / k.ads.spend) && near(k.acos, k.ads.spend / k.ads.revenue) && near(k.tacos, k.ads.spend / k.sales.revenue), `[${days}d] ROAS ${k.roas.toFixed(2)}, ACOS ${(k.acos * 100).toFixed(1)}%, TACOS ${(k.tacos * 100).toFixed(1)}% follow their definitions`);
    const amAds = sumAds(adRows(scope, from, ds.lastDate, { platform: "amazon_ads" }));
    const fkAds = sumAds(adRows(scope, from, ds.lastDate, { platform: "flipkart_ads" }));
    const meta = sumAds(adRows(scope, from, ds.lastDate, { platform: "meta" }));
    check(amAds.revenue < am.revenue * 0.5, `[${days}d] Amazon Ads attributed sales are ${((amAds.revenue / am.revenue) * 100).toFixed(0)}% of Amazon sales (< 50%)`);
    check(fkAds.revenue < fk.revenue * 0.5, `[${days}d] Flipkart Ads attributed sales are ${((fkAds.revenue / fk.revenue) * 100).toFixed(0)}% of Flipkart sales (< 50%)`);
    check(meta.revenue < k.sales.revenue * 0.2, `[${days}d] Meta purchase value is ${((meta.revenue / k.sales.revenue) * 100).toFixed(0)}% of total sales (< 20%)`);
    check(k.tacos > 0.03 && k.tacos < 0.25, `[${days}d] TACOS is plausible`);
    for (const cmp of ds.campaigns) {
      const t = byCampaign.get(cmp.id);
      if (!t) continue;
      const r = adRatios(t);
      if (t.clicks > t.impressions || t.conversions > t.clicks) check(false, `${cmp.name}: funnel order impressions ≥ clicks ≥ conversions`);
      if (t.spend > cmp.dailyBudget * t.days + 1) check(false, `${cmp.name}: spend within budget`);
      if (cmp.productIds.length === 1 && cmp.platform !== "meta") {
        const ps = sumSales(salesRows(ds, from, ds.lastDate, cmp.platform === "amazon_ads" ? "amazon" : "flipkart", cmp.productIds[0]));
        if (t.revenue > ps.revenue) check(false, `[${days}d] ${cmp.name}: attributed ${Math.round(t.revenue)} exceeds product sales ${Math.round(ps.revenue)}`);
      }
      if (days === 30) console.log(`        ${cmp.platform.padEnd(12)} ${cmp.name.padEnd(42)} budget ${String(cmp.dailyBudget).padStart(5)}  spend ${String(Math.round(t.spend)).padStart(7)}  ROAS ${r.roas.toFixed(2)}  CTR ${(r.ctr * 100).toFixed(2)}%  CVR ${(r.cvr * 100).toFixed(1)}%`);
    }
  }
  check(ds.products.length >= 12 && ds.campaigns.length >= 8, "has ≥ 12 products and ≥ 8 campaigns");
}
console.log(failed ? `\n${failed} check(s) failed` : "\nAll demo-data checks passed");
process.exit(failed ? 1 : 0);
