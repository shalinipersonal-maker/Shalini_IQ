"use client";
import * as D from "@radix-ui/react-dialog";
import { Calculator, ChevronDown, ExternalLink, X } from "lucide-react";
import * as React from "react";
import { Button, cn } from "@/components/ui";
import { ROYAL } from "@/app/site-fonts";
import { clearHash, useHash } from "./use-browser";
import { calculate, ECOMMERCE_CALCS, FEE_CONFIGS, isCalcId, QUICK_CALCS, type CalcId, type FeeConfig, type Zone } from "@/lib/site/fees";

/** Any link to "#calc-<id>" (menu, footer, tool cards) opens that calculator. */
export const calcHref = (id: CalcId) => `#calc-${id}`;

function useCalcHash(): [CalcId | null, () => void] {
  const hash = useHash();
  const h = hash.replace(/^#calc-/, "");
  return [hash.startsWith("#calc-") && isCalcId(h) ? h : null, clearHash];
}

const money = (n: number, cur: FeeConfig["currency"]) =>
  cur === "INR" ? `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: n % 1 ? 2 : 0 })}` : `$${n.toFixed(2)}`;

function Num({ label, value, onChange, suffix, step = "any", min = 0 }: { label: string; value: string; onChange: (v: string) => void; suffix?: string; step?: string; min?: number }) {
  const id = React.useId();
  return (
    <label htmlFor={id} className="block min-w-0">
      <span className="mb-1 block text-[12px] font-medium text-muted">{label}</span>
      <span className="flex h-9 items-center rounded-md border border-line bg-surface focus-within:border-accent">
        <input id={id} type="number" inputMode="decimal" min={min} step={step} value={value} onChange={(e) => onChange(e.target.value)} className="tnum h-full w-full min-w-0 bg-transparent px-2.5 text-[14px] outline-none" />
        {suffix && <span className="pr-2.5 text-[12px] text-faint">{suffix}</span>}
      </span>
    </label>
  );
}

function CalcBody({ cfg }: { cfg: FeeConfig }) {
  const usd = cfg.currency === "USD";
  const cur = usd ? "$" : "₹";
  const [price, setPrice] = React.useState(usd ? "40" : "999");
  const [cost, setCost] = React.useState(usd ? "15" : "350");
  const [cat, setCat] = React.useState(cfg.categories[0].id);
  const [weight, setWeight] = React.useState("500");
  const [zone, setZone] = React.useState<Zone>("national");
  const [shipMan, setShipMan] = React.useState(String(cfg.shippingDefault ?? 0));
  const [shipCharged, setShipCharged] = React.useState("0");
  const [gst, setGst] = React.useState("0.05");
  const [ret, setRet] = React.useState(cfg.id === "meesho" ? "10" : "0");
  const [adv, setAdv] = React.useState(false);
  const category = cfg.categories.find((c) => c.id === cat) ?? cfg.categories[0];
  // Edits are remembered per category, so switching category shows that category's default rate.
  const [commissionEdits, setCommissionEdits] = React.useState<Record<string, string>>({});
  const [zeroEdits, setZeroEdits] = React.useState<Record<string, boolean>>({});
  const commission = commissionEdits[category.id] ?? String(+(category.commission * 100).toFixed(2));
  const setCommission = (v: string) => setCommissionEdits((m) => ({ ...m, [category.id]: v }));
  const zeroOverride = zeroEdits[category.id] ?? null;
  const setZeroOverride = (v: boolean) => setZeroEdits((m) => ({ ...m, [category.id]: v }));
  const [promo, setPromo] = React.useState(String(Math.round((cfg.promoPct ?? 0) * 100)));
  const [payPct, setPayPct] = React.useState(String((cfg.paymentPct ?? 0) * 100));
  const [extras, setExtras] = React.useState((cfg.extraPct ?? []).map((x) => String(+(x.pct * 100).toFixed(2))));

  const p = Number(price) || 0;
  const res = calculate(cfg, {
    price: p, cost: Number(cost) || 0, categoryId: cat, commissionPct: (Number(commission) || 0) / 100,
    zeroCommission: zeroOverride ?? undefined, weightGrams: Number(weight) || 0, zone, shippingManual: Number(shipMan) || 0,
    shippingCharged: Number(shipCharged) || 0, productGstPct: usd ? 0 : Number(gst), returnAllowancePct: (Number(ret) || 0) / 100,
    promoPct: (Number(promo) || 0) / 100, paymentPct: (Number(payPct) || 0) / 100, extraPctOverrides: extras.map((e) => (Number(e) || 0) / 100),
  });
  const zeroRule = !!category.zeroAlways || (category.zeroUnder !== undefined && p > 0 && p < category.zeroUnder);
  const hasZero = category.zeroAlways || category.zeroUnder !== undefined;

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
      <div className="min-w-0 space-y-3.5">
        {cfg.categories.length > 1 && (
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-muted">Category</span>
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 w-full rounded-md border border-line bg-surface px-2.5 text-[14px]">
              {cfg.categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Num label={usd ? "Item price" : "Selling price (incl. GST)"} value={price} onChange={setPrice} suffix={cur} />
          <Num label="Your cost per unit" value={cost} onChange={setCost} suffix={cur} />
        </div>
        {cfg.shipping && cfg.shipping !== "manual" && (
          <div className="grid grid-cols-2 gap-3">
            <Num label="Packed weight" value={weight} onChange={setWeight} suffix="g" step="50" />
            <label className="block">
              <span className="mb-1 block text-[12px] font-medium text-muted">Delivery zone</span>
              <select value={zone} onChange={(e) => setZone(e.target.value as Zone)} className="h-9 w-full rounded-md border border-line bg-surface px-2.5 text-[14px]">
                <option value="local">Local (same city)</option><option value="regional">Regional</option><option value="national">National</option>
              </select>
            </label>
          </div>
        )}
        {cfg.shipping === "manual" && (
          <div className="grid grid-cols-2 gap-3">
            <Num label="Shipping you pay" value={shipMan} onChange={setShipMan} suffix={cur} />
            {usd ? <Num label="Shipping buyer pays" value={shipCharged} onChange={setShipCharged} suffix={cur} /> : <Num label="Return allowance" value={ret} onChange={setRet} suffix="%" />}
          </div>
        )}
        {!usd && (
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-muted">GST on your product</span>
            <select value={gst} onChange={(e) => setGst(e.target.value)} className="h-9 w-full rounded-md border border-line bg-surface px-2.5 text-[14px]">
              {[["0", "0% (exempt)"], ["0.05", "5%"], ["0.18", "18%"], ["0.4", "40%"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        )}
        <button type="button" onClick={() => setAdv(!adv)} aria-expanded={adv} className="flex items-center gap-1 text-[13px] font-medium text-accent">
          <ChevronDown className={cn("size-4 transition-transform", adv && "rotate-180")} />Edit fee rates
        </button>
        {adv && (
          <div className="space-y-3 rounded-lg border border-line bg-raised/50 p-3">
            {hasZero && (
              <label className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" className="accent-[var(--accent)]" checked={zeroOverride ?? zeroRule} onChange={(e) => setZeroOverride(e.target.checked)} />
                Zero commission applies {category.zeroAlways ? "(all prices in this category)" : `(price under ${cur}${category.zeroUnder?.toLocaleString("en-IN")})`}
              </label>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Num label={cfg.group === "quick" ? "Your contract commission" : "Commission / referral"} value={commission} onChange={setCommission} suffix="%" />
              {cfg.promoPct !== undefined && <Num label="Promotion spend" value={promo} onChange={setPromo} suffix="% of price" />}
              {cfg.paymentPct !== undefined && <Num label="Payment processing" value={payPct} onChange={setPayPct} suffix="%" />}
              {cfg.extraPct?.map((x, i) => <Num key={x.label} label={x.label} value={extras[i]} onChange={(v) => setExtras(extras.map((e, j) => (j === i ? v : e)))} suffix="%" />)}
              {!usd && cfg.shipping !== "manual" && <Num label="Return allowance" value={ret} onChange={setRet} suffix="%" />}
            </div>
          </div>
        )}
      </div>

      <div className="min-w-0 rounded-xl bg-raised p-4" aria-live="polite">
        <div className="grid grid-cols-2 gap-3">
          <div><p className="text-[12px] text-muted">Reaches your bank</p><p className="tnum text-[22px] font-semibold">{money(res.payout, cfg.currency)}</p></div>
          <div><p className="text-[12px] text-muted">Your profit</p><p className={cn("tnum text-[22px] font-semibold", res.profit < 0 ? "text-neg" : "text-pos")}>{money(res.profit, cfg.currency)}</p></div>
        </div>
        <p className="tnum mt-1 text-[12.5px] text-muted">Margin {res.margin === null ? "—" : `${(res.margin * 100).toFixed(1)}%`} of selling price{res.zeroApplied ? " · zero commission applied" : ""}</p>
        <dl className="tnum mt-4 space-y-1.5 border-t border-line pt-3 text-[13px]">
          {res.lines.map((l) => <div key={l.label} className="flex justify-between gap-3"><dt className="text-muted">{l.label}</dt><dd>{money(l.amount, cfg.currency)}</dd></div>)}
          {cfg.gstOnFees && <div className="flex justify-between gap-3"><dt className="text-muted">GST 18% on fees</dt><dd>{money(res.gstOnFees, cfg.currency)}</dd></div>}
          <div className="flex justify-between gap-3 border-t border-line pt-1.5 font-semibold"><dt>Total deductions</dt><dd>{money(res.totalDeductions, cfg.currency)}</dd></div>
          {cfg.withholding && <div className="flex justify-between gap-3 text-[12px]"><dt className="text-faint">TCS 0.5% + TDS 0.1% held back (claimable)</dt><dd className="text-faint">{money(res.withheld, cfg.currency)}</dd></div>}
        </dl>
        <p className="mt-3 text-[11.5px] leading-relaxed text-faint">Profit assumes you are GST-registered: GST on fees and TCS/TDS come back as credit, and GST on the sale is paid to the government.</p>
      </div>

      <div className="text-[12px] text-faint md:col-span-2">
        <ul className="list-disc space-y-0.5 pl-4">{cfg.notes.map((n) => <li key={n}>{n}</li>)}</ul>
        <p className="mt-2">Default rates checked November 2026 — fees change often, so confirm against your seller dashboard. Sources: {cfg.sources.map((s, i) => <React.Fragment key={s.url}>{i ? " · " : ""}<a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline hover:text-ink">{s.label}<ExternalLink className="size-3" /></a></React.Fragment>)}</p>
      </div>
    </div>
  );
}

/** Mount once on the page. Opens whenever the URL hash is #calc-<id>. */
export function FeeCalculatorModal() {
  const [id, close] = useCalcHash();
  const cfg = id ? FEE_CONFIGS[id] : null;
  return (
    <D.Root open={!!cfg} onOpenChange={(o) => !o && close()}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-[2px]" />
        <D.Content className={`${ROYAL} overlay-in fixed top-1/2 left-1/2 z-[60] flex max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-line shadow-card`}>
          {cfg && (
            <>
              <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent"><Calculator className="size-4.5" /></span>
                  <div>
                    <D.Title className="font-royal text-[22px]">{cfg.name} fee calculator</D.Title>
                    <D.Description className="text-[12.5px] text-muted">{cfg.blurb}</D.Description>
                  </div>
                </div>
                <D.Close asChild><Button variant="ghost" size="icon" aria-label="Close calculator"><X /></Button></D.Close>
              </div>
              <div className="scroll-thin overflow-y-auto px-5 py-4"><CalcBody key={cfg.id} cfg={cfg} /></div>
            </>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export const CALC_GROUPS = [
  { label: "E-commerce calculators", ids: ECOMMERCE_CALCS },
  { label: "Quick-commerce calculators", ids: QUICK_CALCS },
] as const;
