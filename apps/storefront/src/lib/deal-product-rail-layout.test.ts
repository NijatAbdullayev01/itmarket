import { describe, expect, it } from "vitest";
import {
  DEAL_ITEM_MIN_PX,
  DEAL_MOBILE_ITEM_MAX_PX,
  DEAL_MOBILE_VISIBLE_SLOTS,
  dealProductRailNeedsCarousel,
  layoutDealProductStrip,
} from "@itmarket/ui";

describe("layoutDealProductStrip", () => {
  it("shows two equal cards on a typical phone", () => {
    const layout = layoutDealProductStrip(414, 8, true);

    expect(layout.visibleSlots).toBe(DEAL_MOBILE_VISIBLE_SLOTS);
    expect(layout.peekPx).toBe(0);
    expect(layout.itemWidth).toBeGreaterThan(180);
    expect(layout.itemWidth).toBeLessThan(220);
    expect(dealProductRailNeedsCarousel(8, layout)).toBe(true);
  });

  it("keeps two visible cards on a narrow phone", () => {
    const layout = layoutDealProductStrip(312, 8, true);

    expect(layout.visibleSlots).toBe(DEAL_MOBILE_VISIBLE_SLOTS);
    expect(layout.peekPx).toBe(0);
    expect(dealProductRailNeedsCarousel(8, layout)).toBe(true);
  });

  it("does not stretch a single mobile product across the rail", () => {
    const layout = layoutDealProductStrip(414, 1, true);

    expect(layout.visibleSlots).toBe(1);
    expect(layout.peekPx).toBe(0);
    expect(layout.itemWidth).toBeLessThanOrEqual(DEAL_MOBILE_ITEM_MAX_PX);
    expect(dealProductRailNeedsCarousel(1, layout)).toBe(false);
  });

  it("does not carousel when exactly two mobile products fit", () => {
    const layout = layoutDealProductStrip(414, 2, true);

    expect(layout.visibleSlots).toBe(2);
    expect(layout.peekPx).toBe(0);
    expect(dealProductRailNeedsCarousel(2, layout)).toBe(false);
  });

  it("shows exactly five full cards on the home desktop width", () => {
    const layout = layoutDealProductStrip(1328, 8, false);

    expect(layout.visibleSlots).toBe(5);
    expect(layout.peekPx).toBe(0);
    expect(layout.itemWidth * 5 + layout.gapPx * 4).toBeCloseTo(1328);
    expect(dealProductRailNeedsCarousel(8, layout)).toBe(true);
  });

  it("does not carousel or peek when every product already fits", () => {
    const layout = layoutDealProductStrip(1328, 3, false);

    expect(layout.visibleSlots).toBe(3);
    expect(layout.peekPx).toBe(0);
    expect(dealProductRailNeedsCarousel(3, layout)).toBe(false);
  });

  it("does not stretch a single product across the full desktop rail", () => {
    const layout = layoutDealProductStrip(1328, 1, false);

    expect(layout.visibleSlots).toBe(1);
    expect(layout.peekPx).toBe(0);
    expect(layout.itemWidth).toBeLessThan(400);
    expect(dealProductRailNeedsCarousel(1, layout)).toBe(false);
  });

  it("never sizes cards below the readable minimum", () => {
    const compact = layoutDealProductStrip(520, 6, false);

    expect(compact.itemWidth).toBeGreaterThanOrEqual(DEAL_ITEM_MIN_PX);
    expect(compact.visibleSlots).toBe(2);
    expect(dealProductRailNeedsCarousel(6, compact)).toBe(true);
  });
});
