/**
 * Listing visibility check — five rules-based scores for one product listing:
 *   SEO  found in Amazon / Flipkart / Google search
 *   AEO  answers the questions buyers ask (answer engines, voice search, "Ask Rufus"-style helpers)
 *   GEO  easy for AI assistants (ChatGPT, Gemini, Perplexity) to quote and recommend
 *   AIO  ready for Google's AI Overviews (a clear summary first, short lists, short answers)
 *   AXO  ready for AI shopping agents (price, SKU, variants, delivery and returns spelled out)
 * It reads only the text typed in. It is a guide built from published listing and content guidelines,
 * not any marketplace's or search engine's own score — the UI says so.
 */
import { checkListing, type Marketplace } from "@/lib/site/listing-check";

export interface VisibilityInput {
  marketplace: Marketplace;
  brand: string;
  title: string;
  bullets: string;
  description: string;
  faq: string; // "Q: …? A: …" one per line, or question line then answer line
  price: string;
  sku: string;
  imageCount: number;
  whiteMainImage: boolean;
}
export interface PillarCheck { ok: boolean; label: string; fix: string }
export interface Pillar { key: "seo" | "aeo" | "geo" | "aio" | "axo"; name: string; plain: string; score: number; checks: PillarCheck[] }
export interface VisibilityReport { overall: number; pillars: Pillar[]; method: string }

const lines = (s: string) => s.split(/\r?\n/).map((l) => l.replace(/^[\s•*\-–·]+/, "").trim()).filter(Boolean);
const HYPE = /\b(best|no\.?\s?1|number one|cheapest|guaranteed|100%|amazing|awesome|world.?class|unbeatable|hot sale)\b/i;
const UNIT = /\b\d+(\.\d+)?\s?(cm|mm|m|inch|in|ft|ml|l|litre|liter|g|gm|gram|kg|mah|w|watt|v|gb|tb|pcs|pieces|pack|carat|ct|karat|kt)\b/gi;

function pillar(key: Pillar["key"], name: string, plain: string, checks: PillarCheck[]): Pillar {
  return { key, name, plain, checks, score: Math.round((checks.filter((c) => c.ok).length / Math.max(1, checks.length)) * 100) };
}

export function visibilityReport(v: VisibilityInput): VisibilityReport {
  const title = v.title.trim();
  const bullets = lines(v.bullets);
  const desc = v.description.trim();
  const all = `${title}\n${bullets.join("\n")}\n${desc}`;
  const brand = v.brand.trim();
  const faqLines = lines(v.faq);
  const questions = faqLines.filter((l) => /\?\s*(a:|$)|^q[:.]/i.test(l));
  const units = all.match(UNIT) ?? [];
  const firstSentence = (desc.split(/(?<=[.!?])\s/)[0] ?? "").trim();
  const keyWords = title.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 3 && !brand.toLowerCase().includes(w)).slice(0, 4);
  const listing = checkListing({ marketplace: v.marketplace, title, bullets: v.bullets, description: desc, imageCount: v.imageCount, whiteMainImage: v.whiteMainImage });
  const has = (re: RegExp) => re.test(all);

  const seo = pillar("seo", "SEO", "Found in Amazon, Flipkart and Google search", [
    { ok: listing.score >= 80, label: `Marketplace listing basics score ${listing.score}/100`, fix: "Open the free listing check on the website and press “Fix it to 100%” for the title, points and images." },
    { ok: !!brand && title.toLowerCase().startsWith(brand.toLowerCase()), label: "Title starts with the brand name", fix: `Start the title with “${brand || "your brand"}”.` },
    { ok: keyWords.length > 0 && keyWords.every((w) => `${bullets.join(" ")} ${desc}`.toLowerCase().includes(w)), label: "Main title words repeat in the points or description", fix: `Use these words again in a point or the description: ${keyWords.join(", ") || "the product type"}.` },
    { ok: !HYPE.test(title), label: "No hype words in the title (best, No.1, 100%)", fix: "Remove words like “best” or “No.1” — marketplaces suppress them and buyers skip them." },
  ]);
  const aeo = pillar("aeo", "AEO", "Answers the questions buyers ask", [
    { ok: has(/\b(material|fabric|cotton|silk|polyester|steel|brass|copper|silver|gold|alloy|wood|plastic|leather|glass|made of|ingredients?)\b/i), label: "Says what it is made of", fix: "Add a point: “Material: …”." },
    { ok: has(/\b(size|fit|length|width|height|weight|capacity|dimensions?)\b/i) || units.length > 0, label: "Gives size, weight or capacity", fix: "Add a point with exact size or weight, e.g. “Length: 45 cm, weight: 12 g”." },
    { ok: has(/\b(ideal for|perfect for|use (it )?for|suitable for|wear (it )?(with|for)|occasion|daily use|festive|wedding|gift)\b/i), label: "Says who or what it is for", fix: "Add a point: “Ideal for weddings, festivals and gifting”." },
    { ok: has(/\b(care|wash|clean|store|storage|polish|avoid (water|perfume))\b/i), label: "Explains care or storage", fix: "Add a point: “Care: wipe with a soft dry cloth; store in the pouch”." },
    { ok: questions.length >= 3, label: `At least 3 questions answered (now ${questions.length})`, fix: "Add 3–5 FAQs, e.g. “Q: Is it skin-friendly? A: Yes, nickel-free alloy.”" },
  ]);
  const geo = pillar("geo", "GEO", "Easy for AI assistants (ChatGPT, Gemini) to quote and recommend", [
    { ok: units.length >= 3, label: `Concrete facts with numbers and units (now ${units.length})`, fix: "Add at least 3 measurable facts: sizes, weights, counts, purity." },
    { ok: !!brand && all.toLowerCase().split(brand.toLowerCase()).length > 2, label: "Brand named more than once", fix: `Mention “${brand || "your brand"}” in the description as well as the title.` },
    { ok: has(/\b(made in|handmade|handcrafted|crafted in|origin|from (tamil nadu|india|chennai))\b/i), label: "Says where or how it is made", fix: "Add “Handcrafted in Tamil Nadu, India” (or the true origin)." },
    { ok: desc.length >= 300, label: "Description has enough detail (300+ characters)", fix: "Write 3–4 plain sentences: what it is, who it is for, what makes it different." },
    { ok: !HYPE.test(all), label: "Plain facts, no hype", fix: "Replace claims like “best quality” with a fact, e.g. “gold-plated, 1 micron”." },
  ]);
  const aio = pillar("aio", "AIO", "Ready for Google AI Overviews", [
    { ok: firstSentence.length >= 40 && firstSentence.length <= 180, label: "Description opens with a one-sentence summary", fix: "Start with one sentence of 40–180 characters: what it is + for whom." },
    { ok: keyWords.length > 0 && keyWords.some((w) => firstSentence.toLowerCase().includes(w)), label: "That first sentence names the product type", fix: `Put “${keyWords[0] ?? "the product type"}” in the first sentence.` },
    { ok: bullets.length >= 4, label: "Facts are in short points (4 or more)", fix: "Split long text into 4–5 short points." },
    { ok: faqLines.length > 0 && faqLines.every((l) => l.length <= 300), label: "FAQ answers are short (under 300 characters)", fix: "Keep each FAQ answer to one or two sentences." },
  ]);
  const axo = pillar("axo", "AXO", "Ready for AI shopping agents that compare and buy", [
    { ok: /\d/.test(v.price), label: "Price given", fix: "Fill in the selling price." },
    { ok: v.sku.trim().length >= 3, label: "SKU or model number given", fix: "Fill in the SKU or model number so agents can match the exact item." },
    { ok: has(/\b(colou?r|variant|size|pack of|set of|pair)\b/i), label: "Variant stated (colour, size, pack)", fix: "Add the colour, size or pack in a point." },
    { ok: has(/\b(return|replacement|exchange|warranty|guarantee period)\b/i), label: "Returns or warranty stated", fix: "Add a point: “7-day easy return” (only if it's true for your listing)." },
    { ok: has(/\b(deliver|delivery|dispatch|ships? (in|within)|in stock)\b/i), label: "Delivery or stock stated", fix: "Add “Ships within 2 days” (only if true)." },
  ]);
  const pillars = [seo, aeo, geo, aio, axo];
  return {
    overall: Math.round(pillars.reduce((s, p) => s + p.score, 0) / pillars.length),
    pillars,
    method: "Rules-based check of the text you typed, built from published marketplace listing and search guidelines. It is a guide — not Amazon's, Flipkart's or Google's own score — and it reads no live listing.",
  };
}
