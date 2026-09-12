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

  it("rejects a version other than the current one", () => {
    const construction = sampleConstruction();
    const text = serializeConstruction(construction);
    const data = JSON.parse(text);
    data.version = 2;
    expect(() => parseConstructionFile(JSON.stringify(data))).toThrow(
      ConstructionFileError,
    );
  });

  it("rejects an inherited-property id (prototype pollution via `order`)", () => {
    const construction = sampleConstruction();
    const text = serializeConstruction(construction);
    const data = JSON.parse(text);
    // "toString" isn't an own key of `entities`, only inherited from
    // Object.prototype — a naive `id in entities` check would accept it.
    data.construction.order.push("toString");
    expect(() => parseConstructionFile(JSON.stringify(data))).toThrow(
      ConstructionFileError,
    );
  });

  it("rejects an order that omits an existing entity", () => {
    const construction = sampleConstruction();
    const text = serializeConstruction(construction);
    const data = JSON.parse(text);
    data.construction.order.pop();
    expect(() => parseConstructionFile(JSON.stringify(data))).toThrow(
      ConstructionFileError,
    );
  });

  it("rejects a duplicate id in order", () => {
    const construction = sampleConstruction();
    const text = serializeConstruction(construction);
    const data = JSON.parse(text);
    data.construction.order.push(data.construction.order[0]);
    expect(() => parseConstructionFile(JSON.stringify(data))).toThrow(
      ConstructionFileError,
    );
  });

  it("rejects a stale nextId that would collide with an existing entity", () => {
    const construction = sampleConstruction();
    const text = serializeConstruction(construction);
    const data = JSON.parse(text);
    data.construction.nextId = 1;
    expect(() => parseConstructionFile(JSON.stringify(data))).toThrow(
      ConstructionFileError,
    );
  });

  it("rejects a stale nextPointIndex that would collide with an existing point", () => {
    const construction = sampleConstruction();
    const text = serializeConstruction(construction);
    const data = JSON.parse(text);
    data.construction.nextPointIndex = 0;
    expect(() => parseConstructionFile(JSON.stringify(data))).toThrow(
      ConstructionFileError,
    );
  });

  it("rejects a stale nextAngleIndex that would collide with an existing angle", () => {
    const construction = sampleConstructionWithExpression();
    const text = serializeConstruction(construction);
    const data = JSON.parse(text);
    data.construction.nextAngleIndex = 0;
    expect(() => parseConstructionFile(JSON.stringify(data))).toThrow(
      ConstructionFileError,
    );
  });

  it("rejects an expression referencing a non-angle entity", () => {
    const construction = sampleConstructionWithExpression();
    const text = serializeConstruction(construction);
    const data = JSON.parse(text);
    const [exprId] = Object.entries(data.construction.entities).find(
      ([, e]) => (e as { kind: string }).kind === "expression",
    ) as [string, { ast: { right: { id: string } } }];
    const [pointId] = Object.entries(data.construction.entities).find(
      ([, e]) => (e as { kind: string }).kind === "point",
    ) as [string, unknown];
    data.construction.entities[exprId].ast.right.id = pointId;
    expect(() => parseConstructionFile(JSON.stringify(data))).toThrow(
      ConstructionFileError,
    );
  });
});
