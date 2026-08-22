"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

import { resolveCatalogNavHref } from "./catalog-search-header";
import { CategoryIcon } from "./category-icon";
import {
  getCategoryTree,
  type CategoryItem,
  type CategoryTreeNode,
} from "./category-items";
import { IconCatalog, IconChevronLeft, IconChevronRight, IconClose } from "./icons";

export type HeaderCatalogCategory = CategoryItem;
export type HeaderCatalogBrand = { slug: string };

export type HeaderCatalogLabels = {
  catalog: string;
  open: string;
  close: string;
  categories: string;
  back?: string;
  viewAll?: string;
  empty?: string;
  goToHome?: string;
  subcategoriesAria?: string;
};

const defaultCatalogLabels: Required<HeaderCatalogLabels> = {
  catalog: "Kataloq",
  open: "Kataloqu aç",
  close: "Kataloqu bağla",
  categories: "Kataloq kateqoriyaları",
  back: "Geri",
  viewAll: "Hamısına bax",
  empty: "Kateqoriyalar tezliklə əlavə olunacaq.",
  goToHome: "Ana səhifəyə keç",
  subcategoriesAria: "{name} alt kateqoriyaları",
};

type HeaderCatalogButtonProps = {
  categories?: HeaderCatalogCategory[];
  brands?: HeaderCatalogBrand[];
  labels?: HeaderCatalogLabels;
};

function formatCatalogMessage(
  template: string,
  vars: Record<string, string>,
): string {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template,
  );
}

function fallbackHeaderHeight(): number {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--header-height")
    .trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 68;
}

function measurePanelTop(): number {
  const header = document.querySelector(".ui-site-header");
  if (!(header instanceof HTMLElement)) {
    return fallbackHeaderHeight();
  }
  const rect = header.getBoundingClientRect();
  // Sticky scroll-lock ilə pozula bilər — off-screen olanda offsetHeight-ə düş
  if (rect.bottom > 0) {
    return Math.round(rect.bottom);
  }
  return Math.max(fallbackHeaderHeight(), Math.round(header.offsetHeight));
}

function isCompactViewport() {
  return window.matchMedia("(max-width: 900px)").matches;
}

/** Desktop home sidebar — mobil/tabletdə CSS ilə gizlədilir, kataloq düyməsi həmişə görünür */
function isHomeCategorySidebarLaidOut(sidebar: Element) {
  if (!(sidebar instanceof HTMLElement)) {
    return false;
  }

  const shell = sidebar.closest(".ui-category-sidebar-shell");
  const target =
    shell instanceof HTMLElement ? shell : sidebar;
  const style = window.getComputedStyle(target);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }

  const rect = target.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function CatalogRouteKeySync({
  onKey,
}: {
  onKey: (key: string) => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    onKey(key);
  }, [key, onKey]);

  return null;
}

export function HeaderCatalogButton({
  categories = [],
  brands = [],
  labels: labelsProp,
}: HeaderCatalogButtonProps) {
  const labels: Required<HeaderCatalogLabels> = {
    ...defaultCatalogLabels,
    ...labelsProp,
    back: labelsProp?.back ?? defaultCatalogLabels.back ?? "Geri",
    viewAll: labelsProp?.viewAll ?? defaultCatalogLabels.viewAll ?? "Hamısına bax",
  };
  const pathname = usePathname();
  const [pageKey, setPageKey] = useState(pathname);
  const onRouteKey = useCallback((key: string) => {
    setPageKey(key);
  }, []);
  const tree = getCategoryTree(categories);
  const navHref = (slug: string | undefined) =>
    resolveCatalogNavHref(slug, brands);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  /** Off-home: visible immediately to avoid header reflow on refresh. */
  const [visible, setVisible] = useState(() => pathname !== "/");
  const [mounted, setMounted] = useState(false);
  const [activeNode, setActiveNode] = useState<CategoryTreeNode | null>(null);
  const [mobileStack, setMobileStack] = useState<CategoryTreeNode[]>([]);
  const mobileStackRef = useRef(mobileStack);
  mobileStackRef.current = mobileStack;
  const [mobileFlyoutArmed, setMobileFlyoutArmed] = useState(false);
  const [panelTop, setPanelTop] = useState(68);

  const close = useCallback(() => {
    setOpen(false);
    setActiveNode(null);
    setMobileStack([]);
  }, []);

  const popMobileDrill = useCallback(() => {
    const next = mobileStackRef.current.slice(0, -1);
    setMobileStack(next);
    setActiveNode(next[next.length - 1] ?? null);
  }, []);

  const updateMetrics = useCallback(() => {
    setPanelTop(measurePanelTop());
  }, []);

  const openRef = useRef(false);
  openRef.current = open;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    close();
  }, [pageKey, close]);

  useEffect(() => {
    let intersection: IntersectionObserver | null = null;
    let mutation: MutationObserver | null = null;
    let frame = 0;
    let cancelled = false;

    // Non-home routes keep the catalog control visible from first paint.
    if (pathname !== "/") {
      setVisible(true);
      return;
    }

    // Home: stay collapsed until the sidebar is known. Never expand just because
    // the page is still streaming (that caused expand→collapse on refresh).
    setVisible(false);

    const attachSidebarObserver = (sidebar: Element) => {
      intersection?.disconnect();
      intersection = new IntersectionObserver(
        ([entry]) => {
          if (openRef.current || cancelled) {
            return;
          }
          setVisible(!entry.isIntersecting);
        },
        {
          root: null,
          rootMargin: "-72px 0px 0px 0px",
          threshold: 0,
        },
      );
      intersection.observe(sidebar);
    };

    const syncFromDom = () => {
      if (cancelled || openRef.current) {
        return true;
      }

      if (isCompactViewport()) {
        setVisible(true);
        return true;
      }

      const sidebar = document.querySelector(".ui-category-sidebar");
      if (!sidebar) {
        // Still loading home chrome — keep catalog hidden.
        setVisible(false);
        return false;
      }

      if (!isHomeCategorySidebarLaidOut(sidebar)) {
        // Sidebar present but not laid out (e.g. tablet CSS) — show catalog.
        setVisible(true);
        return true;
      }

      setVisible(false);
      attachSidebarObserver(sidebar);
      return true;
    };

    if (!syncFromDom()) {
      frame = window.requestAnimationFrame(() => {
        if (cancelled || syncFromDom()) {
          return;
        }
        mutation = new MutationObserver(() => {
          if (syncFromDom()) {
            mutation?.disconnect();
            mutation = null;
          }
        });
        mutation.observe(document.body, { childList: true, subtree: true });
      });
    }

    const onViewportChange = () => {
      if (cancelled) {
        return;
      }
      syncFromDom();
    };

    window.addEventListener("resize", onViewportChange);

    return () => {
      cancelled = true;
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      intersection?.disconnect();
      mutation?.disconnect();
      window.removeEventListener("resize", onViewportChange);
    };
  }, [pageKey, pathname]);

  useEffect(() => {
    if (open) {
      return;
    }

    if (pathname !== "/") {
      setVisible(true);
      return;
    }

    if (isCompactViewport()) {
      setVisible(true);
      return;
    }

    const sidebar = document.querySelector(".ui-category-sidebar");
    if (!sidebar) {
      setVisible(false);
      return;
    }

    if (!isHomeCategorySidebarLaidOut(sidebar)) {
      setVisible(true);
      return;
    }

    const rect = sidebar.getBoundingClientRect();
    const headerOffset = 72;
    const inView = rect.bottom > headerOffset && rect.top < window.innerHeight;
    setVisible(!inView);
  }, [open, pageKey, pathname]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const header = document.querySelector(".ui-site-header");
    const headerHeight =
      header instanceof HTMLElement
        ? Math.max(fallbackHeaderHeight(), Math.round(header.offsetHeight))
        : fallbackHeaderHeight();

    // Sticky → fixed keçiddə flow boşluğunu saxla (scroll jump olmasın)
    const spacer = document.createElement("div");
    spacer.setAttribute("data-ui-header-catalog-spacer", "");
    spacer.setAttribute("aria-hidden", "true");
    spacer.style.cssText = `height:${headerHeight}px;width:100%;flex-shrink:0;pointer-events:none;`;
    if (header?.parentElement) {
      header.insertAdjacentElement("afterend", spacer);
    }

    updateMetrics();

    return () => {
      spacer.remove();
    };
  }, [open, updateMetrics]);

  useEffect(() => {
    if (!open || isCompactViewport() || activeNode !== null) {
      return;
    }
    const firstWithChildren = tree.find((node) => node.children.length > 0);
    if (firstWithChildren) {
      setActiveNode(firstWithChildren);
    }
    // Yalnız açılışda ilk kateqoriyanı seç — tree/activeNode dəyişəndə təkrarlama
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const docEl = document.documentElement;
    const bodyEl = document.body;
    const previousBodyOverflow = bodyEl.style.overflow;
    const previousHtmlOverflow = docEl.style.overflow;

    bodyEl.style.overflow = "hidden";
    docEl.style.overflow = "hidden";
    bodyEl.classList.add("ui-catalog-locked");
    docEl.classList.add("ui-catalog-locked");

    // Scroll-lock sticky-ni poza bilər — header artıq fixed-dir, paneli yenidən ölç
    updateMetrics();

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      close();
    };

    const onTouchMoveBackdrop = (event: TouchEvent) => {
      event.preventDefault();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (mobileStack.length > 0 && isCompactViewport()) {
          popMobileDrill();
          return;
        }
        close();
        triggerRef.current?.focus();
      }
    };

    const onViewportChange = () => {
      updateMetrics();
      if (!isCompactViewport()) {
        setMobileStack([]);
      }
    };

    // Açılış klikindən sonra dinlə — eyni pointerdown paneli dərhal bağlamasın
    const bindTimer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);

    const backdropNode = document.querySelector(".ui-header-catalog__backdrop");
    backdropNode?.addEventListener("touchmove", onTouchMoveBackdrop as EventListener, {
      passive: false,
    });

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onViewportChange);

    return () => {
      bodyEl.style.overflow = previousBodyOverflow;
      docEl.style.overflow = previousHtmlOverflow;
      bodyEl.classList.remove("ui-catalog-locked");
      docEl.classList.remove("ui-catalog-locked");
      window.clearTimeout(bindTimer);
      backdropNode?.removeEventListener("touchmove", onTouchMoveBackdrop as EventListener);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onViewportChange);
    };
  }, [open, close, updateMetrics, mobileStack.length, popMobileDrill]);

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" && !open) {
      event.preventDefault();
      setOpen(true);
    }
  };

  const activateNode = (
    node: CategoryTreeNode,
    opts?: { mobileDrill?: boolean },
  ) => {
    if (node.children.length === 0) {
      setActiveNode(null);
      setMobileStack([]);
      return;
    }
    setActiveNode(node);
    if (opts?.mobileDrill) {
      setMobileStack((stack) => {
        const existing = stack.findIndex((entry) => entry.id === node.id);
        if (existing >= 0) {
          return stack.slice(0, existing + 1);
        }
        return [...stack, node];
      });
    }
  };

  const flyoutNode = mobileStack[mobileStack.length - 1] ?? activeNode;
  const flyoutOpen = flyoutNode !== null && flyoutNode.children.length > 0;
  const showMobileChildren = mobileStack.length > 0 && flyoutOpen;

  useEffect(() => {
    if (!showMobileChildren) {
      setMobileFlyoutArmed(false);
      return;
    }

    setMobileFlyoutArmed(false);
    const timer = window.setTimeout(() => {
      setMobileFlyoutArmed(true);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [showMobileChildren, flyoutNode?.id]);
  const panelStyle: CSSProperties = {
    top: panelTop,
    bottom: 0,
    height: "auto",
    maxHeight: `calc(100dvh - ${panelTop}px)`,
  };
  const backdropStyle: CSSProperties = {
    top: panelTop,
    bottom: 0,
    left: 0,
    right: 0,
  };

  const overlay =
    open && mounted
      ? createPortal(
          <>
            <button
              type="button"
              className="ui-header-catalog__backdrop"
              style={backdropStyle}
              aria-label={labels.close}
              tabIndex={-1}
              onClick={close}
            />
            <div
              ref={panelRef}
              id={panelId}
              className={[
                "ui-header-catalog__panel",
                flyoutOpen ? "ui-header-catalog__panel--flyout-open" : "",
                showMobileChildren ? "ui-header-catalog__panel--mobile-children" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={panelStyle}
              role="dialog"
              aria-modal="true"
              aria-label={labels.categories}
            >
              <div className="ui-header-catalog__body">
                <div
                  className={[
                    "ui-header-catalog__rail",
                    showMobileChildren ? "ui-header-catalog__rail--hidden" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="ui-header-catalog__rail-head">
                    <p className="ui-header-catalog__rail-title">{labels.catalog}</p>
                  </div>

                  {tree.length > 0 ? (
                    <ul className="ui-header-catalog__list" role="list">
                      {tree.map((node) => {
                        const hasChildren = node.children.length > 0;
                        const isActive = activeNode?.id === node.id;
                        return (
                          <li key={node.id}>
                            {hasChildren ? (
                              <div
                                className={[
                                  "ui-header-catalog__item",
                                  "ui-header-catalog__item--branch",
                                  isActive ? "ui-header-catalog__item--active" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                onMouseEnter={() => {
                                  if (!isCompactViewport()) {
                                    activateNode(node);
                                  }
                                }}
                              >
                                <Link
                                  href={navHref(node.slug)}
                                  className="ui-header-catalog__item-link"
                                  onFocus={() => {
                                    if (!isCompactViewport()) {
                                      activateNode(node);
                                    }
                                  }}
                                  onClick={(event) => {
                                    if (isCompactViewport()) {
                                      event.preventDefault();
                                      activateNode(node, { mobileDrill: true });
                                      return;
                                    }
                                    close();
                                  }}
                                >
                                  <CategoryIcon
                                    name={node.name}
                                    slug={node.slug ?? ""}
                                  />
                                  <span className="ui-header-catalog__item-name">
                                    {node.name}
                                  </span>
                                </Link>
                                <button
                                  type="button"
                                  className="ui-header-catalog__item-expand"
                                  aria-expanded={isActive}
                                  aria-haspopup="true"
                                  aria-label={formatCatalogMessage(
                                    labels.subcategoriesAria,
                                    { name: node.name },
                                  )}
                                  onFocus={() => {
                                    if (!isCompactViewport()) {
                                      activateNode(node);
                                    }
                                  }}
                                  onClick={() => {
                                    if (isCompactViewport()) {
                                      activateNode(node, { mobileDrill: true });
                                      return;
                                    }
                                    activateNode(node);
                                  }}
                                >
                                  <IconChevronRight
                                    className="ui-header-catalog__item-chevron"
                                    width={16}
                                    height={16}
                                  />
                                </button>
                              </div>
                            ) : (
                              <Link
                                href={navHref(node.slug)}
                                className={[
                                  "ui-header-catalog__item",
                                  isActive ? "ui-header-catalog__item--active" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                onClick={close}
                                onMouseEnter={() => {
                                  if (!isCompactViewport()) {
                                    setActiveNode(null);
                                  }
                                }}
                                onFocus={() => {
                                  if (!isCompactViewport()) {
                                    setActiveNode(null);
                                  }
                                }}
                              >
                                <CategoryIcon
                                  name={node.name}
                                  slug={node.slug ?? ""}
                                />
                                <span className="ui-header-catalog__item-name">
                                  {node.name}
                                </span>
                              </Link>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="ui-header-catalog__empty">
                      <p>{labels.empty}</p>
                      <Link href="/" onClick={close}>
                        {labels.goToHome}
                      </Link>
                    </div>
                  )}
                </div>

                {flyoutOpen && flyoutNode ? (
                  <div
                    className={[
                      "ui-header-catalog__flyout",
                      showMobileChildren
                        ? "ui-header-catalog__flyout--mobile-active"
                        : "",
                      showMobileChildren && mobileFlyoutArmed
                        ? "ui-header-catalog__flyout--armed"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="ui-header-catalog__flyout-head">
                      <button
                        type="button"
                        className="ui-header-catalog__flyout-back"
                        onClick={popMobileDrill}
                      >
                        <IconChevronLeft width={20} height={20} />
                        <span>{labels.back}</span>
                      </button>
                      {showMobileChildren ? (
                        <p className="ui-header-catalog__flyout-title">
                          {flyoutNode.name}
                        </p>
                      ) : (
                        <Link
                          href={navHref(flyoutNode.slug)}
                          className="ui-header-catalog__flyout-title"
                          onClick={close}
                        >
                          {flyoutNode.name}
                        </Link>
                      )}
                    </div>
                    <ul
                      className="ui-header-catalog__flyout-list"
                      aria-label={formatCatalogMessage(
                        labels.subcategoriesAria,
                        { name: flyoutNode.name },
                      )}
                    >
                      {showMobileChildren ? (
                        <li>
                          <Link
                            href={navHref(flyoutNode.slug)}
                            className="ui-header-catalog__flyout-link ui-header-catalog__flyout-link--all"
                            onClick={close}
                          >
                            <span>{labels.viewAll}</span>
                            <IconChevronRight
                              className="ui-header-catalog__flyout-link-chevron"
                              width={16}
                              height={16}
                            />
                          </Link>
                        </li>
                      ) : null}
                      {flyoutNode.children.map((child) => {
                        const canDrill =
                          showMobileChildren && child.children.length > 0;
                        return (
                          <li key={child.id}>
                            {canDrill ? (
                              <button
                                type="button"
                                className="ui-header-catalog__flyout-link"
                                onClick={() =>
                                  activateNode(child, { mobileDrill: true })
                                }
                              >
                                <span>{child.name}</span>
                                <IconChevronRight
                                  className="ui-header-catalog__flyout-link-chevron"
                                  width={16}
                                  height={16}
                                />
                              </button>
                            ) : (
                              <Link
                                href={navHref(child.slug)}
                                className="ui-header-catalog__flyout-link"
                                onClick={close}
                              >
                                <span>{child.name}</span>
                                <IconChevronRight
                                  className="ui-header-catalog__flyout-link-chevron"
                                  width={16}
                                  height={16}
                                />
                              </Link>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      <Suspense fallback={null}>
        <CatalogRouteKeySync onKey={onRouteKey} />
      </Suspense>
    <div
      ref={rootRef}
      className={[
        "ui-header-catalog",
        visible ? "ui-header-catalog--visible" : "",
        open ? "ui-header-catalog--open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="ui-header-catalog__reveal">
        <div className="ui-header-catalog__slot">
          <button
            ref={triggerRef}
            type="button"
            className="ui-header-catalog__trigger"
            aria-expanded={open}
            aria-controls={panelId}
            aria-haspopup="dialog"
            aria-label={open ? labels.close : labels.open}
            disabled={!visible}
            tabIndex={visible ? 0 : -1}
            onClick={() => {
              setOpen((current) => !current);
            }}
            onKeyDown={onTriggerKeyDown}
          >
            <span className="ui-header-catalog__icon" aria-hidden="true">
              {open ? (
                <IconClose width={20} height={20} />
              ) : (
                <IconCatalog width={20} height={20} />
              )}
            </span>
            <span className="ui-header-catalog__label">{labels.catalog}</span>
          </button>
        </div>
      </div>
      {overlay}
    </div>
    </>
  );
}
