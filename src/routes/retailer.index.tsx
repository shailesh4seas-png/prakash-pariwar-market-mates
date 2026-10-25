import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Download,
  Inbox,
  LayoutTemplate,
  Search,
  Store,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import heroDiwali from "@/assets/hero-diwali.jpg";
import holi from "@/assets/tpl-holi.jpg";
import navratri from "@/assets/tpl-navratri.jpg";
import { TemplateSvg, composeContent } from "@/components/TemplateSvg";
import { TemplateViewer } from "@/components/TemplateViewer";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategory } from "@/lib/templateEngine";
import { useSession } from "@/lib/session";
import type { ReceivedTemplate } from "@/lib/designerTemplates";
import {
  brandFromProfile,
  useReceivedTemplates,
  useRecentDownloads,
} from "@/lib/templateQueries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/retailer/")({
  head: () => ({
    meta: [
      { title: "Retailer dashboard · Prakash Pariwar" },
      { name: "description", content: "Retailer dashboard for Prakash Pariwar business members." },
      { property: "og:title", content: "Retailer dashboard · Prakash Pariwar" },
      {
        property: "og:description",
        content: "Retailer dashboard for Prakash Pariwar business members.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RetailerHome,
});

const SLIDES = [
  {
    img: heroDiwali,
    t1: "This Diwali,",
    t2: "Bring Home ",
    hi: "Happiness",
    sub: "Festive offers, modern living.",
    badge: "Diwali Special Offers",
  },
  {
    img: holi,
    t1: "Colours of Holi,",
    t2: "Colours of ",
    hi: "Savings",
    sub: "Bright deals for every kitchen.",
    badge: "Holi Special",
  },
  {
    img: navratri,
    t1: "Nine Nights,",
    t2: "Nine ",
    hi: "Offers",
    sub: "Celebrate Navratri with your customers.",
    badge: "Navratri Utsav",
  },
];

function Hero() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % SLIDES.length), 6000);
    return () => clearInterval(id);
  }, []);
  const s = SLIDES[i]!;
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-festive shadow-glow">
      <img
        key={s.img}
        src={s.img}
        alt=""
        width={1792}
        height={768}
        className="absolute inset-0 h-full w-full animate-in fade-in object-cover duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-sidebar via-sidebar/70 to-transparent" />
      <div className="relative flex min-h-[260px] flex-col justify-center px-6 py-10 sm:min-h-[320px] sm:px-16">
        <span className="mb-3 w-fit rounded-full border border-gold/60 bg-sidebar/50 px-3 py-1 font-display text-xs font-semibold uppercase tracking-wider text-gold">
          {s.badge}
        </span>
        <h1 className="max-w-xl text-3xl font-extrabold leading-tight text-primary-foreground sm:text-5xl">
          {s.t1}
          <br />
          {s.t2}
          <span className="bg-gradient-to-r from-primary-glow to-gold bg-clip-text text-transparent">
            {s.hi}
          </span>
        </h1>
        <p className="mt-3 text-lg text-sidebar-foreground">{s.sub}</p>
        <Link
          to="/retailer/templates"
          className="mt-6 flex w-fit items-center gap-2 rounded-xl bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-card transition hover:gap-3"
        >
          Browse your templates <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {[-1, 1].map((d) => (
        <button
          key={d}
          aria-label={d < 0 ? "Previous slide" : "Next slide"}
          onClick={() => setI((x) => (x + d + SLIDES.length) % SLIDES.length)}
          className={cn(
            "absolute top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow sm:flex",
            d < 0 ? "left-3" : "right-3",
          )}
        >
          {d < 0 ? <ArrowLeft className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
        </button>
      ))}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
        {SLIDES.map((_, k) => (
          <button
            key={k}
            aria-label={`Slide ${k + 1}`}
            onClick={() => setI(k)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              k === i ? "w-6 bg-card" : "w-1.5 bg-card/50",
            )}
          />
        ))}
      </div>
    </section>
  );
}

function Section({
  icon: Icon,
  title,
  desc,
  children,
  action,
}: {
  icon: typeof Inbox;
  title: string;
  desc?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="scroll-mt-24">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Icon className="mt-1 h-6 w-6 shrink-0 text-primary" />
          <div className="min-w-0">
            <h2 className="text-xl font-bold">{title}</h2>
            {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ThumbCard({
  template,
  content,
  onOpen,
}: {
  template: ReceivedTemplate;
  content: ReturnType<typeof composeContent>;
  onOpen: () => void;
}) {
  const category = getCategory(template.categoryKey);
  const isStory = template.canvasKind === "story";
  return (
    <button
      onClick={onOpen}
      className="w-40 shrink-0 snap-start overflow-hidden rounded-2xl bg-card text-left shadow-card ring-1 ring-transparent transition hover:ring-primary/40 sm:w-48"
    >
      <div className={cn("relative w-full overflow-hidden", isStory ? "aspect-[9/16]" : "aspect-square")}>
        <TemplateSvg
          spec={template.spec}
          content={content}
          ariaLabel={`${category?.label ?? template.categoryKey} from ${template.manufacturer.businessName}`}
          className="h-full w-full"
        />
        {!template.seenAt && (
          <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow">
            New
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="truncate text-sm font-semibold">{category?.label ?? template.categoryKey}</p>
        <p className="truncate text-xs text-muted-foreground">{template.manufacturer.businessName}</p>
      </div>
    </button>
  );
}

function Row({
  items,
  contents,
  onOpen,
}: {
  items: ReceivedTemplate[];
  contents: Map<string, ReturnType<typeof composeContent>>;
  onOpen: (t: ReceivedTemplate) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="relative">
      <div ref={ref} className="no-scrollbar -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3">
        {items.map((t) => (
          <ThumbCard key={t.templateId} template={t} content={contents.get(t.templateId) ?? {}} onOpen={() => onOpen(t)} />
        ))}
      </div>
      <button
        aria-label="Scroll right"
        onClick={() => ref.current?.scrollBy({ left: 420, behavior: "smooth" })}
        className="absolute right-0 top-[40%] hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-card text-primary shadow-card sm:flex"
      >
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}

function RetailerHome() {
  const received = useReceivedTemplates();
  const downloads = useRecentDownloads();
  const { activeProfile } = useSession();
  const retailer = useMemo(() => brandFromProfile(activeProfile), [activeProfile]);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<ReceivedTemplate | null>(null);

  const data = received.data ?? [];

  const contents = useMemo(() => {
    const map = new Map<string, ReturnType<typeof composeContent>>();
    for (const t of data) map.set(t.templateId, composeContent({ manufacturer: t.manufacturer, retailer }));
    return map;
  }, [data, retailer]);

  // Published-first, then most-recently sent.
  const ordered = useMemo(
    () =>
      [...data].sort((a, b) => {
        if (a.isPublished !== b.isPublished) return a.isPublished ? -1 : 1;
        return (b.sentAt ?? "").localeCompare(a.sentAt ?? "");
      }),
    [data],
  );

  const savedList = useMemo(() => data.filter((t) => t.isSaved), [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ordered.filter((t) => {
      const category = getCategory(t.categoryKey);
      return (
        t.manufacturer.businessName.toLowerCase().includes(q) ||
        (category?.label ?? "").toLowerCase().includes(q) ||
        t.headline.toLowerCase().includes(q)
      );
    });
  }, [query, ordered]);

  return (
    <div className="space-y-10">
      <Hero />

      <div className="rounded-2xl bg-card p-4 shadow-card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by manufacturer, festival or headline…"
            className="w-full rounded-xl border bg-muted/50 py-3 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      {query.trim() ? (
        <Section icon={Search} title="Search results" desc={`${filtered.length} templates found`}>
          {filtered.length ? (
            <Row items={filtered} contents={contents} onOpen={setOpen} />
          ) : (
            <p className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground">
              No templates match. Try another festival or manufacturer.
            </p>
          )}
        </Section>
      ) : (
        <Section
          icon={Inbox}
          title="From your manufacturers"
          desc="Published and freshly shared creatives from the manufacturers you're linked to."
          action={
            <Link
              to="/retailer/templates"
              className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          {received.isLoading ? (
            <div className="flex gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-56 w-40 shrink-0 rounded-2xl" />
              ))}
            </div>
          ) : ordered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/50 px-6 py-14 text-center">
              <Store className="h-8 w-8 text-muted-foreground" />
              <p className="max-w-sm text-sm text-muted-foreground">
                No templates yet. Once a manufacturer you're linked to publishes or sends a template,
                it lands here ready to personalise and download.
              </p>
              <Link
                to="/retailer/templates"
                className="mt-1 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
              >
                <LayoutTemplate className="h-4 w-4" /> Browse the catalog
              </Link>
            </div>
          ) : (
            <Row items={ordered.slice(0, 12)} contents={contents} onOpen={setOpen} />
          )}
        </Section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-card p-5 shadow-card">
          <h3 className="flex items-center gap-2 font-bold">
            <Bookmark className="h-5 w-5 text-primary" /> Saved Templates{" "}
            <span className="text-sm font-normal text-muted-foreground">({savedList.length})</span>
          </h3>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {savedList.slice(0, 6).map((t) => (
              <button key={t.templateId} onClick={() => setOpen(t)} className="text-left">
                <div className="aspect-square w-full overflow-hidden rounded-xl">
                  <TemplateSvg
                    spec={t.spec}
                    content={contents.get(t.templateId) ?? {}}
                    className="h-full w-full"
                    ariaLabel={getCategory(t.categoryKey)?.label ?? "Saved template"}
                  />
                </div>
              </button>
            ))}
            {!savedList.length && (
              <p className="col-span-3 text-sm text-muted-foreground">
                Tap the bookmark on any template to save it here.
              </p>
            )}
          </div>
        </div>
        <div className="rounded-2xl bg-card p-5 shadow-card">
          <h3 className="flex items-center gap-2 font-bold">
            <Download className="h-5 w-5 text-primary" /> My Downloads
          </h3>
          <ul className="mt-4 divide-y">
            {(downloads.data ?? []).slice(0, 5).map((d) => {
              const t = data.find((x) => x.templateId === d.templateId);
              const category = getCategory(t?.categoryKey ?? "");
              return (
                <li key={d.id} className="flex items-center gap-3 py-2.5">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {t && (
                      <TemplateSvg
                        spec={t.spec}
                        content={contents.get(t.templateId) ?? {}}
                        className="h-full w-full"
                        ariaLabel={category?.label ?? "Downloaded creative"}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{category?.label ?? "Creative"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(d.at).toLocaleDateString()} ·{" "}
                      {d.canvasKind === "story" ? "PNG · 1080×1920" : "PNG · 1080×1080"}
                    </p>
                  </div>
                  {t && (
                    <button
                      onClick={() => setOpen(t)}
                      className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      Re-export
                    </button>
                  )}
                </li>
              );
            })}
            {!downloads.data?.length && (
              <li className="py-4 text-sm text-muted-foreground">
                Downloaded creatives will show up here.
              </li>
            )}
          </ul>
        </div>
      </div>

      <TemplateViewer template={open} open={open !== null} onOpenChange={(o) => !o && setOpen(null)} />
    </div>
  );
}
