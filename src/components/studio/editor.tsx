"use client";
import { AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignStartHorizontal, AlignStartVertical, ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, Copy, Download, Eye, EyeOff, Image as ImageIcon, LayoutTemplate, Lock, Maximize, Minus, PaintBucket, Plus, Redo2, Save, Shapes, SlidersHorizontal, Sparkles, Stamp, Star as StarIcon, Trash2, Type, Undo2, Unlock, Upload as UploadIcon } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "@/components/shared";
import { Badge, Button, Field, Input, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Modal, Select, Skeleton, Textarea, Tip, cn } from "@/components/ui";
import type { CopyResult, CopyTone } from "@/lib/ai/copy";
import { getAIProvider } from "@/lib/ai/provider";
import { newId, now, useCan, useStore, type Upload } from "@/lib/store";
import { backgroundSuggestions, brandColors, reviewDesign, variations } from "@/lib/studio/ops";
import { FONT_UI, PLACEMENTS, TEMPLATES, buildTemplate, button, ellipse, newElId, rect, slot, star, text } from "@/lib/studio/templates";
import type { CreativeProject, Doc, El } from "@/lib/studio/types";
import { useShopScope } from "@/lib/shop";
import type { CanvasApi } from "./canvas";
import { DocPreview } from "./preview";

const StudioCanvas = dynamic(() => import("./canvas"), { ssr: false, loading: () => <Skeleton className="size-72" /> });
const FONTS = [FONT_UI, "Georgia", "Arial", "Trebuchet MS", "Impact", "Courier New"];
const SWATCHES = ["#ffffff", "#f6efe4", "#e8f0ff", "#e3f4ec", "#ffd84d", "#f2b631", "#c2410c", "#7a1420", "#2a5bd7", "#0f8a5f", "#7c6cf0", "#0f1b3d", "#17181c", "#000000"];
type Tab = "templates" | "uploads" | "text" | "shapes" | "elements" | "backgrounds" | "brand" | "ai";
const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "templates", label: "Templates", icon: LayoutTemplate }, { id: "uploads", label: "Uploads", icon: UploadIcon }, { id: "text", label: "Text", icon: Type }, { id: "shapes", label: "Shapes", icon: Shapes },
  { id: "elements", label: "Elements", icon: StarIcon }, { id: "backgrounds", label: "Backgrounds", icon: PaintBucket }, { id: "brand", label: "Brand", icon: Stamp }, { id: "ai", label: "AI", icon: Sparkles },
];

function useHistory(initial: Doc) {
  const [st, setSt] = React.useState({ past: [] as Doc[], doc: initial, future: [] as Doc[] });
  const last = React.useRef({ tag: "", t: 0 });
  /** Commits a change. Rapid edits with the same tag (typing, nudging) collapse into one undo step. */
  const commit = React.useCallback((fn: (d: Doc) => Doc, tag = "") => {
    const now = Date.now();
    const merge = !!tag && last.current.tag === tag && now - last.current.t < 700;
    last.current = { tag, t: now };
    setSt((s) => { const next = fn(s.doc); return next === s.doc ? s : { past: merge ? s.past : [...s.past.slice(-59), s.doc], doc: next, future: [] }; });
  }, []);
  const replace = React.useCallback((fn: (d: Doc) => Doc) => setSt((s) => ({ ...s, doc: fn(s.doc) })), []);
  const undo = React.useCallback(() => { last.current.tag = ""; setSt((s) => (s.past.length ? { past: s.past.slice(0, -1), doc: s.past[s.past.length - 1], future: [s.doc, ...s.future] } : s)); }, []);
  const redo = React.useCallback(() => { last.current.tag = ""; setSt((s) => (s.future.length ? { past: [...s.past, s.doc], doc: s.future[0], future: s.future.slice(1) } : s)); }, []);
  return { doc: st.doc, commit, replace, undo, redo, canUndo: st.past.length > 0, canRedo: st.future.length > 0 };
}

function Num({ label, value, onChange, min, max, step = 1, suffix }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] text-muted">{label}{suffix ? ` (${suffix})` : ""}</span>
      <Input type="number" className="h-8 px-2" value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0} min={min} max={max} step={step} onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v))); }} />
    </label>
  );
}
function Color({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  const hex = /^#[0-9a-f]{6}$/i.test(value ?? "") ? value! : "#888888";
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] text-muted">{label}</span>
      <span className="flex gap-1.5">
        <input type="color" aria-label={label} value={hex} onChange={(e) => onChange(e.target.value)} className="h-8 w-9 shrink-0 cursor-pointer rounded-md border border-line bg-surface p-0.5" />
        <Input className="h-8 px-2" value={value ?? ""} onChange={(e) => onChange(e.target.value)} spellCheck={false} />
      </span>
    </label>
  );
}
const Section = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <section className="border-b border-line px-3.5 py-3"><div className="mb-2 flex items-center justify-between"><h3 className="text-[12px] font-semibold">{title}</h3>{action}</div>{children}</section>
);
const Tile = ({ onClick, children, label }: { onClick: () => void; children: React.ReactNode; label: string }) => (
  <button type="button" onClick={onClick} className="flex flex-col items-center gap-1.5 rounded-lg border border-line bg-surface p-2.5 text-[11.5px] text-muted transition-colors hover:border-accent hover:text-ink">{children}<span>{label}</span></button>
);

async function readImage(file: File): Promise<Upload> {
  const url = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new window.Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const k = Math.min(1, 1400 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  // Re-encoded only to keep browser storage small. The picture content is not altered.
  return { id: newId(), name: file.name.replace(/\.[^.]+$/, "").slice(0, 40), src: c.toDataURL("image/webp", 0.88), w: c.width, h: c.height };
}

export function StudioEditor({ project }: { project: CreativeProject }) {
  const router = useRouter();
  const scope = useShopScope();
  const canEdit = useCan("creatives.edit");
  const { saveProject, uploads, set, log } = useStore();
  const h = useHistory(project.doc);
  const { doc, commit } = h;
  const [name, setName] = React.useState(project.name);
  const [sel, setSel] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<Tab>("templates");
  const [leftOpen, setLeftOpen] = React.useState(() => typeof window === "undefined" || window.innerWidth >= 1024);
  const [rightOpen, setRightOpen] = React.useState(false);
  const [zoomPref, setZoomPref] = React.useState<number | null>(null);
  const [fit, setFit] = React.useState(0.4);
  const [savedAs, setSavedAs] = React.useState({ doc: project.doc, name: project.name });
  const [preview, setPreview] = React.useState<string | null>(null);
  const [swap, setSwap] = React.useState<string | null>(null);
  const api = React.useRef<CanvasApi | null>(null);
  const wrap = React.useRef<HTMLDivElement>(null);
  const zoom = zoomPref ?? fit;
  const el = doc.els.find((e) => e.id === sel) ?? null;
  const state = savedAs.doc === doc && savedAs.name === name ? "saved" : "saving";
  const U = doc.width / 100;

  React.useEffect(() => {
    const node = wrap.current;
    if (!node) return;
    const ro = new ResizeObserver(() => setFit(Math.max(0.05, Math.min((node.clientWidth - 56) / doc.width, (node.clientHeight - 56) / doc.height, 1))));
    ro.observe(node);
    return () => ro.disconnect();
  }, [doc.width, doc.height]);

  // Autosave: every change is written to browser storage shortly after it is made.
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!canEdit) return;
    const t = setTimeout(() => { saveProject({ ...project, name: name.trim() || "Untitled creative", doc, updatedAt: now() }); setSavedAs({ doc, name }); }, 700);
    return () => clearTimeout(t);
  }, [doc, name]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = React.useCallback((id: string, p: Partial<El>, tag?: string) => commit((d) => ({ ...d, els: d.els.map((e) => (e.id === id ? { ...e, ...p } : e)) }), tag ? `${id}:${tag}` : ""), [commit]);
  const add = (els: El[]) => { commit((d) => ({ ...d, els: [...d.els, ...els] })); setSel(els[els.length - 1].id); };
  const remove = React.useCallback((id: string) => { commit((d) => ({ ...d, els: d.els.filter((e) => e.id !== id) })); setSel(null); }, [commit]);
  const duplicate = React.useCallback((id: string) => { const nid = newElId(); commit((d) => { const i = d.els.findIndex((e) => e.id === id); if (i < 0) return d; const c = { ...d.els[i], id: nid, name: `${d.els[i].name} copy`, x: d.els[i].x + U * 3, y: d.els[i].y + U * 3 }; return { ...d, els: [...d.els.slice(0, i + 1), c, ...d.els.slice(i + 1)] }; }); setSel(nid); }, [commit, U]);
  const reorder = (id: string, to: "up" | "down" | "front" | "back") => commit((d) => {
    const i = d.els.findIndex((e) => e.id === id), els = [...d.els], [x] = els.splice(i, 1);
    els.splice(to === "front" ? els.length : to === "back" ? 0 : Math.max(0, Math.min(els.length, i + (to === "up" ? 1 : -1))), 0, x);
    return { ...d, els };
  });
  const align = (e: El, where: string) => patch(e.id, where === "left" ? { x: 0 } : where === "hcenter" ? { x: Math.round((doc.width - e.width) / 2) } : where === "right" ? { x: doc.width - e.width } : where === "top" ? { y: 0 } : where === "vcenter" ? { y: Math.round((doc.height - e.height) / 2) } : { y: Math.round(doc.height - e.height) });
  const centre = (w: number, hh: number) => [Math.round((doc.width - w) / 2), Math.round((doc.height - hh) / 2)] as const;

  const placeImage = (u: Upload) => {
    const target = el && (el.placeholder || el.type === "image") ? el : null;
    const frame = target ?? { x: doc.width * 0.25, y: doc.height * 0.25, width: doc.width * 0.5, height: doc.height * 0.5 };
    const k = Math.min(frame.width / u.w, frame.height / u.h), w = Math.round(u.w * k), hh = Math.round(u.h * k);
    const img: El = { id: target?.id ?? newElId(), type: "image", name: u.name || "Image", x: Math.round(frame.x + (frame.width - w) / 2), y: Math.round(frame.y + (frame.height - hh) / 2), width: w, height: hh, rotation: target?.rotation ?? 0, opacity: 1, visible: true, locked: false, src: `upload:${u.id}`, crop: { l: 0, t: 0, r: 0, b: 0 }, cornerRadius: 0 };
    if (target) commit((d) => ({ ...d, els: d.els.map((e) => (e.id === target.id ? img : e)) }));
    else add([img]);
    setSel(img.id);
  };
  const onFiles = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) return toast("Upload a PNG, JPEG or WebP image", "error");
    if (f.size > 8 * 1024 * 1024) return toast("Images must be 8 MB or smaller", "error");
    try { const u = await readImage(f); set({ uploads: [u, ...uploads].slice(0, 12) }); placeImage(u); toast(`Added “${u.name}”`); } catch { toast("That image could not be read", "error"); }
  };
  const setCrop = (e: El, side: "l" | "t" | "r" | "b", v: number) => {
    const u = uploads.find((x) => `upload:${x.id}` === e.src), crop = { ...(e.crop ?? { l: 0, t: 0, r: 0, b: 0 }), [side]: v };
    if (crop.l + crop.r > 0.9 || crop.t + crop.b > 0.9) return;
    patch(e.id, { crop, height: u ? Math.round((e.width * (1 - crop.t - crop.b) * u.h) / ((1 - crop.l - crop.r) * u.w)) : e.height }, "crop");
  };

  const saveNow = () => { saveProject({ ...project, name: name.trim() || "Untitled creative", doc, updatedAt: now() }); setSavedAs({ doc, name }); log("Saved creative", name); toast("Creative saved"); };
  const exportAs = (mime: "image/png" | "image/jpeg") => {
    if (!api.current) return;
    setSel(null);
    const a = document.createElement("a");
    a.href = api.current.toDataURL(mime);
    a.download = `${(name || "creative").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${doc.width}x${doc.height}.${mime === "image/png" ? "png" : "jpg"}`;
    a.click();
    log(`Exported creative as ${mime === "image/png" ? "PNG" : "JPEG"}`, name);
    toast(doc.els.some((e) => e.placeholder && e.visible) ? "Exported. Note: the product image slot is still empty." : `Exported ${doc.width} × ${doc.height} ${mime === "image/png" ? "PNG" : "JPEG"}`);
  };
  /** Hands the creative to the live account page, which posts it to real Facebook / Instagram accounts. */
  const sendToLive = () => {
    if (!api.current) return;
    const url = api.current.toDataURL("image/jpeg", Math.min(doc.width, 1440));
    try { sessionStorage.setItem("entraiq-live-creative", JSON.stringify({ url, name: name.trim() || "Creative" })); }
    catch { toast("This creative is too large to hand over. Export it as JPEG and upload it on the live page."); return; }
    log("Sent creative to live publishing", name);
    router.push("/account#meta");
  };
  const duplicateDesign = () => { const id = newId(); saveProject({ ...project, id, name: `${name} copy`, doc, createdAt: now(), updatedAt: now() }); toast("Duplicated. You are now editing the copy."); router.push(`/studio/editor?id=${id}`); };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true], [role=dialog], [role=menu]")) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) h.redo(); else h.undo(); }
      else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); h.redo(); }
      else if (!sel) return;
      else if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); duplicate(sel); }
      else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); remove(sel); }
      else if (e.key === "Escape") setSel(null);
      else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const s = e.shiftKey ? 10 : 1, cur = doc.els.find((x) => x.id === sel);
        if (cur && !cur.locked) patch(sel, e.key === "ArrowLeft" ? { x: cur.x - s } : e.key === "ArrowRight" ? { x: cur.x + s } : e.key === "ArrowUp" ? { y: cur.y - s } : { y: cur.y + s }, "nudge");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel, doc, h, duplicate, remove, patch]);

  /* ---- AI panel state ---- */
  const [ai, setAi] = React.useState({ product: "", price: "", tone: "Direct" as CopyTone, offer: "", seed: 0 });
  const [copy, setCopy] = React.useState<CopyResult | null>(null);
  const [aiBusy, setAiBusy] = React.useState(false);
  const genCopy = async () => {
    const price = Number(ai.price.replace(/[^\d.]/g, "")) || 0;
    setAiBusy(true);
    setCopy(await getAIProvider().generateCopy({ product: ai.product.trim() || "our new collection", category: "Jewellery and ornaments", price, mrp: price, offer: ai.offer, tone: ai.tone, seed: ai.seed }));
    setAi((a) => ({ ...a, seed: a.seed + 1 }));
    setAiBusy(false);
  };
  const applyText = (t: string, size = 6) => { if (el?.type === "text") patch(el.id, { text: t }); else { const w = doc.width * 0.8; add([text("Text", t, doc.width * 0.1, doc.height * 0.1, w, U * size, "#111111")]); } };
  const review = React.useMemo(() => reviewDesign(doc), [doc]);
  const vars = React.useMemo(() => (tab === "ai" ? variations(doc) : []), [doc, tab]);
  const brand = brandColors(scope.ds.client.hue);
  const applyColor = (c: string) => (el && !el.placeholder && el.type !== "image" ? patch(el.id, { fill: c }) : commit((d) => ({ ...d, background: c })));

  const leftPanel = (
    <div className="scroll-thin h-full overflow-y-auto">
      {tab === "templates" && <Section title="Templates"><p className="mb-2 text-[11.5px] text-muted">Choosing a template replaces the current design. Undo brings it back.</p><div className="grid grid-cols-2 gap-2">{TEMPLATES.map((t) => (
        <button key={t.id} type="button" onClick={() => setSwap(t.id)} className="group overflow-hidden rounded-lg border border-line text-left hover:border-accent">
          <div className="flex h-24 items-center justify-center bg-raised"><DocPreview doc={buildTemplate(t)} width={t.placement === "story" ? 46 : t.placement.includes("portrait") ? 66 : 96} /></div>
          <p className="truncate px-2 py-1.5 text-[11.5px] font-medium">{t.name}</p>
        </button>))}</div></Section>}
      {tab === "uploads" && <Section title="Uploads">
        <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-3 py-5 text-center text-[12px] text-muted hover:border-accent hover:text-ink">
          <UploadIcon className="size-5" /><span className="font-medium">Upload an image</span><span className="text-[11px] text-faint">PNG, JPEG or WebP, up to 8 MB</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
        </label>
        <p className="mt-2 text-[11.5px] text-muted">{el && (el.placeholder || el.type === "image") ? "Click a photo to place it in the selected slot." : "Click a photo to add it to the canvas."} Photos are placed exactly as supplied; nothing is generated or retouched.</p>
        <div className="mt-2 grid grid-cols-3 gap-2">{uploads.map((u) => (
          <div key={u.id} className="group relative">
            <button type="button" onClick={() => placeImage(u)} title={u.name} className="block aspect-square w-full overflow-hidden rounded-md border border-line bg-raised hover:border-accent"><img src={u.src} alt={u.name} className="size-full object-contain" /></button>
            <button type="button" aria-label={`Delete ${u.name}`} onClick={() => set({ uploads: uploads.filter((x) => x.id !== u.id) })} className="absolute top-0.5 right-0.5 hidden rounded bg-surface/90 p-0.5 text-muted group-hover:block hover:text-neg"><Trash2 className="size-3.5" /></button>
          </div>))}</div>
        {!uploads.length && <p className="mt-3 text-center text-[12px] text-faint">No uploads yet.</p>}
      </Section>}
      {tab === "text" && <Section title="Add text"><div className="space-y-2">
        {([["Add a heading", 8.5, "bold"], ["Add a subheading", 5, "bold"], ["Add body text", 3.2, "normal"]] as const).map(([label, size, style]) => (
          <button key={label} type="button" onClick={() => add([text(label.replace("Add a ", "").replace("Add ", ""), label, ...centre(doc.width * 0.8, U * size * 1.2), doc.width * 0.8, U * size, "#111111", { fontStyle: style, align: "center" })])} className="w-full rounded-lg border border-line px-3 py-2.5 text-left hover:border-accent" style={{ fontSize: 11 + size * 1.1, fontWeight: style === "bold" ? 700 : 400 }}>{label}</button>))}
        <button type="button" onClick={() => add(button("Shop now", ...centre(U * 34, U * 9), U * 34, U * 9, { bg: "", fg: "", soft: "", accent: "#111111", accentInk: "#ffffff" }))} className="w-full rounded-full bg-ink px-3 py-2 text-[12.5px] font-semibold text-bg">Add a button</button>
      </div></Section>}
      {tab === "shapes" && <Section title="Shapes"><div className="grid grid-cols-3 gap-2">
        <Tile label="Rectangle" onClick={() => add([rect("Rectangle", ...centre(U * 30, U * 20), U * 30, U * 20, "#2a5bd7")])}><span className="h-6 w-9 bg-accent" /></Tile>
        <Tile label="Rounded" onClick={() => add([rect("Rounded rectangle", ...centre(U * 30, U * 20), U * 30, U * 20, "#2a5bd7", { cornerRadius: U * 3 })])}><span className="h-6 w-9 rounded-md bg-accent" /></Tile>
        <Tile label="Circle" onClick={() => add([ellipse("Circle", ...centre(U * 22, U * 22), U * 22, U * 22, "#f2b631")])}><span className="size-6 rounded-full bg-accent" /></Tile>
        <Tile label="Line" onClick={() => add([rect("Line", ...centre(U * 40, U * 0.6), U * 40, Math.max(2, U * 0.6), "#111111")])}><span className="my-2.5 h-0.5 w-9 bg-accent" /></Tile>
        <Tile label="Star" onClick={() => add([star("Star", ...centre(U * 20, U * 20), U * 20, "#f2b631")])}><StarIcon className="size-6 fill-accent text-accent" /></Tile>
        <Tile label="Burst" onClick={() => add([star("Burst", ...centre(U * 24, U * 24), U * 24, "#c2410c", 16)])}><span className="size-6 rounded-full border-4 border-dotted border-accent" /></Tile>
      </div></Section>}
      {tab === "elements" && <Section title="Ad elements"><div className="grid grid-cols-2 gap-2">
        <Tile label="Price badge" onClick={() => { const [x, y] = centre(U * 22, U * 22); add([ellipse("Badge", x, y, U * 22, U * 22, "#f2b631"), text("Badge label", "₹999", x, y + U * 8, U * 22, U * 5.4, "#111111", { align: "center" })]); }}><span className="flex size-8 items-center justify-center rounded-full bg-warn text-[9px] font-bold text-white">₹999</span></Tile>
        <Tile label="Discount sticker" onClick={() => { const [x, y] = centre(U * 26, U * 26); add([star("Burst", x, y, U * 26, "#c2410c", 16), text("Sticker label", "30% OFF", x, y + U * 10.4, U * 26, U * 4.6, "#ffffff", { align: "center" })]); }}><span className="flex size-8 items-center justify-center rounded-full border-2 border-dotted border-neg text-[8px] font-bold text-neg">30%</span></Tile>
        <Tile label="CTA button" onClick={() => add(button("Shop now", ...centre(U * 34, U * 9), U * 34, U * 9, { bg: "", fg: "", soft: "", accent: "#2a5bd7", accentInk: "#ffffff" }))}><span className="rounded-full bg-accent px-2 py-1 text-[9px] font-semibold text-accent-ink">Shop now</span></Tile>
        <Tile label="Rating row" onClick={() => { const [x, y] = centre(U * 30, U * 5); add([0, 1, 2, 3, 4].map((i) => star(`Star ${i + 1}`, x + i * U * 6, y, U * 5, "#f2b631"))); }}><span className="flex">{[0, 1, 2, 3, 4].map((i) => <StarIcon key={i} className="size-3 fill-warn text-warn" />)}</span></Tile>
        <Tile label="Ribbon band" onClick={() => add([rect("Ribbon", 0, Math.round(doc.height * 0.8), doc.width, Math.round(doc.height * 0.1), "#111111"), text("Ribbon text", "Free delivery on prepaid orders", 0, Math.round(doc.height * 0.83), doc.width, U * 3.4, "#ffffff", { align: "center" })])}><span className="h-3 w-12 bg-ink" /></Tile>
        <Tile label="Product slot" onClick={() => add([slot(...centre(doc.width * 0.5, doc.height * 0.4), doc.width * 0.5, doc.height * 0.4)])}><ImageIcon className="size-6" /></Tile>
      </div></Section>}
      {tab === "backgrounds" && <>
        <Section title="Background colour"><div className="grid grid-cols-7 gap-1.5">{SWATCHES.map((c) => <button key={c} type="button" aria-label={`Background ${c}`} onClick={() => commit((d) => ({ ...d, background: c }))} className={cn("aspect-square rounded-md border", doc.background.toLowerCase() === c ? "border-accent ring-2 ring-accent/40" : "border-line")} style={{ background: c }} />)}</div>
          <div className="mt-3"><Color label="Custom colour" value={doc.background} onChange={(c) => commit((d) => ({ ...d, background: c }), "bg")} /></div></Section>
        <Section title="Background suggestions"><p className="mb-2 text-[11.5px] text-muted">Based on {scope.ds.client.name}&apos;s brand colour. Flat colours only; no imagery is generated.</p>
          <div className="space-y-1.5">{backgroundSuggestions(scope.ds.client.hue, doc.background).map((s) => <button key={s.label} type="button" onClick={() => commit((d) => ({ ...d, background: s.color }))} className="flex w-full items-center gap-2 rounded-md border border-line p-1.5 text-[12px] hover:border-accent"><span className="size-6 rounded border border-line" style={{ background: s.color }} />{s.label}<span className="ml-auto text-faint">{s.color}</span></button>)}</div></Section>
      </>}
      {tab === "brand" && <>
        <Section title={`${scope.ds.client.name} brand kit`}><p className="mb-2 text-[11.5px] text-muted">Shalz brand colours. Click a colour to apply it to the selected layer, or to the background when nothing is selected.</p>
          <div className="grid grid-cols-3 gap-1.5">{brand.map((b) => <button key={b.label} type="button" onClick={() => applyColor(b.color)} className="rounded-md border border-line p-1 text-[11px] text-muted hover:border-accent"><span className="mb-1 block h-7 rounded" style={{ background: b.color }} />{b.label}</button>)}</div></Section>
        <Section title="Brand assets"><div className="space-y-2">
          <Button className="w-full" onClick={() => add([text("Brand name", scope.ds.client.name, ...centre(doc.width * 0.6, U * 6), doc.width * 0.6, U * 5, brand[1].color, { align: "center" })])}><Type />Add brand name</Button>
          <Button className="w-full" onClick={() => { const [x, y] = centre(U * 16, U * 16); add([ellipse("Logo mark", x, y, U * 16, U * 16, brand[0].color), text("Logo initials", scope.ds.client.name.split(" ").map((w) => w[0]).join(""), x, y + U * 5.2, U * 16, U * 5.4, "#ffffff", { align: "center" })]); }}><Stamp />Add logo mark (placeholder)</Button>
          <p className="text-[11.5px] text-faint">Upload the real Shalz logo under Uploads to use it instead of the placeholder mark.</p>
        </div></Section>
      </>}
      {tab === "ai" && <>
        <Section title="Ad copy and headlines" action={<Badge tone="ai">Auto-written · check before posting</Badge>}><div className="space-y-2">
          <div className="grid grid-cols-[1fr_88px] gap-2"><Input aria-label="Product name" placeholder="Product, e.g. Ruby pendant" value={ai.product} maxLength={60} onChange={(e) => setAi({ ...ai, product: e.target.value })} /><Input aria-label="Price" placeholder="₹ price" value={ai.price} maxLength={9} onChange={(e) => setAi({ ...ai, price: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2"><Select aria-label="Tone" value={ai.tone} onChange={(e) => setAi({ ...ai, tone: e.target.value as CopyTone })}>{["Direct", "Premium", "Festive", "Playful"].map((t) => <option key={t}>{t}</option>)}</Select><Input aria-label="Offer" placeholder="Offer, e.g. 20% off" value={ai.offer} maxLength={30} onChange={(e) => setAi({ ...ai, offer: e.target.value })} /></div>
          <Button variant="ai" className="w-full" onClick={genCopy} disabled={aiBusy}><Sparkles />{aiBusy ? "Writing…" : copy ? "Generate more" : "Generate copy"}</Button>
        </div>
          {copy && <div className="mt-3 space-y-3 text-[12px]">
            <div><p className="mb-1 font-medium text-muted">Headlines — click to {el?.type === "text" ? "replace the selected text" : "add to canvas"}</p><ul className="space-y-1">{copy.headlines.map((x) => <li key={x}><button type="button" onClick={() => applyText(x, 7)} className="w-full rounded-md border border-line px-2 py-1.5 text-left hover:border-ai">{x}</button></li>)}</ul></div>
            <div><p className="mb-1 font-medium text-muted">Primary text</p><ul className="space-y-1">{copy.primaryTexts.map((x) => <li key={x}><button type="button" onClick={() => { navigator.clipboard?.writeText(x); toast("Primary text copied"); }} className="w-full rounded-md border border-line px-2 py-1.5 text-left hover:border-ai">{x}<span className="mt-0.5 block text-[11px] text-faint">Click to copy</span></button></li>)}</ul></div>
            <div className="flex flex-wrap gap-1">{copy.ctas.map((x) => <button key={x} type="button" onClick={() => applyText(x, 4)} className="rounded-full border border-line px-2 py-1 hover:border-ai">{x}</button>)}</div>
            <div><p className="mb-1 font-medium text-muted">Campaign visual concepts</p><ul className="space-y-1.5">{copy.concepts.slice(0, 3).map((c) => <li key={c.title} className="rounded-md bg-raised/70 px-2 py-1.5"><span className="font-medium">{c.title}. </span><span className="text-muted">{c.idea}</span></li>)}</ul></div>
          </div>}
        </Section>
        <Section title="AI design suggestions" action={<Badge tone={review.length ? "warn" : "pos"}>{review.length || "All clear"}</Badge>}>
          {review.length ? <ul className="space-y-1.5">{review.map((r) => <li key={r.id} className="rounded-md border border-line px-2 py-1.5 text-[12px]"><p className="font-medium">{r.title}</p><p className="text-muted">{r.detail}</p>{r.elId && <button type="button" className="mt-0.5 font-medium text-accent hover:underline" onClick={() => setSel(r.elId!)}>Select layer</button>}</li>)}</ul> : <p className="text-[12px] text-muted">No issues found by the design checks.</p>}
        </Section>
        <Section title="AI creative variations">
          {vars.length ? <><p className="mb-2 text-[11.5px] text-muted">Same layout in other palettes. Product photos are never changed.</p><div className="grid grid-cols-3 gap-2">{vars.map((v) => <button key={v.key} type="button" onClick={() => commit(() => v.doc)} className="overflow-hidden rounded-md border border-line hover:border-ai" aria-label={`Apply ${v.key} variation`}><DocPreview doc={v.doc} width={70} /></button>)}</div></> : <p className="text-[12px] text-muted">Variations are available while the design uses a template background colour.</p>}
        </Section>
      </>}
    </div>
  );

  const layers = [...doc.els].reverse();
  const rightPanel = (
    <div className="scroll-thin h-full overflow-y-auto">
      {el ? <>
        <Section title="Properties" action={<span className="flex gap-0.5">
          <Tip text="Duplicate layer"><Button variant="ghost" size="icon" className="size-7" aria-label="Duplicate layer" onClick={() => duplicate(el.id)}><Copy /></Button></Tip>
          <Tip text={el.locked ? "Unlock" : "Lock"}><Button variant="ghost" size="icon" className="size-7" aria-label={el.locked ? "Unlock layer" : "Lock layer"} onClick={() => patch(el.id, { locked: !el.locked })}>{el.locked ? <Lock /> : <Unlock />}</Button></Tip>
          <Tip text="Delete layer"><Button variant="ghost" size="icon" className="size-7" aria-label="Delete layer" onClick={() => remove(el.id)}><Trash2 /></Button></Tip></span>}>
          <Input aria-label="Layer name" className="mb-2 h-8 px-2" value={el.name} onChange={(e) => patch(el.id, { name: e.target.value }, "name")} />
          <div className="grid grid-cols-2 gap-2">
            <Num label="X" value={el.x} onChange={(v) => patch(el.id, { x: v }, "x")} /><Num label="Y" value={el.y} onChange={(v) => patch(el.id, { y: v }, "y")} />
            <Num label="Width" value={el.width} min={8} onChange={(v) => patch(el.id, el.type === "image" ? { width: v, height: Math.round((v * el.height) / el.width) } : { width: v }, "w")} />
            {el.type !== "text" && <Num label="Height" value={el.height} min={2} onChange={(v) => patch(el.id, el.type === "image" ? { height: v, width: Math.round((v * el.width) / el.height) } : { height: v }, "h")} />}
            <Num label="Rotation" suffix="°" value={el.rotation} min={-180} max={180} onChange={(v) => patch(el.id, { rotation: v }, "rot")} />
            <Num label="Opacity" suffix="%" value={el.opacity * 100} min={5} max={100} step={5} onChange={(v) => patch(el.id, { opacity: v / 100 }, "op")} />
          </div>
        </Section>
        {el.type === "text" && <Section title="Text"><div className="space-y-2">
          <Textarea aria-label="Text content" rows={3} value={el.text} onChange={(e) => patch(el.id, { text: e.target.value }, "text")} />
          <Select aria-label="Font" value={el.fontFamily} onChange={(e) => patch(el.id, { fontFamily: e.target.value })}>{FONTS.map((f) => <option key={f} value={f}>{f.replace(" Variable", "")}</option>)}</Select>
          <div className="grid grid-cols-2 gap-2">
            <Num label="Size" value={el.fontSize ?? 20} min={6} max={600} onChange={(v) => patch(el.id, { fontSize: v }, "fs")} />
            <label className="block"><span className="mb-1 block text-[11.5px] text-muted">Style</span><span className="flex gap-1">
              <Button size="sm" className="h-8 flex-1 font-bold" variant={el.fontStyle?.includes("bold") ? "primary" : "secondary"} aria-pressed={el.fontStyle?.includes("bold")} onClick={() => patch(el.id, { fontStyle: (`${el.fontStyle?.includes("italic") ? "italic " : ""}${el.fontStyle?.includes("bold") ? "" : "bold"}`.trim() || "normal") as El["fontStyle"] })}>B</Button>
              <Button size="sm" className="h-8 flex-1 italic" variant={el.fontStyle?.includes("italic") ? "primary" : "secondary"} aria-pressed={el.fontStyle?.includes("italic")} onClick={() => patch(el.id, { fontStyle: (`${el.fontStyle?.includes("italic") ? "" : "italic "}${el.fontStyle?.includes("bold") ? "bold" : ""}`.trim() || "normal") as El["fontStyle"] })}>I</Button></span></label>
            <Num label="Line height" value={el.lineHeight ?? 1.1} min={0.8} max={2.5} step={0.05} onChange={(v) => patch(el.id, { lineHeight: v }, "lh")} />
            <Num label="Letter spacing" value={el.letterSpacing ?? 0} min={-10} max={60} onChange={(v) => patch(el.id, { letterSpacing: v }, "ls")} />
          </div>
          <div className="flex gap-1" role="group" aria-label="Text alignment">{(["left", "center", "right"] as const).map((a) => <Button key={a} size="sm" className="h-8 flex-1 capitalize" variant={el.align === a ? "primary" : "secondary"} onClick={() => patch(el.id, { align: a })}>{a}</Button>)}</div>
          <Color label="Text colour" value={el.fill} onChange={(c) => patch(el.id, { fill: c }, "fill")} />
        </div></Section>}
        {(el.type === "rect" || el.type === "ellipse" || el.type === "star") && <Section title="Colours"><div className="space-y-2">
          <Color label="Fill" value={el.fill} onChange={(c) => patch(el.id, { fill: c, placeholder: false }, "fill")} />
          {el.type !== "star" && <div className="grid grid-cols-[1fr_72px] gap-2"><Color label="Outline" value={el.stroke} onChange={(c) => patch(el.id, { stroke: c, strokeWidth: el.strokeWidth || 4 }, "stroke")} /><Num label="Width" value={el.strokeWidth ?? 0} min={0} max={80} onChange={(v) => patch(el.id, { strokeWidth: v }, "sw")} /></div>}
          {el.type === "rect" && <Num label="Corner radius" value={el.cornerRadius ?? 0} min={0} max={Math.round(Math.min(el.width, el.height) / 2)} onChange={(v) => patch(el.id, { cornerRadius: v }, "cr")} />}
          {el.placeholder && <Button className="w-full" onClick={() => { setTab("uploads"); setLeftOpen(true); }}><ImageIcon />Choose a product photo</Button>}
        </div></Section>}
        {el.type === "image" && <Section title="Image"><div className="space-y-2">
          <p className="text-[11.5px] text-muted">Crop trims the edges; the picture itself is not altered.</p>
          {(["l", "r", "t", "b"] as const).map((s) => <label key={s} className="flex items-center gap-2 text-[11.5px] text-muted"><span className="w-12">{{ l: "Left", r: "Right", t: "Top", b: "Bottom" }[s]}</span><input type="range" min={0} max={45} value={Math.round((el.crop?.[s] ?? 0) * 100)} onChange={(e) => setCrop(el, s, +e.target.value / 100)} className="flex-1 accent-[var(--accent)]" /><span className="tnum w-8 text-right">{Math.round((el.crop?.[s] ?? 0) * 100)}%</span></label>)}
          <Num label="Corner radius" value={el.cornerRadius ?? 0} min={0} max={Math.round(Math.min(el.width, el.height) / 2)} onChange={(v) => patch(el.id, { cornerRadius: v }, "cr")} />
          <Button className="w-full" onClick={() => { setTab("uploads"); setLeftOpen(true); }}><ImageIcon />Replace image</Button>
        </div></Section>}
        <Section title="Alignment"><div className="grid grid-cols-6 gap-1">
          {([["left", AlignStartVertical, "Align left"], ["hcenter", AlignCenterVertical, "Centre horizontally"], ["right", AlignEndVertical, "Align right"], ["top", AlignStartHorizontal, "Align top"], ["vcenter", AlignCenterHorizontal, "Centre vertically"], ["bottom", AlignEndHorizontal, "Align bottom"]] as const).map(([k, Icon, label]) => <Tip key={k} text={label}><Button size="icon" className="w-full" aria-label={label} onClick={() => align(el, k)}><Icon /></Button></Tip>)}
        </div></Section>
      </> : <Section title="Canvas">
        <Field label="Placement size"><Select value={PLACEMENTS.find((p) => p.w === doc.width && p.h === doc.height)?.id ?? "custom"} onChange={(e) => { const p = PLACEMENTS.find((x) => x.id === e.target.value); if (p) commit((d) => { const kx = p.w / d.width, ky = p.h / d.height, k = Math.min(kx, ky); return { ...d, width: p.w, height: p.h, els: d.els.map((x) => ({ ...x, x: Math.round(x.x * kx), y: Math.round(x.y * ky), width: Math.round(x.width * k), height: Math.round(x.height * k), fontSize: x.fontSize ? Math.round(x.fontSize * k) : undefined, cornerRadius: x.type === "star" ? x.cornerRadius : x.cornerRadius ? Math.round(x.cornerRadius * k) : x.cornerRadius })) }; }); setZoomPref(null); }}>
          <option value="custom" disabled>Custom</option>{PLACEMENTS.map((p) => <option key={p.id} value={p.id}>{p.label} — {p.w} × {p.h}</option>)}</Select></Field>
        <p className="mt-2 text-[11.5px] text-muted">Dimensions: {doc.width} × {doc.height} px. Layers are repositioned when the size changes; check the layout afterwards. Confirm current platform specifications before publishing.</p>
        <div className="mt-3"><Color label="Background" value={doc.background} onChange={(c) => commit((d) => ({ ...d, background: c }), "bg")} /></div>
        <p className="mt-3 text-[11.5px] text-faint">Select a layer to edit its properties. Shortcuts: Delete, Ctrl/⌘+Z, Ctrl/⌘+D, arrow keys.</p>
      </Section>}
      <Section title={`Layers (${doc.els.length})`}>
        {layers.length ? <ul className="space-y-0.5">{layers.map((l) => (
          <li key={l.id} className={cn("flex items-center gap-1 rounded-md pl-2 text-[12px]", l.id === sel ? "bg-accent-soft text-accent" : "hover:bg-raised")}>
            <button type="button" className="min-w-0 flex-1 truncate py-1.5 text-left" onClick={() => setSel(l.id)}>{l.type === "text" ? `“${(l.text ?? "").slice(0, 22)}”` : l.name}</button>
            <button type="button" aria-label="Move layer up" className="p-1 text-faint hover:text-ink" onClick={() => reorder(l.id, "up")}><ArrowUp className="size-3.5" /></button>
            <button type="button" aria-label="Move layer down" className="p-1 text-faint hover:text-ink" onClick={() => reorder(l.id, "down")}><ArrowDown className="size-3.5" /></button>
            <button type="button" aria-label={l.visible ? "Hide layer" : "Show layer"} className="p-1 text-faint hover:text-ink" onClick={() => patch(l.id, { visible: !l.visible })}>{l.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}</button>
            <button type="button" aria-label={l.locked ? "Unlock layer" : "Lock layer"} className="p-1 pr-1.5 text-faint hover:text-ink" onClick={() => patch(l.id, { locked: !l.locked })}>{l.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}</button>
          </li>))}</ul> : <p className="text-[12px] text-muted">No layers yet. Add text, shapes or an image from the left.</p>}
      </Section>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-1.5 border-b border-line bg-surface px-2 sm:px-3">
        <Tip text="Back to library"><Link href="/studio" aria-label="Back to library" className="flex size-8 items-center justify-center rounded-md text-muted hover:bg-raised hover:text-ink"><ArrowLeft className="size-4" /></Link></Tip>
        <Input aria-label="Creative name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="h-8 w-32 border-transparent bg-transparent px-1.5 font-medium hover:border-line sm:w-56" />
        <span className="hidden items-center gap-1 text-[12px] text-faint md:flex">{!canEdit ? "View only" : state === "saved" ? <><Check className="size-3.5" />Saved in this browser</> : "Saving…"}</span>
        <div className="ml-auto flex items-center gap-1">
          <Tip text="Undo (Ctrl/⌘+Z)"><Button variant="ghost" size="icon" aria-label="Undo" disabled={!h.canUndo} onClick={h.undo}><Undo2 /></Button></Tip>
          <Tip text="Redo (Ctrl/⌘+Shift+Z)"><Button variant="ghost" size="icon" aria-label="Redo" disabled={!h.canRedo} onClick={h.redo}><Redo2 /></Button></Tip>
          <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
          <span className="hidden items-center sm:flex">
            <Button variant="ghost" size="icon" aria-label="Zoom out" onClick={() => setZoomPref(Math.max(0.05, zoom - 0.1))}><Minus /></Button>
            <button type="button" className="tnum w-12 text-center text-[12px] text-muted hover:text-ink" onClick={() => setZoomPref(1)} title="Zoom to 100%">{Math.round(zoom * 100)}%</button>
            <Button variant="ghost" size="icon" aria-label="Zoom in" onClick={() => setZoomPref(Math.min(3, zoom + 0.1))}><Plus /></Button>
            <Tip text="Fit to screen"><Button variant="ghost" size="icon" aria-label="Fit to screen" onClick={() => setZoomPref(null)}><Maximize /></Button></Tip>
          </span>
          <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
          <Button variant="ghost" className="hidden md:inline-flex" onClick={duplicateDesign} disabled={!canEdit}><Copy />Duplicate</Button>
          <Button variant="ghost" onClick={() => { setSel(null); setTimeout(() => api.current && setPreview(api.current.toDataURL("image/png", Math.min(doc.width, 1000))), 60); }}><Eye /><span className="hidden sm:inline">Preview</span></Button>
          <Button onClick={saveNow} disabled={!canEdit}><Save /><span className="hidden sm:inline">Save</span></Button>
          <Menu>
            <MenuTrigger asChild><Button variant="primary"><Download />Export<ChevronDown /></Button></MenuTrigger>
            <MenuContent><MenuLabel>{doc.width} × {doc.height} px</MenuLabel><MenuItem onSelect={() => setTimeout(() => exportAs("image/png"), 60)}>PNG — lossless</MenuItem><MenuItem onSelect={() => setTimeout(() => exportAs("image/jpeg"), 60)}>JPEG — smaller file</MenuItem><MenuSeparator /><MenuItem onSelect={() => { setSel(null); setTimeout(sendToLive, 60); }}>Post to Facebook / Instagram (live)…</MenuItem></MenuContent>
          </Menu>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Toggle properties" onClick={() => setRightOpen((o) => !o)}><SlidersHorizontal /></Button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1">
        <div className="flex w-[68px] shrink-0 flex-col items-center gap-0.5 border-r border-line bg-surface py-2" role="tablist" aria-label="Editor tools" aria-orientation="vertical">
          {TABS.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id && leftOpen} onClick={() => { setLeftOpen(tab === t.id ? !leftOpen : true); setTab(t.id); }} className={cn("flex w-[60px] flex-col items-center gap-0.5 rounded-md py-1.5 text-[10px]", tab === t.id && leftOpen ? (t.id === "ai" ? "bg-ai-soft text-ai" : "bg-accent-soft text-accent") : "text-muted hover:bg-raised hover:text-ink")}><t.icon className="size-4" />{t.label}</button>)}
        </div>
        {leftOpen && <div className="w-64 shrink-0 border-r border-line bg-surface max-lg:absolute max-lg:inset-y-0 max-lg:left-[68px] max-lg:z-20 max-lg:shadow-card">{leftPanel}</div>}
        <div ref={wrap} className="scroll-thin relative min-w-0 flex-1 overflow-auto bg-raised" onMouseDown={(e) => { if (e.target === e.currentTarget) setSel(null); }}>
          <div className="flex min-h-full min-w-full items-center justify-center p-7" style={{ width: "max-content", height: "max-content" }} onMouseDown={(e) => { if (e.target === e.currentTarget) setSel(null); }}>
            <div className="shadow-card ring-1 ring-line" style={{ lineHeight: 0 }}>
              <StudioCanvas doc={doc} zoom={zoom} selectedId={sel} onSelect={setSel} onChange={(id, p) => patch(id, p)} onMeasure={(id, hh) => h.replace((d) => ({ ...d, els: d.els.map((e) => (e.id === id ? { ...e, height: hh } : e)) }))} apiRef={api} />
            </div>
          </div>
        </div>
        <div className={cn("w-[272px] shrink-0 border-l border-line bg-surface max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-20 max-lg:shadow-card", !rightOpen && "max-lg:hidden")}>{rightPanel}</div>
      </div>
      <Modal open={!!preview} onOpenChange={(o) => !o && setPreview(null)} title="Preview" description={`${name} · ${doc.width} × ${doc.height} px, as it will export`} size="xl">
        {preview && <div className="flex justify-center rounded-lg bg-raised p-4"><img src={preview} alt="Creative preview" className="max-h-[62vh] w-auto shadow-card" /></div>}
      </Modal>
      <Modal open={!!swap} onOpenChange={(o) => !o && setSwap(null)} title="Replace the design with this template?" description="Your current layers will be replaced. You can undo this."
        footer={<><Button onClick={() => setSwap(null)}>Cancel</Button><Button variant="primary" onClick={() => { const t = TEMPLATES.find((x) => x.id === swap); if (t) { commit(() => buildTemplate(t)); setSel(null); setZoomPref(null); } setSwap(null); }}>Replace design</Button></>}>
        <p className="text-[13.5px] text-muted">Template: {TEMPLATES.find((x) => x.id === swap)?.name}. Uploaded images stay available under Uploads.</p>
      </Modal>
    </div>
  );
}
