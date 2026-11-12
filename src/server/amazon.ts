import "server-only";
import { gunzipSync } from "node:zlib";
import { guessColumns, mapRows, parseDelimited, type MappedRow } from "@/lib/live/csv";

/**
 * Amazon Selling Partner API for the seller's own account (private, self-authorised app).
 * Credentials come from Seller Central → Apps and Services → Develop Apps:
 *   AMAZON_SP_CLIENT_ID / AMAZON_SP_CLIENT_SECRET (LWA credentials) and AMAZON_SP_REFRESH_TOKEN ("Authorize app").
 * India is served from the EU endpoint; the India marketplace id is A21TJRUUN4KGV.
 * Sales come from Amazon's own "All Orders" report, read with the same parser as uploaded files.
 */
const ENDPOINT = process.env.AMAZON_SP_ENDPOINT || "https://sellingpartnerapi-eu.amazon.com";
const MARKETPLACE = process.env.AMAZON_SP_MARKETPLACE_ID || "A21TJRUUN4KGV";
const REPORT_TYPE = "GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL";

export const amazonConfigured = () => !!process.env.AMAZON_SP_CLIENT_ID && !!process.env.AMAZON_SP_CLIENT_SECRET && !!process.env.AMAZON_SP_REFRESH_TOKEN;

async function accessToken(): Promise<string> {
  const res = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.AMAZON_SP_REFRESH_TOKEN!,
      client_id: process.env.AMAZON_SP_CLIENT_ID!,
      client_secret: process.env.AMAZON_SP_CLIENT_SECRET!,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  if (!res.ok || !body.access_token) throw new Error(`Amazon sign-in failed: ${body.error_description ?? res.status}`);
  return body.access_token;
}

async function sp<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ENDPOINT}${path}`, {
    ...init,
    headers: { "x-amz-access-token": await accessToken(), "Content-Type": "application/json", Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const body = (await res.json().catch(() => ({}))) as T & { errors?: { message?: string }[] };
  if (!res.ok) throw new Error(`Amazon: ${body.errors?.[0]?.message ?? `error ${res.status}`}`);
  return body;
}

/** Step 1: ask Amazon to prepare the orders report for the last `days` days. */
export async function requestReport(days = 30): Promise<string> {
  const start = new Date(Date.now() - days * 86400000).toISOString();
  const r = await sp<{ reportId: string }>("/reports/2021-06-30/reports", {
    method: "POST",
    body: JSON.stringify({ reportType: REPORT_TYPE, marketplaceIds: [MARKETPLACE], dataStartTime: start }),
  });
  return r.reportId;
}

export type ReportCheck = { state: "waiting" } | { state: "failed"; message: string } | { state: "done"; rows: MappedRow[] };

/** Step 2 (repeat until done): check the report; when ready, download and read it. Cancelled orders are left out. */
export async function checkReport(reportId: string): Promise<ReportCheck> {
  const r = await sp<{ processingStatus: string; reportDocumentId?: string }>(`/reports/2021-06-30/reports/${encodeURIComponent(reportId)}`);
  if (r.processingStatus === "CANCELLED") return { state: "done", rows: [] }; // Amazon cancels the report when there is no data
  if (r.processingStatus === "FATAL") return { state: "failed", message: "Amazon could not prepare the report. Try again later." };
  if (r.processingStatus !== "DONE" || !r.reportDocumentId) return { state: "waiting" };

  const doc = await sp<{ url: string; compressionAlgorithm?: string }>(`/reports/2021-06-30/documents/${encodeURIComponent(r.reportDocumentId)}`);
  const file = await fetch(doc.url, { cache: "no-store", signal: AbortSignal.timeout(30000) });
  let buf = Buffer.from(await file.arrayBuffer());
  if (doc.compressionAlgorithm === "GZIP") buf = gunzipSync(buf);

  const table = parseDelimited(buf.toString("utf8"));
  const [header, ...body] = table;
  if (!header) return { state: "done", rows: [] };
  const status = header.findIndex((h) => /order.?status/i.test(h));
  const live = status >= 0 ? body.filter((row) => !/cancel/i.test(row[status] ?? "")) : body;
  return { state: "done", rows: mapRows(live, guessColumns(header)) };
}
