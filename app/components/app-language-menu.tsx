"use client";

import { useEffect, useRef } from "react";
import type { FocusEvent } from "react";

const MENU_AUTO_CLOSE_DELAY_MS = 1000;
const HEADER_MENU_OPEN_EVENT = "app-header-menu-open";
const LANGUAGE_MENU_NAME = "language";

function announceHeaderMenuOpen(menuName: string) {
  document.dispatchEvent(new CustomEvent(HEADER_MENU_OPEN_EVENT, { detail: menuName }));
}

export default function AppLanguageMenu() {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) {
        return;
      }
      if (menuRef.current) {
        menuRef.current.open = false;
      }
    }

    function handleHeaderMenuOpen(event: Event) {
      if (event instanceof CustomEvent && event.detail !== LANGUAGE_MENU_NAME && menuRef.current) {
        menuRef.current.open = false;
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener(HEADER_MENU_OPEN_EVENT, handleHeaderMenuOpen);

    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
      document.removeEventListener("pointerdown", handlePointerDown, true);
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
      if (menuRef.current) {
        menuRef.current.open = false;
      }
      closeTimerRef.current = null;
    }, MENU_AUTO_CLOSE_DELAY_MS);
  }

  function handleMenuBlur(event: FocusEvent<HTMLDetailsElement>) {
    const nextFocusedElement = event.relatedTarget;
    if (nextFocusedElement instanceof Node && event.currentTarget.contains(nextFocusedElement)) {
      return;
    }
    scheduleMenuAutoClose();
  }

  return (
    <details
      className="app-language-menu"
      ref={menuRef}
      onMouseEnter={cancelMenuAutoClose}
      onMouseLeave={scheduleMenuAutoClose}
      onFocus={cancelMenuAutoClose}
      onBlur={handleMenuBlur}
      onToggle={(event) => {
        if (event.currentTarget.open) {
          announceHeaderMenuOpen(LANGUAGE_MENU_NAME);
        }
      }}
    >
      <summary aria-label="Application language">
        <span className="app-language-menu__label">EN</span>
        <span className="app-language-menu__value">English</span>
        <span className="app-language-menu__chevron" aria-hidden="true">
          <svg viewBox="0 0 12 12" focusable="false">
            <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      <div className="app-language-menu__panel">
        <button type="button" className="app-language-menu__option app-language-menu__option--active" aria-current="true">
          English
        </button>
      </div>
    </details>
  );
}
