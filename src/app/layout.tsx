import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { BRAND_DEFAULTS } from "@/config/brand";
import { SITE } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `Shalini_IQ — websites, marketing and ${BRAND_DEFAULTS.productName}`, template: `%s` },
  description: `${BRAND_DEFAULTS.company}: e-commerce websites, SEO, social media marketing and ${BRAND_DEFAULTS.productName}, the ${BRAND_DEFAULTS.tagline.toLowerCase()} for agencies.`,
  applicationName: BRAND_DEFAULTS.productName,
  openGraph: { type: "website", siteName: "Shalini_IQ", locale: "en_IN", url: "/" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

// Applies the saved theme before first paint so the page never flashes the wrong colours.
const themeScript = `try{var s=JSON.parse(localStorage.getItem("entraiq-demo-v1")||"{}").state||{};var e=document.documentElement;if((s.theme||"dark")==="dark")e.classList.add("dark");if(s.brand&&s.brand.accent)e.dataset.accent=s.brand.accent}catch(e){document.documentElement.classList.add("dark")}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
