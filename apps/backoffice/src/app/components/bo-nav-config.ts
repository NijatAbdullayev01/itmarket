import type { ComponentType } from "react";

import {
  IconAdministration,
  IconCategories,
  IconInventory,
  IconOrders,
  IconPos,
  IconProduct,
  IconReports,
} from "./bo-icons";

export type BoRouteId =
  | "catalog-categories"
  | "catalog-subcategories"
  | "catalog-products"
  | "catalog-sku-variants"
  | "inventory-balance"
  | "inventory-transfer"
  | "orders-list"
  | "fulfillment"
  | "pos"
  | "reports"
  | "administration";

export type BoNavAction = {
  label: string;
  createParam: string;
  description: string;
};

export type BoNavChildItem = {
  id: BoRouteId;
  href: `/${string}`;
  label: string;
  breadcrumb: string;
  title: string;
  description: string;
  actions?: readonly BoNavAction[];
};

export type BoNavItem = {
  id: BoRouteId;
  href: `/${string}`;
  label: string;
  group: string;
  breadcrumb: string;
  title: string;
  description: string;
  actions?: readonly BoNavAction[];
  children?: readonly BoNavChildItem[];
};

export type BoNavRoute = BoNavItem | BoNavChildItem;

export const boNavGroups: ReadonlyArray<{
  title: string;
  icon: ComponentType;
  items: readonly BoNavItem[];
}> = [
  {
    title: "Kateqoriyalar",
    icon: IconCategories,
    items: [
      {
        id: "catalog-categories",
        href: "/catalog/categories",
        label: "Kateqoriya",
        group: "Kataloq",
        breadcrumb: "Kataloq / Kateqoriya",
        title: "Kateqoriya",
        description:
          "Mağaza kataloqunun əsas kateqoriyalarını buradan idarə edin. Ad və ya slug ilə axtarın, siyahıda nəzərdən keçirin; yeni kateqoriya əlavə etmək üçün sol menyudan «Yeni kateqoriya» seçin.",
        actions: [
          {
            label: "Yeni kateqoriya",
            createParam: "category",
            description:
              "Kataloq üçün yeni əsas kateqoriya yaradın. Ad və slug daxil edin; slug kiçik hərflərlə və tire ilə yazılır.",
          },
        ],
        children: [
          {
            id: "catalog-subcategories",
            href: "/catalog/subcategories",
            label: "Alt kateqoriya",
            breadcrumb:
              "Kataloq / Kateqoriya / Alt kateqoriya",
            title: "Alt kateqoriyalar",
            description:
              "Əsas kateqoriyaların alt qruplarını buradan idarə edin. Ad, slug və ya ana kateqoriyaya görə axtarın, qruplaşdırılmış siyahıda nəzərdən keçirin; yeni alt kateqoriya əlavə etmək üçün sol menyudan «Yeni alt kateqoriya» seçin.",
            actions: [
              {
                label: "Yeni alt kateqoriya",
                createParam: "subcategory",
                description:
                  "Əsas kateqoriya seçib alt qrup üçün ad və slug daxil edin. Slug kiçik hərflərlə və tire ilə yazılır.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Məhsullar",
    icon: IconProduct,
    items: [
      {
        id: "catalog-products",
        href: "/catalog/products",
        label: "Məhsul",
        group: "Kataloq",
        breadcrumb: "Kataloq / Məhsullar",
        title: "Məhsullar",
        description:
          "Mağazada satılacaq məhsulları burada əlavə edin, ad və kateqoriya üzrə axtarın, siyahıda nəzərdən keçirin. Yeni məhsul əlavə etmək üçün sol menyudan «Yeni məhsul yarat» seçin.",
        actions: [
          {
            label: "Yeni məhsul yarat",
            createParam: "product",
            description:
              "Kataloq üçün yeni məhsul yaradın. Ad, slug və kateqoriya daxil edin; slug kiçik hərflərlə və tire ilə yazılır.",
          },
        ],
        children: [
          {
            id: "catalog-sku-variants",
            href: "/catalog/sku-variants",
            label: "Sku variant əlavə et",
            breadcrumb: "Kataloq / Məhsullar / Sku variant əlavə et",
            title: "Sku variant əlavə et",
            description:
              "Mövcud məhsullara SKU, barkod və satış qiyməti təyin edin.",
          },
        ],
      },
    ],
  },
  {
    title: "Stok",
    icon: IconInventory,
    items: [
      {
        id: "inventory-balance",
        href: "/inventory/balance",
        label: "Balans",
        group: "Stok",
        breadcrumb: "Stok / Balans",
        title: "Stok balansı",
        description:
          "Məntəqə, qəbul və düzəliş əməliyyatlarını idarə edin; balans və reconciliation görün.",
      },
      {
        id: "inventory-transfer",
        href: "/inventory/transfer",
        label: "Transfer",
        group: "Stok",
        breadcrumb: "Stok / Transfer",
        title: "Stok transferi",
        description:
          "Məntəqələr arası transfer edin və son stok hərəkətlərini izləyin.",
      },
    ],
  },
  {
    title: "Sifarişlər",
    icon: IconOrders,
    items: [
      {
        id: "orders-list",
        href: "/orders",
        label: "Sifariş siyahısı",
        group: "Sifarişlər",
        breadcrumb: "Sifarişlər / Sifariş siyahısı",
        title: "Sifariş siyahısı",
        description:
          "Online sifarişləri axtarın, detallarına baxın və status keçidlərini idarə edin.",
      },
      {
        id: "fulfillment",
        href: "/fulfillment",
        label: "Çatdırılma və pickup",
        group: "Sifarişlər",
        breadcrumb: "Sifarişlər / Çatdırılma və pickup",
        title: "Çatdırılma və pickup",
        description:
          "Çatdırılma zonalarını və pickup məntəqələrini konfiqurasiya edin.",
      },
    ],
  },
  {
    title: "Pos",
    icon: IconPos,
    items: [
      {
        id: "pos",
        href: "/pos",
        label: "Satış və qaytarma",
        group: "POS",
        breadcrumb: "POS / Satış və qaytarma",
        title: "Satış və qaytarma",
        description:
          "Kassa növbəsini açın, barkodla satış edin və qaytarmaları emal edin.",
      },
    ],
  },
  {
    title: "Hesabatlar",
    icon: IconReports,
    items: [
      {
        id: "reports",
        href: "/reports",
        label: "Export və filter",
        group: "Hesabatlar",
        breadcrumb: "Hesabatlar / Export və filter",
        title: "Hesabatlar və export",
        description:
          "Tarix aralığına görə satış xülasəsi, aşağı stok və CSV export-ları idarə edin.",
      },
    ],
  },
  {
    title: "İdarə etmə",
    icon: IconAdministration,
    items: [
      {
        id: "administration",
        href: "/administration",
        label: "İstifadəçi və vəzifə",
        group: "İdarə etmə",
        breadcrumb: "İdarə etmə / İstifadəçi və vəzifə",
        title: "İdarə etmə",
        description:
          "Backoffice girişi üçün əməkdaş yaradın, vəzifə təyin edin və hansı səhifələrdə nə edə biləcəyini idarə edin.",
      },
    ],
  },
];

export const boNavItems: BoNavItem[] = boNavGroups.flatMap((group) =>
  [...group.items],
);

export const boNavRoutes: BoNavRoute[] = boNavGroups.flatMap((group) =>
  group.items.flatMap((item) => [item, ...(item.children ?? [])]),
);

export const defaultBoRoute: BoRouteId = "catalog-categories";

export function getBoNavItem(
  id: BoRouteId,
): BoNavItem | BoNavChildItem {
  for (const item of boNavItems) {
    if (item.id === id) {
      return item;
    }

    const child = item.children?.find((entry) => entry.id === id);
    if (child) {
      return child;
    }
  }

  return boNavItems[0];
}

export function getBoRouteIdFromPathname(pathname: string): BoRouteId {
  const normalized = pathname.endsWith("/") && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;

  if (normalized === "/") {
    return defaultBoRoute;
  }

  const match = boNavRoutes.find((item) => item.href === normalized);
  return match?.id ?? defaultBoRoute;
}

export function getBoNavDisplay(
  pathname: string,
  createParam: string | null,
): Pick<BoNavRoute, "title" | "description" | "breadcrumb"> {
  const route = getBoNavItem(getBoRouteIdFromPathname(pathname));
  const action = createParam
    ? route.actions?.find((entry) => entry.createParam === createParam)
    : undefined;

  if (!action) {
    return route;
  }

  return {
    breadcrumb: `${route.breadcrumb} / ${action.label}`,
    title: action.label,
    description: action.description,
  };
}

export function shouldShowBoDashboardHeader(
  pathname: string,
  viewParam: string | null,
): boolean {
  const routeId = getBoRouteIdFromPathname(pathname);

  if (routeId === "catalog-products" && viewParam !== null) {
    return false;
  }

  return true;
}
