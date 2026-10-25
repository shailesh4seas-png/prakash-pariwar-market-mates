import { getPalette } from "./palettes";
import { LAYOUTS, LAYOUT_COUNT, type Copy } from "./layouts";
import { getCategory, type TemplateCategory } from "./catalog";
import { createRng } from "./prng";
import { themedComposition } from "./artwork";
import { CANVAS, type CanvasKind, type MotifId, type TemplateSpec } from "./types";

export const TEMPLATES_PER_CATEGORY = 30;

type CopyBank = TemplateCategory["copy"];

/**
 * Picks a themed copy set for template `index`. Deterministic so the same
 * category + index always yields the same wording, and varied enough that the
 * 30 templates do not read as duplicates.
 */
function pickCopy(bank: CopyBank, index: number): Copy {
  const headline = bank.headlines[index % bank.headlines.length] ?? bank.headlines[0] ?? "Festival greetings";
  const subheadline =
    bank.subheadlines[(index >> 1) % bank.subheadlines.length] ?? bank.subheadlines[0] ?? "";
  const offer = bank.offers[(index * 3) % bank.offers.length] ?? bank.offers[0] ?? "";
  const cta = bank.ctas[index % bank.ctas.length] ?? bank.ctas[0] ?? "";
  return { headline, subheadline, offer, cta };
}

function pickMotifs(motifs: MotifId[], variant: number): MotifId[] {
  const primary = motifs[variant % motifs.length] ?? motifs[0];
  if (!primary) return [];
  const secondary = motifs[(variant + 1) % motifs.length];
  // Alternate single- and double-motif treatments for visual variety.
  return variant % 3 === 0 ? [primary] : secondary ? [primary, secondary] : [primary];
}

const GRADIENT_ANGLES = [135, 160, 200, 45, 90, 25, 300, 120, 175, 60];

// Broadly festive, theme-adjacent palettes used only to top a category up to 3
// so its 10 layouts x 3 palettes = 30 combinations are all distinct.
const FALLBACK_PALETTE_IDS = ["saleBold", "peacockFestive", "weddingMaroon", "newArrivalsTeal"];

function palettesFor(category: TemplateCategory): string[] {
  const ids = [...category.paletteIds];
  for (const fb of FALLBACK_PALETTE_IDS) {
    if (ids.length >= 3) break;
    if (!ids.includes(fb)) ids.push(fb);
  }
  return ids;
}

/** Builds one fully-specified, renderable template. Pure and deterministic. */
export function generateTemplate(
  categoryKey: string,
  index: number,
  canvasKind: CanvasKind = "post",
): TemplateSpec {
  const category = getCategory(categoryKey);
  if (!category) throw new Error(`Unknown category: ${categoryKey}`);

  const layoutIndex = ((index % LAYOUT_COUNT) + LAYOUT_COUNT) % LAYOUT_COUNT;
  const paletteIds = palettesFor(category);
  const paletteId =
    paletteIds[Math.floor(index / LAYOUT_COUNT) % paletteIds.length] ?? paletteIds[0];
  if (!paletteId) throw new Error(`category ${categoryKey} has no palette`);
  const palette = getPalette(paletteId);

  const canvas = CANVAS[canvasKind];
  const copy = pickCopy(category.copy, index);
  const build = LAYOUTS[layoutIndex];
  if (!build) throw new Error("Unknown layout");
  const composition = themedComposition(categoryKey, index, palette, build(palette, {
    headline: copy.headline,
    subheadline: copy.subheadline,
    offer: copy.offer,
    cta: copy.cta,
  }));

  const rng = createRng(`${categoryKey}:${canvasKind}:${index}`);
  void rng;
  const motifs = pickMotifs(category.motifs, index);
  const angle = GRADIENT_ANGLES[index % GRADIENT_ANGLES.length] ?? 135;
  const scrim = index % 4 === 0 ? 0.22 : index % 2 === 0 ? 0.12 : 0.05;

  return {
    artworkVersion: 1,
    id: `${categoryKey}-${canvasKind}-${index}`,
    categoryKey,
    canvas,
    palette,
    layoutId: composition.id,
    motifs,
    variant: index,
    background: {
      kind: "gradient",
      from: palette.bgFrom,
      to: palette.bgTo,
      angle,
      scrim,
    },
    blocks: composition.blocks,
    slots: composition.slots,
  };
}

/** Produces the category's full set (30 by default) of distinct templates. */
export function generateCategoryTemplates(
  categoryKey: string,
  canvasKind: CanvasKind = "post",
  count = TEMPLATES_PER_CATEGORY,
): TemplateSpec[] {
  return Array.from({ length: count }, (_, i) => generateTemplate(categoryKey, i, canvasKind));
}
