export const BACKOFFICE_BASE_DOCUMENT_TITLE = "Əməliyyat mərkəzi | IT Market";

export const BACKOFFICE_NEW_ORDER_DOCUMENT_TITLE =
  "Müştəridən sifariş var";

export const BACKOFFICE_NEW_SUPPORT_MESSAGE_DOCUMENT_TITLE =
  "Müştəridən mesaj var";

export type BackofficeDocumentTitleAlerts = {
  newOrderAlert?: boolean;
  newSupportMessageAlert?: boolean;
};

export function buildBackofficeDocumentTitle(
  alerts:
    | boolean
    | BackofficeDocumentTitleAlerts = false,
): string {
  const normalized: BackofficeDocumentTitleAlerts =
    typeof alerts === "boolean"
      ? { newOrderAlert: alerts }
      : alerts;

  const parts: string[] = [];
  if (normalized.newSupportMessageAlert) {
    parts.push(BACKOFFICE_NEW_SUPPORT_MESSAGE_DOCUMENT_TITLE);
  }
  if (normalized.newOrderAlert) {
    parts.push(BACKOFFICE_NEW_ORDER_DOCUMENT_TITLE);
  }

  if (parts.length === 0) {
    return BACKOFFICE_BASE_DOCUMENT_TITLE;
  }

  return `${parts.join(" · ")} | ${BACKOFFICE_BASE_DOCUMENT_TITLE}`;
}
