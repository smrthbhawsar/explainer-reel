#!/usr/bin/env node
// npm run publish-kit -- [<slug> ...] [--refresh]
//
// Instagram publish kit from src/reels/covers.json:
//   public/<slug>/cover-bg.png      reel frame used as the cover visual (rendered once; --refresh re-renders)
//   renders/<slug>/cover.png        1080x1920 reel cover (upload as the reel's cover)
//   renders/<slug>/grid.png         1080x1440, what the 3:4 profile grid shows
//   renders/grid-preview.png        profile grid mock-up, newest first, all reels in covers.json "order"
// Captions (renders/<slug>/caption.txt = Instagram, youtube.txt = YouTube Shorts title + description)
// are written by hand/Claude; this only checks they exist.
// No slugs = every reel in "order".
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const refresh = args.includes("--refresh");
const data = JSON.parse(fs.readFileSync("src/reels/covers.json", "utf8"));
const slugs = args.filter((a) => !a.startsWith("--"));
const todo = slugs.length ? slugs : data.order;

const run = (cmd) => execSync(cmd, { stdio: ["ignore", "ignore", "inherit"] });

for (const slug of todo) {
  const spec = data.covers[slug];
  if (!spec) {
    console.error(`No entry for "${slug}" in src/reels/covers.json`);
    process.exit(1);
  }
  if (!data.order.includes(slug)) console.warn(`! "${slug}" is not in covers.json "order", so it won't be in the grid preview`);
  const bg = `public/${slug}/cover-bg.png`;
  if (refresh || !fs.existsSync(bg)) {
    console.log(`[${slug}] cover visual: ${spec.reelId} frame ${spec.frame}`);
    run(`npx remotion still ${spec.reelId} ${bg} --frame=${spec.frame}`);
  }
  fs.mkdirSync(`renders/${slug}`, { recursive: true });
  console.log(`[${slug}] cover + grid crop`);
  run(`npx remotion still Cover-${slug} renders/${slug}/cover.png`);
  run(`npx remotion still CoverGrid-${slug} renders/${slug}/grid.png`);
  for (const txt of ["caption.txt", "youtube.txt"]) {
    const p = `renders/${slug}/${txt}`;
    if (!fs.existsSync(p)) console.warn(`! missing ${p}`);
  }
}

console.log("grid preview");
run(`npx remotion still GridPreview renders/grid-preview.png`);
console.log("done:");
for (const slug of todo) console.log(`  ${path.join("renders", slug)}/  cover.png  grid.png  caption.txt  youtube.txt`);
console.log("  renders/grid-preview.png");
