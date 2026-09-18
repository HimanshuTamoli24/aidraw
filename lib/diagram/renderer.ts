import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import {
  Diagram,
  DiagramConnection,
  DiagramNode,
  LayoutedDiagram,
  LayoutedNode,
} from "./types";
import { computeDiagramLayout } from "./layout";
import { getLibraryComponent } from "./library/components";
import { libraryStore } from "./library/libraryManager";
import { routeAllArrows, ShapeRect } from "./arrowRouter";

export interface RenderOptions {
  clearCanvas?: boolean;
  animate?: boolean;
  startX?: number;
  startY?: number;
}

interface ExcalidrawColorTheme {
  bg: string;
  stroke: string;
}

function getNodeColorTheme(node: DiagramNode): ExcalidrawColorTheme {
  const color = node.color;
  if (color) {
    switch (color) {
      case "blue":
      case "light-blue":
        return { bg: "#e0f2fe", stroke: "#0284c7" };
      case "green":
        return { bg: "#dcfce7", stroke: "#16a34a" };
      case "orange":
        return { bg: "#ffedd5", stroke: "#ea580c" };
      case "violet":
        return { bg: "#f3e8ff", stroke: "#9333ea" };
      case "red":
        return { bg: "#fee2e2", stroke: "#dc2626" };
      case "yellow":
        return { bg: "#fef9c3", stroke: "#ca8a04" };
      case "grey":
        return { bg: "#f1f5f9", stroke: "#64748b" };
      case "black":
      default:
        return { bg: "#ffffff", stroke: "#1e293b" };
    }
  }

  switch (node.type) {
    case "browser":
    case "user":
    case "client":
      return { bg: "#e0f2fe", stroke: "#0284c7" };
    case "cloud":
    case "network":
      return { bg: "#e0f2fe", stroke: "#0284c7" };
    case "dns":
    case "domain":
    case "ip":
    case "gateway":
    case "load-balancer":
      return { bg: "#ffedd5", stroke: "#ea580c" };
    case "server":
    case "web-server":
    case "api":
    case "service":
      return { bg: "#dcfce7", stroke: "#16a34a" };
    case "database":
      return { bg: "#f3e8ff", stroke: "#9333ea" };
    case "cache":
      return { bg: "#fee2e2", stroke: "#dc2626" };
    case "docker":
    case "container":
      return { bg: "#eff6ff", stroke: "#2563eb" };
    case "ssl":
      return { bg: "#fef9c3", stroke: "#ca8a04" };
    case "hardware":
    case "state":
      return { bg: "#e0f2fe", stroke: "#0284c7" };
    default:
      return { bg: "#ffffff", stroke: "#1e293b" };
  }
}

function getNodeShapeType(node: DiagramNode): "rectangle" | "ellipse" | "diamond" {
  if (node.shape) {
    if (node.shape === "ellipse") return "ellipse";
    if (node.shape === "diamond") return "diamond";
    return "rectangle";
  }

  switch (node.type) {
    case "user":
    case "client":
    case "state":
      return "ellipse";
    case "dns":
    case "load-balancer":
    case "gateway":
      return "rectangle";
    default:
      return "rectangle";
  }
}

/**
 * Maps a connection color string to an actual hex stroke color.
 */
function getConnectionStrokeColor(conn: DiagramConnection): string {
  switch (conn.color) {
    case "blue":
    case "light-blue":
      return "#2563eb";
    case "green":
      return "#16a34a";
    case "orange":
      return "#ea580c";
    case "violet":
      return "#9333ea";
    case "red":
      return "#dc2626";
    case "yellow":
      return "#ca8a04";
    case "grey":
      return "#94a3b8";
    case "black":
    default:
      return "#334155";
  }
}

/**
 * Maps a connection style string to Excalidraw strokeStyle.
 */
function getConnectionStrokeStyle(conn: DiagramConnection): string {
  switch (conn.style) {
    case "dashed":
      return "dashed";
    case "dotted":
      return "dotted";
    case "solid":
    default:
      return "solid";
  }
}

/**
 * Converts a diagram structure into native, fully-editable Excalidraw elements.
 * Prioritizes pre-built library components and updates the Excalidraw scene.
 */
export async function renderDiagramToExcalidraw(
  api: ExcalidrawImperativeAPI,
  diagram: Diagram,
  options: RenderOptions = {}
): Promise<LayoutedDiagram> {
  const { clearCanvas = false, animate = true } = options;

  // Import Excalidraw dynamically to avoid SSR window errors
  const { convertToExcalidrawElements } = await import("@excalidraw/excalidraw");

  const existingElements = clearCanvas ? [] : api.getSceneElements();

  // ──────────────────────────────────────────────────────────
  // Multi-diagram stacking: compute full bounding box of existing elements
  // Place new diagram below with generous vertical gap (300px)
  // ──────────────────────────────────────────────────────────
  let startX = options.startX ?? 160;
  let startY = options.startY ?? 200;

  if (!clearCanvas && existingElements.length > 0) {
    let existingMaxY = -Infinity;
    let existingMinX = Infinity;

    existingElements.forEach((el) => {
      if (!el.isDeleted) {
        const elBottom = el.y + el.height;
        if (elBottom > existingMaxY) existingMaxY = elBottom;
        if (el.x < existingMinX) existingMinX = el.x;
      }
    });

    if (existingMaxY !== -Infinity && existingMaxY > 0) {
      startY = existingMaxY + 300; // generous 300px gap between diagrams
      startX = Math.max(160, existingMinX);
    }
  }

  // Compute deterministic layout with clean compact spacing
  const layout = computeDiagramLayout(diagram, {
    startX,
    startY,
    gapX: 130,
    gapY: 90,
  });

  const skeletons: any[] = [];
  const nodeMap = new Map<string, LayoutedNode>();

  // ──────────────────────────────────────────────────────────
  // 1. Title Banner Text
  // ──────────────────────────────────────────────────────────
  skeletons.push({
    type: "text",
    x: layout.bounds.minX,
    y: layout.bounds.minY - 70,
    text: `📐 ${layout.title}${layout.summary ? `\n— ${layout.summary}` : ""}`,
    fontSize: 20,
    fontFamily: 2, // Helvetica / Clean Sans-serif
    strokeColor: "#0f172a",
  });

  // ──────────────────────────────────────────────────────────
  // 2. Groups / Zones (Background rectangles)
  // ──────────────────────────────────────────────────────────
  layout.groups.forEach((g) => {
    skeletons.push({
      id: `group-${g.id}`,
      type: "rectangle",
      x: g.x,
      y: g.y,
      width: g.width,
      height: g.height,
      strokeStyle: "dashed",
      strokeColor: "#94a3b8",
      strokeWidth: 1.5,
      backgroundColor: "transparent",
      roughness: 0,
      roundness: { type: 3 },
      label: {
        text: `[ ${g.title.toUpperCase()} ]`,
        fontSize: 12,
        fontFamily: 2,
        textAlign: "left",
        verticalAlign: "top",
        strokeColor: "#64748b",
      },
    });
  });

  // ──────────────────────────────────────────────────────────
  // 3. Nodes: Library → Built-in → Fallback standard shape
  // ──────────────────────────────────────────────────────────
  layout.nodes.forEach((node) => {
    nodeMap.set(node.id, node);
    const colors = getNodeColorTheme(node);

    // Check if matching atomic item in loaded library store
    const dynamicLibItem = libraryStore.findMatchingItem(node.type, node.title);
    if (dynamicLibItem) {
      const instantiated = libraryStore.instantiateItem(
        dynamicLibItem,
        node.id,
        node.x,
        node.y,
        node.width,
        node.height,
        node.title,
        node.subtitle,
        colors
      );
      if (instantiated.length > 0) {
        skeletons.push(...instantiated);
        return;
      }
    }

    // Check built-in library component definition
    const libComponent = getLibraryComponent(node.type);
    if (libComponent) {
      const compElements = libComponent.createElements(
        node.id,
        node.x,
        node.y,
        node.width,
        node.height,
        node.title,
        node.subtitle
      );
      skeletons.push(...compElements);
      return;
    }

    // Fallback standard shape
    const shapeType = getNodeShapeType(node);

    let displayText = node.title;
    if (node.subtitle) {
      displayText += `\n(${node.subtitle})`;
    }

    skeletons.push({
      id: `node-${node.id}`,
      type: shapeType,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      backgroundColor: colors.bg,
      strokeColor: colors.stroke,
      fillStyle: "solid",
      strokeWidth: 2,
      roughness: 0, // Architectural crisp clean edges
      roundness: { type: 3 },
      label: {
        text: displayText,
        fontSize: 13,
        fontFamily: 2, // Helvetica / Clean Sans-serif
        textAlign: "center",
        verticalAlign: "middle",
        strokeColor: "#0f172a",
      },
    });
  });

  // ──────────────────────────────────────────────────────────
  // 4. Dedicated Side Info & Commands Card (infoBox)
  // ──────────────────────────────────────────────────────────
  if (layout.infoBox) {
    skeletons.push({
      id: `infobox-${Date.now()}`,
      type: "rectangle",
      x: layout.infoBox.x,
      y: layout.infoBox.y,
      width: layout.infoBox.width,
      height: layout.infoBox.height,
      backgroundColor: "#eff6ff",
      strokeColor: "#3b82f6",
      strokeWidth: 2,
      strokeStyle: "dashed",
      fillStyle: "solid",
      roughness: 0,
      roundness: { type: 3 },
      label: {
        text: layout.infoBox.formattedText,
        fontSize: 12,
        fontFamily: 3, // Monospace for commands
        textAlign: "left",
        verticalAlign: "top",
        strokeColor: "#1e3a8a",
      },
    });
  }

  // ──────────────────────────────────────────────────────────
  // 5. Connections / Arrows — routed cleanly around shapes
  //    Uses sharp orthogonal routing with zero curvature
  // ──────────────────────────────────────────────────────────

  // Build a shape map for the arrow router
  const shapeRects: ShapeRect[] = [];
  const shapesById = new Map<string, ShapeRect>();

  layout.nodes.forEach((node) => {
    const rect: ShapeRect = {
      id: node.id,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
    };
    shapeRects.push(rect);
    shapesById.set(node.id, rect);
  });

  // Compute all routes at once (with port distribution)
  const arrowRoutes = routeAllArrows(
    layout.connections.map((c) => ({ id: c.id, from: c.from, to: c.to })),
    shapesById,
    shapeRects
  );

  layout.connections.forEach((conn) => {
    const fromNode = nodeMap.get(conn.from);
    const toNode = nodeMap.get(conn.to);
    if (!fromNode || !toNode) return;
    if (conn.from === conn.to) return; // Ignore self-loops

    const route = arrowRoutes.get(conn.id);
    if (!route) return;

    const strokeColor = getConnectionStrokeColor(conn);
    const strokeStyle = getConnectionStrokeStyle(conn);

    // Arrow direction
    const endArrowhead = conn.direction === "none" ? null : "arrow";
    const startArrowhead = conn.direction === "bidirectional" ? "arrow" : null;

    skeletons.push({
      id: `arrow-${conn.id}-${Date.now()}`,
      type: "arrow",
      x: route.startX,
      y: route.startY,
      points: route.points,
      strokeColor,
      strokeWidth: 2,
      strokeStyle,
      roughness: 0, // Crisp straight lines (no sketch jitter)
      roundness: null, // No bezier curvature (crisp sharp right-angle elbows)
      startArrowhead,
      endArrowhead,
      label: conn.label
        ? {
            text: conn.label,
            fontSize: 11,
            fontFamily: 2, // Helvetica / Clean Sans-serif
            strokeColor: "#1e293b",
          }
        : undefined,
    });
  });


  // ──────────────────────────────────────────────────────────
  // 6. Annotations / Callout Notes
  // ──────────────────────────────────────────────────────────
  layout.annotations.forEach((ann, idx) => {
    skeletons.push({
      id: `ann-${ann.id || idx}-${Date.now()}`,
      type: "rectangle",
      x: ann.x,
      y: ann.y,
      width: ann.width,
      height: ann.height,
      backgroundColor: "#fef9c3",
      strokeColor: "#ca8a04",
      fillStyle: "solid",
      strokeWidth: 1.5,
      roughness: 0,
      roundness: { type: 3 },
      label: {
        text: `💡 ${ann.text}`,
        fontSize: 12,
        fontFamily: 2, // Helvetica / Clean Sans-serif
        textAlign: "left",
        verticalAlign: "middle",
        strokeColor: "#713f12",
      },
    });
  });


  // ──────────────────────────────────────────────────────────
  // Convert skeletons to valid Excalidraw elements
  // ──────────────────────────────────────────────────────────
  const newElements = convertToExcalidrawElements(skeletons as any);

  // Combine with existing elements (or replace if clearCanvas)
  const allElements = clearCanvas
    ? newElements
    : [...existingElements.filter((el) => !el.isDeleted), ...newElements];

  // Update scene in Excalidraw
  api.updateScene({
    elements: allElements,
  });

  // Smoothly scroll and zoom camera to the new diagram
  setTimeout(() => {
    try {
      api.scrollToContent(newElements as any, {
        fitToViewport: true,
        animate: animate,
        duration: animate ? 400 : 0,
      });
    } catch (e) {
      console.warn("Could not scrollToContent:", e);
    }
  }, 50);

  return layout;
}
