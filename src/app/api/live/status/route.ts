import { json } from "@/server/live-api";

export const dynamic = "force-dynamic";

/** Which live services are configured — names only, never the values. */
export function GET() {
  const set = (k: string) => !!process.env[k];
  return json({
    ok: true,
    database: set("DATABASE_URL"),
    email: set("RESEND_API_KEY") && set("MAIL_FROM"),
    alertEmail: set("ALERT_EMAIL"),
    sessionSecret: set("SESSION_SECRET"),
    vault: set("TOKEN_ENCRYPTION_KEY"),
    meta: set("META_APP_ID") && set("META_APP_SECRET"),
    allowList: set("LIVE_ALLOWED_EMAILS"),
    threads: set("THREADS_APP_ID") && set("THREADS_APP_SECRET"),
    amazon: set("AMAZON_SP_CLIENT_ID") && set("AMAZON_SP_CLIENT_SECRET") && set("AMAZON_SP_REFRESH_TOKEN"),
    flipkart: set("FLIPKART_APP_ID") && set("FLIPKART_APP_SECRET"),
    shopify: set("SHOPIFY_STORE_DOMAIN") && (set("SHOPIFY_ADMIN_TOKEN") || (set("SHOPIFY_CLIENT_ID") && set("SHOPIFY_CLIENT_SECRET"))),
    telegram: set("TELEGRAM_BOT_TOKEN"),
    telegramChat: set("TELEGRAM_CHAT_ID"),
    cron: set("CRON_SECRET"),
  });
}
