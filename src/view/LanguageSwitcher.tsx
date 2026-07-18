import { useI18n } from "../i18n/context";
import { LOCALES } from "../i18n/messages";

const NAMES = { en: "English", pt: "Português" } as const;

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="lang-switch" role="group" aria-label={t("language.aria")}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          className={l === locale ? "lang-button active" : "lang-button"}
          aria-pressed={l === locale}
          title={NAMES[l]}
          onClick={() => setLocale(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
