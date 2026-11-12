import { sql } from "@/server/db";
import { json, withAccount } from "@/server/live-api";
import { notify } from "@/server/telegram";

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
    const clean = (x: unknown) => String(x ?? "").replace(/[<>&]/g, "");
    if (u.searchParams.get("all") === "1") {
      const [n] = await sql(`SELECT COUNT(*) AS n FROM live_leads`);
      await sql(`DELETE FROM live_leads`);
      await notify(`🗑 <b>All enquiries deleted</b> (${clean(n?.n)}) from the dashboard.`);
    } else if (ref && /^[A-Z0-9-]{4,40}$/i.test(ref)) {
      const [l] = await sql(`SELECT name, interest FROM live_leads WHERE reference = $1`, [ref]);
      await sql(`DELETE FROM live_leads WHERE reference = $1`, [ref]);
      if (l) await notify(`🗑 <b>Enquiry deleted</b> ${clean(ref)} · ${clean(l.name)} · ${clean(l.interest)}`);
    }
    else return json({ ok: false, error: "Nothing to delete" }, 400);
    return json({ ok: true });
  });
}
