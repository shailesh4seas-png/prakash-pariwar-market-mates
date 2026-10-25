import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Palette,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  LayoutTemplate,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Panel } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TemplateSvg, composeContent } from "@/components/TemplateSvg";
import { PlaceholderEditor } from "@/components/PlaceholderEditor";
import { BrandDetailsEditor } from "@/components/BrandDetailsEditor";
import { SendToRetailersDialog } from "@/components/SendToRetailersDialog";
import {
  MANUFACTURER_FIELDS,
  RETAILER_FIELDS,
  getCategory,
  generateTemplate,
  paletteChoicesFor,
  recomposeSpec,
  cycleBackgroundVariant,
  moveSlot,
  resizeSlot,
  resetLayout,
  setBlockText,
  type CanvasKind,
  type PlaceholderField,
  type TemplateSpec,
  type TextRole,
} from "@/lib/templateEngine";
import { useSession } from "@/lib/session";
import {
  brandFromProfile,
  buildDraft,
  useCreateAndPublish,
  useCreateAndSend,
  useManufacturerTemplates,
  useSaveDraft,
  useSendTargets,
  useTemplateRecipients,
} from "@/lib/templateQueries";

export const Route = createFileRoute("/manufacturer/editor")({
  head: () => ({
    meta: [
      { title: "Template editor · Prakash Pariwar" },
      { name: "description", content: "Design a branded festival or product template." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Template editor · Prakash Pariwar" },
      { property: "og:description", content: "Personalise festival artwork with live business details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): {
    category?: string | undefined;
    index?: number | undefined;
    canvas?: CanvasKind | undefined;
    id?: string | undefined;
  } => ({
    category: typeof s["category"] === "string" ? s["category"] : undefined,
    index: typeof s["index"] === "number" && Number.isFinite(s["index"]) ? s["index"] : undefined,
    canvas: s["canvas"] === "story" ? "story" : "post",
    id: typeof s["id"] === "string" ? s["id"] : undefined,
  }),
  component: Page,
});

const ALL_FIELDS: Set<PlaceholderField> = new Set([...MANUFACTURER_FIELDS, ...RETAILER_FIELDS]);
const ROLE_LABEL: Record<TextRole, string> = {
  headline: "Headline",
  subheadline: "Sub-headline",
  offer: "Offer badge",
  cta: "Call to action",
};

function initialSpec(
  category: string | undefined,
  index: number | undefined,
  canvasKind: CanvasKind,
): TemplateSpec {
  return generateTemplate(category ?? "diwali", index ?? 0, canvasKind);
}

function Page() {
  const { category, index, id, canvas } = Route.useSearch();
  const navigate = useNavigate();
  const { activeProfile } = useSession();

  const ownTemplates = useManufacturerTemplates();
  const loaded = id ? ownTemplates.data?.find((t) => t.id === id) : undefined;

  const [spec, setSpec] = useState<TemplateSpec | null>(null);
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (id) {
      if (loaded) {
        setSpec(loaded.spec);
        setTitle(loaded.title);
      }
    } else {
      setSpec(initialSpec(category, index, canvas ?? "post"));
      setTitle(`${getCategory(category ?? "diwali")?.label ?? "Festival"} template`);
    }
    // Re-seed only when the route target changes.
  }, [id, loaded, category, index, canvas]);

  const recipients = useTemplateRecipients(id ?? null);
  const sendTargets = useSendTargets(true);
  const saveDraft = useSaveDraft();
  const createAndSend = useCreateAndSend();
  const createAndPublish = useCreateAndPublish();

  const [sendOpen, setSendOpen] = useState(false);

  const manufacturer = useMemo(() => brandFromProfile(activeProfile), [activeProfile]);
  const content = useMemo(
    () => (spec ? composeContent({ manufacturer, retailer: { businessName: "Your Store" } }, { overrides: spec.brandOverrides }) : undefined),
    [spec, manufacturer],
  );

  if (!spec) {
    return (
      <>
        <PageHeader title="Template editor" />
        {id && ownTemplates.isLoading ? (
          <Skeleton className="h-[60vh] w-full rounded-3xl" />
        ) : (
          <Panel>
            <p className="text-sm text-muted-foreground">
              Pick a festival or season first, then choose one of its 30 designs.
            </p>
            <Link
              to="/manufacturer/templates"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              <LayoutTemplate className="h-4 w-4" /> Browse categories
            </Link>
          </Panel>
        )}
      </>
    );
  }

  const presentRoles = (["headline", "subheadline", "offer", "cta"] as TextRole[]).filter((r) =>
    spec.blocks.some((b) => b.role === r),
  );
  const textOf = (role: TextRole) => spec.blocks.find((b) => b.role === role)?.defaultText ?? "";

  const run = async (label: string, action: () => Promise<unknown>) => {
    try {
      await action();
      toast.success(label);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `${label} failed.`);
    }
  };

  const draft = () => buildDraft({ templateId: id ?? null, spec, title });

  return (
    <>
      <PageHeader
        title={id ? `Edit · ${title}` : "New template"}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={saveDraft.isPending}
              onClick={() =>
                run("Saved to your templates", () =>
                  saveDraft.mutateAsync(draft()).then((newId) =>
                    navigate({ to: "/manufacturer/saved", search: { edit: newId } }),
                  ),
                )
              }
            >
              {saveDraft.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
            <Button variant="outline" onClick={() => setSendOpen(true)}>
              <Send className="mr-2 h-4 w-4" /> Send to retailers
            </Button>
            <Button
              className="bg-gradient-primary shadow-glow"
              disabled={createAndPublish.isPending}
              onClick={() =>
                run("Published to your retailers", () => createAndPublish.mutateAsync(draft()))
              }
            >
              {createAndPublish.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Publish
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Panel className="bg-muted">
          <div className="mx-auto w-full max-w-md">
            <div className={`relative ${spec.canvas.kind === "story" ? "aspect-[9/16]" : "aspect-square"} w-full overflow-hidden rounded-2xl shadow-glow`}>
              <TemplateSvg
                spec={spec}
                content={content ?? {}}
                className="h-full w-full"
                ariaLabel={title}
              />
              <PlaceholderEditor
                spec={spec}
                editableFields={ALL_FIELDS}
                onMove={(slotId, next) => setSpec((s) => (s ? moveSlot(s, slotId, next) : s))}
                onResize={(slotId, next) => setSpec((s) => (s ? resizeSlot(s, slotId, next) : s))}
              />
            </div>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <div className="space-y-6">
              <BrandDetailsEditor owner="manufacturer" spec={spec} content={content ?? {}} onChange={setSpec}/>
              <BrandDetailsEditor owner="retailer" spec={spec} content={content ?? {}} onChange={setSpec}/>
            </div>
          </Panel>
          <Panel title="Details">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-title">Title</Label>
                <Input
                  id="tpl-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                />
              </div>
              {presentRoles.map((role) => (
                <div key={role} className="space-y-1.5">
                  <Label htmlFor={`txt-${role}`}>{ROLE_LABEL[role]}</Label>
                  <Input
                    id={`txt-${role}`}
                    value={textOf(role)}
                    onChange={(e) =>
                      setSpec((s) => (s ? setBlockText(s, role, e.target.value) : s))
                    }
                  />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Design">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1">
                    <Palette className="h-4 w-4" /> Colour
                  </Label>
                  <Select
                    value={spec.palette.id}
                    onValueChange={(paletteId) =>
                      setSpec((s) => (s ? recomposeSpec(s, { paletteId }) : s))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paletteChoicesFor(spec.categoryKey).map((pid) => (
                        <SelectItem key={pid} value={pid}>
                          {pid.replace(/([A-Z])/g, " $1").trim()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Canvas size</Label>
                  <Select
                    value={spec.canvas.kind}
                    onValueChange={(kind) =>
                      setSpec((s) =>
                        s ? recomposeSpec(s, { canvasKind: kind as CanvasKind }) : s,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="post">Post (1:1)</SelectItem>
                      <SelectItem value="story">Story (9:16)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSpec((s) => (s ? cycleBackgroundVariant(s) : s))}
                >
                  <Sparkles className="mr-2 h-4 w-4" /> Background variant
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSpec((s) => (s ? resetLayout(s) : s))}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset layout
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <SendToRetailersDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        targets={sendTargets.data ?? []}
        recipients={recipients.data ?? []}
        loading={sendTargets.isLoading}
        submitting={createAndSend.isPending}
        onSubmit={(retailerIds) => {
          void run("Sent to your retailers", () =>
            createAndSend.mutateAsync({ draft: draft(), retailerIds }).then(() => setSendOpen(false)),
          );
        }}
      />
    </>
  );
}
