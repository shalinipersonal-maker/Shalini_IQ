import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { withAccount } from "@/server/live-api";
import { connect } from "@/server/meta";

export const dynamic = "force-dynamic";

/** Meta sends the user back here. Checks the state (anti-forgery), saves Pages + Instagram accounts. */
export async function GET(request: Request) {
  return withAccount(async (account) => {
    const url = new URL(request.url);
    const back = (q: string) => { const r = NextResponse.redirect(new URL(`/account?${q}#meta`, url.origin)); r.cookies.delete("eq_meta_state"); return r; };
    const state = (await cookies()).get("eq_meta_state")?.value;
    if (!state || state !== url.searchParams.get("state")) return back("meta=state");
    const code = url.searchParams.get("code");
    if (!code) return back(`meta=denied`);
    try {
      const r = await connect(account.id, url.origin, code);
      return back(`meta=ok&pages=${r.pages}&ig=${r.instagram}`);
    } catch (e) {
      return back(`meta=error&msg=${encodeURIComponent(e instanceof Error ? e.message : "Meta error")}`);
    }
  });
}
