import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { StylishCaptions } from "../kit/StylishCaptions";
import { popCues, sceneCues, SfxCue, SoundEffects } from "../kit/SoundEffects";
import {
  Abs,
  Background,
  C,
  ChipGlyph,
  Cylinder,
  Header,
  MONO,
  Padlock,
  SANS,
  Scene,
  Tag,
  cardStyle,
  clamp,
  prog,
  useSpr,
} from "../kit/ui";

/* ───────────── Scene 1 ───────────── */
const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const chat = useSpr(15);
  const warn = useSpr(136, { damping: 10, stiffness: 150 });
  const badge = useSpr(252, { damping: 9, stiffness: 170 });
  const typing = frame >= 75 && frame < 136;
  const pulse = (i: number) => 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((frame - 75) / 4 - i * 1.1));
  return (
    <>
      <Abs
        x={100}
        y={290}
        w={880}
        style={{
          ...cardStyle,
          padding: 32,
          opacity: chat,
          transform: `translateX(${(1 - chat) * -160}px)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: MONO,
            fontSize: 22,
            color: C.mute,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              background: C.green,
              boxShadow: `0 0 10px ${C.green}`,
            }}
          />
          ai-assistant · chat
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div
            style={{
              background: `${C.cyan}1c`,
              border: `1px solid ${C.cyan}66`,
              borderRadius: 20,
              borderBottomRightRadius: 6,
              padding: "20px 26px",
              fontFamily: SANS,
              fontWeight: 600,
              fontSize: 34,
              color: C.text,
              maxWidth: 680,
            }}
          >
            Kal ki sales report ka total kya tha?
          </div>
        </div>
        <div style={{ height: 96, marginTop: 24, display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              background: `${C.purple}33`,
              border: `1px solid ${C.purple}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
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
                <div
                  key={i}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    background: C.cyan,
                    opacity: pulse(i),
                    transform: `translateY(${-6 * (pulse(i) - 0.35)}px)`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </Abs>
      <Abs
        x={100}
        y={640}
        w={880}
        style={{
          ...cardStyle,
          border: `2px solid ${C.red}`,
          background: "#2a1118",
          padding: "34px 32px",
          opacity: warn,
          transform: `scale(${0.7 + 0.3 * warn})`,
          boxShadow: `0 0 ${40 * warn}px ${C.red}55`,
        }}
      >
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 38, color: "#FFD7DC", lineHeight: 1.3 }}>
          ⚠️ Hallucination: ₹42.8 Cr
          <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 28, color: C.red, marginTop: 8 }}>
            (Invented Data)
          </div>
        </div>
      </Abs>
      <Abs
        x={100}
        y={900}
        w={880}
        style={{
          display: "flex",
          justifyContent: "center",
          opacity: badge,
          transform: `scale(${0.5 + 0.5 * badge})`,
        }}
      >
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 900,
            fontSize: 66,
            color: C.bg,
            background: C.cyan,
            padding: "20px 54px",
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

/* ───────────── Scene 2 ───────────── */
const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useSpr(255);
  const box = useSpr(262);
  const pills = [
    { t: "Private PDFs", y: 560, side: -1 },
    { t: "Company Docs", y: 780, side: 1 },
    { t: "New Data", y: 1000, side: -1 },
  ];
  const cx = 540,
    cy = 760,
    half = 200,
    pw = 240;
  const shake = pills.reduce((acc, _p, i) => {
    const t = frame - (477 + i * 16 + 22);
    return t > 0 && t < 10 ? acc + Math.sin(t * 2.5) * (10 - t) * 0.8 : acc;
  }, 0);
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
          fontSize: 64,
          color: C.text,
          opacity: title,
          transform: `translateY(${(1 - title) * 40}px)`,
        }}
      >
        <span style={{ color: C.cyan }}>LLM</span> = Closed-Book Exam
      </Abs>
      <Abs
        x={cx - half}
        y={cy - half}
        w={half * 2}
        h={half * 2}
        style={{
          border: `3px dashed ${C.red}`,
          borderRadius: 28,
          background: `${C.red}0d`,
          opacity: box,
          transform: `scale(${0.8 + 0.2 * box}) translateX(${shake}px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 40px ${C.red}22`,
        }}
      >
        <ChipGlyph size={210} />
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 36, color: C.cyan, letterSpacing: 4, marginTop: 4 }}>
          LLM
        </div>
      </Abs>
      <Abs x={cx - 45} y={cy + half - 45} style={{ opacity: box, transform: `scale(${box})` }}>
        <div style={{ background: C.bg, borderRadius: 50, padding: 4 }}>
          <Padlock size={82} open={0} color={C.red} />
        </div>
      </Abs>
      {pills.map((p, i) => {
        const t = frame - (477 + i * 16);
        if (t < 0) return null;
        const contact = p.side === -1 ? cx - half - pw / 2 - 6 : cx + half + pw / 2 + 6;
        const startX = contact + p.side * -1 * 330;
        let x: number;
        if (t < 22)
          x = interpolate(t, [0, 22], [startX, contact], { easing: Easing.in(Easing.quad) });
        else
          x = interpolate(t, [22, 52], [contact, contact + p.side * -1 * 70], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
        const float = t > 52 ? Math.sin((frame + i * 20) / 12) * 6 : 0;
        const op = clamp(t / 6);
        const hit = t - 22;
        const xs = hit > 0 ? clamp(hit / 18) : 0;
        return (
          <React.Fragment key={i}>
            <Abs x={x - pw / 2} y={p.y - 32 + float} w={pw} style={{ opacity: op }}>
              <div
                style={{
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: 25,
                  color: C.text,
                  background: C.card,
                  border: `1px solid ${C.cyan}88`,
                  borderRadius: 999,
                  padding: "14px 0",
                  textAlign: "center",
                  boxShadow: `0 0 20px ${C.cyan}33`,
                }}
              >
                📄 {p.t}
              </div>
            </Abs>
            {hit > 0 && (
              <Abs
                x={(p.side === -1 ? cx - half : cx + half) - 40}
                y={p.y - 40}
                style={{ opacity: 1 - xs, transform: `scale(${0.6 + xs * 1.4})` }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    background: `${C.red}33`,
                    border: `3px solid ${C.red}`,
                    color: C.red,
                    fontSize: 48,
                    fontWeight: 900,
                    fontFamily: SANS,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 0 30px ${C.red}`,
                  }}
                >
                  ✕
                </div>
              </Abs>
            )}
          </React.Fragment>
        );
      })}
      <Abs
        x={100}
        y={1130}
        w={880}
        style={{
          textAlign: "center",
          fontFamily: MONO,
          fontSize: 28,
          color: C.mute,
          opacity: prog(frame, 492, 20),
        }}
      >
        Knows only its training data. Nothing new gets in.
      </Abs>
    </>
  );
};

/* ───────────── Scene 3 ───────────── */
const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const snap = useSpr(585, { damping: 8, stiffness: 200 });
  const lockColor = snap > 0.35 ? C.green : C.red;
  const items = [
    { k: "R", t: "Retrieval", c: C.cyan },
    { k: "A", t: "Augmented", c: C.purple },
    { k: "G", t: "Generation", c: C.green },
  ];
  const morph = prog(frame, 830, 14);
  const bannerIn = useSpr(745);
  const bannerPop = useSpr(830, { damping: 9, stiffness: 160 });
  return (
    <>
      <Abs
        x={100}
        y={280}
        w={880}
        style={{
          textAlign: "center",
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: 60,
          color: C.text,
          opacity: prog(frame, 589, 12),
        }}
      >
        Enter <span style={{ color: C.green }}>RAG</span> 🔓
      </Abs>
      <Abs
        x={340}
        y={400}
        w={400}
        h={400}
        style={{
          border: `3px dashed ${snap > 0.3 ? C.green : C.red}`,
          borderRadius: 28,
          background: `${C.green}0d`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 ${50 * clamp(snap)}px ${C.green}44`,
        }}
      >
        <ChipGlyph size={180} color={snap > 0.3 ? C.green : C.cyan} />
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 32, color: C.cyan, letterSpacing: 4 }}>
          LLM
        </div>
      </Abs>
      <Abs x={495} y={755} style={{ transform: `scale(${1 + 0.25 * Math.sin(clamp(snap) * Math.PI)})` }}>
        <div style={{ background: C.bg, borderRadius: 50, padding: 4 }}>
          <Padlock size={90} open={clamp(snap)} color={lockColor} />
        </div>
      </Abs>
      {items.map((it, i) => {
        const s = spring({
          frame: frame - (656 + i * 18),
          fps: 30,
          config: { damping: 13, stiffness: 140 },
        });
        return (
          <Abs
            key={i}
            x={190}
            y={880 + i * 82}
            w={700}
            style={{
              ...cardStyle,
              height: 68,
              border: `1.5px solid ${it.c}`,
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "0 20px",
              opacity: s,
              transform: `translateX(${(1 - s) * 120}px) scale(${0.9 + 0.1 * s})`,
              boxShadow: `0 0 22px ${it.c}33`,
              borderRadius: 18,
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: `${it.c}22`,
                border: `1px solid ${it.c}`,
                color: it.c,
                fontFamily: MONO,
                fontWeight: 800,
                fontSize: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {it.k}
            </div>
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 34, color: C.text }}>
              <span style={{ color: it.c, fontFamily: MONO }}>[{it.k}]</span> {it.t}
            </div>
          </Abs>
        );
      })}
      <Abs
        x={100}
        y={1170}
        w={880}
        style={{
          display: "flex",
          justifyContent: "center",
          opacity: bannerIn,
          transform: `translateY(${(1 - bannerIn) * 30}px)`,
        }}
      >
        <div
          style={{
            minWidth: 700,
            textAlign: "center",
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 38,
            padding: "24px 40px",
            borderRadius: morph > 0 ? 999 : 20,
            color: morph > 0.5 ? "#04281d" : C.mute,
            background: morph > 0.5 ? C.green : C.card,
            border: `1.5px solid ${morph > 0.5 ? C.green : C.border}`,
            boxShadow: `0 0 ${60 * morph}px ${C.green}${morph > 0 ? "aa" : "00"}`,
            transform: `scale(${frame >= 830 ? 1 + 0.06 * Math.sin(clamp(bannerPop) * Math.PI) : 1})`,
          }}
        >
          {morph > 0.5 ? "RAG = Open-Book Exam 📖" : "Give the LLM the right documents"}
        </div>
      </Abs>
    </>
  );
};

/* ───────────── Scene 4 ───────────── */
const Scene4: React.FC = () => {
  const frame = useCurrentFrame();
  const srcs = [
    { t: "PDFs", e: "📄", y: 390 },
    { t: "Docs", e: "📝", y: 550 },
    { t: "Databases", e: "🗄️", y: 710 },
  ];
  const dbX = 740,
    dbW = 240,
    dbY = 410,
    dbH = 380;
  const split = useSpr(997);
  const dbIn = useSpr(840);
  const stored = [0, 1, 2, 3, 4, 5].filter((k) => frame >= 1031 + k * 8 + 40).length;
  const arrowOp = prog(frame, 1031, 15);
  return (
    <>
      <Tag text="PHASE 1: INDEXING" at={825} />
      {srcs.map((s, i) => {
        const a = spring({ frame: frame - (835 + i * 8), fps: 30, config: { damping: 14 } });
        const dim = prog(frame, 997, 20);
        return (
          <Abs
            key={i}
            x={100}
            y={s.y}
            w={240}
            h={110}
            style={{
              ...cardStyle,
              opacity: a * (1 - 0.55 * dim),
              transform: `translateX(${(1 - a) * -80}px)`,
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "0 20px",
            }}
          >
            <div style={{ fontSize: 40 }}>{s.e}</div>
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 26, color: C.text }}>{s.t}</div>
          </Abs>
        );
      })}
      {srcs.map((s, i) =>
        [0, 1].map((j) => {
          const k = i * 2 + j;
          const sx = 370 + j * 90,
            sy = s.y + 34;
          const t = frame - (1031 + k * 8);
          const travel = clamp(t / 40);
          const e = Easing.inOut(Easing.cubic)(travel);
          const tx = dbX + dbW / 2 - 36,
            ty = dbY + 120 + k * 34;
          const x = interpolate(e, [0, 1], [sx, tx]);
          const y = interpolate(e, [0, 1], [sy, ty]);
          const appear = spring({
            frame: frame - (997 + k * 5),
            fps: 30,
            config: { damping: 11, stiffness: 150 },
          });
          const op = clamp(appear) * (travel >= 1 ? 0 : 1);
          if (frame < 997 || op <= 0) return null;
          return (
            <Abs
              key={k}
              x={x}
              y={y}
              w={72}
              h={42}
              style={{
                background: `${C.cyan}28`,
                border: `1.5px solid ${C.cyan}`,
                borderRadius: 8,
                boxShadow: `0 0 16px ${C.cyan}88`,
                opacity: op,
                transform: `scale(${(0.4 + 0.6 * appear) * (1 - 0.25 * e)})`,
              }}
            >
              <div style={{ margin: "10px 10px 0", height: 5, borderRadius: 3, background: C.cyan, opacity: 0.8 }} />
              <div style={{ margin: "7px 10px 0", height: 5, width: "55%", borderRadius: 3, background: C.cyan, opacity: 0.5 }} />
            </Abs>
          );
        }),
      )}
      <Abs
        x={360}
        y={830}
        w={200}
        style={{
          textAlign: "center",
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 26,
          color: C.cyan,
          opacity: clamp(split) * prog(frame, 997, 10) * (1 - prog(frame, 1080, 20)),
        }}
      >
        ✂️ Chunks
      </Abs>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: arrowOp }}>
        <defs>
          <marker id="ah" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" fill={C.cyan} />
          </marker>
        </defs>
        {srcs.map((s, i) => (
          <path
            key={i}
            d={`M560 ${s.y + 55} C 640 ${s.y + 55}, 650 ${dbY + dbH / 2}, ${dbX - 6} ${dbY + dbH / 2 + (i - 1) * 40}`}
            fill="none"
            stroke={C.cyan}
            strokeWidth={3}
            strokeDasharray="12 10"
            strokeDashoffset={-(frame - 1031) * 2.2}
            markerEnd="url(#ah)"
            style={{ filter: `drop-shadow(0 0 6px ${C.cyan})` }}
          />
        ))}
      </svg>
      <Abs x={dbX} y={dbY} w={dbW} h={dbH} style={{ opacity: dbIn, transform: `scale(${0.85 + 0.15 * dbIn})` }}>
        <Cylinder w={dbW} h={dbH} glow={0.4 + 0.6 * clamp(stored / 6)} />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 110,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            alignItems: "center",
          }}
        >
          {Array.from({ length: 6 }).map((_, k) => (
            <div
              key={k}
              style={{
                width: 130,
                height: 26,
                borderRadius: 6,
                background: `${C.cyan}${k < stored ? "30" : "0a"}`,
                border: `1px solid ${C.cyan}${k < stored ? "cc" : "33"}`,
                boxShadow: k < stored ? `0 0 10px ${C.cyan}66` : undefined,
              }}
            />
          ))}
        </div>
      </Abs>
      <Abs x={700} y={dbY + dbH + 24} w={320} style={{ textAlign: "center", opacity: dbIn }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 30, color: C.text }}>Vector Database</div>
        <div style={{ fontFamily: MONO, fontSize: 22, color: C.cyan, marginTop: 6 }}>(AI's Personal Library)</div>
      </Abs>
    </>
  );
};

/* ───────────── Scene 5 ───────────── */
const DBCHUNKS: { t: string; hit?: boolean }[] = [
  { t: "HR policy" },
  { t: "Sales Q3: ₹18.4 Cr", hit: true },
  { t: "Office FAQ" },
  { t: "Vendor list" },
  { t: "Q2 targets" },
  { t: "Daily Rpt: 12 Nov", hit: true },
];
const Scene5: React.FC = () => {
  const frame = useCurrentFrame();
  const q = useSpr(1155);
  const box = useSpr(1395, { damping: 12, stiffness: 130 });
  const dbIn = useSpr(1165);
  const out = useSpr(1472, { damping: 10, stiffness: 150 });
  const llm = useSpr(1380);

  const beam = prog(frame, 1205, 28, Easing.inOut(Easing.quad));
  const beamFade = 1 - prog(frame, 1259, 12);
  const dbX = 100,
    dbY = 600,
    dbW = 700,
    dbH = 250;
  const cx0 = 130,
    cy0 = 665;
  const slot = [
    { x: 130, y: 438 },
    { x: 550, y: 438 },
  ];
  const feed = prog(frame, 1417, 30, Easing.inOut(Easing.cubic));
  const llmGlow = prog(frame, 1440, 12) * (frame < 1472 ? 1 : 0.6 + 0.4 * Math.sin(frame / 6));
  const feedPath = "M890 530 V 940 Q 890 990 840 990 H 700";
  return (
    <>
      <Tag text="PHASE 2: RETRIEVE & GENERATE" at={1155} y={190} />
      <Abs
        x={100}
        y={286}
        w={880}
        h={246}
        style={{
          border: `2px solid ${C.green}`,
          borderRadius: 24,
          background: `${C.green}0e`,
          opacity: box,
          transform: `scale(${0.95 + 0.05 * box})`,
          boxShadow: `0 0 ${40 * box}px ${C.green}44`,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -17,
            left: 28,
            background: C.bg,
            padding: "0 12px",
            fontFamily: MONO,
            fontWeight: 800,
            fontSize: 22,
            color: C.green,
          }}
        >
          Augmented Prompt (Query + Context)
        </div>
      </Abs>
      <Abs
        x={130}
        y={332}
        w={820}
        h={90}
        style={{
          ...cardStyle,
          border: `1.5px solid ${C.cyan}`,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "0 26px",
          opacity: q,
          transform: `translateY(${(1 - q) * -40}px)`,
          boxShadow: `0 0 20px ${C.cyan}33`,
        }}
      >
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 22, color: C.cyan }}>USER QUERY</div>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 26, color: C.text }}>
          "Kal ki sales report ka total?"
        </div>
      </Abs>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: beamFade }}>
        <defs>
          <linearGradient id="bm" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.cyan} stopOpacity="0" />
            <stop offset="1" stopColor={C.cyan} stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect
          x={438}
          y={422}
          width={24}
          height={Math.max(0, (dbY - 422) * beam)}
          fill="url(#bm)"
          rx={12}
          style={{ filter: `drop-shadow(0 0 12px ${C.cyan})` }}
        />
        <circle
          cx={450}
          cy={422 + (dbY - 422) * beam}
          r={beam > 0 ? 14 : 0}
          fill="#fff"
          style={{ filter: `drop-shadow(0 0 14px ${C.cyan})` }}
        />
      </svg>
      <Abs
        x={480}
        y={470}
        style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22, color: C.cyan, opacity: beam * beamFade }}
      >
        🔍 semantic search
      </Abs>
      <Abs x={dbX} y={dbY} w={dbW} h={dbH} style={{ opacity: dbIn, transform: `scale(${0.9 + 0.1 * dbIn})` }}>
        <Cylinder w={dbW} h={dbH} glow={0.5} />
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 22,
            color: C.text,
            letterSpacing: 1,
          }}
        >
          Vector Database
        </div>
      </Abs>
      {DBCHUNKS.map((c, i) => {
        const col = i % 3,
          row = Math.floor(i / 3);
        const x = cx0 + col * 220,
          y = cy0 + row * 74;
        const hitIdx = DBCHUNKS.filter((d, j) => d.hit && j < i).length;
        const lit = c.hit ? prog(frame, 1259, 15) : 0;
        const ex = c.hit ? Easing.inOut(Easing.cubic)(prog(frame, 1286, 50, Easing.linear)) : 0;
        const tx = c.hit ? slot[hitIdx].x : x,
          ty = c.hit ? slot[hitIdx].y : y;
        const px = interpolate(ex, [0, 1], [x, tx]);
        const py = interpolate(ex, [0, 1], [y, ty]);
        const w = interpolate(ex, [0, 1], [200, 380]);
        const h = interpolate(ex, [0, 1], [54, 72]);
        const faded = c.hit && ex > 0;
        return (
          <React.Fragment key={i}>
            <Abs
              x={x}
              y={y}
              w={200}
              h={54}
              style={{
                opacity: dbIn * (faded ? 0.25 : 1),
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: MONO,
                fontSize: 18,
                color: C.mute,
              }}
            >
              {c.t}
            </Abs>
            {c.hit && frame >= 1259 && (
              <Abs
                x={px}
                y={py}
                w={w}
                h={h}
                style={{
                  background: `${C.green}26`,
                  border: `2px solid ${C.green}`,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: interpolate(ex, [0, 1], [18, 24]),
                  color: "#B8F5DD",
                  boxShadow: `0 0 ${24 * lit}px ${C.green}`,
                  opacity: lit,
                }}
              >
                {c.t}
              </Abs>
            )}
          </React.Fragment>
        );
      })}
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: box }}>
        <path d={feedPath} fill="none" stroke={C.border} strokeWidth={3} strokeDasharray="10 8" />
        <path
          d={feedPath}
          fill="none"
          stroke={C.green}
          strokeWidth={5}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={`${feed} 2`}
          style={{ filter: `drop-shadow(0 0 10px ${C.green})` }}
        />
      </svg>
      <Abs
        x={400}
        y={910}
        w={300}
        h={160}
        style={{
          ...cardStyle,
          border: `2px solid ${C.cyan}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          opacity: llm,
          transform: `scale(${0.85 + 0.15 * llm})`,
          boxShadow: `0 0 ${50 * llmGlow}px ${C.cyan}`,
        }}
      >
        <ChipGlyph size={96} glow={0.5 + llmGlow} />
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 38, color: C.cyan }}>LLM</div>
      </Abs>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: out }}>
        <path d="M550 1076 V 1150" stroke={C.green} strokeWidth={4} strokeDasharray="10 8" strokeDashoffset={-frame * 2} />
      </svg>
      <Abs
        x={100}
        y={1160}
        w={880}
        h={150}
        style={{
          ...cardStyle,
          border: `2px solid ${C.green}`,
          background: "#0c2a24",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 30px",
          opacity: clamp(out),
          transform: `scale(${0.7 + 0.3 * out})`,
          boxShadow: `0 0 ${44 * clamp(out)}px ${C.green}66`,
        }}
      >
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 36, color: "#CFFBE6", lineHeight: 1.3 }}>
          ✅ Exact Answer: ₹18.4 Cr
          <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 26, color: C.green, marginTop: 4 }}>
            (Verified Source)
          </div>
        </div>
      </Abs>
    </>
  );
};

/* ───────────── Scene 6 ───────────── */
const StrikeCard: React.FC<{ at: number; strikeAt: number; text: string; y: number }> = ({
  at,
  strikeAt,
  text,
  y,
}) => {
  const frame = useCurrentFrame();
  const s = useSpr(at);
  const strike = prog(frame, strikeAt, 14);
  return (
    <Abs
      x={100}
      y={y}
      w={880}
      h={130}
      style={{
        ...cardStyle,
        display: "flex",
        alignItems: "center",
        padding: "0 40px",
        opacity: clamp(s),
        transform: `translateX(${(1 - s) * 140}px)`,
        borderColor: `${C.red}${strike > 0 ? "99" : "55"}`,
      }}
    >
      <span
        style={{
          position: "relative",
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: 40,
          color: strike > 0.5 ? C.mute : C.text,
        }}
      >
        {text}
        <span
          style={{
            position: "absolute",
            left: -6,
            top: "54%",
            height: 6,
            width: `${strike * 104}%`,
            background: C.red,
            borderRadius: 3,
            boxShadow: `0 0 14px ${C.red}`,
          }}
        />
      </span>
    </Abs>
  );
};
const Scene6: React.FC = () => {
  const frame = useCurrentFrame();
  const hero = useSpr(1709, { damping: 10, stiffness: 110 });
  const pulse = frame >= 1735 ? 0.5 + 0.5 * Math.sin((frame - 1735) / 7) : 0.6;
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
          fontSize: 56,
          color: C.text,
          opacity: prog(frame, 1578, 14),
        }}
      >
        Why <span style={{ color: C.green }}>RAG</span> wins
      </Abs>
      <StrikeCard at={1578} strikeAt={1606} text="❌ Expensive Model Re-Training" y={390} />
      <StrikeCard at={1657} strikeAt={1672} text="❌ Hallucination Risk" y={560} />
      <Abs
        x={100}
        y={780}
        w={880}
        h={300}
        style={{
          ...cardStyle,
          border: `3px solid ${C.green}`,
          background: "#0c2a24",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          textAlign: "center",
          opacity: clamp(hero * 1.5),
          transform: `scale(${0.55 + 0.45 * hero})`,
          boxShadow: `0 0 ${(40 + 50 * pulse) * clamp(hero)}px ${C.green}${pulse > 0.5 ? "aa" : "77"}`,
        }}
      >
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 56, color: "#D4FBE9", lineHeight: 1.2 }}>
          ✅ Right Context
          <br />= AI Expert
        </div>
        <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 24, color: C.green }}>
          Retrieve → Augment → Generate
        </div>
      </Abs>
    </>
  );
};

/* ───────────── root ───────────── */
export const DURATION = 1934; // public/rag/voiceover.mp3 = 64.44s @30fps
const KEYWORDS = ["RAG", "LLM", "Vector Database", "Closed-Book", "Open-Book", "Hallucination"];

// S = frame the scene's animations were authored at, R = real frame it starts at
// (re-timed to the actual voiceover), END = real frame it ends.
const SCENES = [
  { S: 0, R: 0, END: 270, C: Scene1 },
  { S: 255, R: 270, END: 596, C: Scene2 },
  { S: 585, R: 596, END: 895, C: Scene3 },
  { S: 825, R: 895, END: 1268, C: Scene4 },
  { S: 1155, R: 1268, END: 1691, C: Scene5 },
  { S: 1575, R: 1691, END: DURATION, C: Scene6 },
];

// ---- Sound effects (real frames = authored frame + R - S of that scene) ----
const real = (scene: number, authored: number) => authored + SCENES[scene].R - SCENES[scene].S;
const CUTS = sceneCues([...SCENES.map((s) => s.R), DURATION]);
const ACCENTS: SfxCue[] = [
  { at: real(0, 136), sound: "pop-hard" }, // hallucination warning
  { at: real(0, 252), sound: "impact-zoom", volume: 0.8 }, // "Closed-Book Exam" badge
  { at: real(2, 745), sound: "swoosh-accent" }, // open-book banner slides in
  { at: real(2, 830), sound: "pop-hard" }, // banner pops
  { at: real(3, 997), sound: "tech-slide", volume: 1.3 }, // docs split into chunks
  { at: real(4, 1205), sound: "tech-slide", volume: 1.3 }, // search beam sweeps the DB
  { at: real(4, 1417), sound: "sweep-short", volume: 1.3 }, // chunks feed into the LLM
  { at: real(4, 1472), sound: "pop-hard" }, // grounded answer
  { at: real(5, 1606), sound: "click-ui", volume: 1.2 }, // strike: re-training
  { at: real(5, 1672), sound: "click-ui", volume: 1.2 }, // strike: hallucination
  { at: real(5, 1709) + 4, sound: "riser-short", volume: 0.8 }, // build into the hero card
  { at: real(5, 1709) + 4, sound: "impact-zoom" },
];
export const SFX: SfxCue[] = [
  ...CUTS,
  ...ACCENTS,
  ...popCues(
    [
      real(0, 15), // chat card
      ...[0, 1, 2].map((i) => real(1, 477 + i * 16)), // private PDFs / docs / new data
      ...[0, 1, 2].map((i) => real(2, 656 + i * 18)), // R, A, G
      ...[0, 2, 4].map((k) => real(3, 1031 + k * 8 + 40)), // chunks stored
      real(4, 1259), // matching chunks light up
      real(4, 1395), // prompt box
      real(5, 1657), // second strike card
    ],
    { avoid: [...CUTS, ...ACCENTS] },
  ),
];

export const RagReel: React.FC = () => {
  return (
    <Sequence from={0} durationInFrames={DURATION}>
      <Audio src={staticFile("rag/voiceover.mp3")} />
      <SoundEffects cues={SFX} />
      <AbsoluteFill style={{ backgroundColor: C.bg }}>
        <Background />
        <Header bounds={[...SCENES.map((s) => s.R), DURATION]} />
        {SCENES.map(({ S, R, END, C: Comp }, i) => (
          <Sequence key={i} from={R - S} layout="none">
            <Scene from={S} to={S + (END - R)} first={i === 0} last={END === DURATION}>
              <Comp />
            </Scene>
          </Sequence>
        ))}
        <StylishCaptions src="rag/captions.json" keywords={KEYWORDS} />
      </AbsoluteFill>
    </Sequence>
  );
};
