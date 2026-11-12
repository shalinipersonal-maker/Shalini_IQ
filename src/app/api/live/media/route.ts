import { newId, sql } from "@/server/db";
import { fail, json, withAccount } from "@/server/live-api";

export const dynamic = "force-dynamic";

const MAX_BYTES = 3_000_000; // stays under Vercel's 4.5 MB request limit once base64-encoded

/** Stores one JPEG (sent as a data URL) and returns its public address for Instagram to fetch. */
export async function POST(request: Request) {
  return withAccount(async (a) => {
    const body = (await request.json().catch(() => ({}))) as { dataUrl?: string };
    const m = /^data:(image\/jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(body.dataUrl ?? "");
    if (!m) return fail("Send the creative as a JPEG image.", 422);
    if (Math.floor((m[2].length * 3) / 4) > MAX_BYTES) return fail("Image is too large; keep it under 3 MB.", 413);
    const id = newId();
    await sql(`INSERT INTO live_media (id, account_id, mime, data) VALUES ($1, $2, $3, $4)`, [id, a.id, m[1], m[2]]);
    return json({ ok: true, id, url: `${new URL(request.url).origin}/api/live/media/${id}` });
  });
}
