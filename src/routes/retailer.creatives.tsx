import { createFileRoute } from "@tanstack/react-router";
import { Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { TemplatePoster } from "@/components/TemplateCard";
import { byIds } from "@/lib/data";
import { useLibrary } from "@/lib/library";

export const Route = createFileRoute("/retailer/creatives")({
  head: () => ({ meta: [{ title: 'My creatives · Prakash Pariwar' }, { name: "description", content: 'My creatives for Prakash Pariwar business members.' }, { property: "og:title", content: 'My creatives · Prakash Pariwar' }, { property: "og:description", content: 'My creatives for Prakash Pariwar business members.' }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: Page });

function Page() {
  const lib = useLibrary();
  return (
    <>
      <PageHeader title="My Creatives" desc="Personalised creatives you've downloaded." />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {lib.downloads.map((d) => {
          const t = byIds([d.id])[0]!;
          return (
            <div key={d.id} className="rounded-2xl bg-card p-2 shadow-card">
              <TemplatePoster t={t} />
              <div className="flex items-center justify-between px-1 pt-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{d.at}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => toast.success("Downloaded again")} className="rounded-lg p-1.5 hover:bg-muted" aria-label="Download"><Download className="h-4 w-4" /></button>
                  <button onClick={() => toast("Share link copied")} className="rounded-lg p-1.5 hover:bg-muted" aria-label="Share"><Share2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
