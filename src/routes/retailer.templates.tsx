import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bookmark, Inbox, Search } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { CategoryGrid } from "@/components/CategoryGrid";
import { TemplateSvg, composeContent } from "@/components/TemplateSvg";
import { TemplateViewer } from "@/components/TemplateViewer";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategory } from "@/lib/templateEngine";
import { useSession } from "@/lib/session";
import type { ReceivedTemplate } from "@/lib/designerTemplates";
import { brandFromProfile, useReceivedTemplates } from "@/lib/templateQueries";
import { cn } from "@/lib/utils";
import { FestivalCollectionHeader } from "@/components/FestivalCollectionHeader";

export const Route = createFileRoute("/retailer/templates")({
  head: () => ({
    meta: [
      { title: "Retailer templates · Prakash Pariwar" },
      {
        name: "description",
        content: "Retailer templates for Prakash Pariwar business members.",
      },
      { property: "og:title", content: "Retailer templates · Prakash Pariwar" },
      {
        property: "og:description",
        content: "Retailer templates for Prakash Pariwar business members.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function ReceivedCard({
  template,
  content,
  onOpen,
}: {
  template: ReceivedTemplate;
  content: ReturnType<typeof composeContent>;
  onOpen: () => void;
}) {
  const category = getCategory(template.categoryKey);
  const isStory = template.canvasKind === "story";
  const unread = !template.seenAt;
  return (
    <button
      onClick={onOpen}
      className="group overflow-hidden rounded-2xl bg-card text-left shadow-card ring-1 ring-transparent transition hover:ring-primary/40"
    >
      <div className={cn("relative w-full overflow-hidden", isStory ? "aspect-[9/16]" : "aspect-square")}>
        <TemplateSvg
          spec={template.spec}
          content={content}
          ariaLabel={`${category?.label ?? template.categoryKey} from ${template.manufacturer.businessName}`}
          className="h-full w-full transition group-hover:scale-[1.02]"
        />
        {unread && (
          <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow">
            New
          </span>
        )}
        {template.isSaved && (
          <span className="absolute right-2 top-2 rounded-full bg-card/90 p-1 text-primary shadow">
            <Bookmark className="h-3.5 w-3.5 fill-current" />
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-semibold">{category?.label ?? template.categoryKey}</p>
        <p className="truncate text-xs text-muted-foreground">{template.manufacturer.businessName}</p>
      </div>
    </button>
  );
}

function Page() {
  const received = useReceivedTemplates();
  const { activeProfile } = useSession();
  const retailer = useMemo(() => brandFromProfile(activeProfile), [activeProfile]);

  const [query, setQuery] = useState("");
  const [categoryKey, setCategoryKey] = useState<string | null>(null);
  const [open, setOpen] = useState<ReceivedTemplate | null>(null);

  const contents = useMemo(() => {
    const map = new Map<string, ReturnType<typeof composeContent>>();
    for (const t of received.data ?? []) {
      map.set(t.templateId, composeContent({ manufacturer: t.manufacturer, retailer }, { spec: t.spec }));
    }
    return map;
  }, [received.data, retailer]);

  const filtered = (received.data ?? []).filter((t) => {
    if (categoryKey && t.categoryKey !== categoryKey) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const category = getCategory(t.categoryKey);
    return (
      t.manufacturer.businessName.toLowerCase().includes(q) ||
      (category?.label ?? "").toLowerCase().includes(q) ||
      t.headline.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <PageHeader
        title="Templates"
        desc="Every template shared or published by your manufacturer partners."
      />

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by manufacturer, festival or headline"
          aria-label="Search received templates"
          className="w-full rounded-xl border bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="mb-6 rounded-2xl bg-card/50 p-4 shadow-card">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Browse by festival or season</h2>
        <CategoryGrid
          selectedKey={categoryKey}
          onSelect={(key) => setCategoryKey((prev) => (prev === key ? null : key))}
        />
      </div>

      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
        <Inbox className="h-5 w-5 text-primary" /> Received from manufacturers
        {categoryKey && (
          <button
            onClick={() => setCategoryKey(null)}
            className="ml-2 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground hover:bg-primary hover:text-primary-foreground"
          >
            {getCategory(categoryKey)?.label ?? categoryKey} ✕
          </button>
        )}
      </h2>
      {categoryKey && <FestivalCollectionHeader categoryKey={categoryKey}/>}

      {received.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-2xl" />
          ))}
        </div>
      ) : received.isError ? (
        <p className="rounded-2xl border border-dashed bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
          We couldn't load your templates. Pull to refresh and try again.
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
          {received.data?.length
            ? "No templates match your search."
            : "No templates yet. When a manufacturer sends or publishes one it appears here."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((t) => (
            <ReceivedCard
              key={t.templateId}
              template={t}
              content={contents.get(t.templateId) ?? {}}
              onOpen={() => setOpen(t)}
            />
          ))}
        </div>
      )}

      <TemplateViewer template={open} open={open !== null} onOpenChange={(o) => !o && setOpen(null)} />
    </>
  );
}
