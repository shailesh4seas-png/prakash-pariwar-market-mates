import {
  fieldOwner,
  isLogoField,
  MANUFACTURER_FIELDS,
  RETAILER_FIELDS,
  type FontFitResult,
  type PlaceholderField,
  type PlaceholderSlot,
  type ResolvedValue,
  type ValueOverrides,
} from "./types";

export type { ValueOverrides };

/** Minimal profile shape the auto-fill needs (subset of user_profiles + signed logo). */
export interface BrandProfile {
  businessName: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface AutoFillInput {
  manufacturer: BrandProfile;
  retailer: BrandProfile;
}

function textFor(field: PlaceholderField, p: BrandProfile): string {
  switch (field) {
    case "mfr_business_name":
    case "rtl_business_name":
      return p.businessName.trim();
    case "mfr_phone":
    case "rtl_phone":
      return (p.phone ?? "").trim();
    case "mfr_email":
    case "rtl_email":
      return (p.email ?? "").trim();
    case "rtl_address":
      return (p.address ?? "").trim();
    default:
      return "";
  }
}

function logoFor(field: PlaceholderField, p: BrandProfile): string | undefined {
  if (!isLogoField(field)) return undefined;
  const url = p.logoUrl?.trim();
  return url ? url : undefined;
}

/**
 * Resolves a placeholder's visible content from profiles + overrides.
 * - Manufacturer blocks read the manufacturer profile; retailer blocks the retailer's.
 * - Required blocks (names) always show (with a graceful fallback).
 * - Optional / collapsible blocks hide when empty so the layout collapses cleanly.
 */
export function resolveValue(
  field: PlaceholderField,
  input: AutoFillInput,
  overrides?: ValueOverrides,
  slot?: PlaceholderSlot,
): ResolvedValue {
  const profile = fieldOwner(field) === "manufacturer" ? input.manufacturer : input.retailer;
  const override = overrides?.[field];
  const base = isLogoField(field)
    ? { visible: true }
    : { text: textFor(field, profile), visible: true };
  const logoUrl = override?.logoUrl ?? logoFor(field, profile);
  const text = override?.text ?? (isLogoField(field) ? undefined : base.text);

  const fallbackName: Partial<Record<PlaceholderField, string>> = {
    mfr_business_name: "Your Manufacturer",
    rtl_business_name: "Your Store",
  };

  let value = (text ?? "").trim();
  if (!value && !isLogoField(field) && fallbackName[field]) value = fallbackName[field]!;

  const hasContent = isLogoField(field) ? Boolean(logoUrl) : value.length > 0;
  const collapsible = slot?.collapsible ?? !isLogoField(field);
  const visible = hasContent || !collapsible;

  const result: ResolvedValue = { field, visible };
  if (isLogoField(field)) {
    if (logoUrl) result.logoUrl = logoUrl;
  } else if (value) {
    result.text = value;
  }
  return result;
}

/** Convenience: resolve every manufacturer + retailer field. */
export function autoFillAll(
  input: AutoFillInput,
  overrides?: ValueOverrides,
): Record<PlaceholderField, ResolvedValue> {
  const out = {} as Record<PlaceholderField, ResolvedValue>;
  for (const field of [...MANUFACTURER_FIELDS, ...RETAILER_FIELDS]) {
    out[field] = resolveValue(field, input, overrides);
  }
  return out;
}

/** Average glyph width as a fraction of font-size, per font-weight bucket. */
function avgCharWidthRatio(weight: number, uppercase: boolean | undefined): number {
  let ratio = weight >= 700 ? 0.6 : weight >= 500 ? 0.52 : 0.5;
  if (uppercase) ratio += 0.04;
  return ratio;
}

export interface FitOptions {
  /** Floor for the shrink loop, as a fraction of the ideal size (default 0.55). */
  minRatio?: number;
  /** Max lines before we stop shrinking and just truncate (default 3). */
  maxLines?: number;
  lineHeight?: number;
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars || !current) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Shrinks / wraps text so it always fits the block's safe width and never
 * overflows the canvas. Pure (no DOM measurement) so it is unit-testable and
 * behaves identically in the editor and at export time.
 */
export function fitText(
  text: string,
  maxWidthPx: number,
  idealFontSizePx: number,
  opts?: { weight?: number | undefined; uppercase?: boolean | undefined } & FitOptions,
): FontFitResult {
  const weight = opts?.weight ?? 800;
  const minRatio = opts?.minRatio ?? 0.55;
  const maxLines = opts?.maxLines ?? 3;
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return { fontSizePx: idealFontSizePx, lines: [], shrunk: false };

  const ratio = avgCharWidthRatio(weight, opts?.uppercase);
  let size = idealFontSizePx;
  const floor = idealFontSizePx * minRatio;
  let lines: string[] = [];
  let shrunk = false;

  // Shrink until the wrapped text fits within both width and line budget.
  for (let guard = 0; guard < 12; guard++) {
    const maxChars = Math.max(4, Math.floor(maxWidthPx / (size * ratio)));
    lines = wrap(clean, maxChars);
    if (lines.length <= maxLines) {
      shrunk = size < idealFontSizePx - 0.001;
      break;
    }
    size = Math.max(floor, size * 0.9);
    if (size <= floor) {
      // Last resort: cap lines and ellipsize the final one.
      lines = lines.slice(0, maxLines);
      const last = lines[maxLines - 1];
      if (last && last.length >= maxChars) lines[maxLines - 1] = `${last.slice(0, maxChars - 1)}…`;
      shrunk = true;
      break;
    }
  }
  return { fontSizePx: size, lines, shrunk };
}

/** Keeps a draggable slot's center inside the canvas safe area. */
export function clampToSafeArea(
  slot: PlaceholderSlot,
  safe: { x: number; y: number; width: number; height: number },
): { cx: number; cy: number } {
  const halfW = slot.w / 2;
  const halfH = slot.h / 2;
  const minX = safe.x + halfW;
  const maxX = safe.x + safe.width - halfW;
  const minY = safe.y + halfH;
  const maxY = safe.y + safe.height - halfH;
  return {
    cx: Math.min(Math.max(slot.cx, minX), maxX),
    cy: Math.min(Math.max(slot.cy, minY), maxY),
  };
}

/** Snaps a normalized coordinate to guides within a threshold. */
export function snap(value: number, guides: number[], threshold = 0.01): number {
  for (const g of guides) if (Math.abs(value - g) <= threshold) return g;
  return value;
}
