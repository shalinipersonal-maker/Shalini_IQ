import { NextResponse } from "next/server";
import { fail, withAccount } from "@/server/live-api";
import { authUrl, metaConfigured } from "@/server/meta";
import { randomToken } from "@/server/session";

export const dynamic = "force-dynamic";

/** Starts "Connect Facebook & Instagram": sends the signed-in user to Meta's own consent screen. */
export async function GET(request: Request) {
  return withAccount(async () => {
    if (!metaConfigured()) return fail("The Meta app is not set up yet (META_APP_ID / META_APP_SECRET / TOKEN_ENCRYPTION_KEY).", 503);
    const state = randomToken();
    const res = NextResponse.redirect(authUrl(new URL(request.url).origin, state));
    res.cookies.set("eq_meta_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
    return res;
  });
}
