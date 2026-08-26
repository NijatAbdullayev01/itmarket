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
  buildProductSlugFromCatalogFields,
  buildVariantSkuFromCatalogFields,
  findActiveProductBySlug,
  parseProductRequiredSpecs,
  parseVariantAttributes,
  requiredSpecEntriesToRows,
  requiredSpecRowsForVariantEdit,
  resolveCategorySelection,
  snapshotFromExistingProduct,
  VARIANT_SKU_AUTO_HINT,
  type ExistingCatalogProduct,
} from "../../lib/product-existing-catalog";
import { findExactProductNameMatch, filterProductsByName } from "../../lib/product-name-search";
import {
  buildCategoryHierarchy,
  buildProductUpdateFormData,
  filterAdminCatalogCategories,
  isProductFormSnapshotDirty,
  resolveProductSlug,
  validateProductForm,
  type ProductFieldErrors,
} from "../../lib/product-form";
import {
  applyBulkRequiredSpecEntries,
  BULK_REQUIRED_SPEC_PARSE_ERROR,
  createEmptyRequiredSpecRow,
  getRequiredSpecLabelPlaceholder,
  getRequiredSpecsSectionMessage,
  getRequiredSpecsVariantIntroMessage,
  isColorHexSpecLabel,
  isColorSpecLabel,
  isRequiredSpecsSectionReady,
  normalizeRequiredSpecRows,
  parseBulkRequiredSpecText,
  requiredSpecRowsToEntries,
  type ProductRequiredSpecRow,
} from "../../lib/product-required-specs";
import { resolvePhoneTabletVariantSupport } from "../../lib/phone-tablet-variant-support";
import { CatalogColorSpecSelect } from "./catalog-color-spec-select";
import { CatalogRequiredSpecsBulkPaste } from "./catalog-required-specs-bulk-paste";
import { CatalogMediaGalleryField } from "./catalog-media-gallery-field";
import { CatalogSeoSuggestFields } from "./catalog-seo-suggest-fields";
import {
  catalogGalleryExistingIds,
  catalogGalleryFromExistingMedia,
  catalogGalleryPendingFiles,
  type CatalogGalleryExistingItem,
  type CatalogGalleryItem,
} from "../../lib/catalog-media-gallery";
import {
  type ProductMedia,
  type VariantImageSource,
} from "@itmarket/ui";
import type {
  CatalogSeoSuggestRequestContract,
  CatalogSeoSuggestResponseContract,
} from "@itmarket/contracts";
import { supportsPhoneTabletVariantAttributes } from "@itmarket/contracts";
import {
  buildVariantSubmitFormData,
  followGeneratedSkuUnlessCustomized,
  validateSkuVariantFields,
} from "../../lib/product-variant-form";
import { getBackofficeProductDisplayTitle } from "../../lib/product-display-title";
import { getManageableCatalogVariants } from "../../lib/product-storefront-visibility";
import {
  applyGeneratedProductSeo,
  canBuildProductSeoRequest,
  CATALOG_SEO_SUGGEST_WAIT_MS,
  productSeoNeedsGeneration,
  promiseWithTimeout,
} from "../../lib/catalog-seo-context";

type ProductVariant = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  price: string;
  previousPrice?: string | null;
  attributes?: unknown;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  availableByOrder?: boolean;
  media?: VariantImageSource[] | VariantImageSource | null;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  brand: { id: string; name: string } | null;
  category?: {
    id: string;
    name: string;
    slug?: string;
    parentId?: string | null;
    parentSlug?: string | null;
    parent?: { slug?: string | null; name?: string | null } | null;
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  } | null;
  categoryId?: string;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  requiredSpecs?: unknown;
  variants: ProductVariant[];
  media?: ProductMedia[];
};

type CatalogBrandOption = { id: string; name: string };
type CatalogCategoryOption = {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
};

type ProductMediaMutations = {
  onAddProductMedia?: (input: {
    productId: string;
    file: File;
    altText: string;
    sortOrder?: number;
  }) => Promise<unknown>;
  onUpdateProductMedia?: (input: {
    mediaId: string;
    file?: File;
    altText: string;
    sortOrder?: number;
    objectKey?: string;
    mimeType?: string;
    byteSize?: number;
  }) => Promise<unknown>;
  onRemoveProductMedia?: (mediaId: string) => Promise<unknown>;
};

export type SkuVariantFormRunFn = <T>(
  action: () => Promise<T>,
  success: string,
  options?: {
    refresh?: boolean;
    slices?: readonly ["catalog"];
    onSuccess?: (result: T) => void;
  },
) => Promise<T | null>;

export type SkuVariantFormProduct = Product;

async function persistCatalogGallery(input: {
  items: CatalogGalleryItem[];
  initialExistingIds: Set<string>;
  altText: string;
  run: SkuVariantFormRunFn;
  onAdd?: (file: File, altText: string, sortOrder: number) => Promise<unknown>;
  onUpdate?: (item: CatalogGalleryExistingItem, altText: string, sortOrder: number) => Promise<unknown>;
  onRemove?: (mediaId: string) => Promise<unknown>;
}): Promise<boolean> {
  const currentExistingIds = new Set(catalogGalleryExistingIds(input.items));

  for (const mediaId of input.initialExistingIds) {
    if (currentExistingIds.has(mediaId)) {
      continue;
    }
    if (input.onRemove === undefined) {
      continue;
    }
    const removed = await input.run(
      () => input.onRemove!(mediaId),
      "Şəkil silindi",
      { refresh: false },
    );
    if (removed === null) {
      return false;
    }
  }

  let nextSortOrder = 0;
  for (const item of input.items) {
    if (item.kind === "existing") {
      if (input.onUpdate !== undefined && item.sortOrder !== nextSortOrder) {
        const updated = await input.run(
          () => input.onUpdate!(item, input.altText, nextSortOrder),
          "Şəkil sırası yeniləndi",
          { refresh: false },
        );
        if (updated === null) {
          return false;
        }
      }
      nextSortOrder += 1;
      continue;
    }

    if (input.onAdd === undefined) {
      nextSortOrder += 1;
      continue;
    }
    const created = await input.run(
      () => input.onAdd!(item.file, input.altText, nextSortOrder),
      "Şəkil əlavə edilir",
      { refresh: false },
    );
    if (created === null) {
      return false;
    }
    nextSortOrder += 1;
  }

  return true;
}

export function mapCatalogProductForVariantForms(
  product: Product,
): ExistingCatalogProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    status: product.status,
    brand: product.brand,
    categoryId: product.categoryId ?? product.category?.id ?? "",
    description: product.description ?? null,
    seoTitle: product.seoTitle ?? null,
    seoDescription: product.seoDescription ?? null,
    requiredSpecs: parseProductRequiredSpecs(product.requiredSpecs),
    variants: getManageableCatalogVariants(product.variants).map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      barcode: variant.barcode,
      status: variant.status,
    })),
  };
}

export function SkuVariantCreateView({
  products,
  existingProducts,
  categories = [],
  preselectedProductId,
  canCreateVariant,
  canReceiveStock,
  defaultStockLocationId,
  onCreateVariant,
  onAddVariantMedia,
  onReceiveInitialStock,
  onUpdateProduct,
  suggestSeo,
  onCreated,
  run,
}: {
  products: Product[];
  existingProducts: ExistingCatalogProduct[];
  categories?: Array<{
    id: string;
    name: string;
    slug?: string;
    parentId?: string | null;
  }>;
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
    sortOrder?: number;
  }) => Promise<unknown>;
  onReceiveInitialStock?: (input: {
    variantId: string;
    quantity: number;
  }) => Promise<unknown>;
  onUpdateProduct?: (
    productId: string,
    form: FormData,
    requiredSpecs: { label: string; value: string }[],
  ) => Promise<{ id: string }>;
  suggestSeo?: (
    input: CatalogSeoSuggestRequestContract,
  ) => Promise<CatalogSeoSuggestResponseContract>;
  onCreated: () => void;
  run: SkuVariantFormRunFn;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [productId, setProductId] = useState(preselectedProductId ?? "");
  const [productIdSeed, setProductIdSeed] = useState(preselectedProductId ?? "");
  const [requiredSpecRows, setRequiredSpecRows] = useState<ProductRequiredSpecRow[]>(
    [],
  );
  const [requiredSpecErrors, setRequiredSpecErrors] = useState<string[]>([]);
  const [variantBarcode, setVariantBarcode] = useState("");
  const [variantSku, setVariantSku] = useState("");
  const [lastGeneratedSku, setLastGeneratedSku] = useState<string | null>(null);
  const [variantPrice, setVariantPrice] = useState("");
  const [variantDiscountedPrice, setVariantDiscountedPrice] = useState("");
  const [variantQuantity, setVariantQuantity] = useState("");
  const [availableByOrder, setAvailableByOrder] = useState(false);
  const [variantGalleryItems, setVariantGalleryItems] = useState<
    CatalogGalleryItem[]
  >([]);
  const [fieldErrors, setFieldErrors] = useState<
    ReturnType<typeof validateSkuVariantFields>
  >({});
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [description, setDescription] = useState("");
  const [seoProductIdApplied, setSeoProductIdApplied] = useState("");

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name, "az")),
    [products],
  );
  const [productPickerQuery, setProductPickerQuery] = useState("");
  const [debouncedProductPickerQuery, setDebouncedProductPickerQuery] =
    useState("");

  useEffect(() => {
    const trimmed = productPickerQuery.trim();
    if (trimmed === "") {
      setDebouncedProductPickerQuery("");
      return;
    }
    const timer = window.setTimeout(() => {
      setDebouncedProductPickerQuery(productPickerQuery);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [productPickerQuery]);

  const selectedProduct = useMemo(
    () => products.find((entry) => entry.id === productId) ?? null,
    [productId, products],
  );

  const visiblePickerProducts = useMemo(() => {
    const query = debouncedProductPickerQuery.trim();
    if (query.length > 0) {
      return filterProductsByName(sortedProducts, query, 50);
    }
    if (sortedProducts.length <= 80) {
      return sortedProducts;
    }
    return sortedProducts.slice(0, 80);
  }, [debouncedProductPickerQuery, sortedProducts]);

  const pickerProducts = useMemo(() => {
    if (
      selectedProduct === null ||
      visiblePickerProducts.some((entry) => entry.id === selectedProduct.id)
    ) {
      return visiblePickerProducts;
    }
    return [selectedProduct, ...visiblePickerProducts];
  }, [selectedProduct, visiblePickerProducts]);

  const requiredSpecSourceId = selectedProduct?.id ?? "";
  const [requiredSpecSourceApplied, setRequiredSpecSourceApplied] = useState(
    requiredSpecSourceId,
  );

  if (
    preselectedProductId !== null &&
    preselectedProductId !== "" &&
    productIdSeed !== preselectedProductId
  ) {
    setProductIdSeed(preselectedProductId);
    setProductId(preselectedProductId);
  }

  if (requiredSpecSourceId !== requiredSpecSourceApplied) {
    setRequiredSpecSourceApplied(requiredSpecSourceId);
    if (selectedProduct === null) {
      setRequiredSpecRows([]);
    } else {
      setRequiredSpecRows(
        requiredSpecEntriesToRows(
          parseProductRequiredSpecs(selectedProduct.requiredSpecs),
        ),
      );
    }
    setRequiredSpecErrors([]);
  }

  if (productId !== seoProductIdApplied) {
    setSeoProductIdApplied(productId);
    if (selectedProduct === null) {
      setSeoTitle("");
      setSeoDescription("");
      setDescription("");
    } else {
      setSeoTitle(selectedProduct.seoTitle ?? "");
      setSeoDescription(selectedProduct.seoDescription ?? "");
      setDescription(selectedProduct.description ?? "");
    }
  }

  const brandName = selectedProduct?.brand?.name ?? "";
  const modelName = selectedProduct?.name ?? "";
  const canEditProductSeo =
    onUpdateProduct !== undefined && suggestSeo !== undefined;
  const supportsPhoneTabletVariants = useMemo(
    () =>
      resolvePhoneTabletVariantSupport(
        selectedProduct?.category?.id ?? selectedProduct?.categoryId,
        categories,
        {
          slug: selectedProduct?.category?.slug,
          name: selectedProduct?.category?.name,
          parentSlug:
            selectedProduct?.category?.parentSlug ??
            selectedProduct?.category?.parent?.slug,
        },
      ),
    [categories, selectedProduct],
  );

  const generatedVariantSku = useMemo(
    () =>
      buildVariantSkuFromCatalogFields({
        brandName,
        modelName,
        requiredSpecEntries: requiredSpecRowsToEntries(requiredSpecRows),
        includePhoneTabletVariantAttributes: supportsPhoneTabletVariants,
      }),
    [brandName, modelName, requiredSpecRows, supportsPhoneTabletVariants],
  );
  const nextVariantSku = followGeneratedSkuUnlessCustomized({
    generatedSku: generatedVariantSku,
    currentSku: variantSku,
    lastGeneratedSku,
  });
  if (nextVariantSku.lastGeneratedSku !== lastGeneratedSku) {
    setLastGeneratedSku(nextVariantSku.lastGeneratedSku);
  }
  if (nextVariantSku.sku !== variantSku) {
    setVariantSku(nextVariantSku.sku);
  }

  function addRequiredSpecRow() {
    setRequiredSpecRows((current) => [...current, createEmptyRequiredSpecRow()]);
    setRequiredSpecErrors([]);
  }

  function applyBulkRequiredSpecs(text: string) {
    const parsed = parseBulkRequiredSpecText(text);
    if (parsed.length === 0) {
      return { appliedCount: 0, error: BULK_REQUIRED_SPEC_PARSE_ERROR };
    }

    setRequiredSpecRows((current) =>
      applyBulkRequiredSpecEntries(current, parsed),
    );
    setRequiredSpecErrors([]);
    return {
      appliedCount: parsed.filter((entry) => !isColorHexSpecLabel(entry.label))
        .length,
      error: null,
    };
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

    const pendingFiles = catalogGalleryPendingFiles(variantGalleryItems);
    if (pendingFiles.length > 0 && onAddVariantMedia !== undefined) {
      if (variantId === null) {
        return false;
      }
      const uploaded = await Promise.all(
        pendingFiles.map((file, index) =>
          run(
            () =>
              onAddVariantMedia({
                variantId,
                file,
                altText: displayName || "Variant şəkli",
                sortOrder: index,
              }),
            index === 0 ? "Variant şəkilləri əlavə edildi" : "",
            { refresh: false },
          ),
        ),
      );
      if (uploaded.some((media) => media === null)) {
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
      generatedVariantSku: variantSku,
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
      variantSku,
      variantBarcode,
      variantPrice,
      variantDiscountedPrice,
      requiredSpecEntries: normalizedRequiredSpecs.entries,
      availableByOrder,
      includePhoneTabletVariantAttributes: supportsPhoneTabletVariants,
    });

    void (async () => {
      let nextSeoTitle = seoTitle.trim();
      let nextSeoDescription = seoDescription.trim();
      let nextDescription = description.trim();

      if (
        canEditProductSeo &&
        selectedProduct !== null &&
        suggestSeo !== undefined &&
        canBuildProductSeoRequest({
          modelName: selectedProduct.name,
          brandName: selectedProduct.brand?.name,
        }) &&
        productSeoNeedsGeneration({
          seoTitle: nextSeoTitle,
          seoDescription: nextSeoDescription,
          description: nextDescription,
        })
      ) {
        try {
          const generated = await promiseWithTimeout(
            suggestSeo({
              entityType: "product",
              name: selectedProduct.name.trim(),
              description: nextDescription.length > 0 ? nextDescription : null,
              brandName: selectedProduct.brand?.name ?? null,
              categoryName: selectedProduct.category?.name ?? null,
              specs: normalizedRequiredSpecs.entries,
            }),
            CATALOG_SEO_SUGGEST_WAIT_MS,
          );
          const merged = applyGeneratedProductSeo(
            {
              seoTitle: nextSeoTitle,
              seoDescription: nextSeoDescription,
              description: nextDescription,
            },
            generated,
          );
          nextSeoTitle = merged.seoTitle;
          nextSeoDescription = merged.seoDescription;
          nextDescription = merged.description;
          setSeoTitle(nextSeoTitle);
          setSeoDescription(nextSeoDescription);
          setDescription(nextDescription);
        } catch {
          // SEO generation is best-effort; variant create still proceeds.
        }
      }

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

      if (canEditProductSeo && selectedProduct !== null && onUpdateProduct) {
        const prevSeoTitle = (selectedProduct.seoTitle ?? "").trim();
        const prevSeoDescription = (selectedProduct.seoDescription ?? "").trim();
        const prevDescription = (selectedProduct.description ?? "").trim();
        const seoDirty =
          nextSeoTitle !== prevSeoTitle ||
          nextSeoDescription !== prevSeoDescription ||
          nextDescription !== prevDescription;

        if (seoDirty) {
          const seoForm = new FormData();
          seoForm.set("name", selectedProduct.name);
          seoForm.set("slug", selectedProduct.slug);
          seoForm.set(
            "categoryId",
            selectedProduct.category?.id ?? selectedProduct.categoryId ?? "",
          );
          seoForm.set("brandId", selectedProduct.brand?.id ?? "");
          seoForm.set("seoTitle", nextSeoTitle);
          seoForm.set("seoDescription", nextSeoDescription);
          seoForm.set("description", nextDescription);
          const seoSaved = await run(
            () =>
              onUpdateProduct(
                productId,
                seoForm,
                parseProductRequiredSpecs(selectedProduct.requiredSpecs),
              ),
            "Məhsul SEO yeniləndi",
            { refresh: false },
          );
          if (seoSaved === null) {
            return;
          }
        }
      }

      await run(async () => undefined, "SKU variant yaradıldı", {
        slices: ["catalog"],
      });
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
            {sortedProducts.length > 80 ? (
              <input
                type="search"
                className="catalog-subcategories-form__input"
                value={productPickerQuery}
                onChange={(event) => setProductPickerQuery(event.target.value)}
                placeholder="Ada, SKU və ya barkoda görə axtarın"
                autoComplete="off"
                spellCheck={false}
              />
            ) : null}
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
              {pickerProducts.map((product) => (
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
                {sortedProducts.length > 80
                  ? "Kataloq böyükdür — siyahını daraltmaq üçün ada, SKU və ya barkoda görə axtarın."
                  : "Yalnız kataloqda olan modellərə SKU əlavə edilir."}
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
              {
                getRequiredSpecsVariantIntroMessage({
                  includeInitialVariant: true,
                  supportsPhoneTabletVariantAttributes:
                    supportsPhoneTabletVariants,
                })
              }
            </p>
            <CatalogRequiredSpecsBulkPaste onApply={applyBulkRequiredSpecs} />
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
                        placeholder={getRequiredSpecLabelPlaceholder(
                          supportsPhoneTabletVariants,
                        )}
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

          {canEditProductSeo && selectedProduct !== null && suggestSeo ? (
            <>
              <CatalogSeoSuggestFields
                seoTitle={seoTitle}
                seoDescription={seoDescription}
                onSeoTitleChange={setSeoTitle}
                onSeoDescriptionChange={setSeoDescription}
                pageDescription={description}
                onPageDescriptionChange={setDescription}
                pageDescriptionLabel="Məhsul təsviri"
                pageDescriptionPlaceholder="Vitrin və meta description fallback üçün ətraflı məhsul mətni"
                pageDescriptionHint="Storefront məhsul səhifəsi üçün; dəyişsəniz variant ilə birlikdə yadda saxlanılır."
                pageDescriptionMaxLength={20000}
                pageDescriptionRows={8}
                canSuggest
                suggestSeo={suggestSeo}
                nameFieldLabel="model"
                buildRequest={() => {
                  const trimmedName = selectedProduct.name.trim();
                  if (trimmedName.length === 0) {
                    return null;
                  }
                  return {
                    entityType: "product",
                    name: trimmedName,
                    description,
                    brandName: selectedProduct.brand?.name ?? null,
                    categoryName: selectedProduct.category?.name ?? null,
                    specs: requiredSpecRowsToEntries(requiredSpecRows),
                  };
                }}
                titlePlaceholder="Boş buraxılsa vitrin başlığı istifadə olunur"
                descriptionPlaceholder="Boş buraxılsa məhsul təsviri istifadə olunur"
                titleHint="SEO məhsul səviyyəsindədir — brend, model və xüsusiyyətlərdən qurulur."
                descriptionHint="SKU yaradılarkən məhsul meta məlumatını da yeniləyə bilərsiniz."
              />
            </>
          ) : null}

          <div className="catalog-subcategories-form__field catalog-subcategories-form__field--wide catalog-product-variant-fields">
            <span className="catalog-product-required-specs__heading">
              Satış məlumatları
            </span>
            <CatalogMediaGalleryField
              label="Variant şəkilləri"
              hint="Yalnız bu SKU üçün; storefront-da uyğun rəng/yaddaş seçildikdə göstərilir. Sıra və silmə mümkündür."
              error={fieldErrors.image}
              items={variantGalleryItems}
              onChange={setVariantGalleryItems}
              onErrorChange={(imageError) => {
                setFieldErrors((current) => {
                  if (imageError === undefined) {
                    if (current.image === undefined) {
                      return current;
                    }
                    const next = { ...current };
                    delete next.image;
                    return next;
                  }
                  return { ...current, image: imageError };
                });
              }}
            />
            <div className="catalog-product-variant-fields__details">
              <div className="catalog-subcategories-form__pair">
                <label className="catalog-subcategories-form__field catalog-subcategories-form__field--pair">
                  <span>SKU</span>
                  <input
                    value={variantSku}
                    maxLength={64}
                    spellCheck={false}
                    autoComplete="off"
                    pattern="[A-Z0-9][A-Z0-9._-]{1,63}"
                    aria-label="SKU"
                    placeholder="Məhsul və yaddaş doldurulduqda yaranır"
                    aria-invalid={fieldErrors.sku !== undefined}
                    onChange={(event) => {
                      setVariantSku(
                        event.target.value.toLocaleUpperCase("en-US"),
                      );
                      setFieldErrors((current) => {
                        if (current.sku === undefined) {
                          return current;
                        }
                        const next = { ...current };
                        delete next.sku;
                        return next;
                      });
                    }}
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
              <div className="catalog-subcategories-form__field catalog-subcategories-form__field--wide">
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={availableByOrder}
                    aria-label="Sifarişlə"
                    onChange={(event) =>
                      setAvailableByOrder(event.target.checked)
                    }
                  />
                  <span>Sifarişlə</span>
                </label>
                <p className="catalog-product-variant-fields__media-hint">
                  Stok bitəndə saytda: açıqdırsa «Sifarişlə», bağlıdırsa «Mövcud
                  olanda bildir» görünür.
                </p>
              </div>
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
  brands = [],
  categories = [],
  canEditVariant,
  onUpdateVariant,
  onUpdateVariantPrice,
  onAddProductMedia,
  onUpdateProductMedia,
  onRemoveProductMedia,
  onUpdateProduct,
  suggestSeo,
  onSaved,
  run,
}: {
  variant: ProductVariant & { productId: string };
  product: Product;
  existingProducts: ExistingCatalogProduct[];
  brands?: CatalogBrandOption[];
  categories?: CatalogCategoryOption[];
  canEditVariant: boolean;
  onUpdateVariant: (
    variantId: string,
    form: FormData,
    status: "DRAFT" | "ACTIVE" | "ARCHIVED",
  ) => Promise<unknown>;
  onUpdateVariantPrice: (variantId: string, form: FormData) => Promise<unknown>;
  onUpdateProduct?: (
    productId: string,
    form: FormData,
    requiredSpecs: { label: string; value: string }[],
  ) => Promise<{ id: string }>;
  suggestSeo?: (
    input: CatalogSeoSuggestRequestContract,
  ) => Promise<CatalogSeoSuggestResponseContract>;
  onSaved: () => void;
  run: SkuVariantFormRunFn;
} & ProductMediaMutations) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const variantAttributes = useMemo(
    () => parseVariantAttributes(variant.attributes),
    [variant.attributes],
  );
  const currentCategoryId =
    product.category?.id ?? product.categoryId ?? "";
  const adminCategories = useMemo(
    () =>
      filterAdminCatalogCategories(categories, {
        retainCategoryId: currentCategoryId,
      }),
    [categories, currentCategoryId],
  );
  const { rootCategories, childrenByParentId } = useMemo(
    () => buildCategoryHierarchy(adminCategories),
    [adminCategories],
  );
  const initialCategorySelection = useMemo(
    () => resolveCategorySelection(currentCategoryId, adminCategories),
    [adminCategories, currentCategoryId],
  );
  const initialProductGalleryItems = useMemo(
    () => catalogGalleryFromExistingMedia(product.media ?? []),
    [product.media],
  );
  const [name, setName] = useState(product.name);
  const [slug, setSlug] = useState(product.slug);
  const [brandId, setBrandId] = useState(product.brand?.id ?? "");
  const [parentCategoryId, setParentCategoryId] = useState(
    initialCategorySelection.parentCategoryId,
  );
  const [subcategoryId, setSubcategoryId] = useState(
    initialCategorySelection.subcategoryId,
  );
  const [productFieldErrors, setProductFieldErrors] =
    useState<ProductFieldErrors>({});
  const [productImageError, setProductImageError] = useState<string | undefined>(
    undefined,
  );
  const [productGalleryItems, setProductGalleryItems] = useState<
    CatalogGalleryItem[]
  >(initialProductGalleryItems);
  const [requiredSpecRows, setRequiredSpecRows] = useState<ProductRequiredSpecRow[]>(
    () =>
      requiredSpecRowsForVariantEdit(
        parseProductRequiredSpecs(product.requiredSpecs),
        variantAttributes,
      ),
  );
  const [requiredSpecErrors, setRequiredSpecErrors] = useState<string[]>([]);
  const [variantBarcode, setVariantBarcode] = useState(variant.barcode ?? "");
  const [variantSku, setVariantSku] = useState(variant.sku);
  const [lastGeneratedSku, setLastGeneratedSku] = useState<string | null>(null);
  const [slugIsManual, setSlugIsManual] = useState(
    () =>
      product.slug !==
      buildProductSlugFromCatalogFields({
        brandName: product.brand?.name ?? "",
        modelName: product.name,
      }),
  );
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
  const [availableByOrder, setAvailableByOrder] = useState(
    variant.availableByOrder === true,
  );
  const [fieldErrors, setFieldErrors] = useState<
    ReturnType<typeof validateSkuVariantFields>
  >({});
  const [seoTitle, setSeoTitle] = useState(product.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(
    product.seoDescription ?? "",
  );
  const [description, setDescription] = useState(product.description ?? "");
  const [seoSeed, setSeoSeed] = useState(product.id);
  const [identitySeed, setIdentitySeed] = useState(product.id);

  if (seoSeed !== product.id) {
    setSeoSeed(product.id);
    setSeoTitle(product.seoTitle ?? "");
    setSeoDescription(product.seoDescription ?? "");
    setDescription(product.description ?? "");
  }

  if (identitySeed !== product.id) {
    setIdentitySeed(product.id);
    setName(product.name);
    setSlug(product.slug);
    setBrandId(product.brand?.id ?? "");
    setParentCategoryId(initialCategorySelection.parentCategoryId);
    setSubcategoryId(initialCategorySelection.subcategoryId);
    setProductGalleryItems(initialProductGalleryItems);
    setProductFieldErrors({});
    setSlugIsManual(
      product.slug !==
        buildProductSlugFromCatalogFields({
          brandName: product.brand?.name ?? "",
          modelName: product.name,
        }),
    );
  }

  const sortedBrands = useMemo(
    () =>
      [...brands].sort((left, right) => left.name.localeCompare(right.name, "az")),
    [brands],
  );
  const childCategories = useMemo(() => {
    if (parentCategoryId === "") {
      return [];
    }
    return childrenByParentId.get(parentCategoryId) ?? [];
  }, [childrenByParentId, parentCategoryId]);
  const hasSubcategories = childCategories.length > 0;
  const resolvedCategoryId = hasSubcategories ? subcategoryId : parentCategoryId;
  const selectedBrandName = useMemo(
    () => brands.find((entry) => entry.id === brandId)?.name ?? "",
    [brandId, brands],
  );
  const selectedParentCategory = useMemo(
    () => rootCategories.find((entry) => entry.id === parentCategoryId) ?? null,
    [parentCategoryId, rootCategories],
  );
  const selectedCategory = useMemo(() => {
    if (subcategoryId !== "") {
      return childCategories.find((entry) => entry.id === subcategoryId) ?? null;
    }
    return selectedParentCategory;
  }, [childCategories, selectedParentCategory, subcategoryId]);
  const selectedCategoryName = selectedCategory?.name ?? "";
  const selectedParentCategoryName = selectedParentCategory?.name ?? "";
  const canEditProductFields = onUpdateProduct !== undefined;
  const canEditProductSeo =
    canEditProductFields && suggestSeo !== undefined;
  const canEditRequiredSpecs = isRequiredSpecsSectionReady({
    parentCategoryId,
    hasSubcategories,
    subcategoryId,
  });
  const requiredSpecsMessage = getRequiredSpecsSectionMessage({
    parentCategoryId,
    hasSubcategories,
    subcategoryId,
  });
  const supportsPhoneTabletVariants = useMemo(
    () =>
      supportsPhoneTabletVariantAttributes({
        slug: selectedCategory?.slug ?? selectedParentCategory?.slug ?? "",
        name: selectedCategoryName || selectedParentCategoryName,
        parentSlug:
          subcategoryId !== "" ? (selectedParentCategory?.slug ?? null) : null,
        rootSlug: selectedParentCategory?.slug ?? null,
      }),
    [
      selectedCategory?.slug,
      selectedCategoryName,
      selectedParentCategory?.slug,
      selectedParentCategoryName,
      subcategoryId,
    ],
  );
  const initialProductExistingIds = useMemo(
    () => new Set(catalogGalleryExistingIds(initialProductGalleryItems)),
    [initialProductGalleryItems],
  );
  const manageableVariantCount = useMemo(
    () => getManageableCatalogVariants(product.variants).length,
    [product.variants],
  );

  const generatedVariantSku = useMemo(
    () =>
      buildVariantSkuFromCatalogFields({
        brandName: selectedBrandName,
        modelName: name,
        requiredSpecEntries: requiredSpecRowsToEntries(requiredSpecRows),
        includePhoneTabletVariantAttributes: supportsPhoneTabletVariants,
      }),
    [name, requiredSpecRows, selectedBrandName, supportsPhoneTabletVariants],
  );
  const nextVariantSku = followGeneratedSkuUnlessCustomized({
    generatedSku: generatedVariantSku,
    currentSku: variantSku,
    lastGeneratedSku,
  });
  if (nextVariantSku.lastGeneratedSku !== lastGeneratedSku) {
    setLastGeneratedSku(nextVariantSku.lastGeneratedSku);
  }
  if (nextVariantSku.sku !== variantSku) {
    setVariantSku(nextVariantSku.sku);
  }

  function clearProductFieldError(field: keyof ProductFieldErrors) {
    setProductFieldErrors((current) => {
      if (current[field] === undefined) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function applyNameChange(nextName: string) {
    setName(nextName);
    clearProductFieldError("name");
    if (!slugIsManual) {
      setSlug(
        buildProductSlugFromCatalogFields({
          brandName: selectedBrandName,
          modelName: nextName,
        }),
      );
      clearProductFieldError("slug");
    }
  }

  function applyBrandChange(nextBrandId: string) {
    setBrandId(nextBrandId);
    clearProductFieldError("brandId");
    if (!slugIsManual) {
      const brandName =
        brands.find((entry) => entry.id === nextBrandId)?.name ?? "";
      setSlug(
        buildProductSlugFromCatalogFields({
          brandName,
          modelName: name,
        }),
      );
      clearProductFieldError("slug");
    }
  }

  function handleSlugChange(event: ChangeEvent<HTMLInputElement>) {
    setSlugIsManual(true);
    setSlug(event.target.value);
    clearProductFieldError("slug");
  }

  function addRequiredSpecRow() {
    setRequiredSpecRows((current) => [...current, createEmptyRequiredSpecRow()]);
    setRequiredSpecErrors([]);
  }

  function applyBulkRequiredSpecs(text: string) {
    const parsed = parseBulkRequiredSpecText(text);
    if (parsed.length === 0) {
      return { appliedCount: 0, error: BULK_REQUIRED_SPEC_PARSE_ERROR };
    }

    setRequiredSpecRows((current) =>
      applyBulkRequiredSpecEntries(current, parsed),
    );
    setRequiredSpecErrors([]);
    return {
      appliedCount: parsed.filter((entry) => !isColorHexSpecLabel(entry.label))
        .length,
      error: null,
    };
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

  function focusFirstProductError(errors: ProductFieldErrors) {
    const firstInvalidField = (
      ["brandId", "name", "slug", "categoryId"] as const
    ).find((field) => errors[field] !== undefined);
    if (firstInvalidField === "categoryId") {
      if (parentCategoryId === "") {
        formRef.current
          ?.querySelector<HTMLElement>('[data-product-field="parentCategoryId"]')
          ?.focus({ preventScroll: true });
      } else {
        formRef.current
          ?.querySelector<HTMLElement>('[data-product-field="subcategoryId"]')
          ?.focus({ preventScroll: true });
      }
      return;
    }
    if (firstInvalidField !== undefined) {
      formRef.current
        ?.querySelector<HTMLElement>(`[name="${firstInvalidField}"]`)
        ?.focus({ preventScroll: true });
    }
  }

  async function saveProductGalleryIfNeeded(altText: string): Promise<boolean> {
    return persistCatalogGallery({
      items: productGalleryItems,
      initialExistingIds: initialProductExistingIds,
      altText,
      run,
      onAdd:
        onAddProductMedia === undefined
          ? undefined
          : (file, nextAltText, sortOrder) =>
              onAddProductMedia({
                productId: product.id,
                file,
                altText: nextAltText,
                sortOrder,
              }),
      onUpdate:
        onUpdateProductMedia === undefined
          ? undefined
          : (item, nextAltText, sortOrder) =>
              onUpdateProductMedia({
                mediaId: item.id,
                altText: item.altText || nextAltText,
                sortOrder,
                objectKey: item.objectKey,
                mimeType: item.mimeType,
                byteSize: item.byteSize,
              }),
      onRemove: onRemoveProductMedia,
    });
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

    const resolvedSlug = resolveProductSlug(name, slug, selectedBrandName);
    const productForm = buildProductUpdateFormData({
      name: name.trim(),
      slug: resolvedSlug,
      categoryId: resolvedCategoryId,
      brandId,
      seoTitle: seoTitle.trim(),
      seoDescription: seoDescription.trim(),
      description: description.trim(),
    });

    if (canEditProductFields) {
      const nextProductErrors = validateProductForm(productForm, {
        parentCategoryId,
        hasSubcategories,
        brands,
      });
      const nameConflict = findExactProductNameMatch(
        existingProducts,
        name.trim(),
      );
      if (
        nextProductErrors.name === undefined &&
        nameConflict !== undefined &&
        nameConflict.id !== product.id
      ) {
        nextProductErrors.name = "Bu model artıq kataloqda mövcuddur.";
      }
      const slugConflict = findActiveProductBySlug(
        existingProducts,
        resolvedSlug,
        product.id,
      );
      if (nextProductErrors.slug === undefined && slugConflict !== undefined) {
        nextProductErrors.slug = "Bu slug artıq başqa məhsulda istifadə olunur.";
      }

      if (Object.keys(nextProductErrors).length > 0) {
        setProductFieldErrors(nextProductErrors);
        focusFirstProductError(nextProductErrors);
        return;
      }
    }

    const nextErrors = validateSkuVariantFields({
      productId: product.id,
      generatedVariantSku: variantSku,
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
      setProductFieldErrors({});
      setRequiredSpecErrors([]);
      return;
    }

    setFieldErrors({});
    setProductFieldErrors({});
    setRequiredSpecErrors([]);

    const variantForm = buildVariantSubmitFormData({
      variantSku,
      variantBarcode,
      variantPrice,
      variantDiscountedPrice,
      requiredSpecEntries: normalizedRequiredSpecs.entries,
      availableByOrder,
      includePhoneTabletVariantAttributes: supportsPhoneTabletVariants,
    });

    const variantStatus = variant.status ?? "ACTIVE";
    const displayName = name.trim() || product.name;

    void (async () => {
      let nextSeoTitle = seoTitle.trim();
      let nextSeoDescription = seoDescription.trim();
      let nextDescription = description.trim();

      if (
        canEditProductSeo &&
        suggestSeo !== undefined &&
        canBuildProductSeoRequest({
          modelName: name,
          brandName: selectedBrandName,
        }) &&
        productSeoNeedsGeneration({
          seoTitle: nextSeoTitle,
          seoDescription: nextSeoDescription,
          description: nextDescription,
        })
      ) {
        try {
          const generated = await suggestSeo({
            entityType: "product",
            name: name.trim(),
            description: nextDescription.length > 0 ? nextDescription : null,
            brandName: selectedBrandName.trim() !== "" ? selectedBrandName : null,
            categoryName:
              selectedCategoryName.trim() !== "" ? selectedCategoryName : null,
            parentCategoryName:
              selectedParentCategoryName.trim() !== ""
                ? selectedParentCategoryName
                : null,
            specs: normalizedRequiredSpecs.entries,
          });
          const merged = applyGeneratedProductSeo(
            {
              seoTitle: nextSeoTitle,
              seoDescription: nextSeoDescription,
              description: nextDescription,
            },
            generated,
          );
          nextSeoTitle = merged.seoTitle;
          nextSeoDescription = merged.seoDescription;
          nextDescription = merged.description;
          setSeoTitle(nextSeoTitle);
          setSeoDescription(nextSeoDescription);
          setDescription(nextDescription);
        } catch {
          // SEO generation is best-effort; product/variant update still proceeds.
        }
      }

      if (canEditProductFields && onUpdateProduct !== undefined) {
        const previousSnapshot = snapshotFromExistingProduct({
          id: product.id,
          name: product.name,
          slug: product.slug,
          brand: product.brand,
          categoryId: product.category?.id ?? product.categoryId ?? "",
          description: product.description ?? null,
          seoTitle: product.seoTitle ?? null,
          seoDescription: product.seoDescription ?? null,
          requiredSpecs: parseProductRequiredSpecs(product.requiredSpecs),
        });
        const nextSnapshot = {
          name: displayName,
          slug: resolvedSlug,
          brandId,
          categoryId: resolvedCategoryId,
          description: nextDescription,
          seoTitle: nextSeoTitle,
          seoDescription: nextSeoDescription,
          requiredSpecs: normalizedRequiredSpecs.entries,
        };
        if (isProductFormSnapshotDirty(previousSnapshot, nextSnapshot)) {
          const productFormToSave = buildProductUpdateFormData({
            name: displayName,
            slug: resolvedSlug,
            categoryId: resolvedCategoryId,
            brandId,
            seoTitle: nextSeoTitle,
            seoDescription: nextSeoDescription,
            description: nextDescription,
          });
          const productSaved = await run(
            () =>
              onUpdateProduct(
                product.id,
                productFormToSave,
                normalizedRequiredSpecs.entries,
              ),
            "Məhsul məlumatları yenilənir",
            { refresh: false },
          );
          if (productSaved === null) {
            return;
          }
        }

        const productImagesSaved = await saveProductGalleryIfNeeded(
          displayName || "Məhsul şəkli",
        );
        if (!productImagesSaved) {
          return;
        }
      }

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

      await run(async () => undefined, "Məhsul yeniləndi", {
        slices: ["catalog"],
      });
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

  const productDisplayTitle = getBackofficeProductDisplayTitle(
    {
      ...product,
      name,
      brand:
        brands.find((entry) => entry.id === brandId) ?? product.brand,
    },
    variant,
  );

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
            <h2>Məhsulu düzəliş et</h2>
            <p>
              {productDisplayTitle} — <strong>{variantSku || variant.sku}</strong>
              {" · "}
              {manageableVariantCount > 1
                ? "Brend, model, kateqoriya, slug, təsvir və məhsul şəkilləri bütün variantlara aiddir; SKU, qiymət və variant şəkilləri yalnız bu varianta yazılır."
                : "Brend, model, kateqoriya, şəkillər, xüsusiyyətlər və satış məlumatlarını eyni formada yeniləyə bilərsiniz."}
            </p>
          </div>
        </header>

        <div className="catalog-subcategories-form__grid">
          {canEditProductFields ? (
            <>
              <input type="hidden" name="categoryId" value={resolvedCategoryId} />
              <div className="catalog-subcategories-form__pair">
                <label
                  className={
                    productFieldErrors.brandId !== undefined
                      ? "catalog-subcategories-form__field catalog-subcategories-form__field--pair catalog-subcategories-form__field--error"
                      : "catalog-subcategories-form__field catalog-subcategories-form__field--pair"
                  }
                >
                  <span>
                    Brend{" "}
                    <span
                      className="catalog-subcategories-form__required"
                      aria-hidden="true"
                    >
                      *
                    </span>
                  </span>
                  <select
                    name="brandId"
                    required
                    value={brandId}
                    aria-invalid={productFieldErrors.brandId !== undefined}
                    aria-describedby={
                      productFieldErrors.brandId !== undefined
                        ? `${formId}-brand-error`
                        : `${formId}-brand-hint`
                    }
                    onChange={(event) => applyBrandChange(event.target.value)}
                  >
                    <option value="">Brend seçin</option>
                    {sortedBrands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                  {productFieldErrors.brandId !== undefined ? (
                    <p
                      id={`${formId}-brand-error`}
                      className="catalog-subcategories-form__field-error"
                      role="alert"
                    >
                      {productFieldErrors.brandId}
                    </p>
                  ) : (
                    <p
                      id={`${formId}-brand-hint`}
                      className="catalog-subcategories-form__field-hint"
                    >
                      Brend məhsul kartında göstərilir.
                    </p>
                  )}
                </label>

                <label
                  className={
                    productFieldErrors.name !== undefined
                      ? "catalog-subcategories-form__field catalog-subcategories-form__field--pair catalog-subcategories-form__field--error"
                      : "catalog-subcategories-form__field catalog-subcategories-form__field--pair"
                  }
                >
                  <span>
                    Model{" "}
                    <span
                      className="catalog-subcategories-form__required"
                      aria-hidden="true"
                    >
                      *
                    </span>
                  </span>
                  <input
                    name="name"
                    required
                    value={name}
                    maxLength={200}
                    aria-invalid={productFieldErrors.name !== undefined}
                    aria-describedby={
                      productFieldErrors.name !== undefined
                        ? `${formId}-name-error`
                        : `${formId}-name-hint`
                    }
                    onChange={(event) => applyNameChange(event.target.value)}
                  />
                  {productFieldErrors.name !== undefined ? (
                    <p
                      id={`${formId}-name-error`}
                      className="catalog-subcategories-form__field-error"
                      role="alert"
                    >
                      {productFieldErrors.name}
                    </p>
                  ) : (
                    <p
                      id={`${formId}-name-hint`}
                      className="catalog-subcategories-form__field-hint"
                    >
                      Model adı vitrində və SEO-da istifadə olunur.
                    </p>
                  )}
                </label>
              </div>

              <label
                className={
                  productFieldErrors.slug !== undefined
                    ? "catalog-subcategories-form__field catalog-subcategories-form__field--wide catalog-subcategories-form__field--error"
                    : "catalog-subcategories-form__field catalog-subcategories-form__field--wide"
                }
              >
                <span>Slug</span>
                <input
                  name="slug"
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  value={slug}
                  placeholder="apple-macbook-air-13"
                  aria-invalid={productFieldErrors.slug !== undefined}
                  aria-describedby={
                    productFieldErrors.slug !== undefined
                      ? `${formId}-slug-error`
                      : `${formId}-slug-hint`
                  }
                  onChange={handleSlugChange}
                />
                {productFieldErrors.slug !== undefined ? (
                  <p
                    id={`${formId}-slug-error`}
                    className="catalog-subcategories-form__field-error"
                    role="alert"
                  >
                    {productFieldErrors.slug}
                  </p>
                ) : (
                  <p
                    id={`${formId}-slug-hint`}
                    className="catalog-subcategories-form__field-hint"
                  >
                    Brend və model dəyişəndə avtomatik yenilənir; istəsəniz əl
                    ilə dəyişə bilərsiniz.
                  </p>
                )}
              </label>

              <label
                className={
                  productFieldErrors.categoryId !== undefined
                    ? "catalog-subcategories-form__field catalog-subcategories-form__field--wide catalog-subcategories-form__field--error"
                    : "catalog-subcategories-form__field catalog-subcategories-form__field--wide"
                }
              >
                <span>Əsas kateqoriya</span>
                <select
                  data-product-field="parentCategoryId"
                  required
                  value={parentCategoryId}
                  aria-invalid={productFieldErrors.categoryId !== undefined}
                  aria-describedby={
                    productFieldErrors.categoryId !== undefined
                      ? `${formId}-category-id-error`
                      : undefined
                  }
                  onChange={(event) => {
                    setParentCategoryId(event.target.value);
                    setSubcategoryId("");
                    clearProductFieldError("categoryId");
                  }}
                >
                  <option value="">Kateqoriya seçin</option>
                  {rootCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {productFieldErrors.categoryId !== undefined &&
                parentCategoryId === "" ? (
                  <p
                    id={`${formId}-category-id-error`}
                    className="catalog-subcategories-form__field-error"
                    role="alert"
                  >
                    {productFieldErrors.categoryId}
                  </p>
                ) : null}
              </label>

              {parentCategoryId !== "" && hasSubcategories ? (
                <label
                  className={
                    productFieldErrors.categoryId !== undefined
                      ? "catalog-subcategories-form__field catalog-subcategories-form__field--wide catalog-subcategories-form__field--error"
                      : "catalog-subcategories-form__field catalog-subcategories-form__field--wide"
                  }
                >
                  <span>Alt kateqoriya</span>
                  <select
                    data-product-field="subcategoryId"
                    required
                    value={subcategoryId}
                    aria-invalid={productFieldErrors.categoryId !== undefined}
                    aria-describedby={
                      productFieldErrors.categoryId !== undefined
                        ? `${formId}-category-id-error`
                        : undefined
                    }
                    onChange={(event) => {
                      setSubcategoryId(event.target.value);
                      clearProductFieldError("categoryId");
                    }}
                  >
                    <option value="">Alt kateqoriya seçin</option>
                    {childCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {productFieldErrors.categoryId !== undefined ? (
                    <p
                      id={`${formId}-category-id-error`}
                      className="catalog-subcategories-form__field-error"
                      role="alert"
                    >
                      {productFieldErrors.categoryId}
                    </p>
                  ) : null}
                </label>
              ) : null}

              <div className="catalog-subcategories-form__field catalog-subcategories-form__field--wide">
                <CatalogMediaGalleryField
                  label="Məhsul şəkilləri"
                  hint="Məhsul kartının ümumi şəkilləri. Variant şəkli yoxdursa vitrin bunları göstərir."
                  error={productImageError}
                  items={productGalleryItems}
                  onChange={setProductGalleryItems}
                  onErrorChange={setProductImageError}
                />
              </div>
            </>
          ) : null}

          <div
            className="catalog-subcategories-form__field catalog-subcategories-form__field--wide catalog-product-required-specs"
            aria-live="polite"
          >
            <span className="catalog-product-required-specs__heading">
              Variant xüsusiyyətləri
            </span>
            {canEditRequiredSpecs ? (
              <>
                <p className="catalog-product-required-specs__intro">
                  {
                    getRequiredSpecsVariantIntroMessage({
                      includeInitialVariant: true,
                      supportsPhoneTabletVariantAttributes:
                        supportsPhoneTabletVariants,
                    })
                  }
                </p>
                <CatalogRequiredSpecsBulkPaste onApply={applyBulkRequiredSpecs} />
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
                        placeholder={getRequiredSpecLabelPlaceholder(
                          supportsPhoneTabletVariants,
                        )}
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
              </>
            ) : (
              <p className="catalog-product-required-specs__placeholder">
                {requiredSpecsMessage}
              </p>
            )}
          </div>

          {canEditProductSeo && suggestSeo ? (
            <CatalogSeoSuggestFields
              seoTitle={seoTitle}
              seoDescription={seoDescription}
              onSeoTitleChange={setSeoTitle}
              onSeoDescriptionChange={setSeoDescription}
              pageDescription={description}
              onPageDescriptionChange={setDescription}
              pageDescriptionLabel="Məhsul təsviri"
              pageDescriptionPlaceholder="Vitrin və meta description fallback üçün ətraflı məhsul mətni"
              pageDescriptionHint="Storefront məhsul səhifəsi üçün; dəyişsəniz variant ilə birlikdə yadda saxlanılır."
              pageDescriptionMaxLength={20000}
              pageDescriptionRows={8}
              canSuggest
              suggestSeo={suggestSeo}
              nameFieldLabel="model"
              buildRequest={() => {
                const trimmedName = name.trim();
                if (trimmedName.length === 0) {
                  return null;
                }
                return {
                  entityType: "product",
                  name: trimmedName,
                  description,
                  brandName:
                    selectedBrandName.trim().length > 0
                      ? selectedBrandName
                      : null,
                  categoryName:
                    selectedCategoryName.trim().length > 0
                      ? selectedCategoryName
                      : null,
                  parentCategoryName:
                    selectedParentCategoryName.trim().length > 0
                      ? selectedParentCategoryName
                      : null,
                  specs: requiredSpecRowsToEntries(requiredSpecRows),
                };
              }}
              titlePlaceholder="Boş buraxılsa vitrin başlığı istifadə olunur"
              descriptionPlaceholder="Boş buraxılsa məhsul təsviri istifadə olunur"
              titleHint="SEO məhsul səviyyəsindədir — brend, model və xüsusiyyətlərdən qurulur."
              descriptionHint="Düzəliş edərkən məhsul meta məlumatını da yeniləyə bilərsiniz."
            />
          ) : null}

          <div className="catalog-subcategories-form__field catalog-subcategories-form__field--wide catalog-product-variant-fields">
            <span className="catalog-product-required-specs__heading">
              Satış məlumatları
            </span>
            <div className="catalog-product-variant-fields__details">
              <div className="catalog-subcategories-form__pair">
                <label className="catalog-subcategories-form__field catalog-subcategories-form__field--pair">
                  <span>SKU</span>
                  <input
                    value={variantSku}
                    maxLength={64}
                    spellCheck={false}
                    autoComplete="off"
                    pattern="[A-Z0-9][A-Z0-9._-]{1,63}"
                    aria-label="SKU"
                    placeholder="Xüsusiyyətlər doldurulduqda yaranır"
                    aria-invalid={fieldErrors.sku !== undefined}
                    onChange={(event) => {
                      setVariantSku(
                        event.target.value.toLocaleUpperCase("en-US"),
                      );
                      setFieldErrors((current) => {
                        if (current.sku === undefined) {
                          return current;
                        }
                        const next = { ...current };
                        delete next.sku;
                        return next;
                      });
                    }}
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
              <div className="catalog-subcategories-form__field catalog-subcategories-form__field--wide">
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={availableByOrder}
                    aria-label="Sifarişlə"
                    onChange={(event) =>
                      setAvailableByOrder(event.target.checked)
                    }
                  />
                  <span>Sifarişlə</span>
                </label>
                <p className="catalog-product-variant-fields__media-hint">
                  Stok bitəndə saytda: açıqdırsa «Sifarişlə», bağlıdırsa «Mövcud
                  olanda bildir» görünür.
                </p>
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
