#!/usr/bin/env node
/**
 * 3D model library tool for the hinglish-3d-reel skill.
 *
 *   npm run model -- list                         local library (public/models/index.json)
 *   npm run model -- search <words...>            search local library + Poly Haven + Khronos samples
 *   npm run model -- fetch <source>:<id> [--name <slug>] [--res 1k] [--tags "a,b"]
 *                                                 download into public/models/<slug>/ and record licence
 *   npm run model -- add <path> --name <slug> --license <spdx> --author <who> --url <page> [--tags "a,b"]
 *                                                 register a model the user downloaded manually
 *   npm run model -- inspect <public/models/.../file.glb|.gltf>
 *                                                 bounds, meshes, materials, animations, triangles
 *
 * Sources that can be fetched automatically (no login): Poly Haven (CC0) and Khronos
 * glTF-Sample-Assets (per-model licence, mostly CC0 / CC-BY). Everything else (Poly Pizza,
 * Sketchfab, Quaternius, Kenney, Mixamo) is downloaded by the user and registered with `add`.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../../..");
const LIB = path.join(ROOT, "public", "models");
const INDEX = path.join(LIB, "index.json");
const KHRONOS = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models";
const UA = { "User-Agent": "remotion-reel-model-tool" };

const args = process.argv.slice(2);
const cmd = args[0];
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const positional = () => {
  const out = [];
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith("--")) i++;
    else out.push(args[i]);
  }
  return out;
};

const readIndex = () => (fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, "utf8")) : []);
const writeIndex = (entries) => {
  fs.mkdirSync(LIB, { recursive: true });
  fs.writeFileSync(INDEX, JSON.stringify(entries, null, 2) + "\n");
  // Human-readable credits next to the index (CC-BY models must be credited in the post).
  const lines = ["# 3D model credits", "", "| Model | File | Licence | Author | Source |", "|---|---|---|---|---|"];
  for (const e of entries) lines.push(`| ${e.slug} | ${e.file} | ${e.license} | ${e.author} | ${e.url} |`);
  fs.writeFileSync(path.join(LIB, "CREDITS.md"), lines.join("\n") + "\n");
};
const upsert = (entry) => {
  const idx = readIndex().filter((e) => e.slug !== entry.slug);
  idx.push(entry);
  idx.sort((a, b) => a.slug.localeCompare(b.slug));
  writeIndex(idx);
};

const getJson = async (url) => {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
};
const download = async (url, dest) => {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
};
/** Number of query words found as whole words (plural-tolerant) in the haystack. */
const hits = (words, hay) =>
  words.filter((w) => new RegExp(`(^|[^a-z0-9])${w.replace(/[^a-z0-9]/g, "")}(e?s)?($|[^a-z0-9])`).test(hay.toLowerCase().replace(/_/g, " "))).length;
const slugify = (s) =>
  s
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// ---------------------------------------------------------------- glTF parsing (no deps)
const COMP = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const readGltfJson = (file) => {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32LE(0) === 0x46546c67) {
    const len = buf.readUInt32LE(12);
    return JSON.parse(buf.subarray(20, 20 + len).toString("utf8"));
  }
  return JSON.parse(buf.toString("utf8"));
};
const mat4 = (n) => {
  if (n.matrix) return n.matrix;
  const [x, y, z, w] = n.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = n.scale || [1, 1, 1];
  const [tx, ty, tz] = n.translation || [0, 0, 0];
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
};
const mul = (a, b) => {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
};
const apply = (m, [x, y, z]) => [
  m[0] * x + m[4] * y + m[8] * z + m[12],
  m[1] * x + m[5] * y + m[9] * z + m[13],
  m[2] * x + m[6] * y + m[10] * z + m[14],
];

const inspect = (file) => {
  const g = readGltfJson(file);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let tris = 0;
  const meshNames = [];
  const visit = (ni, parent) => {
    const n = g.nodes[ni];
    const m = mul(parent, mat4(n));
    if (n.mesh !== undefined) {
      const mesh = g.meshes[n.mesh];
      meshNames.push(n.name || mesh.name || `mesh${n.mesh}`);
      for (const p of mesh.primitives) {
        const pos = g.accessors[p.attributes.POSITION];
        tris += Math.round((p.indices !== undefined ? g.accessors[p.indices].count : pos.count) / 3);
        if (pos.min && pos.max) {
          for (const cx of [pos.min[0], pos.max[0]])
            for (const cy of [pos.min[1], pos.max[1]])
              for (const cz of [pos.min[2], pos.max[2]]) {
                const v = apply(m, [cx, cy, cz]);
                for (let k = 0; k < 3; k++) {
                  min[k] = Math.min(min[k], v[k]);
                  max[k] = Math.max(max[k], v[k]);
                }
              }
        }
      }
    }
    for (const c of n.children || []) visit(c, m);
  };
  const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const scene = g.scenes[g.scene || 0];
  for (const ni of scene.nodes) visit(ni, I);
  const size = max.map((v, k) => +(v - min[k]).toFixed(3));
  return {
    size: { x: size[0], y: size[1], z: size[2] },
    min: min.map((v) => +v.toFixed(3)),
    max: max.map((v) => +v.toFixed(3)),
    triangles: tris,
    meshes: meshNames,
    materials: (g.materials || []).map((m) => m.name || "(unnamed)"),
    animations: (g.animations || []).map((a) => a.name || "(unnamed)"),
    skinned: !!(g.skins && g.skins.length),
    externalFiles: [...(g.buffers || []), ...(g.images || [])].filter((b) => b.uri && !b.uri.startsWith("data:")).map((b) => b.uri),
  };
};

// ---------------------------------------------------------------- sources
const searchPolyHaven = async (words) => {
  const all = await getJson("https://api.polyhaven.com/assets?t=models");
  return Object.entries(all)
    .map(([id, a]) => {
      const hay = [id, a.name, ...(a.tags || []), ...(a.categories || [])].join(" ").toLowerCase();
      const score = hits(words, hay);
      return { score, id: `polyhaven:${id}`, name: a.name, license: "CC0-1.0", info: `${a.polycount ?? "?"} polys · ${(a.categories || []).join("/")}` };
    })
    .filter((r) => r.score > 0);
};
const searchKhronos = async (words) => {
  const all = await getJson(`${KHRONOS}/model-index.json`);
  return all
    .map((m) => {
      const hay = [m.name, m.label, ...(m.tags || [])].join(" ");
      const score = hits(words, hay.replace(/([a-z])([A-Z])/g, "$1 $2"));
      return { score, id: `khronos:${m.name}`, name: m.label, license: "see fetch", info: (m.tags || []).join(",") };
    })
    .filter((r) => r.score > 0 && !/test|compare/i.test(r.id));
};

const fetchPolyHaven = async (id, slug, res) => {
  const files = await getJson(`https://api.polyhaven.com/files/${id}`);
  const info = await getJson(`https://api.polyhaven.com/info/${id}`);
  const g = files.gltf?.[res]?.gltf || files.gltf?.["1k"]?.gltf;
  if (!g) throw new Error(`No glTF download for ${id}`);
  const dir = path.join(LIB, slug);
  const main = path.join(dir, path.basename(new URL(g.url).pathname));
  await download(g.url, main);
  for (const [rel, f] of Object.entries(g.include || {})) await download(f.url, path.join(dir, rel));
  return {
    file: path.relative(path.join(ROOT, "public"), main).replace(/\\/g, "/"),
    license: "CC0-1.0",
    author: Object.keys(info.authors || {}).join(", ") || "Poly Haven",
    url: `https://polyhaven.com/a/${id}`,
    tags: [...(info.tags || []), ...(info.categories || [])],
  };
};
const fetchKhronos = async (name, slug) => {
  const index = await getJson(`${KHRONOS}/model-index.json`);
  const m = index.find((x) => x.name === name);
  if (!m) throw new Error(`Khronos model "${name}" not found`);
  const dir = path.join(LIB, slug);
  let main;
  if (m.variants["glTF-Binary"]) {
    main = path.join(dir, m.variants["glTF-Binary"]);
    await download(`${KHRONOS}/${name}/glTF-Binary/${m.variants["glTF-Binary"]}`, main);
  } else {
    const v = m.variants.glTF;
    main = path.join(dir, v);
    await download(`${KHRONOS}/${name}/glTF/${v}`, main);
    for (const uri of inspect(main).externalFiles) await download(`${KHRONOS}/${name}/glTF/${uri}`, path.join(dir, decodeURIComponent(uri)));
  }
  let license = "unknown";
  let author = "unknown";
  try {
    const meta = await getJson(`${KHRONOS}/${name}/metadata.json`);
    license = [...new Set(meta.legal.map((l) => l.spdx || l.license))].join(" + ");
    author = [...new Set(meta.legal.map((l) => l.artist))].join(", ");
  } catch {
    /* keep unknown */
  }
  return {
    file: path.relative(path.join(ROOT, "public"), main).replace(/\\/g, "/"),
    license,
    author,
    url: `https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/${name}`,
    tags: m.tags || [],
  };
};

// ---------------------------------------------------------------- commands
const main = async () => {
  if (cmd === "list") {
    const idx = readIndex();
    if (!idx.length) return console.log("Library is empty (public/models/index.json).");
    for (const e of idx)
      console.log(`${e.slug.padEnd(24)} ${e.file.padEnd(48)} ${e.license.padEnd(12)} ${e.triangles ?? "?"} tris  anims:[${(e.animations || []).join(", ")}]  tags:${(e.tags || []).slice(0, 6).join(",")}`);
    return;
  }
  if (cmd === "search") {
    const words = positional().map((w) => w.toLowerCase());
    if (!words.length) throw new Error("usage: search <words...>");
    const local = readIndex()
      .map((e) => ({ score: hits(words, [e.slug.replace(/-/g, " "), ...(e.tags || [])].join(" ")), e }))
      .filter((r) => r.score > 0);
    console.log("== local library ==");
    for (const { e } of local) console.log(`  ${e.slug}  ${e.file}  ${e.license}`);
    if (!local.length) console.log("  (none)");
    const [ph, kh] = await Promise.all([searchPolyHaven(words).catch(() => []), searchKhronos(words).catch(() => [])]);
    for (const [title, rows] of [["Poly Haven (CC0)", ph], ["Khronos samples", kh]]) {
      console.log(`== ${title} ==`);
      rows.sort((a, b) => b.score - a.score);
      for (const r of rows.slice(0, 12)) console.log(`  ${r.id.padEnd(40)} ${r.name}  [${r.license}]  ${r.info}`);
      if (!rows.length) console.log("  (none)");
    }
    return;
  }
  if (cmd === "fetch") {
    const [ref] = positional();
    const [source, id] = (ref || "").split(":");
    if (!source || !id) throw new Error("usage: fetch <polyhaven|khronos>:<id> [--name slug] [--res 1k]");
    const slug = flag("name", slugify(id));
    const meta =
      source === "polyhaven"
        ? await fetchPolyHaven(id, slug, flag("res", "1k"))
        : source === "khronos"
          ? await fetchKhronos(id, slug)
          : (() => {
              throw new Error(`Unknown source "${source}" (polyhaven | khronos). For other sites, download manually and use "add".`);
            })();
    const extra = (flag("tags", "") || "").split(",").filter(Boolean);
    const ins = inspect(path.join(ROOT, "public", meta.file));
    const entry = { slug, ...meta, tags: [...new Set([...extra, ...meta.tags])], source: `${source}:${id}`, triangles: ins.triangles, animations: ins.animations, size: ins.size };
    upsert(entry);
    console.log(JSON.stringify(entry, null, 2));
    console.log(`\nUse: <Model src="${meta.file}" size={...} />`);
    return;
  }
  if (cmd === "add") {
    const [p] = positional();
    const slug = flag("name");
    if (!p || !slug) throw new Error("usage: add <path-under-public/models> --name <slug> --license <spdx> --author <who> --url <page>");
    const abs = path.resolve(ROOT, p);
    if (!abs.startsWith(LIB)) throw new Error("Put the model under public/models/<slug>/ first.");
    const ins = inspect(abs);
    const entry = {
      slug,
      file: path.relative(path.join(ROOT, "public"), abs).replace(/\\/g, "/"),
      license: flag("license", "unknown"),
      author: flag("author", "unknown"),
      url: flag("url", ""),
      tags: (flag("tags", "") || "").split(",").filter(Boolean),
      source: "manual",
      triangles: ins.triangles,
      animations: ins.animations,
      size: ins.size,
    };
    upsert(entry);
    console.log(JSON.stringify(entry, null, 2));
    return;
  }
  if (cmd === "inspect") {
    const [p] = positional();
    if (!p) throw new Error("usage: inspect <file.glb|file.gltf>");
    console.log(JSON.stringify(inspect(path.resolve(ROOT, p)), null, 2));
    return;
  }
  console.log(fs.readFileSync(__filename, "utf8").split("*/")[0]);
};

main().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
