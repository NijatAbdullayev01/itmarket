import { describe, expect, it } from "vitest";

import {
  applyBulkRequiredSpecEntries,
  applyBulkRequiredSpecText,
  BULK_REQUIRED_SPEC_PARSE_ERROR,
  getRequiredSpecsSectionMessage,
  getRequiredSpecsVariantIntroMessage,
  isMeterSpecLabel,
  isPoeCountSpecLabel,
  isPortCountSpecLabel,
  isRequiredSpecsSectionReady,
  isTemporaryMemorySpecLabel,
  isTransferSpeedSpecLabel,
  normalizeRequiredSpecRows,
  parseBulkRequiredSpecText,
  TEMPORARY_MEMORY_SPEC_LABEL,
} from "./product-required-specs";

describe("isTemporaryMemorySpecLabel", () => {
  it("recognizes müvəqqəti yaddaş and legacy operativ labels", () => {
    expect(isTemporaryMemorySpecLabel(TEMPORARY_MEMORY_SPEC_LABEL)).toBe(true);
    expect(isTemporaryMemorySpecLabel("Operativ yaddaş (RAM)")).toBe(true);
    expect(isTemporaryMemorySpecLabel("Daimi yaddaş")).toBe(false);
  });
});

describe("isMeterSpecLabel", () => {
  it("recognizes metr and common length labels", () => {
    expect(isMeterSpecLabel("Metr")).toBe(true);
    expect(isMeterSpecLabel("meter")).toBe(true);
    expect(isMeterSpecLabel("Uzunluq")).toBe(true);
    expect(isMeterSpecLabel("Rəng")).toBe(false);
  });
});

describe("network spec labels", () => {
  it("recognizes port, PoE and transfer speed labels", () => {
    expect(isPortCountSpecLabel("Port")).toBe(true);
    expect(isPortCountSpecLabel("Port sayı")).toBe(true);
    expect(isPoeCountSpecLabel("PoE+")).toBe(true);
    expect(isPoeCountSpecLabel("PoE sayı")).toBe(true);
    expect(isTransferSpeedSpecLabel("Sürət")).toBe(true);
    expect(isTransferSpeedSpecLabel("Ötürmə sürəti")).toBe(true);
    expect(isPortCountSpecLabel("Rəng")).toBe(false);
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

  it("skips optional memory rows with empty values", () => {
    expect(
      normalizeRequiredSpecRows([
        { id: "1", label: "Daimi yaddaş", value: "" },
        { id: "2", label: TEMPORARY_MEMORY_SPEC_LABEL, value: "" },
        { id: "3", label: "Rəng", value: "Qara" },
      ]),
    ).toEqual({
      entries: [{ label: "Rəng", value: "Qara" }],
      errors: [],
    });
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

describe("parseBulkRequiredSpecText", () => {
  it("parses colon, tab, pipe and spaced-dash lines", () => {
    expect(
      parseBulkRequiredSpecText(
        [
          "Ekran: 6.7\"",
          "Prosessor\tA18 Pro",
          "Daimi yaddaş | 256 GB",
          "Rəng – Qara",
          "Port - 24",
        ].join("\n"),
      ),
    ).toEqual([
      { label: "Ekran", value: "6.7\"" },
      { label: "Prosessor", value: "A18 Pro" },
      { label: "Daimi yaddaş", value: "256 GB" },
      { label: "Rəng", value: "Qara" },
      { label: "Port", value: "24" },
    ]);
  });

  it("pairs two-line table paste and strips bullets", () => {
    expect(
      parseBulkRequiredSpecText(
        ["• Müvəqqəti yaddaş", "16 GB", "1. PoE+", "24 port"].join("\n"),
      ),
    ).toEqual([
      { label: "Müvəqqəti yaddaş", value: "16 GB" },
      { label: "PoE+", value: "24 port" },
    ]);
  });

  it("skips header rows and does not split Wi-Fi style hyphens", () => {
    expect(
      parseBulkRequiredSpecText("Başlıq\tDəyər\nWi-Fi: 802.11ax"),
    ).toEqual([{ label: "Wi-Fi", value: "802.11ax" }]);
  });
});

describe("applyBulkRequiredSpecEntries", () => {
  it("fills empty rows, updates matching labels and appends the rest", () => {
    const rows = applyBulkRequiredSpecEntries(
      [
        { id: "empty", label: "", value: "" },
        { id: "ram", label: "Müvəqqəti yaddaş", value: "" },
      ],
      [
        { label: "Müvəqqəti yaddaş", value: "16 GB" },
        { label: "Ekran", value: "6.7\"" },
        { label: "Port", value: "24" },
      ],
    );

    expect(rows.map((row) => ({ label: row.label, value: row.value }))).toEqual([
      { label: "Ekran", value: "6.7\"" },
      { label: "Müvəqqəti yaddaş", value: "16 GB" },
      { label: "Port", value: "24" },
    ]);
    expect(rows[0]?.id).toBe("empty");
    expect(rows[1]?.id).toBe("ram");
  });

  it("attaches pasted color hex to the color row", () => {
    const rows = applyBulkRequiredSpecEntries(
      [{ id: "color", label: "Rəng", value: "" }],
      [
        { label: "Rəng", value: "Göy" },
        { label: "Rəng kodu", value: "#2563eb" },
      ],
    );

    expect(rows).toEqual([
      { id: "color", label: "Rəng", value: "Göy", colorHex: "#2563eb" },
    ]);
  });
});

describe("applyBulkRequiredSpecText", () => {
  it("returns a parse error when no pairs are found", () => {
    expect(applyBulkRequiredSpecText([], "yalnız mətn")).toEqual({
      rows: [],
      appliedCount: 0,
      error: BULK_REQUIRED_SPEC_PARSE_ERROR,
    });
  });
});

describe("getRequiredSpecsVariantIntroMessage", () => {
  it("documents phone-tablet attrs only when category supports them", () => {
    expect(
      getRequiredSpecsVariantIntroMessage({
        includeInitialVariant: true,
        supportsPhoneTabletVariantAttributes: true,
      }),
    ).toContain("Rəng");
    const disabled = getRequiredSpecsVariantIntroMessage({
      includeInitialVariant: true,
      supportsPhoneTabletVariantAttributes: false,
    });
    expect(disabled).toContain("telefon və planşet");
    expect(disabled).toContain("Port");
  });
});
