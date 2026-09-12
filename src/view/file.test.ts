import { describe, expect, it } from "vitest";
import {
  addAngleExpression,
  addFreePoint,
  addPointsAngle,
  addSegment,
  addIntersectionPoint,
  emptyConstruction,
} from "../engine";
import type { ExpressionNode } from "../engine";
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

function sampleConstructionWithExpression() {
  let c = emptyConstruction();
  const p1 = addFreePoint(c, 0, 0);
  c = p1.construction;
  const p2 = addFreePoint(c, 0.5, 0);
  c = p2.construction;
  const p3 = addFreePoint(c, 0, 0.5);
  c = p3.construction;
  const angle = addPointsAngle(c, p1.id, p2.id, p3.id);
  c = angle.construction;
  const ast: ExpressionNode = {
    kind: "mul",
    left: { kind: "const", value: 2 },
    right: { kind: "ref", id: angle.id },
  };
  return addAngleExpression(c, "2*angle1", ast).construction;
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

  it("round-trips an angle and an angle expression", () => {
    const construction = sampleConstructionWithExpression();
    const parsed = parseConstructionFile(serializeConstruction(construction));
    expect(parsed).toEqual(construction);
  });

  it("rejects an expression node referencing a nonexistent entity", () => {
    const construction = sampleConstructionWithExpression();
    const text = serializeConstruction(construction);
    const data = JSON.parse(text);
    const [exprId] = Object.entries(data.construction.entities).find(
      ([, e]) => (e as { kind: string }).kind === "expression",
    ) as [string, { ast: { right: { id: string } } }];
    data.construction.entities[exprId].ast.right.id = "e999";
    expect(() => parseConstructionFile(JSON.stringify(data))).toThrow(
      ConstructionFileError,
    );
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
