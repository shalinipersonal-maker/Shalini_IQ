/**
 * PUBLIC WEBSITE SETTINGS — edit this one file to change contacts, social links, numbers and portfolio.
 * Anything left empty ("") is hidden on the site automatically. Never put numbers here that are not real.
 */
export const SITE = {
  /** Full public address of the site, used for SEO (sitemap, canonical links, social previews). */
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://shalini-iq.vercel.app",
  company: "Shalini_IQ",
  brandLine: "Shalini_IQ",

  contact: {
    email: "shalinipersonal14@gmail.com" as string,
    /** Every email shown on the site (the first is used for "Email us" buttons). */
    emails: ["shalinipersonal14@gmail.com", "shlnloganathan@gmail.com"] as string[],
    phones: ["+91 81245 45524"],
    /** Digits only, with country code. Used for the WhatsApp button and the sticky bar. */
    whatsapp: "918124545524",
    whatsappChannel: "", // e.g. https://whatsapp.com/channel/...
  },

  location: {
    city: "Chennai, Tamil Nadu, India",
    address: "", // full office address — shown in the footer and used for SEO when filled
    mapUrl: "", // Google Maps link
  },

  /** Social pages. Each icon appears only when its link is filled in. */
  social: {
    facebook: "",
    instagram: "",
    linkedin: "",
    youtube: "",
    x: "",
  },

  /** Real numbers only. A stat with an empty value is hidden. */
  stats: [
    { value: "", label: "Brands supported" },
    { value: "", label: "Average lead growth" },
    { value: "", label: "Projects delivered" },
  ],

} as const;

export const telHref = (p: string) => `tel:${p.replace(/[^+\d]/g, "")}`;
export const waHref = (text?: string) => `https://wa.me/${SITE.contact.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
export const socialLinks = () => (Object.entries(SITE.social) as [keyof typeof SITE.social, string][]).filter(([, u]) => u);
export const realStats = () => SITE.stats.filter((s) => s.value.trim());
