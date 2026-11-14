// type.js — Devanagari lyric typography.
//
// Two faces: Tiro Devanagari Hindi (serif, bookish, matches the song's mood)
// for the lyrics, Mukta (heavy) for the one big title. Both are open-licence
// and are committed under assets/fonts so renders never depend on a CDN.
//
// Rules that keep Devanagari readable on screen:
//  - never let the matra line collide with the top of the previous line: the
//    line height is 1.42× and the block is measured with real metrics
//  - one idea per card; a card holds at most two lines
//  - entrance is a 26px rise + alpha + blur, 0.55s; text never "types on",
//    because Devanagari must appear as whole syllables
//  - the block always sits on a soft scrim, so it never fights the rain

import { GlobalFonts } from '@napi-rs/canvas';
import { W, H, clamp, seg, E, lin, radial } from './character.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.resolve(here, '../assets/fonts');

export function registerFonts() {
  GlobalFonts.registerFromPath(path.join(FONT_DIR, 'tiro-devanagari-hindi-devanagari-400-normal.woff2'), 'Tiro');
  GlobalFonts.registerFromPath(path.join(FONT_DIR, 'mukta-devanagari-800-normal.woff2'), 'Mukta X');
  GlobalFonts.registerFromPath(path.join(FONT_DIR, 'mukta-devanagari-500-normal.woff2'), 'Mukta M');
}

export const LYRIC_FONT = 'Tiro';
export const TITLE_FONT = 'Mukta X';

/* wrap Devanagari by whitespace; Devanagari words do not break internally */
export function wrapText(ctx, text, font, maxW) {
  ctx.font = font;
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * One lyric card.
 * card = { lines: [...], size, y, align }
 * lt = local time, dur = card duration
 */
export function drawLyricCard(ctx, card, lt, dur, o = {}) {
  const fadeIn = 0.55, fadeOut = 0.45;
  const appear = E.outCubic(seg(lt, 0.06, 0.06 + fadeIn));
  const leave = 1 - E.inOutCubic(seg(lt, dur - fadeOut, dur));
  const master = Math.min(appear, leave);
  if (master <= 0.001) return;

  const size = card.size || 64;
  const font = `${size}px ${LYRIC_FONT}`;
  const maxW = o.maxW || 860;
  const lines = card.lines.flatMap((l) => wrapText(ctx, l, font, maxW));
  const lh = size * 1.46;
  const blockH = lh * lines.length;
  const baseY = (card.y || 1618) - blockH / 2 + size * 0.8;

  ctx.save();

  /* scrim: a soft dark band so the words read over rain and reflections */
  const scrimTop = baseY - lh * (lines.length - 1) - size * 1.5;
  const scrimBot = baseY + size * 1.2;
  const sg = ctx.createLinearGradient(0, scrimTop - 90, 0, scrimBot + 80);
  sg.addColorStop(0, 'rgba(3,5,10,0)');
  sg.addColorStop(0.35, `rgba(3,5,10,${0.55 * master})`);
  sg.addColorStop(0.7, `rgba(3,5,10,${0.62 * master})`);
  sg.addColorStop(1, 'rgba(3,5,10,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, scrimTop - 100, W, scrimBot - scrimTop + 200);

  lines.forEach((line, i) => {
    const d = i * 0.13;
    const a = E.outCubic(seg(lt, 0.06 + d, 0.06 + d + fadeIn));
    const lv = 1 - E.inOutCubic(seg(lt, dur - fadeOut + i * 0.05, dur));
    const alpha = Math.min(a, lv);
    if (alpha <= 0.002) return;

    const y = baseY + i * lh;
    const dy = (1 - a) * 26 - (1 - lv) * 18;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.translate(W / 2, y + dy);
    if (a < 0.999) ctx.filter = `blur(${(1 - a) * 9}px)`;

    // warm gradient fill: cream at the top of the glyph, amber at the base
    const g = ctx.createLinearGradient(0, -size * 0.92, 0, size * 0.28);
    g.addColorStop(0, o.colorTop || '#fff4e2');
    g.addColorStop(0.62, o.colorMid || '#ffdcb2');
    g.addColorStop(1, o.colorBot || '#ffb877');
    ctx.fillStyle = g;

    // soft dark under-stroke keeps thin matras legible on bright rain
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(4,6,12,0.55)';
    ctx.lineWidth = Math.max(4, size * 0.10);
    ctx.strokeText(line, 0, 0);
    ctx.fillText(line, 0, 0);

    // a hairline of glow, only while the card is fresh
    const fresh = 1 - seg(lt, 0.0, 0.9);
    if (fresh > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * fresh * 0.16;
      ctx.filter = 'blur(10px)';
      ctx.fillStyle = '#ffcf9a';
      ctx.fillText(line, 0, 0);
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  });

  ctx.restore();
}

/** the big closing title */
export function drawTitle(ctx, text, lt, o = {}) {
  const a = E.outCubic(seg(lt, 0.1, 1.5));
  if (a <= 0.002) return;
  const size = o.size || 104;
  const font = `${size}px ${TITLE_FONT}`;
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = wrapText(ctx, text, font, o.maxW || 900);
  const lh = size * 1.3;
  const y0 = (o.y || 900);
  lines.forEach((line, i) => {
    const aa = Math.min(1, Math.max(0, a * 1.6 - i * 0.35));
    if (aa <= 0) return;
    ctx.save();
    ctx.globalAlpha = aa;
    ctx.translate(W / 2, y0 + i * lh + (1 - aa) * 30);
    ctx.filter = aa < 1 ? `blur(${(1 - aa) * 10}px)` : 'none';
    const g = ctx.createLinearGradient(0, -size * 0.7, 0, size * 0.7);
    g.addColorStop(0, '#fff6e6');
    g.addColorStop(0.55, '#ffd9ab');
    g.addColorStop(1, '#ff9d5c');
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(255,150,80,0.45)';
    ctx.shadowBlur = 40;
    ctx.fillText(line, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}
