#!/usr/bin/env node
// npm run still -- <CompositionId> <slug> <frame> [<frame> ...]  ->  out/stills/<slug>/f<frame>.png
const { execSync } = require("child_process");
const [id, slug, ...frames] = process.argv.slice(2);
if (!id || !slug || !frames.length) {
  console.error("usage: npm run still -- <CompositionId> <slug> <frame> [...]   (e.g. npm run still -- RagReel rag 300 900)");
  process.exit(1);
}
for (const f of frames) {
  execSync(`npx remotion still ${id} out/stills/${slug}/f${f}.png --frame=${f}`, { stdio: "inherit" });
}
