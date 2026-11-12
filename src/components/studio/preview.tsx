"use client";
import { useStore } from "@/lib/store";
import type { Doc, El } from "@/lib/studio/types";

export function starPoints(n: number, size = 100) {
  const pts: string[] = [], inner = n > 8 ? 0.84 : 0.45;
  for (let i = 0; i < n * 2; i++) {
    const r = (size / 2) * (i % 2 ? inner : 1), a = (Math.PI * i) / n - Math.PI / 2;
    pts.push(`${(size / 2 + r * Math.cos(a)).toFixed(1)},${(size / 2 + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}
/** Resolves an image source. Uploaded images are referenced as `upload:<id>` so documents stay small. */
export function useResolveSrc() {
  const uploads = useStore((s) => s.uploads);
  return (src?: string) => (src?.startsWith("upload:") ? uploads.find((u) => u.id === src.slice(7))?.src : src);
}

function Node({ el, resolve }: { el: El; resolve: (s?: string) => string | undefined }) {
  const box: React.CSSProperties = { position: "absolute", left: el.x, top: el.y, width: el.width, height: el.type === "text" ? undefined : el.height, opacity: el.opacity, transform: `rotate(${el.rotation}deg)`, transformOrigin: "0 0" };
  if (el.type === "text")
    return <div style={{ ...box, color: el.fill, fontFamily: `"${el.fontFamily}", sans-serif`, fontSize: el.fontSize, fontWeight: el.fontStyle?.includes("bold") ? 700 : 400, fontStyle: el.fontStyle?.includes("italic") ? "italic" : "normal", textAlign: el.align, lineHeight: el.lineHeight, letterSpacing: el.letterSpacing, whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>{el.text}</div>;
  if (el.type === "star")
    return <svg style={box} viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points={starPoints(el.cornerRadius || 5)} fill={el.fill} /></svg>;
  if (el.type === "image") {
    const c = el.crop ?? { l: 0, t: 0, r: 0, b: 0 }, src = resolve(el.src);
    const w = 1 - c.l - c.r, h = 1 - c.t - c.b;
    return <div style={{ ...box, overflow: "hidden", borderRadius: el.cornerRadius, background: src ? undefined : "rgba(127,127,127,.25)" }}>{src && <img src={src} alt="" style={{ position: "absolute", width: `${100 / w}%`, height: `${100 / h}%`, left: `${(-c.l / w) * 100}%`, top: `${(-c.t / h) * 100}%`, maxWidth: "none" }} />}</div>;
  }
  return <div style={{ ...box, background: el.fill, borderRadius: el.type === "ellipse" ? "50%" : el.cornerRadius, border: el.stroke && el.strokeWidth ? `${el.strokeWidth}px ${el.placeholder ? "dashed" : "solid"} ${el.stroke}` : undefined, boxSizing: "border-box" }} />;
}

/** Lightweight DOM rendering of a document for thumbnails. The editor itself uses the Konva canvas. */
export function DocPreview({ doc, width, className }: { doc: Doc; width: number; className?: string }) {
  const resolve = useResolveSrc();
  const k = width / doc.width;
  return (
    <div className={className} style={{ width, height: doc.height * k, overflow: "hidden", position: "relative", background: doc.background }} aria-hidden>
      <div style={{ width: doc.width, height: doc.height, transform: `scale(${k})`, transformOrigin: "0 0", position: "relative" }}>
        {doc.els.filter((e) => e.visible).map((e) => <Node key={e.id} el={e} resolve={resolve} />)}
      </div>
    </div>
  );
}
