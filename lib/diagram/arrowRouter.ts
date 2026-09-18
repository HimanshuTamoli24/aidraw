/**
 * Arrow Routing Engine for Excalidraw Diagram Generator
 *
 * Routes arrows cleanly between shapes:
 * - Exits/enters at shape borders (never centers)
 * - Uses orthogonal (horizontal/vertical) paths
 * - Avoids crossing through intermediate shapes
 * - Distributes multiple ports on the same side to prevent stacking
 */

export interface ShapeRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoutedArrow {
  /** Absolute X of the arrow's origin (first point) */
  startX: number;
  /** Absolute Y of the arrow's origin (first point) */
  startY: number;
  /** All points relative to (startX, startY). First element is always [0,0]. */
  points: [number, number][];
}

type Side = "top" | "bottom" | "left" | "right";

interface Point {
  x: number;
  y: number;
}

// ─── Port Distribution ────────────────────────────────────────────────
// Prevents multiple arrows from overlapping on the same border of a shape.

interface PortTracker {
  /** How many ports have been allocated so far for each "shapeId:side" */
  allocated: Map<string, number>;
  /** Total ports expected for each "shapeId:side" */
  totals: Map<string, number>;
}

function createPortTracker(): PortTracker {
  return { allocated: new Map(), totals: new Map() };
}

/**
 * Pre-count how many connections touch each side of each shape
 * so we can distribute evenly later.
 */
export function preCountPorts(
  connections: Array<{ from: string; to: string }>,
  shapesById: Map<string, ShapeRect>,
  tracker: PortTracker
): void {
  const counts = new Map<string, number>();

  connections.forEach((conn) => {
    const src = shapesById.get(conn.from);
    const tgt = shapesById.get(conn.to);
    if (!src || !tgt) return;

    const exitSide = computeExitSide(src, tgt);
    const entrySide = opposite(exitSide);

    const ek = `${conn.from}:${exitSide}`;
    const nk = `${conn.to}:${entrySide}`;
    counts.set(ek, (counts.get(ek) || 0) + 1);
    counts.set(nk, (counts.get(nk) || 0) + 1);
  });

  counts.forEach((v, k) => tracker.totals.set(k, v));
}

/**
 * Allocate the next port on a shape's side.
 * Returns a ratio (0–1) along the side for positioning.
 */
function allocatePort(tracker: PortTracker, shapeId: string, side: Side): number {
  const key = `${shapeId}:${side}`;
  const idx = tracker.allocated.get(key) || 0;
  const total = tracker.totals.get(key) || 1;
  tracker.allocated.set(key, idx + 1);
  // Evenly distribute: e.g. 2 ports → 0.33, 0.66
  return (idx + 1) / (total + 1);
}

// ─── Geometry Helpers ─────────────────────────────────────────────────

function computeExitSide(source: ShapeRect, target: ShapeRect): Side {
  const dx = target.x + target.width / 2 - (source.x + source.width / 2);
  const dy = target.y + target.height / 2 - (source.y + source.height / 2);
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "right" : "left";
  }
  return dy >= 0 ? "bottom" : "top";
}

function opposite(s: Side): Side {
  return ({ right: "left", left: "right", bottom: "top", top: "bottom" } as const)[s];
}

function borderPt(shape: ShapeRect, side: Side, ratio = 0.5): Point {
  switch (side) {
    case "right":
      return { x: shape.x + shape.width, y: shape.y + shape.height * ratio };
    case "left":
      return { x: shape.x, y: shape.y + shape.height * ratio };
    case "bottom":
      return { x: shape.x + shape.width * ratio, y: shape.y + shape.height };
    case "top":
      return { x: shape.x + shape.width * ratio, y: shape.y };
  }
}

/** AABB overlap check with padding. */
function segCrossesRect(a: Point, b: Point, r: ShapeRect, pad = 14): boolean {
  const sxMin = Math.min(a.x, b.x);
  const sxMax = Math.max(a.x, b.x);
  const syMin = Math.min(a.y, b.y);
  const syMax = Math.max(a.y, b.y);
  return !(
    sxMax < r.x - pad ||
    sxMin > r.x + r.width + pad ||
    syMax < r.y - pad ||
    syMin > r.y + r.height + pad
  );
}

function pathCrossesAny(path: Point[], obstacles: ShapeRect[]): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    for (const obs of obstacles) {
      if (segCrossesRect(path[i], path[i + 1], obs)) return true;
    }
  }
  return false;
}

function toRouted(absPoints: Point[]): RoutedArrow {
  const origin = absPoints[0];
  return {
    startX: origin.x,
    startY: origin.y,
    points: absPoints.map((p) => [p.x - origin.x, p.y - origin.y] as [number, number]),
  };
}

// ─── Main Routing ─────────────────────────────────────────────────────

/**
 * Route a single arrow from source to target, avoiding obstacles.
 *
 * Strategy (in order of preference):
 * 1. Straight line (if aligned and unobstructed)
 * 2. Z-route (3-segment orthogonal path)
 * 3. Detour (5-segment path routing above/below or left/right of obstacles)
 */
export function routeArrow(
  source: ShapeRect,
  target: ShapeRect,
  allShapes: ShapeRect[],
  portTracker?: PortTracker
): RoutedArrow {
  const exitSide = computeExitSide(source, target);
  const entrySide = opposite(exitSide);

  // Port offsets for distribution
  const exitOffset = portTracker ? allocatePort(portTracker, source.id, exitSide) : 0.5;
  const entryOffset = portTracker ? allocatePort(portTracker, target.id, entrySide) : 0.5;

  const start = borderPt(source, exitSide, exitOffset);
  const end = borderPt(target, entrySide, entryOffset);

  // Only consider shapes that are neither source nor target
  const obstacles = allShapes.filter((s) => s.id !== source.id && s.id !== target.id);

  const CLEARANCE = 50;

  // ── Strategy 1: Straight line ───────────────────────────────────────
  const isHorizontalFlow = exitSide === "right" || exitSide === "left";
  const isVerticalFlow = exitSide === "bottom" || exitSide === "top";

  if (isHorizontalFlow && Math.abs(start.y - end.y) <= 6) {
    const straight: Point[] = [start, end];
    if (!pathCrossesAny(straight, obstacles)) {
      return toRouted(straight);
    }
  }
  if (isVerticalFlow && Math.abs(start.x - end.x) <= 6) {
    const straight: Point[] = [start, end];
    if (!pathCrossesAny(straight, obstacles)) {
      return toRouted(straight);
    }
  }


  // ── Strategy 2: Z-route ─────────────────────────────────────────────
  let zPath: Point[];
  if (isHorizontalFlow) {
    const midX = (start.x + end.x) / 2;
    zPath = [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
  } else {
    const midY = (start.y + end.y) / 2;
    zPath = [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
  }

  if (!pathCrossesAny(zPath, obstacles)) {
    return toRouted(zPath);
  }

  // ── Strategy 3: Detour around obstacles ─────────────────────────────
  const blocking = obstacles.filter((obs) => pathCrossesAny(zPath, [obs]));
  if (blocking.length > 0) {
    // Combined bounding box of all blocking shapes
    let bMinX = Infinity,
      bMinY = Infinity,
      bMaxX = -Infinity,
      bMaxY = -Infinity;
    blocking.forEach((o) => {
      bMinX = Math.min(bMinX, o.x);
      bMinY = Math.min(bMinY, o.y);
      bMaxX = Math.max(bMaxX, o.x + o.width);
      bMaxY = Math.max(bMaxY, o.y + o.height);
    });

    if (isHorizontalFlow) {
      // Route above or below the obstacle cluster
      const aboveY = bMinY - CLEARANCE;
      const belowY = bMaxY + CLEARANCE;
      const distAbove = Math.abs(start.y - aboveY) + Math.abs(end.y - aboveY);
      const distBelow = Math.abs(start.y - belowY) + Math.abs(end.y - belowY);
      const bypassY = distAbove <= distBelow ? aboveY : belowY;

      const stemX =
        exitSide === "right" ? start.x + CLEARANCE : start.x - CLEARANCE;
      const approachX =
        entrySide === "left" ? end.x - CLEARANCE : end.x + CLEARANCE;

      const detour: Point[] = [
        start,
        { x: stemX, y: start.y },
        { x: stemX, y: bypassY },
        { x: approachX, y: bypassY },
        { x: approachX, y: end.y },
        end,
      ];

      // Verify the detour doesn't cross anything
      if (!pathCrossesAny(detour, obstacles)) {
        return toRouted(detour);
      }

      // If the preferred bypass still fails, try the other direction
      const altBypassY = bypassY === aboveY ? belowY : aboveY;
      const altDetour: Point[] = [
        start,
        { x: stemX, y: start.y },
        { x: stemX, y: altBypassY },
        { x: approachX, y: altBypassY },
        { x: approachX, y: end.y },
        end,
      ];
      if (!pathCrossesAny(altDetour, obstacles)) {
        return toRouted(altDetour);
      }
    } else {
      // Vertical flow — route left or right of the obstacle cluster
      const leftX = bMinX - CLEARANCE;
      const rightX = bMaxX + CLEARANCE;
      const distLeft = Math.abs(start.x - leftX) + Math.abs(end.x - leftX);
      const distRight = Math.abs(start.x - rightX) + Math.abs(end.x - rightX);
      const bypassX = distLeft <= distRight ? leftX : rightX;

      const stemY =
        exitSide === "bottom" ? start.y + CLEARANCE : start.y - CLEARANCE;
      const approachY =
        entrySide === "top" ? end.y - CLEARANCE : end.y + CLEARANCE;

      const detour: Point[] = [
        start,
        { x: start.x, y: stemY },
        { x: bypassX, y: stemY },
        { x: bypassX, y: approachY },
        { x: end.x, y: approachY },
        end,
      ];

      if (!pathCrossesAny(detour, obstacles)) {
        return toRouted(detour);
      }

      const altBypassX = bypassX === leftX ? rightX : leftX;
      const altDetour: Point[] = [
        start,
        { x: start.x, y: stemY },
        { x: altBypassX, y: stemY },
        { x: altBypassX, y: approachY },
        { x: end.x, y: approachY },
        end,
      ];
      if (!pathCrossesAny(altDetour, obstacles)) {
        return toRouted(altDetour);
      }
    }
  }

  // ── Fallback: return the Z-route even if imperfect ──────────────────
  return toRouted(zPath);
}

/**
 * Route all connections for a diagram at once.
 * Uses port distribution to spread multiple arrows on the same shape side.
 */
export function routeAllArrows(
  connections: Array<{ id: string; from: string; to: string }>,
  shapesById: Map<string, ShapeRect>,
  allShapes: ShapeRect[]
): Map<string, RoutedArrow> {
  const tracker = createPortTracker();
  preCountPorts(connections, shapesById, tracker);

  const routes = new Map<string, RoutedArrow>();

  connections.forEach((conn) => {
    const src = shapesById.get(conn.from);
    const tgt = shapesById.get(conn.to);
    if (!src || !tgt) return;

    routes.set(conn.id, routeArrow(src, tgt, allShapes, tracker));
  });

  return routes;
}
