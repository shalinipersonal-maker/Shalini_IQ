import { z } from "zod";
import { num, sql } from "@/server/db";
import { saveRows } from "@/server/sales";
import { fail, json, withAccount } from "@/server/live-api";

export const dynamic = "force-dynamic";

const row = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  orderId: z.string().max(80).nullable(),
  sku: z.string().max(80).nullable(),
  title: z.string().max(300).nullable(),
  quantity: z.number().finite().nullable(),
  amount: z.number().finite().nullable(),
});
const schema = z.object({
  source: z.enum(["Amazon", "Flipkart", "Shopify", "Meesho", "Myntra", "Other"]),
  fileName: z.string().max(200),
  rows: z.array(row).min(1, "The file has no rows to import").max(5000, "Import up to 5,000 rows at a time"),
});

/** Saves rows already read and mapped in the browser from a marketplace report file. */
export async function POST(request: Request) {
  return withAccount(async (a) => {
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the file", 422);
    const { source, fileName, rows } = parsed.data;
    const uploadId = await saveRows(a.id, source, fileName, rows);
    return json({ ok: true, uploadId, rows: rows.length });
  });
}

/** Summary of the signed-in account's uploaded sales: totals, by day, top products, uploads. */
export async function GET() {
  return withAccount(async (a) => {
    const [tot] = await sql(`SELECT COALESCE(SUM(amount),0) AS revenue, COALESCE(SUM(quantity),0) AS units, COUNT(DISTINCT NULLIF(order_id,'')) AS orders, MIN(order_date) AS first, MAX(order_date) AS last FROM live_sales WHERE account_id = $1`, [a.id]);
    const days = await sql(`SELECT order_date AS day, SUM(amount) AS revenue, SUM(quantity) AS units FROM live_sales WHERE account_id = $1 AND order_date IS NOT NULL GROUP BY order_date ORDER BY order_date DESC LIMIT 120`, [a.id]);
    const top = await sql(`SELECT COALESCE(NULLIF(title,''), sku, 'Unnamed') AS product, MAX(sku) AS sku, SUM(amount) AS revenue, SUM(quantity) AS units FROM live_sales WHERE account_id = $1 GROUP BY 1 ORDER BY 3 DESC NULLS LAST LIMIT 10`, [a.id]);
    const bySource = await sql(`SELECT source, SUM(amount) AS revenue, SUM(quantity) AS units FROM live_sales WHERE account_id = $1 GROUP BY source ORDER BY 2 DESC NULLS LAST`, [a.id]);
    const uploads = await sql(`SELECT id, source, file_name, row_count, created_at FROM live_uploads WHERE account_id = $1 ORDER BY created_at DESC LIMIT 20`, [a.id]);
    return json({
      ok: true,
      totals: { revenue: num(tot?.revenue), units: num(tot?.units), orders: num(tot?.orders), first: tot?.first ?? null, last: tot?.last ?? null },
      days: days.reverse().map((d) => ({ day: d.day, revenue: num(d.revenue), units: num(d.units) })),
      top: top.map((t) => ({ product: t.product, sku: t.sku, revenue: num(t.revenue), units: num(t.units) })),
      bySource: bySource.map((s) => ({ source: s.source, revenue: num(s.revenue), units: num(s.units) })),
      uploads: uploads.map((u) => ({ id: u.id, source: u.source, fileName: u.file_name, rows: num(u.row_count), createdAt: u.created_at })),
    });
  });
}

/** Removes one upload and its rows. */
export async function DELETE(request: Request) {
  return withAccount(async (a) => {
    const id = new URL(request.url).searchParams.get("upload") ?? "";
    await sql(`DELETE FROM live_sales WHERE account_id = $1 AND upload_id = $2`, [a.id, id]);
    await sql(`DELETE FROM live_uploads WHERE account_id = $1 AND id = $2`, [a.id, id]);
    return json({ ok: true });
  });
}
