import { formatCell, type Report } from "../reports";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const reportFileName = (r: Report, ext: string) => `${slug(r.client)}-${slug(r.title)}-${slug(r.period)}.${ext}`;

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Quotes a CSV field and neutralises spreadsheet formula injection (=, +, -, @ at the start of text). */
function csvField(v: string | number) {
  if (typeof v === "number") return isFinite(v) ? String(v) : "";
  const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
/** CSV carries raw values: currency rounded to whole rupees, rates as percentages with 2 decimals. */
export function reportToCsv(r: Report): string {
  const head = r.columns.map((c) => csvField(c.kind === "pct" ? `${c.label} (%)` : c.kind === "inr" ? `${c.label} (INR)` : c.label));
  const body = r.rows.map((row) => row.map((v, i) => {
    if (typeof v === "string") return csvField(v);
    const k = r.columns[i].kind;
    return csvField(k === "pct" ? Math.round(v * 10000) / 100 : k === "mult" ? Math.round(v * 100) / 100 : Math.round(v));
  }).join(","));
  const meta = [`${r.title}`, `Client,${csvField(r.client)}`, `Period,${csvField(r.period)}`, `Scope,${csvField(r.scopeNote)}`, `Note,${csvField("DEMO ENVIRONMENT - sample data, not connected to live marketplace accounts")}`, ""];
  return "﻿" + [...meta, head.join(","), ...body].join("\r\n");
}
export function exportCsv(r: Report) {
  download(new Blob([reportToCsv(r)], { type: "text/csv;charset=utf-8" }), reportFileName(r, "csv"));
}

// The built-in PDF fonts cover Latin-1 only, so symbols outside it are transliterated.
const pdfText = (s: string) => s.replace(/₹/g, "INR ").replace(/[−–—]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/×/g, "x").replace(/[^\x00-\xFF]/g, "");

export interface PdfOptions { orientation: "portrait" | "landscape"; includeSummary: boolean; includeNotes: boolean; brand: { productName: string; company: string } }
export async function exportPdf(r: Report, o: PdfOptions) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: o.orientation, unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 40;
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(61, 85, 240).text(pdfText(`${o.brand.productName} by ${o.brand.company}`), M, 36);
  doc.setTextColor(150, 90, 0).text("DEMO ENVIRONMENT - SAMPLE DATA", W - M, 36, { align: "right" });
  doc.setTextColor(14, 22, 38).setFontSize(18).text(pdfText(r.title), M, 64);
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(86, 97, 118).text(pdfText(`${r.client}  |  ${r.period}  |  ${r.scopeNote}  |  Generated ${new Date().toLocaleString("en-IN")}`), M, 82);
  let y = 100;
  if (o.includeSummary && r.summary.length) {
    const cw = (W - M * 2) / r.summary.length;
    r.summary.forEach((s, i) => {
      doc.setDrawColor(226, 230, 237).roundedRect(M + i * cw, y, cw - 8, 44, 4, 4);
      doc.setFontSize(8).setTextColor(86, 97, 118).text(pdfText(s.label), M + i * cw + 8, y + 16);
      doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(14, 22, 38).text(pdfText(s.value), M + i * cw + 8, y + 34);
      doc.setFont("helvetica", "normal");
    });
    y += 58;
  }
  autoTable(doc, {
    startY: y, margin: { left: M, right: M, bottom: 44 },
    head: [r.columns.map((c) => pdfText(c.label))],
    body: r.rows.map((row) => row.map((v, i) => pdfText(formatCell(v, r.columns[i].kind)))),
    styles: { font: "helvetica", fontSize: r.columns.length > 9 ? 7 : 8, cellPadding: 4, textColor: [14, 22, 38], lineColor: [226, 230, 237], lineWidth: 0.5, overflow: "linebreak" },
    headStyles: { fillColor: [240, 242, 246], textColor: [86, 97, 118], fontStyle: "bold" },
    columnStyles: Object.fromEntries(r.columns.map((c, i) => [i, { halign: c.kind === "text" ? "left" : "right" }])) as Record<number, { halign: "left" | "right" }>,
    theme: "grid",
  });
  if (o.includeNotes) {
    let ny = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 18;
    doc.setFontSize(8).setTextColor(86, 97, 118);
    for (const n of r.notes) {
      const lines = doc.splitTextToSize(pdfText(n), W - M * 2) as string[];
      if (ny + lines.length * 10 > H - 44) { doc.addPage(); ny = M; }
      doc.text(lines, M, ny);
      ny += lines.length * 10 + 4;
    }
  }
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p).setFontSize(8).setTextColor(133, 144, 164);
    doc.text("Demo environment - sample data, not connected to live marketplace accounts.", M, H - 22);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 22, { align: "right" });
  }
  doc.save(reportFileName(r, "pdf"));
}
