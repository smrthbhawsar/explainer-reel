#!/usr/bin/env node
/**
 * Word-level forced alignment WITHOUT speech recognition.
 *
 * Detects pauses in the voiceover (ffmpeg silencedetect via `npx remotion ffmpeg`),
 * then fits the known script words onto the speech between those pauses with a
 * dynamic program: pauses must land on word boundaries (preferably punctuation),
 * and each speech stretch must match the syllable count of its words at a global
 * speaking rate. Words inside a stretch are timed by syllable share.
 *
 * Usage:
 *   node align.cjs --script public/<slug>/script.txt --audio public/<slug>/voiceover.mp3 --out public/<slug>
 *
 * Writes:  <out>/captions.json  (Remotion Caption[], one entry per word)
 *          <out>/captions.srt   (one cue per sentence, re-timed)
 * Prints:  duration, frame count @30fps, and the start time of every sentence.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith("--") ? [...acc, [a.slice(2), arr[i + 1]]] : acc), []),
);
if (!args.script || !args.audio || !args.out) {
  console.error("usage: node align.cjs --script <script.txt> --audio <voiceover.mp3> --out <dir> [--fps 30]");
  process.exit(1);
}
const FPS = Number(args.fps || 30);

/* ---------- 1. audio analysis ---------- */
// ffmpeg writes its log to stderr; merge it into stdout.
const log = (() => {
  const cmd = `npx remotion ffmpeg -hide_banner -i "${args.audio}" -af silencedetect=noise=-32dB:d=0.1 -f null - 2>&1`;
  try {
    return execSync(cmd, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    return String(e.stdout || "") + String(e.stderr || "");
  }
})();
const dur = (() => {
  const m = log.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const t = log.match(/time=(\d+):(\d+):([\d.]+)/g);
  const parse = (h, mi, s) => +h * 3600 + +mi * 60 + +s;
  if (t && t.length) {
    const last = t[t.length - 1].match(/(\d+):(\d+):([\d.]+)/);
    return parse(last[1], last[2], last[3]);
  }
  return m ? parse(m[1], m[2], m[3]) : NaN;
})();
const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
let gaps = starts.map((s, i) => [s, ends[i] ?? dur]);

let speechStart = 0.0;
let speechEnd = dur;
if (gaps.length && gaps[0][0] < 0.05) speechStart = gaps.shift()[1];
if (gaps.length && gaps[gaps.length - 1][1] >= dur - 0.05) speechEnd = gaps.pop()[0];

/* ---------- 2. script → words ---------- */
const text = fs.readFileSync(args.script, "utf8").replace(/\r/g, "");
// Cues = sentences (split on . ? ! and blank lines). Used for the .srt only.
const cues = text
  .split(/\n\s*\n|(?<=[.?!])\s+/)
  .map((c) => c.replace(/\s+/g, " ").trim())
  .filter(Boolean);

const SPECIAL = { chatgpt: 4, ai: 2, api: 3, apis: 3, "re-train": 2, gpu: 3, gpus: 3, ui: 2, www: 9 };
const syl = (w) => {
  const bare = w.replace(/[^A-Za-z0-9-]/g, "");
  const k = bare.toLowerCase();
  if (SPECIAL[k]) return SPECIAL[k];
  // hyphenated compounds (USB-C, Wi-Fi, re-rank): count each part on its own
  if (bare.includes("-") && bare.split("-").every(Boolean)) return bare.split("-").reduce((a, p) => a + syl(p), 0);
  if (/^[A-Z0-9]{2,6}s?$/.test(bare)) return bare.replace(/s$/, "").length; // acronyms spelled out: LLM, RAG, PDF
  if (/^\d+$/.test(bare)) return Math.max(1, bare.length);
  return Math.max(1, (k.replace(/-/g, " ").match(/[aeiouy]+/g) || []).length);
};
const words = [];
cues.forEach((c, ci) =>
  c
    .split(/\s+/)
    .filter(Boolean)
    .forEach((w, wi, arr) => {
      if (/^[—–-]+$/.test(w)) {
        if (words.length) words[words.length - 1].punct = true;
        return;
      }
      words.push({ w, cue: ci, s: syl(w), punct: /[,.?!:;—]$/.test(w) || wi === arr.length - 1 });
    }),
);
const N = words.length;
const G = gaps.length;
const totalSil = gaps.reduce((a, g) => a + g[1] - g[0], 0);
const SYL = words.reduce((a, w) => a + w.s, 0);
const rate = (speechEnd - speechStart - totalSil) / SYL;

/* ---------- 3. DP alignment ---------- */
const pre = [0];
words.forEach((w) => pre.push(pre[pre.length - 1] + w.s));
const cutEnd = (c) => (c === 0 ? speechStart : gaps[c - 1][1]);
const cutStart = (c) => (c === G + 1 ? speechEnd : gaps[c - 1][0]);
const gapLen = (c) => gaps[c - 1][1] - gaps[c - 1][0];
const skipCost = (c) => (gapLen(c) > 0.3 ? 6 : gapLen(c) > 0.18 ? 1.5 : 0.4);
const boundCost = (k, c) => (words[k - 1].punct ? 0 : gapLen(c) > 0.3 ? 10 : gapLen(c) > 0.18 ? 2 : 0.6);

// --breaks "tha.,port.#2": words (as written in the script, optional #occurrence) that must end
// right before a pause. Use when captions drift because the voice slows down/pauses at a sentence
// end that the syllable-rate fit would rather ignore.
const mustEnd = new Set();
for (const spec of String(args.breaks || "").split(",").map((s) => s.trim()).filter(Boolean)) {
  const [w, occ = "1"] = spec.split("#");
  let seen = 0;
  const idx = words.findIndex((x) => x.w.toLowerCase() === w.toLowerCase() && ++seen === Number(occ));
  if (idx === -1) {
    console.error(`--breaks: "${spec}" not found in script`);
    process.exit(1);
  }
  mustEnd.add(idx + 1);
}
const nextMust = (k) => {
  let m = Infinity;
  for (const e of mustEnd) if (e > k && e < m) m = e;
  return m;
};

const INF = 1e18;
const dp = Array.from({ length: G + 2 }, () => new Float64Array(N + 1).fill(INF));
const bp = Array.from({ length: G + 2 }, () => new Int32Array((N + 1) * 2).fill(-1));
dp[0][0] = 0;
for (let c = 0; c <= G; c++)
  for (let k = 0; k < N; k++) {
    if (dp[c][k] >= INF) continue;
    let skipped = 0;
    let silSkipped = 0;
    for (let c2 = c + 1; c2 <= G + 1; c2++) {
      const D = cutStart(c2) - cutEnd(c) - silSkipped;
      const hi = Math.min(c2 === G + 1 ? N : N - 1, nextMust(k));
      for (let k2 = c2 === G + 1 ? N : k + 1; k2 <= hi; k2++) {
        const exp = rate * (pre[k2] - pre[k]);
        const err = (D - exp) / (0.2 + 0.12 * Math.sqrt(exp));
        const cost = dp[c][k] + err * err + skipped + (c2 <= G ? boundCost(k2, c2) : 0);
        if (cost < dp[c2][k2]) {
          dp[c2][k2] = cost;
          bp[c2][2 * k2] = c;
          bp[c2][2 * k2 + 1] = k;
        }
        if (exp > D * 2.5) break;
      }
      if (c2 <= G) {
        skipped += skipCost(c2);
        silSkipped += gapLen(c2);
      }
    }
  }

const segs = [];
for (let c = G + 1, k = N; c > 0 || k > 0; ) {
  const pc = bp[c][2 * k];
  const pk = bp[c][2 * k + 1];
  if (pc < 0) throw new Error("alignment failed — is the script the same text that was voiced?");
  segs.unshift({ c0: pc, c1: c, k0: pk, k1: k });
  c = pc;
  k = pk;
}
const timed = [];
for (const sg of segs) {
  const ivs = [];
  let st = cutEnd(sg.c0);
  for (let g = sg.c0 + 1; g < sg.c1; g++) {
    ivs.push([st, gaps[g - 1][0]]);
    st = gaps[g - 1][1];
  }
  ivs.push([st, cutStart(sg.c1)]);
  const tot = ivs.reduce((a, i) => a + i[1] - i[0], 0);
  const s = pre[sg.k1] - pre[sg.k0];
  const map = (x) => {
    let r = x * tot;
    for (const iv of ivs) {
      if (r <= iv[1] - iv[0] + 1e-9) return iv[0] + r;
      r -= iv[1] - iv[0];
    }
    return ivs[ivs.length - 1][1];
  };
  let acc = 0;
  for (let i = sg.k0; i < sg.k1; i++) {
    const a = map(acc / s);
    acc += words[i].s;
    timed.push({ ...words[i], a, b: map(acc / s) });
  }
}

/* ---------- 4. outputs ---------- */
fs.mkdirSync(args.out, { recursive: true });
const captions = timed.map((x, i) => ({
  text: (i === 0 ? "" : " ") + x.w,
  startMs: Math.round(x.a * 1000),
  endMs: Math.round(x.b * 1000),
  timestampMs: Math.round(((x.a + x.b) / 2) * 1000),
  confidence: null,
}));
fs.writeFileSync(path.join(args.out, "captions.json"), JSON.stringify(captions, null, 1));

const ts = (sec) => {
  const ms = Math.round(sec * 1000);
  const p = (n, l = 2) => String(n).padStart(l, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
const srt = cues
  .map((txt, ci) => {
    const ws = timed.filter((x) => x.cue === ci);
    return `${ci + 1}\n${ts(ws[0].a)} --> ${ts(ws[ws.length - 1].b)}\n${txt}`;
  })
  .join("\n\n");
fs.writeFileSync(path.join(args.out, "captions.srt"), srt + "\n");

console.log(`duration: ${dur.toFixed(2)}s  ->  durationInFrames: ${Math.ceil(dur * FPS)} @${FPS}fps`);
console.log(`words: ${N}, syllables: ${SYL}, pauses: ${G}, fit cost: ${dp[G + 1][N].toFixed(1)} (lower is better; >60 = suspicious)`);
console.log("sentence starts:");
let last = -1;
for (const x of timed) {
  if (x.cue !== last) {
    console.log(`  ${x.a.toFixed(2).padStart(6)}s  f${String(Math.round(x.a * FPS)).padStart(5)}  ${cues[x.cue]}`);
    last = x.cue;
  }
}
