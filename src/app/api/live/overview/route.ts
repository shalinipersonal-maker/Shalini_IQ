import { json, withAccount } from "@/server/live-api";
import { listPosts } from "@/server/meta";
import { overview } from "@/server/overview";

export const dynamic = "force-dynamic";

export async function GET() {
  // Bring post reactions up to date first (only posts not checked in the last 2 minutes), so the tiles match Facebook.
  return withAccount(async (a) => { await listPosts(a.id).catch(() => null); return json({ ok: true, ...(await overview(a.id)) }); });
}
