import { beforeEach, describe, expect, it, vi } from "vitest";

// Mutable, hoisted mock handles so the fake Supabase client can be configured
// per test without touching the real network layer.
const h = vi.hoisted(() => ({
  rpc: vi.fn(),
  createSignedUrl: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: h.rpc,
    storage: { from: () => ({ createSignedUrl: h.createSignedUrl }) },
    auth: { getUser: h.getUser },
    from: h.from,
  },
  SUPABASE_SETUP_MESSAGE: "",
  isApprovedSupabaseUrl: () => true,
  createGoogleCallbackUrl: () => "",
  startGoogleSignIn: vi.fn(),
}));

import * as api from "@/lib/designerTemplates";
import { buildDraft, brandFromProfile } from "@/lib/templateQueries";
import { generateTemplate } from "@/lib/templateEngine";
import type { TemplateDraft } from "@/lib/designerTemplates";

/** A chainable builder mimicking the supabase-js query builder; every verb is
 *  recorded so we can assert the table operations the data layer performs. */
function makeChain(result: unknown) {
  const calls: { name: string; args: unknown[] }[] = [];
  const obj: Record<string, unknown> = { calls };
  for (const m of ["select", "insert", "delete", "update", "eq", "order", "limit"]) {
    obj[m] = (...args: unknown[]) => {
      calls.push({ name: m, args });
      return obj;
    };
  }
  obj["then"] = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(res, rej);
  return obj as typeof obj & { calls: { name: string; args: unknown[] }[] };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listReceivedTemplates", () => {
  it("maps rows, signs logos and omits empty contact fields", async () => {
    const full = {
      template_id: "t1",
      manufacturer_user_id: "m1",
      mfr_business_name: "Jyoti Appliances",
      mfr_logo_path: "m1/logo.png",
      mfr_phone: "+91 98000 00000",
      mfr_email: "brand@jyoti.in",
      category_key: "diwali",
      canvas_kind: "post",
      spec: generateTemplate("diwali", 0, "post"),
      headline: "Happy Diwali",
      subheadline: "s",
      offer_text: "o",
      cta_text: "c",
      sent_at: "2026-10-20",
      seen_at: null,
      is_published: true,
      is_saved: false,
    };
    const sparse = { ...full, template_id: "t2", mfr_logo_path: null, mfr_phone: null, mfr_email: null };
    h.rpc.mockResolvedValue({ data: [full, sparse], error: null });
    h.createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed/logo.png" }, error: null });

    const out = await api.listReceivedTemplates();

    expect(h.rpc).toHaveBeenCalledWith("list_received_templates");
    expect(out[0]!.manufacturer).toMatchObject({
      businessName: "Jyoti Appliances",
      phone: "+91 98000 00000",
      email: "brand@jyoti.in",
      logoUrl: "https://signed/logo.png",
    });
    // The sparse row must not gain empty phone/email/logoUrl keys at all.
    expect(out[1]!.manufacturer.phone).toBeUndefined();
    expect(out[1]!.manufacturer.email).toBeUndefined();
    expect(out[1]!.manufacturer.logoUrl).toBeUndefined();
    expect("phone" in out[1]!.manufacturer).toBe(false);
  });
});

describe("getSendTargets", () => {
  it("keeps only active retailers with a user id", async () => {
    h.rpc.mockResolvedValue({
      data: [
        { retailer_user_id: "r1", business_name: "Sharma Electronics", city: "Jaipur", record_type: "retailer", status: "active" },
        { retailer_user_id: "r2", business_name: "Gone", city: null, record_type: "retailer", status: "revoked" },
        { retailer_user_id: null, business_name: "Broken", city: null, record_type: "retailer", status: "active" },
        { retailer_user_id: "m9", business_name: "Mfr", city: null, record_type: "manufacturer", status: "active" },
      ],
      error: null,
    });

    const out = await api.getSendTargets();
    expect(h.rpc).toHaveBeenCalledWith("get_retailer_network");
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ retailerUserId: "r1", businessName: "Sharma Electronics", city: "Jaipur" });
  });
});

describe("write RPCs", () => {
  const draft: TemplateDraft = {
    templateId: null,
    categoryKey: "diwali",
    canvasKind: "post",
    title: "Diwali post",
    layoutId: "layout-a",
    paletteId: "diwaliGold",
    variant: 0,
    headline: "Happy Diwali",
    subheadline: "s",
    offerText: "o",
    ctaText: "c",
    spec: generateTemplate("diwali", 0, "post"),
  };

  it("send returns the recipient count and passes the right args", async () => {
    h.rpc.mockResolvedValue({ data: 4, error: null });
    const n = await api.sendDesignerTemplate("t1", ["a", "b"]);
    expect(n).toBe(4);
    expect(h.rpc).toHaveBeenCalledWith("send_designer_template", {
      p_template_id: "t1",
      p_retailer_ids: ["a", "b"],
    });
  });

  it("create-and-send merges the retailer ids with the draft args", async () => {
    h.rpc.mockResolvedValue({ data: "new-id", error: null });
    const id = await api.createAndSend(draft, ["x"]);
    expect(id).toBe("new-id");
    const [name, args] = h.rpc.mock.calls[0]!;
    expect(name).toBe("create_and_send_designer_template");
    expect(args).toMatchObject({ p_retailer_ids: ["x"], p_category_key: "diwali", p_spec: draft.spec });
  });

  it("publish resolves on success and rejects on error", async () => {
    h.rpc.mockResolvedValue({ error: null });
    await expect(api.publishDesignerTemplate("t1", true)).resolves.toBeUndefined();

    h.rpc.mockResolvedValue({ error: new Error("not owner") });
    await expect(api.publishDesignerTemplate("t1", false)).rejects.toThrow("not owner");
  });

  it("records a download against the template + canvas", async () => {
    h.rpc.mockResolvedValue({ error: null });
    await api.recordDownload("t1", "story");
    expect(h.rpc).toHaveBeenCalledWith("record_designer_template_download", {
      p_template_id: "t1",
      p_canvas_kind: "story",
    });
  });
});

describe("retailer saved + delete table writes", () => {
  it("inserts a bookmark row for the signed-in retailer", async () => {
    h.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    let last: ReturnType<typeof makeChain> | null = null;
    h.from.mockImplementation(() => {
      last = makeChain({ error: null });
      return last;
    });

    await api.toggleSaved("t1", true);
    expect(last!.calls.some((c) => c.name === "insert" && JSON.stringify(c.args[0]) === JSON.stringify({ retailer_user_id: "u1", template_id: "t1" }))).toBe(true);
  });

  it("rejects a bookmark when there is no signed-in user", async () => {
    h.getUser.mockResolvedValue({ data: { user: null } });
    await expect(api.toggleSaved("t1", true)).rejects.toThrow(/signed in/);
  });

  it("deletes via an id-scoped delete", async () => {
    h.from.mockImplementation(() => makeChain({ error: null }));
    await api.deleteDesignerTemplate("t9");
    const chain = h.from.mock.results[0]!.value as ReturnType<typeof makeChain>;
    expect(chain.calls.some((c) => c.name === "delete")).toBe(true);
    expect(chain.calls.some((c) => c.name === "eq" && c.args[0] === "id" && c.args[1] === "t9")).toBe(true);
  });
});

describe("brandFromProfile + buildDraft", () => {
  it("omits absent optional brand fields and falls back email -> business_email", () => {
    const brand = brandFromProfile({
      business_name: "Sharma Electronics",
      email: "owner@sharma.in",
      business_email: "",
      contact_number: "+91 90000 00000",
    } as never);
    expect(brand).toEqual({
      businessName: "Sharma Electronics",
      email: "owner@sharma.in",
      phone: "+91 90000 00000",
    });
    expect("address" in brand).toBe(false);
    expect("logoUrl" in brand).toBe(false);
  });

  it("returns an empty brand for a null profile", () => {
    expect(brandFromProfile(null)).toEqual({ businessName: "" });
  });

  it("builds a draft that mirrors the spec's authored copy", () => {
    const spec = generateTemplate("diwali", 0, "post");
    const draft = buildDraft({ templateId: "abc", spec, title: "My Diwali" });
    expect(draft.templateId).toBe("abc");
    expect(draft.categoryKey).toBe(spec.categoryKey);
    expect(draft.canvasKind).toBe(spec.canvas.kind);
    expect(draft.paletteId).toBe(spec.palette.id);
    expect(draft.layoutId).toBe(spec.layoutId);
    expect(draft.headline).toBe(spec.blocks.find((b) => b.role === "headline")?.defaultText);
    expect(draft.spec).toBe(spec);
  });
});
