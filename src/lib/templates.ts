import { supabase } from "@/lib/supabase";
import type { Category, TemplateStatus } from "@/lib/data";

export interface DbTemplate {
  id: string;
  manufacturerUserId: string;
  title: string;
  headline: string;
  sub: string;
  category: Category;
  imagePath: string | null;
  status: TemplateStatus;
  createdAt: string;
  updatedAt: string;
}

export type TemplateInput = {
  title: string;
  headline: string;
  sub?: string;
  category: Category;
  imagePath?: string | null;
  status?: TemplateStatus;
};

type Row = {
  id: string;
  manufacturer_user_id: string;
  title: string;
  headline: string;
  sub: string;
  category: Category;
  image_path: string | null;
  status: TemplateStatus;
  created_at: string;
  updated_at: string;
};

const COLUMNS =
  "id, manufacturer_user_id, title, headline, sub, category, image_path, status, created_at, updated_at";

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

const fromRow = (r: Row): DbTemplate => ({
  id: r.id,
  manufacturerUserId: r.manufacturer_user_id,
  title: r.title,
  headline: r.headline,
  sub: r.sub,
  category: r.category,
  imagePath: r.image_path,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/** Manufacturer: own templates (any status). Retailer: published templates of associated manufacturers (RLS decides). */
export async function listTemplates(): Promise<DbTemplate[]> {
  const { data, error } = await client()
    .from("templates")
    .select(COLUMNS)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function createTemplate(userId: string, input: TemplateInput): Promise<DbTemplate> {
  const { data, error } = await client()
    .from("templates")
    .insert({
      manufacturer_user_id: userId,
      title: input.title,
      headline: input.headline,
      sub: input.sub ?? "",
      category: input.category,
      image_path: input.imagePath ?? null,
      status: input.status ?? "draft",
    })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return fromRow(data as Row);
}

export async function updateTemplate(id: string, input: Partial<TemplateInput>): Promise<DbTemplate> {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch["title"] = input.title;
  if (input.headline !== undefined) patch["headline"] = input.headline;
  if (input.sub !== undefined) patch["sub"] = input.sub;
  if (input.category !== undefined) patch["category"] = input.category;
  if (input.imagePath !== undefined) patch["image_path"] = input.imagePath;
  if (input.status !== undefined) patch["status"] = input.status;
  const { data, error } = await client()
    .from("templates")
    .update(patch)
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return fromRow(data as Row);
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await client().from("templates").delete().eq("id", id);
  if (error) throw error;
}

/** Uploads template art under `<userId>/templates/<uuid>.<ext>` and returns the storage path. */
export async function uploadTemplateImage(userId: string, file: File): Promise<string> {
  const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[file.type];
  if (!ext) throw new Error("Use a PNG, JPG or WebP image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be 5 MB or smaller.");
  const path = `${userId}/templates/${crypto.randomUUID()}.${ext}`;
  const { error } = await client().storage.from("template-assets").upload(path, file, {
    contentType: file.type,
  });
  if (error) throw error;
  return path;
}

export async function getTemplateImageUrl(path: string, expiresInSeconds = 3600): Promise<string> {
  const { data, error } = await client()
    .storage.from("template-assets")
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function listSavedTemplateIds(): Promise<string[]> {
  const { data, error } = await client()
    .from("template_saves")
    .select("template_id")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as { template_id: string }[]).map((r) => r.template_id);
}

export async function setTemplateSaved(userId: string, templateId: string, saved: boolean) {
  const db = client();
  const { error } = saved
    ? await db.from("template_saves").insert({ retailer_user_id: userId, template_id: templateId })
    : await db
        .from("template_saves")
        .delete()
        .eq("retailer_user_id", userId)
        .eq("template_id", templateId);
  if (error) throw error;
}

export async function recordTemplateDownload(templateId: string): Promise<void> {
  const { error } = await client().rpc("record_template_download", { p_template_id: templateId });
  if (error) throw error;
}

export async function listRecentDownloads(limit = 20) {
  const { data, error } = await client()
    .from("template_downloads")
    .select("template_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as { template_id: string; created_at: string }[]).map((r) => ({
    templateId: r.template_id,
    at: r.created_at,
  }));
}

export async function getTemplateStats(): Promise<
  { templateId: string; downloads: number; saves: number }[]
> {
  const { data, error } = await client().rpc("get_manufacturer_template_stats");
  if (error) throw error;
  return (data as { template_id: string; downloads: number; saves: number }[]).map((r) => ({
    templateId: r.template_id,
    downloads: Number(r.downloads),
    saves: Number(r.saves),
  }));
}
