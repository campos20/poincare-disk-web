export const LOCALES = ["en", "pt"] as const;
export type Locale = (typeof LOCALES)[number];

const en = {
  "tool.select": "Select",
  "tool.point": "Point",
  "tool.segment": "Segment",
  "tool.line": "Line",
  "tool.circle": "Circle",
  "tool.intersect": "Intersect",
  "hint.select": "Drag a point to move it — everything built on it follows.",
  "hint.point": "Click anywhere to place a point.",
  "hint.segment.first": "Segment: click the first endpoint.",
  "hint.segment.second": "Segment: click the second endpoint.",
  "hint.line.first": "Line: click a first point.",
  "hint.line.second": "Line: click a second point.",
  "hint.circle.center": "Circle: click the center.",
  "hint.circle.thru": "Circle: click a point on the circle.",
  "hint.intersect.first": "Intersect: click a line, segment, or circle.",
  "hint.intersect.second":
    "Intersect: click the line, segment, or circle to cross it with.",
  "toolbar.aria": "Construction tools",
  "canvas.aria": "Construction canvas",
  "language.aria": "Language",
  "nav.aria": "Site navigation",
  "nav.construction": "Construction",
  "nav.about": "About",
  "nav.config": "Settings",
  "about.title": "About",
  "about.placeholder":
    "The hyperbolic geometry equations behind this construction will be documented here.",
  "config.title": "Settings",
  "config.language": "Language",
  "panel.title": "Objects",
  "panel.empty": "No objects yet.",
  "panel.expand": "Expand object panel",
  "panel.collapse": "Collapse object panel",
  "panel.hide": "Hide",
  "panel.show": "Show",
  "panel.delete": "Delete",
  "panel.colorReset": "Default color",
  "panel.undefined": "No current intersection",
  "object.segment": "Segment",
  "object.line": "Line",
  "object.circle": "Circle",
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
  "tool.intersect": "Interseção",
  "hint.select":
    "Arraste um ponto para movê-lo — tudo construído sobre ele acompanha.",
  "hint.point": "Clique em qualquer lugar para criar um ponto.",
  "hint.segment.first": "Segmento: clique na primeira extremidade.",
  "hint.segment.second": "Segmento: clique na segunda extremidade.",
  "hint.line.first": "Reta: clique no primeiro ponto.",
  "hint.line.second": "Reta: clique no segundo ponto.",
  "hint.circle.center": "Círculo: clique no centro.",
  "hint.circle.thru": "Círculo: clique em um ponto da circunferência.",
  "hint.intersect.first":
    "Interseção: clique em uma reta, segmento ou círculo.",
  "hint.intersect.second":
    "Interseção: clique na reta, segmento ou círculo para cruzar.",
  "toolbar.aria": "Ferramentas de construção",
  "canvas.aria": "Tela de construção",
  "language.aria": "Idioma",
  "nav.aria": "Navegação do site",
  "nav.construction": "Construção",
  "nav.about": "Sobre",
  "nav.config": "Configurações",
  "about.title": "Sobre",
  "about.placeholder":
    "As equações de geometria hiperbólica por trás desta construção serão documentadas aqui.",
  "config.title": "Configurações",
  "config.language": "Idioma",
  "panel.title": "Objetos",
  "panel.empty": "Nenhum objeto ainda.",
  "panel.expand": "Expandir painel de objetos",
  "panel.collapse": "Recolher painel de objetos",
  "panel.hide": "Ocultar",
  "panel.show": "Mostrar",
  "panel.delete": "Excluir",
  "panel.colorReset": "Cor padrão",
  "panel.undefined": "Sem interseção no momento",
  "object.segment": "Segmento",
  "object.line": "Reta",
  "object.circle": "Círculo",
};

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = { en, pt };
