"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FocusEvent, FormEvent } from "react";
import type { AppRole } from "../lib/auth-types";
import { canAccessAdminArea, isAdminRole } from "../lib/rbac";
import BetaTestModeModal from "./beta-test-mode-modal";
import { UserAvatar } from "./design-system/atoms/UserAvatar";

type Props = {
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
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

export default function AccountMenu({ email, displayName, firstName, lastName, avatarUrl, role, isActive, emailConfirmed }: Props) {
  const [isBusy, setIsBusy] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBetaTestModeOpen, setIsBetaTestModeOpen] = useState(false);
  const [profileFirstName, setProfileFirstName] = useState(firstName);
  const [profileLastName, setProfileLastName] = useState(lastName);
  const [currentDisplayName, setCurrentDisplayName] = useState(displayName);
  const [profileError, setProfileError] = useState("");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
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

  function openBetaTestModeModal() {
    setIsBetaTestModeOpen(true);
    if (menuRef.current) {
      menuRef.current.open = false;
    }
  }

  function closeProfileModal() {
    setIsProfileOpen(false);
    setProfileError("");
    setIsDeleteConfirmOpen(false);
    setDeleteConfirmInput("");
    setDeleteError("");
  }

  function openDeleteConfirm() {
    setDeleteError("");
    setIsDeleteConfirmOpen(true);
  }

  function cancelDeleteConfirm() {
    setIsDeleteConfirmOpen(false);
    setDeleteConfirmInput("");
    setDeleteError("");
  }

  async function handleDeleteAccount() {
    if (isDeleting) {
      return;
    }
    setIsDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch("/api/user/account", { method: "DELETE" });
      const payload = (await response.json()) as { error?: string; message?: string; warning?: string };
      if (!response.ok || payload.error) {
        setDeleteError(payload.message || payload.error || "Nie udało się usunąć konta.");
        return;
      }

      window.location.href = "/login?reason=account_deleted";
    } catch {
      setDeleteError("Nie udało się usunąć konta.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) {
      return;
    }

    setIsBusy(true);
    setProfileError("");
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: profileFirstName,
          lastName: profileLastName,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        data?: {
          first_name?: string | null;
          last_name?: string | null;
          display_name?: string | null;
        };
      };
      if (!response.ok || payload.error) {
        setProfileError(payload.error || "Profile update failed.");
        return;
      }

      const nextFirstName = payload.data?.first_name || profileFirstName.trim();
      const nextLastName = payload.data?.last_name || profileLastName.trim();
      setProfileFirstName(nextFirstName);
      setProfileLastName(nextLastName);
      setCurrentDisplayName(payload.data?.display_name || `${nextFirstName} ${nextLastName}`.trim());
      closeProfileModal();
    } catch {
      setProfileError("Profile update failed.");
    } finally {
      setIsBusy(false);
    }
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
            initials={getInitial(currentDisplayName || email)}
            src={avatarUrl || undefined}
            size="sm"
            className="account-menu__avatar-image"
          />
        </span>
        <span className="account-menu__identity">
          <span className="account-menu__email" title={email}>{currentDisplayName || email}</span>
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
        {isAdminRole(role) && (
          <button type="button" className="account-menu__item" onClick={openBetaTestModeModal}>
            Beta test mode
          </button>
        )}
        <button type="button" className="account-menu__item" disabled>
          Settings
        </button>
        <button type="button" className="account-menu__item account-menu__item--danger" onClick={handleSignOut} disabled={isBusy}>
          {isBusy ? "Signing out..." : "Log out"}
        </button>
      </div>
    </details>
      {isBetaTestModeOpen && <BetaTestModeModal onClose={() => setIsBetaTestModeOpen(false)} />}
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
              <form className="profile-modal__form" onSubmit={handleProfileSubmit}>
                <label className="profile-modal__field">
                  <span>Imie</span>
                  <input
                    value={profileFirstName}
                    onChange={(event) => setProfileFirstName(event.target.value)}
                    autoComplete="given-name"
                    maxLength={120}
                  />
                </label>
                <label className="profile-modal__field">
                  <span>Nazwisko</span>
                  <input
                    value={profileLastName}
                    onChange={(event) => setProfileLastName(event.target.value)}
                    autoComplete="family-name"
                    maxLength={120}
                  />
                </label>
                {profileError ? <p className="profile-modal__error">{profileError}</p> : null}
                <div className="profile-modal__actions">
                  <button type="submit" className="button button--primary button--small" disabled={isBusy}>
                    {isBusy ? "Zapisywanie..." : "Zapisz"}
                  </button>
                </div>
              </form>
              <div className="meta-grid">
                <p>
                  <span className="meta-label">Email</span>
                  <span className="meta-value">{email}</span>
                </p>
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
              <div className="profile-modal__danger-zone">
                <h3>Usuń konto i wszystkie dane</h3>
                {!isDeleteConfirmOpen ? (
                  <button type="button" className="button button--danger button--small" onClick={openDeleteConfirm}>
                    Usuń konto i wszystkie dane
                  </button>
                ) : (
                  <div className="profile-modal__danger-zone-confirm">
                    <p>
                      Ta operacja jest nieodwracalna. Konto oraz wszystkie dane CV zostaną trwale
                      usunięte. Aby potwierdzić, wpisz swój adres email ({email}) poniżej.
                    </p>
                    <input
                      type="email"
                      value={deleteConfirmInput}
                      onChange={(event) => setDeleteConfirmInput(event.target.value)}
                      placeholder={email}
                      autoComplete="off"
                    />
                    {deleteError ? <p className="profile-modal__error">{deleteError}</p> : null}
                    <div className="profile-modal__actions">
                      <button type="button" className="button button--ghost button--small" onClick={cancelDeleteConfirm} disabled={isDeleting}>
                        Anuluj
                      </button>
                      <button
                        type="button"
                        className="button button--danger button--small"
                        onClick={handleDeleteAccount}
                        disabled={isDeleting || deleteConfirmInput.trim().toLowerCase() !== email.toLowerCase()}
                      >
                        {isDeleting ? "Usuwanie..." : "Usuń konto na zawsze"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
