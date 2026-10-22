import { describe, expect, it } from "vitest";
import { validateRegistration, type RegistrationValues } from "@/lib/registration";
import type { Role } from "@/lib/session";

const completeValues = (): RegistrationValues => ({
  name: "Asha Patel",
  email: "asha@example.com",
  country: "India",
  state: "Gujarat",
  city: "Ahmedabad",
  business: "Patel Trading",
  category: "Home goods",
  phone: "+91 98765 43210",
  acceptedPolicies: true,
  businessLogo: new File(["logo"], "logo.png", { type: "image/png" }),
  profilePhoto: new File(["photo"], "photo.webp", { type: "image/webp" }),
});

describe("role registration validation", () => {
  it.each(["manufacturer", "retailer"] as Role[])("accepts complete %s registration details", (role) => {
    expect(validateRegistration(completeValues(), role)).toEqual({});
  });

  it.each(["manufacturer", "retailer"] as Role[])("rejects missing required fields for %s", (role) => {
    const values = completeValues();
    values.name = " ";
    values.city = "";
    values.acceptedPolicies = false;
    values.businessLogo = null;

    expect(validateRegistration(values, role)).toMatchObject({
      name: "This field is required.",
      city: "This field is required.",
      acceptedPolicies: "You must accept the Terms and Privacy Policy.",
      businessLogo: "Choose an image to continue.",
    });
  });

  it("rejects invalid image types, oversized images, email and phone numbers", () => {
    const values = completeValues();
    values.businessLogo = new File(["not an image"], "logo.svg", { type: "image/svg+xml" });
    values.profilePhoto = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.jpg", { type: "image/jpeg" });
    values.email = "not-an-email";
    values.phone = "abc";

    expect(validateRegistration(values, "retailer")).toMatchObject({
      businessLogo: "Use a PNG, JPG or WebP image.",
      profilePhoto: "Image must be 5 MB or smaller.",
      email: "Enter a valid email address.",
      phone: "Enter a valid contact number.",
    });
  });
});