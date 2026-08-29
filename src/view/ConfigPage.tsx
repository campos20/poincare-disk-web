import { useI18n } from "../i18n/context";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { PageMenu } from "./PageMenu";
import "./construction.css";

export function ConfigPage() {
  const { t } = useI18n();

  return (
    <div className="page-shell">
      <header className="app-header">
        <PageMenu />
      </header>
      <div className="page">
        <h1>{t("config.title")}</h1>
        <section className="config-section">
          <h2>{t("config.language")}</h2>
          <LanguageSwitcher />
        </section>
      </div>
    </div>
  );
}
