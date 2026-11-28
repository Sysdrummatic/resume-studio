"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useAppI18n } from "../components/app-i18n-provider";
import "../adminsettings/admin-settings.css";
import { Button, Checkbox, Panel, StatePill, buttonClassName } from "../components/design-system/primitives";
import type { OnboardingTestRun } from "../lib/onboarding-test";

export default function OnboardingTestSettings({ initialRun }: { initialRun: OnboardingTestRun | null }) {
  const { dictionary } = useAppI18n();
  const settingsText = (text: string) => dictionary.settings.text[text] ?? text;

  return (
    <div className="admin-settings ocv-page ocv-page--narrow">
      <header className="ocv-page-head">
        <h1 className="ocv-title">{settingsText("Account settings")}</h1>
      </header>
      <OnboardingTestSection initialRun={initialRun} />
      <Link className={buttonClassName("secondary")} href="/dashboard">
        {settingsText("Go to dashboard")}
      </Link>
    </div>
  );
}

/** The onboarding test controls; shared by /settings and /adminsettings. */
export function OnboardingTestSection({ initialRun }: { initialRun: OnboardingTestRun | null }) {
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
    <Panel as="section" id="onboarding-test" className="admin-settings__section" aria-labelledby="onboarding-test-settings-title">
      <h2 id="onboarding-test-settings-title" className="ocv-heading">
        {settingsText("Testing tools")}
      </h2>
      <h3 className="ocv-subheading">{settingsText("Onboarding")}</h3>
      <p className="ocv-body">{settingsText("Test the first-use guide on a separate blank draft. Your Master CV, languages and profile remain unchanged.")}</p>
      <p className="admin-settings__status ocv-body">
        <b>{settingsText("Status")}</b>
        <StatePill state={run && run.status !== "completed" ? "ok" : "private"}>{status}</StatePill>
      </p>
      <Checkbox
        label={settingsText("Start onboarding on my next dashboard visit")}
        checked={Boolean(run?.auto_start && run.status !== "completed")}
        disabled={busy}
        onChange={(event) => void configure(event.target.checked ? "arm" : "disarm")}
      />
      <div className="admin-settings__actions">
        <Button variant="primary" disabled={busy} onClick={() => void configure("start")}>
          {settingsText("Start now")}
        </Button>
        {run && run.status !== "completed" ? (
          <Button variant="secondary" disabled={busy} onClick={() => void configure("restart")}>
            {settingsText("Start a new blank test")}
          </Button>
        ) : null}
      </div>
      <p className="ocv-meta">
        {settingsText("Start now resumes an unfinished test. A new test keeps previous test drafts and published CVs. At the end you choose whether to publish Test onboardingu; the automatic-start option then switches off.")}
      </p>
      {message ? <p role="status" className="ocv-body">{message}</p> : null}
      {error ? <p role="alert" className="admin-settings__error">{error}</p> : null}
    </Panel>
  );
}
