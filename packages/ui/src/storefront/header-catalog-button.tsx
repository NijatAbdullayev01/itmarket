"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
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

type HeaderCatalogButtonProps = {
  categories?: HeaderCatalogCategory[];
  brands?: HeaderCatalogBrand[];
};

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

export function HeaderCatalogButton({
  categories = [],
  brands = [],
}: HeaderCatalogButtonProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tree = getCategoryTree(categories);
  const navHref = (slug: string | undefined) =>
    resolveCatalogNavHref(slug, brands);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNode, setActiveNode] = useState<CategoryTreeNode | null>(null);
  const [mobileView, setMobileView] = useState<"roots" | "children">("roots");
  const [panelTop, setPanelTop] = useState(68);
  const pageKey = `${pathname}?${searchParams.toString()}`;

  const close = useCallback(() => {
    setOpen(false);
    setActiveNode(null);
    setMobileView("roots");
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
    let observer: IntersectionObserver | null = null;
    let frame = 0;
    setVisible(false);

    const attach = () => {
      const sidebar = document.querySelector(".ui-category-sidebar");
      if (!sidebar) {
        return false;
      }

      if (!isHomeCategorySidebarLaidOut(sidebar)) {
        setVisible(true);
        return true;
      }

      observer = new IntersectionObserver(
        ([entry]) => {
          // Menyu açıq ikən görünürlüyü dəyişmə — scroll jump bağlanmaya səbəb olmasın
          if (openRef.current) {
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
      observer.observe(sidebar);
      return true;
    };

    if (!attach()) {
      frame = window.requestAnimationFrame(() => {
        if (!attach()) {
          setVisible(true);
        }
      });
    }

    const onViewportChange = () => {
      const sidebar = document.querySelector(".ui-category-sidebar");
      if (!sidebar || !isHomeCategorySidebarLaidOut(sidebar)) {
        if (!openRef.current) {
          setVisible(true);
        }
        observer?.disconnect();
        observer = null;
        return;
      }

      if (!observer) {
        attach();
      }
    };

    window.addEventListener("resize", onViewportChange);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      observer?.disconnect();
      window.removeEventListener("resize", onViewportChange);
    };
  }, [pageKey]);

  useEffect(() => {
    if (open) {
      return;
    }

    const sidebar = document.querySelector(".ui-category-sidebar");
    if (!sidebar || !isHomeCategorySidebarLaidOut(sidebar)) {
      setVisible(true);
      return;
    }

    const rect = sidebar.getBoundingClientRect();
    const headerOffset = 72;
    const inView = rect.bottom > headerOffset && rect.top < window.innerHeight;
    setVisible(!inView);
  }, [open, pageKey]);

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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
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

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (mobileView === "children" && isCompactViewport()) {
          setMobileView("roots");
          setActiveNode(null);
          return;
        }
        close();
        triggerRef.current?.focus();
      }
    };

    const onViewportChange = () => {
      updateMetrics();
      if (!isCompactViewport()) {
        setMobileView("roots");
      }
    };

    // Açılış klikindən sonra dinlə — eyni pointerdown paneli dərhal bağlamasın
    const bindTimer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onViewportChange);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(bindTimer);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onViewportChange);
    };
  }, [open, close, updateMetrics, mobileView]);

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" && !open) {
      event.preventDefault();
      setOpen(true);
    }
  };

  const activateNode = (node: CategoryTreeNode, opts?: { mobileDrill?: boolean }) => {
    if (node.children.length === 0) {
      setActiveNode(null);
      setMobileView("roots");
      return;
    }
    setActiveNode(node);
    if (opts?.mobileDrill) {
      setMobileView("children");
    }
  };

  const flyoutOpen = activeNode !== null && activeNode.children.length > 0;
  const showMobileChildren = mobileView === "children" && flyoutOpen;
  const panelStyle: CSSProperties = {
    top: panelTop,
    height: `calc(100dvh - ${panelTop}px)`,
  };
  const backdropStyle: CSSProperties = {
    top: panelTop,
  };

  const overlay =
    open && mounted
      ? createPortal(
          <>
            <button
              type="button"
              className="ui-header-catalog__backdrop"
              style={backdropStyle}
              aria-label="Kataloqu bağla"
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
              aria-label="Kataloq kateqoriyaları"
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
                    <p className="ui-header-catalog__rail-title">Kataloq</p>
                  </div>

                  {tree.length > 0 ? (
                    <ul className="ui-header-catalog__list" role="list">
                      {tree.map((node) => {
                        const hasChildren = node.children.length > 0;
                        const isActive = activeNode?.id === node.id;
                        return (
                          <li key={node.id}>
                            {hasChildren ? (
                              <button
                                type="button"
                                className={[
                                  "ui-header-catalog__item",
                                  isActive ? "ui-header-catalog__item--active" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                aria-expanded={isActive}
                                onMouseEnter={() => {
                                  if (!isCompactViewport()) {
                                    activateNode(node);
                                  }
                                }}
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
                                <CategoryIcon
                                  name={node.name}
                                  slug={node.slug ?? ""}
                                />
                                <span className="ui-header-catalog__item-name">
                                  {node.name}
                                </span>
                                <IconChevronRight
                                  className="ui-header-catalog__item-chevron"
                                  width={16}
                                  height={16}
                                />
                              </button>
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
                      <p>Kateqoriyalar tezliklə əlavə olunacaq.</p>
                      <Link href="/" onClick={close}>
                        Ana səhifəyə keç
                      </Link>
                    </div>
                  )}
                </div>

                {flyoutOpen ? (
                  <div
                    className={[
                      "ui-header-catalog__flyout",
                      showMobileChildren
                        ? "ui-header-catalog__flyout--mobile-active"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="ui-header-catalog__flyout-head">
                      <button
                        type="button"
                        className="ui-header-catalog__flyout-back"
                        onClick={() => {
                          setMobileView("roots");
                          setActiveNode(null);
                        }}
                      >
                        <IconChevronLeft width={20} height={20} />
                        <span>Geri</span>
                      </button>
                      <p className="ui-header-catalog__flyout-title">
                        {activeNode.name}
                      </p>
                    </div>
                    <ul
                      className="ui-header-catalog__flyout-list"
                      aria-label={`${activeNode.name} alt kateqoriyaları`}
                    >
                      {activeNode.children.map((child) => (
                        <li key={child.id}>
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
                        </li>
                      ))}
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
            aria-label={open ? "Kataloqu bağla" : "Kataloqu aç"}
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
            <span className="ui-header-catalog__label">Kataloq</span>
          </button>
        </div>
      </div>
      {overlay}
    </div>
  );
}
