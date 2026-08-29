import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Info, Settings, Shapes } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useI18n } from "../i18n/context";
import type { MessageKey } from "../i18n/messages";

interface PageEntry {
  readonly to: "/" | "/about" | "/config";
  readonly icon: LucideIcon;
  readonly label: MessageKey;
}

const PAGES: readonly PageEntry[] = [
  { to: "/", icon: Shapes, label: "nav.construction" },
  { to: "/about", icon: Info, label: "nav.about" },
  { to: "/config", icon: Settings, label: "nav.config" },
];

/** Collapsed page switcher, styled and behaving like Toolbar's tool-group
 * dropdowns so it reads as part of the same menu rather than a second bar. */
export function PageMenu() {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = PAGES.find((p) => p.to === pathname) ?? PAGES[0];
  const CurrentIcon = current.icon;

  useEffect(() => {
    if (!open) return;
    const closeIfOutside = (e: PointerEvent) => {
      const target = e.target;
      if (
        rootRef.current &&
        target instanceof Node &&
        !rootRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeIfOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeIfOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="tool-group" ref={rootRef}>
      <button
        type="button"
        className="tool-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("nav.aria")}
        title={t("nav.aria")}
        onClick={() => setOpen((o) => !o)}
      >
        <CurrentIcon size={16} aria-hidden />
        <span>{t(current.label)}</span>
        <ChevronDown className="tool-group-caret" size={12} aria-hidden />
      </button>
      {open && (
        <div className="tool-menu" role="menu" aria-label={t("nav.aria")}>
          {PAGES.map((page) => {
            const Icon = page.icon;
            const active = page.to === current.to;
            return (
              <Link
                key={page.to}
                to={page.to}
                role="menuitem"
                className={active ? "tool-menu-item active" : "tool-menu-item"}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <Icon size={16} aria-hidden />
                <span>{t(page.label)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
