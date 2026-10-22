import { describe, expect, it } from "vitest";
import { isApprovedSupabaseUrl } from "@/lib/supabase";

describe("Supabase project allowlist", () => {
  it("accepts only the selected project URL, with an optional trailing slash", () => {
    expect(isApprovedSupabaseUrl("https://kwmakeexlzjdhjtkefvh.supabase.co")).toBe(true);
    expect(isApprovedSupabaseUrl("https://kwmakeexlzjdhjtkefvh.supabase.co/")).toBe(true);
    expect(isApprovedSupabaseUrl("https://other-project.supabase.co")).toBe(false);
    expect(isApprovedSupabaseUrl(undefined)).toBe(false);
  });
});
