import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Background, C, MONO, SANS } from "./ui";
import { Watermark } from "./Watermark";

/**
 * Instagram reel cover (1080x1920) + grid crop (1080x1440) + profile grid preview.
 * Topic-neutral: per-reel content lives in src/reels/covers.json (rendered by scripts/publish-kit.cjs).
 *
 * Layout keeps everything inside the 3:4 grid crop (y 240–1680), so the cover reads both
 * full-screen and as a profile-grid tile:
 *   y 300  series pill · y 390 title (2 lines) · y 660 sub · y 760–1520 visual · y 1572 @60secstack
 */
export type CoverSpec = {
  reelId: string;
  frame: number;
  series: string;
  title: string[];
  sub: string;
  accent: string;
  crop: { y: number; h: number; scale: number };
  titleSize?: number;
};

export const GRID_TOP = 240; // 1920 → 1440 centre crop
const VIS_TOP = 760;
const VIS_H = 760;

/** "phir bhi {PENDING}?" → spans with the braced word in the accent colour */
const Line: React.FC<{ text: string; accent: string }> = ({ text, accent }) => (
  <div>
    {text.split(/(\{[^}]+\})/).map((part, i) =>
      part.startsWith("{") ? (
        <span key={i} style={{ color: accent, textShadow: `0 0 34px ${accent}66` }}>
          {part.slice(1, -1)}
        </span>
      ) : (
        <span key={i}>{part}</span>
      ),
    )}
  </div>
);

export const ReelCover: React.FC<{ slug: string; spec: CoverSpec }> = ({ slug, spec }) => {
  const { crop, accent } = spec;
  const imgW = 1080 * crop.scale;
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, overflow: "hidden" }}>
      <Background />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${accent}2E 0%, rgba(11,15,25,0) 55%)`,
        }}
      />

      {/* series pill */}
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: 5,
            color: accent,
            border: `2px solid ${accent}88`,
            background: `${accent}18`,
            padding: "10px 26px",
            borderRadius: 999,
          }}
        >
          {spec.series}
        </div>
      </div>

      {/* title */}
      <div
        style={{
          position: "absolute",
          top: 392,
          left: 60,
          right: 60,
          textAlign: "center",
          fontFamily: SANS,
          fontWeight: 900,
          // shrink if the longest line wouldn't fit 960px (Inter Black ≈ 0.56em per char); never wrap
          fontSize: Math.min(
            spec.titleSize ?? 92,
            Math.floor(960 / (0.56 * Math.max(...spec.title.map((t) => t.replace(/[{}]/g, "").length)))),
          ),
          whiteSpace: "nowrap",
          lineHeight: 1.18,
          letterSpacing: -1,
          color: "#FFFFFF",
          textShadow: "0 6px 24px rgba(0,0,0,0.6)",
        }}
      >
        {spec.title.map((t, i) => (
          <Line key={i} text={t} accent={accent} />
        ))}
      </div>

      {/* keyword line */}
      <div
        style={{
          position: "absolute",
          top: 660,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: MONO,
          fontWeight: 600,
          fontSize: 32,
          color: C.mute,
          letterSpacing: 1,
        }}
      >
        {spec.sub}
      </div>

      {/* visual window: a frame of the reel itself, edges faded into the background */}
      <div
        style={{
          position: "absolute",
          top: VIS_TOP,
          left: 0,
          width: 1080,
          height: VIS_H,
          overflow: "hidden",
          WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 14%, #000 82%, transparent 100%)",
          maskImage: "linear-gradient(180deg, transparent 0%, #000 14%, #000 82%, transparent 100%)",
        }}
      >
        <Img
          src={staticFile(`${slug}/cover-bg.png`)}
          style={{
            position: "absolute",
            width: imgW,
            height: 1920 * crop.scale,
            left: Math.round((1080 - imgW) / 2),
            top: Math.round(-crop.y * crop.scale + (VIS_H - crop.h * crop.scale) / 2),
          }}
        />
      </div>

      {/* brand */}
      <div style={{ position: "absolute", top: 1572, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Watermark />
      </div>
    </AbsoluteFill>
  );
};

/** 1080x1440: exactly what the 3:4 profile grid shows of the cover. */
export const ReelCoverGrid: React.FC<{ slug: string; spec: CoverSpec }> = (p) => (
  <AbsoluteFill style={{ overflow: "hidden", backgroundColor: C.bg }}>
    <div style={{ position: "absolute", top: -GRID_TOP, left: 0, width: 1080, height: 1920 }}>
      <ReelCover {...p} />
    </div>
  </AbsoluteFill>
);

/** Profile grid mock-up: 3 columns, newest post first (reverse of posting order). 1080 wide. */
export const GridPreview: React.FC<{ items: { slug: string; spec: CoverSpec }[] }> = ({ items }) => {
  const newestFirst = [...items].reverse();
  const GAP = 4;
  const tileW = (1080 - GAP * 2) / 3;
  const tileH = (tileW * 4) / 3;
  const s = tileW / 1080;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {newestFirst.map((it, i) => (
        <div
          key={it.slug}
          style={{
            position: "absolute",
            left: (i % 3) * (tileW + GAP),
            top: Math.floor(i / 3) * (tileH + GAP),
            width: tileW,
            height: tileH,
            overflow: "hidden",
          }}
        >
          <div style={{ width: 1080, height: 1440, transform: `scale(${s})`, transformOrigin: "0 0" }}>
            <ReelCoverGrid {...it} />
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

export const gridPreviewHeight = (n: number) => {
  const tileW = (1080 - 8) / 3;
  const rows = Math.max(1, Math.ceil(n / 3));
  const h = Math.round(rows * ((tileW * 4) / 3) + (rows - 1) * 4);
  return h + (h % 2);
};
