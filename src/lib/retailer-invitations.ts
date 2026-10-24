import { z } from "zod";

export interface RetailerInvitationValues {
  name: string;
  phone: string;
  business: string;
  city: string;
  photo: File | null;
  businessLogo: File | null;
}

export type RetailerInvitationErrors = Partial<Record<keyof RetailerInvitationValues, string>>;

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function validateRetailerInvitation(
  values: RetailerInvitationValues,
): RetailerInvitationErrors {
  const errors: RetailerInvitationErrors = {};
  for (const field of ["name", "phone", "business", "city"] as const) {
    if (!values[field].trim()) errors[field] = "This field is required.";
    else if (
      !z
        .string()
        .trim()
        .max(200)
        .refine((value) => Array.from(value).every((character) => character.charCodeAt(0) >= 32))
        .safeParse(values[field]).success
    )
      errors[field] = "Use 200 characters or fewer without control characters.";
  }
  const digits = values.phone.replace(/\D/g, "");
  if (
    values.phone.trim() &&
    (!/^\+?[0-9() .-]{7,20}$/.test(values.phone.trim()) || digits.length < 7 || digits.length > 15)
  ) {
    errors.phone = "Enter a valid mobile number.";
  }
  for (const field of ["photo", "businessLogo"] as const) {
    const file = values[field];
    if (!file) {
      errors[field] = field === "photo" ? "Choose a retailer photo." : "Choose a business logo.";
    } else if (!IMAGE_TYPES.has(file.type)) {
      errors[field] = "Use a PNG, JPG or WebP image.";
    } else if (file.size > MAX_IMAGE_SIZE) {
      errors[field] = "Image must be 5 MB or smaller.";
    } else if (file.size === 0) {
      errors[field] = "Choose a non-empty image.";
    }
  }
  return errors;
}

export function createInvitationToken(cryptoApi: Pick<Crypto, "getRandomValues"> = crypto) {
  const bytes = cryptoApi.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function canCleanUpFailedUploads(requestStarted: boolean, responseStatus?: number) {
  return (
    !requestStarted ||
    (responseStatus !== undefined && responseStatus >= 400 && responseStatus < 500)
  );
}

// Used when VITE_PUBLIC_APP_URL is not injected (for example in the Lovable preview).
export const DEFAULT_PUBLIC_APP_URL = "https://prakash-pariwar-market-mates.lovable.app";

export function createRetailerLink(
  path: string,
  kind: "invite" | "referral",
  token: string,
  publicAppUrl: string,
) {
  let base: URL;
  try {
    base = new URL(publicAppUrl);
  } catch {
    throw new Error("Set VITE_PUBLIC_APP_URL to the public application URL before sharing links.");
  }
  if (
    base.protocol !== "https:" ||
    /^(localhost|127\.0\.0\.1|\[::1\])$/.test(base.hostname) ||
    base.hostname.includes("id-preview--") ||
    base.pathname !== "/" ||
    base.search ||
    base.hash ||
    base.username ||
    base.password
  ) {
    throw new Error("VITE_PUBLIC_APP_URL must be a valid public HTTP or HTTPS URL.");
  }
  const link = new URL(path, base);
  if (link.origin !== base.origin || link.pathname !== "/register")
    throw new Error("Retailer links must use the public registration page.");
  link.searchParams.set(kind, token);
  return link.toString();
}

export function createWhatsAppShareUrl(link: string, businessName: string, retailerName?: string) {
  z.string().url().max(2048).parse(link);
  z.string().trim().min(1).max(200).parse(businessName);
  if (retailerName) z.string().trim().max(200).parse(retailerName);
  const message = `${retailerName ? `Hi ${retailerName}, ` : ""}Join ${businessName} on Prakash Pariwar as a retailer: ${link}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export async function issueRetailerInvitation(
  values: RetailerInvitationValues,
  publicAppUrl: string,
  paths: { photoPath: string; businessLogoPath: string },
  uploadPhoto: (photo: File, path: string) => Promise<void>,
  saveInvitation: (token: string, photoPath: string, businessLogoPath: string) => Promise<void>,
) {
  const errors = validateRetailerInvitation(values);
  if (Object.keys(errors).length)
    throw new Error("Complete all required retailer invitation fields.");
  const token = createInvitationToken();
  const link = createRetailerLink("/register", "invite", token, publicAppUrl);
  if (!values.photo || !values.businessLogo) throw new Error("Choose both required images.");
  await uploadPhoto(values.photo, paths.photoPath);
  await uploadPhoto(values.businessLogo, paths.businessLogoPath);
  await saveInvitation(token, paths.photoPath, paths.businessLogoPath);
  return link;
}
