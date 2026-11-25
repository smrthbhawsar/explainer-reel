import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Caption } from "@remotion/captions";
import words from "../../public/upi/captions.json";
import { Abs, Background, C, Header, MONO, SANS, Scene, Tag, cardStyle, clamp, prog, useSpr } from "../kit/ui";
import { StylishCaptions } from "../kit/StylishCaptions";
import { phraseFrame } from "../kit/timing";

const W = words as Caption[];
const F = (p: string, n = 1) => phraseFrame(W, p, n);
export const DURATION = 2214;

const KEYWORDS = ["UPI", "NPCI", "VPA", "Pending", "Transaction ID", "Timeout", "Idempotency"];

const SCENES = [
  0,
  F("Kyunki ye"),
  F("Aur beech"),
  F("Simple bhasha"),
  F("Pehle"),
  F("Ab agar"),
  F("System status"),
  DURATION,
];

const AMBER = "#F59E0B";
const TXN = "UPI4F7A9C21E";
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ───────────── shared bits ───────────── */
const Pill: React.FC<{ text: React.ReactNode; color: string; size?: number; solid?: boolean }> = ({
  text,
  color,
  size = 32,
  solid,
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
      whiteSpace: "nowrap",
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

const Node: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  s: number;
  icon: string;
  title: string;
  sub?: React.ReactNode;
  color?: string;
  glow?: number;
  from?: "left" | "right" | "up" | "down" | "pop";
  iconSize?: number;
  titleSize?: number;
}> = ({ x, y, w, h, s, icon, title, sub, color = C.border, glow = 0, from = "pop", iconSize = 54, titleSize = 32 }) => {
  const t =
    from === "left"
      ? `translateX(${(1 - s) * -120}px)`
      : from === "right"
        ? `translateX(${(1 - s) * 120}px)`
        : from === "up"
          ? `translateY(${(1 - s) * -60}px)`
          : from === "down"
            ? `translateY(${(1 - s) * 60}px)`
            : `scale(${0.7 + 0.3 * s})`;
  return (
    <Abs
      x={x}
      y={y}
      w={w}
      h={h}
      style={{
        ...cardStyle,
        border: `2px solid ${color}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        opacity: clamp(s),
        transform: t,
        boxShadow: glow > 0 ? `0 0 ${40 * glow}px ${color}66` : undefined,
      }}
    >
      <div style={{ fontSize: iconSize, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: titleSize, color: C.text, textAlign: "center" }}>{title}</div>
      {sub}
    </Abs>
  );
};

/** Dashed flowing line + a bright packet travelling along it while 0<p<1. */
const Flow: React.FC<{ x1: number; y1: number; x2: number; y2: number; p: number; color: string; dot?: boolean }> = ({
  x1,
  y1,
  x2,
  y2,
  p,
  color,
  dot = true,
}) => {
  const frame = useCurrentFrame();
  if (p <= 0) return null;
  return (
    <>
      <line
        x1={x1}
        y1={y1}
        x2={lerp(x1, x2, p)}
        y2={lerp(y1, y2, p)}
        stroke={color}
        strokeWidth={4}
        strokeDasharray="10 9"
        strokeDashoffset={-frame * 2}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
      {dot && p < 1 && (
        <circle cx={lerp(x1, x2, p)} cy={lerp(y1, y2, p)} r={12} fill="#fff" style={{ filter: `drop-shadow(0 0 12px ${color})` }} />
      )}
    </>
  );
};

const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
    {children}
  </svg>
);

const Spinner: React.FC<{ size: number; color: string }> = ({ size, color }) => {
  const frame = useCurrentFrame();
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ transform: `rotate(${frame * 9}deg)` }}>
      <circle cx={20} cy={20} r={16} fill="none" stroke={`${color}33`} strokeWidth={5} />
      <path d="M20 4 A16 16 0 0 1 36 20" fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" />
    </svg>
  );
};

const PendingBadge: React.FC<{ s: number; size?: number }> = ({ s, size = 44 }) => {
  const frame = useCurrentFrame();
  const pulse = 0.5 + 0.5 * Math.sin(frame / 5);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 18,
        padding: "16px 34px",
        borderRadius: 999,
        border: `2px solid ${AMBER}`,
        background: `${AMBER}1c`,
        boxShadow: `0 0 ${20 + 24 * pulse}px ${AMBER}66`,
        opacity: clamp(s),
        transform: `scale(${0.6 + 0.4 * s})`,
      }}
    >
      <Spinner size={size} color={AMBER} />
      <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: size, letterSpacing: 4, color: AMBER }}>PENDING</span>
    </div>
  );
};

/* ───────────── Scene 1: hook ───────────── */
const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const phone = useSpr(2);
  const upi = useSpr(F("UPI") - 2, { damping: 10, stiffness: 160 });
  const sent = F("bheje");
  const swipe = prog(frame, sent - 8, 14, Easing.inOut(Easing.cubic));
  const debit = useSpr(F("Paise"), { damping: 12, stiffness: 150 });
  const pending = useSpr(F("Pending") - 2, { damping: 10, stiffness: 150 });
  const kyun = useSpr(F("Kyun"), { damping: 9, stiffness: 170 });
  return (
    <>
      <Abs
        x={260}
        y={250}
        w={560}
        h={880}
        style={{
          ...cardStyle,
          borderRadius: 56,
          border: `3px solid ${C.border}`,
          background: "#0F1626",
          padding: "40px 40px",
          opacity: phone,
          transform: `translateY(${(1 - phone) * 120}px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ width: 120, height: 10, borderRadius: 5, background: C.border, marginBottom: 34 }} />
        <div style={{ fontFamily: MONO, fontSize: 24, color: C.mute, letterSpacing: 2 }}>PAYING</div>
        <div
          style={{
            width: 130,
            height: 130,
            borderRadius: 65,
            marginTop: 22,
            background: `${AMBER}22`,
            border: `2px solid ${AMBER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 72,
          }}
        >
          ☕
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, color: C.text, marginTop: 18 }}>Chai Wala</div>
        <div style={{ fontFamily: MONO, fontSize: 24, color: C.mute, marginTop: 4 }}>ramu@okbank</div>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 110, color: C.text, marginTop: 26, lineHeight: 1 }}>₹500</div>
        <div style={{ marginTop: 24, opacity: clamp(upi), transform: `scale(${0.6 + 0.4 * upi})` }}>
          <Pill text="via UPI ⚡" color={C.cyan} size={28} />
        </div>
        <div style={{ flex: 1 }} />
        {frame < F("Pending") - 2 ? (
          <div
            style={{
              width: 440,
              height: 96,
              borderRadius: 48,
              background: C.card,
              border: `2px solid ${C.green}`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${20 + 80 * swipe}%`,
                background: `${C.green}55`,
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: SANS,
                fontWeight: 800,
                fontSize: 34,
                color: C.text,
              }}
            >
              {swipe >= 1 ? "Sent ✓" : "Swipe to Pay →"}
            </div>
          </div>
        ) : (
          <PendingBadge s={pending} size={40} />
        )}
      </Abs>
      {/* bank SMS */}
      <Abs
        x={130}
        y={300}
        w={820}
        style={{
          ...cardStyle,
          border: `2px solid ${C.red}`,
          background: "#2a1118",
          padding: "20px 28px",
          display: "flex",
          alignItems: "center",
          gap: 18,
          opacity: clamp(debit) * (frame >= F("Kyun") ? 0 : 1),
          transform: `translateY(${(1 - debit) * -80}px)`,
          boxShadow: `0 0 30px ${C.red}55`,
        }}
      >
        <span style={{ fontSize: 44 }}>🏦</span>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 22, color: "#FFB4BE" }}>BANK · just now</div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 34, color: "#FFD7DC" }}>A/C debited ₹500 💸</div>
        </div>
      </Abs>
      <Abs
        x={100}
        y={1180}
        w={880}
        style={{ display: "flex", justifyContent: "center", opacity: clamp(kyun), transform: `scale(${0.5 + 0.5 * kyun})` }}
      >
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 900,
            fontSize: 70,
            color: C.bg,
            background: C.cyan,
            padding: "18px 56px",
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

/* ───────────── Scene 2: relay race ───────────── */
const RELAY = [
  { icon: "📱", t: "Your App", p: "Tumhari app" },
  { icon: "🏦", t: "Your Bank", p: "tumhara bank" },
  { icon: "☕🏦", t: "Chai wale ka Bank", p: "ka bank" },
];
const RX = [100, 400, 700];
const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useSpr(SCENES[1] + 2);
  const strike = prog(frame, F("nahi"), 10);
  const relay = useSpr(F("relay"), { damping: 10, stiffness: 160 });
  const baton = F("baton");
  const loop = 34;
  const t = frame < baton ? -1 : ((frame - baton) % loop) / loop;
  const leg = t < 0 ? -1 : Math.floor(t * 2);
  const lp = t < 0 ? 0 : (t * 2) % 1;
  const bx = leg < 0 ? 0 : lerp(RX[leg] + 140, RX[leg + 1] + 140, Easing.inOut(Easing.cubic)(lp));
  const note = useSpr(F("pass") + 4);
  return (
    <>
      <Abs x={100} y={290} w={880} style={{ textAlign: "center", opacity: title, transform: `translateY(${(1 - title) * 30}px)` }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 58, color: C.text }}>
          <span style={{ position: "relative", color: strike > 0.5 ? C.mute : C.text }}>
            1 payment
            <Strike p={strike} />
          </span>
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 900,
            fontSize: 74,
            color: C.cyan,
            marginTop: 18,
            opacity: clamp(relay),
            transform: `scale(${0.6 + 0.4 * relay})`,
            textShadow: `0 0 30px ${C.cyan}88`,
          }}
        >
          Relay race 🏃‍♂️
        </div>
      </Abs>
      {RELAY.map((r, i) => {
        const s = useSpr(F(r.p) - 3);
        const active = leg >= 0 && (leg === i - 1 ? lp > 0.85 : leg === i && lp < 0.15);
        return (
          <Node
            key={i}
            x={RX[i]}
            y={640}
            w={280}
            h={240}
            s={s}
            from="down"
            icon={r.icon}
            title={r.t}
            titleSize={28}
            color={active ? C.green : C.border}
            glow={active ? 1 : 0}
          />
        );
      })}
      <Svg>
        {leg >= 0 && (
          <>
            <line x1={240} y1={925} x2={840} y2={925} stroke={`${C.cyan}66`} strokeWidth={4} strokeDasharray="10 10" strokeDashoffset={-frame * 2} />
            {RX.map((x, i) => (
              <circle key={i} cx={x + 140} cy={925} r={9} fill={C.cyan} />
            ))}
            <rect x={bx - 34} y={910} width={68} height={30} rx={15} fill={AMBER} style={{ filter: `drop-shadow(0 0 14px ${AMBER})` }} />
          </>
        )}
      </Svg>
      <Abs x={100} y={1010} w={880} style={{ display: "flex", justifyContent: "center", opacity: note, transform: `translateY(${(1 - note) * 30}px)` }}>
        <Pill text="Har step pe baton handoff 🔁" color={AMBER} size={34} />
      </Abs>
      <Abs
        x={100}
        y={1130}
        w={880}
        style={{ textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 28, color: C.mute, opacity: prog(frame, F("karte hain") + 6, 12) }}
      >
        ek bhi runner slow → poori race atki
      </Abs>
    </>
  );
};

/* ───────────── Scene 3: NPCI reveal ───────────── */
const LETTERS = [
  { k: "N", w: "National", c: C.cyan },
  { k: "P", w: "Payments", c: C.purple },
  { k: "C", w: "Corporation", c: C.green },
  { k: "I", w: "India", c: AMBER },
];
const Scene3: React.FC = () => {
  const title = useSpr(SCENES[2] + 2);
  const npci = F("NPCI");
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
          fontSize: 58,
          color: C.text,
          opacity: title,
          transform: `translateY(${(1 - title) * 30}px)`,
        }}
      >
        Beech mein kaun? 👀
      </Abs>
      {LETTERS.map((l, i) => {
        const s = useSpr(npci + i * 4, { damping: 10, stiffness: 160 });
        const ws = useSpr(F(l.w) - 2);
        return (
          <React.Fragment key={i}>
            <Abs
              x={150}
              y={400 + i * 175}
              w={150}
              h={150}
              style={{
                ...cardStyle,
                border: `3px solid ${l.c}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: SANS,
                fontWeight: 900,
                fontSize: 100,
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
              x={340}
              y={400 + i * 175}
              h={150}
              style={{
                display: "flex",
                alignItems: "center",
                fontFamily: SANS,
                fontWeight: 900,
                fontSize: i === 2 ? 72 : 80,
                color: C.text,
                opacity: ws,
                transform: `translateX(${(1 - ws) * 80}px)`,
              }}
            >
              <span style={{ color: l.c }}>{l.k}</span>
              {i === 3 ? <span>ndia</span> : l.w.slice(1)}
            </Abs>
          </React.Fragment>
        );
      })}
    </>
  );
};

/* ───────────── Scene 4: central switch ───────────── */
const BANKS = ["SBI", "HDFC", "ICICI", "Axis", "Kotak", "PNB", "BoB", "Yes"];
const HUB = { x: 540, y: 790 };
const R = 330;
const bankPos = (i: number) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / BANKS.length;
  return { x: HUB.x + R * Math.cos(a), y: HUB.y + R * 0.92 * Math.sin(a) };
};
const PAIRS = [
  [0, 4],
  [2, 6],
  [1, 5],
  [7, 3],
];
const Scene4: React.FC = () => {
  const frame = useCurrentFrame();
  const hub = useSpr(SCENES[3] + 2, { damping: 11, stiffness: 140 });
  const sw = useSpr(F("central"), { damping: 10, stiffness: 160 });
  const banksAt = F("har bank");
  const linkAt = F("jodta");
  const pill = useSpr(linkAt + 6);
  const pulse = 0.5 + 0.5 * Math.sin(frame / 6);
  return (
    <>
      <Abs
        x={100}
        y={260}
        w={880}
        style={{ textAlign: "center", fontFamily: SANS, fontWeight: 900, fontSize: 56, color: C.text, opacity: sw, transform: `translateY(${(1 - sw) * 30}px)` }}
      >
        NPCI = <span style={{ color: C.cyan }}>Central Switch</span> 🔀
      </Abs>
      <Svg>
        {BANKS.map((_, i) => {
          const p = prog(frame, banksAt + i * 3 + 4, 12);
          const b = bankPos(i);
          return <Flow key={i} x1={HUB.x} y1={HUB.y} x2={b.x} y2={b.y} p={p} color={C.cyan} dot={false} />;
        })}
        {PAIRS.map(([a, b], k) => {
          const start = linkAt + k * 9;
          const t = prog(frame, start, 26, Easing.inOut(Easing.cubic));
          if (t <= 0 || t >= 1) return null;
          const A = bankPos(a);
          const B = bankPos(b);
          const x = t < 0.5 ? lerp(A.x, HUB.x, t * 2) : lerp(HUB.x, B.x, t * 2 - 1);
          const y = t < 0.5 ? lerp(A.y, HUB.y, t * 2) : lerp(HUB.y, B.y, t * 2 - 1);
          return <circle key={k} cx={x} cy={y} r={13} fill="#fff" style={{ filter: `drop-shadow(0 0 14px ${C.green})` }} />;
        })}
      </Svg>
      {BANKS.map((n, i) => {
        const s = useSpr(banksAt + i * 3);
        const b = bankPos(i);
        return (
          <Abs
            key={i}
            x={b.x - 80}
            y={b.y - 45}
            w={160}
            h={90}
            style={{
              ...cardStyle,
              border: `1.5px solid ${frame >= linkAt ? C.green : C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 28,
              color: C.text,
              opacity: clamp(s),
              transform: `scale(${0.5 + 0.5 * s})`,
            }}
          >
            🏦 {n}
          </Abs>
        );
      })}
      <Abs
        x={HUB.x - 130}
        y={HUB.y - 95}
        w={260}
        h={190}
        style={{
          ...cardStyle,
          border: `3px solid ${C.cyan}`,
          background: "#0F2236",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: clamp(hub),
          transform: `scale(${0.5 + 0.5 * hub})`,
          boxShadow: `0 0 ${40 + 30 * pulse * clamp(sw)}px ${C.cyan}77`,
        }}
      >
        <div style={{ fontSize: 56, lineHeight: 1 }}>🔀</div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 48, color: C.cyan, letterSpacing: 3, marginTop: 6 }}>NPCI</div>
      </Abs>
      <Abs x={100} y={1250} w={880} style={{ display: "flex", justifyContent: "center", opacity: pill, transform: `translateY(${(1 - pill) * 30}px)` }}>
        <Pill text="Har bank ⇄ har bank" color={C.green} size={36} />
      </Abs>
    </>
  );
};

/* ───────────── Scene 5: how it works ───────────── */
const Scene5: React.FC = () => {
  const frame = useCurrentFrame();
  const app = useSpr(SCENES[4] + 2);
  const vpa = useSpr(F("VPA"), { damping: 10, stiffness: 170 });
  const toNpci = F("NPCI ko");
  const npci = useSpr(toNpci - 6);
  const sendP = prog(frame, toNpci, 18, Easing.inOut(Easing.cubic));
  const look = F("pata lagata");
  const lookup = useSpr(look);
  const lookP = prog(frame, look, 12);
  const resolved = prog(frame, F("account") - 2, 10);
  const debitAt = F("debit");
  const creditAt = F("credit");
  const debit = useSpr(debitAt - 8);
  const credit = useSpr(creditAt - 8);
  const dP = prog(frame, debitAt - 10, 16, Easing.inOut(Easing.cubic));
  const cP = prog(frame, creditAt - 10, 18, Easing.inOut(Easing.cubic));
  const dAmt = useSpr(debitAt + 4, { damping: 9, stiffness: 180 });
  const cAmt = useSpr(creditAt + 6, { damping: 9, stiffness: 180 });
  const txn = useSpr(F("unique"), { damping: 10, stiffness: 150 });
  const txnPulse = 0.5 + 0.5 * Math.sin(frame / 6);
  return (
    <>
      <Tag text="HOW IT WORKS" at={SCENES[4]} />
      {/* app row */}
      <Abs
        x={100}
        y={300}
        w={880}
        h={120}
        style={{
          ...cardStyle,
          border: `2px solid ${C.purple}`,
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "0 30px",
          opacity: app,
          transform: `translateY(${(1 - app) * -40}px)`,
        }}
      >
        <span style={{ fontSize: 50 }}>📱</span>
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 34, color: C.text }}>Your App</span>
        <div style={{ flex: 1 }} />
        <div
          style={{
            fontFamily: MONO,
            fontWeight: 800,
            fontSize: 30,
            color: C.cyan,
            border: `2px solid ${C.cyan}`,
            background: `${C.cyan}18`,
            borderRadius: 12,
            padding: "10px 18px",
            opacity: clamp(vpa),
            transform: `scale(${0.5 + 0.5 * vpa})`,
            boxShadow: `0 0 24px ${C.cyan}55`,
          }}
        >
          VPA: ramu@okbank
        </div>
      </Abs>
      <Svg>
        <Flow x1={310} y1={420} x2={310} y2={500} p={sendP} color={C.cyan} />
        <Flow x1={520} y1={585} x2={560} y2={585} p={lookP} color={C.purple} dot={false} />
        <Flow x1={250} y1={670} x2={250} y2={830} p={dP} color={C.red} />
        <Flow x1={400} y1={670} x2={760} y2={830} p={cP} color={C.green} />
      </Svg>
      <Node x={100} y={500} w={420} h={170} s={npci} from="left" icon="🔀" title="NPCI" color={C.cyan} glow={sendP >= 1 ? 0.6 : 0} />
      {/* lookup */}
      <Abs
        x={560}
        y={500}
        w={420}
        h={170}
        style={{
          ...cardStyle,
          border: `2px solid ${C.purple}`,
          padding: "18px 24px",
          opacity: lookup,
          transform: `translateX(${(1 - lookup) * 100}px)`,
        }}
      >
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 22, color: C.purple, letterSpacing: 2 }}>🔍 VPA LOOKUP</div>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: C.text, marginTop: 12 }}>ramu@okbank</div>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: C.green, marginTop: 6, opacity: resolved }}>
          → Bank B · A/C ••4821
        </div>
      </Abs>
      {/* banks */}
      <Node
        x={100}
        y={830}
        w={420}
        h={220}
        s={debit}
        from="down"
        icon="🏦"
        title="Your Bank"
        color={dP >= 1 ? C.red : C.border}
        sub={
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, color: C.red, opacity: clamp(dAmt), transform: `scale(${0.5 + 0.5 * dAmt})` }}>
            DEBIT −₹500
          </div>
        }
      />
      <Node
        x={560}
        y={830}
        w={420}
        h={220}
        s={credit}
        from="down"
        icon="☕🏦"
        title="Chai wale ka Bank"
        titleSize={30}
        color={cP >= 1 ? C.green : C.border}
        sub={
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, color: C.green, opacity: clamp(cAmt), transform: `scale(${0.5 + 0.5 * cAmt})` }}>
            CREDIT +₹500
          </div>
        }
      />
      {/* txn id */}
      <Abs x={100} y={1110} w={880} style={{ display: "flex", justifyContent: "center", opacity: clamp(txn), transform: `scale(${0.6 + 0.4 * txn})` }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "18px 34px",
            borderRadius: 18,
            border: `2px solid ${C.purple}`,
            background: "#1b1636",
            boxShadow: `0 0 ${24 + 24 * txnPulse}px ${C.purple}66`,
          }}
        >
          <span style={{ fontSize: 40 }}>🏷️</span>
          <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 30, color: C.mute }}>TXN ID</span>
          <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 36, color: C.purple }}>{TXN}</span>
        </div>
      </Abs>
    </>
  );
};

/* ───────────── Scene 6: timeout + idempotency ───────────── */
const Scene6: React.FC = () => {
  const frame = useCurrentFrame();
  const top = useSpr(SCENES[5] + 2);
  const waitAt = F("time pe");
  const toAt = F("timeout");
  const wait = prog(frame, waitAt - 6, toAt - waitAt + 6, (t) => t);
  const timeout = useSpr(toAt, { damping: 8, stiffness: 200 });
  const shake = frame > toAt && frame < toAt + 12 ? Math.sin(frame * 2.6) * 7 : 0;
  const status = useSpr(F("Paise kat", 2));
  const pend = useSpr(F("Pending", 2) - 2, { damping: 10, stiffness: 150 });
  const retryAt = F("retry");
  const r1 = useSpr(F("wahi") - 2);
  const r2 = useSpr(retryAt);
  const dbl = F("double");
  const dblStrike = prog(frame, dbl + 4, 12);
  const ignored = useSpr(F("bachata"), { damping: 10, stiffness: 170 });
  const idem = useSpr(F("idempotency") - 2, { damping: 9, stiffness: 150 });
  const fade = 1 - 0.55 * prog(frame, F("idempotency") - 2, 10);
  const ringR = 34;
  const ring = 2 * Math.PI * ringR;
  return (
    <>
      {/* top row */}
      <Svg>
        <line x1={360} y1={365} x2={410} y2={365} stroke={C.red} strokeWidth={4} opacity={top} />
        <line x1={670} y1={365} x2={720} y2={365} stroke={frame >= toAt ? C.red : AMBER} strokeWidth={4} strokeDasharray="8 8" strokeDashoffset={-frame * 2} opacity={top} />
      </Svg>
      <Node
        x={100}
        y={280}
        w={260}
        h={170}
        s={top}
        from="left"
        icon="🏦"
        title="Your Bank"
        titleSize={26}
        iconSize={44}
        color={C.red}
        sub={<div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 26, color: C.red }}>−₹500 ✓</div>}
      />
      <Node x={410} y={280} w={260} h={170} s={top} from="up" icon="🔀" title="NPCI" titleSize={30} iconSize={44} color={C.cyan} />
      <Abs x={720} y={280} w={260} h={170} style={{ transform: `translateX(${shake}px)` }}>
        <Node
          x={0}
          y={0}
          w={260}
          h={170}
          s={top}
          from="right"
          icon="☕🏦"
          title="Chai Bank"
          titleSize={26}
          iconSize={44}
          color={frame >= toAt ? C.red : AMBER}
          glow={frame >= toAt ? 0.8 : 0}
          sub={
            <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 26, color: frame >= toAt ? C.red : AMBER }}>
              {frame >= toAt ? "no reply ✕" : "credit ?"}
            </div>
          }
        />
        {/* countdown ring */}
        <svg width={84} height={84} style={{ position: "absolute", right: -18, top: -30, opacity: prog(frame, waitAt - 6, 6) }}>
          <circle cx={42} cy={42} r={ringR} fill={C.bg} stroke={`${AMBER}44`} strokeWidth={7} />
          <circle
            cx={42}
            cy={42}
            r={ringR}
            fill="none"
            stroke={frame >= toAt ? C.red : AMBER}
            strokeWidth={7}
            strokeDasharray={ring}
            strokeDashoffset={ring * wait}
            transform="rotate(-90 42 42)"
          />
          <text x={42} y={52} textAnchor="middle" fontSize={30}>
            ⏱
          </text>
        </svg>
      </Abs>
      <Abs x={560} y={475} w={420} style={{ display: "flex", justifyContent: "center", opacity: clamp(timeout), transform: `scale(${0.4 + 0.6 * timeout}) rotate(-6deg)` }}>
        <div
          style={{
            fontFamily: MONO,
            fontWeight: 900,
            fontSize: 44,
            letterSpacing: 4,
            color: C.red,
            border: `4px solid ${C.red}`,
            borderRadius: 12,
            padding: "6px 22px",
            boxShadow: `0 0 30px ${C.red}88`,
            background: "#2a1118",
          }}
        >
          TIMEOUT
        </div>
      </Abs>
      {/* status */}
      <Abs x={100} y={580} w={880} style={{ display: "flex", justifyContent: "center", gap: 20, alignItems: "center", opacity: clamp(status) * fade }}>
        {frame < F("Pending", 2) - 2 ? (
          <Pill text="Debit ✓   ·   Credit ?" color={AMBER} size={34} />
        ) : (
          <PendingBadge s={pend} size={46} />
        )}
      </Abs>
      {/* retry log */}
      <Abs
        x={100}
        y={720}
        w={880}
        style={{
          ...cardStyle,
          border: `1.5px solid ${C.purple}88`,
          padding: "22px 28px",
          opacity: clamp(r1) * fade,
          transform: `translateY(${(1 - r1) * 40}px)`,
        }}
      >
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 22, color: C.mute, letterSpacing: 2, marginBottom: 14 }}>NPCI REQUEST LOG</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: MONO, fontSize: 28, fontWeight: 700, color: C.text }}>
          <span style={{ color: C.mute }}>#1</span>
          <span style={{ color: C.purple }}>{TXN}</span>
          <span style={{ color: C.green }}>→ debited</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginTop: 12,
            fontFamily: MONO,
            fontSize: 28,
            fontWeight: 700,
            color: C.text,
            opacity: clamp(r2),
            transform: `translateX(${(1 - r2) * 60}px)`,
          }}
        >
          <span style={{ color: C.mute }}>#2</span>
          <span style={{ color: C.purple }}>{TXN}</span>
          {frame < F("bachata") ? (
            <span style={{ color: AMBER }}>retry…</span>
          ) : (
            <span style={{ color: C.green, opacity: clamp(ignored) }}>→ same ID, skip ✓</span>
          )}
        </div>
        <div style={{ marginTop: 18, display: "flex", gap: 20, alignItems: "center", opacity: prog(frame, dbl - 2, 8) }}>
          <span style={{ position: "relative", fontFamily: SANS, fontWeight: 800, fontSize: 32, color: dblStrike > 0.5 ? C.mute : "#FFD7DC" }}>
            −₹500 −₹500 double charge
            <Strike p={dblStrike} />
          </span>
          <span style={{ fontFamily: SANS, fontWeight: 900, fontSize: 32, color: C.green, opacity: dblStrike }}>→ sirf 1 baar</span>
        </div>
      </Abs>
      {/* idempotency */}
      <Abs x={100} y={1080} w={880} style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: clamp(idem), transform: `scale(${0.5 + 0.5 * idem})` }}>
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 900,
            fontSize: 72,
            color: C.bg,
            background: C.green,
            padding: "16px 50px",
            borderRadius: 24,
            boxShadow: `0 0 50px ${C.green}99`,
          }}
        >
          IDEMPOTENCY
        </div>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 28, color: "#CFFBE6", marginTop: 18, opacity: prog(frame, F("idempotency") + 14, 10) }}>
          same request × N = same result
        </div>
      </Abs>
    </>
  );
};

/* ───────────── Scene 7: resolution + punchline ───────────── */
const LEDGER = ["UPI4F7A9C21E", "UPI91B0D3F27", "UPI0C55E8A14", "UPI7D2A61B90", "UPI3E9F04C58", "UPIB81C7E263"];
const Scene7: React.FC = () => {
  const frame = useCurrentFrame();
  const head = useSpr(SCENES[6] + 2);
  const ok = useSpr(F("pahunch"), { damping: 10, stiffness: 160 });
  const ya = prog(frame, F("ya", 2), 8);
  const ref = useSpr(F("refund") - 4, { damping: 10, stiffness: 160 });
  const hindi = F("Har din");
  const fadeTop = 1 - 0.6 * prog(frame, hindi, 10);
  const count = prog(frame, F("saath"), 40, Easing.out(Easing.cubic));
  const counter = useSpr(hindi);
  const ledger = useSpr(F("poora") - 6);
  const pulse = 0.5 + 0.5 * Math.sin(frame / 7);
  const scroll = (frame * 1.4) % 64;
  return (
    <>
      <Abs x={100} y={270} w={880} style={{ display: "flex", justifyContent: "center", opacity: head * fadeTop, transform: `translateY(${(1 - head) * 30}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontFamily: SANS, fontWeight: 900, fontSize: 52, color: C.text }}>
          <Spinner size={52} color={C.cyan} /> Status check…
        </div>
      </Abs>
      <Abs x={100} y={380} w={880} h={170} style={{ display: "flex", alignItems: "center", gap: 20, opacity: fadeTop }}>
        <div
          style={{
            ...cardStyle,
            flex: 1,
            height: 170,
            border: `2px solid ${C.green}`,
            background: "#0c2a24",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: clamp(ok),
            transform: `scale(${0.6 + 0.4 * ok})`,
            boxShadow: `0 0 30px ${C.green}55`,
          }}
        >
          <div style={{ fontSize: 50 }}>✅</div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 30, color: "#D4FBE9" }}>Chai wale ko mila</div>
        </div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 32, color: C.mute, opacity: ya }}>ya</div>
        <div
          style={{
            ...cardStyle,
            flex: 1,
            height: 170,
            border: `2px solid ${C.cyan}`,
            background: "#0F2236",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: clamp(ref),
            transform: `scale(${0.6 + 0.4 * ref})`,
            boxShadow: `0 0 30px ${C.cyan}55`,
          }}
        >
          <div style={{ fontSize: 50 }}>↩️</div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 30, color: "#D6F0FF" }}>Auto refund ₹500</div>
        </div>
      </Abs>
      {/* counter */}
      <Abs
        x={100}
        y={620}
        w={880}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: clamp(counter), transform: `scale(${0.7 + 0.3 * counter})` }}
      >
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 28, color: C.mute, letterSpacing: 3 }}>EVERY SINGLE DAY</div>
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 900,
            fontSize: 150,
            color: C.green,
            lineHeight: 1.05,
            textShadow: `0 0 ${30 + 30 * pulse}px ${C.green}88`,
          }}
        >
          {Math.round(60 * count)} Cr+
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 38, color: C.text }}>UPI transactions</div>
      </Abs>
      {/* ledger */}
      <Abs
        x={100}
        y={980}
        w={880}
        h={360}
        style={{
          ...cardStyle,
          border: `2px solid ${C.green}`,
          overflow: "hidden",
          opacity: clamp(ledger),
          transform: `translateY(${(1 - ledger) * 60}px)`,
          boxShadow: `0 0 ${(30 + 30 * pulse) * clamp(ledger)}px ${C.green}55`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 70,
            background: "#0c2a24",
            borderBottom: `1px solid ${C.green}66`,
            display: "flex",
            alignItems: "center",
            padding: "0 28px",
            fontFamily: MONO,
            fontWeight: 800,
            fontSize: 26,
            color: C.green,
            letterSpacing: 2,
            zIndex: 1,
          }}
        >
          📒 LEDGER · har ek ka hisaab
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 70 - scroll }}>
          {[...LEDGER, ...LEDGER].map((id, i) => (
            <div
              key={i}
              style={{
                height: 64,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 28px",
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: 28,
                color: C.text,
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <span style={{ color: C.purple }}>{id}</span>
              <span style={{ color: i % 6 === 2 ? C.cyan : C.green }}>{i % 6 === 2 ? "refunded ↩" : "settled ✓"}</span>
            </div>
          ))}
        </div>
      </Abs>
    </>
  );
};

/* ───────────── root ───────────── */
const SCENE_COMPONENTS = [Scene1, Scene2, Scene3, Scene4, Scene5, Scene6, Scene7];

export const UpiReel: React.FC = () => (
  <Sequence from={0} durationInFrames={DURATION}>
    <Audio src={staticFile("upi/voiceover.mp3")} />
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <Background />
      <Header bounds={SCENES} label="SYSTEM DESIGN" />
      {SCENE_COMPONENTS.map((S, i) => (
        <Scene key={i} from={SCENES[i]} to={SCENES[i + 1]} first={i === 0} last={i === SCENE_COMPONENTS.length - 1}>
          <S />
        </Scene>
      ))}
      <StylishCaptions src="upi/captions.json" keywords={KEYWORDS} />
    </AbsoluteFill>
  </Sequence>
);
