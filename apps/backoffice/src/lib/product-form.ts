import { buildProductSlugFromCatalogFields } from "@itmarket/contracts";

import {
  requiredSpecsEntriesEqual,
  type ProductFormSnapshot,
} from "./product-existing-catalog";

export const PRODUCT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const INTAKE_PENDING_CATEGORY_SLUG = "intake-pending";

export type ProductFieldKey = "name" | "slug" | "categoryId" | "brandId";
export type ProductFieldErrors = Partial<Record<ProductFieldKey, string>>;

export type ProductFormCategoryContext = {
  parentCategoryId: string;
  hasSubcategories: boolean;
  brands?: { id: string; name: string }[];
};

export type CategoryHierarchyEntry = {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
};

export function readProductFormField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function resolveProductSlug(name: string, slug: string, brandName = "") {
  const trimmedSlug = slug.trim();
  if (trimmedSlug !== "") {
    return trimmedSlug;
  }

  return buildProductSlugFromCatalogFields({
    brandName,
    modelName: name,
  });
}

export function validateProductForm(
  formData: FormData,
  categoryContext?: ProductFormCategoryContext,
): ProductFieldErrors {
  const errors: ProductFieldErrors = {};
  const name = readProductFormField(formData, "name");
  const categoryId = readProductFormField(formData, "categoryId");
  const brandId = readProductFormField(formData, "brandId");
  const brandName =
    categoryContext?.brands?.find((entry) => entry.id === brandId)?.name ?? "";
  const slug = resolveProductSlug(
    name,
    readProductFormField(formData, "slug"),
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

export function buildProductUpdateFormData(input: {
  name: string;
  slug: string;
  categoryId: string;
  brandId: string;
  seoTitle: string;
  seoDescription: string;
  description: string;
}): FormData {
  const form = new FormData();
  form.set("name", input.name);
  form.set("slug", input.slug);
  form.set("categoryId", input.categoryId);
  form.set("brandId", input.brandId);
  form.set("seoTitle", input.seoTitle);
  form.set("seoDescription", input.seoDescription);
  form.set("description", input.description);
  return form;
}

export function isProductFormSnapshotDirty(
  previous: ProductFormSnapshot,
  next: ProductFormSnapshot,
) {
  return (
    previous.name !== next.name ||
    previous.slug !== next.slug ||
    previous.brandId !== next.brandId ||
    previous.categoryId !== next.categoryId ||
    previous.description !== next.description ||
    previous.seoTitle !== next.seoTitle ||
    previous.seoDescription !== next.seoDescription ||
    !requiredSpecsEntriesEqual(previous.requiredSpecs, next.requiredSpecs)
  );
}

export function buildCategoryHierarchy<T extends CategoryHierarchyEntry>(
  categories: T[],
) {
  const rootCategories = categories
    .filter((category) => category.parentId == null)
    .sort((left, right) => left.name.localeCompare(right.name, "az"));

  const childrenByParentId = new Map<string, T[]>();
  for (const category of categories) {
    if (category.parentId == null) {
      continue;
    }

    const siblings = childrenByParentId.get(category.parentId) ?? [];
    siblings.push(category);
    childrenByParentId.set(category.parentId, siblings);
  }

  for (const siblings of childrenByParentId.values()) {
    siblings.sort((left, right) => left.name.localeCompare(right.name, "az"));
  }

  return { rootCategories, childrenByParentId };
}

export function filterAdminCatalogCategories<
  T extends { id: string; slug?: string; parentId?: string | null },
>(categories: T[], options?: { retainCategoryId?: string }): T[] {
  const retainId = options?.retainCategoryId?.trim() ?? "";
  const retain =
    retainId === ""
      ? undefined
      : categories.find((entry) => entry.id === retainId);
  const retainParentId = retain?.parentId ?? null;

  return categories.filter((entry) => {
    if (entry.slug !== INTAKE_PENDING_CATEGORY_SLUG) {
      return true;
    }

    return entry.id === retainId || entry.id === retainParentId;
  });
}
