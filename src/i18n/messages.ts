export const LOCALES = ["en", "pt"] as const;
export type Locale = (typeof LOCALES)[number];

const en = {
  "tool.select": "Select",
  "tool.point": "Point",
  "tool.segment": "Segment",
  "tool.line": "Line",
  "tool.circle": "Circle",
  "tool.intersect": "Intersect",
  "tool.midpoint": "Midpoint",
  "tool.angle": "Angle",
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
  "hint.midpoint.first": "Midpoint: click the first point.",
  "hint.midpoint.second": "Midpoint: click the second point.",
  "hint.angle.first":
    "Angle: click a point, or a line, segment, or circle.",
  "hint.angle.points.second": "Angle: click the vertex (the middle point).",
  "hint.angle.points.third": "Angle: click the second point.",
  "hint.angle.curves.second":
    "Angle: click the second line, segment, or circle.",
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
  "object.angle": "Angle",
  "seo.home.title":
    "Poincaré Disk Constructions — Interactive Hyperbolic Geometry",
  "seo.home.description":
    "Build points, segments, lines, circles, midpoints, and intersections inside the Poincaré disk model and explore non-Euclidean, hyperbolic geometry interactively, right in your browser.",
  "seo.about.title":
    "About the Poincaré Disk Model — Poincaré Disk Constructions",
  "seo.about.description":
    "The hyperbolic geometry and Poincaré disk model math behind this interactive non-Euclidean geometry construction tool.",
  "seo.config.title": "Settings — Poincaré Disk Constructions",
  "seo.config.description":
    "Change the language and other settings for the Poincaré Disk Constructions app.",
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
  "tool.midpoint": "Ponto médio",
  "tool.angle": "Ângulo",
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
  "hint.midpoint.first": "Ponto médio: clique no primeiro ponto.",
  "hint.midpoint.second": "Ponto médio: clique no segundo ponto.",
  "hint.angle.first":
    "Ângulo: clique em um ponto, ou em uma reta, segmento ou círculo.",
  "hint.angle.points.second": "Ângulo: clique no vértice (o ponto do meio).",
  "hint.angle.points.third": "Ângulo: clique no segundo ponto.",
  "hint.angle.curves.second":
    "Ângulo: clique na segunda reta, segmento ou círculo.",
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
  "object.angle": "Ângulo",
  "seo.home.title":
    "Construções no Disco de Poincaré — Geometria Hiperbólica Interativa",
  "seo.home.description":
    "Construa pontos, segmentos, retas, círculos, pontos médios e interseções dentro do modelo do disco de Poincaré e explore a geometria não euclidiana e hiperbólica de forma interativa, direto no navegador.",
  "seo.about.title":
    "Sobre o Modelo do Disco de Poincaré — Construções no Disco de Poincaré",
  "seo.about.description":
    "A matemática de geometria hiperbólica e do modelo do disco de Poincaré por trás desta ferramenta interativa de construções em geometria não euclidiana.",
  "seo.config.title": "Configurações — Construções no Disco de Poincaré",
  "seo.config.description":
    "Altere o idioma e outras configurações do aplicativo Construções no Disco de Poincaré.",
};

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = { en, pt };
