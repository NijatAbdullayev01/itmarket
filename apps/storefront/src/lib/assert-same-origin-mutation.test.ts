import { describe, expect, it } from "vitest";

import { assertSameOriginMutation } from "./assert-same-origin-mutation";

function requestWith(headers: Record<string, string>): Request {
  return new Request("https://shop.example/api/support-chat/session", {
    method: "POST",
    headers,
  });
}

describe("assertSameOriginMutation", () => {
  it("rejects cross-site fetch", () => {
    expect(
      assertSameOriginMutation(
        requestWith({ "sec-fetch-site": "cross-site" }),
      ),
    ).toBe(false);
  });

  it("allows same-origin Origin", () => {
    expect(
      assertSameOriginMutation(
        requestWith({ origin: "https://shop.example" }),
      ),
    ).toBe(true);
  });

  it("rejects foreign Origin", () => {
    expect(
      assertSameOriginMutation(
        requestWith({ origin: "https://evil.example" }),
      ),
    ).toBe(false);
  });
});
