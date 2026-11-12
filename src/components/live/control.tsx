"use client";
import { Bot, Check, Eraser, Megaphone, MessageSquareText, Pause, Play, RefreshCw, Rocket, ShoppingBag, Sparkles, ThumbsUp } from "lucide-react";
import * as React from "react";
import { Badge, Button, Card, CardHeader, Field, Input, Select, Textarea, cn } from "@/components/ui";
import { inr } from "@/lib/format";
import { visibilityReport, type VisibilityReport } from "@/lib/live/visibility";
import type { Marketplace } from "@/lib/site/listing-check";

type ApiBody<T> = T & { ok: boolean; error?: string };
async function api<T = object>(url: string, init?: RequestInit): Promise<ApiBody<T>> {
  try {
    const res = await fetch(url, { ...init, headers: init?.body ? { "Content-Type": "application/json" } : undefined, cache: "no-store" });
    return (await res.json().catch(() => ({ ok: false, error: `Request failed (${res.status})` }))) as ApiBody<T>;
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again." } as ApiBody<T>;
  }
}
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/* ---------- Overview: everything on one screen ---------- */
interface Overview {
  leads: { today: number; week: number; total: number; latest: { name: string; interest: string; phone: string; at: string }[] };
  sales: { revenue30: number; orders30: number; units30: number; revenuePrev30: number; topProduct: string | null; lastDay: string | null; bySource: { source: string; revenue: number }[] };
  posts: { total: number; week: number; likes: number; comments: number; best: { label: string; likes: number; comments: number; link: string | null } | null };
  ads: { running: number; spend: number; reach: number; clicks: number };
}

export function OverviewCard() {
  const [o, setO] = React.useState<Overview | null>(null);
  const [at, setAt] = React.useState("");
  const load = React.useCallback(() => {
    api<Overview>("/api/live/overview").then((r) => { if (r.ok) { setO(r); setAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })); } });
  }, []);
  React.useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const change: number | null = o && o.sales.revenuePrev30 ? Math.round(((o.sales.revenue30 - o.sales.revenuePrev30) / o.sales.revenuePrev30) * 100) : null;
  const tiles = o ? [
    { icon: MessageSquareText, label: "Enquiries", value: String(o.leads.today), sub: `today · ${o.leads.week} this week`, href: "#alerts" },
    { icon: ShoppingBag, label: "Sales · 30 days", value: inr(o.sales.revenue30, true), sub: `${o.sales.orders30} orders${change !== null ? ` · ${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}%` : ""}`, href: "#sales" },
    { icon: ThumbsUp, label: "Post reactions", value: (o.posts.likes + o.posts.comments).toLocaleString("en-IN"), sub: `${o.posts.likes} likes · ${o.posts.comments} comments`, href: "#meta" },
    { icon: Megaphone, label: "Boost spend", value: inr(o.ads.spend, true), sub: `${o.ads.running} running · ${o.ads.reach.toLocaleString("en-IN")} reached`, href: "#boost" },
  ] : [];

  return (
    <Card id="overview" className="scroll-mt-20">
      <CardHeader title="Today at a glance" subtitle={at ? `Updated ${at} · refreshes every minute` : "Loading…"} action={<Button size="sm" variant="ghost" onClick={load}><RefreshCw />Refresh</Button>} />
      <div className="grid gap-3 px-5 pb-4 sm:grid-cols-2 lg:grid-cols-4">
        {((o ? tiles : [null, null, null, null]) as (typeof tiles[number] | null)[]).map((t, i) => t ? (
          <a key={t.label} href={t.href} className="rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong">
            <span className="flex items-center gap-2 text-[12px] text-muted"><t.icon className="size-4 text-accent" />{t.label}</span>
            <span className="tnum mt-1.5 block text-[24px] font-semibold tracking-tight">{t.value}</span>
            <span className="block text-[12px] text-faint">{t.sub}</span>
          </a>
        ) : <div key={i} className="skeleton h-[104px] rounded-xl" />)}
      </div>
      {o && (
        <div className="grid gap-4 border-t border-line px-5 py-4 text-[13px] md:grid-cols-2">
          <div>
            <p className="mb-1.5 font-semibold">Latest enquiries</p>
            {o.leads.latest.length ? (
              <ul className="space-y-1">{o.leads.latest.slice(0, 3).map((l, i) => <li key={i} className="flex justify-between gap-2"><span className="truncate"><b>{l.name}</b> <span className="text-muted">· {l.interest}</span></span>{l.phone && <a href={`tel:${l.phone}`} className="shrink-0 text-accent">Call</a>}</li>)}</ul>
            ) : <p className="text-muted">None yet.</p>}
          </div>
          <div>
            <p className="mb-1.5 font-semibold">Highlights</p>
            <ul className="space-y-1 text-muted">
              <li>Top product: <b className="text-ink">{o.sales.topProduct ?? "—"}</b></li>
              <li>Best post: {o.posts.best ? <>{o.posts.best.link ? <a href={o.posts.best.link} target="_blank" rel="noreferrer" className="text-accent underline">{o.posts.best.label}</a> : o.posts.best.label} ({o.posts.best.likes} likes)</> : "—"}</li>
              <li>Sales by marketplace: {o.sales.bySource.length ? o.sales.bySource.map((s) => `${s.source} ${inr(s.revenue, true)}`).join(" · ") : "—"}</li>
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ---------- IQ on Telegram ---------- */
export function TelegramCard({ token, chat, cron }: { token: boolean; chat: boolean; cron: boolean }) {
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState("");
  const activate = async () => {
    setBusy(true); setNote("");
    const r = await api<{ bot?: string; chatSet: boolean; greeted: boolean }>("/api/telegram/setup", { method: "POST" });
    setBusy(false);
    if (!r.ok) return setNote(r.error ?? "Setup failed");
    setNote(r.chatSet ? (r.greeted ? `IQ is live${r.bot ? ` as @${r.bot}` : ""}. Check Telegram for the hello message.` : "Activated, but the hello message could not be sent. Check TELEGRAM_CHAT_ID.")
      : `Activated${r.bot ? ` @${r.bot}` : ""}. Now open the bot in Telegram, send /start, and add the chat ID it replies with as TELEGRAM_CHAT_ID in Vercel. Then redeploy and press Activate again.`);
  };
  return (
    <Card id="telegram" className="scroll-mt-20">
      <CardHeader title="IQ on Telegram" subtitle="Your assistant: alerts for every enquiry, post, sales sync and boost, reports at 9 AM, 12 PM, 6 PM and 9 PM, and answers when you type /today, /sales, /leads, /posts or /ads." />
      <div className="space-y-3 px-5 pb-5 text-[13px]">
        <div className="flex flex-wrap gap-2">
          <Badge tone={token ? "pos" : "neutral"} dot>{token ? "Bot token added" : "Bot token missing"}</Badge>
          <Badge tone={chat ? "pos" : "neutral"} dot>{chat ? "Your chat linked" : "Chat ID missing"}</Badge>
          <Badge tone={cron ? "pos" : "neutral"} dot>{cron ? "Morning report on" : "Morning report off (CRON_SECRET)"}</Badge>
        </div>
        <Button variant="primary" size="sm" disabled={!token || busy} onClick={activate}><Bot />{busy ? "Activating…" : "Activate IQ on Telegram"}</Button>
        {note && <p className="text-muted">{note}</p>}
      </div>
    </Card>
  );
}

/* ---------- Boost a post (paid) ---------- */
interface AdAccount { id: string; name: string; currency: string; status: number }
interface Boost { id: string; label: string; status: string; error: string | null; dailyBudget: number; days: number; currency: string; spend: number; reach: number; clicks: number; createdAt: string }
interface PostLite { id: string; kind: string; targetName: string; caption: string; status: string; createdAt: string }

export function BoostCard() {
  const [accounts, setAccounts] = React.useState<AdAccount[]>([]);
  const [adError, setAdError] = React.useState<string | null>(null);
  const [boosts, setBoosts] = React.useState<Boost[]>([]);
  const [posts, setPosts] = React.useState<PostLite[]>([]);
  const [form, setForm] = React.useState({ postId: "", adAccount: "", dailyBudget: 400, days: 3, ageMin: 18, ageMax: 55, city: "" });
  const [confirm, setConfirm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState("");

  const load = React.useCallback(() => {
    api<{ adAccounts: AdAccount[]; adError: string | null; boosts: Boost[] }>("/api/live/boosts").then((r) => {
      if (!r.ok) return;
      setAccounts(r.adAccounts); setAdError(r.adError); setBoosts(r.boosts);
      setForm((f) => (f.adAccount || !r.adAccounts[0] ? f : { ...f, adAccount: r.adAccounts[0].id }));
    });
    api<{ posts: PostLite[] }>("/api/live/posts").then((r) => {
      if (!r.ok) return;
      const fb = r.posts.filter((p) => p.kind === "facebook" && p.status === "published");
      setPosts(fb); setForm((f) => (f.postId || !fb[0] ? f : { ...f, postId: fb[0].id }));
    });
  }, []);
  React.useEffect(load, [load]);

  const max = form.dailyBudget * form.days;
  const start = async () => {
    setBusy(true); setNote("Creating the boost on Meta…");
    const r = await api<{ id: string }>("/api/live/boosts", { method: "POST", body: JSON.stringify({ ...form, city: form.city || undefined, confirm: true }) });
    setBusy(false); setConfirm(false);
    setNote(r.ok ? "Boost is running. Meta reviews every ad first (usually within an hour) before it starts showing." : (r.error ?? "Meta refused the boost"));
    load();
  };
  const toggle = async (b: Boost) => { await api("/api/live/boosts", { method: "PATCH", body: JSON.stringify({ id: b.id, status: b.status === "running" ? "PAUSED" : "ACTIVE" }) }); load(); };
  const set = (k: keyof typeof form, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Card id="boost" className="scroll-mt-20">
      <CardHeader title="Boost a post (paid)" subtitle="Show one of your Facebook posts to more people in India for a few days. Meta charges your ad account; you set the daily limit and the end date." />
      <div className="space-y-4 px-5 pb-5 text-[13px]">
        {adError && <p className="text-warn">Meta: {adError}</p>}
        {!accounts.length && !adError && <p className="text-muted">No ad account found yet. In Meta, open <b>Ads Manager</b> once, add a payment method, then press <b>Reconnect / add Pages</b> above and allow ads.</p>}
        {!posts.length && <p className="text-muted">Post something to your Facebook Page first; then it can be boosted here.</p>}
        {!!accounts.length && !!posts.length && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Post to boost" className="sm:col-span-2"><Select value={form.postId} onChange={(e) => set("postId", e.target.value)}>{posts.map((p) => <option key={p.id} value={p.id}>{when(p.createdAt)} · {(p.caption || "(no caption)").slice(0, 60)}</option>)}</Select></Field>
            <Field label="Ad account"><Select value={form.adAccount} onChange={(e) => set("adAccount", e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}</Select></Field>
            <Field label="Daily budget (₹)" hint="₹400 ≈ US$5"><Input type="number" min={100} max={5000} step={50} value={form.dailyBudget} onChange={(e) => set("dailyBudget", Number(e.target.value))} /></Field>
            <Field label="Days"><Input type="number" min={1} max={14} value={form.days} onChange={(e) => set("days", Number(e.target.value))} /></Field>
            <Field label="City (optional)" hint="Empty = all of India"><Input value={form.city} placeholder="Chennai" onChange={(e) => set("city", e.target.value)} /></Field>
            <Field label="Age from"><Input type="number" min={18} max={65} value={form.ageMin} onChange={(e) => set("ageMin", Number(e.target.value))} /></Field>
            <Field label="Age to"><Input type="number" min={18} max={65} value={form.ageMax} onChange={(e) => set("ageMax", Number(e.target.value))} /></Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
                <span>I agree Meta may charge up to <b>{inr(max)}</b> (₹{form.dailyBudget.toLocaleString("en-IN")} a day for {form.days} day{form.days === 1 ? "" : "s"}) to the chosen ad account.</span></label>
              <Button className="mt-3" variant="primary" disabled={!confirm || busy || form.dailyBudget < 100} onClick={start}><Rocket />{busy ? "Starting…" : "Start boost"}</Button>
            </div>
          </div>
        )}
        {note && <p className="text-muted">{note}</p>}
        {boosts.length > 0 && (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {boosts.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span className="min-w-0"><Badge tone={b.status === "running" ? "pos" : b.status === "failed" ? "neg" : "neutral"}>{b.status}</Badge> <span className="font-medium">{b.label}</span>
                  <span className="block text-[12px] text-faint">{inr(b.dailyBudget)}/day × {b.days} days · started {when(b.createdAt)}{b.error ? ` · ${b.error}` : ""}</span></span>
                <span className={cn("flex items-center gap-3 text-[12.5px]", b.status === "failed" && "hidden")}>
                  <span className="tnum">{inr(b.spend)} spent</span><span className="tnum">{b.reach.toLocaleString("en-IN")} reached</span><span className="tnum">{b.clicks} clicks</span>
                  {(b.status === "running" || b.status === "paused") && <Button size="sm" variant="ghost" onClick={() => toggle(b)}>{b.status === "running" ? <><Pause />Pause</> : <><Play />Resume</>}</Button>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

/* ---------- Listing visibility: SEO · AEO · GEO · AIO · AXO ---------- */
const BLANK = { marketplace: "amazon" as Marketplace, brand: "", title: "", bullets: "", description: "", faq: "", price: "", sku: "", imageCount: 0, whiteMainImage: false };

interface AiListing { title: string; bullets: string[]; description: string; faq: string[]; keywords: string[]; tips: string[] }

export function VisibilityCard() {
  const [v, setV] = React.useState(BLANK);
  const [ai, setAi] = React.useState<AiListing | null>(null);
  const [aiBusy, setAiBusy] = React.useState(false);
  const [aiError, setAiError] = React.useState("");
  const set = <K extends keyof typeof BLANK>(k: K, val: (typeof BLANK)[K]) => setV((s) => ({ ...s, [k]: val }));
  const tone = (n: number) => (n >= 80 ? "text-pos" : n >= 50 ? "text-warn" : "text-neg");
  // Scores update live while typing — no button needed.
  const deferred = React.useDeferredValue(v);
  const shown = React.useMemo(() => (deferred.title.trim() ? visibilityReport(deferred) : null), [deferred]);
  const overall = shown ? Math.round(shown.pillars.reduce((a, p) => a + p.score, 0) / shown.pillars.length) : 0;

  const clear = () => { setV(BLANK); setAi(null); setAiError(""); };
  const improve = async () => {
    if (!shown) return;
    setAiBusy(true); setAiError(""); setAi(null);
    const missing = shown.pillars.flatMap((p) => p.checks.filter((c) => !c.ok).map((c) => `${p.name}: ${c.label} — ${c.fix}`));
    const r = await api<AiListing>("/api/live/listing-ai", { method: "POST", body: JSON.stringify({ marketplace: v.marketplace, brand: v.brand, title: v.title, bullets: v.bullets, description: v.description, faq: v.faq, price: v.price, sku: v.sku, missing }) });
    setAiBusy(false);
    if (r.ok) setAi(r); else setAiError(r.error ?? "AI could not answer. Try again.");
  };
  const useAi = () => {
    if (!ai) return;
    setV((s) => ({ ...s, title: ai.title || s.title, bullets: ai.bullets.length ? ai.bullets.join("\n") : s.bullets, description: ai.description || s.description, faq: ai.faq.length ? ai.faq.join("\n") : s.faq }));
    setAi(null);
  };

  return (
    <Card id="visibility" className="scroll-mt-20">
      <CardHeader title="Listing visibility — SEO · AEO · GEO · AIO · AXO" subtitle="Type or paste one Amazon, Flipkart or Myntra listing. The five scores update as you type. Press Improve with AI and Claude rewrites the listing to fix every gap; you choose whether to use it." />
      <div className="grid gap-3 px-5 pb-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Marketplace"><Select value={v.marketplace} onChange={(e) => set("marketplace", e.target.value as Marketplace)}><option value="amazon">Amazon</option><option value="flipkart">Flipkart</option><option value="myntra">Myntra</option></Select></Field>
        <Field label="Brand"><Input value={v.brand} placeholder="Shalz" onChange={(e) => set("brand", e.target.value)} /></Field>
        <Field label="Price"><Input value={v.price} placeholder="₹799" onChange={(e) => set("price", e.target.value)} /></Field>
        <Field label="SKU / model"><Input value={v.sku} placeholder="SHZ-NP-001" onChange={(e) => set("sku", e.target.value)} /></Field>
        <Field label="Title" className="sm:col-span-2 lg:col-span-4"><Input value={v.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Key points (one per line)" className="sm:col-span-2"><Textarea rows={5} value={v.bullets} onChange={(e) => set("bullets", e.target.value)} /></Field>
        <Field label="Description" className="sm:col-span-2"><Textarea rows={5} value={v.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="FAQs (Q: …? A: …, one per line)" className="sm:col-span-2"><Textarea rows={3} value={v.faq} onChange={(e) => set("faq", e.target.value)} /></Field>
        <Field label="Number of photos"><Input type="number" min={0} max={20} value={v.imageCount} onChange={(e) => set("imageCount", Number(e.target.value))} /></Field>
        <label className="mt-6 flex items-center gap-2 text-[13px]"><input type="checkbox" checked={v.whiteMainImage} onChange={(e) => set("whiteMainImage", e.target.checked)} />Main photo on plain white</label>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4">
          <Button variant="primary" disabled={!v.title.trim() || aiBusy} onClick={improve}><Sparkles />{aiBusy ? "Claude is rewriting…" : "Improve with AI"}</Button>
          <Button variant="secondary" onClick={clear}><Eraser />Clear</Button>
          {shown && <span className="text-[13px] text-muted">Overall <b className={cn("tnum", tone(overall))}>{overall}/100</b> · updates as you type</span>}
        </div>
        {aiError && <p className="text-[13px] text-neg sm:col-span-2 lg:col-span-4">{aiError}</p>}
      </div>

      {ai && (
        <div className="space-y-3 border-t border-line bg-accent-soft/40 px-5 py-4 text-[13px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">Claude's improved listing</p>
            <div className="flex gap-2"><Button size="sm" variant="primary" onClick={useAi}><Check />Use this</Button><Button size="sm" variant="ghost" onClick={() => setAi(null)}>Discard</Button></div>
          </div>
          <p><b>Title:</b> {ai.title}</p>
          {ai.bullets.length > 0 && <div><b>Key points</b><ul className="mt-1 list-disc space-y-1 pl-5">{ai.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul></div>}
          {ai.description && <div><b>Description</b><p className="mt-1 whitespace-pre-line">{ai.description}</p></div>}
          {ai.faq.length > 0 && <div><b>FAQs</b><ul className="mt-1 space-y-1">{ai.faq.map((f, i) => <li key={i}>{f}</li>)}</ul></div>}
          {ai.keywords.length > 0 && <p><b>Search words:</b> {ai.keywords.join(", ")}</p>}
          {ai.tips.length > 0 && <div><b>Also do</b><ul className="mt-1 list-disc space-y-1 pl-5">{ai.tips.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
          <p className="text-[12px] text-faint">Anything in [square brackets] is a fact only you know (size, weight, material). Fill it in before you publish.</p>
        </div>
      )}

      {shown && (
        <div className="space-y-4 border-t border-line px-5 py-4 text-[13px]">
          <div className="grid gap-3 sm:grid-cols-5">
            {shown.pillars.map((p) => (
              <a key={p.key} href={`#vis-${p.key}`} onClick={(e) => { e.preventDefault(); document.getElementById(`vis-${p.key}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }} className="rounded-xl border border-line p-3 hover:border-line-strong">
                <span className="block text-[12px] font-semibold tracking-wide text-muted">{p.name}</span>
                <span className={cn("tnum block text-[26px] font-semibold", tone(p.score))}>{p.score}</span>
                <span className="block text-[11.5px] text-faint">{p.plain}</span>
              </a>
            ))}
          </div>
          {shown.pillars.map((p) => (
            <div key={p.key} id={`vis-${p.key}`}>
              <p className="font-semibold">{p.name} · {p.plain} <span className={tone(p.score)}>{p.score}/100</span></p>
              <ul className="mt-1 space-y-1">
                {p.checks.map((c) => <li key={c.label} className="flex gap-2"><span className={c.ok ? "text-pos" : "text-neg"}>{c.ok ? "✓" : "✗"}</span><span>{c.label}{!c.ok && <span className="block text-muted">→ {c.fix}</span>}</span></li>)}
              </ul>
            </div>
          ))}
          <p className="text-[12px] text-faint">{shown.method}</p>
        </div>
      )}
    </Card>
  );
}
