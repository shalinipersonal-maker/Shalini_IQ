import "server-only";

/**
 * Live-test database: Neon Postgres reached over its HTTPS SQL endpoint with plain `fetch`, so no extra
 * npm package (and no install scripts) is needed. DATABASE_URL comes from Vercel → Storage → Neon.
 * The Prisma schema in /prisma stays the long-term model; these tables are the live-test subset.
 */
export class DbNotConfigured extends Error {
  constructor() { super("The database is not set up yet (DATABASE_URL is missing)."); }
}

export const dbConfigured = () => !!process.env.DATABASE_URL;

type Row = Record<string, string | null>;

async function raw(query: string, params: unknown[] = []): Promise<Row[]> {
  const conn = process.env.DATABASE_URL;
  if (!conn) throw new DbNotConfigured();
  const host = new URL(conn.replace(/^postgres(ql)?:/, "https:")).hostname;
  const res = await fetch(`https://${host}/sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Neon-Connection-String": conn,
      "Neon-Raw-Text-Output": "true",
      "Neon-Array-Mode": "false",
    },
    body: JSON.stringify({ query, params: params.map((p) => (p === undefined ? null : p instanceof Date ? p.toISOString() : typeof p === "object" && p !== null ? JSON.stringify(p) : p)) }),
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = "";
    try { detail = ((await res.json()) as { message?: string }).message ?? ""; } catch { /* ignore */ }
    throw new Error(`Database error ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  const body = (await res.json()) as { rows?: Row[] };
  return body.rows ?? [];
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS live_accounts (id text PRIMARY KEY, email text UNIQUE NOT NULL, name text, phone text, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS live_login_tokens (token_hash text PRIMARY KEY, account_id text NOT NULL, expires_at timestamptz NOT NULL, used boolean NOT NULL DEFAULT false)`,
  `CREATE TABLE IF NOT EXISTS live_sessions (id_hash text PRIMARY KEY, account_id text NOT NULL, expires_at timestamptz NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS live_leads (id text PRIMARY KEY, reference text NOT NULL, kind text NOT NULL, name text, email text, phone text, business text, interest text, message text, alert text, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS live_meta_targets (id text PRIMARY KEY, account_id text NOT NULL, kind text NOT NULL, external_id text NOT NULL, name text, token text NOT NULL, page_id text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (account_id, kind, external_id))`,
  `CREATE TABLE IF NOT EXISTS live_media (id text PRIMARY KEY, account_id text NOT NULL, mime text NOT NULL, data text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS live_posts (id text PRIMARY KEY, account_id text NOT NULL, media_id text, caption text, kind text NOT NULL, target_id text, target_name text, external_id text, permalink text, status text NOT NULL, error text, likes integer, comments integer, created_at timestamptz NOT NULL DEFAULT now(), checked_at timestamptz)`,
  `CREATE TABLE IF NOT EXISTS live_uploads (id text PRIMARY KEY, account_id text NOT NULL, source text NOT NULL, file_name text, row_count integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS live_sales (id bigserial PRIMARY KEY, account_id text NOT NULL, upload_id text NOT NULL, source text NOT NULL, order_date date, order_id text, sku text, title text, quantity numeric, amount numeric)`,
  `CREATE INDEX IF NOT EXISTS live_sales_account ON live_sales (account_id, order_date)`,
  `CREATE TABLE IF NOT EXISTS live_boosts (id text PRIMARY KEY, account_id text NOT NULL, post_id text NOT NULL, post_label text, ad_account text NOT NULL, campaign_id text, adset_id text, ad_id text, daily_budget numeric NOT NULL, days integer NOT NULL, currency text, status text NOT NULL, error text, spend numeric, reach integer, clicks integer, checked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS live_kv (account_id text NOT NULL, k text NOT NULL, v text, PRIMARY KEY (account_id, k))`,
];

let ready: Promise<void> | null = null;
/** Creates the live-test tables once per server instance. Safe to run repeatedly. */
function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => { for (const q of SCHEMA) await raw(q); })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}

/** Run one parameterised statement ($1, $2 …). Values come back as text; convert with num() / bool(). */
export async function sql(query: string, params: unknown[] = []): Promise<Row[]> {
  await ensureSchema();
  return raw(query, params);
}

export const num = (v: string | null | undefined) => (v == null || v === "" ? 0 : Number(v));
export const newId = () => crypto.randomUUID();
