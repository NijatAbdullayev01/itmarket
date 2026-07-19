"use client";

import {
  getProductImageAlt,
  getProductImageUrl,
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
  type FormEvent,
} from "react";

import { slugify } from "../../lib/slugify";

type Brand = { id: string; name: string };
type Category = { id: string; name: string; parentId?: string | null };

type ProductVariant = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  brand: { id: string; name: string } | null;
  variants: ProductVariant[];
  media: ProductMedia[];
};

type RunFn = <T>(
  action: () => Promise<T>,
  success: string,
  options?: { refresh?: boolean; onSuccess?: (result: T) => void },
) => Promise<T | null>;

type CatalogProductsPanelProps = {
  products: Product[];
  brands: Brand[];
  categories: Category[];
  canCatalog: boolean;
  canCatalogRead: boolean;
  onCreateProduct: (form: FormData) => Promise<{ id: string }>;
  run: RunFn;
};

const PRODUCT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type ProductFieldKey = "name" | "slug" | "categoryId";
type ProductFieldErrors = Partial<Record<ProductFieldKey, string>>;

function readFormField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function resolveProductSlug(name: string, slug: string) {
  const trimmedSlug = slug.trim();
  if (trimmedSlug !== "") {
    return trimmedSlug;
  }

  return slugify(name);
}

function validateProductForm(formData: FormData): ProductFieldErrors {
  const errors: ProductFieldErrors = {};
  const name = readFormField(formData, "name");
  const slug = resolveProductSlug(name, readFormField(formData, "slug"));
  const categoryId = readFormField(formData, "categoryId");

  if (name === "") {
    errors.name = "Ad tələb olunur";
  }

  if (slug === "") {
    errors.slug = "Slug tələb olunur";
  } else if (!PRODUCT_SLUG_PATTERN.test(slug)) {
    errors.slug = "Slug kiçik hərflər, rəqəmlər və tire ilə yazılmalıdır";
  }

  if (categoryId === "") {
    errors.categoryId = "Kateqoriya seçin";
  }

  return errors;
}

function useSortedCategories(categories: Category[]) {
  return useMemo(() => {
    const byId = new Map(categories.map((category) => [category.id, category]));
    const labelFor = (category: Category): string => {
      const parent =
        category.parentId != null ? byId.get(category.parentId) : undefined;
      return parent ? `${parent.name} / ${category.name}` : category.name;
    };

    return [...categories]
      .map((category) => ({ ...category, label: labelFor(category) }))
      .sort((left, right) => left.label.localeCompare(right.label, "az"));
  }, [categories]);
}

function ProductCreateView({
  brands,
  categories,
  onCreateProduct,
  onCancel,
  onCreated,
  run,
}: {
  brands: Brand[];
  categories: Category[];
  onCreateProduct: (form: FormData) => Promise<{ id: string }>;
  onCancel: () => void;
  onCreated: (productId: string) => void;
  run: RunFn;
}) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const slugManuallyEdited = useRef(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ProductFieldErrors>({});
  const sortedCategories = useSortedCategories(categories);
  const sortedBrands = useMemo(
    () => [...brands].sort((left, right) => left.name.localeCompare(right.name, "az")),
    [brands],
  );

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

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    const nextName = event.target.value;
    setName(nextName);
    clearFieldError("name");

    if (!slugManuallyEdited.current) {
      setSlug(slugify(nextName));
      clearFieldError("slug");
    }
  }

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
    );

    if (resolvedSlug !== readFormField(formData, "slug")) {
      formData.set("slug", resolvedSlug);
    }

    const nextFieldErrors = validateProductForm(formData);

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);

      const firstInvalidField = (
        ["name", "slug", "categoryId"] as const
      ).find((field) => nextFieldErrors[field] !== undefined);

      if (firstInvalidField !== undefined) {
        formRef.current
          ?.querySelector<HTMLElement>(`[name="${firstInvalidField}"]`)
          ?.focus({ preventScroll: true });
      }

      return;
    }

    setFieldErrors({});
    void run(() => onCreateProduct(formData), "Məhsul yaradıldı").then(
      (created) => {
        if (created !== null) {
          onCreated(created.id);
        }
      },
    );
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

  if (sortedCategories.length === 0) {
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
            <h2>Yeni məhsul</h2>
            <p>
              Yalnız məhsul məlumatlarını daxil edin. Variant və SKU-nu məhsul
              yarandıqdan sonra təyin edəcəksiniz.
            </p>
          </div>
        </header>

        <div className="catalog-subcategories-form__grid">
          <label
            className={
              fieldErrors.name !== undefined
                ? "catalog-subcategories-form__field catalog-subcategories-form__field--error"
                : "catalog-subcategories-form__field"
            }
          >
            <span>Ad</span>
            <input
              name="name"
              required
              maxLength={200}
              value={name}
              placeholder="Məs: Apple MacBook Air 13"
              aria-invalid={fieldErrors.name !== undefined}
              aria-describedby={
                fieldErrors.name !== undefined ? `${formId}-name-error` : undefined
              }
              onChange={handleNameChange}
            />
            {fieldErrors.name !== undefined ? (
              <p
                id={`${formId}-name-error`}
                className="catalog-subcategories-form__field-error"
                role="alert"
              >
                {fieldErrors.name}
              </p>
            ) : null}
          </label>

          <label
            className={
              fieldErrors.slug !== undefined
                ? "catalog-subcategories-form__field catalog-subcategories-form__field--error"
                : "catalog-subcategories-form__field"
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
            ) : null}
          </label>

          {fieldErrors.slug === undefined ? (
            <p
              id={`${formId}-slug-hint`}
              className="catalog-subcategories-form__field-hint catalog-subcategories-form__field-hint--slug"
            >
              Ad yazdıqca avtomatik doldurulur; istəsəniz dəyişə bilərsiniz.
            </p>
          ) : null}

          <label
            className={
              fieldErrors.categoryId !== undefined
                ? "catalog-subcategories-form__field catalog-subcategories-form__field--wide catalog-subcategories-form__field--error"
                : "catalog-subcategories-form__field catalog-subcategories-form__field--wide"
            }
          >
            <span>Kateqoriya</span>
            <select
              name="categoryId"
              required
              defaultValue=""
              aria-invalid={fieldErrors.categoryId !== undefined}
              aria-describedby={
                fieldErrors.categoryId !== undefined
                  ? `${formId}-category-id-error`
                  : undefined
              }
              onChange={() => clearFieldError("categoryId")}
            >
              <option value="">Kateqoriya seçin</option>
              {sortedCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
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

          <label className="catalog-subcategories-form__field catalog-subcategories-form__field--wide">
            <span>Brend (istəyə bağlı)</span>
            <select name="brandId" defaultValue="">
              <option value="">Brend seçilməyib</option>
              {sortedBrands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>
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
            Məhsul yarat
          </button>
        </footer>
      </form>
    </div>
  );
}

function ProductDetailView({
  product,
  onBack,
}: {
  product: Product;
  onBack: () => void;
}) {
  const primaryImage = product.media[0] ?? null;
  const imageUrl = getProductImageUrl(primaryImage);
  const imageAlt = getProductImageAlt(primaryImage, product.name);
  const sortedVariants = useMemo(
    () =>
      [...product.variants].sort((left, right) =>
        left.sku.localeCompare(right.sku, "az"),
      ),
    [product.variants],
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
          <strong className="catalog-product-detail__name">{product.name}</strong>
          <span className="catalog-product-detail__meta">
            {product.brand ? product.brand.name : "Brend yoxdur"}
            {" · "}
            {product.slug}
          </span>
          <span className="catalog-product-detail__meta">
            {product.variants.length} variant
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
            {sortedVariants.map((variant) => (
              <li key={variant.id} className="catalog-product-detail__variant">
                <strong className="catalog-product-detail__variant-name">
                  {variant.name}
                </strong>
                <span className="catalog-product-detail__variant-meta">
                  SKU: {variant.sku}
                  {variant.barcode ? ` · Barkod: ${variant.barcode}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ProductListView({ products }: { products: Product[] }) {
  const pathname = usePathname();
  const sortedProducts = useMemo(
    () => [...products].sort((left, right) => left.name.localeCompare(right.name, "az")),
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
            {products.length}
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
            {sortedProducts.length === 0 ? (
              <p className="pos-empty">
                Hələ məhsul yoxdur. Sol menyudan «Yeni məhsul yarat» seçin.
              </p>
            ) : (
              <ul className="catalog-products-list">
                {sortedProducts.map((product) => {
                  const primaryImage = product.media[0] ?? null;
                  const imageUrl = getProductImageUrl(primaryImage);
                  const imageAlt = getProductImageAlt(primaryImage, product.name);
                  const variantCount = product.variants.length;

                  return (
                    <li key={product.id} className="catalog-products-item">
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
                          {product.name}
                        </strong>
                        <span className="catalog-products-item__meta">
                          {product.brand ? product.brand.name : "Brend yoxdur"}
                          {" · "}
                          {variantCount} variant
                        </span>
                      </div>
                      <div className="catalog-products-item__actions">
                        <Link
                          href={`${pathname}?view=${encodeURIComponent(product.id)}`}
                          className="catalog-products-view"
                          scroll={false}
                        >
                          Bax
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
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
  run,
}: CatalogProductsPanelProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const viewId = searchParams.get("view");
  const isCreateMode = canCatalog && searchParams.get("create") === "product";

  const selectedProduct = useMemo(
    () =>
      viewId === null
        ? null
        : (products.find((product) => product.id === viewId) ?? null),
    [products, viewId],
  );

  useEffect(() => {
    if (viewId !== null && selectedProduct === null && !isCreateMode) {
      router.replace(pathname, { scroll: false });
    }
  }, [isCreateMode, pathname, router, selectedProduct, viewId]);

  useEffect(() => {
    if (!canCatalog && searchParams.get("create") === "product") {
      router.replace(pathname, { scroll: false });
    }
  }, [canCatalog, pathname, router, searchParams]);

  const leaveCreateMode = () => {
    router.replace(pathname, { scroll: false });
  };

  const leaveDetail = () => {
    router.replace(pathname, { scroll: false });
  };

  const openCreatedProduct = (productId: string) => {
    router.replace(
      `${pathname}?view=${encodeURIComponent(productId)}`,
      { scroll: false },
    );
  };

  if (!canCatalog && !canCatalogRead) {
    return null;
  }

  if (isCreateMode) {
    return (
      <section className="catalog-subcategories-page" aria-label="Yeni məhsul">
        <ProductCreateView
          key="product-create"
          brands={brands}
          categories={categories}
          onCreateProduct={onCreateProduct}
          onCancel={leaveCreateMode}
          onCreated={openCreatedProduct}
          run={run}
        />
      </section>
    );
  }

  if (selectedProduct !== null) {
    return (
      <section className="catalog-section" aria-label="Məhsul detalları">
        <ProductDetailView
          key={selectedProduct.id}
          product={selectedProduct}
          onBack={leaveDetail}
        />
      </section>
    );
  }

  return (
    <section className="catalog-section" aria-label="Məhsullar">
      <ProductListView products={products} />
    </section>
  );
}
