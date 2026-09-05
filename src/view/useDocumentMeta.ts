import { useEffect } from "react";
import { useI18n } from "../i18n/context";
import type { MessageKey } from "../i18n/messages";

function setAttr(selector: string, attr: string, value: string): void {
  document.querySelector(selector)?.setAttribute(attr, value);
}

/**
 * Sets the document title, description, and social-preview tags from i18n
 * message keys, so each route's metadata tracks the active locale.
 * index.html's static tags are the ones non-JS crawlers and social-media
 * link previews actually see — this only refines them for clients that
 * execute JS (Google's renderer included), and for the browser tab/bookmark
 * title, which matters regardless of SEO.
 */
export function useDocumentMeta(
  titleKey: MessageKey,
  descriptionKey: MessageKey,
): void {
  const { t } = useI18n();
  useEffect(() => {
    const title = t(titleKey);
    const description = t(descriptionKey);
    document.title = title;
    setAttr('meta[name="description"]', "content", description);
    setAttr('meta[property="og:title"]', "content", title);
    setAttr('meta[property="og:description"]', "content", description);
    setAttr('meta[property="og:url"]', "content", window.location.href);
    setAttr('link[rel="canonical"]', "href", window.location.href);
    setAttr('meta[name="twitter:title"]', "content", title);
    setAttr('meta[name="twitter:description"]', "content", description);
  }, [t, titleKey, descriptionKey]);
}
