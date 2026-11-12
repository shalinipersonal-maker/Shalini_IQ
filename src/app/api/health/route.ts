export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({ status: "ok", mode: process.env.NEXT_PUBLIC_DEMO_MODE === "false" ? "live" : "demo", time: new Date().toISOString() });
}
