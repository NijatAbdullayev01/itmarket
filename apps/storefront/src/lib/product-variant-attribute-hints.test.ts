import { describe, expect, it } from "vitest";

import {
  attributeHintsFromRequiredSpecs,
  mergeVariantAttributeHints,
} from "./product-variant-attribute-hints";

describe("attributeHintsFromRequiredSpecs", () => {
  it("maps product required specs to picker attributes", () => {
    expect(
      attributeHintsFromRequiredSpecs([
        { label: "Rəng", value: "Boz" },
        { label: "Rəng kodu", value: "#6b7280" },
        { label: "Daimi yaddaş", value: "256GB" },
        { label: "Müvəqqəti yaddaş", value: "12GB" },
      ]),
    ).toMatchObject({
      Rəng: "Boz",
      "Rəng kodu": "#6b7280",
      Yaddaş: "256GB",
      RAM: "12GB",
    });
  });
});

describe("mergeVariantAttributeHints", () => {
  it("fills missing color and storage from product specs", () => {
    expect(
      mergeVariantAttributeHints(
        { RAM: "12GB" },
        attributeHintsFromRequiredSpecs([
          { label: "Rəng", value: "Boz" },
          { label: "Daimi yaddaş", value: "256GB" },
        ]),
      ),
    ).toEqual({
      RAM: "12GB",
      Rəng: "Boz",
      Yaddaş: "256GB",
    });
  });

  it("does not override existing variant color or storage", () => {
    expect(
      mergeVariantAttributeHints(
        { Rəng: "Qara", Yaddaş: "128GB" },
        attributeHintsFromRequiredSpecs([
          { label: "Rəng", value: "Boz" },
          { label: "Daimi yaddaş", value: "256GB" },
        ]),
      ),
    ).toEqual({
      Rəng: "Qara",
      Yaddaş: "128GB",
    });
  });
});
