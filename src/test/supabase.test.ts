import { describe, expect, it } from "vitest";
import { createGoogleCallbackUrl, isApprovedSupabaseUrl } from "@/lib/supabase";

describe("Supabase project allowlist", () => {
  it("accepts only the selected project URL, with an optional trailing slash", () => {
    expect(isApprovedSupabaseUrl("https://kwmakeexlzjdhjtkefvh.supabase.co")).toBe(true);
    expect(isApprovedSupabaseUrl("https://kwmakeexlzjdhjtkefvh.supabase.co/")).toBe(true);
    expect(isApprovedSupabaseUrl("https://other-project.supabase.co")).toBe(false);
    expect(isApprovedSupabaseUrl(undefined)).toBe(false);
  });
});

describe("Google OAuth callback attribution", () => {
  it("preserves individual and permanent-link tokens through the callback URL", () => {
    const invite = new URL(createGoogleCallbackUrl("https://app.example", { invite: "a1b2" }));
    expect(invite.pathname).toBe("/register");
    expect(invite.searchParams.get("invite")).toBe("a1b2");

    const referral = new URL(createGoogleCallbackUrl("https://app.example", { referral: "c3d4" }));
    expect(referral.pathname).toBe("/register");
    expect(referral.searchParams.get("referral")).toBe("c3d4");
  });
});
