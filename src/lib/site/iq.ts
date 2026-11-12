/**
 * IQ — Shalini_IQ's on-site assistant. Runs entirely in the browser: no paid AI key, nothing sent anywhere
 * except an enquiry the visitor chooses to submit. It understands intents by keywords, pulls numbers out
 * of the message (price, weight, sellers), and can calculate fees, quote Shalini_IQ, check a product title
 * and collect an enquiry step by step. Answers only from facts in this codebase — never invents prices.
 */
import { SITE } from "@/config/site";
import { calculate, FEE_CONFIGS, type CalcId } from "./fees";
import { checkListing, type Marketplace } from "./listing-check";
import { SERVICES } from "./leads";
import { PRICING, quote } from "./pricing";

export type Action = { label: string; href: string; external?: boolean };
export interface IQMessage { from: "iq" | "you"; text: string; chips?: string[]; actions?: Action[]; ts: number }
export type Stage = "idle" | "lead_name" | "lead_phone" | "lead_email" | "lead_need";
export interface IQState { stage: Stage; lead: { name?: string; phone?: string; email?: string; interest?: string }; lastCalc?: CalcId }
export interface IQTurn { messages: Omit<IQMessage, "ts">[]; state: IQState; submit?: { name: string; phone: string; email: string; interest: (typeof SERVICES)[number] } }

export const IQ_START: IQState = { stage: "idle", lead: {} };
export const MAIN_CHIPS = ["What do you do?", "Amazon fee for ₹999", "Shalini_IQ price for 20 sellers", "Check my product title", "Talk to a person"];
export const GREETING: Omit<IQMessage, "ts"> = {
  from: "iq",
  text: "Hi, I'm **IQ**, Shalini_IQ's assistant. I can explain our services, work out marketplace fees, price Shalini_IQ, check a product title, or get you a call back. What would you like?",
  chips: MAIN_CHIPS,
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const money = (n: number, id: CalcId) => (FEE_CONFIGS[id].currency === "USD" ? `$${n.toFixed(2)}` : inr(n));
const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "").replace(/\s+/g, " ").trim();
const has = (t: string, ...words: string[]) => words.some((w) => (w.includes(" ") ? t.includes(w) : new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(t)));

const MARKET_WORDS: [CalcId, string[]][] = [
  ["amazon", ["amazon"]], ["flipkart", ["flipkart"]], ["meesho", ["meesho"]], ["jiomart", ["jiomart", "jio mart"]],
  ["ebay", ["ebay"]], ["etsy", ["etsy"]], ["blinkit", ["blinkit"]], ["zepto", ["zepto"]], ["instamart", ["instamart", "swiggy"]],
];
export function findMarket(t: string): CalcId | undefined { return MARKET_WORDS.find(([, ws]) => ws.some((w) => t.includes(w)))?.[0]; }

export function findPrice(t: string): number | undefined {
  const m = t.match(/(?:₹|rs\.?|inr|\$)\s*([\d,]+(?:\.\d+)?)/) ?? t.match(/(?:price|for|at|of|sell(?:ing)?(?: at)?)\s+([\d,]+(?:\.\d+)?)(?!\s*(?:g|gm|grams?|kg|sellers?|accounts?|brands?))/) ?? t.match(/^([\d,]+(?:\.\d+)?)(?!\s*(?:g|gm|grams?|kg|sellers?|accounts?|brands?))(?:\s|$)/);
  return m ? Number(m[1].replace(/,/g, "")) : undefined;
}
export function findWeight(t: string): number | undefined {
  const m = t.match(/([\d.]+)\s*(kg|kgs|g|gm|gms|grams?)\b/);
  if (!m) return undefined;
  return /kg/.test(m[2]) ? Math.round(Number(m[1]) * 1000) : Math.round(Number(m[1]));
}
export function findSellers(t: string): number | undefined {
  const m = t.match(/(\d+)\s*(?:sellers?|accounts?|brands?|clients?)/) ?? (has(t, "entraiq", "platform") ? t.match(/(?:for|with)\s+(\d+)/) : null);
  return m ? Number(m[1]) : undefined;
}
function findCategory(id: CalcId, t: string): string {
  const cats = FEE_CONFIGS[id].categories;
  const map: [string, string[]][] = [["fashion", ["fashion", "saree", "kurta", "dress", "shirt", "clothing", "apparel", "footwear", "shoe"]], ["home", ["home", "kitchen", "decor"]], ["beauty", ["beauty", "cosmetic", "skin", "hair"]], ["electronics", ["electronic", "mobile", "charger", "cable", "earphone"]], ["grocery", ["grocery", "food", "snack", "masala"]], ["books", ["book"]], ["sports", ["sport", "fitness", "gym"]], ["care", ["personal care"]]];
  for (const [cid, ws] of map) if (ws.some((w) => t.includes(w)) && cats.some((c) => c.id === cid)) return cid;
  return cats[0].id;
}

function feeAnswer(id: CalcId, price: number, t: string): Omit<IQMessage, "ts"> {
  const cfg = FEE_CONFIGS[id];
  const categoryId = findCategory(id, t);
  const weight = findWeight(t) ?? 500;
  const r = calculate(cfg, { price, cost: 0, categoryId, weightGrams: weight, zone: "national" });
  const cat = cfg.categories.find((c) => c.id === categoryId)!;
  const lines = r.lines.filter((l) => l.amount > 0).map((l) => `• ${l.label}: ${money(l.amount, id)}`);
  if (!lines.length) lines.push("• No marketplace fees at this price — only any shipping or returns you bear.");
  if (cfg.gstOnFees && r.gstOnFees > 0) lines.push(`• GST 18% on fees: ${money(r.gstOnFees, id)}`);
  return {
    from: "iq",
    text: [
      `**${cfg.name}**, ${money(price, id)}${cfg.categories.length > 1 ? `, ${cat.label.toLowerCase()}` : ""}${cfg.shipping && cfg.shipping !== "manual" ? `, ${weight} g, national delivery` : ""}:`,
      ...lines,
      `**Total taken: ${money(r.totalDeductions, id)}** · reaches your bank: **${money(r.payout, id)}**${r.zeroApplied ? " (zero commission applies)" : ""}.`,
      "These use default public rates checked Nov 2026. Add your product cost in the full calculator to see profit.",
    ].join("\n"),
    actions: [{ label: `Open ${cfg.name} calculator`, href: `#calc-${id}` }],
    chips: ["Try another price", "Flipkart fee for ₹999", "Talk to a person"],
  };
}

function titleCheck(title: string, mk: Marketplace): Omit<IQMessage, "ts"> {
  const rep = checkListing({ marketplace: mk, title, bullets: "", description: "", imageCount: 0, whiteMainImage: true });
  const titleIds = ["title-length", "promo", "format", "stuffing", "specifics"];
  const res = rep.results.filter((r) => titleIds.includes(r.id));
  const total = res.reduce((a, r) => a + r.weight, 0);
  const got = res.reduce((a, r) => a + (r.severity === "pass" ? r.weight : r.severity === "warn" ? r.weight / 2 : 0), 0);
  const score = Math.round((got / total) * 100);
  const issues = res.filter((r) => r.severity !== "pass");
  return {
    from: "iq",
    text: [
      `Title score: **${score}/100** for ${mk[0].toUpperCase() + mk.slice(1)}.`,
      ...(issues.length ? issues.map((r) => `• ${r.label}: ${r.detail}${r.fix ? ` Fix: ${r.fix}` : ""}`) : ["• Clean, the right length, with a key detail. Nice."]),
      "For the full check (points, description, images) and the **Fix it to 100%** button, open the listing checker.",
    ].join("\n"),
    actions: [{ label: "Open listing checker", href: "#listing-check" }],
    chips: ["Check another title", "Talk to a person"],
  };
}

const SERVICE_ANSWERS: [string[], string][] = [
  [["website", "web site", "store", "shopify", "woocommerce", "wordpress", "ecommerce site", "e-commerce site"], "We build **e-commerce websites** on Shopify, WooCommerce or fully custom (Next.js) — fast pages, payments, shipping, WhatsApp ordering and an admin panel. Price and timeline depend on products and features; you get a written plan and quote before any work starts."],
  [["seo", "google ranking", "rank", "search engine"], "Our **SEO** work covers technical fixes, product and category pages that rank, and content that answers what buyers search — reported monthly."],
  [["social", "instagram", "facebook", "reels", "content calendar"], "For **social media marketing** we plan a monthly calendar, make reels and posts in your brand voice, publish, reply, and report results every month."],
  [["ads", "advertis", "meta ads", "google ads", "performance", "ppc", "campaign"], "Our **performance marketing** runs Meta and Google ads planned around profit, with weekly numbers you can read."],
  [["app", "android", "ios", "flutter", "mobile"], "We build **mobile apps** for Android and iOS with Flutter — ordering, bookings, subscriptions, loyalty."],
  [["chatbot", "bot", "automation", "whatsapp bot", "ai assistant"], "We build **AI chatbots and automation** for websites and WhatsApp — like me! They answer, take orders and pass hot leads to your team."],
  [["design", "creative", "banner", "photo", "graphic", "a+"], "Our **creative & content** team makes product images, banners, A+ style content and ad creatives that look like one brand."],
];

/** One conversational turn. Pure function — easy to test. */
export function iqReply(state: IQState, raw: string): IQTurn {
  const text = raw.trim();
  const t = norm(text);
  const s: IQState = { ...state, lead: { ...state.lead } };
  const say = (m: Omit<IQMessage, "ts" | "from">): IQTurn => ({ messages: [{ from: "iq", ...m }], state: s });

  if (has(t, "cancel", "stop", "never mind", "nevermind") && s.stage !== "idle") { s.stage = "idle"; return say({ text: "No problem — cancelled. Anything else?", chips: MAIN_CHIPS }); }

  // ---- Enquiry collection ----
  if (s.stage === "lead_name") {
    if (text.length < 2) return say({ text: "What name should we use?" });
    s.lead.name = text.replace(/^(my name is|i am|im|this is)\s+/i, "").slice(0, 60); s.stage = "lead_phone";
    return say({ text: `Thanks, ${s.lead.name.split(" ")[0]}. Your phone or WhatsApp number?` });
  }
  if (s.stage === "lead_phone") {
    const ph = text.replace(/[^\d+]/g, "");
    if (ph.replace(/\D/g, "").length < 10) return say({ text: "That doesn't look like a full number — please send it with at least 10 digits." });
    s.lead.phone = text.trim(); s.stage = "lead_email";
    return say({ text: "And your email?" });
  }
  if (s.stage === "lead_email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text)) return say({ text: "Please send a valid email address, like name@business.com." });
    s.lead.email = text; s.stage = "lead_need";
    return say({ text: "Last one — what do you need help with?", chips: [...SERVICES] });
  }
  if (s.stage === "lead_need") {
    const interest = SERVICES.find((x) => norm(x) === t) ?? SERVICES.find((x) => t && norm(x).includes(t)) ?? "Something else";
    s.stage = "idle";
    const lead = { name: s.lead.name!, phone: s.lead.phone!, email: s.lead.email!, interest };
    s.lead = {};
    return { messages: [{ from: "iq", text: "Sending your details to the team…" }], state: s, submit: lead };
  }

  // ---- Intents ----
  if (/^(hi|hello|hey|hai|vanakkam|good (morning|afternoon|evening))\b/.test(t)) return say({ text: "Hello! How can I help today?", chips: MAIN_CHIPS });
  if (has(t, "thank", "thanks", "thx", "great", "awesome", "super")) return say({ text: "Happy to help! Anything else?", chips: MAIN_CHIPS });
  if (has(t, "person", "human", "call me", "callback", "call back", "talk to", "contact", "enquiry", "consultation", "quote", "proposal", "hire")) {
    s.stage = "lead_name";
    return say({ text: "I'll get a person from our team to call you. What's your name? (Type *cancel* any time.)", actions: [{ label: "WhatsApp us now", href: `https://wa.me/${SITE.contact.whatsapp}`, external: true }, { label: `Call ${SITE.contact.phones[0]}`, href: `tel:${SITE.contact.phones[0].replace(/[^+\d]/g, "")}` }] });
  }
  if (has(t, "phone", "number", "email", "mail", "whatsapp", "reach")) {
    return say({ text: `You can reach us at:\n• Phone: ${SITE.contact.phones.join(" / ")}\n• WhatsApp: ${SITE.contact.phones[0]}${SITE.contact.emails.length ? `\n• Email: ${SITE.contact.emails.join(" / ")}` : ""}`, actions: [{ label: "WhatsApp", href: `https://wa.me/${SITE.contact.whatsapp}`, external: true }, { label: "Email", href: `mailto:${SITE.contact.email}` }] });
  }
  if (has(t, "where", "location", "address", "office", "chennai")) return say({ text: `We're based in ${SITE.location.address || SITE.location.city}, and work with clients across India and abroad — online, or in person in Tamil Nadu.` });

  // Title check: "check: <title>" or a pasted long line after asking
  const titleMatch = text.match(/^(?:check|title|listing)\s*[:\-]\s*(.{10,})$/i);
  if (titleMatch) return say(titleCheck(titleMatch[1], (findMarket(norm(titleMatch[1])) as Marketplace) ?? "amazon"));
  if (has(t, "check my product title", "check another title", "listing check", "check my listing", "check title")) {
    return say({ text: "Paste your title like this:\n**check: Cotton Kurta for Men, Regular Fit, Navy Blue, Size M**\nI'll score it for Amazon (add *flipkart* or *myntra* to check for those)." });
  }

  // Fee calculation
  const market = findMarket(t);
  const price = findPrice(t);
  if (market && (has(t, "fee", "fees", "commission", "charges", "calculator", "calculate", "how much") || price !== undefined)) {
    s.lastCalc = market;
    if (price === undefined) return say({ text: `Sure — what's your selling price on ${FEE_CONFIGS[market].name}? (e.g. *${FEE_CONFIGS[market].currency === "USD" ? "$40" : "₹999"}*). You can add the category and weight too, like *₹999 saree 600 g*.` });
    return say(feeAnswer(market, price, t));
  }
  if (s.lastCalc && price !== undefined && !has(t, "seller", "sellers", "entraiq")) return say(feeAnswer(s.lastCalc, price, t));
  if (has(t, "try another price")) return say({ text: `Send the new price${s.lastCalc ? ` for ${FEE_CONFIGS[s.lastCalc].name}` : " and marketplace"}, e.g. *₹1499*.` });
  if (has(t, "fee", "fees", "commission", "calculator")) return say({ text: "Which marketplace? I can do Amazon, Flipkart, Meesho, JioMart, eBay, Etsy, Blinkit, Zepto and Swiggy Instamart.", chips: ["Amazon fee for ₹999", "Flipkart fee for ₹999", "Meesho fee for ₹399", "Blinkit fee for ₹199"] });

  // Shalini_IQ
  const sellers = findSellers(t);
  if (has(t, "entraiq", "platform", "dashboard", "agency software") || sellers !== undefined) {
    if (sellers !== undefined || has(t, "price", "cost", "pricing", "charge")) {
      const n = sellers ?? 20;
      const q = quote(n);
      return say({ text: `**Shalini_IQ for ${n} seller${n === 1 ? "" : "s"}:** ${inr(q.monthly)}/month + GST (${inr(PRICING.platformFee)} platform + ${n} × ${inr(PRICING.perSeller)}), plus a one-time setup of ${inr(PRICING.setupFee)}. Pay 12 months ahead and save ${PRICING.prepayDiscount * 100}%.`, actions: [{ label: "See pricing", href: "#pricing" }, { label: "Start a workspace", href: "/signup" }], chips: ["Shalini_IQ price for 50 sellers", "What does Shalini_IQ do?", "Talk to a person"] });
    }
    return say({ text: "**Shalini_IQ** is our platform for marketplace agencies: every seller's Amazon, Flipkart, Myntra and Meta numbers, listing checks, creatives and branded reports in one workspace. The preview uses sample data; live connections switch on during setup.", actions: [{ label: "Open the preview", href: "/login" }, { label: "Pricing", href: "#pricing" }], chips: ["Shalini_IQ price for 20 sellers", "Talk to a person"] });
  }

  for (const [words, answer] of SERVICE_ANSWERS) if (has(t, ...words)) return say({ text: answer, chips: ["Talk to a person", "See your work", "What do you do?"] });

  if (has(t, "what do you do", "services", "service", "offer", "help with")) {
    return say({ text: "Shalini_IQ helps brands grow online:\n• E-commerce websites\n• SEO\n• Social media marketing\n• Performance marketing (Meta & Google ads)\n• Creative & content\n• Mobile apps\n• AI chatbots & automation\n• Shalini_IQ, our platform for marketplace agencies\nWhich one interests you?", chips: ["Website", "SEO", "Social media", "Shalini_IQ", "Talk to a person"] });
  }
  if (has(t, "work", "portfolio", "clients", "projects", "see your work", "examples")) {
    return say({ text: "We share examples that match your business on a short call. Leave your details and we'll reach out.", actions: [{ label: "Request a call", href: "#enquiry" }] });
  }

  if (has(t, "price", "cost", "how much", "budget", "charges")) return say({ text: "Website and marketing prices depend on what you need, so we send a written quote after a short call — no obligation. Shalini_IQ has fixed pricing: ask me *Shalini_IQ price for 20 sellers*.", chips: ["Talk to a person", "Shalini_IQ price for 20 sellers"] });
  if (has(t, "how long", "timeline", "time take", "days", "weeks")) return say({ text: "It depends on scope. You get a written timeline with milestones in your proposal before any work starts.", chips: ["Talk to a person"] });
  if (has(t, "refund", "cancel")) return say({ text: "Our refund & cancellation policy is here.", actions: [{ label: "Refund policy", href: "/refund-policy" }] });
  if (has(t, "privacy", "data")) return say({ text: "We only use what you send us to reply to you; full details are in our privacy policy.", actions: [{ label: "Privacy policy", href: "/privacy" }] });
  if (has(t, "who are you", "are you human", "are you a bot", "your name")) return say({ text: "I'm **IQ**, Shalini_IQ's automated assistant. I answer instantly from what's on this site — for anything else, I can get a person to call you.", chips: ["Talk to a person"] });

  return say({ text: "I'm not sure I got that. I can help with our services, marketplace fees, Shalini_IQ pricing, checking a product title, or getting a person to call you.", chips: MAIN_CHIPS });
}
