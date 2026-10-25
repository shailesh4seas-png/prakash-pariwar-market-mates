import { useMemo } from "react";
import {
  autoFillAll,
  renderTemplateToSvg,
  type AutoFillInput,
  type BrandProfile,
  type RenderContent,
  type TemplateSpec,
  type TextRole,
  type ValueOverrides,
} from "@/lib/templateEngine";

/**
 * Builds the render content for a spec: auto-fills every placeholder from the
 * manufacturer + retailer brand profiles, then layers the retailer/manufacturer
 * manual overrides on top (manual wins), and applies text-copy overrides.
 */
export function composeContent(
  input: AutoFillInput,
  opts?: { text?: Partial<Record<TextRole, string>>; overrides?: ValueOverrides },
): RenderContent {
  const filled = autoFillAll(input, opts?.overrides);
  return {
    values: Object.values(filled),
    ...(opts?.text ? { text: opts.text } : {}),
  };
}

interface TemplateSvgProps {
  spec: TemplateSpec;
  content?: RenderContent;
  className?: string;
  /** Hide the branded placeholder slots (editor draws its own draggable overlay). */
  excludeSlots?: boolean;
  ariaLabel?: string;
}

/**
 * Renders a template spec inline as responsive SVG. Displaying the SVG inline
 * (not via an <img> data URL) lets remote logo `<image href>` assets load. The
 * identical spec drives thumbnails, the editor, the retailer preview and the PNG
 * export, so what you see is exactly what downloads.
 */
export function TemplateSvg({ spec, content, className, excludeSlots, ariaLabel }: TemplateSvgProps) {
  const svg = useMemo(
    () =>
      renderTemplateToSvg(spec, content ?? {}, {
        responsive: true,
        ...(excludeSlots === undefined ? {} : { excludeSlots }),
      }),
    [spec, content, excludeSlots],
  );
  return (
    <div
      className={className}
      role="img"
      aria-label={ariaLabel ?? `${spec.categoryKey} template preview`}
      // Trusted, self-generated SVG from the deterministic engine (no user HTML).
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export type { BrandProfile };
