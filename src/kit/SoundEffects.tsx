/**
 * Sound effects layer for reels. Files live in public/sfx/ (see public/sfx/CREDITS.md).
 *
 *   const CUTS = cutCues(SHOTS);         // 3D: whoosh on every camera-angle change
 *   // const CUTS = sceneCues(SCENES);   // 2D: whoosh on every scene change
 *   const SFX = [
 *     ...CUTS,
 *     ...popCues(CALLOUTS.map((c) => c.from), { avoid: CUTS }),  // pop when a label appears
 *     { at: F("Umpire"), sound: "impact-zoom" },
 *   ];
 *   <SoundEffects cues={SFX} />
 *
 * Need a sound that isn't in the library? `npm run sfx -- search <words>` (Mixkit + Pixabay),
 * then `npm run sfx -- add mixkit:<id> <name> --kind <kind>` (automatic) or, for Pixabay,
 * download it in the browser and `npm run sfx -- import <file> <name> --kind <kind> --source pixabay --id <id>`.
 *
 * Every cue is aligned so the LOUDEST part of the sound lands on `at` (not the file start),
 * so a whoosh peaks exactly on the cut. Files are loudness-matched, and each category has a
 * default level that keeps effects well under the voiceover.
 */
import React from "react";
import { Audio, random, Sequence, staticFile } from "remotion";
import library from "../../public/sfx/library.json";
import type { Shot, Vec3 } from "./three/cameraTrack";

export type SfxKind = "whoosh" | "pop" | "impact" | "riser";

type SfxInfo = {
  kind: string;
  /** Seconds from file start to the loudest moment. */
  peak: number;
  /** Loudness-match multiplier (brings the file to ~-16 LUFS). */
  norm: number;
};

/**
 * The sound list lives in public/sfx/library.json and is maintained by `npm run sfx`
 * (search / add / import), which measures peak + loudness with ffmpeg and regenerates
 * public/sfx/CREDITS.md. Don't hand-edit peak/norm values.
 */
export const SFX_LIBRARY: Record<SfxName, SfxInfo> = library;

export type SfxName = keyof typeof library;

/** Default level per category, relative to a loudness-matched file. Voiceover sits ~-21 LUFS. */
export const SFX_LEVELS: Record<SfxKind, number> = {
  whoosh: 0.3,
  pop: 0.22,
  impact: 0.4,
  riser: 0.3,
};

export type SfxCue = {
  /** Frame where the sound's peak should land. */
  at: number;
  sound: SfxName;
  /** Multiplier on the category level (1 = default). */
  volume?: number;
  /** Speed/pitch (1 = original). Cut/pop helpers add a small random variation. */
  rate?: number;
};

export const SoundEffects: React.FC<{
  cues: SfxCue[];
  /** Overall SFX level (1 = default mix). */
  master?: number;
  fps?: number;
}> = ({ cues, master = 1, fps = 30 }) => (
  <>
    {cues.map((c, i) => {
      const info: SfxInfo = SFX_LIBRARY[c.sound];
      const rate = c.rate ?? 1;
      const start = c.at - Math.round((info.peak / rate) * fps);
      const volume = Math.min(
        1,
        info.norm * (SFX_LEVELS[info.kind as SfxKind] ?? 0.3) * (c.volume ?? 1) * master,
      );
      return (
        <Sequence key={`${c.sound}-${c.at}-${i}`} from={Math.max(0, start)} layout="none">
          <Audio
            src={staticFile(`sfx/${c.sound}.mp3`)}
            volume={volume}
            playbackRate={rate}
            trimBefore={start < 0 ? Math.round(-start * rate) : undefined}
          />
        </Sequence>
      );
    })}
  </>
);

const dist = (a: Vec3, b: Vec3) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Small deterministic pitch/speed wobble so repeated sounds don't feel copy-pasted. */
const wobble = (seed: string) => 0.94 + random(seed) * 0.12;

/**
 * One whoosh per camera-angle change, peaking mid-move (when the camera is fastest).
 * The sound is picked by how far the camera travels: long flights get the big whoosh,
 * small reframes get a soft swoosh. Variants rotate so consecutive cuts differ.
 */
export const cutCues = (
  shots: Shot[],
  opts: {
    big?: SfxName[];
    medium?: SfxName[];
    small?: SfxName[];
    /** Camera travel (world units) above which a move counts as big / below which small. */
    bigOver?: number;
    smallUnder?: number;
    volume?: number;
  } = {},
): SfxCue[] => {
  const {
    big = ["whoosh-epic", "whoosh-cinematic"],
    medium = ["whoosh-motion", "whoosh-fast", "transition-snap"],
    small = ["swoosh-soft", "whoosh-swoosh"],
    bigOver = 40,
    smallUnder = 6,
    volume = 1,
  } = opts;
  const sorted = [...shots].sort((a, b) => a.from - b.from);
  const used = { big: 0, medium: 0, small: 0 };
  return sorted.slice(1).map((s, i) => {
    const prev = sorted[i];
    const travel = dist(prev.pos, s.pos) + 0.5 * dist(prev.target, s.target);
    const size = travel > bigOver ? "big" : travel < smallUnder ? "small" : "medium";
    const pool = size === "big" ? big : size === "medium" ? medium : small;
    const sound = pool[used[size]++ % pool.length];
    const move = s.moveFrames ?? 26;
    return {
      at: s.from + Math.round(move / 2),
      sound,
      volume: volume * (size === "small" ? 0.8 : 1),
      rate: wobble(`cut-${s.from}`),
    };
  });
};

/**
 * 2D reels: one whoosh per scene change. Pass the SCENES boundary array (first entry 0, last
 * entry DURATION); the first and last boundaries are skipped. Variants rotate so cuts differ.
 */
export const sceneCues = (
  boundaries: number[],
  opts: { sounds?: SfxName[]; volume?: number } = {},
): SfxCue[] => {
  const {
    sounds = ["whoosh-motion", "transition-snap", "whoosh-fast", "swoosh-soft"],
    volume = 1,
  } = opts;
  return boundaries
    .slice(1, -1)
    .map((at, i) => ({ at: at + 2, sound: sounds[i % sounds.length], volume, rate: wobble(`scene-${at}`) }));
};

/**
 * Pops for things appearing on screen (labels, callouts, list items). Drops any pop that
 * would land within `gap` frames of another cue in `avoid` (e.g. the cut whooshes),
 * so the mix never stacks two effects on top of each other.
 */
export const popCues = (
  frames: number[],
  opts: { sound?: SfxName; volume?: number; avoid?: SfxCue[]; gap?: number } = {},
): SfxCue[] => {
  const { sound = "pop-sharp", volume = 1, avoid = [], gap = 8 } = opts;
  const out: SfxCue[] = [];
  for (const at of [...frames].sort((a, b) => a - b)) {
    const clash = [...avoid, ...out].some((c) => Math.abs(c.at - at) < gap);
    if (!clash) out.push({ at, sound, volume, rate: wobble(`pop-${at}`) });
  }
  return out;
};
