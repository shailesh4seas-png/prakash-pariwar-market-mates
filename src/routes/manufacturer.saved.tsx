import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  Pencil,
  Search,
  Send,
  Trash2,
  Loader2,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Panel } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TemplateSvg, composeContent } from "@/components/TemplateSvg";
import { SendToRetailersDialog } from "@/components/SendToRetailersDialog";
import { getCategory } from "@/lib/templateEngine";
import type { ManufacturerTemplate } from "@/lib/designerTemplates";
import { useSession } from "@/lib/session";
import {
  brandFromProfile,
  buildDraft,
  useDeleteTemplate,
  useManufacturerTemplates,
  usePublishToggle,
  useSaveDraft,
  useSendExisting,
  useSendTargets,
  useTemplateRecipients,
} from "@/lib/templateQueries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/manufacturer/saved")({
  head: () => ({
    meta: [
      { title: "Saved templates · Prakash Pariwar" },
      { name: "description", content: "Every design you have saved, sent or published." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { edit?: string | undefined } => ({
    edit: typeof s["edit"] === "string" ? s["edit"] : undefined,
  }),
  component: Page,
});

type FilterId = "all" | "saved" | "sent" | "published";
const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "saved", label: "Saved only" },
  { id: "sent", label: "Sent" },
  { id: "published", label: "Published" },
];

function matchesFilter(t: ManufacturerTemplate, f: FilterId): boolean {
  if (f === "sent") return t.sentCount > 0;
  if (f === "published") return t.published;
  if (f === "saved") return t.sentCount === 0 && !t.published;
  return true;
}

function Page() {
  const { activeProfile } = useSession();
  const navigate = useNavigate();
  const own = useManufacturerTemplates();
  const sendTargets = useSendTargets(true);
  const publish = usePublishToggle();
  const remove = useDeleteTemplate();
  const sendExisting = useSendExisting();
  const duplicate = useSaveDraft();

  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const [sendId, setSendId] = useState<string | null>(null);
  const recipients = useTemplateRecipients(sendId);

  const manufacturer = useMemo(() => brandFromProfile(activeProfile), [activeProfile]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (own.data ?? []).filter(
      (t) =>
        matchesFilter(t, filter) &&
        (!q || t.title.toLowerCase().includes(q) || getCategory(t.categoryKey)?.label.toLowerCase().includes(q)),
    );
  }, [own.data, filter, query]);

  const sendTargetTemplate = own.data?.find((t) => t.id === sendId) ?? null;

  const act = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      toast.success(label);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That action failed.");
    }
  };

  return (
    <>
      <PageHeader
        title="Saved templates"
        desc="Designs you saved, who you sent them to, and what is live on retailer landing pages."
        action={
          <Link
            to="/manufacturer/templates"
            search={{}}
            className="flex w-fit items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            New template
          </Link>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search saved templates"
            aria-label="Search saved templates"
            className="w-full rounded-xl border bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-1 rounded-xl bg-card p-1 shadow-card">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                filter === f.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {own.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {own.data?.length
                ? "No templates match this filter."
                : "Nothing saved yet. Pick a festival and design your first template."}
            </p>
            {!own.data?.length && (
              <Link
                to="/manufacturer/templates"
                search={{}}
                className="rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
              >
                Browse categories
              </Link>
            )}
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => (
            <div key={t.id} className="overflow-hidden rounded-2xl bg-card shadow-card">
              <div className="flex gap-4 p-4">
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-muted">
                  <TemplateSvg
                    spec={t.spec}
                    content={composeContent({ manufacturer, retailer: { businessName: "Your Store" } }, { spec: t.spec })}
                    className="h-full w-full"
                    ariaLabel={t.title}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{t.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {getCategory(t.categoryKey)?.label ?? t.categoryKey} · {t.canvasKind}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Chip tone="saved">Saved</Chip>
                    {t.sentCount > 0 && <Chip tone="sent">Sent to {t.sentCount}</Chip>}
                    {t.published && <Chip tone="published">Published</Chip>}
                    {t.downloads > 0 && <Chip tone="muted">{t.downloads} downloads</Chip>}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 border-t px-3 py-2">
                <IconAction label="Edit" onClick={() => navigate({ to: "/manufacturer/editor", search: { id: t.id } })}>
                  <Pencil className="h-4 w-4" />
                </IconAction>
                <IconAction
                  label="Duplicate"
                  onClick={() =>
                    act("Duplicated", () =>
                      duplicate.mutateAsync(
                        buildDraft({ templateId: null, spec: t.spec, title: `${t.title} (copy)` }),
                      ),
                    )
                  }
                >
                  {duplicate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                </IconAction>
                <IconAction label="Send to retailers" onClick={() => setSendId(t.id)}>
                  <Send className="h-4 w-4" />
                </IconAction>
                <IconAction
                  label={t.published ? "Unpublish" : "Publish"}
                  onClick={() =>
                    act(t.published ? "Unpublished" : "Published", () =>
                      publish.mutateAsync({ templateId: t.id, publish: !t.published }),
                    )
                  }
                >
                  {t.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </IconAction>
                <IconAction
                  label="Delete"
                  danger
                  onClick={() => {
                    if (confirm(`Delete “${t.title}”? This cannot be undone.`))
                      act("Deleted", () => remove.mutateAsync(t.id));
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </IconAction>
              </div>
            </div>
          ))}
        </div>
      )}

      <SendToRetailersDialog
        open={Boolean(sendId)}
        onOpenChange={(o) => !o && setSendId(null)}
        targets={sendTargets.data ?? []}
        recipients={recipients.data ?? []}
        loading={sendTargets.isLoading}
        submitting={sendExisting.isPending}
        onSubmit={(ids) => {
          if (!sendId) return;
          void act("Sent", () =>
            sendExisting.mutateAsync({ templateId: sendId, retailerIds: ids }).then(() => setSendId(null)),
          );
        }}
      />
    </>
  );
}

function Chip({ tone, children }: { tone: "saved" | "sent" | "published" | "muted"; children: React.ReactNode }) {
  const cls = {
    saved: "bg-muted text-muted-foreground",
    sent: "bg-accent text-accent-foreground",
    published: "bg-success/15 text-success",
    muted: "bg-muted/60 text-muted-foreground",
  }[tone];
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", cls)}>{children}</span>;
}

function IconAction({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn("h-8 gap-1.5 text-xs", danger && "text-destructive hover:text-destructive")}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
