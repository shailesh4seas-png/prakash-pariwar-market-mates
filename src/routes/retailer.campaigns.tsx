import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { Panel, StatusBadge } from "@/components/shared";
import { CAMPAIGNS } from "@/lib/data";

export const Route = createFileRoute("/retailer/campaigns")({ component: Page });

function Page() {
  return (
    <>
      <PageHeader title="Campaigns" desc="Campaigns from Jyoti Appliances you can join." />
      <div className="grid gap-4 md:grid-cols-2">
        {CAMPAIGNS.map((c) => (
          <Panel key={c.name} title={c.name} action={<StatusBadge status={c.status} />}>
            <p className="text-sm text-muted-foreground">{c.start} – {c.end} · {c.templates} templates</p>
            <button className="mt-4 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground">View templates</button>
          </Panel>
        ))}
      </div>
    </>
  );
}
