import { json, withAccount } from "@/server/live-api";
import { listPosts } from "@/server/meta";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("refresh") === "1";
  return withAccount(async (a) => json({ ok: true, ...(await listPosts(a.id, force)) }));
}
