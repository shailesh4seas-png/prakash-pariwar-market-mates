import { Download, MapPin, Phone, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TemplatePoster } from "@/components/TemplateCard";
import type { Template } from "@/lib/data";

export function TemplateModal({
  template,
  onClose,
  onDownload,
}: {
  template: Template | null;
  onClose: () => void;
  onDownload?: (t: Template) => void;
}) {
  const [name, setName] = useState("Sharma Electronics");
  const [phone, setPhone] = useState("+91 98290 12345");
  const [address, setAddress] = useState("MI Road, Jaipur");
  const [format, setFormat] = useState<"Post" | "Story">("Post");

  return (
    <Dialog open={!!template} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto p-0">
        {template && (
          <div className="grid md:grid-cols-[1.1fr_1fr]">
            <div className="bg-muted p-5">
              <TemplatePoster
                t={template}
                className={format === "Story" ? "mx-auto aspect-[9/16] max-h-[60vh]" : ""}
                overlay={
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/90 to-transparent p-4 pt-10 text-primary-foreground">
                    <p className="flex items-center gap-1.5 text-sm font-bold">
                      <Store className="h-4 w-4" />
                      {name || "Your store"}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-3 text-xs opacity-90">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {address}
                      </span>
                    </p>
                  </div>
                }
              />
            </div>
            <div className="space-y-4 p-6">
              <div>
                <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                  {template.category}
                </span>
                <DialogTitle className="mt-3 text-2xl font-bold">{template.title}</DialogTitle>
                <DialogDescription>
                  By {template.brand} · Personalise with your store details
                </DialogDescription>
              </div>
              <div className="space-y-1.5">
                <Label>Retailer name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone number</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Address watermark</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Format</Label>
                <div className="flex gap-2">
                  {(["Post", "Story"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${format === f ? "border-primary bg-accent text-accent-foreground" : ""}`}
                    >
                      {f === "Post" ? "Post 1:1" : "Story 9:16"}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                className="w-full bg-gradient-primary shadow-glow"
                size="lg"
                onClick={() => {
                  onDownload?.(template);
                  toast.success("Creative ready", {
                    description: `${template.title} (${format}) saved to My Downloads.`,
                  });
                  onClose();
                }}
              >
                <Download className="h-4 w-4" /> Download creative
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
