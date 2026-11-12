"use client";
import { useRouter } from "next/navigation";
import * as React from "react";
import { BarList, BarsChart, Legend, TrendChart, type Series } from "@/components/charts";
import { DataTable, Delta, MetricCard, PageHeader, ProductThumb } from "@/components/shared";
import { Card, CardHeader, Segmented } from "@/components/ui";
import { bucketSeries, dailySeries, kpis, productStats, type Bucket, type ProductStat } from "@/lib/analytics/metrics";
import { fmtDate, fmtDay, fmtMonth, weekStart } from "@/lib/dates";
import { MP_COLOR, MP_LABEL, type Marketplace } from "@/lib/demo/types";
import { change, inr, num, pct } from "@/lib/format";
import { useScope } from "@/lib/use-scope";

export default function Sales() {
  const scope = useScope();
  const router = useRouter();
  const [bucket, setBucket] = React.useState<Bucket>("day");
  const [metric, setMetric] = React.useState<"revenue" | "orders">("revenue");
  const d = React.useMemo(() => {
    const cur = kpis(scope), prev = kpis(scope, scope.prevFrom, scope.prevTo);
    const days = dailySeries(scope), prevDays = dailySeries(scope, scope.prevFrom, scope.prevTo);
    const compare = days.map((p, i) => ({ date: p.date, label: `Day ${i + 1}`, current: p.revenue, previous: prevDays[i]?.revenue ?? 0, currentOrders: p.orders, previousOrders: prevDays[i]?.orders ?? 0, aov: p.orders ? Math.round(p.revenue / p.orders) : null }));
    return { cur, prev, days, compare, products: productStats(scope) };
  }, [scope]);
  const { cur, prev } = d;
  const mps = (scope.marketplace === "all" ? ["amazon", "flipkart"] : [scope.marketplace]) as Marketplace[];
  const bucketed = React.useMemo(() => bucketSeries(d.days, bucket, bucket === "week" ? weekStart : (iso) => iso.slice(0, 7)).map((p) => ({ ...p, label: bucket === "day" ? p.date : bucket === "week" ? `Wk of ${fmtDay(p.date)}` : fmtMonth(p.date + "-01") })), [d.days, bucket]);
  const mpSeries: Series[] = mps.map((m) => ({ key: metric === "revenue" ? m : `${m}Orders`, label: MP_LABEL[m], color: MP_COLOR[m] }));
  const cmpSeries: Series[] = [{ key: metric === "revenue" ? "current" : "currentOrders", label: "This period", color: "var(--s-revenue)" }, { key: metric === "revenue" ? "previous" : "previousOrders", label: "Previous period", color: "var(--s-neutral)", kind: "dashed" }];
  const fmt = metric === "revenue" ? (n: number) => inr(n, true) : (n: number) => num(n);
  const movers = d.products.filter((p) => p.growth !== null);
  const best = [...movers].sort((a, b) => b.revenue - b.prevRevenue - (a.revenue - a.prevRevenue)).slice(0, 5);
  const poor = [...movers].sort((a, b) => a.revenue - a.prevRevenue - (b.revenue - b.prevRevenue)).slice(0, 5);
  const table = (rows: ProductStat[]) => (
    <DataTable rows={rows} rowKey={(p) => p.product.id} dense onRowClick={(p) => router.push(`/products?product=${p.product.id}`)}
      columns={[
        { key: "name", header: "Product", cell: (p) => <span className="flex items-center gap-2.5"><ProductThumb product={p.product} size={26} /><span className="font-medium">{p.product.name}</span></span> },
        { key: "rev", header: "Revenue", align: "right", cell: (p) => inr(p.revenue, true) },
        { key: "diff", header: "vs previous", align: "right", cell: (p) => `${p.revenue >= p.prevRevenue ? "+" : "−"}${inr(Math.abs(p.revenue - p.prevRevenue), true).replace("−", "")}` },
        { key: "growth", header: "Change", align: "right", cell: (p) => <Delta value={p.growth} /> },
      ]} />
  );
  return (
    <>
      <PageHeader title="Sales Analytics" description={<>{scope.ds.client.name} · {fmtDate(scope.from)} – {fmtDate(scope.to)} · previous period {fmtDate(scope.prevFrom)} – {fmtDate(scope.prevTo)}</>}
        actions={<Segmented label="Metric" value={metric} onChange={setMetric} options={[{ value: "revenue", label: "Revenue" }, { value: "orders", label: "Orders" }]} />} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard label="Revenue" value={inr(cur.sales.revenue, true)} delta={change(cur.sales.revenue, prev.sales.revenue)} />
        <MetricCard label="Orders" value={num(cur.sales.orders)} delta={change(cur.sales.orders, prev.sales.orders)} />
        <MetricCard label="Average order value" value={inr(cur.aov)} delta={change(cur.aov, prev.aov)} />
        <MetricCard label="Avg. daily revenue" value={inr(cur.sales.revenue / scope.days, true)} delta={change(cur.sales.revenue, prev.sales.revenue)} />
        <MetricCard label="Sales growth" value={inr(cur.sales.revenue - prev.sales.revenue, true)} delta={change(cur.sales.revenue, prev.sales.revenue)} hint="Revenue this period minus revenue in the previous period." className="col-span-2 lg:col-span-1" />
      </div>

      <Card className="mt-4">
        <CardHeader title={`${metric === "revenue" ? "Revenue" : "Orders"} by marketplace`} subtitle={bucket === "day" ? "Daily sales" : bucket === "week" ? "Weekly sales (weeks start Monday; first and last weeks may be partial)" : "Monthly sales (months may be partial)"}
          action={<Segmented label="Time grouping" value={bucket} onChange={setBucket} options={[{ value: "day", label: "Daily" }, { value: "week", label: "Weekly" }, { value: "month", label: "Monthly" }]} />} />
        <div className="px-3 pb-4"><Legend series={mpSeries} className="mb-2 px-2" /><BarsChart data={bucketed} x="label" series={mpSeries} fmt={fmt} stacked height={280} /></div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title={`${metric === "revenue" ? "Revenue" : "Orders"} comparison`} subtitle="This period against the previous period, aligned day by day" />
          <div className="px-3 pb-4"><Legend series={cmpSeries} className="mb-2 px-2" /><TrendChart data={d.compare} x="label" series={cmpSeries} fmt={fmt} height={240} /></div>
        </Card>
        <Card>
          <CardHeader title="Average order value" subtitle="Daily revenue ÷ orders" />
          <div className="px-3 pb-4"><TrendChart data={d.compare} series={[{ key: "aov", label: "AOV", color: "var(--s-revenue)" }]} fmt={(n) => inr(n)} height={264} /></div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Product-wise revenue" subtitle="Every product in view" />
          <div className="px-5 pb-5"><BarList fmt={(n) => inr(n, true)} items={d.products.map((p) => ({ key: p.product.id, label: p.product.name, value: p.revenue, sub: pct(p.share), onClick: () => router.push(`/products?product=${p.product.id}`) }))} /></div>
        </Card>
        <div className="space-y-4 xl:col-span-2">
          <Card><CardHeader title="Best-performing products" subtitle="Largest revenue gains against the previous period" />{table(best)}</Card>
          <Card><CardHeader title="Poor-performing products" subtitle="Largest revenue declines, or smallest gains, against the previous period" />{table(poor)}</Card>
        </div>
      </div>
    </>
  );
}
