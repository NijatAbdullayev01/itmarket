"use client";

import {
  getProductImageAlt,
  getProductImageUrl,
  useConfirmDialog,
  type ProductMedia,
} from "@itmarket/ui";
import { IconChevronLeft } from "./bo-icons";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import {
  findActiveProductBySlug,
  findExistingProductForCreateForm,
  findProductByVariantBarcode,
  parseProductRequiredSpecs,
  requiredSpecEntriesToRows,
  requiredSpecsEntriesEqual,
  resolveCategorySelection,
  snapshotFromExistingProduct,
  buildProductSlugFromCatalogFields,
  buildVariantSkuFromCatalogFields,
  VARIANT_SKU_AUTO_HINT,
  type ExistingCatalogProduct,
} from "../../lib/product-existing-catalog";
import {
  filterProductsByName,
  findExactProductNameMatch,
} from "../../lib/product-name-search";
import { getBackofficeProductDisplayTitle } from "../../lib/product-display-title";
import {
  createEmptyRequiredSpecRow,
  getRequiredSpecsSectionMessage,
  isColorSpecLabel,
  isRequiredSpecsSectionReady,
  normalizeRequiredSpecRows,
  requiredSpecRowsToEntries,
  METER_SPEC_LABEL,
  TEMPORARY_MEMORY_SPEC_LABEL,
  type ProductRequiredSpecRow,
} from "../../lib/product-required-specs";
import { CatalogColorSpecSelect } from "./catalog-color-spec-select";
import {
  getManageableCatalogVariants,
  getStorefrontVisibilityHint,
} from "../../lib/product-storefront-visibility";
import {
  buildVariantSubmitFormData,
  validateSkuVariantFields,
  type SkuVariantFieldErrors,
} from "../../lib/product-variant-form";
import {
  SkuVariantCreateView,
  SkuVariantEditView,
  mapCatalogProductForVariantForms,
  type SkuVariantFormProduct,
} from "./catalog-variant-form-views";

type Brand = { id: string; name: string };
type Category = {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
};

type ProductVariant = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  price: string;
  previousPrice?: string | null;
  attributes?: unknown;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  media?: ProductMedia | null;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  categoryId?: string;
  category?: { id: string; name: string; status?: "DRAFT" | "ACTIVE" | "ARCHIVED" };
  brand: { id: string; name: string } | null;
  requiredSpecs?: unknown;
  variants: ProductVariant[];
  media: ProductMedia[];
};

type RunFn = <T>(
  action: () => Promise<T>,
  success: string,
  options?: { refresh?: boolean; onSuccess?: (result: T) => void },
) => Promise<T | null>;

const PRODUCT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const INTAKE_PENDING_CATEGORY_SLUG = "intake-pending";

type CatalogProductsPanelProps = {
  products: Product[];
  brands: Brand[];
  categories: Category[];
  canCatalog: boolean;
  canCatalogRead: boolean;
  onCreateProduct: (
    form: FormData,
    requiredSpecs: { label: string; value: string }[],
  ) => Promise<{ id: string }>;
  onUpdateProduct?: (
    productId: string,
    form: FormData,
    requiredSpecs: { label: string; value: string }[],
  ) => Promise<{ id: string }>;
  onDeleteProduct?: (productId: string) => Promise<unknown>;
  onDeleteVariant?: (variantId: string) => Promise<unknown>;
  canCreateVariant?: boolean;
  canReceiveStock?: boolean;
  defaultStockLocationId?: string | null;
  onCreateVariant?: (
    productId: string,
    form: FormData,
  ) => Promise<{ id: string } | null | unknown>;
  onUpdateVariant?: (
    variantId: string,
    form: FormData,
    status: "DRAFT" | "ACTIVE" | "ARCHIVED",
  ) => Promise<unknown>;
  onUpdateVariantPrice?: (variantId: string, form: FormData) => Promise<unknown>;
  onAddProductMedia?: (input: {
    productId: string;
    file: File;
    altText: string;
  }) => Promise<unknown>;
  onUpdateProductMedia?: (input: {
    mediaId: string;
    file: File;
    altText: string;
  }) => Promise<unknown>;
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
  onReceiveInitialStock?: (input: {
    variantId: string;
    quantity: number;
  }) => Promise<unknown>;
  fetchVariantOnHand?: (variantId: string) => Promise<number>;
  run: RunFn;
};

type ProductFieldKey = "name" | "slug" | "categoryId" | "brandId";
type ProductFieldErrors = Partial<Record<ProductFieldKey, string>>;

function readFormField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function resolveProductSlug(name: string, slug: string, brandName = "") {
  const trimmedSlug = slug.trim();
  if (trimmedSlug !== "") {
    return trimmedSlug;
  }

  return buildProductSlugFromCatalogFields({
    brandName,
    modelName: name,
  });
}

function validateProductForm(
  formData: FormData,
  categoryContext?: {
    parentCategoryId: string;
    hasSubcategories: boolean;
    brands?: { id: string; name: string }[];
  },
): ProductFieldErrors {
  const errors: ProductFieldErrors = {};
  const name = readFormField(formData, "name");
  const categoryId = readFormField(formData, "categoryId");
  const brandId = readFormField(formData, "brandId");
  const brandName =
    categoryContext?.brands?.find((entry) => entry.id === brandId)?.name ?? "";
  const slug = resolveProductSlug(
    name,
    readFormField(formData, "slug"),
    brandName,
  );

  if (name === "") {
    errors.name = "Model tələb olunur";
  }

  if (brandId === "") {
    errors.brandId = "Brend tələb olunur";
  }

  if (slug === "") {
    errors.slug = "Slug tələb olunur";
  } else if (!PRODUCT_SLUG_PATTERN.test(slug)) {
    errors.slug = "Slug kiçik hərflər, rəqəmlər və tire ilə yazılmalıdır";
  }

  if (categoryId === "") {
    if (
      categoryContext?.parentCategoryId !== "" &&
      categoryContext?.hasSubcategories
    ) {
      errors.categoryId = "Alt kateqoriya seçin";
    } else {
      errors.categoryId = "Əsas kateqoriya seçin";
    }
  }

  return errors;
}

function useCategoryHierarchy(categories: Category[]) {
  return useMemo(() => {
    const rootCategories = categories
      .filter((category) => category.parentId == null)
      .sort((left, right) => left.name.localeCompare(right.name, "az"));

    const childrenByParentId = new Map<string, Category[]>();
    for (const category of categories) {
      if (category.parentId == null) {
        continue;
      }

      const siblings = childrenByParentId.get(category.parentId) ?? [];
      siblings.push(category);
      childrenByParentId.set(category.parentId, siblings);
    }

    for (const siblings of childrenByParentId.values()) {
      siblings.sort((left, right) =>
        left.name.localeCompare(right.name, "az"),
      );
    }

    return { rootCategories, childrenByParentId };
  }, [categories]);
}

function toExistingCatalogProduct(product: Product): ExistingCatalogProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    status: product.status,
    brand: product.brand,
    categoryId: product.categoryId ?? "",
    requiredSpecs: parseProductRequiredSpecs(product.requiredSpecs),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      barcode: variant.barcode,
      status: variant.status,
    })),
  };
}

function ProductModelCombobox({
  formId,
  value,
  fieldError,
  existingProductLink,
  isExistingProductLinked,
  skuVariantCreateHref,
  existingProducts,
  onValueChange,
  onSelectExisting,
  onNameCommit,
}: {
  formId: string;
  value: string;
  fieldError?: string;
  existingProductLink?: { href: string; productName: string } | null;
  isExistingProductLinked?: boolean;
  skuVariantCreateHref?: string | null;
  existingProducts: ExistingCatalogProduct[];
  onValueChange: (nextValue: string) => void;
  onSelectExisting: (productId: string) => void;
  onNameCommit: (committedName: string) => void;
}) {
  const listId = useId();
  const inputId = useId();
  const labelId = useId();
  const blurCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestions = useMemo(
    () => filterProductsByName(existingProducts, value),
    [existingProducts, value],
  );

  useEffect(() => {
    return () => {
      if (blurCloseTimeoutRef.current !== null) {
        clearTimeout(blurCloseTimeoutRef.current);
      }
    };
  }, []);

  function clearBlurCloseTimeout() {
    if (blurCloseTimeoutRef.current !== null) {
      clearTimeout(blurCloseTimeoutRef.current);
      blurCloseTimeoutRef.current = null;
    }
  }

  function openList() {
    setIsOpen(true);
    setActiveIndex(-1);
  }

  function closeList() {
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function selectSuggestion(productId: string) {
    clearBlurCloseTimeout();
    closeList();
    onSelectExisting(productId);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    onValueChange(event.target.value);
    openList();
  }

  function handleInputFocus() {
    clearBlurCloseTimeout();
    openList();
  }

  function handleInputBlur(event: FocusEvent<HTMLInputElement>) {
    const relatedTarget = event.relatedTarget;
    if (
      relatedTarget instanceof Node &&
      event.currentTarget
        .closest(".catalog-product-name-combobox")
        ?.contains(relatedTarget)
    ) {
      return;
    }

    clearBlurCloseTimeout();
    const committedName = event.currentTarget.value;
    blurCloseTimeoutRef.current = setTimeout(() => {
      closeList();
      onNameCommit(committedName);
    }, 120);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || suggestions.length === 0) {
      if (event.key === "ArrowDown" && suggestions.length > 0) {
        event.preventDefault();
        setIsOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        current >= suggestions.length - 1 ? 0 : current + 1,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeList();
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const selected = suggestions[activeIndex];
      if (selected !== undefined) {
        selectSuggestion(selected.id);
      }
    }
  }

  const showSuggestions =
    isOpen && value.trim() !== "" && suggestions.length > 0;
  const activeDescendantId =
    activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined;

  const fieldClassName =
    fieldError !== undefined
      ? "catalog-subcategories-form__field catalog-subcategories-form__field--pair catalog-subcategories-form__field--error"
      : "catalog-subcategories-form__field catalog-subcategories-form__field--pair";

  return (
    <div className={fieldClassName}>
      <span id={labelId}>
        Model{" "}
        <span
          className="catalog-subcategories-form__required"
          aria-hidden="true"
        >
          *
        </span>
      </span>
      <div className="catalog-product-name-combobox">
        <input
          id={inputId}
          name="name"
          required
          maxLength={200}
          value={value}
          placeholder="Məs: MacBook Air 13 (M3)"
          autoComplete="off"
          role="combobox"
          aria-labelledby={labelId}
          aria-expanded={showSuggestions}
          aria-controls={showSuggestions ? listId : undefined}
          aria-activedescendant={activeDescendantId}
          aria-autocomplete="list"
          aria-invalid={fieldError !== undefined}
          aria-describedby={
            fieldError !== undefined ? `${formId}-name-error` : `${formId}-name-hint`
          }
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
        />
        {showSuggestions ? (
          <ul
            id={listId}
            className="catalog-product-name-combobox__list"
            role="listbox"
            aria-label="Mövcud modellər"
          >
            {suggestions.map((product, index) => {
              const isActive = index === activeIndex;
              return (
                <li key={product.id} role="presentation">
                  <button
                    id={`${listId}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={
                      isActive
                        ? "catalog-product-name-combobox__option is-active"
                        : "catalog-product-name-combobox__option"
                    }
                    onPointerDown={(event) => {
                      event.preventDefault();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      selectSuggestion(product.id);
                    }}
                  >
                    <span className="catalog-product-name-combobox__option-name">
                      {getBackofficeProductDisplayTitle(product)}
                    </span>
                    <span className="catalog-product-name-combobox__option-meta">
                      {product.slug}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
      {fieldError !== undefined ? (
        <p
          id={`${formId}-name-error`}
          className="catalog-subcategories-form__field-error"
          role="alert"
        >
          {fieldError}
        </p>
      ) : isExistingProductLinked ? (
        <p
          id={`${formId}-name-hint`}
          className="catalog-subcategories-form__field-hint"
        >
          Mövcud məhsulun məlumatları formada göstərilir.{" "}
          {existingProductLink !== undefined && existingProductLink !== null ? (
            <Link href={existingProductLink.href} scroll={false}>
              Məhsula bax
            </Link>
          ) : null}
          {skuVariantCreateHref !== undefined && skuVariantCreateHref !== null ? (
            <>
              {" · "}
              <Link href={skuVariantCreateHref} scroll={false}>
                Yeni SKU variant
              </Link>
            </>
          ) : null}
        </p>
      ) : existingProductLink !== undefined && existingProductLink !== null ? (
        <p
          id={`${formId}-name-hint`}
          className="catalog-subcategories-form__field-hint"
        >
          «{existingProductLink.productName}» modeli artıq kataloqda var.{" "}
          <Link href={existingProductLink.href} scroll={false}>
            Məhsula bax
          </Link>
          {skuVariantCreateHref !== undefined && skuVariantCreateHref !== null ? (
            <>
              {" · "}
              <Link href={skuVariantCreateHref} scroll={false}>
                SKU variant əlavə et
              </Link>
            </>
          ) : null}
        </p>
      ) : (
        <p
          id={`${formId}-name-hint`}
          className="catalog-subcategories-form__field-hint"
        >
          Eyni model artıq sistemdə varsa siyahıdan seçin; yoxdursa yeni model
          yaradın.
        </p>
      )}
    </div>
  );
}

function ProductCreateView({
  brands,
  categories,
  existingProducts,
  canCreateVariant,
  canReceiveStock,
  defaultStockLocationId,
  onCreateProduct,
  onUpdateProduct,
  onCreateVariant,
  onAddProductMedia,
  onReceiveInitialStock,
  fetchVariantOnHand,
  onCancel,
  onCreated,
  run,
}: {
  brands: Brand[];
  categories: Category[];
  existingProducts: ExistingCatalogProduct[];
  canCreateVariant: boolean;
  canReceiveStock: boolean;
  defaultStockLocationId: string | null;
  onCreateProduct: (
    form: FormData,
    requiredSpecs: { label: string; value: string }[],
  ) => Promise<{ id: string }>;
  onUpdateProduct?: (
    productId: string,
    form: FormData,
    requiredSpecs: { label: string; value: string }[],
  ) => Promise<{ id: string }>;
  onCreateVariant?: (
    productId: string,
    form: FormData,
  ) => Promise<{ id: string } | null | unknown>;
  onAddProductMedia?: (input: {
    productId: string;
    file: File;
    altText: string;
  }) => Promise<unknown>;
  onReceiveInitialStock?: (input: {
    variantId: string;
    quantity: number;
  }) => Promise<unknown>;
  fetchVariantOnHand?: (variantId: string) => Promise<number>;
  onCancel: () => void;
  onCreated: (productId: string) => void;
  run: RunFn;
}) {
  const formId = useId();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const slugManuallyEdited = useRef(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [linkedExistingProduct, setLinkedExistingProduct] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [brandId, setBrandId] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [requiredSpecRows, setRequiredSpecRows] = useState<ProductRequiredSpecRow[]>(
    [],
  );
  const [requiredSpecErrors, setRequiredSpecErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<ProductFieldErrors>({});
  const [variantBarcode, setVariantBarcode] = useState("");
  const [variantPrice, setVariantPrice] = useState("");
  const [variantDiscountedPrice, setVariantDiscountedPrice] = useState("");
  const [variantQuantity, setVariantQuantity] = useState("");
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreviewUrl, setProductImagePreviewUrl] = useState<
    string | null
  >(null);
  const [variantFieldErrors, setVariantFieldErrors] = useState<SkuVariantFieldErrors>(
    {},
  );
  const [intakeLedgerStockHint, setIntakeLedgerStockHint] = useState<string | null>(
    null,
  );
  const adminCategories = useMemo(
    () =>
      categories.filter((entry) => entry.slug !== INTAKE_PENDING_CATEGORY_SLUG),
    [categories],
  );
  const { rootCategories, childrenByParentId } = useCategoryHierarchy(adminCategories);
  const childCategories = useMemo(() => {
    if (parentCategoryId === "") {
      return [];
    }

    return childrenByParentId.get(parentCategoryId) ?? [];
  }, [childrenByParentId, parentCategoryId]);
  const hasSubcategories = childCategories.length > 0;
  const resolvedCategoryId = hasSubcategories
    ? subcategoryId
    : parentCategoryId;
  const sortedBrands = useMemo(
    () => [...brands].sort((left, right) => left.name.localeCompare(right.name, "az")),
    [brands],
  );
  const selectedBrandName = useMemo(
    () => brands.find((entry) => entry.id === brandId)?.name ?? "",
    [brands, brandId],
  );
  const requiredSpecsMessage = useMemo(
    () =>
      getRequiredSpecsSectionMessage({
        parentCategoryId,
        hasSubcategories,
        subcategoryId,
      }),
    [parentCategoryId, hasSubcategories, subcategoryId],
  );
  const canEditRequiredSpecs = isRequiredSpecsSectionReady({
    parentCategoryId,
    hasSubcategories,
    subcategoryId,
  });

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

  function clearFieldError(field: ProductFieldKey) {
    setFieldErrors((current) => {
      if (current[field] === undefined) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  const isExistingProductLinked = linkedExistingProduct !== null;
  const includeInitialVariant =
    canCreateVariant && !isExistingProductLinked && onCreateVariant !== undefined;

  const generatedVariantSku = useMemo(
    () =>
      buildVariantSkuFromCatalogFields({
        brandName: selectedBrandName,
        modelName: name,
        requiredSpecEntries: requiredSpecRowsToEntries(requiredSpecRows),
      }),
    [name, requiredSpecRows, selectedBrandName],
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

  function handleProductImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file === undefined) {
      setProductImageFile(null);
      return;
    }
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(file.type) || file.size > 5_000_000) {
      setProductImageFile(null);
      setVariantFieldErrors((current) => ({
        ...current,
        image: "Yalnız JPEG, PNG və ya WebP (maks. 5 MB) qəbul olunur",
      }));
      event.target.value = "";
      return;
    }
    setProductImageFile(file);
    setVariantFieldErrors((current) => {
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

    if (productImageFile !== null && onAddProductMedia !== undefined) {
      const media = await run(
        () =>
          onAddProductMedia({
            productId: targetProductId,
            file: productImageFile,
            altText: displayName || "Məhsul şəkli",
          }),
        "Məhsul şəkli əlavə edildi",
        { refresh: false },
      );
      if (media === null) {
        return false;
      }
    }

    return true;
  }

  function hydrateFromExistingProduct(product: ExistingCatalogProduct) {
    const snapshot = snapshotFromExistingProduct(product);
    const { parentCategoryId: nextParent, subcategoryId: nextSubcategory } =
      resolveCategorySelection(product.categoryId, adminCategories);

    slugManuallyEdited.current = true;
    setName(product.name);
    setSlug(product.slug);
    setBrandId(snapshot.brandId);
    setParentCategoryId(nextParent);
    setSubcategoryId(nextSubcategory);
    setRequiredSpecRows(requiredSpecEntriesToRows(snapshot.requiredSpecs));
    setRequiredSpecErrors([]);
    setLinkedExistingProduct({ id: product.id, name: product.name });
    clearFieldError("name");
    clearFieldError("slug");
    clearFieldError("categoryId");
    clearFieldError("brandId");
  }

  async function commitVariantBarcodeLookup(rawBarcode: string) {
    const trimmed = rawBarcode.trim();
    if (trimmed.length < 4) {
      setIntakeLedgerStockHint(null);
      return;
    }

    const match = findProductByVariantBarcode(
      existingProducts as (ExistingCatalogProduct & {
        variants: { id: string; barcode: string | null }[];
      })[],
      trimmed,
    );
    if (match === undefined) {
      setIntakeLedgerStockHint(null);
      return;
    }

    hydrateFromExistingProduct(match.product);
    if (fetchVariantOnHand === undefined) {
      return;
    }

    try {
      const onHand = await fetchVariantOnHand(match.variantId);
      if (onHand > 0) {
        setIntakeLedgerStockHint(
          `Anbar qalığı (ledger): ${onHand} ədəd. Qəbul artıq edilib — kateqoriya, qiymət və statusu tamamlayın.`,
        );
      } else {
        setIntakeLedgerStockHint(null);
      }
    } catch {
      setIntakeLedgerStockHint(null);
    }
  }

  function clearVariantExtension() {
    setLinkedExistingProduct(null);
  }

  function applyNameChange(nextName: string) {
    const nextAutoSlug = buildProductSlugFromCatalogFields({
      brandName: selectedBrandName,
      modelName: nextName,
    });

    setName(nextName);
    clearFieldError("name");

    if (linkedExistingProduct !== null) {
      const stillLinkedProduct = findExistingProductForCreateForm(
        existingProducts,
        {
          modelName: nextName,
          productSlug: slugManuallyEdited.current ? slug : nextAutoSlug,
        },
      );
      if (stillLinkedProduct?.id !== linkedExistingProduct.id) {
        clearVariantExtension();
      }
    }

    if (!slugManuallyEdited.current) {
      setSlug(nextAutoSlug);
      clearFieldError("slug");
    }
  }

  function applyBrandChange(nextBrandId: string) {
    setBrandId(nextBrandId);
    clearFieldError("brandId");

    if (!slugManuallyEdited.current) {
      const brandName =
        brands.find((entry) => entry.id === nextBrandId)?.name ?? "";
      setSlug(
        buildProductSlugFromCatalogFields({
          brandName,
          modelName: name,
        }),
      );
      clearFieldError("slug");
    }
  }

  function handleNameCommit(committedName: string) {
    const match = findExistingProductForCreateForm(existingProducts, {
      modelName: committedName,
      productSlug: slugManuallyEdited.current
        ? slug
        : buildProductSlugFromCatalogFields({
            brandName: selectedBrandName,
            modelName: committedName,
          }),
    });
    if (match === undefined) {
      return;
    }

    hydrateFromExistingProduct(match);
  }

  function handleSelectExistingProduct(productId: string) {
    const product = existingProducts.find((entry) => entry.id === productId);
    if (product === undefined) {
      return;
    }

    hydrateFromExistingProduct(product);
  }

  const existingProductLink =
    linkedExistingProduct === null
      ? null
      : (() => {
          const linked = existingProducts.find(
            (entry) => entry.id === linkedExistingProduct.id,
          );
          return {
            href: `${pathname}?view=${encodeURIComponent(linkedExistingProduct.id)}`,
            productName: getBackofficeProductDisplayTitle(
              linked ?? {
                name: linkedExistingProduct.name,
                brand: null,
              },
            ),
          };
        })();

  const skuVariantCreateHref =
    linkedExistingProduct === null
      ? null
      : `${pathname}?create=${encodeURIComponent("sku-variant")}&product=${encodeURIComponent(linkedExistingProduct.id)}`;

  function handleSlugChange(event: ChangeEvent<HTMLInputElement>) {
    slugManuallyEdited.current = true;
    setSlug(event.target.value);
    clearFieldError("slug");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const resolvedSlug = resolveProductSlug(
      readFormField(formData, "name"),
      readFormField(formData, "slug"),
      selectedBrandName,
    );

    if (resolvedSlug !== readFormField(formData, "slug")) {
      formData.set("slug", resolvedSlug);
    }

    formData.set("categoryId", resolvedCategoryId);

    const normalizedRequiredSpecs = normalizeRequiredSpecRows(requiredSpecRows);
    if (normalizedRequiredSpecs.errors.length > 0) {
      setRequiredSpecErrors(normalizedRequiredSpecs.errors);
      return;
    }

    const nextFieldErrors = validateProductForm(formData, {
      parentCategoryId,
      hasSubcategories,
      brands,
    });

    const productName = readFormField(formData, "name");
    const updatingProductId = linkedExistingProduct?.id;
    const isUpdatingExisting = updatingProductId !== undefined;

    const exactMatch = findExactProductNameMatch(existingProducts, productName);
    if (
      nextFieldErrors.name === undefined &&
      exactMatch !== undefined &&
      !isUpdatingExisting
    ) {
      nextFieldErrors.name =
        "Bu model artıq kataloqda mövcuddur. Yuxarıdakı siyahıdan seçin.";
    }

    if (!isUpdatingExisting) {
      const implicitExisting = findExistingProductForCreateForm(
        existingProducts,
        {
          modelName: productName,
          productSlug: resolvedSlug,
        },
      );
      if (implicitExisting !== undefined && nextFieldErrors.slug === undefined) {
        nextFieldErrors.slug =
          "Bu model artıq kataloqda var. Sol menyudan «Yeni SKU variant» ilə variant əlavə edin.";
      }
    }

    const slugConflict = findActiveProductBySlug(
      existingProducts,
      resolvedSlug,
      isUpdatingExisting ? updatingProductId : undefined,
    );
    if (nextFieldErrors.slug === undefined && slugConflict !== undefined) {
      nextFieldErrors.slug =
        "Bu slug artıq istifadə olunur. Eyni modeldirsə, siyahıdan seçib məlumatları yeniləyin və ya «Yeni SKU variant» ilə variant əlavə edin.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);

      const firstInvalidField = (
        ["name", "slug", "categoryId"] as const
      ).find((field) => nextFieldErrors[field] !== undefined);

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
      } else if (firstInvalidField !== undefined) {
        formRef.current
          ?.querySelector<HTMLElement>(`[name="${firstInvalidField}"]`)
          ?.focus({ preventScroll: true });
      }

      return;
    }

    const entries = normalizedRequiredSpecs.entries;

    if (includeInitialVariant) {
      const nextVariantErrors = validateSkuVariantFields({
        productId: "",
        generatedVariantSku,
        variantPrice,
        variantDiscountedPrice,
        requiredSpecEntries: entries,
        variantQuantity,
        existingProducts,
        canReceiveStock,
        defaultStockLocationId,
        requireProductId: false,
      });

      if (Object.keys(nextVariantErrors).length > 0) {
        setVariantFieldErrors(nextVariantErrors);
        setFieldErrors({});
        setRequiredSpecErrors([]);
        return;
      }
    }

    setFieldErrors({});
    setRequiredSpecErrors([]);
    setVariantFieldErrors({});

    if (isUpdatingExisting) {
      const productId = updatingProductId!;
      const existingProduct = existingProducts.find(
        (entry) => entry.id === productId,
      );
      if (existingProduct === undefined || onUpdateProduct === undefined) {
        return;
      }
      const snapshot = snapshotFromExistingProduct(existingProduct);
      const needsProductUpdate =
        snapshot.brandId !== brandId ||
        snapshot.categoryId !== resolvedCategoryId ||
        !requiredSpecsEntriesEqual(snapshot.requiredSpecs, entries);

      void (async () => {
        if (!needsProductUpdate) {
          onCreated(productId);
          return;
        }
        const updated = await run(
          () => onUpdateProduct(productId, formData, entries),
          "Məhsul məlumatları yeniləndi",
          { refresh: false },
        );
        if (updated === null) {
          return;
        }
        await run(async () => undefined, "Məhsul məlumatları yeniləndi");
        onCreated(productId);
      })();
      return;
    }

    void (async () => {
      const created = await run(
        () => onCreateProduct(formData, entries),
        "Məhsul yaradılır",
        { refresh: false },
      );
      if (created === null) {
        return;
      }

      if (includeInitialVariant && onCreateVariant !== undefined) {
        const variantForm = buildVariantSubmitFormData({
          variantSku: generatedVariantSku,
          variantBarcode,
          variantPrice,
          variantDiscountedPrice,
          requiredSpecEntries: entries,
        });
        const variantCreated = await run(
          () => onCreateVariant(created.id, variantForm),
          "SKU variant yaradılır",
          { refresh: false },
        );
        if (variantCreated === null) {
          return;
        }
        const extrasSaved = await applyPostCreateExtras(
          created.id,
          variantCreated,
          productName,
        );
        if (!extrasSaved) {
          return;
        }
        await run(async () => undefined, "Məhsul və SKU yaradıldı");
      } else {
        await run(async () => undefined, "Məhsul yaradıldı");
      }

      onCreated(created.id);
    })();
  }

  useEffect(() => {
    const form = formRef.current;
    if (!form) {
      return;
    }

    form.scrollIntoView({ behavior: "smooth", block: "nearest" });
    form.querySelector<HTMLInputElement>('input[name="name"]')?.focus({
      preventScroll: true,
    });
  }, []);

  useEffect(() => {
    const match = findExistingProductForCreateForm(existingProducts, {
      modelName: name,
      productSlug: slug,
    });
    if (match === undefined) {
      return;
    }

    if (linkedExistingProduct?.id === match.id) {
      return;
    }

    hydrateFromExistingProduct(match);
  }, [existingProducts, name, slug, linkedExistingProduct?.id]);

  if (rootCategories.length === 0) {
    return (
      <div className="catalog-subcategories-board">
        <p className="catalog-subcategories-note" role="status">
          Məhsul yaratmaq üçün əvvəlcə kateqoriya əlavə edin.
        </p>
        <footer className="catalog-subcategories-form__actions">
          <button
            type="button"
            className="catalog-subcategories-form__cancel"
            onClick={onCancel}
          >
            Geri
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div className="catalog-subcategories-board">
      <form
        ref={formRef}
        id="catalog-product-form"
        className="catalog-subcategories-form"
        noValidate
        onSubmit={handleSubmit}
      >
        <header className="catalog-subcategories-form__head">
          <div>
            <h2>{isExistingProductLinked ? "Mövcud məhsul" : "Yeni məhsul"}</h2>
            <p>
              {isExistingProductLinked
                ? "Məhsul kartının brend, kateqoriya və xüsusiyyətlərini yeniləyin. Əlavə SKU variantları sol menyudan «Yeni SKU variant» ilə yaradılır."
                : includeInitialVariant
                  ? "Məhsul modelini, kateqoriyasını, tələb olunan xüsusiyyətləri və ilk satış SKU-sunu daxil edin. Sonrakı variantlar «Yeni SKU variant» ilə əlavə olunur."
                  : "Məhsul modelini, kateqoriyasını və tələb olunan xüsusiyyətləri daxil edin. Satış üçün SKU variantı «Yeni SKU variant» ilə yaradın."}
            </p>
          </div>
        </header>

        <input type="hidden" name="categoryId" value={resolvedCategoryId} />

        <div className="catalog-subcategories-form__grid">
          <div className="catalog-subcategories-form__pair">
            <label
              className={
                fieldErrors.brandId !== undefined
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
                aria-invalid={fieldErrors.brandId !== undefined}
                aria-describedby={
                  fieldErrors.brandId !== undefined
                    ? `${formId}-brand-error`
                    : `${formId}-brand-hint`
                }
                onChange={(event) => {
                  applyBrandChange(event.target.value);
                }}
              >
                <option value="">Brend seçin</option>
                {sortedBrands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              {fieldErrors.brandId !== undefined ? (
                <p
                  id={`${formId}-brand-error`}
                  className="catalog-subcategories-form__field-error"
                  role="alert"
                >
                  {fieldErrors.brandId}
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

            <ProductModelCombobox
              formId={formId}
              value={name}
              fieldError={fieldErrors.name}
              existingProductLink={existingProductLink}
              isExistingProductLinked={isExistingProductLinked}
              skuVariantCreateHref={skuVariantCreateHref}
              existingProducts={existingProducts}
              onValueChange={applyNameChange}
              onSelectExisting={handleSelectExistingProduct}
              onNameCommit={handleNameCommit}
            />
          </div>

          <label
            className={
              fieldErrors.slug !== undefined
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
              aria-invalid={fieldErrors.slug !== undefined}
              aria-describedby={
                fieldErrors.slug !== undefined
                  ? `${formId}-slug-error`
                  : `${formId}-slug-hint`
              }
              onChange={handleSlugChange}
            />
            {fieldErrors.slug !== undefined ? (
              <p
                id={`${formId}-slug-error`}
                className="catalog-subcategories-form__field-error"
                role="alert"
              >
                {fieldErrors.slug}
              </p>
            ) : (
              <p
                id={`${formId}-slug-hint`}
                className="catalog-subcategories-form__field-hint"
              >
                Brend və model seçildikcə avtomatik doldurulur; istəsəniz dəyişə
                bilərsiniz.
              </p>
            )}
          </label>

          <label
            className={
              fieldErrors.categoryId !== undefined
                ? "catalog-subcategories-form__field catalog-subcategories-form__field--wide catalog-subcategories-form__field--error"
                : "catalog-subcategories-form__field catalog-subcategories-form__field--wide"
            }
          >
            <span>Əsas kateqoriya</span>
            <select
              data-product-field="parentCategoryId"
              required
              value={parentCategoryId}
              aria-invalid={fieldErrors.categoryId !== undefined}
              aria-describedby={
                fieldErrors.categoryId !== undefined
                  ? `${formId}-category-id-error`
                  : undefined
              }
              onChange={(event) => {
                setParentCategoryId(event.target.value);
                setSubcategoryId("");
                clearFieldError("categoryId");
              }}
            >
              <option value="">Kateqoriya seçin</option>
              {rootCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {fieldErrors.categoryId !== undefined &&
            parentCategoryId === "" ? (
              <p
                id={`${formId}-category-id-error`}
                className="catalog-subcategories-form__field-error"
                role="alert"
              >
                {fieldErrors.categoryId}
              </p>
            ) : null}
          </label>

          {parentCategoryId !== "" && hasSubcategories ? (
            <label
              className={
                fieldErrors.categoryId !== undefined
                  ? "catalog-subcategories-form__field catalog-subcategories-form__field--wide catalog-subcategories-form__field--error"
                  : "catalog-subcategories-form__field catalog-subcategories-form__field--wide"
              }
            >
              <span>Alt kateqoriya</span>
              <select
                data-product-field="subcategoryId"
                required
                value={subcategoryId}
                aria-invalid={fieldErrors.categoryId !== undefined}
                aria-describedby={
                  fieldErrors.categoryId !== undefined
                    ? `${formId}-category-id-error`
                    : undefined
                }
                onChange={(event) => {
                  setSubcategoryId(event.target.value);
                  clearFieldError("categoryId");
                }}
              >
                <option value="">Alt kateqoriya seçin</option>
                {childCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {fieldErrors.categoryId !== undefined ? (
                <p
                  id={`${formId}-category-id-error`}
                  className="catalog-subcategories-form__field-error"
                  role="alert"
                >
                  {fieldErrors.categoryId}
                </p>
              ) : null}
            </label>
          ) : null}

          <div
            className="catalog-subcategories-form__field catalog-subcategories-form__field--wide catalog-product-required-specs"
            aria-live="polite"
          >
            <span className="catalog-product-required-specs__heading">
              Tələb olunan xüsusiyyətlər
            </span>
            {canEditRequiredSpecs ? (
              <>
                <p className="catalog-product-required-specs__intro">
                  {includeInitialVariant
                    ? `Hər sətirdə başlıq və dəyər daxil edin. «Rəng», «Daimi yaddaş», «${TEMPORARY_MEMORY_SPEC_LABEL}» və «${METER_SPEC_LABEL}» SKU və variant atributları üçün istifadə olunur.`
                    : "Hər sətirdə başlıq və dəyər daxil edin. Mağaza kartında və SKU variantında istifadə olunacaq."}
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
                            placeholder={`Məs: ${TEMPORARY_MEMORY_SPEC_LABEL}, Rəng və ya ${METER_SPEC_LABEL}`}
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
                              placeholder="Məs: 16 GB"
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
                    Hələ xüsusiyyət əlavə edilməyib. Aşağıdakı düymə ilə yeni
                    sətir yaradın.
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
                {variantFieldErrors.storage !== undefined ? (
                  <p
                    className="catalog-subcategories-form__field-error"
                    role="alert"
                  >
                    {variantFieldErrors.storage}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="catalog-product-required-specs__placeholder">
                {requiredSpecsMessage}
              </p>
            )}
          </div>

          {includeInitialVariant ? (
            <div className="catalog-subcategories-form__field catalog-subcategories-form__field--wide catalog-product-variant-fields">
              <span className="catalog-product-required-specs__heading">
                İlk SKU variant — satış məlumatları
              </span>
              <div className="catalog-product-variant-fields__media-block">
                <span className="catalog-product-variant-fields__media-label">
                  Məhsul şəkli
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
                    aria-invalid={variantFieldErrors.image !== undefined}
                  />
                </label>
                {variantFieldErrors.image !== undefined ? (
                  <p
                    className="catalog-subcategories-form__field-error"
                    role="alert"
                  >
                    {variantFieldErrors.image}
                  </p>
                ) : null}
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
                      placeholder="Brend, model və yaddaş doldurulduqda yaranır"
                      aria-invalid={variantFieldErrors.sku !== undefined}
                    />
                    {variantFieldErrors.sku !== undefined ? (
                      <p
                        className="catalog-subcategories-form__field-error"
                        role="alert"
                      >
                        {variantFieldErrors.sku}
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
                      onChange={(event) => {
                        setVariantBarcode(event.target.value);
                        setIntakeLedgerStockHint(null);
                      }}
                      onBlur={(event) => {
                        void commitVariantBarcodeLookup(event.target.value);
                      }}
                    />
                    {intakeLedgerStockHint !== null ? (
                      <p
                        className="catalog-subcategories-form__field-hint"
                        role="status"
                      >
                        {intakeLedgerStockHint}
                      </p>
                    ) : null}
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
                      aria-invalid={variantFieldErrors.price !== undefined}
                      onChange={(event) => {
                        setVariantPrice(event.target.value);
                        setVariantFieldErrors((current) => {
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
                    {variantFieldErrors.price !== undefined ? (
                      <p
                        className="catalog-subcategories-form__field-error"
                        role="alert"
                      >
                        {variantFieldErrors.price}
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
                      aria-invalid={variantFieldErrors.discountedPrice !== undefined}
                      onChange={(event) => {
                        setVariantDiscountedPrice(event.target.value);
                        setVariantFieldErrors((current) => {
                          if (current.discountedPrice === undefined) {
                            return current;
                          }
                          const next = { ...current };
                          delete next.discountedPrice;
                          return next;
                        });
                      }}
                    />
                    {variantFieldErrors.discountedPrice !== undefined ? (
                      <p
                        className="catalog-subcategories-form__field-error"
                        role="alert"
                      >
                        {variantFieldErrors.discountedPrice}
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
                    aria-invalid={variantFieldErrors.quantity !== undefined}
                    onChange={(event) => {
                      setVariantQuantity(event.target.value);
                      setVariantFieldErrors((current) => {
                        if (current.quantity === undefined) {
                          return current;
                        }
                        const next = { ...current };
                        delete next.quantity;
                        return next;
                      });
                    }}
                  />
                  {variantFieldErrors.quantity !== undefined ? (
                    <p
                      className="catalog-subcategories-form__field-error"
                      role="alert"
                    >
                      {variantFieldErrors.quantity}
                    </p>
                  ) : (
                    <p className="catalog-product-variant-fields__media-hint">
                      Boş buraxsanız, stok 0 qalır.
                    </p>
                  )}
                </label>
              </div>
            </div>
          ) : null}
        </div>

        <footer className="catalog-subcategories-form__actions">
          <button
            type="button"
            className="catalog-subcategories-form__cancel"
            onClick={onCancel}
          >
            Ləğv et
          </button>
          <button type="submit" className="catalog-subcategories-form__submit">
            {isExistingProductLinked
              ? "Məhsul məlumatlarını yenilə"
              : includeInitialVariant
                ? "Məhsul və SKU yarat"
                : "Məhsul yarat"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function ProductDetailView({
  product,
  onBack,
  canEditVariant,
  canCatalog,
  onDeleteVariant,
  run,
}: {
  product: Product;
  onBack: () => void;
  canEditVariant: boolean;
  canCatalog: boolean;
  onDeleteVariant?: (variantId: string) => Promise<unknown>;
  run: RunFn;
}) {
  const pathname = usePathname();
  const { requestConfirm, confirmDialog } = useConfirmDialog();
  const primaryImage = product.media[0] ?? null;
  const imageUrl = getProductImageUrl(primaryImage);
  const productDisplayTitle = getBackofficeProductDisplayTitle(product);
  const imageAlt = getProductImageAlt(primaryImage, productDisplayTitle);
  const manageableVariants = useMemo(
    () => getManageableCatalogVariants(product.variants),
    [product.variants],
  );
  const sortedVariants = useMemo(
    () =>
      [...manageableVariants].sort((left, right) =>
        left.sku.localeCompare(right.sku, "az"),
      ),
    [manageableVariants],
  );

  return (
    <div className="catalog-product-detail" aria-label="Məhsul detalları">
      <div className="catalog-product-detail__toolbar">
        <button
          type="button"
          className="catalog-product-detail__back"
          onClick={onBack}
        >
          <IconChevronLeft
            className="bo-icon--sm catalog-product-detail__back-icon"
            aria-hidden="true"
          />
          <span className="catalog-product-detail__back-label">Geri qayıt</span>
        </button>
      </div>

      <div className="catalog-product-detail__hero">
        <div className="catalog-product-detail__media">
          <img src={imageUrl} alt={imageAlt} loading="lazy" decoding="async" />
        </div>
        <div className="catalog-product-detail__copy">
          <strong className="catalog-product-detail__name">
            {productDisplayTitle}
          </strong>
          <span className="catalog-product-detail__meta">{product.slug}</span>
          <span className="catalog-product-detail__meta">
            {manageableVariants.length} variant
          </span>
        </div>
      </div>

      <div className="catalog-product-detail__variants">
        <header className="catalog-entity-list__head">
          <h2>Variantlar</h2>
        </header>

        {sortedVariants.length === 0 ? (
          <p className="pos-empty">Bu məhsulun variantı yoxdur.</p>
        ) : (
          <ul className="catalog-product-detail__variant-list">
            {sortedVariants.map((variant) => {
              const variantDisplayTitle = getBackofficeProductDisplayTitle(
                product,
                variant,
              );
              return (
              <li key={variant.id} className="catalog-product-detail__variant">
                <div className="catalog-product-detail__variant-main">
                  <strong className="catalog-product-detail__variant-name">
                    {variantDisplayTitle}
                  </strong>
                  <span className="catalog-product-detail__variant-meta">
                    SKU: {variant.sku}
                    {variant.barcode ? ` · Barkod: ${variant.barcode}` : ""}
                  </span>
                </div>
                {canEditVariant || (canCatalog && onDeleteVariant) ? (
                  <div className="catalog-products-item__actions">
                    {canEditVariant ? (
                      <Link
                        href={`${pathname}?view=${encodeURIComponent(product.id)}&edit=${encodeURIComponent(variant.id)}`}
                        className="catalog-products-view"
                        scroll={false}
                      >
                        Düzəliş et
                      </Link>
                    ) : null}
                    {canCatalog && onDeleteVariant ? (
                      <button
                        type="button"
                        className="catalog-subcategories-delete"
                        aria-label={`${variantDisplayTitle} variantını sil`}
                        onClick={() =>
                          requestConfirm({
                            title: "Variantı sil",
                            message: `"${variantDisplayTitle}" (${variant.sku}) variantını silmək istəyirsiniz? Bu əməliyyat geri qaytarıla bilməz.`,
                            onConfirm: async () => {
                              await run(
                                () => onDeleteVariant(variant.id),
                                "Variant silindi",
                              );
                            },
                          })
                        }
                      >
                        Sil
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
              );
            })}
          </ul>
        )}
      </div>
      {confirmDialog}
    </div>
  );
}

type CatalogProductListEntry =
  | { kind: "variant"; product: Product; variant: ProductVariant }
  | { kind: "product-only"; product: Product };

function buildCatalogProductListEntries(products: Product[]): CatalogProductListEntry[] {
  const sortedProducts = [...products].sort((left, right) =>
    left.name.localeCompare(right.name, "az"),
  );
  const entries: CatalogProductListEntry[] = [];

  for (const product of sortedProducts) {
    const variants = [...getManageableCatalogVariants(product.variants)].sort(
      (left, right) => left.sku.localeCompare(right.sku, "az"),
    );
    if (variants.length === 0) {
      entries.push({ kind: "product-only", product });
      continue;
    }
    for (const variant of variants) {
      entries.push({ kind: "variant", product, variant });
    }
  }

  return entries;
}

function ProductListView({
  products,
  canCatalog,
  canEditVariant,
  onDeleteProduct,
  onDeleteVariant,
  run,
}: {
  products: Product[];
  canCatalog: boolean;
  canEditVariant: boolean;
  onDeleteProduct?: (productId: string) => Promise<unknown>;
  onDeleteVariant?: (variantId: string) => Promise<unknown>;
  run: RunFn;
}) {
  const pathname = usePathname();
  const { requestConfirm, confirmDialog } = useConfirmDialog();
  const listEntries = useMemo(
    () => buildCatalogProductListEntries(products),
    [products],
  );
  return (
    <>
      <div
        className="catalog-metrics catalog-metrics--single"
        aria-label="Məhsul statistikası"
      >
        <div className="catalog-metric">
          <span className="catalog-metric__label catalog-metric__label--title">
            Məhsulların sayı
          </span>
          <strong className="catalog-metric__value catalog-metric__value--compact">
            {listEntries.length}
          </strong>
        </div>
      </div>

      <div
        id="catalog-products-list"
        className="catalog-entity-list is-expanded"
      >
        <header className="catalog-entity-list__head">
          <h2>Bütün məhsullar</h2>
        </header>

        <div
          id="catalog-products-list-body"
          className="catalog-entity-list__body"
        >
          <div className="catalog-entity-list__body-inner">
            {listEntries.length === 0 ? (
              <p className="pos-empty">
                Hələ məhsul yoxdur. Sol menyudan «Yeni məhsul yarat» seçin.
              </p>
            ) : (
              <ul className="catalog-products-list">
                {listEntries.map((entry) => {
                  const product = entry.product;
                  const variant =
                    entry.kind === "variant" ? entry.variant : null;
                  const primaryImage =
                    variant?.media ?? product.media[0] ?? null;
                  const imageUrl = getProductImageUrl(primaryImage);
                  const productDisplayTitle = getBackofficeProductDisplayTitle(
                    product,
                    variant,
                  );
                  const imageAlt = getProductImageAlt(
                    primaryImage,
                    productDisplayTitle,
                  );
                  const storefrontHint = getStorefrontVisibilityHint({
                    status: product.status,
                    category: product.category ?? null,
                    variants: getManageableCatalogVariants(product.variants),
                  });
                  const listKey =
                    variant !== null
                      ? `${product.id}:${variant.id}`
                      : product.id;

                  return (
                    <li key={listKey} className="catalog-products-item">
                      <div className="catalog-products-item__media">
                        <img
                          src={imageUrl}
                          alt={imageAlt}
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <div className="catalog-products-item__main">
                        <strong className="catalog-products-item__name">
                          {productDisplayTitle}
                        </strong>
                        <span className="catalog-products-item__meta">
                          {variant !== null
                            ? `SKU: ${variant.sku}`
                            : "SKU variant yoxdur"}
                        </span>
                        {storefrontHint !== null ? (
                          <span
                            className="catalog-products-item__storefront-hint"
                            role="status"
                          >
                            {storefrontHint}
                          </span>
                        ) : null}
                      </div>
                      <div className="catalog-products-item__actions">
                        {canEditVariant && variant !== null ? (
                          <Link
                            href={`${pathname}?edit=${encodeURIComponent(variant.id)}`}
                            className="catalog-products-view"
                            scroll={false}
                          >
                            Düzəliş et
                          </Link>
                        ) : null}
                        {canCatalog &&
                        variant !== null &&
                        onDeleteVariant !== undefined ? (
                          <button
                            type="button"
                            className="catalog-subcategories-delete"
                            aria-label={`${productDisplayTitle} SKU variantını sil`}
                            onClick={() =>
                              requestConfirm({
                                title: "SKU variantını sil",
                                message: `"${productDisplayTitle}" (SKU: ${variant.sku}) variantını silmək istəyirsiniz? Bu əməliyyat geri qaytarıla bilməz.`,
                                onConfirm: async () => {
                                  await run(
                                    () => onDeleteVariant(variant.id),
                                    "SKU variant silindi",
                                  );
                                },
                              })
                            }
                          >
                            Sil
                          </button>
                        ) : null}
                        {canCatalog &&
                        variant === null &&
                        onDeleteProduct !== undefined ? (
                          <button
                            type="button"
                            className="catalog-subcategories-delete"
                            aria-label={`${getBackofficeProductDisplayTitle(product)} məhsulunu sil`}
                            onClick={() =>
                              requestConfirm({
                                title: "Məhsulu sil",
                                message: `"${getBackofficeProductDisplayTitle(product)}" məhsulunu silmək istəyirsiniz? Bu əməliyyat geri qaytarıla bilməz.`,
                                onConfirm: async () => {
                                  await run(
                                    () => onDeleteProduct(product.id),
                                    "Məhsul silindi",
                                  );
                                },
                              })
                            }
                          >
                            Sil
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {confirmDialog}
    </>
  );
}

export function CatalogProductsPanel({
  products,
  brands,
  categories,
  canCatalog,
  canCatalogRead,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onDeleteVariant,
  canCreateVariant = false,
  canReceiveStock = false,
  defaultStockLocationId = null,
  onCreateVariant,
  onUpdateVariant,
  onUpdateVariantPrice,
  onAddProductMedia,
  onUpdateProductMedia,
  onAddVariantMedia,
  onUpdateVariantMedia,
  onReceiveInitialStock,
  fetchVariantOnHand,
  run,
}: CatalogProductsPanelProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const viewId = searchParams.get("view");
  const editVariantId = searchParams.get("edit");
  const isCreateMode = canCatalog && searchParams.get("create") === "product";
  const isSkuVariantCreateMode =
    canCreateVariant && searchParams.get("create") === "sku-variant";
  const preselectedProductId = searchParams.get("product");
  const canEditVariant =
    canCreateVariant &&
    onUpdateVariant !== undefined &&
    onUpdateVariantPrice !== undefined;

  const existingProductsForVariants = useMemo(
    () => products.map(mapCatalogProductForVariantForms),
    [products],
  );

  const skuVariantProducts = useMemo(
    (): SkuVariantFormProduct[] =>
      products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        brand: product.brand,
        requiredSpecs: product.requiredSpecs,
        variants: getManageableCatalogVariants(product.variants),
      })),
    [products],
  );

  const editTarget = useMemo(() => {
    if (editVariantId === null || editVariantId === "") {
      return null;
    }
    for (const product of products) {
      const variant = product.variants.find((entry) => entry.id === editVariantId);
      if (variant !== undefined) {
        return { variant, product };
      }
    }
    return null;
  }, [editVariantId, products]);

  const selectedProduct = useMemo(
    () =>
      viewId === null
        ? null
        : (products.find((product) => product.id === viewId) ?? null),
    [products, viewId],
  );

  useEffect(() => {
    if (
      viewId !== null &&
      selectedProduct === null &&
      !isCreateMode &&
      !isSkuVariantCreateMode &&
      editVariantId === null
    ) {
      router.replace(pathname, { scroll: false });
    }
  }, [
    editVariantId,
    isCreateMode,
    isSkuVariantCreateMode,
    pathname,
    router,
    selectedProduct,
    viewId,
  ]);

  useEffect(() => {
    if (!canCatalog && searchParams.get("create") === "product") {
      router.replace(pathname, { scroll: false });
    }
  }, [canCatalog, pathname, router, searchParams]);

  useEffect(() => {
    if (!canCreateVariant && isSkuVariantCreateMode) {
      router.replace(pathname, { scroll: false });
    }
  }, [canCreateVariant, isSkuVariantCreateMode, pathname, router]);

  useEffect(() => {
    if (
      editVariantId !== null &&
      editTarget === null &&
      !isCreateMode &&
      !isSkuVariantCreateMode
    ) {
      router.replace(pathname, { scroll: false });
    }
  }, [
    editTarget,
    editVariantId,
    isCreateMode,
    isSkuVariantCreateMode,
    pathname,
    router,
  ]);

  useEffect(() => {
    if (!canEditVariant && editVariantId !== null) {
      router.replace(pathname, { scroll: false });
    }
  }, [canEditVariant, editVariantId, pathname, router]);

  const leaveCreateMode = () => {
    router.replace(pathname, { scroll: false });
  };

  const leaveDetail = () => {
    router.replace(pathname, { scroll: false });
  };

  const leaveVariantEdit = () => {
    if (viewId !== null && viewId !== "") {
      openProductView(viewId);
      return;
    }
    leaveDetail();
  };

  const openProductView = (productId: string) => {
    router.replace(`${pathname}?view=${encodeURIComponent(productId)}`, {
      scroll: false,
    });
  };

  const leaveSkuVariantCreate = () => {
    if (preselectedProductId !== null && preselectedProductId !== "") {
      openProductView(preselectedProductId);
      return;
    }
    router.replace(pathname, { scroll: false });
  };

  const openCreatedProduct = (productId: string) => {
    openProductView(productId);
  };

  if (!canCatalog && !canCatalogRead) {
    return null;
  }

  if (
    editTarget !== null &&
    canEditVariant &&
    onUpdateVariant !== undefined &&
    onUpdateVariantPrice !== undefined
  ) {
    return (
      <section className="catalog-subcategories-page" aria-label="SKU variant redaktə">
        <SkuVariantEditView
          key={editTarget.variant.id}
          variant={{ ...editTarget.variant, productId: editTarget.product.id }}
          product={editTarget.product}
          existingProducts={existingProductsForVariants}
          canEditVariant={canEditVariant}
          onUpdateVariant={onUpdateVariant}
          onUpdateVariantPrice={onUpdateVariantPrice}
          onAddVariantMedia={onAddVariantMedia}
          onUpdateVariantMedia={onUpdateVariantMedia}
          onSaved={leaveVariantEdit}
          run={run}
        />
      </section>
    );
  }

  if (isSkuVariantCreateMode && onCreateVariant !== undefined) {
    return (
      <section className="catalog-subcategories-page" aria-label="Yeni SKU variant">
        <SkuVariantCreateView
          products={skuVariantProducts}
          existingProducts={existingProductsForVariants}
          preselectedProductId={preselectedProductId}
          canCreateVariant={canCreateVariant}
          canReceiveStock={canReceiveStock}
          defaultStockLocationId={defaultStockLocationId}
          onCreateVariant={onCreateVariant}
          onAddVariantMedia={onAddVariantMedia}
          onReceiveInitialStock={onReceiveInitialStock}
          onCreated={leaveSkuVariantCreate}
          run={run}
        />
      </section>
    );
  }

  if (isCreateMode) {
    return (
      <section className="catalog-subcategories-page" aria-label="Yeni məhsul">
        <ProductCreateView
          key="product-create"
          brands={brands}
          categories={categories}
          existingProducts={products.map(toExistingCatalogProduct)}
          canCreateVariant={canCreateVariant}
          canReceiveStock={canReceiveStock}
          defaultStockLocationId={defaultStockLocationId}
          onCreateProduct={onCreateProduct}
          onUpdateProduct={onUpdateProduct}
          onCreateVariant={onCreateVariant}
          onAddProductMedia={onAddProductMedia}
          onReceiveInitialStock={onReceiveInitialStock}
          fetchVariantOnHand={fetchVariantOnHand}
          onCancel={leaveCreateMode}
          onCreated={openCreatedProduct}
          run={run}
        />
      </section>
    );
  }

  if (selectedProduct !== null && editVariantId === null) {
    return (
      <section className="catalog-section" aria-label="Məhsul detalları">
        <ProductDetailView
          key={selectedProduct.id}
          product={selectedProduct}
          onBack={leaveDetail}
          canEditVariant={canEditVariant}
          canCatalog={canCatalog}
          onDeleteVariant={onDeleteVariant}
          run={run}
        />
      </section>
    );
  }

  return (
    <section className="catalog-section" aria-label="Məhsullar">
      <ProductListView
        products={products}
        canCatalog={canCatalog}
        canEditVariant={canEditVariant}
        onDeleteProduct={onDeleteProduct}
        onDeleteVariant={onDeleteVariant}
        run={run}
      />
    </section>
  );
}
