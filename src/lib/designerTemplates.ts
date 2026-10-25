/**
 * Data layer for the rebuilt template system.
 *
 * Thin, typed wrapper over the atomic SECURITY DEFINER RPCs defined in
 * supabase/migrations/202610250001_rebuilt_template_system.sql. Everything that
 * mutates more than one table (save-then-send, save-then-publish, bulk send)
 * runs in a single RPC so it is all-or-nothing on the server. Reads of private
 * logos go through short-lived signed URLs from the `profile-assets` bucket.
 */
import { supabase } from "@/lib/supabase";
import type { CanvasKind, TemplateSpec } from "@/lib/templateEngine";

export interface BrandProfileView {
  businessName: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
}

/** A template a retailer can currently see (shared to them or published). */
export interface ReceivedTemplate {
  templateId: string;
  manufacturerUserId: string;
  manufacturer: BrandProfileView;
  categoryKey: string;
  canvasKind: CanvasKind;
  spec: TemplateSpec;
  headline: string;
  subheadline: string;
  offerText: string;
  ctaText: string;
  sentAt: string | null;
  seenAt: string | null;
  isPublished: boolean;
  isSaved: boolean;
}

/** A template owned by the signed-in manufacturer, with usage stats. */
export interface ManufacturerTemplate {
  id: string;
  categoryKey: string;
  title: string;
  canvasKind: CanvasKind;
  spec: TemplateSpec;
  headline: string;
  subheadline: string;
  offerText: string;
  ctaText: string;
  published: boolean;
  sentCount: number;
  downloads: number;
  saves: number;
  updatedAt: string;
}

export interface TemplateRecipient {
  retailerUserId: string;
  businessName: string;
  city: string | null;
  logoPath: string | null;
  sentAt: string;
  seenAt: string | null;
}

export interface SendTarget {
  retailerUserId: string;
  businessName: string;
  city: string | null;
}

export interface DownloadEntry {
  id: string;
  templateId: string;
  canvasKind: CanvasKind;
  at: string;
}

/** Editable draft used by the manufacturer action bar before it hits an RPC. */
export interface TemplateDraft {
  templateId: string | null;
  categoryKey: string;
  canvasKind: CanvasKind;
  title: string;
  layoutId: string;
  paletteId: string;
  variant: number;
  headline: string;
  subheadline: string;
  offerText: string;
  ctaText: string;
  spec: TemplateSpec;
}

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function rpcArgs(draft: TemplateDraft) {
  return {
    p_template_id: draft.templateId,
    p_category_key: draft.categoryKey,
    p_canvas_kind: draft.canvasKind,
    p_title: draft.title,
    p_layout_id: draft.layoutId,
    p_palette_id: draft.paletteId,
    p_variant: draft.variant,
    p_headline: draft.headline,
    p_subheadline: draft.subheadline,
    p_offer_text: draft.offerText,
    p_cta_text: draft.ctaText,
    p_spec: draft.spec,
  };
}

/** Signs one private profile-assets path; returns undefined on failure so a
 *  missing logo never blocks rendering the rest of a template. */
async function signLogo(path: string | null | undefined): Promise<string | undefined> {
  if (!path) return undefined;
  try {
    const { data, error } = await client().storage.from("profile-assets").createSignedUrl(path, 3600);
    return error ? undefined : data.signedUrl;
  } catch {
    return undefined;
  }
}

type ReceivedRow = {
  template_id: string;
  manufacturer_user_id: string;
  mfr_business_name: string | null;
  mfr_logo_path: string | null;
  mfr_phone: string | null;
  mfr_email: string | null;
  category_key: string;
  canvas_kind: CanvasKind;
  spec: TemplateSpec;
  headline: string;
  subheadline: string;
  offer_text: string;
  cta_text: string;
  sent_at: string | null;
  seen_at: string | null;
  is_published: boolean;
  is_saved: boolean;
};

/** Retailer feed: shared or published templates of active manufacturers. */
export async function listReceivedTemplates(): Promise<ReceivedTemplate[]> {
  const { data, error } = await client().rpc("list_received_templates");
  if (error) throw error;
  const rows = (data ?? []) as ReceivedRow[];
  const logoUrls = await Promise.all(rows.map((r) => signLogo(r.mfr_logo_path)));
  return rows.map((r, i) => ({
    templateId: r.template_id,
    manufacturerUserId: r.manufacturer_user_id,
    manufacturer: {
      businessName: r.mfr_business_name ?? "Manufacturer",
      ...(r.mfr_phone ? { phone: r.mfr_phone } : {}),
      ...(r.mfr_email ? { email: r.mfr_email } : {}),
      ...(logoUrls[i] ? { logoUrl: logoUrls[i] } : {}),
    },
    categoryKey: r.category_key,
    canvasKind: r.canvas_kind,
    spec: r.spec,
    headline: r.headline,
    subheadline: r.subheadline,
    offerText: r.offer_text,
    ctaText: r.cta_text,
    sentAt: r.sent_at,
    seenAt: r.seen_at,
    isPublished: r.is_published,
    isSaved: r.is_saved,
  }));
}

type ManufacturerRow = {
  id: string;
  category_key: string;
  title: string;
  canvas_kind: CanvasKind;
  spec: TemplateSpec;
  headline: string;
  subheadline: string;
  offer_text: string;
  cta_text: string;
  published: boolean;
  sent_count: number | string;
  downloads: number | string;
  saves: number | string;
  updated_at: string;
};

/** Manufacturer "Saved Templates" list with send count + publication + stats. */
export async function listManufacturerTemplates(): Promise<ManufacturerTemplate[]> {
  const { data, error } = await client().rpc("list_manufacturer_templates");
  if (error) throw error;
  return ((data ?? []) as ManufacturerRow[]).map((r) => ({
    id: r.id,
    categoryKey: r.category_key,
    title: r.title,
    canvasKind: r.canvas_kind,
    spec: r.spec,
    headline: r.headline,
    subheadline: r.subheadline,
    offerText: r.offer_text,
    ctaText: r.cta_text,
    published: r.published,
    sentCount: Number(r.sent_count),
    downloads: Number(r.downloads),
    saves: Number(r.saves),
    updatedAt: r.updated_at,
  }));
}

type RecipientRow = {
  retailer_user_id: string;
  business_name: string | null;
  city: string | null;
  logo_path: string | null;
  sent_at: string;
  seen_at: string | null;
};

export async function getTemplateRecipients(templateId: string): Promise<TemplateRecipient[]> {
  const { data, error } = await client().rpc("get_template_recipients", { p_template_id: templateId });
  if (error) throw error;
  return ((data ?? []) as RecipientRow[]).map((r) => ({
    retailerUserId: r.retailer_user_id,
    businessName: r.business_name ?? "Retailer",
    city: r.city,
    logoPath: r.logo_path,
    sentAt: r.sent_at,
    seenAt: r.seen_at,
  }));
}

type NetworkRow = {
  retailer_user_id: string | null;
  business_name: string | null;
  city: string | null;
  record_type: string;
  status: string;
};

/** Active retailer members of the signed-in manufacturer's network (send dialog). */
export async function getSendTargets(): Promise<SendTarget[]> {
  const { data, error } = await client().rpc("get_retailer_network");
  if (error) throw error;
  return ((data ?? []) as NetworkRow[])
    .filter((r) => r.record_type === "retailer" && r.status === "active" && r.retailer_user_id)
    .map((r) => ({
      retailerUserId: r.retailer_user_id as string,
      businessName: r.business_name ?? "Retailer",
      city: r.city,
    }));
}

/** (a) Save only. Always runs before Send / Publish so a template is persisted. */
export async function saveDesignerTemplate(draft: TemplateDraft): Promise<string> {
  const { data, error } = await client().rpc("save_designer_template", rpcArgs(draft));
  if (error) throw error;
  return data as string;
}

export async function sendDesignerTemplate(templateId: string, retailerIds: string[]): Promise<number> {
  const { data, error } = await client().rpc("send_designer_template", {
    p_template_id: templateId,
    p_retailer_ids: retailerIds,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function publishDesignerTemplate(templateId: string, publish: boolean): Promise<void> {
  const { error } = await client().rpc("publish_designer_template", {
    p_template_id: templateId,
    p_publish: publish,
  });
  if (error) throw error;
}

/** (b) Save THEN send, atomically. */
export async function createAndSend(draft: TemplateDraft, retailerIds: string[]): Promise<string> {
  const { data, error } = await client().rpc("create_and_send_designer_template", {
    ...rpcArgs(draft),
    p_retailer_ids: retailerIds,
  });
  if (error) throw error;
  return data as string;
}

/** (c) Save THEN publish, atomically. */
export async function createAndPublish(draft: TemplateDraft): Promise<string> {
  const { data, error } = await client().rpc("create_and_publish_designer_template", rpcArgs(draft));
  if (error) throw error;
  return data as string;
}

export async function markSeen(templateId: string): Promise<void> {
  const { error } = await client().rpc("mark_designer_template_seen", { p_template_id: templateId });
  if (error) throw error;
}

/** Retailer: record a real download (validated server-side against visibility). */
export async function recordDownload(templateId: string, canvasKind: CanvasKind): Promise<void> {
  const { error } = await client().rpc("record_designer_template_download", {
    p_template_id: templateId,
    p_canvas_kind: canvasKind,
  });
  if (error) throw error;
}

export async function deleteDesignerTemplate(templateId: string): Promise<void> {
  const { error } = await client().from("designer_templates").delete().eq("id", templateId);
  if (error) throw error;
}

export async function listSavedIds(): Promise<string[]> {
  const { data, error } = await client().from("retailer_saved_templates").select("template_id");
  if (error) throw error;
  return ((data ?? []) as { template_id: string }[]).map((r) => r.template_id);
}

/** Retailer bookmark. RLS restricts writes to the retailer's own rows. */
export async function toggleSaved(templateId: string, saved: boolean): Promise<void> {
  const db = client();
  const userId = (await db.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("You must be signed in.");
  const { error } = saved
    ? await db.from("retailer_saved_templates").insert({ retailer_user_id: userId, template_id: templateId })
    : await db
        .from("retailer_saved_templates")
        .delete()
        .eq("retailer_user_id", userId)
        .eq("template_id", templateId);
  if (error) throw error;
}

type DownloadRow = { id: string; template_id: string; canvas_kind: CanvasKind; created_at: string };

export async function listRecentDownloads(limit = 30): Promise<DownloadEntry[]> {
  const { data, error } = await client()
    .from("template_downloads")
    .select("id, template_id, canvas_kind, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as DownloadRow[]).map((r) => ({
    id: r.id,
    templateId: r.template_id,
    canvasKind: r.canvas_kind,
    at: r.created_at,
  }));
}
