"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FocusEvent } from "react";
import type { AppRole } from "../lib/auth-types";

type Props = {
  email: string;
  role: AppRole;
  isActive: boolean;
  emailConfirmed: boolean;
};

const MENU_AUTO_CLOSE_DELAY_MS = 2500;

function getInitial(email: string): string {
  if (!email) {
    return "U";
  }
  return email.trim().charAt(0).toUpperCase() || "U";
}

export default function AccountMenu({ email, role, isActive, emailConfirmed }: Props) {
  const [isBusy, setIsBusy] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
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
    >
      <summary className="account-menu__trigger" aria-label="Open account menu">
        <span className="account-menu__avatar" aria-hidden>
          {getInitial(email)}
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
        {role === "admin" && (
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
