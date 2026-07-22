import type { OrderNavCountsContract } from "@itmarket/contracts";

export const ORDER_ARRIVAL_POLL_INTERVAL_MS = 15_000;

export function detectNewOrderArrival(
  previous: OrderNavCountsContract | null,
  current: OrderNavCountsContract,
  baselineEstablished: boolean,
): { arrived: boolean; delta: number } {
  if (!baselineEstablished || previous === null) {
    return { arrived: false, delta: 0 };
  }

  const delta = current.new - previous.new;
  return {
    arrived: delta > 0,
    delta,
  };
}
