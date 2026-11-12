"use client";
import { ArrowLeft, Check, ExternalLink, LayoutDashboard, MessageCircle, Palette, Rocket, Search, Settings2, ShoppingBag, FileUp, Image as ImageIcon, Inbox, LogOut, Mail, RefreshCw, Send, Trash2, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { BarList, TrendChart } from "@/components/charts";
import { BrandMark } from "@/components/shell/sidebar";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Select, Textarea, cn } from "@/components/ui";
import { inr } from "@/lib/format";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { BoostCard, OverviewCard, TelegramCard, VisibilityCard } from "./control";
import { FIELDS, guessColumns, mapRows, parseDelimited, type Field as SalesField, type MappedRow } from "@/lib/live/csv";
import { LIVE_APP_NAME } from "@/config/live";

/* ---------- small fetch helper ---------- */
type ApiBody<T> = T & { ok: boolean; error?: string };
async function api<T = object>(url: string, init?: RequestInit): Promise<ApiBody<T>> {
  try {
    const res = await fetch(url, { ...init, headers: init?.body ? { "Content-Type": "application/json" } : undefined, cache: "no-store" });
    return (await res.json().catch(() => ({ ok: false, error: `Request failed (${res.status})` }))) as ApiBody<T>;
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again." } as ApiBody<T>;
  }
}
const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

interface Account { id: string; email: string; name: string | null; phone: string | null }
interface Status { database: boolean; email: boolean; alertEmail: boolean; sessionSecret: boolean; vault: boolean; meta: boolean; allowList: boolean; threads: boolean; amazon: boolean; flipkart: boolean; shopify: boolean; telegram: boolean; telegramChat: boolean; cron: boolean }

export function LiveAccount() {
  const params = useSearchParams();
  const [status, setStatus] = React.useState<Status | null>(null);
  const [account, setAccount] = React.useState<Account | null | undefined>(undefined);
  const [accountError, setAccountError] = React.useState("");

  React.useEffect(() => {
    api<Status>("/api/live/status").then((s) => s.ok && setStatus(s));
    api<{ account: Account | null }>("/api/auth/me").then((r) => {
      if (r.ok) setAccount(r.account);
      else { setAccount(null); setAccountError(r.error ?? ""); }
    });
  }, []);

  const logout = async () => { await api("/api/auth/logout", { method: "POST" }); setAccount(null); };

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2" aria-label="Back to the website"><BrandMark size={28} /><span className="text-[14.5px] font-semibold">{LIVE_APP_NAME}</span><Badge tone="pos" dot>Live</Badge></Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
                        {account && <Button variant="ghost" size="sm" onClick={logout}><LogOut />Sign out</Button>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        {account === undefined && <Card className="p-6 text-[13.5px] text-muted">Checking your sign-in…</Card>}
        {account === null && (
          <>
            <StatusCard status={status} />
            <SignIn linkError={params.get("error") === "link"} serverError={accountError} />
          </>
        )}
        {account && <Dashboard account={account} status={status} params={params} />}
      </main>
    </div>
  );
}

/* ---------- Setup checklist ---------- */
/* ---------- Tabs: one section at a time, with a Back button ---------- */
const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "alerts", label: "Enquiries", icon: Inbox },
  { id: "meta", label: "Post", icon: Send },
  { id: "studio", label: "Creative Studio", icon: Palette, href: "/studio" },
  { id: "boost", label: "Boost", icon: Rocket },
  { id: "sales", label: "Sales", icon: ShoppingBag },
  { id: "visibility", label: "SEO · AEO", icon: Search },
  { id: "telegram", label: "Telegram", icon: MessageCircle },
  { id: "setup", label: "Setup", icon: Settings2 },
] as const;
type TabId = (typeof TABS)[number]["id"];
const isTab = (h: string): h is TabId => TABS.some((t) => t.id === h && !("href" in t));

function Dashboard({ account, status, params }: { account: Account; status: Status | null; params: { get(k: string): string | null } }) {
  const [tab, setTab] = React.useState<TabId>("overview");
  React.useEffect(() => {
    const read = () => { const h = window.location.hash.replace("#", ""); setTab(isTab(h) ? h : "overview"); };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const go = (id: TabId) => {
    if (id === "overview") history.pushState(null, "", window.location.pathname + window.location.search);
    else history.pushState(null, "", `#${id}`);
    setTab(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const current = TABS.find((t) => t.id === tab)!;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[12px] font-semibold tracking-wide text-accent">SIGNED IN</p>
          <p className="text-[16px] font-semibold leading-tight">{account.name || account.email}</p>
        </div>
        <p className="text-[12.5px] text-muted">{account.email}</p>
      </div>

      <nav aria-label="Dashboard sections" className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = t.id === tab;
          const cls = cn(
            "flex flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-3 text-center text-[12.5px] font-medium transition-colors",
            active ? "border-accent bg-accent text-accent-ink shadow-sm" : "border-line bg-surface text-ink hover:border-accent/50 hover:bg-raised",
          );
          return "href" in t
            ? <a key={t.id} href={t.href} className={cls}><Icon className="size-5" />{t.label}</a>
            : <button key={t.id} type="button" onClick={() => go(t.id)} aria-current={active ? "page" : undefined} className={cls}><Icon className="size-5" />{t.label}</button>;
        })}
      </nav>

      {tab !== "overview" && (
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => go("overview")}><ArrowLeft />Back</Button>
          <h2 className="text-[17px] font-semibold">{current.label}</h2>
        </div>
      )}

      {tab === "overview" && <OverviewCard />}
      {tab === "alerts" && <LeadsSection />}
      {tab === "meta" && <MetaSection result={{ meta: params.get("meta"), pages: params.get("pages"), ig: params.get("ig"), msg: params.get("msg"), threads: params.get("threads"), name: params.get("name") }} />}
      {tab === "boost" && <BoostCard />}
      {tab === "sales" && <SalesSection />}
      {tab === "visibility" && <VisibilityCard />}
      {tab === "telegram" && <TelegramCard token={!!status?.telegram} chat={!!status?.telegramChat} cron={!!status?.cron} />}
      {tab === "setup" && <StatusCard status={status} />}
    </>
  );
}

function StatusCard({ status }: { status: Status | null }) {
  const items: { ok: boolean | undefined; label: string; what: string }[] = [
    { ok: status?.database, label: "Database", what: "Stores accounts, enquiries, posts and sales (DATABASE_URL)" },
    { ok: status?.sessionSecret, label: "Sign-in security", what: "SESSION_SECRET" },
    { ok: status?.allowList, label: "Approved emails", what: "Who may sign in (LIVE_ALLOWED_EMAILS)" },
    { ok: status?.email, label: "Email sending", what: "Sign-in links (RESEND_API_KEY, MAIL_FROM)" },
    { ok: status?.alertEmail, label: "Enquiry alerts", what: "Where new enquiries are emailed (ALERT_EMAIL)" },
    { ok: status?.vault, label: "Token lock", what: "Encrypts Meta access (TOKEN_ENCRYPTION_KEY)" },
    { ok: status?.meta, label: "Meta app", what: "Facebook and Instagram (META_APP_ID, META_APP_SECRET)" },
  ];
  const done = items.filter((i) => i.ok).length;
  const extras = [
    { ok: status?.threads, label: "Threads", what: "THREADS_APP_ID, THREADS_APP_SECRET" },
    { ok: status?.amazon, label: "Amazon sales", what: "AMAZON_SP_CLIENT_ID, AMAZON_SP_CLIENT_SECRET, AMAZON_SP_REFRESH_TOKEN" },
    { ok: status?.flipkart, label: "Flipkart orders", what: "FLIPKART_APP_ID, FLIPKART_APP_SECRET" },
    { ok: status?.shopify, label: "Shopify store", what: "SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET" },
  ];
  if (status && done === items.length) {
    return (
      <details className="rounded-xl border border-line bg-surface px-5 py-3 text-[13px]">
        <summary className="cursor-pointer text-muted"><span className="font-medium text-pos">All {items.length} essentials ready.</span> More connections: {extras.filter((e) => e.ok).length} of {extras.length}. Show details</summary>
        <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-3">
          {[...items, ...extras].map((i) => (
            <li key={i.label} className="flex items-start gap-2">
              <span className={cn("mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full", i.ok ? "bg-pos-soft text-pos" : "bg-raised text-faint")}>{i.ok ? <Check className="size-3" /> : <X className="size-3" />}</span>
              <span><span className="font-medium">{i.label}</span> <span className="block text-[11.5px] text-faint">{i.what}</span></span>
            </li>
          ))}
        </ul>
      </details>
    );
  }
  return (
    <Card>
      <CardHeader title="Setup checklist" subtitle={status ? `${done} of ${items.length} ready. Settings are added in Vercel, never on this page.` : "Checking…"} />
      <ul className="grid gap-x-6 gap-y-2 px-5 pb-4 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.label} className="flex items-start gap-2 text-[13px]">
            <span className={cn("mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full", i.ok ? "bg-pos-soft text-pos" : "bg-raised text-faint")}>{i.ok ? <Check className="size-3" /> : <X className="size-3" />}</span>
            <span><span className="font-medium">{i.label}</span> <span className="text-muted">— {i.what}</span></span>
          </li>
        ))}
      </ul>
      <p className="px-5 pt-1 text-[12px] font-semibold text-faint">MORE CONNECTIONS</p>
      <ul className="grid gap-x-6 gap-y-2 px-5 pt-2 pb-4 sm:grid-cols-3">
        {extras.map((i) => (
          <li key={i.label} className="flex items-start gap-2 text-[13px]">
            <span className={cn("mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full", i.ok ? "bg-pos-soft text-pos" : "bg-raised text-faint")}>{i.ok ? <Check className="size-3" /> : <X className="size-3" />}</span>
            <span><span className="font-medium">{i.label}</span> <span className="block text-[11.5px] text-faint">{i.what}</span></span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------- Sign in (email link, phone saved) ---------- */
function SignIn({ linkError, serverError }: { linkError: boolean; serverError: string }) {
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [sent, setSent] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    const r = await api("/api/auth/request", { method: "POST", body: JSON.stringify({ email, name, phone }) });
    setBusy(false);
    if (r.ok) setSent(true); else setError(r.error ?? "Something went wrong");
  };

  if (sent) {
    return (
      <Card className="p-6">
        <Mail className="size-6 text-accent" />
        <h2 className="mt-2 text-[18px] font-semibold">Check your email</h2>
        <p className="mt-1 text-[13.5px] text-muted">We sent a sign-in link to <b className="text-ink">{email}</b>. Open it on this device within 15 minutes. If it isn&apos;t in your inbox, check Spam or Promotions.</p>
        <Button className="mt-4" size="sm" onClick={() => setSent(false)}>Use a different email</Button>
      </Card>
    );
  }
  return (
    <Card className="p-6">
      <h2 className="text-[18px] font-semibold">Sign in with your email</h2>
      <p className="mt-1 text-[13.5px] text-muted">No password. We email you a link that signs you in. Your phone number is saved to your profile.</p>
      {linkError && <p className="mt-3 rounded-md bg-warn-soft px-3 py-2 text-[13px] text-warn">That sign-in link has expired or was already used. Ask for a new one below.</p>}
      {serverError && !linkError && <p className="mt-3 rounded-md bg-warn-soft px-3 py-2 text-[13px] text-warn">{serverError}</p>}
      <form onSubmit={submit} className="mt-4 grid max-w-xl gap-3 sm:grid-cols-2" noValidate>
        <Field label="Email" className="sm:col-span-2"><Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></Field>
        <Field label="Your name"><Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Shalini L" /></Field>
        <Field label="Phone"><Input type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" /></Field>
        {error && <p className="text-[13px] text-neg sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2"><Button type="submit" variant="primary" disabled={busy || !email}><Send />{busy ? "Sending…" : "Email me a sign-in link"}</Button></div>
      </form>
    </Card>
  );
}

/* ---------- 1 · Enquiry alerts ---------- */
interface Lead { reference: string; kind: string; name: string | null; email: string | null; phone: string | null; business: string | null; interest: string | null; message: string | null; alert: string | null; created_at: string }
function LeadsSection() {
  const [leads, setLeads] = React.useState<Lead[] | null>(null);
  const [error, setError] = React.useState("");
  const load = React.useCallback(() => {
    api<{ leads: Lead[] }>("/api/live/leads").then((r) => { if (r.ok) { setLeads(r.leads); setError(""); } else setError(r.error ?? ""); });
  }, []);
  React.useEffect(load, [load]);
  const del = async (ref: string | null) => {
    if (!confirm(ref ? "Delete this enquiry?" : "Delete ALL enquiries? This cannot be undone.")) return;
    const r = await api(`/api/live/leads?${ref ? `reference=${encodeURIComponent(ref)}` : "all=1"}`, { method: "DELETE" });
    if (r.ok) load(); else setError(r.error ?? "Could not delete");
  };
  return (
    <Card id="alerts" className="scroll-mt-20">
      <CardHeader title="1 · Enquiry alerts" subtitle="Every enquiry from the website form and IQ chat is saved here and emailed to the alert address straight away."
        action={<><Button size="sm" onClick={load}><RefreshCw />Refresh</Button>{!!leads?.length && <Button size="sm" variant="ghost" onClick={() => del(null)}><Trash2 />Delete all</Button>}<a href="/#enquiry" target="_blank" rel="noreferrer"><Button size="sm" variant="primary"><ExternalLink />Open enquiry form</Button></a></>} />
      <div className="px-5 pb-5">
        {error && <p className="text-[13px] text-neg">{error}</p>}
        {leads && !leads.length && <EmptyState icon={<Inbox />} title="No enquiries yet" body="Open the website, fill in the enquiry form with your own number, then come back and refresh." />}
        {leads && leads.length > 0 && (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="text-[11.5px] text-faint"><tr><th className="py-2 pr-3 font-medium">When</th><th className="pr-3 font-medium">Who</th><th className="pr-3 font-medium">Interested in</th><th className="pr-3 font-medium">Alert</th><th className="pr-3 font-medium">Reference</th><th className="font-medium"><span className="sr-only">Delete</span></th></tr></thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.reference} className="border-t border-line align-top">
                    <td className="py-2 pr-3 whitespace-nowrap text-muted">{when(l.created_at)}</td>
                    <td className="py-2 pr-3"><span className="font-medium">{l.name}</span>{l.business ? <span className="text-muted"> · {l.business}</span> : null}<br /><span className="text-muted">{[l.phone, l.email].filter(Boolean).join(" · ")}</span>{l.message ? <p className="mt-0.5 max-w-xs text-[12px] text-faint">{l.message}</p> : null}</td>
                    <td className="py-2 pr-3">{l.interest || l.kind}</td>
                    <td className="py-2 pr-3"><Badge tone={l.alert === "sent" ? "pos" : l.alert === "failed" ? "neg" : "warn"}>{l.alert === "sent" ? "Emailed" : l.alert === "failed" ? "Send failed" : "Not set up"}</Badge></td>
                    <td className="py-2 pr-3 font-mono text-[12px] text-muted">{l.reference}</td>
                    <td className="py-1"><Button size="icon" variant="ghost" aria-label={`Delete enquiry ${l.reference}`} onClick={() => del(l.reference)}><Trash2 /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ---------- 2 · Facebook & Instagram ---------- */
interface Target { id: string; kind: "facebook" | "instagram" | "threads"; externalId: string; name: string }
interface Post { id: string; kind: string; targetName: string; caption: string; status: string; error: string | null; permalink: string | null; likes: number | null; comments: number | null; createdAt: string }
interface PublishResult { targetId: string; name: string; kind: string; ok: boolean; permalink?: string; error?: string }

/** Any image → JPEG data URL, at most 1440 px wide (Instagram's sweet spot). */
async function toJpeg(src: Blob | string): Promise<{ url: string; w: number; h: number }> {
  const img = new Image();
  img.src = typeof src === "string" ? src : URL.createObjectURL(src);
  await img.decode();
  const scale = Math.min(1, 1440 / img.naturalWidth);
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  if (typeof src !== "string") URL.revokeObjectURL(img.src);
  let q = 0.9, url = c.toDataURL("image/jpeg", q);
  while (url.length > 3_900_000 && q > 0.5) { q -= 0.1; url = c.toDataURL("image/jpeg", q); }
  return { url, w: c.width, h: c.height };
}

function MetaSection({ result }: { result: { meta: string | null; pages: string | null; ig: string | null; msg: string | null; threads: string | null; name: string | null } }) {
  const [configured, setConfigured] = React.useState(true);
  const [threadsOn, setThreadsOn] = React.useState(false);
  const [targets, setTargets] = React.useState<Target[] | null>(null);
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [image, setImage] = React.useState<{ url: string; w: number; h: number; name: string } | null>(null);
  const [caption, setCaption] = React.useState("");
  const [chosen, setChosen] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [results, setResults] = React.useState<PublishResult[] | null>(null);

  const loadTargets = React.useCallback(() => {
    api<{ configured: boolean; threads: boolean; targets: Target[] }>("/api/live/meta").then((r) => { if (r.ok) { setConfigured(r.configured); setThreadsOn(r.threads); setTargets(r.targets); setChosen(r.targets.map((t) => t.id)); } });
  }, []);
  const [postNote, setPostNote] = React.useState("");
  const loadPosts = React.useCallback((force?: boolean) => {
    api<{ posts: Post[]; refreshError: string | null }>(`/api/live/posts${force ? "?refresh=1" : ""}`).then((r) => {
      if (!r.ok) return setPostNote(r.error ?? "");
      setPosts(r.posts);
      setPostNote(r.refreshError ? `Meta did not return the latest numbers: ${r.refreshError}` : force ? `Updated ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "");
    });
  }, []);
  React.useEffect(() => { const t = setInterval(() => loadPosts(), 120000); return () => clearInterval(t); }, [loadPosts]);
  React.useEffect(() => { loadTargets(); loadPosts(); }, [loadTargets, loadPosts]);

  const disconnect = async () => { await api("/api/live/meta", { method: "DELETE" }); loadTargets(); };
  const disconnectThreads = async () => { await api("/api/live/meta?kind=threads", { method: "DELETE" }); loadTargets(); };
  const hasThreads = !!targets?.some((t) => t.kind === "threads");
  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    try { setImage({ ...(await toJpeg(f)), name: f.name }); setNote(""); } catch { setNote("That file could not be read as an image."); }
  };
  const [products, setProducts] = React.useState<{ id: string; title: string; url: string; price: string; image: string | null }[]>([]);
  const [productId, setProductId] = React.useState("");
  React.useEffect(() => {
    api<{ products: { id: string; title: string; url: string; price: string; image: string | null }[] }>("/api/live/shopify/products").then((r) => { if (r.ok) setProducts(r.products); });
  }, []);
  const product = products.find((p) => p.id === productId);
  const addProductLink = () => { if (product) setCaption((c) => `${c.trim()}${c.trim() ? "\n\n" : ""}🛒 ${product.title}${product.price ? ` — ₹${Number(product.price).toLocaleString("en-IN")}` : ""}\nBuy now: ${product.url}`); };
  const useProductPhoto = async () => {
    if (!product?.image) return setNote("This product has no photo in Shopify.");
    try { setImage({ ...(await toJpeg(`/api/live/shopify/image?src=${encodeURIComponent(product.image)}`)), name: product.title }); setNote(""); }
    catch { setNote("Could not load the product photo."); }
  };
  const fromStudio = async () => {
    let saved: { url: string; name: string } | null = null;
    try { saved = JSON.parse(sessionStorage.getItem("entraiq-live-creative") ?? "null"); } catch { /* storage blocked */ }
    if (!saved?.url) { setNote("No Studio design waiting. Open Creative Studio, make a design, then Export → Post to Facebook / Instagram."); return; }
    setImage({ ...(await toJpeg(saved.url)), name: saved.name }); setNote("");
  };
  const ratio = image ? image.w / image.h : 1;
  const igOutOfRange = image && (ratio < 0.8 || ratio > 1.91);
  const igChosen = targets?.some((t) => t.kind === "instagram" && chosen.includes(t.id));

  const publish = async () => {
    if (!image) return;
    setBusy(true); setResults(null); setNote("Uploading the image…");
    const m = await api<{ id: string }>("/api/live/media", { method: "POST", body: JSON.stringify({ dataUrl: image.url }) });
    if (!m.ok) { setBusy(false); setNote(m.error ?? "Upload failed"); return; }
    setNote("Posting… Instagram can take up to 30 seconds.");
    const r = await api<{ results: PublishResult[] }>("/api/live/publish", { method: "POST", body: JSON.stringify({ mediaId: m.id, caption, targetIds: chosen }) });
    setBusy(false);
    if (!r.ok) { setNote(r.error ?? "Publishing failed"); return; }
    setNote(""); setResults(r.results); loadPosts();
  };

  const banner =
    result.meta === "ok" ? { tone: "pos", text: `Connected: ${result.pages ?? 0} Facebook Page(s) and ${result.ig ?? 0} Instagram account(s).` }
    : result.meta === "denied" ? { tone: "warn", text: "Facebook sign-in was cancelled, or no permissions were granted. Try again and tick every Page." }
    : result.meta === "state" ? { tone: "warn", text: "The connection expired. Please press Connect again." }
    : result.meta === "error" ? { tone: "neg", text: `Meta said: ${result.msg ?? "unknown error"}` }
    : result.threads === "ok" ? { tone: "pos", text: `Threads connected: ${result.name ?? ""}` }
    : result.threads === "denied" ? { tone: "warn", text: "Threads sign-in was cancelled. Try again." }
    : result.threads === "state" ? { tone: "warn", text: "The Threads connection expired. Please press Connect Threads again." }
    : result.threads === "error" ? { tone: "neg", text: `Threads said: ${result.msg ?? "unknown error"}` } : null;

  return (
    <Card id="meta" className="scroll-mt-20">
      <CardHeader title="2 · Facebook, Instagram & Threads" subtitle="Connect your Facebook Page (and the Instagram business account linked to it) and your Threads profile, then post one creative to all of them."
        action={targets?.length ? <Button size="sm" variant="ghost" onClick={disconnect}>Disconnect</Button> : null} />
      <div className="space-y-4 px-5 pb-5">
        {banner && <p className={cn("rounded-md px-3 py-2 text-[13px]", banner.tone === "pos" ? "bg-pos-soft text-pos" : banner.tone === "neg" ? "bg-neg-soft text-neg" : "bg-warn-soft text-warn")}>{banner.text}</p>}
        {!configured && <p className="text-[13px] text-muted">The Meta app isn&apos;t set up yet. Once META_APP_ID and META_APP_SECRET are added in Vercel, a Connect button appears here.</p>}
        {configured && targets && (
          <div className="flex flex-wrap items-center gap-2">
            {targets.map((t) => (
              <label key={t.id} className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-[13px]", chosen.includes(t.id) ? "border-accent bg-accent-soft" : "border-line")}>
                <input type="checkbox" checked={chosen.includes(t.id)} onChange={(e) => setChosen((c) => (e.target.checked ? [...c, t.id] : c.filter((x) => x !== t.id)))} />
                <Badge tone={t.kind === "facebook" ? "accent" : t.kind === "threads" ? "neutral" : "ai"}>{t.kind === "facebook" ? "Facebook" : t.kind === "threads" ? "Threads" : "Instagram"}</Badge>{t.name}
              </label>
            ))}
            <a href="/api/meta/connect"><Button size="sm" variant={targets.length ? "secondary" : "primary"}>{targets.some((t) => t.kind !== "threads") ? "Reconnect / add Pages" : "Connect Facebook & Instagram"}</Button></a>
            {threadsOn && <a href="/api/threads/connect"><Button size="sm">{hasThreads ? "Reconnect Threads" : "Connect Threads"}</Button></a>}
            {hasThreads && <Button size="sm" variant="ghost" onClick={disconnectThreads}>Disconnect Threads</Button>}
          </div>
        )}

        {configured && !!targets?.length && (
          <div className="grid gap-4 md:grid-cols-[240px_1fr]">
            <div>
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-dashed border-line bg-raised">
                {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
                {image ? <img src={image.url} alt="Creative to post" className="max-h-full max-w-full object-contain" /> : <ImageIcon className="size-8 text-faint" />}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <label className="inline-flex"><input type="file" accept="image/*" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} /><span className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-line px-2.5 text-[12.5px] font-medium hover:bg-raised"><FileUp className="size-4" />Choose image</span></label>
                <Button size="sm" onClick={fromStudio}>Use Studio design</Button>
                <a href="/studio"><Button size="sm" variant="ghost">Open Creative Studio</Button></a>
              </div>
              {image && <p className="mt-1 text-[12px] text-faint">{image.name} · {image.w} × {image.h}px</p>}
            </div>
            <div className="space-y-3">
              {products.length > 0 && (
                <div className="flex flex-wrap items-end gap-2 rounded-lg border border-line p-3">
                  <Field label="Shopify product" className="min-w-[220px] flex-1"><Select value={productId} onChange={(e) => setProductId(e.target.value)}><option value="">— choose a product —</option>{products.map((p) => <option key={p.id} value={p.id}>{p.title}{p.price ? ` · ₹${p.price}` : ""}</option>)}</Select></Field>
                  <Button size="sm" disabled={!product} onClick={addProductLink}>Add “Buy now” link</Button>
                  <Button size="sm" disabled={!product?.image} onClick={useProductPhoto}>Use product photo</Button>
                </div>
              )}
              <Field label="Caption" hint={`${caption.length} / 2,200`}><Textarea rows={5} value={caption} maxLength={2200} onChange={(e) => setCaption(e.target.value)} placeholder="Write the post text, with hashtags if you like." /></Field>
              {igChosen && igOutOfRange && <p className="text-[12.5px] text-warn">Instagram only accepts shapes from 4:5 (portrait) to 1.91:1 (landscape). This image is outside that, so Instagram may refuse it. Square works everywhere.</p>}
              <p className="text-[12.5px] text-muted">This posts publicly to the ticked accounts, straight away. You can delete a post from Facebook or Instagram afterwards.</p>
              <Button variant="primary" disabled={busy || !image || !chosen.length} onClick={publish}><Send />{busy ? "Posting…" : `Post now to ${chosen.length} account${chosen.length === 1 ? "" : "s"}`}</Button>
              {note && <p className="text-[13px] text-muted">{note}</p>}
              {results && (
                <ul className="space-y-1 text-[13px]">
                  {results.map((r) => <li key={r.targetId} className={r.ok ? "text-pos" : "text-neg"}>{r.ok ? "✓" : "✗"} {r.name}: {r.ok ? (r.permalink ? <a href={r.permalink} target="_blank" rel="noreferrer" className="underline">view the post</a> : "posted") : r.error}</li>)}
                </ul>
              )}
            </div>
          </div>
        )}

        {posts.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between"><h4 className="text-[13px] font-semibold">Posted from {LIVE_APP_NAME}</h4><Button size="sm" variant="ghost" onClick={() => loadPosts(true)}><RefreshCw />Refresh likes &amp; comments</Button></div>
            <ul className="divide-y divide-line rounded-lg border border-line text-[13px]">
              {posts.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0"><Badge tone={p.kind === "facebook" ? "accent" : p.kind === "threads" ? "neutral" : "ai"}>{p.kind === "facebook" ? "Facebook" : p.kind === "threads" ? "Threads" : "Instagram"}</Badge> <span className="font-medium">{p.targetName}</span> <span className="text-muted">· {when(p.createdAt)}</span><span className="block truncate text-[12px] text-faint">{p.caption || "(no caption)"}</span></span>
                  <span className="flex items-center gap-3 text-[12.5px]">
                    {p.status === "published" ? <><span className="tnum">{p.likes ?? 0} reactions</span><span className="tnum">{p.comments ?? 0} comments</span>{p.permalink && <a href={p.permalink} target="_blank" rel="noreferrer" className="text-accent underline">Open</a>}</> : <span className="text-neg">Failed: {p.error}</span>}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-[11.5px] text-faint">{postNote || "Reactions and comments are read from Meta every 2 minutes; press Refresh for the latest."}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ---------- 3 · Sales reports ---------- */
const SOURCES = ["Amazon", "Flipkart", "Shopify", "Meesho", "Myntra", "Other"] as const;
type Source = (typeof SOURCES)[number];
interface Summary {
  totals: { revenue: number; units: number; orders: number; first: string | null; last: string | null };
  days: { day: string; revenue: number; units: number }[];
  top: { product: string; sku: string | null; revenue: number; units: number }[];
  bySource: { source: string; revenue: number; units: number }[];
  uploads: { id: string; source: string; fileName: string; rows: number; createdAt: string }[];
}

function SalesSection() {
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [file, setFile] = React.useState<{ name: string; header: string[]; body: string[][] } | null>(null);
  const [cols, setCols] = React.useState<Record<SalesField, number> | null>(null);
  const [source, setSource] = React.useState<Source>("Amazon");
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState("");

  const load = React.useCallback(() => { api<Summary>("/api/live/sales").then((r) => r.ok && setSummary(r)); }, []);
  React.useEffect(load, [load]);
  const [conn, setConn] = React.useState<{ amazon: boolean; flipkart: boolean; shopify: boolean }>({ amazon: false, flipkart: false, shopify: false });
  React.useEffect(() => { api<{ amazon: boolean; flipkart: boolean; shopify: boolean }>("/api/live/status").then((r) => r.ok && setConn({ amazon: r.amazon, flipkart: r.flipkart, shopify: r.shopify })); }, []);
  const [syncing, setSyncing] = React.useState<"" | "Amazon" | "Flipkart" | "Shopify">("");
  const [syncNote, setSyncNote] = React.useState("");

  const syncFlipkart = async () => {
    setSyncing("Flipkart"); setSyncNote("Reading your Flipkart orders…");
    const r = await api<{ rows: number; partial: boolean }>("/api/live/flipkart", { method: "POST" });
    setSyncing("");
    setSyncNote(r.ok ? `Flipkart: ${r.rows.toLocaleString("en-IN")} order lines from the last 30 days${r.partial ? " (more exist — press Sync again later)" : ""}.` : (r.error ?? "Flipkart sync failed"));
    if (r.ok) load();
  };
  const syncShopify = async () => {
    setSyncing("Shopify"); setSyncNote("Reading your Shopify orders…");
    const r = await api<{ rows: number }>("/api/live/shopify", { method: "POST" });
    setSyncing("");
    setSyncNote(r.ok ? `Shopify: ${r.rows.toLocaleString("en-IN")} order lines from the last 30 days.` : (r.error ?? "Shopify sync failed"));
    if (r.ok) load();
  };
  const syncAmazon = async () => {
    setSyncing("Amazon"); setSyncNote("Asking Amazon for your orders report… this usually takes 1–5 minutes. Keep this page open.");
    const first = await api<{ reportId: string }>("/api/live/amazon", { method: "POST", body: JSON.stringify({}) });
    if (!first.ok) { setSyncing(""); setSyncNote(first.error ?? "Amazon sync failed"); return; }
    for (let i = 0; i < 40; i++) {
      await new Promise((res) => setTimeout(res, 15000));
      const r = await api<{ state: string; rows?: number }>("/api/live/amazon", { method: "POST", body: JSON.stringify({ reportId: first.reportId }) });
      if (!r.ok) { setSyncing(""); setSyncNote(r.error ?? "Amazon sync failed"); return; }
      if (r.state === "done") { setSyncing(""); setSyncNote(`Amazon: ${(r.rows ?? 0).toLocaleString("en-IN")} order lines from the last 30 days.`); load(); return; }
      setSyncNote(`Amazon is still preparing the report… (${Math.round(((i + 1) * 15) / 60 * 10) / 10} min)`);
    }
    setSyncing(""); setSyncNote("Amazon is taking longer than usual. Try Sync Amazon again in a few minutes.");
  };

  const pick = async (f: File | undefined) => {
    setNote("");
    if (!f) return;
    if (/\.(xlsx?|xlsm)$/i.test(f.name)) { setNote("Excel files can't be read here yet. Open it in Excel or Google Sheets, choose File → Save as / Download → CSV, and upload that."); return; }
    const rows = parseDelimited(await f.text());
    // Some reports have title lines above the real header: take the first row with 3+ filled cells.
    const h = rows.findIndex((r) => r.filter(Boolean).length >= 3);
    if (h < 0 || rows.length < h + 2) { setNote("No table found in that file. Upload the CSV or TXT report as downloaded from Seller Central / Seller Hub."); return; }
    const header = rows[h];
    setFile({ name: f.name, header, body: rows.slice(h + 1) });
    setCols(guessColumns(header));
    const all = header.join(" ");
    setSource(/asin|amazon/i.test(all + f.name) ? "Amazon" : /fsn|flipkart/i.test(all + f.name) ? "Flipkart" : /meesho/i.test(f.name) ? "Meesho" : /myntra/i.test(f.name) ? "Myntra" : "Other");
  };
  const mapped: MappedRow[] = React.useMemo(() => (file && cols ? mapRows(file.body, cols) : []), [file, cols]);
  const total = mapped.reduce((s, r) => s + (r.amount ?? 0), 0);

  const save = async () => {
    if (!file || !mapped.length) return;
    setBusy(true); setNote("");
    const rows = mapped.slice(0, 5000);
    const r = await api<{ rows: number }>("/api/live/sales", { method: "POST", body: JSON.stringify({ source, fileName: file.name, rows }) });
    setBusy(false);
    if (!r.ok) { setNote(r.error ?? "Import failed"); return; }
    setNote(`Imported ${r.rows.toLocaleString("en-IN")} rows${mapped.length > 5000 ? " (the first 5,000; split the file to import the rest)" : ""}.`);
    setFile(null); setCols(null); load();
  };
  const remove = async (id: string) => { await api(`/api/live/sales?upload=${encodeURIComponent(id)}`, { method: "DELETE" }); load(); };

  return (
    <Card id="sales" className="scroll-mt-20">
      <CardHeader title="3 · Sales" subtitle="Sales come in automatically once Amazon and Flipkart are connected. Until then, upload a report file. Only you can see this." />
      <div className="space-y-4 px-5 pb-5">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line p-4 text-[13px]">
          <span className="mr-auto font-medium">Automatic sync (last 30 days)</span>
          <Button size="sm" variant={conn.amazon ? "primary" : "secondary"} disabled={!conn.amazon || !!syncing} onClick={syncAmazon}><RefreshCw />{syncing === "Amazon" ? "Syncing Amazon…" : conn.amazon ? "Sync Amazon" : "Amazon not connected"}</Button>
          <Button size="sm" variant={conn.flipkart ? "primary" : "secondary"} disabled={!conn.flipkart || !!syncing} onClick={syncFlipkart}><RefreshCw />{syncing === "Flipkart" ? "Syncing Flipkart…" : conn.flipkart ? "Sync Flipkart" : "Flipkart not connected"}</Button>
          <Button size="sm" variant={conn.shopify ? "primary" : "secondary"} disabled={!conn.shopify || !!syncing} onClick={syncShopify}><RefreshCw />{syncing === "Shopify" ? "Syncing Shopify…" : conn.shopify ? "Sync Shopify" : "Shopify not connected"}</Button>
          {syncNote && <p className="w-full text-muted">{syncNote}</p>}
        </div>
        <div className="rounded-lg border border-dashed border-line bg-raised p-4 text-[13px]">
          <label className="inline-flex"><input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain,.xlsx,.xls" className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} /><span className="inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-md bg-accent px-3 font-medium text-accent-ink"><FileUp className="size-4" />Choose a report file</span></label>
          <p className="mt-2 text-muted">Works with: Amazon <i>Business Report</i> (by ASIN) or <i>Order Report</i> (.txt), and Flipkart <i>Orders</i> or <i>Sales Report</i> (.csv). CSV, TSV or TXT.</p>
        </div>
        {note && <p className="text-[13px] text-muted">{note}</p>}

        {file && cols && (
          <div className="space-y-3 rounded-lg border border-line p-4">
            <div className="flex flex-wrap items-end gap-3">
              <p className="mr-auto text-[13.5px]"><b>{file.name}</b> <span className="text-muted">· {file.body.length.toLocaleString("en-IN")} rows</span></p>
              <Field label="Marketplace"><Select value={source} onChange={(e) => setSource(e.target.value as Source)}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
            </div>
            <p className="text-[12.5px] text-muted">We matched the columns below. Check them; change any that are wrong.</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {FIELDS.map((f) => (
                <Field key={f.key} label={f.label}>
                  <Select value={cols[f.key]} onChange={(e) => setCols({ ...cols, [f.key]: Number(e.target.value) })}>
                    <option value={-1}>— not in this file —</option>
                    {file.header.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                  </Select>
                </Field>
              ))}
            </div>
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[12.5px]">
                <thead className="text-faint"><tr><th className="py-1 pr-2 font-medium">Date</th><th className="pr-2 font-medium">Order</th><th className="pr-2 font-medium">SKU</th><th className="pr-2 font-medium">Product</th><th className="pr-2 text-right font-medium">Qty</th><th className="text-right font-medium">Amount</th></tr></thead>
                <tbody>{mapped.slice(0, 5).map((r, i) => <tr key={i} className="border-t border-line"><td className="py-1 pr-2">{r.date ?? "—"}</td><td className="pr-2">{r.orderId ?? "—"}</td><td className="pr-2">{r.sku ?? "—"}</td><td className="max-w-[220px] truncate pr-2">{r.title ?? "—"}</td><td className="tnum pr-2 text-right">{r.quantity ?? "—"}</td><td className="tnum text-right">{r.amount == null ? "—" : inr(r.amount)}</td></tr>)}</tbody>
              </table>
            </div>
            <p className="text-[12.5px] text-muted">{mapped.length.toLocaleString("en-IN")} rows with a quantity or amount · total {inr(total)}{cols.date < 0 ? " · no date column, so there will be no daily chart" : ""}</p>
            <div className="flex gap-2"><Button variant="primary" disabled={busy || !mapped.length} onClick={save}>{busy ? "Importing…" : "Import these rows"}</Button><Button variant="ghost" onClick={() => { setFile(null); setCols(null); }}>Cancel</Button></div>
          </div>
        )}

        {summary && summary.uploads.length === 0 && !file && <EmptyState icon={<TrendingUp />} title="No reports uploaded yet" body="Your totals, a daily chart and your top products appear here after the first upload." />}
        {summary && summary.uploads.length > 0 && (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                { l: "Sales", v: inr(summary.totals.revenue, true) },
                { l: "Units", v: summary.totals.units.toLocaleString("en-IN") },
                { l: "Orders", v: summary.totals.orders ? summary.totals.orders.toLocaleString("en-IN") : "—" },
                { l: "Period", v: summary.totals.first ? `${summary.totals.first} → ${summary.totals.last}` : "No dates" },
              ].map((k) => <div key={k.l} className="rounded-lg border border-line p-3"><p className="text-[11.5px] text-faint">{k.l}</p><p className="tnum mt-0.5 text-[17px] font-semibold">{k.v}</p></div>)}
            </div>
            {summary.days.length > 1 && <div><h4 className="mb-1 text-[13px] font-semibold">Sales by day</h4><TrendChart data={summary.days} x="day" series={[{ key: "revenue", label: "Sales", color: "var(--s-revenue)", kind: "area" }]} fmt={(n) => inr(n, true)} height={220} /></div>}
            <div className="grid gap-4 md:grid-cols-2">
              <div><h4 className="mb-2 text-[13px] font-semibold">Top products</h4><BarList items={summary.top.map((t, i) => ({ key: `${t.product}-${i}`, label: t.product, sub: `${t.units.toLocaleString("en-IN")} units${t.sku ? ` · ${t.sku}` : ""}`, value: t.revenue }))} fmt={(n) => inr(n, true)} /></div>
              <div>
                <h4 className="mb-2 text-[13px] font-semibold">By marketplace</h4>
                <BarList items={summary.bySource.map((s) => ({ key: s.source, label: s.source, sub: `${s.units.toLocaleString("en-IN")} units`, value: s.revenue }))} fmt={(n) => inr(n, true)} />
                <h4 className="mt-4 mb-2 text-[13px] font-semibold">Uploaded files</h4>
                <ul className="divide-y divide-line rounded-lg border border-line text-[12.5px]">
                  {summary.uploads.map((u) => <li key={u.id} className="flex items-center justify-between gap-2 px-3 py-1.5"><span className="min-w-0 truncate"><b>{u.source}</b> · {u.fileName} <span className="text-faint">· {u.rows} rows · {when(u.createdAt)}</span></span><Button size="icon" variant="ghost" aria-label={`Remove ${u.fileName}`} onClick={() => remove(u.id)}><Trash2 /></Button></li>)}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

