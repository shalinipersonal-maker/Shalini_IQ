import { sql } from "@/server/db";
import { handle } from "@/server/live-api";

export const dynamic = "force-dynamic";

/** Public, read-only image address. Instagram downloads published creatives from here. Ids are random UUIDs. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
    const row = (await sql(`SELECT mime, data FROM live_media WHERE id = $1`, [id]))[0];
    if (!row) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(Buffer.from(row.data!, "base64")), { headers: { "Content-Type": row.mime!, "Cache-Control": "public, max-age=86400, immutable" } });
  });
}
