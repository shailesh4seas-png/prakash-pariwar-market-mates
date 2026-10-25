/**
 * TanStack Query hooks for the template system.
 *
 * Centralises query keys and invalidation so a send / publish / save made by a
 * manufacturer is reflected immediately in the retailer feed and the saved list
 * without a manual refresh (query invalidation is the "realtime" for this data).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/designerTemplates";
import type { UserProfile } from "@/lib/session";
import type { BrandProfile } from "@/lib/templateEngine";
import type { CanvasKind, TemplateSpec } from "@/lib/templateEngine";

export const templateKeys = {
  all: ["templates"] as const,
  received: ["templates", "received"] as const,
  manufacturer: ["templates", "manufacturer"] as const,
  recipients: (id: string) => ["templates", "recipients", id] as const,
  sendTargets: ["templates", "sendTargets"] as const,
  saved: ["templates", "saved"] as const,
  downloads: ["templates", "downloads"] as const,
};

export function useReceivedTemplates() {
  return useQuery({ queryKey: templateKeys.received, queryFn: api.listReceivedTemplates });
}

export function useManufacturerTemplates() {
  return useQuery({ queryKey: templateKeys.manufacturer, queryFn: api.listManufacturerTemplates });
}

export function useSendTargets(enabled = true) {
  return useQuery({
    queryKey: templateKeys.sendTargets,
    queryFn: api.getSendTargets,
    enabled,
  });
}

export function useTemplateRecipients(templateId: string | null) {
  return useQuery({
    queryKey: templateKeys.recipients(templateId ?? ""),
    queryFn: () => api.getTemplateRecipients(templateId as string),
    enabled: Boolean(templateId),
  });
}

export function useSavedTemplateIds() {
  return useQuery({ queryKey: templateKeys.saved, queryFn: api.listSavedIds });
}

export function useRecentDownloads() {
  return useQuery({ queryKey: templateKeys.downloads, queryFn: () => api.listRecentDownloads() });
}

/** Refreshes both the retailer feed and the manufacturer saved list. */
export function useInvalidateTemplates() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: templateKeys.all });
}

export function useSaveDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draft: api.TemplateDraft) => api.saveDesignerTemplate(draft),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.all }),
  });
}

export function useCreateAndSend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ draft, retailerIds }: { draft: api.TemplateDraft; retailerIds: string[] }) =>
      api.createAndSend(draft, retailerIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.all }),
  });
}

export function useCreateAndPublish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draft: api.TemplateDraft) => api.createAndPublish(draft),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.all }),
  });
}

export function useSendExisting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, retailerIds }: { templateId: string; retailerIds: string[] }) =>
      api.sendDesignerTemplate(templateId, retailerIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.all }),
  });
}

export function usePublishToggle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, publish }: { templateId: string; publish: boolean }) =>
      api.publishDesignerTemplate(templateId, publish),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.all }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) => api.deleteDesignerTemplate(templateId),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.all }),
  });
}

export function useMarkSeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) => api.markSeen(templateId),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.received }),
  });
}

export function useRecordDownload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, canvasKind }: { templateId: string; canvasKind: CanvasKind }) =>
      api.recordDownload(templateId, canvasKind),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.downloads }),
  });
}

export function useToggleSaved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, saved }: { templateId: string; saved: boolean }) =>
      api.toggleSaved(templateId, saved),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: templateKeys.all }),
  });
}

export function buildDraft(args: {
  templateId: string | null;
  spec: TemplateSpec;
  title: string;
}): api.TemplateDraft {
  const { spec } = args;
  return {
    templateId: args.templateId,
    categoryKey: spec.categoryKey,
    canvasKind: spec.canvas.kind,
    title: args.title,
    layoutId: spec.layoutId,
    paletteId: spec.palette.id,
    variant: spec.variant,
    headline: spec.blocks.find((b) => b.role === "headline")?.defaultText ?? "",
    subheadline: spec.blocks.find((b) => b.role === "subheadline")?.defaultText ?? "",
    offerText: spec.blocks.find((b) => b.role === "offer")?.defaultText ?? "",
    ctaText: spec.blocks.find((b) => b.role === "cta")?.defaultText ?? "",
    spec,
  };
}

/** Maps a Supabase profile row (with its signed logo URL) to the engine brand shape. */
export function brandFromProfile(profile: UserProfile | null): BrandProfile {
  if (!profile) return { businessName: "" };
  const email = profile.business_email || profile.email;
  return {
    businessName: profile.business_name ?? "",
    ...(profile.businessLogoUrl ? { logoUrl: profile.businessLogoUrl } : {}),
    ...(profile.contact_number ? { phone: profile.contact_number } : {}),
    ...(email ? { email } : {}),
    ...(profile.address ? { address: profile.address } : {}),
  };
}
