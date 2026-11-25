import React from "react";

// Local copy (not imported from ./ui) to avoid a circular import: ui.tsx renders <Watermark/>.
const SANS = "Inter, 'Segoe UI', system-ui, sans-serif";

/**
 * Channel watermark: the 60SecStack stack logo (inline vector, so it stays razor-sharp at any
 * size) + the @60secstack handle, on a dark translucent pill so it reads on light and dark looks.
 *
 * It lives in the top-right slot of every reel header, rendered by the headers themselves:
 *  - 2D `Header` (ui.tsx): right end of the badge row (where the NN/TT counter used to be).
 *  - 3D `SceneHeader`: right end of the header row (no disclaimer text).
 *  - Clay `StageTracker`: top-right, just under the stage rail.
 * Reels never place it themselves. Fixed integer size → no subpixel blur.
 */

const PILL_W = 296;
const PILL_H = 56;
const LOGO = 40;

export const StackLogo: React.FC<{ size?: number }> = ({ size = LOGO }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    shapeRendering="geometricPrecision"
    style={{ display: "block", flexShrink: 0 }}
  >
    <defs>
      <linearGradient id="wm-stackGrad" x1="16" y1="16" x2="104" y2="104" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="55%" stopColor="#22D3EE" />
        <stop offset="100%" stopColor="#10B981" />
      </linearGradient>
      <linearGradient id="wm-stackBandGrad" x1="16" y1="40" x2="104" y2="90" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0284C7" />
        <stop offset="50%" stopColor="#0D9488" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
    </defs>
    {[0, -20, -40].map((dy) => (
      // bottom layer first: side band, then top face
      <g key={dy} transform={`translate(0 ${dy})`}>
        <path
          d="M18 72L60 92L102 72V84L60 104L18 84V72Z"
          fill="url(#wm-stackBandGrad)"
          stroke="url(#wm-stackGrad)"
          strokeWidth={3.5}
          strokeLinejoin="round"
        />
        <path
          d="M60 52L102 72L60 92L18 72L60 52Z"
          fill="#0B0F19"
          stroke="url(#wm-stackGrad)"
          strokeWidth={3.5}
          strokeLinejoin="round"
        />
      </g>
    ))}
  </svg>
);

/** Inline badge (no positioning of its own): handle, then logo to its right, on a dark pill. */
export const Watermark: React.FC<{ handle?: string; style?: React.CSSProperties }> = ({
  handle = "@60secstack",
  style,
}) => (
  <div
    style={{
      width: PILL_W,
      height: PILL_H,
      flexShrink: 0,
      boxSizing: "border-box",
      borderRadius: PILL_H / 2,
      background: "rgba(11, 15, 25, 0.66)",
      border: "1px solid rgba(56, 189, 248, 0.32)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      pointerEvents: "none",
      ...style,
    }}
  >
    <span
      style={{
        fontFamily: SANS,
        fontWeight: 800,
        fontSize: 30,
        lineHeight: "30px",
        letterSpacing: 0.4,
        color: "#FFFFFF",
        textRendering: "geometricPrecision",
        WebkitFontSmoothing: "antialiased",
        textShadow: "0 1px 4px rgba(0,0,0,0.5)",
      }}
    >
      {handle}
    </span>
    <StackLogo />
  </div>
);
