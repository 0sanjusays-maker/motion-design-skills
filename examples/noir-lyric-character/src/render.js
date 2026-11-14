// render.js — draws the whole film, frame by frame, and writes a PNG sequence.
// Deterministic: frame f depends only on f, so any range can be re-rendered.
//
//   node render.js --out ../frames --from 0 --to 1349
//   node render.js --still 8.2 --out ../stills
//
// No external renderer, no browser, no GPU: @napi-rs/canvas + ffmpeg only.

import { createCanvas } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';
import {
  drawCharacter, drawShadow, makeBuffers, defaultPose, W, H, clamp, lerp, seg,
  E, tw, apply, buildRig, lin, radial, glow,
} from './character.js';
import {
  drawBackdrop, drawForeground, drawVignette, drawPuddles, drawRain,
  lampPos, drawLamp, rnd,
} from './scene.js';
import { registerFonts, drawLyricCard, drawTitle } from './type.js';
import { POSES, CAMERA, LYRICS, TITLE, END_TITLE, FPS, DURATION } from './beats.js';

/* ------------------------------------------------------------------ setup */
registerFonts();

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
const buf = { mask: createCanvas(W, H), scratch: createCanvas(W, H) };
const world = createCanvas(W, H);
const wctx = world.getContext('2d');

/* --------------------------------------------------------- interpolation */
function poseAt(t) {
  const P = POSES;
  if (t <= P[0].t) return { ...defaultPose(), ...P[0] };
  if (t >= P[P.length - 1].t) return { ...defaultPose(), ...P[P.length - 1] };
  let i = 0;
  while (i < P.length - 2 && P[i + 1].t < t) i++;
  const a = P[i], b = P[i + 1];
  const u = seg(t, a.t, b.t);
  // slow in/out for poses, but keep walk phase continuous (linear) so feet
  // don't stutter mid-stride
  const e = E.inOutCubic(u);
  const out = { ...defaultPose() };
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (k === 't') continue;
    const va = a[k] === undefined ? 0 : a[k];
    const vb = b[k] === undefined ? 0 : b[k];
    if (typeof va === 'number' && typeof vb === 'number') {
      out[k] = k === 'walkPhase' ? lerp(va, vb, u) : lerp(va, vb, e);
    } else if (k === 'walkPhase') {
      out[k] = lerp(va, vb, u);
    } else {
      out[k] = u < 0.5 ? va : vb;
    }
  }
  // walkPhase must wrap with the longer walk segments, not pop
  out.walkPhase = lerp(a.walkPhase || 0, b.walkPhase || 0, u);
  return { ...defaultPose(), ...out };
}

// add automatic acting on top of the key poses: breathing, blinks, weight
function act(t, p) {
  const q = { ...p };
  // breathing: 4.4 s cycle, small
  q.breathe = Math.sin(t * 2 * Math.PI / 4.4) * 1.6;
  // blinks: irregular, every 2.6-4.4 s, 0.14 s closed
  const blinks = [2.9, 6.2, 9.1, 12.2, 18.2, 20.9, 23.4, 26.2, 30.4, 33.1, 36.9, 41.2, 43.8];
  let blink = 0;
  for (const b of blinks) {
    const d = Math.abs(t - b);
    if (d < 0.09) blink = Math.max(blink, 1 - d / 0.09);
  }
  q.blink = Math.max(q.blink || 0, blink);
  // idle weight shift while standing still
  if (q.walk < 0.15) {
    q.hipSway = Math.sin(t * 0.7) * 1.6;
    q.headRot = (q.headRot || 0) + Math.sin(t * 0.43) * 0.9;
    q.coatSwing = (q.coatSwing || 0) + Math.sin(t * 0.9) * 3;
  }
  // travel: coat lag follows movement direction
  q.coatSwing = (q.coatSwing || 0) + Math.sin(t * 2.6) * 2.5;
  return q;
}

function cameraAt(t) {
  const C = CAMERA;
  if (t <= C[0].t) return C[0];
  if (t >= C[C.length - 1].t) return C[C.length - 1];
  let i = 0;
  while (i < C.length - 2 && C[i + 1].t < t) i++;
  const a = C[i], b = C[i + 1];
  const e = E.inOutCubic(seg(t, a.t, b.t));
  return {
    scale: lerp(a.scale, b.scale, e),
    x: lerp(a.x, b.x, e),
    y: lerp(a.y, b.y, e) + 108,
    shake: lerp(a.shake || 0, b.shake || 0, e),
  };
}

/* --------------------------------------------------------------- lighting */
// The key light is the street lamp. It drifts a little with the camera so the
// rim on her silhouette always comes from the same side of the frame.
function lightFor(t, cam) {
  const lamp = lampPos(t);
  return { x: lamp.x, y: lamp.y + 40 };
}

/* ------------------------------------------------------------- one frame */
export function renderFrame(t) {
  const p = act(t, poseAt(t));
  const cam = cameraAt(t);

  // ---- world (camera space)
  wctx.setTransform(1, 0, 0, 1, 0, 0);
  wctx.clearRect(0, 0, W, H);
  const shakeX = Math.sin(t * 37.1) * cam.shake * 1.6;
  const shakeY = Math.cos(t * 41.7) * cam.shake * 1.2;
  wctx.save();
  wctx.translate(W / 2 + shakeX, H / 2 + shakeY);
  wctx.scale(cam.scale, cam.scale);
  wctx.translate(-cam.x, -cam.y);

  drawBackdrop(wctx, t, { horizon: 1276, lampIntensity: lampDeath(t) });

  // contact shadow, then the character
  drawShadow(wctx, p, 1, 0.55);
  drawCharacter(wctx, p, t, buf, {
    light: lightFor(t, cam),
    rim: 1,
    rimOffset: 9,
    rimGlow: 1,
    eyeGlint: 1,
  });


  drawEvents(wctx, t, cam);
  drawForeground(wctx, t, { y: 1440 });
  wctx.restore();

  // ---- composite
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(world, 0, 0);

  // bloom on the lamp
  bloom(ctx, t);

  drawVignette(ctx, 1 + seg(t, 43.6, 45.4) * 0.6);
  grain(ctx, t);

  // ---- type, always in screen space (never scaled by the camera)
  drawTitleCard(ctx, t);
  drawLyrics(ctx, t);
  drawEndTitle(ctx, t);

  // fade in/out
  const fade = Math.max(1 - seg(t, 0, 1.2), seg(t, DURATION - 1.0, DURATION));
  if (fade > 0) {
    ctx.fillStyle = `rgba(2,3,7,${fade})`;
    ctx.fillRect(0, 0, W, H);
  }
  return canvas;
}

function drawCrowd(ctx, t, cam) {
  const people = [
    { x: 120, y: 1298, s: 0.30, ph: 0.2, sp: 0.10 },
    { x: 290, y: 1306, s: 0.26, ph: 2.2, sp: 0.12 },
    { x: 900, y: 1292, s: 0.29, ph: 4.4, sp: 0.09 },
    { x: 1010, y: 1308, s: 0.24, ph: 1.1, sp: 0.11 },
  ];
  ctx.save();
  for (const q of people) {
    const drift = ((t * q.sp * 60) % 1400) - 300;
    const x = q.x + Math.sin(t * 0.3 + q.ph) * 26 + drift * 0.35;
    const p = {
      ...defaultPose(),
      x, groundY: q.y, scale: q.s,
      walk: 0.7, walkPhase: (t * 0.9 + q.ph) % 1,
      lean: 2, eye: 0, coatSwing: Math.sin(t * 1.6 + q.ph) * 8,
      armL: [10, 12], armR: [10, 12],
    };
    drawCharacter(ctx, p, t, buf, { ghost: true, ghostColor: 'rgba(2,4,8,0.92)' });
  }
  ctx.restore();
}

/* Two light events keep a 48 s frame from going static:
   1. 20.5 s — the shop sign on the left stutters on, and now there are two
      sources in her night: warm behind, cold in front.
   2. 31.0 s — a car passes behind the camera; its headlights sweep the wet
      road and drag a gleam across her coat. */
export function drawEvents(ctx, t, cam) {
  // --- shop sign powering on
  const k = t - 20.4;
  if (k > 0) {
    let p;
    if (k > 1.05) p = 1;
    else p = (Math.sin(k * 27) > 0 ? 1 : 0.18) * Math.min(1, k / 1.05);
    const fl = 0.86 + 0.14 * Math.sin(t * 7.3);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // the sign itself
    glow(ctx, 150, 620, 330, 260, 'rgba(96,196,255,0.30)', p * fl);
    ctx.globalAlpha = 0.9 * p * fl;
    ctx.fillStyle = 'rgba(168,232,255,0.9)';
    ctx.fillRect(78, 636, 150, 7);
    ctx.globalAlpha = 1;
    glow(ctx, 120, 596, 90, 46, 'rgba(150,226,255,0.35)', p * fl);
    // cold spill that reaches her
    const sp = ctx.createRadialGradient(190, 720, 40, 190, 900, 980);
    sp.addColorStop(0, `rgba(120,190,255,${0.16 * p * fl})`);
    sp.addColorStop(0.55, `rgba(70,120,200,${0.07 * p * fl})`);
    sp.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sp;
    ctx.fillRect(0, 400, W, 1300);
    // wet-road reflection under it
    const rf = ctx.createLinearGradient(0, 1276, 0, 1620);
    rf.addColorStop(0, `rgba(120,200,255,${0.13 * p * fl})`);
    rf.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rf;
    ctx.fillRect(60, 1276, 260, 344);
    ctx.restore();
  }

  // --- a car passing behind the camera, headlights raking the frame
  const ct = t - 30.9;
  if (ct > 0 && ct < 2.4) {
    const u = ct / 2.4;
    const x = -420 + u * 2000;
    const fade = Math.sin(Math.PI * Math.min(1, Math.max(0, u * 1.15)));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, 1268, 480, 210, 'rgba(255,222,180,0.24)', fade);
    glow(ctx, x - 90, 1272, 210, 110, 'rgba(255,244,220,0.22)', fade);
    // beam on the asphalt: a soft horizontal sweep, no hard edges
    const band = ctx.createLinearGradient(0, 1266, 0, 1760);
    band.addColorStop(0, `rgba(255,226,186,${0.16 * fade})`);
    band.addColorStop(0.45, `rgba(255,210,170,${0.05 * fade})`);
    band.addColorStop(1, 'rgba(255,190,150,0)');
    ctx.save();
    ctx.translate(x, 0);
    ctx.scale(1, 0.28);
    ctx.fillStyle = band;
    ctx.beginPath();
    ctx.arc(60, 5300, 620, 0, 7);
    ctx.fill();
    ctx.restore();
    // a quick gleam across her, so the pass reads as light and not a sticker
    const gx = x + 40;
    const gleam = ctx.createLinearGradient(gx - 220, 0, gx + 220, 0);
    gleam.addColorStop(0, 'rgba(255,220,180,0)');
    gleam.addColorStop(0.5, `rgba(255,226,190,${0.10 * fade})`);
    gleam.addColorStop(1, 'rgba(255,220,180,0)');
    ctx.fillStyle = gleam;
    ctx.fillRect(gx - 220, 700, 440, 900);
    ctx.restore();
  }
}

function bloom(ctx, t) {
  const lamp = lampPos(t);
  const cam = cameraAt(t);
  const sx = (lamp.x - cam.x) * cam.scale + W / 2;
  const sy = (lamp.y - cam.y) * cam.scale + H / 2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, sx, sy + 8, 460, 460, 'rgba(255,170,96,0.16)', 1);
  glow(ctx, sx, sy + 8, 170, 170, 'rgba(255,214,164,0.22)', 1);
  ctx.restore();
}

/* grain: cheap, deterministic, additive-subtractive noise from a cached tile */
const grainTile = createCanvas(256, 256);
{
  const g = grainTile.getContext('2d');
  const img = g.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) {
    const v = 128 + (Math.random() - 0.5) * 120;
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}
function grain(ctx, t) {
  const k = Math.floor(t * 12);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.055;
  for (let y = -((k * 37) % 256); y < H; y += 256) {
    for (let x = -((k * 53) % 256); x < W; x += 256) ctx.drawImage(grainTile, x, y);
  }
  ctx.restore();
}

// the street lamp gives up in the last seconds: two stutters, then out
function lampDeath(t) {
  if (t < 43.6) return 1;
  if (t < 43.9) return 0.35;
  if (t < 44.05) return 0.9;
  if (t < 44.3) return 0.15;
  return Math.max(0, 1 - (t - 44.3) / 0.7) * 0.06;
}

function drawTitleCard(ctx, t) {
  const lt = t - TITLE.t;
  if (lt < 0 || lt > TITLE.dur + 0.6) return;
  const out = 1 - seg(lt, TITLE.dur, TITLE.dur + 0.6);
  ctx.save();
  ctx.globalAlpha = out;
  drawTitle(ctx, TITLE.text, lt, { size: TITLE.size, y: TITLE.y });
  ctx.restore();
}

function drawEndTitle(ctx, t) {
  const lt = t - END_TITLE.t;
  if (lt < 0) return;
  drawTitle(ctx, END_TITLE.text, Math.min(lt, 6), { size: END_TITLE.size, y: END_TITLE.y });
}

function drawLyrics(ctx, t) {
  for (const card of LYRICS) {
    const lt = t - card.t;
    if (lt < 0 || lt > card.dur) continue;
    drawLyricCard(ctx, card, lt, card.dur, {
      colorTop: card.cool ? '#eaf3ff' : undefined,
      colorMid: card.cool ? '#cfe0ff' : undefined,
      colorBot: card.cool ? '#9fbcff' : undefined,
    });
  }
}

/* -------------------------------------------------------------------- CLI */
if (process.argv[1] && process.argv[1].endsWith('render.js')) {
  const args = process.argv.slice(2);
  const get = (k, d) => {
    const i = args.indexOf(`--${k}`);
    return i >= 0 ? args[i + 1] : d;
  };
  const outDir = path.resolve(get('out', '../frames'));
  fs.mkdirSync(outDir, { recursive: true });

  if (get('still', null)) {
    const times = String(get('still')).split(',').map(Number);
    for (const t of times) {
      const c = renderFrame(t);
      const f = path.join(outDir, `still-${t.toFixed(2)}.png`);
      fs.writeFileSync(f, c.toBuffer('image/png'));
      console.log('still', f);
    }
    process.exit(0);
  }

  if (get('video', null)) {
    const { spawn } = await import('node:child_process');
    const ffmpeg = (await import('@ffmpeg-installer/ffmpeg')).default.path;
    const outFile = path.resolve(get('video'));
    const from = Number(get('from', 0));
    const to = Number(get('to', Math.round(DURATION * FPS)));
    const args = [
      '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
      '-i', path.resolve(get('audio', '../assets/ambience.wav')),
      '-c:v', 'libx264', '-preset', get('preset', 'medium'), '-crf', get('crf', '19'), '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '160k', '-shortest',
      '-movflags', '+faststart', outFile,
    ];
    const ff = spawn(ffmpeg, args, { stdio: ['pipe', 'ignore', 'pipe'] });
    ff.stderr.on('data', (d) => { const s = String(d); if (/error|Error/.test(s)) process.stderr.write(s); });
    const t0 = Date.now();
    for (let f = from; f < to; f++) {
      const t = f / FPS;
      const c = renderFrame(t);
      const data = c.getContext('2d').getImageData(0, 0, W, H).data;
      if (!ff.stdin.write(Buffer.from(data.buffer))) {
        await new Promise((res) => ff.stdin.once('drain', res));
      }
      if ((f - from) % 60 === 0) {
        const el = (Date.now() - t0) / 1000;
        const per = el / (f - from + 1);
        console.log(`${f}/${to}  ${per.toFixed(2)}s/frame  eta ${((to - f) * per / 60).toFixed(1)} min`);
      }
    }
    ff.stdin.end();
    await new Promise((res) => ff.on('close', res));
    console.log('wrote', outFile);
    process.exit(0);
  }

  const from = Number(get('from', 0));
  const to = Number(get('to', Math.round(DURATION * FPS)));
  const t0 = Date.now();
  for (let f = from; f < to; f++) {
    const t = f / FPS;
    const c = renderFrame(t);
    fs.writeFileSync(path.join(outDir, `f${String(f).padStart(5, '0')}.png`), c.toBuffer('image/png'));
    if ((f - from) % 30 === 0) {
      const el = (Date.now() - t0) / 1000;
      const done = f - from + 1;
      const per = el / done;
      console.log(`${f}/${to}  ${per.toFixed(2)}s/frame  eta ${((to - f) * per / 60).toFixed(1)} min`);
    }
  }
}
