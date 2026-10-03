"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useAppI18n } from "../components/app-i18n-provider";
import type { OnboardingTestRun } from "../lib/onboarding-test";

export default function OnboardingTestSettings({ initialRun }: { initialRun: OnboardingTestRun | null }) {
  const { dictionary } = useAppI18n();
  const settingsText = (text: string) => dictionary.settings.text[text] ?? text;
  const [run, setRun] = useState(initialRun);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const lock = useRef(false);
  const status = !run
    ? settingsText("Inactive")
    : run.status === "completed"
      ? settingsText("Completed")
      : run.auto_start
        ? settingsText("Starts on the next dashboard visit")
        : settingsText("In progress / paused");

  async function configure(action: "arm" | "disarm" | "start" | "restart") {
    if (lock.current) {
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/onboarding-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, expectedRunId: run?.id ?? null }),
      });
      if (!response.ok) {
        throw new Error("save");
      }
      const result = (await response.json()) as { run: OnboardingTestRun | null };
      setRun(result.run);
      if ((action === "start" || action === "restart") && result.run) {
        window.location.assign(`/onboarding?test=${result.run.id}`);
      } else {
        setMessage(settingsText("Settings saved."));
      }
    } catch {
      setError(settingsText("Could not save. Reload settings and retry."));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="section-row">
        <h1>{settingsText("Account settings")}</h1>
      </div>
      <section className="card stack" aria-labelledby="onboarding-test-settings-title">
        <h2 id="onboarding-test-settings-title">{settingsText("Testing tools")}</h2>
        <h3>{settingsText("Onboarding")}</h3>
        <p>{settingsText("Test the first-use guide on a separate blank draft. Your Master CV, languages and profile remain unchanged.")}</p>
        <p>
          {settingsText("Status")}: <strong>{status}</strong>
        </p>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={Boolean(run?.auto_start && run.status !== "completed")}
            disabled={busy}
            onChange={(event) => void configure(event.target.checked ? "arm" : "disarm")}
          />
          {settingsText("Start onboarding on my next dashboard visit")}
        </label>
        <div className="actions-row">
          <button className="button button--primary" type="button" disabled={busy} onClick={() => void configure("start")}>
            {settingsText("Start now")}
          </button>
          {run && run.status !== "completed" ? (
            <button className="button button--ghost" type="button" disabled={busy} onClick={() => void configure("restart")}>
              {settingsText("Start a new blank test")}
            </button>
          ) : null}
        </div>
        <p className="muted">
          {settingsText("Start now resumes an unfinished test. A new test keeps previous test drafts and published CVs. At the end you choose whether to publish Test onboardingu; the automatic-start option then switches off.")}
        </p>
        {message ? <p role="status">{message}</p> : null}
        {error ? <p role="alert">{error}</p> : null}
      </section>
      <Link className="button button--ghost" href="/dashboard">
        {settingsText("Go to dashboard")}
      </Link>
    </div>
  );
}
