/**
 * Photo picker used by the product form.
 *
 * Works on the form's ref model (`saved:<imageId>` / `new:<fileIndex>`) so the
 * same component can mix already-saved photos with not-yet-uploaded files, and
 * the parent stays the single owner of the draft state.
 */
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  MAX_PRODUCT_PHOTOS,
  newRef,
  validatePhotoFile,
  type PhotoUploadState,
  type ProductFormValues,
} from "@/lib/productCatalog";

interface PhotoItem {
  ref: string;
  name: string;
  /** Signed URL of an already-saved photo. */
  url: string | null;
  /** Pending local file, previewed through an object URL. */
  file?: File;
  savedId?: string;
}

/** Catalog standard the product form nudges manufacturers towards. */
const PHOTOS_PER_PRODUCT_TARGET = 8;

export function ProductPhotoManager({
  values,
  disabled,
  progress,
  onChange,
}: {
  values: ProductFormValues;
  disabled: boolean;
  progress: PhotoUploadState | null;
  onChange: (patch: Partial<ProductFormValues>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draggedRef, setDraggedRef] = useState<string | null>(null);

  const items = useMemo<PhotoItem[]>(
    () =>
      values.photoRefs
        .map((ref): PhotoItem | null => {
          if (ref.startsWith("saved:")) {
            const id = ref.slice(6);
            if (values.removedPhotoIds.includes(id)) return null;
            const photo = values.existing.find((item) => item.id === id);
            if (!photo) return null;
            return {
              ref,
              savedId: id,
              name: `Saved photo · ${photo.storagePath.split("/").pop()}`,
              url: photo.url,
            };
          }
          if (ref.startsWith("new:")) {
            const file = values.newPhotos[Number(ref.slice(4))];
            if (!file) return null;
            return { ref, file, name: file.name, url: null };
          }
          return null;
        })
        .filter((item): item is PhotoItem => item !== null),
    [values],
  );

  const primaryRef = values.primaryRef || items[0]?.ref || "";

  const addFiles = (selected: File[]) => {
    const room = MAX_PRODUCT_PHOTOS - items.length;
    if (room <= 0) {
      toast.error(`A product can have at most ${MAX_PRODUCT_PHOTOS} photos.`);
      return;
    }
    const chosen: File[] = [];
    for (const file of selected) {
      const problem = validatePhotoFile(file);
      if (problem) {
        toast.error(`${file.name}: ${problem}`);
        continue;
      }
      if (chosen.length >= room) {
        toast.error(`Only ${room} more photo${room === 1 ? "" : "s"} can be added to this product.`);
        break;
      }
      chosen.push(file);
    }
    if (!chosen.length) return;
    const start = values.newPhotos.length;
    onChange({
      newPhotos: [...values.newPhotos, ...chosen],
      photoRefs: [...values.photoRefs, ...chosen.map((_, index) => newRef(start + index))],
      primaryRef: values.primaryRef || items[0]?.ref || newRef(start),
    });
  };

  const removeItem = (item: PhotoItem) => {
    if (item.savedId) {
      const photoRefs = values.photoRefs.filter((ref) => ref !== item.ref);
      onChange({
        removedPhotoIds: [...values.removedPhotoIds, item.savedId],
        photoRefs,
        primaryRef: values.primaryRef === item.ref ? photoRefs[0] ?? "" : values.primaryRef,
      });
      return;
    }
    const removedIndex = Number(item.ref.slice(4));
    // Dropping a pending file shifts every later index, so all `new:` refs are
    // renumbered to keep pointing at the right file.
    const renumber = (ref: string) => {
      if (!ref.startsWith("new:")) return ref;
      const index = Number(ref.slice(4));
      if (index === removedIndex) return null;
      return index > removedIndex ? newRef(index - 1) : ref;
    };
    const photoRefs = values.photoRefs
      .map(renumber)
      .filter((ref): ref is string => ref !== null);
    onChange({
      newPhotos: values.newPhotos.filter((_, index) => index !== removedIndex),
      photoRefs,
      primaryRef: values.primaryRef === item.ref ? photoRefs[0] ?? "" : renumber(values.primaryRef) ?? "",
    });
  };

  const move = (ref: string, delta: number) => {
    const index = values.photoRefs.indexOf(ref);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= values.photoRefs.length) return;
    const photoRefs = [...values.photoRefs];
    const source = photoRefs[index];
    const swapWith = photoRefs[target];
    if (!source || !swapWith) return;
    photoRefs[index] = swapWith;
    photoRefs[target] = source;
    onChange({ photoRefs, primaryRef: values.primaryRef || photoRefs[0] || "" });
  };

  const dropOn = (targetRef: string) => {
    const source = draggedRef;
    setDraggedRef(null);
    if (!source || source === targetRef) return;
    const photoRefs = values.photoRefs.filter((ref) => ref !== source);
    photoRefs.splice(photoRefs.indexOf(targetRef), 0, source);
    onChange({ photoRefs });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {items.length} of {MAX_PRODUCT_PHOTOS} photos · the cover photo is shown in the catalog
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || items.length >= MAX_PRODUCT_PHOTOS}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" /> Add photos
        </Button>
      </div>

      <input
        ref={inputRef}
        id="product-photos"
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => {
          addFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />

      {items.length === 0 ? (
        <label
          htmlFor="product-photos"
          className="flex min-h-28 cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-input p-4 text-sm text-muted-foreground hover:border-primary"
        >
          <ImagePlus className="h-5 w-5" /> Choose product photos (PNG, JPG or WebP · max 5 MB
          each)
        </label>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item, index) => (
            <li
              key={item.ref}
              draggable={!disabled}
              onDragStart={() => setDraggedRef(item.ref)}
              onDragOver={(event: DragEvent) => event.preventDefault()}
              onDrop={() => dropOn(item.ref)}
              className="rounded-xl border bg-card p-2"
            >
              <div className="relative overflow-hidden rounded-lg bg-muted">
                {item.file || item.url ? (
                  <ProductPhotoPreview item={item} />
                ) : (
                  <span className="flex aspect-square items-center justify-center text-xs text-muted-foreground">
                    No preview
                  </span>
                )}
                {item.ref === primaryRef && (
                  <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold text-gold-foreground">
                    <Star className="h-3 w-3 fill-current" /> Cover
                  </span>
                )}
                <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {index + 1}
                </span>
              </div>
              <p className="mt-1.5 truncate text-xs text-muted-foreground" title={item.name}>
                {item.name}
              </p>
              <div className="mt-1 flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Move photo earlier"
                  disabled={disabled || index === 0}
                  onClick={() => move(item.ref, -1)}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Move photo later"
                  disabled={disabled || index === items.length - 1}
                  onClick={() => move(item.ref, 1)}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Set as cover photo"
                  disabled={disabled || item.ref === primaryRef}
                  onClick={() => onChange({ primaryRef: item.ref })}
                >
                  <Star className={item.ref === primaryRef ? "h-3.5 w-3.5 fill-current" : "h-3.5 w-3.5"} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  aria-label={`Remove ${item.name}`}
                  disabled={disabled}
                  onClick={() => removeItem(item)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && items.length < PHOTOS_PER_PRODUCT_TARGET && (
        <p className="text-xs text-gold-foreground">
          {PHOTOS_PER_PRODUCT_TARGET - items.length} more photo{PHOTOS_PER_PRODUCT_TARGET - items.length === 1 ? "" : "s"} to reach the {PHOTOS_PER_PRODUCT_TARGET}-photo catalog standard.
        </p>
      )}

      {progress && progress.total > 0 ? (
        <div className="space-y-1.5">
          <p role="status" className="text-xs text-muted-foreground">
            {progress.completed >= progress.total
              ? "Photos uploaded."
              : `Uploading ${progress.current} (${progress.completed}/${progress.total})...`}
          </p>
          <Progress
            value={Math.round((progress.completed / progress.total) * 100)}
            aria-label="Photo upload progress"
          />
        </div>
      ) : null}
    </div>
  );
}

function ProductPhotoPreview({ item }: { item: PhotoItem }) {
  const [src, setSrc] = useState<string | null>(item.url);

  // A tile owns the object URL of its pending file and releases it when the
  // photo is removed or the dialog closes.
  useEffect(() => {
    if (!item.file) {
      setSrc(item.url);
      return;
    }
    const url = URL.createObjectURL(item.file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [item.file, item.url]);

  if (!src) return null;
  return (
    <img
      src={src}
      alt={item.name}
      loading="lazy"
      className="aspect-square w-full object-contain"
    />
  );
}
