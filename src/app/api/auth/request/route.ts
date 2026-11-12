import { z } from "zod";
import { newId, sql } from "@/server/db";
import { fail, handle, json } from "@/server/live-api";
import { buttonEmail, mailConfigured, sendMail } from "@/server/mail";
import { allow } from "@/server/rate-limit";
import { hashToken, randomToken } from "@/server/session";
import { LIVE_APP_NAME } from "@/config/live";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.email("Enter a valid email address"),
  name: z.string().trim().max(60).optional().default(""),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{10,16}$/, "Enter a phone number with at least 10 digits").optional().or(z.literal("")),
});

/** Step 1 of sign-in: email a one-time link (valid 15 minutes). Creates the account on first use. */
export async function POST(request: Request) {
  return handle(async () => {
    if (!allow(request, 0.1, 4)) return fail("Too many attempts. Please wait a minute.", 429);
    if (!mailConfigured()) return fail("Email sending is not set up yet (RESEND_API_KEY / MAIL_FROM).", 503);
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form", 422);
    const email = parsed.data.email.toLowerCase();
    // Live test: only the people named in LIVE_ALLOWED_EMAILS can sign in (they can see website enquiries).
    const allowed = (process.env.LIVE_ALLOWED_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (!allowed.length) return fail("Live sign-in is not open yet (LIVE_ALLOWED_EMAILS is not set).", 503);
    if (!allowed.includes(email)) return fail("This email is not allowed to sign in. Ask the Shalini_IQ owner to add it.", 403);
    const { name, phone } = parsed.data;

    const found = await sql(`SELECT id FROM live_accounts WHERE email = $1`, [email]);
    let id = found[0]?.id ?? null;
    if (!id) {
      id = newId();
      await sql(`INSERT INTO live_accounts (id, email, name, phone) VALUES ($1, $2, $3, $4)`, [id, email, name || null, phone || null]);
    } else if (name || phone) {
      await sql(`UPDATE live_accounts SET name = COALESCE(NULLIF($2, ''), name), phone = COALESCE(NULLIF($3, ''), phone) WHERE id = $1`, [id, name, phone ?? ""]);
    }

    const token = randomToken();
    await sql(`INSERT INTO live_login_tokens (token_hash, account_id, expires_at) VALUES ($1, $2, now() + interval '15 minutes')`, [hashToken(token), id]);
    const link = `${new URL(request.url).origin}/api/auth/verify?token=${token}`;
    const sent = await sendMail(email, `Your ${LIVE_APP_NAME} sign-in link`,
      `Sign in to ${LIVE_APP_NAME}: ${link}\nThis link works once and expires in 15 minutes.`,
      buttonEmail(`Sign in to ${LIVE_APP_NAME}`, "Tap the button to sign in. The link works once and expires in 15 minutes.", "Sign in", link));
    if (!sent) return fail("We couldn't send the email. Check the email settings and try again.", 502);
    return json({ ok: true });
  });
}
