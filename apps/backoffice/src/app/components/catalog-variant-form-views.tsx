"use client";

import {
  useId,
  useMemo,
  useRef,
  useState,
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
  getRequiredSpecLabelPlaceholder,
  getRequiredSpecsVariantIntroMessage,
  isColorSpecLabel,
  normalizeRequiredSpecRows,
  requiredSpecRowsToEntries,
  type ProductRequiredSpecRow,
} from "../../lib/product-required-specs";
import { resolvePhoneTabletVariantSupport } from "../../lib/phone-tablet-variant-support";
import { CatalogColorSpecSelect } from "./catalog-color-spec-select";
import { CatalogMediaGalleryField } from "./catalog-media-gallery-field";
import { CatalogSeoSuggestFields } from "./catalog-seo-suggest-fields";
import {
  catalogGalleryExistingIds,
  catalogGalleryFromExistingMedia,
  catalogGalleryPendingFiles,
  type CatalogGalleryItem,
} from "../../lib/catalog-media-gallery";
import {
  toProductMedia,
  type ProductMedia,
  type VariantImageSource,
} from "@itmarket/ui";
import type {
  CatalogSeoSuggestRequestContract,
  CatalogSeoSuggestResponseContract,
} from "@itmarket/contracts";
import {
  buildVariantSubmitFormData,
  validateSkuVariantFields,
} from "../../lib/product-variant-form";
import { getBackofficeProductDisplayTitle } from "../../lib/product-display-title";
import { getManageableCatalogVariants } from "../../lib/product-storefront-visibility";
import {
  applyGeneratedProductSeo,
  canBuildProductSeoRequest,
  productSeoNeedsGeneration,
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

function normalizeVariantMediaList(
  media: VariantImageSource[] | VariantImageSource | null | undefined,
): ProductMedia[] {
  if (media === null || media === undefined) {
    return [];
  }
  const list = Array.isArray(media) ? media : [media];
  return list
    .map((entry) => toProductMedia(entry))
    .filter((entry): entry is ProductMedia => entry !== null)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

type Product = {
  id: string;
  name: string;
  slug: string;
  brand: { id: string; name: string } | null;
  category?: {
    id: string;
    name: string;
    slug?: string;
    parentId?: string | null;
    parentSlug?: string | null;
    parent?: { slug?: string; name?: string } | null;
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
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [productId, setProductId] = useState(preselectedProductId ?? "");
  const [productIdSeed, setProductIdSeed] = useState(preselectedProductId ?? "");
  const [requiredSpecRows, setRequiredSpecRows] = useState<ProductRequiredSpecRow[]>(
    [],
  );
  const [requiredSpecErrors, setRequiredSpecErrors] = useState<string[]>([]);
  const [variantBarcode, setVariantBarcode] = useState("");
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

  const selectedProduct = useMemo(
    () => products.find((entry) => entry.id === productId) ?? null,
    [productId, products],
  );

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
      for (const [index, file] of pendingFiles.entries()) {
        const media = await run(
          () =>
            onAddVariantMedia({
              variantId,
              file,
              altText: displayName || "Variant şəkli",
              sortOrder: index,
            }),
          index === 0
            ? "Variant şəkilləri əlavə edildi"
            : "Variant şəkli əlavə edildi",
          { refresh: false },
        );
        if (media === null) {
          return false;
        }
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
          const generated = await suggestSeo({
            entityType: "product",
            name: selectedProduct.name.trim(),
            description: nextDescription.length > 0 ? nextDescription : null,
            brandName: selectedProduct.brand?.name ?? null,
            categoryName: selectedProduct.category?.name ?? null,
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
              {
                getRequiredSpecsVariantIntroMessage({
                  includeInitialVariant: true,
                  supportsPhoneTabletVariantAttributes:
                    supportsPhoneTabletVariants,
                })
              }
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
  categories = [],
  canEditVariant,
  onUpdateVariant,
  onUpdateVariantPrice,
  onAddVariantMedia,
  onUpdateVariantMedia,
  onRemoveVariantMedia,
  onUpdateProduct,
  suggestSeo,
  onSaved,
  run,
}: {
  variant: ProductVariant & { productId: string };
  product: Product;
  existingProducts: ExistingCatalogProduct[];
  categories?: Array<{
    id: string;
    name: string;
    slug?: string;
    parentId?: string | null;
  }>;
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
    sortOrder?: number;
  }) => Promise<unknown>;
  onUpdateVariantMedia?: (input: {
    mediaId: string;
    file?: File;
    altText: string;
    sortOrder?: number;
    objectKey?: string;
    mimeType?: string;
    byteSize?: number;
  }) => Promise<unknown>;
  onRemoveVariantMedia?: (mediaId: string) => Promise<unknown>;
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
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const variantAttributes = useMemo(
    () => parseVariantAttributes(variant.attributes),
    [variant.attributes],
  );
  const initialGalleryItems = useMemo(
    () =>
      catalogGalleryFromExistingMedia(normalizeVariantMediaList(variant.media)),
    [variant.media],
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
  const [variantSku, setVariantSku] = useState(variant.sku);
  const lastGeneratedSkuRef = useRef<string | null>(null);
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
  const [variantGalleryItems, setVariantGalleryItems] =
    useState<CatalogGalleryItem[]>(initialGalleryItems);
  const [gallerySeed, setGallerySeed] = useState(variant.id);
  const [seoTitle, setSeoTitle] = useState(product.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(
    product.seoDescription ?? "",
  );
  const [description, setDescription] = useState(product.description ?? "");
  const [seoSeed, setSeoSeed] = useState(product.id);

  if (gallerySeed !== variant.id) {
    setGallerySeed(variant.id);
    setVariantGalleryItems(initialGalleryItems);
  }

  if (seoSeed !== product.id) {
    setSeoSeed(product.id);
    setSeoTitle(product.seoTitle ?? "");
    setSeoDescription(product.seoDescription ?? "");
    setDescription(product.description ?? "");
  }

  const brandName = product.brand?.name ?? "";
  const modelName = product.name;
  const canEditProductFields = onUpdateProduct !== undefined;
  const canEditProductSeo =
    canEditProductFields && suggestSeo !== undefined;
  const supportsPhoneTabletVariants = useMemo(
    () =>
      resolvePhoneTabletVariantSupport(
        product.category?.id ?? product.categoryId,
        categories,
        {
          slug: product.category?.slug,
          name: product.category?.name,
          parentSlug:
            product.category?.parentSlug ?? product.category?.parent?.slug,
        },
      ),
    [categories, product],
  );
  const initialExistingIds = useMemo(
    () => new Set(catalogGalleryExistingIds(initialGalleryItems)),
    [initialGalleryItems],
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

  if (lastGeneratedSkuRef.current === null) {
    lastGeneratedSkuRef.current = generatedVariantSku;
  } else if (lastGeneratedSkuRef.current !== generatedVariantSku) {
    const previousGeneratedSku = lastGeneratedSkuRef.current;
    lastGeneratedSkuRef.current = generatedVariantSku;
    if (
      (variantSku === previousGeneratedSku || variantSku === "") &&
      variantSku !== generatedVariantSku
    ) {
      setVariantSku(generatedVariantSku);
    }
  }

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

  async function saveVariantGalleryIfNeeded(): Promise<boolean> {
    const altText = modelName || "Variant şəkli";
    const currentExistingIds = new Set(
      catalogGalleryExistingIds(variantGalleryItems),
    );

    for (const mediaId of initialExistingIds) {
      if (currentExistingIds.has(mediaId)) {
        continue;
      }
      if (onRemoveVariantMedia === undefined) {
        continue;
      }
      const removed = await run(
        () => onRemoveVariantMedia(mediaId),
        "Variant şəkli silindi",
        { refresh: false },
      );
      if (removed === null) {
        return false;
      }
    }

    let nextSortOrder = 0;
    for (const item of variantGalleryItems) {
      if (item.kind === "existing") {
        if (
          onUpdateVariantMedia !== undefined &&
          item.sortOrder !== nextSortOrder
        ) {
          const updated = await run(
            () =>
              onUpdateVariantMedia({
                mediaId: item.id,
                altText: item.altText || altText,
                sortOrder: nextSortOrder,
                objectKey: item.objectKey,
                mimeType: item.mimeType,
                byteSize: item.byteSize,
              }),
            "Variant şəkil sırası yeniləndi",
            { refresh: false },
          );
          if (updated === null) {
            return false;
          }
        }
        nextSortOrder += 1;
        continue;
      }

      if (onAddVariantMedia === undefined) {
        nextSortOrder += 1;
        continue;
      }
      const created = await run(
        () =>
          onAddVariantMedia({
            variantId: variant.id,
            file: item.file,
            altText,
            sortOrder: nextSortOrder,
          }),
        "Variant şəkli əlavə edilir",
        { refresh: false },
      );
      if (created === null) {
        return false;
      }
      nextSortOrder += 1;
    }

    return true;
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

    const variantStatus = variant.status ?? "ACTIVE";

    void (async () => {
      let nextSeoTitle = seoTitle.trim();
      let nextSeoDescription = seoDescription.trim();
      let nextDescription = description.trim();

      if (
        canEditProductSeo &&
        suggestSeo !== undefined &&
        canBuildProductSeoRequest({
          modelName: product.name,
          brandName: product.brand?.name,
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
            name: product.name.trim(),
            description: nextDescription.length > 0 ? nextDescription : null,
            brandName: product.brand?.name ?? null,
            categoryName: product.category?.name ?? null,
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
          // SEO generation is best-effort; variant update still proceeds.
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

      const imageSaved = await saveVariantGalleryIfNeeded();
      if (!imageSaved) {
        return;
      }

      if (canEditProductFields && onUpdateProduct !== undefined) {
        const prevSeoTitle = (product.seoTitle ?? "").trim();
        const prevSeoDescription = (product.seoDescription ?? "").trim();
        const prevDescription = (product.description ?? "").trim();
        const prevRequiredSpecs = parseProductRequiredSpecs(
          product.requiredSpecs,
        );
        const seoDirty =
          nextSeoTitle !== prevSeoTitle ||
          nextSeoDescription !== prevSeoDescription ||
          nextDescription !== prevDescription;
        const requiredSpecsDirty =
          JSON.stringify(prevRequiredSpecs) !==
          JSON.stringify(normalizedRequiredSpecs.entries);

        if (seoDirty || requiredSpecsDirty) {
          const seoForm = new FormData();
          seoForm.set("name", product.name);
          seoForm.set("slug", product.slug);
          seoForm.set(
            "categoryId",
            product.category?.id ?? product.categoryId ?? "",
          );
          seoForm.set("brandId", product.brand?.id ?? "");
          seoForm.set("seoTitle", nextSeoTitle);
          seoForm.set("seoDescription", nextSeoDescription);
          seoForm.set("description", nextDescription);
          const seoSaved = await run(
            () =>
              onUpdateProduct(
                product.id,
                seoForm,
                normalizedRequiredSpecs.entries,
              ),
            requiredSpecsDirty && !seoDirty
              ? "Məhsul xüsusiyyətləri yeniləndi"
              : "Məhsul SEO yeniləndi",
            { refresh: false },
          );
          if (seoSaved === null) {
            return;
          }
        }
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
              {productDisplayTitle} — <strong>{variantSku || variant.sku}</strong>
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
              {
                getRequiredSpecsVariantIntroMessage({
                  includeInitialVariant: true,
                  supportsPhoneTabletVariantAttributes:
                    supportsPhoneTabletVariants,
                })
              }
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
                const trimmedName = product.name.trim();
                if (trimmedName.length === 0) {
                  return null;
                }
                return {
                  entityType: "product",
                  name: trimmedName,
                  description,
                  brandName: product.brand?.name ?? null,
                  categoryName: product.category?.name ?? null,
                  specs: requiredSpecRowsToEntries(requiredSpecRows),
                };
              }}
              titlePlaceholder="Boş buraxılsa vitrin başlığı istifadə olunur"
              descriptionPlaceholder="Boş buraxılsa məhsul təsviri istifadə olunur"
              titleHint="SEO məhsul səviyyəsindədir — brend, model və xüsusiyyətlərdən qurulur."
              descriptionHint="Variant redaktə edərkən məhsul meta məlumatını da yeniləyə bilərsiniz."
            />
          ) : null}

          <div className="catalog-subcategories-form__field catalog-subcategories-form__field--wide catalog-product-variant-fields">
            <span className="catalog-product-required-specs__heading">
              Satış məlumatları
            </span>
            <CatalogMediaGalleryField
              label="Variant şəkilləri"
              hint="Storefront-da rəng və ya yaddaş seçildikdə bu variantın şəkilləri göstərilir; boşdursa məhsul səviyyəli şəkillər istifadə olunur."
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
                      SKU avtomatik yaranır; lazım olsa əl ilə dəyişə
                      bilərsiniz.
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
