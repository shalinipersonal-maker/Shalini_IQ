"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronRight, Eye, Megaphone, MoreHorizontal, Pause, Pencil, Play, Plus, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Legend, TrendChart, type Series } from "@/components/charts";
import { DataTable, MetricCard, PageHeader, StatusBadge, toast } from "@/components/shared";
import { ConnectionCard } from "@/components/shared/connection";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Menu, MenuContent, MenuItem, MenuTrigger, Modal, Select, Sheet, cn } from "@/components/ui";
import { adRatios, adRows, dailySeries, groupAds, sumAds, type AdTotals, type Scope } from "@/lib/analytics/metrics";
import { fmtDate, todayISO } from "@/lib/dates";
import { MP_LABEL, type Campaign } from "@/lib/demo/types";
import { change, dec, inr, mult, num, pct } from "@/lib/format";
import { newId, useCan, useStore } from "@/lib/store";
import { useScope } from "@/lib/use-scope";

const ZERO: AdTotals = { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0, reach: 0, days: 0 };
const OBJECTIVES = ["Sales", "Traffic", "Awareness", "Leads", "Engagement"];
const DEMO_ACTION_NOTE = "Demo action: this changes sample data stored in your browser. Nothing is sent to Meta.";

const schema = z.object({
  name: z.string().trim().min(3, "Use at least 3 characters").max(80, "Keep the name under 80 characters"),
  objective: z.enum(["Sales", "Traffic", "Awareness", "Leads", "Engagement"]),
  dailyBudget: z.coerce.number({ message: "Enter a daily budget" }).int("Use whole rupees").min(100, "Minimum daily budget is ₹100").max(500000, "Maximum daily budget is ₹5,00,000"),
  destination: z.enum(["amazon", "flipkart"]),
  status: z.enum(["active", "paused", "draft"]),
});
type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

function CampaignForm({ campaign, clientId, onDone }: { campaign: Campaign | null; clientId: string; onDone: () => void }) {
  const save = useStore((s) => s.saveCampaign);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: campaign ? { name: campaign.name, objective: campaign.objective as FormOut["objective"], dailyBudget: campaign.dailyBudget, destination: campaign.destination, status: campaign.status } : { name: "", objective: "Sales", dailyBudget: 1000, destination: "amazon", status: "draft" },
  });
  const submit = (v: FormOut) => {
    const next: Campaign = campaign ? { ...campaign, ...v } : { id: `custom-${newId()}`, clientId, platform: "meta", adsets: [], productIds: [], startDate: todayISO(), custom: true, ...v };
    save(next, !campaign);
    toast(campaign ? `Saved changes to "${v.name}" (demo)` : `Created "${v.name}" (demo)`);
    onDone();
  };
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <Field label="Campaign name" error={errors.name?.message}><Input {...register("name")} placeholder="Prospecting | Category | Audience" autoFocus /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Objective" error={errors.objective?.message}><Select {...register("objective")}>{OBJECTIVES.map((o) => <option key={o}>{o}</option>)}</Select></Field>
        <Field label="Daily budget (₹)" error={errors.dailyBudget?.message}><Input type="number" inputMode="numeric" {...register("dailyBudget")} /></Field>
        <Field label="Sends shoppers to"><Select {...register("destination")} disabled={!!campaign && !campaign.custom}><option value="amazon">Amazon listing</option><option value="flipkart">Flipkart listing</option></Select></Field>
        <Field label="Status"><Select {...register("status")}><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option></Select></Field>
      </div>
      <p className="rounded-lg bg-accent-soft px-3 py-2 text-[12.5px] text-accent">{DEMO_ACTION_NOTE}{!campaign && " A new demo campaign has no delivery history, so its metrics stay at zero."}</p>
      <div className="flex justify-end gap-2"><Button onClick={onDone}>Cancel</Button><Button type="submit" variant="primary" disabled={isSubmitting}>{campaign ? "Save changes" : "Create campaign"}</Button></div>
    </form>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return <div className="rounded-lg border border-line px-3 py-2"><dt className="text-[12px] text-muted">{k}</dt><dd className="tnum text-[15px] font-semibold">{v}</dd></div>;
}
const statList = (t: AdTotals): [string, string][] => {
  const r = adRatios(t);
  return [["Amount spent", inr(t.spend)], ["Impressions", num(t.impressions, true)], ["Avg. daily reach", num(r.avgDailyReach, true)], ["Frequency", dec(r.frequency)], ["Clicks", num(t.clicks)], ["CTR", pct(r.ctr, 2)], ["CPC", inr(r.cpc)], ["CPM", inr(r.cpm)], ["Conversions", num(t.conversions)], ["Cost per result", inr(r.cpa)], ["Purchase value", inr(t.revenue)], ["ROAS", mult(r.roas)]];
};

function CampaignDetail({ c, scope, canEdit, onEdit }: { c: Campaign; scope: Scope; canEdit: boolean; onEdit: () => void }) {
  const setStatus = useStore((s) => s.setCampaignStatus);
  const [openSet, setOpenSet] = React.useState<string | null>(c.adsets[0]?.id ?? null);
  const [adId, setAdId] = React.useState<string | null>(null);
  const d = React.useMemo(() => {
    const rows = adRows(scope, scope.from, scope.to, { campaignId: c.id });
    return { rows, total: sumAds(rows), bySet: groupAds(rows, (r) => r.adsetId), byAd: groupAds(rows, (r) => r.adId), series: dailySeries(scope, scope.from, scope.to, { campaignId: c.id }) };
  }, [scope, c.id]);
  const series: Series[] = [{ key: "adRevenue", label: "Purchase value", color: "var(--s-revenue)", kind: "area" }, { key: "spend", label: "Amount spent", color: "var(--s-spend)" }];
  const ad = c.adsets.flatMap((s) => s.ads).find((a) => a.id === adId);
  const possible = c.dailyBudget * Math.max(d.total.days, 1);
  return (
    <div className="space-y-5 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={c.status} /><Badge>{c.objective}</Badge><Badge>To {MP_LABEL[c.destination]}</Badge>
        <span className="text-[12.5px] text-muted">Started {fmtDate(c.startDate)}{c.endDate ? ` · last delivery ${fmtDate(c.endDate)}` : ""}</span>
        <span className="ml-auto flex gap-2">
          <Button size="sm" disabled={!canEdit} onClick={onEdit}><Pencil />Edit</Button>
          {c.status === "active" ? <Button size="sm" disabled={!canEdit} onClick={() => { setStatus(c, "paused"); toast(`Paused "${c.name}" (demo)`); }}><Pause />Pause</Button> : <Button size="sm" variant="primary" disabled={!canEdit} onClick={() => { setStatus(c, "active"); toast(`Resumed "${c.name}" (demo)`); }}><Play />Resume</Button>}
        </span>
      </div>
      <p className="text-[12px] text-faint">{DEMO_ACTION_NOTE}</p>
      {d.rows.length === 0 ? <EmptyState icon={<Megaphone />} title="No delivery in this period" body={c.custom ? "This campaign was created in the demo and has no delivery history." : "Widen the date range to see earlier delivery."} /> : <>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">{statList(d.total).map(([k, v]) => <Stat key={k} k={k} v={v} />)}</dl>
        <div>
          <div className="mb-1 flex justify-between text-[12.5px]"><span className="font-medium">Budget utilisation</span><span className="tnum text-muted">{inr(d.total.spend)} of {inr(possible)} ({pct(d.total.spend / possible, 0)}) · {inr(c.dailyBudget)} a day</span></div>
          <div className="h-1.5 rounded-full bg-raised"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (d.total.spend / possible) * 100)}%` }} /></div>
        </div>
        <div><Legend series={series} className="mb-1" /><TrendChart data={d.series} series={series} fmt={(n) => inr(n, true)} height={200} /></div>
        <div>
          <p className="mb-2 text-[13.5px] font-semibold">Ad sets and ads</p>
          <div className="space-y-2">
            {c.adsets.map((s) => {
              const t = d.bySet.get(s.id) ?? ZERO, r = adRatios(t), isOpen = openSet === s.id;
              return (
                <div key={s.id} className="rounded-lg border border-line">
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpenSet(isOpen ? null : s.id)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-left hover:bg-raised/60">
                    {isOpen ? <ChevronDown className="size-4 text-muted" /> : <ChevronRight className="size-4 text-muted" />}
                    <span className="min-w-0 flex-1"><span className="block text-[13px] font-medium">{s.name}</span><span className="block text-[12px] text-faint">{s.audience}</span></span>
                    <span className="tnum text-[12.5px] text-muted">{inr(t.spend)} spent · {num(t.conversions)} conv. · {mult(r.roas)} ROAS</span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-line">
                      <DataTable dense rows={s.ads} rowKey={(a) => a.id} onRowClick={(a) => setAdId(a.id === adId ? null : a.id)}
                        columns={[
                          { key: "n", header: "Ad", cell: (a) => <span className={cn("font-medium", a.id === adId && "text-accent")}>{a.name}</span> },
                          { key: "s", header: "Spent", align: "right", cell: (a) => inr((d.byAd.get(a.id) ?? ZERO).spend) },
                          { key: "ctr", header: "CTR", align: "right", cell: (a) => pct(adRatios(d.byAd.get(a.id) ?? ZERO).ctr, 2) },
                          { key: "cv", header: "Conv.", align: "right", cell: (a) => num((d.byAd.get(a.id) ?? ZERO).conversions) },
                          { key: "r", header: "ROAS", align: "right", cell: (a) => mult(adRatios(d.byAd.get(a.id) ?? ZERO).roas) },
                          { key: "v", header: "", align: "right", cell: () => <Eye className="ml-auto size-4 text-faint" /> },
                        ]} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {ad && (
          <div className="rounded-lg border border-accent/40 bg-accent-soft/40 p-3">
            <p className="text-[13px] font-semibold">Ad: {ad.name}</p>
            <p className="mb-2 text-[12px] text-muted">Format: {ad.format}. Ad-level figures roll up exactly to the ad set and campaign totals.</p>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">{statList(d.byAd.get(ad.id) ?? ZERO).map(([k, v]) => <Stat key={k} k={k} v={v} />)}</dl>
          </div>
        )}
      </>}
    </div>
  );
}

function MetaAds() {
  const scope = useScope();
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const canEdit = useCan("campaigns.edit");
  const setStatus = useStore((s) => s.setCampaignStatus);
  const [q, setQ] = React.useState("");
  const [status, setStatus_] = React.useState("all");
  const [objective, setObjective] = React.useState("all");
  const [form, setForm] = React.useState<{ open: boolean; campaign: Campaign | null }>({ open: false, campaign: null });
  const d = React.useMemo(() => {
    const f = { mp: scope.marketplace, platform: "meta" as const };
    const rows = adRows(scope, scope.from, scope.to, f);
    const prev = sumAds(adRows(scope, scope.prevFrom, scope.prevTo, f));
    const byC = groupAds(rows, (r) => r.campaignId);
    const camps = scope.campaigns.filter((c) => c.platform === "meta" && (scope.marketplace === "all" || c.destination === scope.marketplace)).map((c) => ({ c, t: byC.get(c.id) ?? ZERO, r: adRatios(byC.get(c.id) ?? ZERO) }));
    return { total: sumAds(rows), prev, camps, series: dailySeries(scope, scope.from, scope.to, f) };
  }, [scope]);
  const r = adRatios(d.total), pr = adRatios(d.prev);
  const needle = q.trim().toLowerCase();
  const rows = d.camps.filter((x) => (status === "all" || x.c.status === status) && (objective === "all" || x.c.objective === objective) && (!needle || x.c.name.toLowerCase().includes(needle)));
  const openC = d.camps.find((x) => x.c.id === params.get("campaign"))?.c;
  const open = (id?: string) => router.replace(id ? `${path}?campaign=${id}` : path, { scroll: false });
  const budget = d.camps.filter((x) => x.c.status === "active").reduce((s, x) => s + x.c.dailyBudget, 0);
  const activeSpend = d.camps.filter((x) => x.c.status === "active").reduce((s, x) => s + x.t.spend, 0);
  const series: Series[] = [{ key: "adRevenue", label: "Purchase value", color: "var(--s-revenue)", kind: "area" }, { key: "spend", label: "Amount spent", color: "var(--s-spend)" }];
  const toggle = (c: Campaign) => { const next = c.status === "active" ? "paused" : "active"; setStatus(c, next); toast(`${next === "paused" ? "Paused" : "Resumed"} "${c.name}" (demo)`); };

  return (
    <>
      <PageHeader title="Meta Ads" description={<>Facebook and Instagram campaigns for {scope.ds.client.name} · {fmtDate(scope.from)} – {fmtDate(scope.to)}</>}
        actions={<Button variant="primary" disabled={!canEdit} title={canEdit ? undefined : "Your role cannot create campaigns"} onClick={() => setForm({ open: true, campaign: null })}><Plus />Create campaign</Button>} />
      <ConnectionCard title="Meta account connection" ids={["meta-marketing"]} />

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <MetricCard label="Amount spent" value={inr(d.total.spend, true)} delta={change(d.total.spend, d.prev.spend)} goodWhen="neutral" />
        <MetricCard label="Purchase value" value={inr(d.total.revenue, true)} delta={change(d.total.revenue, d.prev.revenue)} hint="Purchases Meta attributes to these ads. They are part of marketplace sales, not extra revenue." />
        <MetricCard label="ROAS" value={mult(r.roas)} delta={change(r.roas, pr.roas)} />
        <MetricCard label="Conversions" value={num(d.total.conversions)} delta={change(d.total.conversions, d.prev.conversions)} />
        <MetricCard label="Cost per result" value={inr(r.cpa)} delta={change(r.cpa, pr.cpa)} goodWhen="down" />
        <MetricCard label="Impressions" value={num(d.total.impressions, true)} delta={change(d.total.impressions, d.prev.impressions)} goodWhen="neutral" />
        <MetricCard label="Avg. daily reach" value={num(r.avgDailyReach, true)} delta={change(r.avgDailyReach, pr.avgDailyReach)} goodWhen="neutral" hint="Mean of daily reach. Reach across several days is not additive, so a period total is not shown." />
        <MetricCard label="Frequency" value={dec(r.frequency)} delta={change(r.frequency, pr.frequency)} goodWhen="neutral" hint="Impressions ÷ reach, per day." />
        <MetricCard label="Clicks" value={num(d.total.clicks)} delta={change(d.total.clicks, d.prev.clicks)} />
        <MetricCard label="CTR" value={pct(r.ctr, 2)} delta={change(r.ctr, pr.ctr)} />
        <MetricCard label="CPC" value={inr(r.cpc)} delta={change(r.cpc, pr.cpc)} goodWhen="down" />
        <MetricCard label="CPM" value={inr(r.cpm)} delta={change(r.cpm, pr.cpm)} goodWhen="down" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Spend and purchase value" subtitle="Daily, all Meta campaigns in view" />
          <div className="px-3 pb-4"><Legend series={series} className="mb-2 px-2" /><TrendChart data={d.series} series={series} fmt={(n) => inr(n, true)} height={230} footer={(row) => `ROAS ${mult(row.adRevenue / (row.spend || 1))}`} /></div>
        </Card>
        <Card>
          <CardHeader title="Budget utilisation" subtitle="Active campaigns, this period" />
          <div className="px-5 pb-5">
            <p className="tnum text-[22px] font-semibold">{pct(activeSpend / (budget * scope.days || 1), 0)}</p>
            <p className="tnum text-[12.5px] text-muted">{inr(activeSpend, true)} spent of {inr(budget * scope.days, true)} available ({inr(budget)} a day)</p>
            <ul className="mt-4 space-y-3">
              {d.camps.filter((x) => x.c.status === "active" && x.t.days > 0).map((x) => {
                const u = x.t.spend / (x.c.dailyBudget * x.t.days);
                return (
                  <li key={x.c.id}>
                    <div className="flex justify-between gap-3 text-[12.5px]"><span className="truncate">{x.c.name}</span><span className="tnum shrink-0 text-muted">{pct(u, 0)}</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-raised"><div className={cn("h-full rounded-full", u > 0.92 ? "bg-warn" : "bg-accent")} style={{ width: `${Math.min(100, u * 100)}%` }} /></div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[12px] text-faint">Amber bars are using over 92% of budget and may be budget-limited.</p>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Campaigns" subtitle={`${rows.length} of ${d.camps.length} campaigns`} />
        <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
          <div className="relative min-w-52 flex-1 sm:max-w-xs"><Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-faint" /><Input aria-label="Search campaigns" placeholder="Search campaigns" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" /></div>
          <Select aria-label="Status" value={status} onChange={(e) => setStatus_(e.target.value)} className="w-auto"><option value="all">All statuses</option><option value="active">Active</option><option value="paused">Paused</option><option value="draft">Draft</option></Select>
          <Select aria-label="Objective" value={objective} onChange={(e) => setObjective(e.target.value)} className="w-auto"><option value="all">All objectives</option>{OBJECTIVES.map((o) => <option key={o}>{o}</option>)}</Select>
        </div>
        <DataTable rows={rows} rowKey={(x) => x.c.id} defaultSort={{ key: "spend", dir: "desc" }} onRowClick={(x) => open(x.c.id)}
          empty={<EmptyState icon={<Megaphone />} title="No campaigns match" body="Clear the search or change the filters." action={<Button onClick={() => { setQ(""); setStatus_("all"); setObjective("all"); }}>Clear filters</Button>} />}
          columns={[
            { key: "name", header: "Campaign name", cell: (x) => <span className="font-medium">{x.c.name}{x.c.custom && <Badge tone="accent" className="ml-2">Created in demo</Badge>}</span>, sort: (x) => x.c.name },
            { key: "obj", header: "Objective", cell: (x) => x.c.objective, sort: (x) => x.c.objective },
            { key: "status", header: "Status", cell: (x) => <StatusBadge status={x.c.status} />, sort: (x) => x.c.status },
            { key: "budget", header: "Budget", align: "right", cell: (x) => `${inr(x.c.dailyBudget)}/day`, sort: (x) => x.c.dailyBudget },
            { key: "spend", header: "Amount spent", align: "right", cell: (x) => inr(x.t.spend), sort: (x) => x.t.spend },
            { key: "imp", header: "Impressions", align: "right", cell: (x) => num(x.t.impressions), sort: (x) => x.t.impressions },
            { key: "clicks", header: "Clicks", align: "right", cell: (x) => num(x.t.clicks), sort: (x) => x.t.clicks },
            { key: "conv", header: "Conversions", align: "right", cell: (x) => num(x.t.conversions), sort: (x) => x.t.conversions },
            { key: "roas", header: "ROAS", align: "right", cell: (x) => mult(x.r.roas), sort: (x) => x.r.roas },
            { key: "act", header: "", align: "right", cell: (x) => (
              <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <Menu>
                  <MenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${x.c.name}`}><MoreHorizontal /></Button></MenuTrigger>
                  <MenuContent>
                    <MenuItem onSelect={() => open(x.c.id)}><Eye />View campaign</MenuItem>
                    <MenuItem disabled={!canEdit} onSelect={() => setForm({ open: true, campaign: x.c })}><Pencil />Edit campaign</MenuItem>
                    <MenuItem disabled={!canEdit} onSelect={() => toggle(x.c)}>{x.c.status === "active" ? <><Pause />Pause campaign</> : <><Play />Resume campaign</>}</MenuItem>
                  </MenuContent>
                </Menu>
              </span>
            ) },
          ]} />
        <p className="border-t border-line px-5 py-2.5 text-[12px] text-faint">{DEMO_ACTION_NOTE}</p>
      </Card>

      <Sheet wide open={!!openC} onOpenChange={(o) => !o && open()} title={openC?.name ?? "Campaign"} description="Campaign, ad set and ad performance for the selected period">
        {openC && <CampaignDetail key={openC.id} c={openC} scope={scope} canEdit={canEdit} onEdit={() => setForm({ open: true, campaign: openC })} />}
      </Sheet>
      <Modal open={form.open} onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))} title={form.campaign ? "Edit campaign" : "Create campaign"} description="Demo campaign settings">
        <CampaignForm key={form.campaign?.id ?? "new"} campaign={form.campaign} clientId={scope.ds.client.id} onDone={() => setForm((f) => ({ ...f, open: false }))} />
      </Modal>
    </>
  );
}

export default function Page() {
  return <React.Suspense fallback={null}><MetaAds /></React.Suspense>;
}
