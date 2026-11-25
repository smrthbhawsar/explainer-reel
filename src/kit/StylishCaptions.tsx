import React, { useEffect, useMemo, useState } from "react";
import {
  cancelRender,
  continueRender,
  delayRender,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Caption } from "@remotion/captions";

const CYAN = "#38BDF8";

// Paging: up to two lines, broken at natural pauses / clause ends so a page never
// straddles a breath in the voiceover.
const MAX_CHARS = 36; // ~2 lines at 64px inside 860px
const PAUSE_BREAK_MS = 220; // silence before a word that forces a new page
const LINGER_MS = 300; // how long a page stays after its last word if nothing follows

type Word = { word: string; fromMs: number; toMs: number; isKeyword: boolean };
type Page = { startMs: number; endMs: number; words: Word[] };

// No punctuation except "?" (hyphens inside words are kept, e.g. closed-book).
const clean = (w: string) =>
  w
    .replace(/[—–]/g, "")
    .replace(/[^\p{L}\p{N}?-]/gu, "")
    .replace(/^-+|-+$/g, "");

const markKeywords = (words: Word[], keywords: string[]) => {
  const lower = words.map((w) => w.word.toLowerCase().replace(/\?$/, ""));
  for (const kw of keywords.map((k) => k.toLowerCase().split(" "))) {
    for (let i = 0; i + kw.length <= lower.length; i++) {
      if (kw.every((part, j) => lower[i + j] === part)) {
        for (let j = 0; j < kw.length; j++) words[i + j].isKeyword = true;
      }
    }
  }
};

const buildPages = (captions: Caption[], keywords: string[]): Page[] => {
  const pages: Page[] = [];
  let cur: Word[] = [];
  let curChars = 0;
  let prevRaw = "";
  let prevEnd = 0;
  const flush = () => {
    if (cur.length)
      pages.push({
        startMs: cur[0].fromMs,
        endMs: cur[cur.length - 1].toMs,
        words: cur,
      });
    cur = [];
    curChars = 0;
  };
  for (const c of captions) {
    const raw = c.text.trim();
    const word = clean(raw);
    if (!word) {
      prevRaw = raw;
      continue;
    }
    const pause = c.startMs - prevEnd;
    const clauseEnd =
      /[.?!:—]$/.test(prevRaw) || (/,$/.test(prevRaw) && curChars > 14);
    if (
      cur.length &&
      (pause >= PAUSE_BREAK_MS ||
        clauseEnd ||
        curChars + 1 + word.length > MAX_CHARS)
    )
      flush();
    cur.push({ word, fromMs: c.startMs, toMs: c.endMs, isKeyword: false });
    curChars += (curChars ? 1 : 0) + word.length;
    prevRaw = raw;
    prevEnd = c.endMs;
  }
  flush();
  // Keyword detection across the whole stream (handles "Vector Database" split over pages too).
  markKeywords(
    pages.flatMap((p) => p.words),
    keywords,
  );
  return pages;
};

/**
 * glow      — bold white, no box, cyan keywords, active-word pop (2D dark reels)
 * pill      — dark rounded pill, spoken words white, upcoming grey (3D clay look)
 * reveal    — white text, upcoming dimmed, active word pops; never underlined (3D neon / studio looks)
 * boxed     — uppercase mono-ish text in a dark HUD box, spoken white (3D tactical look)
 */
export type CaptionVariant = "glow" | "pill" | "reveal" | "boxed";

const PageView: React.FC<{
  page: Page;
  variant: CaptionVariant;
  accent: string;
}> = ({ page, variant, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const enter = spring({
    fps,
    frame: frame - (page.startMs / 1000) * fps,
    config: { damping: 14, stiffness: 220 },
  });

  if (variant === "pill")
    return <PillPage page={page} enter={enter} ms={ms} accent={accent} />;
  if (variant === "reveal")
    return <RevealPage page={page} enter={enter} ms={ms} accent={accent} />;
  if (variant === "boxed")
    return <BoxedPage page={page} enter={enter} ms={ms} accent={accent} />;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 240,
        display: "flex",
        justifyContent: "center",
        opacity: Math.min(1, enter),
        transform: `translateY(${(1 - enter) * 8}px)`,
      }}
    >
      <div
        style={{
          maxWidth: 860,
          textAlign: "center",
          fontFamily: "Inter, Montserrat, 'Segoe UI', system-ui, sans-serif",
          fontWeight: 800,
          fontSize: 64,
          lineHeight: 1.2,
          letterSpacing: "-0.02em",
          color: "#FFFFFF",
          textShadow: "0 3px 12px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)",
        }}
      >
        {page.words.map((w, i) => {
          const active = ms >= w.fromMs && ms < w.toMs;
          const pop = active
            ? spring({
                fps,
                frame: frame - (w.fromMs / 1000) * fps,
                config: { damping: 12, stiffness: 260 },
              })
            : 0;
          return (
            <React.Fragment key={i}>
              {i > 0 ? " " : null}
              <span
                style={{
                  display: "inline-block",
                  margin: "0 0.06em",
                  color: w.isKeyword ? accent : "#FFFFFF",
                  textTransform: w.isKeyword ? "uppercase" : "none",
                  transform: `scale(${1 + 0.06 * Math.min(pop, 1.2)})`,
                }}
              >
                {w.word}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/** Light-theme style: dark rounded pill; spoken words white, upcoming words grey. */
const PillPage: React.FC<{
  page: Page;
  enter: number;
  ms: number;
  accent: string;
}> = ({ page, enter, ms, accent }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 520,
      display: "flex",
      justifyContent: "center",
      opacity: Math.min(1, enter),
      transform: `scale(${0.94 + 0.06 * Math.min(enter, 1)})`,
    }}
  >
    <div
      style={{
        maxWidth: 900,
        padding: "14px 30px 18px",
        borderRadius: 18,
        background: "#1F2125",
        textAlign: "center",
        fontFamily: "Inter, Montserrat, 'Segoe UI', system-ui, sans-serif",
        fontWeight: 800,
        fontSize: 58,
        lineHeight: 1.18,
        letterSpacing: "-0.01em",
        boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
      }}
    >
      {page.words.map((w, i) => {
        const spoken = ms >= w.fromMs;
        return (
          <React.Fragment key={i}>
            {i > 0 ? " " : null}
            <span
              style={{
                color: spoken ? (w.isKeyword ? accent : "#FFFFFF") : "#8B8E94",
              }}
            >
              {w.word}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

type VariantProps = { page: Page; enter: number; ms: number; accent: string };

/** Dark 3D looks: white text with a soft shadow, upcoming words dimmed, active word pops (no underline). */
const RevealPage: React.FC<VariantProps> = ({ page, enter, ms, accent }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 520,
      display: "flex",
      justifyContent: "center",
      opacity: Math.min(1, enter),
      transform: `translateY(${(1 - Math.min(enter, 1)) * 10}px)`,
    }}
  >
    <div
      style={{
        maxWidth: 900,
        textAlign: "center",
        fontFamily: "Inter, Montserrat, 'Segoe UI', system-ui, sans-serif",
        fontWeight: 700,
        fontSize: 56,
        lineHeight: 1.3,
        textShadow: "0 2px 14px rgba(0,0,0,0.9)",
      }}
    >
      {page.words.map((w, i) => {
        const spoken = ms >= w.fromMs;
        const active = ms >= w.fromMs && ms < w.toMs + 120;
        return (
          <React.Fragment key={i}>
            {i > 0 ? " " : null}
            <span
              style={{
                color: spoken
                  ? w.isKeyword
                    ? accent
                    : "#FFFFFF"
                  : "rgba(255,255,255,0.42)",
                display: "inline-block",
                transform: active ? "scale(1.06)" : undefined,
              }}
            >
              {w.word}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

/** Tactical HUD look: uppercase, letter-spaced, dark translucent box with a thin border. */
const BoxedPage: React.FC<VariantProps> = ({ page, enter, ms, accent }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 520,
      display: "flex",
      justifyContent: "center",
      opacity: Math.min(1, enter),
    }}
  >
    <div
      style={{
        maxWidth: 900,
        padding: "12px 26px 14px",
        background: "rgba(24,26,29,0.82)",
        borderBottom: "2px solid rgba(255,255,255,0.35)",
        textAlign: "center",
        fontFamily:
          "'Rajdhani', 'Bahnschrift', 'Segoe UI', system-ui, sans-serif",
        fontWeight: 600,
        fontSize: 54,
        lineHeight: 1.2,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      {page.words.map((w, i) => {
        const spoken = ms >= w.fromMs;
        return (
          <React.Fragment key={i}>
            {i > 0 ? " " : null}
            <span
              style={{
                color: spoken ? (w.isKeyword ? accent : "#FFFFFF") : "#8E9297",
              }}
            >
              {w.word}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

/** Loads word-level captions (Remotion `Caption[]` JSON) from /public and renders them. */
/**
 * `src`: word-level captions JSON in /public (e.g. "rag/captions.json").
 * `keywords`: terms shown in cyan + uppercase (multi-word phrases allowed, case-insensitive).
 */
export const StylishCaptions: React.FC<{
  src?: string;
  keywords?: string[];
  /** "glow" (default, 2D reels); 3D looks use "pill" | "reveal" | "boxed" (see LOOKS). */
  variant?: CaptionVariant;
  /** Keyword colour (default cyan). */
  accent?: string;
}> = ({
  src = "captions.json",
  keywords = [],
  variant = "glow",
  accent = CYAN,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  const [handle] = useState(() => delayRender("Loading captions"));

  useEffect(() => {
    fetch(staticFile(src))
      .then((r) => r.json())
      .then((data: Caption[]) => {
        setCaptions(data);
        continueRender(handle);
      })
      .catch((e) => cancelRender(e));
  }, [src, handle]);

  const kwKey = keywords.join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pages = useMemo(
    () => (captions ? buildPages(captions, keywords) : []),
    [captions, kwKey],
  );

  const ms = (frame / fps) * 1000;
  const idx = pages.findIndex((p, i) => {
    const next = pages[i + 1];
    const end = next
      ? Math.min(next.startMs, p.endMs + LINGER_MS)
      : p.endMs + LINGER_MS;
    return ms >= p.startMs && ms < end;
  });
  if (idx === -1) return null;
  return (
    <PageView key={idx} page={pages[idx]} variant={variant} accent={accent} />
  );
};
