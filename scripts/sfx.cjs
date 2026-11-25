#!/usr/bin/env node
/**
 * Sound-effects library manager for public/sfx/ (used by src/kit/SoundEffects.tsx).
 *
 *   npm run sfx -- list
 *   npm run sfx -- search <words...> [--source mixkit|pixabay|all]
 *   npm run sfx -- add <mixkit|pixabay>:<id> <name> --kind whoosh|pop|impact|riser [--use "what it's for"]
 *   npm run sfx -- import <file> <name> --kind <kind> --source pixabay --id <id> [--use "..."]
 *   npm run sfx -- remove <name>
 *   npm run sfx -- credits      (regenerate public/sfx/CREDITS.md from library.json)
 *
 * Both sources are automatic: `search` caches results (incl. Pixabay's direct MP3 link) in
 * out/sfx-search.json, `add` downloads from there. Pixabay is fetched with curl (it 403s Node's
 * fetch); its sounds flagged with YouTube Content ID are refused unless --allow-content-id.
 * `import` is the fallback for a file downloaded by hand.
 *
 * Every add/import measures the file with ffmpeg (length, time of the loudest moment, loudness →
 * loudness-match multiplier), writes public/sfx/library.json and regenerates CREDITS.md.
 * Requires ffmpeg + ffprobe on PATH.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const SFX_DIR = path.join(ROOT, "public", "sfx");
const LIB = path.join(SFX_DIR, "library.json");
const CREDITS = path.join(SFX_DIR, "CREDITS.md");
const CACHE = path.join(ROOT, "out", "sfx-search.json");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
const KINDS = ["whoosh", "pop", "impact", "riser"];
const LICENSES = {
  mixkit:
    "Mixkit Sound Effects Free License — free for commercial and personal use, no attribution required. https://mixkit.co/license/",
  pixabay:
    "Pixabay Content License — free for commercial and personal use, no attribution required. https://pixabay.com/service/license-summary/",
};

// ---------- helpers ---------------------------------------------------------------------
const die = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};
const readLib = () => JSON.parse(fs.readFileSync(LIB, "utf8"));
const writeLib = (lib) => fs.writeFileSync(LIB, JSON.stringify(lib, null, 2) + "\n");
const readCache = () => (fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : []);
const today = () => new Date().toISOString().slice(0, 10);

const parseArgs = (argv) => {
  const pos = [];
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[i + 1]?.startsWith("--") ? true : argv[++i];
    else pos.push(argv[i]);
  }
  return { pos, opt };
};

const decodeHtml = (s) =>
  s.replace(/&amp;/g, "&").replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

const get = async (url) => {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res;
};

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ---------- search ----------------------------------------------------------------------
const parseMixkit = (html) =>
  html
    .split('class="item-grid-card ')
    .slice(1)
    .map((card) => {
      const id = card.match(/item-id-value="(\d+)"/)?.[1];
      const title = card.match(/item-grid-card__title[^>]*>\s*([^<]+)/)?.[1];
      const dur = card.match(/data-test-id="duration">\s*([\d:]+)/)?.[1];
      return id && title
        ? { source: "mixkit", id, title: decodeHtml(title), duration: dur ?? "?", url: `https://mixkit.co/free-sound-effects/download/${id}/` }
        : null;
    })
    .filter(Boolean);

const searchMixkit = async (q) => {
  const slug = slugify(q);
  for (const url of [
    `https://mixkit.co/free-sound-effects/discover/${slug}/`,
    `https://mixkit.co/free-sound-effects/${slug}/`,
  ]) {
    try {
      const items = parseMixkit(await (await get(url)).text());
      if (items.length) return items;
    } catch {
      /* try next */
    }
  }
  return [];
};

/** Pixabay answers Node's fetch with 403 (Cloudflare) but serves curl with a browser User-Agent. */
const curl = (url, { out, encoding = "utf8" } = {}) => {
  const args = ["-sL", "-A", UA, "-w", "%{http_code}", ...(out ? ["-o", out] : []), url];
  const r = spawnSync("curl", args, { encoding: out ? "utf8" : encoding, maxBuffer: 1 << 27 });
  if (r.error) throw new Error(`curl not available: ${r.error.message}`);
  const text = r.stdout ?? "";
  const status = text.slice(-3);
  if (r.status !== 0 || status !== "200") throw new Error(`HTTP ${status || r.status} for ${url}`);
  return out ? null : text.slice(0, -3);
};

const fmtDur = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

const searchPixabay = async (q) => {
  try {
    // The search page is a JS shell; its results live in the /bootstrap/<hash>.json it points to.
    // That JSON intermittently 404s, so re-fetch page + JSON as a pair a few times.
    let data;
    for (let attempt = 1; !data; attempt++) {
      try {
        const html = curl(`https://pixabay.com/sound-effects/search/${encodeURIComponent(slugify(q))}/`);
        const boot = html.match(/__BOOTSTRAP_URL__\s*=\s*'([^']+)'/)?.[1];
        if (!boot) throw new Error("no bootstrap URL on the search page (layout changed?)");
        data = JSON.parse(curl(`https://pixabay.com${boot}`));
      } catch (e) {
        if (attempt >= 3) throw e;
      }
    }
    return (data?.page?.results ?? [])
      .filter((r) => r.mediaType === "audio" && r.sources?.src)
      .map((r) => ({
        source: "pixabay",
        id: String(r.id),
        title: r.name ?? r.alt ?? `Pixabay #${r.id}`,
        creator: r.user?.username ?? "?",
        duration: fmtDur(r.duration ?? 0),
        url: `https://pixabay.com${r.href}`,
        src: r.sources.src,
        // Sounds registered with YouTube Content ID can get a Short claimed — avoid them.
        contentId: Boolean(r.hasYoutubeContentId),
        ai: Boolean(r.isAiGenerated),
      }));
  } catch (e) {
    console.warn(`  (pixabay search failed: ${e.message})`);
    return [];
  }
};

const cmdSearch = async ({ pos, opt }) => {
  const q = pos.join(" ");
  if (!q) die('usage: npm run sfx -- search <words...> [--source mixkit|pixabay|all]');
  const source = opt.source ?? "all";
  const results = [];
  if (source === "all" || source === "mixkit") results.push(...(await searchMixkit(q)).slice(0, 15));
  if (source === "all" || source === "pixabay") results.push(...(await searchPixabay(q)).slice(0, 15));
  if (!results.length) die(`no results for "${q}" — try a simpler word (e.g. "whoosh", "click", "coin")`);
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  const cache = readCache().filter((r) => !results.some((n) => n.source === r.source && n.id === r.id));
  fs.writeFileSync(CACHE, JSON.stringify([...results, ...cache].slice(0, 300), null, 2));
  for (const s of ["mixkit", "pixabay"]) {
    const rs = results.filter((r) => r.source === s);
    if (!rs.length) continue;
    console.log(`\n== ${s} (${rs.length})`);
    for (const r of rs) {
      const flags = [r.contentId && "⚠ YouTube Content ID", r.ai && "AI-generated"].filter(Boolean).join(", ");
      console.log(
        `  ${(r.source + ":" + r.id).padEnd(15)} ${r.duration.padEnd(5)} ${r.title}${r.creator ? ` — ${r.creator}` : ""}${flags ? `  [${flags}]` : ""}`,
      );
    }
  }
  console.log("\nadd one: npm run sfx -- add <source>:<id> <name> --kind whoosh|pop|impact|riser --use \"…\"");
  console.log("preview: Mixkit https://mixkit.co/free-sound-effects/download/<id>/ · Pixabay link is in out/sfx-search.json\n");
};

// ---------- measure ---------------------------------------------------------------------
const measure = (file) => {
  const length = parseFloat(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString(),
  );
  if (!(length > 0)) die(`${file} is not a readable audio file`);

  // Time of the loudest 50 ms window.
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", "8000", "-f", "s16le", "-"], {
    maxBuffer: 1 << 28,
  });
  const n = raw.length >> 1;
  const w = 400;
  let best = 0;
  let bestAt = 0;
  let maxAbs = 0;
  for (let i = 0; i + w <= n; i += w) {
    let e = 0;
    for (let j = i; j < i + w; j++) {
      const x = raw.readInt16LE(j * 2);
      e += x * x;
      if (Math.abs(x) > maxAbs) maxAbs = Math.abs(x);
    }
    if (e > best) [best, bestAt] = [e, i];
  }
  const peak = Math.round((bestAt / 8000) * 100) / 100;

  // Integrated loudness; files < 0.4 s can't be gated (ffmpeg reports -70), so estimate from peak level.
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128", "-f", "null", "-"], {
    encoding: "utf8",
  });
  const m = [...(r.stderr ?? "").matchAll(/^\s+I:\s+(-?[\d.]+) LUFS/gm)].pop();
  let lufs = m ? parseFloat(m[1]) : -70;
  if (lufs <= -69) lufs = 20 * Math.log10(maxAbs / 32768 + 1e-9) - 17;
  const norm = Math.min(3, Math.max(0.2, Math.round(10 ** ((-16 - lufs) / 20) * 100) / 100));
  return { length: Math.round(length * 100) / 100, peak, norm, lufs: Math.round(lufs * 10) / 10 };
};

const register = (name, file, meta) => {
  const lib = readLib();
  const m = measure(file);
  lib[name] = {
    kind: meta.kind,
    peak: m.peak,
    norm: m.norm,
    length: m.length,
    use: meta.use ?? "",
    source: meta.source,
    id: meta.id,
    title: meta.title,
    ...(meta.creator ? { creator: meta.creator } : {}),
    added: today(),
  };
  writeLib(lib);
  writeCredits(lib);
  console.log(
    `✔ ${name}  (${meta.source}:${meta.id} "${meta.title}")  length ${m.length}s, peak at ${m.peak}s, ${m.lufs} LUFS → norm ${m.norm}`,
  );
  console.log(`  use it: { at: F("…"), sound: "${name}" }  — SfxName updates automatically from library.json`);
};

const checkNameKind = (name, opt, { allowReplace = false } = {}) => {
  if (!name || !/^[a-z0-9-]+$/.test(name)) die("name must be kebab-case, e.g. camera-shutter");
  if (!KINDS.includes(opt.kind)) die(`--kind must be one of: ${KINDS.join(", ")}`);
  if (!allowReplace && readLib()[name] && !opt.replace) die(`"${name}" already exists (pass --replace to overwrite)`);
};

// ---------- add (automatic download, mixkit or pixabay) ---------------------------------
const cmdAdd = async ({ pos, opt }) => {
  const [ref, name] = pos;
  const [source, id] = (ref ?? "").split(":");
  if (!["mixkit", "pixabay"].includes(source) || !/^\d+$/.test(id ?? ""))
    die('usage: npm run sfx -- add <mixkit|pixabay>:<id> <name> --kind <kind> [--use "..."]');
  checkNameKind(name, opt);
  const hit = readCache().find((r) => r.source === source && r.id === id);
  const dest = path.join(SFX_DIR, `${name}.mp3`);
  const tmp = `${dest}.part`;
  try {
    if (source === "mixkit") {
      const res = await get(`https://assets.mixkit.co/active_storage/sfx/${id}/${id}-preview.mp3`);
      fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
    } else {
      if (!hit?.src) die(`pixabay:${id} isn't in the last search results — run \`npm run sfx -- search <words>\` first`);
      if (hit.contentId && !opt["allow-content-id"])
        die(`pixabay:${id} is registered with YouTube Content ID (Shorts may get claimed). Pick another, or pass --allow-content-id.`);
      curl(hit.src, { out: tmp });
    }
    if (fs.statSync(tmp).size < 2000) throw new Error("downloaded file is too small — not audio?");
    fs.renameSync(tmp, dest);
  } catch (e) {
    fs.rmSync(tmp, { force: true });
    throw e;
  }
  register(name, dest, {
    kind: opt.kind,
    use: opt.use,
    source,
    id,
    title: opt.title ?? hit?.title ?? `${source} #${id}`,
    creator: hit?.creator,
  });
};

// ---------- import (pixabay / any manually downloaded file) -----------------------------
const cmdImport = ({ pos, opt }) => {
  const [file, name] = pos;
  if (!file || !fs.existsSync(file)) die("usage: npm run sfx -- import <downloaded-file> <name> --kind <kind> --source pixabay --id <id>");
  if (!["pixabay", "mixkit"].includes(opt.source)) die("--source must be pixabay or mixkit (only these licences are allowed)");
  if (!opt.id) die("--id is required (the number at the end of the Pixabay/Mixkit link) so the credit is traceable");
  checkNameKind(name, opt);
  const hit = readCache().find((r) => r.source === opt.source && r.id === String(opt.id));
  const dest = path.join(SFX_DIR, `${name}.mp3`);
  if (path.extname(file).toLowerCase() === ".mp3") fs.copyFileSync(file, dest);
  else execFileSync("ffmpeg", ["-v", "error", "-y", "-i", file, "-codec:a", "libmp3lame", "-q:a", "2", dest]);
  register(name, dest, {
    kind: opt.kind,
    use: opt.use,
    source: opt.source,
    id: String(opt.id),
    title: opt.title ?? hit?.title ?? path.basename(file, path.extname(file)),
    creator: opt.creator ?? hit?.creator,
  });
  console.log(`  (the original ${file} was left in place — delete it if you like)`);
};

// ---------- list / credits --------------------------------------------------------------
const cmdList = () => {
  const lib = readLib();
  for (const kind of KINDS) {
    const names = Object.keys(lib).filter((n) => lib[n].kind === kind);
    console.log(`\n${kind} (${names.length})`);
    for (const n of names) console.log(`  ${n.padEnd(18)} ${String(lib[n].length).padEnd(5)}s  ${lib[n].use}`);
  }
  console.log("");
};

const writeCredits = (lib) => {
  const lines = [
    "# Sound effects",
    "",
    "Generated by `npm run sfx -- credits` from `library.json` — edit via `npm run sfx`, not by hand.",
    "",
    "`Peak` = seconds from file start to the loudest moment; `<SoundEffects>` starts each sound that much",
    "early so the peak lands on the cue frame.",
    "",
  ];
  for (const source of ["mixkit", "pixabay"]) {
    const names = Object.keys(lib).filter((n) => lib[n].source === source);
    if (!names.length) continue;
    lines.push(`## ${source === "mixkit" ? "Mixkit" : "Pixabay"}`, "", LICENSES[source], "");
    lines.push("| File | Kind | Title — creator (id) | Length | Peak | Use for |", "|---|---|---|---|---|---|");
    for (const n of names) {
      const e = lib[n];
      lines.push(
        `| ${n}.mp3 | ${e.kind} | ${e.title}${e.creator ? ` — ${e.creator}` : ""} (${e.id}) | ${e.length}s | ${e.peak}s | ${e.use} |`,
      );
    }
    lines.push("");
  }
  fs.writeFileSync(CREDITS, lines.join("\n"));
};

// ---------- main ------------------------------------------------------------------------
const [cmd, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
const cmdRemove = ({ pos }) => {
  const lib = readLib();
  const [name] = pos;
  if (!lib[name]) die(`no sound named "${name}" (npm run sfx -- list)`);
  const used = spawnSync("git", ["grep", "-l", `"${name}"`, "--", "src"], { cwd: ROOT, encoding: "utf8" }).stdout?.trim();
  if (used) die(`"${name}" is still used in:\n${used}\nRemove those cues first.`);
  delete lib[name];
  writeLib(lib);
  writeCredits(lib);
  fs.rmSync(path.join(SFX_DIR, `${name}.mp3`), { force: true });
  console.log(`✔ removed ${name}`);
};

const commands = {
  search: cmdSearch,
  add: cmdAdd,
  import: cmdImport,
  remove: cmdRemove,
  list: cmdList,
  credits: () => (writeCredits(readLib()), console.log(`✔ wrote ${path.relative(ROOT, CREDITS)}`)),
};
if (!commands[cmd]) {
  console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].replace(/^#!.*\n\/\*\*?/, "").replace(/^ \* ?/gm, ""));
  process.exit(cmd ? 1 : 0);
}
Promise.resolve(commands[cmd](args)).catch((e) => die(e.message));
