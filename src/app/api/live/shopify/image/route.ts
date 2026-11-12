import { withAccount } from "@/server/live-api";

export const dynamic = "force-dynamic";

/** Fetches a product photo from Shopify's image CDN so the browser can turn it into a post (same-origin). */
export async function GET(request: Request) {
  return withAccount(async () => {
    const src = new URL(request.url).searchParams.get("src") ?? "";
    let u: URL;
    try { u = new URL(src); } catch { return new Response("Bad image", { status: 400 }); }
    if (u.protocol !== "https:" || !/(^|\.)cdn\.shopify\.com$|(^|\.)shopify\.com$/.test(u.hostname)) return new Response("Only Shopify images", { status: 400 });
    const res = await fetch(u, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return new Response("Image not found", { status: 404 });
    return new Response(await res.arrayBuffer(), { headers: { "Content-Type": res.headers.get("content-type") ?? "image/jpeg", "Cache-Control": "private, max-age=3600" } });
  });
}
