import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { Panel } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/manufacturer/settings")({ component: Page });

const ALERTS = [
  ["A retailer accepts an invitation", true],
  ["A template crosses 100 downloads", true],
  ["Weekly performance summary", true],
  ["Festival reminders 3 weeks ahead", true],
  ["Product tips and updates", false],
] as const;

function Page() {
  return (
    <>
      <PageHeader title="Notifications & Settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Account">
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Company</Label><Input defaultValue="Jyoti Appliances Ltd." /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input defaultValue="marketing@jyotiappliances.com" /></div>
            <div className="space-y-1.5"><Label>Language</Label><Input defaultValue="English, हिन्दी" /></div>
          </div>
        </Panel>
        <Panel title="Email alerts">
          <ul className="space-y-4">
            {ALERTS.map(([l, on]) => (
              <li key={l} className="flex items-center justify-between gap-4 text-sm"><span>{l}</span><Switch defaultChecked={on} /></li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
