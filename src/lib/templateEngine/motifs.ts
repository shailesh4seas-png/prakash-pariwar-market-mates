import type { MotifId, Palette } from "./types";
import type { Rng } from "./prng";

/**
 * Vector festival / season motifs. Each glyph is authored around the origin and
 * drawn at unit scale (~40px), then translated / scaled / rotated into place.
 * Everything is SVG so templates stay crisp at export and share the theme's
 * palette. These are the "logos / emblems" that also back the category icons.
 */

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function n(v: number): string {
  return (Math.round(v * 100) / 100).toString();
}

/** A single glyph's raw SVG, drawn around (0,0) at roughly a 40-unit radius. */
function glyph(id: MotifId, accent: string, alt: string, light: string): string {
  switch (id) {
    case "diya":
      return `<path d="M-30 6 Q0 30 30 6 Q0 16 -30 6Z" fill="${accent}"/><ellipse cx="0" cy="6" rx="30" ry="7" fill="${alt}"/><path d="M0 -18 Q7 -6 0 2 Q-7 -6 0 -18Z" fill="${light}"/>`;
    case "rangoli": {
      const petals = Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const x = n(Math.cos(a) * 22);
        const y = n(Math.sin(a) * 22);
        return `<circle cx="${x}" cy="${y}" r="6" fill="${i % 2 ? accent : alt}"/>`;
      }).join("");
      return `<circle r="10" fill="${light}"/>${petals}<circle r="30" fill="none" stroke="${accent}" stroke-width="2" stroke-dasharray="4 6"/>`;
    }
    case "lantern":
      return `<rect x="-16" y="-10" width="32" height="26" rx="6" fill="${accent}"/><path d="M-16 -10 Q0 -30 16 -10Z" fill="${alt}"/><line x1="0" y1="-30" x2="0" y2="-38" stroke="${light}" stroke-width="3"/><rect x="-16" y="16" width="32" height="6" rx="3" fill="${alt}"/>`;
    case "snowflake": {
      const arms = Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * 360;
        return `<g transform="rotate(${n(a)})"><line x1="0" y1="0" x2="0" y2="-32" stroke="${light}" stroke-width="3"/><line x1="0" y1="-22" x2="-8" y2="-30" stroke="${light}" stroke-width="2.5"/><line x1="0" y1="-22" x2="8" y2="-30" stroke="${light}" stroke-width="2.5"/></g>`;
      }).join("");
      return arms;
    }
    case "colorSplash":
      return `<circle r="12" fill="${accent}"/><circle cx="16" cy="-10" r="8" fill="${alt}"/><circle cx="-18" cy="8" r="7" fill="${light}"/><circle cx="8" cy="18" r="5" fill="${accent}"/>`;
    case "kite":
      return `<path d="M0 -30 L22 0 L0 30 L-22 0Z" fill="${accent}"/><path d="M0 -30 L0 30" stroke="${light}" stroke-width="2"/><path d="M-22 0 L22 0" stroke="${light}" stroke-width="2"/><path d="M0 30 q10 14 -4 24" stroke="${alt}" stroke-width="2.5" fill="none"/>`;
    case "flag":
      return `<line x1="-18" y1="-30" x2="-18" y2="30" stroke="${light}" stroke-width="3"/><path d="M-18 -30 L20 -22 L-18 -8Z" fill="${accent}"/><rect x="-18" y="-8" width="0" height="0"/>`;
    case "crescentStar":
      return `<path d="M8 -26 A26 26 0 1 0 8 26 A20 20 0 1 1 8 -26Z" fill="${accent}"/><path d="M18 0 l4 9 9 1 -7 6 2 9 -8 -4 -8 4 2 -9 -7 -6 9 -1Z" fill="${light}"/>`;
    case "leaves":
      return `<path d="M0 -28 Q20 -6 0 28 Q-20 -6 0 -28Z" fill="${accent}"/><line x1="0" y1="-24" x2="0" y2="24" stroke="${light}" stroke-width="2"/>`;
    case "rain":
      return `<path d="M0 -22 Q16 4 0 26 Q-16 4 0 -22Z" fill="${alt}"/><path d="M-2 -10 Q6 4 -2 16" stroke="${light}" stroke-width="2" fill="none"/>`;
    case "sun": {
      const rays = Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * 360;
        return `<line x1="0" y1="0" x2="0" y2="-34" stroke="${accent}" stroke-width="3" transform="rotate(${n(a)})"/>`;
      }).join("");
      return `<circle r="16" fill="${accent}"/>${rays}`;
    }
    case "flowers": {
      const p = Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * 360;
        return `<ellipse cx="0" cy="-16" rx="8" ry="14" fill="${accent}" transform="rotate(${n(a)})"/>`;
      }).join("");
      return `${p}<circle r="7" fill="${alt}"/>`;
    }
    case "sparkles":
      return `<path d="M0 -22 L5 -5 22 0 5 5 0 22 -5 5 -22 0 -5 -5Z" fill="${light}"/>`;
    case "bunting":
      return `<path d="M-30 -10 Q0 6 30 -10" stroke="${light}" stroke-width="2.5" fill="none"/><path d="M-24 -8 l0 14 12 -8Z" fill="${accent}"/><path d="M-4 -2 l0 14 12 -8Z" fill="${alt}"/><path d="M16 -6 l0 14 12 -8Z" fill="${accent}"/>`;
    default:
      return "";
  }
}

/**
 * Places a scattered cluster of motifs across the canvas. `count` and the
 * per-glyph transform come from the seeded RNG, so distinct variants get
 * distinct decorative arrangements while remaining reproducible.
 */
export function scatterMotifs(
  id: MotifId,
  rng: Rng,
  W: number,
  H: number,
  palette: Palette,
  count: number,
  opts?: { cornerBias?: boolean; maxOpacity?: number },
): string {
  const maxOpacity = opts?.maxOpacity ?? 0.5;
  const cornerBias = opts?.cornerBias ?? true;
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    let x: number;
    let y: number;
    if (cornerBias && i % 2 === 0) {
      // Bias half of the motifs toward the corners for a framed, designed look.
      const cx = i % 4 < 2 ? rng.range(0.05, 0.28) : rng.range(0.72, 0.95);
      const cy = rng.range(0.04, 0.96);
      x = cx * W;
      y = cy * H;
    } else {
      x = rng.range(0.04, 0.96) * W;
      y = rng.range(0.04, 0.96) * H;
    }
    const scale = rng.range(0.5, 1.5);
    const rot = rng.range(-25, 25);
    const op = rng.range(0.18, maxOpacity);
    parts.push(
      `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)}) scale(${n(scale)})" opacity="${n(op)}">${glyph(id, palette.accent, palette.accentAlt, palette.text)}</g>`,
    );
  }
  return parts.join("");
}

/** The full decorative layer for a set of motifs, painted behind the text. */
export function renderMotifLayer(
  motifs: MotifId[],
  rng: Rng,
  W: number,
  H: number,
  palette: Palette,
  variant: number,
): string {
  return motifs
    .map((m, idx) => {
      const base = variant % 2 === 0 ? 6 : 9;
      const count = Math.max(3, base - idx);
      return scatterMotifs(m, rng, W, H, palette, count, { maxOpacity: idx === 0 ? 0.55 : 0.4 });
    })
    .join("");
}

/** Standalone emblem (used for the category icon grid), returned as an SVG node string. */
export function motifEmblem(id: MotifId, palette: Palette, size = 64): string {
  const c = size / 2;
  const s = size / 96;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><g transform="translate(${n(c)} ${n(c)}) scale(${n(s * 1.6)})">${glyph(id, palette.accent, palette.accentAlt, palette.text)}</g></svg>`;
}
