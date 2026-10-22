import { createFileRoute } from "@tanstack/react-router";
import { Copy, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Panel, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RETAILERS } from "@/lib/data";

export const Route = createFileRoute("/manufacturer/retailers")({ component: Page });

const LINK = "https://prakashpariwar.in/join/jyoti-7f3k2";

function Page() {
  const [open, setOpen] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(LINK); toast.success("Invitation link copied"); };
  return (
    <>
      <PageHeader title="Retailer network" desc={`${RETAILERS.length} retailers · ${RETAILERS.filter((r) => r.status === "pending").length} pending invitations`} action={<Button className="w-fit bg-gradient-primary shadow-glow" onClick={() => setOpen(true)}><UserPlus className="h-4 w-4" /> Invite retailer</Button>} />
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="py-3">Retailer</th><th>City</th><th>Status</th><th>Joined</th><th className="text-right">Downloads</th></tr></thead>
            <tbody>
              {RETAILERS.map((r) => (
                <tr key={r.name} className="border-b last:border-0">
                  <td className="py-3 font-semibold">{r.name}</td>
                  <td className="text-muted-foreground">{r.city}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="text-muted-foreground">{r.joined}</td>
                  <td className="text-right font-medium">{r.downloads}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Invite a retailer</DialogTitle>
          <DialogDescription>They'll get access to all your published templates.</DialogDescription>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Store name</Label><Input placeholder="e.g. Gupta Appliances" /></div>
            <div className="space-y-1.5"><Label>Phone or email</Label><Input placeholder="+91 or name@store.in" /></div>
            <Button className="w-full bg-gradient-primary" onClick={() => { toast.success("Invitation sent"); setOpen(false); }}>Send invitation</Button>
            <div className="space-y-1.5">
              <Label>Or share invitation link</Label>
              <div className="flex gap-2"><Input readOnly value={LINK} /><Button variant="outline" onClick={copy} aria-label="Copy link"><Copy className="h-4 w-4" /></Button></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
