"use client";
import { ArrowLeft, Download, Film, Image as ImageIcon, Music, Pause, Play, Send, Sparkles, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Badge, Button, Field, Input, Select, cn } from "@/components/ui";
import { BUILT_IN, detectBeats, gridBeats, synthTrack } from "@/lib/motion/audio";
import { encodeGif } from "@/lib/motion/gif";
import { defaultContent, drawFrame, type Content } from "@/lib/motion/render";
import { GIF_SIZES, GIF_TEMPLATES, OCCASION_LIST, PALETTES, PHOTO_TEMPLATES, SIZES, VIDEO_TEMPLATES, type Kind, type Template } from "@/lib/motion/templates";

const BRAND = "Shalz Materials & Ornaments";
const KINDS: { id: Kind; label: string; icon: typeof ImageIcon; list: Template[] }[] = [
  { id: "photo", label: "Photos", icon: ImageIcon, list: PHOTO_TEMPLATES },
  { id: "video", label: "Videos", icon: Film, list: VIDEO_TEMPLATES },
  { id: "gif", label: "GIFs", icon: Sparkles, list: GIF_TEMPLATES },
];
const PAGE = 24;

/* ---------- Thumbnail: drawn once, on screen only ---------- */
function Thumb({ tpl, onOpen }: { tpl: Template; onOpen: () => void }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = React.useState(false);
  const w = 260, h = Math.round((w * tpl.size.h) / tpl.size.w);
  React.useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d")!; const content = defaultContent(tpl, BRAND);
    if (!hover || tpl.kind === "photo") { drawFrame(ctx, tpl, content, { t: 0, still: true }); return; }
    let raf = 0; const start = performance.now();
    const loop = () => { drawFrame(ctx, tpl, content, { t: ((performance.now() - start) / 1000) % (tpl.duration || 3) }); raf = requestAnimationFrame(loop); };
    loop(); return () => cancelAnimationFrame(raf);
  }, [tpl, hover]);
  return (
    <button type="button" onClick={onOpen} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface text-left transition hover:border-accent hover:shadow-md">
      <div className="flex h-[210px] items-center justify-center bg-raised p-3">
        <canvas ref={ref} width={w} height={h} className="max-h-full max-w-full rounded-md shadow-sm" />
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <span className="min-w-0 truncate text-[13px] font-medium">{tpl.name}</span>
        <span className="shrink-0 text-[11px] text-faint tnum">{tpl.size.w}×{tpl.size.h}{tpl.duration ? ` · ${tpl.duration}s` : ""}</span>
      </div>
    </button>
  );
}

/* ---------- Gallery ---------- */
export function MotionStudio() {
  const [kind, setKind] = React.useState<Kind>("photo");
  const [occ, setOcc] = React.useState("All");
  const [page, setPage] = React.useState(1);
  const [open, setOpen] = React.useState<Template | null>(null);
  const list = KINDS.find((k) => k.id === kind)!.list.filter((t) => occ === "All" || t.occasion === occ);
  React.useEffect(() => setPage(1), [kind, occ]);

  if (open) return <MotionEditor tpl={open} onBack={() => setOpen(null)} />;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight">Templates — photos, videos & GIFs</h1>
          <p className="mt-1 max-w-3xl text-[13.5px] text-muted">{PHOTO_TEMPLATES.length} photo, {VIDEO_TEMPLATES.length} video and {GIF_TEMPLATES.length} GIF designs made for {BRAND}. Pick one, change the words, add your product photo and music, then download or post. Hover a video or GIF to see it move.</p>
        </div>
      </div>
      <div className="mb-4 grid max-w-xl grid-cols-3 gap-2">
        {KINDS.map((k) => {
          const Icon = k.icon;
          return (
            <button key={k.id} type="button" onClick={() => setKind(k.id)}
              className={cn("flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-[13.5px] font-medium", kind === k.id ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface hover:bg-raised")}>
              <Icon className="size-4" />{k.label}<span className="tnum opacity-75">{k.list.length}</span>
            </button>
          );
        })}
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {["All", ...OCCASION_LIST].map((o) => (
          <button key={o} type="button" onClick={() => setOcc(o)} className={cn("rounded-full border px-3 py-1 text-[12.5px]", occ === o ? "border-accent bg-accent-soft font-semibold text-accent" : "border-line hover:bg-raised")}>{o}</button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {list.slice(0, page * PAGE).map((t) => <Thumb key={t.id} tpl={t} onOpen={() => { setOpen(t); window.scrollTo({ top: 0 }); }} />)}
      </div>
      {list.length > page * PAGE && (
        <div className="mt-6 flex justify-center"><Button onClick={() => setPage((p) => p + 1)}>Show more ({list.length - page * PAGE} left)</Button></div>
      )}
    </div>
  );
}

/* ---------- Editor ---------- */
interface MusicState { id: string; buffer: AudioBuffer | null; beats: number[]; bpm: number; name: string }

function MotionEditor({ tpl: base, onBack }: { tpl: Template; onBack: () => void }) {
  const router = useRouter();
  const [size, setSize] = React.useState(base.size.id);
  const sizes = base.kind === "gif" ? GIF_SIZES : SIZES;
  const tpl = React.useMemo<Template>(() => ({ ...base, size: sizes.find((s) => s.id === size) ?? base.size }), [base, size, sizes]);
  const [c, setC] = React.useState<Content>(() => defaultContent(base, BRAND));
  const set = <K extends keyof Content>(k: K, v: Content[K]) => setC((s) => ({ ...s, [k]: v }));
  const [music, setMusic] = React.useState<MusicState>({ id: "none", buffer: null, beats: [], bpm: 0, name: "" });
  const [sync, setSync] = React.useState(true);
  const [volume, setVolume] = React.useState(0.8);
  const [playing, setPlaying] = React.useState(false);
  const [busy, setBusy] = React.useState("");
  const [note, setNote] = React.useState("");
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const audioCtx = React.useRef<AudioContext | null>(null);
  const src = React.useRef<AudioBufferSourceNode | null>(null);
  const moving = tpl.kind !== "photo";
  const dur = tpl.duration || 0;
  const beats = sync && music.buffer ? music.beats : undefined;

  // Still preview whenever something changes (and not playing).
  React.useEffect(() => {
    if (playing || !canvas.current) return;
    drawFrame(canvas.current.getContext("2d")!, tpl, c, { t: dur ? dur * 0.8 : 0, still: !moving, beats });
  }, [tpl, c, playing, moving, dur, beats]);

  const stopAudio = () => { try { src.current?.stop(); } catch { /* already stopped */ } src.current = null; };
  React.useEffect(() => () => { stopAudio(); audioCtx.current?.close().catch(() => {}); }, []);

  const startAudio = (dest?: AudioNode) => {
    if (!music.buffer) return;
    const ac = audioCtx.current ?? (audioCtx.current = new AudioContext());
    stopAudio();
    const s = ac.createBufferSource(); s.buffer = music.buffer; s.loop = true;
    const g = ac.createGain(); g.gain.value = volume; s.connect(g); g.connect(dest ?? ac.destination);
    s.start(); src.current = s;
  };

  // Play preview
  React.useEffect(() => {
    if (!playing || !canvas.current) return;
    const ctx = canvas.current.getContext("2d")!;
    const start = performance.now(); let raf = 0;
    startAudio();
    const loop = () => {
      const t = (performance.now() - start) / 1000;
      if (tpl.kind === "video" && t > dur) { setPlaying(false); return; }
      drawFrame(ctx, tpl, c, { t: tpl.kind === "gif" ? t % dur : t, beats });
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); stopAudio(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  /* Music */
  const pickBuiltIn = async (id: string) => {
    setPlaying(false);
    if (id === "none") return setMusic({ id, buffer: null, beats: [], bpm: 0, name: "" });
    setBusy("Making the music…");
    const tr = BUILT_IN.find((t) => t.id === id)!;
    const buf = await synthTrack(id, Math.max(4, dur || 8));
    setMusic({ id, buffer: buf, bpm: tr.bpm, beats: gridBeats(tr.bpm, Math.max(4, dur || 8), 0), name: tr.name });
    setBusy("");
  };
  const uploadMusic = async (f: File | undefined) => {
    if (!f) return;
    setPlaying(false); setBusy("Reading your music and finding the beat…");
    try {
      const ac = audioCtx.current ?? (audioCtx.current = new AudioContext());
      const buf = await ac.decodeAudioData(await f.arrayBuffer());
      const { bpm, beats: b } = detectBeats(buf);
      setMusic({ id: "upload", buffer: buf, bpm, beats: b, name: f.name });
      setNote(`Beat found: about ${bpm} beats a minute. Animations will land on the beat.`);
    } catch { setNote("That file could not be read. Use an MP3, M4A or WAV file."); }
    setBusy("");
  };

  /* Photo */
  const uploadPhoto = (f: File | undefined) => {
    if (!f) return;
    const img = new Image();
    img.onload = () => setC((s) => ({ ...s, image: img, imageW: img.naturalWidth, imageH: img.naturalHeight }));
    img.src = URL.createObjectURL(f);
  };

  /* Exports */
  const fileBase = `${BRAND.split(" ")[0].toLowerCase()}-${tpl.id}-${tpl.size.w}x${tpl.size.h}`;
  const fullCanvas = () => { const cv = document.createElement("canvas"); cv.width = tpl.size.w; cv.height = tpl.size.h; return cv; };
  const save = (blob: Blob, name: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); };

  const exportPng = () => {
    const cv = fullCanvas(); drawFrame(cv.getContext("2d")!, tpl, c, { t: dur ? dur * 0.8 : 0, still: true });
    cv.toBlob((b) => b && save(b, `${fileBase}.png`), "image/png");
  };
  const postPhoto = () => {
    const cv = fullCanvas(); drawFrame(cv.getContext("2d")!, tpl, c, { t: dur ? dur * 0.8 : 0, still: true });
    try { sessionStorage.setItem("entraiq-live-creative", JSON.stringify({ url: cv.toDataURL("image/jpeg", 0.9), name: tpl.name })); }
    catch { setNote("This design is too large to hand over. Download the PNG and upload it on the Post tab."); return; }
    router.push("/account#meta");
  };
  const exportVideo = async () => {
    setPlaying(false); setBusy(`Recording the video (${dur} seconds)…`);
    const cv = fullCanvas(); const ctx = cv.getContext("2d")!;
    const stream = cv.captureStream(30);
    if (music.buffer) {
      const ac = audioCtx.current ?? (audioCtx.current = new AudioContext());
      const dest = ac.createMediaStreamDestination(); startAudio(dest);
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    }
    const types = ["video/mp4;codecs=avc1,mp4a", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"];
    const mime = types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "video/webm";
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
    const chunks: Blob[] = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise<void>((r) => (rec.onstop = () => r()));
    rec.start(250);
    const start = performance.now();
    await new Promise<void>((resolve) => {
      const loop = () => { const t = (performance.now() - start) / 1000; drawFrame(ctx, tpl, c, { t, beats }); if (t < dur) requestAnimationFrame(loop); else resolve(); };
      loop();
    });
    rec.stop(); stopAudio(); await done;
    const ext = mime.startsWith("video/mp4") ? "mp4" : "webm";
    save(new Blob(chunks, { type: mime.split(";")[0] }), `${fileBase}.${ext}`);
    setBusy(""); setNote(ext === "mp4" ? "MP4 saved. Upload it as a Reel or Facebook video." : "Saved as WEBM (this browser can't record MP4). Chrome on a computer or phone records MP4.");
  };
  const exportGif = async () => {
    setPlaying(false); setBusy("Making the GIF…");
    await new Promise((r) => setTimeout(r, 30));
    const cv = fullCanvas(); const ctx = cv.getContext("2d", { willReadFrequently: true })!;
    const fps = 12, n = Math.max(6, Math.round(dur * fps)), frames: ImageData[] = [];
    for (let i = 0; i < n; i++) { drawFrame(ctx, tpl, c, { t: (i / n) * dur, beats }); frames.push(ctx.getImageData(0, 0, cv.width, cv.height)); }
    save(encodeGif(frames, Math.round(1000 / fps)), `${fileBase}.gif`);
    setBusy(""); setNote("GIF saved. It loops forever. GIFs have no sound.");
  };

  const pal = PALETTES[c.palette];
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" onClick={() => { setPlaying(false); onBack(); }}><ArrowLeft />Back to templates</Button>
        <h1 className="text-[18px] font-semibold">{tpl.name}</h1>
        <Badge>{tpl.kind === "photo" ? "Photo" : tpl.kind === "video" ? `Video · ${dur}s` : `GIF · ${dur}s loop`}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Preview */}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-raised p-4">
          <canvas ref={canvas} width={tpl.size.w} height={tpl.size.h} className="h-auto max-h-[70vh] w-auto max-w-full rounded-lg shadow-md" style={{ aspectRatio: `${tpl.size.w}/${tpl.size.h}` }} />
          {moving && <Button variant="primary" onClick={() => setPlaying((p) => !p)}>{playing ? <><Pause />Stop</> : <><Play />Play{music.buffer ? " with music" : ""}</>}</Button>}
        </div>

        {/* Controls */}
        <div className="space-y-4 text-[13px]">
          <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
            <p className="font-semibold">Words</p>
            <Field label="Headline"><Input value={c.headline} onChange={(e) => set("headline", e.target.value)} /></Field>
            <Field label="Second line"><Input value={c.sub} onChange={(e) => set("sub", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Button text"><Input value={c.cta} onChange={(e) => set("cta", e.target.value)} /></Field>
              <Field label="Price (leave empty to hide)"><Input value={c.price} placeholder="₹799" onChange={(e) => set("price", e.target.value)} /></Field>
            </div>
            <Field label="Shop name"><Input value={c.brand} onChange={(e) => set("brand", e.target.value)} /></Field>
          </section>

          <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
            <p className="font-semibold">Product photo & look</p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 font-medium hover:bg-raised"><Upload className="size-4" />{c.image ? "Change photo" : "Add product photo"}<input type="file" accept="image/*" className="hidden" onChange={(e) => uploadPhoto(e.target.files?.[0])} /></label>
              {c.image && <Button size="sm" variant="ghost" onClick={() => setC((s) => ({ ...s, image: null, imageW: 0, imageH: 0 }))}><X />Remove</Button>}
            </div>
            <Field label="Size">
              <Select value={size} onChange={(e) => setSize(e.target.value)}>{sizes.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</Select>
            </Field>
            <div>
              <p className="mb-1.5 text-[12px] text-muted">Colours · {pal.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {PALETTES.map((p, i) => (
                  <button key={p.name} type="button" title={p.name} onClick={() => set("palette", i)}
                    className={cn("size-7 rounded-full border-2", c.palette === i ? "border-accent ring-2 ring-accent/40" : "border-line")}
                    style={{ background: `linear-gradient(135deg, ${p.bg} 50%, ${p.accent} 50%)` }} />
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={c.serif} onChange={(e) => set("serif", e.target.checked)} />Elegant serif headline</label>
          </section>

          {tpl.kind === "video" && (
            <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
              <p className="flex items-center gap-1.5 font-semibold"><Music className="size-4" />Music</p>
              <Select value={music.id === "upload" ? "upload" : music.id} onChange={(e) => e.target.value !== "upload" && pickBuiltIn(e.target.value)}>
                <option value="none">No music</option>
                {BUILT_IN.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.mood} ({t.bpm} bpm)</option>)}
                {music.id === "upload" && <option value="upload">Your music: {music.name}</option>}
              </Select>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 font-medium hover:bg-raised"><Upload className="size-4" />Upload your own music<input type="file" accept="audio/*" className="hidden" onChange={(e) => uploadMusic(e.target.files?.[0])} /></label>
              {music.buffer && (
                <>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={sync} onChange={(e) => setSync(e.target.checked)} />Sync animation to the beat ({music.bpm} bpm)</label>
                  <label className="flex items-center gap-2">Volume<input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="flex-1" /></label>
                </>
              )}
              <p className="text-[11.5px] text-faint">The 4 built-in tracks are original and free to use anywhere. For your own music, use songs you have the rights to — Instagram and Facebook can mute videos with copyrighted songs.</p>
            </section>
          )}

          <section className="space-y-2 rounded-xl border border-line bg-surface p-4">
            <p className="font-semibold">Download or post</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={postPhoto} disabled={!!busy}><Send />Post to Facebook / Instagram</Button>
              <Button onClick={exportPng} disabled={!!busy}><Download />PNG photo</Button>
              {tpl.kind === "video" && <Button onClick={exportVideo} disabled={!!busy}><Film />MP4 video</Button>}
              {moving && <Button onClick={exportGif} disabled={!!busy}><Sparkles />GIF</Button>}
            </div>
            {busy && <p className="text-accent">{busy}</p>}
            {note && !busy && <p className="text-muted">{note}</p>}
            {moving && <p className="text-[11.5px] text-faint">"Post" sends a still photo of this design. To post the video, download the MP4 and upload it as a Reel from the Instagram or Facebook app.</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
