import type { Metadata } from "next";
import { PolicyPage } from "@/components/site/policy";

export const metadata: Metadata = { title: "Refund & cancellation policy — Shalini_IQ", alternates: { canonical: "/refund-policy" } };

export default function Refunds() {
  return (
    <PolicyPage title="Refund & cancellation policy" updated="12 November 2026" sections={[
      { h: "Projects (websites, apps, software)", p: ["Projects are priced in a written proposal with milestones. The advance secures your slot and covers planning and design work already started; it is refundable in full only if you cancel before that work begins.", "If you cancel later, you pay for the milestones completed and the work in progress up to the cancellation date, and we hand over everything completed so far."] },
      { h: "Monthly services (marketing, SEO, Shalini_IQ platform)", p: ["Monthly services can be cancelled with 30 days' written notice after any minimum term stated in your proposal. Fees already paid for the current month are not refunded.", "Shalini_IQ setup fees cover onboarding work and are not refundable once onboarding has started. On cancellation you can export your data as files."] },
      { h: "Advertising spend", p: ["Money paid to advertising platforms such as Meta or Google on your behalf is spent with those platforms and cannot be refunded by us."] },
      { h: "How refunds are paid", p: ["Approved refunds are paid to the original payment method or by bank transfer within 10 working days."] },
    ]} />
  );
}
