import { beforeEach, describe, expect, it, vi } from "vitest";

// Mutable, hoisted mock handles so the fake Supabase client can be configured
// per test without touching the real network layer (same pattern as the other
// data-layer tests).
const h = vi.hoisted(() => ({
  rpc: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  createSignedUrls: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: h.rpc,
    storage: {
      from: () => ({
        upload: h.upload,
        remove: h.remove,
        createSignedUrls: h.createSignedUrls,
      }),
    },
  },
  SUPABASE_SETUP_MESSAGE: "",
  isApprovedSupabaseUrl: () => true,
  createGoogleCallbackUrl: () => "",
  startGoogleSignIn: vi.fn(),
}));

import {
  EMPTY_PRODUCT_FORM,
  MAX_PRODUCT_PHOTOS,
  addProductPhoto,
  canCleanUpPhotoUploads,
  deleteProduct,
  formFromProduct,
  getProductDetail,
  listProductCategories,
  listProducts,
  normalizeSpecifications,
  productPhotoPath,
  saveProduct,
  savedRef,
  newRef,
  upsertProduct,
  validatePhotoFile,
  validateProductForm,
  type ProductDetail,
  type ProductFormValues,
} from "@/lib/productCatalog";

const USER = "11111111-1111-4111-8111-111111111111";

function formWith(overrides: Partial<ProductFormValues>): ProductFormValues {
  return { ...EMPTY_PRODUCT_FORM, ...overrides };
}

const validForm = formWith({
  name: "Mixie Grinder 750W",
  code: "MIX-750",
  price: "4299.50",
  category: "Kitchen",
  specifications: [{ label: "Power", value: "750 W" }],
});

function imageFile(name = "photo.png", type = "image/png", size = 1024) {
  return new File([new Uint8Array(size)], name, { type });
}

/** Every RPC the fake client received, with its argument bag. */
function rpcCalls() {
  return h.rpc.mock.calls.map(([fn, args]) => ({
    fn: String(fn),
    args: (args ?? {}) as Record<string, unknown>,
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  h.createSignedUrls.mockImplementation(async (paths: string[]) => ({
    data: paths.map((path) => ({ path, signedUrl: `https://signed/${path}`, error: null })),
    error: null,
  }));
});

describe("validateProductForm", () => {
  it("accepts a complete product", () => {
    expect(validateProductForm(validForm)).toEqual({});
  });

  it("requires name, code and price", () => {
    const errors = validateProductForm(formWith({ name: "", code: "  ", price: "" }));
    expect(errors.name).toMatch(/required/i);
    expect(errors.code).toMatch(/required/i);
    expect(errors.price).toMatch(/required/i);
  });

  it("rejects prices that are not rupee amounts", () => {
    for (const price of ["abc", "10.999", "-5", "1000000000"]) {
      expect(validateProductForm(formWith({ ...validForm, price })).price).toBeTruthy();
    }
    expect(validateProductForm(formWith({ ...validForm, price: "1,299.00" })).price).toBeUndefined();
  });

  it("requires a value for every specification label", () => {
    const errors = validateProductForm(
      formWith({ ...validForm, specifications: [{ label: "Capacity", value: "  " }] }),
    );
    expect(errors.specifications).toMatch(/value/i);
  });

  it("caps photos and demands a complete order", () => {
    const tooMany = formWith({
      ...validForm,
      newPhotos: Array.from({ length: MAX_PRODUCT_PHOTOS + 1 }, () => imageFile()),
    });
    expect(validateProductForm(tooMany).photos).toMatch(/at most/i);

    const missingFromOrder = formWith({
      ...validForm,
      newPhotos: [imageFile("a.png"), imageFile("b.png")],
      photoRefs: [newRef(0)],
    });
    expect(validateProductForm(missingFromOrder).photos).toMatch(/order/i);
  });

  it("surfaces an invalid file type through the photos error", () => {
    const values = formWith({
      ...validForm,
      newPhotos: [imageFile("deck.pdf", "application/pdf")],
      photoRefs: [newRef(0)],
    });
    expect(validateProductForm(values).photos).toMatch(/PNG, JPG or WebP/);
  });
});

describe("validatePhotoFile", () => {
  it("accepts png, jpeg and webp within 5 MB", () => {
    expect(validatePhotoFile(imageFile("a.jpg", "image/jpeg"))).toBeUndefined();
    expect(validatePhotoFile(imageFile("a.webp", "image/webp"))).toBeUndefined();
    expect(validatePhotoFile(imageFile("a.png", "image/png", 6 * 1024 * 1024))).toMatch(/5 MB/);
    expect(validatePhotoFile(imageFile("a.txt", "text/plain"))).toMatch(/PNG, JPG/);
  });
});

describe("productPhotoPath", () => {
  it("places objects under the owner's products folder with the right extension", () => {
    expect(productPhotoPath(USER, imageFile("x.jpg", "image/jpeg"), "abc")).toBe(
      `${USER}/products/abc.jpg`,
    );
    expect(productPhotoPath(USER, imageFile("x.png"), "abc")).toBe(`${USER}/products/abc.png`);
  });
});

describe("normalizeSpecifications", () => {
  it("keeps labelled entries and drops junk", () => {
    expect(
      normalizeSpecifications([
        { label: " Model ", value: " X200 " },
        { label: "", value: "orphan" },
        null,
        "nope",
      ]),
    ).toEqual([{ label: "Model", value: " X200 " }]);
  });
});

describe("upsertProduct", () => {
  it("sends trimmed values and nulls for empty optional fields", async () => {
    h.rpc.mockResolvedValue({ data: "p-1", error: null });
    const id = await upsertProduct(
      formWith({
        ...validForm,
        name: "  Mixie ",
        sku: "  ",
        warranty: "",
        specifications: [{ label: " Power ", value: " 750 W " }, { label: "", value: "" }],
      }),
    );
    expect(id).toBe("p-1");
    const [fn, args] = h.rpc.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(fn).toBe("upsert_product");
    expect(args["p_name"]).toBe("Mixie");
    expect(args["p_code"]).toBe("MIX-750");
    expect(args["p_sku"]).toBeNull();
    expect(args["p_warranty"]).toBeNull();
    expect(args["p_price"]).toBe(4299.5);
    expect(args["p_specifications"]).toEqual([{ label: "Power", value: "750 W" }]);
    expect(args["p_in_stock"]).toBe(true);
  });

  it("turns a duplicate-code violation into a readable message", async () => {
    h.rpc.mockResolvedValue({
      data: null,
      error: {
        code: "23505",
        message: 'duplicate key value violates unique constraint "products_manufacturer_code_key"',
      },
    });
    await expect(upsertProduct(validForm)).rejects.toThrow(/already used/i);
  });

  it("rewrites the RPC's duplicate-code wording into one message", async () => {
    h.rpc.mockResolvedValue({
      data: null,
      error: { code: "23505", message: "You already have a product with the code MIX-750." },
    });
    await expect(upsertProduct(validForm)).rejects.toThrow(
      /That product code is already used in your catalog\./,
    );
  });

  it("leaves a non-code unique violation untouched so it stays diagnosable", async () => {
    h.rpc.mockResolvedValue({
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint \"product_images_storage_path_key\"" },
    });
    await expect(
      addProductPhoto("p-1", `${USER}/products/a.png`),
    ).rejects.toThrow(/storage_path_key/);
  });
});

describe("listProducts", () => {
  it("passes the search term, keeps cover-first order and signs every path", async () => {
    h.rpc.mockResolvedValue({
      data: [
        {
          id: "p-1",
          name: "Mixie",
          code: "MIX-750",
          sku: null,
          model_number: "X200",
          price: "4299.50",
          category_id: "c-1",
          category_name: "Kitchen",
          description: "",
          specifications: [{ label: "Power", value: "750 W" }],
          warranty: null,
          in_stock: true,
          manufacturer_user_id: USER,
          manufacturer_name: "Jyoti Appliances",
          created_at: "2026-10-01",
          updated_at: "2026-10-02",
          primary_image_path: `${USER}/products/cover.png`,
          image_paths: [`${USER}/products/cover.png`, `${USER}/products/second.png`],
        },
      ],
      error: null,
    });

    const products = await listProducts({ search: "  mixie  ", categoryId: null });
    expect(h.rpc).toHaveBeenCalledWith(
      "list_products",
      expect.objectContaining({ p_search: "mixie", p_category_id: null }),
    );
    expect(products[0]?.price).toBe(4299.5);
    expect(products[0]?.imagePaths[0]).toBe(`${USER}/products/cover.png`);
    expect(products[0]?.photoUrls).toEqual([
      `https://signed/${USER}/products/cover.png`,
      `https://signed/${USER}/products/second.png`,
    ]);
  });

  it("reports an RPC failure instead of returning empty data", async () => {
    h.rpc.mockResolvedValue({ data: null, error: { message: "permission denied for table products" } });
    await expect(listProducts({ search: "", categoryId: null })).rejects.toThrow(
      /permission denied/i,
    );
  });
});

describe("getProductDetail", () => {
  it("orders photos by position and attaches signed URLs", async () => {
    h.rpc.mockResolvedValue({
      data: {
        id: "p-1",
        name: "Mixie",
        code: "MIX-750",
        sku: null,
        model_number: null,
        price: 10,
        category_id: null,
        category_name: null,
        description: "",
        specifications: [],
        warranty: null,
        in_stock: false,
        manufacturer_user_id: USER,
        manufacturer_name: "Jyoti",
        created_at: "2026-10-01",
        updated_at: "2026-10-02",
        images: [
          { id: "i-2", storage_path: `${USER}/products/b.png`, position: 1, is_primary: false },
          { id: "i-1", storage_path: `${USER}/products/a.png`, position: 0, is_primary: true },
        ],
      },
      error: null,
    });

    const detail = await getProductDetail("p-1");
    expect(detail.photos.map((photo) => photo.id)).toEqual(["i-1", "i-2"]);
    expect(detail.photos[0]?.url).toBe(`https://signed/${USER}/products/a.png`);
    expect(detail.inStock).toBe(false);
  });
});

describe("listProductCategories", () => {
  it("maps the count to a number", async () => {
    h.rpc.mockResolvedValue({
      data: [{ id: "c-1", name: "Kitchen", product_count: "7" }],
      error: null,
    });
    await expect(listProductCategories()).resolves.toEqual([
      { id: "c-1", name: "Kitchen", productCount: 7 },
    ]);
  });
});

describe("formFromProduct", () => {
  const detail: ProductDetail = {
    id: "p-1",
    name: "Mixie Grinder 750W",
    code: "MIX-750",
    sku: "SKU-1",
    modelNumber: "X200",
    price: 4299.5,
    categoryId: "c-1",
    categoryName: "Kitchen",
    description: "Grinds in seconds.",
    specifications: [{ label: "Power", value: "750 W" }],
    warranty: "1 year",
    inStock: true,
    manufacturerUserId: USER,
    manufacturerName: "Jyoti Appliances",
    createdAt: "2026-10-01",
    updatedAt: "2026-10-02",
    imagePaths: ["u/products/a.png", "u/products/b.png"],
    photos: [
      { id: "i-2", storagePath: "u/products/b.png", position: 1, isPrimary: false, url: "b" },
      { id: "i-1", storagePath: "u/products/a.png", position: 0, isPrimary: true, url: "a" },
    ],
  };

  it("prefills every field plus the saved photo order and cover", () => {
    const values = formFromProduct(detail);
    expect(values.id).toBe("p-1");
    expect(values.name).toBe("Mixie Grinder 750W");
    expect(values.code).toBe("MIX-750");
    expect(values.sku).toBe("SKU-1");
    expect(values.modelNumber).toBe("X200");
    expect(values.price).toBe("4299.5");
    expect(values.category).toBe("Kitchen");
    expect(values.warranty).toBe("1 year");
    expect(values.inStock).toBe(true);
    expect(values.photoRefs).toEqual([savedRef("i-1"), savedRef("i-2")]);
    expect(values.primaryRef).toBe(savedRef("i-1"));
    expect(values.removedPhotoIds).toEqual([]);
    expect(values.newPhotos).toEqual([]);
  });

  it("produces a form that still validates without touching photos", () => {
    expect(validateProductForm(formFromProduct(detail))).toEqual({});
  });
});

describe("canCleanUpPhotoUploads", () => {
  it("only deletes files when the write was confirmed rejected", () => {
    expect(canCleanUpPhotoUploads(false, false)).toBe(true); // never reached the server
    expect(canCleanUpPhotoUploads(true, true)).toBe(true); // confirmed 4xx rejection
    expect(canCleanUpPhotoUploads(true, false)).toBe(false); // ambiguous network outcome
  });
});

describe("saveProduct", () => {
  const progress = vi.fn();

  it("uploads, saves, prunes removed photos, attaches and reorders", async () => {
    h.upload.mockResolvedValue({ error: null });
    h.rpc.mockImplementation(async (fn: string) => {
      if (fn === "upsert_product") return { data: "p-9", error: null };
      if (fn === "add_product_image") return { data: "i-new", error: null };
      return { data: null, error: null };
    });

    const values = formWith({
      ...validForm,
      newPhotos: [imageFile()],
      photoRefs: [newRef(0)],
      primaryRef: newRef(0),
    });
    const outcome = await saveProduct(values, USER, progress, () => "rand-1");

    expect(outcome.productId).toBe("p-9");
    expect(outcome.photoWarnings).toEqual([]);
    expect(h.upload).toHaveBeenCalledWith(`${USER}/products/rand-1.png`, values.newPhotos[0], {
      contentType: "image/png",
      upsert: false,
    });
    const calls = h.rpc.mock.calls.map(([fn]) => fn);
    expect(calls).toEqual(["upsert_product", "add_product_image", "reorder_product_images"]);
    const reorder = rpcCalls().find((call) => call.fn === "reorder_product_images");
    expect(reorder?.args["p_image_ids"]).toEqual(["i-new"]);
    expect(reorder?.args["p_primary_image_id"]).toBe("i-new");
    expect(progress).toHaveBeenCalledWith({ total: 1, completed: 1, current: "" });
  });

  it("deletes removed photos and keeps the remaining order", async () => {
    h.rpc.mockImplementation(async (fn: string) => {
      if (fn === "upsert_product") return { data: "p-9", error: null };
      return { data: null, error: null };
    });
    const kept = { id: "i-2", storagePath: "u/products/b.png", position: 1, isPrimary: false, url: null };
    const values = formWith({
      ...validForm,
      existing: [
        { id: "i-1", storagePath: "u/products/a.png", position: 0, isPrimary: true, url: null },
        kept,
      ],
      removedPhotoIds: ["i-1"],
      photoRefs: [savedRef("i-2")],
      primaryRef: savedRef("i-2"),
    });
    const outcome = await saveProduct(values, USER, progress, () => "rand-x");

    expect(outcome.photoWarnings).toEqual([]);
    const calls = rpcCalls();
    expect(
      calls.some((call) => call.fn === "delete_product_image" && call.args["p_image_id"] === "i-1"),
    ).toBe(true);
    expect(calls.find((call) => call.fn === "reorder_product_images")?.args["p_image_ids"]).toEqual([
      "i-2",
    ]);
  });

  it("cleans up uploads when the save is rejected, and reports why", async () => {
    h.upload.mockResolvedValue({ error: null });
    h.remove.mockResolvedValue({ data: [], error: null });
    h.rpc.mockResolvedValue({ data: null, error: { message: "new row violates row-level security" } });

    const values = formWith({ ...validForm, newPhotos: [imageFile()], photoRefs: [newRef(0)] });
    await expect(saveProduct(values, USER, progress, () => "rand-2")).rejects.toThrow(/row-level/);
    expect(h.remove).toHaveBeenCalledWith([`${USER}/products/rand-2.png`]);
  });

  it("keeps uploaded files when the outcome is ambiguous", async () => {
    h.upload.mockResolvedValue({ error: null });
    h.rpc.mockRejectedValue(new Error("Failed to fetch"));

    const values = formWith({ ...validForm, newPhotos: [imageFile()], photoRefs: [newRef(0)] });
    await expect(saveProduct(values, USER, progress, () => "rand-3")).rejects.toThrow(/Failed to fetch/);
    expect(h.remove).not.toHaveBeenCalled();
  });

  it("reports a photo step that failed after the product was saved", async () => {
    h.upload.mockResolvedValue({ error: null });
    h.rpc.mockImplementation(async (fn: string) => {
      if (fn === "upsert_product") return { data: "p-9", error: null };
      if (fn === "add_product_image")
        return { data: null, error: { message: "photo already attached" } };
      return { data: null, error: null };
    });

    const values = formWith({ ...validForm, newPhotos: [imageFile()], photoRefs: [newRef(0)] });
    const outcome = await saveProduct(values, USER, progress, () => "rand-4");
    expect(outcome.productId).toBe("p-9");
    expect(outcome.photoWarnings).toEqual(["photo already attached"]);
  });

  it("refuses to save an invalid form instead of writing", async () => {
    await expect(
      saveProduct(formWith({ name: "", code: "", price: "" }), USER, progress, () => "r"),
    ).rejects.toThrow(/required/i);
    expect(h.rpc).not.toHaveBeenCalled();
  });
});

describe("deleteProduct / addProductPhoto", () => {
  it("calls the atomic RPCs with the product id", async () => {
    h.rpc.mockResolvedValue({ data: null, error: null });
    await deleteProduct("p-1");
    expect(h.rpc).toHaveBeenCalledWith("delete_product", { p_product_id: "p-1" });

    h.rpc.mockResolvedValue({ data: "i-1", error: null });
    await expect(addProductPhoto("p-1", `${USER}/products/a.png`)).resolves.toBe("i-1");
    expect(h.rpc).toHaveBeenCalledWith("add_product_image", {
      p_product_id: "p-1",
      p_storage_path: `${USER}/products/a.png`,
    });
  });
});
