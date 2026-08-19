import { afterEach, describe, expect, it, vi } from "vitest";

describe("resetStorefrontScroll", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("jumps to top instantly instead of using CSS smooth scroll", async () => {
    const scrollTo = vi.fn();
    const html = { style: { scrollBehavior: "smooth" }, scrollTop: 800 };
    const body = { scrollTop: 800 };

    vi.stubGlobal("window", { scrollTo });
    vi.stubGlobal("document", {
      documentElement: html,
      body,
    });

    const { resetStorefrontScroll } = await import("./reset-storefront-scroll");
    resetStorefrontScroll();

    expect(scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "instant",
    });
    expect(html.scrollTop).toBe(0);
    expect(body.scrollTop).toBe(0);
    expect(html.style.scrollBehavior).toBe("smooth");
  });
});
