"use client";
import { BarChart3, Download, FileSpreadsheet, FileText, LineChart, Megaphone, Package, Sparkles, Store } from "lucide-react";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { PageHeader, toast } from "@/components/shared";
import { Badge, Button, Card, CardHeader, EmptyState, Modal, Segmented, Switch, cn } from "@/components/ui";
import { fmtDateTime } from "@/lib/dates";
import { exportCsv, exportPdf, type PdfOptions } from "@/lib/export";
import { REPORT_TYPES, buildReport, formatCell, type ReportType } from "@/lib/reports";
import { useCan, useStore } from "@/lib/store";
import { useScope } from "@/lib/use-scope";

const ICON: Record<ReportType, React.ComponentType<{ className?: string }>> = { sales: LineChart, advertising: BarChart3, marketplace: Store, product: Package, campaign: Megaphone, ai: Sparkles };
const PREVIEW_ROWS = 40;

function Reports() {
  const scope = useScope();
  const params = useSearchParams();
  const canExport = useCan("reports.export");
  const { settings, brand, reports, addReport } = useStore();
  const initial = REPORT_TYPES.some((r) => r.id === params.get("type")) ? (params.get("type") as ReportType) : "sales";
  const [type, setType] = React.useState<ReportType>(initial);
  const [pdfOpen, setPdfOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [opts, setOpts] = React.useState<Omit<PdfOptions, "brand">>({ orientation: "landscape", includeSummary: true, includeNotes: true });
  const report = React.useMemo(() => buildReport(type, scope, settings.ai), [type, scope, settings.ai]);
  const record = (format: "CSV" | "PDF") => addReport({ type, title: report.title, client: report.client, range: report.period, format, rows: report.rows.length });
  const csv = () => { exportCsv(report); record("CSV"); toast(`CSV exported: ${report.rows.length} rows`); };
  const pdf = async () => {
    setBusy(true);
    try { await exportPdf(report, { ...opts, brand }); record("PDF"); toast("PDF report downloaded"); setPdfOpen(false); }
    catch { toast("The PDF could not be generated. Try the CSV export.", "error"); }
    setBusy(false);
  };
  return (
    <>
      <PageHeader title="Reports" description="Build a report from the client, marketplace and date range selected above, then export it. Exports contain exactly the rows shown in the preview." />
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-6">
        {REPORT_TYPES.map((r) => {
          const Icon = ICON[r.id];
          return (
            <button key={r.id} type="button" aria-pressed={type === r.id} onClick={() => setType(r.id)} className={cn("rounded-xl border bg-surface p-3.5 text-left transition-colors", type === r.id ? "border-accent ring-1 ring-accent" : "border-line hover:border-line-strong")}>
              <Icon className={cn("size-4", type === r.id ? "text-accent" : "text-muted")} />
              <p className="mt-2 text-[13.5px] font-semibold">{r.label}</p>
              <p className="mt-0.5 text-[12px] text-muted">{r.blurb}</p>
            </button>
          );
        })}
      </div>

      <Card className="mt-4">
        <CardHeader title={report.title} subtitle={`${report.client} · ${report.period} · ${report.scopeNote} · ${report.rows.length} rows`}
          action={<>
            <Badge tone="accent">Sample data</Badge>
            <Button onClick={csv} disabled={!canExport} title={canExport ? undefined : "Your role cannot export reports"}><FileSpreadsheet />Export CSV</Button>
            <Button variant="primary" onClick={() => setPdfOpen(true)} disabled={!canExport} title={canExport ? undefined : "Your role cannot export reports"}><FileText />Generate PDF</Button>
          </>} />
        <dl className="grid grid-cols-2 gap-3 px-5 pb-4 md:grid-cols-4">
          {report.summary.map((s) => <div key={s.label} className="rounded-lg border border-line px-3 py-2"><dt className="text-[12px] text-muted">{s.label}</dt><dd className="tnum text-[16px] font-semibold">{s.value}</dd></div>)}
        </dl>
        <div className="scroll-thin max-h-[520px] overflow-auto border-t border-line">
          <table className="w-full border-collapse text-[12.5px]">
            <thead className="sticky top-0 bg-raised text-left text-[12px] text-muted"><tr>{report.columns.map((c) => <th key={c.label} scope="col" className={cn("px-3 py-2 font-medium whitespace-nowrap first:pl-5 last:pr-5", c.kind !== "text" && "text-right")}>{c.label}</th>)}</tr></thead>
            <tbody>
              {report.rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                <tr key={i} className="border-t border-line align-top">
                  {row.map((v, j) => <td key={j} className={cn("px-3 py-2 first:pl-5 last:pr-5", report.columns[j].kind !== "text" ? "tnum text-right whitespace-nowrap" : type === "ai" && j > 1 ? "min-w-56" : "whitespace-nowrap", j === 0 && "font-medium")}>{formatCell(v, report.columns[j].kind)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {report.rows.length > PREVIEW_ROWS && <p className="border-t border-line px-5 py-2 text-[12px] text-muted">Preview shows the first {PREVIEW_ROWS} of {report.rows.length} rows. The export includes all of them.</p>}
        <ul className="space-y-1 border-t border-line px-5 py-3 text-[12px] text-muted">{report.notes.map((n) => <li key={n}>{n}</li>)}</ul>
      </Card>

      <Card className="mt-4">
        <CardHeader title="Export history" subtitle="Reports exported from this browser" />
        {reports.length ? (
          <ul className="divide-y divide-line border-t border-line">
            {reports.slice(0, 12).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-[13px]">
                <Download className="size-4 text-faint" />
                <span className="font-medium">{r.title}</span><Badge>{r.format}</Badge>
                <span className="text-muted">{r.client} · {r.range} · {r.rows} rows</span>
                <span className="ml-auto text-[12px] text-faint">{r.by} · {fmtDateTime(r.ts)}</span>
              </li>
            ))}
          </ul>
        ) : <EmptyState icon={<FileText />} title="No exports yet" body="Export a CSV or generate a PDF above and it will be listed here." />}
      </Card>

      <Modal open={pdfOpen} onOpenChange={setPdfOpen} title="Generate PDF report" description={`${report.title} · ${report.client} · ${report.period}`}
        footer={<><Button onClick={() => setPdfOpen(false)}>Cancel</Button><Button variant="primary" onClick={pdf} disabled={busy}><Download />{busy ? "Generating…" : "Download PDF"}</Button></>}>
        <div className="space-y-4 text-[13px]">
          <div className="flex items-center justify-between"><span>Page orientation</span><Segmented label="Orientation" value={opts.orientation} onChange={(v) => setOpts({ ...opts, orientation: v })} options={[{ value: "landscape", label: "Landscape" }, { value: "portrait", label: "Portrait" }]} /></div>
          <label className="flex items-center justify-between">Include summary figures<Switch label="Include summary figures" checked={opts.includeSummary} onCheckedChange={(v) => setOpts({ ...opts, includeSummary: v })} /></label>
          <label className="flex items-center justify-between">Include method notes<Switch label="Include method notes" checked={opts.includeNotes} onCheckedChange={(v) => setOpts({ ...opts, includeNotes: v })} /></label>
          <p className="rounded-lg bg-raised px-3 py-2 text-[12.5px] text-muted">The PDF contains all {report.rows.length} rows and is marked “Demo environment — sample data” on every page. Currency is written as “INR” because the built-in PDF font has no rupee symbol.</p>
        </div>
      </Modal>
    </>
  );
}
export default function Page() {
  return <React.Suspense fallback={null}><Reports /></React.Suspense>;
}
