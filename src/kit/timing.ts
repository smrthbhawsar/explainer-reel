import { Caption } from "@remotion/captions";

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, "");

const findPhrase = (words: Caption[], phrase: string, occurrence: number) => {
  const target = phrase.split(/\s+/).map(norm).filter(Boolean);
  const ws = words.map((w) => norm(w.text));
  let seen = 0;
  for (let i = 0; i + target.length <= ws.length; i++) {
    if (target.every((t, j) => ws[i + j] === t) && ++seen === occurrence) {
      return { first: words[i], last: words[i + target.length - 1] };
    }
  }
  throw new Error(
    `phraseFrame: "${phrase}" (#${occurrence}) not found in captions`,
  );
};

/**
 * Frame at which a spoken phrase starts, looked up in word-level captions.
 * Use it to anchor animations to the voiceover instead of hard-coding frames:
 *
 *   import words from "../../public/my-reel/captions.json";
 *   const F = (p: string, n = 1) => phraseFrame(words, p, n);
 *   <Tag at={F("Vector Database")} ... />
 *
 * `occurrence` is 1-based (2 = second time the phrase is said). Throws if not found,
 * so a typo fails loudly at render time instead of silently mis-timing a scene.
 */
export const phraseFrame = (
  words: Caption[],
  phrase: string,
  occurrence = 1,
  fps = 30,
) =>
  Math.round(
    (findPhrase(words, phrase, occurrence).first.startMs / 1000) * fps,
  );

/** Frame at which a spoken phrase ends (its last word's end). */
export const phraseEndFrame = (
  words: Caption[],
  phrase: string,
  occurrence = 1,
  fps = 30,
) =>
  Math.round((findPhrase(words, phrase, occurrence).last.endMs / 1000) * fps);
