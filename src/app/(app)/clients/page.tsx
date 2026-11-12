"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Building2, FileText, Plug, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Spark } from "@/components/charts";
import { DataTable, Delta, PageHeader, StatusBadge, toast } from "@/components/shared";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, Select, Sheet, Switch, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { dailySeries, kpis, type Scope } from "@/lib/analytics/metrics";
import { addDays, fmtDate, fmtDateTime, todayISO } from "@/lib/dates";
import { CLIENTS, EMPLOYEES } from "@/lib/demo/catalog";
import { getDataset } from "@/lib/demo/generate";
import type { Client } from "@/lib/demo/types";
import { change, initials, inr, mult, num, pct, timeAgo } from "@/lib/format";
import { newId, useCan, useStore } from "@/lib/store";
import { useScope } from "@/lib/use-scope";

const schema = z.object({
  name: z.string().trim().min(2, "Enter the client's business name").max(60),
  industry: z.string().trim().min(2, "Enter an industry").max(40),
  city: z.string().trim().min(2, "Enter a city").max(40),
  contactName: z.string().trim().min(2, "Enter a contact name").max(60),
  email: z.email("Enter a valid email address"),
  retainer: z.coerce.number({ message: "Enter a monthly retainer" }).min(0, "Cannot be negative").max(10_000_000, "That looks too high"),
});
type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

function clientScope(id: string, base: Scope): Scope {
  const ds = getDataset(id);
  return { ...base, ds, campaigns: ds.campaigns, marketplace: "all" };
}
const ACCOUNTS = [["Amazon Seller Central", "Marketplace account"], ["Flipkart Seller Hub", "Marketplace account"], ["Amazon Ads", "Advertising account"], ["Flipkart Ads", "Advertising account"], ["Meta ad account", "Advertising account"]];

function Profile({ client, scope }: { client: Client; scope: Scope }) {
  const router = useRouter();
  const canManage = useCan("clients.manage");
  const { clientTeams, set, reports, log } = useStore();
  const team = clientTeams[client.id] ?? client.team;
  const s = client.demoData ? clientScope(client.id, scope) : null;
  const k = s ? kpis(s) : null, p = s ? kpis(s, s.prevFrom, s.prevTo) : null;
  const mine = reports.filter((r) => r.client === client.name);
  return (
    <Tabs defaultValue="overview" className="p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-lg text-[14px] font-semibold text-white" style={{ background: `hsl(${client.hue} 45% 42%)` }}>{initials(client.name)}</span>
        <div className="min-w-0 flex-1"><p className="text-[13px] text-muted">{client.industry} · {client.city}</p><div className="mt-1 flex gap-1.5"><StatusBadge status={client.status} />{client.demoData ? <Badge tone="accent">Sample data</Badge> : <Badge>No data yet</Badge>}</div></div>
        {client.demoData && <Button variant="primary" onClick={() => { set({ clientId: client.id }); router.push("/overview"); }}>Open workspace<ArrowRight /></Button>}
      </div>
      <TabsList>{["overview", "team", "accounts", "activity", "reports"].map((t) => <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>)}</TabsList>
      <TabsContent value="overview" className="pt-4">
        {k && p && s ? <>
          <p className="mb-2 text-[12.5px] text-muted">Performance, {fmtDate(s.from)} – {fmtDate(s.to)}, all marketplaces</p>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {([["Revenue", inr(k.sales.revenue, true), change(k.sales.revenue, p.sales.revenue), "up"], ["Orders", num(k.sales.orders), change(k.sales.orders, p.sales.orders), "up"], ["Ad spend", inr(k.ads.spend, true), change(k.ads.spend, p.ads.spend), "neutral"], ["ROAS", mult(k.roas), change(k.roas, p.roas), "up"], ["ACOS", pct(k.acos), change(k.acos, p.acos), "down"], ["TACOS", pct(k.tacos), change(k.tacos, p.tacos), "down"]] as const).map(([l, v, d, g]) => (
              <div key={l} className="rounded-lg border border-line px-3 py-2"><dt className="text-[12px] text-muted">{l}</dt><dd className="tnum text-[16px] font-semibold">{v}</dd><Delta value={d} goodWhen={g} /></div>
            ))}
          </dl>
        </> : <EmptyState icon={<Plug />} title="No performance data yet" body="Integration pending configuration. This client was added in the demo and has no marketplace or advertising accounts connected." />}
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-raised/60 p-3 text-[13px]">
          <div><dt className="text-[12px] text-muted">Primary contact</dt><dd className="font-medium">{client.contact.name}</dd><dd className="text-[12px] text-muted">{client.contact.email}</dd></div>
          <div><dt className="text-[12px] text-muted">Client since</dt><dd className="font-medium">{fmtDate(client.since)}</dd></div>
          <div><dt className="text-[12px] text-muted">Monthly retainer</dt><dd className="tnum font-medium">{inr(client.retainer)}</dd></div>
          <div><dt className="text-[12px] text-muted">Account status</dt><dd className="font-medium capitalize">{client.status}</dd></div>
        </dl>
      </TabsContent>
      <TabsContent value="team" className="pt-4">
        <p className="mb-2 text-[12.5px] text-muted">{team.length} of {EMPLOYEES.length} employees assigned. Assignment controls who sees this client.</p>
        <ul className="divide-y divide-line rounded-lg border border-line">
          {EMPLOYEES.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-[11.5px] font-semibold text-accent">{initials(e.name)}</span>
              <span className="min-w-0 flex-1"><span className="block text-[13px] font-medium">{e.name}</span><span className="text-[12px] text-muted">{e.title}</span></span>
              <Switch label={`Assign ${e.name}`} disabled={!canManage} checked={team.includes(e.id)} onCheckedChange={(on) => { set({ clientTeams: { ...clientTeams, [client.id]: on ? [...team, e.id] : team.filter((x) => x !== e.id) } }); log(on ? "Assigned employee to client" : "Removed employee from client", `${e.name} → ${client.name}`); }} />
            </li>
          ))}
        </ul>
      </TabsContent>
      <TabsContent value="accounts" className="pt-4">
        <ul className="divide-y divide-line rounded-lg border border-line">
          {ACCOUNTS.map(([name, kind]) => (
            <li key={name} className="flex flex-wrap items-center gap-2 px-3 py-2.5 text-[13px]">
              <Plug className="size-4 text-faint" /><span className="min-w-0 flex-1"><span className="block font-medium">{name}</span><span className="text-[12px] text-muted">{kind}</span></span>
              {client.demoData && <Badge tone="accent">Demo data source</Badge>}<Badge dot>Not connected</Badge>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[12px] text-muted">Integration pending configuration. Connect accounts from each marketplace page or Settings → Marketplaces once credentials are in place.</p>
      </TabsContent>
      <TabsContent value="activity" className="pt-4">
        {s ? <ul className="divide-y divide-line rounded-lg border border-line">{s.ds.activity.map((a) => <li key={a.id} className="px-3 py-2.5 text-[13px]">{a.text}<span className="block text-[12px] text-faint">{a.actor} · {timeAgo(a.ts)}</span></li>)}</ul> : <EmptyState title="No activity yet" body="Activity appears once accounts are connected." />}
      </TabsContent>
      <TabsContent value="reports" className="pt-4">
        {mine.length ? <ul className="divide-y divide-line rounded-lg border border-line">{mine.map((r) => <li key={r.id} className="flex items-center gap-2 px-3 py-2.5 text-[13px]"><FileText className="size-4 text-faint" /><span className="font-medium">{r.title}</span><Badge>{r.format}</Badge><span className="ml-auto text-[12px] text-faint">{fmtDateTime(r.ts)}</span></li>)}</ul> : <EmptyState icon={<FileText />} title="No reports exported for this client" body="Reports exported from the Reports page are listed here." />}
        {client.demoData && <Button className="mt-3" onClick={() => { set({ clientId: client.id }); router.push("/reports"); }}><FileText />Generate a report for {client.name}</Button>}
      </TabsContent>
    </Tabs>
  );
}

export default function Clients() {
  const scope = useScope();
  const router = useRouter();
  const canManage = useCan("clients.manage");
  const { customClients, clientTeams, set, log, clientId } = useStore();
  const [open, setOpen] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormIn, unknown, FormOut>({ resolver: zodResolver(schema), defaultValues: { name: "", industry: "", city: "", contactName: "", email: "", retainer: 100000 } });
  const all = [...CLIENTS, ...customClients];
  const rows = React.useMemo(() => all.map((c) => {
    if (!c.demoData) return { c, k: null, p: null, spark: [] as { revenue: number }[] };
    const s = clientScope(c.id, scope);
    return { c, k: kpis(s), p: kpis(s, s.prevFrom, s.prevTo), spark: dailySeries(s, addDays(s.to, -29), s.to) };
  }), [scope, customClients]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = rows.reduce((t, r) => t + (r.k?.sales.revenue ?? 0), 0), spend = rows.reduce((t, r) => t + (r.k?.ads.spend ?? 0), 0);
  const add = (v: FormOut) => {
    const c: Client = { id: `custom-${newId()}`, name: v.name, industry: v.industry, city: v.city, since: todayISO(), status: "onboarding", contact: { name: v.contactName, email: v.email }, team: [], hue: [...v.name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7), retainer: v.retainer, demoData: false };
    set({ customClients: [...customClients, c] });
    log("Added client", c.name);
    toast(`${c.name} added as an onboarding client`);
    setAdding(false);
    reset();
  };
  const sel = all.find((c) => c.id === open);
  return (
    <>
      <PageHeader title="Clients" description={`${all.length} client businesses managed from this workspace. Figures follow the date range above and cover all marketplaces.`}
        actions={<Button variant="primary" disabled={!canManage} title={canManage ? undefined : "Your role cannot add clients"} onClick={() => setAdding(true)}><Plus />Add client</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Active clients", String(all.filter((c) => c.status === "active").length)], ["Onboarding", String(all.filter((c) => c.status === "onboarding").length)], ["Revenue under management", inr(total, true)], ["Ad spend under management", inr(spend, true)]].map(([l, v]) => <Card key={l} className="px-4 py-3.5"><p className="text-[12.5px] text-muted">{l}</p><p className="tnum mt-1 text-[22px] font-semibold">{v}</p></Card>)}
      </div>
      <Card className="mt-4">
        <CardHeader title="Client list" subtitle="Select a client to open its profile" />
        <DataTable rows={rows} rowKey={(r) => r.c.id} onRowClick={(r) => setOpen(r.c.id)}
          columns={[
            { key: "name", header: "Client", cell: (r) => <span className="flex items-center gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-md text-[11.5px] font-semibold text-white" style={{ background: `hsl(${r.c.hue} 45% 42%)` }}>{initials(r.c.name)}</span><span><span className="block font-medium">{r.c.name}{r.c.id === clientId && <Badge tone="accent" className="ml-2">Current workspace</Badge>}</span><span className="text-[12px] text-faint">{r.c.industry} · {r.c.city}</span></span></span>, sort: (r) => r.c.name },
            { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.c.status} />, sort: (r) => r.c.status },
            { key: "team", header: "Team", cell: (r) => { const t = clientTeams[r.c.id] ?? r.c.team; return <span className="flex items-center">{t.slice(0, 4).map((id) => { const e = EMPLOYEES.find((x) => x.id === id); return e ? <span key={id} title={e.name} className="-ml-1.5 flex size-6 items-center justify-center rounded-full border-2 border-surface bg-accent-soft text-[9.5px] font-semibold text-accent first:ml-0">{initials(e.name)}</span> : null; })}{!t.length && <span className="text-[12px] text-faint">Unassigned</span>}</span>; } },
            { key: "rev", header: "Revenue", align: "right", cell: (r) => (r.k ? inr(r.k.sales.revenue, true) : "—"), sort: (r) => r.k?.sales.revenue ?? -1 },
            { key: "ch", header: "Change", align: "right", cell: (r) => (r.k && r.p ? <Delta value={change(r.k.sales.revenue, r.p.sales.revenue)} /> : "—") },
            { key: "spend", header: "Ad spend", align: "right", cell: (r) => (r.k ? inr(r.k.ads.spend, true) : "—"), sort: (r) => r.k?.ads.spend ?? -1 },
            { key: "roas", header: "ROAS", align: "right", cell: (r) => (r.k ? mult(r.k.roas) : "—"), sort: (r) => r.k?.roas ?? -1 },
            { key: "spark", header: "Last 30 days", cell: (r) => (r.spark.length ? <Spark data={r.spark} k="revenue" /> : <span className="text-[12px] text-faint">No data</span>) },
            { key: "go", header: "", align: "right", cell: (r) => r.c.demoData && <span onClick={(e) => e.stopPropagation()}><Button size="sm" onClick={() => { set({ clientId: r.c.id }); router.push("/overview"); }}>Open workspace</Button></span> },
          ]} />
      </Card>
      <Sheet wide open={!!sel} onOpenChange={(o) => !o && setOpen(null)} title={sel?.name ?? "Client"} description="Client profile">
        {sel && <Profile key={sel.id} client={sel} scope={scope} />}
      </Sheet>
      <Modal open={adding} onOpenChange={setAdding} title="Add client" description="New clients start in onboarding with no data until their accounts are connected.">
        <form onSubmit={handleSubmit(add)} className="space-y-3" noValidate>
          <Field label="Business name" error={errors.name?.message}><Input {...register("name")} autoFocus /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Industry" error={errors.industry?.message}><Input {...register("industry")} placeholder="e.g. Home & Kitchen" /></Field>
            <Field label="City" error={errors.city?.message}><Input {...register("city")} /></Field>
            <Field label="Primary contact" error={errors.contactName?.message}><Input {...register("contactName")} /></Field>
            <Field label="Contact email" error={errors.email?.message}><Input type="email" {...register("email")} /></Field>
          </div>
          <Field label="Monthly retainer (₹)" error={errors.retainer?.message}><Input type="number" {...register("retainer")} /></Field>
          <div className="flex justify-end gap-2 pt-1"><Button onClick={() => setAdding(false)}>Cancel</Button><Button type="submit" variant="primary">Add client</Button></div>
        </form>
      </Modal>
      {!all.length && <EmptyState icon={<Building2 />} title="No clients" />}
    </>
  );
}
