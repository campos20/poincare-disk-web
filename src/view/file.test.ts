import { describe, expect, it } from "vitest";
import {
  addAngleExpression,
  addCurvesAngle,
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
  const p3 = addFreePoint(c, 0.2, -0.1);
  c = p3.construction;
  const p4 = addFreePoint(c, -0.1, 0.3);
  c = p4.construction;
  const seg1 = addSegment(c, a.id, b.id);
  c = seg1.construction;
  // The intersection's a/b reference the two curves crossed, not the
  // points that define them — matching engine/types.ts's IntersectionPoint.
  const seg2 = addSegment(c, p3.id, p4.id);
  c = seg2.construction;
  c = addIntersectionPoint(c, 0, 0, seg1.id, seg2.id, 0).construction;
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
  const seg = addSegment(c, p1.id, p2.id);
  c = seg.construction;
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

  it("rejects a segment endpoint that resolves but isn't a point", () => {
    const construction = sampleConstructionWithExpression();
    const text = serializeConstruction(construction);
    const data = JSON.parse(text);
    const [angleId] = Object.entries(data.construction.entities).find(
      ([, e]) => (e as { kind: string }).kind === "angle",
    ) as [string, unknown];
    const [segmentId] = Object.entries(data.construction.entities).find(
      ([, e]) => (e as { kind: string }).kind === "segment",
    ) as [string, { a: string }];
    data.construction.entities[segmentId].a = angleId;
    expect(() => parseConstructionFile(JSON.stringify(data))).toThrow(
      ConstructionFileError,
    );
  });

  it("rejects an intersection whose source resolves but isn't a curve", () => {
    const construction = sampleConstruction();
    const text = serializeConstruction(construction);
    const data = JSON.parse(text);
    const [pointId] = Object.entries(data.construction.entities).find(
      ([, e]) => (e as { kind: string }).kind === "point",
    ) as [string, unknown];
    const [intersectionId] = Object.entries(data.construction.entities).find(
      ([, e]) => (e as { kind: string }).kind === "intersection",
    ) as [string, { a: string }];
    data.construction.entities[intersectionId].a = pointId;
    expect(() => parseConstructionFile(JSON.stringify(data))).toThrow(
      ConstructionFileError,
    );
  });

  it("rejects a curves-mode angle operand that resolves but isn't a curve", () => {
    let c = emptyConstruction();
    const a = addFreePoint(c, 0, 0);
    c = a.construction;
    const b = addFreePoint(c, 0.5, 0);
    c = b.construction;
    const p3 = addFreePoint(c, 0, 0.5);
    c = p3.construction;
    const p4 = addFreePoint(c, 0.5, 0.5);
    c = p4.construction;
    const seg1 = addSegment(c, a.id, b.id);
    c = seg1.construction;
    const seg2 = addSegment(c, p3.id, p4.id);
    c = seg2.construction;
    const angle = addCurvesAngle(c, seg1.id, seg2.id);
    c = angle.construction;

    const text = serializeConstruction(c);
    const data = JSON.parse(text);
    data.construction.entities[angle.id].a = a.id;
    expect(() => parseConstructionFile(JSON.stringify(data))).toThrow(
      ConstructionFileError,
    );
  });

  it("rejects a non-finite expression constant (e.g. from a 1e999 literal)", () => {
    const construction = sampleConstructionWithExpression();
    const text = serializeConstruction(construction);
    const data = JSON.parse(text);
    const [exprId] = Object.entries(data.construction.entities).find(
      ([, e]) => (e as { kind: string }).kind === "expression",
    ) as [string, { ast: { left: { value: number } } }];
    // JSON.parse("1e999") is Infinity, same as this direct assignment.
    data.construction.entities[exprId].ast.left.value = Infinity;
    expect(() => parseConstructionFile(JSON.stringify(data))).toThrow(
      ConstructionFileError,
    );
  });
});
