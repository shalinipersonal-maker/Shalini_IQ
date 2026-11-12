# Environment setup

## Requirements

- Node.js 20+ (built and tested on Node 22)
- npm 10+
- A modern browser
- (Optional, production only) PostgreSQL 14+

## Install & run

```bash
npm install
npm run dev            # http://localhost:3000
```

The demo needs **no environment file**. Visiting `/` shows the demo entry screen; any other route
redirects there until you enter a name.

Production build:

```bash
npm run build
npm start
```

## Environment variables

All are optional for the demo. Keep real secrets out of source control (`.env*` is gitignored);
never expose secrets in frontend code; only `NEXT_PUBLIC_*` vars reach the browser.

| Variable | Scope | Purpose | Needed for |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_DEMO_MODE` | client | Demo on unless set to `"false"` | Turning demo off |
| `TOKEN_ENCRYPTION_KEY` | server | base64 of 32 random bytes; AES-256-GCM key for the token vault | Real integrations |
| `DATABASE_URL` | server | PostgreSQL connection string | Real database |
| `AMAZON_SP_CLIENT_ID` / `AMAZON_SP_CLIENT_SECRET` / `AMAZON_SP_APP_ID` | server | Amazon Selling Partner API | Amazon marketplace |
| `AMAZON_ADS_CLIENT_ID` / `AMAZON_ADS_CLIENT_SECRET` | server | Amazon Ads API | Amazon ads |
| `FLIPKART_APP_ID` / `FLIPKART_APP_SECRET` | server | Flipkart Seller APIs | Flipkart |
| `META_APP_ID` / `META_APP_SECRET` | server | Meta Marketing API | Meta ads |

Generate a token key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Example `.env.local` (only when moving beyond the demo):

```bash
# NEXT_PUBLIC_DEMO_MODE=false
# DATABASE_URL=postgresql://user:pass@localhost:5432/entraiq
# TOKEN_ENCRYPTION_KEY=...base64 32 bytes...
# AMAZON_SP_CLIENT_ID=...
```

Setting a connector's variables only moves it from *pending configuration* to *configured but not
authorised* — token exchange and sync are not implemented in this build
([`API_INTEGRATIONS.md`](API_INTEGRATIONS.md)).

## Verifying a checkout

```bash
npm run typecheck     # clean
npm run build         # succeeds, ~15 routes
npm run verify:data   # all demo-data checks pass
```

End-to-end smoke test (needs Playwright + a Chromium path and a running server):

```bash
BASE_URL=http://localhost:3000 CHROME_PATH=/path/to/chrome node scripts/e2e-smoke.mjs
```

## Branding

Defaults are in `src/config/brand.ts` (`ENTRAIOT SOLUTIONS` / `ENTRAIQ`) and can be changed at
runtime in **Settings → Brand**. Keep product name and company configurable rather than hardcoding
them into screens.
