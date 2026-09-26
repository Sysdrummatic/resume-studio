"use client";

import { useEffect, useMemo, useState } from "react";
import type { AppTheme } from "../lib/app-theme";
import styles from "./open-civera-animation.module.css";

type Props = {
  locale: string;
  initialTheme: AppTheme;
  title: string;
};

function readDocumentTheme(fallback: AppTheme): AppTheme {
  if (typeof document === "undefined") return fallback;
  return document.documentElement.dataset.appTheme === "light" ? "light" : "dark";
}

export function buildAnimationSource(locale: string, theme: AppTheme): string {
  const normalizedLocale = locale === "pl" ? "pl" : "en";
  return `/animations/opencivera-animation.html?embedded=1&lang=${normalizedLocale}&theme=${theme}`;
}

export default function OpenCiVeraAnimation({ locale, initialTheme, title }: Props) {
  const [theme, setTheme] = useState<AppTheme>(initialTheme);

  useEffect(() => {
    const root = document.documentElement;
    const updateTheme = () => setTheme(readDocumentTheme(initialTheme));
    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["data-app-theme"] });
    return () => observer.disconnect();
  }, [initialTheme]);

  const source = useMemo(() => buildAnimationSource(locale, theme), [locale, theme]);

  return (
    <div className={styles.frame}>
      <iframe
        key={source}
        src={source}
        title={title}
        loading="lazy"
        sandbox="allow-scripts"
        className={styles.iframe}
      />
    </div>
  );
}
