/**
 * Reusable add / edit product form.
 *
 * One component serves both flows: opening it with a `productId` loads the
 * saved product (including photo order and cover) through the same detail RPC
 * the detail view uses, so editing always starts from server truth.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ProductPhotoManager } from "@/components/ProductPhotoManager";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  EMPTY_PRODUCT_FORM,
  formFromProduct,
  validateProductForm,
  type PhotoUploadState,
  type ProductCategory,
  type ProductFormErrors,
  type ProductFormValues,
} from "@/lib/productCatalog";
import { useProductDetail, useSaveProduct } from "@/lib/productQueries";

const NEW_CATEGORY = "__new__";

export function ProductFormDialog({
  open,
  productId,
  userId,
  categories,
  categoriesLoading,
  onOpenChange,
}: {
  open: boolean;
  productId: string | null;
  userId: string | null;
  categories: ProductCategory[];
  categoriesLoading: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [values, setValues] = useState<ProductFormValues>(EMPTY_PRODUCT_FORM);
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [categoryMode, setCategoryMode] = useState<"existing" | "new">("existing");
  const [progress, setProgress] = useState<PhotoUploadState | null>(null);
  const saveProduct = useSaveProduct(userId);
  const detail = useProductDetail(productId, open && Boolean(productId));
  const inFlight = useRef(false);

  useEffect(() => {
    if (!open) {
      setValues(EMPTY_PRODUCT_FORM);
      setErrors({});
      setProgress(null);
      setCategoryMode("existing");
      return;
    }
    if (productId && detail.data) {
      setValues(formFromProduct(detail.data));
      setCategoryMode(detail.data.categoryName ? "new" : "existing");
    }
  }, [detail.data, open, productId]);

  useEffect(() => {
    if (open && productId && detail.error)
      toast.error(detail.error.message || "This product could not be loaded for editing.");
  }, [detail.error, open, productId]);

  const patch = (next: Partial<ProductFormValues>) =>
    setValues((current) => ({ ...current, ...next }));

  const clearError = (field: keyof ProductFormErrors) =>
    setErrors((current) => {
      if (current[field] === undefined) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });

  /** Every text field fed here shares its name with a ProductFormErrors key. */
  const update = (field: keyof ProductFormErrors, value: string) => {
    patch({ [field]: value } as Partial<ProductFormValues>);
    clearError(field);
  };

  const categoryValue = values.category.trim();
  const knownCategory = useMemo(
    () => categories.some((item) => item.name.toLowerCase() === categoryValue.toLowerCase()),
    [categories, categoryValue],
  );

  const submitting = saveProduct.isPending;

  const submit = async () => {
    if (inFlight.current) return;
    const nextErrors = validateProductForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      toast.error(Object.values(nextErrors)[0] ?? "Fix the highlighted fields.");
      return;
    }
    if (!userId) {
      toast.error("Sign in as a manufacturer before saving a product.");
      return;
    }
    inFlight.current = true;
    setProgress(null);
    try {
      const outcome = await saveProduct.mutateAsync({
        values,
        onProgress: (state) => setProgress(state),
      });
      for (const warning of outcome.photoWarnings) toast.warning(warning);
      toast.success(
        values.id ? "Product updated. Retailers see it in their catalog." : "Product added to your catalog.",
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The product could not be saved.");
    } finally {
      inFlight.current = false;
      setProgress(null);
    }
  };

  const loadingDetail = Boolean(productId) && detail.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (inFlight.current) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{productId ? "Edit product" : "Add product"}</DialogTitle>
          <DialogDescription>
            Everything here is saved to your manufacturer account. The same code, SKU or model
            number cannot be used twice in your catalog.
          </DialogDescription>
        </DialogHeader>

        {loadingDetail ? (
          <div role="status" className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Loading product...
          </div>
        ) : (
          <form
            noValidate
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <fieldset disabled={submitting} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  id="product-name"
                  label="Product name"
                  required
                  maxLength={200}
                  value={values.name}
                  error={errors.name}
                  onChange={(value) => update("name", value)}
                />
                <TextField
                  id="product-code"
                  label="Product code / SKU / model number"
                  required
                  maxLength={80}
                  value={values.code}
                  error={errors.code}
                  hint="Unique in your catalog and searchable."
                  onChange={(value) => update("code", value)}
                />
                <TextField
                  id="product-sku"
                  label="Store SKU (optional)"
                  maxLength={80}
                  value={values.sku}
                  error={errors.sku}
                  onChange={(value) => update("sku", value)}
                />
                <TextField
                  id="product-model"
                  label="Model number (optional)"
                  maxLength={80}
                  value={values.modelNumber}
                  error={errors.modelNumber}
                  onChange={(value) => update("modelNumber", value)}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="product-price">Price (₹ INR)</Label>
                  <Input
                    id="product-price"
                    inputMode="decimal"
                    required
                    placeholder="1299.00"
                    value={values.price}
                    aria-invalid={Boolean(errors.price)}
                    onChange={(event) => update("price", event.target.value)}
                  />
                  <FieldError error={errors.price} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="product-category">Category</Label>
                  <Select
                    value={
                      categoryMode === "new" || (categoryValue && !knownCategory)
                        ? NEW_CATEGORY
                        : categoryValue
                    }
                    onValueChange={(next) => {
                      if (next === NEW_CATEGORY) {
                        setCategoryMode("new");
                        patch({ category: knownCategory ? categoryValue : "" });
                        return;
                      }
                      setCategoryMode("existing");
                      update("category", next);
                    }}
                  >
                    <SelectTrigger id="product-category">
                      <SelectValue
                        placeholder={categoriesLoading ? "Loading categories..." : "Choose a category"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name} ({category.productCount})
                        </SelectItem>
                      ))}
                      <SelectItem value={NEW_CATEGORY}>+ Create a new category</SelectItem>
                    </SelectContent>
                  </Select>
                  {(categoryMode === "new" || (categoryValue !== "" && !knownCategory)) && (
                    <Input
                      aria-label="New category name"
                      placeholder="New category name"
                      maxLength={80}
                      value={values.category}
                      onChange={(event) => update("category", event.target.value)}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Pick an existing category or type a new one — it is created on save.
                  </p>
                  <FieldError error={errors.category} />
                </div>
                <TextField
                  id="product-warranty"
                  label="Warranty (optional)"
                  maxLength={120}
                  placeholder="1 year manufacturer warranty"
                  value={values.warranty}
                  error={errors.warranty}
                  onChange={(value) => update("warranty", value)}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="product-availability">Availability</Label>
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <Switch
                      id="product-availability"
                      checked={values.inStock}
                      onCheckedChange={(checked) => patch({ inStock: checked })}
                    />
                    <span className="text-sm font-medium">
                      {values.inStock ? "In stock" : "Out of stock"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product-description">Description</Label>
                <Textarea
                  id="product-description"
                  rows={4}
                  maxLength={4000}
                  value={values.description}
                  aria-invalid={Boolean(errors.description)}
                  onChange={(event) => update("description", event.target.value)}
                />
                <FieldError error={errors.description} />
              </div>

              <SpecificationsEditor
                values={values.specifications}
                error={errors.specifications}
                onChange={(specifications) => {
                  patch({ specifications });
                  clearError("specifications");
                }}
              />

              <div className="space-y-1.5">
                <Label htmlFor="product-photos">Product photos</Label>
                <ProductPhotoManager
                  values={values}
                  disabled={submitting}
                  progress={progress}
                  onChange={patch}
                />
                <FieldError error={errors.photos} />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="bg-gradient-primary">
                  {submitting ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : productId ? (
                    "Save changes"
                  ) : (
                    "Add product"
                  )}
                </Button>
              </DialogFooter>
            </fieldset>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TextField({
  id,
  label,
  value,
  error,
  hint,
  required,
  maxLength,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string | undefined;
  hint?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError error={error} />
    </div>
  );
}

function FieldError({ error }: { error?: string | undefined }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {error}
    </p>
  );
}

function SpecificationsEditor({
  values,
  error,
  onChange,
}: {
  values: ProductFormValues["specifications"];
  error?: string | undefined;
  onChange: (values: ProductFormValues["specifications"]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>Specifications (key / value)</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...values, { label: "", value: "" }])}
        >
          <Plus className="h-4 w-4" /> Add specification
        </Button>
      </div>
      {values.length === 0 ? (
        <p className="rounded-lg border border-dashed border-input p-3 text-xs text-muted-foreground">
          Add model, dimensions, material, capacity, power, size or any other specification.
        </p>
      ) : (
        <div className="space-y-2">
          {values.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                aria-label={`Specification ${index + 1} name`}
                placeholder="e.g. Capacity"
                maxLength={60}
                value={item.label}
                onChange={(event) =>
                  onChange(
                    values.map((row, i) => (i === index ? { ...row, label: event.target.value } : row)),
                  )
                }
              />
              <Input
                aria-label={`Specification ${index + 1} value`}
                placeholder="e.g. 7 kg"
                maxLength={200}
                value={item.value}
                onChange={(event) =>
                  onChange(
                    values.map((row, i) => (i === index ? { ...row, value: event.target.value } : row)),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove specification ${index + 1}`}
                onClick={() => onChange(values.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <FieldError error={error} />
    </div>
  );
}
