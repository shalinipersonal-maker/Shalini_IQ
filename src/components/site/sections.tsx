"use client";
import { ArrowRight, ArrowUpRight, Bot, Calculator, ClipboardCheck, Code2, Globe2, LineChart, Megaphone, Palette, Radar, ScanSearch, Search, Share2, ShoppingCart, Smartphone, Store, TrendingUp, Warehouse } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { cn } from "@/components/ui";
import { realStats, SITE } from "@/config/site";
import { ECOMMERCE_CALCS, FEE_CONFIGS, QUICK_CALCS } from "@/lib/site/fees";
import { calcHref } from "./fee-calculators";

/* ---------- Reveal on scroll (content stays readable if JS or motion is off) ---------- */
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) { el.dataset.shown = ""; return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.dataset.shown = ""; io.disconnect(); } }, { rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={cn("reveal", className)} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

export function SectionHead({ id, eyebrow, title, accent, body, center }: { id?: string; eyebrow: string; title: string; accent?: string; body?: string; center?: boolean }) {
  return (
    <Reveal className={cn("max-w-2xl scroll-mt-20", center && "mx-auto text-center")}>
      <div id={id} className="scroll-mt-24" />
      <p className={cn("inline-flex items-center gap-2 text-[11.5px] font-semibold tracking-[0.28em] text-accent", center && "justify-center")}><span className="gold-rule w-8" />{eyebrow}<span className="gold-rule w-8" /></p>
      <h2 className="mt-3 text-[34px] leading-[1.08] text-balance sm:text-[46px]">{title}{accent && <> <span className="text-gradient">{accent}</span></>}</h2>
      {body && <p className="mt-3 text-[15.5px] text-muted">{body}</p>}
    </Reveal>
  );
}

/* ---------- Hero ---------- */
const ROTATE = ["Amazon", "Flipkart", "Myntra", "Meesho", "your own store"];
function RotatingWord() {
  const [i, setI] = React.useState(0);
  React.useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % ROTATE.length), 2200); return () => clearInterval(t); }, []);
  return <span className="word-rotate inline-block min-w-[6ch]"><span key={i} className="text-gradient">{ROTATE[i]}</span></span>;
}

function HeroVisual() {
  const bars = [38, 52, 46, 64, 58, 76, 70, 88, 82, 96];
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="float-y gold-frame rounded-2xl border border-line bg-surface/90 p-5 shadow-card backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold">Brand growth · last 10 weeks</p>
          <span className="rounded-md bg-warn-soft px-1.5 py-0.5 text-[10.5px] font-medium text-warn">Illustration</span>
        </div>
        <div className="mt-4 flex h-36 items-end gap-2" aria-hidden>
          {bars.map((h, i) => <div key={i} className="bar-grow flex-1 rounded-t-md bg-gradient-to-t from-[#a94d61] to-[#e39aa8]" style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }} />)}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-[11.5px]">
          {[["Website", Globe2], ["Marketplaces", Store], ["Social", Share2]].map(([l, I]) => {
            const Icon = I as typeof Globe2;
            return <div key={l as string} className="flex items-center gap-1.5 rounded-lg bg-raised px-2 py-1.5"><Icon className="size-3.5 text-accent" />{l as string}</div>;
          })}
        </div>
      </div>
      <div className="float-y-slow absolute -top-5 -right-2 hidden rounded-xl border border-line bg-surface px-3 py-2 text-[12px] shadow-card sm:block">
        <p className="flex items-center gap-1.5 font-medium"><ScanSearch className="size-3.5 text-pos" />Listing check: 100/100</p>
      </div>
      <div className="float-y absolute -bottom-6 -left-3 hidden rounded-xl border border-line bg-surface px-3 py-2 text-[12px] shadow-card sm:block" style={{ animationDelay: "1.5s" }}>
        <p className="flex items-center gap-1.5 font-medium"><Calculator className="size-3.5 text-accent" />Fees calculated in 1 tap</p>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="grid-fade pointer-events-none absolute inset-0" aria-hidden />
      <div className="blob top-[-120px] left-[-80px] size-[380px] bg-accent" aria-hidden />
      <div className="blob top-[60px] right-[-120px] size-[420px] bg-ai" style={{ animationDelay: "-6s" }} aria-hidden />
      <div className="blob bottom-[-160px] left-[35%] size-[360px] bg-[var(--s-meta)]" style={{ animationDelay: "-12s" }} aria-hidden />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
        <div className="min-w-0">
          <p className="overlay-in inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 text-[12px] text-muted backdrop-blur"><span className="size-1.5 rounded-full bg-pos" />Websites · Marketing · Marketplace platform</p>
          <h1 className="mt-6 text-[46px] leading-[1.02] text-balance sm:text-[72px]">
            Build your brand.<br />Sell more on <RotatingWord />
          </h1>
          <p className="mt-5 max-w-xl text-[16.5px] text-muted">We build fast e-commerce websites, runs your SEO and social media, and gives agencies Shalini_IQ — one screen for every seller on every marketplace.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#enquiry" className="group inline-flex h-12 items-center gap-2 rounded-full btn-main px-6 text-[14.5px] font-semibold text-accent-ink shadow-card hover:brightness-110">Get free consultation<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></a>
            <a href="#tools" className="inline-flex h-12 items-center gap-2 rounded-full border border-line-strong bg-surface/60 px-6 text-[14.5px] font-semibold text-accent backdrop-blur hover:bg-raised">Try free tools</a>
          </div>
          <p className="mt-5 text-[13px] text-muted">Talk to us: <a href={`tel:${SITE.contact.phones[0].replace(/[^+\d]/g, "")}`} className="font-medium text-ink hover:text-accent">{SITE.contact.phones[0]}</a> · <a href={`mailto:${SITE.contact.email}`} className="font-medium text-ink hover:text-accent">{SITE.contact.email}</a></p>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

/* ---------- Marquee of channels we work with ---------- */
export function ChannelMarquee() {
  const items = ["Amazon", "Flipkart", "Myntra", "Meesho", "JioMart", "Shopify", "WooCommerce", "Instagram", "Facebook", "YouTube", "Google Ads", "Meta Ads", "Blinkit", "Zepto", "Swiggy Instamart", "Etsy"];
  return (
    <div className="border-y border-line bg-surface/70 py-4" aria-label="Channels we work with">
      <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <div className="marquee gap-3">
          {[...items, ...items].map((x, i) => <span key={i} aria-hidden={i >= items.length} className="rounded-full border border-line bg-surface px-4 py-1.5 text-[13px] font-medium whitespace-nowrap text-muted">{x}</span>)}
        </div>
      </div>
    </div>
  );
}

/* ---------- Services ---------- */
const SERVICE_CARDS = [
  { icon: ShoppingCart, title: "E-commerce websites", body: "Shopify, WooCommerce or custom-built stores that load fast and convert — with payments, shipping and WhatsApp built in." },
  { icon: LineChart, title: "Shalini_IQ platform", body: "For marketplace agencies: every seller's sales, ads, listings and reports in one workspace." },
  { icon: Search, title: "SEO", body: "Technical fixes, product and category pages that rank, and content that answers what buyers search." },
  { icon: Share2, title: "Social media marketing", body: "A content calendar, reels and posts in your brand voice, published and reported every month." },
  { icon: Megaphone, title: "Performance marketing", body: "Meta and Google ads planned around profit, not just clicks — with weekly numbers you can read." },
  { icon: Palette, title: "Creative & content", body: "Product images, banners, A+ style content and ad creatives that look like one brand." },
  { icon: Smartphone, title: "Mobile apps", body: "Android and iOS apps for ordering, bookings and loyalty, built with Flutter." },
  { icon: Bot, title: "AI chatbots & automation", body: "Website and WhatsApp assistants that answer, take orders and pass hot leads to your team." },
];
export function Services() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <SectionHead id="services" eyebrow="WHAT WE DO" title="Everything your brand needs" accent="to grow online" body="One team for the website, the marketing and the numbers — so nothing falls between agencies." />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICE_CARDS.map((s, i) => (
          <Reveal key={s.title} delay={i * 60}>
            <a href="#enquiry" className="gold-frame group flex h-full flex-col rounded-2xl border border-line bg-surface/80 p-6 backdrop-blur transition-all hover:-translate-y-1.5 hover:shadow-card">
              <span className="flex size-12 items-center justify-center rounded-full border border-line-strong bg-gradient-to-br from-[#e39aa8]/20 to-transparent text-accent transition-transform group-hover:scale-110"><s.icon className="size-5" /></span>
              <p className="font-royal mt-4 text-[21px]">{s.title}</p>
              <p className="mt-1.5 flex-1 text-[13.5px] text-muted">{s.body}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-accent">Talk to us<ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" /></span>
            </a>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- Strategy path ---------- */
const STRATEGY = [
  { icon: Radar, title: "Study the market", body: "Competitors, prices, search demand and where your buyers spend time." },
  { icon: Warehouse, title: "Plan stock & offers", body: "Forecast demand so ads never push products that are about to run out." },
  { icon: ClipboardCheck, title: "Fix the shop window", body: "Website, listings and content checked against each platform's rules." },
  { icon: Megaphone, title: "Bring in buyers", body: "SEO, social media and ads working together, not against each other." },
  { icon: TrendingUp, title: "Measure & improve", body: "A monthly report in plain words: what worked, what didn't, what's next." },
];
export function Strategy() {
  return (
    <section className="relative overflow-hidden border-y border-line bg-surface/60">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHead center eyebrow="HOW WE WORK" title="A growth plan built" accent="step by step" body="Like preparing a field before sowing: each step makes the next one pay off." />
        <div className="relative mt-12">
          <svg className="absolute top-7 right-[10%] left-[10%] hidden h-2 w-[80%] lg:block" viewBox="0 0 100 2" preserveAspectRatio="none" aria-hidden><line x1="0" y1="1" x2="100" y2="1" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" className="dash-flow" /></svg>
          <ol className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {STRATEGY.map((s, i) => (
              <Reveal key={s.title} delay={i * 90} className="text-center">
                <li className="list-none">
                  <span className="gold-frame relative mx-auto flex size-16 items-center justify-center rounded-full border border-line bg-surface shadow-card"><s.icon className="size-6 text-accent" /><span className="tnum absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-ink">{i + 1}</span></span>
                  <p className="mt-4 text-[15px] font-semibold">{s.title}</p>
                  <p className="mt-1 text-[13px] text-muted">{s.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ---------- Free tools grid ---------- */
export function ToolsGrid() {
  const card = (id: (typeof ECOMMERCE_CALCS)[number] | (typeof QUICK_CALCS)[number], i: number) => (
    <Reveal key={id} delay={i * 40}>
      <a href={calcHref(id)} className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-card">
        <span className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent"><Calculator className="size-4.5" /></span><span><span className="block text-[14.5px] font-semibold">{FEE_CONFIGS[id].name}</span><span className="block text-[12px] text-muted">{FEE_CONFIGS[id].blurb}</span></span></span>
        <ArrowUpRight className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
      </a>
    </Reveal>
  );
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div><p className="mb-3 text-[13px] font-semibold text-muted">E-commerce fee calculators</p><div className="grid gap-3">{ECOMMERCE_CALCS.map(card)}</div></div>
      <div><p className="mb-3 text-[13px] font-semibold text-muted">Quick-commerce fee calculators</p><div className="grid gap-3">{QUICK_CALCS.map(card)}</div>
        <p className="mt-4 rounded-xl border border-dashed border-line p-4 text-[13px] text-muted">Every calculator shows what reaches your bank, your real profit after GST credit, and the source of each fee rate — and every rate can be edited to match your own seller dashboard.</p></div>
    </div>
  );
}

const STACK = {
  "Store builders": ["Shopify", "WooCommerce", "WordPress", "Wix"],
  Frontend: ["Next.js", "React", "Tailwind CSS", "Flutter"],
  Backend: ["Node.js", "PHP", "PostgreSQL", "Prisma"],
  "Cloud & hosting": ["Vercel", "Render", "Cloudflare", "AWS", "Docker"],
  "Payments & messaging": ["Razorpay", "WhatsApp", "Email", "Webhooks"],
} as const;
export function TechStack() {
  const keys = Object.keys(STACK) as (keyof typeof STACK)[];
  const [k, setK] = React.useState<keyof typeof STACK>(keys[0]);
  return (
    <section className="border-y border-line bg-surface/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionHead eyebrow="TECHNOLOGY" title="Tools we" accent="build with" body="Proven, well-supported technology — so your site stays fast, secure and easy to grow." />
        <Reveal className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <div role="tablist" aria-label="Technology categories" className="flex gap-1.5 overflow-x-auto sm:flex-col">
            {keys.map((c) => <button key={c} role="tab" aria-selected={k === c} onClick={() => setK(c)} className={cn("rounded-lg px-3 py-2 text-left text-[13.5px] font-medium whitespace-nowrap transition-colors", k === c ? "bg-accent text-accent-ink shadow-sm" : "text-muted hover:bg-raised hover:text-ink")}>{c}</button>)}
          </div>
          <div role="tabpanel" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {STACK[k].map((t, i) => (
              <div key={`${k}-${t}`} className="overlay-in gold-frame flex flex-col items-center justify-center gap-2 rounded-xl border border-line bg-surface p-4 text-center" style={{ animationDelay: `${i * 50}ms` }}>
                <span className="font-royal flex size-12 items-center justify-center rounded-full border border-line-strong bg-gradient-to-br from-[#e39aa8]/25 to-transparent text-[18px] font-bold text-accent">{t.replace(/[^A-Za-z]/g, "").slice(0, 2)}</span>
                <span className="text-[13px] font-medium"><Code2 className="mr-1 inline size-3.5 text-faint" />{t}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Social media marketing ---------- */
const PLATFORMS = [
  { name: "Instagram", hue: 330 }, { name: "Facebook", hue: 220 }, { name: "YouTube", hue: 0 },
  { name: "LinkedIn", hue: 205 }, { name: "WhatsApp", hue: 142 }, { name: "X", hue: 0, mono: true },
];
export function SocialSection() {
  const stats = realStats();
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
      <div className="min-w-0">
        <SectionHead eyebrow="SOCIAL MEDIA MARKETING" title="One brand story," accent="everywhere your buyers scroll" body="We plan, design and post your content across every channel, reply to comments and messages, and run ads that send people to your store — then show you exactly what it earned." />
        <Reveal>
          <ul className="mt-6 grid gap-2 text-[14px] text-muted sm:grid-cols-2">
            {["Monthly content calendar", "Reels, posts and stories", "Meta & Google ad campaigns", "Monthly results report"].map((t) => <li key={t} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-accent" />{t}</li>)}
          </ul>
          {stats.length > 0 && (
            <div className="mt-6 grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-surface">
              {stats.map((s) => <div key={s.label} className="px-4 py-3"><p className="tnum text-[22px] font-semibold text-accent">{s.value}</p><p className="text-[12px] text-muted">{s.label}</p></div>)}
            </div>
          )}
          <a href="#enquiry" className="mt-7 inline-flex h-12 items-center gap-2 rounded-full btn-main px-6 text-[14.5px] font-semibold text-accent-ink hover:brightness-110">Get a free strategy call<ArrowRight className="size-4" /></a>
        </Reveal>
      </div>
      <Reveal className="relative mx-auto aspect-square w-full max-w-[420px]">
        <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgb(196_106_122/0.18),transparent_70%)]" aria-hidden />
        <div className="absolute inset-[4%] rounded-full border border-dashed border-line-strong" aria-hidden />
        <div className="absolute top-1/2 left-1/2 flex h-[46%] w-[26%] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[18px] border-4 border-accent/70 bg-surface p-1.5 shadow-card" aria-hidden>
          <div className="mx-auto h-1 w-6 rounded-full bg-line-strong" />
          <div className="mt-2 h-1/3 rounded-md bg-gradient-to-br from-[#e39aa8] to-[#a94d61]" />
          <div className="mt-1.5 h-1.5 w-3/4 rounded bg-line-strong" /><div className="mt-1 h-1.5 w-1/2 rounded bg-line" />
          <div className="mt-auto flex justify-around pb-1"><span className="size-2 rounded-full bg-neg" /><span className="size-2 rounded-full bg-accent" /><span className="size-2 rounded-full bg-pos" /></div>
        </div>
        <div className="orbit absolute inset-0" aria-label="Platforms we manage">
          {PLATFORMS.map((p, i) => {
            const a = (i / PLATFORMS.length) * Math.PI * 2;
            return (
              <div key={p.name} className="absolute" style={{ left: `${50 + 46 * Math.cos(a)}%`, top: `${50 + 46 * Math.sin(a)}%`, transform: "translate(-50%,-50%)" }}>
                <div className="orbit-counter">
                  <span className="flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[12px] font-semibold shadow-card">
                    <span className="size-2.5 rounded-full" style={{ background: p.mono ? "var(--ink)" : `hsl(${p.hue} 75% 50%)` }} />{p.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

/* ---------- Final call to action ---------- */
export function CtaBand() {
  return (
    <section className="px-4 pb-20 sm:px-6">
      <Reveal className="gold-frame relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-line cta-dark px-6 py-14 text-center sm:px-12">
        <div className="gold-rule mx-auto mb-6 w-24" aria-hidden />
        <h2 className="relative text-[28px] leading-tight font-semibold text-balance sm:text-[36px]">Ready to grow? Let&apos;s plan it together.</h2>
        <p className="relative mx-auto mt-3 max-w-xl text-[15.5px] text-muted">A free 30-minute call. We look at your website, listings and ads, and tell you the three things that would make the biggest difference.</p>
        <div className="relative mt-7 flex flex-wrap justify-center gap-3">
          <a href="#enquiry" className="inline-flex h-12 items-center rounded-full btn-main px-6 text-[14.5px] font-semibold text-accent-ink hover:brightness-110">Get free consultation</a>
          <Link href="/signup" className="inline-flex h-12 items-center rounded-full border border-line-strong px-6 text-[14.5px] font-semibold text-accent hover:bg-raised">Start an Shalini_IQ workspace</Link>
        </div>
      </Reveal>
    </section>
  );
}
