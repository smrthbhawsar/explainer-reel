/**
 * Look sampler: the same small set rendered in each look, with every overlay type.
 * Registered as LookTest-clay / -neon / -studio / -tactical. Used by the
 * hinglish-3d-reel skill to show the user what a look feels like before building,
 * and as a smoke test after kit changes. Uses public/models/fox (Khronos, CC0 + CC-BY).
 */
import { ThreeCanvas } from "@remotion/three";
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { StylishCaptions } from "../StylishCaptions";
import { Callouts, CalloutSpec } from "./Callout";
import { CameraRig } from "./CameraRig";
import { makeCameraTrack } from "./cameraTrack";
import { LookEffects, LookEnvironment, LookId, LOOKS } from "./looks";
import { Model } from "./Model";
import { SceneHeader } from "./SceneHeader";
import { StageTracker } from "./StageTracker";

export const LOOK_TEST_DURATION = 150;
const W = 1080;
const H = 1920;

const track = makeCameraTrack(
  [
    {
      from: 0,
      pos: [-7, 5.5, 9],
      target: [0, 0.6, 0],
      drift: [1.5, -0.6, -1.2],
    },
    {
      from: 80,
      pos: [3.5, 3.2, 6.5],
      target: [0.4, 0.8, 0],
      drift: [0.6, -0.2, -0.8],
    },
  ],
  LOOK_TEST_DURATION,
);

const Set: React.FC<{ id: LookId }> = ({ id }) => {
  const look = LOOKS[id];
  const frame = useCurrentFrame();
  const pulse = 0.6 + 0.4 * Math.sin(frame / 8);
  const foxX = interpolate(frame, [0, LOOK_TEST_DURATION], [-3.5, 2.5]);
  return (
    <>
      {/* plinth + block stack in base colours */}
      <mesh position={[0, 0.3, -1]} castShadow receiveShadow>
        <boxGeometry args={[4, 0.6, 2]} />
        <meshStandardMaterial
          color={look.base[1]}
          roughness={0.7}
          metalness={id === "studio" ? 0.6 : 0.1}
        />
      </mesh>
      {[-1.2, 0, 1.2].map((x, i) => (
        <mesh key={x} position={[x, 1.1, -1]} castShadow>
          <boxGeometry args={[0.9, 1 + i * 0.4, 0.9]} />
          <meshStandardMaterial
            color={i === 1 ? look.accent.primary : look.base[0]}
            emissive={i === 1 ? look.accent.primary : "#000000"}
            emissiveIntensity={i === 1 && look.bloom ? 1.5 * pulse : 0}
            roughness={0.5}
            metalness={id === "studio" ? 0.7 : 0.1}
          />
        </mesh>
      ))}
      {/* glowing ring — shows bloom in neon/studio */}
      <mesh position={[2.6, 0.05, 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.7, 0.05, 16, 64]} />
        <meshStandardMaterial
          color={look.accent.secondary}
          emissive={look.accent.secondary}
          emissiveIntensity={2 * pulse}
          toneMapped={false}
        />
      </mesh>
      {/* loaded GLB, restyled to the look */}
      <Model
        src="models/fox/Fox.glb"
        size={1.3}
        fit="height"
        position={[foxX, 0, 1.2]}
        rotation={[0, Math.PI / 2, 0]}
        clip="Walk"
        restyle={[{ color: look.base[id === "clay" ? 0 : 2], roughness: 0.6 }]}
      />
    </>
  );
};

const CALLOUTS: CalloutSpec[] = [
  {
    from: 10,
    to: 78,
    label: "Primary object",
    point: [0, 1.9, -1],
    dx: 120,
    dy: -220,
  },
  {
    from: 30,
    to: 145,
    label: "Loaded model",
    point: [0, 1.1, 1.2],
    dx: -60,
    dy: -260,
    box: [200, 220],
  },
];

export const LookTest: React.FC<{ look: LookId }> = ({ look: id }) => {
  const look = LOOKS[id];
  const frame = useCurrentFrame();
  // Anchor the model callout to the walking fox.
  const items = CALLOUTS.map((c, i) =>
    i === 1
      ? {
          ...c,
          point: [
            interpolate(frame, [0, LOOK_TEST_DURATION], [-3.5, 2.5]),
            0.8,
            1.2,
          ] as [number, number, number],
        }
      : c,
  );
  const spec = { fov: look.fov, width: W, height: H };
  return (
    <AbsoluteFill style={{ backgroundColor: look.bg }}>
      <ThreeCanvas
        width={W}
        height={H}
        shadows
        camera={{ fov: look.fov, near: 0.1, far: 200 }}
      >
        <CameraRig poseAt={track} fov={look.fov} />
        <LookEnvironment look={look} />
        <Set id={id} />
        <LookEffects look={look} />
      </ThreeCanvas>
      <Callouts
        items={items}
        poseAt={track}
        spec={spec}
        variant={look.callout}
        color={look.callout === "bracket" ? look.accent.primary : look.ink}
        plate={look.plate}
      />
      {look.header === "stages" ? (
        <StageTracker
          stages={[
            { from: 0, label: "Stage one", color: look.ink },
            { from: 80, label: "Stage two", color: look.accent.primary },
            { from: 9999, label: "Stage three", color: look.accent.secondary },
          ]}
         
          ink={look.ink}
        />
      ) : (
        <SceneHeader
          variant={look.header}
          sections={[
            { from: 0, label: "Section one" },
            { from: 80, label: "Section two" },
          ]}
          duration={LOOK_TEST_DURATION}
          ink={look.ink}
          accent={look.accent.primary}
        />
      )}
      <StylishCaptions
        src="proto3d/captions.json"
        keywords={["code", "computer"]}
        variant={look.caption}
        accent={look.accent.primary}
      />
    </AbsoluteFill>
  );
};
