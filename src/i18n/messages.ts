export const LOCALES = ["en", "pt"] as const;
export type Locale = (typeof LOCALES)[number];

const en = {
  "tool.select": "Select",
  "tool.point": "Point",
  "tool.segment": "Segment",
  "tool.line": "Line",
  "tool.circle": "Circle",
  "hint.select": "Drag a point to move it — everything built on it follows.",
  "hint.point": "Click anywhere to place a point.",
  "hint.segment.first": "Segment: click the first endpoint.",
  "hint.segment.second": "Segment: click the second endpoint.",
  "hint.line.first": "Line: click a first point.",
  "hint.line.second": "Line: click a second point.",
  "hint.circle.center": "Circle: click the center.",
  "hint.circle.thru": "Circle: click a point on the circle.",
  "toolbar.aria": "Construction tools",
  "canvas.aria": "Construction canvas",
  "language.aria": "Language",
} satisfies Record<string, string>;

export type MessageKey = keyof typeof en;

// `Record<MessageKey, string>` makes TypeScript enforce key parity with `en`,
// so a missing or misspelled translation is a compile error, not a runtime hole.
const pt: Record<MessageKey, string> = {
  "tool.select": "Selecionar",
  "tool.point": "Ponto",
  "tool.segment": "Segmento",
  "tool.line": "Reta",
  "tool.circle": "Círculo",
  "hint.select": "Arraste um ponto para movê-lo — tudo construído sobre ele acompanha.",
  "hint.point": "Clique em qualquer lugar para criar um ponto.",
  "hint.segment.first": "Segmento: clique na primeira extremidade.",
  "hint.segment.second": "Segmento: clique na segunda extremidade.",
  "hint.line.first": "Reta: clique no primeiro ponto.",
  "hint.line.second": "Reta: clique no segundo ponto.",
  "hint.circle.center": "Círculo: clique no centro.",
  "hint.circle.thru": "Círculo: clique em um ponto da circunferência.",
  "toolbar.aria": "Ferramentas de construção",
  "canvas.aria": "Tela de construção",
  "language.aria": "Idioma",
};

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = { en, pt };
