#!/usr/bin/env node
// npm run render -- <CompositionId> <slug>   ->  renders/<slug>.mp4
const { execSync } = require("child_process");
const [id, slug] = process.argv.slice(2);
if (!id || !slug) {
  console.error("usage: npm run render -- <CompositionId> <slug>   (e.g. npm run render -- RagReel rag)");
  process.exit(1);
}
execSync(`npx remotion render ${id} renders/${slug}.mp4`, { stdio: "inherit" });
