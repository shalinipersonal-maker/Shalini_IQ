# RULE.md — ENTRAIQ Project Charter, Scope & Engineering Rules

> Single source of truth for **what ENTRAIQ is**, **what is in and out of scope**, and **the
> rules any contributor or AI agent must follow** when changing it. Read this before writing code.
> Companion docs live in [`docs/`](docs/); this file governs them.

---

## 1. Identity

- **Company:** ENTRAIOT SOLUTIONS PRIVATE LIMITED
- **Product:** **ENTRAIQ — Marketplace Intelligence Platform**
- **What it is:** An AI-powered, multi-marketplace management and advertising-intelligence platform
  that consolidates Amazon + Flipkart marketplace performance, Meta advertising, sales analytics,
  AI recommendations, and a Canva-style creative studio into one unified interface for a business or
  digital-marketing agency.
- **Current purpose:** A premium, presentation-ready **demo** that ENTRAIOT can open in front of a
  prospective client, built on a production-shaped codebase so it can grow into the live product.
- Branding is configurable in [`src/config/brand.ts`](src/config/brand.ts) and at runtime in
  Settings → Brand. Never hardcode the company or product name into screens.

---

## 2. The one rule that governs everything: **honesty**

ENTRAIQ must never mislead the viewer about what is real. This rule outranks visual polish, feature
count, and convenience.

1. **No fake live data.** Simulated values are never labelled real-time. Every screen shows the
   demo badge and *"Sample data — not connected to live marketplace accounts."*
2. **No fake integrations.** Connectors report their true state (`pending_configuration` /
   `configured_not_authorized`); `exchangeCode`/`refresh`/`sync` **throw** `IntegrationPendingError`
   rather than return invented API responses. A connection button never implies a completed
   integration.
3. **No fabricated records.** The app does not generate receipts, confirmations, reviews, or
   endorsements presented as genuine. The public website carries no invented testimonials, client
   logos or performance statistics (stat slots stay hidden until real numbers are entered), and does
   not copy any competitor's wording, design or branding. Fee calculators show their sources and
   check date, mark estimates, and let every rate be edited.
4. **AI output is labelled.** Insights are computed from the sample data and surfaced as
   demo-generated; they carry a `method` and an honest, heuristic confidence (not a statistical
   probability).
5. **Say what is not done.** If a feature cannot be completed, it is documented as pending — never
   silently replaced with a decorative stand-in.

If a change would blur any of these lines, it is out of scope — stop and raise it.

---

## 3. Scope — what ENTRAIQ IS (built and shipping)

A single Next.js app (frontend + `/api` backend in one repo). Twelve modules, all functional
against demo state:

| # | Module | Scope |
|---|--------|-------|
| A | **Overview** | Business health in 60s: revenue, orders, ad spend, ROAS/ACOS/TACOS, AOV, conversion, growth; trend chart (metric switch), marketplace & channel breakdown, top products/campaigns, recent activity, AI insights |
| B | **Marketplaces** | Amazon + Flipkart (revenue, orders, products, sales trends, inventory, analytics); "Other — coming soon"; simulated connection flow that stops at *pending configuration* |
| C | **Meta Ads** | Campaign/ad-set/ad performance, full metric set (impressions, reach, CTR, CPC, CPM, conversions, ROAS…), campaign table, and working create / edit / pause / resume against demo state |
| D | **Advertising Analytics** | Unified Amazon/Meta/Flipkart comparison; attributed revenue kept distinct from total sales; never sums overlapping attribution into "unique" revenue |
| E | **Sales Analytics** | Daily/weekly/monthly, product- & marketplace-wise revenue, best/poor performers, growth, AOV |
| F | **AI Intelligence Center** | Business summary, trend analysis, campaign/product/budget insights, forecast; per-insight explain, view-related, generate-report, mark-reviewed |
| G | **AI Creative Studio** | Konva canvas: text/shapes/images/layers, templates, brand kit, save & reopen, export PNG/JPEG; demo AI copy/headline/concept generation |
| H | **Products** | Table + product detail analytics, search, inventory-risk filter |
| I | **Reports** | Sales/ads/marketplace/product/campaign reports; CSV + PDF export of the data actually shown, logged to history |
| J | **Clients** | Agency view: client list/profile, team, accounts, activity, reports, add-client onboarding |
| K | **Admin/Settings** | Users, roles, permissions (RBAC), workspace/brand/AI settings, notifications, audit log, Reset Demo Data |
| L | **Public website** (`/`) — production | Entraiot's live site (tech services only — no seller account management, so we never compete with agencies using ENTRAIQ): animated hero, services, strategy, free tools (listing check with auto-fix to 100/100; 9 marketplace fee calculators as pop-ups), portfolio, technology stack, social media marketing, ENTRAIQ platform + pricing, FAQ, enquiry form, full footer, sticky WhatsApp/Call bar, policies, SEO (sitemap, robots, structured data, preview image). `/signup` creates a browser workspace; `/leads` lists website leads; platform preview at `/login` stays clearly labelled sample data. Settings in `src/config/site.ts`; see `docs/WEBSITE.md` |
| M | **Live test** (`/account`) — real | Email-link sign-in limited to `LIVE_ALLOWED_EMAILS`; website enquiries stored and emailed; real Facebook Page / Instagram posting with likes and comments read back; Amazon/Flipkart report upload with totals and charts. Shows a setup checklist (names only, never values) and reports missing setup honestly. Dashboards elsewhere stay sample data. See `docs/LIVE_TEST.md` |

**Cross-cutting, in scope:** consistent app shell (collapsible sidebar, topbar), global date-range
/ marketplace / client selectors, dark + light themes, responsive down to 390px, demo state
persisted to `localStorage`, audit logging of user actions.

---

## 4. Scope — what ENTRAIQ is NOT (yet)

These are deliberately **out of the demo's scope** and must stay clearly unbuilt until real work is
done, under the honesty rule:

- **No live marketplace/Meta data.** Real Amazon SP/Ads, Flipkart, Meta sync is not implemented.
- **No real authentication.** The entry screen is a demo name-gate, not auth. RBAC is demonstrated
  on local state, not enforced by a server session.
- **No database-backed data at runtime.** The Prisma schema exists but the app runs on the
  generated demo data; nothing reads Postgres yet.
- **No hosted AI model.** Insights come from a local rules engine behind the `AIProvider` interface.
- **No payment, billing, or real client PII.**

Adding any of these is a **production project**, tracked in §9 — not a casual change.

---

## 5. Architecture & tech stack (authoritative)

- **Framework:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4
- **UI:** Radix primitives, Lucide icons, Recharts; reusable primitives in `src/components/ui`,
  shared blocks in `src/components/shared`
- **State:** Zustand, persisted to `localStorage` (`entraiq-demo-v1`)
- **Creative canvas:** Konva / react-konva
- **Export:** jsPDF (+autotable) for PDF, native CSV
- **Backend (same app):** Next.js route handlers (`/api/health`, `/api/v1/integrations`),
  `server-only` modules under `src/server`
- **Data model (forward-looking):** Prisma + PostgreSQL, **29 models**, tenant isolation
- **Layering:** `demo/` (sample data) → `analytics/` (one definition each of ROAS/ACOS/TACOS) →
  pages. The UI depends only on the `AIProvider` interface so a hosted model can replace the demo
  engine without touching a screen. Connectors live behind a common interface, separate from the
  presentation layer.

Metric definitions are single-source (`src/lib/analytics/metrics.ts`): **ROAS** = attributed ad
revenue ÷ ad spend; **ACOS** = ad spend ÷ attributed ad sales; **TACOS** = ad spend ÷ total sales.

---

## 6. Engineering rules (how to change this repo)

1. **Inspect before building.** Understand existing structure, components, and routes before adding.
2. **Build working software, not screenshots.** Every button has a real action, every filter
   changes results, every form validates and submits, every modal/dropdown works. No decorative
   controls.
3. **Reuse the design system.** Use the shared sidebar/topbar/metric-card/chart/table/filter/modal/
   badge/insight-card/empty/loading components; keep spacing, typography, and the dark-navy +
   restrained-accent palette consistent. Light and dark must both work.
4. **One definition per metric.** Never recompute ROAS/ACOS/TACOS inline; use `analytics/metrics`.
5. **Demo data stays internally consistent.** Changes to the generator must keep
   `npm run verify:data` green (marketplace/product revenue reconciles, spend sums, attribution
   bounded, ≥12 products & ≥8 campaigns).
6. **User actions are overlays.** Mutations (pause campaign, edit budget, save creative, review
   insight) are recorded as edits in the store, never by mutating generated base data; Reset Demo
   Data clears them.
7. **Server-only stays server-only.** Connector/token code imports `server-only`. API keys and
   tokens never reach the browser.
8. **Type-safe & linted.** `npm run typecheck` and `npm run lint` must pass; forms use Zod +
   React Hook Form.
9. **Work module by module** and verify each before moving on. No uncontrolled multi-module dumps.
10. **Keep docs in step.** Update `docs/` and this file when scope or rules change.

---

## 7. Security rules (mandatory)

Never expose API secrets in frontend code. Never hardcode production credentials. Never store
marketplace tokens in plaintext — use the AES-256-GCM vault
([`src/server/connectors/token-vault.ts`](src/server/connectors/token-vault.ts)). Validate all
input. Enforce role-based permissions and protect per-client data (tenant isolation +
`prisma/rls.sql` for production). Keep `.env*` out of source control (only `.env.example` is
tracked). Rate-limit and audit important operations. Security is never traded for visual polish.

---

## 8. Definition of done (acceptance)

A change is demo-ready only when: the app starts and builds; it looks like a premium SaaS product;
all navigation works; Overview is populated; date/marketplace/client filters work; Amazon, Flipkart,
Meta demo screens work; campaign details open and demo actions persist across refresh; AI
recommendations show; Creative Studio edits, saves, and reopens; reports export; demo mode is
clearly identified; **no live integration is falsely claimed**; no major console/compilation errors;
layout is responsive; the website's forms validate, the listing check and fee calculator work, and
lead alerts are never claimed as sent unless the webhook accepted them. Verify with `npm run typecheck`, `npm run build`, `npm run verify:data`, and
the e2e smoke test (`scripts/e2e-smoke.mjs`, ~70 checks).

---

## 9. Roadmap to production (ordered)

Each step lifts a §4 limitation. Do them behind the existing interfaces, preserving §2 honesty.

1. **Authentication & sessions** — replace the demo gate (Auth.js), enforce RBAC server-side.
2. **Database-backed data** — wire Prisma to Postgres, `prisma migrate dev --name init`, seed from
   the demo generator, apply `prisma/rls.sql` row-level security once the app sets `app.current_org`.
3. **First live connector** — implement Meta Marketing API end-to-end (OAuth exchange → token vault
   → sync → real metrics) behind the current `Connector` interface. Then Amazon SP/Ads and Flipkart.
4. **Hosted AI provider** — implement a server-side `AIProvider` over the real figures; keep keys
   server-only.
5. **Flip the switch** — set `NEXT_PUBLIC_DEMO_MODE=false` only when a module genuinely serves live
   data; until then that module keeps showing *pending configuration*.

---

## 10. Deployment (summary)

One repo, one app — no separate backend to deploy. Runs with **zero env vars** in demo mode.
`docker compose up --build`, `npm run build && npm start`, or import to Vercel (Next.js
auto-detected, root `./`, no env). Live-data env vars (`DATABASE_URL`, `TOKEN_ENCRYPTION_KEY`,
connector credentials) matter only for §9. Full detail: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

_Last updated: 2026-11-12 (public website made production: real contacts, calculators, SEO). Owners: Salvin Jones (Founder & Director), Shalini L (MD & CEO). Governs `docs/` — if they disagree, this file wins._