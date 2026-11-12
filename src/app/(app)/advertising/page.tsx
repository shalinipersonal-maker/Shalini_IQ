"use client";
import { useRouter } from "next/navigation";
import * as React from "react";
import { BarsChart, Legend, type Series } from "@/components/charts";
import { DataTable, MetricCard, PageHeader, StatusBadge } from "@/components/shared";
import { Badge, Card, CardHeader, Segmented } from "@/components/ui";
import { adRatios, adRows, bucketSeries, dailySeries, groupAds, salesRows, sumAds, sumSales, type AdTotals } from "@/lib/analytics/metrics";
import { fmtDate, fmtDay, weekStart } from "@/lib/dates";
import { PLATFORM_COLOR, PLATFORM_LABEL, type AdPlatform } from "@/lib/demo/types";
import { change, inr, mult, num, pct } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useScope } from "@/lib/use-scope";

const PLATFORMS: AdPlatform[] = ["amazon_ads", "flipkart_ads", "meta"];
const ZERO: AdTotals = { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0, reach: 0, days: 0 };

export default function Advertising() {
  const scope = useScope();
  const router = useRouter();
  const floor = useStore((s) => s.settings.ai.roasFloor);
  const [platform, setPlatform] = React.useState<AdPlatform | "all">("all");
  const d = React.useMemo(() => {
    const f = { mp: scope.marketplace, platform };
    const rows = adRows(scope, scope.from, scope.to, f);
    const total = sumAds(rows), prev = sumAds(adRows(scope, scope.prevFrom, scope.prevTo, f));
    const sales = sumSales(salesRows(scope.ds, scope.from, scope.to, scope.marketplace)), prevSales = sumSales(salesRows(scope.ds, scope.prevFrom, scope.prevTo, scope.marketplace));
    const cmap = new Map(scope.campaigns.map((c) => [c.id, c]));
    const allRows = adRows(scope, scope.from, scope.to, { mp: scope.marketplace });
    const byP = groupAds(allRows, (r) => cmap.get(r.campaignId)!.platform);
    const byC = groupAds(rows, (r) => r.campaignId);
    const camps = scope.campaigns.filter((c) => byC.has(c.id)).map((c) => ({ c, t: byC.get(c.id)!, r: adRatios(byC.get(c.id)!) }));
    const days = dailySeries(scope, scope.from, scope.to, f);
    const series = scope.days > 45 ? bucketSeries(days, "week", weekStart).map((p) => ({ ...p, label: `Wk of ${fmtDay(p.date)}` })) : days.map((p) => ({ ...p, label: p.date }));
    return { total, prev, sales, prevSales, byP, camps, series, allTotal: sumAds(allRows) };
  }, [scope, platform]);
  const r = adRatios(d.total), pr = adRatios(d.prev);
  const tacos = d.total.spend / (d.sales.revenue || 1), prevTacos = d.prev.spend / (d.prevSales.revenue || 1);
  const shown = PLATFORMS.filter((p) => d.byP.has(p));
  const spendSeries: Series[] = (platform === "all" ? shown : [platform]).map((p) => ({ key: p, label: PLATFORM_LABEL[p], color: PLATFORM_COLOR[p] }));
  const maxRoas = Math.max(...d.camps.map((x) => (isFinite(x.r.roas) ? x.r.roas : 0)), 1);
  const mpAttr = (d.byP.get("amazon_ads")?.revenue ?? 0) + (d.byP.get("flipkart_ads")?.revenue ?? 0);
  const metaAttr = d.byP.get("meta")?.revenue ?? 0;

  return (
    <>
      <PageHeader title="Advertising Analytics" description={<>Amazon Ads, Flipkart Ads and Meta Ads side by side for {scope.ds.client.name} · {fmtDate(scope.from)} – {fmtDate(scope.to)}</>}
        actions={<Segmented label="Ad platform" value={platform} onChange={setPlatform} options={[{ value: "all", label: "All platforms" }, ...PLATFORMS.map((p) => ({ value: p, label: PLATFORM_LABEL[p] }))]} className="max-w-full overflow-x-auto" />} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <MetricCard label="Total advertising spend" value={inr(d.total.spend, true)} delta={change(d.total.spend, d.prev.spend)} goodWhen="neutral" />
        <MetricCard label="Attributed revenue" value={inr(d.total.revenue, true)} delta={change(d.total.revenue, d.prev.revenue)} hint="Sum of what each platform credits to its own ads. Platforms can credit the same order, so this is not unique revenue." />
        <MetricCard label="ROAS" value={mult(r.roas)} delta={change(r.roas, pr.roas)} hint="Attributed revenue ÷ ad spend." />
        <MetricCard label="ACOS" value={pct(r.acos)} delta={change(r.acos, pr.acos)} goodWhen="down" hint="Ad spend ÷ attributed revenue." />
        <MetricCard label="TACOS" value={pct(tacos)} delta={change(tacos, prevTacos)} goodWhen="down" hint={`Ad spend${platform === "all" ? "" : ` on ${PLATFORM_LABEL[platform]}`} ÷ total marketplace sales in view.`} />
        <MetricCard label="CTR" value={pct(r.ctr, 2)} delta={change(r.ctr, pr.ctr)} />
        <MetricCard label="CPC" value={inr(r.cpc)} delta={change(r.cpc, pr.cpc)} goodWhen="down" />
        <MetricCard label="CPM" value={inr(r.cpm)} delta={change(r.cpm, pr.cpm)} goodWhen="down" />
        <MetricCard label="Conversion rate" value={pct(r.cvr)} delta={change(r.cvr, pr.cvr)} hint="Attributed conversions ÷ clicks." />
        <MetricCard label="Conversions" value={num(d.total.conversions)} delta={change(d.total.conversions, d.prev.conversions)} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Spend by platform" subtitle={scope.days > 45 ? "Weekly" : "Daily"} />
          <div className="px-3 pb-4"><Legend series={spendSeries} className="mb-2 px-2" /><BarsChart data={d.series} x="label" series={spendSeries} fmt={(n) => inr(n, true)} stacked height={250} /></div>
        </Card>
        <Card>
          <CardHeader title="Attributed revenue against total sales" subtitle="Why these figures are not added together" />
          <div className="space-y-4 px-5 pb-5 text-[13px]">
            <div>
              <div className="flex justify-between"><span className="text-muted">Total marketplace sales</span><span className="tnum font-semibold">{inr(d.sales.revenue, true)}</span></div>
              <div className="mt-1.5 h-2 rounded-full bg-[var(--s-neutral)]" />
            </div>
            <div>
              <div className="flex justify-between"><span className="text-muted">Marketplace-ad attributed</span><span className="tnum font-semibold">{inr(mpAttr, true)} <span className="font-normal text-muted">· {pct(mpAttr / (d.sales.revenue || 1), 0)}</span></span></div>
              <div className="mt-1.5 flex h-2 gap-0.5 rounded-full bg-raised">
                {(["amazon_ads", "flipkart_ads"] as AdPlatform[]).map((p) => <span key={p} className="h-full rounded-full" style={{ width: `${((d.byP.get(p)?.revenue ?? 0) / (d.sales.revenue || 1)) * 100}%`, background: PLATFORM_COLOR[p] }} />)}
              </div>
            </div>
            <div>
              <div className="flex justify-between"><span className="text-muted">Meta-reported purchases</span><span className="tnum font-semibold">{inr(metaAttr, true)} <span className="font-normal text-muted">· {pct(metaAttr / (d.sales.revenue || 1), 0)}</span></span></div>
              <div className="mt-1.5 h-2 rounded-full bg-raised"><div className="h-full rounded-full" style={{ width: `${(metaAttr / (d.sales.revenue || 1)) * 100}%`, background: PLATFORM_COLOR.meta }} /></div>
            </div>
            <p className="border-t border-line pt-3 text-[12px] leading-relaxed text-muted">Each platform measures its own ads with its own attribution window. A shopper who clicks a Meta ad and then a Sponsored Product ad can be credited by both. Attributed figures are therefore shown per platform and never summed into total sales.</p>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Platform comparison" subtitle="Unaffected by the platform filter above" />
        <DataTable rows={shown.map((p) => ({ p, t: d.byP.get(p) ?? ZERO }))} rowKey={(x) => x.p} defaultSort={{ key: "spend", dir: "desc" }}
          columns={[
            { key: "p", header: "Platform", cell: (x) => <span className="inline-flex items-center gap-2 font-medium"><span className="size-2 rounded-[2px]" style={{ background: PLATFORM_COLOR[x.p] }} />{PLATFORM_LABEL[x.p]}</span> },
            { key: "spend", header: "Spend", align: "right", cell: (x) => inr(x.t.spend), sort: (x) => x.t.spend },
            { key: "share", header: "Share of spend", align: "right", cell: (x) => pct(x.t.spend / (d.allTotal.spend || 1), 0), sort: (x) => x.t.spend },
            { key: "rev", header: "Attributed revenue", align: "right", cell: (x) => inr(x.t.revenue), sort: (x) => x.t.revenue },
            { key: "roas", header: "ROAS", align: "right", cell: (x) => mult(adRatios(x.t).roas), sort: (x) => adRatios(x.t).roas },
            { key: "acos", header: "ACOS", align: "right", cell: (x) => pct(adRatios(x.t).acos), sort: (x) => adRatios(x.t).acos },
            { key: "ctr", header: "CTR", align: "right", cell: (x) => pct(adRatios(x.t).ctr, 2), sort: (x) => adRatios(x.t).ctr },
            { key: "cpc", header: "CPC", align: "right", cell: (x) => inr(adRatios(x.t).cpc), sort: (x) => adRatios(x.t).cpc },
            { key: "cpm", header: "CPM", align: "right", cell: (x) => inr(adRatios(x.t).cpm), sort: (x) => adRatios(x.t).cpm },
            { key: "cvr", header: "Conv. rate", align: "right", cell: (x) => pct(adRatios(x.t).cvr), sort: (x) => adRatios(x.t).cvr },
          ]} />
      </Card>

      <Card className="mt-4">
        <CardHeader title="Campaign efficiency" subtitle={`ROAS by campaign. The marker shows the ${mult(r.roas)} average for this view; red is below the ${mult(floor)} workspace floor.`} />
        <DataTable rows={d.camps} rowKey={(x) => x.c.id} defaultSort={{ key: "roas", dir: "desc" }} onRowClick={(x) => x.c.platform === "meta" && router.push(`/meta-ads?campaign=${x.c.id}`)}
          columns={[
            { key: "name", header: "Campaign", cell: (x) => <span className="font-medium">{x.c.name}</span>, sort: (x) => x.c.name },
            { key: "pl", header: "Platform", cell: (x) => <Badge>{PLATFORM_LABEL[x.c.platform]}</Badge>, sort: (x) => x.c.platform },
            { key: "st", header: "Status", cell: (x) => <StatusBadge status={x.c.status} />, sort: (x) => x.c.status },
            { key: "spend", header: "Spend", align: "right", cell: (x) => inr(x.t.spend), sort: (x) => x.t.spend },
            { key: "rev", header: "Attributed", align: "right", cell: (x) => inr(x.t.revenue), sort: (x) => x.t.revenue },
            { key: "acos", header: "ACOS", align: "right", cell: (x) => pct(x.r.acos), sort: (x) => x.r.acos },
            { key: "roas", header: "ROAS", align: "right", cell: (x) => mult(x.r.roas), sort: (x) => x.r.roas },
            { key: "bar", header: "Efficiency", className: "w-44", cell: (x) => (
              <span className="relative block h-1.5 w-40 rounded-full bg-raised" title={x.c.objective === "Awareness" ? "Awareness campaign: not optimised for purchases" : undefined}>
                <span className="block h-full rounded-full" style={{ width: `${Math.max(2, ((isFinite(x.r.roas) ? x.r.roas : 0) / maxRoas) * 100)}%`, background: x.c.objective === "Awareness" ? "var(--s-neutral)" : x.r.roas < floor ? "var(--neg)" : PLATFORM_COLOR[x.c.platform] }} />
                <span className="absolute -top-1 h-3.5 w-0.5 bg-ink" style={{ left: `${Math.min(100, (r.roas / maxRoas) * 100)}%` }} />
              </span>
            ) },
          ]} />
      </Card>
    </>
  );
}
