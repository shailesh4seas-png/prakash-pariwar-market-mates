import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { TemplateCard } from "@/components/TemplateCard";
import { TemplateModal } from "@/components/TemplateModal";
import { CATEGORIES, type Template } from "@/lib/data";
import { useRetailerLibrary, useRetailerTemplates } from "@/lib/use-templates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/retailer/templates")({
  head: () => ({
    meta: [
      { title: "Retailer templates · Prakash Pariwar" },
      { name: "description", content: "Retailer templates for Prakash Pariwar business members." },
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

function Page() {
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState<Template | null>(null);
  const { templates, isSample, loading, error } = useRetailerTemplates();
  const lib = useRetailerLibrary(isSample);
  const list = templates.filter((t) => cat === "All" || t.category === cat);
  return (
    <>
      <PageHeader title="Templates" desc="Every template shared by your manufacturer partners." />
      {error && (
        <p className="mb-4 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
          Templates could not be loaded: {error}
        </p>
      )}
      {isSample && !loading && (
        <p className="mb-4 rounded-2xl bg-accent p-4 text-sm text-accent-foreground">
          You are viewing sample templates. Templates published by your manufacturers will appear
          here once you are linked to them.
        </p>
      )}
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium",
              cat === c ? "bg-gradient-primary text-primary-foreground" : "bg-card shadow-card",
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {list.map((t) => (
          <TemplateCard
            key={t.id}
            t={t}
            className="w-full sm:w-full"
            onOpen={setOpen}
            saved={lib.saved.includes(t.id)}
            onToggleSave={lib.toggleSave}
          />
        ))}
      </div>
      <TemplateModal template={open} onClose={() => setOpen(null)} onDownload={lib.addDownload} />
    </>
  );
}
