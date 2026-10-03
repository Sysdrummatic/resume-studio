"use client";

import { createContext, useContext } from "react";
import type { AppI18nContextValue } from "../i18n/types";

const AppI18nContext = createContext<AppI18nContextValue | null>(null);

export function AppI18nProvider({ value, children }: { value: AppI18nContextValue; children: React.ReactNode }) {
  return <AppI18nContext.Provider value={value}>{children}</AppI18nContext.Provider>;
}

export function useAppI18n(): AppI18nContextValue {
  const value = useContext(AppI18nContext);
  if (!value) {
    throw new Error("useAppI18n must be used inside AppI18nProvider.");
  }
  return value;
}
