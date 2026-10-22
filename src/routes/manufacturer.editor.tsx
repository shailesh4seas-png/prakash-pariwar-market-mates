import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ImageIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { LogoMark } from "@/components/Logo";
import { Panel } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, TEMPLATES } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/manufacturer/editor")({
  validateSearch: (s: Record<string, unknown>) => ({ id: typeof s.id === "string" ? s.id : undefined }),
  component: Page,
});

const POS = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;
const MEDIA = Array.from(new Set(TEMPLATES.map((t) => t.image)));

function Page() {
  const { id } = Route.useSearch();
  const base = TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
  const navigate = useNavigate();
  const [title, setTitle] = useState(id ? base.title : "Untitled template");
  const [cat, setCat] = useState<string>(base.category);
  const [img, setImg] = useState(base.image);
  const [headline, setHeadline] = useState(base.headline);
  const [sub, setSub] = useState(base.sub);
  const [cta, setCta] = useState("Visit store today");
  const [pos, setPos] = useState<(typeof POS)[number]>("top-left");

  const posCls = { "top-left": "left-3 top-3", "top-right": "right-3 top-3", "bottom-left": "left-3 bottom-16", "bottom-right": "right-3 bottom-16" }[pos];

  return (
    <>
      <PageHeader
        title={id ? `Edit · ${base.title}` : "New template"}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => toast.success("Draft saved")}>Save draft</Button>
            <Button className="bg-gradient-primary shadow-glow" onClick={() => { toast.success(`“${title}” published to 54 retailers`); navigate({ to: "/manufacturer/templates" }); }}>Publish</Button>
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Panel className="flex items-center justify-center bg-muted">
          <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-2xl shadow-glow">
            <img src={img} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-foreground/70 via-transparent to-foreground/70" />
            <div className={cn("absolute flex items-center gap-1 rounded-lg bg-sidebar/80 px-2 py-1", posCls)}><LogoMark className="h-6 w-6" /><span className="font-display text-xs font-semibold text-gold">Jyoti</span></div>
            <div className="absolute inset-x-0 top-14 px-6 text-center">
              <p className="font-display text-3xl font-semibold text-primary-foreground drop-shadow sm:text-4xl">{headline}</p>
              <span className="mt-2 inline-block rounded-full bg-gold px-3 py-1 text-xs font-bold uppercase text-gold-foreground">{sub}</span>
            </div>
            <div className="absolute inset-x-0 bottom-4 text-center">
              <span className="rounded-full bg-card px-4 py-2 text-sm font-semibold text-foreground">{cta}</span>
            </div>
          </div>
        </Panel>
        <Panel title="Content">
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={cat} onValueChange={setCat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.filter((c) => c !== "All").map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><ImageIcon className="h-4 w-4" /> Background media</Label>
              <div className="grid grid-cols-4 gap-2">
                {MEDIA.map((m) => (
                  <button key={m} onClick={() => setImg(m)} className={cn("overflow-hidden rounded-lg ring-2", img === m ? "ring-primary" : "ring-transparent")}>
                    <img src={m} alt="" className="aspect-square w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5"><Label>Headline</Label><Input value={headline} onChange={(e) => setHeadline(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Offer badge</Label><Input value={sub} onChange={(e) => setSub(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Call to action</Label><Input value={cta} onChange={(e) => setCta(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Logo placement</Label>
              <div className="grid grid-cols-2 gap-2">
                {POS.map((p) => (
                  <button key={p} onClick={() => setPos(p)} className={cn("rounded-lg border px-2 py-1.5 text-xs capitalize", pos === p && "border-primary bg-accent text-accent-foreground")}>{p.replace("-", " ")}</button>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
