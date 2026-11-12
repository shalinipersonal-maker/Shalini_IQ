import { NextResponse } from "next/server";
import { handle } from "@/server/live-api";
import { endSession, SESSION_COOKIE } from "@/server/session";

export const dynamic = "force-dynamic";

export async function POST() {
  return handle(async () => {
    await endSession();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
    return res;
  });
}
