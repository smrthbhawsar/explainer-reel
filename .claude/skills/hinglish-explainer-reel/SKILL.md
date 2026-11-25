---
name: hinglish-explainer-reel
description: End-to-end flow for a 45–60s (up to 90s when the topic needs it) vertical (1080x1920) Hinglish tech-explainer reel in Remotion. Asks for a topic, writes an ElevenLabs-ready Hinglish voiceover script, waits for the generated audio, then aligns captions to the audio and builds a dark-mode motion-graphics composition with synced, viral-style subtitles. Use when the user wants a new explainer reel/short/video on a topic, or says "make a reel about X".
---

# Hinglish Explainer Reel

Four stages, in order. Do not skip ahead: stage 4 needs the real audio file.

Worked examples of the finished output: `src/reels/RagReel.tsx` (RAG) and `src/reels/McpReel.tsx` (MCP),
with their assets in `public/rag/` and `public/mcp/`. Example script:
`.claude/skills/hinglish-explainer-reel/references/example-script-rag.txt`.

## Project layout (one folder per topic — never put reel files at the top level)

| What | Where |
|---|---|
| Script, voiceover, captions | `public/<slug>/script.txt`, `voiceover.mp3`, `captions.json`, `captions.srt` |
| Composition | `src/reels/<ReelId>.tsx` (exports the component and `DURATION`) |
| Registration | `src/Root.tsx` |
| Shared kit (topic-neutral) | `src/kit/` — never add topic-specific content here |
| Sound-effects library (shared) | `public/sfx/*.mp3` + `library.json` + `CREDITS.md` — managed with `npm run sfx` |
| Preview stills (scratch) | `out/stills/<slug>/f<frame>.png` |
| **Final video** | `renders/<slug>.mp4` |
| **Publish kit** (cover, grid crop, Instagram caption, YouTube title + description) | `renders/<slug>/cover.png`, `grid.png`, `caption.txt`, `youtube.txt` + `renders/grid-preview.png` |
| Cover specs (all reels, posting order) | `src/reels/covers.json` |

---

## Stage 1 — Ask for the topic

Ask: **"Which topic should the reel explain?"** Optionally also ask the target viewer
(beginner dev / student / non-tech) if it isn't obvious. Derive a kebab-case `slug`
(e.g. `vector-databases`) and a PascalCase `ReelId` (e.g. `VectorDatabasesReel`).

## Stage 2 — Write the Hinglish voiceover script

### Length policy (decide before writing)

**Pacing: brisk.** Slow narration loses attention. The voiceover is generated at normal ElevenLabs
speed (≈ 2.6 words/sec), and after upload the user picks **normal pace or 1.2×** (Stage 3). The word
counts below assume the usual 1.2× choice (≈ 3.1 words/sec); at normal pace the same script runs
~20% longer. Write dense: short sentences, no filler ("dekho", "toh basically", repeated setups).

| Tier | When | Words | Audio |
|---|---|---|---|
| **Standard (default)** | One concept: "what is X", "how X works", "why X happens" | **160–200** | **50–62 s** |
| **Extended (needs a reason)** | Story/case (a hack, an incident, a launch), a process with more than ~4 steps, or an X-vs-Y comparison | 201–285 | 63–90 s |
| **Series** | Doesn't fit in 90 s | split into Part 1 / Part 2 (each its own reel) | ≤ 90 s each |

- Use **Standard** unless the topic clearly needs more. Cut detail (history, edge cases, extra
  examples) before going longer.
- For **Extended**, state the reason in one line when delivering the script ("Extended, 80 s:
  it's a story with setup → breach → reveal"). The user approves it together with the script.
- For a **Series**, propose the split (what each part covers). Part 1 ends on a cliffhanger
  re-hook ("Part 2 mein dekhte hain ki…"); Part 2's hook recaps in one line and opens a new loop.
- Never exceed 90 s.

Roman-script Hinglish: Hindi grammar, English tech terms. Conversational, "tum" form.

**Read `.claude/skills/hinglish-explainer-reel/references/hooks.md` before writing** — it has the
hook formulas, re-hook lines and ending rules. The hook decides whether anyone watches the rest.

Structure (one or two short sentences per beat; each beat becomes one scene):

1. **Hook (0–3s)** — the very first sentence: ≤ 12 words, one surprising concrete specific,
   opens a loop, no greeting/intro (see hooks.md). Then one line that raises the stakes and a
   "Kyun?" / "Kaise?" beat (by ~8 s).
2. **Root cause** — why it happens, with a simple analogy (exam, library, waiter, etc.).
3. **Introduce the concept** — "Yahin aata hai X —" + full form if it's an acronym.
4. **One-line analogy** — "Simple bhasha mein: …"
5. **How it works** — 2–3 concrete steps ("Pehle…", "Jab tum…", "Phir…").
6. **Payoff / contrast** — what you avoid ("Na …, na …").
7. **Punchline** — short closer that calls back to the hook's specific and restates the idea.

Between beats, place **re-hook lines** every 10–15 s ("Lekin asli twist yahan hai.", "Aur ye
toh sirf pehla step tha.") — 2–3 in a Standard reel, 3–5 in an Extended one; never repeated, ≤ 8 words each.

Writing rules (these matter for ElevenLabs *and* for caption alignment):
- Commas and full stops = pauses. Use them deliberately; an em dash `—` gives a dramatic pause.
- Acronyms in CAPS (LLM, RAG, API) so they are spelled out.
- No symbols the TTS mangles: write "rupaye" not "₹", "percent" not "%", numbers as words where natural.
- No stage directions, emojis, brackets, or speaker labels — the text is pasted as-is.
- Mark 4–8 **keywords** (the tech terms that should glow cyan in captions).

Deliver to the user:
0. **3 hook options** (different formulas from hooks.md), recommended one marked; the script
   uses the recommended one. Offer to swap before they record.
1. The script in a single plain ```text block (ready to paste into ElevenLabs).
2. Word count + estimated duration + length tier (and the one-line reason if Extended / the split if Series).
3. Suggested ElevenLabs settings: model *Eleven Multilingual v2*, an Indian-English/Hindi voice,
   Stability ~45–55, Similarity ~75, Style 0–15, Speed 1.0 (pace is set after upload; see Stage 3).
4. The keyword list.

Save the exact script to `public/<slug>/script.txt` (one sentence per line is fine).

## Stage 3 — Ask for the audio

Ask the user for the path to the generated MP3. Also ask: **"Did you change any words in
ElevenLabs?"** — alignment needs `script.txt` to match the spoken words exactly; if they
edited it, get the final text and overwrite `script.txt`.

**Then always ask: "Audio pace: normal or 1.2×?"** Before asking, measure the file's duration
(`ffprobe`) and tell the user what each option gives, e.g. "normal: 77.5 s (2.5 words/sec) ·
1.2×: 64.6 s (3.0 words/sec)", so they can choose. Recommend 1.2× when normal pace is under
~2.8 words/sec or would exceed the approved length tier.
- **Normal:** copy the audio as-is to `public/<slug>/voiceover.mp3`.
- **1.2×:** speed it up without changing pitch:
  `ffmpeg -i <in>.mp3 -filter:a "atempo=1.2" -b:a 192k public/<slug>/voiceover.mp3`.
  (If `ffmpeg` isn't on the shell's PATH, it's installed via winget under
  `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_*\…\bin`.)
- Never overwrite or delete the original file in Downloads.
- If the user picked a speed in the request itself ("fast forward to 1.2x"), don't ask again.

**Length check after alignment (Stage 4a):** if the audio is longer than the approved tier allows
(> 62 s for Standard, > 92 s for Extended), stop and tell the user the real length, and propose
specific lines to cut so they can regenerate — don't build an over-length reel.

## Stage 4 — Build the video

### 4a. Align captions to the audio

```bash
npm run align -- --script public/<slug>/script.txt --audio public/<slug>/voiceover.mp3 --out public/<slug>
```

This writes `captions.json` (word-level Remotion `Caption[]`) and `captions.srt`, and prints
the audio duration, `durationInFrames`, and the start of every sentence. No speech
recognition is used: it fits the script's syllables onto the pauses detected in the audio.
- `fit cost` above ~60 usually means the script doesn't match the audio — recheck the text.
- If the user reports drift in a time range, compare caption word times with the detected silences
  (`ffmpeg -af silencedetect=noise=-32dB:d=0.1`). Sentence ends (`.`) should sit right before a pause.
  If one doesn't (the voice slowed down for emphasis), re-run with `--breaks "tha.,port.#2"` to force
  those words to end at a pause.
- If the user allows installing `@remotion/install-whisper-cpp`, real word timestamps are more
  precise; otherwise this is accurate to roughly ±0.15 s per word, exact at pauses.

### 4b. Plan scenes from the sentence starts

One scene per beat (5–7 scenes). Each scene starts at the frame of its first sentence; the
last scene ends at `durationInFrames`. Write the plan as a table (scene, start frame, phrase,
visual) before coding. Inside a scene, anchor every pop/strike/beam to the word that motivates
it with `phraseFrame` — never hand-guess frames.

### 4c. Write the composition `src/reels/<ReelId>.tsx`

Reuse the kit — do not copy-paste it:
- `src/kit/ui.tsx` — tokens `C`, `SANS`, `MONO`, `cardStyle`; helpers `useSpr(at)`, `prog(frame, at, dur)`,
  `clamp`; components `Background`, `Header({bounds,label})`, `Scene({from,to,first,last})`,
  `Tag`, `Abs`, `ChipGlyph`, `Padlock`, `Cylinder`.
- `src/kit/StylishCaptions.tsx` — `<StylishCaptions src="<slug>/captions.json" keywords={KEYWORDS} />`
  (`KEYWORDS` = the keyword list from Stage 2, defined in the reel file; the kit has no default keywords).
- `src/kit/timing.ts` — `phraseFrame(words, "phrase", occurrence?)`, `phraseEndFrame(...)`.
- `src/kit/SoundEffects.tsx` — **sound effects, always**: `sceneCues(SCENES)` (whoosh on every scene
  change), `popCues(frames, { avoid: CUTS })` (pop when a tag/card/icon appears — pass the same
  `F("…")` frames those elements use), riser + impact on the payoff word, `<SoundEffects cues={SFX} />`
  after the voiceover. Full recipe, rules, and how to fetch a missing sound from Mixkit/Pixabay
  (`npm run sfx -- search|add|import`): `references/sound-effects.md`.
- **Branding is automatic:** `Header` renders the `@60secstack` watermark (`src/kit/Watermark.tsx`:
  the 60SecStack stack logo as inline vector SVG + handle on a dark pill) at the **top-right of the
  header row**. Every reel must use `Header`. Don't add `<Watermark />` yourself, don't add a scene
  counter or disclaimer text, and don't restyle it per reel.

Skeleton:

```tsx
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Caption } from "@remotion/captions";
import words from "../../public/<slug>/captions.json";
import { Background, Header, Scene /* , Abs, Tag, useSpr, ... */ } from "../kit/ui";
import { StylishCaptions } from "../kit/StylishCaptions";
import { phraseFrame } from "../kit/timing";
import { popCues, sceneCues, SfxCue, SoundEffects } from "../kit/SoundEffects";

const W = words as Caption[];
const F = (p: string, n = 1) => phraseFrame(W, p, n);
export const DURATION = /* durationInFrames from align.cjs */;
const KEYWORDS = [/* Stage 2 keywords, e.g. "MCP", "Tool Calling" */];

const SCENES = [F("<first words of beat 1>"), F("<beat 2>"), /* ... */, DURATION];
// SCENES[0] must be 0.

const CUTS = sceneCues(SCENES);
const SFX: SfxCue[] = [
  ...CUTS,
  ...popCues([F("<tag word>"), F("<card word>") /* frames where things pop in */], { avoid: CUTS }),
  { at: F("<payoff word>"), sound: "riser-short", volume: 0.8 },
  { at: F("<payoff word>"), sound: "impact-zoom" },
];

const Scene1: React.FC = () => { /* use F("keyword") for every timed element */ };

export const <ReelId>: React.FC = () => (
  <Sequence from={0} durationInFrames={DURATION}>
    <Audio src={staticFile("<slug>/voiceover.mp3")} />
    <SoundEffects cues={SFX} />
    <AbsoluteFill>
      <Background />
      <Header bounds={SCENES} label="AI ARCHITECTURE" />
      {[Scene1, Scene2 /* ... */].map((S, i) => (
        <Scene key={i} from={SCENES[i]} to={SCENES[i + 1]} first={i === 0} last={i === SCENES.length - 2}>
          <S />
        </Scene>
      ))}
      <StylishCaptions src="<slug>/captions.json" keywords={KEYWORDS} />
    </AbsoluteFill>
  </Sequence>
);
```

Register it in `src/Root.tsx` next to the existing compositions:

```tsx
import { <ReelId>, DURATION as <SLUG>_DURATION } from "./reels/<ReelId>";
// inside the fragment:
<Composition id="<ReelId>" component={<ReelId>} durationInFrames={<SLUG>_DURATION} {...REEL} />
```

### Design system (keep consistent across reels)

- Background `#0B0F19` + animated dot grid (`Background`). Cards `#131B2E`, 1px border `#24324D`, radius 20.
- Accents: cyan `#38BDF8` (primary/keywords), purple `#A78BFA`, emerald `#10B981` (solution/success), red `#EF4444` (problem/error).
- Fonts: Inter (UI), JetBrains Mono (labels/tags/code).
- Header fixed at top (y 64–160): badge label (left) + `@60secstack` logo watermark (right) +
  segmented progress bar (automatic from `bounds`). No `NN/TT` counter.
- **Safe zones:** content cards within x 100–980, y 190–1400. Captions sit at `bottom: 240` (≈ y 1520–1680)
  — never place cards there. Leave the bottom ~240 px empty for platform UI.
- Motion: `spring()` pops/slides for entrances (`useSpr`), `prog` for strokes/fills, SVG dashed arrows
  with animated `strokeDashoffset` for data flow, red strike-through for rejected ideas, emerald glow
  for the final answer. Problem scenes lean red, solution scenes lean emerald.
- **Visual hook:** the first frame already shows the most intriguing visual — no fade-in, no slow
  intro; something new on screen every 2–3 s in the first 10 s; the hook's key word gets a visual
  beat (see hooks.md §5).
- Every element that appears must be tied to the word that introduces it (`F("...")`), a few frames early
  at most. A scene should keep evolving — avoid >4 s with nothing moving.

Captions (already implemented in `StylishCaptions`, don't restyle per reel): bold white 64px, no
background box, dark text shadow, up to 2 lines per page broken at pauses/clause ends, punctuation
stripped except `?`, keywords (passed per reel via the `keywords` prop) cyan + uppercase, 1.06× pop
on the active word. **Subtitles are never underlined** (no `textDecoration`), in any variant.

### 4d. Verify, then render

1. `npx tsc --noEmit` — must be clean.
2. Render a still at the middle of every scene and at each key beat (several frames per call):
   `npm run still -- <ReelId> <slug> <frame> <frame> ...` → `out/stills/<slug>/f<frame>.png`.
   **Look at them**: overlaps with captions, text overflow, elements outside the safe zone,
   empty-looking scenes, and whether the `@60secstack` watermark is crisp at the top-right of the header.
   (Renders use PNG frames + CRF 14, set in `remotion.config.ts`, so the watermark stays sharp.
   Don't switch back to JPEG.)
3. Fix, re-check, then render the final video: `npm run render -- <ReelId> <slug>` → `renders/<slug>.mp4`.
   Never write stills into `renders/`, and never write the final MP4 into `out/`.
4. Build the **publish kit** (always, with every render): follow
   `.claude/skills/hinglish-explainer-reel/references/publish-kit.md`. Add the reel to
   `src/reels/covers.json`, run `npm run publish-kit -- <slug>`, check the cover and grid preview,
   and write `renders/<slug>/caption.txt` for Instagram (hook line, value bullets, one engagement
   prompt, the follow line, 5 hashtags) and `renders/<slug>/youtube.txt` for YouTube Shorts (search-friendly
   title, description with a Subscribe line, keyword line, 3 hashtags starting with #shorts).
5. Report to the user: the `renders/<slug>.mp4` path, duration, the scene/timing table, the sound
   cues (frame → sound, any newly downloaded sounds), and the
   publish kit (cover + grid preview images shown; Instagram caption and YouTube title pasted in the
   reply). Also report anything
   you couldn't verify (you can't hear the audio — ask them to watch it once for sync and
   sound-effect levels).
