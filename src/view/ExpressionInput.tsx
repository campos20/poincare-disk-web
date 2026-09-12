import { useState } from "react";
import { Plus } from "lucide-react";
import type { Construction, EntityId, ExpressionNode } from "../engine";
import { useI18n } from "../i18n/context";
import { ExpressionError, parseAngleExpression } from "./expressions";
import { angleLabels } from "./naming";

interface Props {
  readonly construction: Construction;
  readonly onAdd: (formula: string, ast: ExpressionNode) => void;
}

/** Object panel's footer input for building an `AngleExpression` — a
 * computed value combining other angles' measurements by arithmetic (e.g.
 * "2*angle1 + angle2"). Owns its own text/error state rather than routing
 * through the app reducer: parsing is validation of free-form user input,
 * same as FileMenu's file-content check, so the error belongs right next to
 * where it was typed rather than round-tripping through global state. */
export function ExpressionInput({ construction, onAdd }: Props) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const formula = text.trim();
    if (!formula) return;
    const labelToId = new Map<string, EntityId>(
      Array.from(angleLabels(construction), ([id, label]) => [label, id]),
    );
    try {
      const ast = parseAngleExpression(formula, labelToId);
      onAdd(formula, ast);
      setText("");
      setError(null);
    } catch (err) {
      if (!(err instanceof ExpressionError)) throw err;
      setError(err.message);
    }
  };

  return (
    <div className="expression-input">
      <div className="expression-input-row">
        <input
          type="text"
          className="expression-input-field"
          placeholder={t("expression.placeholder")}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          aria-label={t("expression.aria")}
        />
        <button
          type="button"
          className="icon-button"
          aria-label={t("expression.add")}
          title={t("expression.add")}
          onClick={submit}
        >
          <Plus size={14} aria-hidden />
        </button>
      </div>
      {error && (
        <div className="expression-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
