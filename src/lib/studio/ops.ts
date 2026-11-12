import { PALETTES, type Palette } from "./templates";
import type { Doc, El } from "./types";

function rgb(c: string): [number, number, number] | null {
  const h = c.trim().match(/^#([0-9a-f]{6}|[0-9a-f]{3})$/i)?.[1];
  if (!h) return null;
  const f = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)) as [number, number, number];
}
function luminance(c: string) {
  const v = rgb(c);
  if (!v) return null;
  const [r, g, b] = v.map((x) => { const s = x / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** WCAG contrast ratio, or null when either colour is not a plain hex value. */
export function contrast(a: string, b: string) {
  const la = luminance(a), lb = luminance(b);
  if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export interface Suggestion { id: string; severity: "fix" | "consider"; title: string; detail: string; elId?: string }
/** Design review: deterministic checks on the current document. */
export function reviewDesign(doc: Doc): Suggestion[] {
  const out: Suggestion[] = [];
  const vis = doc.els.filter((e) => e.visible);
  const texts = vis.filter((e) => e.type === "text");
  const inside = (e: El, o: El) => e.x >= o.x && e.y >= o.y && e.x + e.width <= o.x + o.width + 1 && e.y + e.height <= o.y + o.height + 1;
  vis.filter((e) => e.placeholder).forEach((e) => out.push({ id: `slot${e.id}`, severity: "fix", title: "Product image slot is empty", detail: "Select the slot, then choose a photo from Uploads to place your real product image.", elId: e.id }));
  for (const t of texts) {
    // Background behind the text: the top-most opaque shape that fully contains it, else the canvas.
    const idx = doc.els.indexOf(t);
    const behind = doc.els.slice(0, idx).reverse().find((o) => o.visible && o.type !== "text" && o.type !== "image" && !o.placeholder && inside(t, o));
    const ratio = contrast(t.fill ?? "#000000", behind?.fill ?? doc.background);
    if (ratio !== null && ratio < 3) out.push({ id: `con${t.id}`, severity: "fix", title: `Low contrast: “${(t.text ?? "").slice(0, 28)}”`, detail: `Contrast with its background is ${ratio.toFixed(1)}:1. Aim for at least 3:1 for large text and 4.5:1 for small text.`, elId: t.id });
    if ((t.fontSize ?? 0) < doc.height * 0.02) out.push({ id: `small${t.id}`, severity: "consider", title: `Small text: “${(t.text ?? "").slice(0, 28)}”`, detail: "This text is under 2% of the canvas height and may be unreadable on a phone.", elId: t.id });
  }
  vis.filter((e) => e.x < -1 || e.y < -1 || e.x + e.width > doc.width + 1 || e.y + e.height > doc.height + 1).filter((e) => e.type === "text" || e.type === "image").forEach((e) => out.push({ id: `out${e.id}`, severity: "fix", title: `“${e.name}” runs off the canvas`, detail: "Part of this layer will be cut off in the export.", elId: e.id }));
  const fonts = new Set(texts.map((t) => t.fontFamily));
  if (fonts.size > 2) out.push({ id: "fonts", severity: "consider", title: `${fonts.size} typefaces in use`, detail: "Two typefaces at most usually reads as more deliberate." });
  if (texts.length && !texts.some((t) => /shop|buy|order|view|learn|explore|swipe|get/i.test(t.text ?? ""))) out.push({ id: "cta", severity: "consider", title: "No call to action", detail: "Add a short action such as “Shop now” so viewers know what to do next." });
  if (doc.height / doc.width > 1.7) {
    const safe = doc.height * 0.12;
    texts.filter((t) => t.y < safe || t.y + t.height > doc.height - safe).forEach((t) => out.push({ id: `safe${t.id}`, severity: "consider", title: `“${(t.text ?? "").slice(0, 28)}” sits in the story safe zone`, detail: "The top and bottom 12% of a 9:16 placement can be covered by the app's interface.", elId: t.id }));
  }
  if (texts.reduce((s, t) => s + (t.text?.length ?? 0), 0) > 220) out.push({ id: "wordy", severity: "consider", title: "A lot of text for one ad", detail: "Ads with a single message and little text are usually easier to take in." });
  return out;
}

const same = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
/** Finds which template palette a document is using, by its background colour. */
export function detectPalette(doc: Doc): string | null {
  return Object.keys(PALETTES).find((k) => same(PALETTES[k].bg, doc.background)) ?? null;
}
export function applyPalette(doc: Doc, from: Palette, to: Palette): Doc {
  const map = (c?: string) => { const k = (Object.keys(from) as (keyof Palette)[]).find((key) => same(from[key], c)); return k ? to[k] : c; };
  return { ...doc, background: map(doc.background)!, els: doc.els.map((e) => (e.placeholder ? e : { ...e, fill: map(e.fill), stroke: map(e.stroke) })) };
}
/** Creative variations: the same layout re-coloured with other palettes. Product images are never altered. */
export function variations(doc: Doc, n = 3): { key: string; doc: Doc }[] {
  const cur = detectPalette(doc);
  if (!cur) return [];
  const keys = Object.keys(PALETTES).filter((k) => k !== cur);
  const start = keys.length ? doc.els.length % keys.length : 0;
  return Array.from({ length: Math.min(n, keys.length) }, (_, i) => keys[(start + i * 2) % keys.length]).filter((k, i, a) => a.indexOf(k) === i).map((k) => ({ key: k, doc: applyPalette(doc, PALETTES[cur], PALETTES[k]) }));
}
export function hslHex(h: number, s: number, l: number) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => { const k = (n + h / 30) % 12; return Math.round(255 * (l / 100 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1))).toString(16).padStart(2, "0"); };
  return `#${f(0)}${f(8)}${f(4)}`;
}
/** Demo brand kit derived from the client's profile colour. */
export const brandColors = (hue: number) => [
  { label: "Primary", color: hslHex(hue, 55, 40) },
  { label: "Deep", color: hslHex(hue, 55, 18) },
  { label: "Tint", color: hslHex(hue, 45, 93) },
  { label: "Accent", color: hslHex((hue + 150) % 360, 70, 52) },
  { label: "Ink", color: "#14161c" },
  { label: "Paper", color: "#ffffff" },
];
export function backgroundSuggestions(hue: number, current: string): { label: string; color: string }[] {
  return [
    { label: "Soft brand tint", color: hslHex(hue, 45, 93) },
    { label: "Deep brand", color: hslHex(hue, 55, 18) },
    { label: "Warm neutral", color: "#f4efe7" },
    { label: "Complement", color: hslHex((hue + 180) % 360, 40, 90) },
    { label: "Ink", color: "#14161c" },
    { label: "Clean white", color: "#ffffff" },
  ].filter((s) => !same(s.color, current));
}
