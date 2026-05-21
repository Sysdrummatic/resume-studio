"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusToast, useStatusToast } from "../components/status-toast";
import { postJson } from "../lib/client-http";

type TabId = "signin" | "signup" | "reset" | "new-password";

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
  const { toast, showToast, closeToast } = useStatusToast();
  const [isBusy, setIsBusy] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const [isContextualMessageHidden, setIsContextualMessageHidden] = useState(false);

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
    if (reason === "session") {
      return "Session could not be restored. Please sign in again.";
    }
    return "";
  }, [reason, verified]);
  const contextualVariant = contextualMessage ? "warning" : "success";
  const contextualToast =
    contextualMessage && !isContextualMessageHidden
      ? { id: 0, message: contextualMessage, variant: contextualVariant as "warning" | "success" }
      : null;
  const activeToast = toast || contextualToast;

  useEffect(() => {
    const hashParams = parseHashParams(window.location.hash);
    if (hashParams.get("type") === "recovery" && hashParams.get("access_token")) {
      setRecoveryToken(hashParams.get("access_token")!);
      setActiveTab("new-password");
      showToast("Set your new password below.", "warning");
      // Clean hash from URL without reload
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [showToast]);

  const closeActiveToast = useCallback(() => {
    if (toast) {
      closeToast();
      return;
    }
    setIsContextualMessageHidden(true);
  }, [closeToast, toast]);

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    showToast("Signing in...");

    const email = normalizeEmail(signinEmail);
    let shouldRedirect = false;

    try {
      const payload = await postJson("/api/auth/signin", {
        email,
        password: signinPassword,
      });

      if (payload.error) {
        showToast(payload.error, "error");
        setPendingVerificationEmail(email);
        return;
      }

      setPendingVerificationEmail("");
      showToast("Signed in. Redirecting...");
      shouldRedirect = true;
      window.location.href = "/user";
    } catch {
      showToast("Unexpected sign-in error. Try again.", "error");
    } finally {
      if (!shouldRedirect) {
        setIsBusy(false);
      }
    }
  }

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    showToast("Creating account...");

    const email = normalizeEmail(signupEmail);

    try {
      const payload = await postJson("/api/auth/signup", {
        email,
        password: signupPassword,
      });

      if (payload.error) {
        showToast(payload.error, "error");
        return;
      }

      showToast(payload.message || "Account created. Verify your email before sign in.");
      setPendingVerificationEmail(email);
      setActiveTab("signin");
      setSigninEmail(email);
    } catch {
      showToast("Unexpected sign-up error. Try again.", "error");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    showToast("Sending reset link...");

    const email = normalizeEmail(resetEmail);

    try {
      const payload = await postJson("/api/auth/reset-password", {
        email,
      });

      if (payload.error) {
        showToast(payload.error, "error");
        return;
      }

      showToast(payload.message || "Password reset email sent.");
    } catch {
      showToast("Unexpected password reset error. Try again.", "error");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleResendVerification() {
    const email = normalizeEmail(pendingVerificationEmail || signinEmail);
    if (!email) {
      showToast("Provide email in sign-in form first.", "warning");
      return;
    }

    setIsBusy(true);
    showToast("Sending verification email...");

    try {
      const payload = await postJson("/api/auth/resend-verification", { email });
      if (payload.error) {
        showToast(payload.error, "error");
        return;
      }

      showToast(payload.message || "Verification email sent.");
    } catch {
      showToast("Unexpected verification error. Try again.", "error");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleUpdatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    showToast("Updating password...");

    try {
      const payload = await postJson("/api/auth/update-password", {
        accessToken: recoveryToken,
        password: newPassword,
      });

      if (payload.error) {
        showToast(payload.error, "error");
        return;
      }

      showToast(payload.message || "Password updated. You can sign in now.");
      setRecoveryToken("");
      setNewPassword("");
      setActiveTab("signin");
    } catch {
      showToast("Unexpected error. Try again.", "error");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="card auth-card">
      <h1>Account access</h1>
      <p className="card-lead">Phase C provides sign up, sign in, password reset, email verification and RBAC.</p>

      <StatusToast toast={activeToast} onClose={closeActiveToast} />

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
