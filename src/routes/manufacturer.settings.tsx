import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { Panel } from "@/components/shared";
import { ProfileSettings } from "@/components/ProfileSettings";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/manufacturer/settings")({
  head: () => ({
    meta: [
      { title: "Manufacturer settings · Prakash Pariwar" },
      {
        name: "description",
        content: "Manufacturer settings for Prakash Pariwar business members.",
      },
      { property: "og:title", content: "Manufacturer settings · Prakash Pariwar" },
      {
        property: "og:description",
        content: "Manufacturer settings for Prakash Pariwar business members.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

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
      <ProfileSettings />
      <div className="mt-6">
        <PageHeader
          title="Notification preferences"
          desc="Prototype preferences are not saved between sessions."
        />
        <Panel title="Email alerts">
          <ul className="space-y-4">
            {ALERTS.map(([l, on]) => (
              <li key={l} className="flex items-center justify-between gap-4 text-sm">
                <span>{l}</span>
                <Switch defaultChecked={on} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
