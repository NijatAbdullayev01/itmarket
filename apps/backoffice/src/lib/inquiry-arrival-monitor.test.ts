import { describe, expect, it } from "vitest";

import { detectInquiryArrival } from "./inquiry-arrival-monitor";

describe("detectInquiryArrival", () => {
  const counts = { pendingPreorders: 2, pendingStockAlerts: 1 };

  it("does not signal arrival before baseline is established", () => {
    expect(detectInquiryArrival(null, counts, false)).toEqual({
      arrived: false,
      kinds: { preorder: false, stockAlert: false },
    });
  });

  it("does not signal arrival when pending counts are unchanged", () => {
    expect(
      detectInquiryArrival(
        { pendingPreorders: 2, pendingStockAlerts: 1 },
        counts,
        true,
      ),
    ).toEqual({
      arrived: false,
      kinds: { preorder: false, stockAlert: false },
    });
  });

  it("signals preorder arrival when pending preorders increase", () => {
    expect(
      detectInquiryArrival(
        { pendingPreorders: 1, pendingStockAlerts: 1 },
        counts,
        true,
      ),
    ).toEqual({
      arrived: true,
      kinds: { preorder: true, stockAlert: false },
    });
  });

  it("signals stock-alert arrival when pending stock alerts increase", () => {
    expect(
      detectInquiryArrival(
        { pendingPreorders: 2, pendingStockAlerts: 0 },
        counts,
        true,
      ),
    ).toEqual({
      arrived: true,
      kinds: { preorder: false, stockAlert: true },
    });
  });

  it("signals both kinds when both pending counts increase", () => {
    expect(
      detectInquiryArrival(
        { pendingPreorders: 0, pendingStockAlerts: 0 },
        counts,
        true,
      ),
    ).toEqual({
      arrived: true,
      kinds: { preorder: true, stockAlert: true },
    });
  });

  it("does not signal arrival when pending counts decrease", () => {
    expect(
      detectInquiryArrival(
        { pendingPreorders: 3, pendingStockAlerts: 2 },
        counts,
        true,
      ),
    ).toEqual({
      arrived: false,
      kinds: { preorder: false, stockAlert: false },
    });
  });
});
