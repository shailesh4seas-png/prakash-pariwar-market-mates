import { useEffect, useMemo, useState } from "react";
import { Bookmark, Download, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TemplateSvg, composeContent } from "@/components/TemplateSvg";
import { PlaceholderEditor } from "@/components/PlaceholderEditor";
import {
  getCategory,
  RETAILER_FIELDS,
  moveSlot,
  resizeSlot,
  resetLayout,
  renderTemplateToBlob,
  exportTemplateToPng,
  type PlaceholderField,
  type TemplateSpec,
} from "@/lib/templateEngine";
import { useSession } from "@/lib/session";
import type { ReceivedTemplate } from "@/lib/designerTemplates";
import {
  brandFromProfile,
  useMarkSeen,
  useRecordDownload,
  useToggleSaved,
} from "@/lib/templateQueries";

const RETAILER_EDITABLE: Set<PlaceholderField> = new Set(RETAILER_FIELDS);

interface TemplateViewerProps {
  template: ReceivedTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Retailer-facing template viewer. Opens a manufacturer's template with the
 * manufacturer's branded blocks already placed (read-only) and the retailer's
 * own blocks auto-filled from their profile and free to nudge / resize. The
 * same spec renders the on-screen preview and the exported PNG, so the retailer
 * downloads exactly what they see. Bookmarks and "seen" tracking hit the DB.
 */
export function TemplateViewer({ template, open, onOpenChange }: TemplateViewerProps) {
  const { activeProfile } = useSession();
  const markSeen = useMarkSeen();
  const recordDownload = useRecordDownload();
  const toggleSaved = useToggleSaved();

  const [spec, setSpec] = useState<TemplateSpec | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset local edits whenever a different template is opened.
  useEffect(() => {
    setSpec(template ? template.spec : null);
  }, [template]);

  // Record that the retailer has opened a shared template (once).
  useEffect(() => {
    if (open && template && !template.seenAt) markSeen.mutate(template.templateId);
    // markSeen is stable per mutation instance; only react to open/template.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, template]);

  const retailer = useMemo(() => brandFromProfile(activeProfile), [activeProfile]);
  const content = useMemo(
    () =>
      spec && template
        ? composeContent({ manufacturer: template.manufacturer, retailer })
        : undefined,
    [spec, template, retailer],
  );

  if (!template || !spec) return null;

  const category = getCategory(template.categoryKey);
  const isStory = spec.canvas.kind === "story";
  const aspect = isStory ? "aspect-[9/16]" : "aspect-square";
  const filename = `${template.categoryKey}-${template.manufacturer.businessName}`;

  const onDownload = async () => {
    setBusy(true);
    try {
      await exportTemplateToPng(spec, content ?? {}, filename);
      await recordDownload.mutateAsync({ templateId: template.templateId, canvasKind: spec.canvas.kind });
      toast.success("Downloaded as PNG");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not export the image.");
    } finally {
      setBusy(false);
    }
  };

  const onShare = async () => {
    try {
      const { blob } = await renderTemplateToBlob(spec, content ?? {});
      const file = new File([blob], `${filename}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${category?.label ?? template.categoryKey} · ${template.manufacturer.businessName}`,
          text: `Made with Prakash Pariwar${retailer.businessName ? ` for ${retailer.businessName}` : ""}.`,
        });
        await recordDownload.mutateAsync({
          templateId: template.templateId,
          canvasKind: spec.canvas.kind,
        });
      } else {
        // No Web Share target (e.g. desktop): give them the file instead.
        await exportTemplateToPng(spec, content ?? {}, filename);
        toast.info("Sharing isn't available here — the PNG was downloaded instead.");
      }
    } catch (error) {
      // The user dismissing the share sheet raises AbortError; ignore it.
      if ((error as DOMException)?.name !== "AbortError") {
        toast.error(error instanceof Error ? error.message : "Could not share the image.");
      }
    }
  };

  const onSave = () => {
    toggleSaved.mutate(
      { templateId: template.templateId, saved: !template.isSaved },
      {
        onSuccess: () => toast.success(template.isSaved ? "Removed from saved" : "Saved"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update saved."),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">
            {category?.label ?? template.categoryKey}
          </DialogTitle>
          <DialogDescription>
            From {template.manufacturer.businessName}
            {isStory ? " · Story (9:16)" : " · Post (1:1)"}. Drag your own details to reposition,
            then download the PNG.
          </DialogDescription>
        </DialogHeader>

        <div className="mx-auto w-full max-w-sm">
          <div className={`relative ${aspect} w-full overflow-hidden rounded-2xl shadow-glow`}>
            <TemplateSvg
              spec={spec}
              content={content ?? {}}
              className="h-full w-full"
              ariaLabel={`${category?.label ?? template.categoryKey} creative`}
            />
            <PlaceholderEditor
              spec={spec}
              editableFields={RETAILER_EDITABLE}
              onMove={(slotId, next) => setSpec((s) => (s ? moveSlot(s, slotId, next) : s))}
              onResize={(slotId, next) => setSpec((s) => (s ? resizeSlot(s, slotId, next) : s))}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Only your gold boxes move. Manufacturer blocks are locked.
            </p>
            <button
              type="button"
              onClick={() => setSpec(resetLayout(spec))}
              className="text-xs font-medium text-primary hover:underline"
            >
              Reset position
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onSave} disabled={toggleSaved.isPending}>
            <Bookmark
              className={`mr-2 h-4 w-4 ${template.isSaved ? "fill-current text-primary" : ""}`}
            />
            {template.isSaved ? "Saved" : "Save"}
          </Button>
          <Button variant="outline" onClick={onShare}>
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
          <Button className="bg-gradient-primary shadow-glow" onClick={onDownload} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
