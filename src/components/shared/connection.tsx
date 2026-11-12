"use client";
import { Check, CircleDashed, Database, Plug, X } from "lucide-react";
import * as React from "react";
import type { ConnectorId, ConnectorStatus } from "@/server/connectors/types";
import { useStore } from "@/lib/store";
import { Badge, Button, Card, Modal, cn } from "../ui";

let cache: Promise<ConnectorStatus[]> | null = null;
/** Reads connector status from the server. If the API is unreachable the UI falls back to "pending" — never to "connected". */
export function useIntegrations() {
  const [list, setList] = React.useState<ConnectorStatus[] | null>(null);
  React.useEffect(() => {
    cache ??= fetch("/api/v1/integrations").then((r) => (r.ok ? r.json() : Promise.reject())).then((j) => j.connectors as ConnectorStatus[]).catch(() => { cache = null; return []; });
    let on = true;
    cache.then((l) => on && setList(l));
    return () => { on = false; };
  }, []);
  return list;
}

const STEPS = ["Open the provider's consent screen", "Receive the authorisation code", "Exchange the code for access tokens", "Run the first data sync"];

export function ConnectionCard({ ids, title, className }: { ids: ConnectorId[]; title: string; className?: string }) {
  const all = useIntegrations();
  const log = useStore((s) => s.log);
  const [open, setOpen] = React.useState<ConnectorStatus | null>(null);
  const [step, setStep] = React.useState(-1);
  const list = (all ?? []).filter((c) => ids.includes(c.id));
  const simulate = () => {
    setStep(0);
    setTimeout(() => setStep(1), 700);
    setTimeout(() => { setStep(2); if (open) log("Simulated authorisation attempt", open.label); }, 1400);
  };
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent"><Database className="size-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold">{title}</p>
          <p className="text-[12.5px] text-muted">This page shows sample data. No live account is connected.</p>
        </div>
        <Badge tone="accent" dot>Demo data source</Badge>
      </div>
      <ul className="mt-3 divide-y divide-line border-t border-line">
        {all === null && <li className="py-2.5 text-[12.5px] text-faint">Checking connection status…</li>}
        {all !== null && list.length === 0 && <li className="py-2.5 text-[12.5px] text-muted">Connection status unavailable. Integration pending configuration.</li>}
        {list.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
            <Plug className="size-4 text-faint" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium">{c.label}</p>
              <p className="text-[12px] text-muted">{c.message}</p>
            </div>
            <Badge tone="neutral" dot>Not connected</Badge>
            <Button size="sm" onClick={() => { setOpen(c); setStep(-1); }}>Connect account</Button>
          </li>
        ))}
      </ul>
      <Modal open={!!open} onOpenChange={(o) => !o && setOpen(null)} title={`Connect ${open?.label ?? ""}`} description="Connection walkthrough. In this build the flow is simulated and stops before any account is linked."
        footer={<><Button onClick={() => setOpen(null)}>Close</Button><Button variant="primary" onClick={simulate} disabled={step >= 0 && step < 2}>{step === 2 ? "Run simulation again" : "Simulate authorisation"}</Button></>}>
        {open && (
          <div className="space-y-4 text-[13px]">
            <div>
              <p className="font-medium">Provides</p>
              <p className="text-muted">{open.provides.join(" · ")}</p>
            </div>
            <div>
              <p className="font-medium">Server configuration required</p>
              <ul className="mt-1 space-y-1">
                {open.requiredEnv.map((k) => (
                  <li key={k} className="flex items-center gap-2 text-muted">
                    {open.missingEnv.includes(k) ? <X className="size-3.5 text-neg" /> : <Check className="size-3.5 text-pos" />}
                    <code className="rounded bg-raised px-1.5 py-0.5 text-[12px]">{k}</code>
                    <span className="text-[12px]">{open.missingEnv.includes(k) ? "not set" : "set"}</span>
                  </li>
                ))}
              </ul>
            </div>
            <ol className="space-y-2 rounded-lg border border-line p-3">
              {STEPS.map((s, i) => {
                const state = step < 0 ? "idle" : i < 2 && step > i ? "done" : i === step && step < 2 ? "run" : i === 2 && step === 2 ? "stop" : step === 2 && i < 2 ? "done" : "idle";
                return (
                  <li key={s} className={cn("flex items-center gap-2", state === "idle" && "text-muted")}>
                    {state === "done" ? <Check className="size-4 text-pos" /> : state === "stop" ? <X className="size-4 text-neg" /> : <CircleDashed className={cn("size-4", state === "run" ? "animate-spin text-accent" : "text-faint")} />}
                    <span>{s}{state === "done" && <span className="text-faint"> · simulated</span>}</span>
                  </li>
                );
              })}
            </ol>
            {step === 2 && <p className="rounded-lg bg-warn-soft px-3 py-2 text-warn">Stopped at token exchange: integration pending configuration. No account was connected and no data was requested from {open.label}.</p>}
          </div>
        )}
      </Modal>
    </Card>
  );
}
