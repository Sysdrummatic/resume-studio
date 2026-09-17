"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusToast, useStatusToast } from "../components/status-toast";
import { useAppI18n } from "../components/app-i18n-provider";
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
  const { dictionary } = useAppI18n();
  const auth = dictionary.auth;
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
      return auth.contextual.verified;
    }
    if (reason === "account_deleted") {
      return auth.contextual.account_deleted;
    }
    if (reason === "inactive") {
      return auth.contextual.inactive;
    }
    if (reason === "unverified") {
      return auth.contextual.unverified;
    }
    if (reason === "session") {
      return auth.contextual.session;
    }
    if (reason === "signed-out") {
      return auth.contextual.signed_out;
    }
    return "";
  }, [auth.contextual, reason, verified]);
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
      showToast(auth.contextual.set_new_password, "warning");
      // Clean hash from URL without reload
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [auth.contextual.set_new_password, showToast]);

  const modeMeta = useMemo(() => {
    if (activeMode === "signup") {
      return {
        ...auth.modes.signup,
        alternateLabel: auth.modes.signup.alternate_label,
        alternateHref: "/login?mode=signin",
        alternateAction: auth.modes.signup.alternate_action,
      };
    }

    if (activeMode === "reset") {
      return {
        ...auth.modes.reset,
        alternateLabel: auth.modes.reset.alternate_label,
        alternateHref: "/login?mode=signin",
        alternateAction: auth.modes.reset.alternate_action,
      };
    }

    if (activeMode === "new-password") {
      return {
        ...auth.modes.new_password,
        alternateLabel: "",
        alternateHref: "",
        alternateAction: auth.modes.new_password.alternate_action,
      };
    }

    return {
      ...auth.modes.signin,
      alternateLabel: auth.modes.signin.alternate_label,
      alternateHref: "/login?mode=signup",
      alternateAction: auth.modes.signin.alternate_action,
    };
  }, [activeMode, auth.modes]);

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
    showToast(auth.messages.signing_in);

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
      showToast(auth.messages.signed_in);
      shouldRedirect = true;
      window.location.href = "/dashboard";
    } catch {
      showToast(auth.messages.sign_in_error, "error");
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
    showToast(auth.messages.creating_account);

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

      showToast(payload.message || auth.messages.account_created);
      setPendingVerificationEmail(email);
      setSigninEmail(email);
      setSignupPolicyAccepted(false);
      setSignupBetaOptIn(false);
      setMode("signin");
    } catch {
      showToast(auth.messages.sign_up_error, "error");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    showToast(auth.messages.sending_reset);

    const email = normalizeEmail(resetEmail);

    try {
      const payload = await postJson("/api/auth/reset-password", {
        email,
      });

      if (payload.error) {
        showToast(payload.error, "error");
        return;
      }

      showToast(payload.message || auth.messages.reset_sent);
    } catch {
      showToast(auth.messages.reset_error, "error");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleResendVerification() {
    const email = normalizeEmail(pendingVerificationEmail || signinEmail);
    if (!email) {
      showToast(auth.messages.provide_email, "warning");
      return;
    }

    setIsBusy(true);
    showToast(auth.messages.sending_verification);

    try {
      const payload = await postJson("/api/auth/resend-verification", { email });
      if (payload.error) {
        showToast(payload.error, "error");
        return;
      }

      showToast(payload.message || auth.messages.verification_sent);
    } catch {
      showToast(auth.messages.verification_error, "error");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleUpdatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    showToast(auth.messages.updating_password);

    try {
      const payload = await postJson("/api/auth/update-password", {
        accessToken: recoveryToken,
        password: newPassword,
      });

      if (payload.error) {
        showToast(payload.error, "error");
        return;
      }

      showToast(payload.message || auth.messages.password_updated);
      setRecoveryToken("");
      setNewPassword("");
      setMode("signin");
    } catch {
      showToast(auth.messages.unexpected_error, "error");
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
          <p className="auth-card__note">{auth.messages.pending_verification.replace("{email}", pendingVerificationEmail)}</p>
        ) : null}

        {activeMode === "signin" && (
          <form className="stack auth-card__form" onSubmit={handleSignIn}>
            <label className="auth-card__field">
              <span className="auth-card__label">{auth.fields.email}</span>
              <input
                type="email"
                value={signinEmail}
                onChange={(event) => setSigninEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="auth-card__field">
              <span className="auth-card__label">{auth.fields.password}</span>
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
                {auth.actions.forgot_password}
              </Link>
              {pendingVerificationEmail ? (
                <button type="button" className="auth-card__text-button" onClick={handleResendVerification} disabled={isBusy}>
                  {auth.actions.resend_verification}
                </button>
              ) : null}
            </div>
            <div className="auth-card__actions">
              {restricted ? (
                <RestrictedSubmitButton label={auth.actions.sign_in} reason={restrictionReason} />
              ) : (
                <button className="button button--primary" type="submit" disabled={isBusy}>
                  {isBusy ? auth.actions.signing_in : auth.actions.sign_in}
                </button>
              )}
            </div>
          </form>
        )}

        {activeMode === "signup" && (
          <form className="stack auth-card__form" onSubmit={handleSignUp}>
            <label className="auth-card__field">
              <span className="auth-card__label">{auth.fields.email}</span>
              <input
                type="email"
                value={signupEmail}
                onChange={(event) => setSignupEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="auth-card__field">
              <span className="auth-card__label">{auth.fields.password}</span>
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
              <span>{auth.signup.beta_tester}</span>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={signupPolicyAccepted}
                onChange={(event) => setSignupPolicyAccepted(event.target.checked)}
                required
              />
              <span>
                {auth.signup.consent_before_privacy}{" "}
                <Link href="/privacy" className="auth-card__link">
                  {auth.signup.privacy_policy}
                </Link>{" "}
                {auth.signup.consent_between}{" "}
                <Link href="/terms" className="auth-card__link">
                  {auth.signup.terms}
                </Link>
                .
              </span>
            </label>
            <div className="auth-card__actions">
              {restricted ? (
                <RestrictedSubmitButton label={auth.actions.create_account} reason={restrictionReason} />
              ) : (
                <button className="button button--primary" type="submit" disabled={isBusy || !signupPolicyAccepted}>
                  {isBusy ? auth.actions.creating_account : auth.actions.create_account}
                </button>
              )}
            </div>
          </form>
        )}

        {activeMode === "reset" && (
          <form className="stack auth-card__form" onSubmit={handleResetPassword}>
            <label className="auth-card__field">
              <span className="auth-card__label">{auth.fields.email}</span>
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
                {isBusy ? auth.actions.sending : auth.actions.send_reset_link}
              </button>
            </div>
          </form>
        )}

        {activeMode === "new-password" && recoveryToken && (
          <form className="stack auth-card__form" onSubmit={handleUpdatePassword}>
            <label className="auth-card__field">
              <span className="auth-card__label">{auth.fields.new_password}</span>
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
                {isBusy ? auth.actions.updating : auth.actions.update_password}
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
