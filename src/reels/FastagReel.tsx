/**
 * How FASTag works — 3D neon reel (hinglish-3d-reel skill).
 *
 * World (x runs along the road, the bank network sits beside it at z = CZ):
 *   car + windshield sticker (x ≈ -10 → -1.2) → toll gantry with RFID reader (x = GX)
 *   → booth → toll plaza's bank (ACQ_X) → NPCI switch (NPCI_X) → issuer banks (BANK_X).
 * Everything is code-built (no models).
 */
import { Line } from "@react-three/drei";
import { ThreeCanvas } from "@remotion/three";
import { Caption } from "@remotion/captions";
import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { DoubleSide, ExtrudeGeometry, Shape } from "three";
import words from "../../public/fastag/captions.json";
import { StylishCaptions } from "../kit/StylishCaptions";
import { phraseFrame } from "../kit/timing";
import { Callouts, CalloutSpec } from "../kit/three/Callout";
import { CameraRig } from "../kit/three/CameraRig";
import { makeCameraTrack, Shot, Vec3 } from "../kit/three/cameraTrack";
import { useCanvasTexture } from "../kit/three/canvasTexture";
import { LookEffects, LookEnvironment, LOOKS } from "../kit/three/looks";
import { SceneHeader } from "../kit/three/SceneHeader";
import { cutCues, popCues, SfxCue, SoundEffects } from "../kit/SoundEffects";

const W = words as Caption[];
const F = (p: string, n = 1) => phraseFrame(W, p, n);
export const DURATION = 1650;
const LOOK = LOOKS.neon;
const KEYWORDS = ["FASTag", "RFID", "unique ID", "reader", "radio waves", "NPCI", "SMS"];
const SPEC = { fov: LOOK.fov, width: 1080, height: 1920 };

const CYAN = LOOK.accent.primary;
const ORANGE = LOOK.accent.secondary;
const GREEN = LOOK.accent.good;
const RED = LOOK.accent.bad;
const [B0, B1, B2] = LOOK.base;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ramp = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], clamp);

// ---- World layout -------------------------------------------------------------------
const GX = -0.6; // gantry / reader
const READER: Vec3 = [GX, 4.85, 0];
const BX = 2.6; // barrier
const BOOTH: Vec3 = [1.6, 0, -4.0];
const CZ = -6; // bank network line
const ACQ_X = 9;
const NPCI_X = 15;
const BANK_X = 21;
const ISSUERS: { z: number; sign: string; yours: boolean }[] = [
  { z: -3.6, sign: "BANK A", yours: false },
  { z: CZ, sign: "YOUR BANK", yours: true },
  { z: -8.4, sign: "BANK C", yours: false },
];
const CAR_STOP = -1.2;

// ---- Timeline (anchored to the voiceover) -------------------------------------------
const T = {
  carGo: 475,
  carArrive: 660,
  blowIn: F("Kaise"),
  blowOut: F("Lekin"),
  id: F("unique"),
  reader: F("reader"),
  waves: F("radio waves"),
  power: F("power"),
  wake: F("jaag"),
  idUp: F("wapas"),
  ms: F("Milliseconds"),
  game: F("asli game"),
  acq: F("paas"),
  npci: F("NPCI"),
  ask: F("kis bank"),
  tell: F("NPCI", 2),
  yourBank: F("bank", 3),
  debit: F("kat", 2),
  barrier: F("Barrier"),
  phone: F("phone"),
  sms: F("SMS"),
  end: F("Na battery", 2), // #1 is inside the hook ("…mein na battery hai")
};

const carX = (f: number) => {
  if (f < T.carGo) return interpolate(f, [0, T.carGo], [-10.6, -10], clamp);
  if (f < T.barrier + 30)
    return interpolate(f, [T.carGo, T.carArrive], [-10, CAR_STOP], {
      ...clamp,
      easing: Easing.inOut(Easing.cubic),
    });
  return interpolate(f, [T.barrier + 30, DURATION], [CAR_STOP, 10], {
    ...clamp,
    easing: Easing.in(Easing.quad),
  });
};

// Windshield geometry (car-local, x forward): line from hood end A to roof front B.
const WS_A: [number, number] = [1.05, 0.95];
const WS_B: [number, number] = [0.15, 1.52];
const WS_ANG = Math.atan2(WS_B[1] - WS_A[1], WS_B[0] - WS_A[0]);
const WS_N: [number, number] = [Math.sin(WS_ANG), -Math.cos(WS_ANG)]; // outward normal
const STK_LOCAL: [number, number] = [
  // 0.1 out: the body's bevel already pushes its surface ~0.06 past the profile line.
  WS_A[0] + (WS_B[0] - WS_A[0]) * 0.8 + WS_N[0] * 0.1,
  WS_A[1] + (WS_B[1] - WS_A[1]) * 0.8 + WS_N[1] * 0.1,
];
const sticker = (f: number): Vec3 => [carX(f) + STK_LOCAL[0], STK_LOCAL[1], 0];

// Blown-up tag hovering in front of the car.
const FLOAT: Vec3 = [-7.6, 3.0, 0];

// ---- Paths -------------------------------------------------------------------------
const P_UP: Vec3[] = [sticker(T.carArrive), READER];
const P_TO_ACQ: Vec3[] = [
  [GX, 5.45, 0],
  [GX, 5.45, -3.2],
  [GX, 0.1, -3.2],
  [BOOTH[0], 0.1, BOOTH[2]],
  [3.2, 0.1, CZ],
  [ACQ_X, 0.1, CZ],
];
const P_TO_NPCI: Vec3[] = [
  [ACQ_X, 0.1, CZ],
  [NPCI_X, 0.1, CZ],
];
const issuerPath = (z: number): Vec3[] => [
  [NPCI_X, 0.1, CZ],
  [NPCI_X + 2.5, 0.1, CZ],
  [NPCI_X + 3.5, 0.1, z],
  [BANK_X, 0.1, z],
];
const P_RETURN: Vec3[] = [
  [BANK_X, 0.1, CZ],
  [NPCI_X, 0.1, CZ],
  [ACQ_X, 0.1, CZ],
  [3.2, 0.1, CZ],
  [BOOTH[0], 0.1, BOOTH[2]],
  [BX, 0.1, -2.75],
  [BX, 1.0, -2.75],
];

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
/** Point at fraction t of a polyline's length, plus the polyline cut at that point. */
const along = (pts: Vec3[], t: number): { p: Vec3; upTo: Vec3[] } => {
  const lens = pts.slice(1).map((p, i) => dist(pts[i], p));
  let d = Math.max(0, Math.min(1, t)) * lens.reduce((a, b) => a + b, 0);
  const upTo: Vec3[] = [pts[0]];
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const k = lens[i] ? Math.min(1, d / lens[i]) : 1;
      const a = pts[i];
      const b = pts[i + 1];
      const p: Vec3 = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
      upTo.push(p);
      return { p, upTo };
    }
    d -= lens[i];
    upTo.push(pts[i + 1]);
  }
  return { p: pts[pts.length - 1], upTo };
};

// ---- Camera ------------------------------------------------------------------------
const SHOTS: Shot[] = [
  // 1 Hook: close on the windshield sticker.
  { from: 0, pos: [-8.07, 2.3, 0.9], target: [-10.27, 1.25, 0], drift: [-0.11, -0.15, -0.14] },
  // 2 Inside the tag: blown-up inlay floating over the bonnet.
  { from: T.blowIn - 8, pos: [-1.8, 3.5, 0.5], target: [-7.6, 2.75, 0], drift: [-0.6, -0.05, -0.2], moveFrames: 34 },
  // 3 Re-hook: pull back behind the car, gantry ahead.
  { from: T.blowOut - 10, pos: [-21, 3.0, 1.5], target: [-4, 1.6, 0], drift: [5, 0, -0.2], moveFrames: 34 },
  // 4 Radio link: side view, reader on top, tag below.
  { from: T.waves - 12, pos: [-4.2, 3.0, 9.8], target: [-0.9, 2.45, 0], drift: [0.3, 0, -0.5], moveFrames: 30 },
  // 5 Re-hook: rise over the plaza, the bank network appears.
  { from: T.game - 10, pos: [-9, 11, 2], target: [9, 0.3, -5], drift: [0.5, -0.5, -0.5], moveFrames: 36 },
  // 6 Toll plaza's bank.
  { from: F("Ye ID") - 10, pos: [4.5, 4.3, 1.5], target: [9, 1.6, -6], drift: [0.6, -0.2, -0.6] },
  // 7 NPCI switch, issuer banks beyond.
  { from: T.npci - 15, pos: [3, 13, -6], target: [19, -1, -6], drift: [1.2, -0.6, 0], moveFrames: 30 },
  // 8 Your bank, balance drops.
  { from: T.tell - 10, pos: [14, 4.5, -1.5], target: [21, 1.2, -6.5], drift: [0.8, -0.2, -0.4] },
  // 9 Back at the lane: barrier opens, SMS.
  { from: T.barrier - 10, pos: [-8, 4.2, 1.5], target: [2, 1.2, -0.4], drift: [1.5, 0, 0], moveFrames: 34 },
  // 10 Callback: the whole trip in one wide shot.
  { from: T.end - 10, pos: [-12, 16, 4], target: [9, -0.6, -3.5], drift: [2, -1, -1], moveFrames: 34 },
];
const poseAt = makeCameraTrack(SHOTS, DURATION);

// ---- Overlays ----------------------------------------------------------------------
const CALLOUTS: CalloutSpec[] = [
  { from: F("FASTag"), to: T.blowIn - 6, label: "FASTag sticker", point: sticker, dx: 150, dy: -260 },
  { from: F("battery"), to: T.blowIn - 6, label: "No battery", point: sticker, dx: -170, dy: -150 },
  { from: F("paisa"), to: T.blowIn - 6, label: "No money inside", point: sticker, dx: -120, dy: 170 },
  { from: F("passive"), to: T.blowOut - 6, label: "Antenna", point: [FLOAT[0], FLOAT[1] + 0.1, 0.55], dx: 0, dy: -230 },
  { from: F("RFID"), to: T.blowOut - 6, label: "Chip", point: [FLOAT[0] + 0.03, FLOAT[1] + 0.05, 0], dx: 80, dy: -330 },
  { from: T.id, to: T.blowOut - 6, label: "Unique ID", point: [FLOAT[0], FLOAT[1] - 0.3, 0], dx: 120, dy: 170 },
  { from: T.reader, to: T.waves - 14, label: "RFID reader", point: READER, dx: 110, dy: 120 },
  { from: T.waves + 8, to: T.wake - 4, label: "Radio waves", point: [GX, 3.3, 0], dx: 170, dy: -40 },
  { from: T.power, to: T.ms - 4, label: "Tag powered by the waves", point: sticker, dx: -60, dy: -220 },
  { from: T.idUp, to: T.game - 14, label: "ID → reader", point: [GX, 3.6, 0], dx: -200, dy: -60 },
  { from: T.ms, to: T.game - 14, label: "≈ milliseconds", point: READER, dx: 150, dy: -40 },
  { from: F("toll plaza"), to: T.npci - 18, label: "Toll plaza's bank", point: [ACQ_X, 2.5, CZ + 0.6], dx: 60, dy: -160 },
  { from: T.npci, to: T.tell - 12, label: "NPCI switch", point: [NPCI_X, 2.4, CZ], dx: 170, dy: -90 },
  { from: T.ask, to: T.tell - 12, label: "Which bank?", point: [BANK_X, 2.1, CZ], dx: 60, dy: -120 },
  { from: T.yourBank, to: T.barrier - 14, label: "Your bank", point: [BANK_X - 0.8, 1.2, CZ], dx: 160, dy: 150 },
  { from: T.barrier + 10, to: T.end - 12, label: "Barrier opens", point: [BX, 3.2, -2.75], dx: 120, dy: -60 },
];

// ---- Sound effects ---------------------------------------------------------------------
const CUTS = cutCues(SHOTS);
const ACCENTS: SfxCue[] = [
  { at: 6, sound: "impact-zoom", volume: 0.8 }, // hook punch-in on the sticker
  { at: T.game - 10, sound: "riser-short", volume: 0.8 }, // build into "asli game"
  { at: T.debit, sound: "pop-hard" }, // balance drops
  { at: T.phone, sound: "pop-bubble" }, // phone slides in
  { at: T.sms, sound: "click-ui", volume: 1.2 }, // SMS lands
];
export const SFX: SfxCue[] = [
  ...CUTS,
  ...ACCENTS,
  ...popCues(
    CALLOUTS.map((c) => c.from),
    { avoid: [...CUTS, ...ACCENTS] },
  ),
];

const SECTIONS = [
  { from: 0, label: "Toll lane" },
  { from: T.blowIn - 8, label: "Inside the tag" },
  { from: T.blowOut - 10, label: "Toll plaza" },
  { from: T.waves - 12, label: "Radio link" },
  { from: T.game - 10, label: "Bank network" },
  { from: T.npci - 15, label: "NPCI switch" },
  { from: T.tell - 10, label: "Your bank" },
  { from: T.barrier - 10, label: "Toll lane" },
  { from: T.end - 10, label: "One ID, one trip" },
];

// ---- Small helpers -------------------------------------------------------------------
const Glow: React.FC<{ color: string; intensity?: number }> = ({ color, intensity = 2 }) => (
  <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} toneMapped={false} />
);

const useLabelTex = (text: string, color: string, w = 512, h = 128, font = 64) =>
  useCanvasTexture(
    w,
    h,
    (ctx) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(5,10,20,0.85)";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, w - 6, h - 6);
      ctx.fillStyle = color;
      ctx.font = `700 ${font}px Inter, 'Segoe UI', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, w / 2, h / 2 + 2);
    },
    [text, color],
  );

// ---- Road, plaza --------------------------------------------------------------------
const Road: React.FC = () => (
  <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
      <planeGeometry args={[90, 5]} />
      <meshStandardMaterial color="#0B1526" roughness={0.6} metalness={0.3} />
    </mesh>
    {[-2.45, 2.45].map((z) => (
      <mesh key={z} position={[0, 0.03, z]}>
        <boxGeometry args={[90, 0.02, 0.08]} />
        <Glow color={CYAN} intensity={0.6} />
      </mesh>
    ))}
    {Array.from({ length: 22 }, (_, i) => (
      <mesh key={i} position={[-40 + i * 4, 0.03, 0]}>
        <boxGeometry args={[1.6, 0.02, 0.1]} />
        <meshStandardMaterial color="#5C6F8F" />
      </mesh>
    ))}
  </>
);

const Gantry: React.FC = () => {
  const frame = useCurrentFrame();
  const on = Math.max(
    ramp(frame, T.reader, T.reader + 10) * 0.6,
    interpolate(frame, [T.waves, T.waves + 6, T.wake], [0, 1.4, 1.0], clamp),
  );
  const ping = interpolate(frame, [T.idUp + 18, T.idUp + 24, T.idUp + 40], [0, 2.5, 0], clamp);
  // The canopy would hide the plaza in the high shots (5–8 and 10), so it fades out there.
  const canopy =
    1 -
    Math.max(
      ramp(frame, T.game - 10, T.game + 8) * (1 - ramp(frame, T.barrier - 10, T.barrier + 4)),
      ramp(frame, T.end - 10, T.end + 8),
    );
  return (
    <group>
      {canopy > 0.01 ? (
        <>
          <mesh position={[GX - 0.3, 6.3, 0]} castShadow={canopy > 0.99}>
            <boxGeometry args={[3.4, 0.3, 9]} />
            <meshStandardMaterial color={B1} roughness={0.6} metalness={0.4} transparent opacity={canopy} />
          </mesh>
          {[-3, -1, 1, 3].map((z) => (
            <mesh key={z} position={[GX - 0.3, 6.14, z]}>
              <boxGeometry args={[2.8, 0.03, 0.12]} />
              <meshStandardMaterial
                color="#CFEFFF"
                emissive="#CFEFFF"
                emissiveIntensity={0.6}
                toneMapped={false}
                transparent
                opacity={canopy}
              />
            </mesh>
          ))}
        </>
      ) : null}
      {/* posts + beam */}
      {[-3.2, 3.2].map((z) => (
        <mesh key={z} position={[GX, 3.1, z]} castShadow>
          <boxGeometry args={[0.32, 6.2, 0.32]} />
          <meshStandardMaterial color={B2} roughness={0.5} metalness={0.5} />
        </mesh>
      ))}
      <mesh position={[GX, 5.45, 0]} castShadow>
        <boxGeometry args={[0.45, 0.45, 6.8]} />
        <meshStandardMaterial color={B2} roughness={0.5} metalness={0.5} />
      </mesh>
      {/* reader: flat panel hanging from the beam, emitting face down */}
      <mesh position={[GX, 5.12, 0]}>
        <boxGeometry args={[0.08, 0.3, 0.08]} />
        <meshStandardMaterial color={B2} />
      </mesh>
      <mesh position={READER} castShadow>
        <boxGeometry args={[0.8, 0.18, 0.95]} />
        <meshStandardMaterial color={B0} roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[GX, READER[1] - 0.1, 0]}>
        <boxGeometry args={[0.66, 0.02, 0.8]} />
        <Glow color={CYAN} intensity={0.3 + on * 2 + ping} />
      </mesh>
      {/* lane islands */}
      {[-2.95, 2.95].map((z) => (
        <group key={z}>
          <mesh position={[GX + 0.4, 0.15, z]} castShadow>
            <boxGeometry args={[7, 0.3, 0.6]} />
            <meshStandardMaterial color={B1} />
          </mesh>
          <mesh position={[GX + 0.4, 0.31, z]}>
            <boxGeometry args={[7, 0.02, 0.62]} />
            <Glow color={ORANGE} intensity={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const Booth: React.FC = () => (
  <group position={BOOTH}>
    <mesh position={[0, 1.1, 0]} castShadow>
      <boxGeometry args={[1.3, 2.2, 1.2]} />
      <meshStandardMaterial color={B1} roughness={0.6} />
    </mesh>
    <mesh position={[0, 1.35, 0.61]}>
      <planeGeometry args={[0.9, 0.7]} />
      <Glow color={CYAN} intensity={0.2} />
    </mesh>
    <mesh position={[0, 2.3, 0]}>
      <boxGeometry args={[1.6, 0.18, 1.5]} />
      <meshStandardMaterial color={B2} />
    </mesh>
  </group>
);

const Barrier: React.FC = () => {
  const frame = useCurrentFrame();
  const lift = interpolate(frame, [T.barrier, T.barrier + 22], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const greenOn = ramp(frame, T.barrier - 4, T.barrier + 2);
  return (
    <group position={[BX, 0, -2.75]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.4, 1.1, 0.4]} />
        <meshStandardMaterial color={B2} />
      </mesh>
      <mesh position={[0.21, 0.85, 0]}>
        <boxGeometry args={[0.02, 0.16, 0.16]} />
        <Glow color={greenOn > 0.5 ? GREEN : RED} intensity={2} />
      </mesh>
      <group position={[0, 1.0, 0]} rotation={[-lift * 1.35, 0, 0]}>
        {Array.from({ length: 10 }, (_, i) => (
          <mesh key={i} position={[0, 0, 0.25 + i * 0.46]}>
            <boxGeometry args={[0.1, 0.12, 0.46]} />
            {i % 2 ? (
              <meshStandardMaterial color="#E8EEF6" />
            ) : (
              <Glow color={RED} intensity={0.8} />
            )}
          </mesh>
        ))}
      </group>
    </group>
  );
};

// ---- Car ---------------------------------------------------------------------------
const CAR_PROFILE: [number, number][] = [
  [-2.0, 0.32],
  [2.0, 0.32],
  [2.08, 0.72],
  WS_A,
  WS_B,
  [-1.5, 1.5],
  [-2.02, 1.02],
];
const SIDE_WIN: [number, number][] = [
  [0.95, 1.0],
  [0.2, 1.44],
  [-1.42, 1.43],
  [-1.85, 1.06],
];

const StickerFace: React.FC<{ w: number; h: number; glow: number }> = ({ w, h, glow }) => {
  const tex = useCanvasTexture(512, 256, (ctx, cw, ch) => {
    ctx.fillStyle = "#EAF6FF";
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = "#0B2A3C";
    ctx.fillRect(0, 0, 120, ch);
    ctx.fillStyle = "#3FD5FF";
    ctx.font = "800 46px Inter, 'Segoe UI', sans-serif";
    ctx.save();
    ctx.translate(74, ch / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("TAG", 0, 0);
    ctx.restore();
    ctx.fillStyle = "#0B2A3C";
    ctx.font = "800 64px Inter, 'Segoe UI', sans-serif";
    ctx.fillText("FASTag", 150, 96);
    for (let i = 0; i < 26; i++) {
      const bw = (i * 7) % 3 === 0 ? 8 : 4;
      ctx.fillRect(152 + i * 12, 130, bw, 70);
    }
    ctx.font = "600 22px Consolas, monospace";
    ctx.fillText("34161FA8 2032 6E5C", 150, 232);
  });
  return (
    <group>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#FFFFFF" emissiveIntensity={0.25 + glow} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.004]}>
        <planeGeometry args={[w * 1.12, h * 1.2]} />
        <Glow color={CYAN} intensity={0.4 + glow * 2.5} />
      </mesh>
    </group>
  );
};

const Car: React.FC = () => {
  const frame = useCurrentFrame();
  const x = carX(frame);
  const body = useMemo(() => {
    const s = new Shape();
    CAR_PROFILE.forEach(([px, py], i) => (i ? s.lineTo(px, py) : s.moveTo(px, py)));
    s.closePath();
    const g = new ExtrudeGeometry(s, {
      depth: 1.6,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.06,
      bevelSegments: 3,
    });
    g.translate(0, 0, -0.8);
    return g;
  }, []);
  const winShape = useMemo(() => {
    const s = new Shape();
    SIDE_WIN.forEach(([px, py], i) => (i ? s.lineTo(px, py) : s.moveTo(px, py)));
    s.closePath();
    return s;
  }, []);
  const wsLen = Math.hypot(WS_B[0] - WS_A[0], WS_B[1] - WS_A[1]);
  const wsMid: Vec3 = [
    (WS_A[0] + WS_B[0]) / 2 + WS_N[0] * 0.075,
    (WS_A[1] + WS_B[1]) / 2 + WS_N[1] * 0.075,
    0,
  ];
  // Hook pulse on "FASTag", charge on "power", flash on "jaag", final callback glow.
  const glow = Math.max(
    interpolate(frame, [F("FASTag"), F("FASTag") + 6, F("FASTag") + 30], [0, 1, 0.35], clamp) *
      (frame < T.blowIn ? 1 : 0),
    ramp(frame, T.power, T.wake) * 0.6,
    interpolate(frame, [T.wake, T.wake + 4, T.wake + 30], [0, 1.4, 0.5], clamp) * (frame < T.game ? 1 : 0),
    ramp(frame, T.end, T.end + 10) * 0.8,
  );
  const spin = -x / 0.36;
  return (
    <group position={[x, 0, 0]}>
      <mesh geometry={body} castShadow receiveShadow>
        <meshStandardMaterial color="#22385C" roughness={0.45} metalness={0.3} />
      </mesh>
      {/* side accent strip */}
      {[-0.89, 0.89].map((z) => (
        <mesh key={z} position={[0, 0.58, z]}>
          <boxGeometry args={[3.7, 0.03, 0.01]} />
          <Glow color={CYAN} intensity={0.8} />
        </mesh>
      ))}
      {/* windows */}
      <mesh position={wsMid} rotation={[0, 0, WS_ANG]}>
        <boxGeometry args={[wsLen, 0.02, 1.5]} />
        <meshStandardMaterial color="#0A1A2E" roughness={0.1} metalness={0.9} transparent opacity={0.85} />
      </mesh>
      {[-0.895, 0.895].map((z) => (
        <mesh key={z} position={[0, 0, z]}>
          <shapeGeometry args={[winShape]} />
          <meshStandardMaterial color="#0A1A2E" roughness={0.1} metalness={0.9} side={DoubleSide} />
        </mesh>
      ))}
      {/* lights */}
      {[-0.55, 0.55].map((z) => (
        <group key={z}>
          <mesh position={[2.07, 0.62, z]}>
            <boxGeometry args={[0.04, 0.1, 0.4]} />
            <Glow color="#DDF6FF" intensity={3} />
          </mesh>
          <mesh position={[-2.09, 0.98, z]}>
            <boxGeometry args={[0.04, 0.08, 0.35]} />
            <Glow color={RED} intensity={2} />
          </mesh>
        </group>
      ))}
      {/* wheels */}
      {[-1.3, 1.3].flatMap((wx) =>
        [-0.8, 0.8].map((wz) => (
          <group key={`${wx}${wz}`} position={[wx, 0.36, wz]} rotation={[0, 0, spin]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.36, 0.36, 0.26, 24]} />
              <meshStandardMaterial color="#05080F" roughness={0.9} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.28, 6]} />
              <meshStandardMaterial color="#5C6F8F" metalness={0.8} roughness={0.3} />
            </mesh>
          </group>
        )),
      )}
      {/* FASTag sticker on the windshield (faces up-forward) */}
      {/* rotY(90°) turns the plane's normal to +x, rotZ then tilts it onto the windshield normal */}
      <group position={[STK_LOCAL[0], STK_LOCAL[1], 0]} rotation={[0, 0, Math.atan2(WS_N[1], WS_N[0])]}>
        <group rotation={[0, Math.PI / 2, 0]}>
          <StickerFace w={0.34} h={0.17} glow={glow} />
        </group>
      </group>
    </group>
  );
};

// ---- Blown-up tag (inlay) -----------------------------------------------------------
const Inlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inS = spring({ frame: frame - T.blowIn, fps, config: { damping: 16, stiffness: 90 } });
  const out = ramp(frame, T.blowOut, T.blowOut + 20);
  const k = Math.max(0, inS - out);
  const idGlow = ramp(frame, T.id, T.id + 8);
  const tex = useCanvasTexture(1024, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "#E7A35A";
    ctx.lineWidth = 9;
    ctx.lineJoin = "round";
    // meander dipole arms either side of the chip
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      let x = w / 2 + dir * 40;
      ctx.moveTo(x, h / 2 - 30);
      for (let i = 0; i < 8; i++) {
        const nx = x + dir * 48;
        ctx.lineTo(x, i % 2 ? h / 2 + 100 : h / 2 - 100);
        ctx.lineTo(nx, i % 2 ? h / 2 + 100 : h / 2 - 100);
        x = nx;
      }
      ctx.lineTo(x, h / 2 + 140);
      ctx.stroke();
    }
    ctx.lineWidth = 6;
    ctx.strokeRect(w / 2 - 70, h / 2 - 60, 140, 120);
    ctx.fillStyle = "#3FD5FF";
    ctx.font = "700 38px Consolas, 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText("ID  34161FA8 2032 6E5C", w / 2, h - 38);
  });
  if (k <= 0.001) return null;
  // Fly from the sticker to the float point.
  const s0 = sticker(frame);
  const pos: Vec3 = [
    s0[0] + (FLOAT[0] - s0[0]) * k,
    s0[1] + (FLOAT[1] - s0[1]) * k,
    0,
  ];
  return (
    <group position={pos} rotation={[0, Math.PI / 2 + 0.08 * Math.sin(frame / 38), 0]} scale={0.2 + 0.8 * k}>
      <group rotation={[-0.12 + 0.03 * Math.sin(frame / 29), 0, 0]}>
        {/* scan line sweeping across the inlay keeps the long shot alive */}
        <mesh position={[-0.8 + 1.6 * ((((frame - T.blowIn) / 70) % 1) + 1) % 1, 0, 0.02]}>
          <planeGeometry args={[0.03, 0.8]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0.18} toneMapped={false} />
        </mesh>
        <mesh>
          <boxGeometry args={[1.7, 0.85, 0.02]} />
          <meshStandardMaterial color="#0E2238" transparent opacity={0.75} roughness={0.8} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0, 0.012]}>
          <planeGeometry args={[1.7, 0.85]} />
          <meshBasicMaterial map={tex} transparent toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.02, 0.03]}>
          <boxGeometry args={[0.1, 0.1, 0.03]} />
          <Glow color={CYAN} intensity={1 + idGlow * 2} />
        </mesh>
        <mesh position={[0, -0.33, 0.014]}>
          <planeGeometry args={[1.3, 0.1]} />
          <meshBasicMaterial color={CYAN} transparent opacity={idGlow * 0.25} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
};

// ---- Radio waves --------------------------------------------------------------------
const Waves: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.waves || frame > T.wake + 10) return null;
  const top = READER[1] - 0.15;
  const bottom = STK_LOCAL[1] + 0.1;
  const rings = [];
  for (let k = 0; k < 8; k++) {
    const start = T.waves + k * 18;
    const t = (frame - start) / 34;
    if (t < 0 || t > 1 || start > T.wake - 10) continue;
    rings.push(
      <mesh key={k} position={[GX - 0.13 * t, top - (top - bottom) * t, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.25 + t * 1.0, 0.025, 8, 48]} />
        <meshBasicMaterial color={CYAN} transparent opacity={(1 - t) * 0.9} toneMapped={false} />
      </mesh>,
    );
  }
  return <>{rings}</>;
};

// ---- Packets on the network ---------------------------------------------------------
const Packet: React.FC<{
  path: Vec3[];
  from: number;
  to: number;
  color: string;
  trail?: boolean;
  /** Frame after which the trail is removed. */
  until?: number;
}> = ({ path, from, to, color, trail = true, until = Infinity }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame > until) return null;
  const t = interpolate(frame, [from, to], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const { p, upTo } = along(path, t);
  const fade = interpolate(frame, [to, to + 30], [1, 0.35], clamp);
  return (
    <>
      {trail && upTo.length > 1 ? (
        <Line points={upTo} color={color} lineWidth={4} transparent opacity={fade} />
      ) : null}
      {frame <= to + 4 ? (
        <mesh position={p}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <Glow color={color} intensity={4} />
        </mesh>
      ) : null}
    </>
  );
};

const Network: React.FC = () => (
  <>
    {/* dim cable runs */}
    {[P_TO_ACQ, P_TO_NPCI, ...ISSUERS.map((b) => issuerPath(b.z)), P_RETURN.slice(3)].map((pts, i) => (
      <Line key={i} points={pts} color="#1E3A60" lineWidth={2} />
    ))}
    <Packet path={P_UP} from={T.idUp} to={T.idUp + 24} color={ORANGE} until={T.game + 40} />
    <Packet path={P_TO_ACQ} from={T.game + 10} to={T.acq} color={ORANGE} />
    <Packet path={P_TO_NPCI} from={T.npci} to={T.npci + 28} color={ORANGE} />
    {ISSUERS.map((b) => (
      <Packet key={b.z} path={issuerPath(b.z)} from={T.ask} to={T.ask + 20} color={b.yours ? ORANGE : "#6C86AD"} />
    ))}
    <Packet path={issuerPath(CZ)} from={T.tell} to={T.yourBank} color={GREEN} />
    <Packet path={P_RETURN} from={T.debit + 4} to={T.barrier} color={GREEN} until={T.end - 10} />
    <FinalTrail />
  </>
);

/** Callback: one light line from the (moving) sticker up to the reader and on to your bank. */
const FinalTrail: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.end) return null;
  const route: Vec3[] = [sticker(frame), READER, ...P_TO_ACQ, ...P_TO_NPCI.slice(1), ...issuerPath(CZ).slice(1)];
  const t = interpolate(frame, [T.end, F("bank", 4) + 6], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const { p, upTo } = along(route, t);
  return (
    <>
      <Line points={upTo} color={CYAN} lineWidth={5} />
      <mesh position={p}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <Glow color={CYAN} intensity={4} />
      </mesh>
    </>
  );
};

// ---- Buildings -----------------------------------------------------------------------
const Bank: React.FC<{
  pos: Vec3;
  sign: string;
  glow?: number;
  color?: string;
  scale?: number;
  /** Rotation about y; the front faces +z at 0. */
  turn?: number;
}> = ({ pos, sign, glow = 0, color = CYAN, scale = 1, turn = 0 }) => {
  const tex = useLabelTex(sign, color, 512, 112, 56);
  const pediment = useMemo(() => {
    const s = new Shape();
    s.moveTo(-1.3, 0);
    s.lineTo(1.3, 0);
    s.lineTo(0, 0.6);
    s.closePath();
    const g = new ExtrudeGeometry(s, { depth: 1.8, bevelEnabled: false });
    g.translate(0, 0, -0.9);
    return g;
  }, []);
  return (
    <group position={pos} scale={scale} rotation={[0, turn, 0]}>
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.7, 0.3, 2.1]} />
        <meshStandardMaterial color={B1} />
      </mesh>
      <mesh position={[0, 1.1, -0.25]} castShadow>
        <boxGeometry args={[2.2, 1.6, 1.2]} />
        <meshStandardMaterial color={B2} roughness={0.6} />
      </mesh>
      {/* lit doorway */}
      <mesh position={[0, 0.85, 0.36]}>
        <planeGeometry args={[0.5, 0.9]} />
        <Glow color={color} intensity={0.12 + glow * 0.8} />
      </mesh>
      {[-0.9, -0.3, 0.3, 0.9].map((cx) => (
        <mesh key={cx} position={[cx, 1.1, 0.6]} castShadow>
          <cylinderGeometry args={[0.11, 0.11, 1.6, 16]} />
          <meshStandardMaterial color={B2} roughness={0.4} metalness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 2.0, 0]} castShadow>
        <boxGeometry args={[2.6, 0.2, 2.0]} />
        <meshStandardMaterial color={B2} />
      </mesh>
      <mesh geometry={pediment} position={[0, 2.1, 0]} castShadow>
        <meshStandardMaterial color={B2} />
      </mesh>
      <mesh position={[0, 2.11, 1.01]}>
        <boxGeometry args={[2.6, 0.03, 0.03]} />
        <Glow color={color} intensity={0.8 + glow * 3} />
      </mesh>
      <mesh position={[0, 1.6, 0.73]}>
        <planeGeometry args={[1.5, 0.33]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* floor halo */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 1.9, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.12 + glow * 0.5} toneMapped={false} />
      </mesh>
    </group>
  );
};

const Npci: React.FC = () => {
  const frame = useCurrentFrame();
  const busy = Math.max(ramp(frame, T.npci + 20, T.npci + 30), 0) * (frame < T.barrier ? 1 : 0.4);
  return (
    <group position={[NPCI_X, 0, CZ]} scale={0.75}>
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[1.3, 1.4, 0.3, 48]} />
        <meshStandardMaterial color={B1} />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.65, 0.75, 2.8, 32]} />
        <meshStandardMaterial color={B1} roughness={0.4} metalness={0.5} />
      </mesh>
      {[0.9, 1.7, 2.5].map((y, i) => (
        <mesh
          key={y}
          position={[0, y + 0.06 * Math.sin(frame / 12 + i * 2), 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={1 + 0.06 * busy * Math.sin(frame / 5 + i)}
        >
          <torusGeometry args={[1.0, 0.03, 8, 64]} />
          <Glow color={ORANGE} intensity={0.5 + busy * 1.0} />
        </mesh>
      ))}
      <mesh position={[0, 3.05, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <Glow color={ORANGE} intensity={1 + busy} />
      </mesh>
      <pointLight position={[0, 2, 1.5]} color={ORANGE} intensity={3 + busy * 4} distance={7} />
    </group>
  );
};

const BalanceScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const debited = frame >= T.debit;
  const draw = (amount: string, note: string, col: string) => (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = "rgba(5,12,24,0.9)";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = col;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.fillStyle = "#9FB7D6";
    ctx.font = "600 34px Inter, 'Segoe UI', sans-serif";
    ctx.fillText("FASTag wallet", 34, 58);
    ctx.fillStyle = "#EAF6FF";
    ctx.font = "800 92px Inter, 'Segoe UI', sans-serif";
    ctx.fillText(amount, 34, 160);
    ctx.fillStyle = col;
    ctx.font = "700 36px Inter, 'Segoe UI', sans-serif";
    ctx.fillText(note, 34, 220);
  };
  const before = useCanvasTexture(512, 256, draw("₹1,250", "Balance", CYAN));
  const after = useCanvasTexture(512, 256, draw("₹1,145", "−₹105 toll paid", RED));
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - T.yourBank, fps, config: { damping: 14 } });
  const flash = interpolate(frame, [T.debit, T.debit + 4, T.debit + 20], [0, 1, 0], clamp);
  if (pop <= 0.01) return null;
  return (
    <group position={[BANK_X - 0.5, 2.95, CZ]} rotation={[0, -Math.PI / 2, 0]} scale={pop}>
      <mesh>
        <planeGeometry args={[1.6, 0.8]} />
        <meshBasicMaterial map={debited ? after : before} toneMapped={false} transparent />
      </mesh>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[1.68, 0.86]} />
        <meshBasicMaterial color={RED} transparent opacity={flash * 0.8} toneMapped={false} />
      </mesh>
    </group>
  );
};

const Phone: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tex = useCanvasTexture(400, 800, (ctx, w, h) => {
    ctx.fillStyle = "#07101E";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#9FB7D6";
    ctx.font = "600 28px Inter, 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("10:42", w / 2, 70);
    ctx.textAlign = "left";
    ctx.fillStyle = "#12233A";
    ctx.beginPath();
    ctx.roundRect(22, 250, w - 44, 270, 26);
    ctx.fill();
    ctx.fillStyle = GREEN;
    ctx.font = "700 26px Inter, 'Segoe UI', sans-serif";
    ctx.fillText("SMS · now", 46, 296);
    ctx.fillStyle = "#EAF6FF";
    ctx.font = "700 34px Inter, 'Segoe UI', sans-serif";
    ctx.fillText("₹105 debited", 46, 352);
    ctx.font = "500 26px Inter, 'Segoe UI', sans-serif";
    ctx.fillStyle = "#B9CCE4";
    ["from your FASTag", "at the toll plaza.", "Balance: ₹1,145"].forEach((l, i) =>
      ctx.fillText(l, 46, 400 + i * 36),
    );
  });
  const pop = spring({ frame: frame - T.phone, fps, config: { damping: 13 } });
  const out = ramp(frame, T.end - 14, T.end);
  const k = pop * (1 - out);
  if (k <= 0.01) return null;
  const x = carX(frame);
  return (
    <group position={[x + 0.4, 3.0 + 0.2 * k, 0.9]} rotation={[0, -Math.PI / 2 + 0.25, 0]} scale={0.8 * k}>
      <mesh>
        <boxGeometry args={[0.72, 1.42, 0.06]} />
        <meshStandardMaterial color="#0A0F18" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.032]}>
        <planeGeometry args={[0.64, 1.3]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
};

const World: React.FC = () => {
  const frame = useCurrentFrame();
  const yours = ramp(frame, T.ask + 18, T.ask + 26);
  return (
    <>
      <Road />
      <Gantry />
      <Booth />
      <Barrier />
      <Car />
      <Inlay />
      <Waves />
      <Network />
      <Bank pos={[ACQ_X, 0, CZ]} sign="PLAZA BANK" glow={ramp(frame, T.acq - 4, T.acq + 4) * (frame < T.npci + 30 ? 1 : 0.3)} />
      <Npci />
      {ISSUERS.map((b) => (
        <Bank
          key={b.z}
          pos={[BANK_X, 0, b.z]}
          sign={b.sign}
          scale={0.75}
          turn={-Math.PI / 2}
          color={b.yours ? GREEN : "#6C86AD"}
          glow={b.yours ? yours : 0}
        />
      ))}
      <BalanceScreen />
      <Phone />
      <hemisphereLight args={["#4A6FA5", "#05080F", 1.1]} />
      <pointLight position={[ACQ_X, 4, CZ + 2]} color={CYAN} intensity={10} distance={10} />
      <pointLight position={[BANK_X, 4, CZ + 2]} color={GREEN} intensity={8} distance={10} />
      <pointLight position={[-8, 3, 2]} color="#9FC6FF" intensity={8} distance={10} />
    </>
  );
};

export const FastagReel: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: LOOK.bg }}>
    <Audio src={staticFile("fastag/voiceover.mp3")} />
    <SoundEffects cues={SFX} />
    <ThreeCanvas width={1080} height={1920} shadows camera={{ fov: LOOK.fov, near: 0.1, far: 200 }}>
      <CameraRig poseAt={poseAt} fov={LOOK.fov} />
      <LookEnvironment look={LOOK} />
      <World />
      <LookEffects look={LOOK} />
    </ThreeCanvas>
    <Callouts
      items={CALLOUTS}
      poseAt={poseAt}
      spec={SPEC}
      variant={LOOK.callout}
      color={LOOK.ink}
      plate={LOOK.plate}
    />
    <SceneHeader
      variant="scene"
      sections={SECTIONS}
      duration={DURATION}
      ink={LOOK.ink}
      accent={CYAN}
    />
    <StylishCaptions src="fastag/captions.json" keywords={KEYWORDS} variant={LOOK.caption} accent={CYAN} />
  </AbsoluteFill>
);
