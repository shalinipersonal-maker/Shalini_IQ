import { BarChart3, Building2, FileText, Inbox, LayoutDashboard, LineChart, Megaphone, Package, Palette, Settings, ShoppingBag, ShoppingCart, Sparkles, Store, type LucideIcon } from "lucide-react";

export interface NavItem { href: string; label: string; icon: LucideIcon; badge?: string }
export const NAV: { group: string; items: NavItem[] }[] = [
  { group: "Intelligence", items: [
    { href: "/overview", label: "Overview", icon: LayoutDashboard },
    { href: "/ai", label: "AI Intelligence Center", icon: Sparkles },
  ] },
  { group: "Marketplaces", items: [
    { href: "/marketplaces/amazon", label: "Amazon", icon: ShoppingCart },
    { href: "/marketplaces/flipkart", label: "Flipkart", icon: ShoppingBag },
    { href: "/marketplaces/other", label: "Other marketplaces", icon: Store, badge: "Soon" },
  ] },
  { group: "Advertising", items: [
    { href: "/meta-ads", label: "Meta Ads", icon: Megaphone },
    { href: "/advertising", label: "Advertising Analytics", icon: BarChart3 },
    { href: "/studio", label: "Creative Studio", icon: Palette },
  ] },
  { group: "Commerce", items: [
    { href: "/sales", label: "Sales Analytics", icon: LineChart },
    { href: "/products", label: "Products", icon: Package },
  ] },
  { group: "Agency", items: [
    { href: "/reports", label: "Reports", icon: FileText },
    { href: "/clients", label: "Clients", icon: Building2 },
    { href: "/leads", label: "Website leads", icon: Inbox },
    { href: "/settings", label: "Settings", icon: Settings },
  ] },
];

/** The presentation sequence from the demo script. */
export const TOUR = [
  { href: "/overview", title: "Business overview", note: "Consolidated marketplace and advertising health" },
  { href: "/marketplaces/amazon", title: "Marketplace intelligence", note: "Amazon and Flipkart sales, products, inventory" },
  { href: "/meta-ads", title: "Advertising intelligence", note: "Meta campaigns, spend, conversions, ROAS" },
  { href: "/ai", title: "AI recommendations", note: "Opportunities and problems found in the data" },
  { href: "/studio", title: "Creative Studio", note: "Edit an ad creative from a template" },
  { href: "/reports", title: "Reports", note: "Generate and export a business report" },
  { href: "/clients", title: "Client management", note: "Run several clients from one workspace" },
];
