"use client";
import { BellRing, Check, Store } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { BarList, BarsChart, TrendChart } from "@/components/charts";
import { DataTable, Delta, MetricCard, PageHeader, ProductThumb, StatusBadge, toast } from "@/components/shared";
import { ConnectionCard } from "@/components/shared/connection";
import { Badge, Button, Card, CardHeader, EmptyState, Segmented } from "@/components/ui";
import { adRatios, adRows, dailySeries, inventoryFor, kpis, productStats, sumAds, type Scope, type StockStatus } from "@/lib/analytics/metrics";
import { fmtDate } from "@/lib/dates";
import { MP_COLOR, MP_LABEL, type Marketplace } from "@/lib/demo/types";
import { change, inr, mult, num, pct } from "@/lib/format";
import { useScope } from "@/lib/use-scope";

const PLANNED = [["Myntra", "Fashion and lifestyle"], ["Meesho", "Value commerce"], ["JioMart", "Grocery and general merchandise"], ["Nykaa", "Beauty and personal care"], ["AJIO", "Fashion"], ["Tata CLiQ", "Premium lifestyle"]];

function ComingSoon() {
  const [asked, setAsked] = React.useState<string[]>([]);
  return (
    <>
      <PageHeader title="Other marketplaces" description="Connectors planned after Amazon and Flipkart. None of these are available yet, and no data is shown for them." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PLANNED.map(([name, cat]) => (
          <Card key={name} className="flex items-center gap-3 p-4">
            <span className="flex size-10 items-center justify-center rounded-lg bg-raised text-muted"><Store className="size-5" /></span>
            <div className="min-w-0 flex-1"><p className="text-[14px] font-semibold">{name}</p><p className="text-[12.5px] text-muted">{cat}</p></div>
            <div className="flex flex-col items-end gap-1.5">
              <Badge>Coming soon</Badge>
              <Button size="sm" variant={asked.includes(name) ? "ghost" : "secondary"} onClick={() => { setAsked((a) => (a.includes(name) ? a.filter((x) => x !== name) : [...a, name])); if (!asked.includes(name)) toast(`Interest in ${name} noted for this demo session`); }}>
                {asked.includes(name) ? <><Check />Interest noted</> : <><BellRing />Register interest</>}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

export default function MarketplacePage() {
  const { channel } = useParams<{ channel: string }>();
  const global = useScope();
  const router = useRouter();
  const [stockFilter, setStockFilter] = React.useState<"all" | "risk">("all");
  const mp = channel as Marketplace;
  const valid = mp === "amazon" || mp === "flipkart";
  const scope: Scope = React.useMemo(() => ({ ...global, marketplace: valid ? mp : "all" }), [global, mp, valid]);
  const d = React.useMemo(() => {
    const cur = kpis(scope), prev = kpis(scope, scope.prevFrom, scope.prevTo);
    const ads = sumAds(adRows(scope, scope.from, scope.to, { platform: mp === "amazon" ? "amazon_ads" : "flipkart_ads" }));
    const products = productStats(scope);
    const cats = new Map<string, number>();
    products.forEach((p) => cats.set(p.product.category, (cats.get(p.product.category) ?? 0) + p.revenue));
    return { cur, prev, ads, products, series: dailySeries(scope), inventory: inventoryFor(scope.ds, scope.marketplace), cats: [...cats].sort((a, b) => b[1] - a[1]) };
  }, [scope, mp]);
  if (channel === "other") return <ComingSoon />;
  if (!valid) return <Card><EmptyState icon={<Store />} title="Marketplace not found" body="Choose Amazon or Flipkart from the navigation." /></Card>;
  const { cur, prev } = d;
  const name = MP_LABEL[mp];
  const color = MP_COLOR[mp];
  const adR = adRatios(d.ads);
  const stock = d.inventory.reduce((m, r) => m.set(r.status, (m.get(r.status) ?? 0) + 1), new Map<StockStatus, number>());
  const inv = d.inventory.filter((r) => stockFilter === "all" || ["Critical", "Low", "Out of stock"].includes(r.status)).sort((a, b) => a.cover - b.cover);

  return (
    <>
      <PageHeader title={name} description={<>{scope.ds.client.name} on {name} · {fmtDate(scope.from)} – {fmtDate(scope.to)}</>} />
      <ConnectionCard title={`${name} connection`} ids={mp === "amazon" ? ["amazon-sp", "amazon-ads"] : ["flipkart-seller"]} />

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Revenue" value={inr(cur.sales.revenue, true)} delta={change(cur.sales.revenue, prev.sales.revenue)} />
        <MetricCard label="Orders" value={num(cur.sales.orders)} delta={change(cur.sales.orders, prev.sales.orders)} />
        <MetricCard label="Average order value" value={inr(cur.aov)} delta={change(cur.aov, prev.aov)} />
        <MetricCard label="Conversion rate" value={pct(cur.conversionRate)} delta={change(cur.conversionRate, prev.conversionRate)} hint="Orders ÷ listing sessions." />
        <MetricCard label="Listed products" value={String(d.products.length)} hint={`Products with an active ${name} listing in the demo catalogue.`} />
        <MetricCard label="Return rate" value={pct(cur.sales.returns / (cur.sales.units || 1))} delta={change(cur.sales.returns / (cur.sales.units || 1), prev.sales.returns / (prev.sales.units || 1))} goodWhen="down" hint="Returned units ÷ units sold." />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Sales trend" subtitle="Daily revenue" />
          <div className="px-3 pb-4"><TrendChart data={d.series} series={[{ key: "revenue", label: "Revenue", color, kind: "area" }]} fmt={(n) => inr(n, true)} footer={(r) => `${num(r.orders)} orders · ${num(r.units)} units`} /></div>
        </Card>
        <Card>
          <CardHeader title={`${name} Ads`} subtitle={`Marketplace-specific advertising${mp === "amazon" ? " (Sponsored Products and Brands)" : " (PLA and PCA)"}`} />
          <dl className="tnum grid grid-cols-2 gap-x-4 gap-y-3 px-5 pb-4 text-[13px]">
            <div><dt className="text-[12px] text-muted">Ad spend</dt><dd className="text-[17px] font-semibold">{inr(d.ads.spend, true)}</dd></div>
            <div><dt className="text-[12px] text-muted">Attributed sales</dt><dd className="text-[17px] font-semibold">{inr(d.ads.revenue, true)}</dd></div>
            <div><dt className="text-[12px] text-muted">ROAS</dt><dd className="text-[17px] font-semibold">{mult(adR.roas)}</dd></div>
            <div><dt className="text-[12px] text-muted">ACOS</dt><dd className="text-[17px] font-semibold">{pct(adR.acos)}</dd></div>
            <div><dt className="text-[12px] text-muted">TACOS on {name}</dt><dd className="text-[17px] font-semibold">{pct(d.ads.spend / (cur.sales.revenue || 1))}</dd></div>
            <div><dt className="text-[12px] text-muted">Ad share of sales</dt><dd className="text-[17px] font-semibold">{pct(d.ads.revenue / (cur.sales.revenue || 1))}</dd></div>
          </dl>
          <div className="border-t border-line px-5 py-4">
            <p className="mb-3 text-[12.5px] font-medium text-muted">Revenue by category</p>
            <BarList color={color} fmt={(n) => inr(n, true)} items={d.cats.map(([c, v]) => ({ key: c, label: c, value: v }))} />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Product performance" subtitle={`${d.products.length} products on ${name}`} />
          <DataTable rows={d.products} rowKey={(p) => p.product.id} defaultSort={{ key: "rev", dir: "desc" }} onRowClick={(p) => router.push(`/products?product=${p.product.id}`)} dense
            columns={[
              { key: "name", header: "Product", cell: (p) => <span className="flex items-center gap-2.5"><ProductThumb product={p.product} size={28} /><span className="font-medium">{p.product.name}</span></span>, sort: (p) => p.product.name },
              { key: "units", header: "Units", align: "right", cell: (p) => num(p.units), sort: (p) => p.units },
              { key: "rev", header: "Revenue", align: "right", cell: (p) => inr(p.revenue), sort: (p) => p.revenue },
              { key: "growth", header: "Change", align: "right", cell: (p) => <Delta value={p.growth} />, sort: (p) => p.growth ?? -9 },
              { key: "cvr", header: "Conv. rate", align: "right", cell: (p) => pct(p.conversionRate), sort: (p) => p.conversionRate },
              { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} />, sort: (p) => p.status },
            ]} />
        </Card>
        <Card>
          <CardHeader title="Order performance" subtitle="Orders per day" />
          <div className="px-3"><BarsChart data={d.series} series={[{ key: "orders", label: "Orders", color }]} fmt={(n) => num(n)} height={170} /></div>
          <dl className="tnum mt-2 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line px-5 py-4 text-[13px]">
            <div><dt className="text-[12px] text-muted">Orders placed</dt><dd className="font-semibold">{num(cur.sales.orders)}</dd></div>
            <div><dt className="text-[12px] text-muted">Units per order</dt><dd className="font-semibold">{(cur.sales.units / (cur.sales.orders || 1)).toFixed(2)}</dd></div>
            <div><dt className="text-[12px] text-muted">Cancelled orders</dt><dd className="font-semibold">{num(cur.sales.cancellations)} <span className="font-normal text-muted">({pct(cur.sales.cancellations / (cur.sales.orders || 1))})</span></dd></div>
            <div><dt className="text-[12px] text-muted">Returned units</dt><dd className="font-semibold">{num(cur.sales.returns)} <span className="font-normal text-muted">({pct(cur.sales.returns / (cur.sales.units || 1))})</span></dd></div>
          </dl>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Inventory overview" subtitle="Days of cover = units on hand ÷ average daily units over the last 14 days"
          action={<>
            <span className="hidden gap-1.5 md:flex">{(["Critical", "Low", "Healthy", "Overstock"] as StockStatus[]).map((s) => <Badge key={s} tone={s === "Critical" ? "neg" : s === "Healthy" ? "pos" : "warn"}>{stock.get(s) ?? 0} {s.toLowerCase()}</Badge>)}</span>
            <Segmented label="Inventory filter" value={stockFilter} onChange={setStockFilter} options={[{ value: "all", label: "All" }, { value: "risk", label: "At risk" }]} />
          </>} />
        <DataTable rows={inv} rowKey={(r) => r.productId} dense empty={<EmptyState title="No listings at risk" body="Every listing has at least 14 days of cover." />}
          columns={[
            { key: "name", header: "Product", cell: (r) => <span className="flex items-center gap-2.5"><ProductThumb product={r.product} size={28} /><span><span className="block font-medium">{r.product.name}</span><span className="text-[12px] text-faint">{r.product.sku}</span></span></span>, sort: (r) => r.product.name },
            { key: "onHand", header: "On hand", align: "right", cell: (r) => num(r.onHand), sort: (r) => r.onHand },
            { key: "inbound", header: "Inbound", align: "right", cell: (r) => (r.inbound ? num(r.inbound) : "—"), sort: (r) => r.inbound },
            { key: "vel", header: "Units / day", align: "right", cell: (r) => r.dailyVelocity.toFixed(1), sort: (r) => r.dailyVelocity },
            { key: "cover", header: "Days of cover", align: "right", cell: (r) => (isFinite(r.cover) ? Math.floor(r.cover) : "—"), sort: (r) => r.cover },
            { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} />, sort: (r) => r.status },
          ]} />
      </Card>
    </>
  );
}
