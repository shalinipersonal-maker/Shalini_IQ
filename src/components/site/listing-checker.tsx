"use client";
import { Check, CircleAlert, CircleCheck, CircleX, Copy, ScanSearch, Wand2 } from "lucide-react";
import * as React from "react";
import { Button, Field, Input, Segmented, Textarea, cn } from "@/components/ui";
import { autoFix, checkListing, MARKETPLACE_LABEL, POINT_PROMPTS, type FixAnswers, type FixPlan, type ListingInput, type ListingReport, type Marketplace } from "@/lib/site/listing-check";

const EXAMPLE = {
  title: "Handloom Cotton Saree for Women with Blouse Piece, Mustard Yellow, 5.5 m",
  bullets: "Soft handloom cotton that stays cool and breathable through a full day of wear\nSaree length 5.5 m with a 0.8 m unstitched blouse piece in a matching colour\nContrast zari border and woven pallu, suited to office wear, festivals and family functions\nGentle hand wash in cold water; dry in shade to keep the colour bright",
  description: "",
  imageCount: 4,
};
const ICON = { pass: CircleCheck, warn: CircleAlert, fail: CircleX } as const;
const TONE = { pass: "text-pos", warn: "text-warn", fail: "text-neg" } as const;

export function ListingChecker() {
  const [mk, setMk] = React.useState<Marketplace>("amazon");
  const [title, setTitle] = React.useState(EXAMPLE.title);
  const [bullets, setBullets] = React.useState(EXAMPLE.bullets);
  const [description, setDescription] = React.useState(EXAMPLE.description);
  const [images, setImages] = React.useState(String(EXAMPLE.imageCount));
  const [white, setWhite] = React.useState(true);
  const [report, setReport] = React.useState<ListingReport | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [fixOpen, setFixOpen] = React.useState(false);

  const run = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 5) { setError("Enter the product title (at least 5 characters) to run the check."); setReport(null); return; }
    setError(null);
    setFixOpen(false);
    setReport(checkListing({ marketplace: mk, title, bullets, description, imageCount: Number(images) || 0, whiteMainImage: white }));
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <form onSubmit={run} className="min-w-0 space-y-4 rounded-xl border border-line bg-surface p-5 sm:p-6" noValidate>
        <div>
          <p className="mb-1.5 text-[12px] font-medium text-muted">Marketplace</p>
          <Segmented label="Marketplace" value={mk} onChange={(v) => { setMk(v); setReport(null); }} options={(Object.keys(MARKETPLACE_LABEL) as Marketplace[]).map((m) => ({ value: m, label: MARKETPLACE_LABEL[m] }))} />
        </div>
        <Field label="Product title" error={error ?? undefined} hint={`${title.trim().length} characters`}>
          <Input value={title} onChange={(e) => { setTitle(e.target.value); if (error) setError(null); }} />
        </Field>
        <Field label="Key feature points (one per line)"><Textarea rows={5} value={bullets} onChange={(e) => setBullets(e.target.value)} /></Field>
        <Field label="Description" hint={`${description.trim().length} characters`}><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Paste the product description" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Number of images"><Input type="number" min={0} max={20} value={images} onChange={(e) => setImages(e.target.value)} /></Field>
          <label className="flex items-end gap-2 pb-2 text-[13px]"><input type="checkbox" checked={white} onChange={(e) => setWhite(e.target.checked)} className="accent-[var(--accent)]" />Main image on white</label>
        </div>
        <Button type="submit" variant="primary" className="h-10 w-full"><ScanSearch />Check this listing</Button>
        <p className="text-[12px] text-faint">Runs in your browser. Nothing you type is sent or saved.</p>
      </form>

      <div className="min-w-0 rounded-xl border border-line bg-surface p-5 sm:p-6" aria-live="polite">
        {!report ? (
          <div className="flex h-full min-h-60 flex-col items-center justify-center text-center">
            <ScanSearch className="size-8 text-faint" aria-hidden />
            <p className="mt-3 text-[14px] font-semibold">Your report appears here</p>
            <p className="mt-1 max-w-xs text-[13px] text-muted">A sample saree listing is filled in. Press “Check this listing”, then try your own.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <div className={cn("tnum flex size-16 shrink-0 items-center justify-center rounded-full border-4 text-[20px] font-semibold", report.score >= 80 ? "border-pos text-pos" : report.score >= 55 ? "border-warn text-warn" : "border-neg text-neg")}>{report.score}</div>
              <div>
                <p className="text-[17px] font-semibold">{report.grade}</p>
                <p className="text-[13px] text-muted">{report.results.filter((r) => r.severity !== "pass").length} things to improve for {MARKETPLACE_LABEL[mk]}</p>
              </div>
            </div>
            <ul className="mt-5 space-y-3">
              {[...report.results].sort((a, b) => ["fail", "warn", "pass"].indexOf(a.severity) - ["fail", "warn", "pass"].indexOf(b.severity)).map((r) => {
                const I = ICON[r.severity];
                return (
                  <li key={r.id} className="flex gap-2.5">
                    <I className={cn("mt-0.5 size-4 shrink-0", TONE[r.severity])} aria-label={r.severity} />
                    <div className="min-w-0 text-[13px]">
                      <p className="font-medium">{r.label}</p>
                      <p className="text-muted">{r.detail}</p>
                      {r.fix && <p className="mt-0.5 text-ink">Fix: {r.fix}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-5 border-t border-line pt-3 text-[12px] text-faint">How this is scored: {report.method}</p>
            {report.score < 100 && !fixOpen && (
              <Button variant="primary" className="mt-4 h-10 w-full" onClick={() => setFixOpen(true)}><Wand2 />Fix it to 100%</Button>
            )}
          </>
        )}
      </div>
      {report && fixOpen && (
        <AutoFixPanel input={{ marketplace: mk, title, bullets, description, imageCount: Number(images) || 0, whiteMainImage: white }}
          onApply={(p) => { setTitle(p.title); setBullets(p.bullets.join("\n")); setDescription(p.description); setImages(String(p.imageCount)); setWhite(p.whiteMainImage); setReport(p.report); setFixOpen(false); }} />
      )}
    </div>
  );
}

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [done, setDone] = React.useState(false);
  return (
    <button type="button" className="inline-flex items-center gap-1 text-[12px] font-medium text-accent"
      onClick={() => { navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => undefined); }}>
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{done ? "Copied" : label}
    </button>
  );
}

function AutoFixPanel({ input, onApply }: { input: ListingInput; onApply: (p: FixPlan) => void }) {
  const [a, setA] = React.useState<FixAnswers>({ detail: "", extraTitle: "", points: ["", "", "", "", ""], descriptionExtra: "", imageCount: input.imageCount, whiteMainImage: true });
  const plan = autoFix(input, a);
  const n = plan.needs;
  const asks = (n.detail ? 1 : 0) + (n.extraTitle ? 1 : 0) + n.points + (n.description ? 1 : 0) + (n.images ? 1 : 0) + (a.whiteMainImage ? 0 : 1);
  const upd = (p: Partial<FixAnswers>) => setA((x) => ({ ...x, ...p }));
  // Which point prompts to show: as many as are still missing, starting from the first unanswered ones.
  const answeredPts = a.points.filter((p) => p.trim()).length;
  const showPts = Math.min(5, answeredPts + n.points);
  return (
    <div className="overlay-in rounded-xl border border-accent/40 bg-surface p-5 sm:p-6 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn("tnum flex size-14 items-center justify-center rounded-full border-4 text-[18px] font-semibold transition-colors", plan.report.score === 100 ? "border-pos text-pos" : "border-warn text-warn")}>{plan.report.score}</div>
          <div>
            <p className="text-[16px] font-semibold">{plan.report.score === 100 ? "100/100 — ready to paste" : "Auto-fixed. A few facts only you know:"}</p>
            <p className="text-[13px] text-muted">{plan.report.score === 100 ? "Every check passes. Copy the parts below or apply them to the checker." : `${asks} answer${asks === 1 ? "" : "s"} left to reach 100. We removed sales words, symbols, capitals and repeats, and rewrote the description.`}</p>
          </div>
        </div>
        <Button variant="primary" disabled={plan.report.score < 100} onClick={() => onApply(plan)}><Check />Apply to checker</Button>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="min-w-0 space-y-3">
          {(n.detail || a.detail) && <Field label="Size, quantity or measurement" hint="e.g. 500 ml · Pack of 2 · Size M · 5.5 m"><Input value={a.detail} onChange={(e) => upd({ detail: e.target.value })} /></Field>}
          {(n.extraTitle || a.extraTitle) && <Field label="Add to the title: brand, material, colour or who it's for" hint="Your title is short — these are the words shoppers search for"><Input value={a.extraTitle} onChange={(e) => upd({ extraTitle: e.target.value })} /></Field>}
          {Array.from({ length: showPts }, (_, i) => (
            <Field key={i} label={POINT_PROMPTS[i]} hint={a.points[i].trim() && `${POINT_PROMPTS[i]}: ${a.points[i]}`.length < 25 ? "Add a few more words" : undefined}>
              <Input value={a.points[i]} onChange={(e) => upd({ points: a.points.map((p, j) => (j === i ? e.target.value : p)) })} />
            </Field>
          ))}
          {(n.description || a.descriptionExtra) && <Field label="One line on who it's for or what makes it different"><Textarea rows={2} value={a.descriptionExtra} onChange={(e) => upd({ descriptionExtra: e.target.value })} /></Field>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Images you'll upload" hint={n.images ? `${n.images} more needed` : "Enough"}><Input type="number" min={0} max={20} value={String(a.imageCount)} onChange={(e) => upd({ imageCount: Number(e.target.value) || 0 })} /></Field>
            <label className="flex items-end gap-2 pb-2 text-[13px]"><input type="checkbox" checked={a.whiteMainImage} onChange={(e) => upd({ whiteMainImage: e.target.checked })} className="accent-[var(--accent)]" />Main image on white</label>
          </div>
        </div>
        <div className="min-w-0 space-y-3 rounded-lg bg-raised p-4 text-[13px]">
          <div><div className="flex items-center justify-between"><p className="font-medium">Title</p><CopyBtn text={plan.title} label="Copy" /></div><p className="mt-1 break-words">{plan.title}</p></div>
          <div><div className="flex items-center justify-between"><p className="font-medium">Key points</p><CopyBtn text={plan.bullets.join("\n")} label="Copy" /></div>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">{plan.bullets.map((b) => <li key={b}>{b}</li>)}</ul></div>
          <div><div className="flex items-center justify-between"><p className="font-medium">Description</p><CopyBtn text={plan.description} label="Copy" /></div><p className="mt-1 text-muted">{plan.description}</p></div>
        </div>
      </div>
    </div>
  );
}
