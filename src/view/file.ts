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

import type { Construction, Entity, EntityId } from "../engine";

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

function isEntityStyle(v: Record<string, unknown>): boolean {
  return (
    (v.color === null || typeof v.color === "string") &&
    typeof v.hidden === "boolean"
  );
}

/** `ref` is a string id that resolves to some entity in `entities`. */
function refOk(entities: Record<string, unknown>, ref: unknown): boolean {
  return typeof ref === "string" && ref in entities;
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
    typeof raw.nextPointIndex !== "number"
  ) {
    return false;
  }
  const entities = raw.entities;
  for (const id of raw.order) {
    if (!(id in entities)) return false;
  }
  return Object.entries(entities).every(([id, entity]) =>
    isValidEntity(entity, id, entities),
  );
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
    typeof data.version !== "number" ||
    !isValidConstruction(data.construction)
  ) {
    throw new ConstructionFileError(
      "File is not a Poincaré disk construction.",
    );
  }
  return data.construction;
}
