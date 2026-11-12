import "server-only";
import { DbNotConfigured } from "./db";
import { currentAccount, type LiveAccount } from "./session";

/** JSON helpers shared by the live-test API routes. */
export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export const fail = (error: string, status = 400) => json({ ok: false, error }, status);

/** Wraps a route body: turns a missing database into a clear 503 and any other error into a 500 with its message. */
export async function handle(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (e) {
    if (e instanceof DbNotConfigured) return fail(e.message, 503);
    const message = e instanceof Error ? e.message : "Unexpected error";
    console.error("[live-api]", message);
    return fail(message, 500);
  }
}

/** Runs only for a signed-in live account. */
export async function withAccount(run: (a: LiveAccount) => Promise<Response>): Promise<Response> {
  return handle(async () => {
    const account = await currentAccount();
    if (!account) return fail("Please sign in first.", 401);
    return run(account);
  });
}
