import { useI18n } from "../i18n/context";
import { PageMenu } from "./PageMenu";
import "./construction.css";

export function AboutPage() {
  const { t } = useI18n();

  return (
    <div className="page-shell">
      <header className="app-header">
        <PageMenu />
      </header>
      <div className="page">
        <h1>{t("about.title")}</h1>
        <p className="page-placeholder">{t("about.placeholder")}</p>
      </div>
    </div>
  );
}
