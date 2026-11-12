/**
 * Marketplace fee calculators — one engine, one config per marketplace.
 *
 * RATES ARE DEFAULTS, NOT A RATE CARD. Marketplaces change fees often and differ by category and seller.
 * Each default below carries its basis; "estimate" marks figures where public sources disagree or are silent.
 * Every rate is editable in the calculator. Update the defaults here only. Checked: November 2026.
 */
export type CalcId = "amazon" | "flipkart" | "meesho" | "jiomart" | "ebay" | "etsy" | "blinkit" | "zepto" | "instamart";
export type Zone = "local" | "regional" | "national";
export type Currency = "INR" | "USD";

export interface Category { id: string; label: string; commission: number; zeroUnder?: number; zeroAlways?: boolean }
export interface Slab { upTo: number; fee: number } // price slab (₹) → flat fee
export interface ShipTable { firstHalfKg: Record<Zone, number>; upTo1Kg: Record<Zone, number>; perExtraHalfKg: Record<Zone, number> }

export interface FeeConfig {
  id: CalcId;
  name: string;
  group: "ecommerce" | "quick";
  currency: Currency;
  blurb: string;
  categories: Category[];
  fixedFee?: Slab[];
  shipping?: ShipTable | "manual";
  shippingDefault?: number; // manual shipping default per order
  collectionPct?: number;
  perOrderFee?: { upTo: number; fee: number; above: number }; // eBay-style, in config currency
  listingFee?: number; // per sale, config currency
  paymentPct?: number;
  paymentFixed?: number;
  extraPct?: { label: string; pct: number }[]; // regulatory, international etc. on sale total
  perUnitFee?: { label: string; fee: number }; // quick-commerce inwarding
  promoPct?: number; // quick-commerce marketing spend share
  smallOrderShipDiscount?: { under: number; pct: number };
  feesOnTotalWithShipping?: boolean; // Etsy & eBay charge % on item + shipping
  gstOnFees: boolean; // Indian marketplaces charge 18% GST on their fees (claimable with GST registration)
  withholding: boolean; // TCS 0.5% (GST) + TDS 0.1% (194-O) on Indian marketplace sales — claimable, not a cost
  sources: { label: string; url: string }[];
  notes: string[];
}

const T = (l: number, r: number, n: number): Record<Zone, number> => ({ local: l, regional: r, national: n });

export const FEE_CONFIGS: Record<CalcId, FeeConfig> = {
  amazon: {
    id: "amazon", name: "Amazon.in", group: "ecommerce", currency: "INR",
    blurb: "Referral, closing and Easy Ship weight-handling fees.",
    categories: [
      { id: "fashion", label: "Fashion & apparel", commission: 0.17, zeroUnder: 1000 },
      { id: "home", label: "Home & kitchen", commission: 0.13, zeroUnder: 1000 },
      { id: "beauty", label: "Beauty & personal care", commission: 0.08, zeroUnder: 1000 },
      { id: "electronics", label: "Electronics accessories", commission: 0.09, zeroUnder: 1000 },
      { id: "grocery", label: "Grocery", commission: 0.08, zeroUnder: 1000 },
      { id: "books", label: "Books", commission: 0.05, zeroUnder: 1000 },
      { id: "sports", label: "Sports & fitness", commission: 0.12, zeroUnder: 1000 },
    ],
    // Base slabs from public 2026 fee guides, plus the +₹1 (≤₹500) / +₹3 (>₹500) change of 7 Sep 2026. >₹1,000 is an estimate.
    fixedFee: [{ upTo: 250, fee: 6 }, { upTo: 500, fee: 11 }, { upTo: 1000, fee: 23 }, { upTo: Infinity, fee: 53 }],
    shipping: { firstHalfKg: T(29, 43, 63), upTo1Kg: T(41, 65, 97), perExtraHalfKg: T(13, 19, 31) },
    smallOrderShipDiscount: { under: 300, pct: 0.2 },
    gstOnFees: true, withholding: true,
    sources: [
      { label: "Amazon zero referral fee under ₹1,000 (from 16 Mar 2026)", url: "https://yourstory.com/2026/03/amazon-india-expands-zero-referral-fees-125-crore-products-flipkarts-commission-waiver" },
      { label: "Amazon India fee changes 2026", url: "https://ecomfriendly.com/blog/amazon-india-seller-fee-changes-2026" },
      { label: "Amazon fee breakdown 2026", url: "https://swcybernetics.in/knowledge-base/amazon-seller-fees-india-complete-breakdown" },
    ],
    notes: ["Zero referral fee applies to most products under ₹1,000; untick it if your category is excluded.", "Closing fee above ₹1,000 is an estimate.", "Easy Ship fee is reduced 20% for items under ₹300."],
  },
  flipkart: {
    id: "flipkart", name: "Flipkart", group: "ecommerce", currency: "INR",
    blurb: "Commission, fixed fee, collection fee and shipping.",
    categories: [
      { id: "fashion", label: "Fashion (clothing, footwear, accessories)", commission: 0.15, zeroAlways: true },
      { id: "home", label: "Home & kitchen", commission: 0.12, zeroUnder: 1000 },
      { id: "beauty", label: "Beauty & personal care", commission: 0.09, zeroUnder: 1000 },
      { id: "electronics", label: "Electronics & accessories", commission: 0.09, zeroUnder: 1000 },
      { id: "grocery", label: "Grocery & gourmet", commission: 0.07, zeroUnder: 1000 },
      { id: "books", label: "Books", commission: 0.1, zeroUnder: 1000 },
      { id: "sports", label: "Sports & fitness", commission: 0.11, zeroUnder: 1000 },
    ],
    fixedFee: [{ upTo: 300, fee: 5 }, { upTo: 500, fee: 10 }, { upTo: 1000, fee: 20 }, { upTo: Infinity, fee: 30 }], // estimate within the public ₹5–₹30 range
    shipping: { firstHalfKg: T(29, 44, 65), upTo1Kg: T(40, 60, 85), perExtraHalfKg: T(8, 10, 13) },
    collectionPct: 0.02,
    gstOnFees: true, withholding: true,
    sources: [
      { label: "Flipkart zero commission across all fashion (8 Jul 2026)", url: "https://stories.flipkart.com/announcement/flipkart-expands-zero-commission-across-fashion-empowering-sellers-and-accelerating-the-growth-of-india-s-fashion-ecosystem" },
      { label: "Flipkart zero commission under ₹1,000", url: "https://www.business-standard.com/amp/companies/news/flipkart-zero-commission-value-commerce-125111401468_1.html" },
      { label: "Flipkart fees 2026", url: "https://swcybernetics.in/knowledge-base/flipkart-commission-rates-seller-fees-2026" },
    ],
    notes: ["Fashion has zero commission at every price; other categories under ₹1,000 have zero commission.", "Fixed fee slabs and the per-extra-500g shipping rate are estimates."],
  },
  meesho: {
    id: "meesho", name: "Meesho", group: "ecommerce", currency: "INR",
    blurb: "Zero commission — your real costs are shipping and returns.",
    categories: [{ id: "all", label: "All categories", commission: 0 }],
    shipping: "manual", shippingDefault: 0, collectionPct: 0,
    gstOnFees: true, withholding: true,
    sources: [{ label: "Meesho seller fees 2026", url: "https://ecomcalctools.com/in/blog/meesho-seller-fees-2026/" }],
    notes: ["Meesho charges 0% commission and 0 collection fee.", "Enter any shipping you bear and a return allowance from your own settlement reports."],
  },
  jiomart: {
    id: "jiomart", name: "JioMart", group: "ecommerce", currency: "INR",
    blurb: "Category commission, fixed fee and shipping.",
    categories: [
      { id: "grocery", label: "Grocery & FMCG", commission: 0.05 },
      { id: "home", label: "Home & kitchen", commission: 0.1 },
      { id: "fashion", label: "Fashion & lifestyle", commission: 0.12 },
      { id: "electronics", label: "Electronics", commission: 0.08 },
    ],
    fixedFee: [{ upTo: 500, fee: 10 }, { upTo: Infinity, fee: 20 }], // estimate — JioMart shows exact slabs in the Seller Dashboard Bill Plan
    shipping: "manual", shippingDefault: 55, collectionPct: 0,
    gstOnFees: true, withholding: true,
    sources: [{ label: "JioMart seller fees", url: "https://unicommerce.com/blog/jiomart-seller-registration-how-to-sell-on-jiomart/" }],
    notes: ["Commission is 1%–15% by category; the defaults are mid-range estimates.", "Exact fixed fee and shipping are in your Seller Dashboard → Bill Plan."],
  },
  ebay: {
    id: "ebay", name: "eBay (export)", group: "ecommerce", currency: "USD",
    blurb: "Selling abroad on eBay.com: final value fee and per-order fee.",
    categories: [{ id: "most", label: "Most categories", commission: 0.136 }],
    shipping: "manual", shippingDefault: 0,
    perOrderFee: { upTo: 10, fee: 0.3, above: 0.4 },
    extraPct: [{ label: "International fee (if it applies to you)", pct: 0 }],
    feesOnTotalWithShipping: true,
    gstOnFees: false, withholding: false,
    sources: [{ label: "eBay seller fees 2026", url: "https://underpriced.app/blog/ebay-seller-fees-2026" }],
    notes: ["eBay.in closed in 2017; Indian sellers export through eBay.com.", "International fees depend on your registered address — add yours if it applies."],
  },
  etsy: {
    id: "etsy", name: "Etsy", group: "ecommerce", currency: "USD",
    blurb: "Listing, transaction, payment processing and regulatory fees.",
    categories: [{ id: "all", label: "All categories", commission: 0.065 }],
    shipping: "manual", shippingDefault: 0,
    listingFee: 0.2, paymentPct: 0.05, paymentFixed: 0,
    extraPct: [{ label: "Regulatory operating fee (India)", pct: 0.0029 }, { label: "Currency conversion (if shop ≠ buyer currency)", pct: 0 }],
    feesOnTotalWithShipping: true,
    gstOnFees: false, withholding: false,
    sources: [{ label: "Etsy fees 2026", url: "https://calcmatic.pages.dev/articles/etsy-fees-guide-2026/" }],
    notes: ["Payment processing for India sellers is an estimate — check Etsy Payments for your shop.", "Offsite Ads (12–15%, capped) are not included."],
  },
  blinkit: {
    id: "blinkit", name: "Blinkit", group: "quick", currency: "INR",
    blurb: "Negotiated commission, inwarding and promotion spend.",
    categories: [{ id: "fmcg", label: "FMCG / general", commission: 0.17 }, { id: "care", label: "Personal care", commission: 0.26 }],
    perUnitFee: { label: "Inwarding per unit", fee: 3.5 }, promoPct: 0.1,
    gstOnFees: true, withholding: true,
    sources: [{ label: "Quick-commerce fee ranges 2026", url: "https://swcybernetics.in/knowledge-base/swiggy-instamart-commission-rates-fee-structure-2026" }],
    notes: ["Quick-commerce commissions are negotiated per brand; defaults are mid-points of reported ranges (FMCG 14–20%, personal care 22–30%)."],
  },
  zepto: {
    id: "zepto", name: "Zepto", group: "quick", currency: "INR",
    blurb: "Negotiated commission, inwarding and promotion spend.",
    categories: [{ id: "fmcg", label: "FMCG / general", commission: 0.185 }, { id: "care", label: "Personal care", commission: 0.24 }],
    perUnitFee: { label: "Inwarding per unit", fee: 4 }, promoPct: 0.1,
    gstOnFees: true, withholding: true,
    sources: [{ label: "Quick-commerce fee ranges 2026", url: "https://swcybernetics.in/knowledge-base/swiggy-instamart-commission-rates-fee-structure-2026" }],
    notes: ["Reported ranges: FMCG 15–22%, personal care 20–28%. Use your own contract rate."],
  },
  instamart: {
    id: "instamart", name: "Swiggy Instamart", group: "quick", currency: "INR",
    blurb: "Negotiated commission, inwarding and promotion spend.",
    categories: [{ id: "fmcg", label: "FMCG / general", commission: 0.165 }, { id: "grocery", label: "Groceries", commission: 0.15 }, { id: "care", label: "Personal care", commission: 0.24 }],
    perUnitFee: { label: "Inwarding per unit", fee: 3 }, promoPct: 0.1,
    gstOnFees: true, withholding: true,
    sources: [{ label: "Quick-commerce fee ranges 2026", url: "https://swcybernetics.in/knowledge-base/swiggy-instamart-commission-rates-fee-structure-2026" }],
    notes: ["Reported ranges: FMCG 15–18%, groceries 12–18%, personal care 20–28%. Use your own contract rate."],
  },
};

export const ECOMMERCE_CALCS: CalcId[] = ["amazon", "flipkart", "meesho", "jiomart", "ebay", "etsy"];
export const QUICK_CALCS: CalcId[] = ["blinkit", "zepto", "instamart"];
export const isCalcId = (s: string): s is CalcId => s in FEE_CONFIGS;

export interface FeeInput {
  price: number; // selling price incl. GST (or USD price for export)
  shippingCharged?: number; // buyer-paid shipping (eBay/Etsy)
  cost: number; // your cost per unit, excl. GST, same currency as price (₹ for INR, $ for USD)
  categoryId: string;
  commissionPct?: number; // override
  zeroCommission?: boolean; // override of the zero-commission rule
  weightGrams?: number;
  zone?: Zone;
  shippingManual?: number;
  productGstPct?: number; // 0, 0.05, 0.18, 0.4
  returnAllowancePct?: number;
  promoPct?: number;
  extraPctOverrides?: number[];
  paymentPct?: number;
}

export interface FeeLine { label: string; amount: number }
export interface FeeResult {
  currency: Currency;
  lines: FeeLine[];
  feesExGst: number;
  gstOnFees: number;
  totalDeductions: number;
  withheld: number; // TCS+TDS, claimable
  payout: number; // what reaches your bank per unit
  profit: number; // after GST credit and claimable taxes, minus cost and output GST
  margin: number | null; // profit ÷ selling price
  commissionUsed: number;
  zeroApplied: boolean;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const slabFee = (slabs: Slab[] | undefined, price: number) => (slabs ? slabs.find((s) => price <= s.upTo)?.fee ?? 0 : 0);

export function shippingFor(table: ShipTable, grams: number, zone: Zone): number {
  const g = Math.max(1, grams);
  if (g <= 500) return table.firstHalfKg[zone];
  if (g <= 1000) return table.upTo1Kg[zone];
  return table.upTo1Kg[zone] + Math.ceil((g - 1000) / 500) * table.perExtraHalfKg[zone];
}

export function calculate(cfg: FeeConfig, input: FeeInput): FeeResult {
  const price = Math.max(0, input.price || 0);
  const shipCharged = Math.max(0, input.shippingCharged || 0);
  const cat = cfg.categories.find((c) => c.id === input.categoryId) ?? cfg.categories[0];
  const ruleZero = !!cat.zeroAlways || (cat.zeroUnder !== undefined && price > 0 && price < cat.zeroUnder);
  const zeroApplied = input.zeroCommission ?? ruleZero;
  const commissionUsed = zeroApplied ? 0 : input.commissionPct ?? cat.commission;
  const base = cfg.feesOnTotalWithShipping ? price + shipCharged : price;
  const lines: FeeLine[] = [];

  lines.push({ label: cfg.group === "quick" ? "Commission" : cfg.id === "amazon" ? "Referral fee" : cfg.id === "ebay" ? "Final value fee" : cfg.id === "etsy" ? "Transaction fee" : "Commission", amount: r2(base * commissionUsed) });
  const fixed = slabFee(cfg.fixedFee, price);
  if (cfg.fixedFee) lines.push({ label: cfg.id === "amazon" ? "Closing fee" : "Fixed fee", amount: fixed });

  if (cfg.shipping && cfg.shipping !== "manual") {
    let ship = shippingFor(cfg.shipping, input.weightGrams ?? 500, input.zone ?? "national");
    if (cfg.smallOrderShipDiscount && price < cfg.smallOrderShipDiscount.under) ship = ship * (1 - cfg.smallOrderShipDiscount.pct);
    lines.push({ label: cfg.id === "amazon" ? "Weight handling (Easy Ship)" : "Shipping fee", amount: r2(ship) });
  } else if (cfg.shipping === "manual") {
    const s = Math.max(0, input.shippingManual ?? cfg.shippingDefault ?? 0);
    if (s > 0) lines.push({ label: "Shipping you pay", amount: r2(s) });
  }
  if (cfg.collectionPct) lines.push({ label: "Collection fee", amount: r2(price * cfg.collectionPct) });
  if (cfg.perOrderFee) lines.push({ label: "Per-order fee", amount: base <= cfg.perOrderFee.upTo ? cfg.perOrderFee.fee : cfg.perOrderFee.above });
  if (cfg.listingFee) lines.push({ label: "Listing fee", amount: cfg.listingFee });
  if (cfg.paymentPct !== undefined) {
    const p = input.paymentPct ?? cfg.paymentPct;
    lines.push({ label: "Payment processing", amount: r2(base * p + (cfg.paymentFixed ?? 0)) });
  }
  cfg.extraPct?.forEach((x, i) => {
    const p = input.extraPctOverrides?.[i] ?? x.pct;
    if (p > 0) lines.push({ label: x.label.replace(/ \(.*\)$/, ""), amount: r2(base * p) });
  });
  if (cfg.perUnitFee) lines.push({ label: cfg.perUnitFee.label, amount: cfg.perUnitFee.fee });
  const promo = input.promoPct ?? cfg.promoPct;
  if (promo) lines.push({ label: "Promotion spend", amount: r2(price * promo) });
  const ret = input.returnAllowancePct ?? 0;
  if (ret > 0) lines.push({ label: "Return allowance", amount: r2(price * ret) });

  const feesExGst = r2(lines.reduce((a, l) => a + l.amount, 0));
  // GST is charged on marketplace fees, not on your own shipping or return allowance.
  const gstBase = lines.filter((l) => l.label !== "Shipping you pay" && l.label !== "Return allowance" && l.label !== "Promotion spend").reduce((a, l) => a + l.amount, 0);
  const gstOnFees = cfg.gstOnFees ? r2(gstBase * 0.18) : 0;
  const totalDeductions = r2(feesExGst + gstOnFees);
  const g = Math.max(0, input.productGstPct ?? (cfg.currency === "INR" ? 0.05 : 0));
  const taxable = price / (1 + g);
  const withheld = cfg.withholding ? r2(taxable * 0.005 + taxable * 0.001) : 0;
  const payout = r2(price + shipCharged - totalDeductions - withheld);
  // Profit for a GST-registered seller: GST on fees and withheld TCS/TDS come back as credit; output GST on the sale is owed.
  const profit = r2(taxable + shipCharged - feesExGst - Math.max(0, input.cost || 0));
  return { currency: cfg.currency, lines, feesExGst, gstOnFees, totalDeductions, withheld, payout, profit, margin: price > 0 ? profit / price : null, commissionUsed, zeroApplied };
}
