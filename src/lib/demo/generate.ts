import { addDays, parseISO, todayISO } from "../dates";
import { AD_FORMATS, CAMPAIGN_SEEDS, CLIENTS, PRODUCT_SEEDS } from "./catalog";
import type { ActivityItem, AdRow, AdSet, Campaign, Dataset, InventoryRecord, Marketplace, Product, SalesRow } from "./types";

/** Days of history generated per client. 2 × the longest selectable range, so every range has a comparison period. */
export const HISTORY_DAYS = 200;
const SALE_EVENT = { from: 24, to: 20 }; // "days ago" window of a simulated sale event

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
/** Deterministic value in [0,1) for a string key — the same key always returns the same number. */
export function rnd(key: string) {
  let t = hash(key) + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (key: string, lo: number, hi: number) => lo + rnd(key) * (hi - lo);
const WEEKDAY = [1.16, 0.93, 0.92, 0.95, 0.98, 1.04, 1.14]; // Sun..Sat

const cache = new Map<string, Dataset>();

export function getDataset(clientId: string): Dataset {
  const today = todayISO();
  const key = `${clientId}:${today}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const ds = build(clientId, today);
  for (const k of cache.keys()) if (!k.endsWith(today)) cache.delete(k); // drop yesterday's datasets
  cache.set(key, ds);
  return ds;
}

function build(clientId: string, today: string): Dataset {
  const client = CLIENTS.find((c) => c.id === clientId) ?? CLIENTS[0];
  const seeds = PRODUCT_SEEDS[client.id];
  const lastDate = addDays(today, -1);
  const firstDate = addDays(lastDate, -(HISTORY_DAYS - 1));

  const products: Product[] = seeds.items.map(([name, category, price, , fk], i) => ({
    id: `${client.id}-p${i + 1}`,
    clientId: client.id,
    name,
    sku: `${seeds.prefix}-${category.replace(/[^A-Z]/gi, "").slice(0, 3).toUpperCase()}-${String(101 + i * 7)}`,
    category,
    price,
    mrp: Math.round((price * between(`mrp${client.id}${i}`, 1.25, 1.6)) / 10) * 10 - 1,
    listings: fk > 0 ? ["amazon", "flipkart"] : ["amazon"],
    hue: (client.hue + i * 47) % 360,
  }));

  // ---- Sales: one row per product × marketplace × day -------------------------------------------
  const sales: SalesRow[] = [];
  for (let off = HISTORY_DAYS; off >= 1; off--) {
    const date = addDays(today, -off);
    const wd = WEEKDAY[parseISO(date).getDay()];
    const inSale = off <= SALE_EVENT.from && off >= SALE_EVENT.to;
    seeds.items.forEach(([, , price, base, fk, growth, cvr], i) => {
      const p = products[i];
      for (const mp of p.listings) {
        const k = `${p.id}|${mp}|${date}`;
        const level = base * (mp === "flipkart" ? fk : 1) * Math.pow(1 + growth / 100, -off);
        const mean = level * wd * (inSale ? 1.55 : 1) * between(k, 0.78, 1.22);
        const units = Math.max(0, Math.floor(mean + rnd(k + "r")));
        const orders = units === 0 ? 0 : Math.max(1, Math.round(units / between(k + "u", 1.02, 1.22)));
        const revenue = Math.round(units * price * (inSale ? 0.9 : 1));
        const sessions = orders === 0 ? Math.round(between(k + "s", 4, 30)) : Math.round((orders / (cvr * (mp === "flipkart" ? 0.92 : 1))) * between(k + "s", 0.85, 1.15));
        sales.push({ date, productId: p.id, marketplace: mp, units, orders, revenue, sessions, returns: Math.floor(units * between(k + "t", 0.01, 0.09) + rnd(k + "q") * 0.6), cancellations: Math.floor(orders * 0.035 + rnd(k + "c") * 0.5) });
      }
    });
  }

  // Reference daily sales (recent 30 days) used to size campaign budgets.
  const recentFrom = addDays(lastDate, -29);
  const base = { A: 0, F: 0, T: 0 };
  for (const r of sales) {
    if (r.date < recentFrom) continue;
    base[r.marketplace === "amazon" ? "A" : "F"] += r.revenue / 30;
    base.T += r.revenue / 30;
  }
  const avgPrice = products.reduce((s, p) => s + p.price, 0) / products.length;
  const topCategory = products[0].category;

  // ---- Campaigns and ad delivery -----------------------------------------------------------------
  const campaigns: Campaign[] = [];
  const ads: AdRow[] = [];
  CAMPAIGN_SEEDS.forEach((s, ci) => {
    const id = `${client.id}-c${ci + 1}`;
    const product = s.p !== undefined ? products[s.p] : undefined;
    const fill = (t: string) => t.replace("{p}", product ? product.name.split(" ").slice(0, 3).join(" ") : "").replace("{c}", topCategory);
    const dailyBudget = Math.max(300, Math.round((base[s.base] * s.share) / 50) * 50);
    const adsets: AdSet[] = (s.adsets ?? []).map(([n, aud], ai) => ({
      id: `${id}-as${ai + 1}`,
      name: fill(n),
      audience: fill(aud),
      ads: [0, 1].map((x) => ({ id: `${id}-as${ai + 1}-ad${x + 1}`, name: `${AD_FORMATS[(ci + ai * 2 + x) % 4]} · ${["Offer-led", "Feature-led", "Testimonial", "Lifestyle"][(ci + ai + x * 3) % 4]}`, format: AD_FORMATS[(ci + ai * 2 + x) % 4] })),
    }));
    const startOff = s.startOffset ?? HISTORY_DAYS;
    campaigns.push({
      id, clientId: client.id, platform: s.platform, name: fill(s.name), objective: s.objective, status: s.status ?? "active", dailyBudget, destination: s.dest,
      startDate: addDays(today, -startOff), endDate: s.endOffset ? addDays(today, -s.endOffset) : undefined, adsets, productIds: product ? [product.id] : [],
    });
    const roas = s.roas * between(`roas${id}`, 0.9, 1.12);
    const aov = product ? product.price : avgPrice;
    // Delivery units: Meta delivers at ad level (rolls up to ad set and campaign); marketplace ads at campaign level.
    const units = adsets.length
      ? adsets.flatMap((as, ai) => as.ads.map((ad, x) => ({ adsetId: as.id, adId: ad.id, share: [0.34, 0.26, 0.24, 0.16][ai * 2 + x], q: between(`q${ad.id}`, 0.72, 1.3), c: between(`c${ad.id}`, 0.8, 1.25) })))
      : [{ adsetId: undefined, adId: undefined, share: 1, q: 1, c: 1 }];
    for (let off = Math.min(startOff, HISTORY_DAYS); off >= Math.max(1, s.endOffset ?? 1); off--) {
      const date = addDays(today, -off);
      const wd = 0.6 + 0.4 * WEEKDAY[parseISO(date).getDay()];
      const inSale = off <= SALE_EVENT.from && off >= SALE_EVENT.to;
      for (const u of units) {
        const k = `${id}|${u.adId ?? ""}|${date}`;
        const spend = Math.round(Math.min(dailyBudget * u.share, dailyBudget * u.share * s.util * wd * (inSale ? 1.08 : 1) * between(k, 0.82, 1.12)));
        const clicks = Math.round((spend / s.cpc) * between(k + "k", 0.9, 1.1));
        const impressions = Math.round((clicks / (s.ctr * u.c)) * between(k + "i", 0.92, 1.08));
        const expConv = (spend * roas * u.q * (inSale ? 1.15 : 1)) / aov;
        const conversions = Math.min(clicks, Math.floor(expConv * between(k + "v", 0.75, 1.25) + rnd(k + "f")));
        const revenue = Math.round(conversions * aov * between(k + "a", 0.92, 1.08));
        const reach = s.platform === "meta" ? Math.round(impressions / between(k + "h", 1.15, 1.6)) : 0;
        ads.push({ date, campaignId: id, adsetId: u.adsetId, adId: u.adId, spend, impressions, clicks, conversions, revenue, reach });
      }
    }
  });

  // ---- Inventory -----------------------------------------------------------------------------------
  const v14 = new Map<string, number>();
  const from14 = addDays(lastDate, -13);
  for (const r of sales) if (r.date >= from14) v14.set(`${r.productId}|${r.marketplace}`, (v14.get(`${r.productId}|${r.marketplace}`) ?? 0) + r.units / 14);
  const inventory: InventoryRecord[] = [];
  seeds.items.forEach(([, , , , , , , cover], i) => {
    const p = products[i];
    p.listings.forEach((mp: Marketplace) => {
      const dailyVelocity = v14.get(`${p.id}|${mp}`) ?? 0;
      const days = mp === "amazon" ? cover : cover * between(`inv${p.id}`, 0.8, 1.7);
      inventory.push({ productId: p.id, marketplace: mp, onHand: Math.round(dailyVelocity * days), inbound: cover < 15 && rnd(`inb${p.id}${mp}`) > 0.45 ? Math.round(dailyVelocity * 30) : 0, dailyVelocity, leadTimeDays: 12 });
    });
  });

  // ---- Seeded workspace activity -----------------------------------------------------------------
  const now = Date.now();
  const H = 3600_000;
  const act: [number, ActivityItem["kind"], string, string][] = [
    [2, "data", "Demo dataset refreshed through " + lastDate, "System"],
    [5, "campaign", `Budget reviewed on "${campaigns[0].name}"`, "Sneha Kulkarni"],
    [9, "inventory", `Low-stock alert raised for ${products[9].name}`, "System"],
    [22, "report", "Weekly advertising report generated", "Karthik Iyer"],
    [27, "creative", "Creative template library updated", "Divya Nair"],
    [31, "campaign", `"${campaigns[11].name}" paused after ROAS review`, "Sneha Kulkarni"],
    [49, "team", `Imran Sheikh assigned to ${client.name}`, "Ananya Rao"],
    [74, "report", "Monthly marketplace summary shared with client", "Rohit Menon"],
  ];
  const activity = act.map(([h, kind, text, actor], i) => ({ id: `${client.id}-a${i}`, ts: now - h * H, kind, text, actor }));

  return { client, products, campaigns, sales, ads, inventory, activity, firstDate, lastDate };
}
