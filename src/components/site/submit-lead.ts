"use client";
import { BRAND_DEFAULTS } from "@/config/brand";
import { leadSummary, type Lead, type LeadResponse } from "@/lib/site/leads";
import { useStore } from "@/lib/store";

/**
 * Sends a website form to POST /api/v1/leads and records it in this browser's workspace (Website leads page).
 * If the network call fails the lead is still kept locally and marked "not_sent", so nothing is lost silently.
 */
export async function submitLead(lead: Lead): Promise<LeadResponse> {
  let res: LeadResponse;
  try {
    const r = await fetch("/api/v1/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(lead) });
    res = (await r.json()) as LeadResponse;
  } catch {
    res = { ok: false, error: "Could not reach the server. Check your connection and try again." };
  }
  if (res.ok && res.reference) {
    useStore.getState().addSiteLead({
      kind: lead.kind,
      reference: res.reference,
      name: lead.name,
      agency: lead.agency || "—",
      email: lead.email,
      phone: lead.phone,
      sellers: lead.kind === "enquiry" ? "—" : String(lead.sellers),
      marketplaces: lead.kind === "enquiry" ? [lead.interest] : [...lead.marketplaces],
      alert: res.alert ?? "not_sent",
    });
  }
  return res;
}

/** Hand-off links the visitor can use to reach the team directly. WhatsApp only appears when a number is configured. */
export function contactLinks(lead: Lead, reference: string) {
  const text = leadSummary(lead, reference);
  return {
    whatsapp: BRAND_DEFAULTS.whatsapp ? `https://wa.me/${BRAND_DEFAULTS.whatsapp}?text=${encodeURIComponent(text)}` : null,
    email: `mailto:${BRAND_DEFAULTS.contactEmail}?subject=${encodeURIComponent(`Website enquiry ${reference}`)}&body=${encodeURIComponent(text)}`,
  };
}
