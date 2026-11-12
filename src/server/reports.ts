import "server-only";
import { sql } from "./db";
import { listPosts } from "./meta";
import { overview, ownerAccountId } from "./overview";
import { dailyReport, notify } from "./telegram";

/** Report times in India time (24-hour clock) and how each one opens. */
export const REPORT_SLOTS: { hour: number; greeting: string }[] = [
  { hour: 9, greeting: "Good morning, Shalini ☀️" },
  { hour: 12, greeting: "Midday update, Shalini 🕛" },
  { hour: 18, greeting: "Evening update, Shalini 🌇" },
  { hour: 21, greeting: "Night summary, Shalini 🌙" },
];

/** Current date and hour in India (UTC+5:30). */
function istNow() {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000);
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours() };
}

/**
 * Sends the report for the current slot once (the watchdog calls this every 15 minutes, so it fires within
 * 15 minutes of 9 AM, 12 PM, 6 PM and 9 PM IST). Each slot is remembered, so a report is never sent twice.
 * `extra` is added to the message (e.g. sync results from the morning job).
 */
export async function sendDueReport(extra = ""): Promise<string | null> {
  const acc = await ownerAccountId();
  if (!acc) return null;
  const { date, hour } = istNow();
  const slot = [...REPORT_SLOTS].reverse().find((s) => hour >= s.hour && hour < s.hour + 2);
  if (!slot) return null;
  const key = `report_${date}_${slot.hour}`;
  // Claim the slot first (atomic), so two callers at the same moment can't both send it.
  const claimed = await sql(`INSERT INTO live_kv (account_id, k, v) VALUES ($1, $2, $3) ON CONFLICT (account_id, k) DO NOTHING RETURNING k`, [acc, key, new Date().toISOString()]);
  if (!claimed.length) return null;
  await listPosts(acc, true).catch(() => null);
  const ok = await notify(dailyReport(await overview(acc), slot.greeting) + extra);
  if (!ok) await sql(`DELETE FROM live_kv WHERE account_id = $1 AND k = $2`, [acc, key]).catch(() => null); // try again next run
  return ok ? key : null;
}
