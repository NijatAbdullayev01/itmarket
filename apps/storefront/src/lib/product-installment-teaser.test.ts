import { describe, expect, it } from "vitest";

import {
  getProductInstallmentPlans,
  getProductInstallmentTeaser,
} from "@itmarket/ui";

describe("getProductInstallmentPlans", () => {
  it("returns sorted monthly plans for the default terms", () => {
    const plans = getProductInstallmentPlans(46.08);

    expect(plans.map((plan) => plan.months)).toEqual([6, 12, 18, 24]);
    expect(plans.map((plan) => plan.monthlyAmountFormatted.replace(/\u00a0/g, " "))).toEqual([
      "7.68 ₼",
      "3.84 ₼",
      "2.56 ₼",
      "1.92 ₼",
    ]);
  });

  it("ignores invalid prices and non-positive months", () => {
    expect(getProductInstallmentPlans(null)).toEqual([]);
    expect(getProductInstallmentPlans(0)).toEqual([]);
    expect(getProductInstallmentPlans("abc")).toEqual([]);
    expect(getProductInstallmentPlans(120, [-3, 0, 12])).toEqual([
      { months: 12, monthlyAmountFormatted: "10.00 ₼" },
    ]);
  });
});

describe("getProductInstallmentTeaser", () => {
  it("defaults to the longest term so the monthly amount is lowest", () => {
    const teaser = getProductInstallmentTeaser("46.08");

    expect(teaser).toEqual({
      months: 24,
      monthlyAmountFormatted: "1.92 ₼",
    });
  });
});
