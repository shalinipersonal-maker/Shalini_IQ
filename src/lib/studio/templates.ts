import type { Doc, El } from "./types";

export interface Placement { id: string; label: string; group: string; w: number; h: number }
/** Common placement ratios. Platform specifications change — confirm current requirements before publishing. */
export const PLACEMENTS: Placement[] = [
  { id: "ig-square", label: "Feed square 1:1", group: "Facebook and Instagram", w: 1080, h: 1080 },
  { id: "ig-portrait", label: "Feed portrait 4:5", group: "Facebook and Instagram", w: 1080, h: 1350 },
  { id: "story", label: "Story / Reel cover 9:16", group: "Facebook and Instagram", w: 1080, h: 1920 },
  { id: "fb-link", label: "Feed landscape 1.91:1", group: "Facebook and Instagram", w: 1200, h: 628 },
  { id: "amz-square", label: "Amazon listing image 1:1", group: "Marketplaces", w: 2000, h: 2000 },
  { id: "amz-brand", label: "Amazon brand banner 1.91:1", group: "Marketplaces", w: 1200, h: 628 },
  { id: "fk-banner", label: "Flipkart brand banner 16:9", group: "Marketplaces", w: 1920, h: 1080 },
  { id: "banner", label: "Promotional banner 3:1", group: "Web", w: 1500, h: 500 },
];
export const placementOf = (id: string) => PLACEMENTS.find((p) => p.id === id) ?? PLACEMENTS[0];

export interface Palette { bg: string; fg: string; accent: string; accentInk: string; soft: string }
export const PALETTES: Record<string, Palette> = {
  navy: { bg: "#0f1b3d", fg: "#ffffff", accent: "#ffb020", accentInk: "#0f1b3d", soft: "#1d2d5c" },
  cream: { bg: "#f6efe4", fg: "#1f1a14", accent: "#c2410c", accentInk: "#ffffff", soft: "#eadfcc" },
  mint: { bg: "#e3f4ec", fg: "#0f3d2e", accent: "#0f8a5f", accentInk: "#ffffff", soft: "#c9e9da" },
  festive: { bg: "#7a1420", fg: "#fff3d6", accent: "#f2b631", accentInk: "#5a0d16", soft: "#94202d" },
  sky: { bg: "#e8f0ff", fg: "#10214d", accent: "#2a5bd7", accentInk: "#ffffff", soft: "#d3e0ff" },
  charcoal: { bg: "#17181c", fg: "#f4f4f5", accent: "#7c6cf0", accentInk: "#ffffff", soft: "#25262c" },
  sun: { bg: "#ffd84d", fg: "#1c1a10", accent: "#1c1a10", accentInk: "#ffd84d", soft: "#ffe680" },
};

export interface TemplateCtx { product?: { name: string; price: number; mrp: number } }
type Layout = "hero" | "offer" | "features" | "comparison" | "brand";
export interface Template { id: string; name: string; category: string; placement: string; layout: Layout; palette: keyof typeof PALETTES; copy: Record<string, string> }

export const TEMPLATE_CATEGORIES = ["Amazon product advertising", "Flipkart product advertising", "Facebook feed", "Instagram feed", "Instagram stories", "Instagram reels covers", "Promotional banners", "Festive offers", "Product comparison", "Product features", "Discount campaigns", "Brand awareness"];

export const TEMPLATES: Template[] = [
  { id: "t-amz-hero", name: "Listing hero", category: "Amazon product advertising", placement: "amz-square", layout: "hero", palette: "sky", copy: { headline: "{product}", sub: "Built for everyday use. Delivered fast.", cta: "Shop now", badge: "{price}" } },
  { id: "t-amz-brand", name: "Brand banner", category: "Amazon product advertising", placement: "amz-brand", layout: "hero", palette: "navy", copy: { headline: "Upgrade your everyday", sub: "{product}", cta: "Shop the range", badge: "{price}" } },
  { id: "t-fk-banner", name: "Big sale banner", category: "Flipkart product advertising", placement: "fk-banner", layout: "offer", palette: "sun", copy: { offer: "{off}% OFF", line: "on {product}", cta: "Shop now", fine: "Limited period offer" } },
  { id: "t-fb-link", name: "Product spotlight", category: "Facebook feed", placement: "fb-link", layout: "hero", palette: "cream", copy: { headline: "Meet {product}", sub: "Thoughtfully made. Honestly priced.", cta: "View product", badge: "{price}" } },
  { id: "t-ig-square", name: "Clean product square", category: "Instagram feed", placement: "ig-square", layout: "hero", palette: "mint", copy: { headline: "{product}", sub: "Now available on Amazon and Flipkart", cta: "Shop now", badge: "{price}" } },
  { id: "t-ig-portrait", name: "Portrait feature", category: "Instagram feed", placement: "ig-portrait", layout: "features", palette: "charcoal", copy: { title: "Why you'll like {product}", f1: "Made to last", f2: "Easy to care for", f3: "Ships in 24 hours", cta: "Shop now" } },
  { id: "t-story", name: "Story offer", category: "Instagram stories", placement: "story", layout: "offer", palette: "festive", copy: { offer: "{off}% OFF", line: "{product}", cta: "Swipe up to shop", fine: "While stocks last" } },
  { id: "t-reel", name: "Reel cover title", category: "Instagram reels covers", placement: "story", layout: "brand", palette: "charcoal", copy: { brand: "3 reasons to switch", tagline: "{product}" } },
  { id: "t-banner", name: "Wide promo strip", category: "Promotional banners", placement: "banner", layout: "hero", palette: "navy", copy: { headline: "New arrivals are here", sub: "{product} and more", cta: "Explore", badge: "New" } },
  { id: "t-festive", name: "Festive greeting offer", category: "Festive offers", placement: "ig-square", layout: "offer", palette: "festive", copy: { offer: "Festive {off}% OFF", line: "Celebrate with {product}", cta: "Shop the offer", fine: "Offer valid this season" } },
  { id: "t-compare", name: "Us vs ordinary", category: "Product comparison", placement: "ig-square", layout: "comparison", palette: "sky", copy: { title: "Why choose {product}?", a: "Ordinary", b: "Ours", a1: "Wears out quickly", a2: "Hard to clean", a3: "No warranty", b1: "Built to last", b2: "Easy to clean", b3: "1-year warranty" } },
  { id: "t-features", name: "Three key features", category: "Product features", placement: "fb-link", layout: "features", palette: "mint", copy: { title: "{product}", f1: "Premium materials", f2: "Tested for daily use", f3: "Easy returns", cta: "Learn more" } },
  { id: "t-discount", name: "Price drop", category: "Discount campaigns", placement: "ig-portrait", layout: "offer", palette: "sun", copy: { offer: "Now {price}", line: "{product}", cta: "Buy now", fine: "MRP {mrp}" } },
  { id: "t-brand", name: "Brand statement", category: "Brand awareness", placement: "ig-square", layout: "brand", palette: "cream", copy: { brand: "Your brand name", tagline: "Fewer, better things for your home." } },
];

let seq = 0;
const id = () => `el${Date.now().toString(36)}${(seq++).toString(36)}`;
const base = (type: El["type"], name: string, x: number, y: number, width: number, height: number): El => ({ id: id(), type, name, x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height), rotation: 0, opacity: 1, visible: true, locked: false });
export const FONT_UI = "IBM Plex Sans Variable";
export const text = (name: string, t: string, x: number, y: number, w: number, size: number, fill: string, o: Partial<El> = {}): El => {
  const fontSize = Math.round(size), lineHeight = o.lineHeight ?? 1.12;
  const lines = Math.max(1, Math.ceil((t.length * fontSize * 0.54) / w));
  return { ...base("text", name, x, y, w, lines * fontSize * lineHeight), text: t, fontSize, fontFamily: FONT_UI, fontStyle: "bold", fill, align: "left", lineHeight, letterSpacing: 0, ...o };
};
export const rect = (name: string, x: number, y: number, w: number, h: number, fill: string, o: Partial<El> = {}): El => ({ ...base("rect", name, x, y, w, h), fill, cornerRadius: 0, ...o });
export const ellipse = (name: string, x: number, y: number, w: number, h: number, fill: string, o: Partial<El> = {}): El => ({ ...base("ellipse", name, x, y, w, h), fill, ...o });
export const star = (name: string, x: number, y: number, s: number, fill: string, points = 5): El => ({ ...base("star", name, x, y, s, s), fill, cornerRadius: points });
export const slot = (x: number, y: number, w: number, h: number): El => rect("Product image slot", x, y, w, h, "rgba(127,127,127,0.18)", { placeholder: true, stroke: "rgba(127,127,127,0.7)", strokeWidth: 3, cornerRadius: Math.min(w, h) * 0.04 });
/** Button = rounded rectangle + centred label, returned as two layers. */
export const button = (label: string, x: number, y: number, w: number, h: number, p: Palette): El[] => [
  rect("Button", x, y, w, h, p.accent, { cornerRadius: h / 2 }),
  text("Button label", label, x, y + h * 0.3, w, h * 0.38, p.accentInk, { align: "center" }),
];
const badge = (label: string, cx: number, cy: number, d: number, p: Palette): El[] => [
  ellipse("Badge", cx - d / 2, cy - d / 2, d, d, p.accent),
  text("Badge label", label, cx - d / 2, cy - d * 0.13, d, d * (label.length > 6 ? 0.2 : 0.26), p.accentInk, { align: "center" }),
];

const LAYOUTS: Record<Layout, (W: number, H: number, p: Palette, c: Record<string, string>) => El[]> = {
  hero(W, H, p, c) {
    const wide = W / H > 1.4, m = Math.min(W, H) * 0.07;
    if (wide) {
      const hs = H * 0.125, sw = H * 0.78 * (W / H > 2.5 ? 1 : 0.95), sx = W - m - sw;
      return [
        text("Headline", c.headline, m, H * 0.16, sx - m * 2, hs, p.fg),
        text("Supporting line", c.sub, m, H * 0.16 + hs * 2.45, sx - m * 2, H * 0.055, p.fg, { fontStyle: "normal", opacity: 0.85 }),
        ...button(c.cta, m, H - m - H * 0.15, Math.min(sx - m * 2, H * 0.62), H * 0.15, p),
        slot(sx, (H - H * 0.78) / 2, sw, H * 0.78),
        ...badge(c.badge, sx + sw * 0.06, (H - H * 0.78) / 2 + H * 0.1, H * 0.26, p),
      ];
    }
    const hs = W * 0.082, sh = H * (H > W * 1.5 ? 0.46 : 0.44), sy = H * (H > W * 1.5 ? 0.3 : 0.31), bh = W * 0.105;
    return [
      text("Headline", c.headline, m, m, W - m * 2, hs, p.fg),
      text("Supporting line", c.sub, m, m + hs * 2.4, W - m * 2, W * 0.036, p.fg, { fontStyle: "normal", opacity: 0.85 }),
      slot(W * 0.14, sy, W * 0.72, sh),
      ...button(c.cta, m, H - m - bh, W * 0.42, bh, p),
      ...badge(c.badge, W - m - W * 0.11, H - m - bh / 2, W * 0.22, p),
    ];
  },
  offer(W, H, p, c) {
    const wide = W / H > 1.4, m = Math.min(W, H) * 0.07;
    if (wide) {
      const os = H * 0.185, sw = H * 0.74;
      return [
        rect("Colour band", 0, H * 0.72, W, H * 0.28, p.soft),
        text("Offer", c.offer, m, H * 0.12, W - sw - m * 3, os, p.fg, { lineHeight: 1 }),
        text("Offer line", c.line, m, H * 0.12 + os * 1.15, W - sw - m * 3, H * 0.07, p.fg, { fontStyle: "normal" }),
        ...button(c.cta, m, H * 0.76, H * 0.6, H * 0.14, p),
        text("Fine print", c.fine, m + H * 0.66, H * 0.805, W * 0.3, H * 0.04, p.fg, { fontStyle: "normal", opacity: 0.75 }),
        slot(W - m - sw, (H - sw) / 2, sw, sw),
      ];
    }
    const os = W * 0.17, bh = W * 0.11, tall = H > W * 1.5;
    return [
      rect("Colour band", 0, H * (tall ? 0.36 : 0.4), W, H * (tall ? 0.4 : 0.38), p.soft),
      text("Offer", c.offer, m, m * (tall ? 2.6 : 1), W - m * 2, os, p.fg, { lineHeight: 1, align: "center" }),
      text("Offer line", c.line, m, m * (tall ? 2.6 : 1) + os * 2.15, W - m * 2, W * 0.045, p.fg, { fontStyle: "normal", align: "center" }),
      slot(W * 0.2, H * (tall ? 0.39 : 0.43), W * 0.6, H * (tall ? 0.34 : 0.32)),
      ...button(c.cta, W * 0.25, H - m * (tall ? 2.8 : 1.2) - bh - W * 0.05, W * 0.5, bh, p),
      text("Fine print", c.fine, m, H - m * (tall ? 2.8 : 1.2) - W * 0.03, W - m * 2, W * 0.028, p.fg, { fontStyle: "normal", align: "center", opacity: 0.75 }),
    ];
  },
  features(W, H, p, c) {
    const wide = W / H > 1.4, m = Math.min(W, H) * 0.07;
    const rows = (x: number, y: number, w: number, s: number): El[] => [c.f1, c.f2, c.f3].flatMap((f, i) => [
      ellipse("Bullet", x, y + i * s * 2.3 + s * 0.1, s, s, p.accent),
      text(`Feature ${i + 1}`, f, x + s * 1.6, y + i * s * 2.3, w - s * 1.6, s, p.fg, { fontStyle: "normal" }),
    ]);
    if (wide) {
      const sw = H * 0.76, tx = m * 2 + sw;
      return [slot(m, (H - sw) / 2, sw, sw), text("Title", c.title, tx, H * 0.13, W - tx - m, H * 0.1, p.fg), ...rows(tx, H * 0.42, W - tx - m, H * 0.058), ...button(c.cta, tx, H - m - H * 0.13, H * 0.5, H * 0.13, p)];
    }
    const hs = W * 0.07, bh = W * 0.105;
    return [text("Title", c.title, m, m, W - m * 2, hs, p.fg), slot(W * 0.16, m + hs * 2.7, W * 0.68, H * 0.36), ...rows(m, m + hs * 2.7 + H * 0.36 + m * 0.8, W - m * 2, W * 0.044), ...button(c.cta, m, H - m - bh, W * 0.42, bh, p)];
  },
  comparison(W, H, p, c) {
    const m = W * 0.06, top = H * 0.24, cw = (W - m * 3) / 2, ch = H - top - m, s = W * 0.036;
    const col = (x: number, head: string, items: string[], strong: boolean): El[] => [
      rect(`${head} panel`, x, top, cw, ch, strong ? p.accent : p.soft, { cornerRadius: W * 0.025 }),
      text(`${head} heading`, head, x, top + ch * 0.07, cw, s * 1.35, strong ? p.accentInk : p.fg, { align: "center" }),
      ...items.map((t, i) => text(`${head} point ${i + 1}`, t, x + cw * 0.1, top + ch * (0.26 + i * 0.2), cw * 0.8, s, strong ? p.accentInk : p.fg, { fontStyle: "normal", align: "center" })),
    ];
    return [text("Title", c.title, m, m, W - m * 2, W * 0.062, p.fg, { align: "center" }), ...col(m, c.a, [c.a1, c.a2, c.a3], false), ...col(m * 2 + cw, c.b, [c.b1, c.b2, c.b3], true)];
  },
  brand(W, H, p, c) {
    const s = W * 0.105;
    return [
      rect("Accent rule", W * 0.42, H * 0.36, W * 0.16, W * 0.012, p.accent),
      text("Brand name", c.brand, W * 0.08, H * 0.4, W * 0.84, s, p.fg, { align: "center" }),
      text("Tagline", c.tagline, W * 0.14, H * 0.4 + s * 2.5, W * 0.72, W * 0.042, p.fg, { align: "center", fontStyle: "normal", opacity: 0.85 }),
    ];
  },
};

const short = (n: string) => n.replace(/\s*(\d+(\.\d+)?\s?(ml|g|kg|l|cm|mm|pc|tc)\b.*|pack of.*|set of.*|,.*)$/i, "").trim();
export function buildTemplate(t: Template, ctx: TemplateCtx = {}): Doc {
  const pl = placementOf(t.placement), p = PALETTES[t.palette];
  const pr = ctx.product;
  const vars: Record<string, string> = {
    product: pr ? short(pr.name) : "Your product name",
    price: pr ? `₹${pr.price.toLocaleString("en-IN")}` : "₹999",
    mrp: pr ? `₹${pr.mrp.toLocaleString("en-IN")}` : "₹1,499",
    off: pr ? String(Math.max(5, Math.round(((pr.mrp - pr.price) / pr.mrp) * 100))) : "30",
  };
  const copy = Object.fromEntries(Object.entries(t.copy).map(([k, v]) => [k, v.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "")]));
  return { width: pl.w, height: pl.h, background: p.bg, els: LAYOUTS[t.layout](pl.w, pl.h, p, copy) };
}
export const newElId = id;
