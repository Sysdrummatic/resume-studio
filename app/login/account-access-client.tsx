"use client";

import { useMemo, useState } from "react";

type TabId = "signin" | "signup" | "reset";

type ApiResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
};

const DEFAULT_STATUS = "";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function postJson<T>(url: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await response.json()) as T;
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

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setStatus("Signing in...");
    setError(false);

    const email = normalizeEmail(signinEmail);
    const payload = await postJson<ApiResponse>("/api/auth/signin", {
      email,
      password: signinPassword,
    });

    if (payload.error) {
      setStatus(payload.error);
      setError(true);
      setPendingVerificationEmail(email);
      setIsBusy(false);
      return;
    }

    setPendingVerificationEmail("");
    setStatus("Signed in. Redirecting...");
    setError(false);
    window.location.href = "/dashboard";
  }

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setStatus("Creating account...");
    setError(false);

    const email = normalizeEmail(signupEmail);
    const payload = await postJson<ApiResponse>("/api/auth/signup", {
      email,
      password: signupPassword,
    });

    if (payload.error) {
      setStatus(payload.error);
      setError(true);
      setIsBusy(false);
      return;
    }

    setStatus(payload.message || "Account created. Verify your email before sign in.");
    setPendingVerificationEmail(email);
    setError(false);
    setIsBusy(false);
    setActiveTab("signin");
    setSigninEmail(email);
  }

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setStatus("Sending reset link...");
    setError(false);

    const email = normalizeEmail(resetEmail);
    const payload = await postJson<ApiResponse>("/api/auth/reset-password", {
      email,
    });

    if (payload.error) {
      setStatus(payload.error);
      setError(true);
      setIsBusy(false);
      return;
    }

    setStatus(payload.message || "Password reset email sent.");
    setError(false);
    setIsBusy(false);
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

    const payload = await postJson<ApiResponse>("/api/auth/resend-verification", { email });
    if (payload.error) {
      setStatus(payload.error);
      setError(true);
      setIsBusy(false);
      return;
    }

    setStatus(payload.message || "Verification email sent.");
    setError(false);
    setIsBusy(false);
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
    </section>
  );
}
