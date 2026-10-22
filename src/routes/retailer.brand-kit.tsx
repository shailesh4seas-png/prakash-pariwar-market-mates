import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Panel } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/retailer/brand-kit")({ component: Page });

function Page() {
  return (
    <>
      <PageHeader title="Brand Kit" desc="These details are added to every creative you download." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Store details">
          <div className="space-y-4">
            {[["Store name", "Sharma Electronics"], ["Phone", "+91 98290 12345"], ["WhatsApp", "+91 98290 12345"], ["Address", "MI Road, Jaipur, Rajasthan"]].map(([l, v]) => (
              <div key={l} className="space-y-1.5"><Label>{l}</Label><Input defaultValue={v} /></div>
            ))}
            <Button className="bg-gradient-primary" onClick={() => toast.success("Brand kit saved")}>Save</Button>
          </div>
        </Panel>
        <Panel title="Store logo">
          <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed text-sm text-muted-foreground">Drop your logo here (PNG, SVG)</div>
        </Panel>
      </div>
    </>
  );
}
