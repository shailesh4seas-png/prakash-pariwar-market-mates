/**
 * TanStack Query hooks for the Product Catalog.
 *
 * Query keys live here so every write invalidates exactly the right cache: a
 * manufacturer's add / edit / delete is refetched immediately, and the retailer
 * catalog is refreshed by the same invalidation plus a realtime subscription on
 * the product tables (realtime is a bonus — the catalog still syncs on mount or
 * window focus if the channel cannot be established).
 */
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import * as api from "@/lib/productCatalog";

export const productKeys = {
  all: ["products"] as const,
  list: (search: string, categoryId: string | null) =>
    ["products", "list", search.trim().toLowerCase(), categoryId ?? "all"] as const,
  detail: (productId: string) => ["products", "detail", productId] as const,
  categories: ["products", "categories"] as const,
};

export function useProducts(args: { search: string; categoryId: string | null }) {
  return useQuery({
    queryKey: productKeys.list(args.search, args.categoryId),
    queryFn: () => api.listProducts({ search: args.search, categoryId: args.categoryId }),
    placeholderData: (previous) => previous,
  });
}

export function useProductCategories(enabled = true) {
  return useQuery({
    queryKey: productKeys.categories,
    queryFn: api.listProductCategories,
    enabled,
  });
}

export function useProductDetail(productId: string | null, enabled = true) {
  return useQuery({
    queryKey: productKeys.detail(productId ?? ""),
    queryFn: () => api.getProductDetail(productId as string),
    enabled: Boolean(productId) && enabled,
  });
}

function invalidateCatalog(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: productKeys.all });
}

export function useSaveProduct(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      values,
      onProgress,
    }: {
      values: api.ProductFormValues;
      onProgress: (state: api.PhotoUploadState) => void;
    }) => {
      if (!userId) throw new Error("Sign in as a manufacturer before saving a product.");
      return api.saveProduct(values, userId, onProgress);
    },
    onSuccess: () => invalidateCatalog(qc),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => api.deleteProduct(productId),
    onSuccess: () => invalidateCatalog(qc),
  });
}

/**
 * Keeps any open catalog view in sync with database changes made by this
 * session or by another (e.g. the manufacturer editing while a retailer watches).
 */
export function useProductRealtimeSync(enabled = true) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled || !supabase) return;
    const channel = supabase
      .channel("product-catalog-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        void invalidateCatalog(qc);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "product_images" }, () => {
        void invalidateCatalog(qc);
      })
      .subscribe();
    return () => {
      void supabase?.removeChannel(channel).catch(() => undefined);
    };
  }, [enabled, qc]);
}
