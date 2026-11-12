"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtDay } from "@/lib/dates";
import { cn } from "./ui";

export interface Series { key: string; label: string; color: string; kind?: "area" | "line" | "dashed" }

const AXIS = { tick: { fill: "var(--faint)", fontSize: 11.5 }, axisLine: false, tickLine: false } as const;
const isDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const xLabel = (v: any) => (isDate(v) ? fmtDay(v) : String(v));

export function Legend({ series, className }: { series: Series[]; className?: string }) {
  if (series.length < 2) return null;
  return (
    <div className={cn("flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted", className)}>
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2.5 rounded-[2px]" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function TipBox({ active, payload, label, series, fmt, footer }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="min-w-40 rounded-lg border border-line bg-surface px-3 py-2 text-[12px] shadow-card">
      <p className="mb-1 font-medium text-ink">{xLabel(label)}</p>
      {(series as Series[]).filter((s) => row[s.key] !== undefined && row[s.key] !== null).map((s) => (
        <p key={s.key} className="flex items-center justify-between gap-4 text-muted">
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-[2px]" style={{ background: s.color }} />{s.label}</span>
          <span className="tnum font-medium text-ink">{Array.isArray(row[s.key]) ? row[s.key].map(fmt).join(" – ") : fmt(row[s.key])}</span>
        </p>
      ))}
      {footer && <p className="mt-1 border-t border-line pt-1 text-faint">{footer(row)}</p>}
    </div>
  );
}

interface ChartProps { data: any[]; x?: string; series: Series[]; fmt: (n: number) => string; height?: number; footer?: (row: any) => string; tooltipSeries?: Series[] }

/** Time-series chart: one y-axis, 2px lines, optional soft area for the lead series. */
export function TrendChart({ data, x = "date", series, fmt, height = 260, footer, tooltipSeries }: ChartProps) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey={x} {...AXIS} tickFormatter={xLabel} minTickGap={36} tickMargin={8} />
          <YAxis {...AXIS} width={58} tickFormatter={fmt} />
          <Tooltip cursor={{ stroke: "var(--line-strong)" }} content={<TipBox series={tooltipSeries ?? series} fmt={fmt} footer={footer} />} />
          {series.map((s) =>
            s.kind === "area" ? (
              <Area key={s.key} dataKey={s.key} name={s.label} type="monotone" stroke={s.color} strokeWidth={2} fill={s.color} fillOpacity={0.1} dot={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} connectNulls />
            ) : (
              <Line key={s.key} dataKey={s.key} name={s.label} type="monotone" stroke={s.color} strokeWidth={2} strokeDasharray={s.kind === "dashed" ? "5 4" : undefined} dot={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} connectNulls />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarsChart({ data, x = "date", series, fmt, height = 260, stacked, footer }: ChartProps & { stacked?: boolean }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%" barGap={2}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey={x} {...AXIS} tickFormatter={xLabel} minTickGap={24} tickMargin={8} />
          <YAxis {...AXIS} width={58} tickFormatter={fmt} />
          <Tooltip cursor={{ fill: "var(--raised)", opacity: 0.6 }} content={<TipBox series={series} fmt={fmt} footer={footer} />} />
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} stackId={stacked ? "a" : undefined} radius={!stacked || i === series.length - 1 ? [4, 4, 0, 0] : 0} stroke={stacked ? "var(--surface)" : undefined} strokeWidth={stacked ? 1 : 0} maxBarSize={44} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Forecast: actuals as a solid line, projection dashed, with a shaded range. */
export function ForecastChart({ data, fmt, height = 260 }: { data: any[]; fmt: (n: number) => string; height?: number }) {
  const series: Series[] = [
    { key: "actual", label: "Actual revenue", color: "var(--s-revenue)" },
    { key: "forecast", label: "Projection", color: "var(--ai)", kind: "dashed" },
    { key: "band", label: "Likely range", color: "var(--ai)" },
  ];
  return (
    <div>
      <Legend series={series} className="mb-2 px-1" />
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="date" {...AXIS} tickFormatter={xLabel} minTickGap={36} tickMargin={8} />
            <YAxis {...AXIS} width={58} tickFormatter={fmt} />
            <Tooltip cursor={{ stroke: "var(--line-strong)" }} content={<TipBox series={series} fmt={fmt} />} />
            <Area dataKey="band" stroke="none" fill="var(--ai)" fillOpacity={0.12} isAnimationActive={false} activeDot={false} />
            <Line dataKey="actual" stroke="var(--s-revenue)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="forecast" stroke="var(--ai)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function Spark({ data, k, color = "var(--s-revenue)" }: { data: any[]; k: string; color?: string }) {
  return (
    <div className="h-8 w-20" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 3, right: 2, bottom: 3, left: 2 }}>
          <Line dataKey={k} type="monotone" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Ranked horizontal bars in plain HTML — labels stay readable at any width. */
export function BarList({ items, fmt, color = "var(--s-revenue)" }: { items: { label: React.ReactNode; value: number; color?: string; sub?: React.ReactNode; onClick?: () => void; key: string }[]; fmt: (n: number) => string; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.key}>
          <button type="button" disabled={!i.onClick} onClick={i.onClick} className="group block w-full text-left disabled:cursor-default">
            <span className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate text-ink group-enabled:group-hover:text-accent">{i.label}</span>
              <span className="tnum shrink-0 font-medium">{fmt(i.value)}{i.sub && <span className="ml-2 font-normal text-muted">{i.sub}</span>}</span>
            </span>
            <span className="mt-1 block h-1.5 rounded-full bg-raised">
              <span className="block h-full rounded-full" style={{ width: `${Math.max(1.5, (i.value / max) * 100)}%`, background: i.color ?? color }} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** One 100% bar split into labelled parts, with a legend that carries the values. */
export function SplitBar({ parts, fmt }: { parts: { key: string; label: string; value: number; color: string }[]; fmt: (n: number) => string }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        {parts.map((p) => <span key={p.key} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} className="h-full first:rounded-l-full last:rounded-r-full" />)}
      </div>
      <ul className="mt-3 space-y-1.5 text-[13px]">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-muted"><span className="size-2 rounded-[2px]" style={{ background: p.color }} />{p.label}</span>
            <span className="tnum"><span className="font-medium">{fmt(p.value)}</span><span className="ml-2 inline-block w-11 text-right text-muted">{((p.value / total) * 100).toFixed(1)}%</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
