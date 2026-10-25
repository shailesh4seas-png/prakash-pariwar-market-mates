import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  FileEdit,
  LayoutTemplate,
  MailPlus,
  Plus,
  Users,
  type LucideIcon,
} from "lucide-react";
import heroDiwali from "@/assets/hero-diwali.jpg";
import { Panel, StatusBadge } from "@/components/shared";
import { TemplateSvg, composeContent } from "@/components/TemplateSvg";
import { Skeleton } from "@/components/ui/skeleton";
import { CAMPAIGNS, RETAILERS } from "@/lib/data";
import { getCategory, daysUntilCategory, orderUpcomingFirst } from "@/lib/templateEngine";
import { useSession } from "@/lib/session";
import { brandFromProfile, useManufacturerTemplates } from "@/lib/templateQueries";

export const Route = createFileRoute("/manufacturer/")({
  head: () => ({
    meta: [
      { title: "Manufacturer overview · Prakash Pariwar" },
      {
        name: "description",
        content: "Manufacturer overview for Prakash Pariwar business members.",
      },
      { property: "og:title", content: "Manufacturer overview · Prakash Pariwar" },
      {
        property: "og:description",
        content: "Manufacturer overview for Prakash Pariwar business members.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Overview,
});

function Stat({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-success">{note}</p>
    </div>
  );
}

const ACTIVITY: [string, string, string][] = [
  ["Patel Digital World downloaded", "Diwali Offer", "12 min ago"],
  ["You published", "Republic Day", "2 h ago"],
  ["Reddy Electronics joined your network", "", "Yesterday"],
  ["Mehra Home Store downloaded", "Kitchen Appliances", "Yesterday"],
  ["You saved draft", "Winter Essentials", "Oct 19"],
];

function Overview() {
  const { activeProfile } = useSession();
  const templates = useManufacturerTemplates();
  const brand = brandFromProfile(activeProfile);
  const list = templates.data ?? [];
  const total = list.length;
  const pub = list.filter((t) => t.published).length;
  const draft = total - pub;
  const active = RETAILERS.filter((r) => r.status === "active").length;
  const pending = RETAILERS.filter((r) => r.status === "pending").length;
  const next = orderUpcomingFirst()[0];
  const nextDays = next ? daysUntilCategory(next) : null;
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-festive">
        <img
          src={heroDiwali}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-sidebar via-sidebar/80 to-transparent" />
        <div className="relative px-6 py-8 sm:px-10">
          <p className="font-display text-sm font-semibold uppercase tracking-wider text-gold">
            Namaste, {brand.businessName || "there"}
          </p>
          <h1 className="mt-2 max-w-lg text-2xl font-extrabold text-primary-foreground sm:text-4xl">
            {next && nextDays !== null && nextDays > 0
              ? `${next.label} is ${nextDays} day${nextDays === 1 ? "" : "s"} away. Your retailers are ready.`
              : "Festive creatives your retailers can personalise in seconds."}
          </h1>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/manufacturer/editor"
              search={{}}
              className="flex items-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm font-semibold text-foreground"
            >
              <Plus className="h-4 w-4" /> New template
            </Link>
            <Link
              to="/manufacturer/retailers"
              className="flex items-center gap-2 rounded-xl border border-primary-foreground/30 px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Invite retailers
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat
          icon={LayoutTemplate}
          label="Total templates"
          value={total}
          note="Saved designs"
        />
        <Stat icon={CheckCircle2} label="Published" value={pub} note="Live for retailers" />
        <Stat icon={FileEdit} label="Drafts" value={draft} note="Not published yet" />
        <Stat icon={Users} label="Retailers" value={active} note="+2 this week" />
        <Stat icon={MailPlus} label="Pending invites" value={pending} note="Send a reminder" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Recent activity" className="lg:col-span-1">
          <ul className="space-y-4">
            {ACTIVITY.map(([a, b, c]) => (
              <li key={a + c} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0">
                  <p>
                    {a} <span className="font-semibold">{b}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{c}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel
          title="Campaigns"
          action={
            <Link
              to="/manufacturer/campaigns"
              className="flex items-center gap-1 text-sm font-semibold text-primary"
            >
              All <ArrowRight className="h-4 w-4" />
            </Link>
          }
          className="lg:col-span-2"
        >
          <div className="space-y-3">
            {CAMPAIGNS.map((c) => (
              <div key={c.name} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.start} – {c.end} · {c.templates} templates · {c.retailers} retailers
                  </p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        title="Your latest templates"
        action={
          <Link
            to="/manufacturer/saved"
            className="flex items-center gap-1 text-sm font-semibold text-primary"
          >
            All <ArrowRight className="h-4 w-4" />
          </Link>
        }
      >
        {templates.isLoading ? (
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-40 shrink-0 rounded-xl" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No templates yet. Create one to get started.
          </p>
        ) : (
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
            {list.slice(0, 8).map((t) => (
              <div key={t.id} className="w-40 shrink-0">
                <div className="aspect-square w-full overflow-hidden rounded-xl">
                  <TemplateSvg
                    spec={t.spec}
                    content={composeContent({
                      manufacturer: brand,
                      retailer: { businessName: "Your Store" },
                    })}
                    className="h-full w-full"
                    ariaLabel={t.title}
                  />
                </div>
                <p className="mt-2 truncate text-sm font-semibold">{t.title}</p>
                <p className="text-xs text-muted-foreground">
                  {getCategory(t.categoryKey)?.label ?? t.categoryKey}
                  {t.published ? " · Published" : " · Draft"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
