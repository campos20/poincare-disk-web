import { useI18n } from "../i18n/context";
import { PageMenu } from "./PageMenu";
import { useDocumentMeta } from "./useDocumentMeta";
import "./construction.css";

export function AboutPage() {
  const { t } = useI18n();
  useDocumentMeta("seo.about.title", "seo.about.description");

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
