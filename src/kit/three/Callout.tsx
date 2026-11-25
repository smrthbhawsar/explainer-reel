import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { CameraSpec, Pose, projectToScreen, Vec3 } from "./cameraTrack";

export type CalloutSpec = {
  /** Frame range the label is on screen. */
  from: number;
  to: number;
  label: string;
  /** World anchor; a function lets the label follow a moving object. */
  point: Vec3 | ((frame: number) => Vec3);
  /** Label offset from the anchor in pixels (leader/thin styles). */
  dx: number;
  dy: number;
  /** Bracket style only: bracket box size in px around the anchor (default 150x260). */
  box?: [number, number];
  /** Overrides the accent colour for this one label (e.g. red for a "bad" tag). */
  color?: string;
};

export type CalloutStyle = "leader" | "thin" | "bracket";

const SANS = "Inter, 'Segoe UI', system-ui, sans-serif";
const MONO = "'JetBrains Mono', Consolas, 'Courier New', monospace";

/**
 * Labels pinned to 3D points, drawn as a 2D overlay outside the canvas (crisp text, no
 * font loading in WebGL). Uses the same pose function as the camera, so they stay glued.
 *
 *   leader  — bold label on a light plate + underline + leader line (clay)
 *   thin    — small light text, hairline leader, ring dot (neon, studio)
 *   bracket — HUD corner brackets around the anchor + filled tag (tactical)
 */
export const Callouts: React.FC<{
  items: CalloutSpec[];
  poseAt: (frame: number) => Pose;
  spec: CameraSpec;
  variant?: CalloutStyle;
  /** Line/text colour (leader, thin) or tag fill (bracket). */
  color?: string;
  /** Plate behind label text (leader). */
  plate?: string;
}> = ({
  items,
  poseAt,
  spec,
  variant = "leader",
  color = "#1F2125",
  plate = "#F4F1EA",
}) => {
  const frame = useCurrentFrame();
  const pose = poseAt(frame);
  return (
    <svg
      width={spec.width}
      height={spec.height}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "visible",
        pointerEvents: "none",
      }}
    >
      {items.map((c, i) => {
        if (frame < c.from || frame > c.to) return null;
        const p = projectToScreen(
          pose,
          typeof c.point === "function" ? c.point(frame) : c.point,
          spec,
        );
        if (!p.visible) return null;
        const appear = interpolate(frame, [c.from, c.from + 14], [0, 1], {
          extrapolateRight: "clamp",
        });
        const fade = interpolate(frame, [c.to - 10, c.to], [1, 0], {
          extrapolateLeft: "clamp",
        });
        const t = interpolate(frame, [c.from, c.from + 12], [0, 1], {
          extrapolateRight: "clamp",
        });
        const col = c.color ?? color;
        const opacity = Math.min(appear, fade);

        if (variant === "bracket") {
          const [bw, bh] = c.box ?? [150, 260];
          // Brackets start wide and snap in.
          const grow = 1 + (1 - t) * 0.35;
          const hw = (bw / 2) * grow;
          const hh = (bh / 2) * grow;
          const arm = 26;
          const corners: [number, number, number, number][] = [
            [-1, -1, 1, 1],
            [1, -1, -1, 1],
            [-1, 1, 1, -1],
            [1, 1, -1, -1],
          ];
          const tag = `◆ ${c.label.toUpperCase()}`;
          const tw = tag.length * 15.5 + 20;
          return (
            <g key={i} opacity={opacity}>
              {corners.map(([sx, sy, ax, ay], k) => {
                const x = p.x + sx * hw;
                const y = p.y + sy * hh;
                return (
                  <path
                    key={k}
                    d={`M ${x + ax * arm} ${y} L ${x} ${y} L ${x} ${y + ay * arm}`}
                    fill="none"
                    stroke={col}
                    strokeWidth={4}
                  />
                );
              })}
              <rect
                x={p.x - hw}
                y={p.y - hh - 50}
                width={tw}
                height={38}
                fill={col}
              />
              <text
                x={p.x - hw + 10}
                y={p.y - hh - 23}
                fontFamily={MONO}
                fontWeight={700}
                fontSize={24}
                fill="#141518"
              >
                {tag}
              </text>
            </g>
          );
        }

        const lx = p.x + c.dx;
        const ly = p.y + c.dy;
        const left = c.dx < 0;

        if (variant === "thin") {
          return (
            <g
              key={i}
              opacity={opacity}
              style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.8))" }}
            >
              <line
                x1={p.x}
                y1={p.y}
                x2={p.x + c.dx * t}
                y2={p.y + c.dy * t}
                stroke={col}
                strokeWidth={1.8}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={8}
                fill="none"
                stroke={col}
                strokeWidth={2}
              />
              <circle cx={p.x} cy={p.y} r={2.5} fill={col} />
              <text
                x={left ? lx - 6 : lx + 6}
                y={ly + 9}
                textAnchor={left ? "end" : "start"}
                fontFamily={SANS}
                fontWeight={500}
                fontSize={28}
                fill={col}
                opacity={t}
              >
                {c.label}
              </text>
            </g>
          );
        }

        // leader
        const textW = c.label.length * 20.5 + 10;
        const ux1 = left ? lx - textW : lx;
        const ux2 = left ? lx : lx + textW;
        return (
          <g key={i} opacity={opacity}>
            <line
              x1={p.x}
              y1={p.y}
              x2={p.x + c.dx * t}
              y2={p.y + c.dy * t}
              stroke={col}
              strokeWidth={2.5}
            />
            <line
              x1={ux1}
              y1={ly}
              x2={ux1 + (ux2 - ux1) * t}
              y2={ly}
              stroke={col}
              strokeWidth={2.5}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={9}
              fill="#FFFFFF"
              stroke={col}
              strokeWidth={3}
            />
            {/* light plate so the label reads over dark objects */}
            <rect
              x={ux1 - 6}
              y={ly - 54}
              width={textW + 12}
              height={50}
              rx={6}
              fill={plate}
              opacity={0.88}
            />
            <text
              x={left ? lx - 4 : lx + 4}
              y={ly - 14}
              textAnchor={left ? "end" : "start"}
              fontFamily={SANS}
              fontWeight={700}
              fontSize={38}
              fill={col}
            >
              {c.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
