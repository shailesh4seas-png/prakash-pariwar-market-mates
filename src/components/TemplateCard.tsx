import { Bookmark } from "lucide-react";
import type { Template } from "@/lib/data";
import { cn } from "@/lib/utils";

export function TemplatePoster({
  t,
  className,
  overlay,
}: {
  t: Template;
  className?: string;
  overlay?: React.ReactNode;
}) {
  return (
    <div className={cn("relative aspect-square overflow-hidden rounded-xl bg-muted", className)}>
      <img
        src={t.image}
        alt={t.title}
        loading="lazy"
        width={768}
        height={768}
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-foreground/70 via-transparent to-transparent" />
      <div className="absolute inset-x-0 top-0 p-3 pr-11">
        <p className="font-display text-lg font-semibold leading-tight text-primary-foreground drop-shadow sm:text-xl">
          {t.headline}
        </p>
        <span className="mt-1 inline-block rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase text-gold-foreground">
          {t.sub}
        </span>
      </div>
      {overlay}
    </div>
  );
}

export function TemplateCard({
  t,
  onOpen,
  saved,
  onToggleSave,
  className,
}: {
  t: Template;
  onOpen?: (t: Template) => void;
  saved?: boolean;
  onToggleSave?: (t: Template) => void;
  className?: string;
}) {
  return (
    <div className={cn("group relative w-44 shrink-0 sm:w-48", className)}>
      <button
        onClick={() => onOpen?.(t)}
        className="block w-full rounded-2xl bg-card p-1.5 text-left shadow-card transition hover:-translate-y-1 hover:shadow-glow"
      >
        <TemplatePoster t={t} />
        <div className="px-1.5 pb-1 pt-2.5">
          <p className="truncate text-sm font-semibold">{t.title}</p>
          <p className="text-xs text-muted-foreground">{t.category}</p>
        </div>
      </button>
      {onToggleSave && (
        <button
          onClick={() => onToggleSave(t)}
          aria-label={saved ? "Remove from saved" : "Save template"}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-card text-primary shadow-card"
        >
          <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
        </button>
      )}
    </div>
  );
}
