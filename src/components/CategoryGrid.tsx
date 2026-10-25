import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  categoryPalette,
  generateTemplate,
  isUpcoming,
  filterCategories,
  themeFor,
  type CatalogFilter,
} from "@/lib/templateEngine";
import { TemplateSvg } from "@/components/TemplateSvg";
import { cn } from "@/lib/utils";

const FILTERS: { id: CatalogFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "festival", label: "Festivals" },
  { id: "season", label: "Seasons" },
];

interface CategoryGridProps {
  onSelect: (categoryKey: string) => void;
  selectedKey?: string | null;
}

/**
 * Festival / season catalog. Categories are ordered by soonest upcoming date
 * (2026-27 calendar), each tile is a real thumbnail from the engine, and items
 * inside the upcoming window get an "Upcoming" badge. Search + type filter.
 */
export function CategoryGrid({ onSelect, selectedKey }: CategoryGridProps) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<CatalogFilter>("all");

  const categories = useMemo(
    () => filterCategories({ kind, query }),
    [kind, query],
  );

  const previews = useMemo(
    () => categories.map((c) => ({ category: c, thumb: generateTemplate(c.key, 0, "post") })),
    [categories],
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search festivals & seasons"
            aria-label="Search festivals and seasons"
            className="w-full rounded-xl border bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-1 rounded-xl bg-card p-1 shadow-card">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setKind(f.id)}
              aria-pressed={kind === f.id}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                kind === f.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {categories.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
          No festivals or seasons match “{query}”.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {previews.map(({ category, thumb }) => {
            const theme = themeFor(category.key);
            const pal = categoryPalette(category.key);
            return (
              <button
                key={category.key}
                onClick={() => onSelect(category.key)}
                className={cn(
                  "group overflow-hidden rounded-2xl bg-card text-left shadow-card ring-1 ring-transparent transition hover:ring-primary/40",
                  selectedKey === category.key && "ring-2 ring-primary",
                )}
              >
                <div className="relative aspect-square w-full overflow-hidden">
                  <TemplateSvg
                    spec={thumb}
                    ariaLabel={`${category.label} templates`}
                    className="h-full w-full transition group-hover:scale-[1.02]"
                  />
                  {/* Festival identity chip — colours + emblem differ per theme. */}
                  <span
                    className="absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow"
                    style={{ background: pal.accent, color: pal.onAccent }}
                  >
                    <span aria-hidden>{theme.emoji}</span>
                    <span className="uppercase tracking-wide">{theme.eyebrow}</span>
                  </span>
                  {isUpcoming(category) && (
                    <span
                      className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold shadow"
                      style={{ background: pal.bgFrom, color: pal.text }}
                    >
                      Upcoming
                    </span>
                  )}
                </div>
                <div
                  className="border-t-2 p-3"
                  style={{
                    borderColor: pal.accent,
                    background: `linear-gradient(135deg, ${pal.bgFrom}14, ${pal.bgTo}26)`,
                  }}
                >
                  <p className="truncate text-sm font-semibold">{category.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{theme.tagline}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
