# Live test (`/account`)

The `/account` page is the **real** part of ENTRAIQ. Everything else (dashboards, Meta Ads, AI) is still sample data and says so.

| Test | What is real | Needs |
| --- | --- | --- |
| Sign up / sign in | Email link (15 min, single use) creates the account; name and phone are saved | `DATABASE_URL`, `SESSION_SECRET`, `LIVE_ALLOWED_EMAILS`, `RESEND_API_KEY`, `MAIL_FROM` |
| Enquiry alerts | Every website / IQ enquiry is stored and emailed to `ALERT_EMAIL` | `ALERT_EMAIL` (+ email above) |
| Facebook & Instagram | Connect a Page and its Instagram business account; post an image + caption; likes and comments read back | `META_APP_ID`, `META_APP_SECRET`, `TOKEN_ENCRYPTION_KEY` (and `META_CONFIG_ID` for Business-type apps) |
| Sales reports | Upload Amazon / Flipkart CSV or TXT; columns matched automatically; totals, daily chart, top products | Database only |

## How it is built (no extra npm packages)

- Database: Neon Postgres over its HTTPS endpoint (`src/server/db.ts`). Tables are created on first use and are all named `live_*`.
- Sign-in: random token in an HttpOnly cookie; the database keeps only a peppered SHA-256 hash (`src/server/session.ts`).
- Email: Resend REST API (`src/server/mail.ts`).
- Meta: Graph API with plain `fetch` (`src/server/meta.ts`). Page tokens are encrypted with AES-256-GCM before they are stored. Facebook gets the image bytes directly. Instagram downloads the JPEG from `/api/live/media/<id>`, so that address must be public.
- Sales files are read in the browser (`src/lib/live/csv.ts`). Only the mapped columns (date, order, SKU, product, quantity, amount) are sent to the server.

## Meta app checklist

1. developers.facebook.com → create an app, then add Facebook Login (or Facebook Login for Business).
2. Valid OAuth Redirect URIs: `https://entraiq.vercel.app/api/meta/callback`, plus the test-branch address with the same path.
3. App roles → add the tester's Facebook account. In Development mode, only people with a role can connect, so no app review is needed for the test.
4. Instagram posting: the Instagram account must be Business or Creator and linked to the Page. Test it on an address Meta can reach (production, or a preview with Deployment Protection off).

## Limits during the test

- Images only (no video yet). Instagram accepts shapes from 4:5 to 1.91:1.
- Excel files must be saved as CSV first. Up to 5,000 rows per upload.
- Anyone on `LIVE_ALLOWED_EMAILS` can see all website enquiries. Keep the list to the team.

## More connections

| Connection | What it does | Settings |
| --- | --- | --- |
| Threads | Posts the same creative to the Threads profile; likes and replies read back | `THREADS_APP_ID`, `THREADS_APP_SECRET`; callback `/api/threads/callback` |
| Amazon | "Sync Amazon" asks Amazon for the All Orders report (last 30 days), waits until it is ready, imports it; cancelled orders left out | `AMAZON_SP_CLIENT_ID`, `AMAZON_SP_CLIENT_SECRET`, `AMAZON_SP_REFRESH_TOKEN` |
| Flipkart | "Sync Flipkart" reads orders being packed, shipped or delivered in the last 30 days | `FLIPKART_APP_ID`, `FLIPKART_APP_SECRET` |

Each sync replaces the previous automatic sync for that marketplace, so orders are never counted twice. Uploaded files stay as they are. These connectors were written from the official documentation and are first tested when the real credentials are added.

## Control room

- **Today at a glance** (`/account`, top): enquiries, 30-day sales with change, post reactions, boost spend; refreshes every minute from one fast request (`/api/live/overview`).
- **Boost a post** (paid): campaign → ad set → ad from a published Facebook post, with daily budget, days (hard end date), city and age. Needs the ads permissions (`ads_management`, `ads_read`) on the Meta login configuration and an ad account with a payment method. Spend, reach and clicks are read back; boosts can be paused.
- **IQ on Telegram**: alerts for enquiries, posts, syncs and boosts; `/today`, `/leads`, `/sales`, `/posts`, `/ads`; a 9 AM IST report (Vercel cron, also refreshes Flipkart). Only `TELEGRAM_CHAT_ID` receives business data.
- **Listing visibility** (`/account` → SEO · AEO): five rules-based scores for one listing — SEO (search), AEO (answers buyers' questions), GEO (quoted by AI assistants), AIO (Google AI Overviews), AXO (AI shopping agents) — each with the exact fix. Logic in `src/lib/live/visibility.ts`.
- **Reactions and comments** refresh every 2 minutes (all posts in parallel) and on "Refresh likes & comments"; Meta errors are shown, not hidden.
