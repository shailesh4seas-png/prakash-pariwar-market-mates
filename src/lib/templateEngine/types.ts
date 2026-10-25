/**
 * Template engine types.
 *
 * A template is a pure JSON spec (no bitmap dependencies) that is rendered to
 * crisp SVG/HTML. This keeps every one of the 30 templates in a category
 * visually distinct by combining layouts x palettes x motif sets, while letting
 * the same spec drive thumbnails, the editor, the retailer preview and PNG
 * export from a single source of truth.
 */

export type CanvasKind = "post" | "story";

export interface Canvas {
  kind: CanvasKind;
  width: number;
  height: number;
}

export const CANVAS: Record<CanvasKind, Canvas> = {
  post: { kind: "post", width: 1080, height: 1080 },
  story: { kind: "story", width: 1080, height: 1920 },
};

export type TextRole = "headline" | "subheadline" | "offer" | "cta";

export type TextAlign = "left" | "center" | "right";

/** A designer-authored text block. Coordinates are normalized (0..1) against the canvas. */
export interface TextBlock {
  id: string;
  role: TextRole;
  /** Fallback copy authored by the engine so a template never looks empty. */
  defaultText: string;
  /** Normalized center-x of the block's safe area (0..1). */
  cx: number;
  /** Normalized baseline-ish center-y of the block (0..1). */
  cy: number;
  /** Normalized max width of the block (0..1). Text wraps/shrinks to fit this. */
  maxWidth: number;
  align: TextAlign;
  /** Font size as a fraction of canvas width. */
  sizeRatio: number;
  weight: number;
  color: string;
  /** Optional decorative treatment behind the text (badge / ribbon / band). */
  treatment?: TextTreatment;
  /** Optional letter-spacing (em) for eyebrow/CTA styling. */
  letterSpacingEm?: number;
  uppercase?: boolean;
}

export type TextTreatment = "none" | "badge" | "ribbon" | "footerBand" | "outline";

/** Placeholder fields that get auto-filled from the manufacturer / retailer profiles. */
export type PlaceholderField =
  | "mfr_business_name"
  | "mfr_logo"
  | "mfr_phone"
  | "mfr_email"
  | "rtl_business_name"
  | "rtl_logo"
  | "rtl_phone"
  | "rtl_email"
  | "rtl_address";

export const MANUFACTURER_FIELDS: PlaceholderField[] = [
  "mfr_business_name",
  "mfr_logo",
  "mfr_phone",
  "mfr_email",
];
export const RETAILER_FIELDS: PlaceholderField[] = [
  "rtl_business_name",
  "rtl_logo",
  "rtl_phone",
  "rtl_email",
  "rtl_address",
];

export function fieldOwner(field: PlaceholderField): "manufacturer" | "retailer" {
  return field.startsWith("mfr_") ? "manufacturer" : "retailer";
}

export function isLogoField(field: PlaceholderField): boolean {
  return field === "mfr_logo" || field === "rtl_logo";
}

export type PlaceholderStyle =
  | "logoCircle"
  | "framedLogo"
  | "namePlate"
  | "pill"
  | "footerBand"
  | "ribbon"
  | "divider";

/**
 * A designed slot (not a raw form field). Positions are saved with the template
 * by the manufacturer; the retailer can nudge their own blocks before download.
 */
export interface PlaceholderSlot {
  id: string;
  field: PlaceholderField;
  /** Normalized center of the slot (0..1). Kept inside the canvas safe area. */
  cx: number;
  cy: number;
  /** Normalized size (0..1 of the relevant canvas dimension). */
  w: number;
  h: number;
  style: PlaceholderStyle;
  /** Optional per-slot accent override; defaults to palette accent. */
  accentColor?: string;
  /** True when the block auto-hides if its value is empty (optional fields). */
  collapsible?: boolean;
}

export type BackgroundKind = "gradient" | "flat";

export interface Background {
  kind: BackgroundKind;
  from: string;
  to: string;
  /** Gradient angle in degrees. */
  angle: number;
  /** Optional subtle vignette / scrim strength over the background (0..1). */
  scrim: number;
}

export type MotifId =
  | "diya"
  | "rangoli"
  | "lantern"
  | "snowflake"
  | "colorSplash"
  | "kite"
  | "flag"
  | "crescentStar"
  | "leaves"
  | "rain"
  | "sun"
  | "flowers"
  | "sparkles"
  | "bunting";

export interface Palette {
  id: string;
  /** Background gradient stops. */
  bgFrom: string;
  bgTo: string;
  /** Primary accent (badges, CTAs). */
  accent: string;
  /** Secondary accent (dividers, highlights). */
  accentAlt: string;
  /** Main text color over the background. */
  text: string;
  /** Text color used on top of accent fills. */
  onAccent: string;
}

export interface LayoutComposition {
  id: string;
  /** Ordered text blocks produced by this composition. */
  blocks: TextBlock[];
  /** Ordered placeholder slots produced by this composition. */
  slots: PlaceholderSlot[];
}

/**
 * A fully resolved, renderable template. `layoutId`, `paletteId`, `motifs` and
 * `variant` are retained so the editor can offer "change colour / background
 * variant / canvas size" without losing the design identity.
 */
export interface TemplateSpec {
  id: string;
  categoryKey: string;
  canvas: Canvas;
  palette: Palette;
  layoutId: string;
  motifs: MotifId[];
  /** Background variant index (bigger number = denser / different motif placement). */
  variant: number;
  background: Background;
  blocks: TextBlock[];
  slots: PlaceholderSlot[];
}

/** Values resolved for a single placeholder at render time. */
export interface ResolvedValue {
  field: PlaceholderField;
  text?: string;
  logoUrl?: string;
  /** False when the value is empty and the block is collapsible (hide it). */
  visible: boolean;
}

/** Copy + resolved placeholder content used to render a filled template. */
export interface RenderContent {
  /** Overrides keyed by text block role. Falls back to block.defaultText. */
  text?: Partial<Record<TextRole, string>>;
  /** Resolved placeholder values; missing fields are auto-hidden when collapsible. */
  values?: ResolvedValue[];
  /** Canvas size to render at (defaults to the spec canvas). */
  canvas?: Canvas;
}

export interface FontFitResult {
  /** Suggested font-size (px) that keeps the text inside the safe width. */
  fontSizePx: number;
  /** Lines the text breaks into at the chosen size. */
  lines: string[];
  /** True if the text had to be shrunk below the ideal size to fit. */
  shrunk: boolean;
}
