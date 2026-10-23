import { createFileRoute } from "@tanstack/react-router";
import { Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { LogoMark } from "@/components/Logo";
import { Panel } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/manufacturer/brand")({
  head: () => ({
    meta: [
      { title: "Manufacturer brand kit · Prakash Pariwar" },
      {
        name: "description",
        content: "Manufacturer brand kit for Prakash Pariwar business members.",
      },
      { property: "og:title", content: "Manufacturer brand kit · Prakash Pariwar" },
      {
        property: "og:description",
        content: "Manufacturer brand kit for Prakash Pariwar business members.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const [colors, setColors] = useState(["#1B1F3B", "#6D3FE0", "#E8B54A", "#F5F3FF"]);
  const [logo, setLogo] = useState<string | null>(null);
  return (
    <>
      <PageHeader
        title="Brand Kit"
        desc="Keep every retailer creative on-brand."
        action={
          <Button className="bg-gradient-primary" onClick={() => toast.success("Brand kit saved")}>
            Save changes
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Brand identity" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Brand name</Label>
              <Input defaultValue="Jyoti Appliances" />
            </div>
            <div className="space-y-1.5">
              <Label>Tagline</Label>
              <Input defaultValue="Light up every home" />
            </div>
            <div className="space-y-1.5">
              <Label>Support phone</Label>
              <Input defaultValue="1800 120 4455" />
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input defaultValue="jyotiappliances.com" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Brand guidelines</Label>
              <Textarea
                rows={4}
                defaultValue="Keep the logo in the top-left corner with clear space. Use gold only for highlights and offers. Product photos on violet or white backgrounds."
              />
            </div>
          </div>
        </Panel>
        <Panel title="Logo">
          <label className="flex h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-sidebar text-sm text-sidebar-foreground">
            {logo ? (
              <img src={logo} alt="Logo preview" className="max-h-28" />
            ) : (
              <>
                <LogoMark className="h-14 w-14" />
                <span className="flex items-center gap-1">
                  <Upload className="h-4 w-4" /> Upload logo
                </span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setLogo(URL.createObjectURL(f));
              }}
            />
          </label>
        </Panel>
        <Panel title="Brand colours">
          <div className="grid grid-cols-4 gap-3">
            {colors.map((c, i) => (
              <label key={i} className="text-center">
                <input
                  type="color"
                  value={c}
                  onChange={(e) => setColors(colors.map((x, k) => (k === i ? e.target.value : x)))}
                  className="h-14 w-full cursor-pointer rounded-xl border-0 bg-transparent"
                />
                <span className="text-xs text-muted-foreground">{c}</span>
              </label>
            ))}
          </div>
        </Panel>
        <Panel title="Fonts" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-muted p-4">
              <p className="text-xs text-muted-foreground">Headings</p>
              <p className="font-display text-3xl font-semibold">Fraunces</p>
            </div>
            <div className="rounded-xl bg-muted p-4">
              <p className="text-xs text-muted-foreground">Body</p>
              <p className="text-3xl font-semibold">Plus Jakarta Sans</p>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
