/**
 * Small animated-GIF encoder (GIF89a, looping) — no library needed.
 * Colours are reduced to a fixed 6×7×6 palette (252 colours) with light ordered dithering, which keeps
 * encoding fast in the browser and looks clean for flat designs and product photos at 480 px.
 */
const LEVELS_R = 6, LEVELS_G = 7, LEVELS_B = 6;
const PALETTE: number[] = [];
for (let r = 0; r < LEVELS_R; r++) for (let g = 0; g < LEVELS_G; g++) for (let b = 0; b < LEVELS_B; b++)
  PALETTE.push(Math.round((r * 255) / (LEVELS_R - 1)), Math.round((g * 255) / (LEVELS_G - 1)), Math.round((b * 255) / (LEVELS_B - 1)));
while (PALETTE.length < 256 * 3) PALETTE.push(0);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v / 16 - 0.5));

function indexFrame(rgba: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, d = BAYER[(y & 3) * 4 + (x & 3)];
    const q = (v: number, n: number) => Math.max(0, Math.min(n - 1, Math.round((v / 255) * (n - 1) + d * 0.6)));
    out[y * w + x] = (q(rgba[i], LEVELS_R) * LEVELS_G + q(rgba[i + 1], LEVELS_G)) * LEVELS_B + q(rgba[i + 2], LEVELS_B);
  }
  return out;
}

/** LZW-compresses one frame's colour indexes (8-bit code size), using a flat numeric table for speed. */
const TABLE = new Int32Array(4096 * 256);
function lzw(px: Uint8Array): number[] {
  const minCode = 8, clear = 1 << minCode, eoi = clear + 1;
  const out: number[] = []; let cur = 0, bits = 0, size = minCode + 1, next = eoi + 1;
  TABLE.fill(-1);
  const write = (code: number) => {
    cur |= code << bits; bits += size; while (bits >= 8) { out.push(cur & 255); cur >>>= 8; bits -= 8; }
    // Same order as the classic encoder: widen codes once the next free code no longer fits.
    if (next > (1 << size) - 1 && size < 12) size++;
  };
  write(clear);
  let prefix = px[0];
  for (let i = 1; i < px.length; i++) {
    const k = px[i], slot = prefix * 256 + k, found = TABLE[slot];
    if (found >= 0) { prefix = found; continue; }
    write(prefix);
    if (next < 4096) TABLE[slot] = next++;
    else { write(clear); TABLE.fill(-1); size = minCode + 1; next = eoi + 1; }
    prefix = k;
  }
  write(prefix); write(eoi);
  if (bits > 0) out.push(cur & 255);
  return out;
}

export function encodeGif(frames: ImageData[], delayMs: number): Blob {
  const w = frames[0].width, h = frames[0].height;
  const b: number[] = [];
  const s = (str: string) => { for (const ch of str) b.push(ch.charCodeAt(0)); };
  const u16 = (n: number) => b.push(n & 255, (n >> 8) & 255);
  s("GIF89a"); u16(w); u16(h); b.push(0xf7, 0, 0); b.push(...PALETTE);
  b.push(0x21, 0xff, 0x0b); s("NETSCAPE2.0"); b.push(0x03, 0x01, 0, 0, 0); // loop forever
  const delay = Math.round(delayMs / 10);
  for (const f of frames) {
    b.push(0x21, 0xf9, 0x04, 0x04); u16(delay); b.push(0, 0);
    b.push(0x2c); u16(0); u16(0); u16(w); u16(h); b.push(0);
    b.push(8);
    const data = lzw(indexFrame(f.data, w, h));
    for (let i = 0; i < data.length; i += 255) { const chunk = data.slice(i, i + 255); b.push(chunk.length, ...chunk); }
    b.push(0);
  }
  b.push(0x3b);
  return new Blob([new Uint8Array(b)], { type: "image/gif" });
}
