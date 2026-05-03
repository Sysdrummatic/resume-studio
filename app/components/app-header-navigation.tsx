"use client";

import Link from "next/link";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import type { FocusEvent } from "react";

type NavItem = {
  href: string;
  label: string;
};

type Props = {
  account: ReactNode;
  items: NavItem[];
};

const MENU_AUTO_CLOSE_DELAY_MS = 1000;
const HEADER_MENU_OPEN_EVENT = "app-header-menu-open";
const NAVIGATION_MENU_NAME = "navigation";

function announceHeaderMenuOpen(menuName: string) {
  document.dispatchEvent(new CustomEvent(HEADER_MENU_OPEN_EVENT, { detail: menuName }));
}

export default function AppHeaderNavigation({ account, items }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [isCompact, setIsCompact] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const updateMode = useCallback(() => {
    const nextIsCompact = !window.matchMedia("(min-width: 1024px)").matches;

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

  return (
    <div className={`app-header__controls ${isCompact ? "app-header__controls--compact" : ""}`}>
      {!isCompact && (
        <nav className="app-nav" aria-label="Primary">
          {items.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      )}

      {isCompact && (
        <div
          className="app-nav-menu"
          ref={menuRef}
          onMouseEnter={cancelMenuAutoClose}
          onMouseLeave={scheduleMenuAutoClose}
          onFocus={cancelMenuAutoClose}
          onBlur={handleMenuBlur}
        >
          <button
            className="app-nav-menu__trigger"
            type="button"
            aria-expanded={isOpen}
            aria-controls="primary-mobile-menu"
            aria-label="Open primary navigation"
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
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </button>
          {isOpen && (
            <nav className="app-nav-menu__panel" id="primary-mobile-menu" aria-label="Primary">
              {items.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      )}

      <div className="app-header__account">
        {account}
      </div>
    </div>
  );
}
