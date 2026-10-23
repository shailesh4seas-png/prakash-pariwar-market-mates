import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { CalendarView, Panel, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { CAMPAIGNS } from "@/lib/data";

export const Route = createFileRoute("/manufacturer/campaigns")({
  head: () => ({ meta: [{ title: 'Manufacturer campaigns · Prakash Pariwar' }, { name: "description", content: 'Manufacturer campaigns for Prakash Pariwar business members.' }, { property: "og:title", content: 'Manufacturer campaigns · Prakash Pariwar' }, { property: "og:description", content: 'Manufacturer campaigns for Prakash Pariwar business members.' }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: Page });

function Page() {
  return (
    <>
      <PageHeader title="Campaigns & Calendar" desc="Plan festive pushes and product launches." action={<Button className="w-fit bg-gradient-primary" onClick={() => toast("Campaign builder coming soon")}><Plus className="h-4 w-4" /> New campaign</Button>} />
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Panel title="All campaigns">
          <div className="space-y-3">
            {CAMPAIGNS.map((c) => (
              <div key={c.name} className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-2"><p className="truncate font-semibold">{c.name}</p><StatusBadge status={c.status} /></div>
                <p className="mt-1 text-xs text-muted-foreground">{c.start} – {c.end} · {c.templates} templates</p>
              </div>
            ))}
          </div>
        </Panel>
        <CalendarView />
      </div>
    </>
  );
}
