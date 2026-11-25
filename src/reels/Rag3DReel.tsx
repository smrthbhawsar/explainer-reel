/**
 * RAG (Retrieval-Augmented Generation) — 3D clay reel (hinglish-3d-reel skill).
 * Same voiceover/captions as the 2D RagReel (public/rag/), so the two can be compared.
 *
 * World, along the x axis in story order:
 *   chat terminal (hook, x=-11) → LLM robot at an exam desk with a locked book and a frozen
 *   "training data" shelf (x=-5.5) → red glass wall (x=-2.4) → your private PDFs/docs/DB on a
 *   conveyor → chunker gate (x=4.4) → Vector DB library (x=9). Retrieved pages + the question
 *   then fly back over the path into the LLM, which answers. Everything is code-built (no models).
 */
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
import { Color } from "three";
import words from "../../public/rag/captions.json";
import { StylishCaptions } from "../kit/StylishCaptions";
import { phraseFrame } from "../kit/timing";
import { cutCues, popCues, SfxCue, SoundEffects } from "../kit/SoundEffects";
import { Callouts, CalloutSpec } from "../kit/three/Callout";
import { CameraRig } from "../kit/three/CameraRig";
import { makeCameraTrack, Shot, Vec3 } from "../kit/three/cameraTrack";
import { seeded, useCanvasTexture } from "../kit/three/canvasTexture";
import { LookEffects, LookEnvironment, LOOKS } from "../kit/three/looks";
import { SceneHeader } from "../kit/three/SceneHeader";

const W = words as Caption[];
const F = (p: string, n = 1) => phraseFrame(W, p, n);
export const DURATION = 1934; // public/rag/voiceover.mp3 = 64.44 s @30fps (same as RagReel)
const LOOK = LOOKS.clay;
const KEYWORDS = ["RAG", "LLM", "Vector Database", "closed-book", "open-book", "hallucination"];
const SPEC = { fov: LOOK.fov, width: 1080, height: 1920 };

const [SLATE, SLATE_2] = LOOK.base;
const ORANGE = LOOK.accent.primary;
const BLUE = LOOK.accent.secondary;
const GREEN = LOOK.accent.good;
const RED = LOOK.accent.bad;
const PAPER = "#FBF9F4";
const WOOD = "#B9AE9C";
const GOLD = "#C9A44C";
const SANS = "Inter, 'Segoe UI', system-ui, sans-serif";
const MONO = "Consolas, 'Courier New', monospace";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ramp = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], clamp);
const ease = Easing.inOut(Easing.cubic);
const eramp = (f: number, a: number, b: number) => ease(ramp(f, a, b));

// ---- Timeline (anchored to the voiceover) -------------------------------------------
const T = {
  q: 8,
  refuse: F("mana"),
  wrong: F("galat"),
  llm: F("LLM"),
  closed: F("closed-book"),
  training: F("training"),
  priv: F("private"),
  rag: F("RAG"),
  open: F("open-book"),
  pdfs: F("PDFs"),
  docs: F("docs"),
  dbs: F("databases"),
  chop: F("chhote"),
  chunks: F("chunks"),
  vector: F("Vector"),
  personal: F("personal"),
  ask: F("sawal"),
  scan: F("system"),
  relevant: F("relevant"),
  gather: F("un pages"),
  send: F("jod"),
  arrive: F("bhejta") + 8,
  exact: F("exact"),
  retrain: F("zaroorat"),
  halluc: F("darr"),
  bas: F("Bas"),
  expert: F("expert"),
};

// ---- World layout -------------------------------------------------------------------
const CHAT_X = -11;
const LLM_X = -5.5;
const WALL_X = -2.4;
const SRC_X = [-0.8, 0.5, 1.8];
const CHOP_X = 4.4;
const LIB_X = 9;
const SLOT_X = LIB_X - 0.12;
const Q_POS: Vec3 = [6.9, 1.3, 0.3];
const HEAD: Vec3 = [LLM_X, 2.15, 0.45];
const ANSWER: Vec3 = [LLM_X, 3.6, 0.5];

// Library slots: 6 rows x 5 columns, facing -x.
const ROWS = 6;
const COLS = 5;
const slotPos = (i: number): Vec3 => {
  const r = Math.floor(i / COLS);
  const c = i % COLS;
  return [SLOT_X, 0.5 + r * 0.5, -1.0 + c * 0.5];
};
const INCOMING = (() => {
  const r = seeded(11);
  const all = Array.from({ length: ROWS * COLS }, (_, i) => i);
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, 12).sort((a, b) => a - b);
})();
const HITS = [INCOMING[3], INCOMING[7], 17];

// ---- Camera ------------------------------------------------------------------------
const SHOTS: Shot[] = [
  // 1 Hook: close on the chat screen, already pushing in.
  { from: 0, pos: [-9.6, 2.0, 8.5], target: [-11, 1.6, 0], drift: [0.4, 0.1, -1.6] },
  // 2 The bot's answers: lower, closer reframe.
  { from: F("wo") - 10, pos: [-10.26, 1.78, 9.13], target: [-11, 1.41, 0.02], drift: [0.3, 0, -0.8], moveFrames: 20 },
  // 3 The LLM at its exam desk, book locked.
  { from: F("Kyunki") - 10, pos: [-3.59, 3.55, 9.9], target: [-5.11, 1.53, 0.3], drift: [-0.4, 0, -1.0], moveFrames: 30 },
  // 4 Over its shoulder: the frozen training shelf.
  { from: F("Use") - 10, pos: [-1.08, 3.22, 8.91], target: [-5.37, 1.17, -1.83], drift: [-0.4, 0, -0.8] },
  // 5 Turn to the glass wall, your private data behind it.
  { from: F("Tumhara") - 10, pos: [-9.18, 3.31, 3.26], target: [-1.11, 0.44, -0.25], drift: [0.8, 0, -0.3], moveFrames: 30 },
  // 6 Re-hook: R-A-G blocks drop in front of the wall.
  { from: F("Yahin") - 10, pos: [-2.39, 1.56, 13.99], target: [-2.39, 0.23, 2.49], drift: [0, 0, -1.5], moveFrames: 30 },
  // 7 Back at the desk: the book opens, the wall sinks.
  { from: F("Simple") - 10, pos: [-4.26, 3.71, 6.14], target: [-5.85, 1.16, 0.83], drift: [-0.2, 0, -0.5] },
  // 8 Wide: the two phases laid out along the path.
  { from: F("Ye do") - 10, pos: [-18.06, 21.09, 9.07], target: [0.6, -0.8, 0.06], drift: [2, -1.5, 0], moveFrames: 34 },
  // 9 Phase 1: PDFs, docs, DB on the conveyor.
  { from: F("Pehle") - 10, pos: [-7.53, 4.6, 5.56], target: [1.4, 0.07, -0.01], drift: [0.8, -0.2, -0.4] },
  // 10 Chunker → chunks fly into the Vector DB.
  { from: T.chop - 10, pos: [-3.75, 5.94, 9.49], target: [6.64, 0.39, 0.43], drift: [1, -0.3, -0.6] },
  // 11 The library up close.
  { from: F("Ye AI") - 10, pos: [0, 2.8, 5.0], target: [8.9, 1.1, 0.06], drift: [0.8, 0, -0.6] },
  // 12 Phase 2: question arrives, scanner finds the relevant pages.
  { from: F("Jab") - 10, pos: [2.2, 3.8, 5.1], target: [8.3, 1.36, 0.24], drift: [0.5, 0, -0.5] },
  // 13 Question + pages fly back over the path into the LLM.
  { from: F("Phir") - 10, pos: [-13.64, 6.8, 3.36], target: [1.61, 1.28, -0.75], drift: [0.8, -0.3, 0], moveFrames: 34 },
  // 14 The LLM answers.
  { from: T.exact - 22, pos: [-3.6, 3.35, 10.5], target: [-5.5, 1.8, 0.5], drift: [0, 0, -1.2], moveFrames: 30 },
  // 15 No re-training, no hallucination: both blocks fall.
  { from: F("Na model") - 10, pos: [-5.5, 2.72, 14.76], target: [-5.5, 0.69, 1.42], drift: [0, 0, -1.2] },
  // 16 Callback: the same chat now shows the right answer.
  { from: T.bas - 10, pos: [-10.02, 2.07, 9.13], target: [-11, 1.42, 0.06], drift: [0.3, 0.1, -1.2], moveFrames: 30 },
  // 17 Payoff: the LLM graduates.
  { from: F("aur AI") - 6, pos: [-3.18, 3.43, 9.99], target: [-5.49, 1.59, 0.46], drift: [0, 0, -0.8], moveFrames: 22 },
];
const poseAt = makeCameraTrack(SHOTS, DURATION);

// ---- Motion helpers (shared by 3D objects and callouts) ------------------------------
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const arc = (a: Vec3, b: Vec3, t: number, lift: number): Vec3 => {
  const p = lerp3(a, b, t);
  return [p[0], p[1] + Math.sin(t * Math.PI) * lift, p[2]];
};
const bundleT = (f: number) => eramp(f, T.send, T.arrive);
const bundlePos = (f: number): Vec3 => arc(Q_POS, HEAD, bundleT(f), 2.4);

// ---- Overlays ----------------------------------------------------------------------
const CALLOUTS: CalloutSpec[] = [
  { from: T.wrong, to: F("Kyunki") - 12, label: "Made-up number", point: [CHAT_X + 0.35, 2.55, 0.12], dx: 60, dy: 280, color: RED },
  { from: T.llm, to: F("Use") - 12, label: "LLM", point: [LLM_X, 2.55, 0.4], dx: 150, dy: -150 },
  { from: T.closed, to: F("Use") - 12, label: "Closed book", point: [LLM_X, 1.25, 1.1], dx: 230, dy: -40, color: RED },
  { from: T.training, to: F("Tumhara") - 12, label: "Training data (frozen)", point: [LLM_X + 0.6, 3.1, -1.8], dx: -120, dy: 130 },
  { from: T.priv, to: F("Yahin") - 12, label: "Your private data", point: [SRC_X[1], 0.6, 0], dx: -200, dy: -230 },
  { from: F("Retrieval-Augmented"), to: F("Simple") - 12, label: "Retrieval-Augmented Generation", point: [WALL_X + 1.2, 1.2, 3.4], dx: -60, dy: -330 },
  { from: T.open, to: F("Ye do") - 12, label: "Open book ✓", point: [LLM_X - 0.3, 1.25, 1.0], dx: 140, dy: -170, color: GREEN },
  { from: F("do"), to: F("Pehle") - 12, label: "1 · Indexing", point: [CHOP_X, 2.6, 0], dx: -160, dy: -150 },
  { from: F("hisson"), to: F("Pehle") - 12, label: "2 · Retrieve + Generate", point: [LIB_X - 0.2, 2.0, 0], dx: -170, dy: 150 },
  { from: T.pdfs, to: T.chop - 12, label: "PDFs", point: [SRC_X[0], 1.4, 0], dx: 70, dy: -220 },
  { from: T.docs, to: T.chop - 12, label: "Docs", point: [SRC_X[1], 0.5, 0], dx: 150, dy: -120 },
  { from: T.dbs, to: T.chop - 12, label: "Databases", point: [SRC_X[2], 1.05, 0], dx: 130, dy: -190 },
  { from: T.chunks, to: F("Ye AI") - 12, label: "Chunks", point: [CHOP_X + 0.6, 0.6, 0], dx: -170, dy: 130 },
  { from: T.vector, to: F("Ye AI") - 12, label: "Vector Database", point: [LIB_X - 0.3, 1.0, 1.2], dx: -170, dy: 170 },
  { from: T.personal, to: F("Jab") - 12, label: "AI's personal library", point: [LIB_X - 0.2, 1.2, 1.0], dx: -120, dy: 200 },
  { from: T.ask, to: F("Phir") - 12, label: "Your question", point: [Q_POS[0], Q_POS[1] + 0.45, Q_POS[2]], dx: 140, dy: -150 },
  { from: T.relevant, to: F("Phir") - 12, label: "Relevant pages", point: slotPos(HITS[2]), dx: 120, dy: -200, color: BLUE },
  { from: T.send, to: T.arrive - 4, label: "Question + pages", point: (f) => bundlePos(f), dx: -120, dy: 150, color: BLUE },
  { from: F("accurate"), to: F("Na model") - 12, label: "Accurate answer", point: [ANSWER[0] + 0.9, ANSWER[1] + 0.3, ANSWER[2]], dx: -60, dy: 280, color: GREEN },
  { from: T.expert, to: DURATION, label: "Expert", point: [LLM_X - 0.3, 2.95, 0], dx: -150, dy: -150, color: GREEN },
];

const SECTIONS = [
  { from: 0, label: "AI chat" },
  { from: F("Kyunki") - 10, label: "Closed-book exam" },
  { from: F("Tumhara") - 10, label: "Your private data" },
  { from: F("Yahin") - 10, label: "Enter RAG" },
  { from: F("Ye do") - 10, label: "Two phases" },
  { from: F("Pehle") - 10, label: "Phase 1 · Indexing" },
  { from: F("Ye AI") - 10, label: "AI's library" },
  { from: F("Jab") - 10, label: "Phase 2 · Retrieve" },
  { from: T.exact - 22, label: "Generate" },
  { from: T.bas - 10, label: "AI chat" },
];

// ---- Sound effects ---------------------------------------------------------------------
const CUTS = cutCues(SHOTS);
const ACCENTS: SfxCue[] = [
  { at: T.q, sound: "pop-light" }, // question bubble (hook)
  { at: T.rag + 8, sound: "impact-zoom", volume: 0.9 }, // R-A-G blocks land (re-hook)
  { at: T.open, sound: "swoosh-accent" }, // book opens
  { at: T.open + 12, sound: "tech-slide", volume: 1.2 }, // wall sinks
  { at: T.chop + 18, sound: "tech-slide", volume: 1.2 }, // chunker
  { at: T.personal, sound: "pop-minimal" }, // library lights up
  { at: T.scan, sound: "tech-slide", volume: 1.3 }, // scanner sweep
  { at: T.send + 4, sound: "swoosh-soft" }, // bundle takes off
  { at: T.exact, sound: "pop-hard" }, // answer card
  { at: T.retrain + 10, sound: "pop-hard", volume: 0.9 }, // block falls
  { at: T.halluc + 10, sound: "pop-hard", volume: 0.9 }, // block falls
  { at: T.expert, sound: "riser-short", volume: 0.8 },
  { at: T.expert, sound: "impact-zoom" },
];
export const SFX: SfxCue[] = [
  ...CUTS,
  ...ACCENTS,
  ...popCues([T.refuse, T.wrong, ...CALLOUTS.map((c) => c.from)], { avoid: [...CUTS, ...ACCENTS] }),
];

// ---- Canvas helpers -----------------------------------------------------------------
type Ctx = CanvasRenderingContext2D;
const wrap = (ctx: Ctx, text: string, maxW: number) => {
  const out: string[] = [];
  let cur = "";
  for (const w of text.split(" ")) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) {
      out.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) out.push(cur);
  return out;
};
const bubble = (
  ctx: Ctx,
  y: number,
  text: string,
  o: { right?: boolean; fill: string; ink: string; stroke?: string; font?: string },
) => {
  const W0 = ctx.canvas.width;
  ctx.font = o.font ?? `600 34px ${SANS}`;
  const lines = wrap(ctx, text, W0 * 0.62);
  const lw = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const bw = lw + 48;
  const bh = lines.length * 44 + 30;
  const x = o.right ? W0 - 36 - bw : 36;
  ctx.fillStyle = o.fill;
  ctx.beginPath();
  ctx.roundRect(x, y, bw, bh, 22);
  ctx.fill();
  if (o.stroke) {
    ctx.lineWidth = 5;
    ctx.strokeStyle = o.stroke;
    ctx.stroke();
  }
  ctx.fillStyle = o.ink;
  ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, x + 24, y + 18 + i * 44));
  return bh;
};
const panel = (ctx: Ctx, w: number, h: number, bg: string, border: string) => {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = 14;
  ctx.strokeStyle = border;
  ctx.strokeRect(7, 7, w - 14, h - 14);
};

// ---- 3D pieces ------------------------------------------------------------------------
const Mat: React.FC<{ c: string; e?: string; ei?: number; r?: number; m?: number }> = ({
  c,
  e,
  ei = 0,
  r = 0.85,
  m = 0,
}) => <meshStandardMaterial color={c} emissive={e ?? "#000000"} emissiveIntensity={ei} roughness={r} metalness={m} />;

const Box: React.FC<{ args: Vec3; p?: Vec3; c: string; e?: string; ei?: number }> = ({ args, p, c, e, ei }) => (
  <mesh position={p} castShadow receiveShadow>
    <boxGeometry args={args} />
    <Mat c={c} e={e} ei={ei} />
  </mesh>
);

/** Text panel: a plane with a canvas texture. */
const Label: React.FC<{
  w: number;
  h: number;
  px?: number;
  draw: (ctx: Ctx, w: number, h: number) => void;
  deps?: unknown[];
  p?: Vec3;
  rot?: Vec3;
}> = ({ w, h, px = 400, draw, deps = [], p, rot }) => {
  const tex = useCanvasTexture(Math.round(w * px), Math.round(h * px), draw, deps);
  return (
    <mesh position={p} rotation={rot}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} toneMapped={false} transparent />
    </mesh>
  );
};

const chatStage = (f: number) =>
  f >= T.bas - 10 ? 4 : f >= T.wrong ? 3 : f >= T.refuse ? 2 : f >= T.refuse - 22 ? 1 : f >= T.q ? 0 : -1;

const ChatTerminal: React.FC = () => {
  const frame = useCurrentFrame();
  const stage = chatStage(frame);
  const draw = (ctx: Ctx, w: number, h: number) => {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = SLATE;
    ctx.fillRect(0, 0, w, 96);
    ctx.fillStyle = "#F4F1EA";
    ctx.font = `800 40px ${SANS}`;
    ctx.textBaseline = "middle";
    ctx.fillText("AI Chat", 36, 50);
    ctx.fillStyle = GREEN;
    ctx.beginPath();
    ctx.arc(w - 50, 50, 12, 0, Math.PI * 2);
    ctx.fill();
    if (stage < 0) return;
    let y = 130;
    y += bubble(ctx, y, "Kal ki sales report ka total kya hai?", { right: true, fill: SLATE, ink: "#F4F1EA" }) + 26;
    if (stage === 1) bubble(ctx, y, "• • •", { fill: "#E6E0D5", ink: SLATE });
    if (stage === 2 || stage === 3) {
      y += bubble(ctx, y, "Sorry, mere paas aapki company ka data nahi hai.", { fill: "#E6E0D5", ink: SLATE }) + 26;
    }
    if (stage === 3) {
      bubble(ctx, y, "Total: ₹42.7 Cr ⚠", { fill: "#FBE3E0", ink: RED, stroke: RED, font: `800 40px ${SANS}` });
    }
    if (stage === 4) {
      y += bubble(ctx, y, "✓ Total: ₹18.4 Cr", { fill: "#E2F5EA", ink: "#1B7A47", stroke: GREEN, font: `900 40px ${SANS}` }) + 14;
      bubble(ctx, y, "source: sales_report.pdf", { fill: "#E6E0D5", ink: SLATE, font: `600 28px ${MONO}` });
    }
  };
  const tex = useCanvasTexture(600, 966, draw, [stage]);
  return (
    <group position={[CHAT_X, 0, 0]} rotation={[0, 0.15, 0]}>
      <Box args={[2.0, 3.1, 0.16]} p={[0, 2.2, 0]} c={SLATE} />
      <mesh position={[0, 2.2, 0.085]}>
        <planeGeometry args={[1.8, 2.9]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <Box args={[0.25, 0.7, 0.2]} p={[0, 0.35, -0.05]} c={SLATE_2} />
      <Box args={[1.2, 0.08, 0.8]} p={[0, 0.04, 0]} c={SLATE_2} />
    </group>
  );
};

const llmState = (f: number) => (f >= T.exact ? 2 : f >= T.arrive - 4 ? 1 : 0);

const Robot: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const state = llmState(frame);
  const eye = [ORANGE, BLUE, GREEN][state];
  const face = useCanvasTexture(
    344,
    240,
    (ctx, w, h) => {
      ctx.fillStyle = "#1B1E23";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = eye;
      ctx.beginPath();
      ctx.roundRect(70, 60, 64, 80, 18);
      ctx.roundRect(w - 134, 60, 64, 80, 18);
      ctx.fill();
      ctx.font = `800 40px ${MONO}`;
      ctx.textAlign = "center";
      ctx.fillText("LLM", w / 2, 200);
    },
    [eye],
  );
  const think = ramp(frame, T.arrive - 6, T.arrive + 4) * (1 - ramp(frame, T.exact + 10, T.exact + 30));
  const blink = Math.sin(frame / 3) * 0.5 + 0.5;
  const cap = spring({ frame: frame - (T.expert - 10), fps, config: { damping: 11, stiffness: 140 } });
  const nod = Math.sin(frame / 22) * 0.04;
  return (
    <group position={[LLM_X, 0, 0]}>
      {/* stool + torso */}
      <Box args={[0.8, 0.6, 0.8]} p={[0, 0.3, 0]} c={SLATE_2} />
      <Box args={[1.2, 1.1, 0.8]} p={[0, 1.15, 0]} c={SLATE} />
      {/* arms resting on the desk */}
      {[-0.62, 0.62].map((x) => (
        <Box key={x} args={[0.22, 0.2, 0.75]} p={[x, 1.15, 0.45]} c={SLATE_2} />
      ))}
      <group position={[0, 2.15, 0]} rotation={[nod, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.0, 0.75, 0.8]} />
          <Mat c={SLATE} e={BLUE} ei={think * (0.6 + 0.6 * blink)} />
        </mesh>
        <mesh position={[0, 0, 0.405]}>
          <planeGeometry args={[0.86, 0.6]} />
          <meshBasicMaterial map={face} toneMapped={false} />
        </mesh>
        <Box args={[0.05, 0.3, 0.05]} p={[0, 0.52, 0]} c={SLATE_2} />
        <mesh position={[0, 0.72, 0]}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <Mat c={eye} e={eye} ei={1.2} />
        </mesh>
        {/* graduation cap (payoff) */}
        {cap > 0.01 && (
          <group position={[0, 0.38 + (1 - cap) * 2.5, 0]} rotation={[0, Math.PI / 4, 0]}>
            <Box args={[0.62, 0.22, 0.62]} p={[0, 0.11, 0]} c="#1B1E23" />
            <Box args={[1.2, 0.05, 1.2]} p={[0, 0.25, 0]} c="#1B1E23" />
            <Box args={[0.04, 0.32, 0.04]} p={[0.56, 0.1, 0]} c={GOLD} />
          </group>
        )}
      </group>
    </group>
  );
};

const Desk: React.FC = () => {
  const frame = useCurrentFrame();
  const open = eramp(frame, T.open - 4, T.open + 18);
  const unlock = ramp(frame, T.open - 14, T.open - 4);
  const lockGone = ramp(frame, T.open - 4, T.open + 8);
  const red = useMemo(() => new Color(RED), []);
  const green = useMemo(() => new Color(GREEN), []);
  const cover = red.clone().lerp(green, open);
  const pages = useCanvasTexture(512, 360, (ctx, w, h) => {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#C9C2B5";
    for (let y = 40; y < h - 20; y += 30) ctx.fillRect(30, y, w - 60 - ((y * 7) % 90), 8);
  });
  return (
    <group position={[LLM_X, 0, 0.95]}>
      <Box args={[2.4, 0.1, 1.1]} p={[0, 1.0, 0]} c={WOOD} />
      {[-1.1, 1.1].map((x) =>
        [-0.45, 0.45].map((z) => <Box key={`${x}${z}`} args={[0.1, 0.95, 0.1]} p={[x, 0.475, z]} c={SLATE_2} />),
      )}
      {/* the exam book */}
      <group position={[0, 1.05, 0.1]}>
        <Box args={[0.95, 0.04, 0.7]} p={[0, 0.02, 0]} c={cover.getStyle()} />
        <Box args={[0.9, 0.1, 0.66]} p={[0, 0.09, 0]} c={PAPER} />
        <mesh position={[0, 0.141, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.88, 0.62]} />
          <meshStandardMaterial map={pages} roughness={0.9} />
        </mesh>
        {/* front cover hinged on the left spine */}
        <group position={[-0.475, 0.16, 0]} rotation={[0, 0, open * Math.PI * 0.97]}>
          <mesh position={[0.475, 0, 0]} castShadow>
            <boxGeometry args={[0.95, 0.04, 0.7]} />
            <meshStandardMaterial color={cover} roughness={0.7} />
          </mesh>
        </group>
        {/* padlock */}
        {lockGone < 1 && (
          <group position={[0.05, 0.12, 0.42]} scale={1 - lockGone}>
            <Box args={[0.3, 0.26, 0.1]} c={GOLD} />
            <mesh position={[0, 0.17 + unlock * 0.1, 0]}>
              <torusGeometry args={[0.1, 0.028, 8, 16, Math.PI]} />
              <Mat c="#8C8F96" m={0.6} r={0.35} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
};

const BOOK_COLORS = ["#7A8794", "#9C8F7A", "#6E7B8B", "#A39484", "#5F6B78", "#8D8371"];

const TrainingShelf: React.FC = () => {
  const frame = useCurrentFrame();
  const books = useMemo(() => {
    const r = seeded(5);
    const out: { x: number; y: number; w: number; h: number; c: string }[] = [];
    [0.15, 1.25, 2.35].forEach((y) => {
      let x = -1.25;
      while (x < 1.2) {
        const w = 0.12 + r() * 0.12;
        const h = 0.6 + r() * 0.35;
        out.push({ x: x + w / 2, y: y + h / 2, w, h, c: BOOK_COLORS[Math.floor(r() * BOOK_COLORS.length)] });
        x += w + 0.02;
      }
    });
    return out;
  }, []);
  const glow = ramp(frame, T.training - 4, T.training + 6) * (1 - ramp(frame, T.training + 30, T.training + 60));
  return (
    <group position={[LLM_X, 0, -2.1]}>
      {[-1.4, 1.4].map((x) => (
        <Box key={x} args={[0.12, 3.5, 0.6]} p={[x, 1.75, 0]} c={SLATE} />
      ))}
      {[0.1, 1.2, 2.3, 3.45].map((y) => (
        <Box key={y} args={[2.92, 0.1, 0.6]} p={[0, y, 0]} c={SLATE_2} />
      ))}
      {books.map((b, i) => (
        <Box key={i} args={[b.w, b.h, 0.42]} p={[b.x, b.y, 0.02]} c={b.c} e={ORANGE} ei={glow * 0.25} />
      ))}
      <Label
        w={2.6}
        h={0.55}
        p={[0, 3.85, 0.05]}
        draw={(ctx, w, h) => {
          panel(ctx, w, h, PAPER, SLATE);
          ctx.fillStyle = SLATE;
          ctx.font = `800 ${Math.round(h * 0.36)}px ${SANS}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("TRAINING DATA · till 2023", w / 2, h / 2 + 2);
        }}
      />
    </group>
  );
};

const GlassWall: React.FC = () => {
  const frame = useCurrentFrame();
  const sink = eramp(frame, T.open + 6, T.open + 46) * 2.95;
  if (sink >= 2.94) return null;
  return (
    <group position={[WALL_X, -sink, 0]}>
      <mesh position={[0, 1.3, 0]}>
        <boxGeometry args={[0.08, 2.6, 4.8]} />
        <meshStandardMaterial color={RED} transparent opacity={0.18} roughness={0.2} />
      </mesh>
      {[-2.4, 2.4].map((z) => (
        <Box key={z} args={[0.18, 2.8, 0.18]} p={[0, 1.4, z]} c={SLATE} />
      ))}
      <Box args={[0.18, 0.14, 4.98]} p={[0, 2.8, 0]} c={SLATE} />
      <Label
        w={1.6}
        h={0.5}
        p={[-0.06, 1.9, 0.9]}
        rot={[0, -Math.PI / 2, 0]}
        draw={(ctx, w, h) => {
          panel(ctx, w, h, RED, "#B3332A");
          ctx.fillStyle = "#FFFFFF";
          ctx.font = `900 ${Math.round(h * 0.44)}px ${SANS}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("NO ACCESS", w / 2, h / 2 + 2);
        }}
      />
    </group>
  );
};

const LETTERS = [
  { k: "R", c: ORANGE },
  { k: "A", c: BLUE },
  { k: "G", c: GREEN },
];

const RagBlocks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      {LETTERS.map((l, i) => {
        const s = spring({ frame: frame - (T.rag + i * 5), fps, config: { damping: 12, stiffness: 150 } });
        const gone = eramp(frame, F("Pehle") - 10 + i * 3, F("Pehle") + 14 + i * 3);
        if (s <= 0.001 || gone >= 1) return null;
        return (
          <group key={l.k} position={[WALL_X - 1.2 + i * 1.2, 0.6 + (1 - s) * 6 - gone * 1.3, 3.4]}>
            <Box args={[1.0, 1.2, 0.45]} c={l.c} />
            <Label
              w={0.9}
              h={1.1}
              p={[0, 0, 0.23]}
              deps={[l.k]}
              draw={(ctx, w, h) => {
                ctx.clearRect(0, 0, w, h);
                ctx.fillStyle = "#FFFFFF";
                ctx.font = `900 ${Math.round(h * 0.78)}px ${SANS}`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(l.k, w / 2, h / 2 + h * 0.04);
              }}
            />
          </group>
        );
      })}
    </>
  );
};

// Sources ride the conveyor into the chunker, staggered.
const srcX = (k: number, f: number) => {
  const a = T.chop + k * 9;
  return interpolate(f, [a, a + 34], [SRC_X[k], CHOP_X], { ...clamp, easing: Easing.in(Easing.quad) });
};
const srcScale = (k: number, f: number) => {
  const x = srcX(k, f);
  const bump = (at: number) => 1 + 0.25 * Math.sin(Math.PI * ramp(f, at, at + 10));
  const mention = [T.pdfs, T.docs, T.dbs][k];
  return interpolate(x, [CHOP_X - 0.7, CHOP_X - 0.1], [1, 0], clamp) * bump(mention);
};

const Sources: React.FC = () => {
  const frame = useCurrentFrame();
  const pdfTex = useCanvasTexture(300, 400, (ctx, w, h) => {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = RED;
    ctx.fillRect(0, 0, w, 90);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `900 60px ${SANS}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PDF", w / 2, 48);
    ctx.fillStyle = "#C9C2B5";
    for (let y = 120; y < h - 20; y += 34) ctx.fillRect(28, y, w - 56 - ((y * 5) % 70), 12);
  });
  const docTex = useCanvasTexture(320, 240, (ctx, w, h) => {
    ctx.fillStyle = "#EAF0FF";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = BLUE;
    ctx.font = `900 64px ${SANS}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("DOCS", w / 2, h / 2);
  });
  const s = [0, 1, 2].map((k) => srcScale(k, frame));
  const x = [0, 1, 2].map((k) => srcX(k, frame));
  return (
    <>
      {/* conveyor */}
      <Box args={[6.0, 0.14, 1.3]} p={[1.3, 0.07, 0]} c={SLATE_2} />
      {Array.from({ length: 12 }, (_, i) => {
        const off = ((frame * 0.04 + i * 0.5) % 6) - 3;
        return <Box key={i} args={[0.06, 0.02, 1.2]} p={[1.3 + off, 0.15, 0]} c="#4A505A" />;
      })}
      {s[0] > 0 && (
        <group position={[x[0], 0.16, 0]} scale={s[0]}>
          <group rotation={[0, -1.2, 0]}>
            <Box args={[0.75, 1.0, 0.03]} p={[0, 0.5, 0]} c={PAPER} />
            <mesh position={[0, 0.5, 0.017]}>
              <planeGeometry args={[0.75, 1.0]} />
              <meshStandardMaterial map={pdfTex} roughness={0.9} />
            </mesh>
            <Box args={[0.75, 0.06, 0.25]} p={[0, 0.03, -0.1]} c={SLATE_2} />
          </group>
        </group>
      )}
      {s[1] > 0 && (
        <group position={[x[1], 0.16, 0]} scale={s[1]}>
          {[0, 1, 2, 3].map((j) => (
            <Box key={j} args={[0.8, 0.05, 0.6]} p={[0.02 * j, 0.03 + j * 0.06, -0.015 * j]} c={j === 3 ? "#EAF0FF" : "#D9E2F7"} />
          ))}
          <mesh position={[0.06, 0.256, -0.045]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.76, 0.56]} />
            <meshStandardMaterial map={docTex} roughness={0.9} />
          </mesh>
        </group>
      )}
      {s[2] > 0 && (
        <group position={[x[2], 0.16, 0]} scale={s[2]}>
          <mesh position={[0, 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.38, 0.38, 0.8, 32]} />
            <Mat c={SLATE} />
          </mesh>
          {[0.15, 0.4, 0.65].map((y) => (
            <mesh key={y} position={[0, y, 0]}>
              <cylinderGeometry args={[0.392, 0.392, 0.05, 32]} />
              <Mat c={ORANGE} e={ORANGE} ei={0.3} />
            </mesh>
          ))}
        </group>
      )}
    </>
  );
};

const Chunker: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = interpolate(frame, [T.chop + 10, T.chop + 30, T.chop + 70, T.chop + 90], [0.4, 3, 3, 0.5], clamp);
  return (
    <group position={[CHOP_X, 0, 0]}>
      {[-0.85, 0.85].map((z) => (
        <Box key={z} args={[0.45, 2.4, 0.35]} p={[0, 1.2, z]} c={SLATE} />
      ))}
      <Box args={[0.55, 0.3, 2.1]} p={[0, 2.5, 0]} c={SLATE_2} />
      <mesh position={[0, 2.33, 0]}>
        <boxGeometry args={[0.2, 0.05, 1.4]} />
        <Mat c={ORANGE} e={ORANGE} ei={pulse} />
      </mesh>
      {[-0.66, 0.66].map((z) => (
        <mesh key={`s${z}`} position={[-0.23, 1.2, z]}>
          <boxGeometry args={[0.02, 2.0, 0.08]} />
          <Mat c={ORANGE} e={ORANGE} ei={pulse * 0.7} />
        </mesh>
      ))}
      {/* blade */}
      <mesh position={[0, 2.2 - 1.6 * Math.abs(Math.sin(Math.max(0, frame - T.chop - 10) / 4)) * (pulse > 1 ? 1 : 0), 0]}>
        <boxGeometry args={[0.06, 0.04, 1.3]} />
        <Mat c="#C9CCD2" m={0.6} r={0.3} />
      </mesh>
    </group>
  );
};

// Chunks fly from the chunker's exit into their library slots.
const chunkStart = (i: number) => T.chunks + i * 5;
const CHUNK_TRAVEL = 26;
const GATE_EXIT: Vec3 = [CHOP_X + 0.5, 0.5, 0];

const Chunks: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      {INCOMING.map((slot, i) => {
        const a = chunkStart(i);
        if (frame < a || frame > a + CHUNK_TRAVEL) return null;
        const t = ease((frame - a) / CHUNK_TRAVEL);
        const p = arc(GATE_EXIT, slotPos(slot), t, 1.6);
        return (
          <mesh key={slot} position={p} rotation={[0, (1 - t) * 1.2, (1 - t) * 0.8]} castShadow>
            <boxGeometry args={[0.06, 0.38, 0.42]} />
            <Mat c={ORANGE} e={ORANGE} ei={0.5} />
          </mesh>
        );
      })}
    </>
  );
};

const Library: React.FC = () => {
  const frame = useCurrentFrame();
  const slate = useMemo(() => new Color("#5A616C"), []);
  const orange = useMemo(() => new Color(ORANGE), []);
  const light = useMemo(() => new Color("#E9D9BE"), []);
  const blue = useMemo(() => new Color(BLUE), []);
  const scanZ = interpolate(frame, [T.scan, T.relevant], [-1.3, 1.3], clamp);
  const scanOn = frame >= T.scan - 2 && frame <= T.relevant + 4;
  return (
    <group>
      {/* frame */}
      <Box args={[0.3, 3.4, 2.7]} p={[LIB_X + 0.15, 1.7, 0]} c={SLATE} />
      {[-1.35, 1.35].map((z) => (
        <Box key={z} args={[0.6, 3.4, 0.1]} p={[LIB_X - 0.15, 1.7, z]} c={SLATE} />
      ))}
      {Array.from({ length: ROWS + 1 }, (_, r) => (
        <Box key={r} args={[0.6, 0.06, 2.7]} p={[LIB_X - 0.15, 0.22 + r * 0.5, 0]} c={SLATE_2} />
      ))}
      <Label
        w={2.6}
        h={0.5}
        p={[LIB_X - 0.46, 3.72, 0]}
        rot={[0, -Math.PI / 2, 0]}
        draw={(ctx, w, h) => {
          panel(ctx, w, h, PAPER, ORANGE);
          ctx.fillStyle = SLATE;
          ctx.font = `900 ${Math.round(h * 0.4)}px ${SANS}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("VECTOR DATABASE", w / 2, h / 2 + 2);
        }}
      />
      {/* tiles */}
      {Array.from({ length: ROWS * COLS }, (_, i) => {
        const k = INCOMING.indexOf(i);
        const landed = k < 0 ? -1 : chunkStart(k) + CHUNK_TRAVEL;
        if (k >= 0 && frame < landed) return null;
        const r = Math.floor(i / COLS);
        const c = i % COLS;
        let col = slate.clone().offsetHSL(0, 0, ((i * 37) % 10) / 120);
        if (k >= 0) col = orange.clone().lerp(col, ramp(frame, landed, landed + 30));
        const wave = ramp(frame, T.personal + (r + c) * 3, T.personal + (r + c) * 3 + 8) *
          (1 - ramp(frame, T.personal + 30 + (r + c) * 3, T.personal + 45 + (r + c) * 3));
        col.lerp(light, wave * 0.8);
        const hit = HITS.includes(i);
        const lit = hit ? ramp(frame, T.relevant, T.relevant + 8) : 0;
        if (hit) col.lerp(blue, lit);
        const out = hit ? eramp(frame, T.relevant, T.relevant + 14) * 0.35 : 0;
        if (hit && frame >= T.gather) return null; // the pages leave with the question
        const p = slotPos(i);
        return (
          <mesh key={i} position={[p[0] - out, p[1], p[2]]} castShadow>
            <boxGeometry args={[0.06, 0.38, 0.42]} />
            <Mat c={col.getStyle()} e={hit ? BLUE : "#000000"} ei={lit * 0.6} />
          </mesh>
        );
      })}
      {scanOn && (
        <mesh position={[SLOT_X - 0.12, 1.75, scanZ]}>
          <boxGeometry args={[0.03, 3.1, 0.08]} />
          <Mat c={BLUE} e={BLUE} ei={2.5} />
        </mesh>
      )}
    </group>
  );
};

const QueryCard: React.FC<{ scale?: number }> = ({ scale = 1 }) => (
  <group scale={scale}>
    <Box args={[1.35, 0.8, 0.05]} c={PAPER} />
    <Label
      w={1.3}
      h={0.75}
      p={[0, 0, 0.03]}
      draw={(ctx, w, h) => {
        panel(ctx, w, h, PAPER, SLATE);
        ctx.fillStyle = BLUE;
        ctx.font = `800 ${Math.round(h * 0.13)}px ${MONO}`;
        ctx.fillText("USER QUERY", 30, h * 0.24);
        ctx.fillStyle = SLATE;
        ctx.font = `800 ${Math.round(h * 0.16)}px ${SANS}`;
        wrap(ctx, "Kal ki sales report ka total?", w - 60).forEach((l, i) => ctx.fillText(l, 30, h * 0.5 + i * h * 0.21));
      }}
    />
  </group>
);

const Bundle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame: frame - T.ask, fps, config: { damping: 13, stiffness: 140 } });
  if (frame < T.ask || frame > T.arrive) return null;
  const t = bundleT(frame);
  const p = bundlePos(frame);
  const y = frame < T.send ? Q_POS[1] - (1 - rise) * 1.8 : p[1];
  const shrink = 1 - ramp(frame, T.arrive - 8, T.arrive);
  return (
    <group position={[p[0], y, p[2]]} rotation={[0, -0.78 + t * 0.78, 0]} scale={shrink}>
      <QueryCard />
      {HITS.map((h, k) => {
        const from = slotPos(h);
        const g = eramp(frame, T.gather + k * 4, T.gather + k * 4 + 20);
        if (frame < T.gather) return null;
        const local: Vec3 = [0.75 + k * 0.12, 0.1 - k * 0.05, -0.1 - k * 0.08];
        // fly from the shelf (world) to a slot behind the card (local, ~world while the card is static)
        const fromLocal: Vec3 = [from[0] - 0.35 - Q_POS[0], from[1] - Q_POS[1], from[2] - Q_POS[2]];
        const q = lerp3(fromLocal, local, g);
        return (
          <mesh key={h} position={q} rotation={[0, (1 - g) * 0.78, 0]}>
            <boxGeometry args={[0.06, 0.38, 0.42]} />
            <Mat c={BLUE} e={BLUE} ei={0.6} />
          </mesh>
        );
      })}
    </group>
  );
};

const AnswerCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - T.exact, fps, config: { damping: 12, stiffness: 130 } });
  if (s <= 0.001) return null;
  return (
    <group position={[ANSWER[0], ANSWER[1] - (1 - s) * 1.2, ANSWER[2]]} scale={s}>
      <Box args={[1.85, 0.95, 0.06]} c={PAPER} />
      <Label
        w={1.8}
        h={0.9}
        p={[0, 0, 0.035]}
        draw={(ctx, w, h) => {
          panel(ctx, w, h, "#E2F5EA", GREEN);
          ctx.fillStyle = "#1B7A47";
          ctx.font = `900 ${Math.round(h * 0.21)}px ${SANS}`;
          ctx.fillText("✓ Total: ₹18.4 Cr", 34, h * 0.45);
          ctx.fillStyle = SLATE;
          ctx.font = `700 ${Math.round(h * 0.13)}px ${MONO}`;
          ctx.fillText("source: sales_report.pdf", 36, h * 0.75);
        }}
      />
    </group>
  );
};

const SLABS = [
  { x: LLM_X - 0.68, at: T.retrain, text: ["RE-TRAINING", "₹₹₹"] },
  { x: LLM_X + 0.68, at: T.halluc, text: ["HALLU-", "CINATION"] },
];

const NoBlocks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = F("Na model") - 4;
  if (frame < start || frame > T.bas + 20) return null;
  const sink = ramp(frame, T.bas - 6, T.bas + 20);
  return (
    <>
      {SLABS.map((s, i) => {
        const up = spring({ frame: frame - start - i * 6, fps, config: { damping: 12 } });
        const fall = interpolate(frame, [s.at, s.at + 12], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
        return (
          <group key={i} position={[s.x, -sink * 0.6, 2.6]} rotation={[fall * Math.PI * 0.5, 0, 0]} scale={[1, up, 1]}>
            <Box args={[1.25, 0.85, 0.1]} p={[0, 0.43, 0]} c={RED} />
            <Label
              w={1.2}
              h={0.8}
              p={[0, 0.43, 0.055]}
              draw={(ctx, w, h) => {
                panel(ctx, w, h, RED, "#B3332A");
                ctx.fillStyle = "#FFFFFF";
                ctx.font = `900 ${Math.round(h * 0.2)}px ${SANS}`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(s.text[0], w / 2, h * 0.36);
                ctx.fillText(s.text[1], w / 2, h * 0.64);
              }}
            />
          </group>
        );
      })}
    </>
  );
};

const World: React.FC = () => (
  <>
    <ChatTerminal />
    <TrainingShelf />
    <Robot />
    <Desk />
    <GlassWall />
    <RagBlocks />
    <Sources />
    <Chunker />
    <Chunks />
    <Library />
    <Bundle />
    <AnswerCard />
    <NoBlocks />
  </>
);

export const Rag3DReel: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: LOOK.bg }}>
    <Audio src={staticFile("rag/voiceover.mp3")} />
    <SoundEffects cues={SFX} />
    <ThreeCanvas width={1080} height={1920} shadows camera={{ fov: LOOK.fov, near: 0.1, far: 200 }}>
      <CameraRig poseAt={poseAt} fov={LOOK.fov} />
      <LookEnvironment look={LOOK} />
      <World />
      <LookEffects look={LOOK} />
    </ThreeCanvas>
    <Callouts items={CALLOUTS} poseAt={poseAt} spec={SPEC} variant={LOOK.callout} color={LOOK.ink} plate={LOOK.plate} />
    <SceneHeader variant="scene" sections={SECTIONS} duration={DURATION} ink={LOOK.ink} accent={ORANGE} />
    <StylishCaptions src="rag/captions.json" keywords={KEYWORDS} variant={LOOK.caption} accent={ORANGE} />
  </AbsoluteFill>
);
