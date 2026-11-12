import { Bell, Check, FileText, LayoutDashboard, Megaphone, Palette, ScanSearch, Sparkles, Store, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";
import { IQChat } from "@/components/site/iq-chat";
import { ROYAL } from "./site-fonts";
import { EnquiryForm, EnquiryModal } from "@/components/site/enquiry";
import { FeeCalculator } from "@/components/site/fee-calculator";
import { FeeCalculatorModal } from "@/components/site/fee-calculators";
import { ListingChecker } from "@/components/site/listing-checker";
import { ChannelMarquee, CtaBand, Hero, Reveal, SectionHead, Services, SocialSection, Strategy, TechStack, ToolsGrid } from "@/components/site/sections";
import { SITE, socialLinks } from "@/config/site";
import { PRICING } from "@/lib/site/pricing";

export const metadata: Metadata = {
  title: "Shalini_IQ — E-commerce websites, SEO, social media and marketplace growth",
  description: "Shalini_IQ builds e-commerce websites, runs SEO, social media and ads, and gives sellers one workspace for every seller on Amazon, Flipkart, Myntra and Meta. Free listing check and marketplace fee calculators.",
  alternates: { canonical: "/" },
};

const MODULES = [
  { icon: LayoutDashboard, title: "Agency overview", body: "Revenue, orders, ad spend, ROAS, ACOS and TACOS for every seller on one screen." },
  { icon: Store, title: "Amazon, Flipkart & Myntra", body: "Sales trends, products, inventory and ads per seller account." },
  { icon: Megaphone, title: "Meta Ads", body: "Campaigns, ad sets and ads with create, edit, pause and resume." },
  { icon: Sparkles, title: "AI insights", body: "Budget, product and campaign suggestions that show the numbers behind them." },
  { icon: ScanSearch, title: "Listing quality check", body: "Scores every listing and writes the fix, like the free tool above." },
  { icon: Palette, title: "Creative Studio", body: "Ad and listing creatives from templates with each seller's brand kit." },
  { icon: FileText, title: "Branded reports", body: "Monthly PDF and CSV reports with your agency's logo." },
  { icon: Bell, title: "Alerts", body: "Low stock, a ROAS drop or wasted spend flag the right account manager." },
  { icon: Users, title: "Team & seller logins", body: "Roles for your staff and optional view-only seller logins." },
];

const CONNECTIONS = [
  ["Meta Ads", "First live connection, during setup"],
  ["Amazon (Seller Central & Ads)", "Live once Amazon approves our developer access"],
  ["Flipkart", "Live when partner API access is granted"],
  ["Myntra", "Live when partner API access is granted"],
] as const;

const FAQ = [
  ["How long does an e-commerce website take?", "Most stores go live in 3–6 weeks, depending on the number of products and integrations. You get a written timeline before we start."],
  ["Do you work with small brands?", "Yes. Many of our clients are growing family brands. We start with what will pay back first and add more as sales grow."],
  ["Do you sell or manage seller accounts on marketplaces?", "No. We build the websites, marketing and software. For marketplace account management we work alongside agencies, who use our Shalini_IQ platform."],
  ["Are the fee calculators exact?", "They use the latest public fee rules we could verify (November 2026) and show their sources. Marketplaces change fees often and some depend on your contract, so every rate can be edited to match your seller dashboard."],
  ["What is Shalini_IQ?", "Our platform for marketplace agencies: one workspace for every seller's Amazon, Flipkart, Myntra and Meta numbers, listings, creatives and reports. The preview you can open today uses sample data; live connections switch on during setup."],
  ["How do I start?", "Book a free consultation, call or WhatsApp us. We reply within one working day."],
] as const;

function JsonLd() {
  const data = [
    {
      "@context": "https://schema.org", "@type": "Organization", name: SITE.company, alternateName: ["Shalini IQ"], url: SITE.url, ...(SITE.contact.email ? { email: SITE.contact.email } : {}),
      telephone: SITE.contact.phones[0], address: { "@type": "PostalAddress", addressLocality: "Chennai", addressRegion: "Tamil Nadu", addressCountry: "IN", ...(SITE.location.address ? { streetAddress: SITE.location.address } : {}) },
      contactPoint: SITE.contact.phones.map((p) => ({ "@type": "ContactPoint", telephone: p, contactType: "sales", areaServed: "IN", availableLanguage: ["English", "Tamil"] })),
      sameAs: socialLinks().map(([, u]) => u),
    },
    { "@context": "https://schema.org", "@type": "WebSite", name: "Shalini_IQ", url: SITE.url },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export default function Home() {
  return (
    <div className={`${ROYAL} min-h-dvh`}>
      <JsonLd />
      <SiteHeader />
      <main>
        <Hero />
        <ChannelMarquee />
        <Services />
        <Strategy />

        {/* Free tools */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionHead id="tools" eyebrow="FREE TOOLS" title="Free tools for sellers," accent="no sign-up needed" body="Check a listing and fix it to 100/100, or work out exactly what each marketplace takes from a sale." />
          <div id="listing-check" className="mt-10 scroll-mt-24"><Reveal><ListingChecker /></Reveal></div>
          <div className="mt-14"><ToolsGrid /></div>
        </section>

        <TechStack />
        <SocialSection />

        {/* Shalini_IQ platform */}
        <section className="border-y border-line bg-surface/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <SectionHead id="platform" eyebrow="SHALINI_IQ PLATFORM" title="For marketplace agencies:" accent="every seller, one screen" body="Sellers keep their shops on the marketplaces. Your team works from Shalini_IQ — sales, ads, listings, creatives and reports in one place, under your agency's name." />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {MODULES.map((m, i) => (
                <Reveal key={m.title} delay={i * 40}>
                  <div className="gold-frame h-full rounded-2xl border border-line bg-surface p-5 transition-transform hover:-translate-y-1">
                    <m.icon className="size-5 text-accent" aria-hidden />
                    <p className="mt-3 text-[15px] font-semibold">{m.title}</p>
                    <p className="mt-1 text-[13.5px] text-muted">{m.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal className="mt-8 overflow-x-auto rounded-2xl border border-line bg-surface">
              <table className="w-full min-w-[520px] text-left text-[13.5px]">
                <caption className="px-4 pt-3 text-left text-[13px] font-semibold">Live marketplace connections</caption>
                <thead className="text-[12px] text-muted"><tr><th className="px-4 py-2 font-medium">Marketplace</th><th className="px-4 py-2 font-medium">Status</th></tr></thead>
                <tbody className="divide-y divide-line border-t border-line">{CONNECTIONS.map(([m, s]) => <tr key={m}><td className="px-4 py-2.5 font-medium">{m}</td><td className="px-4 py-2.5 text-muted">{s}</td></tr>)}</tbody>
              </table>
              <p className="border-t border-line px-4 py-2.5 text-[12px] text-faint">Until a connection is live, sellers' numbers come in from the standard report files each marketplace provides.</p>
            </Reveal>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/account" className="inline-flex h-10 items-center rounded-lg border border-line bg-surface px-4 text-[14px] font-semibold hover:bg-raised">Open Shalini_IQ</Link>
              <Link href="/signup" className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-[14px] font-semibold text-accent-ink hover:brightness-110">Start an agency workspace</Link>
            </div>

            <div className="mt-16"><SectionHead id="pricing" eyebrow="Shalini_IQ PRICING" title="Pay for the sellers" accent="you manage" body={`One-time setup of ₹${PRICING.setupFee.toLocaleString("en-IN")}, then ₹${PRICING.platformFee.toLocaleString("en-IN")} a month plus ₹${PRICING.perSeller.toLocaleString("en-IN")} per active seller. Hosting, backups, updates and ${PRICING.includedHoursPerMonth} hours of small changes a month included.`} /></div>
            <Reveal className="mt-8"><FeeCalculator /></Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <SectionHead center id="faq" eyebrow="FAQ" title="Questions we're" accent="often asked" />
          <div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-surface">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium">{q}<span className="text-[20px] leading-none text-accent transition-transform group-open:rotate-45">+</span></summary>
                <p className="mt-2 text-[14px] text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Contact form */}
        <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionHead eyebrow="GET IN TOUCH" title="Tell us about" accent="your business" body="We'll look at where you are today and send a clear plan with costs. No obligation." />
            <Reveal>
              <ul className="mt-6 space-y-2.5 text-[14px] text-muted">
                {["Reply within one working day", "Call, WhatsApp, video or in person in Tamil Nadu", "Written plan and quote before any work starts"].map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-pos" />{t}</li>)}
              </ul>
            </Reveal>
          </div>
          <Reveal className="gold-frame rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6"><EnquiryForm /></Reveal>
        </section>

        <CtaBand />
      </main>
      <SiteFooter />
      <IQChat />
      <FeeCalculatorModal />
      <EnquiryModal />
    </div>
  );
}
