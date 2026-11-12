import { NextResponse } from "next/server";
import { sql } from "@/server/db";
import { handle } from "@/server/live-api";
import { cookieOptions, createSession, hashToken, SESSION_COOKIE } from "@/server/session";

export const dynamic = "force-dynamic";

/** Step 2 of sign-in: the emailed link lands here, sets the session cookie and opens the live account. */
export async function GET(request: Request) {
  return handle(async () => {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") ?? "";
    const rows = token
      ? await sql(`UPDATE live_login_tokens SET used = true WHERE token_hash = $1 AND used = false AND expires_at > now() RETURNING account_id`, [hashToken(token)])
      : [];
    const accountId = rows[0]?.account_id;
    if (!accountId) return NextResponse.redirect(new URL("/account?error=link", url.origin));
    const s = await createSession(accountId);
    const res = NextResponse.redirect(new URL("/account", url.origin));
    res.cookies.set(SESSION_COOKIE, s.value, cookieOptions(s.maxAge));
    return res;
  });
}
