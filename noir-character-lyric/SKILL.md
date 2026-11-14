---
name: noir-character-lyric
description: Backlit-character lyric and mood films - one hand-built 2D character with an expressive rig acted against a rainy night, a single light source rimming the silhouette, Devanagari or Latin lyrics entering as cards - rendered to MP4 at 9:16 or 16:9. Use for song lyrics, poetry, shayari, sad or romantic reels, and any short film where one character has to carry the emotion without a face full of detail. Not for kinetic type with no character (use kinetic-typography), flat storybook cartoons (use hand-drawn-cartoon) or 3D toy characters (use 3d-toy-character).
license: MIT
compatibility: Node 22+ with @napi-rs/canvas and FFmpeg. No browser, no GPU, no GSAP: frames are drawn with the Canvas 2D API and piped straight into ffmpeg.
---

# Noir Character Lyric

Make short films where **one character acts the song**. Not moving images, not a slide of text over stock footage: a rigged figure that breathes, blinks, turns, walks and reaches, standing in a lit street while the lyrics arrive one thought at a time.

The look is backlit noir: the body stays near-black, one light source rims the silhouette in warm amber, the face is mostly dark and the eyes carry the feeling. That single idea is what makes a code-drawn character read as painted, and it is also the fastest way out of the uncanny valley.

## Options

| Option | Default | Notes |
|---|---|---|
| format | vertical 1080×1920 | or landscape 1920×1080, square 1080×1080 |
| duration | 30–60 s | the film should follow the song's own sections, not a fixed grid |
| language | from the brief | Devanagari, Latin, Arabic, Cyrillic - any script the bundled font can draw |
| character | a hooded walker | or the user's own: match silhouette, palette, one accessory |
| light | one street lamp, frame right | a window, a neon sign, a car headlight all work - one source only |
| weather | rain | `clear` (still night, dust in the beam), `rain` (default), `snow` |

## Brief (answer before planning)

1. Whose song is this, and what is the one line the viewer should be left holding?
2. Where does the character **change** - the mask beat, the turn, the question to the night?
3. What does the camera do: does it push in for confession, pull out for loneliness?
4. Where do the words live: under the character, or over an empty frame while she is off to the side?

Then write the beat list: time, lyric card, the character's action, camera, and what changes in the light.

## Reads sheet (write it with the beat list)

For every card, write the one thing the viewer must understand and how long it stays readable. Devanagari runs slower than Latin at the same point size: budget **0.34 s per word** once the card is fully on, plus 0.5 s to land and 0.4 s to leave. A two-line couplet of 4–5 words per line needs **3.2–3.6 s**. If it doesn't fit, cut words instead of shrinking the type.

- One couplet at a time. Never two cards on screen, never a card plus the title.
- Cards do not appear on the same frame as a new camera move: land the camera, then land the words.
- The last card of a section leaves 0.2 s before the next arrives, so the frame breathes.

## Motion discipline

- **The character is the motion.** Every camera move and every word exists to support an action she is doing. If she has nothing to do, hold the frame and let her breathe.
- Character acting is causal: the lamp flickers → she looks up; a word lands → she reacts. Reaction arrives 2–4 frames *after* the word, never before.
- Idle is acting: breathing (4–5 s cycle), irregular blinks (every 2.6–4.4 s, 0.12–0.18 s closed), a 1–2° weight shift every few seconds. Never let a held pose be frozen.
- Offset the parts: head, shoulders and hands never start on the same frame. A head turn leads the eyes by 2 frames; the coat hem follows the hips by 4.
- Camera: one move per section, ease-in-out, 20–35% of the duration. Push in for confession (1.00 → 1.55), pull out for loneliness (1.55 → 1.05). No handheld shake except on a hit, and then no more than 2 px.
- Keep one direction of travel per act, and let the character carry it across the cut: if she walks frame-left, the next beat starts with her still moving left.
- Add a 0.4–0.8 s held pose before the payoff line. The pause is what makes it land.

## Style rules (always)

These are the style; keep them even when the palette or story changes.

1. **One light source, behind.** The rim is what separates her from the night. Two lights and it turns into a cartoon.
2. **The silhouette is the acting.** Every pose must read as a black shape: shoulders, chin, hands, hem. If you can't tell the emotion from the shadow, the pose is wrong, not the face.
3. **The face is 80% dark.** Eyes get two warm catchlights; brows, nose and mouth are single low-opacity strokes at most. A fully lit face breaks the style.
4. **Head is 22–30% of the body height**, body in a long coat so the legs read as one mass. Short legs, wide hem: it reads as a small person in a big night.
5. **One warm accent only**, and it is a story object (scarf, bag, phone). Everything else is night blue and black.
6. **Nothing in the frame is fully black or fully white** except the rain highlights and the lamp bulb. Fog, haze and vignette keep the blacks alive.
7. **The light is a character too**: it flickers, it dies at the end. Give it at least one event.

## Defaults (change freely)

- Palette: night `#05070f`, body `#111a29`, rim cream `#ffd6a0` → amber `#ff8a48`, accent red `#8e2b36`, cool neon `#5cc4ff`.
- Type: a Devanagari serif for lyrics (Tiro Devanagari Hindi), a heavy Devanagari sans for the title (Mukta 800). Cream `#fff4e2` top → amber `#ffb877` base, 58–68 px in 9:16 for lyrics, 82–96 px for the title.
- Weather: rain, three depth layers, brighter in front of the character than behind.
- Sound: a bed, never a melody - rain wash, a low drone, sparse plucked notes. Peak around −3 dBFS so a real track can be layered underneath.

## Setup (once)

```bash
node -v                        # 22+
npm i @napi-rs/canvas @ffmpeg-installer/ffmpeg
# fonts: commit the woff2 files you use, e.g. from @fontsource
npm i @fontsource/tiro-devanagari-hindi @fontsource/mukta
cp node_modules/@fontsource/tiro-devanagari-hindi/files/tiro-devanagari-hindi-devanagari-400-normal.woff2 assets/fonts/
```

Check the canvas build can parse Devanagari before you design anything:

```js
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
GlobalFonts.registerFromPath('assets/fonts/tiro-devanagari-hindi-devanagari-400-normal.woff2', 'Tiro');
const c = createCanvas(600, 200).getContext('2d');
c.font = '56px Tiro'; c.fillText('मुस्कानें झूठी हैं', 20, 100);   // must not draw boxes
```

If it draws tofu, the font is a Latin-only subset: pick the `-devanagari-` file, not `-latin-`.

## Decide before building

State these back to the user in one line before writing code.

1. **Aspect and length** - 9:16, 45 s for a full lyric sheet.
2. **Route** - Canvas 2D + ffmpeg (default). It renders 4 frames/s on a 2-core box, needs no browser, and gives exact per-frame control of the rig.
3. **Character** - silhouette, one accent, one held object.
4. **Light** - where it is, when it flickers, when it dies.
5. **Beats** - 3–5 acts for a song, each with one action.

| Need | Canvas 2D + ffmpeg (default) | HyperFrames + Three.js | After Effects export |
|---|:-:|:-:|:-:|
| Rigged 2D character acting | yes | yes (3D) | yes |
| Backlit rim on a silhouette | yes (mask pass) | yes | yes |
| Fast iteration on a 2-core box | yes | slow | n/a |
| Real depth, turns, cloth sim | no | yes | yes |

## The rig (how it works)

Everything is parametric: joints are 2×3 affine matrices, and each part is a path re-drawn every frame. That is what gives you squash, offset and cloth for free.

```
root (groundY, x, scale)
 └ hip (sway, bounce)
    └ chest (lean, breathing scale)
       ├ head (tilt + turn)  → hood, face, eyes, brows, mouth
       └ shoulders → upper arm → forearm → hand
    └ legs → ankles → shoes
 coat is drawn twice: back panel, then front panel over the legs
```

Per frame, render the figure in four passes:

1. **Ink pass** - draw every part in its real colours. This is what the viewer sees.
2. **Mask pass** - draw the same parts flat white into a scratch canvas.
3. **Rim pass** - `mask − mask shifted away from the light` leaves a band on the lit edge. Tint it with a vertical warm gradient and add it with `'lighter'`. Shift distance 8–16 px is a soft rim; 20+ is a neon tube.
4. **Glints** - two tiny warm catchlights on the eyes. This is the whole emotional read; do not add a third.

The rim is what sells the lighting. Note the compositing trap: to tint a shape you must use `source-in`, because `destination-in` keeps the *fill's* alpha, not the shape's.

## Acting vocabulary

Use these poses as the alphabet. Every beat is one of them plus a camera move.

| Pose | How it reads | Rig values |
|---|---|---|
| Guarded | hands at the hem, shoulders forward, chin down | `lean 2, tilt 5, armL/R [3,6]` |
| Noticing | head leads, eyes follow, shoulders stay | `headRot -6, lookX 0.6` then eyes 2 frames later |
| The mask | a small closed smile that does not reach the eyes | `mouth 'smile', eye 0.9, brow 0.15` |
| The mask drops | eyes close a beat too long, mouth flattens | `eye 0.05, mouth 'flat'` for 10–14 frames |
| Asking the night | chin up, face turned to the rim, mouth open | `tilt -9, lookY -0.75, mouthOpen 0.5` |
| Hand to chest | forearm crosses the body, no shoulder lift | `armL [26, -104]` (positive swings **across**) |
| Offering | hand opens out and away from the body | `armL [-14, -34]`, palm turns up |
| Walking | stride ±12°, bounce 6 px, hem lag 18 px | `walk 0.9, walkPhase += dt·1.1` |

Arm sign convention, in this rig: **positive shoulder angle swings the arm across the body, negative swings it out.** Get this wrong and every gesture looks like a shrug.

## Type (Devanagari and other complex scripts)

- Load the woff2 once with `GlobalFonts.registerFromPath`, then set `ctx.font = '64px Tiro'`. Canvas 2D shapes Devanagari correctly if the font has the tables.
- Line height **1.42–1.50×**. The matra line sits high; tighter and the reph/matra of one line collides with the next.
- Never type Devanagari on. A half-drawn "स्का" is a different word. Use a whole-block rise + blur + alpha instead.
- Card entrance: 26 px rise, 0.55 s, `easeOutCubic`, with a 9 px blur decaying to 0. Exit: 18 px down, 0.45 s, no blur.
- A card sits on its own soft scrim (a vertical gradient at 0.55–0.62 alpha), so rain and reflections behind it never eat the strokes.
- Under-stroke: a 0.10×size dark outline behind the fill keeps thin matras legible over a bright rain frame.
- Bottom safe area: baseline of the last line at **≥ 1700** in 1920, i.e. 220 px from the bottom. Keep the character's feet above it.

## Timing a song

1. Paste the lyric sheet and split it into couplets. One couplet = one card.
2. Give each card `0.34 s × words + 0.5 s entry + 0.4 s exit`, then round to the nearest 0.2 s.
3. Find the three emotional turns (in a ghazal-style lyric, usually the mask couplet, the question, the last repeat) and give each one an **action**, not just a card.
4. Put the camera changes between cards, never on them.
5. If you have the real track, replace the computed times with its section times and slip the acting 2–4 frames after each line.

## Make it eye-catching

- Open on the silhouette in the rain *before* any words: 2–3 s of atmosphere buys attention for the first line.
- Let one thing be wrong in the frame: a lamp dying, a shop light stuttering, a car passing and rimming her for half a second.
- Push in when she confesses. Pull out when she is alone. Never both in the same beat.
- Give the rain three depths (slow wide, medium, fast near-camera) and keep the near layer in front of the character.
- Grain and vignette are not optional at 1080×1920: they hide canvas gradients banding on phone screens.

## Starter (a frame in ~60 lines)

```js
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
const W = 1080, H = 1920;
const canvas = createCanvas(W, H), ctx = canvas.getContext('2d');
const mask = createCanvas(W, H), mctx = mask.getContext('2d');

GlobalFonts.registerFromPath('assets/fonts/tiro-devanagari-hindi-devanagari-400-normal.woff2', 'Tiro');

// 1. night + lamp (see "Always" rules: one source, frame right)
const g = ctx.createLinearGradient(0, 0, 0, H);
g.addColorStop(0, '#05070f'); g.addColorStop(0.7, '#0a1220'); g.addColorStop(1, '#04070c');
ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

// 2. the figure: ink pass
const dark = ctx.createLinearGradient(0, 900, 0, 1600);
dark.addColorStop(0, '#16233a'); dark.addColorStop(1, '#04060c');
ctx.fillStyle = dark;
drawCharacterInk(ctx, pose, t);           // your rig here

// 3. mask + rim
mctx.clearRect(0, 0, W, H);
drawCharacterInk(mctx, pose, t, '#ffffff');
mctx.globalCompositeOperation = 'destination-out';
mctx.drawImage(mask, -9, -9);             // shift away from the light
mctx.globalCompositeOperation = 'source-in';   // NOT destination-in
const rim = mctx.createLinearGradient(0, 700, 0, 1600);
rim.addColorStop(0, 'rgba(255,206,152,0.9)'); rim.addColorStop(1, 'rgba(255,132,68,0.2)');
mctx.fillStyle = rim; mctx.fillRect(0, 0, W, H);

ctx.globalCompositeOperation = 'lighter';
ctx.globalAlpha = 0.62;
ctx.drawImage(mask, 0, 0);
ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;

// 4. lyric card
ctx.font = '64px Tiro'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffdcb2';
ctx.fillText('मुस्कानें झूठी हैं', W / 2, 1700);
```

Then loop frames and pipe raw RGBA into ffmpeg:

```bash
ffmpeg -f rawvideo -pix_fmt rgba -s 1080x1920 -r 30 -i - -i assets/ambience.wav \
       -c:v libx264 -crf 19 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest out.mp4
```

Rendering stills first is faster than a full pass: `--still 8,16.8,36.2` and look at them before committing 6 minutes.

## Avoid

| Don't | Because | Instead |
|---|---|---|
| Front-light the face so it "reads" | kills the noir, and every anatomy shortcut shows | front fill at ≤25% inside the hood, eyes as catchlights |
| Add a second rim from the other side | flattens to cartoon | one source; move the source, don't add one |
| Let shoulders sink into the coat | the silhouette loses its human read | raise the coat's top edge into the neck, `shoulderW` inside the sleeve radius |
| Gesture with the wrong arm sign | a "hand on chest" becomes a shrug | positive angle = across the body; check with a still |
| Draw the crowd with the same rig at small scale | reads as dolls on a shelf | leave the street empty, or use featureless distant silhouettes at 0.25 scale with no shoes, no hands |
| Glow the whole rim evenly top-to-bottom | looks like a neon tube | warm gradient, brightest at the head, fading at the feet |
| Cross-fade lyric cards | two Devanagari blocks touching is unreadable | exit, 0.15–0.25 s of clean frame, then enter |
| Type-on animation for Devanagari | produces broken conjuncts | whole-block rise + blur + alpha |

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Text renders as boxes | Latin-only font subset loaded | use the `*-devanagari-*.woff2` file |
| Rim is a hard white outline | shift too big, tint at full alpha | shift 8–12 px, alpha 0.55–0.65, warm tint |
| Rim appears on the wrong side | shifted toward the light instead of away | shift by `-(light − centre)`, i.e. away |
| Silhouette looks like a bean | coat wider than the shoulders, no neck rise | narrow the coat, raise its top edge, add sleeve caps inside the outline |
| Character floats | no contact shadow; feet below the ground line | soft ellipse at 16% opacity under the feet, and check `groundY` against the road line |
| Feet clip the lyric scrim | character ground line below 1600 | ground the character at 1540–1570, lyrics baseline at 1712 |
| Motion feels robotic | every joint keys on the same frame, linear easing | offset parts by 2–4 frames, ease all poses with `inOutCubic` |
| Rain looks like static | one layer, uniform speed and length | three layers, different speed, length and alpha; near layer in front |

## Validate and self-critique

```bash
node render.js --still 1.6,8,16.8,27.6,36.2,43,45.5 --out stills
```

Look at every still and confirm:
- [ ] the pose reads as a silhouette with the face covered
- [ ] the rim is on the light side and fades toward the feet
- [ ] eyes are the brightest thing on the body, the lamp is the brightest in frame
- [ ] every Devanagari card is fully on, no conjunct broken, nothing under 220 px from the bottom
- [ ] the character is grounded: shadow under the feet, feet above the lyric block
- [ ] rain reads as rain (streaks, not dots) and the near layer is in front

Then score 1–10 on: hook (first second), pose legibility, lighting, readability at phone width, timing against the lyric, and the muted test (can someone tell the story with no sound?). Fix anything at 7 or below and re-still. Do not start a full render until everything is 8+.

## Deliver

- MP4 at 1080×1920, H.264, 30 fps, AAC bed, `-movflags +faststart`.
- Poster: the strongest settled frame, baked in as frame 0.
- A GIF (720 px tall, 10 fps) for the repo README.
- A 1–2 sentence caption that names the feeling, not the technique.
- A contact sheet of one still per card, so the user can ask for a specific beat to change.

## Study these

- Limbo and Inside (Playdead): backlit silhouette acting, the reference for the whole lighting approach.
- @8co28, lyric-video generators with beat-tapped word timing: https://x.com/8co28/status/2102572322016370781
- Ideas adapted (not copied) from the HyperFrames motion doctrine, the classic "silhouette carries the emotion" animation principle, and this repo's own `3d-toy-character` acting rules (anticipation → move → overshoot → settle, no twinning).
