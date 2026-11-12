import "server-only";
import { SITE } from "@/config/site";
import { open as unseal } from "./connectors/token-vault";
import { sql } from "./db";
import { mailConfigured, mailMethod } from "./mail";
import { graph, listPosts } from "./meta";
import { ownerAccountId } from "./overview";
import { newOrders, shopInfo, shopifyConfigured } from "./shopify";
import { notify, repairWebhook, telegramConfigured } from "./telegram";

/**
 * IQ's watchdog. Checks every live connection, repairs what it safely can (the Telegram webhook), and tells
 * Shalini on Telegram only when something CHANGES — a problem starts, or it is fixed — so she is never spammed.
 * Run by the external guard (.github/workflows/watchdog.yml, every 15 minutes) and by the 9 AM job.
 */
export interface Check { key: string; label: string; ok: boolean; detail: string }

export async function runHealth(): Promise<Check[]> {
  const checks: Check[] = [];
  const add = (key: string, label: string, ok: boolean, detail: string) => checks.push({ key, label, ok, detail });

  try { await sql("SELECT 1"); add("db", "Database", true, "reachable"); }
  catch (e) { add("db", "Database", false, e instanceof Error ? e.message : "unreachable"); return checks; }

  add("email", "Email sending", mailConfigured(), mailConfigured() ? `configured (${mailMethod()})` : "GMAIL_USER / GMAIL_APP_PASSWORD missing");

  if (telegramConfigured()) {
    const r = await repairWebhook(SITE.url);
    add("telegram", "Telegram bot", r.ok, r.detail);
  }

  if (shopifyConfigured()) {
    try { const s = await shopInfo(); add("shopify", `Shopify · ${s.name}`, true, "connected"); }
    catch (e) { add("shopify", "Shopify", false, e instanceof Error ? e.message : "not reachable"); }
  }

  const acc = await ownerAccountId();
  if (acc) {
    const targets = await sql(`SELECT kind, external_id, name, token FROM live_meta_targets WHERE account_id = $1 AND kind IN ('facebook','instagram','threads')`, [acc]);
    for (const t of targets) {
      const label = `${t.kind === "facebook" ? "Facebook" : t.kind === "instagram" ? "Instagram" : "Threads"} · ${t.name ?? ""}`;
      try {
        const token = unseal(t.token!);
        if (t.kind === "threads") {
          const res = await fetch(`https://graph.threads.net/v1.0/me?fields=id&access_token=${encodeURIComponent(token)}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
          if (!res.ok) throw new Error(`Threads answered ${res.status}`);
        } else {
          await graph(`/${t.external_id}`, { query: { fields: "id", access_token: token } });
        }
        add(`meta:${t.kind}:${t.external_id}`, label, true, "connected");
      } catch (e) {
        add(`meta:${t.kind}:${t.external_id}`, label, false, `${e instanceof Error ? e.message : "not reachable"} — press Reconnect on the dashboard`);
      }
    }
  }
  return checks;
}

/** Runs the checks and sends one Telegram message listing what broke or recovered since the last run. */
export async function watch(): Promise<{ checks: Check[]; changed: number }> {
  const checks = await runHealth();
  const acc = (await ownerAccountId().catch(() => null)) ?? "system";
  let prev: Record<string, boolean> = {};
  try {
    const r = (await sql(`SELECT v FROM live_kv WHERE account_id = $1 AND k = 'health'`, [acc]))[0];
    prev = r?.v ? JSON.parse(r.v) : {};
  } catch { /* first run */ }
  const now: Record<string, boolean> = Object.fromEntries(checks.map((c) => [c.key, c.ok]));
  const broke = checks.filter((c) => !c.ok && prev[c.key] !== false);
  const fixed = checks.filter((c) => c.ok && prev[c.key] === false);
  if (broke.length || fixed.length) {
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
    await notify([
      ...broke.map((c) => `⚠️ <b>${esc(c.label)}</b>: ${esc(c.detail)}`),
      ...fixed.map((c) => `✅ <b>${esc(c.label)}</b> is working again.`),
    ].join("\n"));
  }
  // New Shopify orders since the last check → one Telegram message each.
  if (shopifyConfigured() && checks.find((c) => c.key === "shopify")?.ok) {
    try {
      const last = (await sql(`SELECT v FROM live_kv WHERE account_id = $1 AND k = 'shopify_last'`, [acc]))[0]?.v;
      const since = last ?? new Date().toISOString();
      const fresh = last ? await newOrders(since) : [];
      for (const o of fresh.slice(0, 10).reverse()) {
        const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
        await notify(`🛒 <b>New Shopify order ${esc(o.name)}</b> — ${o.currency === "INR" ? "₹" : `${o.currency} `}${Number(o.total).toLocaleString("en-IN")}${o.customer ? ` · ${esc(o.customer)}` : ""}\n${esc(o.items)}`);
      }
      const newest = fresh[0]?.createdAt ?? since;
      await sql(`INSERT INTO live_kv (account_id, k, v) VALUES ($1, 'shopify_last', $2) ON CONFLICT (account_id, k) DO UPDATE SET v = EXCLUDED.v`, [acc, newest]);
    } catch { /* try again next run */ }
  }
  // New likes and comments on her posts since the last check (every 15 minutes).
  if (acc !== "system") {
    try {
      const { posts } = await listPosts(acc, true);
      const seenRow = (await sql(`SELECT v FROM live_kv WHERE account_id = $1 AND k = 'posts_seen'`, [acc]))[0]?.v;
      const seen: Record<string, [number, number]> = seenRow ? JSON.parse(seenRow) : {};
      const nowSeen: Record<string, [number, number]> = {};
      const lines: string[] = [];
      const esc = (x: string) => x.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
      for (const p of posts) {
        if (p.status !== "published") continue;
        const l = p.likes ?? 0, cm = p.comments ?? 0; nowSeen[p.id] = [l, cm];
        const old = seen[p.id];
        if (!seenRow || !old) continue;
        const dl = l - old[0], dc = cm - old[1];
        if (dl > 0 || dc > 0) lines.push(`• ${esc(p.targetName)}: ${dc > 0 ? `💬 +${dc} comment${dc > 1 ? "s" : ""} ` : ""}${dl > 0 ? `👍 +${dl} like${dl > 1 ? "s" : ""}` : ""}
  “${esc(p.caption.slice(0, 60))}”${p.permalink ? `
  ${esc(p.permalink)}` : ""}`);
      }
      if (lines.length) await notify(`🔔 <b>New activity on your posts</b>\n${lines.slice(0, 8).join("\n")}`);
      await sql(`INSERT INTO live_kv (account_id, k, v) VALUES ($1, 'posts_seen', $2) ON CONFLICT (account_id, k) DO UPDATE SET v = EXCLUDED.v`, [acc, JSON.stringify(nowSeen)]);
    } catch { /* try again next run */ }
  }
  await sql(`INSERT INTO live_kv (account_id, k, v) VALUES ($1, 'health', $2) ON CONFLICT (account_id, k) DO UPDATE SET v = EXCLUDED.v`, [acc, JSON.stringify(now)]).catch(() => null);
  return { checks, changed: broke.length + fixed.length };
}
