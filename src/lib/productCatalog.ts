/**
 * Product Catalog data layer.
 *
 * Typed wrapper over the atomic SECURITY DEFINER RPCs created by
 * supabase/migrations/202610310001_product_catalog.sql. Manufacturers write
 * through these RPCs; retailers only ever read them (RLS grants retailers
 * SELECT and no write policy exists, so the read-only rule is enforced on the
 * server, not just in this file). Product photos live in the private
 * `product-assets` bucket and are shown through short-lived signed URLs.
 */
import { supabase } from "@/lib/supabase";

export const PRODUCT_PHOTO_BUCKET = "product-assets";
export const MAX_PRODUCT_PHOTOS = 12;
export const MAX_PRODUCT_SPECIFICATIONS = 40;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const SIGNED_URL_TTL_SECONDS = 3600;
const SIGN_BATCH_SIZE = 20;

export interface ProductSpecification {
  label: string;
  value: string;
}

/** A product row as shown in the catalog grid / table (cover + all photo paths). */
export interface ProductSummary {
  id: string;
  name: string;
  code: string;
  sku: string | null;
  modelNumber: string | null;
  price: number;
  categoryId: string | null;
  categoryName: string | null;
  description: string;
  specifications: ProductSpecification[];
  warranty: string | null;
  inStock: boolean;
  manufacturerUserId: string;
  manufacturerName: string | null;
  createdAt: string;
  updatedAt: string;
  imagePaths: string[];
  /** Signed URLs in the same order as `imagePaths`; a failed sign is skipped. */
  photoUrls: (string | null)[];
}

export interface ProductPhoto {
  id: string;
  storagePath: string;
  position: number;
  isPrimary: boolean;
  url: string | null;
}

export interface ProductDetail extends Omit<ProductSummary, "photoUrls"> {
  photos: ProductPhoto[];
}

export interface ProductCategory {
  id: string;
  name: string;
  productCount: number;
}

/** Everything the reusable add / edit form collects, before it hits the server. */
export interface ProductFormValues {
  id: string | null;
  name: string;
  code: string;
  sku: string;
  modelNumber: string;
  price: string;
  category: string;
  description: string;
  specifications: ProductSpecification[];
  warranty: string;
  inStock: boolean;
  /** Photos already saved for this product, in the order the server returned them. */
  existing: ProductPhoto[];
  /** Ids of saved photos the user marked for deletion. */
  removedPhotoIds: string[];
  /** Brand-new files, referenced from `photoRefs` as `new:<index>`. */
  newPhotos: File[];
  /**
   * The display order the user arranged, as refs: `saved:<id>` or `new:<index>`.
   * A ref for a removed photo is simply ignored when the order is resolved.
   */
  photoRefs: string[];
  /** Ref of the chosen cover photo; empty means "use the first in photoRefs". */
  primaryRef: string;
}

export type ProductFormErrors = Partial<
  Record<
    | "name"
    | "code"
    | "sku"
    | "modelNumber"
    | "price"
    | "category"
    | "description"
    | "specifications"
    | "warranty"
    | "photos",
    string
  >
>;

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  id: null,
  name: "",
  code: "",
  sku: "",
  modelNumber: "",
  price: "",
  category: "",
  description: "",
  specifications: [],
  warranty: "",
  inStock: true,
  existing: [],
  removedPhotoIds: [],
  newPhotos: [],
  photoRefs: [],
  primaryRef: "",
};

function client() {
  if (!supabase) throw new Error("Supabase is not configured. The product catalog is unavailable.");
  return supabase;
}

function messageOf(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  const candidate = error as { message?: string; code?: string } | null;
  if (candidate?.message?.trim()) return candidate.message.trim();
  return fallback;
}

/** Unwraps an RPC result, converting Postgres errors into readable failures. */
async function callRpc<T>(name: string, args: Record<string, unknown>, fallback: string) {
  const { data, error } = await client().rpc(name, args);
  if (error) {
    const message = messageOf(error, fallback);
    throw new Error(
      error.code === "23505" && /code/i.test(message)
        ? "That product code is already used in your catalog."
        : message,
    );
  }
  return data as T;
}

function toNumber(value: unknown, fallback = 0) {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(n) ? n : fallback;
}

/** Specifications are stored as a JSON array; anything else degrades to none. */
export function normalizeSpecifications(value: unknown): ProductSpecification[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      label: String(item["label"] ?? "").trim().slice(0, 60),
      value: String(item["value"] ?? "").slice(0, 200),
    }))
    .filter((item) => item.label.length > 0)
    .slice(0, MAX_PRODUCT_SPECIFICATIONS);
}

interface ProductRow {
  id: string;
  name: string;
  code: string;
  sku: string | null;
  model_number: string | null;
  price: string | number;
  category_id: string | null;
  category_name: string | null;
  description: string;
  specifications: unknown;
  warranty: string | null;
  in_stock: boolean;
  manufacturer_user_id: string;
  manufacturer_name: string | null;
  created_at: string;
  updated_at: string;
  primary_image_path: string | null;
  image_paths: string[] | null;
}

function summaryFromRow(row: ProductRow, imagePaths: string[], photoUrls: (string | null)[]): ProductSummary {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    sku: row.sku,
    modelNumber: row.model_number,
    price: toNumber(row.price),
    categoryId: row.category_id,
    categoryName: row.category_name,
    description: row.description ?? "",
    specifications: normalizeSpecifications(row.specifications),
    warranty: row.warranty,
    inStock: row.in_stock,
    manufacturerUserId: row.manufacturer_user_id,
    manufacturerName: row.manufacturer_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    imagePaths,
    photoUrls,
  };
}

/**
 * Signs a batch of private object paths, keyed by path so a partially failed
 * sign can never shift a photo onto the wrong product.
 */
export async function signPhotoPaths(paths: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  const signed = new Map<string, string>();
  if (unique.length === 0) return signed;
  const storage = client().storage.from(PRODUCT_PHOTO_BUCKET);
  for (let i = 0; i < unique.length; i += SIGN_BATCH_SIZE) {
    const batch = unique.slice(i, i + SIGN_BATCH_SIZE);
    const { data, error } = await storage.createSignedUrls(batch, SIGNED_URL_TTL_SECONDS);
    if (error || !data) continue;
    data.forEach((entry, index) => {
      const url = entry.signedUrl;
      const path = entry.path ?? batch[index];
      if (url && path) signed.set(path, url);
    });
  }
  return signed;
}

export async function listProducts(args: {
  search?: string;
  categoryId?: string | null;
}): Promise<ProductSummary[]> {
  const rows = await callRpc<ProductRow[]>(
    "list_products",
    {
      p_search: args.search?.trim() ? args.search.trim() : null,
      p_category_id: args.categoryId ?? null,
    },
    "Products could not be loaded.",
  );

  const perRow = (rows ?? []).map((row) => {
    const ordered = [...(row.image_paths ?? [])].sort((a, b) => {
      // The RPC already returns cover-first; keep that order but stay stable.
      if (a === row.primary_image_path) return -1;
      if (b === row.primary_image_path) return 1;
      return 0;
    });
    return { row, paths: ordered };
  });

  const signed = await signPhotoPaths(perRow.flatMap((entry) => entry.paths));
  return perRow.map(({ row, paths }) =>
    summaryFromRow(row, paths, paths.map((path) => signed.get(path) ?? null)),
  );
}

interface DetailPayload {
  id: string;
  name: string;
  code: string;
  sku: string | null;
  model_number: string | null;
  price: string | number;
  category_id: string | null;
  category_name: string | null;
  description: string;
  specifications: unknown;
  warranty: string | null;
  in_stock: boolean;
  manufacturer_user_id: string;
  manufacturer_name: string | null;
  created_at: string;
  updated_at: string;
  images: { id: string; storage_path: string; position: number; is_primary: boolean }[];
}

export async function getProductDetail(productId: string): Promise<ProductDetail> {
  const payload = await callRpc<DetailPayload>(
    "get_product_detail",
    { p_product_id: productId },
    "This product could not be loaded.",
  );
  const images = [...(payload.images ?? [])].sort(
    (a, b) => a.position - b.position || String(a.id).localeCompare(String(b.id)),
  );
  const paths = images.map((image) => image.storage_path);
  const signed = await signPhotoPaths(paths);
  return {
    id: payload.id,
    name: payload.name,
    code: payload.code,
    sku: payload.sku,
    modelNumber: payload.model_number,
    price: toNumber(payload.price),
    categoryId: payload.category_id,
    categoryName: payload.category_name,
    description: payload.description ?? "",
    specifications: normalizeSpecifications(payload.specifications),
    warranty: payload.warranty,
    inStock: payload.in_stock,
    manufacturerUserId: payload.manufacturer_user_id,
    manufacturerName: payload.manufacturer_name,
    createdAt: payload.created_at,
    updatedAt: payload.updated_at,
    imagePaths: paths,
    photos: images.map((image) => ({
      id: image.id,
      storagePath: image.storage_path,
      position: image.position,
      isPrimary: image.is_primary,
      url: signed.get(image.storage_path) ?? null,
    })),
  };
}

export async function listProductCategories(): Promise<ProductCategory[]> {
  const rows = await callRpc<{ id: string; name: string; product_count: string | number }[]>(
    "list_product_categories",
    {},
    "Product categories could not be loaded.",
  );
  return (rows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    productCount: toNumber(row.product_count),
  }));
}

export function validateProductForm(values: ProductFormValues): ProductFormErrors {
  const errors: ProductFormErrors = {};
  const name = values.name.trim();
  if (!name) errors.name = "Product name is required.";
  else if (name.length > 200) errors.name = "Use 200 characters or fewer.";

  const code = values.code.trim();
  if (!code) errors.code = "A unique product code / SKU / model number is required.";
  else if (code.length > 80) errors.code = "Use 80 characters or fewer.";

  if (values.sku.trim().length > 80) errors.sku = "Use 80 characters or fewer.";
  if (values.modelNumber.trim().length > 80) errors.modelNumber = "Use 80 characters or fewer.";

  const price = values.price.trim().replace(/,/g, "");
  if (!price) errors.price = "Price is required.";
  else if (!/^\d{1,8}(\.\d{1,2})?$/.test(price))
    errors.price = "Enter a valid rupee amount, up to two decimals.";
  else if (Number(price) < 0 || Number(price) > 99999999.99)
    errors.price = "Price must be between ₹0 and ₹9,99,99,999.99.";

  if (values.category.trim().length > 80) errors.category = "Use 80 characters or fewer.";
  if (values.description.length > 4000) errors.description = "Use 4000 characters or fewer.";
  if (values.warranty.trim().length > 120) errors.warranty = "Use 120 characters or fewer.";

  const filled = values.specifications.filter(
    (item) => item.label.trim() || item.value.trim(),
  );
  if (filled.length > MAX_PRODUCT_SPECIFICATIONS)
    errors.specifications = `A product can carry at most ${MAX_PRODUCT_SPECIFICATIONS} specifications.`;
  else if (filled.some((item) => item.label.trim() && !item.value.trim()))
    errors.specifications = "Give every specification a value, or remove its label.";
  else if (filled.some((item) => item.label.trim().length > 60))
    errors.specifications = "Specification labels must be 60 characters or fewer.";
  else if (filled.some((item) => item.value.trim().length > 200))
    errors.specifications = "Specification values must be 200 characters or fewer.";

  const keptPhotos = values.existing.filter((p) => !values.removedPhotoIds.includes(p.id));
  const total = keptPhotos.length + values.newPhotos.length;
  if (total > MAX_PRODUCT_PHOTOS)
    errors.photos = `A product can have at most ${MAX_PRODUCT_PHOTOS} photos.`;
  else {
    if (total > 0 && values.photoRefs.length !== total)
      errors.photos = "The photo order is incomplete; re-add the missing photo.";
    const bad = values.newPhotos.find((file) => validatePhotoFile(file));
    const badProblem = bad ? validatePhotoFile(bad) : undefined;
    if (badProblem && !errors.photos) errors.photos = badProblem;
  }
  return errors;
}

export function validatePhotoFile(file: File): string | undefined {
  if (!IMAGE_TYPES.has(file.type)) return "Use a PNG, JPG or WebP image.";
  if (file.size === 0) return "Choose a non-empty image.";
  if (file.size > MAX_PHOTO_BYTES) return "Each photo must be 5 MB or smaller.";
  return undefined;
}

function extensionFor(file: File) {
  if (file.type === "image/jpeg") return "jpg";
  return file.type.split("/")[1] ?? "png";
}

/** `<userId>/products/<uuid>.<ext>` — matches the bucket policy and CHECK. */
export function productPhotoPath(userId: string, file: File, randomId: string) {
  return `${userId}/products/${randomId}.${extensionFor(file)}`;
}

export interface PhotoUploadState {
  total: number;
  completed: number;
  current: string;
}

/** Uploads each new photo into the private bucket, reporting per-file progress. */
export async function uploadProductPhotos(
  userId: string,
  files: File[],
  onProgress: (state: PhotoUploadState) => void,
  createId: () => string = () => crypto.randomUUID(),
): Promise<string[]> {
  const storage = client().storage.from(PRODUCT_PHOTO_BUCKET);
  const uploaded: string[] = [];
  for (const [index, file] of files.entries()) {
    const problem = validatePhotoFile(file);
    if (problem) throw new Error(problem);
    const path = productPhotoPath(userId, file, createId());
    onProgress({ total: files.length, completed: index, current: file.name });
    const { error } = await storage.upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw new Error(`Photo upload failed: ${error.message}`);
    uploaded.push(path);
  }
  onProgress({ total: files.length, completed: files.length, current: "" });
  return uploaded;
}

export async function upsertProduct(values: ProductFormValues): Promise<string> {
  const specifications = values.specifications
    .filter((item) => item.label.trim() && item.value.trim())
    .map((item) => ({ label: item.label.trim(), value: item.value.trim() }));
  return callRpc<string>(
    "upsert_product",
    {
      p_id: values.id,
      p_name: values.name.trim(),
      p_code: values.code.trim(),
      p_sku: values.sku.trim() || null,
      p_model_number: values.modelNumber.trim() || null,
      p_price: Number(values.price.trim().replace(/,/g, "")),
      p_category_name: values.category.trim() || null,
      p_description: values.description,
      p_specifications: specifications,
      p_warranty: values.warranty.trim() || null,
      p_in_stock: values.inStock,
    },
    "The product could not be saved.",
  );
}

export async function addProductPhoto(productId: string, storagePath: string): Promise<string> {
  return callRpc<string>(
    "add_product_image",
    { p_product_id: productId, p_storage_path: storagePath },
    "The photo could not be attached to the product.",
  );
}

export async function removeProductPhoto(imageId: string): Promise<void> {
  await callRpc<null>(
    "delete_product_image",
    { p_image_id: imageId },
    "The photo could not be deleted.",
  );
}

export async function reorderProductPhotos(
  productId: string,
  imageIds: string[],
  primaryImageId: string | null,
): Promise<void> {
  await callRpc<null>(
    "reorder_product_images",
    { p_product_id: productId, p_image_ids: imageIds, p_primary_image_id: primaryImageId },
    "The photo order could not be saved.",
  );
}

export async function deleteProduct(productId: string): Promise<void> {
  await callRpc<null>(
    "delete_product",
    { p_product_id: productId },
    "The product could not be deleted.",
  );
}

/** Mirrors the shared upload-cleanup decision used for retailer invitations:
 *  only a confirmed rejection (4xx from the save call) may justify removing
 *  files that were already uploaded; a network or 5xx outcome proves nothing. */
export function canCleanUpPhotoUploads(requestStarted: boolean, responseFailedConfirmed: boolean) {
  return !requestStarted || responseFailedConfirmed;
}

export async function removeUploadedPhotos(paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await client().storage.from(PRODUCT_PHOTO_BUCKET).remove(paths);
  if (error) throw error;
}

export interface SaveProductOutcome {
  productId: string;
  photoWarnings: string[];
}

/**
 * One save flow for both adding and editing:
 *   1. upload the brand-new files,
 *   2. write the product row (atomic RPC),
 *   3. drop the photos the user removed (row + storage object together),
 *   4. attach the new photos,
 *   5. persist the final order and the chosen cover.
 * A failure before step 2 can never leave a half-saved product; an ambiguous
 * network outcome never deletes the just-uploaded files.
 */
export async function saveProduct(
  values: ProductFormValues,
  userId: string,
  onProgress: (state: PhotoUploadState) => void,
  createId: () => string = () => crypto.randomUUID(),
): Promise<SaveProductOutcome> {
  const errors = validateProductForm(values);
  if (Object.keys(errors).length)
    throw new Error(errors.photos ?? errors.name ?? errors.code ?? errors.price ?? "Fix the highlighted fields.");

  const uploaded: string[] = [];
  let saveStarted = false;
  let saveRejected = false;
  const photoWarnings: string[] = [];
  let productId = values.id ?? "";

  try {
    if (values.newPhotos.length) {
      uploaded.push(...(await uploadProductPhotos(userId, values.newPhotos, onProgress, createId)));
    }

    saveStarted = true;
    try {
      productId = await upsertProduct(values);
    } catch (error) {
      const message = messageOf(error, "");
      saveRejected = !/network|failed to fetch|timeout/i.test(message);
      throw error;
    }

    for (const imageId of values.removedPhotoIds) {
      try {
        await removeProductPhoto(imageId);
      } catch (error) {
        photoWarnings.push(messageOf(error, "A removed photo could not be deleted."));
      }
    }

    // Attach the freshly uploaded files. `uploaded[i]` belongs to `newPhotos[i]`,
    // so the id returned here is addressable as the ref `new:<i>`.
    const addedIds: (string | undefined)[] = [];
    for (const [index, path] of uploaded.entries()) {
      try {
        addedIds[index] = await addProductPhoto(productId, path);
      } catch (error) {
        photoWarnings.push(messageOf(error, "A new photo could not be attached to the product."));
      }
    }

    const idsByRef = resolvePhotoRefs(values, addedIds);
    const orderedIds = values.photoRefs
      .map((ref) => idsByRef.get(ref))
      .filter((id): id is string => Boolean(id));
    const primaryId = idsByRef.get(values.primaryRef || values.photoRefs[0] || "") ?? null;
    if (orderedIds.length) {
      try {
        await reorderProductPhotos(productId, orderedIds, primaryId);
      } catch (error) {
        photoWarnings.push(messageOf(error, "The photo order could not be saved."));
      }
    }

    return { productId, photoWarnings };
  } catch (error) {
    let message = messageOf(error, "The product could not be saved.");
    if (uploaded.length && canCleanUpPhotoUploads(saveStarted, saveRejected)) {
      try {
        await removeUploadedPhotos(uploaded);
      } catch {
        message += " The uploaded photos could not be cleaned up; contact support if this persists.";
      }
    }
    throw new Error(message);
  }
}

/**
 * Maps every photo ref the form uses (`saved:<id>` / `new:<index>`) to the id it
 * has after this save. Removed photos and uploads that could not be attached are
 * absent, so an incomplete order can never delete or renumber the rest.
 */
function resolvePhotoRefs(values: ProductFormValues, addedIds: (string | undefined)[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const photo of values.existing) {
    if (!values.removedPhotoIds.includes(photo.id)) map.set(savedRef(photo.id), photo.id);
  }
  addedIds.forEach((id, index) => {
    if (id) map.set(newRef(index), id);
  });
  return map;
}

export const savedRef = (imageId: string) => `saved:${imageId}`;
export const newRef = (fileIndex: number) => `new:${fileIndex}`;

/**
 * Prefills the reusable form from a saved product, so editing starts with
 * exactly what the server holds — including the photo order and the cover.
 */
export function formFromProduct(detail: ProductDetail): ProductFormValues {
  const photos = [...detail.photos].sort((a, b) => a.position - b.position);
  const primary = photos.find((photo) => photo.isPrimary) ?? photos[0];
  return {
    ...EMPTY_PRODUCT_FORM,
    id: detail.id,
    name: detail.name,
    code: detail.code,
    sku: detail.sku ?? "",
    modelNumber: detail.modelNumber ?? "",
    price: String(detail.price),
    category: detail.categoryName ?? "",
    description: detail.description,
    specifications: detail.specifications.map((item) => ({ ...item })),
    warranty: detail.warranty ?? "",
    inStock: detail.inStock,
    existing: photos,
    removedPhotoIds: [],
    newPhotos: [],
    photoRefs: photos.map((photo) => savedRef(photo.id)),
    primaryRef: primary ? savedRef(primary.id) : "",
  };
}

export function formatPriceINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}
