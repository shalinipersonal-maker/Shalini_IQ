"use client";
import Link from "next/link";
import * as React from "react";
import { Switch } from "@/components/ui";
import { inr } from "@/lib/format";
import { agencyShare, PRICING, quote } from "@/lib/site/pricing";

const fmt = (n: number) => inr(n);

export function FeeCalculator() {
  const [sellers, setSellers] = React.useState(20);
  const [prepay, setPrepay] = React.useState(false);
  const [retainer, setRetainer] = React.useState("");
  const q = quote(sellers, prepay);
  const ret = Number(retainer.replace(/[^0-9]/g, ""));
  const share = ret > 0 ? agencyShare(sellers, ret, prepay) : null;

  return (
    <div className="grid gap-5 rounded-xl border border-line bg-surface p-5 sm:p-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="min-w-0 space-y-5">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="calc-sellers" className="text-[13px] font-medium text-muted">Seller accounts you manage</label>
            <input aria-label="Seller accounts, exact number" type="number" min={1} max={500} value={sellers}
              onChange={(e) => setSellers(Math.min(500, Math.max(1, Number(e.target.value) || 1)))}
              className="tnum h-8 w-20 rounded-md border border-line bg-surface px-2 text-right text-[14px] font-semibold" />
          </div>
          <input id="calc-sellers" type="range" min={1} max={150} value={Math.min(sellers, 150)} onChange={(e) => setSellers(Number(e.target.value))} className="mt-2 w-full accent-[var(--accent)]" />
          <div className="tnum flex justify-between text-[11.5px] text-faint"><span>1</span><span>50</span><span>100</span><span>150+</span></div>
        </div>
        <label className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
          <span className="text-[13px]"><span className="font-medium">Pay 12 months in advance</span><span className="block text-[12px] text-muted">{Math.round(PRICING.prepayDiscount * 100)}% off the monthly fees</span></span>
          <Switch checked={prepay} onCheckedChange={setPrepay} label="Pay 12 months in advance" />
        </label>
        <div>
          <label htmlFor="calc-retainer" className="text-[13px] font-medium text-muted">Optional: your average monthly fee per seller (₹)</label>
          <input id="calc-retainer" inputMode="numeric" placeholder="e.g. 25000" value={retainer} onChange={(e) => setRetainer(e.target.value)}
            className="tnum mt-1.5 h-9 w-full rounded-md border border-line bg-surface px-2.5 text-[14px]" />
          <p className="mt-1 text-[12px] text-faint">Used only to show what share of your own income Shalini_IQ would cost. Nothing is sent anywhere.</p>
        </div>
      </div>
      <div className="min-w-0 rounded-lg bg-raised p-4 sm:p-5" aria-live="polite">
        <p className="text-[12.5px] text-muted">Your monthly platform fee</p>
        <p className="tnum mt-1 text-[32px] leading-none font-semibold tracking-tight">{fmt(q.monthlyAfterDiscount)}</p>
        <p className="tnum mt-1.5 text-[12.5px] text-muted">{fmt(PRICING.platformFee)} platform + {q.sellers} × {fmt(PRICING.perSeller)}{prepay ? `, less ${Math.round(PRICING.prepayDiscount * 100)}%` : ""} · plus GST {fmt(q.gstOnMonthly)}</p>
        <dl className="tnum mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
          <div><dt className="text-muted">Per seller, all-in</dt><dd className="font-semibold">{fmt(q.perSellerEffective)}</dd></div>
          <div><dt className="text-muted">Per year</dt><dd className="font-semibold">{fmt(q.yearly)}</dd></div>
          <div><dt className="text-muted">One-time setup</dt><dd className="font-semibold">{fmt(PRICING.setupFee)}</dd></div>
          <div><dt className="text-muted">First year total</dt><dd className="font-semibold">{fmt(q.firstYear)}</dd></div>
        </dl>
        {share && share.share !== null && (
          <p className="mt-4 rounded-md bg-surface px-3 py-2 text-[13px]">
            Your sellers pay you about <span className="tnum font-semibold">{fmt(share.agencyRevenue)}</span> a month. Shalini_IQ would be <span className="tnum font-semibold">{(share.share * 100).toFixed(1)}%</span> of that.
          </p>
        )}
        <p className="mt-4 text-[12px] text-faint">All amounts exclude 18% GST. Minimum term {PRICING.minimumTermMonths} months from go-live, then month to month.</p>
        <Link href={`/signup?sellers=${q.sellers}`} className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-md bg-accent px-3 text-[13px] font-medium text-accent-ink hover:brightness-110">Start with {q.sellers} seller{q.sellers === 1 ? "" : "s"}</Link>
      </div>
    </div>
  );
}
