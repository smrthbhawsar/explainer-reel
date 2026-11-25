/**
 * CRICKET TECH · EP 2 — how UltraEdge "hears" an edge. 3D explainer in the shared
 * stadium look of EP 1 (DRS / Hawk-Eye), with a broadcast-style UltraEdge panel overlay.
 * Story: a spike isn't always the bat → stump mic → waveform → edge = sharp, pad = broad
 * → match the spike to the video frame → sync drift of 10 ms = 40 cm → faint edges get
 * buried in crowd noise → flat line but out (deflection) → "spike is sound, timing is truth".
 *
 * World layout (see ./cricket/stadium): pitch along x, batter's stumps at x=+10.06,
 * batter in a forward-defensive stance, ball grazing the outside edge (+z side).
 */
import { ThreeCanvas } from "@remotion/three";
import { Caption } from "@remotion/captions";
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from "remotion";
import words from "../../public/ultraedge/captions.json";
import { StylishCaptions } from "../kit/StylishCaptions";
import { phraseFrame } from "../kit/timing";
import { cutCues, popCues, SfxCue, SoundEffects } from "../kit/SoundEffects";
import { CalloutSpec, Callouts } from "../kit/three/Callout";
import { CameraRig } from "../kit/three/CameraRig";
import { makeCameraTrack, Shot, Vec3 } from "../kit/three/cameraTrack";
import { seeded } from "../kit/three/canvasTexture";
import { LookEffects, LookEnvironment } from "../kit/three/looks";
import { SceneHeader } from "../kit/three/SceneHeader";
import {
  Ball,
  Batter,
  BatterPose,
  C,
  clamp,
  Floodlights,
  Ground,
  MONO,
  Pulse,
  ramp,
  Segment,
  STADIUM_LOOK,
  StadiumLights,
  Stands,
  Stumps,
  STUMPS_X,
  win,
} from "./cricket/stadium";

const W = words as Caption[];
const F = (p: string, n = 1) => phraseFrame(W, p, n);
export const DURATION = 1857;

const LOOK = STADIUM_LOOK;
const SPEC = { fov: LOOK.fov, width: 1080, height: 1920 };
const KEYWORDS = ["UltraEdge", "stump mic", "spike", "frame", "sync", "deflection"];

// ---- Batter + ball geometry ------------------------------------------------------------
const BX = 8.3; // batter group origin (under the front foot)
/**
 * Forward defence (right-hander): big stride with the front (left) foot, front knee bent,
 * head and weight over the front knee, high front elbow pointing down the pitch, hands
 * ahead of the blade so the bat angles down next to the front pad ("bat and pad together").
 */
const POSE_DEFEND: BatterPose = {
  fAnkle: [-0.32, 0.09, 0.08],
  fKnee: [-0.42, 0.48, 0.1],
  fHip: [-0.06, 0.83, 0.06],
  bAnkle: [0.45, 0.09, 0.0],
  bKnee: [0.25, 0.46, 0.05], // ~17° flex in the back knee
  bHip: [0.16, 0.85, 0.02],
  pelvis: [0.05, 0.85, 0.04], // hips dropped a little
  chest: [-0.12, 1.24, 0.12], // ~24° lean over the knees (was ~35°)
  // Shoulders sit on the tilted top of the torso (perpendicular to its axis).
  fShoulder: [-0.29, 1.25, 0.15],
  bShoulder: [-0.02, 1.37, 0.12],
  fElbow: [-0.5, 1.15, 0.3],
  bElbow: [-0.24, 1.1, 0.33], // in front of the body, relaxed bottom arm
  hands: [-0.54, 0.93, 0.27],
  head: [-0.25, 1.52, 0.13], // seated on the neck above the top of the torso
  batToe: [-0.44, 0.06, 0.25],
  headTilt: 0.12, // looking down the pitch at the bowler
  headTurn: 0.2, // face opened slightly towards the front shoulder
  lowerHand: true,
  smoothShoulders: true,
};
const BS = 0.7; // ball drawn at ~1.05x real size here (close-up shots)
// Bat blade at y=0.4 sits at local x≈-0.50, z≈0.255; its outside edge is at z≈0.31.
const E: Vec3 = [BX - 0.5, 0.4, 0.38]; // ball centre just touching the outside edge
const A: Vec3 = [E[0] - 3, 0.18, E[2] - 0.03]; // approach start (u = -1)
const D: Vec3 = [E[0] + 1.18, 0.55, E[2] + 0.45]; // after the edge, deflected towards slip (u = 1)
const STRAIGHT: Vec3 = [E[0] + 1.18, 0.49, E[2] + 0.05]; // where it would have gone untouched
const PAD_HIT: Vec3 = [BX - 0.52, 0.3, 0.06]; // front face of the front pad
const TOE: Vec3 = [BX - 0.44, 0.02, 0.25];
const SHOE: Vec3 = [BX - 0.32, 0.06, 0.2];
const MIC: Vec3 = [STUMPS_X, 0.3, 0];

const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
/** Edge delivery: u in [-1, 0] approach A → E, u in [0, 1] deflection E → D. */
const edgeAt = (u: number): Vec3 => (u <= 0 ? lerp3(A, E, u + 1) : lerp3(E, D, Math.min(1, u)));
/** Pad delivery: v in [-1, 0] approach, [0, 1] dead-bat drop back off the pad. */
const PAD_A: Vec3 = [PAD_HIT[0] - 3, 0.14, 0.05];
const PAD_OFF: Vec3 = [PAD_HIT[0] - 0.35, 0.08, -0.2];
const padAt = (v: number): Vec3 =>
  v <= 0 ? lerp3(PAD_A, PAD_HIT, v + 1) : [lerp3(PAD_HIT, PAD_OFF, v)[0], 0.11 + 0.19 * (1 - v) * (1 - v), lerp3(PAD_HIT, PAD_OFF, v)[2]];

/** The 8 video frames shown in the timing section: u = -0.8 … 0.6, contact at index 4. */
const FRAME_U = [-0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6];
const CONTACT = 4;
const SHORT = 2; // "ball bat tak pahunchi hi nahi" — the frame the false spike lands on

// ---- Timeline --------------------------------------------------------------------------
const T = {
  pad: F("Pad"),
  ump: F("Toh third"),
  jawab: F("Jawab"),
  mic: F("stump mic"),
  live: F("Woh har"),
  wave: F("wave banti"),
  rehook: F("Lekin sirf"),
  edge: F("Bat ka edge"),
  edgeHit: F("patla"),
  padv: F("Pad ya"),
  timing: F("Ab asli"),
  match: F("Wave ko"),
  frameOf: F("Spike theek"),
  short: F("Ball bat tak"),
  elsewhere: F("Matlab"),
  problem: F("Par yahan"),
  sync: F("Audio aur"),
  crowd: F("Aur bahut"),
  flat: F("Isiliye"),
  outro: F("Agli baar"),
};
/** Frame the playhead reaches each video frame in "frame by frame". */
const STEP = 7;
const stepAt = (i: number) => F("frame by frame") + i * STEP;

// ---- Shots -----------------------------------------------------------------------------
const SHOTS: Shot[] = [
  // 1 Hook: close side-on at the bat; the ball grazes the outside edge.
  { from: 0, pos: [6.9, 0.75, 3.4], target: [7.9, 0.47, 0.41], drift: [0.25, 0.05, -0.3] },
  // 2 "Pad, zameen, joota" — down at the feet.
  { from: T.pad - 8, pos: [7.0, 0.55, 2.4], target: [7.93, 0.19, 0.11], drift: [0.2, 0, -0.2] },
  // 3 "Toh third umpire…" — pull back to the whole batter + stumps.
  { from: T.ump - 8, pos: [2.0, 2.4, 4.5], target: [8.54, 0.62, 0.07], drift: [0.8, -0.2, -0.4], moveFrames: 30 },
  // 4 "Jawab stumps ke andar" — fly to the stumps.
  { from: T.jawab - 8, pos: [9.0, 0.75, 2.1], target: [10.06, 0.31, 0.01], drift: [0.15, 0.05, -0.25], moveFrames: 32 },
  // 5 "hazaaron baar awaaz" — slow arc around the stumps as the sound rings spread.
  { from: T.live - 6, pos: [9.35, 0.95, 2.0], target: [10.06, 0.34, 0.0], drift: [0.35, 0.05, -0.3] },
  // 6 Re-hook "Lekin sirf spike…" — swing out in front of the batter.
  { from: T.rehook - 8, pos: [4.6, 1.1, 1.6], target: [8.14, 0.73, 0.15], drift: [0.5, -0.05, 0.1] },
  // 7 "Bat ka edge … nukila spike" — close on the edge.
  { from: T.edge - 8, pos: [6.6, 0.7, 3.0], target: [7.92, 0.42, 0.43], drift: [0.2, 0, -0.25] },
  // 8 "Pad ya zameen ki awaaz moti" — on the front pad.
  { from: T.padv - 8, pos: [6.2, 0.65, -1.5], target: [7.85, 0.3, 0.06], drift: [0.2, 0, -0.15] },
  // 9 "Ab asli game — timing" + 10/11 frame by frame — high behind the line of the ball.
  { from: T.timing - 8, pos: [1.6, 3.4, 2.0], target: [6.64, 0.38, 0.39], drift: [0.6, -0.2, 0], moveFrames: 30 },
  // 12 "Ball bat tak pahunchi hi nahi" — closer, ball short of the bat.
  { from: T.short - 8, pos: [6.4, 1.3, 4.6], target: [7.3, 0.32, 0.31], drift: [0.15, 0, -0.25] },
  // 14 Re-hook "Par yahan ek problem" + 15 "10 ms = 40 cm" — square side-on.
  { from: T.problem - 8, pos: [8.1, 0.85, 3.2], target: [8.12, 0.5, 0.45], drift: [0, 0.05, -0.35] },
  // 16 "crowd ke shor" — wide, the stands in view.
  { from: T.crowd - 8, pos: [12.6, 0.8, 2.9], target: [8.14, 0.88, 0.2], drift: [0.3, 0.1, -0.4], moveFrames: 34 },
  // 17 "seedhi line pe bhi out — deflection" — high from the bowler's side, down the line.
  { from: T.flat - 8, pos: [4.6, 3.6, 1.0], target: [8.23, 0.37, 0.56], drift: [0.4, -0.2, 0], moveFrames: 32 },
  // 18 Callback — the hook framing.
  { from: T.outro - 8, pos: [6.9, 0.75, 3.4], target: [7.9, 0.47, 0.41], drift: [0.25, 0.05, -0.3] },
];
const poseAt = makeCameraTrack(SHOTS, DURATION);

// ---- 3D helpers ------------------------------------------------------------------------
/** Small dark microphone capsule inside the middle stump, amber ring. */
const StumpMic: React.FC<{ glow: number }> = ({ glow }) => (
  <group position={MIC}>
    <mesh>
      <capsuleGeometry args={[0.016, 0.06, 6, 12]} />
      <meshStandardMaterial color="#141518" metalness={0.5} roughness={0.35} />
    </mesh>
    <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.02, 0.005, 8, 24]} />
      <meshStandardMaterial color={C.hud} emissive={C.hud} emissiveIntensity={0.6 + 2 * glow} toneMapped={false} />
    </mesh>
    {/* cable down the stump */}
    <mesh position={[0, -0.17, 0]}>
      <cylinderGeometry args={[0.004, 0.004, 0.28, 6]} />
      <meshStandardMaterial color={C.hud} emissive={C.hud} emissiveIntensity={0.4 + glow} />
    </mesh>
  </group>
);

/** Sound ring spreading out from the mic (flat, at mic height). */
const SoundRing: React.FC<{ at: number; r: number }> = ({ at, r }) => {
  const frame = useCurrentFrame();
  const dur = 26;
  if (frame < at || frame > at + dur) return null;
  const t = (frame - at) / dur;
  return (
    <mesh position={MIC} rotation={[-Math.PI / 2, 0, 0]} scale={0.05 + r * t}>
      <ringGeometry args={[0.9, 1, 64]} />
      <meshBasicMaterial color={C.hud} transparent opacity={0.8 * (1 - t)} depthWrite={false} toneMapped={false} />
    </mesh>
  );
};

const World: React.FC = () => {
  const frame = useCurrentFrame();

  // ---- stumps x-ray + mic
  const xray = win(frame, T.jawab, T.rehook) ? ramp(frame, F("stumps") - 4, F("stumps") + 10) * (1 - ramp(frame, T.rehook - 14, T.rehook - 2)) : 0;
  const micGlow = Math.max(0, 1 - Math.abs(frame - T.mic) / 12) + (win(frame, T.live, T.rehook) ? 0.5 + 0.5 * Math.sin(frame / 3) : 0);

  // ---- which ball is on screen, and where
  let ball: { p: Vec3; color?: string; opacity?: number } | null = null;
  let edgeGlow = 0;
  const glowAt = (at: number) => Math.max(0, 1 - Math.abs(frame - at) / 8);
  const edgeRun = (start: number, contact: number, end: number) => {
    const u = interpolate(frame, [start, contact, end], [-1, 0, 1], clamp);
    return edgeAt(u);
  };
  // Hook: already moving at frame 0, grazes the edge at frame 12.
  const HOOK_HIT = 12;
  if (frame < T.pad) {
    const u = interpolate(frame, [0, HOOK_HIT, HOOK_HIT + 30], [-0.45, 0, 1], clamp);
    if (u < 1) ball = { p: edgeAt(u) };
    edgeGlow = glowAt(HOOK_HIT);
  }
  // 3: one more delivery while the question is asked.
  const Q_HIT = F("edge") + 4;
  if (win(frame, T.ump, T.jawab) && frame < Q_HIT + 26) {
    ball = { p: edgeRun(Q_HIT - 20, Q_HIT, Q_HIT + 26) };
    edgeGlow = glowAt(Q_HIT);
  }
  // 7: the edge — contact on "patla".
  const EDGE_HIT = T.edgeHit;
  if (win(frame, T.edge, T.padv)) {
    if (frame < EDGE_HIT + 30) ball = { p: edgeRun(EDGE_HIT - 22, EDGE_HIT, EDGE_HIT + 30) };
    edgeGlow = glowAt(EDGE_HIT) + 0.6 * ramp(frame, F("nukila"), F("nukila") + 6) * (1 - ramp(frame, T.padv - 10, T.padv));
  }
  // 8: the pad — contact on "moti".
  const PAD_HIT_F = F("moti");
  if (win(frame, T.padv, T.timing)) {
    const v = interpolate(frame, [PAD_HIT_F - 22, PAD_HIT_F, PAD_HIT_F + 30], [-1, 0, 1], clamp);
    ball = { p: padAt(v) };
  }
  // 12–13: the ball stopped one metre short while the false spike plays.
  if (win(frame, T.short, T.problem)) ball = { p: edgeAt(FRAME_U[SHORT]), color: C.path };
  // 15: true position (video) at the bat.
  if (win(frame, T.sync, T.crowd)) ball = { p: E };
  // 17: full delivery down the line, with the deflection.
  const DEF_HIT = F("seedhi line") + 6;
  if (win(frame, T.flat, T.outro)) {
    ball = { p: edgeRun(DEF_HIT - 26, DEF_HIT, DEF_HIT + 34) };
  }
  // 18: callback delivery, contact on "spike sirf".
  const OUT_HIT = F("sirf awaaz");
  if (frame >= T.outro) {
    if (frame < OUT_HIT + 30) ball = { p: edgeRun(OUT_HIT - 20, OUT_HIT, OUT_HIT + 30) };
    edgeGlow = glowAt(OUT_HIT) + glowAt(F("timing", 2)) * 1.2;
  }

  // ---- frame-by-frame ghost balls
  const inFrames = win(frame, T.match, T.problem);
  const ghostCount = inFrames ? FRAME_U.filter((_, i) => frame >= stepAt(i)).length : 0;
  const matchLit = win(frame, F("bagal") - 2, T.short) ? 1 : 0;

  // ---- sync: ghost ball 40 cm on
  const inSync = win(frame, T.sync, T.crowd);
  const shift = inSync ? ramp(frame, F("hila") - 4, F("hila") + 14) : 0;
  const ghostSync = edgeAt(0.4 / 2.3 * shift); // ~40 cm along the deflected path
  const bracket = inSync ? ramp(frame, F("chaalees centimeter") - 4, F("chaalees centimeter") + 8) : 0;

  // ---- crowd noise
  const crowd = win(frame, T.crowd, T.flat)
    ? ramp(frame, F("crowd") - 6, F("crowd") + 10) * (0.35 + 0.25 * Math.abs(Math.sin(frame / 2.3)))
    : 0;

  // ---- deflection lines
  const inDef = win(frame, T.flat, T.outro);
  const defLines = inDef ? ramp(frame, F("deflection") - 6, F("deflection") + 10) : 0;
  const trail = inDef ? ramp(frame, DEF_HIT - 26, DEF_HIT, false) : 0;

  return (
    <group>
      <StadiumLights />
      <Ground />
      <Stands glow={crowd} />
      <Floodlights />
      <Stumps x={-STUMPS_X} />
      <Stumps x={STUMPS_X} opacity={1 - 0.75 * xray} />
      {xray > 0.01 && <StumpMic glow={micGlow} />}
      {win(frame, T.live, T.rehook) &&
        Array.from({ length: 12 }, (_, i) => <SoundRing key={i} at={T.live + i * 7} r={1.1} />)}
      <Batter x={BX} pose={POSE_DEFEND} edgeGlow={Math.min(1, edgeGlow)} />

      {ball && <Ball p={ball.p} color={ball.color} opacity={ball.opacity} scale={BS} />}

      {/* contact pulses */}
      <Pulse p={E} at={HOOK_HIT} color={C.hud} size={0.05} />
      <Pulse p={E} at={Q_HIT} color={C.hud} size={0.08} />
      <Pulse p={E} at={EDGE_HIT} color={C.lime} size={0.04} dur={12} />
      <Pulse p={PAD_HIT} at={PAD_HIT_F} color={C.path} size={0.05} dur={30} />
      <Pulse p={[BX - 0.5, 0.35, 0.08]} at={T.pad} color={C.path} size={0.05} />
      <Pulse p={TOE} at={F("zameen")} color={C.path} size={0.05} />
      <Pulse p={SHOE} at={F("joota")} color={C.path} size={0.05} />
      <Pulse p={TOE} at={F("spike aa gaya")} color={C.path} size={0.07} />
      <Pulse p={TOE} at={F("kahin aur")} color={C.path} size={0.07} />
      <Pulse p={MIC} at={T.mic} color={C.hud} size={0.05} />
      <Pulse p={E} at={F("timing", 2)} color={C.lime} size={0.035} dur={20} />

      {/* frame by frame */}
      {FRAME_U.slice(0, ghostCount).map((u, i) => (
        <Ball
          key={i}
          p={edgeAt(u)}
          scale={BS}
          opacity={i === CONTACT && matchLit ? 0.95 : frame >= T.short ? (i === SHORT ? 0 : 0.15) : 0.4}
          color={i === CONTACT && matchLit ? C.lime : C.hud}
        />
      ))}

      {/* sync drift: where the ball is when the late sound is heard */}
      {inSync && shift > 0.01 && <Ball p={ghostSync} color={C.hud} opacity={0.55} scale={BS} />}
      {bracket > 0.01 && (
        <group>
          <Segment a={[E[0], 0.72, E[2]]} b={[E[0] + 0.4 * bracket, 0.72, E[2]]} r={0.008} color={C.hud} glow={1.2} />
          <Segment a={[E[0], 0.66, E[2]]} b={[E[0], 0.78, E[2]]} r={0.008} color={C.hud} glow={1.2} opacity={bracket} />
          <Segment a={[E[0] + 0.4, 0.66, E[2]]} b={[E[0] + 0.4, 0.78, E[2]]} r={0.008} color={C.hud} glow={1.2} opacity={bracket} />
        </group>
      )}

      {/* deflection: path in, real path out, dashed "untouched" line */}
      {inDef && trail > 0.02 && <Segment a={A} b={lerp3(A, E, trail)} r={0.02} color={C.ball} glow={0.4} opacity={0.7} />}
      {defLines > 0.01 && (
        <>
          <Segment a={E} b={lerp3(E, D, defLines)} r={0.025} color={C.hud} glow={1.2} />
          {Array.from({ length: 5 }, (_, i) => {
            const g0 = i / 5;
            const g1 = Math.min((i + 0.55) / 5, defLines);
            return g1 > g0 ? <Segment key={i} a={lerp3(E, STRAIGHT, g0)} b={lerp3(E, STRAIGHT, g1)} r={0.018} color={C.ball} glow={0.3} opacity={0.7} /> : null;
          })}
        </>
      )}
    </group>
  );
};

// ---- Callouts --------------------------------------------------------------------------
const CALLOUTS: CalloutSpec[] = [
  { from: 14, to: T.pad - 8, label: "Edge?", point: E, dx: 0, dy: 0, box: [120, 120] },
  { from: T.pad, to: T.ump - 10, label: "Pad", point: [BX - 0.5, 0.38, 0.08], dx: 0, dy: 0, box: [90, 90], color: C.path },
  { from: F("zameen"), to: T.ump - 10, label: "Ground", point: TOE, dx: 0, dy: 0, box: [80, 80], color: C.path },
  { from: F("joota"), to: T.ump - 10, label: "Shoe", point: SHOE, dx: 0, dy: 0, box: [90, 80], color: C.path },
  { from: F("third umpire"), to: T.jawab - 8, label: "Bat ya pad?", point: E, dx: 0, dy: 0, box: [90, 90] },
  { from: T.mic, to: T.rehook - 10, label: "Stump mic", point: MIC, dx: 0, dy: 0, box: [110, 110] },
  { from: T.edgeHit, to: T.padv - 8, label: "Edge", point: E, dx: 0, dy: 0, box: [100, 100], color: C.lime },
  { from: F("moti"), to: T.timing - 8, label: "Pad", point: PAD_HIT, dx: 0, dy: 0, box: [110, 110], color: C.path },
  { from: F("bagal"), to: T.short - 6, label: "Frame 5", point: E, dx: 0, dy: 0, box: [90, 90], color: C.lime },
  { from: T.short + 4, to: T.problem - 6, label: "1 m short", point: edgeAt(FRAME_U[SHORT]), dx: 0, dy: 0, box: [90, 90], color: C.path },
  { from: F("kahin aur"), to: T.problem - 6, label: "Bat → ground", point: TOE, dx: 0, dy: 0, box: [80, 80], color: C.path },
  { from: F("hila"), to: T.crowd - 8, label: "+10 ms", point: () => edgeAt(0.4 / 2.3), dx: 0, dy: 0, box: [90, 90] },
  { from: F("chaalees centimeter"), to: T.crowd - 8, label: "40 cm", point: [E[0] + 0.2, 0.72, E[2]], dx: 0, dy: 0, box: [170, 60] },
  { from: F("deflection"), to: T.outro - 8, label: "Deflection", point: lerp3(E, D, 0.3), dx: 0, dy: 0, box: [100, 100] },
];

// ---- UltraEdge panel (2D overlay) ------------------------------------------------------
type Spike = { x: number; amp: number; width: number; freq: number; color: string; label?: string };
const EDGE_SPIKE = (x: number, color = C.lime, label?: string): Spike => ({ x, amp: 1, width: 0.006, freq: 260, color, label });
const PAD_BLOB = (x: number, label?: string): Spike => ({ x, amp: 0.75, width: 0.05, freq: 45, color: C.path, label });

const PANEL = { left: 90, top: 300, w: 900, h: 300 };
const CELLS = FRAME_U.length;
const cellX = (i: number) => 0.06 + (i + 0.5) * (0.88 / CELLS); // 0..1 across the wave

const noiseAt = (() => {
  const rnd = seeded(7);
  const n = Array.from({ length: 2048 }, () => rnd() * 2 - 1);
  return (i: number) => n[((i % 2048) + 2048) % 2048];
})();

const WavePath: React.FC<{
  spikes: Spike[];
  noise: number;
  scroll: number;
  reveal: number;
  shift: number;
  width: number;
  height: number;
  frame: number;
}> = ({ spikes, noise, scroll, reveal, shift, width, height, frame }) => {
  const N = 360;
  const mid = height / 2;
  const pts: string[] = [];
  for (let i = 0; i <= N * reveal; i++) {
    const x = i / N;
    let y = noise * noiseAt(i + Math.floor(scroll)) * 0.9;
    for (const s of spikes) {
      const dx = x - (s.x + shift);
      const env = Math.exp(-((dx / s.width) ** 2));
      if (env > 0.002) y += s.amp * env * Math.sin(dx * s.freq * 6.283 + frame * 0.0);
    }
    pts.push(`${(x * width).toFixed(1)},${(mid - y * mid * 0.92).toFixed(1)}`);
  }
  return <polyline points={pts.join(" ")} fill="none" stroke={C.ball} strokeWidth={3} strokeLinejoin="round" />;
};

type PanelState = {
  show: number;
  spikes: Spike[];
  noise: number;
  scroll: number;
  reveal: number;
  strip: number; // film strip visible (0..1)
  cellsLit: number;
  playhead: number | null; // cell index (can be fractional)
  shift: number; // wave x offset (sync drift)
  status: string;
  statusColor: string;
};

const panelState = (f: number): PanelState => {
  const base: PanelState = {
    show: 1,
    spikes: [],
    noise: 0.05,
    scroll: 0,
    reveal: 1,
    strip: 0,
    cellsLit: 0,
    playhead: null,
    shift: 0,
    status: "",
    statusColor: LOOK.ink,
  };
  // 1–2: hook + "pad, zameen, joota"
  if (f < T.ump) {
    const fade = 1 - ramp(f, T.ump - 10, T.ump);
    const s: Spike[] = [];
    if (f >= 12) s.push({ ...EDGE_SPIKE(0.5, C.hud), amp: interpolate(f, [12, 16], [0, 1], clamp) });
    if (f >= T.pad) s.push({ ...EDGE_SPIKE(0.18, C.path), amp: 0.85 });
    if (f >= F("zameen")) s.push({ ...EDGE_SPIKE(0.32, C.path), amp: 0.9 });
    if (f >= F("joota")) s.push({ ...EDGE_SPIKE(0.8, C.path), amp: 0.8 });
    const status = f < 12 ? "LISTENING" : f < F("zaroori") ? "SPIKE!" : f < T.pad ? "BAT KI AWAAZ?" : "SAB SPIKE";
    return {
      ...base,
      show: fade,
      spikes: s,
      reveal: interpolate(f, [0, 12], [0.55, 1], clamp),
      status,
      statusColor: f >= F("zaroori") ? C.path : C.hud,
    };
  }
  // 3–4: hidden while we look for the answer
  if (f < T.wave - 4) return { ...base, show: 0 };
  // 5–6: live audio
  if (f < T.edge) {
    return {
      ...base,
      show: ramp(f, T.wave - 4, T.wave + 6),
      noise: 0.12,
      scroll: (f - T.wave) * 4,
      reveal: interpolate(f, [T.wave - 4, T.wave + 18], [0.05, 1], clamp),
      status: "LIVE AUDIO",
      statusColor: C.hud,
    };
  }
  // 7–8: edge = sharp, pad = broad
  if (f < T.timing) {
    const s: Spike[] = [];
    if (f >= T.edgeHit) s.push({ ...EDGE_SPIKE(0.28, C.lime, "EDGE"), amp: interpolate(f, [T.edgeHit, T.edgeHit + 3], [0, 1], clamp) });
    if (f >= F("moti")) s.push({ ...PAD_BLOB(0.7, "PAD"), amp: 0.75 * interpolate(f, [F("moti"), F("moti") + 6], [0, 1], clamp) });
    return {
      ...base,
      spikes: s,
      noise: 0.06,
      status: f < T.padv ? "EDGE = PATLA SPIKE" : "PAD = MOTI WAVE",
      statusColor: f < T.padv ? C.lime : C.path,
    };
  }
  // 9–11: match the wave to the video frames
  if (f < T.short) {
    const head =
      f < F("frame by frame")
        ? null
        : Math.min(CONTACT, Math.floor((f - F("frame by frame")) / STEP));
    const matched = f >= F("bagal");
    return {
      ...base,
      spikes: [EDGE_SPIKE(cellX(CONTACT), matched ? C.lime : C.ball)],
      strip: ramp(f, T.timing + 4, T.timing + 16),
      cellsLit: Math.round(interpolate(f, [T.timing + 4, T.match], [0, CELLS], clamp)),
      playhead: head,
      status: matched ? "MATCH ✓" : f >= T.match ? "FRAME BY FRAME" : "TIMING",
      statusColor: matched ? C.lime : C.hud,
    };
  }
  // 12–13: spike lands while the ball is still short
  if (f < T.problem) {
    return {
      ...base,
      spikes: [EDGE_SPIKE(cellX(SHORT), C.path)],
      strip: 1,
      cellsLit: CELLS,
      playhead: SHORT,
      status: f < F("spike aa gaya") ? "FRAME 3" : f < T.elsewhere ? "NO MATCH ✕" : "BAT NAHI",
      statusColor: f < F("spike aa gaya") ? C.hud : C.path,
    };
  }
  // 14–15: sync drift
  if (f < T.crowd) {
    const sh = f >= T.sync ? ramp(f, F("hila") - 4, F("hila") + 14) * 0.6 * (0.88 / CELLS) : 0;
    return {
      ...base,
      spikes: [EDGE_SPIKE(cellX(CONTACT), f >= F("hila") ? C.path : C.lime)],
      strip: 1,
      cellsLit: CELLS,
      playhead: CONTACT,
      shift: sh,
      status: f < F("hila") ? "" : "SYNC +10 MS",
      statusColor: C.path,
    };
  }
  // 16: crowd noise buries a faint edge
  if (f < T.flat) {
    const loud = ramp(f, F("crowd") - 6, F("crowd") + 14);
    return {
      ...base,
      spikes: [{ ...EDGE_SPIKE(cellX(CONTACT), C.ball), amp: 0.28 }],
      noise: 0.05 + 0.5 * loud,
      scroll: f * 3,
      strip: 1,
      cellsLit: CELLS,
      playhead: CONTACT,
      status: f < F("halka") ? "" : f < F("crowd") ? "HALKA EDGE" : "CROWD NOISE",
      statusColor: C.path,
    };
  }
  // 17: flat line, still out
  if (f < T.outro) {
    return {
      ...base,
      noise: 0.03,
      scroll: f * 2,
      strip: 1,
      cellsLit: CELLS,
      playhead: CONTACT,
      status: f < F("deflection") ? "FLAT LINE" : "OUT · DEFLECTION",
      statusColor: f < F("deflection") ? LOOK.ink : C.hud,
    };
  }
  // 18: callback — spike, then timing locks it
  const locked = f >= F("timing", 2);
  return {
    ...base,
    spikes: f >= F("sirf awaaz") ? [EDGE_SPIKE(cellX(CONTACT), locked ? C.lime : C.hud)] : [],
    strip: 1,
    cellsLit: CELLS,
    playhead: locked ? CONTACT : null,
    status: locked ? "TIMING ✓" : f >= F("sirf awaaz") ? "SPIKE = AWAAZ" : "",
    statusColor: locked ? C.lime : C.hud,
  };
};

/** One video-frame thumbnail: bat line + ball position for that frame. */
const FrameCell: React.FC<{ i: number; x: number; w: number; h: number; lit: boolean; active: boolean; tint: string }> = ({
  i,
  x,
  w,
  h,
  lit,
  active,
  tint,
}) => {
  const bx = w * 0.62;
  const ballX = bx - 12 + FRAME_U[i] * w * 0.75;
  return (
    <g transform={`translate(${x},0)`} opacity={lit ? 1 : 0.25}>
      <rect width={w} height={h} fill="#4C5647" stroke={active ? tint : "#2A2E33"} strokeWidth={active ? 5 : 2} />
      <rect x={bx - 3} y={h * 0.18} width={6} height={h * 0.7} fill={C.pitch} />
      {ballX > 4 && ballX < w - 4 && <circle cx={ballX} cy={h * 0.58} r={7} fill={C.ball} />}
      <text x={6} y={16} fill={LOOK.ink} fontFamily={MONO} fontSize={13} fontWeight={700}>
        F{i + 1}
      </text>
    </g>
  );
};

const UltraEdgePanel: React.FC = () => {
  const frame = useCurrentFrame();
  const s = panelState(frame);
  if (s.show <= 0.01) return null;
  const { w, h } = PANEL;
  const headerH = 48;
  const stripH = 78 * s.strip;
  const waveTop = headerH + 10 + (stripH > 0 ? stripH + 10 : 0);
  const waveH = h - waveTop - 10;
  const innerX = 0;
  const cellW = (w * 0.88) / CELLS - 8;
  const tint = s.statusColor;
  return (
    <div
      style={{
        position: "absolute",
        left: PANEL.left,
        top: PANEL.top,
        width: w,
        height: h,
        opacity: s.show,
        transform: `translateY(${(1 - s.show) * -20}px)`,
        background: "rgba(20,21,24,0.86)",
        border: `2px solid rgba(244,244,242,0.18)`,
      }}
    >
      <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
        {/* header */}
        <text x={20} y={33} fill={C.hud} fontFamily={MONO} fontSize={24} fontWeight={700} letterSpacing="0.12em">
          ◆ ULTRAEDGE
        </text>
        {s.status && (
          <g>
            <rect x={w - 20 - s.status.length * 16 - 24} y={9} width={s.status.length * 16 + 24} height={32} fill={tint} />
            <text x={w - 32} y={33} textAnchor="end" fill="#141518" fontFamily={MONO} fontSize={22} fontWeight={700} letterSpacing="0.06em">
              {s.status}
            </text>
          </g>
        )}
        <line x1={0} x2={w} y1={headerH} y2={headerH} stroke="rgba(244,244,242,0.15)" strokeWidth={2} />
        {/* film strip */}
        {s.strip > 0.01 && (
          <g transform={`translate(${innerX},${headerH + 10})`} opacity={s.strip}>
            {Array.from({ length: CELLS }, (_, i) => (
              <FrameCell
                key={i}
                i={i}
                x={cellX(i) * w - cellW / 2}
                w={cellW}
                h={stripH}
                lit={i < s.cellsLit}
                active={s.playhead !== null && Math.round(s.playhead) === i}
                tint={tint}
              />
            ))}
          </g>
        )}
        {/* wave */}
        <g transform={`translate(0,${waveTop})`}>
          <line x1={0} x2={w} y1={waveH / 2} y2={waveH / 2} stroke="rgba(244,244,242,0.12)" strokeWidth={2} />
          {/* coloured spike highlights under the white trace */}
          {s.spikes.map((sp, i) => {
            const cx = (sp.x + s.shift) * w;
            const half = Math.max(10, sp.width * w * 2.2);
            return (
              <g key={i}>
                <rect x={cx - half} y={4} width={half * 2} height={waveH - 8} fill={sp.color} opacity={0.22 * Math.min(1, sp.amp + 0.2)} />
                {sp.label && (
                  <text x={cx} y={waveH - 8} textAnchor="middle" fill={sp.color} fontFamily={MONO} fontSize={20} fontWeight={700}>
                    {sp.label}
                  </text>
                )}
              </g>
            );
          })}
          <WavePath
            spikes={s.spikes}
            noise={s.noise}
            scroll={s.scroll}
            reveal={s.reveal}
            shift={s.shift}
            width={w}
            height={waveH}
            frame={frame}
          />
          {/* playhead */}
          {s.playhead !== null && (
            <g>
              <line
                x1={cellX(s.playhead) * w}
                x2={cellX(s.playhead) * w}
                y1={-(stripH + 10)}
                y2={waveH}
                stroke={tint}
                strokeWidth={4}
              />
            </g>
          )}
          {/* sync drift arrow */}
          {s.shift > 0.002 && (
            <g>
              <line x1={cellX(CONTACT) * w} x2={(cellX(CONTACT) + s.shift) * w} y1={14} y2={14} stroke={C.path} strokeWidth={4} />
              <text x={(cellX(CONTACT) + s.shift) * w + 10} y={22} fill={C.path} fontFamily={MONO} fontSize={20} fontWeight={700}>
                10 MS
              </text>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};

// ---- Header sections + sound -----------------------------------------------------------
const SECTIONS = [
  { from: 0, label: "UltraEdge" },
  { from: T.ump, label: "Third umpire" },
  { from: T.jawab, label: "Stump mic" },
  { from: T.edge, label: "Edge vs pad" },
  { from: T.timing, label: "Timing" },
  { from: T.problem, label: "Sync" },
  { from: T.crowd, label: "Crowd noise" },
  { from: T.flat, label: "Deflection" },
  { from: T.outro, label: "UltraEdge" },
];

const CUT_SFX = cutCues(SHOTS);
const SFX: SfxCue[] = [
  ...CUT_SFX,
  ...popCues(
    CALLOUTS.map((c) => c.from),
    { avoid: CUT_SFX },
  ),
  // frame-by-frame steps tick like a jog wheel
  ...Array.from({ length: CONTACT + 1 }, (_, i): SfxCue => ({ at: stepAt(i), sound: "click-ui", volume: 0.7 })),
  { at: F("timing", 2), sound: "riser-short", volume: 0.8 },
  { at: F("timing", 2), sound: "impact-zoom" },
];

export const UltraEdgeReel: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: LOOK.bg }}>
    <Audio src={staticFile("ultraedge/voiceover.mp3")} />
    <SoundEffects cues={SFX} />
    <ThreeCanvas width={1080} height={1920} shadows camera={{ fov: LOOK.fov, near: 0.05, far: 200 }}>
      <CameraRig poseAt={poseAt} fov={LOOK.fov} />
      <LookEnvironment look={LOOK} floor={false} />
      <World />
      <LookEffects look={LOOK} />
    </ThreeCanvas>
    <Callouts items={CALLOUTS} poseAt={poseAt} spec={SPEC} variant={LOOK.callout} color={LOOK.accent.primary} plate={LOOK.plate} />
    <UltraEdgePanel />
    <SceneHeader
      variant="tag"
      series="Cricket Tech · EP 2"
      sections={SECTIONS}
      duration={DURATION}
      ink={LOOK.ink}
      accent={LOOK.accent.primary}
    />
    <StylishCaptions src="ultraedge/captions.json" keywords={KEYWORDS} variant={LOOK.caption} accent={LOOK.accent.primary} />
  </AbsoluteFill>
);
