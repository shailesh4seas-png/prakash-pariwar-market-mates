/**
 * Read-only product detail with a photo gallery, shared by both dashboards.
 *
 * The retailer uses it exactly as-is; the manufacturer gets optional Edit /
 * Delete actions injected by the catalog page, so nothing here can write.
 */
import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPriceINR, type ProductPhoto } from "@/lib/productCatalog";
import { useProductDetail } from "@/lib/productQueries";
import { cn } from "@/lib/utils";

export function ProductDetailDialog({
  productId,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (productId: string) => void;
  onDelete?: (productId: string) => void;
}) {
  const detail = useProductDetail(productId, open && Boolean(productId));
  const [activeIndex, setActiveIndex] = useState(0);
  const product = detail.data;
  const photos: ProductPhoto[] = product?.photos ?? [];

  useEffect(() => {
    setActiveIndex(0);
  }, [productId]);

  const shift = (delta: number) =>
    setActiveIndex((current) => (current + delta + photos.length) % photos.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product?.name ?? "Product details"}</DialogTitle>
          <DialogDescription>
            {product
              ? `${product.code} · ${product.manufacturerName ?? "Manufacturer"}`
              : "Loading the saved product record."}
          </DialogDescription>
        </DialogHeader>

        {detail.isPending ? (
          <div role="status" className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Loading product...
          </div>
        ) : detail.error ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            <p>{detail.error.message}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void detail.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : product ? (
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              {photos.length ? (
                <>
                  <div className="relative overflow-hidden rounded-xl border bg-muted">
                    {photos[activeIndex]?.url ? (
                      <img
                        src={photos[activeIndex]?.url ?? undefined}
                        alt={`${product.name} photo ${activeIndex + 1}`}
                        className="aspect-square w-full object-contain"
                      />
                    ) : (
                      <span className="flex aspect-square w-full items-center justify-center text-sm text-muted-foreground">
                        This photo could not be loaded.
                      </span>
                    )}
                    {photos.length > 1 && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Previous photo"
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-card/80"
                          onClick={() => shift(-1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Next photo"
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-card/80"
                          onClick={() => shift(1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                  <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {photos.map((photo, index) => (
                      <li key={photo.id}>
                        <button
                          type="button"
                          onClick={() => setActiveIndex(index)}
                          aria-label={`View photo ${index + 1}`}
                          aria-current={index === activeIndex}
                          className={cn(
                            "overflow-hidden rounded-lg border bg-muted transition",
                            index === activeIndex ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/60",
                          )}
                        >
                          {photo.url ? (
                            <img
                              src={photo.url}
                              alt=""
                              loading="lazy"
                              className="h-14 w-14 object-cover"
                            />
                          ) : (
                            <span className="flex h-14 w-14 items-center justify-center text-[10px] text-muted-foreground">
                              —
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Photo {activeIndex + 1} of {photos.length}
                    {photos[0]?.isPrimary ? " · first image is the cover" : ""}
                  </p>
                </>
              ) : (
                <p className="rounded-xl border border-dashed border-input p-6 text-center text-sm text-muted-foreground">
                  No photos saved for this product yet.
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-2xl font-bold">{formatPriceINR(product.price)}</p>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    product.inStock ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
                  )}
                >
                  {product.inStock ? "In stock" : "Out of stock"}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <DetailTerm term="Product code">{product.code}</DetailTerm>
                <DetailTerm term="Category">{product.categoryName ?? "—"}</DetailTerm>
                {product.sku && <DetailTerm term="SKU">{product.sku}</DetailTerm>}
                {product.modelNumber && <DetailTerm term="Model number">{product.modelNumber}</DetailTerm>}
                {product.warranty && <DetailTerm term="Warranty">{product.warranty}</DetailTerm>}
                <DetailTerm term="Updated">{new Date(product.updatedAt).toLocaleDateString()}</DetailTerm>
              </dl>
              {product.description && (
                <div>
                  <h3 className="text-sm font-semibold">Description</h3>
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                    {product.description}
                  </p>
                </div>
              )}
              {product.specifications.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold">Specifications</h3>
                  <table className="mt-1 w-full text-sm">
                    <tbody>
                      {product.specifications.map((spec) => (
                        <tr key={spec.label} className="border-b last:border-0">
                          <th scope="row" className="w-1/3 py-2 text-left font-medium text-muted-foreground">
                            {spec.label}
                          </th>
                          <td className="py-2">{spec.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {(onEdit || onDelete) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {onEdit && (
                    <Button variant="outline" size="sm" onClick={() => onEdit(product.id)}>
                      <Pencil className="h-4 w-4" /> Edit product
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => onDelete(product.id)}
                    >
                      <Trash2 className="h-4 w-4" /> Delete product
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DetailTerm({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{term}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}
