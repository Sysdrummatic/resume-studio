"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusToast, useStatusToast } from "../components/status-toast";
import { postJson } from "../lib/client-http";

type InitialAuthMode = "signin" | "signup" | "reset";
type AuthMode = InitialAuthMode | "new-password";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseHashParams(hash: string): URLSearchParams {
  return new URLSearchParams(hash.replace(/^#/, ""));
}

type Props = {
  reason: string;
  verified: string;
  mode: InitialAuthMode;
  restricted?: boolean;
  restrictionReason?: string;
};

function RestrictedSubmitButton({ label, reason }: { label: string; reason: string }) {
  return (
    <span className="nav-tooltip-anchor" tabIndex={0}>
      <button className="button button--primary" type="submit" disabled aria-disabled="true">
        {label}
      </button>
      {reason ? (
        <span role="tooltip" className="nav-tooltip">
          {reason}
        </span>
      ) : null}
    </span>
  );
}

export default function AccountAccessClient({ reason, verified, mode, restricted = false, restrictionReason = "" }: Props) {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<AuthMode>(mode);
  const { toast, showToast, closeToast } = useStatusToast();
  const [isBusy, setIsBusy] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const [isContextualMessageHidden, setIsContextualMessageHidden] = useState(false);

  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPolicyAccepted, setSignupPolicyAccepted] = useState(false);
  const [signupBetaOptIn, setSignupBetaOptIn] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [recoveryToken, setRecoveryToken] = useState("");

  const setMode = useCallback(
    (nextMode: InitialAuthMode) => {
      setActiveMode(nextMode);
      router.replace(`/login?mode=${nextMode}`, { scroll: false });
    },
    [router],
  );

  const contextualMessage = useMemo(() => {
    if (verified === "1") {
      return "Email verification completed. You can sign in now.";
    }
    if (reason === "account_deleted") {
      return "Your account and all associated data have been permanently deleted.";
    }
    if (reason === "inactive") {
      return "Your account is inactive. Contact support or an administrator.";
    }
    if (reason === "unverified") {
      return "Email verification must be completed before access is granted.";
    }
    if (reason === "session") {
      return "Your session could not be restored. Please sign in again.";
    }
    if (reason === "signed-out") {
      return "Sign in to continue.";
    }
    return "";
  }, [reason, verified]);
  const contextualVariant =
    reason === "account_deleted" || reason === "signed-out" ? "success" : contextualMessage ? "warning" : "success";
  const contextualToast =
    contextualMessage && !isContextualMessageHidden
      ? { id: 0, message: contextualMessage, variant: contextualVariant as "warning" | "success" }
      : null;
  const activeToast = toast || contextualToast;

  useEffect(() => {
    if (!recoveryToken) {
      setActiveMode(mode);
    }
  }, [mode, recoveryToken]);

  useEffect(() => {
    const hashParams = parseHashParams(window.location.hash);
    if (hashParams.get("type") === "recovery" && hashParams.get("access_token")) {
      setRecoveryToken(hashParams.get("access_token")!);
      setActiveMode("new-password");
      showToast("Set your new password below.", "warning");
      // Clean hash from URL without reload
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [showToast]);

  const modeMeta = useMemo(() => {
    if (activeMode === "signup") {
      return {
        eyebrow: "Account setup",
        title: "Create your account",
        lead: "Open your workspace, verify your email, then publish from one structured source.",
        alternateLabel: "Already have an account?",
        alternateHref: "/login?mode=signin",
        alternateAction: "Sign in",
      };
    }

    if (activeMode === "reset") {
      return {
        eyebrow: "Recovery",
        title: "Reset your password",
        lead: "Request a recovery link for the email address tied to your account.",
        alternateLabel: "Remembered your password?",
        alternateHref: "/login?mode=signin",
        alternateAction: "Back to sign in",
      };
    }

    if (activeMode === "new-password") {
      return {
        eyebrow: "Recovery",
        title: "Set a new password",
        lead: "Finish the recovery session opened from your email link.",
        alternateLabel: "",
        alternateHref: "",
        alternateAction: "",
      };
    }

    return {
      eyebrow: "Account access",
      title: "Sign in",
      lead: "Continue into your dashboard and publication controls.",
      alternateLabel: "Need an account?",
      alternateHref: "/login?mode=signup",
      alternateAction: "Sign up",
    };
  }, [activeMode]);

  const closeActiveToast = useCallback(() => {
    if (toast) {
      closeToast();
      return;
    }
    setIsContextualMessageHidden(true);
  }, [closeToast, toast]);

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (restricted) {
      return;
    }
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
      window.location.href = "/dashboard";
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
    if (restricted) {
      return;
    }
    setIsBusy(true);
    showToast("Creating account...");

    const email = normalizeEmail(signupEmail);

    try {
      const payload = await postJson("/api/auth/signup", {
        email,
        password: signupPassword,
        wantsBetaTestUser: signupBetaOptIn,
      });

      if (payload.error) {
        showToast(payload.error, "error");
        return;
      }

      showToast(payload.message || "Account created. Verify your email before sign in.");
      setPendingVerificationEmail(email);
      setSigninEmail(email);
      setSignupPolicyAccepted(false);
      setSignupBetaOptIn(false);
      setMode("signin");
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
      setMode("signin");
    } catch {
      showToast("Unexpected error. Try again.", "error");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="auth-access">
      <StatusToast toast={activeToast} onClose={closeActiveToast} />

      <section className="card auth-card auth-access__card">
        <div className="auth-card__header">
          <div className="stack">
            <div className="product-surface__eyebrow">{modeMeta.eyebrow}</div>
            <div className="stack">
              <h2 className="auth-card__title">{modeMeta.title}</h2>
              <p className="auth-card__lead">{modeMeta.lead}</p>
            </div>
          </div>
        </div>

        {pendingVerificationEmail ? (
          <p className="auth-card__note">Pending verification email: {pendingVerificationEmail}</p>
        ) : null}

        {activeMode === "signin" && (
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
            <div className="auth-card__support-row">
              <Link href="/login?mode=reset" className="auth-card__link">
                Forgot password?
              </Link>
              {pendingVerificationEmail ? (
                <button type="button" className="auth-card__text-button" onClick={handleResendVerification} disabled={isBusy}>
                  Resend verification email
                </button>
              ) : null}
            </div>
            <div className="auth-card__actions">
              {restricted ? (
                <RestrictedSubmitButton label="Sign in" reason={restrictionReason} />
              ) : (
                <button className="button button--primary" type="submit" disabled={isBusy}>
                  {isBusy ? "Signing in..." : "Sign in"}
                </button>
              )}
            </div>
          </form>
        )}

        {activeMode === "signup" && (
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
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={signupBetaOptIn}
                onChange={(event) => setSignupBetaOptIn(event.target.checked)}
              />
              <span>I&apos;m joining as a beta-tester</span>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={signupPolicyAccepted}
                onChange={(event) => setSignupPolicyAccepted(event.target.checked)}
                required
              />
              <span>
                I have read and accept the{" "}
                <Link href="/privacy" className="auth-card__link">
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link href="/terms" className="auth-card__link">
                  Terms of Service
                </Link>
                .
              </span>
            </label>
            <div className="auth-card__actions">
              {restricted ? (
                <RestrictedSubmitButton label="Create account" reason={restrictionReason} />
              ) : (
                <button className="button button--primary" type="submit" disabled={isBusy || !signupPolicyAccepted}>
                  {isBusy ? "Creating account..." : "Create account"}
                </button>
              )}
            </div>
          </form>
        )}

        {activeMode === "reset" && (
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

        {activeMode === "new-password" && recoveryToken && (
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

        {modeMeta.alternateHref ? (
          <p className="auth-card__footer">
            {modeMeta.alternateLabel}{" "}
            <Link href={modeMeta.alternateHref} className="auth-card__link">
              {modeMeta.alternateAction}
            </Link>
          </p>
        ) : null}
      </section>
    </div>
  );
}
