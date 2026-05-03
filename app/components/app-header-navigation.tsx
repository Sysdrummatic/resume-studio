"use client";

import Link from "next/link";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

type NavItem = {
  href: string;
  label: string;
};

type Props = {
  account: ReactNode;
  items: NavItem[];
};

export default function AppHeaderNavigation({ account, items }: Props) {
  const controlsRef = useRef<HTMLDivElement>(null);
  const measuringNavRef = useRef<HTMLElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const [isCompact, setIsCompact] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const updateMode = useCallback(() => {
    const controls = controlsRef.current;
    const measuringNav = measuringNavRef.current;

    if (!controls || !measuringNav) return;

    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    if (!isDesktop) {
      setIsCompact(true);
      return;
    }

    const accountWidth = accountRef.current?.offsetWidth ?? 0;
    const requiredWidth = measuringNav.scrollWidth + accountWidth + 24;
    const availableWidth = controls.clientWidth;
    const nextIsCompact = requiredWidth > availableWidth;

    setIsCompact(nextIsCompact);
    if (!nextIsCompact) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(updateMode);

    const resizeObserver = new ResizeObserver(updateMode);
    if (controlsRef.current) resizeObserver.observe(controlsRef.current);
    if (accountRef.current) resizeObserver.observe(accountRef.current);

    window.addEventListener("resize", updateMode);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateMode);
    };
  }, [updateMode]);

  return (
    <div className={`app-header__controls ${isCompact ? "app-header__controls--compact" : ""}`} ref={controlsRef}>
      <nav className="app-nav app-nav--measure" aria-hidden="true" ref={measuringNavRef}>
        {items.map((item) => (
          <Link key={item.href} href={item.href} tabIndex={-1}>
            {item.label}
          </Link>
        ))}
      </nav>

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
        <div className="app-nav-menu">
          <button
            className="app-nav-menu__trigger"
            type="button"
            aria-expanded={isOpen}
            aria-controls="primary-mobile-menu"
            aria-label="Open primary navigation"
            onClick={() => setIsOpen((current) => !current)}
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

      <div className="app-header__account" ref={accountRef}>
        {account}
      </div>
    </div>
  );
}
