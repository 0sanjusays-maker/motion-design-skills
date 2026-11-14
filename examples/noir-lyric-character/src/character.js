// character.js — a hand-built 2D character rig for the "Gumraahon ka Raasta"
// lyric film. Everything is parametric: joints are 2x3 affine matrices, every
// part is a path re-drawn per frame, so squash, offset and layered cloth come
// for free and there is no mesh library to install.
//
// Style: a backlit night figure. Body stays near-black, one warm rim light
// rims the silhouette, eyes carry the expression. That single lighting idea is
// what makes a code-drawn character read as painted, and it hides anatomy that
// would look cheap if it were lit from the front.
//
// Canonical space: feet at y = 0, up is negative, character faces the camera.
// Screen placement comes from pose.groundY / pose.x / pose.scale.

export const D2R = Math.PI / 180;
export const W = 1080;
export const H = 1920;

/* ------------------------------------------------------------------ math */

export function m() { return [1, 0, 0, 1, 0, 0]; }
export function mul(a, b) {
  return [
    a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}
export function T(x, y) { return [1, 0, 0, 1, x, y]; }
export function R(deg) {
  const r = deg * D2R, c = Math.cos(r), s = Math.sin(r);
  return [c, s, -s, c, 0, 0];
}
export function Sc(sx, sy) { return [sx, 0, 0, sy === undefined ? sx : sy, 0, 0]; }
export function X(...ms) { return ms.reduce((acc, n) => mul(acc, n), m()); }
export function apply(mat, pt) {
  return [mat[0] * pt[0] + mat[2] * pt[1] + mat[4], mat[1] * pt[0] + mat[3] * pt[1] + mat[5]];
}

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a || 1e-6));
export const smooth = (t) => t * t * (3 - 2 * t);

export const E = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inQuart: (t) => t * t * t * t,
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t, s = 1.7) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  outElastic: (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  hold: (t) => (t >= 1 ? 1 : 0),
};

export function tw(t, a, b, e = E.inOutCubic) { return e(seg(t, a, b)); }

/** damped spring ringing out after a step at t0 */
export function wobble(t, t0, amp, freq = 3.4, damp = 4.6) {
  if (t < t0) return 0;
  const x = t - t0;
  return amp * Math.exp(-x * damp) * Math.sin(x * freq * Math.PI);
}

/* --------------------------------------------------------------- drawing */

export function poly(ctx, mat, pts, close = true) {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = apply(mat, pts[i]);
    if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
  }
  if (close) ctx.closePath();
}

export function smoothPoly(ctx, mat, pts, close = true, tension = 0.5) {
  const P = pts.map((p) => apply(mat, p));
  const n = P.length;
  const get = (i) => (close ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))]);
  ctx.beginPath();
  ctx.moveTo(P[0][0], P[0][1]);
  for (let i = 0; i < (close ? n : n - 1); i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const k = tension / 3;
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k,
      p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k,
      p2[0], p2[1],
    );
  }
  if (close) ctx.closePath();
}

export function radial(ctx, x, y, r, inner, outer) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  return g;
}

export function lin(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

export function glow(ctx, x, y, rx, ry, color, a = 1) {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.fillStyle = radial(ctx, 0, 0, rx, color, 'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.arc(0, 0, rx, 0, 7); ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------ proportions */

export const M = {
  hipY: -292,
  chestY: -520,      // shoulder line
  neckY: -556,
  headCY: -704,      // head centre (absolute-ish: neckY + 148)
  headRX: 101,
  headRY: 117,
  upperArm: 150,
  foreArm: 140,
  thigh: 262,
  figureH: 828,
};

export function defaultPose() {
  return {
    groundY: 1600,
    x: 540,
    scale: 1,
    face: 1,          // 1 or -1, mirror for screen direction
    lean: 0,          // torso lean, degrees
    bob: 0,           // vertical offset
    land: 1,          // squash 1 = none
    headRot: 0, tilt: 0, headX: 0, headY: 0,
    eye: 0.86,        // lid openness
    blink: 0,         // 0..1 extra closure
    lookX: 0, lookY: 0,
    brow: 0,          // -1 worry, 0 neutral, 1 sad
    browY: 0,
    mouth: 'small',   // small | flat | open | down | smile | o
    mouthOpen: 0,
    armL: [4, 6],    // shoulder, elbow (near/left arm as seen)
    armR: [4, 6],
    handL: 0, handR: 0,
    coatSwing: 0,
    coatLift: 0,
    walk: 0,
    walkPhase: 0,
    wind: 1,
    breathe: 0,
    shoulderLift: 0,
    hipSway: 0,
  };
}

export function buildRig(p, t) {
  const w = p.walk;
  const ph = p.walkPhase * Math.PI * 2;
  const bounce = -Math.abs(Math.sin(ph)) * 7 * w;
  const sw = Math.sin(ph) * w;
  const sq = p.land;
  const br = p.breathe || 0;

  const root = X(T(p.x, p.groundY + p.bob), Sc(p.face * p.scale * (2 - sq) / 1, p.scale * sq));
  const hip = X(root, T(sw * 6, M.hipY + bounce), R(p.hipSway));
  const chest = X(hip, T(0, M.chestY - M.hipY), R(p.lean), Sc(1 + br * 0.0022, 1 + br * 0.004));
  const neck = X(chest, T(0, M.neckY - M.chestY), R(p.lean * 0.4));
  const head = X(neck, T(p.headX, M.headCY - M.neckY + p.headY), R(p.tilt + p.headRot));

  const shR = X(chest, T(-74, 62), R(p.armR[0] + p.shoulderLift * 0.3));
  const shRC = X(shR, T(0, M.upperArm), R(p.armR[1]));
  const shL = X(chest, T(74, 62), R(-p.armL[0] - p.shoulderLift * 0.3));
  const shLC = X(shL, T(0, M.upperArm), R(-p.armL[1]));
  const handR = X(shRC, T(0, M.foreArm), R(p.handR));
  const handL = X(shLC, T(0, M.foreArm), R(p.handL));

  const stride = sw * 12;
  const legR = X(hip, T(-52, 0), R(stride * 0.5));
  const legL = X(hip, T(52, 0), R(-stride * 0.5));

  return { root, hip, chest, neck, head, shL, shLC, shR, shRC, handL, handR, legL, legR, bounce, stride, ph, sw };
}

/* ------------------------------------------------------------- the parts */

const COAT = {
  shoulderY: -54,
  shoulderW: 108,
  waistY: 176,
  waistW: 98,
  hemY: 392,
  hemW: 116,
};

export const PAL = {
  night: '#05070e',
  coat: '#111a29',
  coatLit: '#22304a',
  coatDark: '#05080e',
  pants: '#0a1120',
  shoe: '#05080d',
  hood: '#0a101c',
  hoodLit: '#2a3a56',
  faceDark: '#0d0b12',
  skin: '#c98d66',
  scarf: '#8e2b36',
  rimTop: 'rgba(255,206,152,0.9)',
  rimBot: 'rgba(255,132,68,1)',
  rimCoolTop: 'rgba(186,214,255,1)',
  rimCoolBot: 'rgba(96,132,210,1)',
};

function coatPath(ctx, mat, p, t) {
  const c = COAT;
  const wave = (i, amp = 6) => Math.sin(t * 1.7 + i * 1.9) * amp * p.wind;
  const hem = c.hemY + p.coatLift;
  const sw = p.coatSwing;
  smoothPoly(ctx, mat, [
    [-c.shoulderW * 0.70, c.shoulderY - 14],
    [-c.shoulderW * 0.98, c.shoulderY + 40],
    [-c.shoulderW * 0.99, 90],
    [-c.waistW, c.waistY],
    [-c.hemW - 4 + sw * 0.4, hem - 44],
    [-c.hemW + sw * 0.6 + wave(1), hem + wave(1, 4)],
    [-c.hemW * 0.5 + sw * 0.9, hem + 10 + wave(2, 3)],
    [sw + wave(3, 2), hem + 14 + wave(3, 4)],
    [c.hemW * 0.5 + sw * 0.9, hem + 10 + wave(4, 3)],
    [c.hemW + sw * 0.6 + wave(5), hem + wave(5, 4)],
    [c.hemW + 4 + sw * 0.4, hem - 44],
    [c.waistW, c.waistY],
    [c.shoulderW * 0.99, 90],
    [c.shoulderW * 0.98, c.shoulderY + 40],
    [c.shoulderW * 0.70, c.shoulderY - 14],
    [c.shoulderW * 0.42, c.shoulderY - 36],
    [0, c.shoulderY - 52],
    [-c.shoulderW * 0.42, c.shoulderY - 36],
  ], true, 0.55);
}

function sleevePath(ctx, a, b, thickA, thickB, cuffOut = 6) {
  const p0 = apply(a, [0, 4]), p1 = apply(b, [0, -cuffOut]);
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  ctx.beginPath();
  ctx.moveTo(p0[0] + nx * thickA, p0[1] + ny * thickA);
  ctx.quadraticCurveTo((p0[0] + p1[0]) / 2 + nx * thickA * 0.92, (p0[1] + p1[1]) / 2 + ny * thickA * 0.92,
    p1[0] + nx * thickB, p1[1] + ny * thickB);
  ctx.lineTo(p1[0] - nx * thickB, p1[1] - ny * thickB);
  ctx.quadraticCurveTo((p0[0] + p1[0]) / 2 - nx * thickA * 0.92, (p0[1] + p1[1]) / 2 - ny * thickA * 0.92,
    p0[0] - nx * thickA, p0[1] - ny * thickA);
  ctx.closePath();
}

/* hood outline in head-local space (origin = head centre) */
const HOOD = [
  [-100, 40], [-116, -26], [-98, -104], [-48, -146], [12, -156], [68, -138], [106, -92],
  [118, -22], [108, 46], [92, 84], [48, 104], [0, 110], [-50, 104], [-90, 84],
];

const FACE_OPEN = [[0, -92], [50, -78], [64, -18], [60, 40], [42, 80], [0, 98], [-42, 80], [-60, 40], [-64, -18], [-50, -78]];

function drawHeadInk(ctx, rig, p, light, pal) {
  const hm = rig.head;

  // hood outer
  smoothPoly(ctx, hm, HOOD, true, 0.5);
  const ha = apply(hm, [-120, -60]), hb = apply(hm, [120, 180]);
  ctx.fillStyle = lin(ctx, ha[0], ha[1], hb[0], hb[1], [
    [0, pal.hoodLit], [0.28, pal.hood], [1, '#04060c'],
  ]);
  ctx.fill();

  // hood inner shadow band around the face opening
  smoothPoly(ctx, hm, FACE_OPEN, true, 0.55);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = lin(ctx, 0, apply(hm, [0, -90])[1], 0, apply(hm, [0, 100])[1],
    [[0, '#07060c'], [0.42, '#151019'], [1, '#2a1d22']]);
  ctx.fill();
  ctx.restore();

  // thin lit edge of the hood lining
  smoothPoly(ctx, hm, FACE_OPEN, true, 0.55);
  ctx.strokeStyle = 'rgba(122,140,178,0.20)'; ctx.lineWidth = 5; ctx.stroke();

  // face shading inside the opening
  ctx.save();
  smoothPoly(ctx, hm, FACE_OPEN, true, 0.55);
  ctx.clip();
  const c0 = apply(hm, [0, 100])[1];
  ctx.fillStyle = lin(ctx, 0, apply(hm, [0, 20])[1], 0, c0,
    [[0, 'rgba(0,0,0,0.55)'], [0.55, 'rgba(0,0,0,0)'], [1, 'rgba(120,64,40,0.42)']]);
  ctx.fill();
  // front fill: street light bouncing up into the hood, so the face reads
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const fcx = apply(hm, [0, 30]);
  ctx.fillStyle = radial(ctx, fcx[0], fcx[1], 132, 'rgba(255,178,126,0.30)', 'rgba(255,150,100,0)');
  ctx.beginPath(); ctx.arc(fcx[0], fcx[1], 132, 0, 7); ctx.fill();
  const ck = apply(hm, [light.x > p.x ? 24 : -24, 58]);
  ctx.fillStyle = radial(ctx, ck[0], ck[1], 60, 'rgba(255,150,96,0.30)', 'rgba(255,150,96,0)');
  ctx.beginPath(); ctx.arc(ck[0], ck[1], 60, 0, 7); ctx.fill();
  ctx.restore();
  ctx.restore();

  // eyes: two warm sparks. They are the whole performance.
  const open = clamp(p.eye * (1 - p.blink), 0, 1);
  const dark = '#07080d';
  for (const [ex, aa] of [[29, 1], [-29, 0.86]]) {
    const c = apply(hm, [ex, 8]);
    ctx.save();
    ctx.translate(c[0], c[1]);
    if (open < 0.18) {
      ctx.beginPath();
      ctx.moveTo(-14, 2); ctx.quadraticCurveTo(0, 9 * open * 2 + 2, 14, 2);
      ctx.strokeStyle = 'rgba(255,200,150,0.55)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
    } else {
      const eh = 10.5 * open;
      // eye socket shadow
      ctx.beginPath();
      ctx.ellipse(0, -2, 17, eh + 6, 0, 0, 7);
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
      // warm sclera
      ctx.beginPath();
      ctx.ellipse(0, 0, 12.4, eh, 0, 0, 7);
      const eg = ctx.createLinearGradient(0, -eh, 0, eh);
      eg.addColorStop(0, '#ffe6bf'); eg.addColorStop(1, '#e8a86f');
      ctx.fillStyle = eg; ctx.fill();
      // iris + pupil
      const ix = p.lookX * 6, iy = p.lookY * 4;
      ctx.beginPath(); ctx.arc(ix, iy + 1, 6.6, 0, 7);
      ctx.fillStyle = '#2a1a1c'; ctx.fill();
      ctx.beginPath(); ctx.arc(ix, iy + 1, 2.9, 0, 7);
      ctx.fillStyle = dark; ctx.fill();
      // catchlight
      ctx.beginPath();
      ctx.ellipse(ix + 3, iy - 2.5, 2.6, 2.2, 0, 0, 7);
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill();
      // upper lid
      ctx.beginPath();
      ctx.moveTo(-16, -1);
      ctx.quadraticCurveTo(0, -eh * 2 - 3, 16, -1);
      ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 5; ctx.stroke();
    }
    ctx.restore();
  }

  // brows float in the dark above the eyes
  if (Math.abs(p.brow) > 0.02 || p.browY !== 0) {
    for (const [ex, sign] of [[32, 1], [-32, -1]]) {
      const c = apply(hm, [ex, -26 + p.browY]);
      ctx.save(); ctx.translate(c[0], c[1]); ctx.rotate(sign * p.brow * 0.3);
      ctx.beginPath();
      ctx.moveTo(-13, 1); ctx.quadraticCurveTo(0, -4, 13, 0);
      ctx.strokeStyle = 'rgba(255,200,150,0.30)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
      ctx.restore();
    }
  }

  // nose hint: a single lit arc
  ctx.beginPath();
  const n0 = apply(hm, [0, 28]), n1 = apply(hm, [7, 44]), n2 = apply(hm, [-6, 48]);
  ctx.moveTo(n0[0], n0[1]);
  ctx.quadraticCurveTo(n1[0], n1[1], n2[0], n2[1]);
  ctx.strokeStyle = 'rgba(255,190,140,0.22)'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.stroke();

  // mouth: barely there, just enough to act
  const mo = apply(hm, [0, 70]);
  ctx.strokeStyle = 'rgba(255,170,120,0.30)'; ctx.lineWidth = 3.6; ctx.lineCap = 'round';
  ctx.beginPath();
  switch (p.mouth) {
    case 'open':
      ctx.ellipse(mo[0], mo[1] + 1, 7.5, 4 + 7 * p.mouthOpen, 0, 0, 7);
      ctx.fillStyle = 'rgba(46,16,22,0.92)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,160,120,0.35)'; ctx.lineWidth = 2.4; ctx.stroke(); break;
    case 'o':
      ctx.ellipse(mo[0], mo[1], 6, 7, 0, 0, 7);
      ctx.fillStyle = 'rgba(46,16,22,0.92)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,160,120,0.3)'; ctx.lineWidth = 2.2; ctx.stroke(); break;
    case 'flat':
      ctx.moveTo(mo[0] - 11, mo[1]); ctx.lineTo(mo[0] + 11, mo[1]); ctx.stroke(); break;
    case 'down':
      ctx.moveTo(mo[0] - 12, mo[1] + 2);
      ctx.quadraticCurveTo(mo[0], mo[1] - 4, mo[0] + 12, mo[1] + 2); ctx.stroke(); break;
    case 'smile':
      ctx.moveTo(mo[0] - 12, mo[1] - 2);
      ctx.quadraticCurveTo(mo[0], mo[1] + 6, mo[0] + 12, mo[1] - 2); ctx.stroke(); break;
    default:
      ctx.moveTo(mo[0] - 10, mo[1] - 1);
      ctx.quadraticCurveTo(mo[0] + 1, mo[1] + 3, mo[0] + 10, mo[1] - 2); ctx.stroke();
  }
}

export function drawParts(ctx, p, t, opts = {}) {
  const rig = buildRig(p, t);
  const pal = { ...PAL, ...(opts.palette || {}) };
  const ghost = !!opts.ghost;
  const flat = ghost ? (opts.ghostColor || '#03050a') : null;
  const solid = (c) => { ctx.fillStyle = ghost ? flat : c; ctx.fill(); };

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  /* far leg */
  const ankleR = apply(rig.legR, [0, M.thigh]);
  sleevePath(ctx, rig.legR, X(rig.legR, T(0, M.thigh)), 34, 26, 0);
  solid(pal.pants);
  ctx.save(); ctx.translate(ankleR[0], ankleR[1]); ctx.scale(1.32, 1);
  ctx.beginPath(); ctx.ellipse(5, 14, 26, 12, 0, 0, 7); solid(pal.shoe); ctx.restore();

  /* near leg */
  const ankleL = apply(rig.legL, [0, M.thigh]);
  sleevePath(ctx, rig.legL, X(rig.legL, T(0, M.thigh)), 36, 27, 0);
  solid(pal.pants);
  ctx.save(); ctx.translate(ankleL[0], ankleL[1]); ctx.scale(1.32, 1);
  ctx.beginPath(); ctx.ellipse(5, 14, 26, 12, 0, 0, 7); solid(pal.shoe); ctx.restore();

  /* coat */
  coatPath(ctx, rig.chest, p, t);
  if (ghost) solid(pal.coat);
  else {
    const a = apply(rig.chest, [-COAT.shoulderW, COAT.shoulderY]);
    const b = apply(rig.chest, [COAT.shoulderW, COAT.hemY]);
    ctx.fillStyle = lin(ctx, a[0], a[1], b[0], b[1], [
      [0, pal.coatLit], [0.22, pal.coat], [0.7, pal.coatDark], [1, '#02040a'],
    ]);
    ctx.fill();
    // centre vent + hem shadow
    ctx.save(); ctx.clip();
    ctx.fillStyle = lin(ctx, 0, apply(rig.chest, [0, COAT.hemY - 130])[1], 0, apply(rig.chest, [0, COAT.hemY + 10])[1],
      [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.55)']]);
    ctx.fillRect(apply(rig.chest, [-200, -100])[0], apply(rig.chest, [-200, -100])[1], 400, 700);
    ctx.restore();
  }

  /* arms, both in front of the coat */
  for (const [sh, shC, isNear] of [[rig.shR, rig.shRC, false], [rig.shL, rig.shLC, true]]) {
    const cA = apply(sh, [isNear ? -22 : 22, 0]);
    const cB = apply(shC, [0, 30]);
    sleevePath(ctx, sh, shC, isNear ? 21 : 19, isNear ? 17 : 15, 2);
    if (ghost) solid(pal.coat);
    else {
      ctx.fillStyle = lin(ctx, cA[0], cA[1], cB[0], cB[1],
        [[0, isNear ? '#1a2537' : '#141d2c'], [0.6, isNear ? pal.coat : '#0c1421'], [1, '#05080e']]);
      ctx.fill();
    }
    // cuff ring
    const cuff = apply(shC, [0, -10]);
    ctx.save();
    ctx.translate(cuff[0], cuff[1]);
    ctx.rotate((isNear ? -1 : 1) * ((isNear ? p.armL[0] + p.armL[1] : p.armR[0] + p.armR[1]) * D2R));
    ctx.beginPath(); ctx.ellipse(0, 0, isNear ? 21 : 19, 8, 0, 0, 7);
    solid(isNear ? pal.coatLit : '#16202f');
    ctx.restore();
    // hand
    const hp = apply(shC, [0, 10]);
    ctx.save();
    ctx.translate(hp[0], hp[1]);
    ctx.rotate((isNear ? p.handL : p.handR) * D2R * 0.6);
    const g = ghost ? flat : lin(ctx, 0, -20, 0, 24, [[0, '#b9835d'], [1, '#5e3b29']]);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 7, isNear ? 13.5 : 12.5, 18.5, 0.05, 0, 7); ctx.fill();
    // thumb
    ctx.beginPath();
    ctx.ellipse(isNear ? -13 : 13, 3, 6, 10, isNear ? -0.4 : 0.4, 0, 7); ctx.fill();
    ctx.restore();
  }

  /* scarf: the one warm accent on the body */
  if (!ghost) {
    const flap = Math.sin(t * 2.0) * 9 * p.wind;
    const flap2 = Math.sin(t * 2.0 + 1.2) * 7 * p.wind;
    ctx.save();
    // drape around the neck, falling into a V on the chest
    smoothPoly(ctx, rig.chest, [
      [-62, -96], [62, -96], [58, -72], [34, -46],
      [-6, 26], [-44, -44], [-58, -72],
    ], true, 0.45);
    ctx.fillStyle = pal.scarf; ctx.fill();
    // shadow where the hood sits on it
    ctx.fillStyle = lin(ctx, 0, apply(rig.chest, [0, -100])[1], 0, apply(rig.chest, [0, -64])[1],
      [[0, 'rgba(0,0,0,0.55)'], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(apply(rig.chest, [-90, -104])[0], apply(rig.chest, [-90, -104])[1], 180, 46);
    // loose end, blown to one side
    smoothPoly(ctx, rig.chest, [
      [-40, -70], [-12, -62], [-18, 6],
      [-40 + flap, 66 + flap2],
      [-66 + flap2 * 0.6, 56 + flap],
      [-48, -10],
    ], true, 0.5);
    ctx.fillStyle = '#7d2530'; ctx.fill();
    ctx.restore();
  }

  /* hood + face */
  if (ghost) {
    smoothPoly(ctx, rig.head, HOOD, true, 0.5); solid(pal.hood);
  } else {
    drawHeadInk(ctx, rig, p, opts.light || { x: W * 0.85, y: H * 0.1 }, pal);
  }

  ctx.restore();
  return rig;
}

/* ------------------------------------------------------------- rendering */

export function makeBuffers(createCanvas) {
  return { mask: createCanvas(W, H), scratch: createCanvas(W, H), tmp: createCanvas(W, H) };
}

/**
 * Backlit figure: ink pass + rim pass + eye glints.
 * opts = { light:{x,y}, rim:0..1, rimOffset, bodyTop/Mid/Bot, eyeGlint, ghost }
 */
export function drawCharacter(ctx, p, t, buf, opts = {}) {
  const light = opts.light || { x: W * 0.86, y: H * 0.08 };
  const ghost = !!opts.ghost;

  if (!ghost) {
    drawShadowlessBody(ctx, p, t, opts);
  } else {
    drawParts(ctx, p, t, opts);
    return null;
  }

  /* rim pass */
  if (opts.rim === 0) return null;
  const { mask, scratch } = buf;
  const mk = mask.getContext('2d');
  mk.setTransform(1, 0, 0, 1, 0, 0);
  mk.clearRect(0, 0, W, H);
  drawParts(mk, p, t, { ghost: true, ghostColor: '#ffffff' });

  const sc = scratch.getContext('2d');
  sc.setTransform(1, 0, 0, 1, 0, 0);
  sc.clearRect(0, 0, W, H);
  const rig = buildRig(p, t);
  const centre = apply(rig.chest, [0, 0]);
  const L = Math.hypot(light.x - centre[0], light.y - centre[1]) || 1;
  const off = opts.rimOffset || 13;
  const dx = ((light.x - centre[0]) / L) * off;
  const dy = ((light.y - centre[1]) / L) * off;
  sc.drawImage(mask, 0, 0);
  sc.globalCompositeOperation = 'destination-out';
  sc.drawImage(mask, -dx, -dy);
  sc.globalCompositeOperation = 'source-in';
  const y0 = apply(rig.head, [0, -140])[1], y1 = p.groundY;
  sc.fillStyle = lin(sc, 0, y0, 0, y1, [
    [0, opts.rimTop || PAL.rimTop],
    [0.42, opts.rimMid || 'rgba(255,168,102,0.72)'],
    [0.8, 'rgba(190,110,70,0.42)'],
    [1, 'rgba(120,70,50,0.16)'],
  ]);
  sc.fillRect(0, 0, W, H);
  sc.globalCompositeOperation = 'source-over';

  const rim = (opts.rim === undefined ? 1 : opts.rim) * 0.62;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha *= rim;
  ctx.drawImage(scratch, 0, 0);
  if (opts.rimGlow !== 0) {
    ctx.globalAlpha *= 0.3;
    ctx.filter = 'blur(6px)';
    ctx.drawImage(scratch, 0, 0);
    ctx.filter = 'none';
  }
  ctx.restore();

  return rig;
}

function drawShadowlessBody(ctx, p, t, opts) {
  drawParts(ctx, p, t, opts);

  /* eye glints — two small warm sparks are the whole emotional read */
  const glint = opts.eyeGlint === undefined ? 1 : opts.eyeGlint;
  if (glint <= 0) return;
  const rig = buildRig(p, t);
  const open = clamp(p.eye * (1 - p.blink), 0, 1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [ex, aa] of [[38, 1], [-38, 0.8]]) {
    if (open < 0.16) continue;
    const c = apply(rig.head, [ex + p.lookX * 11, 12 + p.lookY * 8]);
    const a = glint * aa * (0.4 + 0.6 * open);
    const g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], 30);
    g.addColorStop(0, `rgba(255,206,150,${0.55 * a})`);
    g.addColorStop(0.4, `rgba(255,170,110,${0.18 * a})`);
    g.addColorStop(1, 'rgba(255,150,90,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(c[0], c[1], 30, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(255,240,215,${0.9 * a})`;
    ctx.beginPath(); ctx.ellipse(c[0] + 3, c[1] - 3, 3.6, 3.1, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
}

/** contact shadow in world space, drawn before the character */
export function drawShadow(ctx, p, spread = 1, alpha = 0.5) {
  ctx.save();
  ctx.translate(p.x, p.groundY + 2);
  ctx.scale(1, 0.16);
  ctx.fillStyle = radial(ctx, 0, 0, 260 * spread * p.scale, `rgba(0,0,0,${alpha})`, 'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.arc(0, 0, 260 * spread * p.scale, 0, 7); ctx.fill();
  ctx.restore();
}
