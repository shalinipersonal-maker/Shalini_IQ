"use client";
import { FileText, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ForecastChart } from "@/components/charts";
import { DemoGeneratedTag, InsightCard, PageHeader, toast } from "@/components/shared";
import { Badge, Button, Card, CardHeader, EmptyState, Skeleton, Switch, cn } from "@/components/ui";
import { CATEGORY_LABEL, computeInsights, type Insight, type InsightCategory } from "@/lib/ai/insights";
import { getAIProvider } from "@/lib/ai/provider";
import { forecastRevenue } from "@/lib/analytics/forecast";
import { dailySeries } from "@/lib/analytics/metrics";
import { addDays, fmtDate, fmtDateTime } from "@/lib/dates";
import { inr, signedPct, change } from "@/lib/format";
import { useCan, useStore } from "@/lib/store";
import { useScope } from "@/lib/use-scope";

const FILTERS: ("all" | InsightCategory)[] = ["all", "campaign", "budget", "product", "inventory", "revenue", "growth", "marketplace"];

export default function AICenter() {
  const scope = useScope();
  const router = useRouter();
  const cfg = useStore((s) => s.settings.ai);
  const reviewed = useStore((s) => s.reviewed);
  const log = useStore((s) => s.log);
  const canGenerate = useCan("ai.generate");
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]>("all");
  const [hideReviewed, setHideReviewed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [generatedAt, setGeneratedAt] = React.useState<number | null>(null);
  const [fresh, setFresh] = React.useState<{ key: string; list: Insight[] } | null>(null);
  const key = `${scope.ds.client.id}|${scope.from}|${scope.to}|${scope.marketplace}|${JSON.stringify(cfg)}`;
  // Insights always reflect the filters in view; "Generate" re-runs the provider and stamps the run.
  const computed = React.useMemo(() => computeInsights(scope, cfg), [scope, cfg]);
  const insights = fresh?.key === key ? fresh.list : computed;
  const fc = React.useMemo(() => forecastRevenue(dailySeries(scope, addDays(scope.ds.lastDate, -55), scope.ds.lastDate)), [scope]);
  const generate = async () => {
    setBusy(true);
    const list = await getAIProvider().generateInsights(scope, cfg);
    setFresh({ key, list });
    setGeneratedAt(Date.now());
    setBusy(false);
    log("Generated AI insights (demo engine)", scope.ds.client.name);
    toast(`${list.length} insights generated from sample data`);
  };
  const summary = insights.find((i) => i.category === "summary")!;
  const rest = insights.filter((i) => i.category !== "summary" && i.category !== "forecast");
  const shown = rest.filter((i) => (filter === "all" || i.category === filter) && !(hideReviewed && reviewed.includes(i.id)));
  const counts = { High: rest.filter((i) => i.impact === "High").length, risks: rest.filter((i) => i.kind === "risk").length, opps: rest.filter((i) => i.kind === "opportunity").length };

  return (
    <>
      <PageHeader title="AI Intelligence Center" description={<>Findings and recommendations for {scope.ds.client.name}, {fmtDate(scope.from)} – {fmtDate(scope.to)}. Every figure is calculated from the data in this workspace.</>}
        actions={<>
          <DemoGeneratedTag />
          <Button onClick={() => router.push("/reports?type=ai")}><FileText />Generate report</Button>
          <Button variant="primary" onClick={generate} disabled={busy || !canGenerate} title={canGenerate ? undefined : "Your role cannot generate insights"}><Sparkles />{busy ? "Analysing…" : "Generate insights"}</Button>
        </>} />

      <div className="grid gap-4 xl:grid-cols-[1fr_1.15fr]">
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <span className="absolute inset-y-0 left-0 w-1 bg-ai" aria-hidden />
          <p className="flex items-center gap-2 text-[12.5px] font-medium text-ai"><Sparkles className="size-4" />AI business summary</p>
          {busy ? <div className="mt-4 space-y-2.5"><Skeleton className="h-7 w-4/5" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-11/12" /><Skeleton className="h-4 w-2/3" /></div> : <>
            <h2 className="mt-3 text-[22px] leading-tight font-semibold tracking-tight">{summary.title}</h2>
            <p className="mt-2 text-[13.5px] text-muted">{summary.explanation}</p>
          </>}
          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
            <div><dt className="text-[12px] text-muted">High-impact findings</dt><dd className="tnum text-[20px] font-semibold">{counts.High}</dd></div>
            <div><dt className="text-[12px] text-muted">Risks</dt><dd className="tnum text-[20px] font-semibold">{counts.risks}</dd></div>
            <div><dt className="text-[12px] text-muted">Opportunities</dt><dd className="tnum text-[20px] font-semibold">{counts.opps}</dd></div>
          </dl>
          <p className="mt-4 text-[12px] text-faint">{generatedAt ? `Last generated ${fmtDateTime(generatedAt)}` : "Calculated live from the filters in view"} · Engine: {getAIProvider().label}</p>
        </Card>
        <Card>
          <CardHeader title="Sales forecast" subtitle={`Next ${fc.horizon} days, projected from the last 56 days`} action={<Badge tone="ai">Statistical projection</Badge>} />
          <div className="px-3 pb-2"><ForecastChart data={fc.points} fmt={(n) => inr(n, true)} height={210} /></div>
          <dl className="tnum grid grid-cols-3 gap-3 border-t border-line px-5 py-3 text-[13px]">
            <div><dt className="text-[12px] text-muted">Projected revenue</dt><dd className="font-semibold">{inr(fc.total, true)}</dd></div>
            <div><dt className="text-[12px] text-muted">Likely range</dt><dd className="font-semibold">{inr(fc.low, true)} – {inr(fc.high, true)}</dd></div>
            <div><dt className="text-[12px] text-muted">vs last {fc.horizon} days</dt><dd className="font-semibold">{signedPct(change(fc.total, fc.lastTotal))}</dd></div>
          </dl>
        </Card>
      </div>

      <div className="mt-6 mb-3 flex flex-wrap items-center gap-2">
        <div className="scroll-thin flex flex-1 gap-1.5 overflow-x-auto" role="tablist" aria-label="Insight category">
          {FILTERS.map((f) => {
            const n = f === "all" ? rest.length : rest.filter((i) => i.category === f).length;
            return (
              <button key={f} role="tab" aria-selected={filter === f} type="button" onClick={() => setFilter(f)} disabled={n === 0 && f !== "all"}
                className={cn("h-8 shrink-0 rounded-md border px-2.5 text-[12.5px] font-medium whitespace-nowrap transition-colors disabled:opacity-40", filter === f ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-muted hover:text-ink")}>
                {f === "all" ? "All insights" : CATEGORY_LABEL[f]} <span className="tnum ml-1 text-faint">{n}</span>
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-[12.5px] text-muted"><Switch label="Hide reviewed insights" checked={hideReviewed} onCheckedChange={setHideReviewed} />Hide reviewed</label>
      </div>

      {busy ? (
        <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Card key={i} className="space-y-3 p-5"><Skeleton className="h-5 w-40" /><Skeleton className="h-6 w-4/5" /><Skeleton className="h-4 w-full" /><Skeleton className="h-14 w-full" /></Card>)}</div>
      ) : shown.length ? (
        <div className="grid items-start gap-4 lg:grid-cols-2">{shown.map((i) => <InsightCard key={i.id} insight={i} scope={scope} />)}</div>
      ) : (
        <Card><EmptyState icon={<Sparkles />} title="No insights in this view" body={hideReviewed ? "Everything here has been reviewed. Turn off “Hide reviewed” to see it again." : "Widen the date range or switch category to see more findings."} /></Card>
      )}
    </>
  );
}
