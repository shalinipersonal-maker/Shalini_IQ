/** Single source of truth for product branding. Change here (or in Settings → Brand at runtime). */
export const BRAND_DEFAULTS = {
  company: "Shalini_IQ",
  companyLegal: "Shalini_IQ",
  productName: "Shalini_IQ",
  tagline: "Marketplace Intelligence Platform",
  accent: "indigo" as "indigo" | "violet" | "teal",
  city: "Chennai, Tamil Nadu",
  contactEmail: "shalinipersonal14@gmail.com",
  /** WhatsApp number with country code, digits only (e.g. "919876543210"). Leave empty to hide WhatsApp links. */
  whatsapp: "918124545524",
};
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
export const DEMO_NOTICE = "Sample data — not connected to live marketplace accounts.";
