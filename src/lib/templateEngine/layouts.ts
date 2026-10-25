import type {
  LayoutComposition,
  Palette,
  PlaceholderField,
  PlaceholderSlot,
  PlaceholderStyle,
  TextAlign,
  TextBlock,
  TextTreatment,
} from "./types";

/** Themed copy injected by the generator so a layout is reusable across categories. */
export interface Copy {
  headline: string;
  subheadline: string;
  offer: string;
  cta: string;
}

interface TextOpts {
  role: TextBlock["role"];
  cx: number;
  cy: number;
  maxWidth: number;
  align?: TextAlign;
  sizeRatio?: number;
  weight?: number;
  treatment?: TextTreatment;
  letterSpacingEm?: number;
  uppercase?: boolean;
  color?: string;
}

function text(palette: Palette, copy: Copy, o: TextOpts): TextBlock {
  const colorByRole: Record<TextBlock["role"], string> = {
    headline: palette.text,
    subheadline: palette.text,
    offer: palette.onAccent,
    cta: palette.onAccent,
  };
  const content: Record<TextBlock["role"], string> = {
    headline: copy.headline,
    subheadline: copy.subheadline,
    offer: copy.offer,
    cta: copy.cta,
  };
  const block: TextBlock = {
    id: o.role,
    role: o.role,
    defaultText: content[o.role],
    cx: o.cx,
    cy: o.cy,
    maxWidth: o.maxWidth,
    align: o.align ?? "center",
    sizeRatio: o.sizeRatio ?? 0.06,
    weight: o.weight ?? 800,
    color: o.color ?? colorByRole[o.role],
  };
  if (o.treatment && o.treatment !== "none") block["treatment"] = o.treatment;
  if (o.letterSpacingEm !== undefined) block["letterSpacingEm"] = o.letterSpacingEm;
  if (o.uppercase) block["uppercase"] = true;
  return block;
}

function slot(
  field: PlaceholderField,
  cx: number,
  cy: number,
  w: number,
  h: number,
  style: PlaceholderStyle,
  extra?: Partial<PlaceholderSlot>,
): PlaceholderSlot {
  const s: PlaceholderSlot = { id: field, field, cx, cy, w, h, style };
  if (extra?.collapsible !== undefined) s.collapsible = extra.collapsible;
  if (extra?.accentColor !== undefined) s.accentColor = extra.accentColor;
  return s;
}

/** All nine branded fields, arranged into a horizontal contact strip. */
function retailerStripBase(cyTop: number): PlaceholderSlot[] {
  return [
    slot("rtl_logo", 0.14, cyTop, 0.12, 0.12, "logoCircle"),
    slot("rtl_business_name", 0.42, cyTop - 0.03, 0.5, 0.05, "namePlate", { collapsible: false }),
    slot("rtl_phone", 0.3, cyTop + 0.035, 0.28, 0.04, "pill"),
    slot("rtl_email", 0.62, cyTop + 0.035, 0.3, 0.04, "pill", { collapsible: true }),
    slot("rtl_address", 0.5, cyTop + 0.085, 0.62, 0.04, "divider", { collapsible: true }),
  ];
}

function mfrHeaderBase(cy: number, alignLeft: boolean): PlaceholderSlot[] {
  const logoX = alignLeft ? 0.1 : 0.9;
  const nameX = alignLeft ? 0.4 : 0.6;
  return [
    slot("mfr_logo", logoX, cy, 0.1, 0.1, "framedLogo"),
    slot("mfr_business_name", nameX, cy, 0.44, 0.05, "namePlate", { collapsible: false }),
    slot("mfr_phone", 0.5, cy + 0.06, 0.3, 0.04, "pill"),
    slot("mfr_email", 0.5, cy + 0.11, 0.34, 0.04, "pill", { collapsible: true }),
  ];
}

/**
 * Ten distinct base compositions. The generator cycles through them (and mixes
 * palettes / variants) so the 30 templates in a category read as genuinely
 * different designs, not recolored duplicates.
 */
export const LAYOUTS: ((palette: Palette, copy: Copy) => LayoutComposition)[] = [
  // 0 — Classic top emblem, centered hero, full footer band.
  (p, c) => ({
    id: "classicTop",
    blocks: [
      text(p, c, { role: "offer", cx: 0.5, cy: 0.2, maxWidth: 0.5, treatment: "badge", sizeRatio: 0.032, uppercase: true, letterSpacingEm: 0.08 }),
      text(p, c, { role: "headline", cx: 0.5, cy: 0.36, maxWidth: 0.8, sizeRatio: 0.075 }),
      text(p, c, { role: "subheadline", cx: 0.5, cy: 0.47, maxWidth: 0.72, sizeRatio: 0.04, weight: 500 }),
      text(p, c, { role: "cta", cx: 0.5, cy: 0.62, maxWidth: 0.5, treatment: "ribbon", sizeRatio: 0.038 }),
    ],
    slots: [
      slot("mfr_logo", 0.1, 0.08, 0.1, 0.1, "framedLogo"),
      slot("mfr_business_name", 0.4, 0.075, 0.4, 0.05, "namePlate", { collapsible: false }),
      slot("mfr_phone", 0.85, 0.06, 0.26, 0.04, "pill"),
      slot("mfr_email", 0.85, 0.105, 0.26, 0.04, "pill", { collapsible: true }),
      ...retailerStripBase(0.84),
    ],
  }),
  // 1 — Center medallion: framed logo top, big headline, ribbon offer.
  (p, c) => ({
    id: "centerMedallion",
    blocks: [
      text(p, c, { role: "headline", cx: 0.5, cy: 0.4, maxWidth: 0.82, sizeRatio: 0.082 }),
      text(p, c, { role: "subheadline", cx: 0.5, cy: 0.51, maxWidth: 0.66, sizeRatio: 0.042, weight: 500 }),
      text(p, c, { role: "offer", cx: 0.5, cy: 0.6, maxWidth: 0.5, treatment: "ribbon", sizeRatio: 0.036, uppercase: true }),
      text(p, c, { role: "cta", cx: 0.5, cy: 0.69, maxWidth: 0.44, treatment: "outline", sizeRatio: 0.034, color: p.accent }),
    ],
    slots: [
      slot("mfr_logo", 0.5, 0.16, 0.14, 0.14, "logoCircle"),
      slot("mfr_business_name", 0.5, 0.26, 0.5, 0.05, "namePlate", { collapsible: false }),
      slot("mfr_phone", 0.36, 0.31, 0.24, 0.04, "pill"),
      slot("mfr_email", 0.64, 0.31, 0.24, 0.04, "pill", { collapsible: true }),
      slot("rtl_logo", 0.12, 0.86, 0.11, 0.11, "logoCircle"),
      slot("rtl_business_name", 0.4, 0.83, 0.5, 0.05, "namePlate", { collapsible: false }),
      slot("rtl_phone", 0.32, 0.885, 0.28, 0.04, "pill"),
      slot("rtl_email", 0.66, 0.885, 0.28, 0.04, "pill", { collapsible: true }),
      slot("rtl_address", 0.5, 0.935, 0.6, 0.035, "divider", { collapsible: true }),
    ],
  }),
  // 2 — Split banner: left text column, right motif column, bottom retailer band.
  (p, c) => ({
    id: "splitBanner",
    blocks: [
      text(p, c, { role: "offer", cx: 0.32, cy: 0.3, maxWidth: 0.44, align: "left", treatment: "badge", sizeRatio: 0.03, uppercase: true }),
      text(p, c, { role: "headline", cx: 0.32, cy: 0.44, maxWidth: 0.5, align: "left", sizeRatio: 0.07 }),
      text(p, c, { role: "subheadline", cx: 0.32, cy: 0.56, maxWidth: 0.48, align: "left", sizeRatio: 0.038, weight: 500 }),
      text(p, c, { role: "cta", cx: 0.32, cy: 0.66, maxWidth: 0.4, align: "left", treatment: "ribbon", sizeRatio: 0.036 }),
    ],
    slots: [
      slot("mfr_logo", 0.09, 0.09, 0.1, 0.1, "framedLogo"),
      slot("mfr_business_name", 0.4, 0.085, 0.42, 0.05, "namePlate", { collapsible: false }),
      slot("mfr_phone", 0.82, 0.07, 0.3, 0.04, "pill"),
      slot("mfr_email", 0.82, 0.115, 0.3, 0.04, "pill", { collapsible: true }),
      ...retailerStripBase(0.85),
    ],
  }),
  // 3 — Editorial lower-left stack.
  (p, c) => ({
    id: "editorialLeft",
    blocks: [
      text(p, c, { role: "headline", cx: 0.34, cy: 0.5, maxWidth: 0.6, align: "left", sizeRatio: 0.085 }),
      text(p, c, { role: "subheadline", cx: 0.34, cy: 0.62, maxWidth: 0.56, align: "left", sizeRatio: 0.042, weight: 500 }),
      text(p, c, { role: "offer", cx: 0.34, cy: 0.71, maxWidth: 0.46, align: "left", treatment: "badge", sizeRatio: 0.034, uppercase: true }),
      text(p, c, { role: "cta", cx: 0.34, cy: 0.8, maxWidth: 0.42, align: "left", treatment: "ribbon", sizeRatio: 0.036 }),
    ],
    slots: [
      slot("mfr_logo", 0.09, 0.08, 0.1, 0.1, "framedLogo"),
      slot("mfr_business_name", 0.36, 0.075, 0.4, 0.05, "namePlate", { collapsible: false }),
      slot("mfr_phone", 0.85, 0.07, 0.26, 0.04, "pill"),
      slot("mfr_email", 0.85, 0.115, 0.26, 0.04, "pill", { collapsible: true }),
      ...retailerStripBase(0.9),
    ],
  }),
  // 4 — Poster bold: corner offer burst, giant headline, bottom cta.
  (p, c) => ({
    id: "posterBold",
    blocks: [
      text(p, c, { role: "headline", cx: 0.5, cy: 0.38, maxWidth: 0.86, sizeRatio: 0.1 }),
      text(p, c, { role: "subheadline", cx: 0.5, cy: 0.5, maxWidth: 0.7, sizeRatio: 0.045, weight: 600 }),
      text(p, c, { role: "cta", cx: 0.5, cy: 0.63, maxWidth: 0.5, treatment: "ribbon", sizeRatio: 0.04 }),
    ],
    slots: [
      slot("mfr_logo", 0.5, 0.13, 0.12, 0.12, "logoCircle"),
      slot("mfr_business_name", 0.5, 0.21, 0.5, 0.05, "namePlate", { collapsible: false }),
      slot("mfr_phone", 0.35, 0.26, 0.24, 0.04, "pill"),
      slot("mfr_email", 0.65, 0.26, 0.24, 0.04, "pill", { collapsible: true }),
      slot("rtl_logo", 0.14, 0.78, 0.11, 0.11, "logoCircle"),
      slot("rtl_business_name", 0.44, 0.75, 0.5, 0.05, "namePlate", { collapsible: false }),
      slot("rtl_phone", 0.34, 0.82, 0.28, 0.04, "pill"),
      slot("rtl_email", 0.66, 0.82, 0.28, 0.04, "pill", { collapsible: true }),
      slot("rtl_address", 0.5, 0.88, 0.6, 0.04, "divider", { collapsible: true }),
    ],
  }),
  // 5 — Story rhythm: vertical stack tuned for tall canvases.
  (p, c) => ({
    id: "storyStack",
    blocks: [
      text(p, c, { role: "headline", cx: 0.5, cy: 0.32, maxWidth: 0.82, sizeRatio: 0.072 }),
      text(p, c, { role: "subheadline", cx: 0.5, cy: 0.42, maxWidth: 0.72, sizeRatio: 0.042, weight: 500 }),
      text(p, c, { role: "offer", cx: 0.5, cy: 0.52, maxWidth: 0.52, treatment: "ribbon", sizeRatio: 0.038, uppercase: true }),
      text(p, c, { role: "cta", cx: 0.5, cy: 0.62, maxWidth: 0.5, treatment: "outline", sizeRatio: 0.036, color: p.accent }),
    ],
    slots: [
      slot("mfr_logo", 0.5, 0.12, 0.14, 0.14, "framedLogo"),
      slot("mfr_business_name", 0.5, 0.21, 0.5, 0.05, "namePlate", { collapsible: false }),
      slot("mfr_phone", 0.35, 0.255, 0.24, 0.04, "pill"),
      slot("mfr_email", 0.65, 0.255, 0.24, 0.04, "pill", { collapsible: true }),
      ...retailerStripBase(0.82),
    ],
  }),
  // 6 — Ribbon frame: top ribbon brand, bottom ribbon retailer.
  (p, c) => ({
    id: "ribbonFrame",
    blocks: [
      text(p, c, { role: "headline", cx: 0.5, cy: 0.42, maxWidth: 0.82, sizeRatio: 0.08 }),
      text(p, c, { role: "subheadline", cx: 0.5, cy: 0.53, maxWidth: 0.68, sizeRatio: 0.042, weight: 500 }),
      text(p, c, { role: "cta", cx: 0.5, cy: 0.64, maxWidth: 0.46, treatment: "ribbon", sizeRatio: 0.038 }),
    ],
    slots: [
      slot("mfr_logo", 0.12, 0.09, 0.11, 0.11, "framedLogo"),
      slot("mfr_business_name", 0.42, 0.09, 0.4, 0.05, "namePlate", { collapsible: false }),
      slot("mfr_phone", 0.86, 0.07, 0.24, 0.04, "pill"),
      slot("mfr_email", 0.86, 0.115, 0.24, 0.04, "pill", { collapsible: true }),
      slot("rtl_logo", 0.14, 0.86, 0.1, 0.1, "logoCircle"),
      slot("rtl_business_name", 0.44, 0.835, 0.5, 0.05, "namePlate", { collapsible: false }),
      slot("rtl_phone", 0.34, 0.895, 0.28, 0.04, "pill"),
      slot("rtl_email", 0.66, 0.895, 0.28, 0.04, "pill", { collapsible: true }),
      slot("rtl_address", 0.5, 0.945, 0.6, 0.035, "divider", { collapsible: true }),
    ],
  }),
  // 7 — Clean grid: minimal, logo chip + left hero + bottom divider contact.
  (p, c) => ({
    id: "gridClean",
    blocks: [
      text(p, c, { role: "headline", cx: 0.5, cy: 0.4, maxWidth: 0.8, sizeRatio: 0.082 }),
      text(p, c, { role: "subheadline", cx: 0.5, cy: 0.51, maxWidth: 0.68, sizeRatio: 0.044, weight: 500 }),
      text(p, c, { role: "cta", cx: 0.5, cy: 0.63, maxWidth: 0.44, treatment: "outline", sizeRatio: 0.036, color: p.accent }),
    ],
    slots: [
      slot("mfr_logo", 0.5, 0.16, 0.12, 0.12, "logoCircle"),
      slot("mfr_business_name", 0.5, 0.25, 0.46, 0.05, "namePlate", { collapsible: false }),
      slot("mfr_phone", 0.36, 0.3, 0.22, 0.035, "pill"),
      slot("mfr_email", 0.64, 0.3, 0.22, 0.035, "pill", { collapsible: true }),
      ...retailerStripBase(0.84),
    ],
  }),
  // 8 — Arch emblem: crest top, stacked text, contact card bottom.
  (p, c) => ({
    id: "archEmblem",
    blocks: [
      text(p, c, { role: "headline", cx: 0.5, cy: 0.36, maxWidth: 0.78, sizeRatio: 0.078 }),
      text(p, c, { role: "subheadline", cx: 0.5, cy: 0.47, maxWidth: 0.66, sizeRatio: 0.04, weight: 500 }),
      text(p, c, { role: "offer", cx: 0.5, cy: 0.56, maxWidth: 0.5, treatment: "badge", sizeRatio: 0.034, uppercase: true }),
      text(p, c, { role: "cta", cx: 0.5, cy: 0.65, maxWidth: 0.44, treatment: "ribbon", sizeRatio: 0.036 }),
    ],
    slots: [
      slot("mfr_logo", 0.5, 0.13, 0.15, 0.15, "logoCircle"),
      slot("mfr_business_name", 0.5, 0.24, 0.5, 0.05, "namePlate", { collapsible: false }),
      slot("mfr_phone", 0.34, 0.29, 0.24, 0.04, "pill"),
      slot("mfr_email", 0.66, 0.29, 0.24, 0.04, "pill", { collapsible: true }),
      ...retailerStripBase(0.83),
    ],
  }),
  // 9 — Festive collage: headline top, mid offer burst, side retailer column.
  (p, c) => ({
    id: "festiveCollage",
    blocks: [
      text(p, c, { role: "headline", cx: 0.42, cy: 0.34, maxWidth: 0.68, align: "left", sizeRatio: 0.086 }),
      text(p, c, { role: "subheadline", cx: 0.42, cy: 0.46, maxWidth: 0.62, align: "left", sizeRatio: 0.042, weight: 500 }),
      text(p, c, { role: "offer", cx: 0.28, cy: 0.58, maxWidth: 0.42, align: "left", treatment: "badge", sizeRatio: 0.034, uppercase: true }),
      text(p, c, { role: "cta", cx: 0.28, cy: 0.67, maxWidth: 0.4, align: "left", treatment: "ribbon", sizeRatio: 0.036 }),
    ],
    slots: [
      slot("mfr_logo", 0.09, 0.08, 0.1, 0.1, "framedLogo"),
      slot("mfr_business_name", 0.36, 0.075, 0.4, 0.05, "namePlate", { collapsible: false }),
      slot("mfr_phone", 0.85, 0.07, 0.26, 0.04, "pill"),
      slot("mfr_email", 0.85, 0.115, 0.26, 0.04, "pill", { collapsible: true }),
      slot("rtl_logo", 0.82, 0.44, 0.12, 0.12, "logoCircle"),
      slot("rtl_business_name", 0.82, 0.54, 0.3, 0.05, "namePlate", { collapsible: false }),
      slot("rtl_phone", 0.82, 0.61, 0.3, 0.04, "pill"),
      slot("rtl_email", 0.82, 0.67, 0.3, 0.04, "pill", { collapsible: true }),
      slot("rtl_address", 0.8, 0.73, 0.34, 0.05, "divider", { collapsible: true }),
    ],
  }),
  // 10 — Arch top: badge under a motif arch, centred hero, split contact bottom.
  (p, c) => ({
    id: "archTop",
    blocks: [
      text(p, c, { role: "offer", cx: 0.5, cy: 0.17, maxWidth: 0.52, treatment: "badge", sizeRatio: 0.03, uppercase: true, letterSpacingEm: 0.06 }),
      text(p, c, { role: "headline", cx: 0.5, cy: 0.34, maxWidth: 0.8, sizeRatio: 0.084 }),
      text(p, c, { role: "subheadline", cx: 0.5, cy: 0.45, maxWidth: 0.68, sizeRatio: 0.04, weight: 500 }),
      text(p, c, { role: "cta", cx: 0.5, cy: 0.56, maxWidth: 0.46, treatment: "ribbon", sizeRatio: 0.036 }),
    ],
    slots: [
      slot("mfr_logo", 0.5, 0.07, 0.1, 0.1, "framedLogo"),
      slot("mfr_business_name", 0.5, 0.64, 0.5, 0.05, "namePlate", { collapsible: false }),
      slot("mfr_phone", 0.3, 0.7, 0.26, 0.04, "pill"),
      slot("mfr_email", 0.7, 0.7, 0.26, 0.04, "pill", { collapsible: true }),
      slot("rtl_logo", 0.12, 0.88, 0.11, 0.11, "logoCircle"),
      slot("rtl_business_name", 0.42, 0.85, 0.48, 0.05, "namePlate", { collapsible: false }),
      slot("rtl_phone", 0.34, 0.91, 0.26, 0.04, "pill"),
      slot("rtl_email", 0.66, 0.91, 0.26, 0.04, "pill", { collapsible: true }),
      slot("rtl_address", 0.5, 0.96, 0.56, 0.03, "divider", { collapsible: true }),
    ],
  }),
  // 11 — Script hero: eyebrow, huge headline, hero artwork owns the bottom half.
  (p, c) => ({
    id: "scriptHero",
    blocks: [
      text(p, c, { role: "subheadline", cx: 0.5, cy: 0.16, maxWidth: 0.6, sizeRatio: 0.03, weight: 600, uppercase: true, letterSpacingEm: 0.22, color: p.accent }),
      text(p, c, { role: "headline", cx: 0.5, cy: 0.3, maxWidth: 0.88, sizeRatio: 0.11 }),
      text(p, c, { role: "offer", cx: 0.5, cy: 0.41, maxWidth: 0.56, treatment: "outline", sizeRatio: 0.034, color: p.accent }),
      text(p, c, { role: "cta", cx: 0.5, cy: 0.5, maxWidth: 0.44, treatment: "ribbon", sizeRatio: 0.034 }),
    ],
    slots: [
      slot("mfr_logo", 0.1, 0.07, 0.1, 0.1, "framedLogo"),
      slot("mfr_business_name", 0.42, 0.065, 0.4, 0.05, "namePlate", { collapsible: false }),
      slot("mfr_phone", 0.85, 0.055, 0.24, 0.038, "pill"),
      slot("mfr_email", 0.85, 0.1, 0.24, 0.038, "pill", { collapsible: true }),
      slot("rtl_business_name", 0.5, 0.9, 0.56, 0.05, "footerBand", { collapsible: false }),
      slot("rtl_logo", 0.12, 0.955, 0.07, 0.07, "logoCircle"),
      slot("rtl_phone", 0.38, 0.955, 0.24, 0.038, "namePlate"),
      slot("rtl_email", 0.66, 0.955, 0.24, 0.038, "namePlate", { collapsible: true }),
      slot("rtl_address", 0.88, 0.955, 0.2, 0.038, "namePlate", { collapsible: true }),
    ],
  }),
  // 12 — Date badge: calendar-style pill up top, stacked copy, contact card below.
  (p, c) => ({
    id: "dateBadge",
    blocks: [
      text(p, c, { role: "offer", cx: 0.5, cy: 0.12, maxWidth: 0.6, treatment: "badge", sizeRatio: 0.036, uppercase: true, letterSpacingEm: 0.08 }),
      text(p, c, { role: "headline", cx: 0.5, cy: 0.28, maxWidth: 0.82, sizeRatio: 0.09 }),
      text(p, c, { role: "subheadline", cx: 0.5, cy: 0.39, maxWidth: 0.68, sizeRatio: 0.04, weight: 500 }),
      text(p, c, { role: "cta", cx: 0.5, cy: 0.48, maxWidth: 0.42, treatment: "outline", sizeRatio: 0.034, color: p.accent }),
    ],
    slots: [
      slot("mfr_logo", 0.5, 0.58, 0.13, 0.13, "logoCircle"),
      slot("mfr_business_name", 0.5, 0.67, 0.52, 0.05, "namePlate", { collapsible: false }),
      slot("mfr_phone", 0.34, 0.73, 0.26, 0.04, "pill"),
      slot("mfr_email", 0.66, 0.73, 0.26, 0.04, "pill", { collapsible: true }),
      slot("rtl_logo", 0.12, 0.88, 0.1, 0.1, "logoCircle"),
      slot("rtl_business_name", 0.4, 0.855, 0.48, 0.05, "namePlate", { collapsible: false }),
      slot("rtl_phone", 0.34, 0.915, 0.26, 0.04, "pill"),
      slot("rtl_email", 0.66, 0.915, 0.26, 0.04, "pill", { collapsible: true }),
      slot("rtl_address", 0.5, 0.965, 0.56, 0.03, "divider", { collapsible: true }),
    ],
  }),
  // 13 — Gift stack: left copy column, right stacked brand + contact chips.
  (p, c) => ({
    id: "giftStack",
    blocks: [
      text(p, c, { role: "offer", cx: 0.3, cy: 0.24, maxWidth: 0.44, align: "left", treatment: "badge", sizeRatio: 0.03, uppercase: true }),
      text(p, c, { role: "headline", cx: 0.3, cy: 0.4, maxWidth: 0.48, align: "left", sizeRatio: 0.076 }),
      text(p, c, { role: "subheadline", cx: 0.3, cy: 0.52, maxWidth: 0.46, align: "left", sizeRatio: 0.038, weight: 500 }),
      text(p, c, { role: "cta", cx: 0.3, cy: 0.63, maxWidth: 0.4, align: "left", treatment: "ribbon", sizeRatio: 0.036 }),
    ],
    slots: [
      slot("mfr_logo", 0.8, 0.14, 0.13, 0.13, "logoCircle"),
      slot("mfr_business_name", 0.8, 0.24, 0.34, 0.05, "namePlate", { collapsible: false }),
      slot("mfr_phone", 0.8, 0.31, 0.32, 0.04, "pill"),
      slot("mfr_email", 0.8, 0.375, 0.32, 0.04, "pill", { collapsible: true }),
      slot("rtl_logo", 0.8, 0.52, 0.11, 0.11, "framedLogo"),
      slot("rtl_business_name", 0.8, 0.61, 0.34, 0.05, "namePlate", { collapsible: false }),
      slot("rtl_phone", 0.8, 0.68, 0.32, 0.04, "pill"),
      slot("rtl_email", 0.8, 0.745, 0.32, 0.04, "pill", { collapsible: true }),
      slot("rtl_address", 0.8, 0.82, 0.34, 0.05, "divider", { collapsible: true }),
    ],
  }),
  // 14 — Corner frame: symmetrical centred copy inside an ornamented frame.
  (p, c) => ({
    id: "cornerFrame",
    blocks: [
      text(p, c, { role: "subheadline", cx: 0.5, cy: 0.24, maxWidth: 0.6, sizeRatio: 0.03, weight: 600, uppercase: true, letterSpacingEm: 0.2, color: p.accent }),
      text(p, c, { role: "headline", cx: 0.5, cy: 0.36, maxWidth: 0.78, sizeRatio: 0.088 }),
      text(p, c, { role: "offer", cx: 0.5, cy: 0.46, maxWidth: 0.52, treatment: "badge", sizeRatio: 0.034, uppercase: true }),
      text(p, c, { role: "cta", cx: 0.5, cy: 0.55, maxWidth: 0.42, sizeRatio: 0.034, weight: 600, color: p.accent }),
    ],
    slots: [
      slot("mfr_logo", 0.5, 0.08, 0.11, 0.11, "framedLogo"),
      slot("mfr_business_name", 0.5, 0.155, 0.46, 0.05, "namePlate", { collapsible: false }),
      slot("mfr_phone", 0.36, 0.64, 0.26, 0.04, "pill"),
      slot("mfr_email", 0.64, 0.64, 0.26, 0.04, "pill", { collapsible: true }),
      slot("rtl_logo", 0.12, 0.9, 0.1, 0.1, "logoCircle"),
      slot("rtl_business_name", 0.38, 0.875, 0.42, 0.05, "namePlate", { collapsible: false }),
      slot("rtl_phone", 0.38, 0.935, 0.26, 0.04, "namePlate"),
      slot("rtl_email", 0.72, 0.9, 0.26, 0.04, "namePlate", { collapsible: true }),
      slot("rtl_address", 0.88, 0.945, 0.22, 0.035, "namePlate", { collapsible: true }),
    ],
  }),
  // 15 — Split right: mirrored editorial with the copy hugging the right edge.
  (p, c) => ({
    id: "splitRight",
    blocks: [
      text(p, c, { role: "offer", cx: 0.68, cy: 0.3, maxWidth: 0.44, align: "right", treatment: "badge", sizeRatio: 0.03, uppercase: true }),
      text(p, c, { role: "headline", cx: 0.68, cy: 0.44, maxWidth: 0.5, align: "right", sizeRatio: 0.072 }),
      text(p, c, { role: "subheadline", cx: 0.68, cy: 0.56, maxWidth: 0.48, align: "right", sizeRatio: 0.038, weight: 500 }),
      text(p, c, { role: "cta", cx: 0.68, cy: 0.66, maxWidth: 0.4, align: "right", treatment: "ribbon", sizeRatio: 0.036 }),
    ],
    slots: [
      slot("mfr_logo", 0.91, 0.09, 0.1, 0.1, "framedLogo"),
      slot("mfr_business_name", 0.6, 0.085, 0.42, 0.05, "namePlate", { collapsible: false }),
      slot("mfr_phone", 0.18, 0.07, 0.3, 0.04, "pill"),
      slot("mfr_email", 0.18, 0.115, 0.3, 0.04, "pill", { collapsible: true }),
      slot("rtl_logo", 0.14, 0.44, 0.12, 0.12, "logoCircle"),
      slot("rtl_business_name", 0.14, 0.54, 0.26, 0.05, "namePlate", { collapsible: false }),
      slot("rtl_phone", 0.14, 0.61, 0.24, 0.04, "pill"),
      slot("rtl_email", 0.14, 0.675, 0.24, 0.04, "pill", { collapsible: true }),
      slot("rtl_address", 0.16, 0.74, 0.28, 0.05, "divider", { collapsible: true }),
    ],
  }),
  // 16 — Banner strip: garland band on top, wide centred copy, footer contacts.
  (p, c) => ({
    id: "bannerStrip",
    blocks: [
      text(p, c, { role: "headline", cx: 0.5, cy: 0.32, maxWidth: 0.84, sizeRatio: 0.086 }),
      text(p, c, { role: "subheadline", cx: 0.5, cy: 0.43, maxWidth: 0.7, sizeRatio: 0.042, weight: 500 }),
      text(p, c, { role: "offer", cx: 0.5, cy: 0.53, maxWidth: 0.56, treatment: "ribbon", sizeRatio: 0.038, uppercase: true }),
      text(p, c, { role: "cta", cx: 0.5, cy: 0.63, maxWidth: 0.44, treatment: "outline", sizeRatio: 0.034, color: p.accent }),
    ],
    slots: [
      slot("mfr_logo", 0.1, 0.1, 0.1, 0.1, "logoCircle"),
      slot("mfr_business_name", 0.4, 0.095, 0.42, 0.05, "namePlate", { collapsible: false }),
      slot("mfr_phone", 0.85, 0.08, 0.26, 0.04, "pill"),
      slot("mfr_email", 0.85, 0.125, 0.26, 0.04, "pill", { collapsible: true }),
      ...retailerStripBase(0.84),
    ],
  }),
  // 17 — Spotlight: dark stage, nameplate brand up top, glowing centrepiece.
  (p, c) => ({
    id: "spotlight",
    blocks: [
      text(p, c, { role: "headline", cx: 0.5, cy: 0.34, maxWidth: 0.76, sizeRatio: 0.094 }),
      text(p, c, { role: "subheadline", cx: 0.5, cy: 0.45, maxWidth: 0.62, sizeRatio: 0.04, weight: 500, color: p.accent }),
      text(p, c, { role: "offer", cx: 0.5, cy: 0.55, maxWidth: 0.54, treatment: "badge", sizeRatio: 0.036, uppercase: true }),
      text(p, c, { role: "cta", cx: 0.5, cy: 0.65, maxWidth: 0.4, sizeRatio: 0.032, weight: 600, uppercase: true, letterSpacingEm: 0.12 }),
    ],
    slots: [
      slot("mfr_logo", 0.5, 0.09, 0.11, 0.11, "logoCircle"),
      slot("mfr_business_name", 0.5, 0.17, 0.5, 0.05, "footerBand", { collapsible: false }),
      slot("mfr_phone", 0.34, 0.235, 0.24, 0.04, "namePlate"),
      slot("mfr_email", 0.66, 0.235, 0.24, 0.04, "namePlate", { collapsible: true }),
      slot("rtl_logo", 0.14, 0.88, 0.1, 0.1, "logoCircle"),
      slot("rtl_business_name", 0.42, 0.855, 0.46, 0.05, "namePlate", { collapsible: false }),
      slot("rtl_phone", 0.42, 0.915, 0.26, 0.04, "pill"),
      slot("rtl_email", 0.72, 0.915, 0.24, 0.04, "pill", { collapsible: true }),
      slot("rtl_address", 0.85, 0.86, 0.24, 0.05, "divider", { collapsible: true }),
    ],
  }),
  // 18 — Stacked hero: headline top, hero art middle, full contact card bottom.
  (p, c) => ({
    id: "stackedHero",
    blocks: [
      text(p, c, { role: "headline", cx: 0.5, cy: 0.14, maxWidth: 0.84, sizeRatio: 0.084 }),
      text(p, c, { role: "subheadline", cx: 0.5, cy: 0.24, maxWidth: 0.66, sizeRatio: 0.038, weight: 500 }),
      text(p, c, { role: "offer", cx: 0.5, cy: 0.32, maxWidth: 0.5, treatment: "badge", sizeRatio: 0.032, uppercase: true }),
      text(p, c, { role: "cta", cx: 0.5, cy: 0.68, maxWidth: 0.44, treatment: "ribbon", sizeRatio: 0.036 }),
    ],
    slots: [
      slot("mfr_logo", 0.5, 0.41, 0.14, 0.14, "framedLogo"),
      slot("mfr_business_name", 0.5, 0.5, 0.52, 0.05, "namePlate", { collapsible: false }),
      slot("mfr_phone", 0.34, 0.56, 0.26, 0.04, "pill"),
      slot("mfr_email", 0.66, 0.56, 0.26, 0.04, "pill", { collapsible: true }),
      slot("rtl_logo", 0.12, 0.86, 0.11, 0.11, "logoCircle"),
      slot("rtl_business_name", 0.42, 0.83, 0.48, 0.05, "namePlate", { collapsible: false }),
      slot("rtl_phone", 0.34, 0.895, 0.26, 0.04, "pill"),
      slot("rtl_email", 0.66, 0.895, 0.26, 0.04, "pill", { collapsible: true }),
      slot("rtl_address", 0.5, 0.95, 0.56, 0.035, "divider", { collapsible: true }),
    ],
  }),
  // 19 — Poster frame: thin inner border, top offer flag, big type, bottom band.
  (p, c) => ({
    id: "posterFrame",
    blocks: [
      text(p, c, { role: "offer", cx: 0.5, cy: 0.1, maxWidth: 0.64, treatment: "ribbon", sizeRatio: 0.032, uppercase: true, letterSpacingEm: 0.1 }),
      text(p, c, { role: "headline", cx: 0.5, cy: 0.34, maxWidth: 0.78, sizeRatio: 0.096 }),
      text(p, c, { role: "subheadline", cx: 0.5, cy: 0.46, maxWidth: 0.64, sizeRatio: 0.04, weight: 500 }),
      text(p, c, { role: "cta", cx: 0.5, cy: 0.56, maxWidth: 0.46, treatment: "outline", sizeRatio: 0.034, color: p.accent }),
    ],
    slots: [
      slot("mfr_logo", 0.1, 0.2, 0.1, 0.1, "logoCircle"),
      slot("mfr_business_name", 0.4, 0.195, 0.4, 0.05, "namePlate", { collapsible: false }),
      slot("mfr_phone", 0.85, 0.18, 0.24, 0.04, "pill"),
      slot("mfr_email", 0.85, 0.225, 0.24, 0.04, "pill", { collapsible: true }),
      slot("rtl_business_name", 0.5, 0.78, 0.56, 0.05, "footerBand", { collapsible: false }),
      slot("rtl_logo", 0.12, 0.9, 0.1, 0.1, "logoCircle"),
      slot("rtl_phone", 0.4, 0.87, 0.28, 0.04, "namePlate"),
      slot("rtl_email", 0.4, 0.93, 0.28, 0.04, "namePlate", { collapsible: true }),
      slot("rtl_address", 0.74, 0.9, 0.3, 0.05, "divider", { collapsible: true }),
    ],
  }),
];

export const LAYOUT_COUNT = LAYOUTS.length;
