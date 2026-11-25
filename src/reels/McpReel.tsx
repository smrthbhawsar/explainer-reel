import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Caption } from "@remotion/captions";
import words from "../../public/mcp/captions.json";
import {
  Abs,
  Background,
  C,
  ChipGlyph,
  Header,
  MONO,
  SANS,
  Scene,
  Tag,
  cardStyle,
  clamp,
  prog,
  useSpr,
} from "../kit/ui";
import { StylishCaptions } from "../kit/StylishCaptions";
import { phraseFrame } from "../kit/timing";

const W = words as Caption[];
const F = (p: string, n = 1) => phraseFrame(W, p, n);
export const DURATION = 2056;

const KEYWORDS = [
  "MCP",
  "LLM",
  "Model Context Protocol",
  "USB-C",
  "MCP Server",
  "MCP Client",
  "Integration",
  "Connectors",
];

const SCENES = [
  0,
  F("Kyunki LLM"),
  F("Yahin aata hai"),
  F("Simple bhasha"),
  F("Pehle"),
  F("Jab tum sawal"),
  F("Na har app"),
  DURATION,
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ───────────── shared bits ───────────── */
const Pill: React.FC<{ text: string; color: string; size?: number; solid?: boolean; style?: React.CSSProperties }> = ({
  text,
  color,
  size = 30,
  solid,
  style,
}) => (
  <div
    style={{
      display: "inline-block",
      fontFamily: SANS,
      fontWeight: 800,
      fontSize: size,
      color: solid ? C.bg : color,
      background: solid ? color : `${color}18`,
      border: `1.5px solid ${color}`,
      padding: "12px 28px",
      borderRadius: 999,
      boxShadow: `0 0 24px ${color}44`,
      ...style,
    }}
  >
    {text}
  </div>
);

const Strike: React.FC<{ p: number; color?: string }> = ({ p, color = C.red }) => (
  <span
    style={{
      position: "absolute",
      left: -6,
      top: "52%",
      height: 5,
      width: `${p * 104}%`,
      background: color,
      borderRadius: 3,
      boxShadow: `0 0 12px ${color}`,
    }}
  />
);

const UsbPort: React.FC<{ color: string; glow?: number }> = ({ color, glow = 0 }) => (
  <div
    style={{
      width: 64,
      height: 24,
      borderRadius: 12,
      border: `3px solid ${color}`,
      background: C.bg,
      boxShadow: `0 0 ${18 * glow}px ${color}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div style={{ width: 34, height: 5, borderRadius: 3, background: color, opacity: 0.8 }} />
  </div>
);

/* ───────────── Scene 1: hook ───────────── */
const TASKS = [
  { t: "GitHub check karo", e: "🐙", p: "GitHub" },
  { t: "Slack pe update bhejo", e: "💬", p: "Slack" },
  { t: "Calendar mein meeting", e: "📅", p: "calendar" },
];
const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const chat = useSpr(2);
  const bubble = useSpr(F("bola") - 10);
  const sorry = F("sorry");
  const typing = frame >= F("Usne") && frame < sorry;
  const reply = useSpr(sorry, { damping: 10, stiffness: 150 });
  const kyun = useSpr(F("Kyun"), { damping: 9, stiffness: 170 });
  const pulse = (i: number) => 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(frame / 4 - i * 1.1));
  return (
    <>
      <Abs
        x={100}
        y={270}
        w={880}
        style={{ ...cardStyle, padding: 32, opacity: chat, transform: `translateX(${(1 - chat) * -160}px)` }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: MONO, fontSize: 22, color: C.mute, marginBottom: 26 }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: C.green, boxShadow: `0 0 10px ${C.green}` }} />
          ai-assistant · chat
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div
            style={{
              background: `${C.cyan}1c`,
              border: `1px solid ${C.cyan}66`,
              borderRadius: 20,
              borderBottomRightRadius: 6,
              padding: "22px 26px",
              width: 600,
              opacity: bubble,
              transform: `scale(${0.9 + 0.1 * bubble})`,
              transformOrigin: "right center",
            }}
          >
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 32, color: C.text, marginBottom: 16 }}>
              Ye 3 kaam kar do 👇
            </div>
            {TASKS.map((t, i) => {
              const s = useSpr(F(t.p) - 4);
              const st = prog(frame, sorry + 8 + i * 7, 10);
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    marginTop: i ? 12 : 0,
                    padding: "12px 18px",
                    borderRadius: 14,
                    background: C.bg,
                    border: `1px solid ${st > 0 ? C.red : C.border}`,
                    opacity: s * (1 - 0.4 * st),
                    transform: `translateX(${(1 - s) * 60}px)`,
                  }}
                >
                  <span style={{ fontSize: 32 }}>{t.e}</span>
                  <span style={{ position: "relative", fontFamily: SANS, fontWeight: 600, fontSize: 30, color: C.text }}>
                    {t.t}
                    <Strike p={st} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ minHeight: 110, marginTop: 24, display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              flexShrink: 0,
              borderRadius: 28,
              background: `${C.purple}33`,
              border: `1px solid ${C.purple}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            🤖
          </div>
          {typing && (
            <div
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 20,
                borderBottomLeftRadius: 6,
                padding: "20px 26px",
                display: "flex",
                gap: 10,
              }}
            >
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: C.cyan, opacity: pulse(i) }} />
              ))}
            </div>
          )}
          {frame >= sorry && (
            <div
              style={{
                background: "#2a1118",
                border: `2px solid ${C.red}`,
                borderRadius: 20,
                borderBottomLeftRadius: 6,
                padding: "20px 26px",
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: 32,
                color: "#FFD7DC",
                opacity: clamp(reply),
                transform: `scale(${0.7 + 0.3 * reply})`,
                transformOrigin: "left center",
                boxShadow: `0 0 ${36 * clamp(reply)}px ${C.red}55`,
              }}
            >
              Sorry, main ye nahi kar sakta 🚫
            </div>
          )}
        </div>
      </Abs>
      <Abs x={100} y={1010} w={880} style={{ display: "flex", justifyContent: "center", opacity: clamp(kyun), transform: `scale(${0.5 + 0.5 * kyun})` }}>
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 900,
            fontSize: 70,
            color: C.bg,
            background: C.cyan,
            padding: "20px 56px",
            borderRadius: 24,
            boxShadow: `0 0 50px ${C.cyan}99`,
          }}
        >
          KYUN? 🤔
        </div>
      </Abs>
    </>
  );
};

/* ───────────── Scene 2: root cause ───────────── */
const TOOLS3 = [
  { n: "GitHub", e: "🐙" },
  { n: "Slack", e: "💬" },
  { n: "Calendar", e: "📅" },
];
const MESH_TOOLS = ["GitHub", "Slack", "Calendar", "Gmail", "Notion", "Drive", "Jira", "Figma", "Postgres", "Stripe"];
const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const chipIn = useSpr(SCENES[1] + 4);
  const smart = useSpr(F("smart"));
  const hands = useSpr(F("haath"), { damping: 10, stiffness: 160 });
  const toolAt = F("Har tool");
  const toolSpr = [useSpr(toolAt + 8), useSpr(toolAt + 14), useSpr(toolAt + 20)];
  const customAt = F("custom");
  const meshAt = F("Das AI apps");
  const fadeA = 1 - prog(frame, meshAt - 10, 10);
  const linesAt = F("matlab");
  const countEnd = F("connectors") + 12;
  const count = Math.round(100 * prog(frame, linesAt, countEnd - linesAt, Easing.inOut(Easing.quad)));
  const counter = useSpr(linesAt);
  const sau = useSpr(F("sau"), { damping: 9, stiffness: 170 });
  const shake = frame > F("connectors") && frame < F("connectors") + 14 ? Math.sin(frame * 2.4) * 6 : 0;
  return (
    <>
      {frame < meshAt && (
        <AbsoluteFill style={{ opacity: fadeA }}>
          <Abs
            x={340}
            y={290}
            w={400}
            h={320}
            style={{
              ...cardStyle,
              border: `2px solid ${C.cyan}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              opacity: chipIn,
              transform: `scale(${0.8 + 0.2 * chipIn})`,
              boxShadow: `0 0 ${40 * smart}px ${C.cyan}55`,
            }}
          >
            <ChipGlyph size={190} glow={0.4 + smart * 0.8} />
            <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 36, color: C.cyan, letterSpacing: 4 }}>LLM</div>
          </Abs>
          {[-1, 1].map((side) => (
            <Abs
              key={side}
              x={side === -1 ? 150 : 790}
              y={370}
              w={140}
              h={140}
              style={{ opacity: clamp(hands), transform: `scale(${0.6 + 0.4 * hands}) ${side === 1 ? "scaleX(-1)" : ""}` }}
            >
              <div style={{ fontSize: 110, lineHeight: "140px", textAlign: "center", filter: "grayscale(1)", opacity: 0.4 }}>🖐️</div>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: SANS,
                  fontWeight: 900,
                  fontSize: 120,
                  color: C.red,
                  textShadow: `0 0 24px ${C.red}`,
                }}
              >
                ✕
              </div>
            </Abs>
          ))}
          <Abs x={100} y={640} w={880} style={{ display: "flex", justifyContent: "center", gap: 24 }}>
            <div style={{ opacity: smart, transform: `translateY(${(1 - smart) * 20}px)` }}>
              <Pill text="🧠 Smart brain ✓" color={C.cyan} />
            </div>
            <div style={{ opacity: clamp(hands), transform: `translateY(${(1 - hands) * 20}px)` }}>
              <Pill text="Haath? ✕" color={C.red} />
            </div>
          </Abs>
          <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
            {TOOLS3.map((_, i) => {
              const p = prog(frame, toolAt + i * 6, 16);
              const x2 = 240 + i * 300;
              return (
                <line
                  key={i}
                  x1={540}
                  y1={730}
                  x2={lerp(540, x2, p)}
                  y2={lerp(730, 900, p)}
                  stroke={C.red}
                  strokeWidth={3}
                  strokeDasharray="10 8"
                  strokeDashoffset={-frame * 1.5}
                  opacity={p > 0 ? 0.9 : 0}
                  style={{ filter: `drop-shadow(0 0 6px ${C.red})` }}
                />
              );
            })}
          </svg>
          {TOOLS3.map((t, i) => {
            const s = toolSpr[i];
            return (
              <Abs
                key={i}
                x={100 + i * 300}
                y={900}
                w={280}
                h={110}
                style={{
                  ...cardStyle,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 14,
                  opacity: s,
                  transform: `translateY(${(1 - s) * 40}px)`,
                }}
              >
                <span style={{ fontSize: 40 }}>{t.e}</span>
                <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 32, color: C.text }}>{t.n}</span>
              </Abs>
            );
          })}
          <Abs
            x={100}
            y={1060}
            w={880}
            style={{
              textAlign: "center",
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 32,
              color: C.red,
              opacity: prog(frame, customAt - 4, 12),
            }}
          >
            {"{ custom integration } × 3"}
            <div style={{ fontSize: 26, color: C.mute, marginTop: 10, fontWeight: 500 }}>har tool ke liye alag code</div>
          </Abs>
        </AbsoluteFill>
      )}
      {frame >= meshAt - 4 && (
        <AbsoluteFill style={{ transform: `translateX(${shake}px)` }}>
          <Abs x={100} y={250} w={880} style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontWeight: 800, fontSize: 26, letterSpacing: 2 }}>
            <span style={{ color: C.purple, opacity: prog(frame, meshAt, 10), width: 220, textAlign: "center" }}>10 AI APPS</span>
            <span style={{ color: C.cyan, opacity: prog(frame, F("das tools"), 10), width: 220, textAlign: "center" }}>10 TOOLS</span>
          </Abs>
          <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
            {Array.from({ length: 100 }).map((_, k) => {
              const i = Math.floor(k / 10),
                j = k % 10;
              const p = prog(frame, linesAt + k * 0.32, 8);
              if (p <= 0) return null;
              return (
                <path
                  key={k}
                  d={`M320 ${327 + i * 74} L760 ${327 + j * 74}`}
                  stroke={C.red}
                  strokeWidth={1.6}
                  opacity={0.55}
                  pathLength={1}
                  strokeDasharray={`${p} 1`}
                />
              );
            })}
          </svg>
          {Array.from({ length: 10 }).map((_, i) => {
            const a = clamp(prog(frame, meshAt + i * 1.5, 8));
            const b = clamp(prog(frame, F("das tools") + i * 1.5, 8));
            return (
              <React.Fragment key={i}>
                <Abs
                  x={100}
                  y={300 + i * 74}
                  w={220}
                  h={54}
                  style={{
                    ...cardStyle,
                    borderRadius: 12,
                    border: `1px solid ${C.purple}88`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: MONO,
                    fontWeight: 700,
                    fontSize: 24,
                    color: C.text,
                    opacity: a,
                    transform: `translateX(${(1 - a) * -40}px)`,
                  }}
                >
                  🤖 App {i + 1}
                </Abs>
                <Abs
                  x={760}
                  y={300 + i * 74}
                  w={220}
                  h={54}
                  style={{
                    ...cardStyle,
                    borderRadius: 12,
                    border: `1px solid ${C.cyan}88`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: MONO,
                    fontWeight: 700,
                    fontSize: 24,
                    color: C.text,
                    opacity: b,
                    transform: `translateX(${(1 - b) * 40}px)`,
                  }}
                >
                  {MESH_TOOLS[i]}
                </Abs>
              </React.Fragment>
            );
          })}
          <Abs
            x={100}
            y={1070}
            w={880}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              opacity: counter,
              transform: `scale(${0.8 + 0.2 * counter + 0.08 * Math.sin(clamp(sau) * Math.PI)})`,
            }}
          >
            <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 110, color: C.red, textShadow: `0 0 40px ${C.red}88`, lineHeight: 1 }}>
              {count}
            </div>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: "#FFD7DC", marginTop: 10 }}>
              custom connectors 😵
            </div>
          </Abs>
        </AbsoluteFill>
      )}
    </>
  );
};

/* ───────────── Scene 3: MCP reveal ───────────── */
const LETTERS = [
  { k: "M", w: "Model", c: C.cyan },
  { k: "C", w: "Context", c: C.purple },
  { k: "P", w: "Protocol", c: C.green },
];
const Scene3: React.FC = () => {
  const mcp = F("MCP");
  const title = useSpr(SCENES[2] + 2);
  const banner = useSpr(F("Protocol") + 6);
  return (
    <>
      <Abs
        x={100}
        y={270}
        w={880}
        style={{
          textAlign: "center",
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: 60,
          color: C.text,
          opacity: title,
          transform: `translateY(${(1 - title) * 30}px)`,
        }}
      >
        Enter <span style={{ color: C.cyan }}>MCP</span> 🔌
      </Abs>
      {LETTERS.map((l, i) => {
        const s = useSpr(mcp + i * 5, { damping: 10, stiffness: 160 });
        const ws = useSpr(F(l.w));
        return (
          <React.Fragment key={i}>
            <Abs
              x={150}
              y={400 + i * 190}
              w={160}
              h={160}
              style={{
                ...cardStyle,
                border: `3px solid ${l.c}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: SANS,
                fontWeight: 900,
                fontSize: 110,
                color: l.c,
                textShadow: `0 0 30px ${l.c}`,
                boxShadow: `0 0 ${30 + 30 * clamp(ws)}px ${l.c}55`,
                opacity: clamp(s),
                transform: `scale(${0.4 + 0.6 * s})`,
              }}
            >
              {l.k}
            </Abs>
            <Abs
              x={360}
              y={400 + i * 190}
              h={160}
              style={{
                display: "flex",
                alignItems: "center",
                fontFamily: SANS,
                fontWeight: 900,
                fontSize: 86,
                color: C.text,
                opacity: ws,
                transform: `translateX(${(1 - ws) * 80}px)`,
              }}
            >
              <span style={{ color: l.c }}>{l.k}</span>
              {l.w.slice(1)}
            </Abs>
          </React.Fragment>
        );
      })}
      <Abs x={100} y={1000} w={880} style={{ display: "flex", justifyContent: "center", opacity: banner, transform: `translateY(${(1 - banner) * 30}px)` }}>
        <Pill text="Open standard: AI ⇄ Tools" color={C.green} size={36} />
      </Abs>
    </>
  );
};

/* ───────────── Scene 4: USB-C analogy ───────────── */
const TOOLS4 = [
  { n: "GitHub", e: "🐙" },
  { n: "Slack", e: "💬" },
  { n: "Calendar", e: "📅" },
  { n: "Database", e: "🗄️" },
];
const PORT_X = [200, 426, 652, 878];
const Scene4: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useSpr(F("AI ke liye") - 4);
  const hub = useSpr(SCENES[3] + 4);
  const usb = F("USB-C");
  const portGlow = prog(frame, usb, 10) * (0.7 + 0.3 * Math.sin(frame / 5));
  const std = useSpr(F("standard"));
  const toolsAt = F("har tool", 1);
  const fit = F("fit");
  return (
    <>
      <Abs
        x={100}
        y={250}
        w={880}
        style={{
          textAlign: "center",
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: 60,
          color: C.text,
          opacity: title,
          transform: `translateY(${(1 - title) * 30}px)`,
        }}
      >
        AI ka <span style={{ color: C.cyan }}>USB-C</span> port 🔌
      </Abs>
      <Abs
        x={100}
        y={370}
        w={880}
        h={210}
        style={{
          ...cardStyle,
          border: `2px solid ${C.cyan}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          opacity: hub,
          transform: `scale(${0.9 + 0.1 * hub})`,
          boxShadow: `0 0 ${30 * portGlow}px ${C.cyan}44`,
        }}
      >
        <ChipGlyph size={120} glow={0.4 + portGlow * 0.6} />
        <div>
          <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 46, color: C.text }}>AI App</div>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24, color: C.cyan, marginTop: 4 }}>speaks MCP</div>
        </div>
      </Abs>
      {PORT_X.map((x, i) => (
        <Abs key={i} x={x - 32} y={568} style={{ opacity: hub }}>
          <UsbPort color={frame >= fit ? C.green : C.cyan} glow={portGlow} />
        </Abs>
      ))}
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        {PORT_X.map((x, i) => {
          const p = prog(frame, toolsAt + i * 7 + 6, 18, Easing.inOut(Easing.cubic));
          if (p <= 0) return null;
          const col = frame >= fit ? C.green : C.cyan;
          return (
            <line
              key={i}
              x1={x}
              y1={860}
              x2={x}
              y2={lerp(860, 596, p)}
              stroke={col}
              strokeWidth={8}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 10px ${col})` }}
            />
          );
        })}
      </svg>
      {TOOLS4.map((t, i) => {
        const s = useSpr(toolsAt + i * 7);
        const ok = useSpr(fit + i * 4, { damping: 9, stiffness: 180 });
        const p = prog(frame, toolsAt + i * 7 + 6, 18, Easing.inOut(Easing.cubic));
        const col = frame >= fit ? C.green : C.cyan;
        return (
          <React.Fragment key={i}>
            <Abs x={PORT_X[i] - 26} y={lerp(830, 590, p) - 6} w={52} h={40} style={{ opacity: s }}>
              <div style={{ width: 52, height: 40, borderRadius: 10, background: col, boxShadow: `0 0 14px ${col}` }} />
            </Abs>
            <Abs
              x={100 + i * 226}
              y={860}
              w={200}
              h={170}
              style={{
                ...cardStyle,
                border: `2px solid ${frame >= fit ? C.green : C.border}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: s,
                transform: `translateY(${(1 - s) * 60}px)`,
                boxShadow: frame >= fit ? `0 0 26px ${C.green}55` : undefined,
              }}
            >
              <span style={{ fontSize: 50 }}>{t.e}</span>
              <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 28, color: C.text }}>{t.n}</span>
            </Abs>
            <Abs x={100 + i * 226 + 150} y={840} style={{ opacity: clamp(ok), transform: `scale(${ok})` }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  background: C.green,
                  color: C.bg,
                  fontFamily: SANS,
                  fontWeight: 900,
                  fontSize: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 0 20px ${C.green}`,
                }}
              >
                ✓
              </div>
            </Abs>
          </React.Fragment>
        );
      })}
      <Abs x={100} y={1110} w={880} style={{ display: "flex", justifyContent: "center", opacity: std, transform: `scale(${0.85 + 0.15 * std})` }}>
        <Pill text="1 standard plug → har tool mein fit" color={frame >= fit ? C.green : C.cyan} size={34} />
      </Abs>
    </>
  );
};

/* ───────────── Scene 5: architecture ───────────── */
const SERVERS = [
  { n: "GitHub", e: "🐙", caps: ["list_repos()", "create_issue()"] },
  { n: "Slack", e: "💬", caps: ["send_message()", "read_channel()"] },
  { n: "Calendar", e: "📅", caps: ["create_event()", "find_slot()"] },
];
const SY = [300, 545, 790];
const Scene5: React.FC = () => {
  const frame = useCurrentFrame();
  const srvAt = F("har tool", 2);
  const label = prog(frame, F("MCP Server"), 10);
  const capAt = F("batata");
  const app = useSpr(F("Tumhari"));
  const client = useSpr(F("MCP Client"), { damping: 11, stiffness: 150 });
  const conn = F("connect");
  const note = useSpr(conn + 10);
  return (
    <>
      <Tag text="HOW IT WORKS" at={SCENES[4]} />
      {SERVERS.map((s, i) => {
        const a = useSpr(srvAt + i * 6);
        return (
          <Abs
            key={i}
            x={600}
            y={SY[i]}
            w={380}
            h={215}
            style={{
              ...cardStyle,
              border: `1.5px solid ${label > 0 ? C.cyan : C.border}`,
              padding: "20px 24px",
              opacity: a,
              transform: `translateX(${(1 - a) * 120}px)`,
              boxShadow: `0 0 ${24 * label}px ${C.cyan}33`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 36 }}>{s.e}</span>
              <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 32, color: C.text }}>{s.n}</span>
            </div>
            <div
              style={{
                display: "inline-block",
                marginTop: 10,
                fontFamily: MONO,
                fontWeight: 800,
                fontSize: 20,
                letterSpacing: 2,
                color: C.cyan,
                border: `1px solid ${C.cyan}77`,
                borderRadius: 8,
                padding: "3px 10px",
                opacity: label,
              }}
            >
              MCP SERVER
            </div>
            {s.caps.map((c, j) => (
              <div
                key={j}
                style={{
                  fontFamily: MONO,
                  fontWeight: 600,
                  fontSize: 24,
                  color: C.green,
                  marginTop: j ? 4 : 10,
                  opacity: prog(frame, capAt + i * 6 + j * 4, 8),
                }}
              >
                › {c}
              </div>
            ))}
          </Abs>
        );
      })}
      <Abs
        x={100}
        y={300}
        w={400}
        h={705}
        style={{
          ...cardStyle,
          border: `1.5px solid ${C.purple}88`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 36,
          opacity: app,
          transform: `translateX(${(1 - app) * -120}px)`,
        }}
      >
        <ChipGlyph size={130} color={C.purple} glow={0.6} />
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 40, color: C.text, marginTop: 10 }}>AI App</div>
        <div style={{ fontFamily: MONO, fontSize: 22, color: C.mute, marginTop: 4 }}>Claude · Cursor · ChatGPT</div>
      </Abs>
      <Abs
        x={130}
        y={600}
        w={340}
        h={150}
        style={{
          ...cardStyle,
          border: `2px solid ${C.purple}`,
          background: "#1b1636",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: clamp(client),
          transform: `scale(${0.6 + 0.4 * client})`,
          boxShadow: `0 0 ${36 * clamp(client)}px ${C.purple}66`,
        }}
      >
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 20, letterSpacing: 2, color: C.purple }}>INSIDE THE APP</div>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 40, color: C.text, marginTop: 6 }}>MCP Client</div>
      </Abs>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        {SY.map((y, i) => {
          const p = prog(frame, conn + i * 5, 14);
          if (p <= 0) return null;
          const d = `M470 675 C 540 675, 530 ${y + 107}, 600 ${y + 107}`;
          return (
            <React.Fragment key={i}>
              <path d={d} fill="none" stroke={C.cyan} strokeWidth={4} pathLength={1} strokeDasharray={`${p} 1`} opacity={0.35} />
              <path
                d={d}
                fill="none"
                stroke={C.cyan}
                strokeWidth={4}
                strokeDasharray="10 10"
                strokeDashoffset={-frame * 2}
                opacity={p >= 1 ? 1 : 0}
                style={{ filter: `drop-shadow(0 0 8px ${C.cyan})` }}
              />
            </React.Fragment>
          );
        })}
      </svg>
      <Abs x={100} y={1060} w={880} style={{ display: "flex", justifyContent: "center", opacity: note, transform: `translateY(${(1 - note) * 30}px)` }}>
        <Pill text="Client ⇄ Server · ek hi protocol" color={C.cyan} size={34} />
      </Abs>
    </>
  );
};

/* ───────────── Scene 6: request flow ───────────── */
const Scene6: React.FC = () => {
  const frame = useCurrentFrame();
  const q = useSpr(F("sawal") - 4);
  const llm = useSpr(F("LLM sahi"));
  const pick = F("chunta");
  const clientIn = useSpr(F("client request") - 2);
  const reqAt = F("request");
  const srvIn = useSpr(reqAt + 4);
  const srvLit = prog(frame, F("server real"), 10);
  const req = prog(frame, reqAt + 4, 18, Easing.inOut(Easing.cubic));
  const resAt = F("real data");
  const res = prog(frame, resAt - 6, 16, Easing.inOut(Easing.cubic));
  const data = useSpr(resAt + 6);
  const act = useSpr(F("action"));
  const arrow = (y1: number, y2: number, p: number, col: string) => (
    <line x1={540} y1={y1} x2={540} y2={lerp(y1, y2, p)} stroke={col} strokeWidth={4} strokeDasharray="10 8" strokeDashoffset={-frame * 2} opacity={p > 0 ? 1 : 0} />
  );
  return (
    <>
      <Tag text="LIVE REQUEST" at={SCENES[5]} />
      <Abs
        x={100}
        y={290}
        w={880}
        h={100}
        style={{
          ...cardStyle,
          border: `1.5px solid ${C.cyan}`,
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "0 28px",
          opacity: q,
          transform: `translateY(${(1 - q) * -40}px)`,
        }}
      >
        <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 22, color: C.cyan }}>YOU</span>
        <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 32, color: C.text }}>"Mera GitHub check karo"</span>
      </Abs>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        <g transform="translate(-250 0)">{arrow(392, 440, prog(frame, F("LLM sahi") - 4, 10), C.cyan)}</g>
        <g transform="translate(-250 0)">{arrow(612, 680, prog(frame, F("client request") - 4, 10), C.purple)}</g>
      </svg>
      <Abs
        x={100}
        y={440}
        w={380}
        h={170}
        style={{
          ...cardStyle,
          border: `2px solid ${C.cyan}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          opacity: llm,
          transform: `scale(${0.85 + 0.15 * llm})`,
        }}
      >
        <ChipGlyph size={90} glow={0.7} />
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, color: C.cyan }}>LLM</div>
      </Abs>
      <Abs x={520} y={440} w={460} style={{ opacity: llm }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22, color: C.mute, marginBottom: 8 }}>picks a tool →</div>
        {TOOLS3.map((t, i) => {
          const hit = i === 0;
          const lit = hit ? prog(frame, pick, 8) : 0;
          const dim = !hit ? prog(frame, pick, 8) : 0;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: i ? 8 : 0,
                padding: "8px 18px",
                borderRadius: 12,
                background: hit ? `rgba(16,185,129,${0.15 * lit})` : C.card,
                border: `1.5px solid ${hit && lit > 0 ? C.green : C.border}`,
                boxShadow: hit ? `0 0 ${22 * lit}px ${C.green}` : undefined,
                opacity: 1 - 0.55 * dim,
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: 28,
                color: C.text,
              }}
            >
              <span>{t.e}</span> {t.n} {hit && lit > 0.5 ? "✓" : ""}
            </div>
          );
        })}
      </Abs>
      <Abs
        x={100}
        y={680}
        w={380}
        h={120}
        style={{
          ...cardStyle,
          border: `2px solid ${C.purple}`,
          background: "#1b1636",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: 38,
          color: C.text,
          opacity: clientIn,
          transform: `translateX(${(1 - clientIn) * -80}px)`,
        }}
      >
        MCP Client
      </Abs>
      <Abs
        x={600}
        y={680}
        w={380}
        h={120}
        style={{
          ...cardStyle,
          border: `2px solid ${srvLit > 0 ? C.green : C.cyan}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: 34,
          color: C.text,
          opacity: srvIn,
          transform: `translateX(${(1 - srvIn) * 80}px)`,
          boxShadow: `0 0 ${36 * srvLit}px ${C.green}77`,
        }}
      >
        🐙 GitHub Server
      </Abs>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        {req > 0 && (
          <>
            <line x1={480} y1={715} x2={600} y2={715} stroke={C.purple} strokeWidth={3} strokeDasharray="8 6" />
            <circle cx={lerp(480, 600, req)} cy={715} r={req < 1 ? 11 : 0} fill="#fff" style={{ filter: `drop-shadow(0 0 10px ${C.purple})` }} />
          </>
        )}
        {res > 0 && (
          <>
            <line x1={600} y1={765} x2={480} y2={765} stroke={C.green} strokeWidth={3} strokeDasharray="8 6" />
            <circle cx={lerp(600, 480, res)} cy={765} r={res < 1 ? 11 : 0} fill="#fff" style={{ filter: `drop-shadow(0 0 10px ${C.green})` }} />
            <path
              d="M540 800 V 880"
              stroke={C.green}
              strokeWidth={4}
              strokeDasharray="10 8"
              strokeDashoffset={-frame * 2}
              opacity={clamp(data)}
            />
          </>
        )}
      </svg>
      <Abs x={340} y={630} w={400} style={{ textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 22, color: C.purple, opacity: req > 0 ? 1 - prog(frame, resAt - 6, 8) : 0 }}>
        tools/call →
      </Abs>
      <Abs
        x={100}
        y={880}
        w={880}
        style={{
          ...cardStyle,
          border: `2px solid ${C.green}`,
          background: "#0c2a24",
          padding: "28px 34px",
          opacity: clamp(data),
          transform: `scale(${0.8 + 0.2 * data})`,
          boxShadow: `0 0 ${40 * clamp(data)}px ${C.green}55`,
        }}
      >
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 36, color: "#CFFBE6" }}>📦 Real data: 3 open PRs, 2 issues</div>
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 36,
            color: "#CFFBE6",
            marginTop: 18,
            opacity: act,
            transform: `translateX(${(1 - act) * 40}px)`,
          }}
        >
          ⚡ Action: Slack update sent ✅
        </div>
      </Abs>
    </>
  );
};

/* ───────────── Scene 7: payoff + punchline ───────────── */
const StrikeCard: React.FC<{ at: number; strikeAt: number; text: string; y: number }> = ({ at, strikeAt, text, y }) => {
  const frame = useCurrentFrame();
  const s = useSpr(at);
  const st = prog(frame, strikeAt, 12);
  return (
    <Abs
      x={100}
      y={y}
      w={880}
      h={120}
      style={{
        ...cardStyle,
        display: "flex",
        alignItems: "center",
        padding: "0 40px",
        opacity: clamp(s),
        transform: `translateX(${(1 - s) * 140}px)`,
        borderColor: `${C.red}${st > 0 ? "aa" : "55"}`,
      }}
    >
      <span style={{ position: "relative", fontFamily: SANS, fontWeight: 700, fontSize: 38, color: st > 0.5 ? C.mute : C.text }}>
        {text}
        <Strike p={st} />
      </span>
    </Abs>
  );
};
const Scene7: React.FC = () => {
  const frame = useCurrentFrame();
  const hero = useSpr(F("Ek baar"), { damping: 11, stiffness: 120 });
  const appsAt = F("har AI app");
  const fin = useSpr(F("Bas plug"), { damping: 10, stiffness: 120 });
  const hands = useSpr(F("haath", 2) - 3, { damping: 8, stiffness: 180 });
  const pulse = 0.5 + 0.5 * Math.sin(frame / 7);
  return (
    <>
      <Abs
        x={100}
        y={260}
        w={880}
        style={{ textAlign: "center", fontFamily: SANS, fontWeight: 900, fontSize: 56, color: C.text, opacity: prog(frame, SCENES[6], 12) }}
      >
        Why <span style={{ color: C.green }}>MCP</span> wins
      </Abs>
      <StrikeCard at={SCENES[6]} strikeAt={F("naya code") + 2} text="❌ Har app ke liye naya code" y={370} />
      <StrikeCard at={F("na har tool") - 4} strikeAt={F("jugaad")} text="❌ Har tool ka alag jugaad" y={520} />
      <Abs
        x={100}
        y={680}
        w={880}
        h={200}
        style={{
          ...cardStyle,
          border: `2px solid ${C.green}`,
          background: "#0c2a24",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          opacity: clamp(hero),
          transform: `scale(${0.7 + 0.3 * hero})`,
          boxShadow: `0 0 ${36 * clamp(hero)}px ${C.green}55`,
        }}
      >
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 46, color: "#D4FBE9" }}>🛠️ Server ek baar banao</div>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 28, color: C.green, opacity: prog(frame, appsAt, 10) }}>
          → har AI app use kar legi
        </div>
      </Abs>
      <Abs
        x={100}
        y={920}
        w={880}
        h={400}
        style={{
          ...cardStyle,
          border: `3px solid ${C.green}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: clamp(fin * 1.5),
          transform: `scale(${0.6 + 0.4 * fin})`,
          boxShadow: `0 0 ${(40 + 40 * pulse) * clamp(fin)}px ${C.green}88`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ fontSize: 96, opacity: clamp(hands), transform: `scale(${hands}) rotate(${(1 - hands) * -30}deg)` }}>🤚</div>
          <ChipGlyph size={170} color={C.green} glow={0.6 + 0.6 * pulse * clamp(hands)} />
          <div style={{ fontSize: 96, opacity: clamp(hands), transform: `scale(${hands}) scaleX(-1) rotate(${(1 - hands) * -30}deg)` }}>🤚</div>
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 52, color: "#D4FBE9", marginTop: 14 }}>
          Plug in → AI ko haath 🙌
        </div>
      </Abs>
    </>
  );
};

/* ───────────── root ───────────── */
const SCENE_COMPONENTS = [Scene1, Scene2, Scene3, Scene4, Scene5, Scene6, Scene7];

export const McpReel: React.FC = () => (
  <Sequence from={0} durationInFrames={DURATION}>
    <Audio src={staticFile("mcp/voiceover.mp3")} />
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <Background />
      <Header bounds={SCENES} label="AI ARCHITECTURE" />
      {SCENE_COMPONENTS.map((S, i) => (
        <Scene key={i} from={SCENES[i]} to={SCENES[i + 1]} first={i === 0} last={i === SCENE_COMPONENTS.length - 1}>
          <S />
        </Scene>
      ))}
      <StylishCaptions src="mcp/captions.json" keywords={KEYWORDS} />
    </AbsoluteFill>
  </Sequence>
);
