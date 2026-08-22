import { describe, expect, it } from "vitest";

import {
  buildCategoryHierarchy,
  buildProductUpdateFormData,
  filterAdminCatalogCategories,
  INTAKE_PENDING_CATEGORY_SLUG,
  isProductFormSnapshotDirty,
  resolveProductSlug,
  validateProductForm,
} from "./product-form";

function productForm(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value);
  }
  return form;
}

describe("resolveProductSlug", () => {
  it("keeps an explicit slug", () => {
    expect(resolveProductSlug("MacBook Air", "custom-slug", "Apple")).toBe(
      "custom-slug",
    );
  });

  it("builds a slug from brand and model when empty", () => {
    expect(resolveProductSlug("MacBook Air 13", "", "Apple")).toMatch(
      /apple-macbook-air-13/,
    );
  });
});

describe("validateProductForm", () => {
  it("requires model, brand, slug and category", () => {
    expect(validateProductForm(productForm({}))).toEqual({
      name: "Model tələb olunur",
      brandId: "Brend tələb olunur",
      slug: "Slug tələb olunur",
      categoryId: "Əsas kateqoriya seçin",
    });
  });

  it("asks for subcategory when the parent has children", () => {
    const errors = validateProductForm(
      productForm({
        name: "MacBook Air",
        slug: "apple-macbook-air",
        brandId: "brand-1",
      }),
      {
        parentCategoryId: "computers",
        hasSubcategories: true,
        brands: [{ id: "brand-1", name: "Apple" }],
      },
    );

    expect(errors.categoryId).toBe("Alt kateqoriya seçin");
    expect(errors.name).toBeUndefined();
    expect(errors.brandId).toBeUndefined();
  });

  it("rejects an invalid slug pattern", () => {
    const errors = validateProductForm(
      productForm({
        name: "MacBook Air",
        slug: "Apple MacBook",
        brandId: "brand-1",
        categoryId: "laptops",
      }),
      {
        parentCategoryId: "computers",
        hasSubcategories: false,
        brands: [{ id: "brand-1", name: "Apple" }],
      },
    );

    expect(errors.slug).toBe(
      "Slug kiçik hərflər, rəqəmlər və tire ilə yazılmalıdır",
    );
  });
});

describe("buildProductUpdateFormData", () => {
  it("writes every product identity field", () => {
    const form = buildProductUpdateFormData({
      name: "MacBook Air",
      slug: "apple-macbook-air",
      categoryId: "laptops",
      brandId: "brand-1",
      seoTitle: "Apple MacBook Air",
      seoDescription: "Yüngül noutbuk",
      description: "13 düym",
    });

    expect(form.get("name")).toBe("MacBook Air");
    expect(form.get("slug")).toBe("apple-macbook-air");
    expect(form.get("categoryId")).toBe("laptops");
    expect(form.get("brandId")).toBe("brand-1");
    expect(form.get("seoTitle")).toBe("Apple MacBook Air");
    expect(form.get("seoDescription")).toBe("Yüngül noutbuk");
    expect(form.get("description")).toBe("13 düym");
  });
});

describe("isProductFormSnapshotDirty", () => {
  const baseline = {
    name: "MacBook Air",
    slug: "apple-macbook-air",
    brandId: "brand-1",
    categoryId: "laptops",
    description: "13 düym",
    seoTitle: "Title",
    seoDescription: "Desc",
    requiredSpecs: [{ label: "Rəng", value: "Silver" }],
  };

  it("is clean when every field matches", () => {
    expect(isProductFormSnapshotDirty(baseline, { ...baseline })).toBe(false);
  });

  it("detects identity and spec changes", () => {
    expect(
      isProductFormSnapshotDirty(baseline, { ...baseline, name: "MacBook Pro" }),
    ).toBe(true);
    expect(
      isProductFormSnapshotDirty(baseline, {
        ...baseline,
        requiredSpecs: [{ label: "Rəng", value: "Space Gray" }],
      }),
    ).toBe(true);
  });
});

describe("buildCategoryHierarchy", () => {
  it("groups children under the parent", () => {
    const { rootCategories, childrenByParentId } = buildCategoryHierarchy([
      { id: "phones", name: "Telefonlar", parentId: null },
      { id: "laptops", name: "Noutbuklar", parentId: "computers" },
      { id: "computers", name: "Kompüterlər", parentId: null },
    ]);

    expect(rootCategories.map((entry) => entry.id)).toEqual([
      "computers",
      "phones",
    ]);
    expect(childrenByParentId.get("computers")?.map((entry) => entry.id)).toEqual(
      ["laptops"],
    );
  });
});

describe("filterAdminCatalogCategories", () => {
  const categories = [
    { id: "phones", name: "Telefonlar", slug: "telefonlar", parentId: null },
    {
      id: "intake",
      name: "Intake",
      slug: INTAKE_PENDING_CATEGORY_SLUG,
      parentId: null,
    },
    {
      id: "intake-child",
      name: "Intake child",
      slug: INTAKE_PENDING_CATEGORY_SLUG,
      parentId: "intake",
    },
  ];

  it("hides intake-pending unless it is the current category", () => {
    expect(
      filterAdminCatalogCategories(categories).map((entry) => entry.id),
    ).toEqual(["phones"]);
  });

  it("keeps the current intake category and its parent", () => {
    expect(
      filterAdminCatalogCategories(categories, {
        retainCategoryId: "intake-child",
      }).map((entry) => entry.id),
    ).toEqual(["phones", "intake", "intake-child"]);
  });
});
