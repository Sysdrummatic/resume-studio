"use client";

import Link from "./localized-link";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAppI18n } from "./app-i18n-provider";
import { buttonClassName } from "./design-system/primitives";
import { resolveAuthMode } from "../lib/auth-mode";

type NavItem = {
  href: string;
  label: string;
  emphasis?: "primary" | "secondary";
  disabled?: boolean;
  disabledReason?: string;
};

type Props = {
  account: ReactNode;
  items: NavItem[];
  /** Language switch, shown before the theme switch (mockup order). */
  language?: ReactNode;
  theme?: ReactNode;
  forceInlineItems?: boolean;
};

const MENU_AUTO_CLOSE_DELAY_MS = 1000;
const HEADER_MENU_OPEN_EVENT = "app-header-menu-open";
const NAVIGATION_MENU_NAME = "navigation";
export const DESKTOP_NAVIGATION_BREAKPOINT_QUERY = "(min-width: 980px)";

function announceHeaderMenuOpen(menuName: string) {
  document.dispatchEvent(new CustomEvent(HEADER_MENU_OPEN_EVENT, { detail: menuName }));
}

function isCurrentPath(href: string, pathname: string, searchParams: URLSearchParams): boolean {
  const [path, query = ""] = href.split("?");
  if (pathname !== path && !pathname.startsWith(`${path}/`)) {
    return false;
  }
  // Sign in and Sign up share /login: the mode decides, with the login page's own fallback.
  return path !== "/login" || resolveAuthMode(new URLSearchParams(query).getAll("mode")) === resolveAuthMode(searchParams.getAll("mode"));
}

type Placement = "bar" | "menu";

function getNavItemClassName(item: NavItem, placement: Placement): string {
  if (placement === "menu") {
    return "ocv-menu__item";
  }
  return item.emphasis ? buttonClassName(item.emphasis, "small") : "ocv-topbar__link";
}

function renderNavItem(item: NavItem, pathname: string, searchParams: URLSearchParams, placement: Placement, onNavigate?: () => void) {
  const className = getNavItemClassName(item, placement);

  if (item.disabled) {
    return (
      <span key={item.href} className="nav-tooltip-anchor" tabIndex={0}>
        <span className={`${className} app-nav__action--disabled`} aria-disabled="true" role="link">
          {item.label}
        </span>
        {item.disabledReason ? (
          <span role="tooltip" className="nav-tooltip">
            {item.disabledReason}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <Link
      key={item.href}
      href={item.href}
      className={className}
      aria-current={isCurrentPath(item.href, pathname, searchParams) ? "page" : undefined}
      onClick={onNavigate}
    >
      {item.label}
    </Link>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export default function AppHeaderNavigation({ account, items, language = null, theme = null, forceInlineItems = false }: Props) {
  const { dictionary } = useAppI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [isCompact, setIsCompact] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const updateMode = useCallback(() => {
    const nextIsCompact = !window.matchMedia(DESKTOP_NAVIGATION_BREAKPOINT_QUERY).matches;

    setIsCompact(nextIsCompact);
    if (!nextIsCompact) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(updateMode);
    window.addEventListener("resize", updateMode);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateMode);
    };
  }, [updateMode]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleHeaderMenuOpen(event: Event) {
      if (event instanceof CustomEvent && event.detail !== NAVIGATION_MENU_NAME) {
        setIsOpen(false);
      }
    }

    document.addEventListener(HEADER_MENU_OPEN_EVENT, handleHeaderMenuOpen);

    return () => {
      document.removeEventListener(HEADER_MENU_OPEN_EVENT, handleHeaderMenuOpen);
    };
  }, []);

  function cancelMenuAutoClose() {
    if (closeTimerRef.current === null) {
      return;
    }
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }

  function scheduleMenuAutoClose() {
    cancelMenuAutoClose();
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, MENU_AUTO_CLOSE_DELAY_MS);
  }

  function handleMenuBlur(event: FocusEvent<HTMLDivElement>) {
    const nextFocusedElement = event.relatedTarget;
    if (nextFocusedElement instanceof Node && event.currentTarget.contains(nextFocusedElement)) {
      return;
    }
    scheduleMenuAutoClose();
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && isOpen) {
      event.stopPropagation();
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  }

  const navigationMenu = isCompact ? (
    <div
      className="ocv-popover"
      ref={menuRef}
      onMouseEnter={cancelMenuAutoClose}
      onMouseLeave={scheduleMenuAutoClose}
      onFocus={cancelMenuAutoClose}
      onBlur={handleMenuBlur}
      onKeyDown={handleMenuKeyDown}
    >
      <button
        ref={triggerRef}
        className="ocv-icon-btn"
        type="button"
        aria-expanded={isOpen}
        aria-controls="primary-mobile-menu"
        aria-label={dictionary.navigation.open_primary_aria}
        onClick={() => {
          cancelMenuAutoClose();
          setIsOpen((current) => {
            const nextIsOpen = !current;
            if (nextIsOpen) {
              announceHeaderMenuOpen(NAVIGATION_MENU_NAME);
            }
            return nextIsOpen;
          });
        }}
      >
        <MenuIcon />
      </button>
      {isOpen && (
        <nav className="ocv-menu ocv-popover__panel" id="primary-mobile-menu" aria-label={dictionary.navigation.primary_aria}>
          {items.map((item) => renderNavItem(item, pathname, searchParams, "menu", () => setIsOpen(false)))}
        </nav>
      )}
    </div>
  ) : null;

  const inlineNavigation =
    !isCompact && items.length > 0 ? (
      <nav className="ocv-topbar__links" aria-label={dictionary.navigation.primary_aria}>
        {items.map((item) => renderNavItem(item, pathname, searchParams, "bar"))}
      </nav>
    ) : null;

  // Page links lead; guest sign-in/sign-up actions close the row, where the account menu sits when signed in.
  return (
    <div className="ocv-topbar__end">
      {forceInlineItems ? null : inlineNavigation}
      {language}
      {theme}
      {forceInlineItems ? inlineNavigation : null}
      {account}
      {navigationMenu}
    </div>
  );
}
