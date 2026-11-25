import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Watermark } from "../Watermark";

export type Stage = { from: number; label: string; color: string };

/** Top progress rail: dots on a line, a sliding active marker and the active stage's name above it. */
export const StageTracker: React.FC<{
  stages: Stage[];
  ink?: string;
}> = ({ stages, ink = "#1F2125" }) => {
  const frame = useCurrentFrame();
  let i = 0;
  while (i + 1 < stages.length && stages[i + 1].from <= frame) i++;
  const left = 70;
  const width = 940;
  const step = width / (stages.length - 1);
  // Slide the marker between stages over 16 frames.
  const prevX = left + Math.max(0, i - 1) * step;
  const curX = left + i * step;
  const x =
    i === 0
      ? curX
      : interpolate(
          frame,
          [stages[i].from, stages[i].from + 16],
          [prevX, curX],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        );
  const color = stages[i].color;
  const labelIn = interpolate(
    frame,
    [stages[i].from, stages[i].from + 12],
    [0, 1],
    { extrapolateRight: "clamp" },
  );
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 1080,
        height: 300,
      }}
    >
      <svg width={1080} height={300} style={{ position: "absolute", inset: 0 }}>
        <line
          x1={left}
          y1={180}
          x2={left + width}
          y2={180}
          stroke={ink}
          strokeOpacity={0.35}
          strokeWidth={3}
        />
        {stages.map((_, k) => (
          <circle
            key={k}
            cx={left + k * step}
            cy={180}
            r={10}
            fill="#F4F1EA"
            stroke={ink}
            strokeOpacity={0.5}
            strokeWidth={3}
          />
        ))}
        <rect x={x - 22} y={169} width={44} height={22} rx={5} fill={color} />
        <text
          x={Math.min(Math.max(x, left + 60), left + width - 60)}
          y={150}
          textAnchor="middle"
          opacity={labelIn}
          fontFamily="Inter, 'Segoe UI', system-ui, sans-serif"
          fontWeight={700}
          fontSize={34}
          fill={ink}
        >
          {stages[i].label}
        </text>
      </svg>
      {/* @60secstack watermark, top-right above the rail */}
      <Watermark style={{ position: "absolute", top: 40, right: 70 }} />
    </div>
  );
};
