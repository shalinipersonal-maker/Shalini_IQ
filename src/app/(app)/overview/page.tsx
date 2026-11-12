"use client";
import { ArrowRight, FileText, Megaphone, Package, Palette, RefreshCw, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { BarList, BarsChart, Legend, SplitBar, TrendChart, type Series } from "@/components/charts";
import { DataTable, Delta, DemoGeneratedTag, InsightCard, MetricCard, PageHeader } from "@/components/shared";
import { Badge, Button, Card, CardHeader, Segmented } from "@/components/ui";
import { computeInsights } from "@/lib/ai/insights";
import { adRatios, adRows, dailySeries, groupAds, kpis, productStats, salesRows, sumAds, sumSales } from "@/lib/analytics/metrics";
import { fmtDate } from "@/lib/dates";
import { MP_COLOR, MP_LABEL, PLATFORM_LABEL, type Marketplace } from "@/lib/demo/types";
import { change, inr, mult, num, pct, timeAgo } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useScope } from "@/lib/use-scope";

const ACT_ICON = { campaign: Megaphone, report: FileText, inventory: Package, creative: Palette, team: Users, data: RefreshCw };

export default function Overview() {
  const scope = useScope();
  const router = useRouter();
  const cfg = useStore((s) => s.settings.ai);
  const audit = useStore((s) => s.audit);
  const [view, setView] = React.useState<"money" | "orders">("money");
  const d = React.useMemo(() => {
    const cur = kpis(scope), prev = kpis(scope, scope.prevFrom, scope.prevTo);
    const series = dailySeries(scope);
    const insights = computeInsights(scope, cfg);
    const mps = (scope.marketplace === "all" ? ["amazon", "flipkart"] : [scope.marketplace]) as Marketplace[];
    const mp = mps.map((m) => {
      const c = sumSales(salesRows(scope.ds, scope.from, scope.to, m)), p = sumSales(salesRows(scope.ds, scope.prevFrom, scope.prevTo, m));
      const ads = sumAds(adRows(scope, scope.from, scope.to, { platform: m === "amazon" ? "amazon_ads" : "flipkart_ads" }));
      return { m, c, growth: change(c.revenue, p.revenue), adAttr: ads.revenue };
    });
    const rows = adRows(scope, scope.from, scope.to, { mp: scope.marketplace });
    const byC = groupAds(rows, (r) => r.campaignId);
    const camps = scope.campaigns.filter((c) => byC.has(c.id)).map((c) => ({ c, t: byC.get(c.id)!, r: adRatios(byC.get(c.id)!) }));
    const meta = sumAds(adRows(scope, scope.from, scope.to, { mp: scope.marketplace, platform: "meta" }));
    return { cur, prev, series, insights, mp, camps, meta, products: productStats(scope).slice(0, 6) };
  }, [scope, cfg]);
  const { cur, prev } = d;
  const summary = d.insights[0];
  // One recommendation per category, actionable categories first, so the list is not three versions of the same alert.
  const PRIORITY = ["campaign", "inventory", "budget", "product", "growth"];
  const actions = PRIORITY.map((c) => d.insights.find((i) => i.category === c)).filter((i) => !!i).sort((a, b) => ({ High: 0, Medium: 1, Low: 2 })[a.impact] - ({ High: 0, Medium: 1, Low: 2 })[b.impact]).slice(0, 3);
  const best = [...d.mp].sort((a, b) => b.c.revenue - a.c.revenue)[0];
  const wasting = d.insights.filter((i) => i.id.includes(":lowroas:") || i.id.includes(":ctrcvr:"));
  const wastedSpend = d.camps.filter((x) => wasting.some((w) => w.id.endsWith(x.c.id))).reduce((s, x) => s + x.t.spend, 0);
  const moneySeries: Series[] = [{ key: "revenue", label: "Revenue", color: "var(--s-revenue)", kind: "area" }, { key: "spend", label: "Ad spend", color: "var(--s-spend)" }];
  const orderSeries: Series[] = scope.marketplace === "all"
    ? [{ key: "amazonOrders", label: "Amazon orders", color: MP_COLOR.amazon }, { key: "flipkartOrders", label: "Flipkart orders", color: MP_COLOR.flipkart }]
    : [{ key: "orders", label: "Orders", color: MP_COLOR[scope.marketplace] }];
  const activity = [...audit.slice(0, 6).map((a) => ({ id: a.id, ts: a.ts, kind: "data" as const, text: `${a.action}: ${a.target}`, actor: a.actor })), ...scope.ds.activity].sort((a, b) => b.ts - a.ts).slice(0, 7);

  return (
    <>
      <PageHeader title="Overview" description={<>{scope.ds.client.name} · {fmtDate(scope.from)} – {fmtDate(scope.to)} · compared with the previous {scope.days} days</>}
        actions={<Button onClick={() => router.push("/reports")}><FileText />Generate report</Button>} />

      {/* The brief: what is happening, what is working, what is being wasted, what to do next */}
      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <span className="absolute inset-y-0 left-0 w-1 bg-ai" aria-hidden />
          <div className="flex flex-wrap items-center gap-2 text-[12.5px] font-medium text-ai"><Sparkles className="size-4" />AI brief for this period<DemoGeneratedTag /></div>
          <h2 className="mt-3 text-[24px] leading-tight font-semibold tracking-tight sm:text-[28px]">{summary.title}</h2>
          <p className="mt-2 max-w-2xl text-[14px] text-muted">{summary.explanation}</p>
          <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-line pt-4 sm:grid-cols-3">
            <div>
              <dt className="text-[12px] text-muted">Best marketplace</dt>
              <dd className="mt-0.5 text-[14px] font-semibold">{MP_LABEL[best.m]} <span className="tnum font-normal text-muted">· {inr(best.c.revenue, true)}</span></dd>
              <dd className="mt-0.5"><Delta value={best.growth} /></dd>
            </div>
            <div>
              <dt className="text-[12px] text-muted">Spend that needs review</dt>
              <dd className="tnum mt-0.5 text-[14px] font-semibold">{wasting.length ? inr(wastedSpend, true) : "None flagged"} {wasting.length > 0 && <span className="font-normal text-muted">· {wasting.length} campaign{wasting.length > 1 ? "s" : ""}</span>}</dd>
              <dd className="mt-0.5 text-[12px] text-faint">{wasting.length ? `${pct(wastedSpend / (cur.ads.spend || 1), 0)} of ad spend is below target return` : "All sales campaigns meet the ROAS floor"}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-muted">Recommended next step</dt>
              <dd className="mt-0.5 line-clamp-2 text-[13.5px] font-medium">{actions[0]?.title ?? "No action needed"}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <CardHeader title="What to do next" subtitle="Highest-impact recommendations" action={<Link href="/ai" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-accent hover:underline">AI Intelligence Center<ArrowRight className="size-3.5" /></Link>} />
          <div className="divide-y divide-line px-5 pb-2">{actions.map((i) => <InsightCard key={i.id} insight={i} scope={scope} compact />)}</div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <MetricCard label="Total revenue" value={inr(cur.sales.revenue, true)} delta={change(cur.sales.revenue, prev.sales.revenue)} hint="Gross ordered revenue across the marketplaces in view." />
        <MetricCard label="Total orders" value={num(cur.sales.orders)} delta={change(cur.sales.orders, prev.sales.orders)} />
        <MetricCard label="Average order value" value={inr(cur.aov)} delta={change(cur.aov, prev.aov)} hint="Revenue ÷ orders." />
        <MetricCard label="Conversion rate" value={pct(cur.conversionRate)} delta={change(cur.conversionRate, prev.conversionRate)} hint="Orders ÷ listing sessions." />
        <MetricCard label="Units sold" value={num(cur.sales.units)} delta={change(cur.sales.units, prev.sales.units)} />
        <MetricCard label="Total ad spend" value={inr(cur.ads.spend, true)} delta={change(cur.ads.spend, prev.ads.spend)} goodWhen="neutral" hint="Amazon Ads + Flipkart Ads + Meta Ads spend." />
        <MetricCard label="Advertising revenue" value={inr(cur.ads.revenue, true)} delta={change(cur.ads.revenue, prev.ads.revenue)} hint="Sum of each ad platform's own attributed sales. Platforms can credit the same order, so this is not additional to total revenue." />
        <MetricCard label="ROAS" value={mult(cur.roas)} delta={change(cur.roas, prev.roas)} hint="Platform-attributed revenue ÷ ad spend." />
        <MetricCard label="ACOS" value={pct(cur.acos)} delta={change(cur.acos, prev.acos)} goodWhen="down" hint="Ad spend ÷ ad-attributed sales." />
        <MetricCard label="TACOS" value={pct(cur.tacos)} delta={change(cur.tacos, prev.tacos)} goodWhen="down" hint="Total ad spend ÷ total sales." />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title={view === "money" ? "Revenue and advertising spend" : "Orders"} subtitle={`Daily, ${fmtDate(scope.from)} – ${fmtDate(scope.to)}`}
            action={<Segmented label="Chart metric" value={view} onChange={setView} options={[{ value: "money", label: "Revenue & spend" }, { value: "orders", label: "Orders" }]} />} />
          <div className="px-3 pb-4">
            <Legend series={view === "money" ? moneySeries : orderSeries} className="mb-2 px-2" />
            {view === "money" ? <TrendChart data={d.series} series={moneySeries} fmt={(n) => inr(n, true)} footer={(r) => `TACOS ${pct(r.spend / (r.revenue || 1))}`} /> : <BarsChart data={d.series} series={orderSeries} fmt={(n) => num(n)} stacked />}
          </div>
        </Card>
        <Card>
          <CardHeader title="Marketplace comparison" subtitle="Share of revenue in this period" />
          <div className="space-y-4 px-5 pb-5">
            {d.mp.map(({ m, c, growth }) => (
              <Link key={m} href={`/marketplaces/${m}`} className="group block rounded-lg border border-line p-3 transition-colors hover:border-line-strong">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-[13.5px] font-semibold"><span className="size-2 rounded-[2px]" style={{ background: MP_COLOR[m] }} />{MP_LABEL[m]}</span>
                  <Delta value={growth} />
                </div>
                <p className="tnum mt-1.5 text-[20px] font-semibold">{inr(c.revenue, true)}</p>
                <div className="mt-2 h-1.5 rounded-full bg-raised"><div className="h-full rounded-full" style={{ width: `${(c.revenue / (cur.sales.revenue || 1)) * 100}%`, background: MP_COLOR[m] }} /></div>
                <dl className="tnum mt-2.5 grid grid-cols-3 text-[12px]">
                  <div><dt className="text-faint">Share</dt><dd className="font-medium">{pct(c.revenue / (cur.sales.revenue || 1), 0)}</dd></div>
                  <div><dt className="text-faint">Orders</dt><dd className="font-medium">{num(c.orders)}</dd></div>
                  <div><dt className="text-faint">AOV</dt><dd className="font-medium">{inr(c.revenue / (c.orders || 1))}</dd></div>
                </dl>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader title="Sales channel breakdown" subtitle="Where revenue came from" />
          <div className="px-5 pb-5">
            <SplitBar fmt={(n) => inr(n, true)} parts={d.mp.flatMap(({ m, c, adAttr }) => [
              { key: m + "o", label: `${MP_LABEL[m]} · organic and other`, value: c.revenue - adAttr, color: MP_COLOR[m] },
              { key: m + "a", label: `${MP_LABEL[m]} · ${MP_LABEL[m]} Ads-attributed`, value: adAttr, color: `color-mix(in oklab, ${MP_COLOR[m]} 45%, var(--surface))` },
            ])} />
            <p className="mt-3 border-t border-line pt-3 text-[12px] leading-relaxed text-muted">Meta reports {inr(d.meta.revenue, true)} of purchases from its ads. Those orders are already inside the marketplace totals above and can overlap with marketplace-ad attribution, so they are not added.</p>
          </div>
        </Card>
        <Card>
          <CardHeader title="Top-performing products" subtitle="By revenue" action={<Link href="/products" className="text-[12.5px] font-medium text-accent hover:underline">All products</Link>} />
          <div className="px-5 pb-5">
            <BarList fmt={(n) => inr(n, true)} items={d.products.map((p) => ({ key: p.product.id, label: p.product.name, value: p.revenue, sub: <Delta value={p.growth} />, onClick: () => router.push(`/products?product=${p.product.id}`) }))} />
          </div>
        </Card>
        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader title="Recent activity" subtitle="Workspace events" />
          <ul className="px-5 pb-4">
            {activity.map((a) => {
              const Icon = ACT_ICON[a.kind];
              return (
                <li key={a.id} className="flex gap-3 border-b border-line py-2.5 last:border-0">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-raised text-muted"><Icon className="size-3.5" /></span>
                  <span className="min-w-0"><span className="block text-[13px] leading-snug">{a.text}</span><span className="text-[12px] text-faint">{a.actor} · {timeAgo(a.ts)}</span></span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Top-performing campaigns" subtitle="Ranked by platform-attributed revenue. Click a column to sort." action={<Link href="/advertising" className="text-[12.5px] font-medium text-accent hover:underline">Advertising analytics</Link>} />
        <DataTable rows={d.camps} rowKey={(x) => x.c.id} defaultSort={{ key: "rev", dir: "desc" }} onRowClick={(x) => router.push(x.c.platform === "meta" ? `/meta-ads?campaign=${x.c.id}` : "/advertising")}
          columns={[
            { key: "name", header: "Campaign", cell: (x) => <span className="font-medium">{x.c.name}</span>, sort: (x) => x.c.name },
            { key: "platform", header: "Platform", cell: (x) => <Badge>{PLATFORM_LABEL[x.c.platform]}</Badge>, sort: (x) => x.c.platform },
            { key: "spend", header: "Spend", align: "right", cell: (x) => inr(x.t.spend), sort: (x) => x.t.spend },
            { key: "rev", header: "Attributed revenue", align: "right", cell: (x) => inr(x.t.revenue), sort: (x) => x.t.revenue },
            { key: "roas", header: "ROAS", align: "right", cell: (x) => <span className={x.r.roas < cfg.roasFloor && x.c.objective !== "Awareness" ? "font-medium text-neg" : ""}>{mult(x.r.roas)}</span>, sort: (x) => x.r.roas },
            { key: "acos", header: "ACOS", align: "right", cell: (x) => pct(x.r.acos), sort: (x) => x.r.acos },
            { key: "conv", header: "Conversions", align: "right", cell: (x) => num(x.t.conversions), sort: (x) => x.t.conversions },
          ]} />
      </Card>
    </>
  );
}
