import { describe, expect, it } from "vitest";

import { localizeCatalogColor } from "./localize-product-attribute";
import { getMessages } from "./messages";
import { toProductColorPickerCopy } from "./ui-copy";

describe("product color picker i18n", () => {
  it("maps label copy and catalog color values per locale", () => {
    const cases = [
      ["az", "Rəng:", "Tünd mavi"],
      ["en", "Color:", "Deep Blue"],
      ["ru", "Цвет:", "Тёмно-синий"],
    ] as const;

    for (const [locale, label, color] of cases) {
      const copy = toProductColorPickerCopy(getMessages(locale));
      expect(copy.label).toBe(label);
      expect(localizeCatalogColor("Tünd mavi", locale)).toBe(color);
    }
  });
});
