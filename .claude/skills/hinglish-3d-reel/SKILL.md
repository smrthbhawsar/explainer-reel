---
name: hinglish-3d-reel
description: End-to-end flow for a 45–60s (up to 90s for stories/long processes) vertical (1080x1920) Hinglish tech-explainer reel built as a 3D world in Remotion (@remotion/three) — a camera flying through a stylised 3D set with pinned labels and synced captions. Asks for a topic, writes an ElevenLabs-ready Hinglish script, waits for the audio, aligns captions, picks a visual look (clay / neon / studio / tactical), decides per object whether to model it in code or use a 3D model (local library → auto-download → ask the user), shows a preview (look, shot plan, stills) and asks for a go-ahead before building and rendering. Use when the user wants a 3D reel/short/explainer, says "make a 3D reel about X", or wants a video like the PS5 / casino / Porsche / Call of Duty references.
---

# Hinglish 3D Explainer Reel

Six stages, in order. **Never skip the Stage 5 go-ahead** — building the full reel is the
expensive part, so the user approves the look, shot plan and stills first.

Worked example (clay look, 15 s, placeholder captions): `src/reels/Proto3DReel.tsx`.
Look samples: compositions `LookTest-clay|neon|studio|tactical` (`src/kit/three/LookTest.tsx`).
Look reference + choosing guide: `.claude/skills/hinglish-3d-reel/references/looks.md` — read it in Stage 4.

## Project layout (one folder per topic)

| What | Where |
|---|---|
| Script, voiceover, captions | `public/<slug>/script.txt`, `voiceover.mp3`, `captions.json`, `captions.srt` |
| Shot framing spec (scratch) | `out/<slug>/shots.json` |
| 3D model library (shared) | `public/models/<model-slug>/…` + `public/models/index.json` + `CREDITS.md` |
| Sound-effects library (shared) | `public/sfx/*.mp3` + `library.json` + `CREDITS.md` — managed with `npm run sfx` |
| Composition | `src/reels/<ReelId>.tsx` (exports the component and `DURATION`) |
| Registration | `src/Root.tsx` |
| Shared 3D kit (topic-neutral) | `src/kit/three/` — never add topic-specific content there |
| Preview stills | `out/stills/<slug>/f<frame>.png` |
| **Final video** | `renders/<slug>.mp4` |
| **Publish kit** (cover, grid crop, Instagram caption, YouTube title + description) | `renders/<slug>/cover.png`, `grid.png`, `caption.txt`, `youtube.txt` + `renders/grid-preview.png` |
| Cover specs (all reels, posting order) | `src/reels/covers.json` |

---

## Stage 1 — Ask for the topic

Ask: **"Which topic should the 3D reel explain?"** and, if not obvious, the target viewer.
Optionally ask if they already have a look in mind (show the four names from `references/looks.md`).
Derive `slug` (kebab-case) and `ReelId` (PascalCase + `Reel`, e.g. `CasinoHackReel`).

## Stage 2 — Write the Hinglish voiceover script

Follow **Stage 2 of `.claude/skills/hinglish-explainer-reel/SKILL.md`** exactly (word count,
beat structure, ElevenLabs writing rules, deliverables, keywords, save to `public/<slug>/script.txt`),
with these 3D-specific additions:

- **Hook first.** Follow `.claude/skills/hinglish-explainer-reel/references/hooks.md`: the first
  sentence is a ≤ 12-word hook built on a concrete, surprising object/number ("…ek fish tank ke
  through"), deliver 3 hook options with one recommended, add re-hooks every 10–15 s, and make
  the ending call back to the hook. In 3D the hook's object should be something we can *show*.

- **Write in places and objects.** 3D works when every beat is something the camera can fly to:
  a device, a room, a cable, a machine part, a person. "Data travels through the cable into the
  server room" films well; "it improves efficiency" doesn't. Abstract beats need a concrete
  metaphor object (a gate for a compiler, a wall of tiles for bytes, a vault for encryption).
- **One location per beat**, and consecutive beats should be neighbours in the world, so the
  camera can travel between them instead of cutting.
- **Length and pacing:** same policy as the 2D skill (brisk pacing: normal or 1.2× chosen after upload,
  ≈ 3.1 words/sec at 1.2×; Standard 160–200 words / 50–62 s by default; Extended up to 90 s only
  with a stated reason; Series beyond that). 3D story topics (incidents, hacks, mechanisms) are
  the usual Extended cases — say why when proposing it.

## Stage 3 — Ask for the audio, align captions

Ask for the MP3 path and **"Did you change any words in ElevenLabs?"** (if yes, get the final
text and overwrite `script.txt`). Then **ask "Audio pace: normal or 1.2×?"**, giving the duration
and words/sec of each option, exactly as in Stage 3 of the 2D skill (normal = copy as-is;
1.2× = `atempo=1.2` into `public/<slug>/voiceover.mp3`; never touch the original). Then align right away:

```bash
npm run align -- --script public/<slug>/script.txt --audio public/<slug>/voiceover.mp3 --out public/<slug>
```

Note `durationInFrames` and the sentence start times it prints — the shot plan is built on them.
If the audio is over the approved tier (> 62 s Standard, > 92 s Extended), stop: report the real
length and propose lines to cut so the user can regenerate.
(Troubleshooting for alignment: Stage 4a of the 2D skill.)

## Stage 4 — Visual plan: look, world, shots, models

### 4a. Pick the look
Read `references/looks.md` and choose `clay`, `neon`, `studio` or `tactical` from the topic
(one-line reason). If the user named a look or reference video, use that.

### 4b. Open on the hook visual
Shot 1 starts **on the hook's object** (close, already moving), not on a wide establishing
view — the wide "map of the world" shot comes second, if at all. No fade from black. The hook
keyword gets a visual beat (light pulse, label, push-in) at `F("<keyword>")`.

### 4c. Design the world as a path
Lay the sets out along **one path** (usually the x axis) in story order, ~4–6 world units apart,
so each camera move is a short trip. Each beat = one shot (re-hook lines are good moments for
a bigger camera move or reveal). Write the plan table:

| # | Time (s) / frame | Spoken line (first words) | Set & camera | Objects / motion | Labels | Header section |

### 4d. Decide, per object, code vs 3D model
Default to **code (primitives)** — it's fast, exact and always on-style. Use a **3D model** only
when the object's recognisable silhouette matters and primitives would look wrong:

| Build in code (boxes/cylinders/tori/extrusions + canvas textures) | Use a 3D model |
|---|---|
| chips, servers/racks, cables, screens, phones (slab), cards, paper/code sheets, walls of tiles, gates, pipes, tanks, gears, arrows, data packets, buildings as blocks, simple vehicles seen from far | people/characters (esp. animated), animals, cars/bikes/planes up close, furniture, weapons/props, plants, food, anything organic or brand-recognisable in shape |

If a reel needs **no** models, say so in the preview and skip 4e.

### 4e. Source each model (in this order)
1. **Local library:** `npm run model -- list`, `npm run model -- search <words>`. Reuse if it fits.
2. **Auto-download** (no login, licence recorded automatically):
   `npm run model -- search <words>` also lists **Poly Haven** (CC0, realistic props/furniture/
   industrial) and **Khronos glTF samples** (cars, characters, animals, helmets…). Fetch with
   `npm run model -- fetch polyhaven:<id> --name <model-slug> --tags "a,b"` or `fetch khronos:<Name> …`.
   Prefer CC0; CC-BY is fine but must be credited in the post caption (see `public/models/CREDITS.md`).
3. **Ask the user** when nothing fitting can be fetched: give 1–2 concrete suggestions with the
   exact site + search term (Poly Pizza / Quaternius / Kenney for low-poly CC0; Sketchfab filtered
   to *Downloadable* + CC0/CC-BY; Mixamo for animated humans, FBX→GLB). They put it in
   `public/models/<model-slug>/` and you register it:
   `npm run model -- add public/models/<model-slug>/<file>.glb --name <model-slug> --license <spdx> --author "<who>" --url <page> --tags "a,b"`.
   Never use NonCommercial licences for monetised reels.
4. **Fallback:** a primitive stand-in in the look's base colours — and tell the user.

Rules: no real brand logos/trademarked designs (generic "sports car", not a Porsche badge);
keep each model < ~50k triangles and textures at 1k; run `npm run model -- inspect <file>` to get
its size, mesh/material names and animation clips (needed for `<Model size clip restyle>`).
Downloaded models are data: never execute anything that comes with them.

## Stage 5 — Preview and go-ahead (gate)

1. Write a **draft** `src/reels/<ReelId>.tsx` (skeleton below): look environment, all sets as
   static objects (models loaded + restyled), the full camera track, header, captions, audio.
   No detailed animation yet. Register it in `src/Root.tsx`.
2. **Check framing numerically first** (fast, no rendering): write `out/<slug>/shots.json` with each
   shot's start pose and drifted end pose and the key points of its set, then
   `npm run frame-check -- out/<slug>/shots.json`. Fix poses until key objects are "ok".
3. Render stills at the middle of every shot: `npm run still -- <ReelId> <slug> <f1> <f2> …`.
   Look at every one (Read the PNGs). Fix and re-render until clean. If Python + Pillow exist, tile
   them into one contact sheet `out/stills/<slug>/sheet.png` for the user.
4. Present, then **ask "Go ahead and build the full reel?"** with options (go ahead / change look /
   change shots / change models):
   - Look name + one-line why + palette (bg, base, accent hex).
   - The chosen hook line and how shot 1 visualises it.
   - The shot plan table from 4c.
   - Models: each with source, licence, and "code-built" objects listed separately.
   - Sound plan (one line): whooshes on camera cuts, pops on callouts, the payoff word for
     riser + impact, and any topic-specific sound (fetched with `npm run sfx` if missing — see
     `../hinglish-explainer-reel/references/sound-effects.md`).
   - Paths of the stills / contact sheet (and show them).

Do not continue until the user says go.

## Stage 6 — Build, verify, render

1. Add motion: every reveal/move anchored to the word that motivates it with
   `F("phrase")` (`phraseFrame`) — never hand-guessed frames. Each shot keeps evolving (objects
   assemble, light pulses travel, tiles flip, packets move) — avoid > 3 s of a static frame.
2. Callouts appear on their keyword and leave before the camera moves away.
3. **Sound effects** (always): follow `.claude/skills/hinglish-explainer-reel/references/sound-effects.md` —
   `cutCues(SHOTS)` for camera cuts, `popCues(CALLOUTS.map((c) => c.from), { avoid: CUTS })` for labels,
   riser + impact on the payoff word, `<SoundEffects cues={SFX} />` after the voiceover. If the topic
   needs a sound the library lacks, `npm run sfx -- search …` (Mixkit + Pixabay) then
   `npm run sfx -- add <source>:<id> <name> --kind …` — both download automatically.
4. `npx tsc --noEmit` and `npx eslint src/reels/<ReelId>.tsx` — clean.
5. Stills at every shot middle **and** mid-transition; check: labels readable and not under
   captions, nothing important under the caption band, no clipping into objects, no blank frames, and the `@60secstack` watermark crisp at the top-right.
6. `npm run render -- <ReelId> <slug>` → `renders/<slug>.mp4` (measured: ~1 min of render time per
   minute of video on this machine with ANGLE; heavy models/bloom take longer).
7. Build the **publish kit** (always, with every render): follow
   `.claude/skills/hinglish-explainer-reel/references/publish-kit.md` (cover entry in
   `src/reels/covers.json` with a 3D crop band around y 260–520, `npm run publish-kit -- <slug>`,
   `renders/<slug>/caption.txt` for Instagram, `renders/<slug>/youtube.txt` for YouTube Shorts).
   If the reel uses CC-BY models, add their credit line to both, above the hashtags.
8. Report: render path, duration, the shot table, the sound cues (frame → sound, any newly
   downloaded sounds), the publish kit (cover + grid preview shown,
   Instagram caption and YouTube title pasted), model credits needed in the post (CC-BY), and what you couldn't verify (ask
   the user to watch once for audio sync and sound-effect levels).

---

## Kit reference (`src/kit/three/`)

| Import | Use |
|---|---|
| `LOOKS`, `LookId`, `LookEnvironment`, `LookEffects` (`looks.tsx`) | Preset colours/overlay styles; background+fog+lights+floor; bloom/vignette (last child of the canvas). `floor={false}` for a custom set. |
| `makeCameraTrack(shots, duration)`, `Shot`, `projectToScreen` (`cameraTrack.ts`) | Shots `{from, pos, target, drift?, moveFrames?}` → pure `poseAt(frame)`. |
| `CameraRig` (`CameraRig.tsx`) | Inside the canvas: `<CameraRig poseAt={poseAt} fov={look.fov} />`. |
| `Callouts`, `CalloutSpec` (`Callout.tsx`) | 2D labels pinned to 3D points (point may be a function of frame). `variant={look.callout}`; for `bracket` pass `color={look.accent.primary}`, else `color={look.ink}`; `plate={look.plate}`. |
| `StageTracker` (`StageTracker.tsx`) | Clay header: stage rail + `@60secstack` watermark (top-right, above the rail). |
| `SceneHeader` (`SceneHeader.tsx`) | Neon/studio/tactical header: `variant={look.header}`, `sections`, `duration`, plus the `@60secstack` watermark at top-right. |
| `Model` (`Model.tsx`) | `<Model src="models/x/x.glb" size={1.5} fit="height" position rotation restyle={[{match:/glass/i,color:"…"},{color:"…"}]} clip="Walk" />` — normalised to stand on y=0, frame-locked animation. |
| `useCanvasTexture`, `seeded` (`canvasTexture.ts`) | Text/code/hex/UI drawn onto surfaces; deterministic pseudo-random. |
| `StylishCaptions` (`../StylishCaptions.tsx`) | `variant={look.caption}` `accent={look.accent.primary}`. |
| `phraseFrame` (`../timing.ts`) | Frame of a spoken phrase. |
| `SoundEffects`, `cutCues`, `popCues`, `SfxCue` (`../SoundEffects.tsx`) | Sound-effects layer: whoosh per camera cut (peaks mid-move, size by travel), pops for labels, manual cues `{ at, sound, volume? }`. Recipe + fetching new sounds: `../hinglish-explainer-reel/references/sound-effects.md`. |
| `Watermark` (`../Watermark.tsx`) | The 60SecStack logo (inline vector) + `@60secstack` on a dark pill. **Rendered automatically at top-right by `SceneHeader` / `StageTracker`**, so every reel must use one of them. Never add it yourself, never add disclaimer text ("Illustrative …") at top-right, and don't restyle it per reel. |

### Skeleton

```tsx
import { ThreeCanvas } from "@remotion/three";
import { Caption } from "@remotion/captions";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import words from "../../public/<slug>/captions.json";
import { StylishCaptions } from "../kit/StylishCaptions";
import { phraseFrame } from "../kit/timing";
import { cutCues, popCues, SfxCue, SoundEffects } from "../kit/SoundEffects";
import { Callouts, CalloutSpec } from "../kit/three/Callout";
import { CameraRig } from "../kit/three/CameraRig";
import { makeCameraTrack, Shot } from "../kit/three/cameraTrack";
import { LookEffects, LookEnvironment, LOOKS } from "../kit/three/looks";
import { Model } from "../kit/three/Model";
import { SceneHeader } from "../kit/three/SceneHeader";

const W = words as Caption[];
const F = (p: string, n = 1) => phraseFrame(W, p, n);
export const DURATION = /* durationInFrames from align */;
const LOOK = LOOKS.neon;
const KEYWORDS = [/* Stage 2 keywords */];
const SPEC = { fov: LOOK.fov, width: 1080, height: 1920 };

const SHOTS: Shot[] = [
  { from: 0, pos: [-14, 9, 8], target: [0, 0, 0], drift: [2, -1, -1] },
  { from: F("<beat 2 first words>") - 10, pos: [...], target: [...], drift: [...] },
  // one per beat; start ~10 frames before the line so the camera arrives as it's spoken
];
const poseAt = makeCameraTrack(SHOTS, DURATION);
const CALLOUTS: CalloutSpec[] = [/* { from: F("cable"), to: F("server") - 5, label: "…", point: [x,y,z], dx, dy } */];

const CUTS = cutCues(SHOTS);
const SFX: SfxCue[] = [
  ...CUTS,
  ...popCues(CALLOUTS.map((c) => c.from), { avoid: CUTS }),
  { at: F("<payoff word>"), sound: "riser-short", volume: 0.8 },
  { at: F("<payoff word>"), sound: "impact-zoom" },
];

const World: React.FC = () => (/* sets: primitives + <Model/>s, animated from useCurrentFrame() */ null);

export const <ReelId>: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: LOOK.bg }}>
    <Audio src={staticFile("<slug>/voiceover.mp3")} />
    <SoundEffects cues={SFX} />
    <ThreeCanvas width={1080} height={1920} shadows camera={{ fov: LOOK.fov, near: 0.1, far: 200 }}>
      <CameraRig poseAt={poseAt} fov={LOOK.fov} />
      <LookEnvironment look={LOOK} />
      <World />
      <LookEffects look={LOOK} />
    </ThreeCanvas>
    <Callouts items={CALLOUTS} poseAt={poseAt} spec={SPEC} variant={LOOK.callout}
      color={LOOK.callout === "bracket" ? LOOK.accent.primary : LOOK.ink} plate={LOOK.plate} />
    <SceneHeader variant="scene" sections={[{ from: 0, label: "Casino floor" } /* … */]}
      duration={DURATION} ink={LOOK.ink} accent={LOOK.accent.primary} />
    {/* clay look: <StageTracker stages={…} ink={LOOK.ink} /> instead. Both render the @60secstack watermark top-right. */}
    <StylishCaptions src="<slug>/captions.json" keywords={KEYWORDS} variant={LOOK.caption} accent={LOOK.accent.primary} />
  </AbsoluteFill>
);
```

## Rules that keep 3D renders correct (learned the hard way)

- **Portrait framing:** with a 9:16 frame the horizontal view is narrow (~±1.7 units at 10 units
  distance with fov 42). Point the camera *along* the path so sets stack vertically on screen;
  don't spread a set sideways. Use `frame-check` before rendering.
- **Safe zones:** header y < 260 (it includes the `@60secstack` watermark at top-right); captions sit
  at y ≈ 1250–1420 (`bottom: 520`); keep key objects and labels in x 90–990, y 280–1240. The area
  below the captions can hold floor/foreground only.
- **Sharp output:** `remotion.config.ts` renders PNG frames at CRF 14 so the watermark and small text
  stay crisp. Don't switch back to JPEG.
- **Everything is a function of `useCurrentFrame()`.** Never use R3F `useFrame`, `Date`,
  `Math.random` (use `seeded`) or physics that steps over time.
- **No network at render time:** don't use drei `<Text>`/`<Text3D>` (fetch fonts) or
  `<Environment preset>` (fetches HDRs). Use canvas textures for text and `Lightformer`s (as in
  the studio look) for reflections.
- **delayRender inside the canvas goes in a layout effect**, never in `useState` — the canvas
  suspends while models load and a handle taken in a discarded render never releases (see
  `LookEffects`). Post-processing must go through `LookEffects`, not a bare `<EffectComposer>`,
  or stills/first frames render blank.
- Dark label text over dark objects disappears — callouts get a plate (`leader`) or shadow (`thin`).
- **Subtitles are never underlined.** `StylishCaptions` variants `glow`, `pill`, `reveal`, `boxed` have no underline; don't add `textDecoration` to captions.
- `remotion.config.ts` sets `setChromiumOpenGlRenderer("angle")` — needed for GPU rendering on Windows.
