import { Easing, interpolate } from "remotion";
import { PerspectiveCamera, Vector3 } from "three";

export type Vec3 = [number, number, number];

/**
 * One camera "shot". The camera eases into `pos`/`target` starting at frame `from`,
 * then drifts by `drift` (world units) until the next shot starts, so it never sits still.
 */
export type Shot = {
  from: number;
  pos: Vec3;
  target: Vec3;
  drift?: Vec3;
  /** Frames spent travelling from the previous shot (default 26). */
  moveFrames?: number;
};

export type Pose = { pos: Vec3; target: Vec3 };

const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const add3 = (a: Vec3, b: Vec3, k: number): Vec3 => [
  a[0] + b[0] * k,
  a[1] + b[1] * k,
  a[2] + b[2] * k,
];

const ease = Easing.inOut(Easing.cubic);

/**
 * Builds a pure `poseAt(frame)` function from a list of shots. Because it is a pure
 * function of the frame, the 3D camera (<CameraRig/>) and the 2D overlays (<Callout/>)
 * can both use it and always agree on where things are on screen.
 */
export const makeCameraTrack = (shots: Shot[], durationInFrames: number) => {
  const sorted = [...shots].sort((a, b) => a.from - b.from);
  const endOf = (i: number) =>
    i + 1 < sorted.length ? sorted[i + 1].from : durationInFrames;

  // Pose of shot i at frame f, ignoring transitions (just base + drift).
  const holdPose = (i: number, f: number): Pose => {
    const s = sorted[i];
    const t = interpolate(f, [s.from, endOf(i)], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.sin),
    });
    return { pos: s.drift ? add3(s.pos, s.drift, t) : s.pos, target: s.target };
  };

  return (frame: number): Pose => {
    let i = 0;
    while (i + 1 < sorted.length && sorted[i + 1].from <= frame) i++;
    const s = sorted[i];
    const here = holdPose(i, frame);
    const move = s.moveFrames ?? 26;
    if (i === 0 || frame >= s.from + move) return here;
    const prev = holdPose(i - 1, s.from);
    const t = ease((frame - s.from) / move);
    return {
      pos: lerp3(prev.pos, here.pos, t),
      target: lerp3(prev.target, here.target, t),
    };
  };
};

export type CameraSpec = { fov: number; width: number; height: number };

/** World point -> pixel position on the 1080x1920 frame for a given pose. */
export const projectToScreen = (pose: Pose, point: Vec3, spec: CameraSpec) => {
  const cam = new PerspectiveCamera(
    spec.fov,
    spec.width / spec.height,
    0.1,
    500,
  );
  cam.position.set(...pose.pos);
  cam.lookAt(...pose.target);
  cam.updateMatrixWorld();
  const v = new Vector3(...point).project(cam);
  return {
    x: ((v.x + 1) / 2) * spec.width,
    y: ((1 - v.y) / 2) * spec.height,
    visible: v.z < 1 && v.z > -1,
  };
};
