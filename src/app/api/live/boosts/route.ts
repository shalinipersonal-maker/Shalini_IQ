import { z } from "zod";
import { adAccounts, boostPost, listBoosts, setBoostStatus } from "@/server/ads";
import { fail, json, withAccount } from "@/server/live-api";
import { allow } from "@/server/rate-limit";
import { notify } from "@/server/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  return withAccount(async (a) => {
    const [accounts, boosts] = await Promise.all([adAccounts(a.id).catch((e: Error) => e), listBoosts(a.id)]);
    return json({ ok: true, adAccounts: accounts instanceof Error ? [] : accounts, adError: accounts instanceof Error ? accounts.message : null, boosts });
  });
}

const create = z.object({
  postId: z.string().uuid(),
  adAccount: z.string().regex(/^act_\d+$/),
  dailyBudget: z.number().min(100, "Meta needs at least about ₹100 a day").max(5000, "Keep boosts at ₹5,000 a day or less"),
  days: z.number().int().min(1).max(14),
  ageMin: z.number().int().min(18).max(65).default(18),
  ageMax: z.number().int().min(18).max(65).default(65),
  city: z.string().trim().max(60).optional(),
  confirm: z.literal(true, { message: "Please confirm the spend" }),
});

/** Starts a boost. Spends real money: the request must carry confirm: true from the confirmation step. */
export async function POST(request: Request) {
  return withAccount(async (a) => {
    if (!allow(request, 0.02, 2)) return fail("Please wait a moment between boosts.", 429);
    const p = create.safeParse(await request.json().catch(() => ({})));
    if (!p.success) return fail(p.error.issues[0]?.message ?? "Check the boost details", 422);
    const r = await boostPost(a.id, p.data);
    if (r.status === "running") await notify(`🎯 <b>Boost started</b>: ₹${p.data.dailyBudget}/day for ${p.data.days} days (max ₹${p.data.dailyBudget * p.data.days}).`);
    return r.status === "running" ? json({ ok: true, ...r }) : fail(r.error ?? "Meta refused the boost", 502);
  });
}

/** Pause or resume a boost: { id, status: "PAUSED" | "ACTIVE" } */
export async function PATCH(request: Request) {
  return withAccount(async (a) => {
    const p = z.object({ id: z.string().uuid(), status: z.enum(["PAUSED", "ACTIVE"]) }).safeParse(await request.json().catch(() => ({})));
    if (!p.success) return fail("Bad request", 422);
    await setBoostStatus(a.id, p.data.id, p.data.status);
    return json({ ok: true });
  });
}
