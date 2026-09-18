import {
  Editor,
  createShapeId,
  createBindingId,
  toRichText,
  TLShapePartial,
  TLBindingCreate,
} from "tldraw";
import { Diagram, DiagramNode, LayoutedDiagram, LayoutedNode } from "./types";
import { computeDiagramLayout } from "./layout";

export interface RenderOptions {
  clearCanvas?: boolean;
  animate?: boolean;
  startX?: number;
  startY?: number;
}

function getNodeGeoShape(node: DiagramNode): "rectangle" | "ellipse" | "cloud" | "diamond" {
  if (node.shape) {
    if (node.shape === "ellipse") return "ellipse";
    if (node.shape === "cloud") return "cloud";
    if (node.shape === "diamond") return "diamond";
    return "rectangle";
  }

  switch (node.type) {
    case "cloud":
    case "network":
      return "cloud";
    case "user":
    case "client":
    case "state":
      return "ellipse";
    case "dns":
    case "load-balancer":
    case "gateway":
      return "rectangle";
    case "database":
    case "cache":
    case "server":
    case "api":
    case "web-server":
    case "docker":
    case "container":
    default:
      return "rectangle";
  }
}

function getNodeColor(
  node: DiagramNode
): "black" | "blue" | "green" | "grey" | "light-blue" | "orange" | "red" | "violet" | "yellow" {
  if (node.color) return node.color;

  switch (node.type) {
    case "browser":
    case "user":
    case "client":
      return "light-blue";
    case "cloud":
    case "network":
      return "light-blue";
    case "dns":
    case "domain":
    case "ip":
    case "gateway":
    case "load-balancer":
      return "orange";
    case "server":
    case "web-server":
    case "api":
    case "service":
      return "green";
    case "database":
      return "violet";
    case "cache":
      return "red";
    case "docker":
    case "container":
      return "blue";
    case "ssl":
      return "yellow";
    case "hardware":
    case "state":
      return "blue";
    default:
      return "black";
  }
}

/**
 * Converts a diagram structure into native, fully-editable tldraw shapes,
 * arrows, groups, side info card, and annotations, then zooms the camera to focus on it.
 */
export function renderDiagramToCanvas(
  editor: Editor,
  diagram: Diagram,
  options: RenderOptions = {}
): LayoutedDiagram {
  const { clearCanvas = false, animate = true } = options;

  // Clear existing shapes if explicitly requested
  if (clearCanvas) {
    const allShapeIds = Array.from(editor.getCurrentPageShapeIds());
    if (allShapeIds.length > 0) {
      editor.deleteShapes(allShapeIds);
    }
  }

  // Detect existing shapes to find a completely open area on the infinite canvas
  let startX = options.startX ?? 140;
  let startY = options.startY ?? 180;

  if (!clearCanvas) {
    try {
      const pageBounds = editor.getCurrentPageBounds();
      if (pageBounds && pageBounds.w > 0 && pageBounds.h > 0) {
        // Place the new diagram cleanly below the existing ones with generous whitespace
        startY = pageBounds.maxY + 260;
        startX = Math.max(140, pageBounds.minX);
      }
    } catch {
      // Use defaults if pageBounds is unavailable
    }
  }

  // Compute deterministic layout
  const layout = computeDiagramLayout(diagram, {
    startX,
    startY,
    gapX: 300,
    gapY: 200,
  });

  const shapesToCreate: TLShapePartial[] = [];
  const bindingsToCreate: TLBindingCreate[] = [];
  const nodeShapeIdMap = new Map<string, any>();
  const nodeMap = new Map<string, LayoutedNode>();

  // 1. Title Banner Shape
  const titleShapeId = createShapeId(`title-${Date.now()}`);
  shapesToCreate.push({
    id: titleShapeId,
    type: "text",
    x: layout.bounds.minX,
    y: layout.bounds.minY - 110,
    props: {
      richText: toRichText(`✏️ ${layout.title}${layout.summary ? `\n— ${layout.summary}` : ""}`),
      font: "draw",
      size: "m",
      color: "black",
      textAlign: "start",
      autoSize: true,
    } as any,
  });

  // 2. Groups / Zones (Rendered first so they sit behind nodes)
  layout.groups.forEach((g) => {
    const groupShapeId = createShapeId(`group-${g.id}`);
    shapesToCreate.push({
      id: groupShapeId,
      type: "geo",
      x: g.x,
      y: g.y,
      props: {
        geo: "rectangle",
        w: g.width,
        h: g.height,
        richText: toRichText(`[ ${g.title.toUpperCase()} ]`),
        font: "draw",
        size: "s",
        color: (g.color as any) || "grey",
        fill: "none",
        dash: g.style === "solid" ? "solid" : "dashed",
        align: "start",
        verticalAlign: "start",
      } as any,
    });
  });

  // 3. Nodes
  layout.nodes.forEach((node) => {
    const shapeId = createShapeId(`node-${node.id}`);
    nodeShapeIdMap.set(node.id, shapeId);
    nodeMap.set(node.id, node);

    const geoShape = getNodeGeoShape(node);
    const color = getNodeColor(node);

    let displayText = node.title;
    if (node.subtitle) {
      displayText += `\n${node.subtitle}`;
    }

    shapesToCreate.push({
      id: shapeId,
      type: "geo",
      x: node.x,
      y: node.y,
      props: {
        geo: geoShape,
        w: node.width,
        h: node.height,
        richText: toRichText(displayText),
        font: "draw",
        size: "s",
        color: color,
        fill: "semi",
        dash: "draw",
        align: "middle",
        verticalAlign: "middle",
      } as any,
    });
  });

  // 4. Dedicated Side Info & Commands Card (infoBox)
  if (layout.infoBox) {
    const infoBoxShapeId = createShapeId(`infobox-${Date.now()}`);
    shapesToCreate.push({
      id: infoBoxShapeId,
      type: "geo",
      x: layout.infoBox.x,
      y: layout.infoBox.y,
      props: {
        geo: "rectangle",
        w: layout.infoBox.width,
        h: layout.infoBox.height,
        richText: toRichText(layout.infoBox.formattedText),
        font: "draw",
        size: "s",
        color: "blue",
        fill: "semi",
        dash: "solid",
        align: "start",
        verticalAlign: "start",
      } as any,
    });
  }

  // 5. Connections / Arrows & Bindings
  const pairCount = new Map<string, number>();

  layout.connections.forEach((conn, index) => {
    const fromShapeId = nodeShapeIdMap.get(conn.from);
    const toShapeId = nodeShapeIdMap.get(conn.to);
    const fromNode = nodeMap.get(conn.from);
    const toNode = nodeMap.get(conn.to);

    if (fromShapeId && toShapeId && fromNode && toNode) {
      const arrowId = createShapeId(`arrow-${conn.id || index}-${Date.now()}`);

      const pairKey = [conn.from, conn.to].sort().join("<->");
      const currentCount = pairCount.get(pairKey) || 0;
      pairCount.set(pairKey, currentCount + 1);

      // Separate multiple connections between the same pair of nodes
      const anchorOffsetY =
        currentCount === 0
          ? 0.5
          : Math.max(0.18, Math.min(0.82, 0.5 + (currentCount % 2 === 1 ? 1 : -1) * 0.18 * Math.ceil(currentCount / 2)));

      let bend = 0;
      if (currentCount === 1) bend = 24;
      else if (currentCount === 2) bend = -24;
      else if (currentCount > 2) bend = (currentCount % 2 === 1 ? 1 : -1) * (currentCount * 14);

      const startX = fromNode.x + fromNode.width / 2;
      const startY = fromNode.y + fromNode.height * anchorOffsetY;
      const endX = toNode.x + toNode.width / 2;
      const endY = toNode.y + toNode.height * anchorOffsetY;

      shapesToCreate.push({
        id: arrowId,
        type: "arrow",
        x: startX,
        y: startY,
        props: {
          start: { x: 0, y: 0 },
          end: { x: endX - startX, y: endY - startY },
          bend,
          richText: toRichText(conn.label || ""),
          arrowheadStart: conn.direction === "bidirectional" ? "arrow" : "none",
          arrowheadEnd: conn.direction === "none" ? "none" : "arrow",
          color: (conn.color as any) || "black",
          dash: conn.style === "dashed" ? "dashed" : conn.style === "dotted" ? "dotted" : "draw",
          size: "m",
          font: "draw",
        } as any,
      });

      // Bind start of arrow to source shape
      bindingsToCreate.push({
        id: createBindingId(`b-start-${conn.id || index}-${Date.now()}`),
        typeName: "binding",
        type: "arrow",
        fromId: arrowId,
        toId: fromShapeId,
        props: {
          terminal: "start",
          normalizedAnchor: { x: 0.5, y: anchorOffsetY },
          isPrecise: false,
          isExact: false,
          snap: "none",
        },
        meta: {},
      } as any);

      // Bind end of arrow to target shape
      bindingsToCreate.push({
        id: createBindingId(`b-end-${conn.id || index}-${Date.now()}`),
        typeName: "binding",
        type: "arrow",
        fromId: arrowId,
        toId: toShapeId,
        props: {
          terminal: "end",
          normalizedAnchor: { x: 0.5, y: anchorOffsetY },
          isPrecise: false,
          isExact: false,
          snap: "none",
        },
        meta: {},
      } as any);
    }
  });

  // 6. Annotations / Callout Notes
  layout.annotations.forEach((ann, index) => {
    const annShapeId = createShapeId(`ann-${ann.id || index}-${Date.now()}`);

    shapesToCreate.push({
      id: annShapeId,
      type: "geo",
      x: ann.x,
      y: ann.y,
      props: {
        geo: "rectangle",
        w: ann.width,
        h: ann.height,
        richText: toRichText(`💡 ${ann.text}`),
        font: "draw",
        size: "s",
        color: "yellow",
        fill: "semi",
        dash: "draw",
        align: "start",
        verticalAlign: "middle",
      } as any,
    });
  });

  // Create all shapes in a single transaction
  editor.createShapes(shapesToCreate);

  // Create bindings so arrows are anchored to shapes
  if (bindingsToCreate.length > 0) {
    try {
      editor.createBindings(bindingsToCreate);
    } catch (e) {
      console.warn("Could not create arrow bindings:", e);
    }
  }

  // Focus and zoom camera to the new diagram with nice padding
  const padding = 130;
  editor.zoomToBounds(
    {
      x: layout.bounds.minX - padding,
      y: layout.bounds.minY - padding - 80,
      w: layout.bounds.width + padding * 2,
      h: layout.bounds.height + padding * 2 + 100,
    },
    {
      animation: { duration: animate ? 400 : 0 },
      inset: 60,
    }
  );

  return layout;
}
