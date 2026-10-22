import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { CALENDAR_EVENTS } from "@/lib/data";
import { cn } from "@/lib/utils";

export function Panel({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl bg-card p-5 shadow-card", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-bold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const TONE: Record<string, string> = {
  published: "bg-success/15 text-success",
  active: "bg-success/15 text-success",
  live: "bg-success/15 text-success",
  draft: "bg-warning/20 text-gold-foreground",
  pending: "bg-warning/20 text-gold-foreground",
  scheduled: "bg-accent text-accent-foreground",
  archived: "bg-muted text-muted-foreground",
  completed: "bg-muted text-muted-foreground",
  expired: "bg-destructive/15 text-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", TONE[status] ?? "bg-muted")}>{status}</span>;
}

const EVT: Record<string, string> = {
  festival: "bg-gold/25 text-gold-foreground",
  launch: "bg-primary/15 text-accent-foreground",
  post: "bg-success/15 text-success",
};

export function CalendarView() {
  // November 2026 starts on a Sunday.
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  return (
    <Panel
      title="November 2026"
      action={
        <div className="flex gap-1">
          <button className="rounded-lg border p-1.5" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
          <button className="rounded-lg border p-1.5" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
        </div>
      }
    >
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <div key={d} className={cn("min-h-16 rounded-lg border p-1.5 sm:min-h-24", d === 8 && "border-gold bg-gold/10")}>
            <p className="text-xs font-semibold">{d}</p>
            <div className="mt-1 space-y-1">
              {CALENDAR_EVENTS[d]?.map((e) => (
                <p key={e.label} className={cn("truncate rounded px-1 py-0.5 text-[10px] font-medium", EVT[e.tone])} title={e.label}>{e.label}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <span className={cn("rounded px-2 py-0.5", EVT["festival"])}>Festival</span>
        <span className={cn("rounded px-2 py-0.5", EVT["launch"])}>Product launch</span>
        <span className={cn("rounded px-2 py-0.5", EVT["post"])}>Scheduled content</span>
      </div>
    </Panel>
  );
}
