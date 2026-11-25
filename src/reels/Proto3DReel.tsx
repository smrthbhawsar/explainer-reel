/**
 * 15s 3D prototype in the "clay isometric" style: a beige world with dark slate objects
 * and one accent colour per stage. A camera rig flies between four shots, while 2D leader-line
 * callouts, a stage tracker and pill captions sit on top.
 *
 * Story: source code -> compiler gate -> wall of machine-code bytes -> processor.
 * No voiceover yet: public/proto3d/captions.json holds placeholder word timings.
 */
import { Grid } from "@react-three/drei";
import { ThreeCanvas } from "@remotion/three";
import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Color } from "three";
import { StylishCaptions } from "../kit/StylishCaptions";
import { CalloutSpec, Callouts } from "../kit/three/Callout";
import { CameraRig } from "../kit/three/CameraRig";
import { makeCameraTrack, Shot, Vec3 } from "../kit/three/cameraTrack";
import { seeded, useCanvasTexture } from "../kit/three/canvasTexture";
import { StageTracker } from "../kit/three/StageTracker";

export const DURATION = 450;

const W = 1080;
const H = 1920;
const FOV = 42;

// Palette
const BG = "#E9E5DD";
const TRACK = "#D3CCC0";
const SLATE = "#2B2F36";
const SLATE_2 = "#3A3F48";
const INK = "#1F2125";
const ORANGE = "#F28C28";
const BLUE = "#2F6BFF";
const GOLD = "#C9A44C";

// Timeline (frames)
const T = {
  shotB: 95,
  paperMove: [125, 185] as const,
  shotC: 205,
  wave: [225, 300] as const,
  shotD: 325,
  packets: 340,
};

// World layout (x runs along the track)
const PAPER_X = -6.5;
const GATE_X = -2;
const WALL: Vec3 = [2.5, 1.45, -1.4];
const CHIP_X = 8;

const SHOTS: Shot[] = [
  {
    from: 0,
    pos: [-20, 14, 9],
    target: [0.5, -1.6, 0],
    drift: [2.5, -1.5, -1.5],
  },
  {
    from: T.shotB,
    pos: [-13.5, 5.4, 4.2],
    target: [-3.9, 0.6, 0],
    drift: [1.8, -0.3, -0.6],
  },
  {
    from: T.shotC,
    pos: [-4.5, 3.6, 8.5],
    target: [2.4, 0.6, -1.4],
    drift: [0.6, 0.1, -0.9],
  },
  {
    from: T.shotD,
    pos: [-1, 8.5, 6],
    target: [6.6, -0.8, 0],
    drift: [1.2, -0.8, -0.8],
  },
];
const poseAt = makeCameraTrack(SHOTS, DURATION);
const SPEC = { fov: FOV, width: W, height: H };

// ---- Packets (bytes travelling wall -> chip) -------------------------------------------
const PACKET_COUNT = 5;
const PACKET_GAP = 16;
const PACKET_TRAVEL = 46;
const packetX = (k: number, frame: number) =>
  interpolate(
    frame,
    [T.packets + k * PACKET_GAP, T.packets + k * PACKET_GAP + PACKET_TRAVEL],
    [3.2, CHIP_X],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.quad),
    },
  );

const paperX = (frame: number) =>
  interpolate(frame, [...T.paperMove], [PAPER_X, GATE_X], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

// ---- 2D overlays ----------------------------------------------------------------------
const CALLOUTS: CalloutSpec[] = [
  {
    from: 22,
    to: 92,
    label: "Source code",
    point: [PAPER_X, 1.9, 0],
    dx: 60,
    dy: -200,
  },
  {
    from: 40,
    to: 92,
    label: "Processor",
    point: [CHIP_X, 0.3, 0],
    dx: -80,
    dy: -160,
  },
  {
    from: 112,
    to: 150,
    label: "Source code",
    point: (f) => [paperX(f), 2.0, 0.1],
    dx: 90,
    dy: -200,
  },
  {
    from: 152,
    to: 202,
    label: "Compiler",
    point: [GATE_X, 2.55, 0],
    dx: 90,
    dy: 130,
  },
  {
    from: 228,
    to: 322,
    label: "Machine code",
    point: [WALL[0] - 1.5, WALL[1] + 1.1, WALL[2] + 0.3],
    dx: 40,
    dy: -170,
  },
  {
    from: 262,
    to: 322,
    label: "No names, no comments",
    point: [WALL[0] + 1.3, WALL[1] - 0.9, WALL[2] + 0.3],
    dx: -60,
    dy: 200,
  },
  {
    from: 350,
    to: 446,
    label: "Processor",
    point: [CHIP_X, 0.32, 0],
    dx: -60,
    dy: -230,
  },
  {
    from: 344,
    to: 378,
    label: "Bytes only",
    point: (f) => [packetX(0, f), 0.45, 0],
    dx: 60,
    dy: 150,
  },
];

const STAGES = [
  { from: 0, label: "Source", color: INK },
  { from: T.shotC, label: "Compiled", color: ORANGE },
  { from: T.shotD, label: "Executed", color: BLUE },
];

// ---- 3D pieces ------------------------------------------------------------------------
const Ground: React.FC = () => (
  <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color={BG} roughness={1} />
    </mesh>
    <Grid
      position={[0, 0.002, 0]}
      args={[60, 60]}
      cellSize={1}
      cellThickness={0.6}
      cellColor="#D6D0C5"
      sectionSize={5}
      sectionThickness={1}
      sectionColor="#CBC4B7"
      fadeDistance={45}
      fadeStrength={1.5}
      infiniteGrid
    />
    {/* The track */}
    <mesh position={[-1.5, 0.03, 0]} receiveShadow>
      <boxGeometry args={[16.5, 0.06, 1.3]} />
      <meshStandardMaterial color={TRACK} roughness={0.95} />
    </mesh>
  </>
);

const CODE = [
  "int main() {",
  "  Player p = spawn();",
  "  p.hp = 100;",
  "  while (alive(p)) {",
  "    tick(&p, dt);",
  "    render(p);",
  "  }",
  "  return 0;",
  "}",
];

const CodePaper: React.FC = () => {
  const frame = useCurrentFrame();
  const tex = useCanvasTexture(512, 680, (ctx, w, h) => {
    ctx.fillStyle = "#FBF9F4";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#E5E0D6";
    ctx.lineWidth = 2;
    for (let y = 70; y < h; y += 54) {
      ctx.beginPath();
      ctx.moveTo(24, y + 14);
      ctx.lineTo(w - 24, y + 14);
      ctx.stroke();
    }
    ctx.fillStyle = "#2A2D33";
    ctx.font = "600 30px Consolas, 'Courier New', monospace";
    CODE.forEach((line, i) => ctx.fillText(line, 34, 76 + i * 54));
  });
  const x = paperX(frame);
  // Paper is "consumed" as it enters the gate.
  const squash = interpolate(
    frame,
    [T.paperMove[1] - 12, T.paperMove[1] + 4],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  if (squash <= 0) return null;
  return (
    <group
      position={[x, 1.15, 0]}
      rotation={[0, -1.05, 0]}
      scale={[1, squash, 1]}
    >
      <group rotation={[-0.3, 0, 0.03]}>
        <mesh castShadow>
          <boxGeometry args={[1.5, 2.0, 0.03]} />
          <meshStandardMaterial color="#FBF9F4" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.017]}>
          <planeGeometry args={[1.5, 2.0]} />
          <meshStandardMaterial map={tex} roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
};

const Gate: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = interpolate(
    frame,
    [T.paperMove[1] - 20, T.paperMove[1], T.paperMove[1] + 25],
    [0.4, 3, 0.6],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  return (
    <group position={[GATE_X, 0, 0]}>
      {[-0.95, 0.95].map((z) => (
        <mesh key={z} position={[0, 1.2, z]} castShadow receiveShadow>
          <boxGeometry args={[0.45, 2.4, 0.35]} />
          <meshStandardMaterial color={SLATE} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[0.55, 0.3, 2.3]} />
        <meshStandardMaterial color={SLATE_2} roughness={0.8} />
      </mesh>
      {/* glowing scanner strip */}
      <mesh position={[0, 2.33, 0]}>
        <boxGeometry args={[0.2, 0.05, 1.6]} />
        <meshStandardMaterial
          color={ORANGE}
          emissive={ORANGE}
          emissiveIntensity={pulse}
        />
      </mesh>
      {[-0.95, 0.95].map((z) => (
        <mesh key={`s${z}`} position={[0.23, 1.2, z]}>
          <boxGeometry args={[0.02, 2.0, 0.08]} />
          <meshStandardMaterial
            color={ORANGE}
            emissive={ORANGE}
            emissiveIntensity={pulse * 0.7}
          />
        </mesh>
      ))}
    </group>
  );
};

const COLS = 8;
const ROWS = 6;
const TILE_W = 0.46;
const TILE_H = 0.38;
const GAP = 0.04;

const ByteWall: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bytes = useMemo(() => {
    const r = seeded(7);
    return Array.from({ length: COLS * ROWS }, () =>
      Math.floor(r() * 256)
        .toString(16)
        .toUpperCase()
        .padStart(2, "0"),
    );
  }, []);
  const textTex = useCanvasTexture(
    1024,
    640,
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#E9E5DD";
      ctx.font = "700 46px Consolas, 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      bytes.forEach((b, i) => {
        const c = i % COLS;
        const r = Math.floor(i / COLS);
        ctx.fillText(`${b}`, ((c + 0.5) / COLS) * w, ((r + 0.5) / ROWS) * h);
      });
    },
    [bytes],
  );
  const wallW = COLS * (TILE_W + GAP) + 0.2;
  const wallH = ROWS * (TILE_H + GAP) + 0.2;
  const orange = useMemo(() => new Color(ORANGE), []);
  const dark = useMemo(() => new Color(SLATE_2), []);
  return (
    <group position={WALL}>
      {/* back slab + plinth */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[wallW, wallH, 0.3]} />
        <meshStandardMaterial color={SLATE} roughness={0.85} />
      </mesh>
      <mesh position={[0, -WALL[1] + 0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[wallW + 0.3, 0.24, 0.8]} />
        <meshStandardMaterial color="#9C978D" roughness={0.9} />
      </mesh>
      {bytes.map((_, i) => {
        const c = i % COLS;
        const r = Math.floor(i / COLS);
        // Diagonal wave from top-left.
        const start = T.wave[0] + (c + r) * 5;
        const s = spring({
          frame: frame - start,
          fps,
          config: { damping: 14, stiffness: 160 },
        });
        // A hand-picked subset stays lit after the wave (like highlighted instructions).
        const keep = (c * 7 + r * 3) % 5 === 0;
        const settle = interpolate(
          frame,
          [T.wave[1] + 10, T.wave[1] + 30],
          [1, keep ? 1 : 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        );
        const lit = Math.min(1, s) * settle;
        const col = dark.clone().lerp(orange, lit);
        const x = -wallW / 2 + 0.1 + (TILE_W + GAP) * (c + 0.5) + GAP / 2;
        const y = wallH / 2 - 0.1 - (TILE_H + GAP) * (r + 0.5) - GAP / 2;
        return (
          <mesh
            key={i}
            position={[x, y, 0.17 + 0.06 * Math.sin(Math.min(1, s) * Math.PI)]}
          >
            <boxGeometry args={[TILE_W, TILE_H, 0.06]} />
            <meshStandardMaterial color={col} roughness={0.7} />
          </mesh>
        );
      })}
      <mesh position={[0, 0, 0.27]}>
        <planeGeometry args={[COLS * (TILE_W + GAP), ROWS * (TILE_H + GAP)]} />
        <meshBasicMaterial map={textTex} transparent toneMapped={false} />
      </mesh>
    </group>
  );
};

const Packets: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: PACKET_COUNT }, (_, k) => {
        const start = T.packets + k * PACKET_GAP;
        if (frame < start || frame > start + PACKET_TRAVEL + 2) return null;
        const x = packetX(k, frame);
        const shrink = interpolate(x, [CHIP_X - 1.2, CHIP_X - 0.4], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const grow = interpolate(frame, [start, start + 6], [0, 1], {
          extrapolateRight: "clamp",
        });
        const s = Math.min(shrink, grow);
        if (s <= 0) return null;
        return (
          <group key={k} position={[x, 0.25, 0]} scale={s}>
            <mesh castShadow>
              <boxGeometry args={[0.6, 0.32, 0.42]} />
              <meshStandardMaterial color={SLATE} roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.17, 0]}>
              <boxGeometry args={[0.5, 0.03, 0.32]} />
              <meshStandardMaterial
                color={ORANGE}
                emissive={ORANGE}
                emissiveIntensity={0.6}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
};

const Chip: React.FC = () => {
  const frame = useCurrentFrame();
  // Each arriving packet kicks the die's glow.
  let glow = 0;
  for (let k = 0; k < PACKET_COUNT; k++) {
    const arrive = T.packets + k * PACKET_GAP + PACKET_TRAVEL - 6;
    glow = Math.max(
      glow,
      interpolate(frame, [arrive, arrive + 4, arrive + 22], [0, 1, 0.35], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    );
  }
  const pins = useMemo(() => {
    const out: { p: Vec3; s: Vec3 }[] = [];
    const n = 13;
    const half = 1.3;
    for (let i = 0; i < n; i++) {
      const t = -half + 0.2 + (i * (2 * half - 0.4)) / (n - 1);
      out.push({ p: [t, 0.165, half - 0.12], s: [0.07, 0.02, 0.14] });
      out.push({ p: [t, 0.165, -half + 0.12], s: [0.07, 0.02, 0.14] });
      out.push({ p: [half - 0.12, 0.165, t], s: [0.14, 0.02, 0.07] });
      out.push({ p: [-half + 0.12, 0.165, t], s: [0.14, 0.02, 0.07] });
    }
    return out;
  }, []);
  return (
    <group position={[CHIP_X, 0, 0]}>
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 0.16, 2.6]} />
        <meshStandardMaterial color="#1B1E23" roughness={0.6} />
      </mesh>
      {pins.map((pin, i) => (
        <mesh key={i} position={pin.p}>
          <boxGeometry args={pin.s} />
          <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[1.4, 0.12, 1.4]} />
        <meshStandardMaterial
          color="#C9CCD2"
          roughness={0.4}
          metalness={0.2}
          emissive={BLUE}
          emissiveIntensity={glow * 1.6}
        />
      </mesh>
    </group>
  );
};

const Scene: React.FC = () => (
  <>
    <CameraRig poseAt={poseAt} fov={FOV} />
    <color attach="background" args={[BG]} />
    <fog attach="fog" args={[BG, 22, 55]} />
    <hemisphereLight args={["#FFFFFF", "#CFC6B8", 1.4]} />
    <directionalLight
      position={[-6, 14, 9]}
      intensity={2.2}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-14}
      shadow-camera-right={14}
      shadow-camera-top={10}
      shadow-camera-bottom={-10}
      shadow-bias={-0.0004}
    />
    <Ground />
    <CodePaper />
    <Gate />
    <ByteWall />
    <Packets />
    <Chip />
  </>
);

export const Proto3DReel: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: BG }}>
    <ThreeCanvas
      width={W}
      height={H}
      shadows
      camera={{ fov: FOV, near: 0.1, far: 200 }}
      gl={{ antialias: true }}
    >
      <Scene />
    </ThreeCanvas>
    <Callouts items={CALLOUTS} poseAt={poseAt} spec={SPEC} color={INK} />
    <StageTracker stages={STAGES} ink={INK} />
    <StylishCaptions
      src="proto3d/captions.json"
      keywords={["compiler", "bytes", "processor"]}
      variant="pill"
      accent={ORANGE}
    />
  </AbsoluteFill>
);
