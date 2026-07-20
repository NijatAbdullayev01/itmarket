import { describe, expect, it } from "vitest";

import {
  getRequiredSpecsSectionMessage,
  isRequiredSpecsSectionReady,
  isTemporaryMemorySpecLabel,
  normalizeRequiredSpecRows,
  TEMPORARY_MEMORY_SPEC_LABEL,
} from "./product-required-specs";

describe("isTemporaryMemorySpecLabel", () => {
  it("recognizes müvəqqəti yaddaş and legacy operativ labels", () => {
    expect(isTemporaryMemorySpecLabel(TEMPORARY_MEMORY_SPEC_LABEL)).toBe(true);
    expect(isTemporaryMemorySpecLabel("Operativ yaddaş (RAM)")).toBe(true);
    expect(isTemporaryMemorySpecLabel("Daimi yaddaş")).toBe(false);
  });
});

describe("getRequiredSpecsSectionMessage", () => {
  it("asks for category when none selected", () => {
    expect(
      getRequiredSpecsSectionMessage({
        parentCategoryId: "",
        hasSubcategories: false,
        subcategoryId: "",
      }),
    ).toContain("Kateqoriya");
  });

  it("asks for subcategory when required", () => {
    expect(
      getRequiredSpecsSectionMessage({
        parentCategoryId: "parent",
        hasSubcategories: true,
        subcategoryId: "",
      }),
    ).toContain("Alt kateqoriya");
  });

  it("returns null when category context is complete", () => {
    expect(
      getRequiredSpecsSectionMessage({
        parentCategoryId: "parent",
        hasSubcategories: true,
        subcategoryId: "child",
      }),
    ).toBeNull();
  });
});

describe("isRequiredSpecsSectionReady", () => {
  it("is false until category context is complete", () => {
    expect(
      isRequiredSpecsSectionReady({
        parentCategoryId: "",
        hasSubcategories: false,
        subcategoryId: "",
      }),
    ).toBe(false);
  });
});

describe("normalizeRequiredSpecRows", () => {
  it("drops fully empty rows", () => {
    expect(
      normalizeRequiredSpecRows([
        { id: "1", label: "", value: "" },
        { id: "2", label: "RAM", value: "16 GB" },
      ]),
    ).toEqual({
      entries: [{ label: "RAM", value: "16 GB" }],
      errors: [],
    });
  });

  it("reports missing label or value", () => {
    const result = normalizeRequiredSpecRows([
      { id: "1", label: "", value: "512 GB" },
      { id: "2", label: "RAM", value: "" },
    ]);

    expect(result.entries).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("persists custom color hex as Rəng kodu entry", () => {
    expect(
      normalizeRequiredSpecRows([
        {
          id: "1",
          label: "Rəng",
          value: "Göy",
          colorHex: "#2563eb",
        },
      ]),
    ).toEqual({
      entries: [
        { label: "Rəng", value: "Göy" },
        { label: "Rəng kodu", value: "#2563eb" },
      ],
      errors: [],
    });
  });
});
