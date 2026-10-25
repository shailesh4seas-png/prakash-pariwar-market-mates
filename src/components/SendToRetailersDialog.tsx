import { useEffect, useMemo, useState } from "react";
import { Search, Check, Loader2, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { SendTarget, TemplateRecipient } from "@/lib/designerTemplates";
import { cn } from "@/lib/utils";

interface SendToRetailersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targets: SendTarget[];
  recipients?: TemplateRecipient[];
  loading?: boolean;
  submitting?: boolean;
  onSubmit: (retailerIds: string[]) => void;
}

/**
 * Lists the manufacturer's ACTIVE retailers (from manufacturer_retailer_associations
 * + profiles). Supports one-by-one selection, Select all, search, and shows who
 * already received it. Re-sending is idempotent server-side (bumps sent_at only).
 */
export function SendToRetailersDialog({
  open,
  onOpenChange,
  targets,
  recipients = [],
  loading,
  submitting,
  onSubmit,
}: SendToRetailersDialogProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const recipientIds = useMemo(() => new Set(recipients.map((r) => r.retailerUserId)), [recipients]);

  // Prefill with people who already have it so "send" acts as resend/extend.
  useEffect(() => {
    if (open) setSelected(new Set(recipientIds));
  }, [open, recipientIds]);

  const filtered = targets.filter((t) =>
    t.businessName.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allFilteredSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.retailerUserId));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send to retailers</DialogTitle>
          <DialogDescription>
            Only retailers in your active network are listed. Sending adds the template to their
            feed instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search retailers"
            aria-label="Search retailers"
            className="w-full rounded-xl border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() =>
              setSelected((prev) => {
                const next = new Set(prev);
                if (allFilteredSelected) filtered.forEach((t) => next.delete(t.retailerUserId));
                else filtered.forEach((t) => next.add(t.retailerUserId));
                return next;
              })
            }
            className="font-medium text-primary hover:underline"
            disabled={filtered.length === 0}
          >
            {allFilteredSelected ? "Deselect all" : "Select all"}
          </button>
          <span className="text-muted-foreground">{selected.size} selected</span>
        </div>

        <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <Users className="h-6 w-6" />
              No active retailers yet. Invite retailers from the Retailers page first.
            </div>
          ) : (
            filtered.map((t) => {
              const checked = selected.has(t.retailerUserId);
              const sent = recipientIds.has(t.retailerUserId);
              return (
                <label
                  key={t.retailerUserId}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2",
                    checked ? "border-primary bg-accent/40" : "border-transparent hover:bg-muted",
                  )}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(t.retailerUserId)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{t.businessName}</span>
                    {t.city && <span className="block truncate text-xs text-muted-foreground">{t.city}</span>}
                  </span>
                  {sent && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                      <Check className="h-3 w-3" /> Sent
                    </span>
                  )}
                </label>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-gradient-primary shadow-glow"
            disabled={selected.size === 0 || submitting}
            onClick={() => onSubmit([...selected])}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send to {selected.size || "a"} retailer{selected.size === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
