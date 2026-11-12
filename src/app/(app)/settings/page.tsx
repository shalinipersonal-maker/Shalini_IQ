"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, RotateCcw, ScrollText, UserPlus } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DataTable, PageHeader, StatusBadge, toast } from "@/components/shared";
import { ConnectionCard } from "@/components/shared/connection";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, Select, Switch, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { BRAND_DEFAULTS } from "@/config/brand";
import { getAIProvider } from "@/lib/ai/provider";
import { fmtDateTime } from "@/lib/dates";
import { PERMISSIONS, ROLE_LABEL, newId, useCan, useStore, type AppUser, type Role } from "@/lib/store";

const invite = z.object({ name: z.string().trim().min(2, "Enter a name").max(60), email: z.email("Enter a valid email address"), role: z.enum(["admin", "manager", "analyst", "viewer"]) });
type Invite = z.infer<typeof invite>;
const ROLES = Object.keys(ROLE_LABEL) as Role[];
const Row = ({ title, body, children }: { title: string; body?: string; children: React.ReactNode }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5 last:border-0"><div className="min-w-0 max-w-xl"><p className="text-[13.5px] font-medium">{title}</p>{body && <p className="text-[12.5px] text-muted">{body}</p>}</div><div className="shrink-0">{children}</div></div>
);

export default function Settings() {
  const can = useCan("settings.manage");
  const s = useStore();
  const [inviting, setInviting] = React.useState(false);
  const [reset, setReset] = React.useState(false);
  const { register, handleSubmit, reset: resetForm, formState: { errors } } = useForm<Invite>({ resolver: zodResolver(invite), defaultValues: { name: "", email: "", role: "analyst" } });
  const setUser = (u: AppUser, p: Partial<AppUser>, what: string) => { s.set({ users: s.users.map((x) => (x.id === u.id ? { ...x, ...p } : x)) }); s.log(what, u.name); };
  const admins = s.users.filter((u) => u.role === "admin" && u.status === "active").length;
  const ai = s.settings.ai;
  const setAi = (p: Partial<typeof ai>) => s.updateSettings((x) => ({ ...x, ai: { ...x.ai, ...p } }));
  return (
    <>
      <PageHeader title="Settings" description="Users, roles, workspace, branding, integrations, AI and audit history for this workspace." />
      {!can && <div className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-raised/60 px-3 py-2.5 text-[13px] text-muted"><Lock className="size-4" />Your role ({s.session ? ROLE_LABEL[s.session.role] : ""}) can view settings but not change them.</div>}
      <Tabs defaultValue="users">
        <TabsList>{[["users", "Users"], ["roles", "Roles and permissions"], ["workspace", "Workspace"], ["brand", "Brand"], ["marketplaces", "Marketplaces"], ["ai", "AI"], ["notifications", "Notifications"], ["audit", "Audit log"]].map(([v, l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}</TabsList>

        <TabsContent value="users" className="pt-4">
          <Card>
            <CardHeader title="Users" subtitle={`${s.users.length} people in this workspace`} action={<Button variant="primary" disabled={!can} onClick={() => setInviting(true)}><UserPlus />Invite user</Button>} />
            <DataTable rows={s.users} rowKey={(u) => u.id}
              columns={[
                { key: "n", header: "Name", cell: (u) => <span><span className="block font-medium">{u.name}</span><span className="text-[12px] text-faint">{u.email}</span></span>, sort: (u) => u.name },
                { key: "r", header: "Role", cell: (u) => <Select aria-label={`Role for ${u.name}`} className="h-8 w-44" disabled={!can || (u.role === "admin" && admins <= 1)} value={u.role} onChange={(e) => { setUser(u, { role: e.target.value as Role }, `Changed role to ${ROLE_LABEL[e.target.value as Role]}`); toast(`${u.name} is now ${ROLE_LABEL[e.target.value as Role]}`); }}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select> },
                { key: "s", header: "Status", cell: (u) => <StatusBadge status={u.status} />, sort: (u) => u.status },
                { key: "a", header: "", align: "right", cell: (u) => <Button size="sm" disabled={!can || (u.role === "admin" && admins <= 1 && u.status === "active")} onClick={() => setUser(u, { status: u.status === "deactivated" ? "active" : "deactivated" }, u.status === "deactivated" ? "Reactivated user" : "Deactivated user")}>{u.status === "deactivated" ? "Reactivate" : "Deactivate"}</Button> },
              ]} />
            <p className="border-t border-line px-5 py-2.5 text-[12px] text-faint">Demo user directory stored in this browser. No invitation emails are sent. The last active admin cannot be demoted or deactivated.</p>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="pt-4">
          <Card>
            <CardHeader title="Roles and permissions" subtitle="Changes apply immediately to the demo session. Sign in again with another role to see the effect." />
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead><tr className="border-y border-line bg-raised/50 text-left text-[12px] text-muted"><th className="py-2 pr-3 pl-5 font-medium">Permission</th>{ROLES.map((r) => <th key={r} className="px-3 py-2 text-center font-medium whitespace-nowrap">{ROLE_LABEL[r]}</th>)}</tr></thead>
                <tbody>{PERMISSIONS.map(([k, label]) => (
                  <tr key={k} className="border-b border-line last:border-0"><td className="py-2.5 pr-3 pl-5">{label}</td>
                    {ROLES.map((r) => <td key={r} className="px-3 py-2.5 text-center"><span className="inline-flex"><Switch label={`${ROLE_LABEL[r]}: ${label}`} disabled={!can || r === "admin"} checked={s.permissions[r][k]} onCheckedChange={(v) => { s.set({ permissions: { ...s.permissions, [r]: { ...s.permissions[r], [k]: v } } }); s.log(`${v ? "Granted" : "Revoked"} permission`, `${ROLE_LABEL[r]} · ${label}`); }} /></span></td>)}
                  </tr>))}</tbody>
              </table>
            </div>
            <p className="border-t border-line px-5 py-2.5 text-[12px] text-faint">Agency Admin always has every permission. In production these checks are enforced on the server for every request, not only in the interface.</p>
          </Card>
        </TabsContent>

        <TabsContent value="workspace" className="pt-4">
          <Card>
            <Row title="Workspace name"><Input className="w-72" disabled={!can} value={s.settings.workspaceName} maxLength={60} onChange={(e) => s.updateSettings((x) => ({ ...x, workspaceName: e.target.value }))} /></Row>
            <Row title="Time zone" body="Used for day boundaries in reports."><Select className="w-72" disabled={!can} value={s.settings.timezone} onChange={(e) => s.updateSettings((x) => ({ ...x, timezone: e.target.value }))}>{["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "UTC"].map((t) => <option key={t}>{t}</option>)}</Select></Row>
            <Row title="Week starts on"><Select className="w-72" disabled={!can} value={s.settings.weekStart} onChange={(e) => s.updateSettings((x) => ({ ...x, weekStart: e.target.value }))}><option>Monday</option><option>Sunday</option></Select></Row>
            <Row title="Reporting currency" body="Sample data is in Indian rupees."><Badge>INR (₹)</Badge></Row>
            <Row title="Reset demo data" body="Restores campaigns, creatives, uploads, reports, users and settings to their starting state. Sample sales and advertising data is unaffected."><Button variant="danger" onClick={() => setReset(true)}><RotateCcw />Reset demo data</Button></Row>
          </Card>
        </TabsContent>

        <TabsContent value="brand" className="pt-4">
          <Card>
            <Row title="Product name" body="Shown in the navigation, sign-in screen and report headers."><Input className="w-72" disabled={!can} value={s.brand.productName} maxLength={24} onChange={(e) => s.set({ brand: { ...s.brand, productName: e.target.value } })} /></Row>
            <Row title="Tagline"><Input className="w-72" disabled={!can} value={s.brand.tagline} maxLength={48} onChange={(e) => s.set({ brand: { ...s.brand, tagline: e.target.value } })} /></Row>
            <Row title="Company name"><Input className="w-72" disabled={!can} value={s.brand.company} maxLength={48} onChange={(e) => s.set({ brand: { ...s.brand, company: e.target.value } })} /></Row>
            <Row title="Accent colour" body="Applied across buttons, links and selected states.">
              <div className="flex gap-2" role="radiogroup" aria-label="Accent colour">{([["indigo", "#3d55f0"], ["violet", "#6f47e0"], ["teal", "#0d8f86"]] as const).map(([k, c]) => <button key={k} type="button" role="radio" aria-checked={s.brand.accent === k} disabled={!can} onClick={() => s.set({ brand: { ...s.brand, accent: k } })} className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[12.5px] capitalize ${s.brand.accent === k ? "border-accent bg-accent-soft" : "border-line"}`}><span className="size-4 rounded-full" style={{ background: c }} />{k}</button>)}</div>
            </Row>
            <Row title="Restore default branding" body={`Defaults come from src/config/brand.ts (${BRAND_DEFAULTS.productName}, ${BRAND_DEFAULTS.company}).`}><Button disabled={!can} onClick={() => { s.set({ brand: { productName: BRAND_DEFAULTS.productName, tagline: BRAND_DEFAULTS.tagline, company: BRAND_DEFAULTS.company, accent: BRAND_DEFAULTS.accent } }); toast("Branding restored"); }}>Restore defaults</Button></Row>
          </Card>
        </TabsContent>

        <TabsContent value="marketplaces" className="pt-4">
          <ConnectionCard title="Marketplace and advertising integrations" ids={["amazon-sp", "amazon-ads", "flipkart-seller", "meta-marketing"]} />
          <p className="mt-3 text-[12.5px] text-muted">Status is read from the server at <code className="rounded bg-raised px-1 py-0.5 text-[12px]">/api/v1/integrations</code>. Credentials are supplied through server environment variables and are never sent to the browser. See API_INTEGRATIONS.md for what each connector still needs.</p>
        </TabsContent>

        <TabsContent value="ai" className="pt-4">
          <Card>
            <Row title="AI provider" body="The demo engine applies rules to the sample data. A hosted model can be connected server-side through the AIProvider interface without changing any screen."><Badge tone="ai">{getAIProvider().label}</Badge></Row>
            <Row title="ROAS floor" body="Sales campaigns returning less than this are flagged for review."><Input type="number" className="w-28" disabled={!can} min={0.5} max={10} step={0.1} value={ai.roasFloor} onChange={(e) => { const v = parseFloat(e.target.value); if (v >= 0.5 && v <= 10) setAi({ roasFloor: v }); }} /></Row>
            <Row title="Minimum spend share" body="Ignore campaigns below this share of total ad spend when flagging low returns."><Select className="w-28" disabled={!can} value={String(ai.minSpendShare)} onChange={(e) => setAi({ minSpendShare: parseFloat(e.target.value) })}>{[0.01, 0.03, 0.05, 0.1].map((v) => <option key={v} value={v}>{v * 100}%</option>)}</Select></Row>
            {([["campaigns", "Campaign optimisation"], ["products", "Product performance"], ["inventory", "Inventory risk alerts"], ["budget", "Budget recommendations"], ["growth", "Growth opportunities"]] as const).map(([k, l]) => <Row key={k} title={l}><Switch label={l} disabled={!can} checked={ai.categories[k]} onCheckedChange={(v) => setAi({ categories: { ...ai.categories, [k]: v } })} /></Row>)}
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="pt-4">
          <Card>
            {([["lowStock", "Low-stock alerts", "When a listing falls under 14 days of cover."], ["roasDrop", "ROAS alerts", "When a campaign falls below the ROAS floor."], ["weeklyDigest", "Weekly digest", "A Monday summary of each client's performance."], ["reportReady", "Report ready", "When a scheduled report has been generated."]] as const).map(([k, t, b]) => <Row key={k} title={t} body={b}><Switch label={t} checked={s.settings.notif[k]} onCheckedChange={(v) => s.updateSettings((x) => ({ ...x, notif: { ...x.notif, [k]: v } }))} /></Row>)}
            <p className="px-5 py-2.5 text-[12px] text-faint">Preferences are saved for this demo session. Email and push delivery are not active in this build; in-app notifications appear under the bell.</p>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="pt-4">
          <Card>
            <CardHeader title="Audit log" subtitle="Actions taken in this workspace, newest first" />
            {s.audit.length ? <DataTable dense rows={s.audit} rowKey={(a) => a.id} columns={[
              { key: "t", header: "Time", cell: (a) => <span className="tnum whitespace-nowrap text-muted">{fmtDateTime(a.ts)}</span> },
              { key: "who", header: "User", cell: (a) => a.actor },
              { key: "act", header: "Action", cell: (a) => <span className="font-medium">{a.action}</span> },
              { key: "tg", header: "Target", cell: (a) => <span className="text-muted">{a.target}</span> },
            ]} /> : <EmptyState icon={<ScrollText />} title="No actions recorded yet" body="Pausing a campaign, exporting a report or changing a permission will appear here." />}
          </Card>
        </TabsContent>
      </Tabs>

      <Modal open={inviting} onOpenChange={setInviting} title="Invite user" description="Adds a user to the demo directory. No email is sent.">
        <form className="space-y-3" noValidate onSubmit={handleSubmit((v) => { if (s.users.some((u) => u.email.toLowerCase() === v.email.toLowerCase())) return toast("A user with that email already exists", "error"); s.set({ users: [...s.users, { id: newId(), ...v, status: "invited" }] }); s.log("Invited user", `${v.name} as ${ROLE_LABEL[v.role]}`); toast(`${v.name} invited (demo)`); setInviting(false); resetForm(); })}>
          <Field label="Full name" error={errors.name?.message}><Input {...register("name")} autoFocus /></Field>
          <Field label="Work email" error={errors.email?.message}><Input type="email" {...register("email")} /></Field>
          <Field label="Role"><Select {...register("role")}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select></Field>
          <div className="flex justify-end gap-2 pt-1"><Button onClick={() => setInviting(false)}>Cancel</Button><Button type="submit" variant="primary">Send invite</Button></div>
        </form>
      </Modal>
      <Modal open={reset} onOpenChange={setReset} title="Reset demo data?" description="Restores the workspace to its starting state."
        footer={<><Button onClick={() => setReset(false)}>Cancel</Button><Button variant="danger" onClick={() => { s.resetDemo(); setReset(false); toast("Demo data reset"); }}>Reset demo data</Button></>}>
        <p className="text-[13.5px] text-muted">Campaign edits, created campaigns, saved creatives, uploads, report history, added users and clients, and settings changes in this browser will be cleared.</p>
      </Modal>
    </>
  );
}
