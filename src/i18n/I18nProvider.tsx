import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { I18nContext } from "./context";
import type { I18n } from "./context";
import { MESSAGES } from "./messages";
import type { Locale } from "./messages";

function detectLocale(): Locale {
  if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("pt")) {
    return "pt";
  }
  return "en";
}

export function I18nProvider({ children }: { readonly children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(detectLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18n>(
    () => ({ locale, setLocale, t: (key) => MESSAGES[locale][key] }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
