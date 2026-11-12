import "server-only";
import type { MappedRow } from "@/lib/live/csv";
import { newId, sql } from "./db";

export type SalesSource = "Amazon" | "Flipkart" | "Meesho" | "Myntra" | "Other";
export const AUTO_PREFIX = "Auto-sync";

/** Saves mapped sales rows as one upload. Returns the upload id. */
export async function saveRows(accountId: string, source: SalesSource, fileName: string, rows: MappedRow[]): Promise<string> {
  const uploadId = newId();
  await sql(`INSERT INTO live_uploads (id, account_id, source, file_name, row_count) VALUES ($1,$2,$3,$4,$5)`, [uploadId, accountId, source, fileName, rows.length]);
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const params: unknown[] = [];
    const values = chunk.map((r) => {
      const b = params.length;
      params.push(accountId, uploadId, source, r.date, r.orderId, r.sku, r.title, r.quantity, r.amount);
      return `($${b + 1},$${b + 2},$${b + 3},$${b + 4}::date,$${b + 5},$${b + 6},$${b + 7},$${b + 8}::numeric,$${b + 9}::numeric)`;
    });
    await sql(`INSERT INTO live_sales (account_id, upload_id, source, order_date, order_id, sku, title, quantity, amount) VALUES ${values.join(",")}`, params);
  }
  return uploadId;
}

/** Replaces the previous automatic sync for a marketplace, so the same orders are never counted twice. */
export async function replaceAutoSync(accountId: string, source: SalesSource, label: string, rows: MappedRow[]): Promise<number> {
  const old = await sql(`SELECT id FROM live_uploads WHERE account_id = $1 AND source = $2 AND file_name LIKE $3`, [accountId, source, `${AUTO_PREFIX}%`]);
  for (const o of old) {
    await sql(`DELETE FROM live_sales WHERE account_id = $1 AND upload_id = $2`, [accountId, o.id]);
    await sql(`DELETE FROM live_uploads WHERE account_id = $1 AND id = $2`, [accountId, o.id]);
  }
  if (rows.length) await saveRows(accountId, source, `${AUTO_PREFIX} · ${label}`, rows);
  return rows.length;
}
