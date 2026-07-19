import { describe, expect, it } from "vitest";

import { slugify } from "./slugify";

describe("slugify", () => {
  it("transliterates Azerbaijani characters and normalizes spacing", () => {
    expect(slugify("Apple MacBook Air 13")).toBe("apple-macbook-air-13");
    expect(slugify("Oyun noutbukları")).toBe("oyun-noutbuklari");
    expect(slugify("  Şəki  məhsulu  ")).toBe("seki-mehsulu");
  });

  it("removes invalid characters", () => {
    expect(slugify("ThinkPad X1 / Carbon!")).toBe("thinkpad-x1-carbon");
  });
});
