/**
 * SFX-only audio track for a reel, used to add sound effects to an existing render
 * without re-rendering the video:
 *
 *   npx remotion render SfxTrack out.wav --codec=wav --props='{"reel":"fastag"}'
 *   ffmpeg -i renders/fastag.mp4 -i out.wav -filter_complex amix ... (video copied as-is)
 *
 * `speed` places cues on a sped-up timeline (e.g. 1.2 for a 1.2x export) while the
 * sounds themselves play at normal speed, so they stay crisp.
 */
import React from "react";
import { AbsoluteFill, CalculateMetadataFunction } from "remotion";
import { SFX as FASTAG_SFX, DURATION as FASTAG_DURATION } from "../reels/FastagReel";
import { SFX as RAG_SFX, DURATION as RAG_DURATION } from "../reels/RagReel";
import { SFX as RAG3D_SFX, DURATION as RAG3D_DURATION } from "../reels/Rag3DReel";
import { OUTRO_DURATION } from "./Outro";
import { SfxCue, SoundEffects } from "./SoundEffects";

/** Cues for the brand outro, relative to its first frame (see src/kit/Outro.tsx beats). */
const OUTRO_SFX: SfxCue[] = [
  { at: 2, sound: "whoosh-motion" }, // cut into the end card
  { at: 6, sound: "pop-light" }, // stack layers land
  { at: 10, sound: "pop-light", rate: 1.08 },
  { at: 14, sound: "pop-light", rate: 1.16 },
  { at: 84, sound: "pop-bubble" }, // profile card + Follow button
  { at: 112, sound: "click-ui", volume: 1.3 }, // tap → Following
];

const withOutro = (cues: SfxCue[], reelEnd: number) => [
  ...cues,
  ...OUTRO_SFX.map((c) => ({ ...c, at: c.at + reelEnd })),
];

const TRACKS = {
  fastag: { cues: FASTAG_SFX, duration: FASTAG_DURATION },
  rag: { cues: RAG_SFX, duration: RAG_DURATION },
  "rag-3d": { cues: RAG3D_SFX, duration: RAG3D_DURATION },
  "rag-outro": { cues: withOutro(RAG_SFX, RAG_DURATION), duration: RAG_DURATION + OUTRO_DURATION },
} as const;

export type SfxTrackProps = { reel: keyof typeof TRACKS; speed?: number };

export const calculateSfxTrackMetadata: CalculateMetadataFunction<SfxTrackProps> = ({ props }) => ({
  durationInFrames: Math.ceil(TRACKS[props.reel].duration / (props.speed ?? 1)),
});

export const SfxTrack: React.FC<SfxTrackProps> = ({ reel, speed = 1 }) => (
  <AbsoluteFill style={{ backgroundColor: "black" }}>
    <SoundEffects cues={TRACKS[reel].cues.map((c) => ({ ...c, at: Math.round(c.at / speed) }))} />
  </AbsoluteFill>
);
