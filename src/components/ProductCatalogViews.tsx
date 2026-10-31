/**
 * Presentational catalog views shared by both dashboards.
 *
 * Manufacturers pass an `actions` renderer (edit / delete); retailers render the
 * same cards and table without it, which is why the read-only rule is visible in
 * the UI as well as enforced by RLS.
 */
import { type ReactNode } from "react";
import { ImageOff } from "lucide-react";
import { formatPriceINR, type ProductSummary } from "@/lib/productCatalog";
import { cn } from "@/lib/utils";

export type ProductViewMode = "grid" | "table";

export function ProductCatalogViews({
  mode,
  products,
  onSelect,
  actions,
}: {
  mode: ProductViewMode;
  products: ProductSummary[];
  onSelect: (product: ProductSummary) => void;
  actions?: ((product: ProductSummary) => ReactNode) | undefined;
}) {
  if (mode === "table") return <ProductTable products={products} onSelect={onSelect} actions={actions} />;
  return <ProductGrid products={products} onSelect={onSelect} actions={actions} />;
}

function Cover({ product, className }: { product: ProductSummary; className?: string }) {
  const url = product.photoUrls.find(Boolean);
  if (!url)
    return (
      <span
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className,
        )}
      >
        <ImageOff className="h-5 w-5" />
      </span>
    );
  return <img src={url} alt={product.name} loading="lazy" className={cn("bg-muted object-cover", className)} />;
}

function Availability({ inStock }: { inStock: boolean }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        inStock ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
      )}
    >
      {inStock ? "In stock" : "Out of stock"}
    </span>
  );
}

function ProductGrid({
  products,
  onSelect,
  actions,
}: {
  products: ProductSummary[];
  onSelect: (product: ProductSummary) => void;
  actions?: ((product: ProductSummary) => ReactNode) | undefined;
}) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <li key={product.id} className="overflow-hidden rounded-2xl bg-card shadow-card">
          <button
            type="button"
            onClick={() => onSelect(product)}
            className="block w-full text-left"
            aria-label={`View ${product.name}`}
          >
            <Cover product={product} className="aspect-[4/3] w-full" />
            <div className="space-y-1.5 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 font-semibold leading-snug">{product.name}</p>
                <Availability inStock={product.inStock} />
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {product.code}
                {product.imagePaths.length ? ` · ${product.imagePaths.length} photos` : ""}
              </p>
              <div className="flex items-end justify-between gap-2 pt-1">
                <div className="min-w-0">
                  <p className="text-lg font-bold">{formatPriceINR(product.price)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {product.categoryName ?? "Uncategorised"}
                    {product.manufacturerName ? ` · ${product.manufacturerName}` : ""}
                  </p>
                </div>
              </div>
            </div>
          </button>
          {actions && (
            <div className="flex items-center justify-end gap-1 border-t px-3 py-2">
              {actions(product)}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function ProductTable({
  products,
  onSelect,
  actions,
}: {
  products: ProductSummary[];
  onSelect: (product: ProductSummary) => void;
  actions?: ((product: ProductSummary) => ReactNode) | undefined;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-muted-foreground">
            <th className="py-3">Product</th>
            <th>Code / SKU</th>
            <th>Category</th>
            <th>Price</th>
            <th>Availability</th>
            {actions && <th className="text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b last:border-0">
              <td className="py-3">
                <button
                  type="button"
                  onClick={() => onSelect(product)}
                  className="flex items-center gap-3 text-left"
                >
                  <Cover product={product} className="h-11 w-11 shrink-0 rounded-lg" />
                  <span>
                    <span className="block font-semibold">{product.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {product.imagePaths.length} photos
                      {product.modelNumber ? ` · model ${product.modelNumber}` : ""}
                    </span>
                  </span>
                </button>
              </td>
              <td className="text-muted-foreground">
                <span className="block">{product.code}</span>
                {product.sku && <span className="block text-xs">SKU {product.sku}</span>}
              </td>
              <td className="text-muted-foreground">{product.categoryName ?? "—"}</td>
              <td className="font-semibold">{formatPriceINR(product.price)}</td>
              <td>
                <Availability inStock={product.inStock} />
              </td>
              {actions && (
                <td>
                  <div className="flex justify-end gap-1">{actions(product)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
