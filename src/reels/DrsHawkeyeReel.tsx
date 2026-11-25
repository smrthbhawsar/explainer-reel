/**
 * How DRS / Hawk-Eye works — 3D explainer in the "tactical" look, set in a dusky
 * stadium under floodlights. Story: ball stops on the pad → six cameras → triangulation
 * → tracked 3D path → physics prediction (dashed) → three DRS questions → Umpire's Call.
 *
 * World layout: the pitch runs along x (bowler's stumps x=-10.06, batter's stumps
 * x=+10.06), 1 unit = 1 metre. The ball is drawn ~1.5x real size so it reads on a phone.
 */
import { ThreeCanvas } from "@remotion/three";
import { Caption } from "@remotion/captions";
import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  BoxGeometry,
  CatmullRomCurve3,
  DoubleSide,
  EdgesGeometry,
  Vector3,
} from "three";
import words from "../../public/drs-hawkeye/captions.json";
import { StylishCaptions } from "../kit/StylishCaptions";
import { phraseFrame } from "../kit/timing";
import { cutCues, popCues, SfxCue, SoundEffects } from "../kit/SoundEffects";
import { CalloutSpec, Callouts } from "../kit/three/Callout";
import { CameraRig } from "../kit/three/CameraRig";
import { makeCameraTrack, Shot, Vec3 } from "../kit/three/cameraTrack";
import { useCanvasTexture } from "../kit/three/canvasTexture";
import { LookEffects, LookEnvironment } from "../kit/three/looks";
import { SceneHeader } from "../kit/three/SceneHeader";
import {
  Along,
  Ball,
  BALL_R,
  Batter,
  C,
  clamp,
  Floodlights,
  Ground,
  lookQuat,
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
export const DURATION = 1847;

// Shared CRICKET TECH stadium look (tactical, dusky floodlit stadium).
const LOOK = STADIUM_LOOK;
const SPEC = { fov: LOOK.fov, width: 1080, height: 1920 };
const KEYWORDS = [
  "DRS",
  "Hawk-Eye",
  "high-speed cameras",
  "triangulation",
  "3D path",
  "physics",
  "prediction",
  "Umpire's Call",
];

// ---- Ball path -------------------------------------------------------------------------
const REL: Vec3 = [-9.0, 2.25, -0.3];
const BOUNCE: Vec3 = [3.6, 0.072, 0.0];
const HIT: Vec3 = [STUMPS_X, 0.52, 0.06];

/** Pre-bounce: s in [0,1] from release to bounce (dipping, late swing). */
const preBounce = (s: number): Vec3 => [
  REL[0] + (BOUNCE[0] - REL[0]) * s,
  REL[1] + (BOUNCE[1] - REL[1]) * (0.55 * s + 0.45 * s * s),
  REL[2] + (BOUNCE[2] - REL[2]) * s * s,
];
/** Post-bounce: s in [0,1] from bounce to the stumps (rising, flattening). */
const postBounce = (s: number): Vec3 => [
  BOUNCE[0] + (HIT[0] - BOUNCE[0]) * s,
  BOUNCE[1] + (HIT[1] - BOUNCE[1]) * (1 - (1 - s) * (1 - s)),
  BOUNCE[2] + (HIT[2] - BOUNCE[2]) * s,
];
const PAD_S = (9.15 - BOUNCE[0]) / (HIT[0] - BOUNCE[0]);
const PAD = postBounce(PAD_S);
/** Ball position mid-flight used for the triangulation shots. */
const MID = preBounce(0.5);

// ---- Camera towers (6, on an oval around the ground) -----------------------------------
const TOWER_H = 9;
const towerPos = (deg: number): Vec3 => {
  const a = (deg * Math.PI) / 180;
  return [20 * Math.cos(a), TOWER_H, 12 * Math.sin(a)];
};
const TOWER_DEG = [40, 90, 140, 220, 270, 320];
const TOWERS = TOWER_DEG.map(towerPos);
const CAM_A = TOWERS[1]; // side-on
const CAM_B = TOWERS[5]; // behind the batter's end

// ---- Shots -----------------------------------------------------------------------------
const SHOTS: Shot[] = [
  // 1 Hook: close on the pad, dashed path running on to the stumps.
  { from: 0, pos: [6.8, 1.0, 2.4], target: [9.5, 0.33, 0.05], drift: [0.3, 0.05, -0.25] },
  // 2 "Ball toh pad pe ruk gayi thi" — wider, from the bowler's side.
  { from: F("Ball toh pad") - 8, pos: [5.0, 1.7, 3.3], target: [9.0, 0.42, 0], drift: [0.3, 0, 0.2] },
  // 3 "Yahin aata hai Hawk-Eye" — crane up to the whole stadium.
  { from: F("Yahin aata") - 6, pos: [-58, 54, 0], target: [-3, 0, 0], drift: [3, 0, 2], moveFrames: 40 },
  // 4 "chhe high-speed cameras" — slow orbit over the ring of towers.
  { from: F("Stadium ke") - 6, pos: [-55, 54, 2], target: [-3, 0, 0], drift: [0, 0, -5] },
  // 5 "Har camera ... frames" — fly to camera A and its frame screen.
  { from: F("Har camera") - 10, pos: [1.0, 12.5, 21.5], target: [0, 9.9, 11.5], drift: [-0.4, -0.2, -0.6], moveFrames: 34 },
  // 6 "ek camera akela kaafi nahi" — behind camera A, looking down its sight-line.
  { from: F("Lekin ek camera") - 8, pos: [7, 15, 21], target: [-1.5, 3.8, 4.5], drift: [-0.5, -0.3, -0.5] },
  // 7 "Do cameras ... lines milti hain" — beyond camera B, both lines in view.
  { from: F("Do cameras") - 8, pos: [40, 34, -26], target: [7, 3, 1], drift: [-0.8, -0.5, 0.8] },
  // 8 "triangulation" — steeper overhead on the triangle.
  { from: F("Ise kehte") - 6, pos: [38, 52, -18], target: [9, 2, 1], drift: [-1, 1, 0] },
  // 9 "3D path — release se bounce tak" — broadcast view from behind the bowler.
  { from: F("Har frame ki") - 10, pos: [-17.5, 5.6, 0.4], target: [3, -0.6, 0], drift: [1, -0.1, 0], moveFrames: 34 },
  // 10 "Pad ke baad koi data nahi" — close on the pad, empty space behind it.
  { from: F("Ab asli") - 6, pos: [7.4, 1.1, 2.2], target: [9.55, 0.5, 0.05], drift: [0.2, -0.05, -0.2] },
  // 11 "physics — speed, swing, bounce ka angle" — mid view from the bowler's side.
  { from: F("Toh software") - 8, pos: [-6, 4.5, 1.4], target: [6.5, -1.3, 0], drift: [0.6, -0.1, -0.3] },
  // 12 "Wahi dashed line hai" — low side-on, close on pad → stumps.
  { from: F("Wahi dashed") - 8, pos: [8.0, 0.9, 2.6], target: [9.6, 0.35, 0.05], drift: [0.2, 0, -0.25] },
  // 13 "Phir teen sawaal" — classic Hawk-Eye view, high behind the bowler.
  { from: F("Phir teen") - 8, pos: [-19, 8.5, 0], target: [4, -3, 0], drift: [0.6, -0.2, 0] },
  // 14 "bas chhoo rahi ho — Umpire's Call" — face-on to the stumps.
  { from: F("Agar ball stumps") - 8, pos: [7.6, 0.55, 0], target: [10.06, 0.2, 0], drift: [0.2, 0, 0] },
  // 15 Callback — back to the hook framing.
  { from: F("Agli baar") - 8, pos: [6.9, 1.05, 2.5], target: [9.5, 0.33, 0.05], drift: [0.3, 0.05, -0.25] },
];
const poseAt = makeCameraTrack(SHOTS, DURATION);

const T = {
  hawk: F("Yahin aata"),
  frames: F("Har camera"),
  oneCam: F("Lekin ek camera"),
  twoCams: F("Do cameras"),
  tri: F("Ise kehte"),
  path: F("Har frame ki"),
  twist: F("Ab asli"),
  physics: F("Toh software"),
  dashed: F("Wahi dashed"),
  verdict: F("Phir teen"),
  umpire: F("Agar ball stumps"),
  outro: F("Agli baar"),
};

const CONE_TARGET: Vec3 = [2, 0.5, 0];
const CameraTower: React.FC<{ p: Vec3; lit: number; cone: number }> = ({ p, lit, cone }) => {
  const q = useMemo(() => lookQuat(p, CONE_TARGET), [p]);
  return (
    <group>
      <mesh position={[p[0], p[1] / 2, p[2]]}>
        <cylinderGeometry args={[0.08, 0.12, p[1], 8]} />
        <meshStandardMaterial color="#25292E" />
      </mesh>
      <group position={p} quaternion={q}>
        <mesh castShadow>
          <boxGeometry args={[0.55, 0.45, 0.8]} />
          <meshStandardMaterial color="#1C1E21" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.48]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.2, 18]} />
          <meshStandardMaterial color="#111214" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* tally light */}
        <mesh position={[0, 0.3, 0.2]}>
          <boxGeometry args={[0.2, 0.08, 0.2]} />
          <meshStandardMaterial color={C.hud} emissive={C.hud} emissiveIntensity={0.3 + 2.2 * lit} toneMapped={false} />
        </mesh>
      </group>
      {/* view cone from the lens to the pitch (apex at the camera) */}
      {cone > 0.01 && (
        <Along a={CONE_TARGET} b={p}>
          {(len) => (
            <mesh>
              <coneGeometry args={[2.2, len, 32, 1, true]} />
              <meshBasicMaterial color={C.hud} transparent opacity={0.09 * cone} side={DoubleSide} depthWrite={false} />
            </mesh>
          )}
        </Along>
      )}
    </group>
  );
};

const SCREEN_POS: Vec3 = [CAM_A[0], CAM_A[1] + 2.1, CAM_A[2] + 0.6];
const SCREEN_W = 2.6;
const SCREEN_H = 1.625;
/** Floating "what the camera sees" frame above camera A: the ball blob moves, gets bracketed. */
const FrameScreen: React.FC<{ scale: number }> = ({ scale }) => {
  const frame = useCurrentFrame();
  const tex = useCanvasTexture(640, 400, (ctx, w, h) => {
    ctx.fillStyle = "#4C5647";
    ctx.fillRect(0, 0, w, h);
    // pitch in perspective
    ctx.fillStyle = "#9E9276";
    ctx.beginPath();
    ctx.moveTo(w * 0.44, h * 0.12);
    ctx.lineTo(w * 0.56, h * 0.12);
    ctx.lineTo(w * 0.7, h);
    ctx.lineTo(w * 0.3, h);
    ctx.fill();
    // pixel grid
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // frame chrome
    ctx.strokeStyle = "#F4F4F2";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.fillStyle = "rgba(20,21,24,0.8)";
    ctx.fillRect(0, 0, w, 44);
    ctx.fillStyle = "#F4F4F2";
    ctx.font = "bold 24px Consolas, monospace";
    ctx.fillText("CAM 2  ●REC", 16, 30);
    ctx.fillText("100+ FPS", w - 140, 30);
  });
  const q = useMemo(() => lookQuat(SCREEN_POS, [1.0, 12.5, 21.5]), []);
  // Ball blob runs down the pitch, one delivery every 36 frames.
  const u = (((frame - T.frames) % 36) + 36) % 36 / 36;
  const bx = 0.02 + 0.06 * u;
  const by = 0.55 - 1.2 * u;
  const bs = 0.035 + 0.04 * u;
  const bracket = ramp(frame, F("ball", 3) - 2, F("ball", 3) + 6);
  const arm = 0.06;
  const half = bs + 0.07 + (1 - bracket) * 0.12;
  const cells = 12;
  const lit = Math.floor((frame - T.frames) / 2) % (cells + 1);
  return (
    <group position={SCREEN_POS} quaternion={q} scale={scale}>
      <mesh>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* the ball: a few bright pixels */}
      <mesh position={[bx, by, 0.01]}>
        <planeGeometry args={[bs * 2, bs * 2]} />
        <meshBasicMaterial color={C.ball} toneMapped={false} />
      </mesh>
      {/* detection bracket snaps on "ball" */}
      {bracket > 0.01 &&
        ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).map(([sx, sy]) => (
          <group key={`${sx}${sy}`} position={[bx + sx * half, by + sy * half, 0.02]}>
            <mesh position={[-sx * arm / 2, 0, 0]}>
              <planeGeometry args={[arm, 0.018]} />
              <meshBasicMaterial color={C.hud} transparent opacity={bracket} toneMapped={false} />
            </mesh>
            <mesh position={[0, -sy * arm / 2, 0]}>
              <planeGeometry args={[0.018, arm]} />
              <meshBasicMaterial color={C.hud} transparent opacity={bracket} toneMapped={false} />
            </mesh>
          </group>
        ))}
      {/* film strip under the frame: cells fill as frames are captured */}
      {Array.from({ length: cells }, (_, i) => (
        <mesh key={i} position={[-SCREEN_W / 2 + 0.11 + i * ((SCREEN_W - 0.22) / (cells - 1)), -SCREEN_H / 2 - 0.12, 0]}>
          <planeGeometry args={[0.16, 0.12]} />
          <meshBasicMaterial color={i < lit ? C.hud : "#2A2E33"} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

/** Tracked path points, release → bounce → pad. `TRACK_CURVE.getPoint(t)` is index-uniform. */
const TRACK_PTS: Vector3[] = [
  ...Array.from({ length: 24 }, (_, i) => new Vector3(...preBounce(i / 23))),
  ...Array.from({ length: 12 }, (_, i) => new Vector3(...postBounce(((i + 1) / 12) * PAD_S))),
];
const TRACK_CURVE = new CatmullRomCurve3(TRACK_PTS);
const T_BOUNCE = 23 / (TRACK_PTS.length - 1);
const trackAt = (t: number): Vec3 => {
  const v = TRACK_CURVE.getPoint(Math.min(1, Math.max(0, t)));
  return [v.x, v.y, v.z];
};

/** Solid red tube along the tracked path, drawn from release up to `upTo` (0..1). */
const PathTube: React.FC<{ upTo?: number; glow?: number }> = ({ upTo = 1, glow = 0.7 }) => {
  const q = Math.max(0.01, Math.round(upTo * 200) / 200);
  const curve = useMemo(() => {
    const n = Math.max(2, Math.round(60 * q));
    return new CatmullRomCurve3(
      Array.from({ length: n + 1 }, (_, i) => TRACK_CURVE.getPoint((i / n) * q)),
    );
  }, [q]);
  return (
    <mesh>
      <tubeGeometry key={q} args={[curve, Math.max(4, Math.round(90 * q)), 0.035, 8, false]} />
      <meshStandardMaterial color={C.path} emissive={C.path} emissiveIntensity={glow} />
    </mesh>
  );
};

/** Predicted path: dashed, from the pad to the stumps, revealed up to `upTo` (0..1). */
const predAt = (g: number): Vec3 => postBounce(PAD_S + (1 - PAD_S) * g);
const PredictedPath: React.FC<{ upTo?: number; glow?: number }> = ({ upTo = 1, glow = 0.9 }) => {
  const dashes = 7;
  return (
    <group>
      {Array.from({ length: dashes }, (_, i) => {
        const g0 = i / dashes;
        const g1 = Math.min((i + 0.55) / dashes, upTo);
        if (g1 <= g0 + 0.005) return null;
        return <Segment key={i} a={predAt(g0)} b={predAt(g1)} r={0.035} color={C.path} glow={glow} />;
      })}
    </group>
  );
};

/** Frame-by-frame position dots ("har frame ki position"). */
const FrameDots: React.FC<{ count: number; opacity?: number }> = ({ count, opacity = 1 }) => (
  <group>
    {TRACK_PTS.slice(0, count).map((p, i) => (
      <mesh key={i} position={p}>
        <sphereGeometry args={[0.06, 12, 10]} />
        <meshStandardMaterial
          color={C.hud}
          emissive={C.hud}
          emissiveIntensity={1.2}
          toneMapped={false}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
    ))}
  </group>
);

/** Sight-line from a camera through the ball, extended beyond it. */
const rayEnd = (from: Vec3, through: Vec3, k: number): Vec3 => [
  from[0] + (through[0] - from[0]) * k,
  from[1] + (through[1] - from[1]) * k,
  from[2] + (through[2] - from[2]) * k,
];

/** Flat marker ring on the ground (pitch map). */
const GroundRing: React.FC<{ p: Vec3; r: number; color: string; opacity: number }> = ({ p, r, color, opacity }) =>
  opacity <= 0.01 ? null : (
    <mesh position={[p[0], 0.02, p[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[r * 0.72, r, 40]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  );

/** Translucent triangle camera A — camera B — ball. */
const TriangleFill: React.FC<{ opacity: number }> = ({ opacity }) => {
  const pos = useMemo(() => new Float32Array([...CAM_A, ...CAM_B, ...MID]), []);
  if (opacity <= 0.01) return null;
  return (
    <mesh>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
      </bufferGeometry>
      <meshBasicMaterial color={C.hud} transparent opacity={opacity} side={DoubleSide} depthWrite={false} />
    </mesh>
  );
};

/** The empty space behind the pad where there is no tracking data. */
const NO_DATA_BOX = new BoxGeometry(STUMPS_X + 0.1 - (PAD[0] + 0.12), 0.85, 0.5);
const NO_DATA_EDGES = new EdgesGeometry(NO_DATA_BOX);
const NoDataZone: React.FC<{ opacity: number; blink: number }> = ({ opacity, blink }) =>
  opacity <= 0.01 ? null : (
    <group position={[(PAD[0] + 0.12 + STUMPS_X + 0.1) / 2, 0.425, 0.05]}>
      <mesh geometry={NO_DATA_BOX}>
        <meshBasicMaterial color={C.path} transparent opacity={0.12 * opacity} depthWrite={false} />
      </mesh>
      <lineSegments geometry={NO_DATA_EDGES}>
        <lineBasicMaterial color={C.path} transparent opacity={opacity * (0.55 + 0.45 * blink)} />
      </lineSegments>
    </group>
  );

const World: React.FC = () => {
  const frame = useCurrentFrame();

  // ---- batter: fades out for the analysis view (Hawk-Eye removes the player), back for the outro
  const batterOpacity =
    frame < T.outro - 10
      ? 1 - ramp(frame, T.verdict - 12, T.verdict + 6)
      : ramp(frame, T.outro + 8, T.outro + 22); // after the camera has left the face-on stumps view

  // ---- tracked path + ball along it
  // Hook: the last stretch of the delivery is already moving at frame 0 and stops on the pad.
  const hookT = interpolate(frame, [0, 7], [0.972, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  // Tracking shot: tube draws release → bounce → pad on the spoken words.
  const trackT = interpolate(
    frame,
    [F("release") - 4, F("bounce se"), F("pad tak") + 8],
    [0.02, T_BOUNCE, 1],
    { ...clamp, easing: Easing.inOut(Easing.quad) },
  );
  const dotCount = Math.round(interpolate(frame, [T.path + 4, F("3D path")], [0, TRACK_PTS.length], clamp));
  const inHook = frame < T.hawk;
  const inTracking = win(frame, T.path, T.twist);
  const tubeT = inHook ? hookT : inTracking ? trackT : 1;
  const showTube =
    inHook || (inTracking && frame >= F("release") - 4) || win(frame, T.twist, T.umpire) || frame >= T.outro;
  const ballPos: Vec3 = inHook ? trackAt(hookT) : inTracking ? trackAt(trackT) : PAD;
  const showBall = inHook || (inTracking && frame >= F("release") - 4) || win(frame, T.twist, T.verdict) || frame >= T.outro;
  // "ruk gayi thi" — the ball on the pad gives a little squash.
  const squash = 1 + 0.25 * Math.max(0, 1 - Math.abs(frame - F("ruk")) / 6);

  // ---- predicted (dashed) path
  const predUpTo = inHook
    ? ramp(frame, 16, 58)
    : win(frame, T.physics, T.umpire)
      ? ramp(frame, F("extend") - 6, F("extend") + 28)
      : frame >= T.outro
        ? 1
        : 0;
  const redLinePulse = Math.max(0, 1 - Math.abs(frame - F("red line") - 6) / 10);
  const predGlow = 0.9 + 1.6 * redLinePulse + 1.2 * Math.max(0, 1 - Math.abs(frame - F("prediction", 2)) / 10);
  // Ghost ball riding the dashed path into the stumps.
  const ghostRuns: [number, number][] = [
    [40, 72],
    [F("extend") - 2, F("extend") + 30],
    [T.dashed + 2, T.dashed + 32],
    [F("replay") - 4, F("replay") + 26],
  ];
  const run = ghostRuns.find(([a, b]) => frame >= a && frame < b + 22);
  const ghostG = run ? ramp(frame, run[0], run[1], false) : 0;
  const ghostOpacity = run ? 0.55 * (1 - ramp(frame, run[1] + 2, run[1] + 20)) : 0;

  // ---- cameras
  const lit = (i: number) => (frame < T.hawk ? 0 : ramp(frame, F("chhe") + i * 7, F("chhe") + i * 7 + 6));
  const coneOpacity = win(frame, F("chhe"), T.frames + 10) ? 1 - ramp(frame, T.frames - 6, T.frames + 10) : 0;
  const screenScale = win(frame, T.frames - 10, T.oneCam + 10)
    ? ramp(frame, T.frames - 4, T.frames + 8) * (1 - ramp(frame, T.oneCam - 2, T.oneCam + 10))
    : 0;

  // ---- triangulation
  const rayA = interpolate(frame, [T.oneCam + 4, T.oneCam + 30], [0.02, 1.25], { ...clamp, easing: Easing.out(Easing.cubic) });
  const rayB = interpolate(frame, [T.twoCams + 10, T.twoCams + 40], [0.02, 1.25], { ...clamp, easing: Easing.out(Easing.cubic) });
  const inTri = win(frame, T.oneCam, T.path);
  const ghostSlide = win(frame, F("direction") - 4, F("milti"));
  const slideK = 1 + 0.38 * Math.sin((frame - F("direction")) / 8);
  const met = frame >= F("milti");
  const baseline = ramp(frame, T.tri - 4, T.tri + 16);
  const triFill = 0.22 * ramp(frame, F("triangulation") - 4, F("triangulation") + 10);

  // ---- no-data zone + decision markers
  const noData = win(frame, F("koi data") - 4, T.physics + 30)
    ? ramp(frame, F("koi data") - 4, F("koi data") + 8) * (1 - ramp(frame, T.physics + 10, T.physics + 30))
    : 0;
  const blink = Math.abs(Math.sin((frame - F("koi data")) / 5));
  const inVerdict = win(frame, T.verdict, T.umpire);
  const vFade = 1 - ramp(frame, T.umpire - 10, T.umpire);
  const strip = inVerdict ? 0.35 * ramp(frame, T.verdict + 4, T.verdict + 20) * vFade : 0;
  const mark = (at: number) => (inVerdict ? ramp(frame, at, at + 8) * vFade : 0);

  // ---- umpire's call
  const inUmpire = win(frame, T.umpire, T.outro);
  const zone = inUmpire ? ramp(frame, T.umpire, T.umpire + 14) * (1 - ramp(frame, T.outro - 10, T.outro)) : 0;
  const clipT = ramp(frame, F("chhoo") - 12, F("chhoo") + 14);
  const clipPos: Vec3 = [
    STUMPS_X - 0.15 - 1.6 * (1 - clipT),
    0.6 + 0.12 * (1 - clipT),
    0.19 + 0.12 * (1 - clipT),
  ];

  return (
    <group>
      <StadiumLights />
      <Ground />
      <Stands />
      <Floodlights />
      <Stumps x={-STUMPS_X} />
      <Stumps x={STUMPS_X} />
      {batterOpacity > 0.01 && <Batter x={PAD[0] + BALL_R + 0.085} opacity={batterOpacity} />}

      {/* Hawk-Eye reveal: a scan ring sweeps out over the ground */}
      {win(frame, F("Hawk-Eye") - 4, F("Hawk-Eye") + 30) && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.06, 0]}
          scale={[1 + 19 * ramp(frame, F("Hawk-Eye") - 4, F("Hawk-Eye") + 26), 0.6 + 9.4 * ramp(frame, F("Hawk-Eye") - 4, F("Hawk-Eye") + 26), 1]}
        >
          <ringGeometry args={[0.93, 1, 96]} />
          <meshBasicMaterial
            color={C.lime}
            transparent
            opacity={0.8 * (1 - ramp(frame, F("Hawk-Eye") + 10, F("Hawk-Eye") + 30))}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}

      {TOWERS.map((p, i) => (
        <CameraTower key={i} p={p} lit={lit(i)} cone={coneOpacity * lit(i)} />
      ))}
      {screenScale > 0.01 && <FrameScreen scale={screenScale} />}

      {/* triangulation */}
      {inTri && <Segment a={CAM_A} b={rayEnd(CAM_A, MID, rayA)} r={0.05} color={C.lime} glow={1} />}
      {ghostSlide && (
        <>
          <Ball p={rayEnd(CAM_A, MID, slideK)} opacity={0.55} scale={2.4} />
          {[0.55, 1.3].map((k) => (
            <Ball key={k} p={rayEnd(CAM_A, MID, k)} opacity={0.22} scale={2.4} />
          ))}
        </>
      )}
      {inTri && frame >= T.twoCams + 10 && (
        <Segment a={CAM_B} b={rayEnd(CAM_B, MID, rayB)} r={0.05} color={C.lime} glow={1} />
      )}
      {inTri && baseline > 0 && (
        <Segment a={CAM_A} b={rayEnd(CAM_A, CAM_B, Math.max(0.01, baseline))} r={0.04} color={C.hud} glow={1} />
      )}
      {inTri && <TriangleFill opacity={triFill} />}
      {inTri && (frame < F("direction") - 4 || met) && <Ball p={MID} color={met ? C.hud : C.ball} scale={2.4} />}
      <Pulse p={MID} at={F("milti")} color={C.hud} size={0.45} dur={24} />
      <Pulse p={MID} at={F("triangulation")} color={C.hud} size={0.45} dur={24} />

      {/* tracking */}
      {inTracking && <FrameDots count={dotCount} opacity={frame >= F("release") ? 0.6 : 1} />}
      {showTube && <PathTube upTo={tubeT} />}
      {showBall && (
        <group position={ballPos} scale={[1 / squash, 1 + (squash - 1) * 0.5, 1 + (squash - 1) * 0.5]}>
          <Ball p={[0, 0, 0]} />
        </group>
      )}
      <Pulse p={PAD} at={F("pad pe")} color={C.hud} size={0.12} />
      <Pulse p={PAD} at={F("Ab asli")} color={C.hud} size={0.12} />

      {/* prediction */}
      {predUpTo > 0 && <PredictedPath upTo={predUpTo} glow={predGlow} />}
      {ghostOpacity > 0.01 && <Ball p={predAt(ghostG)} opacity={ghostOpacity} color={C.path} />}
      <Pulse p={HIT} at={70} color={C.path} size={0.08} />
      <Pulse p={HIT} at={F("prediction")} color={C.path} size={0.08} />
      <NoDataZone opacity={noData} blink={blink} />

      {/* decision: in-line strip, pitching / impact / wickets markers */}
      {strip > 0.01 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <planeGeometry args={[20.12, 0.229]} />
          <meshBasicMaterial color={C.lime} transparent opacity={strip} depthWrite={false} />
        </mesh>
      )}
      <GroundRing p={BOUNCE} r={0.45} color={C.lime} opacity={0.9 * mark(F("Pitching"))} />
      <GroundRing p={[PAD[0], 0, PAD[2]]} r={0.45} color={C.lime} opacity={0.9 * mark(F("Impact"))} />
      {inVerdict && mark(F("Impact")) > 0.01 && <Ball p={PAD} opacity={0.9 * mark(F("Impact"))} color={C.lime} />}
      <GroundRing p={[STUMPS_X, 0, 0]} r={0.45} color={C.path} opacity={0.9 * mark(F("Wickets"))} />
      {inVerdict && mark(F("Wickets")) > 0.01 && <Ball p={HIT} opacity={0.9 * mark(F("Wickets"))} color={C.path} />}
      <Pulse p={HIT} at={F("Wickets")} color={C.path} size={0.2} />

      {/* Umpire's Call: ball only clipping the outer stump */}
      {zone > 0.01 && (
        <>
          <WicketZone opacity={zone} />
          <Ball p={clipPos} opacity={0.8 * zone} color={C.hud} />
        </>
      )}
      <Pulse p={[STUMPS_X - 0.15, 0.6, 0.19]} at={F("Umpire")} color={C.hud} size={0.12} />
    </group>
  );
};

/** Outline of the stumps' "wicket zone", seen face-on from the bowler's end. */
const WicketZone: React.FC<{ opacity: number }> = ({ opacity }) => {
  const x = STUMPS_X - 0.06;
  const zl = -0.117;
  const zr = 0.117;
  const yt = 0.735;
  const r = 0.008;
  return (
    <group>
      <Segment a={[x, 0, zl]} b={[x, yt, zl]} r={r} color={C.lime} glow={1.2} opacity={opacity} />
      <Segment a={[x, 0, zr]} b={[x, yt, zr]} r={r} color={C.lime} glow={1.2} opacity={opacity} />
      <Segment a={[x, yt, zl]} b={[x, yt, zr]} r={r} color={C.lime} glow={1.2} opacity={opacity} />
    </group>
  );
};

// ---- Overlays --------------------------------------------------------------------------
const CALLOUTS: CalloutSpec[] = [
  { from: 8, to: F("Ball toh pad") - 12, label: "Stumps", point: [STUMPS_X, 0.4, 0], dx: 0, dy: 0, box: [120, 230] },
  { from: F("pad pe"), to: F("red line") - 4, label: "Stopped", point: PAD, dx: 0, dy: 0, box: [90, 90] },
  { from: F("red line"), to: T.hawk - 8, label: "???", point: postBounce(0.94), dx: 0, dy: 0, box: [110, 90], color: C.path },
  { from: T.frames + 6, to: T.oneCam - 6, label: "Cam 2", point: CAM_A, dx: 0, dy: 0, box: [110, 100] },
  { from: F("direction"), to: T.twoCams - 4, label: "Distance ?", point: rayEnd(CAM_A, MID, 0.7), dx: 0, dy: 0, box: [100, 100] },
  { from: F("milti"), to: T.tri - 4, label: "Ball", point: MID, dx: 0, dy: 0, box: [90, 90] },
  { from: F("release"), to: F("bounce se") + 4, label: "Release", point: REL, dx: 0, dy: 0, box: [80, 80] },
  { from: F("bounce se"), to: F("pad tak"), label: "Bounce", point: BOUNCE, dx: 0, dy: 0, box: [80, 80] },
  { from: F("pad tak"), to: T.twist - 6, label: "Pad", point: PAD, dx: 0, dy: 0, box: [80, 80] },
  { from: F("koi data") , to: T.physics - 6, label: "No data", point: postBounce(0.94), dx: 0, dy: 0, box: [110, 110], color: C.path },
  { from: F("dashed"), to: T.verdict - 6, label: "Prediction", point: postBounce(0.95), dx: 0, dy: 0, box: [120, 100], color: C.path },
  { from: F("Umpire"), to: T.outro - 6, label: "Umpire's call", point: [STUMPS_X, 0.6, 0.12], dx: 0, dy: 0, box: [200, 200] },
  { from: F("replay"), to: DURATION, label: "Prediction", point: postBounce(0.95), dx: 0, dy: 0, box: [120, 100], color: C.path },
];


/** Broadcast-style DRS panel for the three questions. */
const DecisionPanel: React.FC = () => {
  const frame = useCurrentFrame();
  if (!win(frame, T.verdict, T.umpire)) return null;
  const rows: [string, string, string, number][] = [
    ["PITCHING", "IN LINE", C.lime, F("Pitching")],
    ["IMPACT", "IN LINE", C.lime, F("Impact")],
    ["WICKETS", "HITTING", C.path, F("Wickets")],
  ];
  const fade = interpolate(frame, [T.umpire - 10, T.umpire], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <div style={{ position: "absolute", top: 300, left: 160, right: 160, opacity: fade }}>
      {rows.map(([k, v, col, at]) => {
        const t = interpolate(frame, [at, at + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div
            key={k}
            style={{
              display: "flex",
              marginBottom: 14,
              opacity: t,
              transform: `translateX(${(1 - t) * -40}px)`,
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 40,
              letterSpacing: "0.06em",
            }}
          >
            <div style={{ flex: 1, padding: "14px 22px", background: "rgba(20,21,24,0.88)", color: LOOK.ink }}>
              {k}
            </div>
            <div style={{ width: 300, padding: "14px 22px", background: col, color: "#141518", textAlign: "center" }}>
              {v}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Physics inputs read off the tracked path (illustrative values for this delivery). */
const PhysicsPanel: React.FC = () => {
  const frame = useCurrentFrame();
  if (!win(frame, F("speed") - 4, T.dashed)) return null;
  const rows: [string, string, number][] = [
    ["SPEED", "138 KM/H", F("speed")],
    ["SWING", "1.2°", F("swing")],
    ["BOUNCE ANGLE", "9°", F("angle")],
  ];
  const fade = interpolate(frame, [T.dashed - 10, T.dashed], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <div style={{ position: "absolute", top: 560, right: 90, opacity: fade }}>
      {rows.map(([k, v, at]) => {
        const t = interpolate(frame, [at, at + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div
            key={k}
            style={{
              display: "flex",
              marginBottom: 12,
              opacity: t,
              transform: `translateX(${(1 - t) * -40}px)`,
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 34,
              letterSpacing: "0.06em",
            }}
          >
            <div style={{ width: 300, padding: "12px 20px", background: "rgba(20,21,24,0.88)", color: LOOK.ink }}>{k}</div>
            <div style={{ width: 220, padding: "12px 20px", background: C.hud, color: "#141518" }}>{v}</div>
          </div>
        );
      })}
    </div>
  );
};

const SECTIONS = [
  { from: 0, label: "DRS review" },
  { from: T.hawk, label: "Hawk-Eye" },
  { from: T.frames, label: "Camera view" },
  { from: T.oneCam, label: "Triangulation" },
  { from: T.path, label: "Ball tracking" },
  { from: T.twist, label: "Prediction" },
  { from: T.verdict, label: "Decision" },
  { from: T.umpire, label: "Umpire's call" },
  { from: T.outro, label: "DRS review" },
];

// Sound effects: whoosh on every camera cut, pop when a label appears, one riser + impact
// on the payoff ("Umpire's Call").
const CUT_SFX = cutCues(SHOTS);
const SFX: SfxCue[] = [
  ...CUT_SFX,
  ...popCues(
    CALLOUTS.map((c) => c.from),
    { avoid: CUT_SFX },
  ),
  { at: F("Umpire"), sound: "riser-short", volume: 0.8 },
  { at: F("Umpire"), sound: "impact-zoom" },
];

export const DrsHawkeyeReel: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: LOOK.bg }}>
    <Audio src={staticFile("drs-hawkeye/voiceover.mp3")} />
    <SoundEffects cues={SFX} />
    <ThreeCanvas width={1080} height={1920} shadows camera={{ fov: LOOK.fov, near: 0.1, far: 200 }}>
      <CameraRig poseAt={poseAt} fov={LOOK.fov} />
      <LookEnvironment look={LOOK} floor={false} />
      <World />
      <LookEffects look={LOOK} />
    </ThreeCanvas>
    <Callouts
      items={CALLOUTS}
      poseAt={poseAt}
      spec={SPEC}
      variant={LOOK.callout}
      color={LOOK.accent.primary}
      plate={LOOK.plate}
    />
    <DecisionPanel />
    <PhysicsPanel />
    <SceneHeader variant="tag" sections={SECTIONS} duration={DURATION} ink={LOOK.ink} accent={LOOK.accent.primary} />
    <StylishCaptions src="drs-hawkeye/captions.json" keywords={KEYWORDS} variant={LOOK.caption} accent={LOOK.accent.primary} />
  </AbsoluteFill>
);
