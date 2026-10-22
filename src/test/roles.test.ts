import { describe, expect, it } from "vitest";
import { DEMO_USERS, resolveRole } from "@/lib/session";

describe("role resolution", () => {
  it("lets a dual-role user activate retailer", () => {
    expect(resolveRole(DEMO_USERS[0]!, "retailer")).toBe("retailer");
  });
  it("never activates a role the user lacks", () => {
    const retailerOnly = DEMO_USERS.find((u) => u.id === "u2")!;
    expect(resolveRole(retailerOnly, "manufacturer")).toBe("retailer");
  });
  it("only two roles exist across users", () => {
    const all = new Set(DEMO_USERS.flatMap((u) => u.roles));
    expect([...all].sort()).toEqual(["manufacturer", "retailer"]);
  });
});
