import { describe, expect, it } from "vitest";

import { detectNewOrderArrival } from "./order-arrival-monitor";

describe("detectNewOrderArrival", () => {
  const counts = { new: 2, packaging: 1, ready: 0, all: 5 };

  it("does not signal arrival before baseline is established", () => {
    expect(
      detectNewOrderArrival(null, counts, false),
    ).toEqual({ arrived: false, delta: 0 });
  });

  it("does not signal arrival when the new bucket count is unchanged", () => {
    expect(
      detectNewOrderArrival(
        { new: 2, packaging: 1, ready: 0, all: 5 },
        counts,
        true,
      ),
    ).toEqual({ arrived: false, delta: 0 });
  });

  it("signals arrival when the new bucket count increases", () => {
    expect(
      detectNewOrderArrival(
        { new: 1, packaging: 1, ready: 0, all: 4 },
        counts,
        true,
      ),
    ).toEqual({ arrived: true, delta: 1 });
  });

  it("does not signal arrival when the new bucket count decreases", () => {
    expect(
      detectNewOrderArrival(
        { new: 3, packaging: 0, ready: 0, all: 5 },
        counts,
        true,
      ),
    ).toEqual({ arrived: false, delta: -1 });
  });
});
