"use client";
import { Package, Palette, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Legend, TrendChart, type Series } from "@/components/charts";
import { DataTable, Delta, PageHeader, ProductThumb, StatusBadge } from "@/components/shared";
import { Badge, Button, Card, EmptyState, Input, Select, Sheet } from "@/components/ui";
import { dailySeries, inventoryFor, productStats, salesRows, sumSales, type ProductStat, type Scope } from "@/lib/analytics/metrics";
import { MP_COLOR, MP_LABEL } from "@/lib/demo/types";
import { inr, num, pct } from "@/lib/format";
import { useScope } from "@/lib/use-scope";

function ProductDetail({ stat, scope }: { stat: ProductStat; scope: Scope }) {
  const p = stat.product;
  const d = React.useMemo(() => {
    const days = new Map(dailySeries(scope).map((x) => [x.date, { date: x.date, amazon: 0, flipkart: 0 }]));
    for (const r of salesRows(scope.ds, scope.from, scope.to, scope.marketplace, p.id)) days.get(r.date)![r.marketplace] += r.revenue;
    const t = sumSales(salesRows(scope.ds, scope.from, scope.to, scope.marketplace, p.id));
    return { series: [...days.values()], t, inv: inventoryFor(scope.ds, scope.marketplace).filter((r) => r.productId === p.id), camps: scope.campaigns.filter((c) => c.productIds.includes(p.id)) };
  }, [scope, p.id]);
  const series: Series[] = p.listings.filter((m) => scope.marketplace === "all" || m === scope.marketplace).map((m) => ({ key: m, label: MP_LABEL[m], color: MP_COLOR[m] }));
  return (
    <div className="space-y-5 p-5">
      <div className="flex items-center gap-3">
        <ProductThumb product={p} size={56} />
        <div className="min-w-0">
          <p className="text-[12.5px] text-muted">{p.category} · {p.sku}</p>
          <p className="tnum text-[15px] font-semibold">{inr(p.price)} <span className="text-[13px] font-normal text-faint line-through">{inr(p.mrp)}</span></p>
          <div className="mt-1 flex gap-1.5">{p.listings.map((m) => <Badge key={m}>{MP_LABEL[m]}</Badge>)}<StatusBadge status={stat.status} /></div>
        </div>
      </div>
      <dl className="tnum grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Revenue", inr(stat.revenue, true)], ["Orders", num(stat.orders)], ["Units", num(stat.units)], ["Conv. rate", pct(stat.conversionRate)], ["Sessions", num(stat.sessions)], ["Revenue share", pct(stat.share)], ["Return rate", pct(d.t.returns / (d.t.units || 1))], ["AOV", inr(stat.revenue / (stat.orders || 1))]].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-line px-3 py-2"><dt className="text-[12px] text-muted">{k}</dt><dd className="text-[15px] font-semibold">{v}</dd></div>
        ))}
      </dl>
      <div>
        <div className="mb-2 flex items-center justify-between"><p className="text-[13.5px] font-semibold">Daily revenue</p><Delta value={stat.growth} /></div>
        <Legend series={series} className="mb-1" />
        <TrendChart data={d.series} series={series} fmt={(n) => inr(n, true)} height={190} />
      </div>
      <div>
        <p className="mb-2 text-[13.5px] font-semibold">Inventory</p>
        <ul className="divide-y divide-line rounded-lg border border-line">
          {d.inv.map((r) => (
            <li key={r.marketplace} className="tnum flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-[13px]">
              <span className="font-medium">{MP_LABEL[r.marketplace]}</span>
              <span className="text-muted">{num(r.onHand)} on hand · {r.dailyVelocity.toFixed(1)}/day · {isFinite(r.cover) ? Math.floor(r.cover) : "—"} days of cover{r.inbound ? ` · ${num(r.inbound)} inbound` : ""}</span>
              <StatusBadge status={r.status} />
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-2 text-[13.5px] font-semibold">Campaigns targeting this product</p>
        {d.camps.length ? <ul className="space-y-1.5">{d.camps.map((c) => <li key={c.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-[13px]"><Link className="font-medium hover:text-accent" href={c.platform === "meta" ? `/meta-ads?campaign=${c.id}` : "/advertising"}>{c.name}</Link><StatusBadge status={c.status} /></li>)}</ul> : <p className="text-[13px] text-muted">No campaign targets this product on its own. It may still be advertised through catalogue campaigns.</p>}
      </div>
      <Link href={`/studio?product=${p.id}`} className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-line px-3 text-[13px] font-medium hover:bg-raised"><Palette className="size-4" />Create an ad creative for this product</Link>
    </div>
  );
}

function Products() {
  const scope = useScope();
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const stats = React.useMemo(() => productStats(scope), [scope]);
  const stock = React.useMemo(() => {
    const m = new Map<string, { onHand: number; worst: number }>();
    for (const r of inventoryFor(scope.ds, scope.marketplace)) {
      const e = m.get(r.productId) ?? { onHand: 0, worst: Infinity };
      m.set(r.productId, { onHand: e.onHand + r.onHand, worst: Math.min(e.worst, r.cover) });
    }
    return m;
  }, [scope]);
  const cats = [...new Set(scope.ds.products.map((p) => p.category))];
  const needle = q.trim().toLowerCase();
  const rows = stats.filter((s) => (cat === "all" || s.product.category === cat) && (status === "all" || s.status === status) && (!needle || s.product.name.toLowerCase().includes(needle) || s.product.sku.toLowerCase().includes(needle)));
  const open = stats.find((s) => s.product.id === params.get("product"));
  const setOpen = (id?: string) => router.replace(id ? `${path}?product=${id}` : path, { scroll: false });
  return (
    <>
      <PageHeader title="Products" description={`${stats.length} products for ${scope.ds.client.name}${scope.marketplace === "all" ? " across Amazon and Flipkart" : ` on ${MP_LABEL[scope.marketplace]}`}. Sales figures follow the date range above.`} />
      <Card>
        <div className="flex flex-wrap items-center gap-2 px-5 py-3">
          <div className="relative min-w-52 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-faint" />
            <Input aria-label="Search products" placeholder="Search by name or SKU" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
          </div>
          <Select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)} className="w-auto"><option value="all">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</Select>
          <Select aria-label="Performance status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto"><option value="all">All statuses</option>{["Top performer", "Growing", "Stable", "Declining"].map((c) => <option key={c}>{c}</option>)}</Select>
          <span className="ml-auto text-[12.5px] text-muted">{rows.length} of {stats.length}</span>
        </div>
        <DataTable rows={rows} rowKey={(s) => s.product.id} defaultSort={{ key: "rev", dir: "desc" }} onRowClick={(s) => setOpen(s.product.id)}
          empty={<EmptyState icon={<Package />} title="No products match" body="Clear the search or change the filters." action={<Button onClick={() => { setQ(""); setCat("all"); setStatus("all"); }}>Clear filters</Button>} />}
          columns={[
            { key: "name", header: "Product", cell: (s) => <span className="flex items-center gap-3"><ProductThumb product={s.product} /><span className="min-w-0"><span className="block font-medium">{s.product.name}</span><span className="text-[12px] text-faint">{s.product.category}</span></span></span>, sort: (s) => s.product.name },
            { key: "sku", header: "SKU", cell: (s) => <span className="tnum text-muted">{s.product.sku}</span>, sort: (s) => s.product.sku },
            { key: "mp", header: "Marketplace", cell: (s) => <span className="flex gap-1">{s.product.listings.map((m) => <Badge key={m}>{MP_LABEL[m]}</Badge>)}</span> },
            { key: "price", header: "Selling price", align: "right", cell: (s) => inr(s.product.price), sort: (s) => s.product.price },
            { key: "rev", header: "Sales", align: "right", cell: (s) => inr(s.revenue), sort: (s) => s.revenue },
            { key: "orders", header: "Orders", align: "right", cell: (s) => num(s.orders), sort: (s) => s.orders },
            { key: "inv", header: "Inventory", align: "right", hint: "Units on hand across the marketplaces in view", cell: (s) => { const e = stock.get(s.product.id); return <span className={e && e.worst < 7 ? "font-medium text-neg" : e && e.worst < 14 ? "text-warn" : ""}>{num(e?.onHand ?? 0)}</span>; }, sort: (s) => stock.get(s.product.id)?.onHand ?? 0 },
            { key: "growth", header: "Change", align: "right", cell: (s) => <Delta value={s.growth} />, sort: (s) => s.growth ?? -9 },
            { key: "status", header: "Performance", cell: (s) => <StatusBadge status={s.status} />, sort: (s) => s.status },
          ]} />
      </Card>
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen()} title={open?.product.name ?? "Product"} description="Product detail and analytics for the selected period">
        {open && <ProductDetail stat={open} scope={scope} />}
      </Sheet>
    </>
  );
}

export default function Page() {
  return <React.Suspense fallback={null}><Products /></React.Suspense>;
}
