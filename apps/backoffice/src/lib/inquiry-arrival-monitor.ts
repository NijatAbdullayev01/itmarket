import type { StaffAvailabilityRequestNavCountsContract } from "@itmarket/contracts";

export const INQUIRY_ARRIVAL_POLL_INTERVAL_MS = 15_000;

export type InquiryArrivalKinds = {
  preorder: boolean;
  stockAlert: boolean;
};

export function detectInquiryArrival(
  previous: StaffAvailabilityRequestNavCountsContract | null,
  current: StaffAvailabilityRequestNavCountsContract,
  baselineEstablished: boolean,
): { arrived: boolean; kinds: InquiryArrivalKinds } {
  if (!baselineEstablished || previous === null) {
    return {
      arrived: false,
      kinds: { preorder: false, stockAlert: false },
    };
  }

  const kinds: InquiryArrivalKinds = {
    preorder: current.pendingPreorders > previous.pendingPreorders,
    stockAlert: current.pendingStockAlerts > previous.pendingStockAlerts,
  };

  return {
    arrived: kinds.preorder || kinds.stockAlert,
    kinds,
  };
}
