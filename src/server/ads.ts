import "server-only";
import { newId, num, sql } from "./db";
import { graph, userToken } from "./meta";

/**
 * "Boost this post": a small, time-limited Meta ad built from a Facebook post that Shalini_IQ published.
 * Uses the Marketing API with the person's own token (ads_management). Money is only spent after the person
 * confirms the daily budget and number of days; every boost has a hard end date and can be paused here.
 */
export interface AdAccount { id: string; name: string; currency: string; status: number }

export async function adAccounts(accountId: string): Promise<AdAccount[]> {
  const token = await userToken(accountId);
  if (!token) return [];
  const r = await graph<{ data: { id: string; name: string; currency: string; account_status: number }[] }>("/me/adaccounts", {
    query: { fields: "id,name,currency,account_status", limit: "25", access_token: token },
  });
  return r.data.map((a) => ({ id: a.id, name: a.name, currency: a.currency, status: a.account_status }));
}

export interface BoostInput { postId: string; adAccount: string; dailyBudget: number; days: number; ageMin: number; ageMax: number; city?: string }

/** Creates campaign → ad set → ad, all ACTIVE, ending after `days`. Budget is in the ad account's currency (e.g. ₹). */
export async function boostPost(accountId: string, b: BoostInput): Promise<{ id: string; status: string; error?: string }> {
  const token = await userToken(accountId);
  if (!token) throw new Error("Reconnect Facebook first (press Reconnect / add Pages) so Shalini_IQ gets ads permission.");
  const post = (await sql(`SELECT p.external_id, p.caption, p.target_name FROM live_posts p WHERE p.id = $1 AND p.account_id = $2 AND p.kind = 'facebook' AND p.status = 'published'`, [b.postId, accountId]))[0];
  if (!post?.external_id) throw new Error("Choose a published Facebook post to boost.");
  const acct = (await adAccounts(accountId)).find((a) => a.id === b.adAccount);
  if (!acct) throw new Error("That ad account was not found. Check Meta Ads Manager → Settings.");

  const id = newId();
  const label = `${post.target_name ?? "Page"}: ${(post.caption ?? "").slice(0, 40) || "post"}`;
  await sql(`INSERT INTO live_boosts (id, account_id, post_id, post_label, ad_account, daily_budget, days, currency, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'creating')`,
    [id, accountId, b.postId, label, acct.id, b.dailyBudget, b.days, acct.currency]);
  const end = new Date(Date.now() + b.days * 86400000).toISOString();
  const q = (o: Record<string, unknown>) => Object.fromEntries(Object.entries({ ...o, access_token: token }).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
  try {
    const camp = await graph<{ id: string }>(`/${acct.id}/campaigns`, { method: "POST", query: q({
      name: `Shalini_IQ boost · ${label}`, objective: "OUTCOME_ENGAGEMENT", status: "ACTIVE", special_ad_categories: [], is_adset_budget_sharing_enabled: false,
    }) });
    await sql(`UPDATE live_boosts SET campaign_id = $2 WHERE id = $1`, [id, camp.id]);
    let geo: Record<string, unknown> = { countries: ["IN"] };
    if (b.city) {
      const found = await graph<{ data: { key: string }[] }>("/search", { query: { type: "adgeolocation", location_types: JSON.stringify(["city"]), q: b.city, country_code: "IN", limit: "1", access_token: token } });
      if (found.data[0]) geo = { cities: [{ key: found.data[0].key, radius: 25, distance_unit: "kilometer" }] };
    }
    const set = await graph<{ id: string }>(`/${acct.id}/adsets`, { method: "POST", query: q({
      name: `Shalini_IQ · ${b.days} days`, campaign_id: camp.id, status: "ACTIVE",
      daily_budget: String(Math.round(b.dailyBudget * 100)), billing_event: "IMPRESSIONS", optimization_goal: "POST_ENGAGEMENT", bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      end_time: end, targeting: { geo_locations: geo, age_min: b.ageMin, age_max: b.ageMax, targeting_automation: { advantage_audience: 0 } },
    }) });
    const creative = await graph<{ id: string }>(`/${acct.id}/adcreatives`, { method: "POST", query: q({ name: `Shalini_IQ · ${label}`, object_story_id: post.external_id }) });
    const ad = await graph<{ id: string }>(`/${acct.id}/ads`, { method: "POST", query: q({ name: `Shalini_IQ · ${label}`, adset_id: set.id, creative: { creative_id: creative.id }, status: "ACTIVE" }) });
    await sql(`UPDATE live_boosts SET adset_id = $2, ad_id = $3, status = 'running' WHERE id = $1`, [id, set.id, ad.id]);
    return { id, status: "running" };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Meta refused the boost";
    await sql(`UPDATE live_boosts SET status = 'failed', error = $2 WHERE id = $1`, [id, error]);
    // Nothing half-made keeps spending: switch off the campaign if it was created.
    const c = (await sql(`SELECT campaign_id FROM live_boosts WHERE id = $1`, [id]))[0]?.campaign_id;
    if (c) await graph(`/${c}`, { method: "POST", query: { status: "PAUSED", access_token: token } }).catch(() => undefined);
    return { id, status: "failed", error };
  }
}

export async function setBoostStatus(accountId: string, boostId: string, status: "PAUSED" | "ACTIVE"): Promise<void> {
  const token = await userToken(accountId);
  const r = (await sql(`SELECT campaign_id FROM live_boosts WHERE id = $1 AND account_id = $2`, [boostId, accountId]))[0];
  if (!token || !r?.campaign_id) throw new Error("Boost not found");
  await graph(`/${r.campaign_id}`, { method: "POST", query: { status, access_token: token } });
  await sql(`UPDATE live_boosts SET status = $3 WHERE id = $1 AND account_id = $2`, [boostId, accountId, status === "PAUSED" ? "paused" : "running"]);
}

export interface BoostRow { id: string; label: string; status: string; error: string | null; dailyBudget: number; days: number; currency: string; spend: number; reach: number; clicks: number; createdAt: string }

/** Boosts with results; refreshes spend/reach/clicks from Meta at most every 15 minutes. */
export async function listBoosts(accountId: string): Promise<BoostRow[]> {
  const rows = await sql(`SELECT *, (checked_at IS NULL OR checked_at < now() - interval '15 minutes') AS stale FROM live_boosts WHERE account_id = $1 ORDER BY created_at DESC LIMIT 20`, [accountId]);
  const token = rows.some((r) => r.stale === "t" && r.campaign_id) ? await userToken(accountId).catch(() => null) : null;
  for (const r of rows) {
    if (!token || r.stale !== "t" || !r.campaign_id || r.status === "failed") continue;
    try {
      const ins = await graph<{ data: { spend?: string; reach?: string; clicks?: string }[] }>(`/${r.campaign_id}/insights`, { query: { fields: "spend,reach,clicks", date_preset: "maximum", access_token: token } });
      const d = ins.data[0] ?? {};
      const ended = Date.parse(r.created_at!) + num(r.days) * 86400000 < Date.now();
      await sql(`UPDATE live_boosts SET spend = $2, reach = $3, clicks = $4, checked_at = now(), status = CASE WHEN $5 AND status = 'running' THEN 'ended' ELSE status END WHERE id = $1`,
        [r.id, num(d.spend), num(d.reach), num(d.clicks), ended]);
      r.spend = d.spend ?? "0"; r.reach = d.reach ?? "0"; r.clicks = d.clicks ?? "0";
      if (ended && r.status === "running") r.status = "ended";
    } catch { /* keep last numbers */ }
  }
  return rows.map((r) => ({
    id: r.id!, label: r.post_label ?? "", status: r.status!, error: r.error, dailyBudget: num(r.daily_budget), days: num(r.days), currency: r.currency ?? "INR",
    spend: num(r.spend), reach: num(r.reach), clicks: num(r.clicks), createdAt: r.created_at!,
  }));
}
