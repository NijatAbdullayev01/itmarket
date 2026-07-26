export type PosReturnSaleSearchItem = {
  productName: string;
  variantName: string;
  sku: string;
  barcode: string | null;
};

export type PosReturnSaleSearchRow = {
  channel?: string;
  /** Kassa qəbzi (cash/card/…) or hesab-faktura (transfer) number. */
  externalTerminalReference?: string | null;
  items?: PosReturnSaleSearchItem[];
};

/** Client-side filter for POS return picker (product fields + document no.). */
export function posReturnSaleMatchesSearch(
  sale: PosReturnSaleSearchRow,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (normalized === "") return true;

  const documentRef = sale.externalTerminalReference?.trim().toLowerCase() ?? "";
  if (documentRef !== "" && documentRef.includes(normalized)) {
    return true;
  }

  return (sale.items ?? []).some((item) => {
    const haystacks = [
      item.productName,
      item.variantName,
      item.sku,
      item.barcode ?? "",
    ];
    return haystacks.some((value) =>
      value.trim().toLowerCase().includes(normalized),
    );
  });
}

/** Label for the cashier-entered document number on a sale. */
export function posReturnSaleDocumentLabel(channel: string | undefined): string {
  return channel === "TRANSFER" ? "Hesab faktura" : "Kassa qəbzi";
}

/** Short product label for a sale card (first returnable-looking line). */
export function formatPosReturnSaleProductPreview(
  items: PosReturnSaleSearchItem[] | undefined,
  maxNames = 2,
): string {
  if (items === undefined || items.length === 0) return "";
  const names = items
    .map((item) => {
      const product = item.productName.trim();
      const variant = item.variantName.trim();
      if (product === "") return variant;
      if (variant === "" || variant.toLowerCase() === product.toLowerCase()) {
        return product;
      }
      return `${product} · ${variant}`;
    })
    .filter((name) => name !== "");
  if (names.length === 0) return "";
  const shown = names.slice(0, maxNames);
  const extra = names.length - shown.length;
  return extra > 0
    ? `${shown.join(", ")} +${extra}`
    : shown.join(", ");
}

/** Short SKU label for a sale card (first SKUs, with +N for extras). */
export function formatPosReturnSaleSkuPreview(
  items: PosReturnSaleSearchItem[] | undefined,
  maxSkus = 1,
): string {
  if (items === undefined || items.length === 0) return "";
  const skus = items
    .map((item) => item.sku.trim())
    .filter((sku) => sku !== "");
  if (skus.length === 0) return "";
  const shown = skus.slice(0, maxSkus);
  const extra = skus.length - shown.length;
  return extra > 0 ? `${shown.join(", ")} +${extra}` : shown.join(", ");
}
