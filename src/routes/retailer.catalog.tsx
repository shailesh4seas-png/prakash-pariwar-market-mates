import { createFileRoute } from "@tanstack/react-router";
import { LayoutGrid, LoaderCircle, Lock, Search, Table2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { ProductCatalogViews, type ProductViewMode } from "@/components/ProductCatalogViews";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import { Panel } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProductCategories, useProductRealtimeSync, useProducts } from "@/lib/productQueries";

const ALL_CATEGORIES = "all";

export const Route = createFileRoute("/retailer/catalog")({
  head: () => ({
    meta: [
      { title: "Product Catalog · Prakash Pariwar" },
      {
        name: "description",
        content: "Browse the live product catalog published by your associated manufacturers.",
      },
      { property: "og:title", content: "Product Catalog · Prakash Pariwar" },
      {
        property: "og:description",
        content: "Browse the live product catalog published by your associated manufacturers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

function Page() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [mode, setMode] = useState<ProductViewMode>("grid");
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const products = useProducts({ search, categoryId });
  const categories = useProductCategories();
  useProductRealtimeSync();

  const categoryList = useMemo(() => categories.data ?? [], [categories.data]);
  const isFiltering = Boolean(search) || categoryId !== null;

  return (
    <>
      <PageHeader
        title="Product Catalog"
        desc={
          products.data
            ? `${products.data.length} product${products.data.length === 1 ? "" : "s"}${isFiltering ? " matching your filters" : ""} published by your manufacturers`
            : "Live products published by the manufacturers you are linked with."
        }
      />

      <Panel className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search products by name, code, SKU or model number"
              placeholder="Search by product name, code, SKU or model number..."
              className="pl-9"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
          <Select
            value={categoryId ?? ALL_CATEGORIES}
            onValueChange={(next) => setCategoryId(next === ALL_CATEGORIES ? null : next)}
          >
            <SelectTrigger className="w-full sm:w-56" aria-label="Filter by category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
              {categoryList.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name} ({category.productCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <Button
              variant={mode === "grid" ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={mode === "grid"}
              onClick={() => setMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" /> Cards
            </Button>
            <Button
              variant={mode === "table" ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={mode === "table"}
              onClick={() => setMode("table")}
            >
              <Table2 className="h-4 w-4" /> Table
            </Button>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" /> This catalog is read-only. Manufacturers add and edit
          products; your changes are never saved to their catalog.
        </p>
      </Panel>

      <Panel>
        {products.isError ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            <p>{products.error.message}</p>
            <Button variant="outline" size="sm" onClick={() => void products.refetch()}>
              Retry
            </Button>
          </div>
        ) : products.isPending ? (
          <div role="status" className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Loading the product catalog...
          </div>
        ) : products.data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {isFiltering
              ? "No products match this search or category."
              : "No products published yet. Products appear here as soon as your manufacturers add them."}
          </p>
        ) : (
          <ProductCatalogViews
            mode={mode}
            products={products.data}
            onSelect={(product) => setDetailId(product.id)}
          />
        )}
      </Panel>

      <ProductDetailDialog
        productId={detailId}
        open={detailId !== null}
        onOpenChange={(next) => {
          if (!next) setDetailId(null);
        }}
      />
    </>
  );
}
