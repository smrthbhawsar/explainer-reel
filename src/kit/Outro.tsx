import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background, C, SANS } from "./ui";

/**
 * Brand outro / end card (≈5.2 s), played right after a reel's voiceover.
 * Audio: public/brand/outro.mp3 ("Har tech, sirf sixty seconds mein. Follow karo Sixty Sec Stack.")
 * No captions: the card itself carries the message.
 *
 * Beats are locked to the outro audio's measured phrase starts:
 *   f0   "Har tech,"                 → stack layers drop in, wordmark reveals
 *   f27  "sirf sixty seconds mein."   → tagline
 *   f82  "Follow karo Sixty Sec Stack." → profile card + Follow button pop in
 *   f112 → button is "tapped" and flips to Following ✓
 */
export const OUTRO_DURATION = 156; // 4.68 s audio + ~0.5 s hold

const P2 = 27;
const P3 = 82;
const TAP = 112;

const WORD_FONT = "Bahnschrift, 'DIN Alternate', 'Segoe UI', system-ui, sans-serif";
const CYAN = "#38BDF8";
const TEAL = "#22D3EE";
const EMERALD = "#10B981";

/** spring 0→1 starting at `at`; snaps to exactly 1 once settled (no lingering subpixel transforms). */
const useS = (at: number, config: Partial<{ damping: number; stiffness: number; mass: number }> = {}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 140, ...config } });
  return Math.abs(v - 1) < 0.002 && frame - at > 10 ? 1 : v;
};

/* ───────────── animated stack logo (vector, same geometry as the watermark) ───────────── */
const Layer: React.FC<{ dy: number; at: number }> = ({ dy, at }) => {
  const s = useS(at, { damping: 11, stiffness: 160 });
  const drop = (1 - s) * -70; // falls in from above, small overshoot from the spring
  return (
    <g transform={`translate(0 ${dy + drop})`} opacity={Math.min(1, s * 1.6)}>
      <path
        d="M18 72L60 92L102 72V84L60 104L18 84V72Z"
        fill="url(#o-band)"
        stroke="url(#o-edge)"
        strokeWidth={3.2}
        strokeLinejoin="round"
      />
      <path
        d="M60 52L102 72L60 92L18 72L60 52Z"
        fill="#0B0F19"
        stroke="url(#o-edge)"
        strokeWidth={3.2}
        strokeLinejoin="round"
      />
    </g>
  );
};

const AnimatedStack: React.FC<{ size: number }> = ({ size }) => {
  const frame = useCurrentFrame();
  const settled = useS(14);
  const float = settled === 1 ? Math.sin((frame - 14) / 16) * 4 : 0;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      shapeRendering="geometricPrecision"
      style={{ display: "block", overflow: "visible", transform: `translateY(${Math.round(float)}px)` }}
    >
      <defs>
        <linearGradient id="o-edge" x1="16" y1="16" x2="104" y2="104" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={CYAN} />
          <stop offset="55%" stopColor={TEAL} />
          <stop offset="100%" stopColor={EMERALD} />
        </linearGradient>
        <linearGradient id="o-band" x1="16" y1="40" x2="104" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="50%" stopColor="#0D9488" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      {/* bottom layer lands first */}
      <Layer dy={0} at={0} />
      <Layer dy={-20} at={4} />
      <Layer dy={-40} at={8} />
    </svg>
  );
};

/* ───────────── wordmark: letters rise in one by one ───────────── */
const Wordmark: React.FC<{ text: string; at: number }> = ({ text, at }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      {text.split("").map((ch, i) => {
        const t = interpolate(frame, [at + i * 1.5, at + i * 1.5 + 8], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <span
            key={i}
            style={{
              fontFamily: WORD_FONT,
              fontWeight: 700,
              fontSize: 118,
              lineHeight: "130px",
              letterSpacing: 2,
              color: "#FFFFFF",
              opacity: t,
              transform: t === 1 ? undefined : `translateY(${Math.round((1 - t) * 28)}px)`,
              display: "inline-block",
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

/* ───────────── profile card with Follow button ───────────── */
const FollowCard: React.FC = () => {
  const frame = useCurrentFrame();
  const pop = useS(P3, { damping: 10, stiffness: 170 });
  const tapped = frame >= TAP;
  // press: quick squash on the tap, then release
  const press = interpolate(frame, [TAP - 3, TAP, TAP + 5], [1, 0.92, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ripple = interpolate(frame, [TAP, TAP + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // attention pulse on the button between pop-in and tap
  const pulse = frame > P3 + 10 && frame < TAP - 3 ? 1 + Math.sin((frame - P3 - 10) / 3.2) * 0.025 : 1;
  const btnScale = press * pulse;

  return (
    <div
      style={{
        width: 820,
        boxSizing: "border-box",
        padding: "30px 34px",
        borderRadius: 32,
        background: "rgba(19, 27, 46, 0.92)",
        border: `1px solid ${C.border}`,
        boxShadow: "0 30px 80px rgba(0,0,0,0.45), 0 0 60px rgba(56,189,248,0.10)",
        display: "flex",
        alignItems: "center",
        gap: 26,
        opacity: Math.min(1, pop * 1.5),
        transform: pop === 1 ? undefined : `translateY(${(1 - pop) * 60}px) scale(${0.7 + 0.3 * pop})`,
      }}
    >
      {/* avatar with gradient ring, like a story ring */}
      <div
        style={{
          width: 128,
          height: 128,
          borderRadius: 64,
          padding: 5,
          boxSizing: "border-box",
          background: `conic-gradient(${CYAN}, ${TEAL}, ${EMERALD}, ${CYAN})`,
          flexShrink: 0,
        }}
      >
        <Img
          src={staticFile("brand/profile.png")}
          style={{ width: 118, height: 118, borderRadius: 59, border: "4px solid #131B2E", boxSizing: "border-box", display: "block" }}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: "#FFFFFF", lineHeight: "52px" }}>
          @60secstack
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 28, color: C.mute, marginTop: 6 }}>
          Tech, explained in 60s
        </div>
      </div>

      <div style={{ position: "relative", flexShrink: 0 }}>
        {/* tap ripple */}
        {ripple > 0 && ripple < 1 ? (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 260,
              height: 260,
              marginLeft: -130,
              marginTop: -130,
              borderRadius: 130,
              border: `4px solid ${tapped ? EMERALD : CYAN}`,
              opacity: 1 - ripple,
              transform: `scale(${0.3 + ripple})`,
            }}
          />
        ) : null}
        <div
          style={{
            width: 256,
            height: 80,
            borderRadius: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 32,
            color: tapped ? "#FFFFFF" : "#04121F",
            background: tapped ? "rgba(16,185,129,0.16)" : `linear-gradient(90deg, ${CYAN}, ${TEAL} 55%, ${EMERALD})`,
            border: tapped ? `2px solid ${EMERALD}` : "2px solid transparent",
            boxSizing: "border-box",
            boxShadow: tapped ? "none" : "0 0 30px rgba(34,211,238,0.45)",
            transform: btnScale === 1 ? undefined : `scale(${btnScale})`,
          }}
        >
          {tapped ? (
            <>
              <svg width="30" height="30" viewBox="0 0 24 24" style={{ display: "block" }}>
                <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={EMERALD} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Following
            </>
          ) : (
            "Follow"
          )}
        </div>
      </div>
    </div>
  );
};

/* ───────────── the card ───────────── */
export const Outro: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  const frame = useCurrentFrame();
  const glow = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: "clamp" });
  const tag = useS(P2, { damping: 16 });
  const fadeOut = interpolate(frame, [OUTRO_DURATION - 8, OUTRO_DURATION], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {withAudio ? <Audio src={staticFile("brand/outro.mp3")} /> : null}
      <Background />
      {/* soft brand glow behind the logo */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 33%, rgba(34,211,238,${0.22 * glow}) 0%, rgba(16,185,129,${0.08 * glow}) 28%, rgba(11,15,25,0) 55%)`,
        }}
      />

      <div style={{ position: "absolute", top: 430, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <AnimatedStack size={360} />
      </div>

      <div style={{ position: "absolute", top: 860, left: 0, right: 0 }}>
        <Wordmark text="60SecStack" at={10} />
      </div>

      <div
        style={{
          position: "absolute",
          top: 1020,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: 46,
          color: C.text,
          opacity: tag,
          transform: tag === 1 ? undefined : `translateY(${Math.round((1 - tag) * 24)}px)`,
        }}
      >
        Har tech, sirf <span style={{ color: CYAN, fontWeight: 800 }}>60 seconds</span> mein.
      </div>

      <div style={{ position: "absolute", top: 1190, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <FollowCard />
      </div>
    </AbsoluteFill>
  );
};

/** Standalone preview composition (register with durationInFrames={OUTRO_DURATION}). */
export const OutroPreview: React.FC = () => <Outro />;
