import { addDays, parseISO } from "../dates";

export interface ForecastPoint { date: string; actual?: number; forecast?: number; band?: [number, number] }
export interface Forecast { points: ForecastPoint[]; total: number; low: number; high: number; lastTotal: number; trendPerDay: number; horizon: number }

/**
 * Statistical projection: weekday seasonality × linear trend fitted on the trailing window.
 * The band is ±1.28 residual standard deviations (roughly an 80% interval if residuals were normal).
 */
export function forecastRevenue(daily: { date: string; revenue: number }[], horizon = 14, window = 56): Forecast {
  const hist = daily.slice(-window);
  const n = hist.length;
  const mean = hist.reduce((s, p) => s + p.revenue, 0) / Math.max(1, n);
  const wdSum = Array(7).fill(0), wdN = Array(7).fill(0);
  hist.forEach((p) => { const d = parseISO(p.date).getDay(); wdSum[d] += p.revenue; wdN[d]++; });
  const season = wdSum.map((s, i) => (wdN[i] && mean ? s / wdN[i] / mean : 1));
  const y = hist.map((p) => p.revenue / (season[parseISO(p.date).getDay()] || 1));
  const xm = (n - 1) / 2, ym = y.reduce((s, v) => s + v, 0) / Math.max(1, n);
  let sxy = 0, sxx = 0;
  y.forEach((v, i) => { sxy += (i - xm) * (v - ym); sxx += (i - xm) ** 2; });
  const slope = sxx ? sxy / sxx : 0;
  const fit = (i: number, date: string) => Math.max(0, (ym + slope * (i - xm)) * season[parseISO(date).getDay()]);
  const sd = Math.sqrt(hist.reduce((s, p, i) => s + (p.revenue - fit(i, p.date)) ** 2, 0) / Math.max(1, n - 2));
  const shown = hist.slice(-28);
  const points: ForecastPoint[] = shown.map((p) => ({ date: p.date, actual: p.revenue }));
  const last = hist[n - 1];
  if (!last) return { points, total: 0, low: 0, high: 0, lastTotal: 0, trendPerDay: 0, horizon };
  points[points.length - 1].forecast = last.revenue; // join the two lines
  let total = 0;
  for (let h = 1; h <= horizon; h++) {
    const date = addDays(last.date, h);
    const f = fit(n - 1 + h, date);
    total += f;
    points.push({ date, forecast: Math.round(f), band: [Math.max(0, Math.round(f - 1.28 * sd)), Math.round(f + 1.28 * sd)] });
  }
  const spread = 1.28 * sd * Math.sqrt(horizon);
  return { points, total, low: Math.max(0, total - spread), high: total + spread, lastTotal: hist.slice(-horizon).reduce((s, p) => s + p.revenue, 0), trendPerDay: slope, horizon };
}
