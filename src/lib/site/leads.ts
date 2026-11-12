import { z } from "zod";

/** Shared by the public forms (client) and POST /api/v1/leads (server), so both validate the same way. */
export const SELLER_BANDS = ["1–10", "11–25", "26–50", "51–100", "100+"] as const;
export const MARKETPLACES = ["Amazon", "Flipkart", "Myntra", "Meta Ads"] as const;
export const SERVICES = [
  "E-commerce website",
  "Shalini_IQ marketplace platform",
  "SEO",
  "Social media marketing",
  "Performance marketing (Meta & Google ads)",
  "Creative & content",
  "Mobile app",
  "AI chatbot & automation",
  "Something else",
] as const;

const phone = z.string().trim().regex(/^\+?[0-9 ()-]{10,16}$/, "Enter a valid phone number with at least 10 digits");

export const demoRequestSchema = z.object({
  kind: z.literal("demo"),
  name: z.string().trim().min(2, "Enter your name").max(60),
  agency: z.string().trim().min(2, "Enter your agency or company name").max(80),
  email: z.email("Enter a valid email address"),
  phone,
  city: z.string().trim().max(40).optional().default(""),
  sellers: z.enum(SELLER_BANDS, { message: "Choose how many sellers you manage" }),
  marketplaces: z.array(z.enum(MARKETPLACES)).min(1, "Choose at least one marketplace"),
  message: z.string().trim().max(800).optional().default(""),
  consent: z.literal(true, { message: "Tick this so we can contact you" }),
  website: z.string().max(0).optional().default(""), // honeypot: real people leave it empty
});

export const signupSchema = z.object({
  kind: z.literal("signup"),
  name: z.string().trim().min(2, "Enter your name").max(60),
  agency: z.string().trim().min(2, "Enter your agency name").max(80),
  email: z.email("Enter a valid work email"),
  phone,
  sellers: z.coerce.number({ message: "Enter a number" }).int("Whole number only").min(1, "At least 1 seller").max(2000, "Contact us for more than 2,000 sellers"),
  marketplaces: z.array(z.enum(MARKETPLACES)).min(1, "Choose at least one marketplace"),
  consent: z.literal(true, { message: "Accept the terms to continue" }),
  website: z.string().max(0).optional().default(""),
});

export const enquirySchema = z.object({
  kind: z.literal("enquiry"),
  name: z.string().trim().min(2, "Enter your name").max(60),
  phone,
  email: z.email("Enter a valid email address"),
  agency: z.string().trim().max(80).optional().default(""), // business name (optional)
  interest: z.enum(SERVICES, { message: "Choose what you need help with" }),
  message: z.string().trim().max(800).optional().default(""),
  consent: z.literal(true, { message: "Tick this so we can contact you" }),
  website: z.string().max(0).optional().default(""),
});

export const leadSchema = z.discriminatedUnion("kind", [demoRequestSchema, signupSchema, enquirySchema]);
export type Enquiry = z.output<typeof enquirySchema>;
export type DemoRequest = z.output<typeof demoRequestSchema>;
export type SignupRequest = z.output<typeof signupSchema>;
export type Lead = z.output<typeof leadSchema>;

export interface LeadResponse {
  ok: boolean;
  reference?: string;
  /** "sent" only when a webhook is configured and accepted the alert. Never claimed otherwise. */
  alert?: "sent" | "pending_configuration" | "failed";
  error?: string;
  fields?: Record<string, string>;
}

/** Plain-text summary used for the alert and the WhatsApp/email hand-off. */
export function leadSummary(l: Lead, reference: string): string {
  if (l.kind === "enquiry") {
    return [`New website enquiry (${reference})`, `Name: ${l.name}`, l.agency ? `Business: ${l.agency}` : "", `Phone: ${l.phone}`, `Email: ${l.email}`, `Needs: ${l.interest}`, l.message ? `Message: ${l.message}` : ""].filter(Boolean).join("\n");
  }
  const head = l.kind === "demo" ? "New Shalini_IQ demo request" : "New Shalini_IQ agency sign-up";
  const sellers = l.kind === "demo" ? l.sellers : String(l.sellers);
  return [
    `${head} (${reference})`,
    `Name: ${l.name}`,
    `Agency: ${l.agency}`,
    `Email: ${l.email}`,
    `Phone: ${l.phone}`,
    `Sellers managed: ${sellers}`,
    `Marketplaces: ${l.marketplaces.join(", ")}`,
    l.kind === "demo" && l.city ? `City: ${l.city}` : "",
    l.kind === "demo" && l.message ? `Message: ${l.message}` : "",
  ].filter(Boolean).join("\n");
}
