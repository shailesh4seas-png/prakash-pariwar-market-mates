import { renderTemplateToSvg } from "./render";
import type { RenderContent, TemplateSpec } from "./types";
import { specArtwork } from "./artwork";

/**
 * Client-side PNG export. Rasterises the exact SVG the editor shows so a
 * retailer downloads the real thing they see.
 *
 * Logos are inlined as data URLs first. Supabase signed URLs normally allow a
 * cross-origin GET, but if a fetch fails (CORS / offline) we drop just that logo
 * and keep the rest of the render rather than tainting the whole canvas — so an
 * export always produces a file.
 */
async function inlineLogo(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function buildContentWithInlinedLogos(content: RenderContent): Promise<RenderContent> {
  if (!content.values?.some((v) => v.logoUrl)) return content;
  const values = await Promise.all(
    content.values.map(async (v) => {
      if (!v.logoUrl) return v;
      const dataUrl = await inlineLogo(v.logoUrl);
      if (dataUrl) return { ...v, logoUrl: dataUrl };
      const clone = { ...v };
      delete clone.logoUrl;
      return clone;
    }),
  );
  return { ...content, values };
}

export interface ExportResult {
  width: number;
  height: number;
  blob: Blob;
}

export async function renderTemplateToBlob(spec: TemplateSpec, content: RenderContent = {}): Promise<ExportResult> {
  if (typeof document === "undefined") throw new Error("PNG export runs in the browser only.");
  const canvas = content.canvas ?? spec.canvas;
  const merged: RenderContent = {...content, ...(content.values ? { values: content.values.map(v=>({...v,...spec.brandOverrides?.[v.field]})) } : {})};
  const inlined = await buildContentWithInlinedLogos(merged);
  const exportSpec = {...spec, brandOverrides: {...spec.brandOverrides}};
  for (const [field, override] of Object.entries(exportSpec.brandOverrides)) {
    if (override.logoUrl) {
      const url = await inlineLogo(override.logoUrl);
      exportSpec.brandOverrides[field as keyof typeof exportSpec.brandOverrides] = {...override, logoUrl:url ?? ''};
    }
  }
  let svg = renderTemplateToSvg(exportSpec, inlined);
  const artwork = specArtwork(spec);
  if (artwork) {
    const data = await inlineLogo(artwork);
    if (!data) throw new Error('Festival artwork could not load. Please try again.');
    svg = svg.replace(artwork, data);
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      try {
        const out = document.createElement("canvas");
        out.width = canvas.width;
        out.height = canvas.height;
        const ctx = out.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D context unavailable.");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        out.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to encode PNG."))), "image/png");
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error instanceof Error ? error : new Error("Export failed."));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not rasterise the template."));
    };
    img.src = url;
  });

  return { width: canvas.width, height: canvas.height, blob };
}

/** Renders and triggers a browser download of the template as a PNG. */
export async function exportTemplateToPng(
  spec: TemplateSpec,
  content: RenderContent = {},
  filename = "prakash-pariwar-creative.png",
): Promise<void> {
  const { blob } = await renderTemplateToBlob(spec, content);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/[^\w.-]+/g, "_");
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
