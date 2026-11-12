import { handle, json } from "@/server/live-api";
import { currentAccount } from "@/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => json({ ok: true, account: await currentAccount() }));
}
