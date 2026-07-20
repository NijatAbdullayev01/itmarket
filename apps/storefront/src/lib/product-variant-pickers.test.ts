import { describe, expect, it } from "vitest";

import {
  extractProductColorOptions,
  extractProductStorageOptions,
  mergeProductPickerOptions,
  pickVariantOptionValue,
  normalizeVariantAttributes,
  resolveProductVariantId,
} from "@itmarket/ui";

describe("normalizeVariantAttributes", () => {
  it("maps Daimi yaddaş to Yaddaş for pickers", () => {
    expect(
      normalizeVariantAttributes({ "Daimi yaddaş": "512GB" }, "512GB / 12GB"),
    ).toMatchObject({ Yaddaş: "512GB" });
  });

  it("infers permanent storage from variant name when attributes are empty", () => {
    expect(normalizeVariantAttributes({}, "256GB / 12GB")).toMatchObject({
      Yaddaş: "256GB",
    });
  });

  it("infers color from variant name bullet segment", () => {
    expect(
      normalizeVariantAttributes(
        { Yaddaş: "256 GB", RAM: "12 GB" },
        "256 GB · Titan Qara",
      ),
    ).toMatchObject({ Rəng: "Titan Qara" });
  });

  it("infers color from third slash segment in variant name", () => {
    expect(
      normalizeVariantAttributes({ Yaddaş: "512GB", RAM: "12GB" }, "512GB / 12GB / Ağ"),
    ).toMatchObject({ Rəng: "Ağ" });
  });

  it("infers permanent storage from bullet-style variant name", () => {
    expect(
      normalizeVariantAttributes({}, "512 GB · Tünd mavi"),
    ).toMatchObject({
      Yaddaş: "512 GB",
      Rəng: "Tünd mavi",
    });
  });
});

describe("variant pickers for storage-only matrix", () => {
  const variants = [
    {
      id: "a",
      name: "256GB / 12GB",
      attributes: { Yaddaş: "256GB", RAM: "12GB", Rəng: "Ağ" },
      available: 3,
    },
    {
      id: "b",
      name: "512GB / 12GB",
      attributes: { Yaddaş: "512GB", RAM: "12GB", Rəng: "Ağ" },
      available: 2,
    },
  ];

  it("extracts all permanent storage values from every variant", () => {
    expect(extractProductStorageOptions(variants)).toEqual([
      expect.objectContaining({ label: "256GB", value: "256gb" }),
      expect.objectContaining({ label: "512GB", value: "512gb" }),
    ]);
  });

  it("keeps both storage options visible when color is selected", () => {
    expect(
      extractProductStorageOptions(variants, { colorValue: "ağ" }),
    ).toHaveLength(2);
  });

  it("resolves variant id from storage selection", () => {
    expect(
      resolveProductVariantId(variants, {
        storageValue: "512gb",
        colorValue: "ağ",
        ramValue: "12gb",
      }),
    ).toBe("b");
  });
});

describe("variant pickers for color and storage matrix", () => {
  const variants = [
    {
      id: "black-256",
      name: "256GB / 12GB",
      attributes: { Yaddaş: "256GB", RAM: "12GB", Rəng: "Tünd mavi" },
      available: 2,
    },
    {
      id: "black-512",
      name: "512GB / 12GB",
      attributes: { Yaddaş: "512GB", RAM: "12GB", Rəng: "Tünd mavi" },
      available: 1,
    },
    {
      id: "white-256",
      name: "256GB / 12GB",
      attributes: { Yaddaş: "256GB", RAM: "12GB", Rəng: "Ağ" },
      available: 3,
    },
    {
      id: "white-512",
      name: "512GB / 12GB",
      attributes: { Yaddaş: "512GB", RAM: "12GB", Rəng: "Ağ" },
      available: 0,
    },
  ];

  it("extracts every distinct color across all variants", () => {
    expect(extractProductColorOptions(variants)).toEqual([
      expect.objectContaining({ label: "Tünd mavi", value: "tünd mavi" }),
      expect.objectContaining({ label: "Ağ", value: "ağ" }),
    ]);
  });

  it("keeps both colors visible when storage is selected", () => {
    expect(
      extractProductColorOptions(variants, { storageValue: "512gb" }),
    ).toEqual([
      expect.objectContaining({ label: "Tünd mavi", available: 1 }),
      expect.objectContaining({ label: "Ağ", available: 0 }),
    ]);
  });

  it("extracts every distinct storage across all variants", () => {
    expect(extractProductStorageOptions(variants)).toEqual([
      expect.objectContaining({ label: "256GB", value: "256gb" }),
      expect.objectContaining({ label: "512GB", value: "512gb" }),
    ]);
  });

  it("merges full color axis with availability for selected storage", () => {
    const allColors = extractProductColorOptions(variants);
    const availability = extractProductColorOptions(variants, {
      storageValue: "512gb",
    });

    expect(mergeProductPickerOptions(allColors, availability)).toEqual([
      expect.objectContaining({ label: "Tünd mavi", available: 1 }),
      expect.objectContaining({ label: "Ağ", available: 0 }),
    ]);
  });

  it("merges full storage axis with availability for selected color", () => {
    const allStorage = extractProductStorageOptions(variants);
    const availability = extractProductStorageOptions(variants, {
      colorValue: "ağ",
    });

    expect(mergeProductPickerOptions(allStorage, availability)).toEqual([
      expect.objectContaining({ label: "256GB", available: 3 }),
      expect.objectContaining({ label: "512GB", available: 0 }),
    ]);
  });
});

describe("storage label normalization", () => {
  it("treats spaced and compact storage labels as one option", () => {
    const variants = [
      {
        id: "a",
        name: "256 GB / 12 GB",
        attributes: { Yaddaş: "256 GB", RAM: "12 GB", Rəng: "Ağ" },
        available: 1,
      },
      {
        id: "b",
        name: "512GB / 12GB",
        attributes: { Yaddaş: "512GB", RAM: "12GB", Rəng: "Tünd mavi" },
        available: 2,
      },
    ];

    expect(extractProductStorageOptions(variants)).toHaveLength(2);
    expect(extractProductColorOptions(variants)).toHaveLength(2);
  });
});

describe("pickVariantOptionValue", () => {
  it("switches away from a color that is unavailable for selected storage", () => {
    expect(
      pickVariantOptionValue(
        [
          { value: "gümüşü", available: 0 },
          { value: "tünd mavi", available: 2 },
        ],
        "gümüşü",
      ),
    ).toBe("tünd mavi");
  });
});

describe("iPhone-style storage × color matrix", () => {
  const variants = [
    {
      id: "silver-256",
      name: "256GB / 12GB",
      attributes: { Yaddaş: "256GB", RAM: "12GB", Rəng: "Gümüşü" },
      available: 3,
    },
    {
      id: "blue-512",
      name: "512GB / 12GB",
      attributes: { Yaddaş: "512GB", RAM: "12GB", Rəng: "Tünd mavi" },
      available: 2,
    },
  ];

  it("lists both colors and both storage values", () => {
    expect(extractProductColorOptions(variants)).toHaveLength(2);
    expect(extractProductStorageOptions(variants)).toHaveLength(2);
  });

  it("resolves 512GB to the dark blue SKU", () => {
    expect(
      resolveProductVariantId(variants, {
        storageValue: "512gb",
        colorValue: "tünd mavi",
        ramValue: "12gb",
      }),
    ).toBe("blue-512");
  });
});
