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
