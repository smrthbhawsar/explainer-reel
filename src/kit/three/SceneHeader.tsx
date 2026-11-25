import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Watermark } from "../Watermark";

/** A named location/section that starts at `from` (e.g. "CASINO FLOOR", "FLAGGED VIEW"). */
export type HeaderSection = { from: number; label: string };

const SANS = "Inter, 'Segoe UI', system-ui, sans-serif";
const MONO = "'JetBrains Mono', Consolas, 'Courier New', monospace";

const current = (sections: HeaderSection[], frame: number) => {
  let i = 0;
  while (i + 1 < sections.length && sections[i + 1].from <= frame) i++;
  return i;
};

/**
 * Top header for the non-clay looks (clay uses <StageTracker/>).
 *
 *   scene — "— CASINO FLOOR" letter-spaced at top-left, cross-fades per section (neon)
 *   tag   — "◆◆ FLAGGED VIEW" boxed HUD tag at top-left (tactical)
 *   bar   — slim progress pill at top-left that fills over the whole reel (studio)
 *
 * Top-right is always the @60secstack watermark (no disclaimer text).
 */
export const SceneHeader: React.FC<{
  variant: "scene" | "tag" | "bar";
  sections: HeaderSection[];
  duration: number;
  ink: string;
  accent: string;
  /** Optional series line shown above the left label, e.g. "CRICKET TECH · EP 2". */
  series?: string;
}> = ({ variant, sections, duration, ink, accent, series }) => {
  const frame = useCurrentFrame();
  const i = current(sections, frame);
  const s = sections[i];
  const fadeIn = interpolate(frame, [s.from, s.from + 12], [0, 1], {
    extrapolateRight: "clamp",
  });
  const top = 150;

  let left: React.ReactNode = null;
  if (variant === "scene") {
    left = (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          opacity: fadeIn,
        }}
      >
        <div style={{ width: 34, height: 2, background: ink, opacity: 0.8 }} />
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: 28,
            letterSpacing: "0.32em",
            color: ink,
          }}
        >
          {s.label.toUpperCase()}
        </div>
      </div>
    );
  } else if (variant === "tag") {
    left = (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 16px",
          background: "rgba(20,21,24,0.85)",
          opacity: fadeIn,
        }}
      >
        <span style={{ color: ink, fontSize: 22 }}>◇</span>
        <span style={{ color: accent, fontSize: 22 }}>◆</span>
        <span
          style={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: "0.12em",
            color: ink,
          }}
        >
          {s.label.toUpperCase()}
        </span>
      </div>
    );
  } else {
    const p = interpolate(frame, [0, duration], [0, 1], {
      extrapolateRight: "clamp",
    });
    left = (
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 220,
            height: 12,
            borderRadius: 6,
            background: "rgba(255,255,255,0.14)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.max(0.08, p) * 100}%`,
              height: "100%",
              background: accent,
              borderRadius: 6,
            }}
          />
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 20,
            color: ink,
            opacity: 0.7 * fadeIn,
            letterSpacing: "0.08em",
          }}
        >
          {s.label}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 70,
        right: 70,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      {series ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
          <div
            style={{
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 20,
              letterSpacing: "0.18em",
              color: accent,
              padding: "4px 10px",
              background: "rgba(20,21,24,0.85)",
            }}
          >
            {series.toUpperCase()}
          </div>
          {left}
        </div>
      ) : (
        left
      )}
      <Watermark />
    </div>
  );
};
