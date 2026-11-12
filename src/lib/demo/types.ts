export type Marketplace = "amazon" | "flipkart";
export type MarketplaceFilter = "all" | Marketplace;
export type AdPlatform = "amazon_ads" | "flipkart_ads" | "meta";
export type CampaignStatus = "active" | "paused" | "draft";

export interface Client {
  id: string;
  name: string;
  industry: string;
  city: string;
  since: string;
  status: "active" | "onboarding" | "paused";
  contact: { name: string; email: string };
  team: string[]; // employee ids
  hue: number;
  retainer: number;
  demoData: boolean;
}
export interface Employee { id: string; name: string; title: string; email: string }
export interface Product {
  id: string;
  clientId: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  mrp: number;
  listings: Marketplace[];
  hue: number;
}
export interface SalesRow {
  date: string;
  productId: string;
  marketplace: Marketplace;
  units: number;
  orders: number;
  revenue: number;
  sessions: number;
  returns: number;
  cancellations: number;
}
export interface InventoryRecord {
  productId: string;
  marketplace: Marketplace;
  onHand: number;
  inbound: number;
  dailyVelocity: number;
  leadTimeDays: number;
}
export interface Ad { id: string; name: string; format: string }
export interface AdSet { id: string; name: string; audience: string; ads: Ad[] }
export interface Campaign {
  id: string;
  clientId: string;
  platform: AdPlatform;
  name: string;
  objective: string;
  status: CampaignStatus;
  dailyBudget: number;
  destination: Marketplace;
  startDate: string;
  endDate?: string;
  adsets: AdSet[];
  productIds: string[];
  custom?: boolean;
}
export interface AdRow {
  date: string;
  campaignId: string;
  adsetId?: string;
  adId?: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  reach: number;
}
export interface ActivityItem { id: string; ts: number; kind: "campaign" | "report" | "inventory" | "creative" | "team" | "data"; text: string; actor: string }
export interface Dataset {
  client: Client;
  products: Product[];
  campaigns: Campaign[];
  sales: SalesRow[];
  ads: AdRow[];
  inventory: InventoryRecord[];
  activity: ActivityItem[];
  firstDate: string;
  lastDate: string;
}
export const MP_LABEL: Record<Marketplace, string> = { amazon: "Amazon", flipkart: "Flipkart" };
export const PLATFORM_LABEL: Record<AdPlatform, string> = { amazon_ads: "Amazon Ads", flipkart_ads: "Flipkart Ads", meta: "Meta Ads" };
export const PLATFORM_COLOR: Record<AdPlatform, string> = { amazon_ads: "var(--s-amazon)", flipkart_ads: "var(--s-flipkart)", meta: "var(--s-meta)" };
export const MP_COLOR: Record<Marketplace, string> = { amazon: "var(--s-amazon)", flipkart: "var(--s-flipkart)" };
