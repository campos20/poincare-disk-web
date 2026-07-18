import { createContext, useContext } from "react";
import type { Locale, MessageKey } from "./messages";

export interface I18n {
  readonly locale: Locale;
  readonly setLocale: (locale: Locale) => void;
  readonly t: (key: MessageKey) => string;
}

export const I18nContext = createContext<I18n | null>(null);

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}
