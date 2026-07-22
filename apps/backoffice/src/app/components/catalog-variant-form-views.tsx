"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  buildVariantSkuFromCatalogFields,
  parseProductRequiredSpecs,
  parseVariantAttributes,
  requiredSpecEntriesToRows,
  requiredSpecRowsForVariantEdit,
  VARIANT_SKU_AUTO_HINT,
  type ExistingCatalogProduct,
} from "../../lib/product-existing-catalog";
import {
  createEmptyRequiredSpecRow,
  isColorSpecLabel,
  normalizeRequiredSpecRows,
  requiredSpecRowsToEntries,
  METER_SPEC_LABEL,
  TEMPORARY_MEMORY_SPEC_LABEL,
  type ProductRequiredSpecRow,
} from "../../lib/product-required-specs";
import { CatalogColorSpecSelect } from "./catalog-color-spec-select";
import {
  getProductImageAlt,
  getProductImageUrl,
  toProductMedia,
  type ProductMedia,
  type VariantImageSource,
} from "@itmarket/ui";
import {
  buildVariantSubmitFormData,
  validateSkuVariantFields,
} from "../../lib/product-variant-form";
import { getBackofficeProductDisplayTitle } from "../../lib/product-display-title";
import { getManageableCatalogVariants } from "../../lib/product-storefront-visibility";

type ProductVariant = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  price: string;
  previousPrice?: string | null;
  attributes?: unknown;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  media?: VariantImageSource | null;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  brand: { id: string; name: string } | null;
  requiredSpecs?: unknown;
  variants: ProductVariant[];
  media?: ProductMedia[];
};

export type SkuVariantFormRunFn = <T>(
  action: () => Promise<T>,
  success: string,
  options?: { refresh?: boolean; onSuccess?: (result: T) => void },
) => Promise<T | null>;

export type SkuVariantFormProduct = Product;

export function mapCatalogProductForVariantForms(
  product: Product,
): ExistingCatalogProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    categoryId: "",
    requiredSpecs: parseProductRequiredSpecs(product.requiredSpecs),
    variants: getManageableCatalogVariants(product.variants).map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      status: variant.status,
    })),
  };
}

export function SkuVariantCreateView({
  products,
  existingProducts,
  preselectedProductId,
  canCreateVariant,
  canReceiveStock,
  defaultStockLocationId,
  onCreateVariant,
  onAddVariantMedia,
  onReceiveInitialStock,
  onCreated,
  run,
}: {
  products: Product[];
  existingProducts: ExistingCatalogProduct[];
  preselectedProductId: string | null;
  canCreateVariant: boolean;
  canReceiveStock: boolean;
  defaultStockLocationId: string | null;
  onCreateVariant: (
    productId: string,
    form: FormData,
  ) => Promise<{ id: string } | null | unknown>;
  onAddVariantMedia?: (input: {
    variantId: string;
    file: File;
    altText: string;
  }) => Promise<unknown>;
  onReceiveInitialStock?: (input: {
    variantId: string;
    quantity: number;
  }) => Promise<unknown>;
  onCreated: () => void;
  run: SkuVariantFormRunFn;
}) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [productId, setProductId] = useState(preselectedProductId ?? "");
  const [requiredSpecRows, setRequiredSpecRows] = useState<ProductRequiredSpecRow[]>(
    [],
  );
  const [requiredSpecErrors, setRequiredSpecErrors] = useState<string[]>([]);
  const [variantBarcode, setVariantBarcode] = useState("");
  const [variantPrice, setVariantPrice] = useState("");
  const [variantDiscountedPrice, setVariantDiscountedPrice] = useState("");
  const [variantQuantity, setVariantQuantity] = useState("");
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreviewUrl, setProductImagePreviewUrl] = useState<
    string | null
  >(null);
  const [fieldErrors, setFieldErrors] = useState<
    ReturnType<typeof validateSkuVariantFields>
  >({});

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name, "az")),
    [products],
  );

  const selectedProduct = useMemo(
    () => products.find((entry) => entry.id === productId) ?? null,
    [productId, products],
  );

  const brandName = selectedProduct?.brand?.name ?? "";
  const modelName = selectedProduct?.name ?? "";

  const generatedVariantSku = useMemo(
    () =>
      buildVariantSkuFromCatalogFields({
        brandName,
        modelName,
        requiredSpecEntries: requiredSpecRowsToEntries(requiredSpecRows),
      }),
    [brandName, modelName, requiredSpecRows],
  );

  useEffect(() => {
    if (preselectedProductId !== null && preselectedProductId !== "") {
      setProductId(preselectedProductId);
    }
  }, [preselectedProductId]);

  useEffect(() => {
    if (selectedProduct === null) {
      setRequiredSpecRows([]);
      return;
    }
    setRequiredSpecRows(
      requiredSpecEntriesToRows(
        parseProductRequiredSpecs(selectedProduct.requiredSpecs),
      ),
    );
    setRequiredSpecErrors([]);
  }, [selectedProduct?.id]);

  useEffect(() => {
    if (productImageFile === null) {
      setProductImagePreviewUrl(null);
      return;
    }
    const previewUrl = URL.createObjectURL(productImageFile);
    setProductImagePreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [productImageFile]);

  function addRequiredSpecRow() {
    setRequiredSpecRows((current) => [...current, createEmptyRequiredSpecRow()]);
    setRequiredSpecErrors([]);
  }

  function updateRequiredSpecRow(
    rowId: string,
    patch: Partial<Pick<ProductRequiredSpecRow, "label" | "value" | "colorHex">>,
  ) {
    setRequiredSpecRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    );
    setRequiredSpecErrors([]);
  }

  function removeRequiredSpecRow(rowId: string) {
    setRequiredSpecRows((current) => current.filter((row) => row.id !== rowId));
    setRequiredSpecErrors([]);
  }

  function handleProductImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file === undefined) {
      setProductImageFile(null);
      return;
    }
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(file.type) || file.size > 5_000_000) {
      setProductImageFile(null);
      setFieldErrors((current) => ({
        ...current,
        image: "Yalnız JPEG, PNG və ya WebP (maks. 5 MB) qəbul olunur",
      }));
      event.target.value = "";
      return;
    }
    setProductImageFile(file);
    setFieldErrors((current) => {
      if (current.image === undefined) {
        return current;
      }
      const next = { ...current };
      delete next.image;
      return next;
    });
  }

  async function applyPostCreateExtras(
    targetProductId: string,
    variantResult: unknown,
    displayName: string,
  ): Promise<boolean> {
    const variantId =
      variantResult !== null &&
      typeof variantResult === "object" &&
      "id" in variantResult &&
      typeof (variantResult as { id: unknown }).id === "string"
        ? (variantResult as { id: string }).id
        : null;

    const quantityRaw = variantQuantity.trim();
    if (quantityRaw !== "" && Number(quantityRaw) > 0 && variantId !== null) {
      if (
        onReceiveInitialStock === undefined ||
        !canReceiveStock ||
        defaultStockLocationId === null
      ) {
        return false;
      }
      const receipt = await run(
        () =>
          onReceiveInitialStock({
            variantId,
            quantity: Number(quantityRaw),
          }),
        "Stok sayı anbara yazıldı",
        { refresh: false },
      );
      if (receipt === null) {
        return false;
      }
    }

    if (productImageFile !== null && onAddVariantMedia !== undefined) {
      if (variantId === null) {
        return false;
      }
      const media = await run(
        () =>
          onAddVariantMedia({
            variantId,
            file: productImageFile,
            altText: displayName || "Variant şəkli",
          }),
        "Variant şəkli əlavə edildi",
        { refresh: false },
      );
      if (media === null) {
        return false;
      }
    }

    return true;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreateVariant) {
      return;
    }

    const normalizedRequiredSpecs = normalizeRequiredSpecRows(requiredSpecRows);
    if (normalizedRequiredSpecs.errors.length > 0) {
      setRequiredSpecErrors(normalizedRequiredSpecs.errors);
      return;
    }

    const nextErrors = validateSkuVariantFields({
      productId,
      generatedVariantSku,
      variantPrice,
      variantDiscountedPrice,
      requiredSpecEntries: normalizedRequiredSpecs.entries,
      variantQuantity,
      existingProducts,
      canReceiveStock,
      defaultStockLocationId,
    });

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setRequiredSpecErrors([]);
      return;
    }

    setFieldErrors({});
    setRequiredSpecErrors([]);

    const variantForm = buildVariantSubmitFormData({
      variantSku: generatedVariantSku,
      variantBarcode,
      variantPrice,
      variantDiscountedPrice,
      requiredSpecEntries: normalizedRequiredSpecs.entries,
    });

    void (async () => {
      const variantCreated = await run(
        () => onCreateVariant(productId, variantForm),
        "SKU variant yaradılır",
        { refresh: false },
      );
      if (variantCreated === null) {
        return;
      }
      const extrasSaved = await applyPostCreateExtras(
        productId,
        variantCreated,
        modelName,
      );
      if (!extrasSaved) {
        return;
      }
      await run(async () => undefined, "SKU variant yaradıldı");
      onCreated();
    })();
  }

  if (!canCreateVariant) {
    return (
      <div className="catalog-subcategories-board">
        <p className="catalog-subcategories-note" role="status">
          SKU variant yaratmaq üçün kataloq və qiymət icazəsi lazımdır.
        </p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="catalog-subcategories-board">
        <p className="catalog-subcategories-note" role="status">
          SKU əlavə etmək üçün əvvəlcə kataloqda məhsul yaradın.
        </p>
      </div>
    );
  }

  return (
    <div className="catalog-subcategories-board">
      <form
        ref={formRef}
        id="catalog-sku-variant-form"
        className="catalog-subcategories-form"
        noValidate
        onSubmit={handleSubmit}
      >
        <header className="catalog-subcategories-form__head">
          <div>
            <h2>Yeni SKU variant</h2>
            <p>
              Mövcud məhsul seçin, yaddaş və RAM dəyərlərini daxil edin, SKU
              avtomatik yaranacaq. Mağazada satış üçün aktiv variant yaradılır.
            </p>
          </div>
        </header>

        <div className="catalog-subcategories-form__grid">
          <label
            className={
              fieldErrors.productId !== undefined
                ? "catalog-subcategories-form__field catalog-subcategories-form__field--wide catalog-subcategories-form__field--error"
                : "catalog-subcategories-form__field catalog-subcategories-form__field--wide"
            }
          >
            <span>
              Məhsul{" "}
              <span
                className="catalog-subcategories-form__required"
                aria-hidden="true"
              >
                *
              </span>
            </span>
            <select
              name="productId"
              required
              value={productId}
              aria-invalid={fieldErrors.productId !== undefined}
              onChange={(event) => {
                setProductId(event.target.value);
                setFieldErrors((current) => {
                  if (current.productId === undefined) {
                    return current;
                  }
                  const next = { ...current };
                  delete next.productId;
                  return next;
                });
              }}
            >
              <option value="">Məhsul seçin</option>
              {sortedProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {getBackofficeProductDisplayTitle(product)}
                </option>
              ))}
            </select>
            {fieldErrors.productId !== undefined ? (
              <p
                className="catalog-subcategories-form__field-error"
                role="alert"
              >
                {fieldErrors.productId}
              </p>
            ) : (
              <p className="catalog-subcategories-form__field-hint">
                Yalnız kataloqda olan modellərə SKU əlavə edilir.
              </p>
            )}
          </label>

          <div
            className="catalog-subcategories-form__field catalog-subcategories-form__field--wide catalog-product-required-specs"
            aria-live="polite"
          >
            <span className="catalog-product-required-specs__heading">
              Variant xüsusiyyətləri
            </span>
            <p className="catalog-product-required-specs__intro">
              «Rəng», «Daimi yaddaş», «{TEMPORARY_MEMORY_SPEC_LABEL}», «
              {METER_SPEC_LABEL}», «Port», «PoE+» və «Sürət» SKU və variant
              atributları üçün istifadə olunur.
            </p>
            {requiredSpecRows.length > 0 ? (
              <ul className="catalog-product-required-specs__list">
                {requiredSpecRows.map((row, index) => (
                  <li
                    key={row.id}
                    className="catalog-product-required-specs__item catalog-product-required-specs__item--editable"
                  >
                    <label className="catalog-product-required-specs__field">
                      <span>Başlıq</span>
                      <input
                        value={row.label}
                        maxLength={120}
                        aria-label={`Xüsusiyyət ${index + 1} — başlıq`}
                        onChange={(event) =>
                          updateRequiredSpecRow(row.id, {
                            label: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="catalog-product-required-specs__field">
                      <span>Dəyər</span>
                      {isColorSpecLabel(row.label) ? (
                        <CatalogColorSpecSelect
                          value={row.value}
                          colorHex={row.colorHex}
                          ariaLabel={`Xüsusiyyət ${index + 1} — dəyər`}
                          onChange={(nextValue, details) =>
                            updateRequiredSpecRow(row.id, {
                              value: nextValue,
                              ...(details !== undefined
                                ? { colorHex: details.colorHex }
                                : {}),
                            })
                          }
                        />
                      ) : (
                        <input
                          value={row.value}
                          maxLength={500}
                          aria-label={`Xüsusiyyət ${index + 1} — dəyər`}
                          onChange={(event) =>
                            updateRequiredSpecRow(row.id, {
                              value: event.target.value,
                            })
                          }
                        />
                      )}
                    </label>
                    <button
                      type="button"
                      className="catalog-product-required-specs__remove"
                      onClick={() => removeRequiredSpecRow(row.id)}
                    >
                      Sil
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="catalog-product-required-specs__placeholder">
                Məhsul seçildikdən sonra xüsusiyyətlər yüklənir; lazım olsa sətir
                əlavə edin.
              </p>
            )}
            <button
              type="button"
              className="catalog-product-required-specs__add"
              onClick={addRequiredSpecRow}
            >
              Xüsusiyyət əlavə et
            </button>
            {requiredSpecErrors.length > 0 ? (
              <div className="catalog-product-required-specs__errors" role="alert">
                {requiredSpecErrors.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            ) : null}
            {fieldErrors.storage !== undefined ? (
              <p
                className="catalog-subcategories-form__field-error"
                role="alert"
              >
                {fieldErrors.storage}
              </p>
            ) : null}
          </div>

          <div className="catalog-subcategories-form__field catalog-subcategories-form__field--wide catalog-product-variant-fields">
            <span className="catalog-product-required-specs__heading">
              Satış məlumatları
            </span>
            <div className="catalog-product-variant-fields__media-block">
              <span className="catalog-product-variant-fields__media-label">
                Variant şəkli
              </span>
              <div className="catalog-product-variant-fields__media-preview">
                <img
                  src={
                    productImagePreviewUrl ?? "/images/product-placeholder.svg"
                  }
                  alt={
                    productImagePreviewUrl === null
                      ? "Şəkil seçilməyib"
                      : "Seçilmiş məhsul şəkli"
                  }
                />
              </div>
              <label className="catalog-product-variant-fields__media-upload">
                <span className="catalog-product-variant-fields__media-label">
                  Fayl seçin
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleProductImageChange}
                  aria-invalid={fieldErrors.image !== undefined}
                />
              </label>
              {fieldErrors.image !== undefined ? (
                <p
                  className="catalog-subcategories-form__field-error"
                  role="alert"
                >
                  {fieldErrors.image}
                </p>
              ) : (
                <p className="catalog-product-variant-fields__media-hint">
                  Yalnız bu SKU üçün; storefront-da uyğun rəng/yaddaş seçildikdə
                  göstərilir.
                </p>
              )}
            </div>
            <div className="catalog-product-variant-fields__details">
              <div className="catalog-subcategories-form__pair">
                <label className="catalog-subcategories-form__field catalog-subcategories-form__field--pair">
                  <span>SKU</span>
                  <input
                    value={generatedVariantSku}
                    readOnly
                    aria-label="SKU"
                    aria-readonly="true"
                    placeholder="Məhsul və yaddaş doldurulduqda yaranır"
                    aria-invalid={fieldErrors.sku !== undefined}
                  />
                  {fieldErrors.sku !== undefined ? (
                    <p
                      className="catalog-subcategories-form__field-error"
                      role="alert"
                    >
                      {fieldErrors.sku}
                    </p>
                  ) : (
                    <p className="catalog-product-variant-fields__media-hint">
                      {VARIANT_SKU_AUTO_HINT}
                    </p>
                  )}
                </label>
                <label className="catalog-subcategories-form__field catalog-subcategories-form__field--pair">
                  <span>Barkod</span>
                  <input
                    value={variantBarcode}
                    pattern="[0-9A-Za-z-]{4,64}"
                    placeholder="8690000000000"
                    aria-label="Barkod"
                    onChange={(event) => setVariantBarcode(event.target.value)}
                  />
                </label>
              </div>
              <div className="catalog-subcategories-form__pair">
                <label className="catalog-subcategories-form__field catalog-subcategories-form__field--pair">
                  <span>Cari qiymət (AZN)</span>
                  <input
                    value={variantPrice}
                    inputMode="decimal"
                    required
                    aria-label="Cari qiymət (AZN)"
                    placeholder="0.00"
                    aria-invalid={fieldErrors.price !== undefined}
                    onChange={(event) => {
                      setVariantPrice(event.target.value);
                      setFieldErrors((current) => {
                        if (
                          current.price === undefined &&
                          current.discountedPrice === undefined
                        ) {
                          return current;
                        }
                        const next = { ...current };
                        delete next.price;
                        delete next.discountedPrice;
                        return next;
                      });
                    }}
                  />
                  {fieldErrors.price !== undefined ? (
                    <p
                      className="catalog-subcategories-form__field-error"
                      role="alert"
                    >
                      {fieldErrors.price}
                    </p>
                  ) : null}
                </label>
                <label className="catalog-subcategories-form__field catalog-subcategories-form__field--pair">
                  <span>Endirimli qiymət (AZN)</span>
                  <input
                    value={variantDiscountedPrice}
                    inputMode="decimal"
                    aria-label="Endirimli qiymət (AZN)"
                    placeholder="Endirim yoxdursa boş buraxın"
                    aria-invalid={fieldErrors.discountedPrice !== undefined}
                    onChange={(event) => {
                      setVariantDiscountedPrice(event.target.value);
                      setFieldErrors((current) => {
                        if (current.discountedPrice === undefined) {
                          return current;
                        }
                        const next = { ...current };
                        delete next.discountedPrice;
                        return next;
                      });
                    }}
                  />
                  {fieldErrors.discountedPrice !== undefined ? (
                    <p
                      className="catalog-subcategories-form__field-error"
                      role="alert"
                    >
                      {fieldErrors.discountedPrice}
                    </p>
                  ) : null}
                </label>
              </div>
              <label className="catalog-subcategories-form__field catalog-subcategories-form__field--wide">
                <span>Stok sayı</span>
                <input
                  value={variantQuantity}
                  type="number"
                  min={0}
                  step={1}
                  aria-label="Stok sayı"
                  placeholder="Anbara qəbul olunacaq miqdar"
                  aria-invalid={fieldErrors.quantity !== undefined}
                  onChange={(event) => {
                    setVariantQuantity(event.target.value);
                    setFieldErrors((current) => {
                      if (current.quantity === undefined) {
                        return current;
                      }
                      const next = { ...current };
                      delete next.quantity;
                      return next;
                    });
                  }}
                />
                {fieldErrors.quantity !== undefined ? (
                  <p
                    className="catalog-subcategories-form__field-error"
                    role="alert"
                  >
                    {fieldErrors.quantity}
                  </p>
                ) : (
                  <p className="catalog-product-variant-fields__media-hint">
                    Boş buraxsanız, stok 0 qalır.
                  </p>
                )}
              </label>
            </div>
          </div>
        </div>

        <footer className="catalog-subcategories-form__actions">
          <button type="submit" className="catalog-subcategories-form__submit">
            SKU variant yarat
          </button>
        </footer>
      </form>
    </div>
  );
}

export function SkuVariantEditView({
  variant,
  product,
  existingProducts,
  canEditVariant,
  onUpdateVariant,
  onUpdateVariantPrice,
  onAddVariantMedia,
  onUpdateVariantMedia,
  onSaved,
  run,
}: {
  variant: ProductVariant & { productId: string };
  product: Product;
  existingProducts: ExistingCatalogProduct[];
  canEditVariant: boolean;
  onUpdateVariant: (
    variantId: string,
    form: FormData,
    status: "DRAFT" | "ACTIVE" | "ARCHIVED",
  ) => Promise<unknown>;
  onUpdateVariantPrice: (variantId: string, form: FormData) => Promise<unknown>;
  onAddVariantMedia?: (input: {
    variantId: string;
    file: File;
    altText: string;
  }) => Promise<unknown>;
  onUpdateVariantMedia?: (input: {
    mediaId: string;
    file: File;
    altText: string;
  }) => Promise<unknown>;
  onSaved: () => void;
  run: SkuVariantFormRunFn;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const variantAttributes = useMemo(
    () => parseVariantAttributes(variant.attributes),
    [variant.attributes],
  );
  const [requiredSpecRows, setRequiredSpecRows] = useState<ProductRequiredSpecRow[]>(
    () =>
      requiredSpecRowsForVariantEdit(
        parseProductRequiredSpecs(product.requiredSpecs),
        variantAttributes,
      ),
  );
  const [requiredSpecErrors, setRequiredSpecErrors] = useState<string[]>([]);
  const [variantBarcode, setVariantBarcode] = useState(variant.barcode ?? "");
  const [variantPrice, setVariantPrice] = useState(() => {
    if (variant.previousPrice != null && variant.previousPrice.trim() !== "") {
      return variant.previousPrice;
    }
    return variant.price;
  });
  const [variantDiscountedPrice, setVariantDiscountedPrice] = useState(() => {
    if (variant.previousPrice != null && variant.previousPrice.trim() !== "") {
      return variant.price;
    }
    return "";
  });
  const [fieldErrors, setFieldErrors] = useState<
    ReturnType<typeof validateSkuVariantFields>
  >({});
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreviewUrl, setProductImagePreviewUrl] = useState<
    string | null
  >(null);

  const brandName = product.brand?.name ?? "";
  const modelName = product.name;

  const variantImage = useMemo(
    () => toProductMedia(variant.media ?? null),
    [variant.media],
  );
  const primaryImage = variantImage;
  const existingImageUrl = getProductImageUrl(primaryImage);
  const existingImageAlt = getProductImageAlt(primaryImage, modelName);

  const generatedVariantSku = useMemo(
    () =>
      buildVariantSkuFromCatalogFields({
        brandName,
        modelName,
        requiredSpecEntries: requiredSpecRowsToEntries(requiredSpecRows),
      }),
    [brandName, modelName, requiredSpecRows],
  );

  useEffect(() => {
    if (productImageFile === null) {
      setProductImagePreviewUrl(null);
      return;
    }
    const previewUrl = URL.createObjectURL(productImageFile);
    setProductImagePreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [productImageFile]);

  function addRequiredSpecRow() {
    setRequiredSpecRows((current) => [...current, createEmptyRequiredSpecRow()]);
    setRequiredSpecErrors([]);
  }

  function updateRequiredSpecRow(
    rowId: string,
    patch: Partial<Pick<ProductRequiredSpecRow, "label" | "value" | "colorHex">>,
  ) {
    setRequiredSpecRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    );
    setRequiredSpecErrors([]);
  }

  function removeRequiredSpecRow(rowId: string) {
    setRequiredSpecRows((current) => current.filter((row) => row.id !== rowId));
    setRequiredSpecErrors([]);
  }

  function handleProductImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file === undefined) {
      setProductImageFile(null);
      return;
    }
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(file.type) || file.size > 5_000_000) {
      setProductImageFile(null);
      setFieldErrors((current) => ({
        ...current,
        image: "Yalnız JPEG, PNG və ya WebP (maks. 5 MB) qəbul olunur",
      }));
      event.target.value = "";
      return;
    }
    setProductImageFile(file);
    setFieldErrors((current) => {
      if (current.image === undefined) {
        return current;
      }
      const next = { ...current };
      delete next.image;
      return next;
    });
  }

  async function saveVariantImageIfNeeded(): Promise<boolean> {
    if (productImageFile === null) {
      return true;
    }

    const altText = modelName || "Variant şəkli";

    if (primaryImage !== null && onUpdateVariantMedia !== undefined) {
      const updated = await run(
        () =>
          onUpdateVariantMedia({
            mediaId: primaryImage.id,
            file: productImageFile,
            altText,
          }),
        "Variant şəkli yenilənir",
        { refresh: false },
      );
      return updated !== null;
    }

    if (onAddVariantMedia === undefined) {
      return true;
    }

    const created = await run(
      () =>
        onAddVariantMedia({
          variantId: variant.id,
          file: productImageFile,
          altText,
        }),
      "Variant şəkli əlavə edilir",
      { refresh: false },
    );
    return created !== null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEditVariant) {
      return;
    }

    const normalizedRequiredSpecs = normalizeRequiredSpecRows(requiredSpecRows);
    if (normalizedRequiredSpecs.errors.length > 0) {
      setRequiredSpecErrors(normalizedRequiredSpecs.errors);
      return;
    }

    const nextErrors = validateSkuVariantFields({
      productId: product.id,
      generatedVariantSku,
      variantPrice,
      variantDiscountedPrice,
      requiredSpecEntries: normalizedRequiredSpecs.entries,
      variantQuantity: "",
      existingProducts,
      canReceiveStock: false,
      defaultStockLocationId: null,
      excludeVariantId: variant.id,
    });

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setRequiredSpecErrors([]);
      return;
    }

    setFieldErrors({});
    setRequiredSpecErrors([]);

    const variantForm = buildVariantSubmitFormData({
      variantSku: generatedVariantSku,
      variantBarcode,
      variantPrice,
      variantDiscountedPrice,
      requiredSpecEntries: normalizedRequiredSpecs.entries,
    });

    const variantStatus = variant.status ?? "ACTIVE";

    void (async () => {
      const metadataUpdated = await run(
        () => onUpdateVariant(variant.id, variantForm, variantStatus),
        "SKU variant yenilənir",
        { refresh: false },
      );
      if (metadataUpdated === null) {
        return;
      }

      const priceUpdated = await run(
        () => onUpdateVariantPrice(variant.id, variantForm),
        "Variant qiyməti yenilənir",
        { refresh: false },
      );
      if (priceUpdated === null) {
        return;
      }

      const imageSaved = await saveVariantImageIfNeeded();
      if (!imageSaved) {
        return;
      }

      await run(async () => undefined, "SKU variant yeniləndi");
      onSaved();
    })();
  }

  if (!canEditVariant) {
    return (
      <div className="catalog-subcategories-board">
        <p className="catalog-subcategories-note" role="status">
          SKU variant redaktə etmək üçün kataloq və qiymət icazəsi lazımdır.
        </p>
      </div>
    );
  }

  const displayImageUrl =
    productImagePreviewUrl ?? existingImageUrl ?? "/images/product-placeholder.svg";
  const displayImageAlt =
    productImagePreviewUrl === null ? existingImageAlt : "Seçilmiş məhsul şəkli";
  const productDisplayTitle = getBackofficeProductDisplayTitle(product, variant);

  return (
    <div className="catalog-subcategories-board">
      <form
        ref={formRef}
        className="catalog-subcategories-form"
        noValidate
        onSubmit={handleSubmit}
      >
        <header className="catalog-subcategories-form__head">
          <div>
            <h2>SKU variant redaktə</h2>
            <p>
              {productDisplayTitle} — <strong>{variant.sku}</strong>
            </p>
          </div>
        </header>

        <div className="catalog-subcategories-form__grid">
          <div
            className="catalog-subcategories-form__field catalog-subcategories-form__field--wide catalog-product-required-specs"
            aria-live="polite"
          >
            <span className="catalog-product-required-specs__heading">
              Variant xüsusiyyətləri
            </span>
            <p className="catalog-product-required-specs__intro">
              «Rəng», «Daimi yaddaş», «{TEMPORARY_MEMORY_SPEC_LABEL}», «
              {METER_SPEC_LABEL}», «Port», «PoE+» və «Sürət» SKU və variant
              atributları üçün istifadə olunur.
            </p>
            {requiredSpecRows.length > 0 ? (
              <ul className="catalog-product-required-specs__list">
                {requiredSpecRows.map((row, index) => (
                  <li
                    key={row.id}
                    className="catalog-product-required-specs__item catalog-product-required-specs__item--editable"
                  >
                    <label className="catalog-product-required-specs__field">
                      <span>Başlıq</span>
                      <input
                        value={row.label}
                        maxLength={120}
                        aria-label={`Xüsusiyyət ${index + 1} — başlıq`}
                        onChange={(event) =>
                          updateRequiredSpecRow(row.id, {
                            label: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="catalog-product-required-specs__field">
                      <span>Dəyər</span>
                      {isColorSpecLabel(row.label) ? (
                        <CatalogColorSpecSelect
                          value={row.value}
                          colorHex={row.colorHex}
                          ariaLabel={`Xüsusiyyət ${index + 1} — dəyər`}
                          onChange={(nextValue, details) =>
                            updateRequiredSpecRow(row.id, {
                              value: nextValue,
                              ...(details !== undefined
                                ? { colorHex: details.colorHex }
                                : {}),
                            })
                          }
                        />
                      ) : (
                        <input
                          value={row.value}
                          maxLength={500}
                          aria-label={`Xüsusiyyət ${index + 1} — dəyər`}
                          onChange={(event) =>
                            updateRequiredSpecRow(row.id, {
                              value: event.target.value,
                            })
                          }
                        />
                      )}
                    </label>
                    <button
                      type="button"
                      className="catalog-product-required-specs__remove"
                      onClick={() => removeRequiredSpecRow(row.id)}
                    >
                      Sil
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="catalog-product-required-specs__placeholder">
                Xüsusiyyət sətirləri yoxdur; lazım olsa əlavə edin.
              </p>
            )}
            <button
              type="button"
              className="catalog-product-required-specs__add"
              onClick={addRequiredSpecRow}
            >
              Xüsusiyyət əlavə et
            </button>
            {requiredSpecErrors.length > 0 ? (
              <div className="catalog-product-required-specs__errors" role="alert">
                {requiredSpecErrors.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            ) : null}
            {fieldErrors.storage !== undefined ? (
              <p
                className="catalog-subcategories-form__field-error"
                role="alert"
              >
                {fieldErrors.storage}
              </p>
            ) : null}
          </div>

          <div className="catalog-subcategories-form__field catalog-subcategories-form__field--wide catalog-product-variant-fields">
            <span className="catalog-product-required-specs__heading">
              Satış məlumatları
            </span>
            <div className="catalog-product-variant-fields__media-block">
              <span className="catalog-product-variant-fields__media-label">
                Variant şəkli
              </span>
              <div className="catalog-product-variant-fields__media-preview">
                <img src={displayImageUrl} alt={displayImageAlt} />
              </div>
              <label className="catalog-product-variant-fields__media-upload">
                <span className="catalog-product-variant-fields__media-label">
                  {primaryImage === null ? "Fayl seçin" : "Şəkli dəyişin"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleProductImageChange}
                  aria-invalid={fieldErrors.image !== undefined}
                />
              </label>
              {fieldErrors.image !== undefined ? (
                <p
                  className="catalog-subcategories-form__field-error"
                  role="alert"
                >
                  {fieldErrors.image}
                </p>
              ) : (
                <p className="catalog-product-variant-fields__media-hint">
                  Storefront-da rəng və ya yaddaş seçildikdə bu variantın şəkli
                  göstərilir; boşdursa məhsul səviyyəli şəkil istifadə olunur.
                </p>
              )}
            </div>
            <div className="catalog-product-variant-fields__details">
              <div className="catalog-subcategories-form__pair">
                <label className="catalog-subcategories-form__field catalog-subcategories-form__field--pair">
                  <span>SKU</span>
                  <input
                    value={generatedVariantSku}
                    readOnly
                    aria-label="SKU"
                    aria-readonly="true"
                    placeholder="Xüsusiyyətlər doldurulduqda yaranır"
                    aria-invalid={fieldErrors.sku !== undefined}
                  />
                  {fieldErrors.sku !== undefined ? (
                    <p
                      className="catalog-subcategories-form__field-error"
                      role="alert"
                    >
                      {fieldErrors.sku}
                    </p>
                  ) : (
                    <p className="catalog-product-variant-fields__media-hint">
                      {VARIANT_SKU_AUTO_HINT}
                    </p>
                  )}
                </label>
                <label className="catalog-subcategories-form__field catalog-subcategories-form__field--pair">
                  <span>Barkod</span>
                  <input
                    value={variantBarcode}
                    pattern="[0-9A-Za-z-]{4,64}"
                    placeholder="8690000000000"
                    aria-label="Barkod"
                    onChange={(event) => setVariantBarcode(event.target.value)}
                  />
                </label>
              </div>
              <div className="catalog-subcategories-form__pair">
                <label className="catalog-subcategories-form__field catalog-subcategories-form__field--pair">
                  <span>Cari qiymət (AZN)</span>
                  <input
                    value={variantPrice}
                    inputMode="decimal"
                    required
                    aria-label="Cari qiymət (AZN)"
                    placeholder="0.00"
                    aria-invalid={fieldErrors.price !== undefined}
                    onChange={(event) => {
                      setVariantPrice(event.target.value);
                      setFieldErrors((current) => {
                        if (
                          current.price === undefined &&
                          current.discountedPrice === undefined
                        ) {
                          return current;
                        }
                        const next = { ...current };
                        delete next.price;
                        delete next.discountedPrice;
                        return next;
                      });
                    }}
                  />
                  {fieldErrors.price !== undefined ? (
                    <p
                      className="catalog-subcategories-form__field-error"
                      role="alert"
                    >
                      {fieldErrors.price}
                    </p>
                  ) : null}
                </label>
                <label className="catalog-subcategories-form__field catalog-subcategories-form__field--pair">
                  <span>Endirimli qiymət (AZN)</span>
                  <input
                    value={variantDiscountedPrice}
                    inputMode="decimal"
                    aria-label="Endirimli qiymət (AZN)"
                    placeholder="Endirim yoxdursa boş buraxın"
                    aria-invalid={fieldErrors.discountedPrice !== undefined}
                    onChange={(event) => {
                      setVariantDiscountedPrice(event.target.value);
                      setFieldErrors((current) => {
                        if (current.discountedPrice === undefined) {
                          return current;
                        }
                        const next = { ...current };
                        delete next.discountedPrice;
                        return next;
                      });
                    }}
                  />
                  {fieldErrors.discountedPrice !== undefined ? (
                    <p
                      className="catalog-subcategories-form__field-error"
                      role="alert"
                    >
                      {fieldErrors.discountedPrice}
                    </p>
                  ) : null}
                </label>
              </div>
            </div>
          </div>
        </div>

        <footer className="catalog-subcategories-form__actions">
          <button
            type="button"
            className="catalog-subcategories-form__cancel"
            onClick={onSaved}
          >
            Ləğv et
          </button>
          <button type="submit" className="catalog-subcategories-form__submit">
            Dəyişiklikləri saxla
          </button>
        </footer>
      </form>
    </div>
  );
}
