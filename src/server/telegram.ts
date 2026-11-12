import "server-only";
import { createHash } from "node:crypto";
import { listPosts } from "./meta";
import { overview, ownerAccountId, type Overview } from "./overview";

/**
 * IQ on Telegram — Shalini's assistant. It reports important events (new enquiry, post results, sales synced,
 * boosts) as they happen, sends a morning report, and answers short questions. Only TELEGRAM_CHAT_ID (Shalini)
 * gets business data; anyone else who messages the bot is told nothing except how to set it up.
 * Setup: BotFather → /newbot → TELEGRAM_BOT_TOKEN. Then message the bot "/start" to learn the chat id.
 */
/** The token as typed in Vercel, cleaned of spaces, line breaks, quotes and a stray "bot" prefix. */
const botToken = () => (process.env.TELEGRAM_BOT_TOKEN ?? "").replace(/\s+/g, "").replace(/^["']+|["']+$/g, "").replace(/^TELEGRAM_BOT_TOKEN=/, "").replace(/^bot(?=\d)/i, "");
const API = () => `https://api.telegram.org/bot${botToken()}`;
export const telegramConfigured = () => !!botToken();
export const ownerChat = () => (process.env.TELEGRAM_CHAT_ID ?? "").replace(/\s+/g, "").replace(/^["']+|["']+$/g, "");
export const webhookSecret = () => createHash("sha256").update(`${process.env.SESSION_SECRET ?? ""}:telegram`).digest("hex").slice(0, 48);

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export async function sendTo(chatId: string, html: string): Promise<boolean> {
  if (!telegramConfigured() || !chatId) return false;
  try {
    const res = await fetch(`${API()}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML", disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Fire-and-forget alert to Shalini. Never throws. */
export const notify = (html: string) => sendTo(ownerChat(), html);

export async function setWebhook(origin: string): Promise<{ ok: boolean; bot?: string; error?: string }> {
  if (!/^\d{6,}:[A-Za-z0-9_-]{30,}$/.test(botToken())) return { ok: false, error: "TELEGRAM_BOT_TOKEN doesn't look like a bot token (numbers, a colon, then about 35 letters). Paste it again from BotFather." };
  const me = await fetch(`${API()}/getMe`).then((r) => r.json()).catch((e: Error) => ({ ok: false, description: `could not reach Telegram (${e.message})` })) as { ok?: boolean; description?: string; result?: { username?: string } };
  if (!me?.ok) return { ok: false, error: `Telegram did not accept the bot token: ${me?.description ?? "unknown reason"}. Copy it again from BotFather → /mybots → your bot → API Token.` };
  const res = await fetch(`${API()}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: `${origin}/api/telegram/webhook`, secret_token: webhookSecret(), allowed_updates: ["message"] }),
  }).then((r) => r.json()).catch(() => null) as { ok?: boolean; description?: string } | null;
  return res?.ok ? { ok: true, bot: me.result?.username } : { ok: false, error: res?.description ?? "Telegram refused the webhook" };
}

/* ---------- Reports ---------- */
function trend(now: number, before: number): string {
  if (!before) return "";
  const pct = Math.round(((now - before) / before) * 100);
  return pct === 0 ? " (same as the 30 days before)" : ` (${pct > 0 ? "▲" : "▼"} ${Math.abs(pct)}% vs the 30 days before)`;
}

export function dailyReport(o: Overview, greeting = "Good morning, Shalini ☀️"): string {
  const lines = [
    `<b>${esc(greeting)}</b>`,
    "",
    `📩 <b>Enquiries:</b> ${o.leads.today} today · ${o.leads.week} this week`,
    `🛒 <b>Sales (30 days):</b> ${inr(o.sales.revenue30)} · ${o.sales.orders30} orders${trend(o.sales.revenue30, o.sales.revenuePrev30)}`,
    o.sales.topProduct ? `🏆 <b>Top product:</b> ${esc(o.sales.topProduct)}` : "",
    `📣 <b>Posts:</b> ${o.posts.week} this week · ${o.posts.likes} likes · ${o.posts.comments} comments in total`,
    o.ads.running || o.ads.spend ? `🎯 <b>Boosts:</b> ${o.ads.running} running · ${inr(o.ads.spend)} spent · ${o.ads.reach.toLocaleString("en-IN")} people reached` : "",
    "",
    nextStep(o),
  ];
  return lines.filter((l, i, a) => l !== "" || (a[i - 1] ?? "") !== "").join("\n").trim();
}

/** One suggested action, from the numbers (rules, not guesses). */
function nextStep(o: Overview): string {
  if (o.leads.today > 0) return `👉 Call today's ${o.leads.today === 1 ? "enquiry" : `${o.leads.today} enquiries`} first — quick replies win orders. /leads`;
  if (o.posts.week === 0) return "👉 No post this week yet. Post one creative today to keep people coming to your Page.";
  if (o.sales.lastDay && Date.now() - Date.parse(o.sales.lastDay) > 3 * 86400000) return "👉 Sales data is more than 3 days old. Press Sync Amazon / Sync Flipkart on the dashboard.";
  if (o.posts.best && o.posts.best.likes + o.posts.best.comments >= 10 && !o.ads.running) return "👉 Your best post is getting attention. Consider a small boost from the dashboard.";
  return "👉 All steady. Keep posting and replying to every enquiry.";
}

/* ---------- Conversation ---------- */
const HELP = [
  "<b>I'm IQ, your Shalini_IQ assistant.</b> Ask me:",
  "/today — the full report",
  "/leads — latest enquiries",
  "/sales — sales for the last 30 days",
  "/posts — how your posts are doing",
  "/ads — boosts and spend",
  "You can also just type: <i>sales</i>, <i>leads</i>, <i>posts</i>, <i>ads</i>.",
].join("\n");

export async function handleMessage(chatId: string, text: string): Promise<void> {
  const t = text.trim().toLowerCase();
  if (chatId !== ownerChat()) {
    if (t.startsWith("/start")) await sendTo(chatId, `Hi! This bot belongs to Shalini_IQ.\nYour chat ID is <code>${esc(chatId)}</code>.\nIf you are the owner, add it in Vercel as <b>TELEGRAM_CHAT_ID</b> and redeploy.`);
    return;
  }
  const acc = await ownerAccountId();
  if (!acc) { await sendTo(chatId, "Sign in once on the Shalini_IQ dashboard (/account), then ask me again."); return; }
  await listPosts(acc).catch(() => null); // latest reactions/comments before answering
  const o = await overview(acc);
  // Whole-word starts only, so "this" doesn't count as "hi".
  const has = (...w: string[]) => w.some((x) => new RegExp(`(^|[^a-z])${x.replace(/[/]/g, "\\/")}`).test(t));

  if (has("/start", "/help", "help") || /^(hi|hello|hey|vanakkam)\b/.test(t)) return void (await sendTo(chatId, HELP));
  if (has("/today", "today", "report", "summary", "update", "status")) return void (await sendTo(chatId, dailyReport(o, "Here's where things stand")));
  if (has("/leads", "lead", "enquir", "inquir", "customer")) {
    const rows = o.leads.latest.map((l) => `• <b>${esc(l.name)}</b> — ${esc(l.interest)}${l.phone ? ` · <a href="tel:${esc(l.phone)}">${esc(l.phone)}</a>` : ""}`);
    return void (await sendTo(chatId, rows.length ? `<b>Latest enquiries</b> (${o.leads.week} this week)\n${rows.join("\n")}` : "No enquiries yet."));
  }
  if (has("/sales", "sale", "revenue", "order", "amazon", "flipkart")) {
    const src = o.sales.bySource.map((s) => `• ${esc(s.source)}: ${inr(s.revenue)}`).join("\n");
    return void (await sendTo(chatId, o.sales.revenue30 || o.sales.orders30
      ? `<b>Sales, last 30 days</b>\n${inr(o.sales.revenue30)} · ${o.sales.orders30} orders · ${o.sales.units30} units${trend(o.sales.revenue30, o.sales.revenuePrev30)}\n${src}${o.sales.topProduct ? `\nTop: ${esc(o.sales.topProduct)}` : ""}`
      : "No sales data yet. Connect Amazon / Flipkart or upload a report on the dashboard."));
  }
  if (has("/posts", "post", "facebook", "instagram", "threads", "like", "comment")) {
    const b = o.posts.best;
    return void (await sendTo(chatId, `<b>Posts</b>\n${o.posts.total} published · ${o.posts.week} this week\n${o.posts.likes} likes · ${o.posts.comments} comments${b ? `\nBest: ${esc(b.label)} (${b.likes} likes, ${b.comments} comments)${b.link ? `\n${esc(b.link)}` : ""}` : ""}`));
  }
  if (has("/ads", "ads", "boost", "spend", "budget")) {
    return void (await sendTo(chatId, o.ads.running || o.ads.spend
      ? `<b>Boosts</b>\n${o.ads.running} running · ${inr(o.ads.spend)} spent\n${o.ads.reach.toLocaleString("en-IN")} people reached · ${o.ads.clicks} clicks`
      : "No boosts yet. On the dashboard, pick a Facebook post and press Boost."));
  }
  await sendTo(chatId, `I didn't catch that.\n\n${HELP}`);
}
