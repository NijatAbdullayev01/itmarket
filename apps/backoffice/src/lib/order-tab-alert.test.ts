import { describe, expect, it } from "vitest";

import {
  BACKOFFICE_BASE_DOCUMENT_TITLE,
  BACKOFFICE_NEW_ORDER_DOCUMENT_TITLE,
  buildBackofficeDocumentTitle,
} from "./order-tab-alert";

describe("buildBackofficeDocumentTitle", () => {
  it("returns the base title when there is no alert", () => {
    expect(buildBackofficeDocumentTitle(false)).toBe(
      BACKOFFICE_BASE_DOCUMENT_TITLE,
    );
  });

  it("prefixes the title when a new order alert is active", () => {
    expect(buildBackofficeDocumentTitle(true)).toBe(
      `${BACKOFFICE_NEW_ORDER_DOCUMENT_TITLE} | ${BACKOFFICE_BASE_DOCUMENT_TITLE}`,
    );
  });
});
