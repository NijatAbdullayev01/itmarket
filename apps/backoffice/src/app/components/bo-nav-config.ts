import type { ComponentType } from "react";

import {
  ORDER_NAV_ALL_LABEL,
  ORDER_NAV_BUCKET_LABELS,
  resolveOrderNavBucket,
  type OrderNavBucket,
} from "@itmarket/contracts";

import {
  IconAdministration,
  IconBrand,
  IconCategories,
  IconCustomers,
  IconInquiries,
  IconMessages,
  IconWarehouse,
  IconOrders,
  IconPos,
  IconProduct,
  IconReports,
} from "./bo-icons";

export type BoRouteId =
  | "catalog-categories"
  | "catalog-subcategories"
  | "catalog-brands"
  | "catalog-banners"
  | "catalog-products"
  | "catalog-seo"
  | "catalog-reviews"
  | "inventory-balance"
  | "inventory-receipt"
  | "inventory-adjustment"
  | "inventory-transfer"
  | "orders-menu"
  | "orders-new"
  | "orders-packaging"
  | "orders-ready"
  | "orders-all"
  | "order-detail"
  | "customers"
  | "customers-unregistered"
  | "inquiries"
  | "stock-alerts"
  | "credit-applications"
  | "support-messages"
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
  countBucket?: OrderNavBucket;
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
  childrenOnly?: boolean;
  /** Sidebar-də müştəri sayını göstər (qeydiyyatlı / qeydiyyatsız). */
  customerCountKind?: "registered" | "unregistered";
  /** Sidebar-də gözləyən sifarişlə / stok bildirişi sorğu sayını göstər. */
  inquiryCountKind?: "pending-preorder" | "pending-stock-alert";
  /** Sidebar-də gözləyən dəstək mesajı sayını göstər. */
  supportMessageCountKind?: "pending";
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
        label: "Əsas kateqoriya",
        group: "Kataloq",
        breadcrumb: "Kataloq / Əsas kateqoriya",
        title: "Əsas kateqoriyalar",
        description:
          "Mağaza kataloqunun əsas kateqoriyalarını buradan idarə edin. Ad və ya slug ilə axtarın, siyahıda nəzərdən keçirin; yeni əsas kateqoriya əlavə etmək üçün sol menyudan «Yeni əsas kateqoriya» seçin.",
        actions: [
          {
            label: "Yeni əsas kateqoriya",
            createParam: "category",
            description:
              "Kataloq üçün yeni əsas kateqoriya yaradın. Ad daxil edin; slug avtomatik yaranır.",
          },
        ],
        children: [
          {
            id: "catalog-subcategories",
            href: "/catalog/subcategories",
            label: "Alt kateqoriya",
            breadcrumb:
              "Kataloq / Əsas kateqoriya / Alt kateqoriya",
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
    title: "Brendlər",
    icon: IconBrand,
    items: [
      {
        id: "catalog-brands",
        href: "/catalog/brands",
        label: "Brend",
        group: "Kataloq",
        breadcrumb: "Kataloq / Brendlər",
        title: "Brendlər",
        description:
          "Məhsullar üçün brend adlarını buradan idarə edin. Ad və ya slug ilə axtarın, siyahıda nəzərdən keçirin; yeni brend əlavə etmək üçün sol menyudan «Yeni brend» seçin.",
        actions: [
          {
            label: "Yeni brend",
            createParam: "brand",
            description:
              "Kataloq üçün yeni brend yaradın. Ad və slug daxil edin; slug kiçik hərflərlə və tire ilə yazılır.",
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
          "Mağazada satılacaq məhsul modellərini və SKU variantlarını burada idarə edin. Məhsul yaradın, variant əlavə edin və qiymət təyin edin.",
        actions: [
          {
            label: "Yeni məhsul yarat",
            createParam: "product",
            description:
              "Kataloq üçün yeni məhsul modeli yaradın. Brend, slug, kateqoriya və tələb olunan xüsusiyyətləri daxil edin.",
          },
          {
            label: "Yeni SKU variant",
            createParam: "sku-variant",
            description:
              "Kataloqda olan məhsul seçib yaddaş, RAM, qiymət və barkod ilə yeni satış variantı yaradın.",
          },
        ],
      },
      {
        id: "catalog-seo",
        href: "/catalog/seo",
        label: "SEO",
        group: "Kataloq",
        breadcrumb: "Kataloq / SEO",
        title: "Kataloq SEO coverage",
        description:
          "Boş SEO sahələrini və stokda olmayan sifarişlə variantları buradan izləyin; bir kliklə heuristic AZ SEO doldurun.",
      },
      {
        id: "catalog-reviews",
        href: "/catalog/reviews",
        label: "Rəylər",
        group: "Kataloq",
        breadcrumb: "Kataloq / Rəylər",
        title: "Məhsul rəyləri",
        description:
          "Müştəri məhsul rəylərini buradan moderasiya edin. Gözləyən rəyləri dərc edin və ya dərc olunmuş rəyləri gizlədin.",
      },
    ],
  },
  {
    title: "Məhsul qalığı",
    icon: IconWarehouse,
    items: [
      {
        id: "inventory-balance",
        href: "/inventory/balance",
        label: "Qalıq miqdarı",
        group: "Anbar",
        breadcrumb: "Anbar / Qalıq miqdarı",
        title: "Qalıq miqdarı",
        description:
          "Məhsulların anbar və mağaza üzrə qalıq vəziyyətini izləyin. SKU, barkod və ya ad ilə axtarın; hər variant üçün məntəqə üzrə cari qalıq miqdarını bir cədvəldə görün.",
      },
      {
        id: "inventory-receipt",
        href: "/inventory/receipt",
        label: "Məhsul qəbulu",
        group: "Anbar",
        breadcrumb: "Anbar / Məhsul qəbulu",
        title: "Məhsul qəbulu",
        description:
          "Satınalma, qaytarma və ya yeni kataloq məhsulunu seçilmiş anbar və ya mağaza məntəqəsində qəbul edin. Barkod skan edin və ya brend və model ilə variant tapın; mənbə tipi, sənəd nömrəsi və miqdarı daxil edərək stok qalığını artırın.",
      },
      {
        id: "inventory-adjustment",
        href: "/inventory/adjustment",
        label: "Qalıq düzəlişi",
        group: "Anbar",
        breadcrumb: "Anbar / Qalıq düzəlişi",
        title: "Qalıq düzəlişi",
        description:
          "Stokdakı variantların qalıq miqdarını məntəqə üzrə seçib inventarizasiya nəticəsinə uyğunlaşdırın. Cari qalıq önizləməsi, fərq və ya yeni miqdar rejimi, ledger izi.",
      },
    ],
  },
  {
    title: "Sifarişlər",
    icon: IconOrders,
    items: [
      {
        id: "orders-menu",
        href: "/orders",
        label: ORDER_NAV_ALL_LABEL,
        group: "Sifarişlər",
        breadcrumb: "Sifarişlər",
        title: ORDER_NAV_ALL_LABEL,
        description:
          "Online sifarişləri axtarın, detallarına baxın və status keçidlərini idarə edin.",
        childrenOnly: true,
        children: [
          {
            id: "orders-new",
            href: "/orders?view=new",
            label: ORDER_NAV_BUCKET_LABELS.new,
            countBucket: "new",
            breadcrumb: `Sifarişlər / ${ORDER_NAV_BUCKET_LABELS.new}`,
            title: ORDER_NAV_BUCKET_LABELS.new,
            description:
              "Yeni daxil olmuş və hələ hazırlanmamış sifarişləri nəzərdən keçirin.",
          },
          {
            id: "orders-packaging",
            href: "/orders?view=packaging",
            label: ORDER_NAV_BUCKET_LABELS.packaging,
            countBucket: "packaging",
            breadcrumb: `Sifarişlər / ${ORDER_NAV_BUCKET_LABELS.packaging}`,
            title: ORDER_NAV_BUCKET_LABELS.packaging,
            description:
              "Hazırlanma və qablaşdırma mərhələsində olan sifarişləri idarə edin.",
          },
          {
            id: "orders-ready",
            href: "/orders?view=ready",
            label: ORDER_NAV_BUCKET_LABELS.ready,
            countBucket: "ready",
            breadcrumb: `Sifarişlər / ${ORDER_NAV_BUCKET_LABELS.ready}`,
            title: ORDER_NAV_BUCKET_LABELS.ready,
            description:
              "Çatdırılma və ya mağazadan götürmə üçün hazır sifarişləri izləyin.",
          },
          {
            id: "orders-all",
            href: "/orders",
            label: ORDER_NAV_ALL_LABEL,
            countBucket: "all",
            breadcrumb: `Sifarişlər / ${ORDER_NAV_ALL_LABEL}`,
            title: ORDER_NAV_ALL_LABEL,
            description:
              "Bütün online sifarişləri statusa görə filtrləmədən nəzərdən keçirin.",
          },
        ],
      },
    ],
  },
  {
    title: "Müştərilər",
    icon: IconCustomers,
    items: [
      {
        id: "customers",
        href: "/customers",
        label: "Qeydiyyatlı müştərilər",
        group: "Müştərilər",
        breadcrumb: "Müştərilər / Qeydiyyatlı müştərilər",
        title: "Qeydiyyatlı müştərilər",
        description:
          "Storefront-da qeydiyyatdan keçmiş müştəriləri buradan izləyin. Ad, e-poçt və ya telefon ilə axtarın; ümumi qeydiyyat sayı sol menyuda görünür.",
        customerCountKind: "registered",
      },
      {
        id: "customers-unregistered",
        href: "/customers/unregistered",
        label: "Qeydiyyatsız müştərilər",
        group: "Müştərilər",
        breadcrumb: "Müştərilər / Qeydiyyatsız müştərilər",
        title: "Qeydiyyatsız müştərilər",
        description:
          "Hesab yaratmadan sifariş verən müştəriləri buradan izləyin. Eyni e-poçt və ya telefon üzrə sifarişlər birləşdirilir; axtarış və son sifariş tarixi sol menyuda görünən sayla birlikdə yenilənir.",
        customerCountKind: "unregistered",
      },
    ],
  },
  {
    title: "Sorğular",
    icon: IconInquiries,
    items: [
      {
        id: "inquiries",
        href: "/inquiries",
        label: "Sifarişlə",
        group: "Sorğular",
        breadcrumb: "Sorğular / Sifarişlə",
        title: "Sifarişlə",
        description:
          "Müştərilərin storefront-dan göndərdiyi sifarişlə sorğularını buradan izləyin. Telefon və ya məhsul ilə axtarın; gözləyən sorğuları bağlayın və ya ləğv edin.",
        inquiryCountKind: "pending-preorder",
      },
      {
        id: "stock-alerts",
        href: "/inquiries/stock-alerts",
        label: "Mövcud olanda bildir",
        group: "Sorğular",
        breadcrumb: "Sorğular / Mövcud olanda bildir",
        title: "Mövcud olanda bildir",
        description:
          "Müştərilərin stoka gələndə bildiriş sorğularını buradan izləyin. Telefon və ya məhsul ilə axtarın; gözləyən sorğuları bağlayın və ya ləğv edin.",
        inquiryCountKind: "pending-stock-alert",
      },
      {
        id: "credit-applications",
        href: "/credit-applications",
        label: "Kredit müraciətləri",
        group: "Sorğular",
        breadcrumb: "Sorğular / Kredit müraciətləri",
        title: "Kredit müraciətləri",
        description:
          "Storefront-dan gələn kredit müraciətlərini emal edin: gözləyən, emal olunan, təsdiqlənən və rədd edilən statuslar.",
      },
    ],
  },
  {
    title: "Mesajlar",
    icon: IconMessages,
    items: [
      {
        id: "support-messages",
        href: "/support-messages",
        label: "Müştəri mesajları",
        group: "Mesajlar",
        breadcrumb: "Mesajlar / Müştəri mesajları",
        title: "Mesajlar",
        description:
          "Storefront canlı dəstək söhbətlərini buradan izləyin və real vaxtda cavab yazın.",
        supportMessageCountKind: "pending",
      },
    ],
  },
  {
    title: "Satış terminalı",
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
          "Satış növü üzrə bu günün məbləğini görün, məhsulları barkodla skan edin və qaytarmaları eyni ekrandan tamamlayın.",
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
        label: "Satış hesabatları",
        group: "Hesabatlar",
        breadcrumb: "Hesabatlar / Satış hesabatları",
        title: "Satış hesabatları",
        description:
          "Gündəlik və aylıq satışlar — online və satış terminalı. CSV export-ları da buradadır.",
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
      {
        id: "catalog-banners",
        href: "/banners",
        label: "Bannerlər",
        group: "İdarə etmə",
        breadcrumb: "İdarə etmə / Bannerlər",
        title: "Bannerlər",
        description:
          "Ana səhifə hero slayderi və axtarış nəticələri üst bannerini buradan idarə edin. Şəkil yükləyin, keçid linki və alt mətn təyin edin; sıranı dəyişin və ya banneri gizlədin.",
      },
    ],
  },
];

export const boNavItems: BoNavItem[] = boNavGroups.flatMap((group) =>
  [...group.items],
);

/** D-007: stok transferi scope xaricində — sidebar-da yox, köhnə URL üçün saxlanır. */
export const boExtraNavRoutes: readonly BoNavChildItem[] = [
  {
    id: "inventory-transfer",
    href: "/inventory/transfer",
    label: "Stok transferi",
    breadcrumb: "Anbar / Stok transferi",
    title: "Stok transferi",
    description:
      "Anbarlar arası stok transferi ilkin versiyada istifadə olunmur (D-007). Qəbul və ya qalıq düzəlişindən istifadə edin.",
  },
];

export const boNavRoutes: BoNavRoute[] = [
  ...boNavGroups.flatMap((group) =>
    group.items.flatMap((item) => [item, ...(item.children ?? [])]),
  ),
  ...boExtraNavRoutes,
];

export const defaultBoRoute: BoRouteId = "catalog-categories";

/**
 * Sidebar görünürlüyü: siyahıdakı icazələrdən ən azı biri (OR) kifayətdir.
 * API guard-ları ayrıca qalır; bu yalnız naviqasiya filtridir.
 */
export const boRouteRequiredPermissions: Record<
  BoRouteId,
  readonly string[]
> = {
  "catalog-categories": ["catalog.read"],
  "catalog-subcategories": ["catalog.read"],
  "catalog-brands": ["catalog.read"],
  "catalog-banners": ["catalog.read"],
  "catalog-products": ["catalog.read"],
  "catalog-seo": ["catalog.read"],
  "catalog-reviews": ["catalog.write"],
  "inventory-balance": ["inventory.read"],
  "inventory-receipt": ["inventory.receipt"],
  "inventory-adjustment": ["inventory.adjustment"],
  // D-007: transfer UI gizlidir; köhnə URL inventory.read ilə açılır (yalnız məlumat).
  "inventory-transfer": ["inventory.read"],
  "orders-menu": ["orders.read"],
  "orders-new": ["orders.read"],
  "orders-packaging": ["orders.read"],
  "orders-ready": ["orders.read"],
  "orders-all": ["orders.read"],
  "order-detail": ["orders.read"],
  customers: ["customers.read"],
  "customers-unregistered": ["customers.read"],
  inquiries: ["inquiries.read"],
  "stock-alerts": ["inquiries.read"],
  "credit-applications": ["credit-applications.manage"],
  "support-messages": ["support-messages.manage"],
  pos: ["pos.sale"],
  reports: ["reports.read"],
  administration: ["staff.manage"],
};

export function staffHasRouteAccess(
  permissions: readonly string[] | null | undefined,
  routeId: BoRouteId,
): boolean {
  if (!permissions) {
    return false;
  }

  const required = boRouteRequiredPermissions[routeId];
  return required.some((permission) => permissions.includes(permission));
}

const ORDER_DETAIL_PATH =
  /^\/orders\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

export function normalizeBoPathname(pathname: string): string {
  return pathname.endsWith("/") && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;
}

export function getOrderIdFromPathname(pathname: string): string | null {
  const match = normalizeBoPathname(pathname).match(ORDER_DETAIL_PATH);
  return match?.[1] ?? null;
}

export function isOrdersSectionPathname(pathname: string): boolean {
  const normalized = normalizeBoPathname(pathname);
  return normalized === "/orders" || ORDER_DETAIL_PATH.test(normalized);
}

export function isOrdersListRouteId(routeId: BoRouteId): boolean {
  return (
    routeId === "orders-new" ||
    routeId === "orders-packaging" ||
    routeId === "orders-ready" ||
    routeId === "orders-all"
  );
}

export function getBoRouteId(
  pathname: string,
  searchParams?: Pick<URLSearchParams, "get"> | null,
): BoRouteId {
  const normalized = normalizeBoPathname(pathname);

  if (normalized === "/") {
    return defaultBoRoute;
  }

  if (getOrderIdFromPathname(normalized) !== null) {
    return "order-detail";
  }

  if (normalized === "/orders") {
    const view = searchParams?.get("view") ?? null;
    const bucket = resolveOrderNavBucket(view);
    if (bucket === "new") {
      return "orders-new";
    }
    if (bucket === "packaging") {
      return "orders-packaging";
    }
    if (bucket === "ready") {
      return "orders-ready";
    }
    return "orders-all";
  }

  const match = boNavRoutes.find((item) => item.href === normalized);
  return match?.id ?? defaultBoRoute;
}

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

  const extra = boExtraNavRoutes.find((entry) => entry.id === id);
  if (extra) {
    return extra;
  }

  return boNavItems[0];
}

export function getBoRouteIdFromPathname(pathname: string): BoRouteId {
  return getBoRouteId(pathname, null);
}

export function getBoNavDisplay(
  pathname: string,
  createParam: string | null,
  searchParams?: Pick<URLSearchParams, "get"> | null,
): Pick<BoNavRoute, "title" | "description" | "breadcrumb"> {
  const route = getBoNavItem(getBoRouteId(pathname, searchParams));
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
  createParam: string | null,
  editVariantParam: string | null = null,
): boolean {
  const routeId = getBoRouteIdFromPathname(pathname);

  if (routeId === "order-detail") {
    return false;
  }

  if (routeId === "catalog-products") {
    if (
      viewParam !== null ||
      createParam === "sku-variant" ||
      editVariantParam !== null
    ) {
      return false;
    }
  }

  return true;
}
