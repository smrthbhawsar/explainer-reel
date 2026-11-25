# 3D looks — reference and choosing guide

All four are defined in `src/kit/three/looks.tsx` (`LOOKS`). Render a sample with
`npx remotion still LookTest-<look> out/stills/looktest-<look>.png --frame=60`.

| Look | Reference video | World | Captions | Callouts | Header |
|---|---|---|---|---|---|
| `clay` | "What if you didn't need a PS5…" (AI decompiling) | Light beige floor + grid, soft shadows, dark slate objects, one accent per stage (orange → blue → green) | `pill` — dark rounded box, spoken words white, upcoming grey | `leader` — bold label on light plate, underline, leader line | `stages` — rail with stage names (e.g. Compiled → Rebuilt → Verified) + `@60secstack` watermark (top-right, above the rail) |
| `neon` | "Hackers stole 10GB… through a FISH TANK" | Navy/black, fog, glowing cyan & orange light, light trails, bloom | `reveal` — white, upcoming dimmed, active word pops (**never underlined**) | `thin` — small white text, hairline, ring dot | `scene` — "— CASINO FLOOR" location name + `@60secstack` watermark (top-right) |
| `studio` | "Porsche has an EV with a 2-speed transmission" | Black studio, ceiling strip lights, glossy metal/clearcoat, orange then blue parts, cutaways | `reveal` | `thin` (use sparingly) | `bar` — slim progress pill + section name + `@60secstack` watermark (top-right) |
| `tactical` | "Call of Duty can show cheaters enemies that don't exist" | Foggy grey street, desaturated, characters, yellow/lime HUD | `boxed` — uppercase in dark HUD box | `bracket` — corner brackets + filled tag (◆ DECOY) | `tag` — "◇◆ FLAGGED VIEW" box + `@60secstack` watermark (top-right) |

## Choosing

| Topic feels like… | Look |
|---|---|
| Software/process pipeline, compilers, AI agents, data transformation, "how X is built", step-by-step stages | **clay** |
| Hacking, networks, security breaches, data flowing through infrastructure, mysteries, "inside the machine" | **neon** |
| Hardware/mechanical/product engineering: cars, EVs, motors, chips up close, cameras, phones, batteries, "how this part works" | **studio** |
| Games, anti-cheat, military/defence tech, surveillance, detection systems, "two views of the same scene" | **tactical** |

When torn, prefer `clay` (cheapest to build, no models needed, always readable).

## Visual grammar per look (what makes each one read right)

**clay** — Isometric-ish high camera, objects are simple chunky blocks on a track/conveyor;
canvas-texture text (hex bytes, code sheets) is a big part of the visuals; accent colour marks
"the thing being talked about"; a robot arm/scanner/gate is a good "agent/process" metaphor;
show transformation as objects passing through gates and changing colour.

**neon** — Low light, fog does the depth; glowing emissive edges (`emissive` + `toneMapped={false}`
for strong glow) and light pulses travelling along tube/cable paths (animate a small emissive
sphere or a dashed emissive segment along a `CatmullRomCurve3`); rings/halos on the floor
around important objects; move the camera *through* things (into a cable, under the floor).

**studio** — Hero object centred, slowly rotating or the camera orbiting; exploded views
(parts slide apart along an axis, then reassemble); cutaways (hide half the housing); colour
switch to show a state change (orange gear set → blue gear set when it "shifts"); gears must mesh:
`rotation = frame * k / teeth`.

**tactical** — Ground-level camera behind a figure, then high overhead "analysis" views;
characters from models (Khronos `CesiumMan`/`Fox`, Quaternius/Mixamo soldiers); skeleton/wireframe
overlays (thin lime lines between joint positions) to show "what the cheat sees"; split-screen
"NORMAL VIEW / FLAGGED VIEW" by rendering two `ThreeCanvas`es side by side or masking halves;
yellow bracket tags appear on targets.
