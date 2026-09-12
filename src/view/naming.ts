/**
 * Display names for entities. Presentation only — the engine itself has no
 * concept of names, only ids (see tools.ts for the same split with tool
 * labels). Points get GeoGebra-style capital names (A, B, … Z, A1, B1, …)
 * derived from each point's `nameIndex` — its fixed rank among points ever
 * created, assigned once at creation time (see `PointEntity`'s doc
 * comment) — so deleting an earlier point never renames the ones after
 * it. Other entities are identified by the points that define them.
 */

import type { Construction, Entity, EntityId } from "../engine";
import { allPoints } from "../engine";

const ALPHABET_SIZE = 26;

/** The nth point name: A, B, … Z, A1, B1, … Z1, A2, … */
export function pointName(index: number): string {
  const letter = String.fromCharCode(65 + (index % ALPHABET_SIZE));
  const generation = Math.floor(index / ALPHABET_SIZE);
  return generation === 0 ? letter : `${letter}${generation}`;
}

/** The nth angle's reference label — angle1, angle2, … (1-based, since
 * "angle0" reads oddly) — for typing into an `AngleExpression` formula;
 * stable via `PointsAngle`/`CurvesAngle`'s own `index`, same
 * never-renumbered convention as `pointName`. */
export function angleLabel(index: number): string {
  return `angle${index + 1}`;
}

/** Every angle's reference label, keyed by id — `parseAngleExpression`
 * inverts this to resolve identifiers back to entity ids. */
export function angleLabels(
  construction: Construction,
): ReadonlyMap<EntityId, string> {
  const labels = new Map<EntityId, string>();
  for (const id of construction.order) {
    const e = construction.entities[id];
    if (e.kind === "angle") labels.set(id, angleLabel(e.index));
  }
  return labels;
}

/** Every point's display name, keyed by id, derived from its `nameIndex`. */
export function pointNames(
  construction: Construction,
): ReadonlyMap<EntityId, string> {
  const names = new Map<EntityId, string>();
  allPoints(construction).forEach((p) =>
    names.set(p.id, pointName(p.nameIndex)),
  );
  return names;
}

/** The point ids that define an entity, in display order. */
export function definingPoints(entity: Entity): readonly EntityId[] {
  switch (entity.kind) {
    case "point":
    case "intersection":
    case "midpoint":
      return [entity.id];
    case "segment":
    case "line":
      return [entity.a, entity.b];
    case "circle":
      return [entity.center, entity.thru];
    case "angle":
      // "points" mode names cleanly as e.g. "Angle ABC" (vertex in the
      // middle); "curves" mode has no natural point basis — its own two
      // curve ids aren't point ids — so it falls back to a bare "Angle".
      return entity.mode === "points"
        ? [entity.a, entity.vertex, entity.b]
        : [];
    case "expression":
      // Named by its formula text instead (ObjectPanel's objectLabel) —
      // no defining points at all.
      return [];
  }
}
