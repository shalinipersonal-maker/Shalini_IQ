import "server-only";
import { num, sql } from "./db";

/**
 * One fast read of everything that matters, for the dashboard tiles and the Telegram bot.
 * All figures come from Shalini_IQ's own database (enquiries, posts, sales, boosts) — nothing is estimated.
 */
export interface Overview {
  leads: { today: number; week: number; total: number; latest: { name: string; interest: string; phone: string; at: string }[] };
  sales: { revenue30: number; orders30: number; units30: number; revenuePrev30: number; topProduct: string | null; lastDay: string | null; bySource: { source: string; revenue: number }[] };
  posts: { total: number; week: number; likes: number; comments: number; best: { label: string; likes: number; comments: number; link: string | null } | null };
  ads: { running: number; spend: number; reach: number; clicks: number };
}

export async function overview(accountId: string): Promise<Overview> {
  const [l, latest, s, prev, top, src, p, best, a] = await Promise.all([
    sql(`SELECT count(*) FILTER (WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata') AS today,
                count(*) FILTER (WHERE created_at >= now() - interval '7 days') AS week, count(*) AS total FROM live_leads`),
    sql(`SELECT name, COALESCE(interest, kind) AS interest, phone, created_at FROM live_leads ORDER BY created_at DESC LIMIT 5`),
    sql(`SELECT COALESCE(SUM(amount),0) AS revenue, COUNT(DISTINCT NULLIF(order_id,'')) AS orders, COALESCE(SUM(quantity),0) AS units, MAX(order_date) AS last
         FROM live_sales WHERE account_id = $1 AND (order_date IS NULL OR order_date >= current_date - 30)`, [accountId]),
    sql(`SELECT COALESCE(SUM(amount),0) AS revenue FROM live_sales WHERE account_id = $1 AND order_date >= current_date - 60 AND order_date < current_date - 30`, [accountId]),
    sql(`SELECT COALESCE(NULLIF(title,''), sku) AS product FROM live_sales WHERE account_id = $1 AND (order_date IS NULL OR order_date >= current_date - 30) GROUP BY 1 ORDER BY SUM(amount) DESC NULLS LAST LIMIT 1`, [accountId]),
    sql(`SELECT source, COALESCE(SUM(amount),0) AS revenue FROM live_sales WHERE account_id = $1 AND (order_date IS NULL OR order_date >= current_date - 30) GROUP BY source ORDER BY 2 DESC`, [accountId]),
    sql(`SELECT count(*) AS total, count(*) FILTER (WHERE created_at >= now() - interval '7 days') AS week, COALESCE(SUM(likes),0) AS likes, COALESCE(SUM(comments),0) AS comments
         FROM live_posts WHERE account_id = $1 AND status = 'published'`, [accountId]),
    sql(`SELECT target_name, caption, likes, comments, permalink FROM live_posts WHERE account_id = $1 AND status = 'published' ORDER BY COALESCE(likes,0) + 2 * COALESCE(comments,0) DESC, created_at DESC LIMIT 1`, [accountId]),
    sql(`SELECT count(*) FILTER (WHERE status = 'running') AS running, COALESCE(SUM(spend),0) AS spend, COALESCE(SUM(reach),0) AS reach, COALESCE(SUM(clicks),0) AS clicks FROM live_boosts WHERE account_id = $1`, [accountId]),
  ]);
  const b = best[0];
  return {
    leads: {
      today: num(l[0]?.today), week: num(l[0]?.week), total: num(l[0]?.total),
      latest: latest.map((r) => ({ name: r.name ?? "", interest: r.interest ?? "", phone: r.phone ?? "", at: r.created_at ?? "" })),
    },
    sales: {
      revenue30: num(s[0]?.revenue), orders30: num(s[0]?.orders), units30: num(s[0]?.units), revenuePrev30: num(prev[0]?.revenue),
      topProduct: top[0]?.product ?? null, lastDay: s[0]?.last ?? null, bySource: src.map((r) => ({ source: r.source ?? "", revenue: num(r.revenue) })),
    },
    posts: {
      total: num(p[0]?.total), week: num(p[0]?.week), likes: num(p[0]?.likes), comments: num(p[0]?.comments),
      best: b ? { label: `${b.target_name ?? ""}: ${(b.caption ?? "").slice(0, 50)}`, likes: num(b.likes), comments: num(b.comments), link: b.permalink } : null,
    },
    ads: { running: num(a[0]?.running), spend: num(a[0]?.spend), reach: num(a[0]?.reach), clicks: num(a[0]?.clicks) },
  };
}

/** The live account that owns this deployment: the first email in LIVE_ALLOWED_EMAILS that has signed in. */
export async function ownerAccountId(): Promise<string | null> {
  const emails = (process.env.LIVE_ALLOWED_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!emails.length) return null;
  const rows = await sql(`SELECT id, email FROM live_accounts WHERE email = ANY($1::text[])`, [`{${emails.map((e) => `"${e}"`).join(",")}}`]);
  for (const e of emails) { const r = rows.find((x) => x.email === e); if (r) return r.id!; }
  return null;
}
