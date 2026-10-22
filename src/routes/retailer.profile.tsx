import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { Panel } from "@/components/shared";
import { ROLE_LABEL, useSession } from "@/lib/session";

export const Route = createFileRoute("/retailer/profile")({ component: Page });

function Page() {
  const { user } = useSession();
  if (!user) return null;
  return (
    <>
      <PageHeader title="Profile" />
      <Panel>
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary text-xl font-bold text-primary-foreground">{user.initials}</span>
          <div>
            <p className="text-lg font-bold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.business} · {user.email}</p>
            <p className="mt-2 flex gap-2">{user.roles.map((r) => <span key={r} className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">{ROLE_LABEL[r]}</span>)}</p>
          </div>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          {[["Business type", "Electronics & Appliances"], ["City", "Jaipur"], ["Member since", "Jan 2026"]].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-muted p-4"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>
          ))}
        </dl>
      </Panel>
    </>
  );
}
