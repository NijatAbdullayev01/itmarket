export type CategoryItem = {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
  sortOrder?: number;
};

export type CategoryTreeNode = CategoryItem & {
  children: CategoryTreeNode[];
};

export function compareCategoriesForDisplay(
  left: CategoryItem,
  right: CategoryItem,
): number {
  const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return left.name.localeCompare(right.name, "az");
}

export function sortCategoriesByName(categories: CategoryItem[]): CategoryItem[] {
  return [...categories].sort((left, right) =>
    left.name.localeCompare(right.name, "az"),
  );
}

export function sortCategoriesForDisplay(
  categories: CategoryItem[],
): CategoryItem[] {
  return [...categories].sort(compareCategoriesForDisplay);
}

export function getRootCategories(
  categories: CategoryItem[],
  limit?: number,
): CategoryItem[] {
  const roots = sortCategoriesForDisplay(
    categories.filter((category) => category.parentId == null),
  );

  return limit === undefined ? roots : roots.slice(0, limit);
}

export function getCategoryTree(
  categories: CategoryItem[],
  rootLimit?: number,
): CategoryTreeNode[] {
  const roots = getRootCategories(categories, rootLimit);
  const childrenByParent = new Map<string, CategoryItem[]>();

  for (const category of categories) {
    if (category.parentId == null) {
      continue;
    }

    const parentKey = String(category.parentId);
    const siblings = childrenByParent.get(parentKey) ?? [];
    siblings.push(category);
    childrenByParent.set(parentKey, siblings);
  }

  const buildNode = (
    item: CategoryItem,
    ancestors: ReadonlySet<string>,
  ): CategoryTreeNode => {
    if (ancestors.has(item.id)) {
      return { ...item, children: [] };
    }

    const nextAncestors = new Set(ancestors);
    nextAncestors.add(item.id);

    return {
      ...item,
      children: sortCategoriesForDisplay(
        childrenByParent.get(item.id) ?? [],
      ).map((child) => buildNode(child, nextAncestors)),
    };
  };

  return roots.map((root) => buildNode(root, new Set()));
}
