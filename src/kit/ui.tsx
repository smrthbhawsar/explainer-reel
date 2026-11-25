import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Watermark } from "./Watermark";

/* ───────────── design tokens ───────────── */
export const C = {
  bg: "#0B0F19",
  card: "#131B2E",
  border: "#24324D",
  cyan: "#38BDF8",
  purple: "#A78BFA",
  green: "#10B981",
  red: "#EF4444",
  text: "#E6EDF7",
  mute: "#8CA0BF",
};
export const SANS = "Inter, 'Segoe UI', system-ui, sans-serif";
export const MONO = "'JetBrains Mono', Consolas, 'Courier New', monospace";

/* ───────────── helpers ───────────── */
export const useSpr = (
  at: number,
  config?: Partial<{ damping: number; stiffness: number; mass: number }>,
) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - at,
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.8, ...config },
  });
};
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const prog = (
  frame: number,
  at: number,
  dur: number,
  ease: (t: number) => number = Easing.out(Easing.cubic),
) =>
  interpolate(frame, [at, at + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

export const cardStyle: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 20,
  boxSizing: "border-box",
};

export const Abs: React.FC<{
  x: number;
  y: number;
  w?: number;
  h?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ x, y, w, h, style, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      ...style,
    }}
  >
    {children}
  </div>
);

/* ───────────── background + header ───────────── */
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const off = (frame * 0.35) % 48;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.bg,
        backgroundImage:
          "radial-gradient(rgba(56,189,248,0.22) 1.6px, transparent 1.7px)",
        backgroundSize: "48px 48px",
        backgroundPosition: `${off}px ${off}px`,
      }}
    >
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 35%, rgba(11,15,25,0) 0%, rgba(11,15,25,0.85) 85%)",
        }}
      />
    </AbsoluteFill>
  );
};

/** Fixed top bar: badge, @60secstack watermark (top-right), segmented progress bar. `bounds` = scene start frames + final frame. */
export const Header: React.FC<{ bounds: number[]; label?: string }> = ({
  bounds,
  label = "AI ARCHITECTURE",
}) => {
  const frame = useCurrentFrame();
  const n = bounds.length - 1;
  const enter = useSpr(0);
  return (
    <div
      style={{
        position: "absolute",
        left: 100,
        top: 64,
        width: 880,
        opacity: enter,
        // Snap to whole pixels once settled so the watermark isn't resampled (blurred).
        transform: enter > 0.995 ? undefined : `translateY(${Math.round((1 - enter) * -30)}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: 4,
            color: C.cyan,
            border: `1px solid ${C.cyan}55`,
            background: `${C.cyan}12`,
            padding: "8px 18px",
            borderRadius: 999,
            boxShadow: `0 0 18px ${C.cyan}33`,
          }}
        >
          {label}
        </div>
        <Watermark />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
        {bounds.slice(0, n).map((b, i) => {
          const p = clamp((frame - b) / (bounds[i + 1] - b));
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                background: C.border,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${p * 100}%`,
                  height: "100%",
                  background: C.cyan,
                  borderRadius: 4,
                  boxShadow: `0 0 14px ${C.cyan}, 0 0 28px ${C.cyan}88`,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ───────────── scene wrapper ───────────── */
/** Renders children only in [from, to) with a short cross-fade. `first`/`last` skip the fade at video edges. */
export const Scene: React.FC<{
  from: number;
  to: number;
  first?: boolean;
  last?: boolean;
  children: React.ReactNode;
}> = ({ from, to, first, last, children }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame >= to) return null;
  const opacity = interpolate(
    frame,
    [from, from + 5, to - 6, to],
    [first ? 1 : 0, 1, 1, last ? 1 : 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

/* ───────────── shared pieces ───────────── */
export const Tag: React.FC<{
  text: string;
  at: number;
  color?: string;
  y?: number;
}> = ({ text, at, color = C.cyan, y = 205 }) => {
  const s = useSpr(at);
  return (
    <Abs
      x={100}
      y={y}
      w={880}
      style={{
        display: "flex",
        justifyContent: "center",
        opacity: s,
        transform: `translateY(${(1 - s) * -20}px) scale(${0.9 + 0.1 * s})`,
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontWeight: 800,
          fontSize: 30,
          letterSpacing: 3,
          color,
          border: `1px solid ${color}77`,
          background: `${color}14`,
          padding: "10px 28px",
          borderRadius: 14,
          boxShadow: `0 0 24px ${color}33`,
        }}
      >
        {text}
      </div>
    </Abs>
  );
};

export const ChipGlyph: React.FC<{
  size: number;
  color?: string;
  glow?: number;
}> = ({ size, color = C.cyan, glow = 1 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 200 200"
    style={{ filter: `drop-shadow(0 0 ${18 * glow}px ${color})` }}
  >
    {[50, 85, 120, 155].map((p) => (
      <React.Fragment key={p}>
        <line
          x1={p}
          y1={14}
          x2={p}
          y2={42}
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <line
          x1={p}
          y1={158}
          x2={p}
          y2={186}
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <line
          x1={14}
          y1={p}
          x2={42}
          y2={p}
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <line
          x1={158}
          y1={p}
          x2={186}
          y2={p}
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
        />
      </React.Fragment>
    ))}
    <rect
      x={42}
      y={42}
      width={116}
      height={116}
      rx={22}
      fill="#0B1424"
      stroke={color}
      strokeWidth={5}
    />
    <g stroke={color} strokeWidth={2.5} opacity={0.8}>
      <line x1={72} y1={74} x2={100} y2={64} />
      <line x1={72} y1={74} x2={100} y2={100} />
      <line x1={72} y1={118} x2={100} y2={100} />
      <line x1={72} y1={118} x2={100} y2={136} />
      <line x1={100} y1={64} x2={128} y2={84} />
      <line x1={100} y1={100} x2={128} y2={84} />
      <line x1={100} y1={100} x2={128} y2={120} />
      <line x1={100} y1={136} x2={128} y2={120} />
    </g>
    {[
      [72, 74],
      [72, 118],
      [100, 64],
      [100, 100],
      [100, 136],
      [128, 84],
      [128, 120],
    ].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r={6.5} fill={color} />
    ))}
  </svg>
);

export const Padlock: React.FC<{
  size: number;
  open: number;
  color: string;
}> = ({ size, open, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    style={{ overflow: "visible", filter: `drop-shadow(0 0 12px ${color})` }}
  >
    <g
      transform={`translate(${open * 6} ${-open * 16}) rotate(${-open * 28} 30 46)`}
    >
      <path
        d="M30 46 V32 a20 20 0 0 1 40 0 V46"
        fill="none"
        stroke={color}
        strokeWidth={9}
        strokeLinecap="round"
      />
    </g>
    <rect
      x={18}
      y={44}
      width={64}
      height={46}
      rx={10}
      fill="#0d1a17"
      stroke={color}
      strokeWidth={6}
    />
    <circle cx={50} cy={64} r={6} fill={color} />
    <rect x={47.5} y={66} width={5} height={12} rx={2.5} fill={color} />
  </svg>
);

export const Cylinder: React.FC<{
  w: number;
  h: number;
  color?: string;
  glow?: number;
}> = ({ w, h, color = C.cyan, glow = 0.6 }) => {
  const ry = Math.min(36, h * 0.14);
  return (
    <svg
      width={w}
      height={h}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        filter: `drop-shadow(0 0 ${22 * glow}px ${color}88)`,
      }}
    >
      <path
        d={`M2 ${ry} V${h - ry} A${w / 2 - 2} ${ry} 0 0 0 ${w - 2} ${h - ry} V${ry}`}
        fill={C.card}
        stroke={color}
        strokeWidth={2}
      />
      <ellipse
        cx={w / 2}
        cy={ry}
        rx={w / 2 - 2}
        ry={ry - 1}
        fill="#182540"
        stroke={color}
        strokeWidth={2}
      />
      <path
        d={`M2 ${h * 0.5} A${w / 2 - 2} ${ry} 0 0 0 ${w - 2} ${h * 0.5}`}
        fill="none"
        stroke={`${color}44`}
        strokeWidth={1.5}
      />
    </svg>
  );
};
