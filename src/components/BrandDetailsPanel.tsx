import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MANUFACTURER_FIELDS,
  isLogoField,
  setSlotValue,
  type PlaceholderField,
  type TemplateSpec,
} from "@/lib/templateEngine";
import { isStoredLogoPath, resolveLogoSrc, uploadTemplateLogo } from "@/lib/template-assets";
import type { BrandProfile } from "@/lib/templateEngine";

/**
 * "Brand details" side panel: type the manufacturer name / logo / phone / email
 * (and a sample retailer block for previews) next to the canvas and the
 * template updates live. Values are stored on the spec (`valueOverrides`), so
 * they persist with save / send / publish and win over profile auto-fill.
 */

interface BrandDetailsPanelProps {
  spec: TemplateSpec;
  onSpecChange: (next: TemplateSpec) => void;
  /** Profile data used to prefill fields that were never typed into the spec. */
  manufacturer: BrandProfile;
}

const FIELD_LABEL: Record<PlaceholderField, string> = {
  mfr_name: "Owner name",
  mfr_business_name: "Manufacturer name",
  mfr_logo: "Manufacturer logo",
  mfr_phone: "Mobile no.",
  mfr_email: "Email",
  rtl_name: "Retailer name",
  rtl_business_name: "Shop / store name",
  rtl_logo: "Retailer logo",
  rtl_phone: "Retailer mobile",
  rtl_email: "Retailer email",
  rtl_address: "Shop address",
};

const TEXT_FIELDS: PlaceholderField[] = MANUFACTURER_FIELDS.filter((f) => !isLogoField(f));

function currentValue(spec: TemplateSpec, field: PlaceholderField, fallback: string): string {
  return spec.valueOverrides?.[field]?.text ?? fallback;
}

function LogoField({
  spec,
  field,
  label,
  onSpecChange,
}: {
  spec: TemplateSpec;
  field: PlaceholderField;
  label: string;
  onSpecChange: (next: TemplateSpec) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const stored = spec.valueOverrides?.[field]?.logoUrl;

  // Preview a `storage:` reference by signing it on demand.
  const [preview, setPreview] = useState<string | undefined>(stored);
  useEffect(() => {
    let alive = true;
    if (!stored) {
      setPreview(undefined);
      return;
    }
    if (!isStoredLogoPath(stored)) {
      setPreview(stored);
      return;
    }
    void (async () => {
      const url = await resolveLogoSrc(stored);
      if (alive) setPreview(url ?? stored);
    })();
    return () => {
      alive = false;
    };
  }, [stored]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const ref = await uploadTemplateLogo(file);
      onSpecChange(setSlotValue(spec, field, { logoUrl: ref }));
      toast.success("Logo updated on the template");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Logo upload failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        aria-label={`Upload ${label}`}
        className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed bg-muted transition hover:border-primary"
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : preview && !isStoredLogoPath(preview) ? (
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {preview ? "Shown inside the logo slot on the canvas." : "PNG / JPG / WebP up to 5 MB."}
        </p>
      </div>
      {preview && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Remove ${label}`}
          onClick={() => onSpecChange(setSlotValue(spec, field, {}))}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function BrandDetailsPanel({ spec, onSpecChange, manufacturer }: BrandDetailsPanelProps) {
  const setText = (field: PlaceholderField, text: string) =>
    onSpecChange(setSlotValue(spec, field, { text, ...(spec.valueOverrides?.[field]?.logoUrl ? { logoUrl: spec.valueOverrides[field]!.logoUrl } : {}) }));

  return (
    <Panel title="Brand details">
      <p className="-mt-2 mb-3 text-xs text-muted-foreground">
        Type here and the template updates instantly. These details are saved with the
        template; retailers still see their own name &amp; contact in their blocks.
      </p>
      <div className="space-y-4">
        <LogoField
          spec={spec}
          field="mfr_logo"
          label={FIELD_LABEL.mfr_logo}
          onSpecChange={onSpecChange}
        />
        {TEXT_FIELDS.map((field) => (
          <div key={field} className="space-y-1.5">
            <Label htmlFor={`brand-${field}`}>{FIELD_LABEL[field]}</Label>
            <Input
              id={`brand-${field}`}
              value={currentValue(
                spec,
                field,
                field === "mfr_name"
                  ? (manufacturer.name ?? "")
                  : field === "mfr_business_name"
                    ? manufacturer.businessName
                    : field === "mfr_phone"
                      ? (manufacturer.phone ?? "")
                      : (manufacturer.email ?? ""),
              )}
              onChange={(e) => setText(field, e.target.value)}
              placeholder="Shown on the template"
            />
          </div>
        ))}
      </div>
    </Panel>
  );
}
