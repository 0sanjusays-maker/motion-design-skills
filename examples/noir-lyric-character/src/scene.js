// scene.js — the world around the walker: rainy night street, sodium lamp,
// neon bleed, wet asphalt, fog and rain. All deterministic per frame (no
// random state carried across frames) so any frame can be rendered alone and
// re-rendered identically.

import { lin, radial, glow, clamp, lerp, E, tw, seg, apply, W, H } from './character.js';

export const SKY_TOP = '#05070f';
export const SKY_MID = '#0a1220';
export const SKY_LOW = '#131d2c';

/* deterministic pseudo-random */
export function rnd(i, s = 0) {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/* ---------------------------------------------------------------- sky/fog */
export function drawSky(ctx, t, p = {}) {
  const g = ctx.createLinearGradient(0, -200, 0, H);
  g.addColorStop(0, SKY_TOP);
  g.addColorStop(0.42, SKY_MID);
  g.addColorStop(0.72, SKY_LOW);
  g.addColorStop(1, '#070b13');
  ctx.fillStyle = g;
  ctx.fillRect(-200, -200, W + 400, H + 400);

  // city light dome: warm sodium on the right, cool neon on the left
  glow(ctx, W * 0.82 + (p.lampX || 0), 500, 900, 760, 'rgba(255,146,74,0.16)');
  glow(ctx, W * 0.06, 760, 620, 560, 'rgba(64,132,220,0.13)');
  glow(ctx, W * 0.5, 1180, 900, 420, 'rgba(255,132,70,0.07)');
}

/* ------------------------------------------------------------- buildings */
function buildingRow(ctx, t, o) {
  const { yBase, hMin, hMax, wMin, wMax, seed, fill, parallax, windows, alpha = 1, paneColors } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  let x = -o.pad;
  let i = 0;
  while (x < W + o.pad) {
    const w = lerp(wMin, wMax, rnd(i, seed));
    const h = lerp(hMin, hMax, rnd(i + 40, seed));
    const top = yBase - h;
    ctx.fillStyle = fill;
    ctx.fillRect(x, top, w + 1, h);
    // a wet roof lip catching the sky
    ctx.fillStyle = 'rgba(150,180,220,0.05)';
    ctx.fillRect(x, top, w, 2);

    if (windows) {
      const cols = Math.max(1, Math.floor(w / 46));
      const rows = Math.max(1, Math.floor(h / 64));
      for (let cx = 0; cx < cols; cx++) {
        for (let cy = 0; cy < rows; cy++) {
          const k = i * 917 + cx * 31 + cy * 7;
          if (rnd(k, seed + 5) > 0.62) continue;
          const wx = x + 14 + cx * (w / cols);
          const wy = top + 26 + cy * (h / rows);
          if (wy > yBase - 20) continue;
          const c = paneColors[(k % paneColors.length)];
          ctx.fillStyle = c;
          const flick = 0.75 + 0.25 * Math.sin(t * 1.4 + k * 2.1);
          ctx.globalAlpha = alpha * flick;
          ctx.fillRect(wx, wy, 12, 18);
          ctx.globalAlpha = alpha;
        }
      }
    }
    x += w + lerp(6, 26, rnd(i + 90, seed));
    i++;
  }
  ctx.restore();
}

export function drawCity(ctx, t, depth = 0) {
  // far skyline, barely there
  buildingRow(ctx, t, {
    yBase: 1215, hMin: 240, hMax: 620, wMin: 70, wMax: 150, seed: 3, pad: 120,
    fill: '#080d16', parallax: 0.25, windows: false, alpha: 1,
  });
  // mid: shopfronts with lit windows
  buildingRow(ctx, t, {
    yBase: 1272, hMin: 260, hMax: 520, wMin: 90, wMax: 190, seed: 11, pad: 140,
    fill: '#0a1018', parallax: 0.5, windows: true, alpha: 1,
    paneColors: ['rgba(255,186,110,0.55)', 'rgba(255,206,150,0.42)', 'rgba(120,180,255,0.30)'],
  });
  // near: dark masses framing the street
  buildingRow(ctx, t, {
    yBase: 1300, hMin: 330, hMax: 700, wMin: 140, wMax: 260, seed: 23, pad: 200,
    fill: '#04070c', parallax: 0.85, windows: true, alpha: 1,
    paneColors: ['rgba(255,170,96,0.20)'],
  });
}

/** sagging cables + a couple of hanging lamps */
export function drawWires(ctx, t) {
  ctx.save();
  ctx.strokeStyle = 'rgba(4,7,12,0.9)';
  for (let i = 0; i < 4; i++) {
    const y = 300 + i * 78 + Math.sin(i * 2.3) * 20;
    ctx.lineWidth = 2.2 - i * 0.2;
    ctx.beginPath();
    for (let x = -40; x < W + 40; x += 12) {
      const yy = y + Math.sin((x / W) * Math.PI * 1.2 + i) * (26 + i * 8);
      if (x === -40) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ lamp */
export function lampPos(t) {
  return { x: W * 0.78, y: 318 };
}

export function drawLamp(ctx, t, opts = {}) {
  const { x, y } = lampPos(t);
  const a0 = opts.intensity === undefined ? 1 : opts.intensity;
  const flick = (0.92 + 0.08 * Math.sin(t * 11.3) * Math.sin(t * 3.1) + (Math.sin(t * 0.7) > 0.985 ? -0.2 : 0));
  const a = a0 * flick;

  // support arm from off-screen
  ctx.save();
  ctx.strokeStyle = '#04070b';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(x + 150, 150);
  ctx.quadraticCurveTo(x + 70, 190, x, y - 26);
  ctx.stroke();
  // shade
  ctx.fillStyle = '#070b12';
  ctx.beginPath();
  ctx.ellipse(x, y - 22, 62, 24, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 62, y - 26, 124, 10);

  // bulb + halo + cone
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, x, y + 4, 300 * a, 300 * a, `rgba(255,178,96,${0.30 * a * flick})`);
  glow(ctx, x, y + 6, 130 * a, 130 * a, `rgba(255,214,158,${0.42 * a * flick})`);
  // light cone
  const cone = ctx.createLinearGradient(x, y, x, 1300);
  cone.addColorStop(0, `rgba(255,196,132,${0.20 * a * flick})`);
  cone.addColorStop(0.5, `rgba(255,170,110,${0.055 * a * flick})`);
  cone.addColorStop(1, 'rgba(255,160,100,0)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(x - 18, y);
  ctx.lineTo(x + 20, y);
  ctx.lineTo(x + 300, 1310);
  ctx.lineTo(x - 300, 1310);
  ctx.closePath();
  ctx.fill();
  // filament
  ctx.fillStyle = `rgba(255,244,220,${0.95 * flick * clamp(a)})`;
  ctx.beginPath(); ctx.ellipse(x, y + 2, 8, 11, 0, 0, 7); ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------- neon signs, keep abstract */
export function drawNeon(ctx, t, palette = 'warm') {
  const signs = [
    { x: 96, y: 560, w: 200, h: 10, c: 'rgba(92,196,255,0.75)', s: 0.7 },
    { x: 60, y: 600, w: 120, h: 7, c: 'rgba(255,110,150,0.55)', s: 1.3 },
    { x: 900, y: 470, w: 130, h: 8, c: 'rgba(255,170,90,0.65)', s: 0.9 },
    { x: 840, y: 690, w: 90, h: 6, c: 'rgba(140,255,220,0.35)', s: 1.7 },
  ];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [i, s] of signs.entries()) {
    const pulse = 0.72 + 0.28 * Math.sin(t * s.s + i * 1.7);
    glow(ctx, s.x + s.w / 2, s.y, s.w * 1.5, s.w * 1.1, s.c, 0.55 * pulse);
    ctx.globalAlpha = 0.85 * pulse;
    ctx.fillStyle = s.c;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/* --------------------------------------------------------------- ground */
export function drawGround(ctx, t, o = {}) {
  const horizon = o.horizon || 1276;
  // asphalt
  const g = ctx.createLinearGradient(0, horizon, 0, H);
  g.addColorStop(0, '#0b111a');
  g.addColorStop(0.35, '#080d15');
  g.addColorStop(1, '#04070c');
  ctx.fillStyle = g;
  ctx.fillRect(-200, horizon, W + 400, H - horizon + 200);

  // wet sheen band where the lamp hits the road
  const lx = lampPos(t).x;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, lx - 40, horizon + 26, 330, 90, 'rgba(255,180,110,0.20)', 1);
  glow(ctx, 320, horizon + 14, 260, 60, 'rgba(90,150,230,0.10)', 1);
  ctx.restore();

  // long reflections: vertical smears of the signs and lamp
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const smears = [
    { x: lx, w: 90, c: 'rgba(255,176,104,0.30)', len: 420 },
    { x: 200, w: 46, c: 'rgba(92,196,255,0.16)', len: 300 },
    { x: 960, w: 40, c: 'rgba(255,170,90,0.14)', len: 260 },
    { x: 120, w: 34, c: 'rgba(255,110,150,0.10)', len: 220 },
  ];
  for (const s of smears) {
    const wob = Math.sin(t * 1.3 + s.x) * 6;
    const grad = ctx.createLinearGradient(0, horizon, 0, horizon + s.len);
    grad.addColorStop(0, s.c);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    for (let i = 0; i < 7; i++) {
      const yy = horizon + i * (s.len / 7);
      const ww = s.w * (1 + i * 0.18);
      ctx.globalAlpha = 0.55 - i * 0.06;
      ctx.fillRect(s.x - ww / 2 + wob * (i / 7), yy, ww, s.len / 7 - 1);
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // kerb + drain line
  ctx.strokeStyle = 'rgba(120,150,190,0.06)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-100, horizon + 1);
  ctx.lineTo(W + 100, horizon + 1);
  ctx.stroke();
}

/* puddles: darker ellipses with a rim of reflected light */
export function drawPuddles(ctx, t, o = {}) {
  const horizon = o.horizon || 1276;
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const x = 120 + i * 220 + Math.sin(i * 3.1) * 40;
    const y = horizon + 90 + i * 62;
    const rx = 130 + (i % 3) * 60;
    const ry = rx * 0.18;
    ctx.fillStyle = 'rgba(5,8,14,0.55)';
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, y - ry, 0, y + ry);
    g.addColorStop(0, 'rgba(255,190,130,0.14)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, rx * 0.86, ry * 0.72, 0, 0, 7); ctx.fill();
    // rain rings
    for (let k = 0; k < 3; k++) {
      const phase = ((t * 0.9 + i * 0.31 + k * 0.33) % 1);
      ctx.strokeStyle = `rgba(200,220,255,${0.10 * (1 - phase)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(x + (rnd(i * 7 + k, 9) - 0.5) * rx, y + (rnd(i + k, 3) - 0.5) * ry, rx * phase * 0.8, ry * phase * 0.8, 0, 0, 7);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ rain */
export function drawRain(ctx, t, o = {}) {
  const layers = [
    { n: 150, speed: 1500, len: 54, a: 0.13, w: 1.2, slant: 46 },
    { n: 90, speed: 2100, len: 88, a: 0.19, w: 1.7, slant: 60 },
    { n: 40, speed: 2800, len: 130, a: 0.10, w: 2.6, slant: 74 },
  ];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [li, L] of layers.entries()) {
    ctx.strokeStyle = `rgba(196,216,245,${L.a * (o.alpha === undefined ? 1 : o.alpha)})`;
    ctx.lineWidth = L.w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < L.n; i++) {
      const seed = i * 13.7 + li * 91;
      const x0 = rnd(seed, 1) * (W + 260) - 130;
      const yBase = rnd(seed, 2) * (H + 300);
      const y = ((yBase + t * L.speed) % (H + 300)) - 150;
      const x = x0 + ((t * L.speed * L.slant) / 1000) % (W + 260);
      const xx = ((x + 130) % (W + 260)) - 130;
      const len = L.len * (0.7 + 0.6 * rnd(seed, 4));
      ctx.moveTo(xx, y);
      ctx.lineTo(xx - L.slant * 0.16, y + len);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/* splashes on the road, only near the ground line */
export function drawSplashes(ctx, t, o = {}) {
  const yBase = o.y || 1450;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const seed = i * 5.31;
    const x = rnd(seed, 21) * W;
    const phase = (t * 1.6 + rnd(seed, 7)) % 1;
    const a = (1 - phase) * 0.22;
    const y = yBase + rnd(seed, 8) * 300;
    ctx.strokeStyle = `rgba(210,228,255,${a})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(x, y, 3 + phase * 16, (3 + phase * 16) * 0.3, 0, 0, 7);
    ctx.stroke();
  }
  ctx.restore();
}

/* fog banks drifting through, always in front of the far city */
export function drawFog(ctx, t, o = {}) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const x = ((t * (12 + i * 7)) % (W + 700)) - 350 + Math.sin(i) * 200;
    const y = 980 + i * 70;
    glow(ctx, x, y, 520, 200, `rgba(150,176,215,${0.045 + i * 0.012})`, 1);
  }
  ctx.restore();
}

/** everything behind the character */
export function drawBackdrop(ctx, t, o = {}) {
  drawSky(ctx, t);
  drawCity(ctx, t);
  drawNeon(ctx, t);
  drawWires(ctx, t);
  drawFog(ctx, t);
  if (o.rain !== 0) drawRain(ctx, t, { alpha: 0.55 });
  drawGround(ctx, t, o);
  drawPuddles(ctx, t, o);
  drawLamp(ctx, t, { intensity: o.lampIntensity });
}

/** atmospheric things in front of the character */
export function drawForeground(ctx, t, o = {}) {
  // foreground rain, heavier and brighter
  ctx.save();
  ctx.globalAlpha = 0.5;
  drawRain(ctx, t, { alpha: 1.6 });
  ctx.restore();
  drawSplashes(ctx, t, o);
}

/* ----------------------------------------------------------- grain + vig */
export function drawVignette(ctx, strength = 1) {
  const g = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.16, W / 2, H * 0.5, H * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.6, `rgba(0,0,0,${0.28 * strength})`);
  g.addColorStop(1, `rgba(0,0,0,${0.82 * strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function makeGrainTiles(n = 6, size = 256) {
  const tiles = [];
  for (let k = 0; k < n; k++) {
    tiles.push({ k, data: new Float32Array(size * size).map(() => Math.random()) });
  }
  return tiles;
}

export function drawGrain(ctx, tiles, t, amount = 0.05) {
  const tile = tiles[Math.floor(t * 24) % tiles.length];
  const size = 256;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = tile.data[i] * 255;
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  const c = ctx.canvas;
  return img;
}
