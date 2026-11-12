import { NextResponse } from "next/server";
import { fail, withAccount } from "@/server/live-api";
import { threadsAuthUrl, threadsConfigured } from "@/server/meta";
import { randomToken } from "@/server/session";

export const dynamic = "force-dynamic";

/** Starts "Connect Threads": sends the signed-in user to Threads' own consent screen. */
export async function GET(request: Request) {
  return withAccount(async () => {
    if (!threadsConfigured()) return fail("Threads is not set up yet (THREADS_APP_ID / THREADS_APP_SECRET).", 503);
    const state = randomToken();
    const res = NextResponse.redirect(threadsAuthUrl(new URL(request.url).origin, state));
    res.cookies.set("eq_threads_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
    return res;
  });
}
