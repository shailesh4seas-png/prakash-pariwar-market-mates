import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import appliances from "@/assets/tpl-appliances.jpg";
import diwali from "@/assets/tpl-diwali.jpg";
import kitchen from "@/assets/tpl-kitchen.jpg";
import monsoon from "@/assets/tpl-monsoon.jpg";
import navratri from "@/assets/tpl-navratri.jpg";
import { TEMPLATES as SAMPLE_TEMPLATES, type Category, type Template } from "@/lib/data";
import { library, useLibrary } from "@/lib/library";
import { useSession } from "@/lib/session";
import {
  getTemplateImageUrl,
  getTemplateStats,
  listRecentDownloads,
  listSavedTemplateIds,
  listTemplates,
  recordTemplateDownload,
  setTemplateSaved,
  type DbTemplate,
} from "@/lib/templates";

const FALLBACK_IMAGE: Record<Category, string> = {
  Festival: diwali,
  Products: appliances,
  Offers: appliances,
  "New Arrivals": appliances,
  Seasonal: monsoon,
  "Social Media": navratri,
  Business: kitchen,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isDbTemplateId = (id: string) => UUID.test(id);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function formatAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days} d ago` : formatDate(iso);
}

/** Returns the templates for the ids, in order, skipping any that are no longer available. */
export function pickTemplates(ids: string[], templates: Template[]): Template[] {
  const byId = new Map(templates.map((t) => [t.id, t]));
  return ids.flatMap((id) => {
    const t = byId.get(id);
    return t ? [t] : [];
  });
}

async function toUiTemplate(row: DbTemplate, uses: number): Promise<Template> {
  let image = FALLBACK_IMAGE[row.category];
  if (row.imagePath) {
    try {
      image = await getTemplateImageUrl(row.imagePath);
    } catch {
      // Keep the category artwork when the signed URL cannot be created.
    }
  }
  return {
    id: row.id,
    title: row.title,
    headline: row.headline,
    sub: row.sub,
    category: row.category,
    image,
    brand: row.brand || "Your manufacturer",
    status: row.status,
    uses,
    updated: formatDate(row.updatedAt),
  };
}

/** The signed-in manufacturer's own templates (all statuses) with download counts. */
export function useManufacturerTemplates() {
  const { authUser } = useSession();
  const userId = authUser?.id;
  const query = useQuery({
    queryKey: ["templates", "manufacturer", userId],
    enabled: Boolean(userId),
    staleTime: 15_000,
    queryFn: async () => {
      const rows = (await listTemplates()).filter((r) => r.manufacturerUserId === userId);
      const stats = await getTemplateStats();
      const downloads = new Map(stats.map((s) => [s.templateId, s.downloads]));
      const templates = await Promise.all(
        rows.map((r) => toUiTemplate(r, downloads.get(r.id) ?? 0)),
      );
      return { rows, templates };
    },
  });
  return {
    rows: query.data?.rows ?? [],
    templates: query.data?.templates ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : "",
    refetch: query.refetch,
  };
}

/**
 * Published templates from the retailer's associated manufacturers.
 * While none exist, the bundled sample templates are shown instead (isSample = true).
 */
export function useRetailerTemplates() {
  const { authUser } = useSession();
  const userId = authUser?.id;
  const query = useQuery({
    queryKey: ["templates", "retailer", userId],
    enabled: Boolean(userId),
    staleTime: 15_000,
    queryFn: async () => {
      const rows = (await listTemplates()).filter((r) => r.status === "published");
      return Promise.all(rows.map((r) => toUiTemplate(r, 0)));
    },
  });
  const real = query.data ?? [];
  const isSample = !query.isLoading && real.length === 0;
  return {
    templates: isSample ? SAMPLE_TEMPLATES.filter((t) => t.status === "published") : real,
    isSample,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : "",
  };
}

/** Saved templates and download history. Sample mode keeps the local-only prototype behaviour. */
export function useRetailerLibrary(isSample: boolean) {
  const { authUser } = useSession();
  const userId = authUser?.id;
  const queryClient = useQueryClient();
  const local = useLibrary();

  const savedQuery = useQuery({
    queryKey: ["template-saves", userId],
    enabled: Boolean(userId) && !isSample,
    queryFn: listSavedTemplateIds,
  });
  const downloadsQuery = useQuery({
    queryKey: ["template-downloads", userId],
    enabled: Boolean(userId) && !isSample,
    queryFn: async () => {
      const seen = new Set<string>();
      return (await listRecentDownloads()).flatMap((d) => {
        if (seen.has(d.templateId)) return [];
        seen.add(d.templateId);
        return [{ id: d.templateId, at: formatAgo(d.at) }];
      });
    },
  });

  const saved = useMemo(
    () => (isSample ? local.saved : (savedQuery.data ?? [])),
    [isSample, local.saved, savedQuery.data],
  );
  const downloads = useMemo(
    () => (isSample ? local.downloads : (downloadsQuery.data ?? [])),
    [isSample, local.downloads, downloadsQuery.data],
  );

  const saveMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: boolean }) => {
      if (!userId) throw new Error("Sign in to save templates.");
      return setTemplateSaved(userId, id, next);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["template-saves", userId] }),
  });
  const downloadMutation = useMutation({
    mutationFn: (id: string) => recordTemplateDownload(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["template-downloads", userId] }),
  });

  return {
    saved,
    downloads,
    toggleSave: (t: Template) => {
      if (isSample || !isDbTemplateId(t.id)) {
        library.toggleSave(t.id);
        return;
      }
      const next = !saved.includes(t.id);
      queryClient.setQueryData<string[]>(["template-saves", userId], (current) =>
        next ? [t.id, ...(current ?? [])] : (current ?? []).filter((id) => id !== t.id),
      );
      saveMutation.mutate({ id: t.id, next });
    },
    addDownload: (t: Template) => {
      if (isSample || !isDbTemplateId(t.id)) {
        library.addDownload(t.id);
        return;
      }
      downloadMutation.mutate(t.id);
    },
  };
}
