import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { TemplateCard } from "@/components/TemplateCard";
import { TemplateModal } from "@/components/TemplateModal";
import { CATEGORIES, TEMPLATES, type Template } from "@/lib/data";
import { library, useLibrary } from "@/lib/library";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/retailer/templates")({
  head: () => ({ meta: [{ title: 'Retailer templates · Prakash Pariwar' }, { name: "description", content: 'Retailer templates for Prakash Pariwar business members.' }, { property: "og:title", content: 'Retailer templates · Prakash Pariwar' }, { property: "og:description", content: 'Retailer templates for Prakash Pariwar business members.' }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: Page });

function Page() {
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState<Template | null>(null);
  const lib = useLibrary();
  const list = TEMPLATES.filter((t) => t.status === "published" && (cat === "All" || t.category === cat));
  return (
    <>
      <PageHeader title="Templates" desc="Every template shared by your manufacturer partners." />
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-medium", cat === c ? "bg-gradient-primary text-primary-foreground" : "bg-card shadow-card")}>{c}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {list.map((t) => (
          <TemplateCard key={t.id} t={t} className="w-full sm:w-full" onOpen={setOpen} saved={lib.saved.includes(t.id)} onToggleSave={(x) => library.toggleSave(x.id)} />
        ))}
      </div>
      <TemplateModal template={open} onClose={() => setOpen(null)} onDownload={(t) => library.addDownload(t.id)} />
    </>
  );
}
