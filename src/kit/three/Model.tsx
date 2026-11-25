import { useGLTF } from "@react-three/drei";
import React, { useLayoutEffect, useMemo } from "react";
import { staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import {
  AnimationMixer,
  Box3,
  Color,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Vec3 } from "./cameraTrack";

/**
 * Material override so models from different sources match the reel's look.
 * Rules are tried in order against each mesh's name and its material's name;
 * a rule without `match` is the fallback for everything else.
 */
export type RestyleRule = {
  match?: RegExp;
  color: string;
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
};

type Props = {
  /** Path inside /public, e.g. "models/sports-car/scene.glb". */
  src: string;
  /** Size in world units after normalisation (see `fit`). */
  size: number;
  /** Which dimension `size` refers to (default: the longest side). */
  fit?: "longest" | "height" | "width" | "depth";
  position?: Vec3;
  rotation?: Vec3;
  /** Recolour meshes; omit to keep the model's own materials. */
  restyle?: RestyleRule[];
  /** Animation clip name or index to play (frame-accurate, deterministic). */
  clip?: string | number;
  clipSpeed?: number;
  /** Seconds into the clip at frame 0 of this component's Sequence. */
  clipOffset?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  /** Called once with the normalised clone, e.g. to grab a named part. */
  onReady?: (root: Object3D) => void;
};

const restyleMaterial = (mat: Material, rule: RestyleRule) =>
  new MeshStandardMaterial({
    color: new Color(rule.color),
    metalness: rule.metalness ?? 0.1,
    roughness: rule.roughness ?? 0.75,
    emissive: new Color(rule.emissive ?? "#000000"),
    emissiveIntensity: rule.emissiveIntensity ?? 0,
    transparent: rule.opacity !== undefined && rule.opacity < 1,
    opacity: rule.opacity ?? 1,
    name: mat.name,
  });

/**
 * Loads a GLB/glTF from /public, clones it (safe to use several times), scales it so
 * `size` is its real extent in world units, stands it on y=0 centred on x/z, optionally
 * recolours it and plays an animation clip locked to the Remotion frame.
 */
export const Model: React.FC<Props> = ({
  src,
  size,
  fit = "longest",
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  restyle,
  clip,
  clipSpeed = 1,
  clipOffset = 0,
  castShadow = true,
  receiveShadow = true,
  onReady,
}) => {
  const gltf = useGLTF(staticFile(src));
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { root, mixer } = useMemo(() => {
    const obj = cloneSkinned(gltf.scene);
    // Normalise: measure, scale, then sit on the ground at the origin.
    const box = new Box3().setFromObject(obj);
    const dim = box.getSize(new Vector3());
    const ref =
      fit === "height"
        ? dim.y
        : fit === "width"
          ? dim.x
          : fit === "depth"
            ? dim.z
            : Math.max(dim.x, dim.y, dim.z);
    const k = ref > 0 ? size / ref : 1;
    obj.scale.multiplyScalar(k);
    const box2 = new Box3().setFromObject(obj);
    const c = box2.getCenter(new Vector3());
    obj.position.sub(new Vector3(c.x, box2.min.y, c.z));

    obj.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.castShadow = castShadow;
      m.receiveShadow = receiveShadow;
      if (!restyle) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const next = mats.map((mat) => {
        const rule =
          restyle.find(
            (r) => r.match && (r.match.test(m.name) || r.match.test(mat.name)),
          ) ?? restyle.find((r) => !r.match);
        return rule ? restyleMaterial(mat, rule) : mat;
      });
      m.material = Array.isArray(m.material) ? next : next[0];
    });

    let mx: AnimationMixer | null = null;
    if (clip !== undefined && gltf.animations.length) {
      const anim =
        typeof clip === "number"
          ? gltf.animations[clip]
          : gltf.animations.find((a) => a.name === clip);
      if (!anim)
        throw new Error(
          `Model ${src}: clip "${clip}" not found. Have: ${gltf.animations.map((a) => a.name).join(", ")}`,
        );
      mx = new AnimationMixer(obj);
      mx.clipAction(anim).play();
    }
    return { root: obj, mixer: mx };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltf, size, fit, clip]);

  useLayoutEffect(() => {
    onReady?.(root);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root]);

  useLayoutEffect(() => {
    mixer?.setTime(clipOffset + (frame / fps) * clipSpeed);
  }, [mixer, frame, fps, clipSpeed, clipOffset]);

  return (
    <group position={position} rotation={rotation}>
      <primitive object={root} />
    </group>
  );
};
