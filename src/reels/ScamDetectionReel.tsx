/**
 * How your phone catches scam messages: 3D neon reel (hinglish-3d-reel skill).
 *
 * World (x runs left → right in story order, everything code-built, no models):
 *   hero phone with the "Hey, kaise ho?" chat (x = 0)
 *   → old spam filter gate that messages travel through (x = GATE_X)
 *   → x-ray phone (x = XR_X): the scam conversation stacks up as a chat thread, the phone shell
 *     forms around it, the on-device AI chip reads the whole thread, warning, privacy dome
 *   → cloud server above/behind the x-ray phone (never receives the chat)
 *   → camera flies back to the hero phone for the callback.
 */
import { Line } from "@react-three/drei";
import { ThreeCanvas } from "@remotion/three";
import { Caption } from "@remotion/captions";
import React from "react";
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
import words from "../../public/scam-detection/captions.json";
import { StylishCaptions } from "../kit/StylishCaptions";
import { phraseFrame } from "../kit/timing";
import { Callouts, CalloutSpec } from "../kit/three/Callout";
import { CameraRig } from "../kit/three/CameraRig";
import { makeCameraTrack, Shot, Vec3 } from "../kit/three/cameraTrack";
import { useCanvasTexture } from "../kit/three/canvasTexture";
import { LookEffects, LookEnvironment, LOOKS } from "../kit/three/looks";
import { SceneHeader } from "../kit/three/SceneHeader";

const W = words as Caption[];
const F = (p: string, n = 1) => phraseFrame(W, p, n);
export const DURATION = 1938;
const LOOK = LOOKS.neon;
const KEYWORDS = ["Scam Detection", "on-device AI", "spam filter", "pattern", "Likely scam", "conversation", "loophole"];
const SPEC = { fov: LOOK.fov, width: 1080, height: 1920 };

const CYAN = LOOK.accent.primary;
const ORANGE = LOOK.accent.secondary;
const GREEN = LOOK.accent.good;
const RED = LOOK.accent.bad;
const BLUE = "#7FA8FF";
const [B0, B1, B2] = LOOK.base;
const FONT = "Inter, 'Segoe UI', 'Segoe UI Emoji', sans-serif";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ramp = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], clamp);

// ---- Timeline (anchored to the voiceover) -------------------------------------------
const T = {
  savings: F("savings"),
  gayab: F("gayab"),
  noLink: F("Na koi link"),
  noVirus: F("virus"),
  warn: F("warning"),
  kaise: F("Kaise"),
  filter: F("Purana spam filter"),
  check: F("number aur link"),
  naya: F("Naya number"),
  andar: F("Andar aa jao"),
  loophole: F("loophole"),
  convo: F("Aaj ka scam"),
  wrong: F("wrong number"),
  dosti: F("dosti"),
  invest: F("investment"),
  paise: F("paise bhejo"),
  detect: F("Scam Detection"),
  onDevice: F("on-device"),
  simple: F("Simple bhasha"),
  detective: F("detective"),
  kahani: F("kahani"),
  harNaya: F("Har naya message"),
  pattern: F("pattern"),
  kaun: F("kaun hai"),
  maang: F("kya maang"),
  jaldi: F("kitni jaldi"),
  scamLike: F("Pattern scam"),
  likely: F("Likely scam"),
  report: F("report"),
  block: F("block"),
  twist: F("Lekin asli twist"),
  inside: F("phone ke andar"),
  chats: F("Tumhari chats"),
  server: F("server"),
  anjaan: F("sirf anjaan"),
  agli: F("Toh agli baar"),
  padh: F("padh chuka"),
};

// ---- World layout -------------------------------------------------------------------
const HERO: Vec3 = [0, 2.4, 0]; // hero phone centre (1.7 x 3.4)
const CARD: Vec3 = [0, 4.75, 0.15]; // savings card above the phone
const GATE_X = 8;
const LANE_Y = 1.6;
const XR_X = 17; // x-ray phone
const XR_C: Vec3 = [XR_X, 3.4, 0]; // shell centre (3.4 x 6.8)
const BUB_X = XR_X - 0.15;
const THREAD = [
  { y: 5.3, sender: "+91 98765 4····", text: "Hey, kya ye Rahul hai?", color: BLUE, at: () => T.wrong },
  { y: 4.3, sender: "+91 98765 4····", text: "Sorry 🙏 aap kahan se ho?", color: GREEN, at: () => T.dosti },
  { y: 3.3, sender: "+91 98765 4····", text: "Zabardast investment 📈 3x return", color: ORANGE, at: () => T.invest },
  { y: 2.3, sender: "+91 98765 4····", text: "Abhi ₹50,000 bhejo! Jaldi!", color: RED, at: () => T.paise },
];
const CHIP: Vec3 = [XR_X, 1.0, 0.08];
const SERVER: Vec3 = [XR_X, 8.4, -3];
const CONTACTS = [
  { y: 4.6, sender: "Mom ❤️", text: "Khana kha liya?" },
  { y: 3.5, sender: "Rahul", text: "Match dekh raha hai?" },
];
const CONTACT_X = XR_X - 3.05;

// ---- Camera ------------------------------------------------------------------------
const SHOTS: Shot[] = [
  // Poses come from out/scam-detection/gen-shots.cjs (frame-checked): content sits between header and captions.
  // 1a Hook: close on the chat bubble on the hero phone screen.
  { from: 0, pos: [0.2, 3.25, 3.6], target: [0, 3.25, 0], drift: [0, 0, 0.3] },
  // 1b Savings card pops above the phone.
  { from: T.savings - 4, pos: [0.2, 3.67, 6.8], target: [0, 3.67, 0], drift: [0, 0, 0.3], moveFrames: 18 },
  // 2 No link, no virus, still a warning: the whole phone.
  { from: T.noLink - 6, pos: [0.6, 1.6, 10.6], target: [0, 1.6, 0], drift: [-1.0, 0, -0.3], moveFrames: 22 },
  // 3 Spam filter gate, messages travel along the lane.
  { from: T.filter - 10, pos: [5.2, 2.3, 12.5], target: [7.2, 2.0, 0], drift: [0.6, 0, -0.3], moveFrames: 32 },
  // 4 Loophole: follow the clean message past the gate.
  { from: T.loophole - 10, pos: [11.0, 2.4, 12.5], target: [10.4, 2.0, 0], drift: [0.4, 0, -0.2] },
  // 5 The conversation thread at the x-ray phone.
  { from: T.convo - 10, pos: [XR_X, 3.0, 10.6], target: [XR_X, 3.0, 0], drift: [0.3, 0, 0], moveFrames: 34 },
  // 6 Shell forms: pull back to show the whole phone + chip.
  { from: T.detect - 10, pos: [XR_X + 0.6, 1.9, 19.5], target: [XR_X, 1.9, 0], drift: [-0.6, 0, -0.3] },
  // 7 Detective: back on the thread being read.
  { from: T.simple - 8, pos: [XR_X + 0.5, 2.28, 17.1], target: [XR_X, 2.28, 0], drift: [-0.5, 0, -1.0] },
  // 8 Pattern: thread + chip, data flowing down.
  { from: T.harNaya - 8, pos: [XR_X - 0.6, 2.28, 17.1], target: [XR_X, 2.28, 0], drift: [0.6, 0, -0.4] },
  // 9 Warning, front on.
  { from: T.scamLike - 8, pos: [XR_X, 2.28, 17.1], target: [XR_X, 2.28, 0], drift: [-0.3, 0, -0.6] },
  // 10a Twist: pull back, the privacy dome closes around the phone.
  { from: T.twist - 10, pos: [XR_X + 0.6, 1.9, 19.5], target: [XR_X, 1.9, 0], drift: [-0.6, 0, -0.4], moveFrames: 30 },
  // 10b Tilt up: the cloud server above never gets the chat.
  { from: T.chats - 8, pos: [XR_X + 1.0, 5.8, 18], target: [XR_X, 5.8, -1.5], drift: [-0.6, 0, -0.5], moveFrames: 24 },
  // 11 Unknown numbers only: contacts beside the phone.
  { from: T.anjaan - 8, pos: [15.85, 2.3, 18], target: [15.85, 2.3, 0], drift: [0.3, 0, -0.2], moveFrames: 22 },
  // 12 Callback: back at the hero phone, the warning is already there.
  { from: T.agli - 10, pos: [0.4, 1.6, 10.6], target: [0, 1.6, 0], drift: [-0.3, 0, -0.8], moveFrames: 28 },
];
const poseAt = makeCameraTrack(SHOTS, DURATION);

// ---- Overlays ----------------------------------------------------------------------
const CALLOUTS: CalloutSpec[] = [
  { from: T.noLink, to: T.filter - 12, label: "No link ✕", point: [HERO[0] - 0.6, 3.4, 0.1], dx: -150, dy: -150 },
  { from: T.noVirus, to: T.filter - 12, label: "No virus ✕", point: [HERO[0] + 0.6, 2.6, 0.1], dx: 150, dy: -120 },
  { from: T.check, to: T.naya - 6, label: "Checks: number + link", point: [GATE_X, 3.3, 0], dx: -250, dy: -130 },
  { from: T.andar + 4, to: T.convo - 12, label: "New number, clean text → passed", point: (f) => [laneX(f, T.naya - 6), LANE_Y + 0.3, 0], dx: -170, dy: -230 },
  { from: T.kaun, to: T.scamLike - 6, label: "Sender: unknown", point: [BUB_X + 1.0, THREAD[0].y, 0.1], dx: 130, dy: -60 },
  { from: T.maang, to: T.scamLike - 6, label: "Asks: money", point: [BUB_X + 1.0, THREAD[3].y, 0.1], dx: 130, dy: 50 },
  { from: T.jaldi, to: T.scamLike - 6, label: "Urgency: high", point: [BUB_X + 1.0, THREAD[2].y, 0.1], dx: 130, dy: -10 },
  { from: T.inside + 6, to: T.anjaan - 10, label: "On-phone only", point: [XR_X + 1.7, 4.5, 0], dx: 30, dy: -200 },
  { from: T.server, to: T.anjaan - 10, label: "No cloud upload", point: [SERVER[0] + 0.8, SERVER[1], SERVER[2]], dx: 120, dy: -60 },
  { from: T.anjaan + 4, to: T.agli - 12, label: "Contacts: skipped", point: [CONTACT_X, 5.1, 0.1], dx: 20, dy: -170 },
  { from: T.anjaan + 14, to: T.agli - 12, label: "Unknown: checked", point: [XR_X - 1.7, 2.5, 0], dx: -30, dy: 60 },
];

const SECTIONS = [
  { from: 0, label: "Unknown chat" },
  { from: T.filter - 10, label: "Spam filter" },
  { from: T.loophole - 10, label: "The loophole" },
  { from: T.convo - 10, label: "The conversation" },
  { from: T.detect - 10, label: "On-device AI" },
  { from: T.scamLike - 8, label: "Warning" },
  { from: T.twist - 10, label: "Privacy" },
  { from: T.anjaan - 8, label: "Unknown only" },
  { from: T.agli - 10, label: "Next time" },
];

// ---- Helpers -----------------------------------------------------------------------
const Glow: React.FC<{ color: string; intensity?: number; opacity?: number }> = ({ color, intensity = 2, opacity = 1 }) => (
  <meshStandardMaterial
    color={color}
    emissive={color}
    emissiveIntensity={intensity}
    toneMapped={false}
    transparent={opacity < 1}
    opacity={opacity}
  />
);

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
};

const useBubbleTex = (sender: string, text: string, color: string) =>
  useCanvasTexture(
    1024,
    300,
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      roundRect(ctx, 8, 8, w - 16, h - 16, 60);
      ctx.fillStyle = "rgba(8,16,30,0.94)";
      ctx.fill();
      ctx.lineWidth = 10;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = `700 46px ${FONT}`;
      ctx.fillText(sender, 60, 100);
      ctx.fillStyle = "#F2F8FF";
      ctx.font = `700 70px ${FONT}`;
      ctx.fillText(text, 60, 205, w - 120);
    },
    [sender, text, color],
  );

/** A chat bubble card (2.4 x 0.7). */
const Bubble: React.FC<{
  pos: Vec3;
  sender: string;
  text: string;
  color: string;
  scale?: number;
  opacity?: number;
  rot?: Vec3;
}> = ({ pos, sender, text, color, scale = 1, opacity = 1, rot = [0, 0, 0] }) => {
  const tex = useBubbleTex(sender, text, color);
  if (opacity <= 0.01 || scale <= 0.01) return null;
  return (
    <group position={pos} rotation={rot} scale={scale}>
      <mesh>
        <planeGeometry args={[2.4, 0.703]} />
        <meshBasicMaterial map={tex} transparent opacity={opacity} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
};

const useLabelTex = (text: string, color: string, w = 768, h = 160, font = 76) =>
  useCanvasTexture(
    w,
    h,
    (ctx) => {
      ctx.clearRect(0, 0, w, h);
      roundRect(ctx, 4, 4, w - 8, h - 8, 24);
      ctx.fillStyle = "rgba(5,10,20,0.88)";
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = `800 ${font}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, w / 2, h / 2 + 3);
    },
    [text, color, w, h, font],
  );

const Sign: React.FC<{ pos: Vec3; text: string; color: string; width: number; opacity?: number; rot?: Vec3 }> = ({
  pos,
  text,
  color,
  width,
  opacity = 1,
  rot = [0, 0, 0],
}) => {
  const tex = useLabelTex(text, color);
  if (opacity <= 0.01) return null;
  return (
    <mesh position={pos} rotation={rot}>
      <planeGeometry args={[width, (width * 160) / 768]} />
      <meshBasicMaterial map={tex} transparent opacity={opacity} toneMapped={false} depthWrite={false} />
    </mesh>
  );
};

// ---- Hero phone (x = 0) ---------------------------------------------------------------
const useChatScreen = () =>
  useCanvasTexture(540, 1092, (ctx, w, h) => {
    ctx.fillStyle = "#070D18";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#9FB7D6";
    ctx.font = `600 26px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("10:42", w / 2, 52);
    // header
    ctx.fillStyle = "#0E1A2E";
    ctx.fillRect(0, 80, w, 120);
    ctx.fillStyle = "#2A3D5C";
    ctx.beginPath();
    ctx.arc(70, 140, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#EAF6FF";
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText("?", 70, 151);
    ctx.textAlign = "left";
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText("+91 98765 4····", 122, 132);
    ctx.fillStyle = "#8CA0BF";
    ctx.font = `500 24px ${FONT}`;
    ctx.fillText("Unknown number", 122, 168);
    // incoming bubble
    roundRect(ctx, 34, 250, 360, 96, 34);
    ctx.fillStyle = "#1A2B46";
    ctx.fill();
    ctx.fillStyle = "#F2F8FF";
    ctx.font = `700 36px ${FONT}`;
    ctx.fillText("Hey, kaise ho? 👋", 62, 310);
    ctx.fillStyle = "#6F86A8";
    ctx.font = `500 20px ${FONT}`;
    ctx.fillText("10:41", 40, 372);
    // input bar
    roundRect(ctx, 24, h - 110, w - 48, 74, 37);
    ctx.fillStyle = "#101C30";
    ctx.fill();
    ctx.fillStyle = "#5C6F8F";
    ctx.font = `500 26px ${FONT}`;
    ctx.fillText("Text message", 60, h - 63);
  });

const useWarnTex = () =>
  useCanvasTexture(540, 300, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    roundRect(ctx, 14, 14, w - 28, h - 28, 30);
    ctx.fillStyle = "rgba(60,8,16,0.96)";
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = RED;
    ctx.stroke();
    ctx.fillStyle = "#FFD5DA";
    ctx.font = `800 46px ${FONT}`;
    ctx.fillText("⚠ Likely scam", 44, 92);
    ctx.fillStyle = "#FFB3BC";
    ctx.font = `500 24px ${FONT}`;
    ctx.fillText("This message looks like a scam", 44, 134);
    roundRect(ctx, 44, 178, 200, 76, 22);
    ctx.fillStyle = "#2A0A10";
    ctx.fill();
    ctx.strokeStyle = "#FF9AA6";
    ctx.lineWidth = 4;
    ctx.stroke();
    roundRect(ctx, 270, 178, 226, 76, 22);
    ctx.fillStyle = RED;
    ctx.fill();
    ctx.font = `800 32px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFD5DA";
    ctx.fillText("Report", 144, 228);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("Block", 383, 228);
  });

const HeroPhone: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const screen = useChatScreen();
  const warnTex = useWarnTex();
  // warning: hook beat, then again for the callback (already there when the chat appears)
  const w1 = spring({ frame: frame - T.warn, fps, config: { damping: 12 } }) * (1 - ramp(frame, T.filter, T.filter + 10));
  const w2 = frame >= T.agli - 10 ? spring({ frame: frame - (T.agli + 12), fps, config: { damping: 12 } }) : 0;
  const warn = Math.max(w1, w2);
  const ring = interpolate(frame, [T.warn, T.warn + 10, T.warn + 40], [0, 1, 0.55], clamp) * (1 - ramp(frame, T.filter, T.filter + 10)) +
    (frame >= T.agli ? interpolate(frame, [T.agli + 12, T.agli + 22, T.padh], [0, 1, 0.7], clamp) : 0);
  return (
    <group position={HERO}>
      <mesh>
        <boxGeometry args={[1.7, 3.4, 0.14]} />
        <meshStandardMaterial color="#0A0F18" metalness={0.7} roughness={0.25} />
      </mesh>
      {/* rim light */}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[1.76, 3.46, 0.1]} />
        <Glow color={warn > 0.5 ? RED : CYAN} intensity={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.071]} scale={[1, 1, 1]}>
        <planeGeometry args={[1.56, 3.155]} />
        <meshBasicMaterial map={screen} toneMapped={false} />
      </mesh>
      {warn > 0.01 ? (
        <mesh position={[0, -0.1, 0.09]} scale={warn} renderOrder={10}>
          <planeGeometry args={[1.5, 0.833]} />
          <meshBasicMaterial map={warnTex} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      ) : null}
      {ring > 0.01 ? (
        <group position={[0, 0, -0.06]} scale={1.15 - 0.15 * Math.min(1, ring)}>
          {[
            { p: [0, 1.85, 0] as Vec3, a: [2.1, 0.05, 0.05] as Vec3 },
            { p: [0, -1.85, 0] as Vec3, a: [2.1, 0.05, 0.05] as Vec3 },
            { p: [1.05, 0, 0] as Vec3, a: [0.05, 3.7, 0.05] as Vec3 },
            { p: [-1.05, 0, 0] as Vec3, a: [0.05, 3.7, 0.05] as Vec3 },
          ].map((e, i) => (
            <mesh key={i} position={e.p}>
              <boxGeometry args={e.a} />
              <Glow color={RED} intensity={2.4} opacity={Math.min(1, ring)} />
            </mesh>
          ))}
        </group>
      ) : null}
    </group>
  );
};

const useSavingsTex = (amount: string, color: string, strike: boolean) =>
  useCanvasTexture(
    680,
    250,
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      roundRect(ctx, 8, 8, w - 16, h - 16, 34);
      ctx.fillStyle = "rgba(6,14,26,0.95)";
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.fillStyle = "#9FB7D6";
      ctx.font = `600 38px ${FONT}`;
      ctx.fillText("Savings account", 46, 82);
      ctx.fillStyle = color;
      ctx.font = `800 92px ${FONT}`;
      ctx.fillText(amount, 46, 190);
      if (strike) {
        ctx.fillStyle = color;
        ctx.font = `700 40px ${FONT}`;
        ctx.textAlign = "right";
        ctx.fillText("−₹2,40,000", w - 40, 186);
      }
    },
    [amount, color, strike],
  );

const SavingsCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const full = useSavingsTex("₹2,40,000", GREEN, false);
  const zero = useSavingsTex("₹0", RED, true);
  const pop = spring({ frame: frame - T.savings, fps, config: { damping: 13 } });
  const drain = ramp(frame, T.gayab, T.gayab + 8);
  const shake = frame > T.gayab && frame < T.gayab + 14 ? Math.sin(frame * 2.2) * 0.05 : 0;
  const out = ramp(frame, T.noLink - 6, T.noLink + 6);
  const k = pop * (1 - out);
  if (k <= 0.01) return null;
  return (
    <group position={[CARD[0] + shake, CARD[1], CARD[2]]} scale={k}>
      <mesh>
        <planeGeometry args={[1.7, 0.625]} />
        <meshBasicMaterial map={full} transparent opacity={1 - drain} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[1.7, 0.625]} />
        <meshBasicMaterial map={zero} transparent opacity={drain} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
};

// ---- Spam filter gate (x = GATE_X) -------------------------------------------------------
/** x of a lane message that starts moving at `start`, stops at the gate, and (if `pass`) continues. */
const laneX = (f: number, start: number, pass = true) => {
  const stopAt = GATE_X - 1.45;
  if (!pass) return interpolate(f, [start, T.check - 4], [GATE_X - 3.6, stopAt], { ...clamp, easing: Easing.out(Easing.cubic) });
  if (f < T.andar) return interpolate(f, [start, start + 34], [GATE_X - 3.6, stopAt], { ...clamp, easing: Easing.out(Easing.cubic) });
  return interpolate(f, [T.andar, T.andar + 90], [stopAt, GATE_X + 3.0], { ...clamp, easing: Easing.inOut(Easing.cubic) });
};

const Gate: React.FC = () => {
  const frame = useCurrentFrame();
  const blocked = interpolate(frame, [T.check + 6, T.check + 10, T.naya - 4], [0, 1, 0], clamp);
  const passed = ramp(frame, T.andar - 2, T.andar + 6) * (1 - ramp(frame, T.convo, T.convo + 20));
  const color = blocked > 0.5 ? RED : passed > 0.5 ? GREEN : CYAN;
  const scan = 0.12 + 0.12 * Math.abs(Math.sin(frame / 7)) + 0.25 * Math.max(blocked, passed);
  return (
    <group position={[GATE_X, 0, 0]}>
      {[-1.4, 1.4].map((z) => (
        <mesh key={z} position={[0, 1.7, z]}>
          <boxGeometry args={[0.28, 3.4, 0.28]} />
          <meshStandardMaterial color={B2} metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 3.45, 0]}>
        <boxGeometry args={[0.34, 0.3, 3.1]} />
        <meshStandardMaterial color={B2} metalness={0.5} roughness={0.4} />
      </mesh>
      {[-1.24, 1.24].map((z) => (
        <mesh key={z} position={[0, 1.7, z]}>
          <boxGeometry args={[0.06, 3.2, 0.06]} />
          <Glow color={color} intensity={1.8} />
        </mesh>
      ))}
      <mesh position={[0, 1.7, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.5, 3.2]} />
        <meshBasicMaterial color={color} transparent opacity={scan} toneMapped={false} depthWrite={false} side={2} />
      </mesh>
      <Sign pos={[0, 4.0, 0.2]} text="SPAM FILTER" color={color} width={2.4} />
    </group>
  );
};

const Lane: React.FC = () => (
  <>
    <mesh position={[GATE_X - 1, 0.03, 0]}>
      <boxGeometry args={[12, 0.02, 0.07]} />
      <Glow color={CYAN} intensity={0.7} />
    </mesh>
    {[-1.4, 1.4].map((z) => (
      <mesh key={z} position={[GATE_X - 1, 0.03, z]}>
        <boxGeometry args={[12, 0.02, 0.03]} />
        <meshStandardMaterial color="#2A3D5C" />
      </mesh>
    ))}
  </>
);

const LaneMessages: React.FC = () => {
  const frame = useCurrentFrame();
  // 1) link message: blocked at the gate
  const linkIn = ramp(frame, T.filter, T.filter + 8);
  const linkRed = ramp(frame, T.check + 6, T.check + 10);
  const fall = ramp(frame, T.check + 14, T.check + 40);
  const linkOut = ramp(frame, T.check + 30, T.check + 44);
  const lx = laneX(frame, T.filter, false);
  // 2) clean "Hey, kaise ho?": passes
  const heyIn = ramp(frame, T.naya - 6, T.naya + 4);
  const heyOut = ramp(frame, T.convo - 4, T.convo + 10);
  const hx = laneX(frame, T.naya - 6);
  const hop = frame > T.andar ? Math.sin(ramp(frame, T.andar, T.andar + 90) * Math.PI) * 0.25 : 0;
  return (
    <>
      {frame >= T.filter && frame < T.check + 46 ? (
        <>
          <Bubble
            pos={[lx, LANE_Y - fall * 1.2, fall * 0.8]}
            rot={[0, -0.25, -fall * 0.9]}
            sender="VM-KYCUPD"
            text="KYC update: bit.ly/x9k2"
            color={CYAN}
            opacity={linkIn * (1 - linkRed) * (1 - linkOut)}
            scale={0.8}
          />
          <Bubble
            pos={[lx, LANE_Y - fall * 1.2, fall * 0.8 + 0.01]}
            rot={[0, -0.25, -fall * 0.9]}
            sender="BLOCKED ✕"
            text="KYC update: bit.ly/x9k2"
            color={RED}
            opacity={linkRed * (1 - linkOut)}
            scale={0.8}
          />
        </>
      ) : null}
      {frame >= T.naya - 6 && frame < T.convo + 12 ? (
        <Bubble
          pos={[hx, LANE_Y + hop, 0]}
          rot={[0, -0.25, 0]}
          sender="+91 98765 4····"
          text="Hey, kaise ho? 👋"
          color={frame > T.andar ? GREEN : CYAN}
          opacity={heyIn * (1 - heyOut)}
          scale={0.8}
        />
      ) : null}
    </>
  );
};

// ---- X-ray phone (x = XR_X) -------------------------------------------------------------
const useSlotTex = () =>
  useCanvasTexture(1024, 300, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.setLineDash([34, 22]);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(127,168,255,0.85)";
    ctx.beginPath();
    ctx.roundRect(10, 10, w - 20, h - 20, 60);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(127,168,255,0.55)";
    [0, 1, 2].forEach((i) => {
      ctx.beginPath();
      ctx.arc(w / 2 - 70 + i * 70, h / 2, 16, 0, Math.PI * 2);
      ctx.fill();
    });
  });

/** Empty message slots: the conversation is coming, one step at a time. */
const Slots: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tex = useSlotTex();
  return (
    <>
      {THREAD.map((b, i) => {
        const s = spring({ frame: frame - (T.convo + 8 + i * 9), fps, config: { damping: 14 } });
        const filled = ramp(frame, b.at() - 2, b.at() + 6);
        const k = s * (1 - filled);
        if (k <= 0.01) return null;
        return (
          <mesh key={i} position={[BUB_X, b.y, 0.06]} scale={0.9 + 0.1 * s}>
            <planeGeometry args={[2.4, 0.703]} />
            <meshBasicMaterial map={tex} transparent opacity={k * (0.75 + 0.25 * Math.sin(frame / 5 + i))} toneMapped={false} depthWrite={false} />
          </mesh>
        );
      })}
    </>
  );
};

const Thread: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const blockedK = ramp(frame, T.block + 4, T.block + 16);
  const lineIn = ramp(frame, T.convo, T.convo + 40);
  const kahani = ramp(frame, T.kahani - 4, T.kahani + 16);
  return (
    <>
      {/* spine of the conversation: draws down while "poori conversation" is spoken */}
      {lineIn > 0.01 ? (
        <mesh position={[BUB_X - 1.35, 5.75 - (lineIn * 3.9) / 2, 0.05]}>
          <boxGeometry args={[0.04, Math.max(0.01, lineIn * 3.9), 0.02]} />
          <Glow color={kahani > 0.5 ? ORANGE : "#4A6FA5"} intensity={kahani > 0.5 ? 2.2 : 1} />
        </mesh>
      ) : null}
      {THREAD.map((b, i) => {
        const s = spring({ frame: frame - b.at(), fps, config: { damping: 13 } });
        const read = frame > T.kahani ? ramp(frame, T.kahani + i * 5, T.kahani + i * 5 + 8) : 0;
        return (
          <React.Fragment key={i}>
            <Bubble
              pos={[BUB_X - 0.6 * (1 - s), b.y, 0.1]}
              sender={b.sender}
              text={b.text}
              color={b.color}
              scale={s}
              opacity={Math.min(1, s * 1.4) * (1 - 0.65 * blockedK)}
            />
            {/* "read" tick when the detective has read this message */}
            {read > 0.01 && frame < T.block + 16 ? (
              <mesh position={[BUB_X + 1.08, b.y + 0.2, 0.12]} scale={read}>
                <circleGeometry args={[0.09, 24]} />
                <meshBasicMaterial color={ORANGE} toneMapped={false} />
              </mesh>
            ) : null}
          </React.Fragment>
        );
      })}
    </>
  );
};

const useChipTex = () =>
  useCanvasTexture(512, 300, (ctx, w, h) => {
    ctx.fillStyle = "#06101E";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.strokeStyle = "rgba(63,213,255,0.35)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(40 + i * 70, 30);
      ctx.lineTo(40 + i * 70, 70);
      ctx.stroke();
    }
    ctx.fillStyle = CYAN;
    ctx.font = `800 64px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("ON-DEVICE", w / 2, 160);
    ctx.fillText("AI", w / 2, 236);
  });

const Chip: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tex = useChipTex();
  const pop = spring({ frame: frame - T.onDevice, fps, config: { damping: 12 } });
  if (pop <= 0.01) return null;
  const busy = frame > T.harNaya && frame < T.block + 10 ? 0.6 + 0.4 * Math.abs(Math.sin(frame / 3)) : 0.5;
  const alarm = interpolate(frame, [T.likely - 6, T.likely, T.twist], [0, 1, 0], clamp);
  return (
    <group position={CHIP} scale={pop}>
      <mesh>
        <boxGeometry args={[1.25, 0.74, 0.12]} />
        <meshStandardMaterial color={B0} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.062]}>
        <planeGeometry args={[1.2, 0.7]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* pins */}
      {Array.from({ length: 6 }, (_, i) => (
        <React.Fragment key={i}>
          <mesh position={[-0.5 + i * 0.2, 0.42, 0]}>
            <boxGeometry args={[0.05, 0.1, 0.05]} />
            <Glow color={alarm > 0.5 ? RED : CYAN} intensity={busy * 2} />
          </mesh>
          <mesh position={[-0.5 + i * 0.2, -0.42, 0]}>
            <boxGeometry args={[0.05, 0.1, 0.05]} />
            <Glow color={alarm > 0.5 ? RED : CYAN} intensity={busy * 2} />
          </mesh>
        </React.Fragment>
      ))}
      <pointLight position={[0, 0, 0.6]} color={alarm > 0.5 ? RED : CYAN} intensity={4 * busy} distance={4} />
    </group>
  );
};

/** Message data flowing from each bubble down a bus into the chip while the AI reads the pattern. */
const DataFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const on = ramp(frame, T.harNaya, T.harNaya + 10) * (1 - ramp(frame, T.block, T.block + 12));
  if (on <= 0.01) return null;
  const busX = BUB_X + 1.42;
  return (
    <>
      <Line points={[[busX, THREAD[0].y, 0.08], [busX, CHIP[1] + 0.2, 0.08], [CHIP[0] + 0.64, CHIP[1] + 0.2, 0.08]]} color={CYAN} lineWidth={2} transparent opacity={on * 0.7} />
      {THREAD.map((b) => (
        <Line key={b.y} points={[[BUB_X + 1.2, b.y, 0.08], [busX, b.y, 0.08]]} color={CYAN} lineWidth={2} transparent opacity={on * 0.7} />
      ))}
      {Array.from({ length: 5 }, (_, i) => {
        const t = ((frame - T.harNaya) / 40 + i / 5) % 1;
        const total = THREAD[0].y - (CHIP[1] + 0.2);
        const y = THREAD[0].y - t * total;
        return (
          <mesh key={i} position={[busX, y, 0.1]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <Glow color={CYAN} intensity={3} opacity={on} />
          </mesh>
        );
      })}
    </>
  );
};

/** Detective scan: a bar sweeping down the thread, reading the whole story. */
const Scanner: React.FC = () => {
  const frame = useCurrentFrame();
  const on = ramp(frame, T.detective - 4, T.detective + 6) * (1 - ramp(frame, T.scamLike, T.scamLike + 8));
  if (on <= 0.01) return null;
  const t = ((frame - T.detective) % 45) / 45;
  const y = 5.75 - t * 3.9;
  return (
    <group position={[BUB_X, y, 0.16]}>
      <mesh>
        <boxGeometry args={[2.9, 0.035, 0.02]} />
        <Glow color={ORANGE} intensity={3} opacity={on} />
      </mesh>
      <mesh position={[0, 0.12, -0.01]}>
        <planeGeometry args={[2.9, 0.24]} />
        <meshBasicMaterial color={ORANGE} transparent opacity={0.12 * on} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
};

const Shell: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const form = spring({ frame: frame - T.detect, fps, config: { damping: 16 } });
  if (form <= 0.01) return null;
  const alarm = interpolate(frame, [T.likely - 6, T.likely, T.twist], [0, 1, 0], clamp);
  const safe = ramp(frame, T.inside - 4, T.inside + 8);
  const color = alarm > 0.5 ? RED : safe > 0.5 ? GREEN : CYAN;
  const s = 1.25 - 0.25 * form;
  return (
    <group position={XR_C} scale={s}>
      <mesh>
        <boxGeometry args={[3.4, 6.8, 0.3]} />
        <meshStandardMaterial color="#0C1830" transparent opacity={0.22 * form} depthWrite={false} metalness={0.3} roughness={0.2} />
      </mesh>
      {/* glowing frame: 4 edges */}
      {[
        { p: [0, 3.4, 0] as Vec3, a: [3.4, 0.06, 0.06] as Vec3 },
        { p: [0, -3.4, 0] as Vec3, a: [3.4, 0.06, 0.06] as Vec3 },
        { p: [1.7, 0, 0] as Vec3, a: [0.06, 6.8, 0.06] as Vec3 },
        { p: [-1.7, 0, 0] as Vec3, a: [0.06, 6.8, 0.06] as Vec3 },
      ].map((e, i) => (
        <mesh key={i} position={e.p}>
          <boxGeometry args={e.a} />
          <Glow color={color} intensity={2} opacity={form} />
        </mesh>
      ))}
      <Sign pos={[0, 2.92, 0.17]} text="Google Messages" color={color} width={2.2} opacity={form} />
    </group>
  );
};

const WarningBanner: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tex = useWarnTex();
  const pop = spring({ frame: frame - T.likely, fps, config: { damping: 11 } });
  const out = ramp(frame, T.twist - 4, T.twist + 8);
  const k = pop * (1 - out);
  const ripple = ramp(frame, T.block, T.block + 18);
  if (k <= 0.01) return null;
  return (
    <group position={[XR_X, 3.75, 0.6]} scale={k * 1.75}>
      {/* opaque plate + banner drawn after the thread bubbles so nothing shows through */}
      <mesh renderOrder={9} position={[0, 0, -0.005]}>
        <planeGeometry args={[1.5, 0.79]} />
        <meshBasicMaterial color="#26070D" toneMapped={false} />
      </mesh>
      <mesh renderOrder={10}>
        <planeGeometry args={[1.6, 0.889]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
      </mesh>
      {ripple > 0 && ripple < 1 ? (
        <mesh position={[0.31, -0.24, 0.01]} scale={0.2 + ripple * 1.2} renderOrder={11}>
          <ringGeometry args={[0.18, 0.21, 48]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={1 - ripple} toneMapped={false} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
};

const Privacy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dome = spring({ frame: frame - T.inside, fps, config: { damping: 14 } }) * (1 - ramp(frame, T.anjaan - 8, T.anjaan + 4));
  const srv = ramp(frame, T.twist, T.twist + 14) * (1 - ramp(frame, T.anjaan - 8, T.anjaan + 4));
  const cut = ramp(frame, T.server, T.server + 6);
  if (srv <= 0.01 && dome <= 0.01) return null;
  const mid: Vec3 = [XR_X, (6.9 + SERVER[1] - 1.3) / 2, SERVER[2] / 2];
  return (
    <>
      {dome > 0.01 ? (
        <mesh position={XR_C} scale={dome}>
          <sphereGeometry args={[3.9, 32, 20]} />
          <meshBasicMaterial color={GREEN} wireframe transparent opacity={0.16} toneMapped={false} depthWrite={false} />
        </mesh>
      ) : null}
      {srv > 0.01 ? (
        <group position={SERVER}>
          <mesh>
            <boxGeometry args={[1.6, 2.4, 1.0]} />
            <meshStandardMaterial color={B1} metalness={0.5} roughness={0.4} transparent opacity={srv} />
          </mesh>
          {[0.8, 0.3, -0.2, -0.7].map((y) => (
            <mesh key={y} position={[0, y, 0.51]}>
              <boxGeometry args={[1.3, 0.08, 0.02]} />
              <Glow color={cut > 0.5 ? RED : "#9FC6FF"} intensity={1.2} opacity={srv} />
            </mesh>
          ))}
          <Sign pos={[0, 1.65, 0.3]} text="CLOUD SERVER" color={cut > 0.5 ? RED : "#9FC6FF"} width={2.0} opacity={srv} />
        </group>
      ) : null}
      {srv > 0.01 ? (
        <>
          {/* the upload path: dashed, flashes red and breaks on "server" */}
          <Line
            points={[[XR_X, 6.9, 0], mid]}
            color={cut > 0.5 ? RED : "#9FC6FF"}
            lineWidth={3}
            dashed
            dashSize={0.25}
            gapSize={0.18}
            transparent
            opacity={srv * (1 - 0.6 * cut)}
          />
          <Line
            points={[mid, [SERVER[0], SERVER[1] - 1.3, SERVER[2]]]}
            color="#9FC6FF"
            lineWidth={3}
            dashed
            dashSize={0.25}
            gapSize={0.18}
            transparent
            opacity={srv * (1 - cut)}
          />
          {cut > 0.01 ? (
            <group position={mid} scale={cut} rotation={[0, 0, Math.PI / 4]}>
              {[0, Math.PI / 2].map((r) => (
                <mesh key={r} rotation={[0, 0, r]}>
                  <boxGeometry args={[1.0, 0.14, 0.05]} />
                  <Glow color={RED} intensity={2.5} />
                </mesh>
              ))}
            </group>
          ) : null}
        </>
      ) : null}
    </>
  );
};

const Contacts: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out = ramp(frame, T.agli - 10, T.agli + 4);
  return (
    <>
      {CONTACTS.map((c, i) => {
        const s = spring({ frame: frame - (T.anjaan + i * 6), fps, config: { damping: 14 } }) * (1 - out);
        if (s <= 0.01) return null;
        return (
          <Bubble
            key={i}
            pos={[CONTACT_X - 1.2 * (1 - s), c.y, 0.1]}
            sender={c.sender}
            text={c.text}
            color={GREEN}
            scale={0.78 * s}
          />
        );
      })}
    </>
  );
};

const World: React.FC = () => (
  <>
    <HeroPhone />
    <SavingsCard />
    <Lane />
    <Gate />
    <LaneMessages />
    <Shell />
    <Slots />
    <Thread />
    <Chip />
    <DataFlow />
    <Scanner />
    <WarningBanner />
    <Privacy />
    <Contacts />
    <hemisphereLight args={["#4A6FA5", "#05080F", 1.1]} />
    <pointLight position={[0, 3, 3]} color="#9FC6FF" intensity={8} distance={9} />
    <pointLight position={[GATE_X, 3, 2.5]} color={CYAN} intensity={8} distance={9} />
    <pointLight position={[XR_X, 4, 3]} color="#9FC6FF" intensity={8} distance={12} />
  </>
);

export const ScamDetectionReel: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: LOOK.bg }}>
    <Audio src={staticFile("scam-detection/voiceover.mp3")} />
    <ThreeCanvas width={1080} height={1920} shadows camera={{ fov: LOOK.fov, near: 0.1, far: 200 }}>
      <CameraRig poseAt={poseAt} fov={LOOK.fov} />
      <LookEnvironment look={LOOK} />
      <World />
      <LookEffects look={LOOK} />
    </ThreeCanvas>
    <Callouts items={CALLOUTS} poseAt={poseAt} spec={SPEC} variant={LOOK.callout} color={LOOK.ink} plate={LOOK.plate} />
    <SceneHeader variant="scene" sections={SECTIONS} duration={DURATION} ink={LOOK.ink} accent={CYAN} />
    <StylishCaptions src="scam-detection/captions.json" keywords={KEYWORDS} variant={LOOK.caption} accent={CYAN} />
  </AbsoluteFill>
);
