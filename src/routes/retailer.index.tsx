import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Box,
  Download,
  Flame,
  Instagram,
  LayoutGrid,
  Search,
  Sparkles,
  Star,
  Sun,
  Tag,
  Target,
  Flower2,
  Bookmark,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import heroDiwali from "@/assets/hero-diwali.jpg";
import holi from "@/assets/tpl-holi.jpg";
import navratri from "@/assets/tpl-navratri.jpg";
import { TemplateCard } from "@/components/TemplateCard";
import { TemplateModal } from "@/components/TemplateModal";
import {
  CATEGORIES,
  NEW_TEMPLATES,
  RECOMMENDED,
  TEMPLATES,
  TRENDING,
  byIds,
  type Template,
} from "@/lib/data";
import { library, useLibrary } from "@/lib/library";
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

const CAT_ICON: Record<string, LucideIcon> = {
  All: LayoutGrid,
  Festival: Flower2,
  Products: Box,
  Offers: Tag,
  "New Arrivals": Star,
  Seasonal: Sun,
  "Social Media": Instagram,
  Business: BarChart3,
};

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
        <button
          onClick={() =>
            document.getElementById("trending")?.scrollIntoView({ behavior: "smooth" })
          }
          className="mt-6 flex w-fit items-center gap-2 rounded-xl bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-card transition hover:gap-3"
        >
          Create Your Festive Post <ArrowRight className="h-4 w-4" />
        </button>
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
  id,
}: {
  icon: LucideIcon;
  title: string;
  desc?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Icon className="mt-1 h-6 w-6 shrink-0 text-primary" />
          <div className="min-w-0">
            <h2 className="text-xl font-bold">{title}</h2>
            {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
          </div>
        </div>
        <button className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
          View All <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      {children}
    </section>
  );
}

function Row({ items, onOpen }: { items: Template[]; onOpen: (t: Template) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const lib = useLibrary();
  return (
    <div className="relative">
      <div ref={ref} className="no-scrollbar -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3">
        {items.map((t) => (
          <TemplateCard
            key={t.id}
            t={t}
            onOpen={onOpen}
            saved={lib.saved.includes(t.id)}
            onToggleSave={(x) => library.toggleSave(x.id)}
            className="snap-start"
          />
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
  const [open, setOpen] = useState<Template | null>(null);
  const [cat, setCat] = useState<string>("All");
  const [q, setQ] = useState("");
  const lib = useLibrary();

  const filtered = TEMPLATES.filter(
    (t) =>
      t.status === "published" &&
      (cat === "All" || t.category === cat) &&
      (t.title + t.headline).toLowerCase().includes(q.toLowerCase()),
  );
  const filtering = cat !== "All" || q.length > 0;

  return (
    <div className="space-y-10">
      <Hero />

      <div className="rounded-2xl bg-card p-4 shadow-card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Diwali, appliances, offers…"
            className="w-full rounded-xl border bg-muted/50 py-3 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {["Diwali", "Dhanteras", "Wedding Season", "Smart TV", "Kitchen", "Exchange Offer"].map(
            (s) => (
              <button
                key={s}
                onClick={() => setQ(s.split(" ")[0] ?? s)}
                className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-primary hover:text-primary-foreground"
              >
                {s}
              </button>
            ),
          )}
        </div>
      </div>

      {filtering && (
        <Section
          icon={Search}
          title={`Results${cat !== "All" ? ` in ${cat}` : ""}`}
          desc={`${filtered.length} templates found`}
        >
          {filtered.length ? (
            <Row items={filtered} onOpen={setOpen} />
          ) : (
            <p className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground">
              No templates match. Try another festival or product.
            </p>
          )}
        </Section>
      )}

      <Section
        id="trending"
        icon={Flame}
        title="Trending Templates"
        desc="Most popular templates for your business"
      >
        <Row items={TRENDING} onOpen={setOpen} />
      </Section>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <LayoutGrid className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Browse by Category</h2>
        </div>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {CATEGORIES.map((c) => {
            const Icon = CAT_ICON[c] ?? LayoutGrid;
            const active = cat === c;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl p-3 text-xs font-medium transition sm:p-4 sm:text-sm",
                  active
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "bg-card shadow-card hover:-translate-y-0.5",
                )}
              >
                <Icon className={cn("h-6 w-6 sm:h-7 sm:w-7", !active && "text-primary")} />
                <span className="text-center leading-tight">{c}</span>
              </button>
            );
          })}
        </div>
      </section>

      <Section icon={Sparkles} title="New Templates" desc="Fresh designs to keep your brand active">
        <Row
          items={NEW_TEMPLATES.filter((t) => t.status === "published").concat(
            NEW_TEMPLATES.filter((t) => t.status !== "published"),
          )}
          onOpen={setOpen}
        />
      </Section>

      <Section
        icon={Target}
        title="Recommended for You"
        desc="Based on your business type: Electronics & Home Appliances"
      >
        <Row items={RECOMMENDED} onOpen={setOpen} />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-card p-5 shadow-card">
          <h3 className="flex items-center gap-2 font-bold">
            <Bookmark className="h-5 w-5 text-primary" /> Saved Templates{" "}
            <span className="text-sm font-normal text-muted-foreground">({lib.saved.length})</span>
          </h3>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {byIds(lib.saved)
              .slice(0, 6)
              .map((t) => (
                <button key={t.id} onClick={() => setOpen(t)} className="text-left">
                  <img
                    src={t.image}
                    alt={t.title}
                    loading="lazy"
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                  <p className="mt-1 truncate text-xs font-medium">{t.title}</p>
                </button>
              ))}
            {!lib.saved.length && (
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
            {lib.downloads.slice(0, 5).map((d) => {
              const t = byIds([d.id])[0]!;
              return (
                <li key={d.id} className="flex items-center gap-3 py-2.5">
                  <img
                    src={t.image}
                    alt=""
                    loading="lazy"
                    className="h-11 w-11 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{d.at} · PNG · 1080×1080</p>
                  </div>
                  <button
                    onClick={() => setOpen(t)}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    Re-export
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <TemplateModal
        template={open}
        onClose={() => setOpen(null)}
        onDownload={(t) => library.addDownload(t.id)}
      />
    </div>
  );
}
