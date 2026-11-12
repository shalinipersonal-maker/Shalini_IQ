# Architecture

ENTRAIQ is a single Next.js 16 (App Router) application. In this build it runs entirely in the
browser against generated sample data; the server layer exists to prove the production shape
(connectors, token vault, rate limiting, health/integration APIs) without faking any live data.

## Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│  App shell  src/app/(app)/layout.tsx                                  │
│  ├─ Sidebar / Topbar / global filters (date range · marketplace ·     │
│  │  client · theme · demo badge)        src/components/shell/*         │
│  └─ Route pages (Overview, AI, Marketplaces, Meta Ads, Advertising,   │
│     Studio, Sales, Products, Reports, Clients, Settings)              │
├─────────────────────────────────────────────────────────────────────┤
│  Client state   src/lib/store.ts  (Zustand, persisted to localStorage)│
│  Scope hook     src/lib/use-scope.ts → builds the active data slice    │
├─────────────────────────────────────────────────────────────────────┤
│  Domain logic (pure, framework-free)                                  │
│  ├─ demo/        sample business generator + catalogue + types         │
│  ├─ analytics/   metrics (ROAS/ACOS/TACOS…), forecast                  │
│  ├─ ai/          provider abstraction, insights, copy                  │
│  ├─ studio/      creative templates, canvas ops, types                 │
│  └─ export/, reports.ts   CSV + PDF generation                         │
├─────────────────────────────────────────────────────────────────────┤
│  Server (server-only)   src/server/*                                  │
│  ├─ connectors/  registry · types · token-vault · resilience          │
│  └─ rate-limit.ts                                                      │
│  API routes   src/app/api/health, src/app/api/v1/integrations         │
├─────────────────────────────────────────────────────────────────────┤
│  Production data model (not used by demo)   prisma/schema.prisma       │
└─────────────────────────────────────────────────────────────────────┘
```

## Data flow (demo)

1. `src/lib/demo/generate.ts` deterministically builds a full business (clients, products, 90
   days of sales, campaigns, inventory, activity) from a seeded catalogue. The same seed yields
   the same numbers, so figures reconcile across every screen.
2. `use-scope.ts` reads the global filters from the store (client, marketplace, date range) and
   derives a **Scope** — the slice of demo data the current view should show.
3. Pages compute their metrics from the Scope via `src/lib/analytics/metrics.ts`. There is one
   definition of each metric, so Overview, Advertising Analytics and the AI centre never disagree.
4. User actions (pause a campaign, edit a budget, save a creative, mark an insight reviewed) are
   recorded as **edits/overlays** in the persisted store, never by mutating the generated base
   data. "Reset Demo Data" clears the overlays.

## AI service

The UI depends only on the `AIProvider` interface (`src/lib/ai/provider.ts`):

```ts
interface AIProvider {
  id: string; label: string; demo: boolean;
  generateInsights(scope, cfg): Promise<Insight[]>;
  explainInsight(insight, scope): Promise<string[]>;
  generateCopy(req): Promise<CopyResult>;
}
```

`demoProvider` computes insights with rules over the sample data and marks `demo: true`. A hosted
model is added by implementing the same interface **server-side** (API keys must never reach the
browser) and swapping the provider — no screen changes. Insights carry a `method` string and an
optional heuristic confidence, and are surfaced as demo-generated.

## Metrics definitions (single source of truth)

`src/lib/analytics/metrics.ts`:

- **ROAS** = attributed ad revenue ÷ ad spend
- **ACOS** = ad spend ÷ attributed ad sales
- **TACOS** = ad spend ÷ **total** sales
- Attributed revenue is tracked per platform and never summed across platforms into "unique"
  revenue; Advertising Analytics keeps marketplace-attributed sales distinct from total sales.

`npm run verify:data` asserts these hold for the generated data.

## Design system

Tailwind v4 with a restrained dark-navy/charcoal + light-neutral system and an indigo/violet/teal
accent. Reusable primitives live in `src/components/ui`, shared blocks (metric cards, charts,
tables, status badges, AI insight cards, empty/loading states, connection panels) in
`src/components/shared` and `src/components/charts.tsx`. Dark and light themes are both supported
and the choice is persisted.

## Rendering

Pages are client components over the persisted store (the demo has no server data), so most routes
prerender as static shells and hydrate with the local demo state. `api/health` and
`api/v1/integrations` are dynamic server routes.
