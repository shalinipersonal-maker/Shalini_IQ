"use client";
import { useMemo } from "react";
import type { Scope } from "./analytics/metrics";
import { addDays, diffDays } from "./dates";
import { getDataset } from "./demo/generate";
import { useStore, type RangePreset } from "./store";

export const RANGE_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "14d", label: "Last 14 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "mtd", label: "Month to date" },
  { value: "custom", label: "Custom range" },
];
export const MAX_CUSTOM_DAYS = 100;

/** Resolves the global client / marketplace / date-range filters into a query scope over the demo dataset. */
export function useScope(): Scope {
  const clientId = useStore((s) => s.clientId);
  const marketplace = useStore((s) => s.marketplace);
  const range = useStore((s) => s.range);
  const edits = useStore((s) => s.campaignEdits);
  const custom = useStore((s) => s.customCampaigns);
  return useMemo(() => {
    const ds = getDataset(clientId);
    let to = ds.lastDate;
    let from: string;
    if (range.preset === "mtd") from = to.slice(0, 8) + "01";
    else if (range.preset === "custom" && range.from && range.to && range.from <= range.to) {
      to = range.to > ds.lastDate ? ds.lastDate : range.to;
      from = range.from > to ? to : range.from;
      if (diffDays(from, to) + 1 > MAX_CUSTOM_DAYS) from = addDays(to, -(MAX_CUSTOM_DAYS - 1));
    } else from = addDays(to, -(parseInt(range.preset === "custom" ? "30" : range.preset) - 1));
    const days = diffDays(from, to) + 1;
    const campaigns = [...custom.filter((c) => c.clientId === ds.client.id), ...ds.campaigns.map((c) => ({ ...c, ...edits[c.id] }))];
    return { ds, campaigns, from, to, prevFrom: addDays(from, -days), prevTo: addDays(from, -1), days, marketplace };
  }, [clientId, marketplace, range, edits, custom]);
}
