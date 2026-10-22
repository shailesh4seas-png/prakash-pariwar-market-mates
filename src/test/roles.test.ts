import { describe, expect, it } from "vitest";
import { resolveRole, type Role } from "@/lib/session";

describe("role resolution", () => {
  const dualRole: Role[] = ["manufacturer", "retailer"];

  it("lets an authenticated dual-role user activate either registered role", () => {
    expect(resolveRole(dualRole, "retailer")).toBe("retailer");
    expect(resolveRole(dualRole, "manufacturer")).toBe("manufacturer");
  });

  it("never activates a role absent from the authenticated profile set", () => {
    expect(resolveRole(["retailer"], "manufacturer")).toBe("retailer");
  });

  it("has no active role until the user has a profile", () => {
    expect(resolveRole([], "manufacturer")).toBeNull();
  });
});
