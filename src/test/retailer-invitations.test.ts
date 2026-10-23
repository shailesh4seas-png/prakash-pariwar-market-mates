import { describe, expect, it, vi } from "vitest";
import {
  createInvitationToken,
  createRetailerLink,
  createWhatsAppShareUrl,
  issueRetailerInvitation,
  validateRetailerInvitation,
  type RetailerInvitationValues,
} from "@/lib/retailer-invitations";

const validValues = (): RetailerInvitationValues => ({
  name: "Asha Patel",
  phone: "+91 98765 43210",
  business: "Patel Trading",
  city: "Ahmedabad",
  photo: new File(["photo"], "photo.png", { type: "image/png" }),
  businessLogo: new File(["logo"], "logo.png", { type: "image/png" }),
});

describe("retailer invitation helpers", () => {
  it("requires all invite fields and a valid mobile number and photo", () => {
    expect(validateRetailerInvitation(validValues())).toEqual({});

    const values = validValues();
    values.name = " ";
    values.phone = "123-abc";
    values.photo = null;
    expect(validateRetailerInvitation(values)).toMatchObject({
      name: "This field is required.",
      phone: "Enter a valid mobile number.",
      photo: "Choose a retailer photo.",
    });
  });

  it("rejects unsupported and oversized photos", () => {
    const unsupported = validValues();
    unsupported.photo = new File(["photo"], "photo.svg", { type: "image/svg+xml" });
    expect(validateRetailerInvitation(unsupported).photo).toBe("Use a PNG, JPG or WebP image.");

    const oversized = validValues();
    oversized.photo = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.jpg", {
      type: "image/jpeg",
    });
    expect(validateRetailerInvitation(oversized).photo).toBe("Image must be 5 MB or smaller.");

    const invalidLogo = validValues();
    invalidLogo.businessLogo = new File(["logo"], "logo.svg", { type: "image/svg+xml" });
    expect(validateRetailerInvitation(invalidLogo).businessLogo).toBe(
      "Use a PNG, JPG or WebP image.",
    );
  });

  it("creates 256-bit random tokens", () => {
    const first = createInvitationToken();
    const second = createInvitationToken();
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(second).not.toBe(first);
  });

  it("builds links only from the configured application URL", () => {
    expect(createRetailerLink("/register", "invite", "abc123", "https://market.example/")).toBe(
      "https://market.example/register?invite=abc123",
    );
    expect(createRetailerLink("/register", "referral", "ref123", "https://market.example")).toBe(
      "https://market.example/register?referral=ref123",
    );
    expect(() => createRetailerLink("/register", "invite", "abc123", "")).toThrow(
      "Set VITE_PUBLIC_APP_URL",
    );
    expect(() =>
      createRetailerLink("/register", "invite", "abc123", "javascript:alert(1)"),
    ).toThrow("valid public HTTP or HTTPS URL");
    expect(() =>
      createRetailerLink("/register", "invite", "abc123", "http://market.example"),
    ).toThrow("valid public HTTP or HTTPS URL");
  });

  it("encodes an invitation URL into the WhatsApp share message", () => {
    const share = new URL(
      createWhatsAppShareUrl("https://market.example/register?invite=abc", "Patel & Sons"),
    );
    expect(share.origin + share.pathname).toBe("https://wa.me/");
    expect(share.searchParams.get("text")).toBe(
      "Join Patel & Sons on Prakash Pariwar as a retailer: https://market.example/register?invite=abc",
    );
  });

  it("does not save an invitation when photo storage fails", async () => {
    const saveInvitation = vi.fn();
    await expect(
      issueRetailerInvitation(
        validValues(),
        "https://market.example",
        {
          photoPath: "manufacturer/invitation-photos/photo.png",
          businessLogoPath: "manufacturer/invitation-logos/logo.png",
        },
        async () => {
          throw new Error("storage unavailable");
        },
        saveInvitation,
      ),
    ).rejects.toThrow("storage unavailable");
    expect(saveInvitation).not.toHaveBeenCalled();
  });

  it("returns an invitation URL only after the record is saved", async () => {
    let savedToken = "";
    const uploaded: string[] = [];
    const link = await issueRetailerInvitation(
      validValues(),
      "https://market.example",
      {
        photoPath: "manufacturer/invitation-photos/photo.png",
        businessLogoPath: "manufacturer/invitation-logos/logo.png",
      },
      async (_file, path) => {
        uploaded.push(path);
      },
      async (token, photoPath, businessLogoPath) => {
        savedToken = token;
        expect(photoPath).toBe("manufacturer/invitation-photos/photo.png");
        expect(businessLogoPath).toBe("manufacturer/invitation-logos/logo.png");
      },
    );

    expect(new URL(link).searchParams.get("invite")).toBe(savedToken);
    expect(savedToken).toMatch(/^[0-9a-f]{64}$/);
    expect(uploaded).toEqual([
      "manufacturer/invitation-photos/photo.png",
      "manufacturer/invitation-logos/logo.png",
    ]);
  });
});
