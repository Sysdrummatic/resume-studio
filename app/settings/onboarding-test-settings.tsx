"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { OnboardingTestRun } from "../lib/onboarding-test";

export default function OnboardingTestSettings({ initialRun }: { initialRun: OnboardingTestRun | null }) {
  const [run, setRun] = useState(initialRun);
  const [language, setLanguage] = useState<"en" | "pl">(initialRun?.ui_language ?? "pl");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const lock = useRef(false);
  const t = (en: string, pl: string) => language === "pl" ? pl : en;
  const status = !run ? t("Inactive", "Nieaktywny") : run.status === "completed" ? t("Completed", "Zakończony") : run.auto_start ? t("Starts on the next dashboard visit", "Start przy następnym wejściu do dashboardu") : t("In progress / paused", "W trakcie / wstrzymany");

  async function configure(action: "arm" | "disarm" | "start" | "restart") {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/onboarding-test", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, expectedRunId: run?.id ?? null }) });
      if (!response.ok) throw new Error("save");
      const result = await response.json() as { run: OnboardingTestRun | null };
      setRun(result.run);
      if ((action === "start" || action === "restart") && result.run) window.location.assign(`/onboarding?test=${result.run.id}`);
      else setMessage(t("Settings saved.", "Ustawienia zapisane."));
    } catch { setError(t("Could not save. Reload settings and retry.", "Nie udało się zapisać. Odśwież ustawienia i spróbuj ponownie.")); }
    finally { lock.current = false; setBusy(false); }
  }

  return <div className="stack" lang={language}>
    <div className="section-row"><h1>{t("Account settings", "Ustawienia konta")}</h1><label>{t("Language", "Język")} <select aria-label={t("Language", "Język")} value={language} onChange={(event) => setLanguage(event.target.value as "en" | "pl")}><option value="pl">Polski</option><option value="en">English</option></select></label></div>
    <section className="card stack" aria-labelledby="onboarding-test-settings-title">
      <h2 id="onboarding-test-settings-title">{t("Testing tools", "Narzędzia testowe")}</h2>
      <h3>{t("Onboarding", "Onboarding")}</h3>
      <p>{t("Test the first-use guide on a separate blank draft. Your Master CV, languages and profile remain unchanged.", "Przetestuj pierwsze uruchomienie na osobnym, pustym szkicu. Twoje Master CV, języki konta i profil pozostaną bez zmian.")}</p>
      <p>{t("Status", "Stan")}: <strong>{status}</strong></p>
      <label className="checkbox-row"><input type="checkbox" checked={Boolean(run?.auto_start && run.status !== "completed")} disabled={busy} onChange={(event) => void configure(event.target.checked ? "arm" : "disarm")} />{t("Start onboarding on my next dashboard visit", "Uruchom onboarding przy następnym wejściu do dashboardu")}</label>
      <div className="actions-row">
        <button className="button button--primary" type="button" disabled={busy} onClick={() => void configure("start")}>{t("Start now", "Uruchom teraz")}</button>
        {run && run.status !== "completed" ? <button className="button button--ghost" type="button" disabled={busy} onClick={() => void configure("restart")}>{t("Start a new blank test", "Zacznij nowy pusty test")}</button> : null}
      </div>
      <p className="muted">{t("Start now resumes an unfinished test. A new test keeps previous test drafts and published CVs. At the end you choose whether to publish Test onboardingu; the automatic-start option then switches off.", "Uruchom teraz wznawia niedokończony test. Nowy test zachowuje wcześniejsze szkice testowe i opublikowane CV. Na końcu zdecydujesz, czy opublikować Test onboardingu; opcja automatycznego startu zostanie wyłączona.")}</p>
      {message ? <p role="status">{message}</p> : null}{error ? <p role="alert">{error}</p> : null}
    </section>
    <Link className="button button--ghost" href="/dashboard">{t("Go to dashboard", "Przejdź do dashboardu")}</Link>
  </div>;
}
