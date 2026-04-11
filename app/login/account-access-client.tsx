"use client";

import { useEffect, useMemo, useState } from "react";
import { postJson } from "../lib/client-http";

type TabId = "signin" | "signup" | "reset" | "new-password";

const DEFAULT_STATUS = "";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseHashParams(hash: string): URLSearchParams {
  return new URLSearchParams(hash.replace(/^#/, ""));
}

type Props = {
  reason: string;
  verified: string;
};

export default function AccountAccessClient({ reason, verified }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("signin");
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [error, setError] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");

  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [recoveryToken, setRecoveryToken] = useState("");

  const contextualMessage = useMemo(() => {
    if (verified === "1") {
      return "Email verification completed. You can sign in now.";
    }
    if (reason === "inactive") {
      return "Your account is inactive. Contact support or an administrator.";
    }
    if (reason === "unverified") {
      return "Email verification must be completed before access is granted.";
    }
    return "";
  }, [reason, verified]);

  useEffect(() => {
    const hashParams = parseHashParams(window.location.hash);
    if (hashParams.get("type") === "recovery" && hashParams.get("access_token")) {
      setRecoveryToken(hashParams.get("access_token")!);
      setActiveTab("new-password");
      setStatus("Set your new password below.");
      setError(false);
      // Clean hash from URL without reload
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setStatus("Signing in...");
    setError(false);

    const email = normalizeEmail(signinEmail);
    let shouldRedirect = false;

    try {
      const payload = await postJson("/api/auth/signin", {
        email,
        password: signinPassword,
      });

      if (payload.error) {
        setStatus(payload.error);
        setError(true);
        setPendingVerificationEmail(email);
        return;
      }

      setPendingVerificationEmail("");
      setStatus("Signed in. Redirecting...");
      setError(false);
      shouldRedirect = true;
      window.location.href = "/dashboard";
    } catch {
      setStatus("Unexpected sign-in error. Try again.");
      setError(true);
    } finally {
      if (!shouldRedirect) {
        setIsBusy(false);
      }
    }
  }

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setStatus("Creating account...");
    setError(false);

    const email = normalizeEmail(signupEmail);

    try {
      const payload = await postJson("/api/auth/signup", {
        email,
        password: signupPassword,
      });

      if (payload.error) {
        setStatus(payload.error);
        setError(true);
        return;
      }

      setStatus(payload.message || "Account created. Verify your email before sign in.");
      setPendingVerificationEmail(email);
      setError(false);
      setActiveTab("signin");
      setSigninEmail(email);
    } catch {
      setStatus("Unexpected sign-up error. Try again.");
      setError(true);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setStatus("Sending reset link...");
    setError(false);

    const email = normalizeEmail(resetEmail);

    try {
      const payload = await postJson("/api/auth/reset-password", {
        email,
      });

      if (payload.error) {
        setStatus(payload.error);
        setError(true);
        return;
      }

      setStatus(payload.message || "Password reset email sent.");
      setError(false);
    } catch {
      setStatus("Unexpected password reset error. Try again.");
      setError(true);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleResendVerification() {
    const email = normalizeEmail(pendingVerificationEmail || signinEmail);
    if (!email) {
      setStatus("Provide email in sign-in form first.");
      setError(true);
      return;
    }

    setIsBusy(true);
    setStatus("Sending verification email...");
    setError(false);

    try {
      const payload = await postJson("/api/auth/resend-verification", { email });
      if (payload.error) {
        setStatus(payload.error);
        setError(true);
        return;
      }

      setStatus(payload.message || "Verification email sent.");
      setError(false);
    } catch {
      setStatus("Unexpected verification error. Try again.");
      setError(true);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleUpdatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setStatus("Updating password...");
    setError(false);

    try {
      const payload = await postJson("/api/auth/update-password", {
        accessToken: recoveryToken,
        password: newPassword,
      });

      if (payload.error) {
        setStatus(payload.error);
        setError(true);
        return;
      }

      setStatus(payload.message || "Password updated. You can sign in now.");
      setError(false);
      setRecoveryToken("");
      setNewPassword("");
      setActiveTab("signin");
    } catch {
      setStatus("Unexpected error. Try again.");
      setError(true);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="card auth-card">
      <h1>Account access</h1>
      <p className="card-lead">Phase C provides sign up, sign in, password reset, email verification and RBAC.</p>

      {(contextualMessage || status) && (
        <p className={`status ${error ? "status--error" : "status--ok"}`}>{status || contextualMessage}</p>
      )}

      <div className="tabs" role="tablist" aria-label="Auth actions">
        <button
          type="button"
          className={`tab ${activeTab === "signin" ? "is-active" : ""}`}
          onClick={() => setActiveTab("signin")}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`tab ${activeTab === "signup" ? "is-active" : ""}`}
          onClick={() => setActiveTab("signup")}
        >
          Sign up
        </button>
        <button
          type="button"
          className={`tab ${activeTab === "reset" ? "is-active" : ""}`}
          onClick={() => setActiveTab("reset")}
        >
          Reset password
        </button>
        {recoveryToken && (
          <button
            type="button"
            className={`tab ${activeTab === "new-password" ? "is-active" : ""}`}
            onClick={() => setActiveTab("new-password")}
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
