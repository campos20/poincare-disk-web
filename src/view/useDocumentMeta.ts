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
    // Query strings and hash fragments (UTM params, etc.) would otherwise
    // produce a different canonical/og:url per visit for the same page.
    const url = window.location.origin + window.location.pathname;
    document.title = title;
    setAttr('meta[name="description"]', "content", description);
    setAttr('meta[property="og:title"]', "content", title);
    setAttr('meta[property="og:description"]', "content", description);
    setAttr('meta[property="og:url"]', "content", url);
    setAttr('link[rel="canonical"]', "href", url);
    setAttr('meta[name="twitter:title"]', "content", title);
    setAttr('meta[name="twitter:description"]', "content", description);
  }, [t, titleKey, descriptionKey]);
}
