/**
 * Shared 3D set for the CRICKET TECH series (EP 1 DRS / Hawk-Eye, EP 2 UltraEdge, …):
 * the dusky floodlit stadium in the tactical look, pitch, stumps, a code-built batter,
 * ball and small geometry helpers. Every episode imports this so the series looks the same.
 *
 * World layout: the pitch runs along x (bowler's stumps x=-10.06, batter's stumps
 * x=+10.06), 1 unit = 1 metre. The ball is drawn ~1.5x real size so it reads on a phone.
 */
import { RoundedBox } from "@react-three/drei";
import React, { useMemo } from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { Object3D, Quaternion, Vector3 } from "three";
import { Vec3 } from "../../kit/three/cameraTrack";
import { Look, LOOKS } from "../../kit/three/looks";

// Tactical look, re-lit as a dusky floodlit stadium (darker bg, longer fog for the wide shots).
export const STADIUM_LOOK: Look = { ...LOOKS.tactical, bg: "#3A4047", fog: [34, 95] };

export const C = {
  grass: "#55604F",
  outfield: "#5F6B57",
  outer: "#3E443D",
  pitch: "#A3977A",
  crease: "#EDEDE6",
  stump: "#E6DFCF",
  stand: "#2C3136",
  pad: "#ECECE6",
  kit: "#22262B",
  ball: "#F4F2EC",
  path: STADIUM_LOOK.accent.bad,
  hud: STADIUM_LOOK.accent.primary,
  lime: STADIUM_LOOK.accent.secondary,
};

export const STUMPS_X = 10.06;
export const BALL_R = 0.11;
export const MONO = "'JetBrains Mono', Consolas, 'Courier New', monospace";

// ---- Timing helpers --------------------------------------------------------------------
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ramp = (frame: number, a: number, b: number, ease = true) =>
  interpolate(frame, [a, b], [0, 1], { ...clamp, easing: ease ? Easing.inOut(Easing.cubic) : undefined });
export const win = (frame: number, a: number, b: number) => frame >= a && frame < b;

// ---- Geometry helpers ------------------------------------------------------------------
const UP = new Vector3(0, 1, 0);

/** Glowing rod from a to b. */
export const Segment: React.FC<{
  a: Vec3;
  b: Vec3;
  r?: number;
  color: string;
  glow?: number;
  opacity?: number;
}> = ({ a, b, r = 0.03, color, glow = 0.6, opacity = 1 }) => {
  const { mid, len, q } = useMemo(() => {
    const va = new Vector3(...a);
    const vb = new Vector3(...b);
    const d = vb.clone().sub(va);
    return {
      mid: va.clone().add(vb).multiplyScalar(0.5),
      len: d.length(),
      q: new Quaternion().setFromUnitVectors(UP, d.normalize()),
    };
  }, [a, b]);
  return (
    <mesh position={mid} quaternion={q}>
      <cylinderGeometry args={[r, r, len, 10]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={glow}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
};

export const lookQuat = (from: Vec3, to: Vec3) => {
  const o = new Object3D();
  o.position.set(...from);
  o.lookAt(...to);
  return o.quaternion.clone();
};

/** Children aligned from a to b (local +y along a→b), centred between them. */
export const Along: React.FC<{ a: Vec3; b: Vec3; children: (len: number) => React.ReactNode }> = ({ a, b, children }) => {
  const va = new Vector3(...a);
  const vb = new Vector3(...b);
  const d = vb.clone().sub(va);
  const len = d.length();
  const q = new Quaternion().setFromUnitVectors(UP, d.normalize());
  const mid = va.add(vb).multiplyScalar(0.5);
  return (
    <group position={mid} quaternion={q}>
      {children(len)}
    </group>
  );
};

// ---- Lights + sets ---------------------------------------------------------------------
export const StadiumLights: React.FC = () => (
  <>
    <hemisphereLight args={["#E6ECF2", "#3B4046", 1.3]} />
    <directionalLight
      position={[6, 18, 8]}
      intensity={1.8}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-14}
      shadow-camera-right={14}
      shadow-camera-top={8}
      shadow-camera-bottom={-8}
      shadow-bias={-0.0004}
    />
  </>
);

export const Ground: React.FC = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[300, 300]} />
      <meshStandardMaterial color={C.outer} roughness={1} />
    </mesh>
    {/* oval outfield */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} scale={[21, 11, 1]} receiveShadow>
      <circleGeometry args={[1, 96]} />
      <meshStandardMaterial color={C.outfield} roughness={1} />
    </mesh>
    {/* boundary rope */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} scale={[20, 10, 1]}>
      <torusGeometry args={[1, 0.004, 6, 128]} />
      <meshStandardMaterial color="#D9D6CC" />
    </mesh>
    {/* pitch strip */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]} receiveShadow>
      <planeGeometry args={[24, 3.05]} />
      <meshStandardMaterial color={C.pitch} roughness={1} />
    </mesh>
    {/* creases: popping (±8.84) and bowling (±10.06) */}
    {[-10.06, -8.84, 8.84, 10.06].map((x) => (
      <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.012, 0]}>
        <planeGeometry args={[0.05, 3.05]} />
        <meshStandardMaterial color={C.crease} />
      </mesh>
    ))}
  </group>
);

export const Stumps: React.FC<{ x: number; opacity?: number }> = ({ x, opacity = 1 }) => (
  <group position={[x, 0, 0]}>
    {[-0.095, 0, 0.095].map((z) => (
      <mesh key={z} position={[0, 0.355, z]} castShadow={opacity >= 1}>
        <cylinderGeometry args={[0.022, 0.022, 0.71, 12]} />
        <meshStandardMaterial
          color={C.stump}
          roughness={0.6}
          transparent={opacity < 1}
          opacity={opacity}
          depthWrite={opacity >= 1}
        />
      </mesh>
    ))}
    {[-0.048, 0.048].map((z) => (
      <mesh key={z} position={[0, 0.722, z]} castShadow={opacity >= 1}>
        <boxGeometry args={[0.03, 0.025, 0.1]} />
        <meshStandardMaterial color={C.stump} transparent={opacity < 1} opacity={opacity} depthWrite={opacity >= 1} />
      </mesh>
    ))}
  </group>
);

export const Stands: React.FC<{ glow?: number }> = ({ glow = 0 }) => {
  const segs = 36;
  return (
    <group>
      {Array.from({ length: segs }, (_, i) => {
        const a = (i / segs) * Math.PI * 2;
        const x = 27 * Math.cos(a);
        const z = 15.5 * Math.sin(a);
        const yaw = Math.atan2(-15.5 * Math.cos(a), -27 * Math.sin(a));
        return (
          <mesh key={i} position={[x, 2.2, z]} rotation={[0, yaw, 0]} receiveShadow>
            <boxGeometry args={[5.2, 4.4, 4]} />
            <meshStandardMaterial color={C.stand} roughness={1} emissive={C.path} emissiveIntensity={glow} />
          </mesh>
        );
      })}
    </group>
  );
};

export const Floodlights: React.FC = () => (
  <group>
    {(
      [
        [-26, -17],
        [-26, 17],
        [26, 17],
        [32, 0],
      ] as [number, number][]
    ).map(([x, z]) => {
      const q = lookQuat([x, 20, z], [0, 0, 0]);
      return (
        <group key={`${x}${z}`}>
          <mesh position={[x, 10, z]}>
            <cylinderGeometry args={[0.18, 0.3, 20, 8]} />
            <meshStandardMaterial color="#2A2E33" />
          </mesh>
          <group position={[x, 20.5, z]} quaternion={q}>
            <mesh>
              <boxGeometry args={[3.2, 2, 0.3]} />
              <meshStandardMaterial color="#2A2E33" />
            </mesh>
            <mesh position={[0, 0, 0.16]}>
              <planeGeometry args={[2.9, 1.7]} />
              <meshStandardMaterial color="#FFFFFF" emissive="#FFF6DD" emissiveIntensity={2.5} toneMapped={false} />
            </mesh>
          </group>
        </group>
      );
    })}
  </group>
);

export const Ball: React.FC<{ p: Vec3; opacity?: number; color?: string; scale?: number }> = ({
  p,
  opacity = 1,
  color = C.ball,
  scale = 1,
}) => (
  <mesh position={p} scale={scale} castShadow>
    <sphereGeometry args={[BALL_R, 24, 18]} />
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={0.25}
      transparent={opacity < 1}
      opacity={opacity}
    />
  </mesh>
);

/** Expanding, fading halo around a point, starting at frame `at`. */
export const Pulse: React.FC<{ p: Vec3; at: number; color: string; size?: number; dur?: number }> = ({
  p,
  at,
  color,
  size = 0.2,
  dur = 22,
}) => {
  const frame = useCurrentFrame();
  if (frame < at || frame > at + dur) return null;
  const t = (frame - at) / dur;
  return (
    <mesh position={p} scale={size * (1 + 2.5 * t)}>
      <sphereGeometry args={[1, 24, 16]} />
      <meshBasicMaterial color={color} transparent opacity={(1 - t) * 0.55} depthWrite={false} toneMapped={false} />
    </mesh>
  );
};

// ---- Batter (code-built) ---------------------------------------------------------------
// Right-hander in a side-on stance at the batter's end: feet along the pitch (front foot
// towards the bowler at -x), chest facing +z (towards the main cameras = off side), head
// turned to the bowler. Local coords: x = along the pitch, origin under the front foot.
export const BAT_KIT = {
  kit: "#1F2A44",
  trim: C.hud,
  pad: "#EFEFEA",
  padShade: "#D9D9D2",
  strap: "#2B2F36",
  shoe: "#F2F2EE",
  sole: "#2B2F36",
  glove: "#F2F2EE",
  helmet: "#1F2A44",
  grille: "#B8BCC2",
  skin: "#8A6A55",
  willow: "#D9C190",
  grip: "#2B2F36",
};

export type BatterPose = {
  fAnkle: Vec3;
  fKnee: Vec3;
  fHip: Vec3;
  bAnkle: Vec3;
  bKnee: Vec3;
  bHip: Vec3;
  pelvis: Vec3;
  chest: Vec3;
  fShoulder: Vec3;
  bShoulder: Vec3;
  fElbow: Vec3;
  bElbow: Vec3;
  hands: Vec3;
  head: Vec3;
  batToe: Vec3;
  /** Head pitched down towards the ball, radians (0 = looking level down the pitch). */
  headTilt?: number;
  /** Bottom (right) hand holds the lower glove instead of meeting the top hand. */
  lowerHand?: boolean;
  /** Head turned about the vertical axis, radians (+ opens the face towards the off side). */
  headTurn?: number;
  /** Slimmer shoulder bar with joint spheres matching the upper arms (no seam/overhang). */
  smoothShoulders?: boolean;
};

/** "Leaving" the ball: bat lifted high over the back shoulder, clear of the stumps (EP 1). */
export const POSE_LEAVE: BatterPose = {
  fAnkle: [0, 0.09, 0.06],
  fKnee: [-0.07, 0.5, 0.1],
  fHip: [0.1, 0.92, 0.06],
  bAnkle: [0.46, 0.09, 0.0],
  bKnee: [0.44, 0.5, 0.05],
  bHip: [0.3, 0.92, 0.02],
  pelvis: [0.2, 0.95, 0.04],
  chest: [0.17, 1.36, 0.12],
  fShoulder: [0.0, 1.42, 0.12],
  bShoulder: [0.34, 1.42, 0.1],
  fElbow: [0.06, 1.28, 0.34],
  bElbow: [0.42, 1.24, 0.28],
  hands: [0.26, 1.46, 0.3],
  head: [0.1, 1.64, 0.13],
  batToe: [0.5, 2.25, 0.12],
};

type MatFn = (color: string, extra?: { metal?: number; rough?: number }) => React.ReactElement;

const Limb: React.FC<{ a: Vec3; b: Vec3; r: number; color: string; mat: MatFn }> = ({ a, b, r, color, mat }) => (
  <Along a={a} b={b}>
    {(len) => (
      <mesh castShadow>
        <capsuleGeometry args={[r, Math.max(0.01, len), 6, 12]} />
        {mat(color)}
      </mesh>
    )}
  </Along>
);

/** Batting pad over the shin: shaped shell, vertical ridges, knee roll, two straps. */
const Pad: React.FC<{ ankle: Vec3; knee: Vec3; mat: MatFn }> = ({ ankle, knee, mat }) => (
  <Along a={ankle} b={knee}>
    {(len) => (
      <group>
        <RoundedBox args={[0.17, len + 0.1, 0.17]} radius={0.06} smoothness={3} castShadow>
          {mat(BAT_KIT.pad, { rough: 0.7 })}
        </RoundedBox>
        {/* ridges on the outer face (towards the bowler) and on the front */}
        {[-0.045, 0, 0.045].map((o) => (
          <mesh key={`x${o}`} position={[-0.088, 0, o]} castShadow>
            <capsuleGeometry args={[0.012, len - 0.04, 4, 6]} />
            {mat(BAT_KIT.padShade)}
          </mesh>
        ))}
        {[-0.045, 0.045].map((o) => (
          <mesh key={`z${o}`} position={[o, 0, 0.088]} castShadow>
            <capsuleGeometry args={[0.012, len - 0.04, 4, 6]} />
            {mat(BAT_KIT.padShade)}
          </mesh>
        ))}
        {/* knee roll */}
        <mesh position={[-0.01, len / 2 + 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.055, 0.07, 6, 12]} />
          {mat(BAT_KIT.pad, { rough: 0.7 })}
        </mesh>
        {/* straps */}
        {[-len * 0.25, len * 0.2].map((y) => (
          <mesh key={y} position={[0.01, y, 0]}>
            <boxGeometry args={[0.176, 0.025, 0.176]} />
            {mat(BAT_KIT.strap)}
          </mesh>
        ))}
      </group>
    )}
  </Along>
);

const Shoe: React.FC<{ at: Vec3; mat: MatFn }> = ({ at, mat }) => (
  <group position={[at[0], 0, at[2] + 0.05]}>
    <RoundedBox args={[0.12, 0.09, 0.28]} radius={0.035} smoothness={2} position={[0, 0.06, 0]} castShadow>
      {mat(BAT_KIT.shoe)}
    </RoundedBox>
    <mesh position={[0, 0.012, 0]}>
      <boxGeometry args={[0.125, 0.024, 0.285]} />
      {mat(BAT_KIT.sole)}
    </mesh>
  </group>
);

const Helmet: React.FC<{ at: Vec3; mat: MatFn; tilt?: number; turn?: number }> = ({ at, mat, tilt = 0, turn = 0 }) => (
  // face points -x; a +z rotation tips it down
  <group position={at} rotation={[0, turn, tilt]} rotation-order="YZX">
    {/* face */}
    <mesh position={[-0.02, -0.04, 0]} scale={[0.9, 1.05, 0.85]}>
      <sphereGeometry args={[0.1, 18, 14]} />
      {mat(BAT_KIT.skin)}
    </mesh>
    {/* shell (top dome) */}
    <mesh position={[0.015, 0.02, 0]} scale={[1.05, 0.95, 1]} castShadow>
      <sphereGeometry args={[0.125, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      {mat(BAT_KIT.helmet, { rough: 0.35, metal: 0.2 })}
    </mesh>
    {/* back of the shell / neck guard (the half facing away from the bowler) */}
    <mesh position={[0.05, -0.04, 0]} scale={[0.8, 0.9, 1]} castShadow>
      <sphereGeometry args={[0.12, 18, 12, Math.PI * 0.5, Math.PI, Math.PI * 0.4, Math.PI * 0.3]} />
      {mat(BAT_KIT.helmet, { rough: 0.35, metal: 0.2 })}
    </mesh>
    {/* peak */}
    <mesh position={[-0.13, 0.03, 0]} rotation={[0, 0, 0.25]} castShadow>
      <boxGeometry args={[0.1, 0.012, 0.2]} />
      {mat(BAT_KIT.helmet, { rough: 0.4 })}
    </mesh>
    {/* grille: three bars wrapping the face + a centre bar */}
    {[-0.025, -0.07, -0.115].map((y, i) => (
      // torus arc is the +y half of the XY plane: tip it flat, then turn it to face -x
      <group key={y} position={[0.01, y, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.135 - i * 0.008, 0.006, 6, 20, Math.PI]} />
          {mat(BAT_KIT.grille, { metal: 0.8, rough: 0.3 })}
        </mesh>
      </group>
    ))}
    <mesh position={[-0.125, -0.07, 0]}>
      <cylinderGeometry args={[0.006, 0.006, 0.1, 6]} />
      {mat(BAT_KIT.grille, { metal: 0.8, rough: 0.3 })}
    </mesh>
  </group>
);

/** Bat from the hands down to its toe: rubber grip, blade with a raised spine. */
const Bat: React.FC<{ top: Vec3; toe: Vec3; mat: MatFn; edgeGlow?: number }> = ({ top, toe, mat, edgeGlow = 0 }) => {
  const d = new Vector3(...toe).sub(new Vector3(...top));
  const at = (t: number): Vec3 => [top[0] + d.x * t, top[1] + d.y * t, top[2] + d.z * t];
  const handleEnd = at(0.36);
  return (
    <group>
      <Along a={at(-0.1)} b={handleEnd}>
        {(len) => (
          <mesh castShadow>
            <cylinderGeometry args={[0.019, 0.019, len, 10]} />
            {mat(BAT_KIT.grip, { rough: 0.9 })}
          </mesh>
        )}
      </Along>
      <Along a={toe} b={handleEnd}>
        {(len) => (
          <group>
            {/* blade face points at the bowler (-x) */}
            <RoundedBox args={[0.035, len, 0.108]} radius={0.012} smoothness={2} castShadow>
              {mat(BAT_KIT.willow, { rough: 0.6 })}
            </RoundedBox>
            <RoundedBox
              args={[0.03, len * 0.7, 0.05]}
              radius={0.012}
              smoothness={2}
              position={[0.025, -len * 0.08, 0]}
              castShadow
            >
              {mat(BAT_KIT.willow, { rough: 0.6 })}
            </RoundedBox>
            {/* plain sticker band (no brand) */}
            <mesh position={[0.019, len * 0.25, 0]}>
              <boxGeometry args={[0.035, 0.05, 0.11]} />
              {mat(BAT_KIT.trim)}
            </mesh>
            {/* outside edge (+z side) highlight */}
            {edgeGlow > 0.01 && (
              <mesh position={[0, 0, 0.056]}>
                <boxGeometry args={[0.04, len, 0.008]} />
                <meshBasicMaterial color={C.hud} transparent opacity={edgeGlow} toneMapped={false} />
              </mesh>
            )}
          </group>
        )}
      </Along>
    </group>
  );
};

export const Batter: React.FC<{ x: number; pose?: BatterPose; opacity?: number; edgeGlow?: number }> = ({
  x,
  pose = POSE_LEAVE,
  opacity = 1,
  edgeGlow = 0,
}) => {
  const J = pose;
  const gripDir = useMemo(() => {
    const v = new Vector3(...J.batToe).sub(new Vector3(...J.hands)).normalize();
    return [v.x, v.y, v.z] as Vec3;
  }, [J]);
  const mat: MatFn = (color, extra = {}) => (
    <meshStandardMaterial
      color={color}
      roughness={extra.rough ?? 0.8}
      metalness={extra.metal ?? 0}
      transparent={opacity < 1}
      opacity={opacity}
      depthWrite={opacity >= 1}
    />
  );
  return (
    <group position={[x, 0, 0]}>
      <Shoe at={J.fAnkle} mat={mat} />
      <Shoe at={J.bAnkle} mat={mat} />
      <Pad ankle={J.fAnkle} knee={J.fKnee} mat={mat} />
      <Pad ankle={J.bAnkle} knee={J.bKnee} mat={mat} />
      <Limb a={J.fKnee} b={J.fHip} r={0.08} color={BAT_KIT.kit} mat={mat} />
      <Limb a={J.bKnee} b={J.bHip} r={0.08} color={BAT_KIT.kit} mat={mat} />
      {/* hips + torso (leaning forward over the bat) */}
      <Limb
        a={[J.fHip[0] - 0.03, J.fHip[1], J.fHip[2]]}
        b={[J.bHip[0] + 0.03, J.bHip[1], J.bHip[2]]}
        r={0.11}
        color={BAT_KIT.kit}
        mat={mat}
      />
      <Along a={J.pelvis} b={J.chest}>
        {(len) => (
          <group>
            <RoundedBox args={[0.36, len + 0.16, 0.24]} radius={0.09} smoothness={3} castShadow>
              {mat(BAT_KIT.kit)}
            </RoundedBox>
            <mesh position={[0, 0, 0.122]}>
              <boxGeometry args={[0.04, len + 0.1, 0.004]} />
              {mat(BAT_KIT.trim)}
            </mesh>
          </group>
        )}
      </Along>
      <Limb a={J.fShoulder} b={J.bShoulder} r={J.smoothShoulders ? 0.06 : 0.085} color={BAT_KIT.kit} mat={mat} />
      {J.smoothShoulders &&
        [J.fShoulder, J.bShoulder].map((p, i) => (
          <mesh key={i} position={p} castShadow>
            <sphereGeometry args={[0.06, 16, 12]} />
            {mat(BAT_KIT.kit)}
          </mesh>
        ))}
      <Limb a={J.chest} b={[J.head[0] + 0.02, J.head[1] - 0.1, J.head[2]]} r={0.045} color={BAT_KIT.skin} mat={mat} />
      {/* arms to the hands, gloves */}
      <Limb a={J.fShoulder} b={J.fElbow} r={J.smoothShoulders ? 0.055 : 0.05} color={BAT_KIT.kit} mat={mat} />
      <Limb a={J.fElbow} b={J.hands} r={0.045} color={BAT_KIT.kit} mat={mat} />
      <Limb a={J.bShoulder} b={J.bElbow} r={J.smoothShoulders ? 0.055 : 0.05} color={BAT_KIT.kit} mat={mat} />
      <Limb
        a={J.bElbow}
        b={J.lowerHand ? [J.hands[0] + gripDir[0] * 0.1, J.hands[1] + gripDir[1] * 0.1, J.hands[2] + gripDir[2] * 0.1] : J.hands}
        r={0.045}
        color={BAT_KIT.kit}
        mat={mat}
      />
      {/* two gloves stacked along the bat handle */}
      {[0.0, 0.1].map((o) => (
        <RoundedBox
          key={o}
          args={[0.1, 0.09, 0.1]}
          radius={0.03}
          smoothness={2}
          position={[J.hands[0] + gripDir[0] * o, J.hands[1] + gripDir[1] * o, J.hands[2] + gripDir[2] * o]}
          castShadow
        >
          {mat(BAT_KIT.glove)}
        </RoundedBox>
      ))}
      <Helmet at={J.head} mat={mat} tilt={J.headTilt} turn={J.headTurn} />
      <Bat top={[J.hands[0] - 0.03, J.hands[1] - 0.1, J.hands[2]]} toe={J.batToe} mat={mat} edgeGlow={edgeGlow} />
    </group>
  );
};
