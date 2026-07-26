import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

import {
  formatOrderDeliveryAddress,
  resolveOrderRecipientName,
  resolveOrderRecipientPhone,
  type OrderCheckoutItem,
  type OrderCheckoutSummary,
} from "./order-checkout-display";

export type OrderItemDeliveryLabelContext = Pick<
  OrderCheckoutSummary,
  | "orderNumber"
  | "recipientName"
  | "phone"
  | "guestPhone"
  | "administrativeArea"
  | "addressLine"
>;

type DeliveryLabelItem = Pick<
  OrderCheckoutItem,
  "productName" | "variantName" | "sku" | "barcode" | "quantity"
>;

type DeliveryLabelPdfInput = {
  order: OrderItemDeliveryLabelContext;
  items: DeliveryLabelItem[];
};

const BRAND_NAVY = "#2a3057";
const TEXT_PRIMARY = "#1f2937";
const TEXT_MUTED = "#6b7280";
const BORDER = "#e5e7eb";

/** Single printable sheet — A4 for courier/warehouse printing. */
export const DELIVERY_LABEL_PAGE_SIZE = "A4" as const;
export const DELIVERY_LABEL_PAGE_MARGINS: [number, number, number, number] = [
  40, 40, 40, 40,
];

/** A4 content width in points with current margins (595.28 − 80). */
const DELIVERY_LABEL_CONTENT_WIDTH = 515;

function slugifyFilenamePart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .toLowerCase();
}

function formatBarcode(barcode: string | null | undefined) {
  const value = barcode?.trim();
  return value && value.length > 0 ? value : "—";
}

function formatProductName(item: DeliveryLabelItem) {
  const variant = item.variantName.trim();
  const baseName =
    variant.length === 0 ? item.productName : `${item.productName} · ${variant}`;
  if (item.quantity > 1) {
    return `${baseName} · ${item.quantity} ədəd`;
  }
  return baseName;
}

function buildItemFields(
  item: DeliveryLabelItem,
  index: number,
  totalItems: number,
): Content[] {
  const nameLabel = totalItems > 1 ? `Məhsul ${index + 1}` : "Məhsulun adı";
  return [
    buildFieldRow(nameLabel, formatProductName(item)),
    buildFieldRow("Barkod", formatBarcode(item.barcode)),
    buildFieldRow("SKU", item.sku),
  ];
}

function buildDivider(): Content {
  return {
    canvas: [
      {
        type: "line",
        x1: 0,
        y1: 0,
        x2: DELIVERY_LABEL_CONTENT_WIDTH,
        y2: 0,
        lineWidth: 0.75,
        lineColor: BORDER,
      },
    ],
    margin: [0, 10, 0, 10],
  };
}

function buildFieldRow(label: string, value: string): Content {
  return {
    columns: [
      {
        width: 160,
        text: `${label}:`,
        style: "fieldLabel",
      },
      {
        width: "*",
        text: value,
        style: "fieldValue",
      },
    ],
    columnGap: 12,
    margin: [0, 0, 0, 14],
  };
}

function buildHeader(): Content {
  return {
    table: {
      widths: ["*"],
      body: [
        [
          {
            stack: [
              { text: "IT MARKET", style: "brandName" },
              {
                text: "Məhsul çatdırılma etiketi",
                style: "brandSubtitle",
              },
            ],
          },
        ],
      ],
    },
    layout: {
      fillColor: () => BRAND_NAVY,
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 18,
      paddingRight: () => 18,
      paddingTop: () => 14,
      paddingBottom: () => 14,
    },
    margin: [0, 0, 0, 24],
  };
}

function buildLabelFields(
  order: OrderItemDeliveryLabelContext,
  items: DeliveryLabelItem[],
): Content {
  const productSections: Content[] = [];

  items.forEach((item, index) => {
    if (index > 0) {
      productSections.push(buildDivider());
    }
    productSections.push(...buildItemFields(item, index, items.length));
  });

  return {
    stack: [
      buildFieldRow("Alıcı", resolveOrderRecipientName(order)),
      buildFieldRow("Əlaqə", resolveOrderRecipientPhone(order)),
      buildFieldRow("Sifariş nömrəsi", order.orderNumber),
      buildFieldRow("Çatdırılma ünvanı", formatOrderDeliveryAddress(order)),
      buildDivider(),
      ...productSections,
    ],
  };
}

export function buildOrderItemDeliveryLabelDocumentDefinition({
  order,
  items,
}: DeliveryLabelPdfInput): TDocumentDefinitions {
  return {
    pageSize: DELIVERY_LABEL_PAGE_SIZE,
    pageMargins: DELIVERY_LABEL_PAGE_MARGINS,
    content: [
      {
        unbreakable: true,
        stack: [buildHeader(), buildLabelFields(order, items)],
      },
    ],
    styles: {
      brandName: {
        fontSize: 20,
        bold: true,
        color: "#ffffff",
        margin: [0, 0, 0, 4],
      },
      brandSubtitle: {
        fontSize: 11,
        color: "#cbd5e1",
        lineHeight: 1.3,
      },
      fieldLabel: {
        fontSize: 12,
        bold: true,
        color: TEXT_MUTED,
        lineHeight: 1.35,
      },
      fieldValue: {
        fontSize: 14,
        bold: true,
        color: TEXT_PRIMARY,
        lineHeight: 1.4,
      },
    },
    defaultStyle: {
      font: "Roboto",
    },
  };
}

function resolveModuleExport<T>(module: T | { default: T }): T {
  if (
    module !== null &&
    typeof module === "object" &&
    "default" in module &&
    module.default !== undefined
  ) {
    return module.default;
  }
  return module as T;
}

async function createPdfMake() {
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");

  const pdfMake = resolveModuleExport(pdfMakeModule) as typeof pdfMakeModule.default & {
    vfs: Record<string, string>;
  };
  const vfs = resolveModuleExport(pdfFontsModule) as Record<string, string>;

  if (vfs === null || typeof vfs !== "object") {
    throw new Error("PDF şrift faylları yüklənmədi");
  }

  pdfMake.vfs = vfs;

  return pdfMake;
}

export function buildOrderItemDeliveryLabelFilename(
  order: OrderItemDeliveryLabelContext,
  items: Pick<OrderCheckoutItem, "productName" | "sku">[],
) {
  if (items.length === 1) {
    const productPart =
      slugifyFilenamePart(items[0].productName) ||
      slugifyFilenamePart(items[0].sku) ||
      "mehsul";
    return `${order.orderNumber}-${productPart}-catdirilma-etiketi.pdf`;
  }

  return `${order.orderNumber}-catdirilma-etiketi.pdf`;
}

let pdfMakeEnginePromise: ReturnType<typeof createPdfMake> | null = null;

function getPdfMakeEngine() {
  if (pdfMakeEnginePromise === null) {
    pdfMakeEnginePromise = createPdfMake();
  }
  return pdfMakeEnginePromise;
}

export function preloadOrderItemDeliveryLabelPdfEngine() {
  void getPdfMakeEngine().catch(() => {
    pdfMakeEnginePromise = null;
  });
}

export async function downloadAndPrintOrderItemDeliveryLabelPdf(
  input: DeliveryLabelPdfInput,
) {
  try {
    const pdfMake = await getPdfMakeEngine();
    const docDefinition = buildOrderItemDeliveryLabelDocumentDefinition(input);
    const pdfDoc = pdfMake.createPdf(docDefinition);
    const filename = buildOrderItemDeliveryLabelFilename(
      input.order,
      input.items,
    );

    pdfDoc.download(filename);
    pdfDoc.print();
  } catch (error) {
    pdfMakeEnginePromise = null;
    throw error;
  }
}
