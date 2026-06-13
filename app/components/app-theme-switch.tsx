"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_APP_THEME } from "../lib/app-theme";
import {
  APP_THEME_COOKIE_MAX_AGE,
  APP_THEME_COOKIE_NAME,
  ENABLED_APP_THEMES,
  getAppThemeMeta,
  getNextAppTheme,
  resolveAppTheme,
  type AppTheme,
} from "../lib/app-theme";

const APP_THEME_TRANSITION_MS = 200;

type DocumentWithViewTransition = Document & {
  startViewTransition?: (update: () => void) => {
    finished: Promise<void>;
  };
};

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 2.5v2.6M12 18.9v2.6M21.5 12h-2.6M5.1 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1 5.3 5.3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M15.8 3.7a8.7 8.7 0 1 0 4.5 15.9A9.2 9.2 0 0 1 9.6 4.9a9.6 9.6 0 0 1 6.2-1.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  initialTheme?: AppTheme;
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

export default function AppThemeSwitch({ initialTheme = DEFAULT_APP_THEME }: Props) {
  const [theme, setTheme] = useState<AppTheme>(() => resolveAppTheme(initialTheme));
  const transitionTimerRef = useRef<number | null>(null);
  const canToggle = ENABLED_APP_THEMES.length > 1;
  const isDarkTheme = theme === "dark";
  const nextTheme = getNextAppTheme(theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    return () => {
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

    const nextResolvedTheme = nextTheme;
    const shouldAnimate = beginThemeTransition();
    const viewTransitionDocument = document as DocumentWithViewTransition;
    const commitThemeChange = () => {
      setTheme(nextResolvedTheme);
      applyTheme(nextResolvedTheme);
      persistTheme(nextResolvedTheme);
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
      className={`app-theme-switch app-theme-switch--${theme}`}
      role="switch"
      aria-checked={theme === "light"}
      aria-label={`Application theme: ${theme}. Switch to ${nextTheme} theme.`}
      onClick={handleToggle}
      disabled={!canToggle}
    >
      <span className="app-theme-switch__track" aria-hidden="true">
        <span className="app-theme-switch__thumb">
          <span className="app-theme-switch__icon">
            {isDarkTheme ? <MoonIcon /> : <SunIcon />}
          </span>
        </span>
      </span>
    </button>
  );
}
