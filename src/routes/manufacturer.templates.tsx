import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Pencil, Plus, Search } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { StatusBadge } from "@/components/shared";
import { TemplateModal } from "@/components/TemplateModal";
import { TEMPLATES, type Template } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/manufacturer/templates")({ component: Page });

const FILTERS = ["all", "published", "draft", "archived"] as const;

function Page() {
  const [f, setF] = useState<(typeof FILTERS)[number]>("all");
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<Template | null>(null);
  const list = TEMPLATES.filter((t) => (f === "all" || t.status === f) && t.title.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader
        title="Templates"
        desc="Create and manage creatives your retailers can brand."
        action={<Link to="/manufacturer/editor" className="flex w-fit items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"><Plus className="h-4 w-4" /> Create template</Link>}
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates" className="w-full rounded-xl border bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary" />
        </div>
        <div className="flex gap-1 rounded-xl bg-card p-1 shadow-card">
          {FILTERS.map((x) => (
            <button key={x} onClick={() => setF(x)} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium capitalize", f === x ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
              {x} <span className="opacity-70">{x === "all" ? TEMPLATES.length : TEMPLATES.filter((t) => t.status === x).length}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {list.map((t) => (
          <div key={t.id} className="group overflow-hidden rounded-2xl bg-card shadow-card">
            <div className="relative">
              <img src={t.image} alt={t.title} loading="lazy" className="aspect-square w-full object-cover" />
              <div className="absolute left-2 top-2"><StatusBadge status={t.status} /></div>
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-sidebar/60 opacity-0 transition group-hover:opacity-100">
                <button onClick={() => setPreview(t)} className="flex h-9 w-9 items-center justify-center rounded-full bg-card" aria-label="Preview"><Eye className="h-4 w-4" /></button>
                <Link to="/manufacturer/editor" search={{ id: t.id }} className="flex h-9 w-9 items-center justify-center rounded-full bg-card" aria-label="Edit"><Pencil className="h-4 w-4" /></Link>
              </div>
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-semibold">{t.title}</p>
              <p className="text-xs text-muted-foreground">{t.category} · {t.uses.toLocaleString("en-IN")} uses</p>
            </div>
          </div>
        ))}
      </div>
      <TemplateModal template={preview} onClose={() => setPreview(null)} />
    </>
  );
}
