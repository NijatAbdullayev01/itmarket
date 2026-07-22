"use client";

import { useEffect } from "react";

import { buildBackofficeDocumentTitle } from "../../lib/order-tab-alert";
import { useBoNavCounts } from "./bo-nav-counts-context";

export function BoOrderTabAlert() {
  const { newOrderAlert } = useBoNavCounts();

  useEffect(() => {
    document.title = buildBackofficeDocumentTitle(newOrderAlert);
  }, [newOrderAlert]);

  return null;
}
