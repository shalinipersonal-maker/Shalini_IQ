import { leadSchema, type LeadResponse } from "@/lib/site/leads";
import { newReference, sendLeadAlert } from "@/server/leads";
import { allow } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

const reply = (body: LeadResponse, status = 200) => Response.json(body, { status });

/** Public enquiry endpoint for the website's demo-request and sign-up forms. */
export async function POST(request: Request) {
  if (!allow(request, 0.2, 5)) return reply({ ok: false, error: "Too many requests. Please wait a minute and try again." }, 429);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reply({ ok: false, error: "Send the form as JSON." }, 400);
  }
  // Honeypot filled → a bot. Answer like a success so it learns nothing, but do nothing.
  if (body && typeof body === "object" && "website" in body && typeof body.website === "string" && body.website.length > 0) {
    return reply({ ok: true, reference: "ENQ-RECEIVED", alert: "pending_configuration" });
  }
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join(".") || "form"] ??= issue.message;
    return reply({ ok: false, error: "Some fields need attention.", fields }, 422);
  }
  const reference = newReference(parsed.data.kind);
  const alert = await sendLeadAlert(parsed.data, reference);
  return reply({ ok: true, reference, alert });
}

export function GET() {
  return reply({ ok: false, error: "Use POST to send an enquiry." }, 405);
}
