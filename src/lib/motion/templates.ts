/**
 * Motion Studio template catalogue — generated, not hand-drawn: 12 layouts × 24 colour styles × occasions × motion.
 * 200 photo templates, 50 video templates, 100 GIF templates. Every template is fully editable (text, price,
 * photo, colours) and is drawn by render.ts on a <canvas>, so nothing is copied from any other service.
 */
export type Kind = "photo" | "video" | "gif";
export type Layout = "center" | "splitLeft" | "splitTop" | "frame" | "badge" | "diagonal" | "arch" | "polaroid" | "minimal" | "grid" | "sale" | "tip";
export type Motion = "fadeUp" | "zoom" | "slide" | "pop" | "wipe" | "float" | "shimmer" | "kinetic" | "pulse" | "sparkle" | "confetti" | "spin";
export interface Palette { name: string; bg: string; bg2: string; ink: string; accent: string; soft: string }
export interface Size { id: string; label: string; w: number; h: number }
export interface Template {
  id: string; kind: Kind; name: string; occasion: string; layout: Layout; palette: number; serif: boolean;
  motion: Motion; size: Size; duration: number; // seconds (video/gif)
  copy: { headline: string; sub: string; cta: string };
}

export const PALETTES: Palette[] = [
  { name: "Wine & Blush", bg: "#3b0f1e", bg2: "#4c1628", ink: "#fbe9ee", accent: "#f2a7b8", soft: "#80354f" },
  { name: "Blush & Wine", bg: "#fbeef1", bg2: "#f6dfe5", ink: "#3b0f1e", accent: "#8e2340", soft: "#e0b4c0" },
  { name: "Ivory & Gold", bg: "#faf6ee", bg2: "#efe6d2", ink: "#1c1a17", accent: "#b08d3c", soft: "#e2d3b0" },
  { name: "Maroon & Gold", bg: "#4a0f1a", bg2: "#5e1624", ink: "#fbeedd", accent: "#d9a441", soft: "#7a2a36" },
  { name: "Midnight & Rose Gold", bg: "#0f1424", bg2: "#182038", ink: "#f1e9e4", accent: "#d4a29a", soft: "#2a3350" },
  { name: "White & Black", bg: "#ffffff", bg2: "#f2f2f2", ink: "#111111", accent: "#111111", soft: "#d9d9d9" },
  { name: "Blush & Charcoal", bg: "#fbf1f0", bg2: "#f6e1df", ink: "#2b2b2e", accent: "#c46a7a", soft: "#ebc9c6" },
  { name: "Peacock Teal & Gold", bg: "#0d3b40", bg2: "#12494f", ink: "#f4efe3", accent: "#d8b25c", soft: "#1d5c62" },
  { name: "Plum & Champagne", bg: "#2a1630", bg2: "#382042", ink: "#f3eadf", accent: "#e2c9a0", soft: "#4b2c56" },
  { name: "Sand & Terracotta", bg: "#f5ede2", bg2: "#ebdfcf", ink: "#2e2620", accent: "#b3592f", soft: "#dcc7ad" },
  { name: "Charcoal & Copper", bg: "#18191c", bg2: "#222428", ink: "#ecebe8", accent: "#c77b4a", soft: "#34363b" },
  { name: "Lavender & Silver", bg: "#f4f2fa", bg2: "#e7e3f5", ink: "#22213a", accent: "#6d5fb3", soft: "#cfc8ea" },
  { name: "Champagne & Black", bg: "#f7f1e8", bg2: "#efe5d4", ink: "#141414", accent: "#9c7a3c", soft: "#e0d0b4" },
  { name: "Emerald Night & Gold", bg: "#0e2a24", bg2: "#13372f", ink: "#f2ead7", accent: "#d4b15a", soft: "#1f4a40" },
  { name: "Rose Quartz & Plum", bg: "#fbeef0", bg2: "#f5dde3", ink: "#3a1f33", accent: "#8e3b6e", soft: "#e8c3cf" },
  { name: "Ink Blue & Brass", bg: "#13233f", bg2: "#1a2e52", ink: "#eef1f6", accent: "#c9a35b", soft: "#2a4170" },
  { name: "Pearl & Silver", bg: "#fcfcfd", bg2: "#f0f2f5", ink: "#1f2430", accent: "#7b8496", soft: "#dde1e8" },
  { name: "Saffron & Cream", bg: "#fff7ec", bg2: "#fde9cf", ink: "#2d1b0e", accent: "#e07b1a", soft: "#f6d3a6" },
  { name: "Kanchi Red & Gold", bg: "#7a0d16", bg2: "#8f1620", ink: "#fff3df", accent: "#f0c14b", soft: "#a3242f" },
  { name: "Mint & Charcoal", bg: "#f1f8f5", bg2: "#dff0e8", ink: "#22272b", accent: "#2f8f6f", soft: "#c3e3d5" },
  { name: "Mocha & Cream", bg: "#f3ebe3", bg2: "#e8dbcd", ink: "#2b1d14", accent: "#8a5a3b", soft: "#d8c3ad" },
  { name: "Black & Neon Pink", bg: "#0d0d0f", bg2: "#18181c", ink: "#f6f2f4", accent: "#ff4f9a", soft: "#2a2a30" },
  { name: "Royal Purple & Gold", bg: "#2c1550", bg2: "#3a1f66", ink: "#f4ecff", accent: "#e2b95a", soft: "#4b2c80" },
  { name: "Turquoise & Coral", bg: "#effaf9", bg2: "#d8f1ef", ink: "#11393a", accent: "#ef6f5e", soft: "#b8e4e0" },
];

export const SIZES: Size[] = [
  { id: "post", label: "Square post 1080×1080", w: 1080, h: 1080 },
  { id: "portrait", label: "Portrait post 1080×1350", w: 1080, h: 1350 },
  { id: "story", label: "Story / Reel 1080×1920", w: 1080, h: 1920 },
  { id: "wide", label: "Facebook link 1200×628", w: 1200, h: 628 },
];
export const GIF_SIZES: Size[] = [
  { id: "gif-square", label: "GIF square 480×480", w: 480, h: 480 },
  { id: "gif-portrait", label: "GIF portrait 480×600", w: 480, h: 600 },
];

const OCCASIONS: { occasion: string; lines: [string, string, string][] }[] = [
  { occasion: "New arrival", lines: [["New arrivals", "Handpicked for you", "Shop now"], ["Just landed", "Fresh designs this week", "See the collection"], ["Meet the new collection", "Made to be noticed", "Explore"], ["Fresh off the table", "Small batch, big sparkle", "See what's new"], ["This week's drop", "Only a few of each", "Shop the drop"]] },
  { occasion: "Festive", lines: [["Festive picks", "Shine this season", "Order now"], ["Diwali sparkle", "Gift-ready, delivered fast", "Shop Diwali"], ["Pongal specials", "Traditional, timeless, yours", "Shop now"], ["Navratri glow", "Nine nights, nine looks", "Shop festive"], ["Celebrate in style", "Festive jewellery, gift-boxed", "Order today"]] },
  { occasion: "Sale", lines: [["Flat 20% off", "This weekend only", "Grab yours"], ["Price drop", "Limited stock", "Shop the offer"], ["Buy 2, save more", "Mix and match any designs", "Shop now"], ["Weekend sale", "Up to 30% off selected pieces", "Shop the sale"], ["Last few hours", "Offer ends tonight", "Buy now"]] },
  { occasion: "Bridal", lines: [["Bridal edit", "For your big day", "Book a look"], ["Wedding season", "Statement pieces, made to last", "Explore bridal"], ["Bride squad ready", "Matching sets for the whole family", "Enquire now"], ["Temple jewellery", "Timeless bridal classics", "See the set"]] },
  { occasion: "Gifting", lines: [["The perfect gift", "Wrapped and ready", "Send a gift"], ["Gift her a smile", "Thoughtful, elegant, affordable", "Shop gifts"], ["Gifts under ₹999", "Pretty, packed and posted", "Pick a gift"], ["For mom, with love", "A sparkle she will keep", "Shop gifts"]] },
  { occasion: "Everyday", lines: [["Everyday elegance", "Light, comfortable, beautiful", "Shop daily wear"], ["Style it your way", "Pieces for every outfit", "Shop now"], ["Office to evening", "Light pieces you can wear all day", "Shop now"], ["Minimal, always", "Clean designs for daily wear", "Explore"]] },
  { occasion: "Launch", lines: [["We are live!", "Our store is now open", "Visit the store"], ["Coming soon", "Something beautiful is on its way", "Get notified"], ["Now on Instagram", "Follow us for new drops", "Follow"], ["Order on WhatsApp", "Message us to order in minutes", "Message us"]] },
  { occasion: "Restock", lines: [["Back in stock", "Your favourites are back", "Order before they go"], ["Restocked", "Limited pieces available", "Shop now"], ["Sold out, now back", "Restocked by popular demand", "Shop again"], ["Best sellers are back", "Grab them this time", "Order now"]] },
  { occasion: "Tip", lines: [["Jewellery care tip", "Store pieces dry, away from perfume", "Learn more"], ["Styling tip", "Pair bold earrings with a simple neckline", "Follow for more"], ["How to clean jewellery", "Wipe with a soft dry cloth after wearing", "Save this"], ["Layering tip", "Mix one long and one short chain", "Try it"]] },
];

const LAYOUTS: Layout[] = ["center", "splitLeft", "splitTop", "frame", "badge", "diagonal", "arch", "polaroid", "minimal", "grid", "sale", "tip"];
const MOTIONS: Motion[] = ["fadeUp", "zoom", "slide", "pop", "wipe", "float", "shimmer", "kinetic", "pulse", "sparkle", "confetti", "spin"];
const LAYOUT_NAME: Record<Layout, string> = { center: "Spotlight", splitLeft: "Side by side", splitTop: "Photo top", frame: "Framed", badge: "Price badge", diagonal: "Diagonal", arch: "Arch window", polaroid: "Polaroid", minimal: "Minimal type", grid: "Grid", sale: "Big offer", tip: "Tip card" };
const MOTION_NAME: Record<Motion, string> = { fadeUp: "Rise", zoom: "Slow zoom", slide: "Slide in", pop: "Pop", wipe: "Reveal", float: "Float", shimmer: "Gold shimmer", kinetic: "Word by word", pulse: "Beat pulse", sparkle: "Sparkle", confetti: "Celebration", spin: "Halo spin" };

/** Small deterministic generator so the catalogue is identical on every device. */
function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function build(kind: Kind, count: number, seed: number): Template[] {
  const r = rng(seed);
  const out: Template[] = [];
  const seen = new Set<string>();
  let i = 0;
  while (out.length < count && i < count * 20) {
    i++;
    const occ = OCCASIONS[i % OCCASIONS.length];
    let layout = LAYOUTS[Math.floor(r() * LAYOUTS.length)];
    if (occ.occasion === "Tip") layout = r() < 0.6 ? "tip" : "minimal";
    if (occ.occasion === "Sale" && r() < 0.5) layout = "sale";
    const palette = Math.floor(r() * PALETTES.length);
    const serif = r() < 0.62;
    const motion = MOTIONS[Math.floor(r() * MOTIONS.length)];
    const sizes = kind === "gif" ? GIF_SIZES : SIZES;
    const size = kind === "video" ? (r() < 0.6 ? SIZES[2] : SIZES[Math.floor(r() * 2)]) : sizes[Math.floor(r() * sizes.length)];
    const line = occ.lines[Math.floor(r() * occ.lines.length)];
    const key = `${layout}-${palette}-${line[0]}-${kind === "photo" ? serif : motion}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const n = out.length + 1;
    out.push({
      id: `${kind}-${String(n).padStart(3, "0")}`, kind, occasion: occ.occasion, layout, palette, serif, motion, size,
      duration: kind === "video" ? [6, 8, 10, 12, 15][Math.floor(r() * 5)] : kind === "gif" ? [2, 2.5, 3][Math.floor(r() * 3)] : 0,
      name: `${occ.occasion} · ${LAYOUT_NAME[layout]}${kind === "photo" ? "" : ` · ${MOTION_NAME[motion]}`}`,
      copy: { headline: line[0], sub: line[1], cta: line[2] },
    });
  }
  return out;
}

export const PHOTO_TEMPLATES = build("photo", 500, 11);
export const VIDEO_TEMPLATES = build("video", 200, 29);
export const GIF_TEMPLATES = build("gif", 1000, 47);
export const ALL_TEMPLATES = [...PHOTO_TEMPLATES, ...VIDEO_TEMPLATES, ...GIF_TEMPLATES];
export const OCCASION_LIST = OCCASIONS.map((o) => o.occasion);
export { MOTION_NAME, LAYOUT_NAME };
