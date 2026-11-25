import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { useCurrentFrame } from "remotion";
import { PerspectiveCamera } from "three";
import { Pose } from "./cameraTrack";

/** Drives the R3F camera from a pure `poseAt(frame)` (see makeCameraTrack). Place inside <ThreeCanvas>. */
export const CameraRig: React.FC<{
  poseAt: (frame: number) => Pose;
  fov: number;
}> = ({ poseAt, fov }) => {
  const frame = useCurrentFrame();
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  useLayoutEffect(() => {
    const { pos, target } = poseAt(frame);
    camera.fov = fov;
    camera.position.set(...pos);
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  }, [frame, camera, poseAt, fov]);
  return null;
};
