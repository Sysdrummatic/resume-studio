"use client";

import { useState } from "react";

export default function SignOutButton() {
  const [isBusy, setIsBusy] = useState(false);

  async function handleSignOut() {
    setIsBusy(true);
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button className="button button--ghost" type="button" onClick={handleSignOut} disabled={isBusy}>
      {isBusy ? "Signing out..." : "Sign out"}
    </button>
  );
}
