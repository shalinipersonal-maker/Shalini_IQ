"use client";
import { ArrowDown, ArrowDownRight, ArrowUp, ArrowUpRight, Check, CircleAlert, FileText, Info, Lightbulb, Sparkles, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { create } from "zustand";
import { getAIProvider } from "@/lib/ai/provider";
import { CATEGORY_LABEL, type Insight } from "@/lib/ai/insights";
import type { Scope } from "@/lib/analytics/metrics";
import type { Product } from "@/lib/demo/types";
import { signedPct } from "@/lib/format";
import { toastBus, useStore } from "@/lib/store";
import { Badge, Button, Card, EmptyState, Modal, Skeleton, Tip, cn, type Tone } from "../ui";

/* ---------- Toasts ---------- */
interface Toast { id: number; msg: string; tone: "ok" | "error" }
const useToasts = create<{ list: Toast[]; push: (msg: string, tone?: "ok" | "error") => void }>((set) => ({
  list: [],
  push: (msg, tone = "ok") => {
    const id = Date.now() + Math.random();
    set((s) => ({ list: [...s.list, { id, msg, tone }] }));
    setTimeout(() => set((s) => ({ list: s.list.filter((t) => t.id !== id) })), 4200);
  },
}));
export const toast = (msg: string, tone: "ok" | "error" = "ok") => useToasts.getState().push(msg, tone);
toastBus.push = (m, t) => toast(m, t);
export function Toaster() {
  const list = useToasts((s) => s.list);
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[70] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className="overlay-in pointer-events-auto flex items-start gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-[13px] shadow-card">
          {t.tone === "ok" ? <Check className="mt-0.5 size-4 shrink-0 text-pos" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-neg" />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Page header ---------- */
export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] leading-tight font-semibold">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-[13.5px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Delta + metric card ---------- */
/** `goodWhen` controls colour: revenue up is good, ACOS up is bad, spend is neutral. */
export function Delta({ value, goodWhen = "up", className }: { value: number | null; goodWhen?: "up" | "down" | "neutral"; className?: string }) {
  if (value === null || !isFinite(value)) return <span className={cn("text-[12px] text-faint", className)}>no prior data</span>;
  const up = value >= 0;
  const good = goodWhen === "neutral" || Math.abs(value) < 0.0005 ? null : (goodWhen === "up") === up;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={cn("tnum inline-flex items-center gap-0.5 text-[12px] font-medium", good === null ? "text-muted" : good ? "text-pos" : "text-neg", className)}>
      <Icon className="size-3" strokeWidth={2.5} />
      {signedPct(value).slice(1)}
    </span>
  );
}
export function MetricCard({ label, value, delta, goodWhen, hint, children, className }: { label: string; value: string; delta?: number | null; goodWhen?: "up" | "down" | "neutral"; hint?: string; children?: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("px-4 py-3.5", className)}>
      <div className="flex items-center gap-1 text-[12.5px] text-muted">
        {label}
        {hint && <Tip text={hint}><button type="button" aria-label={`About ${label}`} className="text-faint hover:text-muted"><Info className="size-3.5" /></button></Tip>}
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="tnum truncate text-[22px] leading-7 font-semibold tracking-tight">{value}</p>
          {delta !== undefined && <p className="mt-0.5 flex items-center gap-1.5"><Delta value={delta} goodWhen={goodWhen} /><span className="text-[12px] text-faint">vs previous</span></p>}
        </div>
        {children}
      </div>
    </Card>
  );
}

/* ---------- Status badge ---------- */
const STATUS_TONE: Record<string, Tone> = {
  active: "pos", Active: "pos", Healthy: "pos", "Top performer": "accent", Growing: "pos", Delivered: "pos",
  paused: "warn", Paused: "warn", Low: "warn", Onboarding: "warn", onboarding: "warn", invited: "warn", Overstock: "warn",
  Critical: "neg", "Out of stock": "neg", Declining: "neg", deactivated: "neg",
  draft: "neutral", Stable: "neutral", "Demo data": "accent", "Not connected": "neutral", "Coming soon": "neutral",
};
export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"} dot>{status[0].toUpperCase() + status.slice(1)}</Badge>;
}

/* ---------- Product thumb ---------- */
export function ProductThumb({ product, size = 36 }: { product: Pick<Product, "name" | "hue">; size?: number }) {
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-md font-semibold text-white" style={{ width: size, height: size, fontSize: size * 0.34, background: `hsl(${product.hue} 42% 44%)` }}>
      {product.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}
    </span>
  );
}

/* ---------- Data table ---------- */
export interface Column<T> { key: string; header: string; cell: (row: T) => React.ReactNode; sort?: (row: T) => number | string; align?: "right"; hint?: string; className?: string }
export function DataTable<T>({ columns, rows, rowKey, onRowClick, defaultSort, empty, dense }: { columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; onRowClick?: (r: T) => void; defaultSort?: { key: string; dir: "asc" | "desc" }; empty?: React.ReactNode; dense?: boolean }) {
  const [sort, setSort] = React.useState(defaultSort);
  const sorted = React.useMemo(() => {
    const col = columns.find((c) => c.key === sort?.key);
    if (!col?.sort || !sort) return rows;
    const s = col.sort;
    return [...rows].sort((a, b) => {
      const x = s(a), y = s(b);
      const na = typeof x === "number" && !isFinite(x) ? -Infinity : x, nb = typeof y === "number" && !isFinite(y) ? -Infinity : y;
      return (na < nb ? -1 : na > nb ? 1 : 0) * (sort.dir === "asc" ? 1 : -1);
    });
  }, [rows, columns, sort]);
  if (!rows.length) return <>{empty ?? <EmptyState title="Nothing matches these filters" body="Change the search or filters to see results." />}</>;
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-y border-line bg-raised/50 text-left text-[12px] text-muted">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn("px-3 py-2 font-medium whitespace-nowrap first:pl-5 last:pr-5", c.align === "right" && "text-right")} aria-sort={sort?.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}>
                {c.sort ? (
                  <button type="button" title={c.hint} className={cn("inline-flex items-center gap-1 hover:text-ink", sort?.key === c.key && "text-ink")} onClick={() => setSort((s) => ({ key: c.key, dir: s?.key === c.key && s.dir === "desc" ? "asc" : "desc" }))}>
                    {c.header}
                    {sort?.key === c.key && (sort.dir === "desc" ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
                  </button>
                ) : c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined} tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === "Enter") onRowClick(r); } : undefined}
              className={cn("border-b border-line last:border-0", onRowClick && "cursor-pointer hover:bg-raised/60")}>
              {columns.map((c) => <td key={c.key} className={cn("px-3 first:pl-5 last:pr-5", dense ? "py-2" : "py-2.5", c.align === "right" && "tnum text-right", c.className)}>{c.cell(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- AI insight card ---------- */
const KIND_ICON = { risk: TriangleAlert, opportunity: ArrowUpRight, info: Lightbulb };
const KIND_TONE = { risk: "text-neg bg-neg-soft", opportunity: "text-pos bg-pos-soft", info: "text-ai bg-ai-soft" };
export const IMPACT_TONE: Record<Insight["impact"], Tone> = { High: "neg", Medium: "warn", Low: "neutral" };

export function DemoGeneratedTag() {
  return <Tip text="Produced by the demo rules engine from sample data. No external AI model was called."><span><Badge tone="ai"><Sparkles />Demo-generated</Badge></span></Tip>;
}

export function InsightCard({ insight, scope, compact }: { insight: Insight; scope: Scope; compact?: boolean }) {
  const router = useRouter();
  const reviewed = useStore((s) => s.reviewed.includes(insight.id));
  const toggle = useStore((s) => s.toggleReviewed);
  const [open, setOpen] = React.useState(false);
  const [lines, setLines] = React.useState<string[] | null>(null);
  const Icon = KIND_ICON[insight.kind];
  const explain = async () => {
    setOpen(true);
    if (!lines) setLines(await getAIProvider().explainInsight(insight, scope));
  };
  if (compact)
    return (
      <div className={cn("flex gap-3 py-3", reviewed && "opacity-60")}>
        <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md", KIND_TONE[insight.kind])}><Icon className="size-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] leading-snug font-medium">{insight.title}</p>
          <p className="mt-0.5 line-clamp-2 text-[12.5px] text-muted">{insight.action}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge tone={IMPACT_TONE[insight.impact]}>{insight.impact} impact</Badge>
            {insight.link && <Link href={insight.link.href} className="text-[12.5px] font-medium text-accent hover:underline">{insight.link.label}</Link>}
          </div>
        </div>
      </div>
    );
  return (
    <Card className={cn("flex flex-col p-5", reviewed && "opacity-70")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("flex size-7 items-center justify-center rounded-md", KIND_TONE[insight.kind])}><Icon className="size-4" /></span>
        <span className="text-[12.5px] font-medium text-muted">{CATEGORY_LABEL[insight.category]}</span>
        <span className="ml-auto flex items-center gap-1.5">
          {reviewed && <Badge tone="pos"><Check />Reviewed</Badge>}
          <Badge tone={IMPACT_TONE[insight.impact]}>{insight.impact} impact</Badge>
        </span>
      </div>
      <h3 className="mt-3 text-[15px] leading-snug font-semibold">{insight.title}</h3>
      <p className="mt-1.5 text-[13px] text-muted">{insight.explanation}</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-raised/70 px-3 py-2.5 sm:grid-cols-4">
        {insight.metrics.map((m) => (
          <div key={m.label} className="min-w-0">
            <dt className="truncate text-[11.5px] text-muted">{m.label}</dt>
            <dd className="tnum truncate text-[13.5px] font-semibold">{m.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[13px]"><span className="font-semibold">Suggested action. </span>{insight.action}</p>
      {insight.confidence !== null && (
        <div className="mt-3 flex items-center gap-2 text-[12px] text-muted">
          <span>Confidence</span>
          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-raised"><span className="block h-full rounded-full bg-ai" style={{ width: `${insight.confidence * 100}%` }} /></span>
          <span className="tnum font-medium text-ink">{Math.round(insight.confidence * 100)}%</span>
          <Tip text="Heuristic based on data volume and effect size — not a statistical probability."><button type="button" aria-label="About confidence" className="text-faint"><Info className="size-3.5" /></button></Tip>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
        <Button size="sm" variant="ai" onClick={explain}><Sparkles />Explain this insight</Button>
        {insight.link && <Button size="sm" onClick={() => router.push(insight.link!.href)}>{insight.link.label}</Button>}
        <Button size="sm" onClick={() => router.push("/reports?type=ai")}><FileText />Generate report</Button>
        <Button size="sm" variant="ghost" onClick={() => toggle(insight.id)} className="ml-auto">{reviewed ? "Mark as not reviewed" : "Mark as reviewed"}</Button>
      </div>
      <Modal open={open} onOpenChange={setOpen} title="Explain this insight" description={insight.title}>
        {lines ? <div className="space-y-3 text-[13.5px]">{lines.map((l, i) => <p key={i}>{l}</p>)}</div> : <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-2/3" /></div>}
      </Modal>
    </Card>
  );
}

export function TrendIcon({ up }: { up: boolean }) {
  return up ? <ArrowUpRight className="size-4 text-pos" /> : <ArrowDownRight className="size-4 text-neg" />;
}
