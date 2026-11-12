import type { Client, Employee } from "./types";

/** Fictional agency staff and client businesses used only for the demo environment. */
export const EMPLOYEES: Employee[] = [
  { id: "e1", name: "Ananya Rao", title: "Agency Admin", email: "ananya@entraiot.example" },
  { id: "e2", name: "Rohit Menon", title: "Account Manager", email: "rohit@entraiot.example" },
  { id: "e3", name: "Sneha Kulkarni", title: "Performance Marketer", email: "sneha@entraiot.example" },
  { id: "e4", name: "Imran Sheikh", title: "Marketplace Specialist", email: "imran@entraiot.example" },
  { id: "e5", name: "Divya Nair", title: "Creative Designer", email: "divya@entraiot.example" },
  { id: "e6", name: "Karthik Iyer", title: "Data Analyst", email: "karthik@entraiot.example" },
];

export const CLIENTS: Client[] = [
  { id: "aarvi", name: "Aarvi Living", industry: "Home & Kitchen", city: "Bengaluru", since: "2024-03-12", status: "active", contact: { name: "Meera Shetty", email: "meera@aarviliving.example" }, team: ["e2", "e3", "e4", "e5"], hue: 28, retainer: 185000, demoData: true },
  { id: "tarang", name: "Tarang Naturals", industry: "Beauty & Personal Care", city: "Jaipur", since: "2024-09-02", status: "active", contact: { name: "Vikram Rathore", email: "vikram@tarangnaturals.example" }, team: ["e2", "e3", "e6"], hue: 150, retainer: 120000, demoData: true },
  { id: "kridha", name: "Kridha Active", industry: "Sports & Fitness", city: "Pune", since: "2025-01-20", status: "active", contact: { name: "Aditi Deshmukh", email: "aditi@kridhaactive.example" }, team: ["e1", "e4", "e5", "e6"], hue: 255, retainer: 140000, demoData: true },
];

/** [name, category, price, amazon units/day, flipkart factor (0 = not listed), daily growth %, conversion rate, amazon days of cover] */
export type ProductSeed = [string, string, number, number, number, number, number, number];
export const PRODUCT_SEEDS: Record<string, { prefix: string; items: ProductSeed[] }> = {
  aarvi: {
    prefix: "AVL",
    items: [
      ["Tri-Ply Stainless Kadhai 24 cm", "Cookware", 1899, 9, 0.6, 0.1, 0.11, 34],
      ["Cast Iron Dosa Tawa 28 cm", "Cookware", 1499, 7, 0.5, 0.6, 0.12, 9],
      ["Borosilicate Lunch Box Set of 3", "Storage", 899, 14, 0.8, 0, 0.14, 40],
      ["Airtight Container Set of 12", "Storage", 1299, 8, 0.7, -0.1, 0.1, 60],
      ["Insulated Steel Bottle 1 L", "Drinkware", 699, 18, 0.9, 0.2, 0.15, 25],
      ["Copper Water Bottle 950 ml", "Drinkware", 849, 6, 0, 0.3, 0.13, 45],
      ["Bamboo Cutting Board Large", "Kitchen Tools", 599, 9, 0.5, 0, 0.12, 30],
      ["Knife Set with Block, 6 pc", "Kitchen Tools", 1799, 4, 0.4, -0.7, 0.06, 120],
      ["Cotton Bedsheet King 300 TC", "Home Linen", 1599, 6, 0.9, 0.1, 0.08, 38],
      ["Microfibre Bath Towel Pack of 2", "Home Linen", 749, 10, 1.1, 0, 0.12, 5],
      ["Ceramic Dinner Set, 18 pc", "Dining", 3499, 2.5, 0.5, 0.2, 0.05, 50],
      ["Spice Rack Organiser, 16 jar", "Storage", 1199, 5, 0.6, -0.2, 0.09, 33],
    ],
  },
  tarang: {
    prefix: "TRN",
    items: [
      ["Vitamin C Face Serum 30 ml", "Skincare", 549, 22, 0.7, 0.5, 0.16, 12],
      ["Kumkumadi Night Cream 50 g", "Skincare", 699, 9, 0.6, 0.1, 0.11, 40],
      ["Aloe Vera Gel 200 ml", "Skincare", 249, 30, 1.0, 0, 0.18, 28],
      ["Onion Hair Oil 200 ml", "Haircare", 399, 20, 0.9, -0.1, 0.14, 35],
      ["Bhringraj Shampoo 300 ml", "Haircare", 449, 12, 0.8, 0.2, 0.12, 8],
      ["Rosemary Hair Mist 100 ml", "Haircare", 349, 8, 0, 0.8, 0.15, 30],
      ["Ubtan Face Wash 100 ml", "Skincare", 299, 16, 0.8, 0, 0.15, 45],
      ["Sunscreen SPF 50 Gel 50 g", "Skincare", 499, 14, 0.7, -0.6, 0.1, 110],
      ["Lip Balm Trio", "Lip Care", 399, 7, 0.5, 0.3, 0.13, 55],
      ["Charcoal Body Wash 250 ml", "Bath & Body", 349, 10, 1.0, 0, 0.12, 26],
      ["Handmade Soap Box of 6", "Bath & Body", 599, 5, 0.6, -0.2, 0.09, 70],
      ["Beard Growth Oil 30 ml", "Men's Grooming", 449, 6, 0.9, 0.1, 0.1, 4],
    ],
  },
  kridha: {
    prefix: "KRA",
    items: [
      ["Anti-Slip Yoga Mat 6 mm", "Yoga", 899, 15, 0.8, 0.2, 0.12, 30],
      ["Resistance Band Set of 5", "Strength", 649, 14, 0.9, 0.5, 0.14, 11],
      ["Adjustable Dumbbells 10 kg Pair", "Strength", 2499, 4, 0.6, 0.1, 0.06, 42],
      ["Speed Skipping Rope", "Cardio", 349, 16, 1.0, 0, 0.16, 36],
      ["Foam Roller 45 cm", "Recovery", 799, 6, 0.5, 0.2, 0.1, 48],
      ["Gym Duffel Bag 35 L", "Bags", 1299, 5, 0.7, -0.5, 0.07, 130],
      ["Shaker Bottle 700 ml", "Accessories", 399, 18, 0.9, 0, 0.15, 22],
      ["Push-Up Board 9-in-1", "Strength", 999, 7, 0, 0.6, 0.11, 40],
      ["Kettlebell 8 kg", "Strength", 1599, 3.5, 0.5, 0, 0.07, 6],
      ["Yoga Block Pair", "Yoga", 499, 6, 0.6, 0.1, 0.11, 60],
      ["Compression Knee Sleeve Pair", "Recovery", 549, 9, 0.8, 0.3, 0.12, 27],
      ["Ab Wheel Roller", "Strength", 599, 8, 0.7, -0.3, 0.11, 33],
    ],
  },
};

/**
 * Campaign templates. `share` is daily budget as a fraction of the reference revenue base
 * (A = Amazon daily sales, F = Flipkart daily sales, T = total). `p` = product index used in the name/targeting.
 */
export interface CampaignSeed {
  platform: "amazon_ads" | "flipkart_ads" | "meta";
  name: string;
  objective: string;
  base: "A" | "F" | "T";
  share: number;
  roas: number;
  cpc: number;
  ctr: number;
  util: number;
  dest: "amazon" | "flipkart";
  p?: number;
  startOffset?: number;
  endOffset?: number;
  status?: "paused";
  adsets?: [string, string][]; // [name, audience]
}
export const CAMPAIGN_SEEDS: CampaignSeed[] = [
  { platform: "amazon_ads", name: "SP | {p} | Exact", objective: "Sponsored Products", base: "A", share: 0.02, roas: 5.2, cpc: 9.5, ctr: 0.0062, util: 0.94, dest: "amazon", p: 0 },
  { platform: "amazon_ads", name: "SP | Catalogue | Auto", objective: "Sponsored Products", base: "A", share: 0.022, roas: 3.7, cpc: 7.2, ctr: 0.0041, util: 0.88, dest: "amazon" },
  { platform: "amazon_ads", name: "SB | Brand Store | Video", objective: "Sponsored Brands", base: "A", share: 0.016, roas: 3.0, cpc: 12.5, ctr: 0.0085, util: 0.8, dest: "amazon" },
  { platform: "amazon_ads", name: "SP | {p} | Broad", objective: "Sponsored Products", base: "A", share: 0.014, roas: 1.25, cpc: 11.8, ctr: 0.0033, util: 0.97, dest: "amazon", p: 7 },
  { platform: "flipkart_ads", name: "PLA | Best Sellers | Search", objective: "Product Listing Ads", base: "F", share: 0.04, roas: 4.3, cpc: 6.4, ctr: 0.011, util: 0.9, dest: "flipkart" },
  { platform: "flipkart_ads", name: "PCA | Brand Banner", objective: "Product Contextual Ads", base: "F", share: 0.022, roas: 2.3, cpc: 8.8, ctr: 0.006, util: 0.76, dest: "flipkart" },
  { platform: "meta", name: "Prospecting | {c} | Broad", objective: "Sales", base: "T", share: 0.01, roas: 2.4, cpc: 9.2, ctr: 0.013, util: 0.93, dest: "amazon", adsets: [["Broad 22–45 · Metros", "Advantage+ audience, top 8 metros"], ["Interest · {c}", "Interest stack, all India"]] },
  { platform: "meta", name: "Retargeting | Catalogue | 30d", objective: "Sales", base: "T", share: 0.006, roas: 4.2, cpc: 11.5, ctr: 0.019, util: 0.71, dest: "amazon", adsets: [["Viewed product · 14d", "Collaborative ads catalogue viewers"], ["Add to cart · 30d", "Cart abandoners"]] },
  { platform: "meta", name: "Advantage+ | Festive Offers", objective: "Sales", base: "T", share: 0.008, roas: 2.9, cpc: 7.9, ctr: 0.016, util: 0.96, dest: "flipkart", startOffset: 46, adsets: [["Advantage+ Shopping", "Automated placements"], ["Lookalike 1% · Purchasers", "Seed: 180d purchasers"]] },
  { platform: "meta", name: "Reels | {p} | UGC", objective: "Sales", base: "T", share: 0.006, roas: 1.05, cpc: 4.1, ctr: 0.031, util: 0.98, dest: "amazon", p: 1, adsets: [["Reels · 18–34", "Reels and Stories placements"], ["Creator partnership", "Partnership ads, creator handles"]] },
  { platform: "meta", name: "Awareness | Brand Film", objective: "Awareness", base: "T", share: 0.004, roas: 0.45, cpc: 14.0, ctr: 0.0048, util: 0.85, dest: "flipkart", adsets: [["Reach · Tier 1", "Reach optimisation"], ["Video views · Tier 2", "ThruPlay optimisation"]] },
  { platform: "meta", name: "Lookalike 2% | Purchasers", objective: "Sales", base: "T", share: 0.005, roas: 1.7, cpc: 10.4, ctr: 0.011, util: 0.9, dest: "amazon", startOffset: 120, endOffset: 19, status: "paused", adsets: [["LAL 2% · India", "Seed: 365d purchasers"], ["LAL 2% · South", "Seed: 365d purchasers, 5 states"]] },
];
export const AD_FORMATS = ["Single image", "Carousel", "Reel 9:16", "Collection"];
