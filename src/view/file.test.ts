import { describe, expect, it } from "vitest";
import {
  addFreePoint,
  addSegment,
  addIntersectionPoint,
  emptyConstruction,
} from "../engine";
import {
  ConstructionFileError,
  parseConstructionFile,
  serializeConstruction,
} from "./file";

function sampleConstruction() {
  let c = emptyConstruction();
  const a = addFreePoint(c, 0.1, 0.2);
  c = a.construction;
  const b = addFreePoint(c, -0.3, 0.1);
  c = b.construction;
  c = addSegment(c, a.id, b.id).construction;
  c = addIntersectionPoint(c, 0, 0, a.id, b.id, 0).construction;
  return c;
}

describe("serializeConstruction / parseConstructionFile", () => {
  it("round-trips a construction", () => {
    const construction = sampleConstruction();
    const parsed = parseConstructionFile(serializeConstruction(construction));
    expect(parsed).toEqual(construction);
  });

  it("round-trips an empty construction", () => {
    const construction = emptyConstruction();
    const parsed = parseConstructionFile(serializeConstruction(construction));
    expect(parsed).toEqual(construction);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseConstructionFile("not json")).toThrow(
      ConstructionFileError,
    );
  });

  it("rejects JSON that isn't a construction file", () => {
    expect(() => parseConstructionFile(JSON.stringify({ foo: "bar" }))).toThrow(
      ConstructionFileError,
    );
  });

  it("rejects a construction referencing a nonexistent point", () => {
    const construction = sampleConstruction();
    const text = serializeConstruction(construction);
    const data = JSON.parse(text);
    const [segmentId] = Object.entries(data.construction.entities).find(
      ([, e]) => (e as { kind: string }).kind === "segment",
    ) as [string, { a: string; b: string }];
    data.construction.entities[segmentId].b = "e999";
    expect(() => parseConstructionFile(JSON.stringify(data))).toThrow(
      ConstructionFileError,
    );
  });

  it("rejects a wrong format tag", () => {
    const construction = sampleConstruction();
    const text = serializeConstruction(construction);
    const data = JSON.parse(text);
    data.format = "something-else";
    expect(() => parseConstructionFile(JSON.stringify(data))).toThrow(
      ConstructionFileError,
    );
  });
});
