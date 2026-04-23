"use client";

import { useEffect, useMemo, useState } from "react";
import { postJson } from "../lib/client-http";

type TabId = "signin" | "signup" | "reset" | "new-password";

type Props = {
  reason: string;
  verified: string;
};

type StatusKind = "idle" | "ok" | "error";

type AuthTab = {
  id: Exclude<TabId, "new-password">;
  label: string;
};

const AUTH_TABS: AuthTab[] = [
  { id: "signin", label: "Sign in" },
  { id: "signup", label: "Sign up" },
  { id: "reset", label: "Reset password" },
];

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseHashParams(hash: string): URLSearchParams {
  return new URLSearchParams(hash.replace(/^#/, ""));
}

function getContextualMessage(reason: string, verified: string): string {
  if (verified === "1") {
    return "Email verification completed. You can sign in now.";
  }
  if (reason === "inactive") {
    return "Your account is inactive. Contact support or an administrator.";
  }
  if (reason === "unverified") {
    return "Email verification must be completed before access is granted.";
  }
  if (reason === "session") {
    return "Session could not be restored. Please sign in again.";
  }
  return "";
}

export default function AccountAccessClient({ reason, verified }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("signin");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusKind, setStatusKind] = useState<StatusKind>("idle");
  const [isBusy, setIsBusy] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");

  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [recoveryToken, setRecoveryToken] = useState("");

  const contextualMessage = useMemo(() => getContextualMessage(reason, verified), [reason, verified]);

  function setBusyStatus(message: string) {
    setStatusMessage(message);
    setStatusKind("ok");
    setIsBusy(true);
  }

  function setErrorStatus(message: string) {
    setStatusMessage(message);
    setStatusKind("error");
  }

  function setOkStatus(message: string) {
    setStatusMessage(message);
    setStatusKind("ok");
  }

  useEffect(() => {
    const hashParams = parseHashParams(window.location.hash);
    if (hashParams.get("type") === "recovery" && hashParams.get("access_token")) {
      setRecoveryToken(hashParams.get("access_token")!);
      setActiveTab("new-password");
      setOkStatus("Set your new password below.");
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyStatus("Signing in...");

    const email = normalizeEmail(signinEmail);
    let shouldRedirect = false;

    try {
      const payload = await postJson("/api/auth/signin", { email, password: signinPassword });

      if (payload.error) {
        setErrorStatus(payload.error);
        setPendingVerificationEmail(email);
        return;
      }

      setPendingVerificationEmail("");
      setOkStatus("Signed in. Redirecting...");
      shouldRedirect = true;
      window.location.href = "/dashboard";
    } catch {
      setErrorStatus("Unexpected sign-in error. Try again.");
    } finally {
      if (!shouldRedirect) {
        setIsBusy(false);
      }
    }
  }

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyStatus("Creating account...");

    const email = normalizeEmail(signupEmail);

    try {
      const payload = await postJson("/api/auth/signup", { email, password: signupPassword });

      if (payload.error) {
        setErrorStatus(payload.error);
        return;
      }

      setOkStatus(payload.message || "Account created. Verify your email before sign in.");
      setPendingVerificationEmail(email);
      setActiveTab("signin");
      setSigninEmail(email);
    } catch {
      setErrorStatus("Unexpected sign-up error. Try again.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyStatus("Sending reset link...");

    const email = normalizeEmail(resetEmail);

    try {
      const payload = await postJson("/api/auth/reset-password", { email });

      if (payload.error) {
        setErrorStatus(payload.error);
        return;
      }

      setOkStatus(payload.message || "Password reset email sent.");
    } catch {
      setErrorStatus("Unexpected password reset error. Try again.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleResendVerification() {
    const email = normalizeEmail(pendingVerificationEmail || signinEmail);
    if (!email) {
      setErrorStatus("Provide email in sign-in form first.");
      return;
    }

    setBusyStatus("Sending verification email...");

    try {
      const payload = await postJson("/api/auth/resend-verification", { email });
      if (payload.error) {
        setErrorStatus(payload.error);
        return;
      }

      setOkStatus(payload.message || "Verification email sent.");
    } catch {
      setErrorStatus("Unexpected verification error. Try again.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleUpdatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyStatus("Updating password...");

    try {
      const payload = await postJson("/api/auth/update-password", {
        accessToken: recoveryToken,
        password: newPassword,
      });

      if (payload.error) {
        setErrorStatus(payload.error);
        return;
      }

      setOkStatus(payload.message || "Password updated. You can sign in now.");
      setRecoveryToken("");
      setNewPassword("");
      setActiveTab("signin");
    } catch {
      setErrorStatus("Unexpected error. Try again.");
    } finally {
      setIsBusy(false);
    }
  }

  const statusToRender = statusMessage || contextualMessage;

  return (
    <section className="card auth-card">
      <h1>Account access</h1>
      <p className="card-lead">Phase C provides sign up, sign in, password reset, email verification and RBAC.</p>

      {statusToRender && (
        <p
          className={`status ${statusKind === "error" ? "status--error" : "status--ok"}`}
          role="status"
          aria-live="polite"
        >
          {statusToRender}
        </p>
      )}

      <div className="tabs" role="tablist" aria-label="Auth actions">
        {AUTH_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab ${activeTab === tab.id ? "is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
        {recoveryToken && (
          <button
            type="button"
            className={`tab ${activeTab === "new-password" ? "is-active" : ""}`}
            onClick={() => setActiveTab("new-password")}
            aria-selected={activeTab === "new-password"}
            role="tab"
          >
            New password
          </button>
        )}
      </div>

      {activeTab === "signin" && (
        <form className="stack" onSubmit={handleSignIn}>
          <label>
            Email
            <input
              type="email"
              value={signinEmail}
              onChange={(event) => setSigninEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={signinPassword}
              onChange={(event) => setSigninPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button className="button button--primary" type="submit" disabled={isBusy}>
            {isBusy ? "Signing in..." : "Sign in"}
          </button>
          <button className="button button--ghost" type="button" onClick={handleResendVerification} disabled={isBusy}>
            Resend verification email
          </button>
        </form>
      )}

      {activeTab === "signup" && (
        <form className="stack" onSubmit={handleSignUp}>
          <label>
            Email
            <input
              type="email"
              value={signupEmail}
              onChange={(event) => setSignupEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={signupPassword}
              onChange={(event) => setSignupPassword(event.target.value)}
              autoComplete="new-password"
              minLength={10}
              required
            />
          </label>
          <button className="button button--primary" type="submit" disabled={isBusy}>
            {isBusy ? "Creating account..." : "Create account"}
          </button>
        </form>
      )}

      {activeTab === "reset" && (
        <form className="stack" onSubmit={handleResetPassword}>
          <label>
            Email
            <input
              type="email"
              value={resetEmail}
              onChange={(event) => setResetEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <button className="button button--primary" type="submit" disabled={isBusy}>
            {isBusy ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}

      {activeTab === "new-password" && recoveryToken && (
        <form className="stack" onSubmit={handleUpdatePassword}>
          <label>
            New password
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={10}
              required
            />
          </label>
          <button className="button button--primary" type="submit" disabled={isBusy}>
            {isBusy ? "Updating..." : "Update password"}
          </button>
        </form>
      )}
    </section>
  );
}
