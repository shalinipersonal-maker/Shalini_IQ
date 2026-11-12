import "server-only";
import { leadSummary, type Lead } from "@/lib/site/leads";
import { dbConfigured, newId, sql } from "./db";
import { mailConfigured, sendMail } from "./mail";
import { notify } from "./telegram";

/**
 * Lead alerts. If LEAD_WEBHOOK_URL is set, every enquiry is POSTed there as JSON
 * ({ text, lead, reference }) — this works with Slack/Google Chat incoming webhooks, n8n, Make,
 * Zapier or a Google Apps Script that appends to a sheet and emails the team.
 * If it is not set, the alert is reported as "pending_configuration" — never as sent.
 */
export async function sendLeadAlert(lead: Lead, reference: string): Promise<"sent" | "pending_configuration" | "failed"> {
  const tg = notify(`📩 <b>New enquiry</b> ${reference}\n<b>${esc(lead.name)}</b>${lead.phone ? ` · ${esc(lead.phone)}` : ""}\n${esc(lead.kind === "enquiry" ? lead.interest : lead.kind === "demo" ? "Demo request" : "Workspace sign-up")}${lead.kind !== "signup" && lead.message ? `\n“${esc(lead.message.slice(0, 200))}”` : ""}`);
  const results = await Promise.all([emailAlert(lead, reference), webhookAlert(lead, reference), tg.then((ok) => (ok ? "sent" as const : "pending_configuration" as const))]);
  const outcome = results.includes("sent") ? "sent" : results.includes("failed") ? "failed" : "pending_configuration";
  await saveLead(lead, reference, outcome);
  return outcome;
}

/** keep every enquiry in the database so it survives across browsers and devices. */
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

async function saveLead(lead: Lead, reference: string, alert: string): Promise<void> {
  if (!dbConfigured()) return;
  try {
    await sql(`INSERT INTO live_leads (id, reference, kind, name, email, phone, business, interest, message, alert) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [
      newId(), reference, lead.kind, lead.name, lead.email, lead.phone, lead.agency || null,
      lead.kind === "enquiry" ? lead.interest : lead.marketplaces.join(", "),
      lead.kind === "signup" ? null : lead.message || null, alert,
    ]);
  } catch (e) {
    console.error("[leads] could not save", e instanceof Error ? e.message : e);
  }
}

/** email each enquiry to ALERT_EMAIL (Shalini) through Resend. */
async function emailAlert(lead: Lead, reference: string): Promise<"sent" | "pending_configuration" | "failed"> {
  const to = process.env.ALERT_EMAIL;
  if (!to || !mailConfigured()) return "pending_configuration";
  return (await sendMail(to, `New website lead ${reference} — ${lead.name}`, leadSummary(lead, reference))) ? "sent" : "failed";
}

async function webhookAlert(lead: Lead, reference: string): Promise<"sent" | "pending_configuration" | "failed"> {
  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url) return "pending_configuration";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: leadSummary(lead, reference), reference, lead: { ...lead, website: undefined } }),
      signal: AbortSignal.timeout(6000),
    });
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

export function newReference(kind: Lead["kind"]): string {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  return `${kind === "signup" ? "SGN" : kind === "demo" ? "DEM" : "ENQ"}-${ymd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
