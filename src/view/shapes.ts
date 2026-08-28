/**
 * Plain geometric data shapes shared by the Euclidean (geometry.ts) and
 * hyperbolic (hyperbolicFormulas.ts) layers, so neither has to depend on
 * the other just to describe a point, rectangle, or circle.
 */

export interface XY {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface CircleShape {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
}
