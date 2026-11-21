"use client";

import { useEffect, useRef, useState } from "react";
import {
  APP_THEME_COOKIE_MAX_AGE,
  APP_THEME_COOKIE_NAME,
  DEFAULT_APP_THEME,
  ENABLED_APP_THEMES,
  getAppThemeMeta,
  getNextAppTheme,
  readStoredAppTheme,
  type AppTheme,
} from "../lib/app-theme";
import { useAppI18n } from "./app-i18n-provider";

const APP_THEME_TRANSITION_MS = 200;

type DocumentWithViewTransition = Document & {
  startViewTransition?: (update: () => void) => {
    finished: Promise<void>;
  };
};

function ThemeIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" />
    </svg>
  );
}

type Props = {
  /** The stored choice; null while the portal follows the system theme. */
  initialTheme: AppTheme | null;
};

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  const body = document.body;
  const themeMeta = getAppThemeMeta(theme);

  root.dataset.appTheme = theme;
  body.dataset.appTheme = theme;
  root.style.colorScheme = themeMeta.colorScheme;
  body.style.colorScheme = themeMeta.colorScheme;
}

function persistTheme(theme: AppTheme) {
  document.cookie = `${APP_THEME_COOKIE_NAME}=${theme}; Path=/; Max-Age=${APP_THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
}

/** The theme on screen: the stored choice, or the one app-theme-script.tsx took from the system. */
function readDocumentTheme(): AppTheme {
  return readStoredAppTheme(document.documentElement.dataset.appTheme) ?? DEFAULT_APP_THEME;
}

export default function AppThemeSwitch({ initialTheme }: Props) {
  const { dictionary } = useAppI18n();
  const [theme, setTheme] = useState<AppTheme>(initialTheme ?? DEFAULT_APP_THEME);
  const transitionTimerRef = useRef<number | null>(null);
  const canToggle = ENABLED_APP_THEMES.length > 1;
  const nextTheme = getNextAppTheme(theme);

  useEffect(() => {
    // Mirror the document: without a stored choice its theme comes from the system and follows OS changes.
    const sync = () => setTheme(readDocumentTheme());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-app-theme"] });
    return () => {
      observer.disconnect();
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  function clearThemeTransitionState() {
    const root = document.documentElement;
    const body = document.body;

    delete root.dataset.themeTransition;
    delete body.dataset.themeTransition;

    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function beginThemeTransition() {
    if (prefersReducedMotion()) {
      clearThemeTransitionState();
      return false;
    }

    const root = document.documentElement;
    const body = document.body;

    root.dataset.themeTransition = "active";
    body.dataset.themeTransition = "active";

    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }

    transitionTimerRef.current = window.setTimeout(() => {
      clearThemeTransitionState();
    }, APP_THEME_TRANSITION_MS);

    return true;
  }

  function handleToggle() {
    if (!canToggle) {
      return;
    }

    const nextResolvedTheme = getNextAppTheme(readDocumentTheme());
    const shouldAnimate = beginThemeTransition();
    const viewTransitionDocument = document as DocumentWithViewTransition;
    const commitThemeChange = () => {
      persistTheme(nextResolvedTheme);
      applyTheme(nextResolvedTheme);
    };

    if (shouldAnimate && typeof viewTransitionDocument.startViewTransition === "function") {
      viewTransitionDocument.startViewTransition(() => {
        commitThemeChange();
      });
      return;
    }

    commitThemeChange();
  }

  return (
    <button
      type="button"
      className="ocv-icon-btn ocv-topbar__theme"
      role="switch"
      aria-checked={theme === "light"}
      aria-label={dictionary.theme.aria_label.replace("{theme}", theme).replace("{nextTheme}", nextTheme)}
      onClick={handleToggle}
      disabled={!canToggle}
    >
      <ThemeIcon />
    </button>
  );
}
