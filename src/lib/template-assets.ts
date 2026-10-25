/**
 * Logo upload for the editor's Brand Details panel.
 *
 * Reuses the private `profile-assets` bucket (same trust boundary as profile
 * logos). The upload returns a stable `storage:` reference that is signed on
 * demand at render time, so a saved template keeps showing the logo long after
 * any short-lived signed URL would have expired. A failed/ambiguous upload is
 * never compensated by a delete — following the shared upload-cleanup rule that
 * a network outcome cannot prove the object was not stored.
 */
import { supabase } from "@/lib/supabase";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * A private bucket path stored in a spec's logo slot uses this prefix instead of
 * a signed URL, so the image still resolves hours later (signed on demand).
 */
export const STORAGE_PATH_PREFIX = "storage:";

export function isStoredLogoPath(value: string | undefined): boolean {
  return Boolean(value?.startsWith(STORAGE_PATH_PREFIX));
}

/** Signs a `storage:` logo path; returns undefined when it cannot be signed. */
export async function resolveLogoSrc(value: string | undefined): Promise<string | undefined> {
  if (!value) return undefined;
  if (!value.startsWith(STORAGE_PATH_PREFIX)) return value;
  const path = value.slice(STORAGE_PATH_PREFIX.length);
  if (!supabase) return undefined;
  try {
    const { data, error } = await supabase.storage.from("profile-assets").createSignedUrl(path, 3600);
    return error ? undefined : data.signedUrl;
  } catch {
    return undefined;
  }
}

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

/** Uploads a template logo and returns a `storage:` reference to persist. */
export async function uploadTemplateLogo(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_BYTES) throw new Error("Logo must be 5 MB or smaller.");

  const db = client();
  const { data: authData, error: authError } = await db.auth.getUser();
  if (authError || !authData.user) throw new Error("Please sign in again.");
  const userId = authData.user.id;

  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${userId}/template-logos/logo-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await db.storage.from("profile-assets").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw new Error(`Logo upload failed: ${uploadError.message}`);

  return `${STORAGE_PATH_PREFIX}${path}`;
}
