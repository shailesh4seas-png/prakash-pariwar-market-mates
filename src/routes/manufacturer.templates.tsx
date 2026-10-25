import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, PenSquare, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Panel } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryGrid } from "@/components/CategoryGrid";
import { TemplateSvg } from "@/components/TemplateSvg";
import {
  TEMPLATES_PER_CATEGORY,
  generateCategoryTemplates,
  getCategory,
  type CanvasKind,
} from "@/lib/templateEngine";
import { useManufacturerTemplates } from "@/lib/templateQueries";
import { Button } from "@/components/ui/button";
import { FestivalCollectionHeader } from "@/components/FestivalCollectionHeader";

export const Route = createFileRoute("/manufacturer/templates")({
  head: () => ({
    meta: [
      { title: "Templates · Prakash Pariwar" },
      {
        name: "description",
        content: "Pick a festival or season and start from one of 30 brand-ready designs.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Festival templates · Prakash Pariwar" },
      { property: "og:description", content: "Distinct festival artwork for manufacturers and retailers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const [picked, setPicked] = useState<string | null>(null);
  const [canvasKind, setCanvasKind] = useState<CanvasKind>("post");
  const own = useManufacturerTemplates();

  const designs = useMemo(
    () => (picked ? generateCategoryTemplates(picked, canvasKind) : []),
    [picked, canvasKind],
  );
  const category = picked ? getCategory(picked) : undefined;

  if (!picked) {
    return (
      <>
        <PageHeader
          title="Templates"
          desc="Choose a festival or season — every category has 30 distinct, brand-ready designs."
          action={
            <Link
              to="/manufacturer/saved"
              search={{}}
              className="flex w-fit items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              <Sparkles className="h-4 w-4" /> Saved templates
              {own.data ? (
                <span className="rounded-full bg-primary-foreground/20 px-2 text-xs">
                  {own.data.length}
                </span>
              ) : null}
            </Link>
          }
        />
        <CategoryGrid onSelect={setPicked} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={category?.label ?? "Templates"}
        desc={`30 ${canvasKind} designs — pick one to open the editor.`}
        action={
          <Button variant="outline"
            onClick={() => setPicked(null)}
            className="flex w-fit items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" /> All categories
          </Button>
        }
      />
      <FestivalCollectionHeader categoryKey={picked}/>
      <div className="mb-4 flex gap-1 rounded-xl bg-card p-1 shadow-card w-fit">
        {(["post", "story"] as CanvasKind[]).map((k) => (
          <Button variant="ghost"
            key={k}
            onClick={() => setCanvasKind(k)}
            className={
              "rounded-lg px-4 py-1.5 text-sm font-medium capitalize " +
              (canvasKind === k
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {k}
          </Button>
        ))}
      </div>

      {designs.length === 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: TEMPLATES_PER_CATEGORY }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {designs.map((spec, i) => (
              <Link
                key={spec.id}
                to="/manufacturer/editor"
                search={{ category: picked, index: i, canvas: canvasKind }}
                className="group overflow-hidden rounded-2xl ring-1 ring-transparent transition hover:ring-primary/50"
              >
                <div className="relative overflow-hidden bg-muted">
                  <TemplateSvg
                    spec={spec}
                    ariaLabel={`${category?.label ?? "Design"} option ${i + 1}`}
                    className={
                      canvasKind === "story"
                        ? "mx-auto aspect-[9/16] w-auto max-w-full"
                        : "aspect-square w-full"
                    }
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-sidebar/50 opacity-0 transition group-hover:opacity-100">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold">
                      <PenSquare className="h-3.5 w-3.5" /> Edit
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
