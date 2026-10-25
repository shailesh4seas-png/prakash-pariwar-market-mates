import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, ImageOff } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { TemplateSvg, composeContent } from "@/components/TemplateSvg";
import { TemplateViewer } from "@/components/TemplateViewer";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategory } from "@/lib/templateEngine";
import { useSession } from "@/lib/session";
import {
  brandFromProfile,
  useReceivedTemplates,
  useRecentDownloads,
} from "@/lib/templateQueries";
import type { ReceivedTemplate } from "@/lib/designerTemplates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/retailer/creatives")({
  head: () => ({
    meta: [
      { title: "My creatives · Prakash Pariwar" },
      { name: "description", content: "My creatives for Prakash Pariwar business members." },
      { property: "og:title", content: "My creatives · Prakash Pariwar" },
      {
        property: "og:description",
        content: "My creatives for Prakash Pariwar business members.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const downloads = useRecentDownloads();
  const received = useReceivedTemplates();
  const { activeProfile } = useSession();
  const retailer = useMemo(() => brandFromProfile(activeProfile), [activeProfile]);

  const byId = useMemo(() => {
    const map = new Map<string, ReceivedTemplate>();
    for (const t of received.data ?? []) map.set(t.templateId, t);
    return map;
  }, [received.data]);

  const [open, setOpen] = useState<ReceivedTemplate | null>(null);

  // Close the viewer if its template disappears from the feed.
  useEffect(() => {
    if (open && !byId.has(open.templateId)) setOpen(null);
  }, [open, byId]);

  const items = (downloads.data ?? []).map((d) => ({ download: d, template: byId.get(d.templateId) }));

  return (
    <>
      <PageHeader title="My Creatives" desc="Personalised creatives you've downloaded." />

      {downloads.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/50 px-6 py-16 text-center">
          <Download className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nothing here yet. Open a template and hit{" "}
            <span className="font-semibold text-foreground">Download PNG</span> to keep it in this
            library.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map(({ download, template }) => {
            const isStory = download.canvasKind === "story";
            return (
              <div key={download.id} className="rounded-2xl bg-card p-2 shadow-card">
                <div
                  className={cn(
                    "relative w-full overflow-hidden rounded-xl",
                    isStory ? "aspect-[9/16]" : "aspect-square",
                  )}
                >
                  {template ? (
                    <button
                      className="h-full w-full"
                      onClick={() => setOpen(template)}
                      aria-label={`Open ${getCategory(template.categoryKey)?.label ?? "template"}`}
                    >
                      <TemplateSvg
                        spec={template.spec}
                        content={composeContent({ manufacturer: template.manufacturer, retailer }, { spec: template.spec })}
                        className="h-full w-full"
                      />
                    </button>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground">
                      <ImageOff className="h-6 w-6" />
                      <span className="px-2 text-center text-[11px]">No longer shared</span>
                    </div>
                  )}
                </div>
                <div className="px-1 pt-2">
                  <p className="truncate text-sm font-semibold">
                    {getCategory(template?.categoryKey ?? "")?.label ?? "Creative"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(download.at).toLocaleDateString()} ·{" "}
                    {isStory ? "Story 1080×1920" : "Post 1080×1080"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TemplateViewer template={open} open={open !== null} onOpenChange={(o) => !o && setOpen(null)} />
    </>
  );
}
