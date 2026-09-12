import { describe, expect, it } from "vitest";
import {
  addFreePoint,
  addPointsAngle,
  emptyConstruction,
  deleteEntity,
} from "../engine";
import type { Construction, EntityId, ExpressionNode } from "../engine";
import {
  ExpressionError,
  evaluateExpression,
  parseAngleExpression,
} from "./expressions";

/** A right angle (90°) at the origin, plus a second, independent 45° angle
 * — enough to exercise formulas referencing more than one angle. */
function twoAngles(): {
  construction: Construction;
  rightAngleId: EntityId;
  fortyFiveId: EntityId;
} {
  const vertex = addFreePoint(emptyConstruction(), 0, 0);
  const a = addFreePoint(vertex.construction, 0.5, 0);
  const b = addFreePoint(a.construction, 0, 0.5);
  const right = addPointsAngle(b.construction, a.id, vertex.id, b.id);

  const vertex2 = addFreePoint(right.construction, 0, 0);
  const c = addFreePoint(vertex2.construction, 0.5, 0);
  const d = addFreePoint(c.construction, 0.5, 0.5);
  const fortyFive = addPointsAngle(d.construction, c.id, vertex2.id, d.id);

  return {
    construction: fortyFive.construction,
    rightAngleId: right.id,
    fortyFiveId: fortyFive.id,
  };
}

describe("parseAngleExpression", () => {
  it("parses a bare identifier", () => {
    const labelToId = new Map([["angle1", "e1"]]);
    expect(parseAngleExpression("angle1", labelToId)).toEqual({
      kind: "ref",
      id: "e1",
    });
  });

  it("parses arithmetic with standard precedence", () => {
    const labelToId = new Map([
      ["angle1", "e1"],
      ["angle2", "e2"],
    ]);
    const ast = parseAngleExpression("2*angle1+angle2", labelToId);
    expect(ast).toEqual({
      kind: "add",
      left: {
        kind: "mul",
        left: { kind: "const", value: 2 },
        right: { kind: "ref", id: "e1" },
      },
      right: { kind: "ref", id: "e2" },
    });
  });

  it("parses parentheses and unary minus", () => {
    const labelToId = new Map([
      ["angle1", "e1"],
      ["angle2", "e2"],
    ]);
    const ast = parseAngleExpression("-(angle1+angle2)/2", labelToId);
    expect(ast).toEqual({
      kind: "div",
      left: {
        kind: "neg",
        arg: {
          kind: "add",
          left: { kind: "ref", id: "e1" },
          right: { kind: "ref", id: "e2" },
        },
      },
      right: { kind: "const", value: 2 },
    });
  });

  it("throws on an unknown identifier", () => {
    expect(() => parseAngleExpression("angle9", new Map())).toThrow(
      ExpressionError,
    );
  });

  it("throws on a missing closing parenthesis", () => {
    expect(() =>
      parseAngleExpression(
        "(angle1+angle2",
        new Map([
          ["angle1", "e1"],
          ["angle2", "e2"],
        ]),
      ),
    ).toThrow(ExpressionError);
  });

  it("throws on an empty formula", () => {
    expect(() => parseAngleExpression("", new Map())).toThrow(ExpressionError);
    expect(() => parseAngleExpression("   ", new Map())).toThrow(
      ExpressionError,
    );
  });

  it("throws on trailing garbage", () => {
    expect(() =>
      parseAngleExpression("angle1 +", new Map([["angle1", "e1"]])),
    ).toThrow(ExpressionError);
  });
});

describe("evaluateExpression", () => {
  it("evaluates a bare angle reference to its degree measurement", () => {
    const { construction, rightAngleId } = twoAngles();
    const ast: ExpressionNode = { kind: "ref", id: rightAngleId };
    expect(evaluateExpression(construction, ast)).toBeCloseTo(90);
  });

  it("evaluates a combination of two angles and a constant", () => {
    const { construction, rightAngleId, fortyFiveId } = twoAngles();
    // 2*angle1 + angle2 - 15 == 2*90 + 45 - 15 == 210
    const ast: ExpressionNode = {
      kind: "sub",
      left: {
        kind: "add",
        left: {
          kind: "mul",
          left: { kind: "const", value: 2 },
          right: { kind: "ref", id: rightAngleId },
        },
        right: { kind: "ref", id: fortyFiveId },
      },
      right: { kind: "const", value: 15 },
    };
    expect(evaluateExpression(construction, ast)).toBeCloseTo(210);
  });

  it("returns null when a referenced angle no longer resolves", () => {
    const { construction, rightAngleId } = twoAngles();
    const gone = deleteEntity(construction, rightAngleId);
    const ast: ExpressionNode = { kind: "ref", id: rightAngleId };
    expect(evaluateExpression(gone, ast)).toBeNull();
  });

  it("returns null on division by zero", () => {
    const ast: ExpressionNode = {
      kind: "div",
      left: { kind: "const", value: 10 },
      right: { kind: "const", value: 0 },
    };
    expect(evaluateExpression(emptyConstruction(), ast)).toBeNull();
  });
});
