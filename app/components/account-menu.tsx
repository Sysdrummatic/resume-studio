"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FocusEvent, FormEvent, KeyboardEvent } from "react";
import type { AppRole } from "../lib/auth-types";
import { formatAppMessage } from "../i18n/locale";
import { canAccessAdminArea, isAdminRole } from "../lib/rbac";
import { useAppI18n } from "./app-i18n-provider";
import { Button, Menu, MenuItem, Modal, StatePill, TextInput } from "./design-system/primitives";

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
  const { dictionary } = useAppI18n();
  const labels = dictionary.account;
  const profileLabels = labels.profile_modal;
  const [isBusy, setIsBusy] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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
        setDeleteError(payload.message || payload.error || profileLabels.delete_failed);
        return;
      }

      window.location.href = "/login?reason=account_deleted";
    } catch {
      setDeleteError(profileLabels.delete_failed);
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
        setProfileError(payload.error || profileLabels.update_failed);
        return;
      }

      const nextFirstName = payload.data?.first_name || profileFirstName.trim();
      const nextLastName = payload.data?.last_name || profileLastName.trim();
      setProfileFirstName(nextFirstName);
      setProfileLastName(nextLastName);
      setCurrentDisplayName(payload.data?.display_name || `${nextFirstName} ${nextLastName}`.trim());
      closeProfileModal();
    } catch {
      setProfileError(profileLabels.update_failed);
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

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDetailsElement>) {
    if (event.key === "Escape" && menuRef.current?.open) {
      event.stopPropagation();
      menuRef.current.open = false;
      menuRef.current.querySelector("summary")?.focus();
    }
  }

  return (
    <>
    <details
      className="ocv-popover ocv-account"
      ref={menuRef}
      onMouseEnter={cancelMenuAutoClose}
      onMouseLeave={scheduleMenuAutoClose}
      onFocus={cancelMenuAutoClose}
      onBlur={handleMenuBlur}
      onKeyDown={handleMenuKeyDown}
      onToggle={(event) => {
        if (event.currentTarget.open) {
          announceHeaderMenuOpen(ACCOUNT_MENU_NAME);
        }
      }}
    >
      <summary className="ocv-account__trigger" aria-label={labels.open_menu_aria}>
        <span className="ocv-avatar" aria-hidden="true">
          {avatarUrl ? <Image src={avatarUrl} alt="" fill sizes="38px" /> : getInitial(currentDisplayName || email)}
        </span>
      </summary>
      <Menu label={labels.actions_aria} className="ocv-popover__panel">
        <p className="ocv-account__who">
          <b title={email}>{currentDisplayName || email}</b>
          <span title={email}>{email}</span>
          <span className="ocv-account__role">{role}</span>
        </p>
        <MenuItem onClick={openProfileModal}>{labels.profile}</MenuItem>
        {canAccessAdminArea(role) && (
          <Link href="/admin" className="ocv-menu__item">
            {labels.user_management}
          </Link>
        )}
        {isAdminRole(role) && (
          <Link href="/adminsettings#beta-test-mode" className="ocv-menu__item">
            {labels.beta_test_mode}
          </Link>
        )}
        {isAdminRole(role) && (
          <Link href="/adminsettings" className="ocv-menu__item">
            {labels.admin_settings}
          </Link>
        )}
        {isAdminRole(role) ? (
          <Link href="/settings" className="ocv-menu__item">
            {labels.settings}
          </Link>
        ) : (
          <MenuItem disabled>{labels.settings}</MenuItem>
        )}
        <MenuItem tone="danger" onClick={handleSignOut} disabled={isBusy}>
          {isBusy ? labels.signing_out : labels.log_out}
        </MenuItem>
      </Menu>
    </details>
      <Modal
        open={isProfileOpen}
        onClose={() => closeProfileModal()}
        title={profileLabels.title}
        closeLabel={profileLabels.close}
        footer={
          <Button type="submit" form="profile-modal-form" variant="primary" busy={isBusy}>
            {isBusy ? profileLabels.saving : profileLabels.save}
          </Button>
        }
      >
        <form id="profile-modal-form" className="account-profile__form" onSubmit={handleProfileSubmit}>
          <div className="account-profile__names">
            <TextInput
              label={profileLabels.first_name}
              value={profileFirstName}
              onChange={(event) => setProfileFirstName(event.target.value)}
              autoComplete="given-name"
              maxLength={120}
            />
            <TextInput
              label={profileLabels.last_name}
              value={profileLastName}
              onChange={(event) => setProfileLastName(event.target.value)}
              autoComplete="family-name"
              maxLength={120}
            />
          </div>
          {profileError ? (
            <p role="alert" className="account-profile__error">
              {profileError}
            </p>
          ) : null}
        </form>
        <dl className="account-profile__facts">
          <div>
            <dt className="ocv-meta">{profileLabels.email}</dt>
            <dd className="ocv-value">{email}</dd>
          </div>
          <div>
            <dt className="ocv-meta">{profileLabels.role}</dt>
            <dd className="ocv-value">{role}</dd>
          </div>
          <div>
            <dt className="ocv-meta">{profileLabels.status}</dt>
            <dd>
              <StatePill state={isActive ? "ok" : "changes"}>
                {isActive ? profileLabels.active : profileLabels.inactive}
              </StatePill>
            </dd>
          </div>
          <div>
            <dt className="ocv-meta">{profileLabels.email_verification}</dt>
            <dd>
              <StatePill state={emailConfirmed ? "ok" : "changes"}>
                {emailConfirmed ? profileLabels.verified : profileLabels.pending}
              </StatePill>
            </dd>
          </div>
        </dl>
        <div className="account-profile__danger">
          <h3 className="ocv-subheading">{profileLabels.delete_title}</h3>
          {!isDeleteConfirmOpen ? (
            <Button variant="danger" size="small" onClick={openDeleteConfirm}>
              {profileLabels.delete_action}
            </Button>
          ) : (
            <div className="account-profile__danger-confirm">
              <p className="ocv-body">{formatAppMessage(profileLabels.delete_explanation, { email })}</p>
              <TextInput
                label={profileLabels.email}
                type="email"
                value={deleteConfirmInput}
                onChange={(event) => setDeleteConfirmInput(event.target.value)}
                placeholder={email}
                autoComplete="off"
              />
              {deleteError ? (
                <p role="alert" className="account-profile__error">
                  {deleteError}
                </p>
              ) : null}
              <div className="account-profile__actions">
                <Button size="small" onClick={cancelDeleteConfirm} disabled={isDeleting}>
                  {profileLabels.cancel}
                </Button>
                <Button
                  variant="danger"
                  size="small"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || deleteConfirmInput.trim().toLowerCase() !== email.toLowerCase()}
                >
                  {isDeleting ? profileLabels.deleting : profileLabels.delete_forever}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
