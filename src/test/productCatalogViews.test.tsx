import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProductCatalogViews } from "@/components/ProductCatalogViews";
import type { ProductSummary } from "@/lib/productCatalog";

const product: ProductSummary = {
  id: "p-1",
  name: "Mixie Grinder 750W",
  code: "MIX-750",
  sku: "SKU-1",
  modelNumber: "X200",
  price: 4299.5,
  categoryId: "c-1",
  categoryName: "Kitchen",
  description: "",
  specifications: [],
  warranty: "1 year",
  inStock: false,
  manufacturerUserId: "m-1",
  manufacturerName: "Jyoti Appliances",
  createdAt: "2026-10-01",
  updatedAt: "2026-10-02",
  imagePaths: ["m-1/products/a.png", "m-1/products/b.png"],
  photoUrls: ["https://signed/a.png", "https://signed/b.png"],
};

describe("ProductCatalogViews", () => {
  it("shows price, code, category, availability and photo count as cards", () => {
    render(<ProductCatalogViews mode="grid" products={[product]} onSelect={vi.fn()} />);

    expect(screen.getByText("Mixie Grinder 750W")).toBeInTheDocument();
    expect(screen.getByText(/MIX-750/)).toBeInTheDocument();
    expect(screen.getByText(/₹4,299\.50/)).toBeInTheDocument();
    expect(screen.getByText(/Kitchen · Jyoti Appliances/)).toBeInTheDocument();
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
    expect(screen.getByLabelText("View Mixie Grinder 750W")).toBeInTheDocument();
    expect(screen.getByAltText("Mixie Grinder 750W")).toHaveAttribute("src", "https://signed/a.png");
  });

  it("renders the same rows in table mode", () => {
    render(<ProductCatalogViews mode="table" products={[product]} onSelect={vi.fn()} />);

    expect(screen.getByRole("columnheader", { name: "Code / SKU" })).toBeInTheDocument();
    expect(screen.getByText(/SKU-1/)).toBeInTheDocument();
    expect(screen.getByText(/model X200/)).toBeInTheDocument();
  });

  it("keeps the retailer view read-only: no write controls without actions", () => {
    const onSelect = vi.fn();
    render(<ProductCatalogViews mode="grid" products={[product]} onSelect={onSelect} />);

    expect(screen.queryByRole("button", { name: /^Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Delete/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("View Mixie Grinder 750W"));
    expect(onSelect).toHaveBeenCalledWith(product);
  });

  it("surfaces manufacturer actions when they are supplied", () => {
    render(
      <ProductCatalogViews
        mode="grid"
        products={[product]}
        onSelect={vi.fn()}
        actions={(item) => (
          <>
            <button onClick={() => undefined}>Edit {item.name}</button>
            <button onClick={() => undefined}>Delete {item.name}</button>
          </>
        )}
      />,
    );

    expect(screen.getByRole("button", { name: "Edit Mixie Grinder 750W" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Mixie Grinder 750W" })).toBeInTheDocument();
  });

  it("falls back to a placeholder when a photo could not be signed", () => {
    render(
      <ProductCatalogViews
        mode="grid"
        products={[{ ...product, photoUrls: [null, null] }]}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.queryByAltText("Mixie Grinder 750W")).not.toBeInTheDocument();
    expect(screen.getByText(/MIX-750/)).toBeInTheDocument();
  });
});
