/**
 * Music for videos: built-in tracks synthesised in the browser (original, free to use), the person's own
 * uploaded music, and beat detection so cuts and pulses land on the beat.
 */
export interface Track { id: string; name: string; bpm: number; mood: string }
export const BUILT_IN: Track[] = [
  { id: "calm", name: "Calm Silk", bpm: 84, mood: "Soft, elegant" },
  { id: "pop", name: "Bright Pop", bpm: 118, mood: "Upbeat, modern" },
  { id: "lounge", name: "Golden Lounge", bpm: 100, mood: "Premium, smooth" },
  { id: "festive", name: "Festive Beat", bpm: 112, mood: "Celebration, dhol-style drums" },
];

const CHORDS: Record<string, number[][]> = {
  calm: [[261.6, 329.6, 392], [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7]],
  pop: [[293.7, 370, 440], [246.9, 293.7, 370], [329.6, 415.3, 493.9], [220, 277.2, 329.6]],
  lounge: [[220, 261.6, 329.6, 392], [174.6, 220, 261.6, 329.6], [196, 246.9, 293.7, 349.2], [164.8, 207.7, 246.9, 293.7]],
  festive: [[293.7, 349.2, 440], [261.6, 329.6, 392], [233.1, 293.7, 349.2], [261.6, 329.6, 392]],
};

/** Renders a built-in track of `seconds` length with an OfflineAudioContext. */
export async function synthTrack(id: string, seconds: number): Promise<AudioBuffer> {
  const tr = BUILT_IN.find((t) => t.id === id) ?? BUILT_IN[0];
  const sr = 44100, ctx = new OfflineAudioContext(2, Math.ceil(sr * seconds), sr);
  const beat = 60 / tr.bpm, master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
  const noise = ctx.createBuffer(1, sr, sr); const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const kick = (t: number, f0 = 120) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(g).connect(master); o.start(t); o.stop(t + 0.32); };
  const hit = (t: number, freq: number, dur: number, vol: number, type: BiquadFilterType = "highpass") => { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noise; f.type = type; f.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.02); };
  const tom = (t: number, f0: number, vol: number) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + 0.25); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35); o.connect(g).connect(master); o.start(t); o.stop(t + 0.4); };
  const pad = (t: number, freqs: number[], dur: number, vol: number) => freqs.forEach((f) => { const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); o.type = id === "pop" ? "sawtooth" : "triangle"; o.frequency.value = f; lp.type = "lowpass"; lp.frequency.value = id === "pop" ? 1800 : 1200; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.08); g.gain.setValueAtTime(vol, t + dur - 0.15); g.gain.linearRampToValueAtTime(0, t + dur); o.connect(lp).connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05); });
  const chords = CHORDS[tr.id];
  for (let b = 0, t = 0; t < seconds; b++, t = b * beat) {
    if (b % 4 === 0) pad(t, chords[(b / 4) % chords.length], beat * 4, tr.id === "calm" ? 0.07 : 0.05);
    if (tr.id === "calm") { if (b % 2 === 0) kick(t, 90); continue; }
    kick(t);
    if (b % 2 === 1) hit(t, 1500, 0.18, 0.35, "bandpass");
    hit(t + beat / 2, 7000, 0.05, 0.12);
    if (tr.id === "festive") { tom(t + beat * 0.5, 180, 0.5); tom(t + beat * 0.75, 140, 0.35); }
    if (tr.id === "lounge") hit(t + beat * 0.75, 6000, 0.04, 0.08);
  }
  return ctx.startRendering();
}

/** Beat times (s) from any decoded audio: onset envelope → tempo by autocorrelation → phase-aligned grid. */
export function detectBeats(buf: AudioBuffer, maxSeconds = 60): { bpm: number; beats: number[] } {
  const sr = buf.sampleRate, hop = 512, data = buf.getChannelData(0), n = Math.min(data.length, sr * maxSeconds);
  const env: number[] = []; let prev = 0;
  for (let i = 0; i + hop < n; i += hop) { let e = 0; for (let j = 0; j < hop; j++) e += data[i + j] * data[i + j]; e = Math.sqrt(e / hop); env.push(Math.max(0, e - prev)); prev = e; }
  const fps = sr / hop; let best = 0, bestLag = Math.round(fps * 0.5);
  for (let bpm = 70; bpm <= 180; bpm++) { const lag = Math.round((60 / bpm) * fps); let s = 0; for (let i = lag; i < env.length; i++) s += env[i] * env[i - lag]; if (s > best) { best = s; bestLag = lag; } }
  let off = 0, offBest = -1;
  for (let o = 0; o < bestLag; o++) { let s = 0; for (let i = o; i < env.length; i += bestLag) s += env[i]; if (s > offBest) { offBest = s; off = o; } }
  const period = bestLag / fps, beats: number[] = [];
  for (let t = off / fps; t < n / sr; t += period) beats.push(+t.toFixed(3));
  return { bpm: Math.round(60 / period), beats };
}

export const gridBeats = (bpm: number, seconds: number, offset = 0) => { const out: number[] = []; for (let t = offset; t < seconds; t += 60 / bpm) out.push(+t.toFixed(3)); return out; };
