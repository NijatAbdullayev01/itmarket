import { describe, expect, it } from "vitest";

import {
  detectPendingSupportIncrease,
} from "./use-support-message-arrival-monitor";
import { isCustomerSupportArrivalEvent } from "./support-chat-sse";

describe("detectPendingSupportIncrease", () => {
  it("ignores the first baseline sample", () => {
    expect(
      detectPendingSupportIncrease(null, { pending: 3 }, false),
    ).toEqual({ arrived: false, delta: 0 });
  });

  it("detects an increase after baseline", () => {
    expect(
      detectPendingSupportIncrease({ pending: 2 }, { pending: 5 }, true),
    ).toEqual({ arrived: true, delta: 3 });
  });

  it("ignores decreases and flat counts", () => {
    expect(
      detectPendingSupportIncrease({ pending: 4 }, { pending: 2 }, true),
    ).toEqual({ arrived: false, delta: 0 });
    expect(
      detectPendingSupportIncrease({ pending: 4 }, { pending: 4 }, true),
    ).toEqual({ arrived: false, delta: 0 });
  });
});

describe("isCustomerSupportArrivalEvent", () => {
  it("treats new threads and customer messages as arrivals", () => {
    expect(
      isCustomerSupportArrivalEvent({
        type: "thread",
        threadId: "t1",
        thread: {
          id: "t1",
          status: "PENDING",
          name: "A",
          phone: "+994",
          email: null,
          body: "hi",
          lastMessagePreview: "hi",
          lastMessageAt: "2026-07-27T00:00:00.000Z",
          pagePath: null,
          customerId: null,
          customerName: null,
          createdAt: "2026-07-27T00:00:00.000Z",
          updatedAt: "2026-07-27T00:00:00.000Z",
        },
      }),
    ).toBe(true);

    expect(
      isCustomerSupportArrivalEvent({
        type: "message",
        threadId: "t1",
        message: {
          id: "m1",
          threadId: "t1",
          senderType: "CUSTOMER",
          staffUserId: null,
          staffDisplayName: null,
          body: "salam",
          createdAt: "2026-07-27T00:00:00.000Z",
        },
      }),
    ).toBe(true);
  });

  it("ignores staff messages and status-only events", () => {
    expect(
      isCustomerSupportArrivalEvent({
        type: "message",
        threadId: "t1",
        message: {
          id: "m2",
          threadId: "t1",
          senderType: "STAFF",
          staffUserId: "s1",
          staffDisplayName: "Admin",
          body: "cavab",
          createdAt: "2026-07-27T00:00:00.000Z",
        },
      }),
    ).toBe(false);

    expect(
      isCustomerSupportArrivalEvent({
        type: "status",
        threadId: "t1",
        status: "OPEN",
      }),
    ).toBe(false);
  });
});
