"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FocusEvent } from "react";
import type { AppRole } from "../lib/auth-types";
import { canAccessAdminArea } from "../lib/rbac";
import { UserAvatar } from "./design-system/atoms/UserAvatar";

type Props = {
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: AppRole;
  isActive: boolean;
  emailConfirmed: boolean;
};

const MENU_AUTO_CLOSE_DELAY_MS = 1000;
const HEADER_MENU_OPEN_EVENT = "app-header-menu-open";
const ACCOUNT_MENU_NAME = "account";

function announceHeaderMenuOpen(menuName: string) {
  document.dispatchEvent(new CustomEvent(HEADER_MENU_OPEN_EVENT, { detail: menuName }));
}

function getInitial(email: string): string {
  if (!email) {
    return "U";
  }
  return email.trim().charAt(0).toUpperCase() || "U";
}

export default function AccountMenu({ email, displayName, avatarUrl, role, isActive, emailConfirmed }: Props) {
  const [isBusy, setIsBusy] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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
      if (event instanceof CustomEvent && event.detail !== ACCOUNT_MENU_NAME && menuRef.current) {
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

  async function handleSignOut() {
    if (isBusy) {
      return;
    }
    setIsBusy(true);
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/";
  }

  function openProfileModal() {
    setIsProfileOpen(true);
    if (menuRef.current) {
      menuRef.current.open = false;
    }
  }

  function closeProfileModal() {
    setIsProfileOpen(false);
  }

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
    <>
    <details
      className="account-menu"
      ref={menuRef}
      onMouseEnter={cancelMenuAutoClose}
      onMouseLeave={scheduleMenuAutoClose}
      onFocus={cancelMenuAutoClose}
      onBlur={handleMenuBlur}
      onToggle={(event) => {
        if (event.currentTarget.open) {
          announceHeaderMenuOpen(ACCOUNT_MENU_NAME);
        }
      }}
    >
      <summary className="account-menu__trigger" aria-label="Open account menu">
        <span className="account-menu__avatar" aria-hidden>
          <UserAvatar
            initials={getInitial(displayName || email)}
            src={avatarUrl || undefined}
            size="sm"
            className="account-menu__avatar-image"
          />
        </span>
        <span className="account-menu__identity">
          <span className="account-menu__email">{email}</span>
          <span className="account-menu__role">{role}</span>
        </span>
      </summary>
      <div className="account-menu__dropdown" role="menu" aria-label="Account actions">
        <button type="button" className="account-menu__item" onClick={openProfileModal}>
          Profile
        </button>
        {canAccessAdminArea(role) && (
          <Link href="/admin" className="account-menu__item" role="menuitem">
            User management
          </Link>
        )}
        <button type="button" className="account-menu__item" disabled>
          Settings
        </button>
        <button type="button" className="account-menu__item account-menu__item--danger" onClick={handleSignOut} disabled={isBusy}>
          {isBusy ? "Signing out..." : "Log out"}
        </button>
      </div>
    </details>
      {isProfileOpen && (
        <div className="profile-modal-overlay" onClick={closeProfileModal}>
          <div
            className="profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="profile-modal__content">
              <div className="profile-modal__header">
                <h2 id="profile-modal-title">Profile</h2>
                <button type="button" className="button button--ghost button--small" onClick={closeProfileModal}>
                  Zamknij
                </button>
              </div>
              <div className="meta-grid">
                <p>
                  <span className="meta-label">Role</span>
                  <span className="meta-value">{role}</span>
                </p>
                <p>
                  <span className="meta-label">Status</span>
                  <span className="meta-value">{isActive ? "active" : "inactive"}</span>
                </p>
                <p>
                  <span className="meta-label">Email verification</span>
                  <span className="meta-value">{emailConfirmed ? "verified" : "pending"}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
