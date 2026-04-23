"use client";

import Link from "next/link";
import { useState } from "react";
import type { AppRole } from "../lib/auth-types";

type Props = {
  email: string;
  role: AppRole;
};

function getInitial(email: string): string {
  if (!email) {
    return "U";
  }
  return email.trim().charAt(0).toUpperCase() || "U";
}

export default function AccountMenu({ email, role }: Props) {
  const [isBusy, setIsBusy] = useState(false);

  async function handleSignOut() {
    if (isBusy) {
      return;
    }
    setIsBusy(true);
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <details className="account-menu">
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
        {role === "admin" && (
          <Link href="/admin" className="account-menu__item" role="menuitem">
            User management
          </Link>
        )}
        <button type="button" className="account-menu__item" disabled>
          Profile
        </button>
        <button type="button" className="account-menu__item" disabled>
          Settings
        </button>
        <button type="button" className="account-menu__item account-menu__item--danger" onClick={handleSignOut} disabled={isBusy}>
          {isBusy ? "Signing out..." : "Log out"}
        </button>
      </div>
    </details>
  );
}
