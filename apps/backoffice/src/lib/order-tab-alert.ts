export const BACKOFFICE_BASE_DOCUMENT_TITLE = "Əməliyyat mərkəzi | IT Market";

export const BACKOFFICE_NEW_ORDER_DOCUMENT_TITLE =
  "Müştəridən sifariş var";

export function buildBackofficeDocumentTitle(newOrderAlert: boolean): string {
  if (!newOrderAlert) {
    return BACKOFFICE_BASE_DOCUMENT_TITLE;
  }

  return `${BACKOFFICE_NEW_ORDER_DOCUMENT_TITLE} | ${BACKOFFICE_BASE_DOCUMENT_TITLE}`;
}
