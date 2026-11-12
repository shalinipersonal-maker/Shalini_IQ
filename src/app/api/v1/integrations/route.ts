import { connectors } from "@/server/connectors/registry";
import { allow } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

/** Connection status of every connector, derived from server environment only. Never returns secrets or their values. */
export function GET(request: Request) {
  if (!allow(request)) return Response.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "2" } });
  return Response.json({ demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== "false", connectors: connectors.map((c) => c.status()) }, { headers: { "Cache-Control": "no-store" } });
}
