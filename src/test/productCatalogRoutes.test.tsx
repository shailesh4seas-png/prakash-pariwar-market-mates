import type { ComponentType } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionContext } from "@/lib/session-context";
import type { SessionState } from "@/lib/session";
import { Route as ManufacturerCatalogRoute } from "@/routes/manufacturer.catalog";
import { Route as RetailerCatalogRoute } from "@/routes/retailer.catalog";

// These tests mount the real route components, so they cover the wiring the
// pure data-layer and view tests cannot: page -> query hooks -> data layer ->
// Supabase RPC, and which write affordances each role is given.
const h = vi.hoisted(() => ({
  rpc: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  createSignedUrls: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
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
    channel: h.channel,
    removeChannel: h.removeChannel,
  },
  SUPABASE_SETUP_MESSAGE: "",
  isApprovedSupabaseUrl: () => true,
  createGoogleCallbackUrl: () => "",
  startGoogleSignIn: vi.fn(),
}));

const USER = "11111111-1111-4111-8111-111111111111";
const COVER = `${USER}/products/cover.png`;

/** One `list_products` row, exactly as the RPC returns it (snake_case). */
function productRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "p-1",
    name: "Mixie Grinder 750W",
    code: "MIX-750",
    sku: "SKU-1",
    model_number: "X200",
    price: 4299.5,
    category_id: "c-1",
    category_name: "Kitchen",
    description: "Wall mountable mixer grinder.",
    specifications: [{ label: "Power", value: "750 W" }],
    warranty: "2 years",
    in_stock: true,
    manufacturer_user_id: USER,
    manufacturer_name: "Jyoti Appliances",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-02T00:00:00Z",
    primary_image_path: COVER,
    image_paths: [COVER],
    ...overrides,
  };
}

function sessionFor(role: "manufacturer" | "retailer"): SessionState {
  return {
    ready: true,
    user: null,
    activeRole: role,
    activeProfile: null,
    authUser: { id: USER, email: "user@example.com" } as unknown as SessionState["authUser"],
    sessionError: "",
    refreshAuthUser: async () => undefined,
    switchRole: () => true,
    signOut: async () => undefined,
  };
}

function renderCatalogPage(component: ComponentType, role: "manufacturer" | "retailer") {
  const Page = component;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return render(
    <SessionContext.Provider value={sessionFor(role)}>
      <QueryClientProvider client={queryClient}>
        <Page />
      </QueryClientProvider>
    </SessionContext.Provider>,
  );
}

// `Route.options.component` is the same component the router mounts for the
// route, so this exercises the page exactly as it is shipped.
const ManufacturerPage = ManufacturerCatalogRoute.options.component as ComponentType;
const RetailerPage = RetailerCatalogRoute.options.component as ComponentType;

beforeEach(() => {
  h.rpc.mockImplementation(async (fn: string) => {
    if (fn === "list_products") return { data: [productRow()], error: null };
    if (fn === "list_product_categories") {
      return { data: [{ id: "c-1", name: "Kitchen", product_count: 1 }], error: null };
    }
    return { data: null, error: null };
  });
  h.createSignedUrls.mockImplementation((paths: string[]) => ({
    data: paths.map((path) => ({ path, signedUrl: `https://signed/${path}`, error: null })),
    error: null,
  }));
  const chain = { on: vi.fn(() => chain), subscribe: vi.fn(() => chain) };
  h.channel.mockReturnValue(chain);
  h.removeChannel.mockResolvedValue({ channelName: "product-catalog-sync" });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("manufacturer Product Catalog route", () => {
  it("loads the manufacturer's own products through the list RPC", async () => {
    renderCatalogPage(ManufacturerPage, "manufacturer");

    expect(await screen.findByText(/Mixie Grinder 750W/)).toBeInTheDocument();
    expect(screen.getByText(/₹4,299/)).toBeInTheDocument();
    expect(screen.getByText(/Jyoti Appliances/)).toBeInTheDocument();
    expect(h.rpc).toHaveBeenCalledWith("list_products", { p_search: null, p_category_id: null });
    expect(h.rpc).toHaveBeenCalledWith("list_product_categories", {});
  });

  it("shows write affordances and deletes only after confirmation", async () => {
    renderCatalogPage(ManufacturerPage, "manufacturer");
    await screen.findByText(/Mixie Grinder 750W/);

    expect(screen.getByRole("button", { name: /Add product/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Mixie Grinder 750W" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete Mixie Grinder 750W" }));
    // The confirmation gate: nothing is deleted until it is accepted.
    expect(await screen.findByText("Delete this product?")).toBeInTheDocument();
    expect(h.rpc).not.toHaveBeenCalledWith("delete_product", expect.anything());

    fireEvent.click(screen.getByRole("button", { name: "Delete product" }));
    await waitFor(() =>
      expect(h.rpc).toHaveBeenCalledWith("delete_product", { p_product_id: "p-1" }),
    );
  });

  it("debounces search into the RPC instead of querying per keystroke", async () => {
    renderCatalogPage(ManufacturerPage, "manufacturer");
    await screen.findByText(/Mixie Grinder 750W/);
    h.rpc.mockClear();

    fireEvent.change(screen.getByLabelText(/Search products by name/i), {
      target: { value: "mix" },
    });
    // Still typing: no query has been issued for the new term yet.
    expect(h.rpc).not.toHaveBeenCalled();

    await waitFor(
      () => expect(h.rpc).toHaveBeenCalledWith("list_products", { p_search: "mix", p_category_id: null }),
      { timeout: 3000 },
    );
  });

  it("surfaces an RPC failure with a retry rather than an empty catalog", async () => {
    h.rpc.mockImplementation(async (fn: string) => {
      if (fn === "list_products") {
        return { data: null, error: { message: "permission denied for table products" } };
      }
      return { data: null, error: null };
    });
    renderCatalogPage(ManufacturerPage, "manufacturer");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/permission denied/i);
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});

describe("retailer Product Catalog route", () => {
  it("renders the same products read-only, with no write controls", async () => {
    renderCatalogPage(RetailerPage, "retailer");

    expect(await screen.findByText(/Mixie Grinder 750W/)).toBeInTheDocument();
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
    expect(h.rpc).toHaveBeenCalledWith("list_products", { p_search: null, p_category_id: null });

    expect(screen.queryByRole("button", { name: /Add product/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Edit /i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Delete /i })).not.toBeInTheDocument();
    expect(screen.queryByText(/visible to your retailer network/i)).not.toBeInTheDocument();
  });

  it("explains the empty state instead of offering to add a product", async () => {
    h.rpc.mockImplementation(async (fn: string) =>
      fn === "list_products" ? { data: [], error: null } : { data: null, error: null },
    );
    renderCatalogPage(RetailerPage, "retailer");

    expect(
      await screen.findByText(/No products published yet/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add product/i })).not.toBeInTheDocument();
  });
});

describe("catalog realtime subscription", () => {
  it("subscribes on mount and removes the channel on unmount", async () => {
    const { unmount } = renderCatalogPage(ManufacturerPage, "manufacturer");
    await screen.findByText(/Mixie Grinder 750W/);

    expect(h.channel).toHaveBeenCalledWith("product-catalog-sync");
    unmount();
    await waitFor(() => expect(h.removeChannel).toHaveBeenCalled());
  });
});
