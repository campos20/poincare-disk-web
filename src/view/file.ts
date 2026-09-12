/**
 * Save/load file format for a `Construction`. Pure parsing/validation only
 * (no DOM/File APIs) so it's testable under vitest's node environment —
 * FileMenu.tsx wraps this with the actual browser download/file-read calls.
 *
 * A `Construction` (engine/types.ts) is already plain JSON-serializable data
 * (entities keyed by id, an order array, two counters), so there's no
 * separate on-disk schema to maintain — `parseConstructionFile` just checks
 * that untrusted file content actually has that shape before it's allowed
 * to replace the live construction.
 */

import type { Construction, Entity, EntityId, ExpressionNode } from "../engine";

export const CONSTRUCTION_FILE_FORMAT = "poincare-disk-web/construction";
export const CONSTRUCTION_FILE_VERSION = 1;

interface ConstructionFile {
  readonly format: typeof CONSTRUCTION_FILE_FORMAT;
  readonly version: number;
  readonly construction: Construction;
}

export function serializeConstruction(construction: Construction): string {
  const file: ConstructionFile = {
    format: CONSTRUCTION_FILE_FORMAT,
    version: CONSTRUCTION_FILE_VERSION,
    construction,
  };
  return JSON.stringify(file, null, 2);
}

/** Thrown by `parseConstructionFile` when `text` isn't a file this app saved. */
export class ConstructionFileError extends Error {}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** `key in obj` also matches inherited `Object.prototype` properties (e.g.
 * "toString"), so a hand-edited file naming one of those as an id would
 * pass validation and then be read back as that inherited function instead
 * of an entity. Every id lookup below goes through this instead. */
function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function isEntityStyle(v: Record<string, unknown>): boolean {
  return (
    (v.color === null || typeof v.color === "string") &&
    typeof v.hidden === "boolean"
  );
}

/** `ref` is a string id that resolves to some entity in `entities`. */
function refOk(entities: Record<string, unknown>, ref: unknown): boolean {
  return typeof ref === "string" && hasOwn(entities, ref);
}

function isValidEntity(
  raw: unknown,
  id: EntityId,
  entities: Record<string, unknown>,
): raw is Entity {
  if (!isRecord(raw) || !isEntityStyle(raw)) return false;
  if (raw.id !== id) return false;
  switch (raw.kind) {
    case "point":
      return (
        typeof raw.x === "number" &&
        typeof raw.y === "number" &&
        typeof raw.nameIndex === "number"
      );
    case "intersection":
      return (
        typeof raw.x === "number" &&
        typeof raw.y === "number" &&
        typeof raw.nameIndex === "number" &&
        typeof raw.exists === "boolean" &&
        (raw.branch === 0 || raw.branch === 1) &&
        refOk(entities, raw.a) &&
        refOk(entities, raw.b)
      );
    case "midpoint":
      return (
        typeof raw.x === "number" &&
        typeof raw.y === "number" &&
        typeof raw.nameIndex === "number" &&
        typeof raw.exists === "boolean" &&
        refOk(entities, raw.a) &&
        refOk(entities, raw.b)
      );
    case "segment":
    case "line":
      return refOk(entities, raw.a) && refOk(entities, raw.b);
    case "circle":
      return refOk(entities, raw.center) && refOk(entities, raw.thru);
    case "angle":
      if (typeof raw.index !== "number") return false;
      if (raw.mode === "points") {
        return (
          refOk(entities, raw.a) &&
          refOk(entities, raw.vertex) &&
          refOk(entities, raw.b)
        );
      }
      if (raw.mode === "curves") {
        return refOk(entities, raw.a) && refOk(entities, raw.b);
      }
      return false;
    case "expression":
      return (
        typeof raw.formula === "string" &&
        isValidExpressionNode(raw.ast, entities)
      );
    default:
      return false;
  }
}

function isValidExpressionNode(
  raw: unknown,
  entities: Record<string, unknown>,
): raw is ExpressionNode {
  if (!isRecord(raw)) return false;
  switch (raw.kind) {
    case "const":
      return typeof raw.value === "number";
    case "ref": {
      // A formula can only ever reference an angle (view/expressions.ts's
      // parser resolves identifiers against angle labels only) — a
      // hand-edited file pointing this at, say, a point would otherwise
      // load "successfully" and just silently evaluate to null forever.
      if (!refOk(entities, raw.id)) return false;
      const target = entities[raw.id as string];
      return isRecord(target) && target.kind === "angle";
    }
    case "neg":
      return isValidExpressionNode(raw.arg, entities);
    case "add":
    case "sub":
    case "mul":
    case "div":
      return (
        isValidExpressionNode(raw.left, entities) &&
        isValidExpressionNode(raw.right, entities)
      );
    default:
      return false;
  }
}

function isValidConstruction(raw: unknown): raw is Construction {
  if (!isRecord(raw)) return false;
  if (!isRecord(raw.entities)) return false;
  if (
    !Array.isArray(raw.order) ||
    !raw.order.every((x) => typeof x === "string")
  ) {
    return false;
  }
  if (
    typeof raw.nextId !== "number" ||
    typeof raw.nextPointIndex !== "number" ||
    typeof raw.nextAngleIndex !== "number"
  ) {
    return false;
  }

  const entities = raw.entities;
  const ids = Object.keys(entities);

  // `order` must be exactly the entity keys, each exactly once — not just a
  // subset of them — or a file can carry a valid entity that every consumer
  // (ObjectPanel, ConstructionCanvas, …) silently drops, since they all
  // render by walking `order` rather than `entities` directly.
  if (raw.order.length !== ids.length) return false;
  if (new Set(raw.order).size !== raw.order.length) return false;
  for (const id of raw.order) {
    if (!hasOwn(entities, id)) return false;
  }

  // Every id this app ever generates is "e<n>" (construction.ts's
  // `withEntity`) — reject anything else instead of accepting a shape this
  // app could never have produced, and use the ids actually present to
  // check `nextId` below rather than trusting it blindly: a stale/edited
  // `nextId` that isn't past every existing id would make the next add
  // reuse — and silently overwrite — an existing entity.
  let maxEntityIdNum = 0;
  for (const id of ids) {
    const m = /^e([1-9]\d*)$/.exec(id);
    if (!m) return false;
    maxEntityIdNum = Math.max(maxEntityIdNum, Number(m[1]));
  }
  if (raw.nextId <= maxEntityIdNum) return false;

  // Same reasoning for `nextPointIndex`/`nextAngleIndex`: past every
  // existing nameIndex/index, or the next point/angle created would collide
  // with an existing one's display name (view/naming.ts's `pointName`/
  // `angleLabel` assume every index is unique).
  let maxPointIndex = -1;
  let maxAngleIndex = -1;
  for (const [id, entity] of Object.entries(entities)) {
    if (!isValidEntity(entity, id, entities)) return false;
    if (
      entity.kind === "point" ||
      entity.kind === "intersection" ||
      entity.kind === "midpoint"
    ) {
      maxPointIndex = Math.max(maxPointIndex, entity.nameIndex);
    } else if (entity.kind === "angle") {
      maxAngleIndex = Math.max(maxAngleIndex, entity.index);
    }
  }
  if (raw.nextPointIndex <= maxPointIndex) return false;
  if (raw.nextAngleIndex <= maxAngleIndex) return false;

  return true;
}

/** Parse and validate previously-saved file content, throwing
 * `ConstructionFileError` if it isn't valid JSON or isn't a construction
 * this app saved. */
export function parseConstructionFile(text: string): Construction {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ConstructionFileError("File is not valid JSON.");
  }
  if (
    !isRecord(data) ||
    data.format !== CONSTRUCTION_FILE_FORMAT ||
    // No migration path exists yet, so a version this app didn't write
    // itself — older or newer — is rejected rather than assumed compatible.
    data.version !== CONSTRUCTION_FILE_VERSION ||
    !isValidConstruction(data.construction)
  ) {
    throw new ConstructionFileError(
      "File is not a Poincaré disk construction.",
    );
  }
  return data.construction;
}
