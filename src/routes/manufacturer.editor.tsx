import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ImageIcon, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { LogoMark } from "@/components/Logo";
import { Panel } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, TEMPLATES, type Category, type TemplateStatus } from "@/lib/data";
import { useSession } from "@/lib/session";
import {
  createTemplate,
  updateTemplate,
  uploadTemplateImage,
  type LogoPosition,
} from "@/lib/templates";
import { useManufacturerTemplates } from "@/lib/use-templates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/manufacturer/editor")({
  head: () => ({
    meta: [
      { title: "Template editor · Prakash Pariwar" },
      { name: "description", content: "Template editor for Prakash Pariwar business members." },
      { property: "og:title", content: "Template editor · Prakash Pariwar" },
      {
        property: "og:description",
        content: "Template editor for Prakash Pariwar business members.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { id?: string | undefined } => ({
    id: typeof s["id"] === "string" ? s["id"] : undefined,
  }),
  component: Page,
});

const POS: readonly LogoPosition[] = ["top-left", "top-right", "bottom-left", "bottom-right"];
const MEDIA = Array.from(new Set(TEMPLATES.map((t) => t.image)));

function Page() {
  const { id } = Route.useSearch();
  const { authUser, activeProfile } = useSession();
  const { rows, templates, loading } = useManufacturerTemplates();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const row = id ? rows.find((r) => r.id === id) : undefined;
  const existing = id ? templates.find((t) => t.id === id) : undefined;
  const [title, setTitle] = useState("Untitled template");
  const [cat, setCat] = useState<string>("Festival");
  const [img, setImg] = useState(MEDIA[0] ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [stockImage, setStockImage] = useState<string | null>(id ? null : (MEDIA[0] ?? null));
  const [headline, setHeadline] = useState("Your headline");
  const [sub, setSub] = useState("Special offer");
  const [cta, setCta] = useState("Visit store today");
  const [pos, setPos] = useState<LogoPosition>("top-left");
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const initialised = useRef(false);

  useEffect(() => {
    if (!row || !existing || initialised.current) return;
    initialised.current = true;
    setTitle(row.title);
    setCat(row.category);
    setHeadline(row.headline);
    setSub(row.sub);
    setCta(row.cta);
    setPos(row.logoPosition);
    setImg(existing.image);
  }, [row, existing]);

  const chooseStock = (url: string) => {
    setImg(url);
    setStockImage(url);
    setFile(null);
  };

  const chooseFile = (picked: File | undefined) => {
    if (!picked) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(picked.type)) {
      toast.error("Use a PNG, JPG or WebP image.");
      return;
    }
    if (picked.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5 MB or smaller.");
      return;
    }
    setImg(URL.createObjectURL(picked));
    setFile(picked);
    setStockImage(null);
  };

  /** Returns the new storage path, or undefined when the image is unchanged. */
  const resolveImagePath = async (userId: string): Promise<string | undefined> => {
    if (file) return uploadTemplateImage(userId, file);
    if (stockImage) {
      const blob = await (await fetch(stockImage)).blob();
      return uploadTemplateImage(
        userId,
        new File([blob], "stock-background.jpg", { type: blob.type || "image/jpeg" }),
      );
    }
    return undefined;
  };

  const save = async (status: TemplateStatus) => {
    const userId = authUser?.id;
    if (!userId) {
      toast.error("Please sign in again to save this template.");
      return;
    }
    if (!title.trim() || !headline.trim()) {
      toast.error("Title and headline are required.");
      return;
    }
    setSaving(true);
    try {
      const imagePath = await resolveImagePath(userId);
      const values = {
        title: title.trim(),
        headline: headline.trim(),
        sub: sub.trim(),
        category: cat as Category,
        status,
        cta: cta.trim() || "Visit store today",
        logoPosition: pos,
      };
      if (id) {
        await updateTemplate(id, imagePath ? { ...values, imagePath } : values);
      } else {
        await createTemplate(userId, {
          ...values,
          brand: activeProfile?.business_name ?? "",
          ...(imagePath ? { imagePath } : {}),
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success(status === "published" ? `“${title.trim()}” published` : "Draft saved");
      void navigate({ to: "/manufacturer/templates" });
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not save the template.");
    } finally {
      setSaving(false);
    }
  };

  if (id && loading) return <p className="text-sm text-muted-foreground">Loading template…</p>;
  if (id && !row) {
    return (
      <p className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground">
        This template was not found.{" "}
        <Link to="/manufacturer/templates" className="font-semibold text-primary">
          Back to templates
        </Link>
      </p>
    );
  }

  const posCls = {
    "top-left": "left-3 top-3",
    "top-right": "right-3 top-3",
    "bottom-left": "left-3 bottom-16",
    "bottom-right": "right-3 bottom-16",
  }[pos];

  return (
    <>
      <PageHeader
        title={id ? `Edit · ${row?.title ?? title}` : "New template"}
        action={
          <div className="flex gap-2">
            <Button variant="outline" disabled={saving} onClick={() => void save("draft")}>
              Save draft
            </Button>
            <Button
              className="bg-gradient-primary shadow-glow"
              disabled={saving}
              onClick={() => void save("published")}
            >
              {saving ? "Saving…" : "Publish"}
            </Button>
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Panel className="flex items-center justify-center bg-muted">
          <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-2xl shadow-glow">
            <img src={img} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-foreground/70 via-transparent to-foreground/70" />
            <div
              className={cn(
                "absolute flex items-center gap-1 rounded-lg bg-sidebar/80 px-2 py-1",
                posCls,
              )}
            >
              <LogoMark className="h-6 w-6" />
              <span className="font-display text-xs font-semibold text-gold">
                {(activeProfile?.business_name || "Your brand").split(" ")[0]}
              </span>
            </div>
            <div className="absolute inset-x-0 top-14 px-6 text-center">
              <p className="font-display text-3xl font-semibold text-primary-foreground drop-shadow sm:text-4xl">
                {headline}
              </p>
              <span className="mt-2 inline-block rounded-full bg-gold px-3 py-1 text-xs font-bold uppercase text-gold-foreground">
                {sub}
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-4 text-center">
              <span className="rounded-full bg-card px-4 py-2 text-sm font-semibold text-foreground">
                {cta}
              </span>
            </div>
          </div>
        </Panel>
        <Panel title="Content">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={cat} onValueChange={setCat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c !== "All").map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <ImageIcon className="h-4 w-4" /> Background media
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {MEDIA.map((m) => (
                  <button
                    key={m}
                    onClick={() => chooseStock(m)}
                    className={cn(
                      "overflow-hidden rounded-lg ring-2",
                      img === m ? "ring-primary" : "ring-transparent",
                    )}
                  >
                    <img src={m} alt="" className="aspect-square w-full object-cover" />
                  </button>
                ))}
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  chooseFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => fileInput.current?.click()}
              >
                <Upload className="h-4 w-4" /> Upload your own (PNG, JPG, WebP · max 5 MB)
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label>Headline</Label>
              <Input value={headline} onChange={(e) => setHeadline(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Offer badge</Label>
              <Input value={sub} onChange={(e) => setSub(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Call to action</Label>
              <Input value={cta} onChange={(e) => setCta(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Logo placement</Label>
              <div className="grid grid-cols-2 gap-2">
                {POS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPos(p)}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-xs capitalize",
                      pos === p && "border-primary bg-accent text-accent-foreground",
                    )}
                  >
                    {p.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
