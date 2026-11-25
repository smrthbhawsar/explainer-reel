import { Environment, Grid, Lightformer } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useThree } from "@react-three/fiber";
import React, { useCallback, useLayoutEffect, useRef } from "react";
import { useDelayRender } from "remotion";
import type { CaptionVariant } from "../StylishCaptions";

/**
 * Visual presets for 3D reels. A look bundles world (background, fog, lights, floor,
 * glow) and overlay styling (caption variant, callout style, header style), so a reel
 * only picks a look and builds its objects.
 *
 *   clay     — light beige isometric "clay" world, dark slate objects (ref: PS5 decompile reel)
 *   neon     — dark navy, fog, glowing cyan/orange light (ref: casino fish-tank reel)
 *   studio   — black studio, strip lights, glossy metal, product/mechanical cutaways (ref: Porsche reel)
 *   tactical — foggy grey city, desaturated, yellow HUD tags (ref: Call of Duty Ricochet reel)
 */
export type LookId = "clay" | "neon" | "studio" | "tactical";

export type Look = {
  id: LookId;
  bg: string;
  fog: [near: number, far: number];
  /** Main object colours, from darkest to lightest. */
  base: [string, string, string];
  accent: { primary: string; secondary: string; good: string; bad: string };
  /** Overlay text colour and the plate behind callout labels. */
  ink: string;
  plate: string;
  caption: CaptionVariant;
  callout: "leader" | "thin" | "bracket";
  header: "stages" | "scene" | "tag" | "bar";
  bloom?: { intensity: number; threshold: number };
  vignette?: number;
  fov: number;
};

export const LOOKS: Record<LookId, Look> = {
  clay: {
    id: "clay",
    bg: "#E9E5DD",
    fog: [22, 55],
    base: ["#2B2F36", "#3A3F48", "#D3CCC0"],
    accent: {
      primary: "#F28C28",
      secondary: "#2F6BFF",
      good: "#2EAA6A",
      bad: "#E0453A",
    },
    ink: "#1F2125",
    plate: "#F4F1EA",
    caption: "pill",
    callout: "leader",
    header: "stages",
    fov: 42,
  },
  neon: {
    id: "neon",
    bg: "#050A14",
    fog: [8, 38],
    base: ["#0A1220", "#15233A", "#2A3D5C"],
    accent: {
      primary: "#3FD5FF",
      secondary: "#FF8A3D",
      good: "#3DFFB0",
      bad: "#FF4D5E",
    },
    ink: "#EAF6FF",
    plate: "rgba(5,10,20,0.6)",
    caption: "reveal",
    callout: "thin",
    header: "scene",
    bloom: { intensity: 1.4, threshold: 0.25 },
    vignette: 0.55,
    fov: 40,
  },
  studio: {
    id: "studio",
    bg: "#0B0C0E",
    fog: [14, 50],
    base: ["#3A3E45", "#8B9099", "#D9DCE1"],
    accent: {
      primary: "#E8732C",
      secondary: "#6FC3E8",
      good: "#55D38A",
      bad: "#E5484D",
    },
    ink: "#F2F3F5",
    plate: "rgba(11,12,14,0.55)",
    caption: "reveal",
    callout: "thin",
    header: "bar",
    bloom: { intensity: 0.6, threshold: 0.7 },
    vignette: 0.5,
    fov: 38,
  },
  tactical: {
    id: "tactical",
    bg: "#C9CCCF",
    fog: [10, 48],
    base: ["#1C1E21", "#55595F", "#9A9EA4"],
    accent: {
      primary: "#F5B71F",
      secondary: "#B8F24A",
      good: "#B8F24A",
      bad: "#F0443A",
    },
    ink: "#F4F4F2",
    plate: "rgba(28,30,33,0.82)",
    caption: "boxed",
    callout: "bracket",
    header: "tag",
    vignette: 0.45,
    fov: 40,
  },
};

const ClayWorld: React.FC<{ look: Look }> = ({ look }) => (
  <>
    <hemisphereLight args={["#FFFFFF", "#CFC6B8", 1.4]} />
    <directionalLight
      position={[-6, 14, 9]}
      intensity={2.2}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-16}
      shadow-camera-right={16}
      shadow-camera-top={12}
      shadow-camera-bottom={-12}
      shadow-bias={-0.0004}
    />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color={look.bg} roughness={1} />
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
  </>
);

const NeonWorld: React.FC<{ look: Look }> = ({ look }) => (
  <>
    <ambientLight intensity={0.25} color="#5A7BB5" />
    <directionalLight
      position={[4, 12, 6]}
      intensity={0.6}
      color="#9FC6FF"
      castShadow
      shadow-mapSize={[1024, 1024]}
    />
    <pointLight
      position={[0, 4, 0]}
      intensity={30}
      distance={18}
      color={look.accent.primary}
    />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#070E1B" roughness={0.35} metalness={0.4} />
    </mesh>
    <Grid
      position={[0, 0.003, 0]}
      args={[60, 60]}
      cellSize={1}
      cellThickness={0.5}
      cellColor="#10223D"
      sectionSize={4}
      sectionThickness={0.9}
      sectionColor="#16365E"
      fadeDistance={30}
      fadeStrength={2}
      infiniteGrid
    />
  </>
);

const StudioWorld: React.FC<{ look: Look }> = () => (
  <>
    <ambientLight intensity={0.15} />
    <spotLight
      position={[0, 12, 4]}
      angle={0.6}
      penumbra={0.8}
      intensity={180}
      castShadow
      shadow-mapSize={[2048, 2048]}
    />
    {/* Procedural reflections — no HDR download needed. */}
    <Environment resolution={256} frames={1}>
      <Lightformer
        form="rect"
        intensity={4}
        position={[0, 6, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[12, 1, 1]}
      />
      <Lightformer
        form="rect"
        intensity={2.5}
        position={[-6, 3, 2]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[8, 1, 1]}
      />
      <Lightformer
        form="rect"
        intensity={2.5}
        position={[6, 3, -2]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[8, 1, 1]}
      />
      <Lightformer form="ring" intensity={1.2} position={[0, 2, 8]} scale={4} />
    </Environment>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#141518" roughness={0.3} metalness={0.6} />
    </mesh>
    {/* Overhead strip lights, visible in frame like a tunnel/studio ceiling. */}
    {[-6, -2, 2, 6, 10, 14].map((z) => (
      <mesh key={z} position={[0, 7, -z]} rotation={[0, 0.5, 0]}>
        <boxGeometry args={[10, 0.06, 0.18]} />
        <meshStandardMaterial
          color="#FFFFFF"
          emissive="#FFFFFF"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
    ))}
  </>
);

const TacticalWorld: React.FC<{ look: Look }> = ({ look }) => (
  <>
    <hemisphereLight args={["#F2F4F6", "#5B5F66", 1.6]} />
    <directionalLight
      position={[8, 16, 6]}
      intensity={1.6}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-16}
      shadow-camera-right={16}
      shadow-camera-top={16}
      shadow-camera-bottom={-16}
      shadow-bias={-0.0004}
    />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#8C9096" roughness={0.95} />
    </mesh>
    {/* Road: darker asphalt strip with kerbs, the default "street" stage. */}
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.005, 0]}
      receiveShadow
    >
      <planeGeometry args={[8, 200]} />
      <meshStandardMaterial color="#6F7378" roughness={1} />
    </mesh>
    {[-4.2, 4.2].map((x) => (
      <mesh key={x} position={[x, 0.12, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.4, 0.24, 200]} />
        <meshStandardMaterial color={look.base[2]} roughness={1} />
      </mesh>
    ))}
  </>
);

/**
 * Background, fog, lights and floor for a look. Put it inside <ThreeCanvas shadows>.
 * Pass `floor={false}` to keep only background, fog and lights (e.g. for a custom set).
 */
export const LookEnvironment: React.FC<{ look: Look; floor?: boolean }> = ({
  look,
  floor = true,
}) => {
  const World = {
    clay: ClayWorld,
    neon: NeonWorld,
    studio: StudioWorld,
    tactical: TacticalWorld,
  }[look.id];
  return (
    <>
      <color attach="background" args={[look.bg]} />
      <fog attach="fog" args={[look.bg, ...look.fog]} />
      {floor ? <World look={look} /> : <ambientLight intensity={0.8} />}
    </>
  );
};

/**
 * Bloom/vignette for looks that use them. Must be the last child of <ThreeCanvas>.
 *
 * The composer is created asynchronously (after Remotion has already advanced R3F for the
 * frame), and while it is missing nothing draws — stills and the first frame would be
 * blank. So we hold the render with delayRender until the composer exists, draw once,
 * then release.
 */
export const LookEffects: React.FC<{ look: Look }> = ({ look }) => {
  const enabled = !!(look.bloom || look.vignette);
  const advance = useThree((s) => s.advance);
  const { delayRender, continueRender } = useDelayRender();
  const handle = useRef<number | null>(null);
  const ready = useRef(false);
  // Taken in a layout effect, not during render: the canvas suspends while models load,
  // and a handle taken in a discarded render would never be released.
  useLayoutEffect(() => {
    if (!enabled || ready.current) return;
    const h = delayRender("Waiting for post-processing composer");
    handle.current = h;
    return () => {
      if (handle.current !== null) continueRender(h);
      handle.current = null;
    };
  }, [enabled, delayRender, continueRender]);
  const onComposer = useCallback(
    (composer: unknown) => {
      if (!composer || ready.current) return;
      ready.current = true;
      // Let the composer add its effect passes (layout effects) before drawing.
      setTimeout(() => {
        advance(performance.now());
        if (handle.current !== null) continueRender(handle.current);
        handle.current = null;
      }, 0);
    },
    [advance, continueRender],
  );
  if (!enabled) return null;
  const effects: React.ReactElement[] = [];
  if (look.bloom)
    effects.push(
      <Bloom key="bloom" intensity={look.bloom.intensity} luminanceThreshold={look.bloom.threshold} mipmapBlur />,
    );
  if (look.vignette) effects.push(<Vignette key="vignette" offset={0.3} darkness={look.vignette} />);
  return (
    <EffectComposer ref={onComposer} multisampling={4}>
      {effects}
    </EffectComposer>
  );
};
