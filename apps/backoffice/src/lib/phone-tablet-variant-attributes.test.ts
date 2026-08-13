import { describe, expect, it } from "vitest";
import {
  SMARTPHONES_ACCESSORIES_ROOT_SLUG,
  isSmartphonesAccessoriesCategoryFamily,
  supportsPhoneTabletVariantAttributes,
} from "@itmarket/contracts";

describe("supportsPhoneTabletVariantAttributes", () => {
  it("enables for Smartfonlar root and phone/tablet leaves", () => {
    expect(
      supportsPhoneTabletVariantAttributes({
        slug: SMARTPHONES_ACCESSORIES_ROOT_SLUG,
        name: "Smartfonlar və aksesuarlar",
      }),
    ).toBe(true);
    expect(
      supportsPhoneTabletVariantAttributes({
        slug: "telefonlar",
        name: "Telefonlar",
        parentSlug: SMARTPHONES_ACCESSORIES_ROOT_SLUG,
      }),
    ).toBe(true);
    expect(
      supportsPhoneTabletVariantAttributes({
        slug: "plansetler",
        name: "Planşetlər",
        parentSlug: SMARTPHONES_ACCESSORIES_ROOT_SLUG,
      }),
    ).toBe(true);
    expect(
      isSmartphonesAccessoriesCategoryFamily({
        slug: SMARTPHONES_ACCESSORIES_ROOT_SLUG,
      }),
    ).toBe(true);
  });

  it("disables accessories even under smartfonlar", () => {
    expect(
      supportsPhoneTabletVariantAttributes({
        slug: "aksesuarlar",
        name: "Aksesuarlar",
        parentSlug: SMARTPHONES_ACCESSORIES_ROOT_SLUG,
      }),
    ).toBe(false);
    expect(
      supportsPhoneTabletVariantAttributes({
        slug: "cexollar",
        name: "Çexollar",
        parentSlug: SMARTPHONES_ACCESSORIES_ROOT_SLUG,
      }),
    ).toBe(false);
  });

  it("enables phone/tablet leaves under other roots (Apple)", () => {
    expect(
      supportsPhoneTabletVariantAttributes({
        slug: "iphone",
        name: "iPhone",
        parentSlug: "apple",
      }),
    ).toBe(true);
    expect(
      supportsPhoneTabletVariantAttributes({
        slug: "plansetler",
        name: "Planşetlər",
        parentSlug: "apple",
      }),
    ).toBe(true);
  });

  it("disables laptops, monitors, and Apple MacBook", () => {
    expect(
      supportsPhoneTabletVariantAttributes({
        slug: "mobil-workstation",
        name: "Mobil workstation",
        parentSlug: "noutbuklar",
      }),
    ).toBe(false);
    expect(
      supportsPhoneTabletVariantAttributes({
        slug: "noutbuklar",
        name: "Noutbuklar",
      }),
    ).toBe(false);
    expect(
      supportsPhoneTabletVariantAttributes({
        slug: "monitorlar",
        name: "Monitorlar",
      }),
    ).toBe(false);
    expect(
      supportsPhoneTabletVariantAttributes({
        slug: "macbook",
        name: "MacBook",
        parentSlug: "apple",
      }),
    ).toBe(false);
  });

  it("does not treat accessory-only leaves as phone variants", () => {
    expect(
      supportsPhoneTabletVariantAttributes({
        slug: "kabeler",
        name: "Kabellər",
        parentSlug: "sebeke",
      }),
    ).toBe(false);
  });
});
