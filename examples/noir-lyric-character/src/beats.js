// beats.js — every creative decision for the film, in one table.
//
// Timing follows the lyric sheet's own breath, not a fixed 60-bpm grid: each
// card gets the 3.6–4.4 s a Devanagari couplet needs at this scale, and the
// character's acting is keyed to the words (eyes go dead on "मुस्कानें झूठी
// हैं", the head turns on "ऐ रात, इतना बता").
//
// total = 45 s.

export const FPS = 30;
export const DURATION = 48;

/* ------------------------------------------------------------ the actress */
// Every value here is a keyframe on the character rig. `pose(t)` interpolates.
// Positions are in the 1080×1920 frame; groundY 1612 is where the feet land.
export const POSES = [
  // 0 — cold open: only her silhouette in the rain, breathing, hands in pockets
  { t: 0.0, groundY: 1560, x: 540, lean: 1, eye: 0.42, lookX: 0, brow: 0.1,
    armL: [3, 6], armR: [3, 6], mouth: 'flat', walk: 0, coatSwing: 0, wind: 1.0, tilt: -2 },
  // 2.4 — the lamp flickers; she notices, head turns up to it
  { t: 2.4, groundY: 1560, x: 540, lean: 0.5, eye: 0.72, lookX: 0.55, lookY: -0.4,
    brow: -0.15, headRot: -3, tilt: -5, armL: [3, 6], armR: [3, 6] },
  // 4.2 — beat drop on the first line, a slow push: shoulders drop, chin lifts
  { t: 4.2, groundY: 1552, x: 540, lean: -1.5, eye: 0.62, lookX: 0.2, lookY: -0.1,
    brow: 0.3, tilt: 2, armL: [3, 7], armR: [3, 7], mouth: 'small' },
  // 7.2 — "ये गुमराहों का रास्ता": she starts to walk out of frame-left
  { t: 7.2, groundY: 1552, x: 470, walk: 0.85, walkPhase: 1.6, coatSwing: -18,
    lean: 3, eye: 0.66, lookX: -0.3, armL: [12, 16], armR: [-10, 14] },
  // 10.4 — "इनकी राहें खोलें बाँहें": walks on, one hand opens outward
  { t: 10.4, groundY: 1552, x: 610, walk: 0.9, walkPhase: 3.9, coatSwing: 22,
    lean: 2, eye: 0.7, lookX: 0.2, armL: [-34, -8], armR: [-12, 16], headRot: 2 },
  // 13.2 — "मुस्कानें झूठी हैं": stops dead, the social mask. A small false smile.
  { t: 13.2, groundY: 1554, x: 560, walk: 0, walkPhase: 4.4, coatSwing: 10,
    lean: 0, eye: 0.9, lookX: 0.35, brow: 0.15, mouth: 'smile', armL: [5, 8], armR: [5, 8] },
  // 15.0 — "पहचानें झूठी हैं": the smile dies. Eyes close a beat longer than a blink.
  { t: 15.0, groundY: 1554, x: 560, eye: 0.06, mouth: 'flat', brow: 0.5, headY: 4 },
  // 16.6 — "रंगीनी है छाई": the neon swells on her face, she looks into the camera
  { t: 16.6, groundY: 1554, x: 548, eye: 0.8, lookX: 0, lookY: 0, brow: 0.35,
    headY: -2, tilt: -1, mouth: 'small' },
  // 18.8 — "फिर भी है तन्हाई": the camera pulls back, she is small in the street
  { t: 18.8, groundY: 1554, x: 540, eye: 0.55, brow: 0.6, tilt: 3, headY: 3, mouth: 'down' },
  // 21.4 — "कल इन्हीं गलियों में": a step back into the past, the walk again, slower
  { t: 21.4, groundY: 1550, x: 640, walk: 0.6, walkPhase: 6.2, coatSwing: 16,
    lean: 1.5, eye: 0.7, lookX: 0.5, brow: 0.2, mouth: 'small', armL: [10, 14], armR: [-8, 12] },
  // 24.4 — "तो ये धूम थी": she turns half-profile, remembering the noise
  { t: 24.4, groundY: 1552, x: 520, walk: 0.5, walkPhase: 8.0, coatSwing: -14,
    lean: -2, eye: 0.75, lookX: -0.6, headRot: -8, brow: -0.1, mouth: 'open', mouthOpen: 0.2 },
  // 27.0 — "जो रूह प्यासी है": the one big gesture. Hand to the chest, then out.
  { t: 27.0, groundY: 1554, x: 540, walk: 0, coatSwing: 4, lean: 2,
    eye: 0.5, brow: 0.7, tilt: 4, mouth: 'down', armL: [26, -104], armR: [6, 10] },
  // 29.4 — hand opens toward us, palm up: "प्यासी"
  { t: 29.4, groundY: 1554, x: 546, lean: 3, eye: 0.62, brow: 0.6, tilt: 2,
    mouth: 'open', mouthOpen: 0.35, armL: [-14, -34], armR: [8, 12], headY: -2 },
  // 31.6 — "सबको तलाश वही": the street offers her nothing; she drops the hand
  { t: 31.6, groundY: 1554, x: 534, lean: 0, eye: 0.7, brow: 0.4, tilt: 0,
    mouth: 'flat', armL: [4, 8], armR: [4, 8], lookX: 0.1 },
  // 33.4 — "ये है गुमराहों का रास्ता": determined. Chin down, eyes up, brow hard.
  { t: 33.4, groundY: 1550, x: 560, lean: 3.5, eye: 0.62, brow: -0.7, headY: 3,
    tilt: -2, mouth: 'flat', armL: [6, 12], armR: [6, 12], coatSwing: 14, wind: 1.25 },
  // 35.8 — "ऐ रात, इतना बता": she turns her face up to the night and asks it
  { t: 35.8, groundY: 1552, x: 552, lean: -3, tilt: -9, headRot: 4, headY: -6,
    eye: 0.86, lookY: -0.75, brow: 0.55, mouth: 'open', mouthOpen: 0.5, wind: 1.35 },
  // 38.4 — the question hangs. A long blink, the rain gets louder.
  { t: 38.4, groundY: 1552, x: 548, lean: -1, tilt: -6, headY: -3,
    eye: 0.08, lookY: -0.4, brow: 0.4, mouth: 'flat', wind: 1.3 },
  // 40.0 — the mask again, but now she owns it: a real, tired half-smile
  { t: 40.0, groundY: 1556, x: 540, lean: 1, tilt: 2, eye: 0.5, lookX: 0.05,
    brow: 0.25, mouth: 'smile', armL: [3, 6], armR: [3, 6], wind: 1.15 },
  // 42.4 — the last chorus: she lets the mask go, and just stands in it
  { t: 42.4, groundY: 1558, x: 540, walk: 0, lean: 1, tilt: 3, eye: 0.5,
    lookX: 0.1, brow: 0.3, mouth: 'flat', armL: [3, 6], armR: [3, 6], wind: 1.35 },
  // 44.4 — the lamp dies. Only her silhouette and the rain are left.
  { t: 44.4, groundY: 1560, x: 540, lean: 2.5, tilt: 6, eye: 0.34, brow: 0.5,
    mouth: 'down', wind: 1.15 },
  // 48 — hold. One blink, then black.
  { t: 48.0, groundY: 1562, x: 540, lean: 2.5, tilt: 7, eye: 0.1, brow: 0.5,
    mouth: 'flat', wind: 1.05 },
];

/* ------------------------------------------------------------- camera keys */
// {t, scale, x, y} — camera zoom (1 = full frame), x/y are the frame point that
// lands in the middle of the screen.
export const CAMERA = [
  { t: 0.0, scale: 1.0, x: 540, y: 960, shake: 0 },
  { t: 2.0, scale: 1.06, x: 540, y: 1000, shake: 0.6 },
  { t: 4.0, scale: 1.16, x: 540, y: 1040, shake: 0 },
  { t: 7.0, scale: 1.30, x: 545, y: 1060, shake: 0 },
  { t: 10.4, scale: 1.22, x: 540, y: 1040, shake: 0 },
  { t: 12.6, scale: 1.42, x: 552, y: 1010, shake: 0 },
  { t: 15.6, scale: 1.58, x: 552, y: 985, shake: 0 },
  { t: 18.4, scale: 1.30, x: 548, y: 1020, shake: 0 },
  { t: 20.6, scale: 1.08, x: 540, y: 990, shake: 0 },
  { t: 23.6, scale: 1.20, x: 552, y: 1010, shake: 0 },
  { t: 26.6, scale: 1.46, x: 548, y: 1000, shake: 0 },
  { t: 29.6, scale: 1.62, x: 548, y: 975, shake: 0 },
  { t: 31.6, scale: 1.36, x: 540, y: 1010, shake: 0 },
  { t: 33.4, scale: 1.24, x: 548, y: 1040, shake: 0.5 },
  { t: 35.6, scale: 1.52, x: 550, y: 975, shake: 0 },
  { t: 38.2, scale: 1.66, x: 550, y: 960, shake: 0 },
  { t: 40.0, scale: 1.42, x: 545, y: 1000, shake: 0 },
  { t: 41.8, scale: 1.14, x: 540, y: 1030, shake: 0 },
  { t: 44.2, scale: 1.0, x: 540, y: 990, shake: 0 },
  { t: 48.0, scale: 0.94, x: 540, y: 1010, shake: 0 },
];

/* --------------------------------------------------------------- the words */
// y is the baseline-ish centre of the lyric block; `kind` tweaks the treatment.
export const LYRICS = [
  { t: 4.2, dur: 3.4, y: 1712, size: 62, lines: ['रात में ही जागते हैं', 'ये गुनाहों के घर'] },
  { t: 7.6, dur: 3.2, y: 1712, size: 62, lines: ['इनकी राहें खोलें बाँहें', 'जो भी आए इधर'] },
  { t: 10.8, dur: 2.8, y: 1712, size: 60, lines: ['ये है गुमराहों का रास्ता'], accent: true },
  { t: 13.6, dur: 3.0, y: 1712, size: 66, lines: ['मुस्कानें झूठी हैं', 'पहचानें झूठी हैं'] },
  { t: 16.6, dur: 2.4, y: 1712, size: 60, lines: ['रंगीनी है छाई'], cool: true },
  { t: 18.9, dur: 2.6, y: 1712, size: 64, lines: ['फिर भी है तन्हाई'], cool: true },
  { t: 21.5, dur: 3.2, y: 1712, size: 58, lines: ['कल इन्हीं गलियों में', 'इन मसली कलियों में'] },
  { t: 24.6, dur: 2.6, y: 1712, size: 60, lines: ['तो ये धूम थी'] },
  { t: 27.2, dur: 2.6, y: 1712, size: 58, lines: ['जो रूह प्यासी है', 'जिसमें उदासी है'] },
  { t: 29.9, dur: 2.2, y: 1712, size: 60, lines: ['वो है घूमती'] },
  { t: 32.1, dur: 2.6, y: 1712, size: 56, lines: ['सबको तलाश वही', 'समझे ये काश कोई'] },
  { t: 34.8, dur: 2.6, y: 1712, size: 60, lines: ['ये है गुमराहों का रास्ता'], accent: true },
  { t: 37.4, dur: 2.4, y: 1712, size: 60, lines: ['ऐ रात, इतना बता', 'तुझको तो होगा पता'] },
  { t: 39.9, dur: 2.3, y: 1712, size: 58, lines: ['मुस्कानें झूठी हैं'], soft: true },
  { t: 42.2, dur: 3.1, y: 1642, size: 56, lines: ['पहचानें झूठी हैं', 'रंगीनी है छाई', 'फिर भी है तन्हाई'], soft: true },
];

export const TITLE = { t: 1.0, text: 'गुमराहों का रास्ता', y: 470, size: 96, dur: 3.2 };
export const END_TITLE = { t: 45.3, text: 'गुमराहों का रास्ता', y: 352, size: 78, dur: 3.0 };
