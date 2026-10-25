import { escapeXml, frameLayer, heroMotifSvg, renderMotifLayer, topBand } from "./motifs";
import { createRng } from "./prng";
import { fitText } from "./fit";
import { isLogoField, type PlaceholderSlot, type RenderContent, type TemplateSpec, type TextBlock } from "./types";

const FONT_STACK =
  "'Noto Sans Devanagari','Noto Sans','Mukta','Poppins',system-ui,sans-serif";
const DISPLAY_STACK =
  "'Poppins','Baloo 2','Noto Sans Devanagari',system-ui,sans-serif";

function gradCoords(angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  const x = Math.cos(a);
  const y = Math.sin(a);
  return {
    x1: (0.5 - x / 2).toFixed(3),
    y1: (0.5 - y / 2).toFixed(3),
    x2: (0.5 + x / 2).toFixed(3),
    y2: (0.5 + y / 2).toFixed(3),
  };
}

const n = (v: number) => (Math.round(v * 100) / 100).toString();

function roundedRect(x: number, y: number, w: number, h: number, r: number, fill: string, extra?: string) {
  const rx = Math.min(r, w / 2, h / 2);
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(rx)}" fill="${fill}"${extra ? ` ${extra}` : ""}/>`;
}

function renderTextBlock(block: TextBlock, overrideText: string | undefined, W: number, H: number): string {
  const raw = (overrideText ?? block.defaultText).replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const maxW = block.maxWidth * W;
  const ideal = block.sizeRatio * W;
  const fit = fitText(raw, maxW, ideal, {
    weight: block.weight,
    uppercase: block.uppercase,
    maxLines: block.role === "headline" ? 3 : 2,
  });
  const shown = block.uppercase ? fit.lines.map((l) => l.toUpperCase()) : fit.lines;
  const lineHeight = fit.fontSizePx * 1.14;
  const cx = block.cx * W;
  const cy = block.cy * H;
  const startY = cy - ((shown.length - 1) * lineHeight) / 2;
  const anchor = block.align === "center" ? "middle" : block.align === "right" ? "end" : "start";
  const blockLeft =
    block.align === "center" ? cx - maxW / 2 : block.align === "right" ? cx - maxW : cx;

  let treatment = "";
  const textW = Math.min(maxW, Math.max(...shown.map((l) => l.length)) * fit.fontSizePx * 0.56);
  const padX = fit.fontSizePx * 0.7;
  const padY = fit.fontSizePx * 0.45;
  const boxW = textW + padX * 2;
  const boxH = shown.length * lineHeight + padY * 2;
  const boxX = block.align === "center" ? cx - boxW / 2 : blockLeft - padX;
  const boxY = cy - boxH / 2;
  if (block.treatment === "badge" || block.treatment === "ribbon") {
    const fill = block.treatment === "ribbon" ? block.color : "#ffffff";
    const txtColor = block.treatment === "ribbon" ? block.color : undefined;
    void txtColor;
    treatment = roundedRect(
      block.align === "center" ? cx - boxW / 2 : boxX,
      boxY,
      boxW,
      boxH,
      block.treatment === "ribbon" ? boxH / 2 : 10,
      fill,
      `opacity="${block.treatment === "ribbon" ? 0.16 : 1}"`,
    );
    if (block.treatment === "badge") {
      // Badge uses the block's own accent text color for contrast.
    }
  } else if (block.treatment === "outline") {
    treatment = roundedRect(
      block.align === "center" ? cx - boxW / 2 : boxX,
      boxY,
      boxW,
      boxH,
      boxH / 2,
      "none",
      `stroke="${block.color}" stroke-width="${n(Math.max(2, fit.fontSizePx * 0.06))}"`,
    );
  } else if (block.treatment === "footerBand") {
    treatment = roundedRect(0, boxY, W, boxH, 0, block.color, `opacity="0.18"`);
  }

  const tspans = shown
    .map(
      (line, i) =>
        `<tspan x="${n(anchor === "middle" ? cx : anchor === "end" ? cx : blockLeft)}" y="${n(startY + i * lineHeight)}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  const ls = block.letterSpacingEm ? ` letter-spacing="${n(block.letterSpacingEm * fit.fontSizePx)}"` : "";
  return (
    `<g>` +
    treatment +
    `<text font-family="${block.role === "headline" ? DISPLAY_STACK : FONT_STACK}" font-size="${n(fit.fontSizePx)}" font-weight="${block.weight}" fill="${block.color}" text-anchor="${anchor}" dominant-baseline="middle"${ls}>${tspans}</text>` +
    `</g>`
  );
}

function clipId(spec: TemplateSpec, slot: PlaceholderSlot): string {
  return `${spec.id}-${slot.id}`.replace(/[^a-zA-Z0-9_-]/g, "");
}

function renderSlot(
  spec: TemplateSpec,
  slot: PlaceholderSlot,
  content: RenderContent,
  W: number,
  H: number,
): string {
  const value = content.values?.find((v) => v.field === slot.field);
  if (value && !value.visible) return "";
  const accent = slot.accentColor ?? spec.palette.accent;
  const cx = slot.cx * W;
  const cy = slot.cy * H;
  const w = slot.w * W;
  const h = slot.h * W; // height normalized to width scale to keep aspect sensible

  if (isLogoField(slot.field)) {
    const url = value?.logoUrl;
    const id = clipId(spec, slot);
    const size = Math.max(w, h);
    const r = size / 2;
    const ring =
      slot.style === "framedLogo"
        ? `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r + 4)}" fill="none" stroke="${accent}" stroke-width="4"/>`
        : "";
    if (!url) {
      // Filled emblem disc so a missing logo never leaves a hole.
      return (
        `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${accent}" opacity="0.9"/>` +
        `<text x="${n(cx)}" y="${n(cy)}" font-family="${DISPLAY_STACK}" font-size="${n(size * 0.5)}" fill="${spec.palette.onAccent}" text-anchor="middle" dominant-baseline="middle" font-weight="800">PP</text>` +
        ring
      );
    }
    return (
      `<defs><clipPath id="${id}"><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"/></clipPath></defs>` +
      `<image href="${escapeXml(url)}" x="${n(cx - r)}" y="${n(cy - r)}" width="${n(size)}" height="${n(size)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>` +
      `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="none" stroke="#ffffff" stroke-opacity="0.85" stroke-width="3"/>` +
      ring
    );
  }

  const text = value?.text;
  if (!text) return "";

  const idealFontSize = Math.max(12, h * 0.72);
  const fit = fitText(text, w, idealFontSize, { weight: 600, maxLines: 2 });
  const lines = fit.lines;
  const lineHeight = fit.fontSizePx * 1.15;
  const startY = cy - ((lines.length - 1) * lineHeight) / 2;
  const tspans = lines
    .map((l, i) => `<tspan x="${n(cx)}" y="${n(startY + i * lineHeight)}">${escapeXml(l)}</tspan>`)
    .join("");

  let plate = "";
  const padX = fit.fontSizePx * 0.6;
  const boxW = Math.min(w + padX * 2, Math.max(...lines.map((l) => l.length)) * fit.fontSizePx * 0.6 + padX * 2);
  const boxH = lines.length * lineHeight + fit.fontSizePx * 0.5;
  const boxX = cx - boxW / 2;
  const boxY = cy - boxH / 2;
  switch (slot.style) {
    case "pill":
      plate = roundedRect(boxX, boxY, boxW, boxH, boxH / 2, accent, `opacity="0.9"`);
      break;
    case "ribbon":
      plate = roundedRect(boxX, boxY, boxW, boxH, 6, accent, `opacity="0.92"`);
      break;
    case "footerBand":
      plate = roundedRect(0, boxY, W, boxH, 0, "#000000", `opacity="0.28"`);
      break;
    case "namePlate":
      plate = roundedRect(boxX, boxY, boxW, boxH, 8, "#000000", `opacity="0.18"`);
      break;
    case "divider":
      plate =
        `<line x1="${n(cx - boxW / 2 - 20)}" y1="${n(cy)}" x2="${n(cx - boxW / 2 - 6)}" y2="${n(cy)}" stroke="${accent}" stroke-width="2"/>` +
        `<line x1="${n(cx + boxW / 2 + 6)}" y1="${n(cy)}" x2="${n(cx + boxW / 2 + 20)}" y2="${n(cy)}" stroke="${accent}" stroke-width="2"/>`;
      break;
    default:
      plate = "";
  }
  const textColor =
    slot.style === "pill" || slot.style === "ribbon" ? spec.palette.onAccent : spec.palette.text;

  return (
    `<g>${plate}` +
    `<text font-family="${FONT_STACK}" font-size="${n(fit.fontSizePx)}" font-weight="600" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${tspans}</text>` +
    `</g>`
  );
}

/**
 * Renders a template spec to a standalone SVG string. The same output backs
 * grid thumbnails (responsive) and high-resolution PNG export, so the WYSIWYG
 * in the editor is exactly what gets downloaded.
 *
 * `responsive: true` omits fixed pixel width/height and lets the SVG fill its
 * container via CSS. Display the SVG inline (not through an <img> data URL) so
 * remote logo `<image href>` assets can actually load.
 */
export function renderTemplateToSvg(
  spec: TemplateSpec,
  content: RenderContent = {},
  opts?: { responsive?: boolean; excludeSlots?: boolean },
): string {
  const canvas = content.canvas ?? spec.canvas;
  const W = canvas.width;
  const H = canvas.height;
  const g = gradCoords(spec.background.angle);
  const rng = createRng(`${spec.id}:deco`);

  const bgStops =
    spec.background.kind === "flat"
      ? `<stop offset="0" stop-color="${spec.background.from}"/><stop offset="1" stop-color="${spec.background.from}"/>`
      : `<stop offset="0" stop-color="${spec.background.from}"/><stop offset="1" stop-color="${spec.background.to}"/>`;

  const defs = `<defs><linearGradient id="bg-${clipId(spec, { id: "bg", field: "mfr_logo", cx: 0, cy: 0, w: 0, h: 0, style: "pill" })}" gradientUnits="objectBoundingBox" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}">${bgStops}</linearGradient></defs>`;

  const motifLayer = renderMotifLayer(spec.motifs, rng, W, H, spec.palette, spec.variant);
  // Festival-specific arrangement: corner ornaments or a top garland band, plus
  // one large hero emblem near the bottom (the poster's signature artwork).
  const primary = spec.motifs[0];
  const arrangement =
    spec.decoKind === "frame" && primary
      ? frameLayer(primary, W, H, spec.palette)
      : spec.decoKind === "band" && primary
        ? topBand(primary, W, H, spec.palette)
        : "";
  const hero = spec.heroMotif ? heroMotifSvg(spec.heroMotif, W, H, spec.palette) : "";
  const scrimRect =
    spec.background.scrim > 0
      ? `<rect width="${W}" height="${H}" fill="#000000" opacity="${n(spec.background.scrim)}"/>`
      : "";

  const blocks = spec.blocks.map((b) => renderTextBlock(b, content.text?.[b.role], W, H)).join("");
  const slots = opts?.excludeSlots
    ? ""
    : spec.slots.map((s) => renderSlot(spec, s, content, W, H)).join("");

  const bgId = `bg-${clipId(spec, { id: "bg", field: "mfr_logo", cx: 0, cy: 0, w: 0, h: 0, style: "pill" })}`;
  const sizeAttrs = opts?.responsive
    ? `style="width:100%;height:auto;display:block" preserveAspectRatio="xMidYMid meet"`
    : `width="${W}" height="${H}"`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${sizeAttrs} viewBox="0 0 ${W} ${H}">` +
    defs +
    `<rect width="${W}" height="${H}" fill="url(#${bgId})"/>` +
    `<g>${motifLayer}</g>` +
    `<g>${arrangement}</g>` +
    `<g>${hero}</g>` +
    scrimRect +
    blocks +
    slots +
    `</svg>`
  );
}

/** Data-URL form, handy for <img src> thumbnails. */
export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
