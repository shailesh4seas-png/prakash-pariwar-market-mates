import { createFileRoute } from "@tanstack/react-router";
import { LayoutGrid, LoaderCircle, PackagePlus, Pencil, Search, Table2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { ProductCatalogViews, type ProductViewMode } from "@/components/ProductCatalogViews";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import { ProductFormDialog } from "@/components/ProductFormDialog";
import { Panel } from "@/components/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/lib/session";
import type { ProductSummary } from "@/lib/productCatalog";
import {
  useDeleteProduct,
  useProductCategories,
  useProductRealtimeSync,
  useProducts,
} from "@/lib/productQueries";

const ALL_CATEGORIES = "all";

export const Route = createFileRoute("/manufacturer/catalog")({
  head: () => ({
    meta: [
      { title: "Product Catalog · Prakash Pariwar" },
      {
        name: "description",
        content: "Add, manage and publish your product catalog for your retailer network.",
      },
      { property: "og:title", content: "Product Catalog · Prakash Pariwar" },
      {
        property: "og:description",
        content: "Add, manage and publish your product catalog for your retailer network.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

function Page() {
  const { user, authUser } = useSession();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [mode, setMode] = useState<ProductViewMode>("grid");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProductSummary | null>(null);

  // Query keys are search-driven, so debounce the input instead of firing a
  // database round-trip on every keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const products = useProducts({ search, categoryId });
  const categories = useProductCategories();
  const deleteProduct = useDeleteProduct();
  useProductRealtimeSync();

  const categoryList = useMemo(() => categories.data ?? [], [categories.data]);

  const openAdd = () => {
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (productId: string) => {
    setDetailId(null);
    setEditingId(productId);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteProduct.mutateAsync(pendingDelete.id);
      if (detailId === pendingDelete.id) setDetailId(null);
      toast.success(`${pendingDelete.name} and its photos were deleted.`);
      setPendingDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "This product could not be deleted.");
    }
  };

  const isFiltering = Boolean(search) || categoryId !== null;

  return (
    <>
      <PageHeader
        title="Product Catalog"
        desc={
          products.data
            ? `${products.data.length} product${products.data.length === 1 ? "" : "s"}${isFiltering ? " matching your filters" : ""} · visible to your retailer network`
            : "Every product you save is available to your associated retailers."
        }
        action={
          <Button className="w-fit bg-gradient-primary shadow-glow" onClick={openAdd}>
            <PackagePlus className="h-4 w-4" /> Add product
          </Button>
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
            <LoaderCircle className="h-4 w-4 animate-spin" /> Loading your product catalog...
          </div>
        ) : products.data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {isFiltering
              ? "No products match this search or category."
              : "No products yet. Add your first product to share it with retailers."}
          </p>
        ) : (
          <ProductCatalogViews
            mode={mode}
            products={products.data}
            onSelect={(product) => setDetailId(product.id)}
            actions={(product) => (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${product.name}`}
                  onClick={() => openEdit(product.id)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${product.name}`}
                  className="text-destructive"
                  onClick={() => setPendingDelete(product)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          />
        )}
      </Panel>

      <ProductFormDialog
        open={formOpen}
        productId={editingId}
        userId={authUser?.id ?? null}
        categories={categoryList}
        categoriesLoading={categories.isPending}
        onOpenChange={(next) => {
          setFormOpen(next);
          if (!next) setEditingId(null);
        }}
      />

      <ProductDetailDialog
        productId={detailId}
        open={detailId !== null}
        onOpenChange={(next) => {
          if (!next) setDetailId(null);
        }}
        onEdit={openEdit}
        onDelete={(productId) => {
          const product = products.data?.find((item) => item.id === productId) ?? null;
          if (product) setPendingDelete(product);
        }}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => {
          if (!next && !deleteProduct.isPending) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block font-semibold">
                {pendingDelete?.name} · {pendingDelete?.code}
              </span>
              All {pendingDelete?.imagePaths.length || 0} photo(s) are removed from your storage and
              the product disappears from your retailers' catalog. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProduct.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteProduct.isPending}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deleteProduct.isPending ? "Deleting..." : "Delete product"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
