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

type DeliveryLabelPdfInput = {
  order: OrderItemDeliveryLabelContext;
  item: Pick<OrderCheckoutItem, "productName" | "variantName" | "sku" | "quantity">;
};

const BRAND_NAVY = "#2a3057";
const BRAND_ORANGE = "#ef7f1a";
const TEXT_PRIMARY = "#1f2937";
const TEXT_MUTED = "#6b7280";
const SURFACE_MUTED = "#f8fafc";
const BORDER = "#e5e7eb";

/** Single printable sheet — A6 keeps the label on one physical page. */
export const DELIVERY_LABEL_PAGE_SIZE = "A6" as const;
export const DELIVERY_LABEL_PAGE_MARGINS: [number, number, number, number] = [
  14, 14, 14, 14,
];

function slugifyFilenamePart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .toLowerCase();
}

function buildDivider(): Content {
  return {
    canvas: [
      {
        type: "line",
        x1: 0,
        y1: 0,
        x2: 270,
        y2: 0,
        lineWidth: 0.75,
        lineColor: BORDER,
      },
    ],
    margin: [0, 8, 0, 8],
  };
}

function buildDeliveryFieldBlock(
  label: string,
  value: string,
  options?: { emphasize?: boolean },
): Content {
  return {
    stack: [
      {
        text: label.toUpperCase(),
        style: "fieldLabel",
      },
      {
        text: value,
        style: options?.emphasize ? "fieldValueEmphasis" : "fieldValue",
      },
    ],
    margin: [0, 0, 0, 8],
  };
}

function buildHeader(): Content {
  return {
    table: {
      widths: ["*", "auto"],
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
          {
            text: "ÇATDIRILMA",
            style: "headerBadge",
            alignment: "right",
          },
        ],
      ],
    },
    layout: {
      fillColor: () => BRAND_NAVY,
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 12,
      paddingRight: () => 12,
      paddingTop: () => 10,
      paddingBottom: () => 10,
    },
    margin: [0, 0, 0, 10],
  };
}

function buildProductSection(item: DeliveryLabelPdfInput["item"]): Content {
  const hasVariant = item.variantName.trim().length > 0;
  const productRows: Content[][] = [
    [{ text: item.productName, style: "productName" }],
  ];

  if (hasVariant) {
    productRows.push([{ text: item.variantName, style: "productVariant" }]);
  }

  productRows.push([
    {
      columns: [
        { text: `SKU  ${item.sku}`, style: "productMeta", width: "*" },
        {
          text: `${item.quantity} ədəd`,
          style: "productQuantity",
          alignment: "right",
          width: "auto",
        },
      ],
    },
  ]);

  return {
    table: {
      widths: ["*"],
      body: productRows,
    },
    layout: {
      fillColor: () => SURFACE_MUTED,
      hLineWidth: (rowIndex, node) =>
        rowIndex > 0 && rowIndex < node.table.body.length ? 1 : 0,
      vLineWidth: () => 0,
      hLineColor: () => BORDER,
      paddingLeft: () => 10,
      paddingRight: () => 10,
      paddingTop: (rowIndex) => (rowIndex === 0 ? 8 : 6),
      paddingBottom: (rowIndex, node) =>
        rowIndex === node.table.body.length - 1 ? 8 : 0,
    },
    margin: [0, 0, 0, 0],
  };
}

function buildDeliverySection(order: OrderItemDeliveryLabelContext): Content {
  return {
    table: {
      widths: [3, "*"],
      body: [
        [
          {
            text: "",
            fillColor: BRAND_ORANGE,
            border: [false, false, false, false],
          },
          {
            stack: [
              {
                text: "Çatdırılma məlumatları",
                style: "sectionTitle",
                margin: [10, 0, 0, 8],
              },
              {
                ...buildDeliveryFieldBlock(
                  "Alıcı",
                  resolveOrderRecipientName(order),
                ),
                margin: [10, 0, 0, 8],
              },
              {
                ...buildDeliveryFieldBlock(
                  "Alıcının mobil nömrəsi",
                  resolveOrderRecipientPhone(order),
                ),
                margin: [10, 0, 0, 8],
              },
              {
                ...buildDeliveryFieldBlock(
                  "Çatdırılma ünvanı",
                  formatOrderDeliveryAddress(order),
                  { emphasize: true },
                ),
                margin: [10, 0, 0, 0],
              },
            ],
            border: [false, false, false, false],
          },
        ],
      ],
    },
    layout: {
      defaultBorder: false,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
  };
}

function buildFooter(orderNumber: string, printedAt: string): Content {
  return {
    columns: [
      {
        stack: [
          { text: "Sifariş", style: "footerLabel" },
          { text: orderNumber, style: "footerValue" },
        ],
        width: "*",
      },
      {
        stack: [
          { text: "Tarix", style: "footerLabel", alignment: "right" },
          { text: printedAt, style: "footerValue", alignment: "right" },
        ],
        width: "auto",
      },
    ],
    margin: [0, 0, 0, 0],
  };
}

export function buildOrderItemDeliveryLabelDocumentDefinition({
  order,
  item,
}: DeliveryLabelPdfInput): TDocumentDefinitions {
  const printedAt = new Date().toLocaleDateString("az-AZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return {
    pageSize: DELIVERY_LABEL_PAGE_SIZE,
    pageMargins: DELIVERY_LABEL_PAGE_MARGINS,
    content: [
      {
        unbreakable: true,
        stack: [
          buildHeader(),
          buildProductSection(item),
          buildDivider(),
          buildDeliverySection(order),
          buildDivider(),
          buildFooter(order.orderNumber, printedAt),
        ],
      },
    ],
    styles: {
      brandName: {
        fontSize: 14,
        bold: true,
        color: "#ffffff",
        letterSpacing: 1,
        margin: [0, 0, 0, 2],
      },
      brandSubtitle: {
        fontSize: 7.5,
        color: "#cbd5e1",
        lineHeight: 1.2,
      },
      headerBadge: {
        fontSize: 7.5,
        bold: true,
        color: BRAND_ORANGE,
        letterSpacing: 0.6,
        margin: [0, 2, 0, 0],
      },
      productName: {
        fontSize: 11.5,
        bold: true,
        color: TEXT_PRIMARY,
        lineHeight: 1.3,
      },
      productVariant: {
        fontSize: 9.5,
        color: TEXT_MUTED,
        lineHeight: 1.25,
        margin: [0, 1, 0, 0],
      },
      productMeta: {
        fontSize: 8,
        color: TEXT_MUTED,
      },
      productQuantity: {
        fontSize: 8.5,
        bold: true,
        color: BRAND_NAVY,
      },
      sectionTitle: {
        fontSize: 8.5,
        bold: true,
        color: BRAND_NAVY,
        letterSpacing: 0.5,
      },
      fieldLabel: {
        fontSize: 7,
        color: TEXT_MUTED,
        letterSpacing: 0.6,
        margin: [0, 0, 0, 2],
      },
      fieldValue: {
        fontSize: 10.5,
        bold: true,
        color: TEXT_PRIMARY,
        lineHeight: 1.3,
      },
      fieldValueEmphasis: {
        fontSize: 11.5,
        bold: true,
        color: TEXT_PRIMARY,
        lineHeight: 1.35,
      },
      footerLabel: {
        fontSize: 6.5,
        color: TEXT_MUTED,
        letterSpacing: 0.4,
        margin: [0, 0, 0, 1],
      },
      footerValue: {
        fontSize: 8.5,
        bold: true,
        color: TEXT_PRIMARY,
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
  item: Pick<OrderCheckoutItem, "productName" | "sku">,
) {
  const productPart =
    slugifyFilenamePart(item.productName) ||
    slugifyFilenamePart(item.sku) ||
    "mehsul";
  return `${order.orderNumber}-${productPart}-catdirilma-etiketi.pdf`;
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
    const filename = buildOrderItemDeliveryLabelFilename(input.order, input.item);

    pdfDoc.download(filename);
    pdfDoc.print();
  } catch (error) {
    pdfMakeEnginePromise = null;
    throw error;
  }
}
