import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/AppShell";
import { Panel } from "@/components/shared";
import { TEMPLATES } from "@/lib/data";

export const Route = createFileRoute("/manufacturer/analytics")({
  head: () => ({ meta: [{ title: 'Manufacturer analytics · Prakash Pariwar' }, { name: "description", content: 'Manufacturer analytics for Prakash Pariwar business members.' }, { property: "og:title", content: 'Manufacturer analytics · Prakash Pariwar' }, { property: "og:description", content: 'Manufacturer analytics for Prakash Pariwar business members.' }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: Page });

const USAGE = [
  { m: "May", v: 420 }, { m: "Jun", v: 510 }, { m: "Jul", v: 480 }, { m: "Aug", v: 690 }, { m: "Sep", v: 940 }, { m: "Oct", v: 1620 },
];
const ADOPTION = [
  { m: "May", v: 18 }, { m: "Jun", v: 24 }, { m: "Jul", v: 31 }, { m: "Aug", v: 38 }, { m: "Sep", v: 47 }, { m: "Oct", v: 54 },
];

function Page() {
  const top = [...TEMPLATES].sort((a, b) => b.uses - a.uses).slice(0, 5);
  const max = top[0]?.uses ?? 1;
  return (
    <>
      <PageHeader title="Analytics" desc="How retailers are using your creatives." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Template downloads">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={USAGE}>
                <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip />
                <Area dataKey="v" name="Downloads" stroke="var(--primary)" strokeWidth={2} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Active retailers">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={ADOPTION}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip />
                <Bar dataKey="v" name="Retailers" fill="var(--gold)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Top performing creatives" className="lg:col-span-2">
          <ul className="space-y-4">
            {top.map((t) => (
              <li key={t.id} className="flex items-center gap-4">
                <img src={t.image} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-sm"><span className="truncate font-semibold">{t.title}</span><span className="text-muted-foreground">{t.uses.toLocaleString("en-IN")}</span></div>
                  <div className="mt-1.5 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-gradient-primary" style={{ width: `${(t.uses / max) * 100}%` }} /></div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
