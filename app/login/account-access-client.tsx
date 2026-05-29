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
  const activeTabCopy = useMemo(() => {
    if (activeTab === "signup") {
      return "Create an account, verify your email, then continue into your resume workspace.";
    }
    if (activeTab === "reset") {
      return "Request a recovery link for the email address tied to your account.";
    }
    if (activeTab === "new-password") {
      return "Set a new password for the recovery session opened from your email link.";
    }
    return "Sign in to continue into the personal hub, dashboard, and publication controls.";
  }, [activeTab]);

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
    <div className="auth-access">
      <section className="card auth-access__intro">
        <div className="auth-access__intro-copy stack">
          <div className="product-surface__eyebrow">Platform access</div>
          <div className="stack">
            <h1 className="product-surface__title">Resume publication access without leaving the workflow.</h1>
            <p className="product-surface__lead">
              Use one account for the master record, locale-specific resume versions, and publication controls. The auth
              flow stays technical and direct: sign up, verify, recover, continue.
            </p>
          </div>
        </div>

        <div className="auth-access__signal-grid" aria-label="Account flow summary">
          <article className="auth-access__signal">
            <span className="auth-access__signal-label">Access model</span>
            <strong>Verified sessions</strong>
            <p>Email verification gates access before protected surfaces open.</p>
          </article>
          <article className="auth-access__signal">
            <span className="auth-access__signal-label">Destination</span>
            <strong>Hub and dashboard</strong>
            <p>Continue into the personal hub, master resume editor, and CV version management.</p>
          </article>
          <article className="auth-access__signal">
            <span className="auth-access__signal-label">Control</span>
            <strong>Role-aware shell</strong>
            <p>Auth, RBAC, and publication state are kept on the same platform surface.</p>
          </article>
        </div>

        <div className="auth-access__timeline" aria-label="Access steps">
          <div className="auth-access__timeline-item">
            <span className="auth-access__timeline-index">01</span>
            <div>
              <h2>Create or restore access</h2>
              <p>Choose sign in, account creation, or password recovery from the same form surface.</p>
            </div>
          </div>
          <div className="auth-access__timeline-item">
            <span className="auth-access__timeline-index">02</span>
            <div>
              <h2>Verify the account</h2>
              <p>Verification email and recovery messaging stay contextual, without branching to separate pages.</p>
            </div>
          </div>
          <div className="auth-access__timeline-item">
            <span className="auth-access__timeline-index">03</span>
            <div>
              <h2>Continue into the workspace</h2>
              <p>After sign-in, the platform restores the authenticated shell and directs you into `/user`.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="card auth-card auth-access__card">
        <div className="auth-card__header">
          <div className="stack">
            <div className="product-surface__eyebrow">Account access</div>
            <div className="stack">
              <h2 className="auth-card__title">OpenCiVera auth</h2>
              <p className="auth-card__lead">{activeTabCopy}</p>
            </div>
          </div>
        </div>

        <StatusToast toast={activeToast} onClose={closeActiveToast} />

        <div className="tabs auth-card__tabs" role="tablist" aria-label="Auth actions">
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

        {pendingVerificationEmail ? (
          <p className="auth-card__note">Pending verification email: {pendingVerificationEmail}</p>
        ) : null}

        {activeTab === "signin" && (
          <form className="stack auth-card__form" onSubmit={handleSignIn}>
            <label className="auth-card__field">
              <span className="auth-card__label">Email</span>
              <input
                type="email"
                value={signinEmail}
                onChange={(event) => setSigninEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="auth-card__field">
              <span className="auth-card__label">Password</span>
              <input
                type="password"
                value={signinPassword}
                onChange={(event) => setSigninPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <div className="auth-card__actions">
              <button className="button button--primary" type="submit" disabled={isBusy}>
                {isBusy ? "Signing in..." : "Sign in"}
              </button>
              <button className="button button--ghost" type="button" onClick={handleResendVerification} disabled={isBusy}>
                Resend verification email
              </button>
            </div>
          </form>
        )}

        {activeTab === "signup" && (
          <form className="stack auth-card__form" onSubmit={handleSignUp}>
            <label className="auth-card__field">
              <span className="auth-card__label">Email</span>
              <input
                type="email"
                value={signupEmail}
                onChange={(event) => setSignupEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="auth-card__field">
              <span className="auth-card__label">Password</span>
              <input
                type="password"
                value={signupPassword}
                onChange={(event) => setSignupPassword(event.target.value)}
                autoComplete="new-password"
                minLength={10}
                required
              />
            </label>
            <div className="auth-card__actions">
              <button className="button button--primary" type="submit" disabled={isBusy}>
                {isBusy ? "Creating account..." : "Create account"}
              </button>
            </div>
          </form>
        )}

        {activeTab === "reset" && (
          <form className="stack auth-card__form" onSubmit={handleResetPassword}>
            <label className="auth-card__field">
              <span className="auth-card__label">Email</span>
              <input
                type="email"
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <div className="auth-card__actions">
              <button className="button button--primary" type="submit" disabled={isBusy}>
                {isBusy ? "Sending..." : "Send reset link"}
              </button>
            </div>
          </form>
        )}

        {activeTab === "new-password" && recoveryToken && (
          <form className="stack auth-card__form" onSubmit={handleUpdatePassword}>
            <label className="auth-card__field">
              <span className="auth-card__label">New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={10}
                required
              />
            </label>
            <div className="auth-card__actions">
              <button className="button button--primary" type="submit" disabled={isBusy}>
                {isBusy ? "Updating..." : "Update password"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
