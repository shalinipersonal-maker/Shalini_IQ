import { json, withAccount } from "@/server/live-api";
import { disconnect, listTargets, metaConfigured, threadsConfigured } from "@/server/meta";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAccount(async (a) => json({ ok: true, configured: metaConfigured(), threads: threadsConfigured(), targets: await listTargets(a.id) }));
}
export async function DELETE(request: Request) {
  const kind = new URL(request.url).searchParams.get("kind") === "threads" ? "threads" : undefined;
  return withAccount(async (a) => { await disconnect(a.id, kind); return json({ ok: true }); });
}
