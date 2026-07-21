import { describe, expect, it } from "vitest";

import { getInventoryLocationLabel, pickDefaultInventoryLocationId } from "./inventory-location-label";

describe("getInventoryLocationLabel", () => {
  it("uses canonical 28 may store display name without type prefix", () => {
    expect(
      getInventoryLocationLabel({
        code: "ST-28MAY",
        name: "28 may",
        type: "STORE",
      }),
    ).toBe("28 may küçəsi 69C");
  });

  it("prefers 28 may store as default location id", () => {
    expect(
      pickDefaultInventoryLocationId([
        { id: "wh-1", code: "WH-OLD", type: "WAREHOUSE" },
        { id: "st-28", code: "ST-28MAY", type: "STORE" },
      ]),
    ).toBe("st-28");
  });

  it("falls back to name when type is unknown", () => {
    expect(
      getInventoryLocationLabel({ code: "WH-2", name: "Şimal anbarı" }),
    ).toBe("Şimal anbarı");
  });
});
