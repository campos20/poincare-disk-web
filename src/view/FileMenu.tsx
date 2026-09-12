import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Eraser, FileUp, FolderOpen, Save } from "lucide-react";
import { emptyConstruction } from "../engine";
import type { Construction } from "../engine";
import { useI18n } from "../i18n/context";
import {
  ConstructionFileError,
  parseConstructionFile,
  serializeConstruction,
} from "./file";

/** Triggers a browser "Save As" for `text` as a local file named `filename`. */
function downloadTextFile(filename: string, text: string): void {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  readonly construction: Construction;
  readonly onLoad: (construction: Construction) => void;
}

/** Header dropdown for saving the current construction to a local .json
 * file, or loading one back in — styled and behaving like PageMenu/Toolbar's
 * dropdowns so it reads as part of the same menu bar. */
export function FileMenu({ construction, onLoad }: Props) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);

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

  const handleSave = () => {
    setOpen(false);
    downloadTextFile("construction.json", serializeConstruction(construction));
  };

  const handleOpen = () => {
    setOpen(false);
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    setOpen(false);
    if (window.confirm(t("file.confirmClear"))) {
      onLoad(emptyConstruction());
    }
  };

  const handleFileChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      onLoad(parseConstructionFile(await file.text()));
    } catch (err) {
      if (err instanceof ConstructionFileError) {
        window.alert(t("file.invalid"));
      } else {
        throw err;
      }
    }
  };

  return (
    <div className="tool-group" ref={rootRef}>
      <button
        type="button"
        className="tool-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("file.menu.aria")}
        title={t("file.menu.aria")}
        onClick={() => setOpen((o) => !o)}
      >
        <FolderOpen size={16} aria-hidden />
        <span>{t("file.menu")}</span>
      </button>
      {open && (
        <div className="tool-menu" role="menu" aria-label={t("file.menu.aria")}>
          <button
            type="button"
            role="menuitem"
            className="tool-menu-item"
            onClick={handleSave}
          >
            <Save size={16} aria-hidden />
            <span>{t("file.save")}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="tool-menu-item"
            onClick={handleOpen}
          >
            <FileUp size={16} aria-hidden />
            <span>{t("file.open")}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="tool-menu-item"
            onClick={handleClear}
          >
            <Eraser size={16} aria-hidden />
            <span>{t("file.clear")}</span>
          </button>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          void handleFileChosen(e);
        }}
      />
    </div>
  );
}
