# Deployment

ENTRAIQ is one repository containing both the frontend and the backend: a single Next.js app where
UI routes and server API routes (`/api/*`) build and deploy together. There is no separate backend
service to run.

It ships production-ready in **demo mode** (no external services required) and is hardened for a
real deployment: standalone container output, non-root runtime, security headers, a health check,
env-driven config, and CI. Live marketplace/Meta data requires your own credentials and the
connector work noted in [`API_INTEGRATIONS.md`](API_INTEGRATIONS.md); until then the app safely
serves demo data and never claims a live connection.

## Option 1 — Docker (recommended, portable)

```bash
# Build and run the app (demo mode, no DB needed):
docker compose up --build
# → http://localhost:3000

# Or build/run the image directly:
docker build -t entraiq:latest .
docker run -p 3000:3000 entraiq:latest
```

The image uses Next.js **standalone** output (`output: "standalone"` in `next.config.ts`), runs as
an unprivileged user, and exposes `/api/health` for the container `HEALTHCHECK`.

Add PostgreSQL (only needed when wiring live data):

```bash
docker compose --profile db up --build
```

## Option 2 — Node host / PaaS

```bash
npm ci
npm run build
npm start            # or: npm run start:standalone  (node .next/standalone/server.js)
```

Set `PORT` and `HOSTNAME=0.0.0.0` as needed. Any Node 20+ host works (Railway, Render, Fly.io,
a VM behind Nginx, etc.).

## Option 3 — Vercel

Import the repo in Vercel; it detects Next.js with zero config. Set environment variables in the
project settings. Vercel provides its own runtime, so the Dockerfile is ignored there; use an
external Postgres (Neon, Supabase, RDS) for `DATABASE_URL` when you go DB-backed.

## Environment

See [`ENVIRONMENT_SETUP.md`](ENVIRONMENT_SETUP.md) and `.env.example`. Nothing is required for the
demo. For a real deployment set at minimum `DATABASE_URL` and `TOKEN_ENCRYPTION_KEY`, plus any
connector credentials, and set `NEXT_PUBLIC_DEMO_MODE=false` once live data is wired. Keep secrets
in your platform's secret store — never in the image or git (`.env*` is ignored except
`.env.example`).

## Database & migrations

The demo does not read a database. When you build the DB-backed data layer:

```bash
# 1. Point DATABASE_URL at your Postgres (see .env.example).
# 2. Generate the initial migration from prisma/schema.prisma (one time):
npx prisma migrate dev --name init
# 3. On each deploy, apply migrations:
npm run db:migrate          # prisma migrate deploy
```

> The initial migration is generated in your environment rather than committed here, because the
> build sandbox cannot reach Prisma's engine CDN. `prisma migrate dev --name init` produces the
> correct `prisma/migrations/0001_init` from the schema.

### Row-level security

For defence-in-depth tenant isolation, apply [`prisma/rls.sql`](../prisma/rls.sql) **after** your
app sets `app.current_org` per request. Do not enable it before then or queries will be blocked.
See [`DATABASE.md`](DATABASE.md) § Tenant isolation.

## CI

`.github/workflows/ci.yml` runs on push/PR: `typecheck` → `lint` → `verify:data` → `build`. Keep it
green before deploying.

## Pre-deploy checklist

- [ ] `npm run typecheck` clean
- [ ] `npm run build` succeeds
- [ ] `npm run verify:data` passes
- [ ] e2e smoke passes (`scripts/e2e-smoke.mjs`) against a running server
- [ ] Secrets set in the platform (never committed)
- [ ] `NEXT_PUBLIC_DEMO_MODE` set intentionally (`true` until live data is wired)
- [ ] `/api/health` returns 200 and the expected mode
