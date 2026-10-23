import type { Role } from "@/lib/session";
import { z } from "zod";

export interface RegistrationValues {
  name: string;
  email: string;
  country: string;
  state: string;
  city: string;
  business: string;
  category: string;
  phone: string;
  acceptedPolicies: boolean;
  businessLogo: File | null;
  profilePhoto: File | null;
}

export type RegistrationErrors = Partial<Record<keyof RegistrationValues, string>>;

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function validateRegistration(values: RegistrationValues, _role: Role): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const required: (keyof RegistrationValues)[] = [
    "name",
    "email",
    "country",
    "state",
    "city",
    "business",
    "category",
    "phone",
  ];

  for (const field of required) {
    if (!String(values[field]).trim()) errors[field] = "This field is required.";
    else if (
      !z
        .string()
        .trim()
        .max(field === "email" ? 255 : 200)
        .refine((value) => !/[\u0000-\u001f]/.test(value))
        .safeParse(values[field]).success
    )
      errors[field] = "Text is too long or contains invalid characters.";
  }
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Enter a valid email address.";
  }
  const digits = values.phone.replace(/\D/g, "");
  if (
    values.phone &&
    (!/^\+?[0-9() .-]{7,20}$/.test(values.phone.trim()) || digits.length < 7 || digits.length > 15)
  ) {
    errors.phone = "Enter a valid contact number.";
  }
  if (!values.acceptedPolicies)
    errors.acceptedPolicies = "You must accept the Terms and Privacy Policy.";

  for (const field of ["businessLogo", "profilePhoto"] as const) {
    const file = values[field];
    if (!file) {
      errors[field] = "Choose an image to continue.";
    } else if (!IMAGE_TYPES.includes(file.type)) {
      errors[field] = "Use a PNG, JPG or WebP image.";
    } else if (file.size > MAX_IMAGE_SIZE) {
      errors[field] = "Image must be 5 MB or smaller.";
    } else if (file.size === 0) {
      errors[field] = "Choose a non-empty image.";
    }
  }

  return errors;
}
