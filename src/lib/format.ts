const nf0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** Indian-system compact currency: ₹1.24 Cr, ₹12.4 L, ₹8.2K */
export function inr(n: number, compact = false) {
  if (!isFinite(n)) return "—";
  const sign = n < 0 ? "−" : "";
  const a = Math.abs(n);
  if (compact) {
    if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(2)} Cr`;
    if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(2)} L`;
    if (a >= 1e4) return `${sign}₹${(a / 1e3).toFixed(1)}K`;
  }
  return `${sign}₹${nf0.format(Math.round(a))}`;
}
export function num(n: number, compact = false) {
  if (!isFinite(n)) return "—";
  const a = Math.abs(n);
  if (compact) {
    if (a >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
    if (a >= 1e5) return `${(n / 1e5).toFixed(2)} L`;
    if (a >= 1e4) return `${(n / 1e3).toFixed(1)}K`;
  }
  return nf0.format(Math.round(n));
}
export const pct = (x: number, d = 1) => (isFinite(x) ? `${(x * 100).toFixed(d)}%` : "—");
export const mult = (x: number) => (isFinite(x) ? `${x.toFixed(2)}×` : "—");
export const dec = (x: number, d = 2) => (isFinite(x) ? x.toFixed(d) : "—");
/** Relative change; null when there is no comparison base. */
export const change = (cur: number, prev: number): number | null => (prev > 0 && isFinite(cur) ? (cur - prev) / prev : null);
export const signedPct = (x: number | null, d = 1) => (x === null ? "n/a" : `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(d)}%`);
export const initials = (s: string) => s.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
export function timeAgo(ts: number) {
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}
