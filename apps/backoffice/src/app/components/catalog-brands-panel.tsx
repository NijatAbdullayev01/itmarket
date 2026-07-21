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
import { useConfirmDialog } from "@itmarket/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { slugify } from "../../lib/slugify";

type Brand = {
  id: string;
  name: string;
  slug?: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
};

function isBrandActive(brand: Brand) {
  return brand.status !== "DRAFT" && brand.status !== "ARCHIVED";
}

type RunFn = <T>(
  action: () => Promise<T>,
  success: string,
  options?: { refresh?: boolean; onSuccess?: (result: T) => void },
) => Promise<T | null>;

type CatalogBrandsPanelProps = {
  brands: Brand[];
  canCatalog: boolean;
  canCatalogRead: boolean;
  onCreateBrand: (form: FormData) => Promise<unknown>;
  onDeleteBrand: (brandId: string) => Promise<unknown>;
  onUpdateBrandStatus: (brand: Brand) => Promise<unknown>;
  run: RunFn;
};

type BrandFieldKey = "name" | "slug";

type BrandFieldErrors = Partial<Record<BrandFieldKey, string>>;

const BRAND_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readBrandField(formData: FormData, key: BrandFieldKey) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function resolveBrandSlug(name: string, slug: string) {
  const trimmedSlug = slug.trim();
  if (trimmedSlug !== "") {
    return trimmedSlug;
  }

  return slugify(name);
}

function validateBrandForm(formData: FormData): BrandFieldErrors {
  const errors: BrandFieldErrors = {};
  const name = readBrandField(formData, "name");
  const slug = resolveBrandSlug(name, readBrandField(formData, "slug"));

  if (name === "") {
    errors.name = "Ad tələb olunur";
  }

  if (slug === "") {
    errors.slug = "Slug tələb olunur";
  } else if (!BRAND_SLUG_PATTERN.test(slug)) {
    errors.slug = "Slug kiçik hərflər, rəqəmlər və tire ilə yazılmalıdır";
  }

  return errors;
}

function BrandListView({
  brands,
  canCatalog,
  onDeleteBrand,
  onUpdateBrandStatus,
  run,
}: {
  brands: Brand[];
  canCatalog: boolean;
  onDeleteBrand: (brandId: string) => Promise<unknown>;
  onUpdateBrandStatus: (brand: Brand) => Promise<unknown>;
  run: RunFn;
}) {
  const { requestConfirm, confirmDialog } = useConfirmDialog();
  const [searchQuery, setSearchQuery] = useState("");

  const sortedBrands = useMemo(
    () => [...brands].sort((left, right) => left.name.localeCompare(right.name, "az")),
    [brands],
  );

  const filteredBrands = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("az");

    if (normalizedQuery === "") {
      return sortedBrands;
    }

    return sortedBrands.filter(
      (brand) =>
        brand.name.toLocaleLowerCase("az").includes(normalizedQuery) ||
        (brand.slug ?? "").toLocaleLowerCase("az").includes(normalizedQuery),
    );
  }, [searchQuery, sortedBrands]);

  const isFiltering = searchQuery.trim() !== "";

  return (
    <>
      <div
        className="catalog-metrics catalog-metrics--single"
        aria-label="Brend statistikası"
      >
        <div className="catalog-metric">
          <span className="catalog-metric__label catalog-metric__label--title">
            Brendlərin sayı
          </span>
          <strong className="catalog-metric__value catalog-metric__value--compact">
            {brands.length}
          </strong>
        </div>
      </div>
      {isFiltering ? (
        <div className="catalog-metrics catalog-metrics--single">
          <div className="catalog-metric catalog-metric--accent">
            <span className="catalog-metric__label catalog-metric__label--title">
              Nəticə
            </span>
            <strong className="catalog-metric__value catalog-metric__value--compact">
              {filteredBrands.length}
            </strong>
          </div>
        </div>
      ) : null}

      <div className="catalog-subcategories-board">
        <header className="catalog-subcategories-toolbar">
          <div className="catalog-subcategories-toolbar__filters">
            <label className="catalog-subcategories-filter">
              <span className="catalog-subcategories-filter__label">Axtarış</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Ad və ya slug"
                autoComplete="off"
              />
            </label>
          </div>
        </header>

        <div className="catalog-subcategories-table-wrap">
          {brands.length === 0 ? (
            <div className="catalog-subcategories-empty">
              <strong>Brend tapılmadı</strong>
              <p>İlk brendi yaratmaq üçün sol menyudan «Yeni brend» seçin.</p>
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="catalog-subcategories-empty">
              <strong>Filtrə uyğun nəticə tapılmadı</strong>
              <p>Axtarış sorğusunu dəyişdirin.</p>
            </div>
          ) : (
            <ul className="catalog-subcategories-group__list">
              {filteredBrands.map((brand) => {
                const brandIsActive = isBrandActive(brand);

                return (
                  <li
                    key={brand.id}
                    className={[
                      "catalog-subcategories-item",
                      !brandIsActive ? "catalog-subcategories-item--inactive" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="catalog-subcategories-item__main catalog-subcategories-item__main--stacked">
                      <strong className="catalog-subcategories-item__name">
                        {brand.name}
                      </strong>
                      {brand.slug ? (
                        <span className="catalog-subcategories-item__meta">
                          {brand.slug}
                        </span>
                      ) : null}
                    </div>
                    <div className="catalog-subcategories-item__actions">
                      {canCatalog ? (
                        <>
                          <button
                            type="button"
                            className={
                              brandIsActive
                                ? "catalog-subcategories-toggle catalog-subcategories-toggle--deactivate"
                                : "catalog-subcategories-toggle catalog-subcategories-toggle--activate"
                            }
                            aria-label={
                              brandIsActive
                                ? `${brand.name} brendini deaktiv et`
                                : `${brand.name} brendini aktiv et`
                            }
                            onClick={() => {
                              void run(
                                () => onUpdateBrandStatus(brand),
                                brandIsActive
                                  ? "Brend deaktiv edildi"
                                  : "Brend aktiv edildi",
                              );
                            }}
                          >
                            {brandIsActive ? "Deaktiv et" : "Aktiv et"}
                          </button>
                          <button
                            type="button"
                            className="catalog-subcategories-delete"
                            aria-label={`${brand.name} brendini sil`}
                            onClick={() =>
                              requestConfirm({
                                title: "Brendi sil",
                                message: `"${brand.name}" brendini silmək istəyirsiniz? Bu əməliyyat geri qaytarıla bilməz.`,
                                onConfirm: async () => {
                                  await run(
                                    () => onDeleteBrand(brand.id),
                                    "Brend silindi",
                                  );
                                },
                              })
                            }
                          >
                            Sil
                          </button>
                        </>
                      ) : (
                        <span className="catalog-subcategories-readonly">
                          Yalnız oxuma
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      {confirmDialog}
    </>
  );
}

function BrandCreateView({
  onCreateBrand,
  onCancel,
  run,
}: {
  onCreateBrand: (form: FormData) => Promise<unknown>;
  onCancel: () => void;
  run: RunFn;
}) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const slugManuallyEdited = useRef(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [fieldErrors, setFieldErrors] = useState<BrandFieldErrors>({});

  function clearFieldError(field: BrandFieldKey) {
    setFieldErrors((current) => {
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
    const resolvedSlug = resolveBrandSlug(
      readBrandField(formData, "name"),
      readBrandField(formData, "slug"),
    );

    if (resolvedSlug !== readBrandField(formData, "slug")) {
      formData.set("slug", resolvedSlug);
    }

    const nextFieldErrors = validateBrandForm(formData);

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);

      const firstInvalidField = (["name", "slug"] as const).find(
        (field) => nextFieldErrors[field] !== undefined,
      );

      if (firstInvalidField !== undefined) {
        formRef.current
          ?.querySelector<HTMLElement>(`[name="${firstInvalidField}"]`)
          ?.focus({ preventScroll: true });
      }

      return;
    }

    setFieldErrors({});
    void run(() => onCreateBrand(formData), "Brend yaradıldı", {
      onSuccess: () => {
        onCancel();
      },
    });
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

  return (
    <div className="catalog-subcategories-board">
      <form
        ref={formRef}
        id="catalog-brand-form"
        className="catalog-subcategories-form"
        noValidate
        onSubmit={handleSubmit}
      >
        <header className="catalog-subcategories-form__head">
          <div>
            <h2>Yeni brend</h2>
            <p>Ad daxil edin; slug avtomatik yaranır. Lazım olsa slug-u əl ilə dəyişə bilərsiniz.</p>
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
              maxLength={120}
              placeholder="Məs: Lenovo"
              value={name}
              aria-invalid={fieldErrors.name !== undefined}
              aria-describedby={
                fieldErrors.name !== undefined ? `${formId}-name-error` : undefined
              }
              onChange={(event) => applyNameChange(event.target.value)}
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
              required
              placeholder="lenovo"
              value={slug}
              aria-invalid={fieldErrors.slug !== undefined}
              aria-describedby={
                fieldErrors.slug !== undefined ? `${formId}-slug-error` : undefined
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
            Yarat
          </button>
        </footer>
      </form>
    </div>
  );
}

export function CatalogBrandsPanel({
  brands,
  canCatalog,
  canCatalogRead,
  onCreateBrand,
  onDeleteBrand,
  onUpdateBrandStatus,
  run,
}: CatalogBrandsPanelProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isCreateMode = canCatalog && searchParams.get("create") === "brand";

  const leaveCreateMode = () => {
    router.replace(pathname, { scroll: false });
  };

  useEffect(() => {
    if (!canCatalog && searchParams.get("create") === "brand") {
      router.replace(pathname, { scroll: false });
    }
  }, [canCatalog, pathname, router, searchParams]);

  if (!canCatalog && !canCatalogRead) {
    return null;
  }

  return (
    <section
      className="catalog-subcategories-page"
      aria-label={isCreateMode ? "Yeni brend" : "Brendlər"}
    >
      {isCreateMode ? (
        <BrandCreateView
          key="brand-create"
          onCreateBrand={onCreateBrand}
          onCancel={leaveCreateMode}
          run={run}
        />
      ) : (
        <BrandListView
          key="brand-list"
          brands={brands}
          canCatalog={canCatalog}
          onDeleteBrand={onDeleteBrand}
          onUpdateBrandStatus={onUpdateBrandStatus}
          run={run}
        />
      )}
    </section>
  );
}
