import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";

/** The platform screens are private workspaces; only the public website is indexed. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/signup", "/privacy", "/refund-policy", "/terms"], disallow: ["/api/", "/login", "/overview", "/marketplaces", "/meta-ads", "/advertising", "/sales", "/products", "/ai", "/studio", "/reports", "/clients", "/settings", "/leads"] }],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
