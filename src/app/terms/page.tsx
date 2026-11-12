import type { Metadata } from "next";
import { PolicyPage } from "@/components/site/policy";

export const metadata: Metadata = { title: "Terms and conditions — Shalini_IQ", alternates: { canonical: "/terms" } };

export default function Terms() {
  return (
    <PolicyPage title="Terms and conditions" updated="12 November 2026" sections={[
      { h: "Who we are", p: ["This website is run by Shalini_IQ, Chennai, Tamil Nadu, India. By using it you agree to these terms."] },
      { h: "Free tools", p: ["The listing check and fee calculators are guides. Fee rates come from public sources we cite and change often; check your seller dashboard before setting prices. We are not responsible for decisions made only on the tools' results."] },
      { h: "Our services", p: ["Each project or monthly service is governed by its written proposal, which sets out scope, price, timeline and ownership. If a proposal and these terms disagree, the proposal wins."] },
      { h: "Ownership", p: ["You own the content you give us and, once paid in full, the custom work we create for you as stated in your proposal. The Shalini_IQ platform remains our property and is licensed to you for as long as your subscription is active."] },
      { h: "Marketplaces and trademarks", p: ["Amazon, Flipkart, Myntra, Meesho, JioMart, eBay, Etsy, Blinkit, Zepto, Swiggy Instamart and Meta are trademarks of their owners. We are not affiliated with or endorsed by them."] },
      { h: "Law", p: ["These terms are governed by the laws of India, and the courts in Chennai have jurisdiction."] },
    ]} />
  );
}
