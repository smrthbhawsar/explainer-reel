import { useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

/**
 * Draws a texture with the 2D canvas API (text, grids, code) — deterministic and with
 * no font downloads inside WebGL. `draw` gets a canvas sized w x h pixels.
 */
export const useCanvasTexture = (
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  deps: unknown[] = [],
) =>
  useMemo(() => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    draw(ctx, w, h);
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, ...deps]);

/** Small deterministic PRNG so "random" bytes are identical on every render. */
export const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
