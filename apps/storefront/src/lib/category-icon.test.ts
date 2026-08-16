import { describe, expect, it } from "vitest";
import { resolveCategoryIconKind } from "@itmarket/ui";

describe("resolveCategoryIconKind", () => {
  it("maps the Server root category to the rack-server icon", () => {
    expect(resolveCategoryIconKind("Server", "server")).toBe("server");
  });

  it("keeps UPS distinct from Server", () => {
    expect(resolveCategoryIconKind("UPS", "ups")).toBe("ups");
  });
});
