"use client";

import { useEffect, useRef } from "react";

import {
  BACKOFFICE_BASE_DOCUMENT_TITLE,
  buildBackofficeDocumentTitle,
} from "../../lib/order-tab-alert";
import { useBoNavCounts } from "./bo-nav-counts-context";

const TITLE_BLINK_INTERVAL_MS = 1_200;

export function BoOrderTabAlert() {
  const { newOrderAlert, newSupportMessageAlert } = useBoNavCounts();
  const blinkPhaseRef = useRef(false);

  useEffect(() => {
    const alertTitle = buildBackofficeDocumentTitle({
      newOrderAlert,
      newSupportMessageAlert,
    });
    const hasAlert = newOrderAlert || newSupportMessageAlert;

    document.title = alertTitle;
    blinkPhaseRef.current = false;

    if (!hasAlert) {
      return;
    }

    const intervalId = window.setInterval(() => {
      blinkPhaseRef.current = !blinkPhaseRef.current;
      document.title = blinkPhaseRef.current
        ? BACKOFFICE_BASE_DOCUMENT_TITLE
        : alertTitle;
    }, TITLE_BLINK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      document.title = buildBackofficeDocumentTitle({
        newOrderAlert: false,
        newSupportMessageAlert: false,
      });
    };
  }, [newOrderAlert, newSupportMessageAlert]);

  return null;
}
