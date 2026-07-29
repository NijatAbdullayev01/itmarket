"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type PointerEvent,
} from "react";
import { slugify } from "../../lib/slugify";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { CategoryIcon, getRootCategories, useConfirmDialog } from "@itmarket/ui";
import type {
  CatalogSeoSuggestRequestContract,
  CatalogSeoSuggestResponseContract,
} from "@itmarket/contracts";

import { IconGrip } from "./bo-icons";
import { CatalogSeoSuggestFields } from "./catalog-seo-suggest-fields";

type Category = {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
  sortOrder?: number;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

function isCategoryActive(category: Category) {
  return category.status !== "DRAFT" && category.status !== "ARCHIVED";
}
type RunFn = <T>(
  action: () => Promise<T>,
  success: string,
  options?: { refresh?: boolean; onSuccess?: (result: T) => void },
) => Promise<T | null>;

type CatalogCategoriesPanelProps = {
  categories: Category[];
  canCatalog: boolean;
  canCatalogRead: boolean;
  onCreateCategory: (form: FormData) => Promise<unknown>;
  onUpdateCategory: (category: Category, form: FormData) => Promise<unknown>;
  onDeleteCategory: (categoryId: string) => Promise<unknown>;
  onUpdateCategoryStatus: (category: Category) => Promise<unknown>;
  onReorderCategories: (orderedIds: string[]) => Promise<unknown>;
  suggestSeo: (
    input: CatalogSeoSuggestRequestContract,
  ) => Promise<CatalogSeoSuggestResponseContract>;
  run: RunFn;
};

function useRootCategories(categories: Category[]) {
  return useMemo(() => getRootCategories(categories), [categories]);
}

function reorderCategoriesById(
  categories: Category[],
  activeId: string,
  overId: string,
): Category[] {
  const activeIndex = categories.findIndex((category) => category.id === activeId);
  const overIndex = categories.findIndex((category) => category.id === overId);

  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
    return categories;
  }

  const next = [...categories];
  const [moved] = next.splice(activeIndex, 1);
  next.splice(overIndex, 0, moved);
  return next;
}

type CategoryListViewProps = {
  rootCategories: Category[];
  canCatalog: boolean;
  onEditCategory: (categoryId: string) => void;
  onDeleteCategory: (categoryId: string) => Promise<unknown>;
  onUpdateCategoryStatus: (category: Category) => Promise<unknown>;
  onReorderCategories: (orderedIds: string[]) => Promise<unknown>;
  run: RunFn;
};

function CategoryListView({
  rootCategories,
  canCatalog,
  onEditCategory,
  onDeleteCategory,
  onUpdateCategoryStatus,
  onReorderCategories,
  run,
}: CategoryListViewProps) {
  const { requestConfirm, confirmDialog } = useConfirmDialog();
  const [searchQuery, setSearchQuery] = useState("");
  const rootCategoriesKey = rootCategories.map((category) => category.id).join(",");
  const [orderedCategories, setOrderedCategories] = useState(rootCategories);
  const [orderedCategoriesSourceKey, setOrderedCategoriesSourceKey] =
    useState(rootCategoriesKey);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragEnabledRef = useRef(false);

  if (rootCategoriesKey !== orderedCategoriesSourceKey) {
    setOrderedCategoriesSourceKey(rootCategoriesKey);
    setOrderedCategories(rootCategories);
  }

  const filteredCategories = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("az");

    if (normalizedQuery === "") {
      return orderedCategories;
    }

    return orderedCategories.filter(
      (category) =>
        category.name.toLocaleLowerCase("az").includes(normalizedQuery) ||
        (category.slug ?? "").toLocaleLowerCase("az").includes(normalizedQuery),
    );
  }, [orderedCategories, searchQuery]);

  const isFiltering = searchQuery.trim() !== "";
  const canReorder = canCatalog && !isFiltering;

  function resolveCategoryIdFromPoint(clientX: number, clientY: number): string | null {
    const element = document.elementFromPoint(clientX, clientY);
    const categoryId = element
      ?.closest<HTMLElement>("[data-category-id]")
      ?.getAttribute("data-category-id");

    return categoryId ?? null;
  }

  function finishDrag(activeId: string | null, targetId: string | null) {
    dragEnabledRef.current = false;
    setDraggingId(null);
    setOverId(null);

    if (activeId === null || targetId === null || activeId === targetId) {
      return;
    }

    const nextOrder = reorderCategoriesById(orderedCategories, activeId, targetId);
    setOrderedCategories(nextOrder);

    void run(
      () => onReorderCategories(nextOrder.map((category) => category.id)),
      "Kateqoriya sırası yeniləndi",
    ).then((result) => {
      if (result === null) {
        setOrderedCategories(rootCategories);
      }
    });
  }

  function handleDragHandlePointerDown(
    event: PointerEvent<HTMLElement>,
    categoryId: string,
  ) {
    if (!canReorder) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragEnabledRef.current = true;
    setDraggingId(categoryId);
    setOverId(categoryId);
  }

  function handleDragHandlePointerMove(event: PointerEvent<HTMLElement>) {
    if (!dragEnabledRef.current || draggingId === null) {
      return;
    }

    const targetId = resolveCategoryIdFromPoint(event.clientX, event.clientY);
    if (targetId !== null) {
      setOverId(targetId);
    }
  }

  function handleDragHandlePointerUp(event: PointerEvent<HTMLElement>) {
    if (!dragEnabledRef.current) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    finishDrag(draggingId, overId);
  }

  return (
    <>
      <div
        className="catalog-metrics catalog-metrics--single"
        aria-label="Kateqoriya statistikası"
      >
        <div className="catalog-metric">
          <span className="catalog-metric__label catalog-metric__label--title">
            Kateqoriyaların sayı
          </span>
          <strong className="catalog-metric__value catalog-metric__value--compact">
            {rootCategories.length}
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
              {filteredCategories.length}
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
          {rootCategories.length === 0 ? (
            <div className="catalog-subcategories-empty">
              <strong>Kateqoriya tapılmadı</strong>
              <p>İlk əsas kateqoriyanı yaratmaq üçün sol menyudan «Yeni əsas kateqoriya» seçin.</p>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="catalog-subcategories-empty">
              <strong>Filtrə uyğun nəticə tapılmadı</strong>
              <p>Axtarış sorğusunu dəyişdirin.</p>
            </div>
          ) : (
            <ul className="catalog-subcategories-group__list">
              {filteredCategories.map((category) => {
                const categoryIsActive = isCategoryActive(category);

                return (
                <li
                  key={category.id}
                  data-category-id={category.id}
                  className={[
                    "catalog-subcategories-item",
                    canReorder ? "catalog-subcategories-item--draggable" : "",
                    !categoryIsActive ? "catalog-subcategories-item--inactive" : "",
                    draggingId === category.id ? "is-dragging" : "",
                    overId === category.id && draggingId !== category.id
                      ? "is-drop-target"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onPointerDown={(event) => {
                    if (
                      !canReorder ||
                      (event.target as Element).closest(
                        ".catalog-subcategories-item__actions",
                      )
                    ) {
                      return;
                    }

                    handleDragHandlePointerDown(event, category.id);
                  }}
                  onPointerMove={handleDragHandlePointerMove}
                  onPointerUp={handleDragHandlePointerUp}
                  onPointerCancel={handleDragHandlePointerUp}
                >
                  <div className="catalog-subcategories-item__main">
                    {canReorder ? (
                      <span
                        className="catalog-subcategories-item__drag-handle"
                        aria-hidden="true"
                      >
                        <IconGrip />
                      </span>
                    ) : null}
                    <CategoryIcon
                      name={category.name}
                      slug={category.slug ?? ""}
                      className="catalog-subcategories-item__icon"
                    />
                    <strong className="catalog-subcategories-item__name">
                      {category.name}
                    </strong>
                  </div>
                  <div className="catalog-subcategories-item__actions">
                    {canCatalog ? (
                      <>
                        <button
                          type="button"
                          className="catalog-subcategories-toggle"
                          aria-label={`${category.name} kateqoriyasını redaktə et`}
                          onClick={() => onEditCategory(category.id)}
                        >
                          Redaktə et
                        </button>
                        <button
                          type="button"
                          className={
                            categoryIsActive
                              ? "catalog-subcategories-toggle catalog-subcategories-toggle--deactivate"
                              : "catalog-subcategories-toggle catalog-subcategories-toggle--activate"
                          }
                          aria-label={
                            categoryIsActive
                              ? `${category.name} kateqoriyasını deaktiv et`
                              : `${category.name} kateqoriyasını aktiv et`
                          }
                          onClick={() => {
                            void run(
                              () => onUpdateCategoryStatus(category),
                              categoryIsActive
                                ? "Kateqoriya deaktiv edildi"
                                : "Kateqoriya aktiv edildi",
                            );
                          }}
                        >
                          {categoryIsActive ? "Deaktiv et" : "Aktiv et"}
                        </button>
                        <button
                          type="button"
                          className="catalog-subcategories-delete"
                          aria-label={`${category.name} kateqoriyasını sil`}
                          onClick={() =>
                            requestConfirm({
                              title: "Kateqoriyanı sil",
                              message: `"${category.name}" kateqoriyasını silmək istəyirsiniz? Bu əməliyyat geri qaytarıla bilməz.`,
                              onConfirm: async () => {
                                await run(
                                  () => onDeleteCategory(category.id),
                                  "Kateqoriya silindi",
                                );
                              },
                            })
                          }
                        >
                          Sil
                        </button>
                      </>
                    ) : (
                      <span className="catalog-subcategories-readonly">Yalnız oxuma</span>
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

type CategoryFieldKey = "name" | "slug";

type CategoryFieldErrors = Partial<Record<CategoryFieldKey, string>>;

const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readCategoryField(formData: FormData, key: CategoryFieldKey) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function resolveCategorySlug(name: string, slug: string) {
  const trimmedSlug = slug.trim();
  if (trimmedSlug !== "") {
    return trimmedSlug;
  }

  return slugify(name);
}

function validateCategoryForm(formData: FormData): CategoryFieldErrors {
  const errors: CategoryFieldErrors = {};
  const name = readCategoryField(formData, "name");
  const slug = resolveCategorySlug(
    name,
    readCategoryField(formData, "slug"),
  );

  if (name === "") {
    errors.name = "Ad tələb olunur";
  }

  if (slug === "") {
    errors.slug = "Slug tələb olunur";
  } else if (!CATEGORY_SLUG_PATTERN.test(slug)) {
    errors.slug = "Slug kiçik hərflər, rəqəmlər və tire ilə yazılmalıdır";
  }

  return errors;
}

type CategoryCreateViewProps = {
  initialCategory?: Category;
  onCreateCategory: (form: FormData) => Promise<unknown>;
  onUpdateCategory?: (category: Category, form: FormData) => Promise<unknown>;
  onCancel: () => void;
  suggestSeo: (
    input: CatalogSeoSuggestRequestContract,
  ) => Promise<CatalogSeoSuggestResponseContract>;
  run: RunFn;
};

function CategoryCreateView({
  initialCategory,
  onCreateCategory,
  onUpdateCategory,
  onCancel,
  suggestSeo,
  run,
}: CategoryCreateViewProps) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const slugManuallyEdited = useRef(Boolean(initialCategory));
  const isEditing = initialCategory !== undefined;
  const [name, setName] = useState(initialCategory?.name ?? "");
  const [slug, setSlug] = useState(initialCategory?.slug ?? "");
  const [seoTitle, setSeoTitle] = useState(initialCategory?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(
    initialCategory?.seoDescription ?? "",
  );
  const [description, setDescription] = useState(
    initialCategory?.description ?? "",
  );
  const [fieldErrors, setFieldErrors] = useState<CategoryFieldErrors>({});

  function clearFieldError(field: CategoryFieldKey) {
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
    const resolvedSlug = resolveCategorySlug(
      readCategoryField(formData, "name"),
      readCategoryField(formData, "slug"),
    );

    if (resolvedSlug !== readCategoryField(formData, "slug")) {
      formData.set("slug", resolvedSlug);
    }

    const nextFieldErrors = validateCategoryForm(formData);

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
    if (isEditing && initialCategory && onUpdateCategory) {
      void run(
        () => onUpdateCategory(initialCategory, formData),
        "Kateqoriya yeniləndi",
        {
          onSuccess: () => {
            onCancel();
          },
        },
      );
      return;
    }
    void run(() => onCreateCategory(formData), "Əsas kateqoriya yaradıldı", {
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
        id="catalog-category-form"
        className="catalog-subcategories-form"
        noValidate
        onSubmit={handleSubmit}
      >
        <header className="catalog-subcategories-form__head">
          <div>
            <h2>{isEditing ? "Kateqoriyanı redaktə et" : "Yeni əsas kateqoriya"}</h2>
            <p>
              {isEditing
                ? "Ad, slug, SEO və səhifə mətnini yeniləyin."
                : "Ad daxil edin; slug avtomatik yaranır."}
            </p>
          </div>
        </header>

        <div className="catalog-subcategories-form__grid">
          <div className="catalog-subcategories-form__pair">
            <label
              className={
                fieldErrors.name !== undefined
                  ? "catalog-subcategories-form__field catalog-subcategories-form__field--pair catalog-subcategories-form__field--error"
                  : "catalog-subcategories-form__field catalog-subcategories-form__field--pair"
              }
            >
              <span>Ad</span>
              <input
                name="name"
                required
                maxLength={120}
                value={name}
                placeholder="Məs: Noutbuklar"
                aria-invalid={fieldErrors.name !== undefined}
                aria-describedby={
                  fieldErrors.name !== undefined
                    ? `${formId}-name-error`
                    : undefined
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
                  ? "catalog-subcategories-form__field catalog-subcategories-form__field--pair catalog-subcategories-form__field--error"
                  : "catalog-subcategories-form__field catalog-subcategories-form__field--pair"
              }
            >
              <span>Slug</span>
              <input
                name="slug"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                value={slug}
                placeholder="noutbuklar"
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
                  Ad yazdıqca avtomatik doldurulur; istəsəniz dəyişə bilərsiniz.
                </p>
              )}
            </label>
          </div>

          <CatalogSeoSuggestFields
            seoTitle={seoTitle}
            seoDescription={seoDescription}
            onSeoTitleChange={setSeoTitle}
            onSeoDescriptionChange={setSeoDescription}
            pageDescription={description}
            onPageDescriptionChange={setDescription}
            pageDescriptionLabel="Səhifə mətni"
            pageDescriptionPlaceholder="Kateqoriya landinqində göstəriləcək intro mətn"
            pageDescriptionMaxLength={5000}
            pageDescriptionRows={6}
            canSuggest
            suggestSeo={suggestSeo}
            buildRequest={() => {
              const trimmedName = name.trim();
              if (trimmedName.length === 0) {
                return null;
              }
              return {
                entityType: "category",
                name: trimmedName,
                description,
              };
            }}
            titlePlaceholder="Boş buraxılsa kateqoriya adı istifadə olunur"
            descriptionPlaceholder="Kateqoriya səhifəsi üçün meta təsvir"
          />
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
            {isEditing ? "Yadda saxla" : "Yarat"}
          </button>
        </footer>
      </form>
    </div>
  );
}

export function CatalogCategoriesPanel({
  categories,
  canCatalog,
  canCatalogRead,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onUpdateCategoryStatus,
  onReorderCategories,
  suggestSeo,
  run,
}: CatalogCategoriesPanelProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isCreateMode = canCatalog && searchParams.get("create") === "category";
  const editId = canCatalog ? searchParams.get("edit") : null;
  const editingCategory =
    editId === null
      ? undefined
      : categories.find(
          (category) => category.id === editId && category.parentId == null,
        );

  const rootCategories = useRootCategories(categories);

  const leaveFormMode = () => {
    router.replace(pathname, { scroll: false });
  };

  useEffect(() => {
    if (!canCatalog && (searchParams.get("create") === "category" || searchParams.get("edit"))) {
      router.replace(pathname, { scroll: false });
      return;
    }
    if (editId !== null && editingCategory === undefined) {
      router.replace(pathname, { scroll: false });
    }
  }, [canCatalog, editId, editingCategory, pathname, router, searchParams]);

  if (!canCatalog && !canCatalogRead) {
    return null;
  }

  const formMode = isCreateMode || editingCategory !== undefined;

  return (
    <section
      className="catalog-subcategories-page"
      aria-label={
        editingCategory
          ? "Kateqoriyanı redaktə et"
          : isCreateMode
            ? "Yeni əsas kateqoriya"
            : "Əsas kateqoriyalar"
      }
    >
      {formMode ? (
        <CategoryCreateView
          key={editingCategory?.id ?? "category-create"}
          initialCategory={editingCategory}
          onCreateCategory={onCreateCategory}
          onUpdateCategory={onUpdateCategory}
          onCancel={leaveFormMode}
          suggestSeo={suggestSeo}
          run={run}
        />
      ) : (
        <CategoryListView
          key="category-list"
          rootCategories={rootCategories}
          canCatalog={canCatalog}
          onEditCategory={(categoryId) => {
            router.replace(`${pathname}?edit=${encodeURIComponent(categoryId)}`, {
              scroll: false,
            });
          }}
          onDeleteCategory={onDeleteCategory}
          onUpdateCategoryStatus={onUpdateCategoryStatus}
          onReorderCategories={onReorderCategories}
          run={run}
        />
      )}
    </section>
  );
}
