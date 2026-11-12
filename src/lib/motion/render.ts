/**
 * Draws one frame of a template on a 2D canvas. Pure drawing — no React — so the same code makes thumbnails,
 * the live preview, PNG export, MP4 recording and GIF frames.
 * t = seconds from the start. beats = beat times (seconds) when music sync is on.
 */
import { PALETTES, type Palette, type Template } from "./templates";

export interface Content {
  headline: string; sub: string; cta: string; price: string; brand: string;
  image: CanvasImageSource | null; imageW: number; imageH: number;
  palette: number; serif: boolean;
}
export interface FrameOpts { t: number; beats?: number[]; still?: boolean }

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const backOut = (x: number) => { const c = 1.7; const p = clamp(x) - 1; return 1 + (c + 1) * p * p * p + c * p * p; };

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean); const lines: string[] = []; let cur = "";
  for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines.slice(0, 4);
}
/** Fits text into a box: shrinks the font until it fits on at most `maxLines` lines. */
function fitText(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, start: number, maxW: number, maxLines: number) {
  let px = start; let lines: string[] = [];
  for (; px > 10; px *= 0.92) { ctx.font = font(px); lines = wrap(ctx, text, maxW); if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxW)) break; }
  return { px, lines };
}

/** Placeholder product: a drawn pendant, so templates look complete before a photo is added. */
function drawGem(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, p: Palette) {
  ctx.save(); ctx.strokeStyle = p.accent; ctx.lineWidth = s * 0.02; ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.arc(cx, cy - s * 0.55, s * 0.5, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  for (let i = 0; i <= 12; i++) { const a = Math.PI * (0.15 + (0.7 * i) / 12); ctx.fillStyle = i % 3 ? p.accent : p.ink; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * s * 0.5, cy - s * 0.55 + Math.sin(a) * s * 0.5, s * 0.035, 0, Math.PI * 2); ctx.fill(); }
  const g = ctx.createLinearGradient(cx - s * 0.2, cy - s * 0.1, cx + s * 0.2, cy + s * 0.4); g.addColorStop(0, "#fff6d8"); g.addColorStop(0.4, p.accent); g.addColorStop(1, p.soft);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.06); ctx.lineTo(cx + s * 0.18, cy + s * 0.18); ctx.lineTo(cx, cy + s * 0.5); ctx.lineTo(cx - s * 0.18, cy + s * 0.18); ctx.closePath(); ctx.fill();
  ctx.fillStyle = p.ink; ctx.beginPath(); ctx.arc(cx, cy + s * 0.2, s * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Draws the product photo "cover"-fitted into a shape. */
function photo(ctx: CanvasRenderingContext2D, c: Content, p: Palette, x: number, y: number, w: number, h: number, shape: "rect" | "circle" | "arch" | "round", scale = 1, dy = 0) {
  ctx.save();
  ctx.beginPath();
  if (shape === "circle") ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
  else if (shape === "arch") { ctx.moveTo(x, y + h); ctx.lineTo(x, y + w / 2); ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath(); }
  else if (shape === "round") rr(ctx, x, y, w, h, Math.min(w, h) * 0.06);
  else ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = p.bg2; ctx.fillRect(x, y, w, h);
  if (c.image && c.imageW && c.imageH) {
    const r = Math.max(w / c.imageW, h / c.imageH) * scale; const iw = c.imageW * r, ih = c.imageH * r;
    ctx.drawImage(c.image, x + (w - iw) / 2, y + (h - ih) / 2 + dy, iw, ih);
  } else {
    const g = ctx.createRadialGradient(x + w / 2, y + h * 0.45, 0, x + w / 2, y + h / 2, Math.max(w, h) * 0.7); g.addColorStop(0, p.soft); g.addColorStop(1, p.bg2);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    drawGem(ctx, x + w / 2, y + h * 0.5 + dy, Math.min(w, h) * 0.55 * scale, p);
  }
  ctx.restore();
}

export function drawFrame(ctx: CanvasRenderingContext2D, tpl: Template, c: Content, o: FrameOpts) {
  const W = ctx.canvas.width, H = ctx.canvas.height, u = (Math.sqrt(W * H) / 100) * 0.92; // scales well for square, story and wide sizes
  const p = PALETTES[c.palette] ?? PALETTES[tpl.palette];
  const serifF = (px: number, it = false) => `${it ? "italic " : ""}${c.serif ? "500" : "700"} ${px}px ${c.serif ? "Georgia, 'Times New Roman', serif" : "Helvetica, Arial, sans-serif"}`;
  const sansF = (px: number, w = 500) => `${w} ${px}px Helvetica, Arial, sans-serif`;
  const D = Math.max(0.01, tpl.duration || 1);
  const still = o.still || tpl.kind === "photo";
  const gif = tpl.kind === "gif";
  const t = still ? 999 : o.t;

  // Entrance cues: on the beat when music sync is on, otherwise a steady rhythm.
  const beats = (o.beats ?? []).filter((b) => b >= 0.15);
  const cue = (i: number) => (beats.length > i ? beats[i] : 0.2 + i * 0.35);
  const enter = (i: number) => (still || gif ? 1 : easeOut((t - cue(i)) / 0.6));
  const phase = gif ? (o.t % D) / D : 0; // 0..1 loop position for GIFs
  const lastBeat = beats.filter((b) => b <= t).pop();
  const beatPulse = still ? 0 : tpl.motion === "pulse" || beats.length ? Math.max(0, 1 - (t - (lastBeat ?? -9)) / 0.25) : 0;
  const amb = (k = 1) => (gif ? Math.sin(phase * Math.PI * 2 * k) : Math.sin(t * 1.6 * k));

  // Background
  ctx.save();
  const bgG = ctx.createLinearGradient(0, 0, W, H); bgG.addColorStop(0, p.bg); bgG.addColorStop(1, p.bg2);
  ctx.fillStyle = bgG; ctx.fillRect(0, 0, W, H);

  // Motion helpers for an element
  const apply = (i: number, draw: () => void) => {
    const e = enter(i);
    if (e <= 0.001) return;
    ctx.save(); ctx.globalAlpha = e;
    const m = tpl.motion;
    if (m === "fadeUp" || m === "kinetic" || m === "float" || m === "shimmer" || m === "sparkle" || m === "confetti" || m === "spin" || m === "zoom") ctx.translate(0, (1 - e) * u * 5);
    if (m === "slide") ctx.translate((1 - e) * -u * 14, 0);
    if (m === "pop" || m === "pulse") { const s = m === "pop" && !still && !gif ? backOut((t - cue(i)) / 0.55) : 1; ctx.translate(W / 2, H / 2); ctx.scale(s || 0.001, s || 0.001); ctx.translate(-W / 2, -H / 2); }
    if (m === "wipe" && e < 1) { ctx.beginPath(); ctx.rect(0, 0, W * e, H); ctx.clip(); }
    draw(); ctx.restore();
  };
  const pulseScale = 1 + beatPulse * 0.035;
  const imgScale = tpl.motion === "zoom" ? 1 + (gif ? 0.04 * (0.5 - 0.5 * Math.cos(phase * Math.PI * 2)) : clamp(t / D) * 0.12) : 1;
  const imgDy = tpl.motion === "float" ? amb() * u * 1.2 : 0;

  const text = (s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = "left") => { ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "alphabetic"; ctx.fillText(s, x, y); };
  const headline = (x: number, y: number, maxW: number, size: number, align: CanvasTextAlign, lines = 3) => {
    const f = fitText(ctx, c.headline, (px) => serifF(px), size, maxW, lines);
    const lh = f.px * 1.08;
    f.lines.forEach((ln, k) => {
      if (tpl.motion === "kinetic" && !still && !gif) {
        const words = ln.split(" "); let acc = "";
        ctx.font = serifF(f.px);
        const full = ctx.measureText(ln).width; const startX = align === "center" ? x - full / 2 : align === "right" ? x - full : x;
        words.forEach((w, wi) => { const a = clamp((t - cue(0) - (k * 3 + wi) * 0.18) / 0.3); ctx.globalAlpha = a; text(w, startX + ctx.measureText(acc).width, y + k * lh, serifF(f.px), p.ink); acc += `${w} `; });
        ctx.globalAlpha = 1;
      } else text(ln, x, y + k * lh, serifF(f.px), p.ink, align);
    });
    return y + (f.lines.length - 1) * lh;
  };
  const pill = (label: string, cx: number, cy: number, size: number, filled = true) => {
    ctx.font = sansF(size, 700); const w = ctx.measureText(label).width + size * 2.2, h = size * 2.3;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(pulseScale, pulseScale);
    rr(ctx, -w / 2, -h / 2, w, h, h / 2);
    if (filled) { ctx.fillStyle = p.accent; ctx.fill(); } else { ctx.strokeStyle = p.accent; ctx.lineWidth = size * 0.12; ctx.stroke(); }
    ctx.fillStyle = filled ? (isLight(p.accent) ? p.ink : p.bg) : p.accent; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(label, 0, size * 0.05);
    ctx.restore();
  };
  const badge = (label: string, cx: number, cy: number, r: number) => {
    if (!label) return;
    ctx.save(); ctx.translate(cx, cy); const s = pulseScale * (tpl.motion === "pop" && gif ? 1 + 0.06 * Math.max(0, amb(2)) : 1); ctx.scale(s, s);
    ctx.rotate(tpl.motion === "spin" && !still ? (gif ? phase * Math.PI * 2 : t) * 0.15 : -0.12);
    ctx.fillStyle = p.accent; ctx.beginPath();
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; const rad = k % 2 ? r : r * 0.9; ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = isLight(p.accent) ? p.ink : p.bg; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const f = fitText(ctx, label, (px) => sansF(px, 800), r * 0.55, r * 1.4, 2); f.lines.forEach((ln, k) => { ctx.font = sansF(f.px, 800); ctx.fillText(ln, 0, (k - (f.lines.length - 1) / 2) * f.px * 1.05); });
    ctx.restore();
  };
  const brandLine = (x: number, y: number, align: CanvasTextAlign) => { if (c.brand) text(c.brand.toUpperCase(), x, y, sansF(u * 2.2, 600), p.accent, align); };
  const subLine = (x: number, y: number, maxW: number, align: CanvasTextAlign, size = u * 3.6) => { const f = fitText(ctx, c.sub, (px) => sansF(px, 400), size, maxW, 2); f.lines.forEach((ln, k) => { ctx.globalAlpha *= 0.85; text(ln, x, y + k * f.px * 1.3, sansF(f.px, 400), p.ink, align); ctx.globalAlpha /= 0.85; }); };

  // ----- Layouts -----
  const L = tpl.layout; const wide = W / H > 1.4; const tall = H / W > 1.5;
  if (L === "center") {
    const ps = Math.min(W * 0.62, H * (tall ? 0.42 : 0.48));
    apply(0, () => brandLine(W / 2, H * 0.08, "center"));
    apply(1, () => photo(ctx, c, p, W / 2 - ps / 2, H * (tall ? 0.16 : 0.12), ps, ps, "circle", imgScale * pulseScale, imgDy));
    if (tpl.motion === "spin" && !still) { ctx.save(); ctx.strokeStyle = p.accent; ctx.setLineDash([u * 1.5, u * 1.5]); ctx.lineWidth = u * 0.5; ctx.translate(W / 2, H * (tall ? 0.16 : 0.12) + ps / 2); ctx.rotate((gif ? phase * Math.PI * 2 : t * 0.6)); ctx.beginPath(); ctx.arc(0, 0, ps / 2 + u * 3, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    const y0 = H * (tall ? 0.16 : 0.12) + ps + u * 10;
    let yEnd = y0; apply(2, () => { yEnd = headline(W / 2, y0, W * 0.84, u * (tall ? 9 : 8), "center", 2); });
    apply(3, () => subLine(W / 2, yEnd + u * 6, W * 0.8, "center"));
    apply(4, () => pill(c.cta, W / 2, H * 0.92, u * 3));
    apply(4, () => badge(c.price, W / 2 + ps * 0.42, H * (tall ? 0.16 : 0.12) + ps * 0.12, u * 9));
  } else if (L === "splitLeft") {
    const pw = wide ? W * 0.45 : W * 0.5;
    apply(0, () => photo(ctx, c, p, 0, 0, pw, H, "rect", imgScale, imgDy));
    const x = pw + u * 6, mw = W - pw - u * 12;
    apply(1, () => brandLine(x, H * 0.18, "left"));
    let yEnd = H * 0.3; apply(2, () => { yEnd = headline(x, H * 0.3 + u * 6, mw, u * (wide ? 9 : 8), "left", 4); });
    apply(3, () => subLine(x, yEnd + u * 7, mw, "left"));
    apply(4, () => { ctx.textAlign = "left"; if (c.price) text(c.price, x, H * 0.72, serifF(u * 7, true), p.accent); });
    apply(5, () => pill(c.cta, x + u * 12, H * 0.84, u * 2.8));
  } else if (L === "splitTop") {
    const ph = H * (tall ? 0.55 : 0.58);
    apply(0, () => photo(ctx, c, p, 0, 0, W, ph, "rect", imgScale, imgDy));
    apply(1, () => { ctx.fillStyle = p.accent; ctx.fillRect(u * 7, ph + u * 5, u * 10, u * 0.8); });
    let yEnd = ph; apply(2, () => { yEnd = headline(u * 7, ph + u * 14, W - u * 14, u * 8, "left", 2); });
    apply(3, () => subLine(u * 7, yEnd + u * 6, W * 0.6, "left"));
    apply(4, () => badge(c.price, W - u * 16, ph, u * 10));
    apply(5, () => pill(c.cta, W - u * 22, H - u * 9, u * 2.8));
    apply(5, () => brandLine(u * 7, H - u * 6, "left"));
  } else if (L === "frame") {
    apply(0, () => photo(ctx, c, p, 0, 0, W, H, "rect", imgScale, imgDy));
    ctx.save(); const g = ctx.createLinearGradient(0, H * 0.45, 0, H); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, hexA(p.bg, 0.92)); ctx.fillStyle = g; ctx.fillRect(0, H * 0.4, W, H * 0.6); ctx.restore();
    apply(1, () => { ctx.strokeStyle = p.accent; ctx.lineWidth = u * 0.6; ctx.strokeRect(u * 4, u * 4, W - u * 8, H - u * 8); });
    let yEnd = H; apply(2, () => { yEnd = headline(W / 2, H * 0.72, W * 0.8, u * 8.5, "center", 2); });
    apply(3, () => subLine(W / 2, Math.min(H * 0.86, yEnd + u * 6), W * 0.8, "center"));
    apply(4, () => pill(c.cta, W / 2, H - u * 9, u * 2.8));
    apply(1, () => brandLine(W / 2, u * 10, "center"));
  } else if (L === "badge") {
    const ps = Math.min(W * 0.7, H * 0.55);
    apply(0, () => { ctx.fillStyle = p.soft; ctx.beginPath(); ctx.arc(W / 2, H * 0.4, ps * 0.62, 0, Math.PI * 2); ctx.fill(); });
    apply(1, () => photo(ctx, c, p, W / 2 - ps / 2, H * 0.4 - ps / 2, ps, ps, "round", imgScale, imgDy));
    apply(2, () => badge(c.price || "NEW", W / 2 + ps * 0.48, H * 0.4 - ps * 0.42, u * 11));
    apply(3, () => headline(W / 2, H * 0.4 + ps / 2 + u * 12, W * 0.86, u * 7.5, "center", 2));
    apply(4, () => pill(c.cta, W / 2, H - u * 8, u * 2.8));
    apply(1, () => brandLine(W / 2, u * 7, "center"));
  } else if (L === "diagonal") {
    apply(0, () => photo(ctx, c, p, W * 0.3, 0, W * 0.7, H, "rect", imgScale, imgDy));
    apply(1, () => { ctx.fillStyle = p.bg; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * 0.62, 0); ctx.lineTo(W * 0.42, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill(); ctx.strokeStyle = p.accent; ctx.lineWidth = u * 0.8; ctx.beginPath(); ctx.moveTo(W * 0.62, 0); ctx.lineTo(W * 0.42, H); ctx.stroke(); });
    let yEnd = H * 0.3; apply(2, () => { yEnd = headline(u * 6, H * 0.32, W * 0.42, u * 8, "left", 4); });
    apply(3, () => subLine(u * 6, yEnd + u * 6, W * 0.38, "left", u * 3.2));
    apply(4, () => { if (c.price) text(c.price, u * 6, H * 0.76, serifF(u * 7, true), p.accent); });
    apply(5, () => pill(c.cta, u * 6 + u * 13, H * 0.88, u * 2.6));
  } else if (L === "arch") {
    const aw = Math.min(W * 0.62, H * 0.42);
    apply(1, () => brandLine(W / 2, u * 8, "center"));
    apply(0, () => { ctx.strokeStyle = p.accent; ctx.lineWidth = u * 0.6; const x = W / 2 - aw / 2 - u * 2, y = H * 0.12 - u * 2; ctx.beginPath(); ctx.moveTo(x, y + aw * 1.25 + u * 4); ctx.lineTo(x, y + aw / 2 + u * 2); ctx.arc(W / 2, y + aw / 2 + u * 2, aw / 2 + u * 2, Math.PI, 0); ctx.lineTo(x + aw + u * 4, y + aw * 1.25 + u * 4); ctx.stroke(); photo(ctx, c, p, W / 2 - aw / 2, H * 0.12, aw, aw * 1.25, "arch", imgScale, imgDy); });
    const y0 = H * 0.12 + aw * 1.25 + u * 11;
    let yEnd = y0; apply(2, () => { yEnd = headline(W / 2, y0, W * 0.84, u * 7.5, "center", 2); });
    apply(3, () => subLine(W / 2, yEnd + u * 6, W * 0.8, "center"));
    apply(4, () => pill(c.cta, W / 2, H - u * 7, u * 2.6));
    apply(4, () => { if (c.price) text(c.price, W / 2 + aw / 2 + u * 2, H * 0.12 + u * 10, serifF(u * 5, true), p.accent, "left"); });
  } else if (L === "polaroid") {
    const pw = Math.min(W * 0.66, H * 0.5);
    apply(0, () => { ctx.save(); ctx.translate(W / 2, H * 0.4); ctx.rotate(-0.05 + (tpl.motion === "float" ? amb() * 0.02 : 0)); ctx.shadowColor = "rgba(0,0,0,0.25)"; ctx.shadowBlur = u * 4; ctx.fillStyle = "#fffdf8"; ctx.fillRect(-pw / 2 - u * 3, -pw / 2 - u * 3, pw + u * 6, pw + u * 16); ctx.shadowBlur = 0; photo(ctx, c, p, -pw / 2, -pw / 2, pw, pw, "rect", imgScale, 0); ctx.fillStyle = "#3a3330"; ctx.font = `italic 500 ${u * 3.6}px Georgia, serif`; ctx.textAlign = "center"; ctx.fillText(c.brand || c.sub, 0, pw / 2 + u * 9); ctx.restore(); });
    apply(2, () => headline(W / 2, H * 0.4 + pw / 2 + u * 22, W * 0.86, u * 7, "center", 2));
    apply(3, () => pill(c.cta, W / 2, H - u * 7, u * 2.6));
    apply(4, () => badge(c.price, W / 2 + pw * 0.5, H * 0.4 - pw * 0.5, u * 9));
  } else if (L === "minimal") {
    apply(0, () => brandLine(u * 8, u * 10, "left"));
    let yEnd = H * 0.3; apply(1, () => { yEnd = headline(u * 8, H * (tall ? 0.3 : 0.32), W - u * 16, u * (tall ? 13 : 12), "left", 4); });
    apply(2, () => subLine(u * 8, yEnd + u * 8, W * 0.7, "left", u * 4));
    const ps = Math.min(W, H) * 0.28;
    apply(3, () => photo(ctx, c, p, W - ps - u * 8, H - ps - u * 8, ps, ps, "circle", imgScale, imgDy));
    apply(4, () => pill(c.cta, u * 8 + u * 13, H - u * 12, u * 2.8));
  } else if (L === "grid") {
    const g = u * 1.2, cw = (W - g * 3) / 2, chh = (H * 0.66 - g * 3) / 2;
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([cx, cy], k) => apply(k, () => { photo(ctx, c, p, g + cx * (cw + g), g + cy * (chh + g), cw, chh, "round", imgScale * (1 + k * 0.08), imgDy); if (k % 3 === 1) { ctx.fillStyle = hexA(p.accent, 0.18); rr(ctx, g + cx * (cw + g), g + cy * (chh + g), cw, chh, Math.min(cw, chh) * 0.06); ctx.fill(); } }));
    let yEnd = H * 0.66; apply(4, () => { yEnd = headline(W / 2, H * 0.66 + u * 11, W * 0.86, u * 7.5, "center", 2); });
    apply(5, () => subLine(W / 2, yEnd + u * 6, W * 0.8, "center"));
    apply(5, () => pill(c.cta, W / 2, H - u * 6, u * 2.6));
  } else if (L === "sale") {
    const big = fitText(ctx, c.headline.toUpperCase(), (px) => sansF(px, 900), u * 18, W * 0.9, 2);
    const top = H * 0.12 + big.px, bottom = top + (big.lines.length - 1) * big.px * 1.02;
    apply(0, () => { ctx.save(); ctx.translate(W / 2, top); ctx.scale(pulseScale, pulseScale); big.lines.forEach((ln, k) => text(ln, 0, k * big.px * 1.02, sansF(big.px, 900), p.accent, "center")); ctx.restore(); });
    const py = bottom + u * 6, ps = Math.max(u * 10, Math.min(W * 0.46, H - py - u * 26));
    apply(1, () => photo(ctx, c, p, W / 2 - ps / 2, py, ps, ps, "circle", imgScale, imgDy));
    apply(2, () => subLine(W / 2, py + ps + u * 7, W * 0.8, "center", u * 4));
    apply(3, () => badge(c.price, W / 2 + ps * 0.55, py + ps * 0.1, u * 9));
    apply(4, () => pill(c.cta, W / 2, H - u * 7, u * 3));
    apply(0, () => brandLine(W / 2, u * 7, "center"));
  } else {
    // tip card
    apply(0, () => { ctx.fillStyle = p.bg2; rr(ctx, u * 6, u * 6, W - u * 12, H - u * 12, u * 4); ctx.fill(); });
    apply(1, () => { text("✦", W / 2, H * 0.24, sansF(u * 10, 400), p.accent, "center"); });
    let yEnd = H * 0.4; apply(2, () => { yEnd = headline(W / 2, H * 0.38, W * 0.76, u * 8, "center", 3); });
    apply(3, () => subLine(W / 2, yEnd + u * 8, W * 0.72, "center", u * 4.2));
    apply(4, () => pill(c.cta, W / 2, H - u * 14, u * 2.6, false));
    apply(4, () => brandLine(W / 2, H - u * 8, "center"));
  }

  // ----- Ambient effects -----
  if (!still) {
    if (tpl.motion === "shimmer") { const pos = gif ? phase : (t % 2.4) / 2.4; ctx.save(); ctx.globalCompositeOperation = "lighter"; const x = -W * 0.3 + pos * W * 1.6; const g = ctx.createLinearGradient(x - W * 0.15, 0, x + W * 0.15, H * 0.3); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,240,200,0.22)"); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    if (tpl.motion === "sparkle" || beatPulse > 0.6) { for (let k = 0; k < 14; k++) { const sx = ((k * 7919) % 97) / 97 * W, sy = ((k * 104729) % 89) / 89 * H; const tw = 0.5 + 0.5 * Math.sin((gif ? phase * Math.PI * 2 * 2 : t * 3) + k * 1.7); const s = u * (0.6 + tw * 1.4); ctx.save(); ctx.globalAlpha = tw * 0.9; ctx.fillStyle = k % 2 ? p.accent : "#fff6dc"; ctx.translate(sx, sy); ctx.beginPath(); for (let j = 0; j < 8; j++) { const a = (j / 8) * Math.PI * 2; const r = j % 2 ? s * 0.3 : s; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.restore(); } }
    if (tpl.motion === "confetti") { for (let k = 0; k < 40; k++) { const sp = 0.25 + ((k * 37) % 10) / 20; const prog = gif ? (phase + k / 40) % 1 : ((t * sp + k / 40) % 1); const x = ((k * 7919) % 97) / 97 * W + Math.sin(prog * 6 + k) * u * 3; const y = prog * (H + u * 10) - u * 5; ctx.save(); ctx.translate(x, y); ctx.rotate(prog * 8 + k); ctx.fillStyle = [p.accent, p.soft, "#ffffff", p.ink][k % 4]; ctx.globalAlpha = 0.85; ctx.fillRect(-u * 0.8, -u * 0.4, u * 1.6, u * 0.8); ctx.restore(); } }
  }
  ctx.restore();
}

export function isLight(hex: string) { const n = parseInt(hex.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return (r * 299 + g * 587 + b * 114) / 1000 > 150; }
function hexA(hex: string, a: number) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }

export const defaultContent = (tpl: Template, brand: string): Content => ({
  headline: tpl.copy.headline, sub: tpl.copy.sub, cta: tpl.copy.cta, price: tpl.occasion === "Tip" ? "" : "₹799", brand,
  image: null, imageW: 0, imageH: 0, palette: tpl.palette, serif: tpl.serif,
});
