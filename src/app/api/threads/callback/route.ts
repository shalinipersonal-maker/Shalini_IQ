import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { withAccount } from "@/server/live-api";
import { threadsConnect } from "@/server/meta";

export const dynamic = "force-dynamic";

/** Threads sends the user back here; checks the anti-forgery state and saves the Threads profile. */
export async function GET(request: Request) {
  return withAccount(async (account) => {
    const url = new URL(request.url);
    const back = (q: string) => { const r = NextResponse.redirect(new URL(`/account?${q}#meta`, url.origin)); r.cookies.delete("eq_threads_state"); return r; };
    const state = (await cookies()).get("eq_threads_state")?.value;
    if (!state || state !== url.searchParams.get("state")) return back("threads=state");
    const code = url.searchParams.get("code");
    if (!code) return back("threads=denied");
    try {
      const name = await threadsConnect(account.id, url.origin, code.replace(/#_$/, ""));
      return back(`threads=ok&name=${encodeURIComponent(name)}`);
    } catch (e) {
      return back(`threads=error&msg=${encodeURIComponent(e instanceof Error ? e.message : "Threads error")}`);
    }
  });
}
