import { TokenBucket } from "./connectors/resilience";

// Per-client limiter for API routes. In-memory, so it protects a single instance; use Redis behind a load balancer.
const buckets = new Map<string, TokenBucket>();
export function allow(request: Request, ratePerSecond = 5, burst = 20): boolean {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (buckets.size > 5000) buckets.clear();
  const b = buckets.get(ip) ?? buckets.set(ip, new TokenBucket(ratePerSecond, burst)).get(ip)!;
  return b.take() === 0;
}
