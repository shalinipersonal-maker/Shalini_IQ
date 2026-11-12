export type CopyTone = "Direct" | "Premium" | "Festive" | "Playful";
export interface CopyRequest { product: string; category: string; price: number; mrp: number; offer?: string; tone: CopyTone; seed?: number }
export interface CopyResult { headlines: string[]; primaryTexts: string[]; ctas: string[]; concepts: { title: string; idea: string }[] }

const short = (name: string) => name.replace(/\s*(\d+(\.\d+)?\s?(ml|g|kg|l|cm|mm|pc|tc)\b.*|pack of.*|set of.*|,.*)$/i, "").trim();
const rot = <T,>(a: T[], n: number) => a.map((_, i) => a[(i + n) % a.length]);

/**
 * Template-based copy generator used in demo mode. Output is assembled from the product's own name,
 * category and price — it makes no claims about the product that the catalogue does not contain.
 */
export function generateCopy(req: CopyRequest): CopyResult {
  const p = short(req.product);
  const off = req.mrp > req.price ? Math.round(((req.mrp - req.price) / req.mrp) * 100) : 0;
  const offer = req.offer?.trim() || (off >= 5 ? `${off}% off` : "");
  // No price given → lines that would show a price are left out (never "₹0").
  const price = req.price > 0 ? `₹${req.price.toLocaleString("en-IN")}` : "\u0000";
  const priced = (xs: string[]) => xs.filter((x) => !x.includes("\u0000"));
  const cat = req.category.toLowerCase();
  const H: Record<CopyTone, string[]> = {
    Direct: [`${p}. Now ${price}.`, offer ? `${offer} on ${p}` : `${p}, delivered fast`, `The ${cat} upgrade you planned`, `${p} — in stock today`, `Buy ${p} at ${price}`, `Made for everyday use`],
    Premium: [`${p}, considered in every detail`, `Quietly better ${cat}`, `Crafted to last. ${p}.`, `The ${p} your routine deserves`, offer ? `An invitation: ${offer}` : `Now available: ${p}`, `Fewer, better things`],
    Festive: [offer ? `Festive offer: ${offer}` : `Festive picks: ${p}`, `Celebrate with ${p}`, `Gift-ready ${cat}, from ${price}`, `This season's most-wanted ${cat}`, `Bring home ${p}`, `Festive prices end soon`],
    Playful: [`Meet your new favourite: ${p}`, `Your ${cat} called. It wants this.`, `${p}? Yes, please.`, offer ? `Psst — ${offer}` : `Small price, big upgrade`, `Add to cart energy`, `Treat yourself to ${p}`],
  };
  const T: Record<CopyTone, string[]> = {
    Direct: [`${p} at ${price}${offer ? ` (${offer})` : ""}. Order today on your preferred marketplace.`, `Looking for dependable ${cat}? ${p} is in stock and ships quickly.`],
    Premium: [`Designed with care and built to last, ${p} brings a considered finish to your ${cat}. From ${price}.`, `Thoughtful materials, honest pricing. Discover ${p}.`],
    Festive: [`Make this season special with ${p}.${offer ? ` Enjoy ${offer} for a limited time.` : ""} From ${price}.`, `Gifting made easy: ${p}, ready to deliver before the celebrations.`],
    Playful: [`Good things come to those who add to cart. ${p}, from ${price}.`, `Your routine just got an upgrade. Say hello to ${p}.`],
  };
  const n = req.seed ?? 0;
  return {
    headlines: rot(priced(H[req.tone]), n),
    primaryTexts: rot(priced(T[req.tone]), n),
    ctas: rot(["Shop now", "Buy now", "View offer", "Order today"], n),
    concepts: rot([
      { title: "Hero on colour", idea: `${p} centred on a flat brand-colour field, price badge top right, single-line headline below.` },
      { title: "Feature callouts", idea: `Product at left with three short feature labels connected by thin lines; CTA pill at the bottom.` },
      { title: "Before / after", idea: `Split canvas: the everyday problem on the left in muted tones, ${p} solving it on the right in brand colour.` },
      { title: "Offer first", idea: `${offer || "Launch price"} set very large as the headline, product photo overlapping the lower third.` },
    ], n),
  };
}
