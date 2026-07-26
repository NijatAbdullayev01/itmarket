import { describe, expect, it } from "vitest";

import { getMessages } from "./messages";
import {
  localizeCatalogColor,
  localizeProductAttributeLabel,
  localizeProductSpecEntries,
} from "./localize-product-attribute";

describe("localizeProductAttribute", () => {
  it("keeps Azerbaijani catalog colors on az locale", () => {
    expect(localizeCatalogColor("Tünd mavi", "az")).toBe("Tünd mavi");
    expect(localizeCatalogColor("Gümüşü", "az")).toBe("Gümüşü");
  });

  it("translates catalog colors for en and ru", () => {
    expect(localizeCatalogColor("Tünd mavi", "en")).toBe("Deep Blue");
    expect(localizeCatalogColor("Tünd mavi", "ru")).toBe("Тёмно-синий");
    expect(localizeCatalogColor("Gümüşü", "en")).toBe("Silver");
    expect(localizeCatalogColor("Gümüşü", "ru")).toBe("Серебристый");
  });

  it("translates common spec labels", () => {
    const en = getMessages("en");
    const ru = getMessages("ru");

    expect(localizeProductAttributeLabel("Marka", en)).toBe("Brand");
    expect(localizeProductAttributeLabel("Daimi yaddaş", en)).toBe(
      "Internal storage",
    );
    expect(localizeProductAttributeLabel("Rəng", en)).toBe("Color");
    expect(localizeProductAttributeLabel("Müvəqqəti yaddaş", ru)).toBe(
      "Оперативная память",
    );
  });

  it("localizes full spec entry rows including color values", () => {
    const en = getMessages("en");
    const localized = localizeProductSpecEntries(
      [
        ["Marka", "Apple"],
        ["Daimi yaddaş", "512GB"],
        ["Rəng", "Tünd mavi"],
      ],
      "en",
      en,
    );

    expect(localized).toEqual([
      ["Brand", "Apple"],
      ["Internal storage", "512GB"],
      ["Color", "Deep Blue"],
    ]);
  });
});
