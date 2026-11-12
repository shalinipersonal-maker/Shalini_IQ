import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { sql } from "./db";

/**
 * Live-test sessions. The browser holds a random id in an HttpOnly cookie; the database stores only its
 * hash (peppered with SESSION_SECRET), so a database leak does not expose working sessions.
 */
export const SESSION_COOKIE = "eq_session";
const DAYS = 30;

export const hashToken = (t: string) => createHash("sha256").update(`${process.env.SESSION_SECRET ?? ""}:${t}`).digest("hex");
export const randomToken = () => randomBytes(32).toString("base64url");

export interface LiveAccount { id: string; email: string; name: string | null; phone: string | null }

export async function createSession(accountId: string): Promise<{ value: string; maxAge: number }> {
  const value = randomToken();
  await sql(`INSERT INTO live_sessions (id_hash, account_id, expires_at) VALUES ($1, $2, now() + interval '${DAYS} days')`, [hashToken(value), accountId]);
  return { value, maxAge: DAYS * 86400 };
}

export const cookieOptions = (maxAge: number) => ({ httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge });

/** The signed-in live account, or null. */
export async function currentAccount(): Promise<LiveAccount | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  const rows = await sql(
    `SELECT a.id, a.email, a.name, a.phone FROM live_sessions s JOIN live_accounts a ON a.id = s.account_id WHERE s.id_hash = $1 AND s.expires_at > now()`,
    [hashToken(value)],
  );
  const r = rows[0];
  return r ? { id: r.id!, email: r.email!, name: r.name, phone: r.phone } : null;
}

export async function endSession(): Promise<void> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (value) await sql(`DELETE FROM live_sessions WHERE id_hash = $1`, [hashToken(value)]);
}
