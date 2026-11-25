# Sound effects (both reel skills)

Every reel gets a sound-effects layer. Kit: `src/kit/SoundEffects.tsx`. Sounds: `public/sfx/`
(listed in `public/sfx/library.json`, credits in `public/sfx/CREDITS.md`). `npm run sfx -- list`
shows what's available by kind.

## Default recipe (do this for every reel)

| Moment | Sound | How |
|---|---|---|
| 3D camera-angle change | whoosh, size picked by camera travel | `cutCues(SHOTS)` |
| 2D scene change | rotating whooshes | `sceneCues(SCENES)` |
| Label / callout / tag / card appears | `pop-sharp` (default) | `popCues(frames, { avoid: CUTS })` |
| The payoff line (one per reel) | `riser-short` (vol 0.8) + `impact-zoom` on the same frame | manual cues at `F("<payoff word>")` |

Rules:
- **Restraint.** At most one impact (+ its riser) per reel. Pops only for things that *appear*,
  not for every word. `popCues` already drops pops within 8 frames of a whoosh — always pass
  `avoid: CUTS` so effects never stack.
- **Anchor to words** with `F("…")`, never hand-guessed frames. `at` is where the sound's
  **peak** lands (the kit starts it early by the measured peak offset).
- **Levels are pre-mixed** (files loudness-matched, category levels in `SFX_LEVELS` keep effects
  ~3–9 dB under the voice). Don't hand-tune per cue unless something sticks out; use
  `master` on `<SoundEffects>` for global louder/quieter (e.g. `master={1.4}`).
- `<SoundEffects cues={SFX} />` goes right after the voiceover `<Audio>`.

```tsx
import { cutCues, popCues, SfxCue, SoundEffects } from "../kit/SoundEffects"; // + sceneCues for 2D

const CUTS = cutCues(SHOTS);                 // 2D: const CUTS = sceneCues(SCENES);
const SFX: SfxCue[] = [
  ...CUTS,
  ...popCues(CALLOUTS.map((c) => c.from), { avoid: CUTS }),   // 2D: the F("…") frames tags/cards pop in
  { at: F("<payoff word>"), sound: "riser-short", volume: 0.8 },
  { at: F("<payoff word>"), sound: "impact-zoom" },
];
// …
<Audio src={staticFile("<slug>/voiceover.mp3")} />
<SoundEffects cues={SFX} />
```

Optional topic-specific accents (only where the visual clearly earns it, ≤ 3 per reel): e.g.
`click-ui` for a UI tap, `tech-slide` for a screen sliding in, `pop-hard` for a big number/stat.
Tweak `cutCues` pools with `cutCues(SHOTS, { medium: [...], small: [...] })` if a look calls for it
(e.g. neon/tech → include `tech-slide`).

## When the reel needs a sound that isn't in the library

E.g. a cash register for a UPI reel, a camera shutter, a coin, a phone notification.

1. Search both sites: `npm run sfx -- search <simple words>` (e.g. `camera shutter`, `coin`,
   `notification`). Results are cached in `out/sfx-search.json`.
2. Pick the best-fitting result from either site and add it — both download automatically:
   `npm run sfx -- add <mixkit|pixabay>:<id> <kebab-name> --kind whoosh|pop|impact|riser --use "<what it's for>"`.
   It downloads, measures length/peak/loudness, updates `library.json` and `CREDITS.md`. The new
   name is immediately valid in `SfxCue.sound` (types come from `library.json`).
   - **Prefer short files (≤ 3 s)** whose title matches the moment. Check the printed `peak at` —
     a peak several seconds in means a long build-up; pick another unless that's what you want.
   - **Skip results flagged `⚠ YouTube Content ID`** (Shorts can get claimed; `add` refuses them
     unless `--allow-content-id`). `AI-generated` is fine.
   - Pixabay is fetched with curl (search page → its `/bootstrap/*.json` → direct CDN MP3); if a
     Pixabay search prints "search failed", rerun once, then fall back to Mixkit.
3. Fallback for a file the user downloaded themselves:
   `npm run sfx -- import <file> <kebab-name> --kind <kind> --source pixabay|mixkit --id <id> --use "…"`.
4. Tell the user which sounds you added (name, source:id, title) so they can veto any.
5. Only Mixkit and Pixabay sounds (both free for commercial use, no attribution). Never use other
   sites or music tracks.
6. `npm run sfx -- remove <name>` deletes a sound (refuses while `src/` still uses it).

Pick `--kind` by role: `whoosh` (movement/transition), `pop` (something appears / UI), `impact`
(hit on a key moment), `riser` (build-up). The kind sets the default mix level.

## Verify (you can't listen — check numerically)

Optional but quick (~1 min, no video frames): render the audio alone and confirm loudness/clipping:

```
npx remotion render <ReelId> out/<slug>/audio.mp3 --codec=mp3
ffmpeg -hide_banner -nostats -i out/<slug>/audio.mp3 -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:"
```

Integrated loudness should stay within ~0.5 LU of the voiceover alone (`public/<slug>/voiceover.mp3`)
and the true peak below -1 dBFS. In the final report, list the cues (frame → sound) and remind the
user that the effects are only in a **fresh** render.
