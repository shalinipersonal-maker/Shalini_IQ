import { handleMessage, webhookSecret } from "@/server/telegram";

export const dynamic = "force-dynamic";

/** Telegram delivers Shalini's messages here. The secret header proves the call really came from Telegram. */
export async function POST(request: Request) {
  if (request.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret()) return new Response("Forbidden", { status: 403 });
  const update = (await request.json().catch(() => ({}))) as { message?: { chat?: { id?: number | string }; text?: string } };
  const chat = update.message?.chat?.id;
  const text = update.message?.text;
  if (chat != null && text) {
    try { await handleMessage(String(chat), text); } catch (e) { console.error("[telegram]", e instanceof Error ? e.message : e); }
  }
  return Response.json({ ok: true });
}
