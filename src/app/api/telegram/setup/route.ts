import { SITE } from "@/config/site";
import { fail, json, withAccount } from "@/server/live-api";
import { notify, ownerChat, setWebhook, telegramConfigured } from "@/server/telegram";

export const dynamic = "force-dynamic";

/** "Activate the bot": points Telegram at this site and sends a hello to Shalini if her chat id is set. */
export async function POST(request: Request) {
  return withAccount(async () => {
    if (!telegramConfigured()) return fail("Add TELEGRAM_BOT_TOKEN in Vercel first.", 503);
    // Always register the site's fixed public address: per-deploy addresses (name-abc123-….vercel.app) are login-protected.
    const here = new URL(request.url).origin;
    const fixed = /^https:\/\/[^/]+$/.test(SITE.url) && !SITE.url.includes("entrabuild") ? SITE.url : here;
    const r = await setWebhook(fixed);
    if (!r.ok) return fail(r.error ?? "Telegram setup failed", 502);
    const greeted = ownerChat() ? await notify("✅ <b>IQ is connected.</b> I'll tell you about new enquiries, posts, sales and boosts, and send a report every morning. Type /help to see what I can do.") : false;
    return json({ ok: true, bot: r.bot, chatSet: !!ownerChat(), greeted });
  });
}
