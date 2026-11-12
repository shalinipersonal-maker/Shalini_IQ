"use client";
import { Inbox } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared";
import { Badge, Card, CardHeader, EmptyState, type Tone } from "@/components/ui";
import { fmtDateTime } from "@/lib/dates";
import { useStore, type SiteLead } from "@/lib/store";

const ALERT: Record<SiteLead["alert"], { label: string; tone: Tone }> = {
  sent: { label: "Team alerted", tone: "pos" },
  pending_configuration: { label: "Alert pending configuration", tone: "warn" },
  failed: { label: "Alert failed", tone: "neg" },
  not_sent: { label: "Not sent", tone: "neg" },
};

export default function LeadsPage() {
  const leads = useStore((s) => s.siteLeads);
  const workspace = useStore((s) => s.workspace);
  return (
    <>
      <PageHeader title="Website leads" description="Enquiries, demo requests and agency sign-ups sent from the website in this browser. The server sends each one to the alert webhook when LEAD_WEBHOOK_URL is configured." />
      {workspace && (
        <Card className="mb-4 px-5 py-4 text-[13px]">
          <p className="font-semibold">{workspace.agency} workspace</p>
          <p className="mt-0.5 text-muted">Created from the website by {workspace.owner} ({workspace.email}) on {fmtDateTime(workspace.createdAt)} · {workspace.sellersPlanned} sellers planned · {workspace.marketplaces.join(", ")}</p>
        </Card>
      )}
      <Card>
        <CardHeader title={`${leads.length} lead${leads.length === 1 ? "" : "s"}`} subtitle="Newest first" />
        {leads.length === 0 ? (
          <EmptyState icon={<Inbox />} title="No website leads yet" body="When someone books a demo or signs up on the website, it appears here." action={<Link href="/#demo" className="text-[13px] font-medium text-accent">Open the demo form</Link>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead className="border-y border-line bg-raised text-[12px] text-muted">
                <tr>{["Received", "Type", "Reference", "Name", "Business", "Contact", "Sellers", "Interest / marketplaces", "Alert"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line">
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted">{fmtDateTime(l.ts)}</td>
                    <td className="px-4 py-2.5"><Badge tone={l.kind === "signup" ? "accent" : l.kind === "enquiry" ? "ai" : "neutral"}>{l.kind === "signup" ? "Sign-up" : l.kind === "enquiry" ? "Enquiry" : "Demo request"}</Badge></td>
                    <td className="tnum px-4 py-2.5">{l.reference}</td>
                    <td className="px-4 py-2.5 font-medium">{l.name}</td>
                    <td className="px-4 py-2.5">{l.agency}</td>
                    <td className="px-4 py-2.5"><span className="block">{l.email}</span><span className="text-faint">{l.phone}</span></td>
                    <td className="tnum px-4 py-2.5">{l.sellers}</td>
                    <td className="px-4 py-2.5">{l.marketplaces.join(", ")}</td>
                    <td className="px-4 py-2.5"><Badge tone={ALERT[l.alert].tone}>{ALERT[l.alert].label}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
