"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getOrderStatus, type OrderStatus } from "@/lib/api";
import { useMessages } from "@/components/locale-provider";
import {
  customerOrderStatusLabel,
  EmptyStateLink,
  labelFor,
} from "@itmarket/ui";
import { toOrderStatusLabelMaps } from "@/lib/i18n";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 20;

function isAwaitingConfirmation(paymentStatus: OrderStatus["paymentStatus"]) {
  return paymentStatus === "PENDING" || paymentStatus === "AUTHORIZED";
}

function isUnderReview(orderStatus: OrderStatus["orderStatus"]) {
  return orderStatus === "UNDER_REVIEW";
}

function statusIconClass(
  paymentStatus: OrderStatus["paymentStatus"],
  orderStatus: OrderStatus["orderStatus"],
) {
  if (isUnderReview(orderStatus)) {
    return "ui-status-icon--pending";
  }
  if (paymentStatus === "PAID" || paymentStatus === "AUTHORIZED") {
    return "ui-status-icon--success";
  }
  if (paymentStatus === "FAILED" || paymentStatus === "CANCELLED") {
    return "ui-status-icon--error";
  }
  return "ui-status-icon--pending";
}

function statusIconGlyph(
  paymentStatus: OrderStatus["paymentStatus"],
  orderStatus: OrderStatus["orderStatus"],
) {
  if (isUnderReview(orderStatus)) {
    return "…";
  }
  if (paymentStatus === "FAILED" || paymentStatus === "CANCELLED") {
    return "!";
  }
  if (isAwaitingConfirmation(paymentStatus)) {
    return "…";
  }
  return "✓";
}

export function CheckoutStatusPanel({ initial }: { initial: OrderStatus }) {
  const [status, setStatus] = useState(initial);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const messages = useMessages();
  const awaiting = isAwaitingConfirmation(status.paymentStatus);

  useEffect(() => {
    if (!isAwaitingConfirmation(initial.paymentStatus)) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let intervalId = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const next = await getOrderStatus(initial.orderNumber);
        if (cancelled) {
          return;
        }
        setStatus(next);
        if (!isAwaitingConfirmation(next.paymentStatus)) {
          window.clearInterval(intervalId);
          return;
        }
      } catch {
        // Keep polling until the attempt budget is exhausted.
      }
      if (attempts >= MAX_POLL_ATTEMPTS) {
        window.clearInterval(intervalId);
        if (!cancelled) {
          setPollTimedOut(true);
        }
      }
    };

    intervalId = window.setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);
    void poll();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [initial.orderNumber, initial.paymentStatus]);

  const statusMaps = toOrderStatusLabelMaps(messages);
  const paymentLabel = labelFor(
    statusMaps.payment ?? {},
    status.paymentStatus,
  );
  const orderLabel = customerOrderStatusLabel(
    status.orderStatus,
    status.fulfillmentType,
    statusMaps,
  );
  const pageTitle = isUnderReview(status.orderStatus)
    ? orderLabel
    : paymentLabel;
  const fulfillmentTypeLabel = labelFor(
    statusMaps.fulfillmentType ?? {},
    status.fulfillmentType,
  );

  return (
    <div className="ui-status-panel">
      <div
        className={`ui-status-icon ${statusIconClass(status.paymentStatus, status.orderStatus)}`}
        aria-hidden="true"
      >
        {statusIconGlyph(status.paymentStatus, status.orderStatus)}
      </div>
      <h1 className="ui-page-title">{pageTitle}</h1>
      {isUnderReview(status.orderStatus) ? (
        <p style={{ color: "var(--color-text-muted)" }}>
          {messages.checkout.installmentReviewBody}
        </p>
      ) : null}
      {awaiting ? (
        <p style={{ color: "var(--color-text-muted)" }}>
          {pollTimedOut
            ? messages.checkout.statusTimedOut
            : messages.checkout.statusPending}
        </p>
      ) : null}
      <dl className="ui-status-dl">
        <div className="ui-status-dl__row">
          <dt>{messages.checkout.orderNumberLabel}</dt>
          <dd>{status.orderNumber}</dd>
        </div>
        <div className="ui-status-dl__row">
          <dt>{messages.checkout.orderStatusRow}</dt>
          <dd>{orderLabel}</dd>
        </div>
        <div className="ui-status-dl__row">
          <dt>{messages.checkout.paymentRow}</dt>
          <dd>{paymentLabel}</dd>
        </div>
        <div className="ui-status-dl__row">
          <dt>{messages.checkout.fulfillmentRow}</dt>
          <dd>{fulfillmentTypeLabel}</dd>
        </div>
      </dl>
      <div className="ui-copy-row">
        <EmptyStateLink href="/" label={messages.common.viewProducts} />
        {status.paymentStatus === "FAILED" ? (
          <Link className="ui-btn ui-btn--primary" href="/cart">
            {messages.common.retry}
          </Link>
        ) : null}
        {pollTimedOut ? (
          <Link
            className="ui-btn ui-btn--secondary"
            href={`/checkout/status?orderNumber=${encodeURIComponent(status.orderNumber)}`}
          >
            {messages.checkout.refreshButton}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
