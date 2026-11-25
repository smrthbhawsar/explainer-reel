#!/usr/bin/env node
/**
 * Framing check without rendering: projects world points through a camera shot and
 * reports where they land on the 1080x1920 frame, flagging anything outside the safe
 * zone or behind the caption band.
 *
 *   npm run frame-check -- <shots.json>
 *
 * shots.json: { "fov": 42, "shots": [ { "name": "A", "pos": [x,y,z], "target": [x,y,z],
 *               "points": { "chip": [x,y,z], "gateTop": [x,y,z] } }, ... ] }
 * Check both the start pose and the drifted end pose (pos + drift) of each shot.
 */
import fs from "fs";
import { PerspectiveCamera, Vector3 } from "three";

const W = 1080;
const H = 1920;
const SAFE = { x0: 90, x1: 990, y0: 280, y1: 1240 }; // below y1 = caption band (y≈1250–1420)

const file = process.argv[2];
if (!file) {
  console.error("usage: npm run frame-check -- <shots.json>");
  process.exit(1);
}
const { fov, shots } = JSON.parse(fs.readFileSync(file, "utf8"));
let bad = 0;
for (const s of shots) {
  const cam = new PerspectiveCamera(fov, W / H, 0.1, 500);
  cam.position.set(...s.pos);
  cam.lookAt(...s.target);
  cam.updateMatrixWorld();
  console.log(`\n${s.name}  pos=${JSON.stringify(s.pos)} target=${JSON.stringify(s.target)}`);
  for (const [name, p] of Object.entries(s.points)) {
    const v = new Vector3(...p).project(cam);
    const x = Math.round(((v.x + 1) / 2) * W);
    const y = Math.round(((1 - v.y) / 2) * H);
    const where =
      v.z > 1 ? "BEHIND CAMERA" :
      x < 0 || x > W || y < 0 || y > H ? "OFF FRAME" :
      y > SAFE.y1 && y < 1430 ? "UNDER CAPTIONS" :
      x < SAFE.x0 || x > SAFE.x1 || y < SAFE.y0 || y > SAFE.y1 ? "outside safe zone" : "ok";
    if (where !== "ok") bad++;
    console.log(`  ${name.padEnd(18)} (${String(x).padStart(5)}, ${String(y).padStart(5)})  ${where}`);
  }
}
console.log(bad ? `\n${bad} point(s) need attention.` : "\nAll points inside the safe zone.");
