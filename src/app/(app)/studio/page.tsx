"use client";
import { ChevronDown, Copy, Palette, Plus, Trash2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { PageHeader, toast } from "@/components/shared";
import { DocPreview } from "@/components/studio/preview";
import { Badge, Button, Card, EmptyState, Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger, Modal, cn } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { newId, now, useCan, useStore } from "@/lib/store";
import { PLACEMENTS, TEMPLATES, TEMPLATE_CATEGORIES, buildTemplate, placementOf, type Template } from "@/lib/studio/templates";
import type { CreativeProject, Doc } from "@/lib/studio/types";
import { useShopScope } from "@/lib/shop";

const fitWidth = (doc: Doc, box = 200, maxH = 190) => Math.min(box, (maxH * doc.width) / doc.height);

function Library() {
  const scope = useShopScope();
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const canEdit = useCan("creatives.edit");
  const { projects, saveProject, deleteProject, log } = useStore();
  const [cat, setCat] = React.useState("All");
  const [del, setDel] = React.useState<CreativeProject | null>(null);
  const product = scope.ds.products.find((p) => p.id === params.get("product"));
  const mine = projects.filter((p) => p.clientId === scope.ds.client.id);
  const create = (name: string, category: string, placement: string, doc: Doc) => {
    const id = newId(), t = now();
    saveProject({ id, name, clientId: scope.ds.client.id, category, placement, doc, createdAt: t, updatedAt: t });
    log("Created creative", name);
    router.push(`/studio/editor?id=${id}`);
  };
  const fromTemplate = (t: Template) => create(product ? `${product.name.split(" ").slice(0, 3).join(" ")} — ${t.name}` : t.name, t.category, t.placement, buildTemplate(t, { product }));
  const templates = TEMPLATES.filter((t) => cat === "All" || t.category === cat);
  return (
    <>
      <PageHeader title="Creative Studio" description={`Design ad creatives for ${scope.ds.client.name} at the right size for each placement, then export PNG or JPEG.`}
        actions={<Menu>
          <MenuTrigger asChild><Button variant="primary" disabled={!canEdit} title={canEdit ? undefined : "Your role cannot create creatives"}><Plus />Blank canvas<ChevronDown /></Button></MenuTrigger>
          <MenuContent className="w-72">{[...new Set(PLACEMENTS.map((p) => p.group))].map((g) => <React.Fragment key={g}><MenuLabel>{g}</MenuLabel>{PLACEMENTS.filter((p) => p.group === g).map((p) => <MenuItem key={p.id} onSelect={() => create(`Untitled ${p.label.toLowerCase()}`, "Custom", p.id, { width: p.w, height: p.h, background: "#ffffff", els: [] })}><span className="flex-1">{p.label}</span><span className="tnum text-[12px] text-faint">{p.w} × {p.h}</span></MenuItem>)}</React.Fragment>)}</MenuContent>
        </Menu>} />

      <a href="/studio/motion" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent-soft px-5 py-4 hover:border-accent">
        <span><span className="block text-[15px] font-semibold text-accent">1,700 ready templates — 500 photos · 200 videos · 1,000 GIFs</span><span className="block text-[13px] text-muted">With your own music, beat sync, and MP4 / GIF / PNG download.</span></span>
        <span className="rounded-lg bg-accent px-4 py-2 text-[13.5px] font-semibold text-accent-ink">Open templates →</span>
      </a>

      {product && <div className="mb-4 flex items-center gap-2 rounded-lg border border-accent/40 bg-accent-soft px-3 py-2 text-[13px] text-accent"><Palette className="size-4" />Templates below are filled in with <strong className="font-semibold">{product.name}</strong> — its name, price and discount.<button type="button" aria-label="Clear product" className="ml-auto" onClick={() => router.replace(path)}><X className="size-4" /></button></div>}

      <h2 className="mb-3 text-[15px] font-semibold">Your creatives <span className="font-normal text-muted">· {mine.length}</span></h2>
      {mine.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {mine.map((p) => (
            <Card key={p.id} className="group overflow-hidden">
              <button type="button" onClick={() => router.push(`/studio/editor?id=${p.id}`)} className="flex h-52 w-full items-center justify-center bg-raised" aria-label={`Open ${p.name}`}><DocPreview doc={p.doc} width={fitWidth(p.doc)} className="shadow-card" /></button>
              <div className="flex items-center gap-1 px-3 py-2.5">
                <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium">{p.name}</p><p className="tnum text-[12px] text-faint">{p.doc.width} × {p.doc.height} · edited {timeAgo(p.updatedAt)}</p></div>
                <Button variant="ghost" size="icon" aria-label={`Duplicate ${p.name}`} disabled={!canEdit} onClick={() => { saveProject({ ...p, id: newId(), name: `${p.name} copy`, createdAt: now(), updatedAt: now() }); toast("Creative duplicated"); }}><Copy /></Button>
                <Button variant="ghost" size="icon" aria-label={`Delete ${p.name}`} disabled={!canEdit} onClick={() => setDel(p)}><Trash2 /></Button>
              </div>
            </Card>
          ))}
        </div>
      ) : <Card><EmptyState icon={<Palette />} title="No saved creatives yet" body="Pick a template below or start from a blank canvas. Your work is saved in this browser automatically and stays here after a refresh." /></Card>}

      <div className="mt-8 mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-[15px] font-semibold">Start from a template <span className="font-normal text-muted">· {templates.length}</span></h2>
        <p className="text-[12px] text-faint">Sizes follow common placement ratios. Confirm current platform specifications before publishing.</p>
      </div>
      <div className="scroll-thin mb-4 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Template category">
        {["All", ...TEMPLATE_CATEGORIES].map((c) => <button key={c} type="button" role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={cn("h-8 shrink-0 rounded-md border px-2.5 text-[12.5px] font-medium whitespace-nowrap", cat === c ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-muted hover:text-ink")}>{c}</button>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {templates.map((t) => {
          const doc = buildTemplate(t, { product }), pl = placementOf(t.placement);
          return (
            <Card key={t.id} className="overflow-hidden transition-colors hover:border-accent">
              <button type="button" disabled={!canEdit} onClick={() => fromTemplate(t)} className="block w-full text-left disabled:cursor-not-allowed" aria-label={`Use template ${t.name}`}>
                <div className="flex h-52 items-center justify-center bg-raised"><DocPreview doc={doc} width={fitWidth(doc)} className="shadow-card" /></div>
                <div className="px-3 py-2.5"><p className="text-[13px] font-medium">{t.name}</p><p className="mt-0.5 flex items-center justify-between gap-2 text-[12px] text-faint"><span className="truncate">{t.category}</span><Badge className="tnum">{pl.w} × {pl.h}</Badge></p></div>
              </button>
            </Card>
          );
        })}
      </div>
      <Modal open={!!del} onOpenChange={(o) => !o && setDel(null)} title="Delete this creative?" description={del?.name}
        footer={<><Button onClick={() => setDel(null)}>Cancel</Button><Button variant="danger" onClick={() => { if (del) { deleteProject(del.id); log("Deleted creative", del.name); toast("Creative deleted"); } setDel(null); }}>Delete creative</Button></>}>
        <p className="text-[13.5px] text-muted">The saved design is removed from this browser. This cannot be undone.</p>
      </Modal>
    </>
  );
}
export default function Page() {
  return <React.Suspense fallback={null}><Library /></React.Suspense>;
}
