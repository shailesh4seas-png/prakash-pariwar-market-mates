/**
 * Editor helpers: geometry + design mutations applied to a TemplateSpec.
 *
 * Text-block colours are baked in when a layout composition is built, so
 * "change colour" and "change canvas size" re-run the composition while
 * preserving the manual work (moved / resized slots and edited copy).
 */
import { getPalette } from "./palettes";
import { LAYOUTS, LAYOUT_COUNT, type Copy } from "./layouts";
import { getCategory } from "./catalog";
import { themedComposition } from "./artwork";
import {
  CANVAS,
  type CanvasKind,
  type PlaceholderField,
  type PlaceholderSlot,
  type TemplateSpec,
  type TextRole,
} from "./types";

/** Normalized area every draggable slot centre is clamped inside. */
export const SAFE_AREA = { x: 0.05, y: 0.05, width: 0.9, height: 0.9 };

/** Alignment guides (canvas edges thirds + centre) used for snapping. */
export const SNAP_GUIDES_X = [0.05, 1 / 3, 0.5, 2 / 3, 0.95];
export const SNAP_GUIDES_Y = [0.05, 0.25, 1 / 3, 0.5, 2 / 3, 0.75, 0.95];
export const SNAP_THRESHOLD = 0.012;

function snapAxis(value: number, guides: number[], threshold = SNAP_THRESHOLD): number {
  for (const g of guides) if (Math.abs(value - g) <= threshold) return g;
  return value;
}

function clampCenter(slot: PlaceholderSlot): { cx: number; cy: number } {
  const halfW = slot.w / 2;
  const halfH = slot.h / 2;
  const minX = SAFE_AREA.x + halfW;
  const maxX = SAFE_AREA.x + SAFE_AREA.width - halfW;
  const minY = SAFE_AREA.y + halfH;
  const maxY = SAFE_AREA.y + SAFE_AREA.height - halfH;
  return {
    cx: Math.min(Math.max(slot.cx, minX), Math.max(minX, maxX)),
    cy: Math.min(Math.max(slot.cy, minY), Math.max(minY, maxY)),
  };
}

function findLayoutIndex(layoutId: string, palette: ReturnType<typeof getPalette>): number {
  for (let i = 0; i < LAYOUT_COUNT; i++) {
    const build = LAYOUTS[i];
    if (build && build(palette, { headline: "h", subheadline: "s", offer: "o", cta: "c" }).id === layoutId) {
      return i;
    }
  }
  return 0;
}

/** Current editable copy, read from each block's default text. */
export function copyFromSpec(spec: TemplateSpec): Copy {
  const get = (role: TextRole) => spec.blocks.find((b) => b.role === role)?.defaultText ?? "";
  return { headline: get("headline"), subheadline: get("subheadline"), offer: get("offer"), cta: get("cta") };
}

/** Writes new copy into the spec's text blocks so it is persisted with the template. */
export function setBlockText(spec: TemplateSpec, role: TextRole, text: string): TemplateSpec {
  return {
    ...spec,
    blocks: spec.blocks.map((b) => (b.role === role ? { ...b, defaultText: text } : b)),
  };
}

/** Re-runs the layout composition with a new palette and/or canvas size, keeping
 *  the user's slot geometry (matched by field) and current copy. */
export function recomposeSpec(
  spec: TemplateSpec,
  opts: { paletteId?: string; canvasKind?: CanvasKind },
): TemplateSpec {
  const paletteId = opts.paletteId ?? spec.palette.id;
  const canvasKind = opts.canvasKind ?? spec.canvas.kind;
  const palette = getPalette(paletteId);
  const layoutIndex = findLayoutIndex(spec.layoutId, palette);
  const build = LAYOUTS[layoutIndex];
  if (!build) return spec;
  const base = build(palette, copyFromSpec(spec));
  const composition = spec.artworkVersion === 1 ? themedComposition(spec.categoryKey, spec.variant, palette, base) : base;

  const moved = new Map<PlaceholderField, PlaceholderSlot>(spec.slots.map((s) => [s.field, s]));
  const slots = composition.slots.map((s) => {
    const prev = moved.get(s.field);
    return prev ? { ...s, cx: prev.cx, cy: prev.cy, w: prev.w, h: prev.h } : s;
  });

  return {
    ...spec,
    canvas: CANVAS[canvasKind],
    palette,
    background: { ...spec.background, from: palette.bgFrom, to: palette.bgTo },
    blocks: composition.blocks,
    slots,
  };
}

/** Cycles the background: rotates the gradient angle and toggles the scrim. */
export function cycleBackgroundVariant(spec: TemplateSpec): TemplateSpec {
  const variant = spec.variant + 1;
  const angle = (spec.background.angle + 45) % 360;
  const scrimTable = [0.22, 0.12, 0.05];
  return {
    ...spec,
    variant,
    background: { ...spec.background, angle, scrim: scrimTable[variant % scrimTable.length] ?? 0.12 },
  };
}

export function moveSlot(
  spec: TemplateSpec,
  slotId: string,
  next: { cx: number; cy: number },
): TemplateSpec {
  return {
    ...spec,
    slots: spec.slots.map((s) => {
      if (s.id !== slotId) return s;
      const snapped: PlaceholderSlot = {
        ...s,
        cx: snapAxis(next.cx, SNAP_GUIDES_X),
        cy: snapAxis(next.cy, SNAP_GUIDES_Y),
      };
      return { ...snapped, ...clampCenter(snapped) };
    }),
  };
}

export function resizeSlot(
  spec: TemplateSpec,
  slotId: string,
  next: { w: number; h: number },
): TemplateSpec {
  return {
    ...spec,
    slots: spec.slots.map((s) => {
      if (s.id !== slotId) return s;
      const resized: PlaceholderSlot = {
        ...s,
        w: Math.min(Math.max(next.w, 0.04), 0.9),
        h: Math.min(Math.max(next.h, 0.03), 0.9),
      };
      return { ...resized, ...clampCenter(resized) };
    }),
  };
}

/** Restores the original slot geometry by recomposing and clearing moves. */
export function resetLayout(spec: TemplateSpec): TemplateSpec {
  const palette = getPalette(spec.palette.id);
  const layoutIndex = findLayoutIndex(spec.layoutId, palette);
  const build = LAYOUTS[layoutIndex];
  if (!build) return spec;
  const base = build(palette, copyFromSpec(spec));
  const composition = spec.artworkVersion === 1 ? themedComposition(spec.categoryKey, spec.variant, palette, base) : base;
  return { ...spec, slots: composition.slots };
}

/** The palette ids offered for the current template's category. */
export function paletteChoicesFor(categoryKey: string): string[] {
  const category = getCategory(categoryKey);
  const base = category ? [...category.paletteIds] : [];
  for (const fb of ["saleBold", "peacockFestive", "weddingMaroon", "newArrivalsTeal"]) {
    if (base.length >= 4) break;
    if (!base.includes(fb)) base.push(fb);
  }
  return base;
}
