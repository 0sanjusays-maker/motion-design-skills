// audio.js — generates the ambience track for the film with plain maths.
// Rain bed + low drone + a handful of soft plucked notes in D minor, with a
// swell that dies exactly when the street lamp does. No sample libraries, no
// licensing, and it re-renders to the same file every time (seeded noise).
//
//   node audio.js --out ../assets/ambience.wav --dur 48
//
// The result is meant to sit under a song: it is a bed, not a melody. Peaks
// around -14 dBFS so a vocal or a real track can be laid on top later.

import fs from 'node:fs';
import path from 'node:path';

const SR = 44100;
const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const DUR = Number(get('dur', 48));
const OUT = path.resolve(get('out', '../assets/ambience.wav'));

const N = Math.floor(SR * DUR);
const L = new Float32Array(N);
const R = new Float32Array(N);

/* deterministic noise */
let s = 12345;
const rnd = () => {
  s = (s * 1664525 + 1013904223) % 4294967296;
  return s / 2147483648 - 1;
};

/* one-pole filters */
const lp = (x, y, a) => y + a * (x - y);
const hp = (x, y, a) => a * (y + x - (x = x)); // unused placeholder

/* ---------------------------------------------------------------- rain */
// two noise bands: hiss (rain on the road) and a lower wash (heavy rain)
let h1 = 0, h2 = 0, w1 = 0, w2 = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const n = rnd();
  h1 = lp(n, h1, 0.55);
  const hiss = (n - h1) * 0.5;        // highpass-ish tail
  w1 = lp(n, w1, 0.02);
  w2 = lp(w1, w2, 0.05);
  const wash = (w1 - w2) * 2.2;
  const gust = 0.75 + 0.25 * Math.sin(t * 0.21) * Math.sin(t * 0.07 + 1.3);
  const rain = (hiss * 0.16 + wash * 0.30) * gust;
  L[i] += rain * (0.9 + 0.1 * Math.sin(t * 0.5));
  R[i] += rain * (0.9 - 0.1 * Math.sin(t * 0.5));
}

/* --------------------------------------------------------------- drone */
// D minor pad: D2, A2, F3, D3 — slow beating, lowpassed
const drone = [
  { f: 73.42, a: 0.055, d: 0.13 },
  { f: 110.0, a: 0.040, d: 0.21 },
  { f: 146.83, a: 0.028, d: 0.31 },
  { f: 174.61, a: 0.022, d: 0.37 },
];
let d1 = 0, d2 = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  let v = 0;
  for (const [k, o] of drone.entries()) {
    const det = 1 + 0.0015 * Math.sin(t * (0.11 + k * 0.03));
    v += o.a * Math.sin(2 * Math.PI * o.f * det * t + k);
    v += o.a * 0.35 * Math.sin(2 * Math.PI * o.f * 2 * det * t + k * 2);
  }
  d1 = lp(v, d1, 0.25);
  d2 = lp(d1, d2, 0.35);
  const swell = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 0.13 - 1.2));
  const fade = Math.min(1, t / 3) * (t > 43.4 ? Math.max(0, 1 - (t - 43.4) / 3.2) : 1);
  L[i] += d2 * swell * fade;
  R[i] += d2 * swell * fade * 0.96;
}

/* ----------------------------------------------------------------- notes */
// sparse plucks, D minor pentatonic, decay 2.2 s, panned
const scale = [293.66, 349.23, 392.0, 440.0, 523.25, 587.33];
const hits = [
  [3.1, 0, 0.30, -0.25], [6.8, 2, 0.22, 0.30], [10.2, 1, 0.20, -0.10],
  [13.9, 4, 0.26, 0.20], [17.4, 2, 0.18, -0.30], [20.9, 3, 0.22, 0.10],
  [24.6, 5, 0.24, -0.20], [27.9, 1, 0.20, 0.25], [31.2, 4, 0.22, -0.15],
  [34.9, 0, 0.24, 0.15], [38.4, 2, 0.18, -0.25], [41.6, 3, 0.20, 0.20],
];
for (const [t0, note, amp, pan] of hits) {
  const f = scale[note % scale.length];
  const start = Math.floor(t0 * SR);
  const len = Math.floor(3.4 * SR);
  const lGain = amp * Math.min(1, 0.5 - pan);
  const rGain = amp * Math.min(1, 0.5 + pan);
  for (let k = 0; k < len && start + k < N; k++) {
    const tt = k / SR;
    const env = Math.exp(-tt * 1.55) * Math.min(1, tt / 0.008);
    const v = Math.sin(2 * Math.PI * f * tt) * 0.6
      + Math.sin(2 * Math.PI * f * 2.002 * tt) * 0.22
      + Math.sin(2 * Math.PI * f * 3.01 * tt) * 0.08;
    L[start + k] += v * env * lGain;
    R[start + k] += v * env * rGain;
  }
}

/* --------------------------------------------------- low thunder swell */
// one soft rumble as the lamp dies, so the blackout has a body
{
  const t0 = 43.2;
  const start = Math.floor(t0 * SR);
  const len = Math.floor(3.6 * SR);
  let r1 = 0;
  for (let k = 0; k < len && start + k < N; k++) {
    const tt = k / SR;
    const n = rnd();
    r1 = lp(n, r1, 0.006);
    const env = Math.min(1, tt / 0.8) * Math.exp(-tt * 0.55);
    L[start + k] += r1 * env * 0.55;
    R[start + k] += r1 * env * 0.52;
  }
}

/* --------------------------------------------------------------- master */
// gentle soft-clip + normalise to about -3 dBFS peak
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const norm = peak > 0 ? 0.7 / peak : 1;
const fadeIn = Math.floor(0.8 * SR);
const fadeOut = Math.floor(2.2 * SR);
for (let i = 0; i < N; i++) {
  const f = Math.min(1, i / fadeIn) * Math.min(1, (N - i) / fadeOut);
  L[i] = Math.tanh(L[i] * norm * 1.1) * f;
  R[i] = Math.tanh(R[i] * norm * 1.1) * f;
}

/* ------------------------------------------------------------ write wav */
const bytes = 2;
const buf = Buffer.alloc(44 + N * 2 * bytes);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + N * 2 * bytes, 4);
buf.write('WAVE', 8);
buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 2 * bytes, 28);
buf.writeUInt16LE(2 * bytes, 32);
buf.writeUInt16LE(16, 34);
buf.write('data', 36);
buf.writeUInt32LE(N * 2 * bytes, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4);
  buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(R[i] * 32767))), 46 + i * 4);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, buf);
console.log('wrote', OUT, (buf.length / 1e6).toFixed(1), 'MB');
