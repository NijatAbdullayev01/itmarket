"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { CategoryIcon, getRootCategories } from "@itmarket/ui";

type Category = {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
  sortOrder?: number;
};

type SubcategoryRow = Category & {
  parentName: string;
};

type SubcategoryGroup = {
  parentId: string;
  parentName: string;
  parentSlug: string;
  items: SubcategoryRow[];
};

type RunFn = <T>(
  action: () => Promise<T>,
  success: string,
  options?: { refresh?: boolean; onSuccess?: (result: T) => void },
) => Promise<T | null>;

type CatalogSubcategoriesPanelProps = {
  categories: Category[];
  canCatalog: boolean;
  canCatalogRead: boolean;
  onCreateCategory: (form: FormData) => Promise<unknown>;
  onDeleteCategory: (categoryId: string) => Promise<unknown>;
  run: RunFn;
};

function useSubcategoryData(categories: Category[]) {
  const rootCategories = useMemo(
    () => getRootCategories(categories),
    [categories],
  );

  const parentById = useMemo(
    () =>
      new Map(
        rootCategories.map((category) => [
          category.id,
          { name: category.name, slug: category.slug ?? "" },
        ]),
      ),
    [rootCategories],
  );

  const rootCategoryOrder = useMemo(
    () =>
      new Map(rootCategories.map((category, index) => [category.id, index])),
    [rootCategories],
  );

  const subcategories = useMemo<SubcategoryRow[]>(
    () => {
      const rows = categories
        .filter((category) => category.parentId != null)
        .map((category) => ({
          ...category,
          parentName:
            parentById.get(String(category.parentId))?.name ?? "Naməlum kateqoriya",
        }));

      return rows.sort((left, right) => {
        const leftParentIndex =
          rootCategoryOrder.get(String(left.parentId)) ?? Number.MAX_SAFE_INTEGER;
        const rightParentIndex =
          rootCategoryOrder.get(String(right.parentId)) ?? Number.MAX_SAFE_INTEGER;

        if (leftParentIndex !== rightParentIndex) {
          return leftParentIndex - rightParentIndex;
        }

        return left.name.localeCompare(right.name, "az");
      });
    },
    [categories, parentById, rootCategoryOrder],
  );

  const parentSlugById = useMemo(
    () =>
      new Map(
        rootCategories.map((category) => [category.id, category.slug ?? ""]),
      ),
    [rootCategories],
  );

  return { rootCategories, rootCategoryOrder, subcategories, parentSlugById };
}

type SubcategoryListViewProps = {
  subcategories: SubcategoryRow[];
  rootCategoryOrder: Map<string, number>;
  parentSlugById: Map<string, string>;
  canCatalog: boolean;
  onDeleteCategory: (categoryId: string) => Promise<unknown>;
  run: RunFn;
};

function SubcategoryListView({
  subcategories,
  rootCategoryOrder,
  parentSlugById,
  canCatalog,
  onDeleteCategory,
  run,
}: SubcategoryListViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(),
  );

  const filteredSubcategories = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("az");

    if (normalizedQuery === "") {
      return subcategories;
    }

    return subcategories.filter(
      (subcategory) =>
        subcategory.name.toLocaleLowerCase("az").includes(normalizedQuery) ||
        subcategory.parentName.toLocaleLowerCase("az").includes(normalizedQuery) ||
        (subcategory.slug ?? "").toLocaleLowerCase("az").includes(normalizedQuery),
    );
  }, [searchQuery, subcategories]);

  const groupedSubcategories = useMemo<SubcategoryGroup[]>(() => {
    const groups = new Map<string, SubcategoryGroup>();

    for (const subcategory of filteredSubcategories) {
      const parentId = String(subcategory.parentId);
      const existing = groups.get(parentId);

      if (existing) {
        existing.items.push(subcategory);
        continue;
      }

      groups.set(parentId, {
        parentId,
        parentName: subcategory.parentName,
        parentSlug: parentSlugById.get(parentId) ?? "",
        items: [subcategory],
      });
    }

    return [...groups.values()].sort((left, right) => {
      const leftIndex =
        rootCategoryOrder.get(left.parentId) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex =
        rootCategoryOrder.get(right.parentId) ?? Number.MAX_SAFE_INTEGER;
      return leftIndex - rightIndex;
    });
  }, [filteredSubcategories, parentSlugById, rootCategoryOrder]);

  const isFiltering = searchQuery.trim() !== "";

  function isGroupExpanded(parentId: string) {
    return !collapsedGroups.has(parentId);
  }

  function toggleGroup(parentId: string) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  }

  function renderSubcategoryItem(subcategory: SubcategoryRow) {
    return (
      <li key={subcategory.id} className="catalog-subcategories-item">
        <div className="catalog-subcategories-item__main">
          <strong className="catalog-subcategories-item__name">
            {subcategory.name}
          </strong>
        </div>
        <div className="catalog-subcategories-item__actions">
          {canCatalog ? (
            <button
              type="button"
              className="catalog-subcategories-delete"
              aria-label={`${subcategory.name} alt kateqoriyasını sil`}
              onClick={() => {
                if (
                  !window.confirm(
                    `"${subcategory.name}" alt kateqoriyasını silmək istəyirsiniz?`,
                  )
                ) {
                  return;
                }
                void run(
                  () => onDeleteCategory(subcategory.id),
                  "Alt kateqoriya silindi",
                );
              }}
            >
              Sil
            </button>
          ) : (
            <span className="catalog-subcategories-readonly">Yalnız oxuma</span>
          )}
        </div>
      </li>
    );
  }

  return (
    <>
      <div
        className="catalog-metrics catalog-metrics--single"
        aria-label="Alt kateqoriya statistikası"
      >
        <div className="catalog-metric">
          <span className="catalog-metric__label catalog-metric__label--title">
            Alt kateqoriyaların sayı
          </span>
          <strong className="catalog-metric__value catalog-metric__value--compact">
            {subcategories.length}
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
              {filteredSubcategories.length}
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
                placeholder="Ad, slug və ya əsas kateqoriya"
                autoComplete="off"
              />
            </label>
          </div>
        </header>

        <div className="catalog-subcategories-table-wrap">
          {subcategories.length === 0 ? null : filteredSubcategories.length === 0 ? (
            <div className="catalog-subcategories-empty">
              <strong>Filtrə uyğun nəticə tapılmadı</strong>
              <p>Axtarış sorğusunu dəyişdirin.</p>
            </div>
          ) : (
            groupedSubcategories.map((group) => {
              const isExpanded = isGroupExpanded(group.parentId);
              const groupBodyId = `subcategory-group-${group.parentId}`;

              return (
                <section
                  key={group.parentId}
                  className={`catalog-subcategories-group${isExpanded ? " is-expanded" : ""}`}
                  aria-label={`${group.parentName} alt kateqoriyaları`}
                >
                  <header className="catalog-subcategories-group__head">
                    <button
                      type="button"
                      className="catalog-subcategories-group__toggle"
                      aria-expanded={isExpanded}
                      aria-controls={groupBodyId}
                      onClick={() => toggleGroup(group.parentId)}
                    >
                      <span
                        className="catalog-subcategories-group__chevron"
                        aria-hidden="true"
                      />
                      <CategoryIcon
                        name={group.parentName}
                        slug={group.parentSlug}
                        className="catalog-subcategories-group__icon"
                      />
                      <span className="catalog-subcategories-group__copy">
                        <span className="catalog-subcategories-group__name">
                          {group.parentName}
                        </span>
                      </span>
                      <span className="catalog-subcategories-group__count">
                        {group.items.length}
                      </span>
                    </button>
                  </header>
                  <div
                    id={groupBodyId}
                    className="catalog-subcategories-group__body"
                    aria-hidden={!isExpanded}
                  >
                    <div className="catalog-subcategories-group__body-inner">
                      <ul className="catalog-subcategories-group__list">
                        {group.items.map((subcategory) =>
                          renderSubcategoryItem(subcategory),
                        )}
                      </ul>
                    </div>
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

type SubcategoryFieldKey = "parentId" | "name" | "slug";

type SubcategoryFieldErrors = Partial<Record<SubcategoryFieldKey, string>>;

const SUBCATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readSubcategoryField(formData: FormData, key: SubcategoryFieldKey) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validateSubcategoryForm(formData: FormData): SubcategoryFieldErrors {
  const errors: SubcategoryFieldErrors = {};
  const parentId = readSubcategoryField(formData, "parentId");
  const name = readSubcategoryField(formData, "name");
  const slug = readSubcategoryField(formData, "slug");

  if (parentId === "") {
    errors.parentId = "Əsas kateqoriya seçilməlidir";
  }

  if (name === "") {
    errors.name = "Ad tələb olunur";
  }

  if (slug === "") {
    errors.slug = "Slug tələb olunur";
  } else if (!SUBCATEGORY_SLUG_PATTERN.test(slug)) {
    errors.slug = "Slug kiçik hərflər, rəqəmlər və tire ilə yazılmalıdır";
  }

  return errors;
}

type SubcategoryCreateViewProps = {
  rootCategories: Category[];
  onCreateCategory: (form: FormData) => Promise<unknown>;
  onCancel: () => void;
  run: RunFn;
};

function SubcategoryCreateView({
  rootCategories,
  onCreateCategory,
  onCancel,
  run,
}: SubcategoryCreateViewProps) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [fieldErrors, setFieldErrors] = useState<SubcategoryFieldErrors>({});

  function clearFieldError(field: SubcategoryFieldKey) {
    setFieldErrors((current) => {
      if (current[field] === undefined) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextFieldErrors = validateSubcategoryForm(formData);

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);

      const firstInvalidField = (
        ["parentId", "name", "slug"] as const
      ).find((field) => nextFieldErrors[field] !== undefined);

      if (firstInvalidField !== undefined) {
        formRef.current
          ?.querySelector<HTMLElement>(`[name="${firstInvalidField}"]`)
          ?.focus({ preventScroll: true });
      }

      return;
    }

    setFieldErrors({});
    void run(() => onCreateCategory(formData), "Alt kateqoriya yaradıldı", {
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
    form.querySelector<HTMLSelectElement>('select[name="parentId"]')?.focus({
      preventScroll: true,
    });
  }, []);

  if (rootCategories.length === 0) {
    return (
      <div className="catalog-subcategories-board">
        <p className="catalog-subcategories-note" role="status">
          Alt kateqoriya yaratmaq üçün əvvəlcə əsas kateqoriya əlavə edin.
        </p>
      </div>
    );
  }

  return (
    <div className="catalog-subcategories-board">
      <form
        ref={formRef}
        id="catalog-subcategory-form"
        className="catalog-subcategories-form"
        noValidate
        onSubmit={handleSubmit}
      >
        <header className="catalog-subcategories-form__head">
          <div>
            <h2>Yeni alt kateqoriya</h2>
            <p>Əsas kateqoriya seçib ad və slug daxil edin.</p>
          </div>
        </header>

        <div className="catalog-subcategories-form__grid">
          <label
            className={
              fieldErrors.parentId !== undefined
                ? "catalog-subcategories-form__field catalog-subcategories-form__field--wide catalog-subcategories-form__field--error"
                : "catalog-subcategories-form__field catalog-subcategories-form__field--wide"
            }
          >
            <span>Əsas kateqoriya</span>
            <select
              name="parentId"
              required
              defaultValue=""
              aria-invalid={fieldErrors.parentId !== undefined}
              aria-describedby={
                fieldErrors.parentId !== undefined
                  ? `${formId}-parent-id-error`
                  : undefined
              }
              onChange={() => clearFieldError("parentId")}
            >
              <option value="">Kateqoriya seçin</option>
              {rootCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {fieldErrors.parentId !== undefined ? (
              <p
                id={`${formId}-parent-id-error`}
                className="catalog-subcategories-form__field-error"
                role="alert"
              >
                {fieldErrors.parentId}
              </p>
            ) : null}
          </label>

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
              placeholder="Məs: Oyun noutbukları"
              aria-invalid={fieldErrors.name !== undefined}
              aria-describedby={
                fieldErrors.name !== undefined
                  ? `${formId}-name-error`
                  : undefined
              }
              onChange={() => clearFieldError("name")}
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
              placeholder="oyun-noutbuklari"
              aria-invalid={fieldErrors.slug !== undefined}
              aria-describedby={
                fieldErrors.slug !== undefined
                  ? `${formId}-slug-error`
                  : undefined
              }
              onChange={() => clearFieldError("slug")}
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

export function CatalogSubcategoriesPanel({
  categories,
  canCatalog,
  canCatalogRead,
  onCreateCategory,
  onDeleteCategory,
  run,
}: CatalogSubcategoriesPanelProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isCreateMode =
    canCatalog && searchParams.get("create") === "subcategory";

  const { rootCategories, rootCategoryOrder, subcategories, parentSlugById } =
    useSubcategoryData(categories);

  const leaveCreateMode = () => {
    router.replace(pathname, { scroll: false });
  };

  useEffect(() => {
    if (!canCatalog && searchParams.get("create") === "subcategory") {
      router.replace(pathname, { scroll: false });
    }
  }, [canCatalog, pathname, router, searchParams]);

  if (!canCatalog && !canCatalogRead) {
    return null;
  }

  return (
    <section
      className="catalog-subcategories-page"
      aria-label={isCreateMode ? "Yeni alt kateqoriya" : "Alt kateqoriyalar"}
    >
      {isCreateMode ? (
        <SubcategoryCreateView
          key="subcategory-create"
          rootCategories={rootCategories}
          onCreateCategory={onCreateCategory}
          onCancel={leaveCreateMode}
          run={run}
        />
      ) : (
        <SubcategoryListView
          key="subcategory-list"
          subcategories={subcategories}
          rootCategoryOrder={rootCategoryOrder}
          parentSlugById={parentSlugById}
          canCatalog={canCatalog}
          onDeleteCategory={onDeleteCategory}
          run={run}
        />
      )}
    </section>
  );
}
