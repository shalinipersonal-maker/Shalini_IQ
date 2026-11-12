import { sql } from "@/server/db";
import { json, withAccount } from "@/server/live-api";

export const dynamic = "force-dynamic";

/** Every enquiry from the website and IQ, newest first (all visitors, not just this browser). */
export async function GET() {
  return withAccount(async () => {
    const rows = await sql(`SELECT reference, kind, name, email, phone, business, interest, message, alert, created_at FROM live_leads ORDER BY created_at DESC LIMIT 100`);
    return json({ ok: true, leads: rows });
  });
}

/** Deletes one enquiry (?reference=ENQ-…) or every enquiry (?all=1). */
export async function DELETE(request: Request) {
  return withAccount(async () => {
    const u = new URL(request.url);
    const ref = u.searchParams.get("reference");
    if (u.searchParams.get("all") === "1") await sql(`DELETE FROM live_leads`);
    else if (ref && /^[A-Z0-9-]{4,40}$/i.test(ref)) await sql(`DELETE FROM live_leads WHERE reference = $1`, [ref]);
    else return json({ ok: false, error: "Nothing to delete" }, 400);
    return json({ ok: true });
  });
}
