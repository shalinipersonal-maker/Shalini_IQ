# ENTRAIQ — Marketplace Intelligence Platform

An AI-powered, multi-marketplace management and advertising-intelligence demo built by
**ENTRAIOT SOLUTIONS PRIVATE LIMITED** for presentation to prospective clients.

ENTRAIQ consolidates Amazon and Flipkart marketplace performance, Meta advertising, sales
analytics, an AI intelligence centre, and a Canva-style creative studio into one interface.
It runs **entirely in demo mode** on internally-consistent sample data — no external API
credentials are required to run or present it.

> **This is a demo environment.** Every screen is clearly marked *"Sample data — not connected
> to live marketplace accounts."* No live marketplace or Meta connection is ever claimed. See
> [`docs/DEMO_MODE.md`](docs/DEMO_MODE.md).

## Quick start

```bash
npm install
npm run dev            # http://localhost:3000  → redirects to the demo entry screen
```

Production build:

```bash
npm run build && npm start
```

Or with Docker (one container, demo mode, no database required):

```bash
docker compose up --build        # → http://localhost:3000
```

Enter any name on the entry screen to open the workspace. Nothing you do touches a real account.
Full production guidance — Docker, Vercel, Postgres, migrations, CI — is in
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` — must be clean |
| `npm run lint` | ESLint |
| `npm run verify:data` | Assert the demo data is internally consistent (ROAS/ACOS/TACOS, attribution, counts) |

End-to-end acceptance smoke test (Playwright + Chromium), run against a started server:

```bash
BASE_URL=http://localhost:3000 CHROME_PATH=/usr/bin/google-chrome node scripts/e2e-smoke.mjs
```

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Radix UI · Recharts ·
Konva (creative canvas) · Zustand (demo state, persisted to `localStorage`) · jsPDF (reports) ·
Prisma + PostgreSQL (production schema, not used by the demo).

## Documentation

| Doc | Contents |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design, folder map, data flow, AI abstraction |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Production Prisma schema and tenant-isolation policy |
| [`docs/DEMO_MODE.md`](docs/DEMO_MODE.md) | How demo mode works, what is simulated, how to reset |
| [`docs/API_INTEGRATIONS.md`](docs/API_INTEGRATIONS.md) | Connector architecture and what is deliberately **not** implemented |
| [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) | Module-by-module status against acceptance criteria |
| [`docs/ENVIRONMENT_SETUP.md`](docs/ENVIRONMENT_SETUP.md) | Environment variables and local/production setup |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Deploying to production (Docker, Vercel, Node, DB, CI) |

## Honesty guarantees

- No simulated value is ever labelled real-time.
- Connectors report `pending_configuration`; token exchange and sync throw rather than return
  invented data ([`src/server/connectors/registry.ts`](src/server/connectors/registry.ts)).
- AI insights are computed from the sample data and labelled demo-generated; the UI talks only to
  an `AIProvider` interface so a hosted model can be dropped in later.
- Branding (`ENTRAIOT SOLUTIONS` / `ENTRAIQ`) is configurable in `src/config/brand.ts` and at
  runtime in Settings → Brand.
