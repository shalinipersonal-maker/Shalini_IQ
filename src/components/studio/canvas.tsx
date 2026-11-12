"use client";
import type Konva from "konva";
import * as React from "react";
import { Ellipse, Group, Image as KImage, Layer, Rect, Star, Stage, Text, Transformer } from "react-konva";
import type { Doc, El } from "@/lib/studio/types";
import { useResolveSrc } from "./preview";

export interface CanvasApi { toDataURL: (mime: "image/png" | "image/jpeg", targetWidth?: number) => string }
interface Props {
  doc: Doc;
  zoom: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<El>) => void;
  onMeasure: (id: string, height: number) => void;
  apiRef: React.RefObject<CanvasApi | null>;
}

function useImage(src?: string) {
  const [loaded, setLoaded] = React.useState<{ src: string; img: HTMLImageElement } | null>(null);
  React.useEffect(() => {
    if (!src) return;
    const i = new window.Image();
    i.onload = () => setLoaded({ src, img: i });
    i.src = src;
    return () => { i.onload = null; };
  }, [src]);
  return loaded && loaded.src === src ? loaded.img : null;
}

function ImageNode({ el, src }: { el: El; src?: string }) {
  const img = useImage(src);
  if (!img) return <Rect width={el.width} height={el.height} fill="rgba(127,127,127,0.25)" />;
  const c = el.crop ?? { l: 0, t: 0, r: 0, b: 0 };
  return <KImage image={img} width={el.width} height={el.height} cornerRadius={el.cornerRadius} crop={{ x: c.l * img.width, y: c.t * img.height, width: (1 - c.l - c.r) * img.width, height: (1 - c.t - c.b) * img.height }} />;
}

function TextNode({ el, onMeasure }: { el: El; onMeasure: (id: string, h: number) => void }) {
  const ref = React.useRef<Konva.Text>(null);
  React.useEffect(() => {
    const h = ref.current?.height() ?? 0;
    if (h && Math.abs(h - el.height) > 1) onMeasure(el.id, h);
  });
  return <Text ref={ref} width={el.width} text={el.text} fontSize={el.fontSize} fontFamily={el.fontFamily} fontStyle={el.fontStyle} fill={el.fill} align={el.align} lineHeight={el.lineHeight} letterSpacing={el.letterSpacing} />;
}

function Shape({ el, src, onMeasure }: { el: El; src?: string; onMeasure: Props["onMeasure"] }) {
  switch (el.type) {
    case "text": return <TextNode el={el} onMeasure={onMeasure} />;
    case "image": return <ImageNode el={el} src={src} />;
    case "ellipse": return <Ellipse x={el.width / 2} y={el.height / 2} radiusX={el.width / 2} radiusY={el.height / 2} fill={el.fill} stroke={el.stroke} strokeWidth={el.stroke ? el.strokeWidth : 0} />;
    case "star": { const n = el.cornerRadius || 5; return <Star x={el.width / 2} y={el.height / 2} numPoints={n} outerRadius={50} innerRadius={n > 8 ? 42 : 22.5} scaleX={el.width / 100} scaleY={el.height / 100} fill={el.fill} />; }
    default: return (
      <>
        <Rect width={el.width} height={el.height} fill={el.fill} cornerRadius={el.cornerRadius} stroke={el.stroke} strokeWidth={el.stroke ? el.strokeWidth : 0} dash={el.placeholder ? [18, 12] : undefined} />
        {el.placeholder && <Text width={el.width} height={el.height} text={"Product image\nSelect, then pick a photo in Uploads"} align="center" verticalAlign="middle" fontSize={Math.max(14, Math.min(el.width, el.height) * 0.055)} fill="rgba(127,127,127,0.95)" fontFamily="IBM Plex Sans Variable" lineHeight={1.5} />}
      </>
    );
  }
}

export default function StudioCanvas({ doc, zoom, selectedId, onSelect, onChange, onMeasure, apiRef }: Props) {
  const stage = React.useRef<Konva.Stage>(null);
  const tr = React.useRef<Konva.Transformer>(null);
  const resolve = useResolveSrc();
  const [fontsReady, setFontsReady] = React.useState(false);
  React.useEffect(() => {
    // Canvas text is measured once; wait for the web font so it is not measured with a fallback face.
    Promise.all([document.fonts.load('700 20px "IBM Plex Sans Variable"'), document.fonts.load('400 20px "IBM Plex Sans Variable"')]).finally(() => setFontsReady(true));
  }, []);
  const sel = doc.els.find((e) => e.id === selectedId && e.visible && !e.locked);

  React.useEffect(() => {
    const t = tr.current, s = stage.current;
    if (!t || !s) return;
    const node = sel ? s.findOne(`#${sel.id}`) : null;
    t.nodes(node ? [node] : []);
    t.getLayer()?.batchDraw();
  });

  React.useImperativeHandle(apiRef, () => ({
    toDataURL(mime, targetWidth) {
      const s = stage.current!;
      tr.current?.hide();
      const url = s.toDataURL({ mimeType: mime, quality: 0.92, pixelRatio: (targetWidth ?? doc.width) / (doc.width * zoom) });
      tr.current?.show();
      return url;
    },
  }));

  if (!fontsReady) return <div style={{ width: doc.width * zoom, height: doc.height * zoom, background: doc.background }} />;
  return (
    <Stage ref={stage} width={doc.width * zoom} height={doc.height * zoom} scaleX={zoom} scaleY={zoom} onMouseDown={(e) => { if (e.target === e.target.getStage() || e.target.name() === "bg") onSelect(null); }} onTouchStart={(e) => { if (e.target.name() === "bg") onSelect(null); }}>
      <Layer>
        <Rect name="bg" width={doc.width} height={doc.height} fill={doc.background} />
        {doc.els.filter((e) => e.visible).map((el) => (
          <Group key={el.id} id={el.id} x={el.x} y={el.y} rotation={el.rotation} opacity={el.opacity} draggable={!el.locked} listening={!el.locked}
            onMouseDown={() => onSelect(el.id)} onTap={() => onSelect(el.id)}
            onMouseEnter={(e) => { const c = e.target.getStage()?.container(); if (c) c.style.cursor = "move"; }}
            onMouseLeave={(e) => { const c = e.target.getStage()?.container(); if (c) c.style.cursor = "default"; }}
            onDragEnd={(e) => onChange(el.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) })}
            onTransformEnd={(e) => {
              const n = e.target, sx = n.scaleX(), sy = n.scaleY();
              n.scaleX(1); n.scaleY(1);
              const patch: Partial<El> = { x: Math.round(n.x()), y: Math.round(n.y()), rotation: Math.round(n.rotation() * 10) / 10, width: Math.max(8, Math.round(el.width * sx)) };
              if (el.type === "text") { if (Math.abs(sy - 1) > 0.01) patch.fontSize = Math.max(6, Math.round((el.fontSize ?? 20) * sy)); }
              else patch.height = Math.max(8, Math.round(el.height * sy));
              onChange(el.id, patch);
            }}>
            <Shape el={el} src={resolve(el.src)} onMeasure={onMeasure} />
          </Group>
        ))}
        <Transformer ref={tr} rotateEnabled keepRatio={sel?.type === "text" || sel?.type === "image"} flipEnabled={false}
          enabledAnchors={sel?.type === "text" ? ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right"] : sel?.type === "image" ? ["top-left", "top-right", "bottom-left", "bottom-right"] : undefined}
          anchorSize={9} anchorCornerRadius={2} anchorStroke="#3d55f0" borderStroke="#3d55f0" rotateAnchorOffset={28}
          boundBoxFunc={(o, n) => (n.width < 10 || n.height < 10 ? o : n)} />
      </Layer>
    </Stage>
  );
}
