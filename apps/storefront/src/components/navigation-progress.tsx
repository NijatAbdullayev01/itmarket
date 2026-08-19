"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { isStorefrontSoftNavClick } from "@/lib/is-storefront-soft-nav-click";

type ProgressState = "idle" | "pending" | "finishing";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [state, setState] = useState<ProgressState>("idle");
  const pendingRef = useRef(false);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!isStorefrontSoftNavClick(event)) {
        return;
      }
      pendingRef.current = true;
      document.documentElement.dataset.storefrontNav = "pending";
      setState("pending");
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!pendingRef.current) {
      return;
    }

    pendingRef.current = false;
    setState("finishing");
    const timer = window.setTimeout(() => {
      setState("idle");
    }, 180);

    return () => window.clearTimeout(timer);
  }, [routeKey]);

  useEffect(() => {
    if (state !== "pending") {
      return;
    }

    const timer = window.setTimeout(() => {
      pendingRef.current = false;
      setState("idle");
    }, 8000);

    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    const root = document.documentElement;
    if (state === "idle") {
      delete root.dataset.storefrontNav;
      return;
    }
    root.dataset.storefrontNav = state;
  }, [state]);

  useEffect(() => {
    return () => {
      delete document.documentElement.dataset.storefrontNav;
    };
  }, []);

  if (state === "idle") {
    return null;
  }

  return (
    <div
      className="ui-nav-progress"
      data-state={state}
      aria-hidden="true"
    >
      <span className="ui-nav-progress__bar" />
    </div>
  );
}
