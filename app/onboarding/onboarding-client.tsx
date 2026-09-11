"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import AppBrand from "../components/app-brand";
import OnboardingProgress from "./onboarding-progress";
import {
  ONBOARDING_PUBLISH_STEP,
  ONBOARDING_REVIEW_STEP,
  ONBOARDING_SECTIONS,
  isFirstCvReady,
  type OnboardingState
} from "../lib/resume-onboarding";
import type { ResumeDocument } from "../lib/resume-schema";

const TITLES = {
  en: [
    "Welcome to OpenCiVera",
    "How would you like to start?",
    "Personal details",
    "Professional summary",
    "Experience",
    "Education",
    "Skills",
    "Languages",
    "Courses",
    "Interests",
    "Tech stack",
    "GDPR clause",
    "Review your first CV",
    "Ready to share your CV?"
  ],
  pl: [
    "Witaj w OpenCiVera",
    "Jak chcesz zacząć?",
    "Dane osobowe",
    "Podsumowanie zawodowe",
    "Doświadczenie",
    "Wykształcenie",
    "Umiejętności",
    "Języki",
    "Kursy",
    "Zainteresowania",
    "Technologie",
    "Klauzula RODO",
    "Sprawdź swoje pierwsze CV",
    "Udostępnisz swoje CV?"
  ]
};

type Props = {
  testRunId?: string;
  initialState: OnboardingState;
  uiLanguage: "en" | "pl";
  onUiLanguage: (language: "en" | "pl") => void;
  locale: string;
  languages: Array<{ code: string; label: string }>;
  onLocale: (locale: string) => Promise<void>;
  onSection: (section: string) => void;
  onSave: () => Promise<void>;
  loading: boolean;
  loadError: boolean;
  importing: boolean;
  imported: boolean;
  resume: ResumeDocument;
  form: ReactNode;
  preview: ReactNode;
  importControl: ReactNode;
};

export default function OnboardingClient(props: Props) {
  const { initialState, uiLanguage, locale, resume } = props;
  const progressEndpoint = props.testRunId ? `/api/admin/onboarding-test/${props.testRunId}` : "/api/resume/onboarding";
  const [step, setStep] = useState(initialState.step);
  const [method, setMethod] = useState(initialState.method);
  const [firstPresetId, setFirstPresetId] = useState(initialState.first_preset_id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);
  const [publicPath, setPublicPath] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const lock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const t = (en: string, pl: string) => (uiLanguage === "pl" ? pl : en);
  const disabled = busy || props.loading || props.importing || props.loadError;
  const section = ONBOARDING_SECTIONS[step - 2];

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [step, finished]);

  async function progress(nextStep: number, status: "active" | "paused" = "active") {
    const response = await fetch(progressEndpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: nextStep,
        status,
        locale,
        method,
        ui_language: uiLanguage,
        imported: props.imported
      })
    });
    if (!response.ok) throw new Error("progress");
    const result = (await response.json()) as { state: OnboardingState };
    setFirstPresetId(result.state.first_preset_id);
  }

  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch {
      setError(
        t(
          "Could not save or finish this step. Check your connection and try again; your entries remain on this screen.",
          "Nie udało się zapisać lub zakończyć tego kroku. Sprawdź połączenie i spróbuj ponownie; wpisane dane pozostały na tej planszy."
        )
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function go(nextStep: number) {
    if (step === 2 && nextStep > step && !resume.first_name.trim() && !resume.family_name.trim()) {
      setError(t("Enter your name to continue.", "Wpisz imię lub nazwisko, aby kontynuować."));
      return;
    }
    void run(async () => {
      if (step >= 2 || props.imported) await props.onSave();
      await progress(nextStep);
      props.onSection(ONBOARDING_SECTIONS[nextStep - 2] ?? "personal");
      setStep(nextStep);
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  }

  function finish(publish: boolean) {
    void run(async () => {
      await props.onSave();
      await progress(ONBOARDING_PUBLISH_STEP);
      const response = await fetch(progressEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish })
      });
      if (!response.ok) throw new Error("finish");
      const result = (await response.json()) as { publicPath: string | null };
      if (publish && !result.publicPath) throw new Error("link");
      setPublicPath(result.publicPath);
      setFinished(true);
    });
  }

  async function copyLink() {
    if (!publicPath) return;
    try {
      await navigator.clipboard.writeText(new URL(publicPath, window.location.origin).href);
      setCopied(true);
    } catch {
      setError(t("Select and copy the link above.", "Zaznacz i skopiuj link powyżej."));
    }
  }

  return (
    <section className="resume-editor-shell onboarding" lang={uiLanguage} aria-labelledby="onboarding-title">
      <aside className="onboarding__sidebar">
        <AppBrand href={null} />
        <OnboardingProgress
          steps={TITLES[uiLanguage]}
          step={step}
          finished={finished}
          label={t("Guide progress", "Postęp przewodnika")}
          completeLabel={t("Complete", "Gotowe")}
        />
      </aside>
      <div className="onboarding__card" aria-busy={busy}>
        <div className="onboarding__topline">
          <span className="onboarding__step-count">
            {t("Your first CV", "Twoje pierwsze CV")}
            <strong>{finished ? t("Complete", "Gotowe") : `${step + 1} / ${TITLES[uiLanguage].length}`}</strong>
          </span>
          <label className="onboarding__language">
            {t("Guide language", "Język przewodnika")}
            <select
              aria-label={t("Guide language", "Język przewodnika")}
              value={uiLanguage}
              onChange={(event) => props.onUiLanguage(event.target.value as "en" | "pl")}
              disabled={disabled || finished}
            >
              <option value="en">English</option>
              <option value="pl">Polski</option>
            </select>
          </label>
        </div>
        <h1 id="onboarding-title" ref={heading} tabIndex={-1}>
          {finished
            ? publicPath
              ? t("Your CV is ready to send", "Twoje CV jest gotowe do wysłania")
              : props.testRunId ? t("Your test draft is saved", "Szkic testowy jest zapisany") : t("Your Master CV is saved", "Twoje Master CV jest zapisane")
            : TITLES[uiLanguage][step]}
        </h1>
        {props.testRunId ? <p className="onboarding__hint" role="note">{t("Onboarding test: this is a separate draft. Your Master CV and profile stay unchanged. Publishing creates a CV named Test onboardingu.", "Test onboardingu: pracujesz na osobnym szkicu. Master CV i profil pozostają bez zmian. Publikacja utworzy CV o nazwie Test onboardingu.")}</p> : null}
        {props.loadError ? (
          <p role="alert">
            {t(
              "Could not load your CV. Reload this page before continuing.",
              "Nie udało się wczytać CV. Odśwież stronę przed kontynuowaniem."
            )}
          </p>
        ) : null}
        {props.loading ? <p role="status">{t("Loading your CV…", "Wczytywanie CV…")}</p> : null}
        {error ? (
          <p className="onboarding__error" role="alert">
            {error}
          </p>
        ) : null}

        {!finished && step === 0 ? (
          <div className="onboarding__welcome">
            <p>
              {t(
                "Tell your story, one section at a time. We’ll help you build your Master CV and turn it into a CV you can share with a link.",
                "Opowiedz o sobie, sekcja po sekcji. Pomożemy Ci uzupełnić Master CV i utworzyć CV, które udostępnisz za pomocą linku."
              )}
            </p>
            <ol>
              <li>{t("Import a CV or start from scratch", "Zaimportuj CV lub zacznij od zera")}</li>
              <li>{t("Review and fill in your details", "Sprawdź i uzupełnij swoje dane")}</li>
              <li>
                {t(
                  "Choose whether to create a shareable CV",
                  "Zdecyduj, czy utworzyć CV z linkiem"
                )}
              </li>
            </ol>
          </div>
        ) : null}

        {!finished && step === 1 ? (
          <fieldset
            className="onboarding__choices"
            disabled={disabled || Boolean(firstPresetId)}
          >
            <legend className="sr-only">{TITLES[uiLanguage][1]}</legend>
            <label className="onboarding__language">
              {t("CV language", "Język CV")}
              <select
                aria-label={t("CV language", "Język CV")}
                value={locale}
                onChange={(event) => {
                  const value = event.target.value;
                  void run(() => props.onLocale(value));
                }}
              >
                {Array.from(
                  new Map(
                    [
                      ...props.languages,
                      { code: "en", label: "English" },
                      { code: "pl", label: "Polski" }
                    ].map((item) => [item.code, item])
                  ).values()
                ).map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="onboarding__choice">
              <input
                type="radio"
                name="onboarding-method"
                checked={method === "scratch"}
                onChange={() => setMethod("scratch")}
              />
              <span>
                <strong>{t("Start from scratch", "Zaczynam od zera")}</strong>
                <small>
                  {t(
                    "Fill in each section with short prompts.",
                    "Uzupełnij kolejne sekcje z pomocą wskazówek."
                  )}
                </small>
              </span>
            </label>
            <label className="onboarding__choice">
              <input
                type="radio"
                name="onboarding-method"
                checked={method === "import"}
                onChange={() => setMethod("import")}
              />
              <span>
                <strong>{t("Import my CV", "Importuję moje CV")}</strong>
                <small>
                  {t(
                    "Upload your file, check the imported details and fill in anything missing.",
                    "Wgraj plik, sprawdź odczytane dane i uzupełnij brakujące informacje."
                  )}
                </small>
              </span>
            </label>
            {method === "import" ? props.importControl : null}
            {method === "import" && props.imported ? (
              <p role="status">
                {t(
                  "Import applied. Continue to check each section.",
                  "Dane z importu dodane. Przejdź dalej, aby sprawdzić sekcje."
                )}
              </p>
            ) : null}
          </fieldset>
        ) : null}

        {!finished && section ? (
          <>
            <p className="onboarding__hint">
              {step >= 8
                ? t(
                    "Optional. Add what is relevant, or continue to skip this section.",
                    "Opcjonalnie. Dodaj istotne informacje lub przejdź dalej, aby pominąć sekcję."
                  )
                : t(
                    "Add the details you want in your CV. You can edit them later.",
                    "Dodaj informacje, które chcesz umieścić w CV. Możesz je później zmienić."
                  )}
            </p>
            <fieldset className="onboarding__form resume-editor-workspace" disabled={disabled}>
              {props.form}
            </fieldset>
          </>
        ) : null}

        {!finished && step === ONBOARDING_REVIEW_STEP ? (
          <>
            <p>
              {t(
                "This preview uses your selected professional summary and completed entries. Check the information before sharing.",
                "Podgląd zawiera wybrane podsumowanie zawodowe i uzupełnione wpisy. Sprawdź dane przed udostępnieniem."
              )}
            </p>
            <div className="onboarding__review-links">
              {ONBOARDING_SECTIONS.map((id, index) => (
                <button
                  className="button button--ghost button--small"
                  type="button"
                  disabled={disabled}
                  key={id}
                  onClick={() => go(index + 2)}
                >
                  {TITLES[uiLanguage][index + 2]}
                </button>
              ))}
            </div>
            <div className="onboarding__preview">{props.preview}</div>
          </>
        ) : null}

        {!finished && step === ONBOARDING_PUBLISH_STEP ? (
          <>
            <p>
              {t(
                "Create your first saved CV and a link you can send immediately? It will appear in your dashboard.",
                "Utworzyć pierwsze zapisane CV z linkiem, który możesz od razu wysłać? CV pojawi się w dashboardzie."
              )}
            </p>
            <p className="onboarding__hint">
              {t(
                "Anyone with the link can view this CV. Search engine indexing will be disabled. Your Master CV stays private.",
                "Każda osoba posiadająca link będzie mogła zobaczyć to CV. Indeksowanie w wyszukiwarkach będzie wyłączone. Master CV pozostanie prywatne."
              )}
            </p>
            {!isFirstCvReady(resume) ? (
              <p role="status">
                {t(
                  "Add your name and a professional summary before creating a link. You can also save and finish without publishing.",
                  "Przed utworzeniem linku uzupełnij imię lub nazwisko oraz podsumowanie zawodowe. Możesz też zakończyć bez publikacji."
                )}
              </p>
            ) : null}
          </>
        ) : null}

        {finished ? (
          <div className="stack">
            <p>
              {publicPath
                ? t(
                    "Your first CV is saved in your dashboard. Copy the link to send it.",
                    "Pierwsze CV jest zapisane w dashboardzie. Skopiuj link, aby je wysłać."
                  )
                : props.testRunId ? t(
                    "The test is complete. No public CV was created. You can start another test in account settings.",
                    "Test został zakończony. Nie utworzono publicznego CV. Kolejny test możesz uruchomić w ustawieniach konta."
                  ) : t(
                    "You can create a CV with a link from your dashboard whenever you are ready.",
                    "Kiedy zechcesz, utworzysz CV z linkiem w dashboardzie."
                  )}
            </p>
            {publicPath ? (
              <>
                <label>
                  {t("CV link", "Link do CV")}
                  <input
                    readOnly
                    value={
                      typeof window === "undefined"
                        ? publicPath
                        : new URL(publicPath, window.location.origin).href
                    }
                    onFocus={(event) => event.target.select()}
                  />
                </label>
                <div className="actions-row">
                  <button
                    className="button button--primary"
                    type="button"
                    onClick={() => void copyLink()}
                  >
                    {copied ? t("Copied", "Skopiowano") : t("Copy link", "Kopiuj link")}
                  </button>
                  <Link
                    className="button button--ghost"
                    href={publicPath}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("Open CV", "Otwórz CV")}
                  </Link>
                </div>
              </>
            ) : null}
            <Link className="button button--primary" href="/dashboard">
              {t("Go to dashboard", "Przejdź do dashboardu")}
            </Link>
            {props.testRunId ? <Link className="button button--ghost" href="/settings">{t("Testing settings", "Ustawienia testowania")}</Link> : null}
          </div>
        ) : (
          <footer className="onboarding__footer">
            <p>
              {t(
                "Your entries are saved to your account when you change steps or finish later.",
                "Dane zapisujemy na Twoim koncie przy zmianie planszy lub wybraniu „Dokończę później”."
              )}
            </p>
            <div className="onboarding__actions">
              <button
                className="button button--ghost"
                type="button"
                disabled={disabled}
                onClick={() => {
                  void run(async () => {
                    if (step >= 2 || props.imported) await props.onSave();
                    await progress(step, "paused");
                    window.location.assign("/dashboard");
                  });
                }}
              >
                {t("Finish later", "Dokończę później")}
              </button>
              <div className="actions-row">
                {step > 0 ? (
                  <button
                    className="button button--ghost"
                    type="button"
                    disabled={disabled}
                    onClick={() => go(step - 1)}
                  >
                    {t("Back", "Wstecz")}
                  </button>
                ) : null}
                {step === ONBOARDING_PUBLISH_STEP ? (
                  <>
                    <button
                      className="button button--ghost"
                      type="button"
                      disabled={disabled}
                      onClick={() => finish(false)}
                    >
                      {t("Not now", "Później")}
                    </button>
                    <button
                      className="button button--primary"
                      type="button"
                      disabled={disabled || !isFirstCvReady(resume)}
                      onClick={() => finish(true)}
                    >
                      {busy
                        ? t("Saving…", "Zapisywanie…")
                        : t("Yes, create my CV with a link", "Tak, utwórz CV z linkiem")}
                    </button>
                  </>
                ) : (
                  <button
                    className="button button--primary"
                    type="button"
                    disabled={disabled || (step === 1 && method === "import" && !props.imported)}
                    onClick={() => go(step + 1)}
                  >
                    {busy
                      ? t("Saving…", "Zapisywanie…")
                      : step === 0
                        ? t("Let’s begin", "Zaczynamy")
                        : step >= 8 && step < ONBOARDING_REVIEW_STEP
                          ? t("Continue / skip", "Dalej / pomiń")
                          : t("Continue", "Dalej")}
                  </button>
                )}
              </div>
            </div>
          </footer>
        )}
      </div>
    </section>
  );
}
