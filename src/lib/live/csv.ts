/**
 * Small, dependency-free CSV/TSV reader for marketplace report files, plus column guessing and value
 * cleaning (₹ signs, thousands commas, Indian and ISO dates). Pure functions — tested in isolation.
 */
export function parseDelimited(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delim = (firstLine.match(/\t/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows.map((r) => r.map((v) => v.trim()));
}

export type Field = "date" | "orderId" | "sku" | "title" | "quantity" | "amount";
/** For each field, header patterns from most to least specific; the first pattern that matches a free column wins. */
export const FIELDS: { key: Field; label: string; hints: RegExp[] }[] = [
  { key: "date", label: "Date", hints: [/^(order|purchase|ordered)[\s_-]*date/i, /invoice\s*date/i, /^date$/i, /date/i] },
  { key: "orderId", label: "Order ID", hints: [/^order.?id$/i, /amazon.?order.?id/i, /order.?item.?id/i, /order.?(no|number)/i, /^order$/i] },
  { key: "sku", label: "SKU / ASIN", hints: [/^sku$/i, /\bsku\b/i, /\(child\)\s*asin/i, /asin/i, /\bfsn\b/i, /listing.?id|style.?code/i] },
  { key: "title", label: "Product name", hints: [/^title$/i, /product.?title|product.?name|item.?name/i, /^product$/i, /title|description/i] },
  { key: "quantity", label: "Quantity", hints: [/units.?ordered/i, /item.?quantity/i, /^(quantity|qty)$/i, /quantity|qty/i, /^units$/i] },
  { key: "amount", label: "Sales amount (₹)", hints: [/ordered.?product.?sales/i, /final.?invoice.?amount/i, /invoice.?amount/i, /item.?price/i, /^(sales|amount|revenue|total)$/i, /selling.?price/i, /(sales|amount|revenue)(?!.*session)/i] },
];

/** Picks the most likely column for each field from the header row (−1 = none). */
export function guessColumns(header: string[]): Record<Field, number> {
  const used = new Set<number>();
  const out = {} as Record<Field, number>;
  for (const f of FIELDS) {
    let idx = -1;
    for (const re of f.hints) {
      idx = header.findIndex((h, i) => !used.has(i) && !/session|page.?view|buy.?box|percentage|%/i.test(h) && re.test(h));
      if (idx >= 0) break;
    }
    out[f.key] = idx;
    if (idx >= 0) used.add(idx);
  }
  return out;
}

export function toNumber(v: string | undefined): number | null {
  if (v == null) return null;
  const s = v.replace(/INR|Rs\.?|[₹$,\s]/gi, "");
  if (s === "" || s === "-") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
/** YYYY-MM-DD or null. Reads 2026-03-15, 15/03/2026, 15-03-26, 15-Mar-2026 and Mar 15, 2026 (slashes are day-first, as Indian reports use). */
export function toIsoDate(v: string | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return fmt(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(s);
  if (m) return fmt(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  m = /^(\d{1,2})[\s-]([A-Za-z]{3})[A-Za-z]*[\s,-]+(\d{4})/.exec(s);
  if (m) return fmt(+m[3], MONTHS.indexOf(m[2].toLowerCase()) + 1, +m[1]);
  m = /^([A-Za-z]{3})[A-Za-z]*\s+(\d{1,2}),?\s+(\d{4})/.exec(s);
  if (m) return fmt(+m[3], MONTHS.indexOf(m[1].toLowerCase()) + 1, +m[2]);
  return null;
}
function fmt(y: number, mo: number, d: number): string | null {
  if (!(y > 1990 && y < 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export interface MappedRow { date: string | null; orderId: string | null; sku: string | null; title: string | null; quantity: number | null; amount: number | null }
export function mapRows(rows: string[][], cols: Record<Field, number>): MappedRow[] {
  const get = (r: string[], f: Field) => (cols[f] >= 0 ? r[cols[f]] : undefined);
  const text = (r: string[], f: Field, max: number) => { const v = get(r, f); return v ? v.slice(0, max) : null; };
  return rows
    .map((r) => ({
      date: toIsoDate(get(r, "date")),
      orderId: text(r, "orderId", 80),
      sku: text(r, "sku", 80),
      title: text(r, "title", 300),
      quantity: toNumber(get(r, "quantity")),
      amount: toNumber(get(r, "amount")),
    }))
    .filter((r) => r.amount !== null || r.quantity !== null);
}
