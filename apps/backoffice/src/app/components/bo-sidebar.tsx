"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";

import { BrandLogo } from "@itmarket/ui";

import { IconChevronDown, IconClose, IconMenu } from "./bo-icons";
import { useBoNavCounts } from "./bo-nav-counts-context";
import {
  boNavGroups,
  getBoRouteId,
  isOrdersSectionPathname,
  normalizeBoPathname,
  staffHasRouteAccess,
  type BoNavChildItem,
  type BoNavItem,
} from "./bo-nav-config";
import { useBoStaff } from "./bo-staff-context";

const EXPANDED_GROUP_STORAGE_KEY = "bo-sidebar-expanded-group";
const LEGACY_COLLAPSED_GROUPS_STORAGE_KEY = "bo-sidebar-collapsed-groups";

const boNavGroupTitles = new Set(boNavGroups.map((group) => group.title));

function getActiveNavGroupTitle(
  pathname: string,
  searchParams: URLSearchParams,
): string | null {
  return (
    boNavGroups.find((group) =>
      groupHasActiveRoute(group, pathname, searchParams),
    )?.title ?? null
  );
}

function migrateLegacyCollapsedGroups(): string | null {
  try {
    const raw = localStorage.getItem(LEGACY_COLLAPSED_GROUPS_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }

    const collapsed = new Set(
      parsed.filter((entry): entry is string => typeof entry === "string"),
    );
    const expanded = boNavGroups
      .map((group) => group.title)
      .filter((title) => !collapsed.has(title));

    return expanded[0] ?? null;
  } catch {
    return null;
  }
}

function loadStoredExpandedGroup(): string | null {
  try {
    const raw = localStorage.getItem(EXPANDED_GROUP_STORAGE_KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed === null) {
        return null;
      }
      if (typeof parsed === "string" && boNavGroupTitles.has(parsed)) {
        return parsed;
      }
    }
  } catch {
    // fall through to legacy migration
  }

  return migrateLegacyCollapsedGroups();
}

function persistExpandedGroup(title: string | null) {
  localStorage.setItem(EXPANDED_GROUP_STORAGE_KEY, JSON.stringify(title));
  localStorage.removeItem(LEGACY_COLLAPSED_GROUPS_STORAGE_KEY);
}

function resolveInitialExpandedGroup(
  pathname: string,
  searchParams: URLSearchParams,
): string | null {
  const activeGroup = getActiveNavGroupTitle(pathname, searchParams);
  if (activeGroup) {
    return activeGroup;
  }

  return loadStoredExpandedGroup();
}

function groupHasActiveRoute(
  group: (typeof boNavGroups)[number],
  pathname: string,
  searchParams: URLSearchParams,
) {
  const currentRoute = getBoRouteId(pathname, searchParams);

  return group.items.some(
    (item) =>
      currentRoute === item.id ||
      (isOrdersSectionPathname(pathname) &&
        item.id === "orders-menu") ||
      item.children?.some((child) => currentRoute === child.id),
  );
}

function staffInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function isCreateActionActive(
  baseHref: string,
  createParam: string,
  pathname: string,
  activeCreateParam: string | null,
) {
  return pathname === baseHref && activeCreateParam === createParam;
}

function filterNavChildren(
  children: readonly BoNavChildItem[] | undefined,
  permissions: readonly string[] | undefined,
): BoNavChildItem[] {
  if (!children) {
    return [];
  }

  return children.filter((child) =>
    staffHasRouteAccess(permissions, child.id),
  );
}

function filterNavItems(
  items: readonly BoNavItem[],
  permissions: readonly string[] | undefined,
): BoNavItem[] {
  return items.flatMap((item) => {
    if (!staffHasRouteAccess(permissions, item.id)) {
      return [];
    }

    const children = filterNavChildren(item.children, permissions);
    if (item.childrenOnly && children.length === 0) {
      return [];
    }

    if (item.children && children.length !== item.children.length) {
      return [{ ...item, children }];
    }

    return [item];
  });
}

export function BoSidebar() {
  const { staff, logout } = useBoStaff();
  const {
    orderCounts,
    registeredCustomerCount,
    unregisteredCustomerCount,
    cartShopperCount,
    pendingPreorderCount,
    pendingStockAlertCount,
    pendingSupportMessageCount,
    newOrderAlert,
    setNewOrderAlert,
    newSupportMessageAlert,
    setNewSupportMessageAlert,
  } = useBoNavCounts();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeRoute = getBoRouteId(pathname, searchParams);
  const activeCreateParam = searchParams.get("create");
  const [mobileOpen, setMobileOpen] = useState(false);
  const routeCollapseKey = `${pathname}?${searchParams.toString()}`;
  const [expandedGroup, setExpandedGroup] = useState<string | null>(() =>
    resolveInitialExpandedGroup(pathname, searchParams),
  );
  const [expandedGroupRouteKey, setExpandedGroupRouteKey] =
    useState(routeCollapseKey);

  if (routeCollapseKey !== expandedGroupRouteKey) {
    setExpandedGroupRouteKey(routeCollapseKey);
    const next = getActiveNavGroupTitle(pathname, searchParams);

    setExpandedGroup((current) => {
      if (current === next) {
        return current;
      }

      persistExpandedGroup(next);
      return next;
    });
  }

  useEffect(() => {
    document.body.classList.toggle("bo-nav-open", mobileOpen);
    return () => document.body.classList.remove("bo-nav-open");
  }, [mobileOpen]);

  useEffect(() => {
    if (isOrdersSectionPathname(pathname)) {
      setNewOrderAlert(false);
    }
  }, [pathname, setNewOrderAlert]);

  // Sifariş alert-i kimi: yalnız səhifəyə keçəndə söndür — eyni səhifədə
  // gələn mesajın işığı dərhal itməsin.
  useEffect(() => {
    if (normalizeBoPathname(pathname) === "/support-messages") {
      setNewSupportMessageAlert(false);
    }
  }, [pathname, setNewSupportMessageAlert]);

  useEffect(() => {
    if (!newSupportMessageAlert) {
      return;
    }
    setExpandedGroup((current) => {
      if (current === "Mesajlar") {
        return current;
      }
      persistExpandedGroup("Mesajlar");
      return "Mesajlar";
    });
  }, [newSupportMessageAlert]);

  const toggleGroup = useCallback((title: string) => {
    setExpandedGroup((current) => {
      const next = current === title ? null : title;

      if (current === next) {
        return current;
      }

      persistExpandedGroup(next);
      return next;
    });
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), [setMobileOpen]);

  const sidebarContent = (
    <>
      <div className="bo-sidebar__brand">
        <div>
          <BrandLogo className="bo-sidebar__logo" />
          <span>Əməliyyat mərkəzi</span>
        </div>
      </div>

      <div className="bo-sidebar__scroll">
        {boNavGroups.map((group, groupIndex) => {
          // Staff hələ sync olmayanda (login shell) filtrləmə — boş flash olmasın.
          const visibleItems =
            staff === null
              ? [...group.items]
              : filterNavItems(group.items, staff.permissions);
          if (visibleItems.length === 0) {
            return null;
          }

          const isCollapsed = expandedGroup !== group.title;
          const groupPanelId = `bo-nav-group-${groupIndex}`;
          const GroupIcon = group.icon;
          const isOrdersGroup = visibleItems.some(
            (item) => item.id === "orders-menu",
          );
          const isSupportMessagesGroup = visibleItems.some(
            (item) => item.id === "support-messages",
          );
          const showNewOrderAlert = isOrdersGroup && newOrderAlert;
          const hasPendingSupportMessages =
            pendingSupportMessageCount !== null &&
            pendingSupportMessageCount > 0;
          // Yeni gəliş və ya qrup bağlıykən gözləyən mesaj — toggle-da narıncı işıq.
          const showSupportMessageGroupAlert =
            isSupportMessagesGroup &&
            (newSupportMessageAlert ||
              (isCollapsed && hasPendingSupportMessages));
          const groupCartShopperCount =
            visibleItems.some((item) => item.customerCountKind === "cart") &&
            cartShopperCount !== null
              ? cartShopperCount
              : null;

          return (
            <div
              className={`bo-nav-group${isCollapsed ? " is-collapsed" : ""}`}
              key={group.title}
            >
              <button
                type="button"
                className="bo-btn-reset bo-nav-group__toggle"
                aria-expanded={!isCollapsed}
                aria-controls={groupPanelId}
                onClick={() => toggleGroup(group.title)}
              >
                <span className="bo-nav-group__heading">
                  <span className="bo-nav-group__icon" aria-hidden="true">
                    <GroupIcon />
                  </span>
                  <span className="bo-nav-group__title">{group.title}</span>
                  {groupCartShopperCount !== null ? (
                    <span
                      className={`bo-nav-group__count${
                        groupCartShopperCount > 0 ? " is-live" : ""
                      }`}
                      aria-label={`Səbətdə ${groupCartShopperCount} müştəri`}
                    >
                      ({groupCartShopperCount})
                    </span>
                  ) : null}
                  {showNewOrderAlert ? (
                    <span
                      className="bo-nav-group__alert"
                      aria-label="Yeni sifariş"
                    />
                  ) : null}
                  {showSupportMessageGroupAlert ? (
                    <span
                      className="bo-nav-group__alert"
                      aria-label="Yeni mesaj"
                    />
                  ) : null}
                </span>
                <IconChevronDown className="bo-icon--sm bo-nav-group__chevron" />
              </button>
              <nav
                id={groupPanelId}
                aria-label={group.title}
                hidden={isCollapsed}
              >
              {visibleItems.map((item) => {
                const hasActiveAction = item.actions?.some((action) =>
                  isCreateActionActive(
                    item.href,
                    action.createParam,
                    pathname,
                    activeCreateParam,
                  ),
                );
                const isActive =
                  activeRoute === item.id && !hasActiveAction && !item.childrenOnly;
                const itemCustomerCount =
                  item.customerCountKind === "registered" &&
                  registeredCustomerCount !== null
                    ? registeredCustomerCount
                    : item.customerCountKind === "unregistered" &&
                        unregisteredCustomerCount !== null
                      ? unregisteredCustomerCount
                      : item.customerCountKind === "cart" &&
                          cartShopperCount !== null
                        ? cartShopperCount
                        : undefined;
                const itemInquiryCount =
                  item.inquiryCountKind === "pending-preorder" &&
                  pendingPreorderCount !== null
                    ? pendingPreorderCount
                    : item.inquiryCountKind === "pending-stock-alert" &&
                        pendingStockAlertCount !== null
                      ? pendingStockAlertCount
                      : undefined;
                const itemSupportMessageCount =
                  item.supportMessageCountKind === "pending" &&
                  pendingSupportMessageCount !== null
                    ? pendingSupportMessageCount
                    : undefined;

                return (
                  <div className="bo-nav-item" key={item.id}>
                    {!item.childrenOnly ? (
                      <Link
                        href={item.href}
                        className={`bo-nav-item__entry${
                          isActive ? " is-active" : ""
                        }${
                          item.id === "support-messages" &&
                          newSupportMessageAlert
                            ? " is-alert"
                            : ""
                        }`}
                        aria-current={isActive ? "page" : undefined}
                        onClick={closeMobile}
                      >
                        <span className="bo-nav-item__label">
                          {item.label}
                          {itemCustomerCount !== undefined
                            ? ` (${itemCustomerCount})`
                            : itemInquiryCount !== undefined
                              ? ` (${itemInquiryCount})`
                              : itemSupportMessageCount !== undefined
                                ? ` (${itemSupportMessageCount})`
                                : ""}
                        </span>
                      </Link>
                    ) : null}

                    {!item.childrenOnly
                      ? item.actions?.map((action) => {
                          const isActionActive = isCreateActionActive(
                            item.href,
                            action.createParam,
                            pathname,
                            activeCreateParam,
                          );

                          return (
                            <Link
                              key={action.createParam}
                              href={`${item.href}?create=${encodeURIComponent(action.createParam)}`}
                              className={`bo-nav-item__entry${
                                isActionActive ? " is-active" : ""
                              }`}
                              title={action.label}
                              aria-current={isActionActive ? "page" : undefined}
                              onClick={closeMobile}
                            >
                              <span className="bo-nav-item__label">
                                {action.label}
                              </span>
                            </Link>
                          );
                        })
                      : null}

                    {item.children?.map((child) => {
                      const hasActiveChildAction = child.actions?.some(
                        (action) =>
                          isCreateActionActive(
                            child.href,
                            action.createParam,
                            pathname,
                            activeCreateParam,
                          ),
                      );
                      const isChildActive =
                        activeRoute === child.id && !hasActiveChildAction;
                      const childCount =
                        child.countBucket && orderCounts
                          ? orderCounts[child.countBucket]
                          : child.countBucket
                            ? 0
                            : undefined;

                      return (
                        <Fragment key={child.id}>
                          <Link
                            href={child.href}
                            className={`bo-nav-item__sub${
                              isChildActive ? " is-active" : ""
                            }`}
                            aria-current={isChildActive ? "page" : undefined}
                            onClick={closeMobile}
                          >
                            <span className="bo-nav-item__label">
                              {child.label}
                              {childCount !== undefined ? ` (${childCount})` : ""}
                            </span>
                          </Link>

                          {child.actions?.map((action) => {
                            const isChildActionActive = isCreateActionActive(
                              child.href,
                              action.createParam,
                              pathname,
                              activeCreateParam,
                            );

                            return (
                              <Link
                                key={action.createParam}
                                href={`${child.href}?create=${encodeURIComponent(action.createParam)}`}
                                className={`bo-nav-item__entry${
                                  isChildActionActive ? " is-active" : ""
                                }`}
                                title={action.label}
                                aria-current={
                                  isChildActionActive ? "page" : undefined
                                }
                                onClick={closeMobile}
                              >
                                <span className="bo-nav-item__label">
                                  {action.label}
                                </span>
                              </Link>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </div>
                );
              })}
              </nav>
            </div>
          );
        })}
      </div>

      <div className="bo-sidebar__footer">
        {staff ? (
          <div className="bo-sidebar__account">
            <div className="bo-sidebar__profile">
              <span className="bo-sidebar__avatar" aria-hidden="true">
                {staffInitials(staff.displayName) || "OP"}
              </span>
              <div className="bo-sidebar__profile-copy">
                <strong>{staff.displayName}</strong>
                <span>{staff.role}</span>
              </div>
            </div>
            <button
              type="button"
              className="bo-sidebar__logout"
              onClick={() => {
                logout();
                closeMobile();
              }}
            >
              Çıxış
            </button>
          </div>
        ) : (
          <p className="bo-sidebar__note">
            <span aria-hidden="true" />
            Yalnız əməkdaşlar üçün
          </p>
        )}
      </div>
    </>
  );

  return (
    <>
      <div className="bo-mobile-bar" aria-hidden={!staff}>
        <button
          type="button"
          className={`bo-btn-reset bo-mobile-bar__toggle${mobileOpen ? " is-open" : ""}`}
          aria-expanded={mobileOpen}
          aria-controls="bo-sidebar-panel"
          aria-label={mobileOpen ? "Menyunu bağla" : "Menyunu aç"}
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span className="bo-mobile-bar__toggle-icon" aria-hidden="true">
            {mobileOpen ? <IconClose /> : <IconMenu />}
          </span>
          <span className="bo-mobile-bar__toggle-label">
            {mobileOpen ? "Bağla" : "Menyu"}
          </span>
        </button>
        <div className="bo-mobile-bar__brand">
          <div>
            <BrandLogo className="bo-mobile-bar__logo" />
            <span>Əməliyyat mərkəzi</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="bo-btn-reset bo-sidebar__backdrop"
        aria-hidden={!mobileOpen}
        tabIndex={mobileOpen ? 0 : -1}
        onClick={closeMobile}
      />

      <aside
        id="bo-sidebar-panel"
        className={`bo-sidebar${mobileOpen ? " is-open" : ""}`}
        aria-label="Operator naviqasiyası"
      >
        <button
          type="button"
          className="bo-btn-reset bo-sidebar__close"
          aria-label="Menyunu bağla"
          onClick={closeMobile}
        >
          <IconClose className="bo-icon--sm" />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}
