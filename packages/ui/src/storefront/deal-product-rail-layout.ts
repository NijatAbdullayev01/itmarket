export type DealProductRailLayout = {
  itemWidth: number;
  stepPx: number;
  viewportWidth: number;
  gapPx: number;
  /** Whole cards fully visible in the viewport. */
  visibleSlots: number;
  /** Always 0: the next card must not peek into the viewport. */
  peekPx: number;
};

/** Near catalog 4-up card width on the home container. */
export const DEAL_ITEM_TARGET_PX = 248;
export const DEAL_ITEM_MIN_PX = 176;
export const DEAL_MOBILE_ITEM_MIN_PX = 152;
export const DEAL_MOBILE_ITEM_MAX_PX = 210;
export const DEAL_MOBILE_VISIBLE_SLOTS = 2;
export const DEAL_DESKTOP_GAP_PX = 12;
export const DEAL_MOBILE_GAP_PX = 10;
/** Matches `@media (max-width: 639px)` deal-rail compact styles. */
export const DEAL_MOBILE_LAYOUT_MQ = "(max-width: 639px)";

export function maxDealVisibleSlots(
  availablePx: number,
  isMobile: boolean,
): number {
  if (isMobile) return DEAL_MOBILE_VISIBLE_SLOTS;
  if (availablePx < 720) return 2;
  if (availablePx < 1024) return 3;
  return 5;
}

function filledItemWidth(
  availablePx: number,
  slots: number,
  gapPx: number,
): number {
  return (availablePx - gapPx * Math.max(0, slots - 1)) / slots;
}

function layoutFilledRow(
  usable: number,
  visibleSlots: number,
  gapPx: number,
  minPx: number,
  maxWidth: number,
): DealProductRailLayout {
  const stretched = filledItemWidth(usable, visibleSlots, gapPx);
  const itemWidth = Math.max(minPx, Math.min(maxWidth, stretched));

  return {
    itemWidth,
    stepPx: itemWidth + gapPx,
    viewportWidth: usable,
    gapPx,
    visibleSlots,
    peekPx: 0,
  };
}

/**
 * Mobile: always two equal cards in the viewport (catalog-like 2-up).
 * Extra products carousel one card at a time; a single product stays left-aligned.
 * Desktop: whole cards only (5 on a typical home width). Extra products
 * carousel one card at a time; the next card must not peek.
 */
export function layoutDealProductStrip(
  availablePx: number,
  itemCount: number,
  isMobile: boolean,
): DealProductRailLayout {
  const minPx = isMobile ? DEAL_MOBILE_ITEM_MIN_PX : DEAL_ITEM_MIN_PX;
  const usable = Math.max(minPx, availablePx);
  const gapPx = isMobile ? DEAL_MOBILE_GAP_PX : DEAL_DESKTOP_GAP_PX;
  const maxSlots = maxDealVisibleSlots(usable, isMobile);

  if (isMobile) {
    if (itemCount <= 0) {
      return {
        itemWidth: minPx,
        stepPx: minPx + gapPx,
        viewportWidth: usable,
        gapPx,
        visibleSlots: 0,
        peekPx: 0,
      };
    }

    if (itemCount < DEAL_MOBILE_VISIBLE_SLOTS) {
      return layoutFilledRow(
        usable,
        itemCount,
        gapPx,
        minPx,
        DEAL_MOBILE_ITEM_MAX_PX,
      );
    }

    const itemWidth = filledItemWidth(
      usable,
      DEAL_MOBILE_VISIBLE_SLOTS,
      gapPx,
    );

    return {
      itemWidth,
      stepPx: itemWidth + gapPx,
      viewportWidth: usable,
      gapPx,
      visibleSlots: DEAL_MOBILE_VISIBLE_SLOTS,
      peekPx: 0,
    };
  }

  const fitCount = Math.max(
    1,
    Math.floor((usable + gapPx) / (minPx + gapPx)),
  );
  const canFitAll =
    itemCount > 0 && itemCount <= Math.min(maxSlots, fitCount);

  if (canFitAll) {
    return layoutFilledRow(
      usable,
      itemCount,
      gapPx,
      minPx,
      DEAL_ITEM_TARGET_PX * 1.28,
    );
  }

  let visibleSlots = maxSlots;

  while (
    visibleSlots > 1 &&
    filledItemWidth(usable, visibleSlots, gapPx) < minPx
  ) {
    visibleSlots -= 1;
  }

  return layoutFilledRow(
    usable,
    visibleSlots,
    gapPx,
    minPx,
    Number.POSITIVE_INFINITY,
  );
}

export function dealProductRailNeedsCarousel(
  itemCount: number,
  layout: DealProductRailLayout,
): boolean {
  return itemCount > layout.visibleSlots;
}
