"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";

import { BrandLogo } from "@itmarket/ui";

import { IconChevronDown, IconClose, IconMenu } from "./bo-icons";
import { boNavGroups } from "./bo-nav-config";
import { useBoStaff } from "./bo-staff-context";

const COLLAPSED_GROUPS_STORAGE_KEY = "bo-sidebar-collapsed-groups";

function loadCollapsedGroups(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSED_GROUPS_STORAGE_KEY);
    if (!raw) {
      return new Set();
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(parsed.filter((entry): entry is string => typeof entry === "string"));
  } catch {
    return new Set();
  }
}

function persistCollapsedGroups(groups: Set<string>) {
  localStorage.setItem(
    COLLAPSED_GROUPS_STORAGE_KEY,
    JSON.stringify([...groups]),
  );
}

function groupHasActiveRoute(
  group: (typeof boNavGroups)[number],
  pathname: string,
) {
  return group.items.some(
    (item) =>
      pathname === item.href ||
      item.children?.some((child) => pathname === child.href),
  );
}

function collapsedGroupsForExpanded(expandedTitle: string | null): Set<string> {
  if (expandedTitle === null) {
    return new Set(boNavGroups.map((group) => group.title));
  }

  return new Set(
    boNavGroups
      .map((group) => group.title)
      .filter((title) => title !== expandedTitle),
  );
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) {
    return false;
  }

  for (const entry of a) {
    if (!b.has(entry)) {
      return false;
    }
  }

  return true;
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

export function BoSidebar() {
  const { staff, logout } = useBoStaff();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCreateParam = searchParams.get("create");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    document.body.classList.toggle("bo-nav-open", mobileOpen);
    return () => document.body.classList.remove("bo-nav-open");
  }, [mobileOpen]);

  useEffect(() => {
    setCollapsedGroups(loadCollapsedGroups());
  }, []);

  useEffect(() => {
    const activeGroup = boNavGroups.find((group) =>
      groupHasActiveRoute(group, pathname),
    );
    const next = collapsedGroupsForExpanded(activeGroup?.title ?? null);

    setCollapsedGroups((current) => {
      if (setsEqual(current, next)) {
        return current;
      }

      persistCollapsedGroups(next);
      return next;
    });
  }, [pathname]);

  const toggleGroup = useCallback((title: string) => {
    setCollapsedGroups((current) => {
      const isCurrentlyCollapsed = current.has(title);
      const next = isCurrentlyCollapsed
        ? collapsedGroupsForExpanded(title)
        : new Set([...current, title]);

      if (setsEqual(current, next)) {
        return current;
      }

      persistCollapsedGroups(next);
      return next;
    });
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

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
          const isCollapsed = collapsedGroups.has(group.title);
          const groupPanelId = `bo-nav-group-${groupIndex}`;
          const GroupIcon = group.icon;

          return (
            <div
              className={`bo-nav-group${isCollapsed ? " is-collapsed" : ""}`}
              key={group.title}
            >
              <button
                type="button"
                className="bo-nav-group__toggle"
                aria-expanded={!isCollapsed}
                aria-controls={groupPanelId}
                onClick={() => toggleGroup(group.title)}
              >
                <span className="bo-nav-group__heading">
                  <span className="bo-nav-group__icon" aria-hidden="true">
                    <GroupIcon />
                  </span>
                  <span className="bo-nav-group__title">{group.title}</span>
                </span>
                <IconChevronDown className="bo-icon--sm bo-nav-group__chevron" />
              </button>
              <nav
                id={groupPanelId}
                aria-label={group.title}
                hidden={isCollapsed}
              >
              {group.items.map((item) => {
                const hasActiveAction = item.actions?.some((action) =>
                  isCreateActionActive(
                    item.href,
                    action.createParam,
                    pathname,
                    activeCreateParam,
                  ),
                );
                const isActive =
                  pathname === item.href && !hasActiveAction;

                return (
                  <div className="bo-nav-item" key={item.id}>
                    <Link
                      href={item.href}
                      className={`bo-nav-item__entry${
                        isActive ? " is-active" : ""
                      }`}
                      aria-current={isActive ? "page" : undefined}
                      onClick={closeMobile}
                    >
                      <span className="bo-nav-item__label">{item.label}</span>
                    </Link>

                    {item.actions?.map((action) => {
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
                    })}

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
                        pathname === child.href && !hasActiveChildAction;

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
          className="bo-mobile-bar__toggle"
          aria-expanded={mobileOpen}
          aria-controls="bo-sidebar-panel"
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? (
            <IconClose className="bo-icon--sm" />
          ) : (
            <IconMenu className="bo-icon--sm" />
          )}
          <span className="sr-only">{mobileOpen ? "Menyunu bağla" : "Menyunu aç"}</span>
        </button>
        <div className="bo-mobile-bar__brand">
          <BrandLogo className="bo-mobile-bar__logo" />
          <span>IT Market</span>
        </div>
      </div>

      <button
        type="button"
        className="bo-sidebar__backdrop"
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
          className="bo-sidebar__close"
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
