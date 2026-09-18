import {
  Diagram,
  DiagramAnnotation,
  LayoutedAnnotation,
  LayoutedDiagram,
  LayoutedGroup,
  LayoutedInfoBox,
  LayoutedNode,
} from "./types";

interface LayoutOptions {
  startX?: number;
  startY?: number;
  gapX?: number;
  gapY?: number;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Check if two bounding boxes overlap (with optional padding).
 */
function boxesOverlap(a: BoundingBox, b: BoundingBox, padding = 0): boolean {
  return (
    a.x - padding < b.x + b.width &&
    a.x + a.width + padding > b.x &&
    a.y - padding < b.y + b.height &&
    a.y + a.height + padding > b.y
  );
}

/**
 * Compute realistic text-based dimensions for a node.
 * Measures title + subtitle text length and ensures no overflow.
 */
function computeNodeDimensions(
  title: string,
  subtitle?: string,
  shape?: string
): { width: number; height: number } {
  // Base dimensions — generous defaults
  let width = 280;
  let height = 110;

  // Scale width based on longest text line
  const titleLen = title.length;
  const subLen = subtitle ? subtitle.length : 0;
  const maxTextLen = Math.max(titleLen, subLen);

  // ~9px per character at font-size 14-15, plus padding
  const textWidth = maxTextLen * 9 + 60;
  width = Math.max(width, Math.min(420, textWidth));

  // If subtitle exists, add vertical space
  if (subtitle) {
    height = 130;
  }

  // Shape-specific minimum dimensions
  switch (shape) {
    case "cloud":
      width = Math.max(width, 300);
      height = Math.max(height, 140);
      break;
    case "ellipse":
      // Ellipses need extra space because text is inscribed
      width = Math.max(width, 280);
      height = Math.max(height, 130);
      break;
    case "diamond":
      // Diamonds need even more space — text is inscribed in a rotated square
      width = Math.max(width, 260);
      height = Math.max(height, 160);
      break;
    case "rounded":
      width = Math.max(width, 280);
      break;
  }

  return { width, height };
}

export function computeDiagramLayout(
  diagram: Diagram,
  options: LayoutOptions = {}
): LayoutedDiagram {
  const { startX = 160, startY = 200, gapX = 380, gapY = 260 } = options;

  const nodeMap = new Map<string, LayoutedNode>();
  const nodes = diagram.nodes || [];
  const connections = diagram.connections || [];
  const groups = diagram.groups || [];
  const annotations = diagram.annotations || [];

  // ──────────────────────────────────────────────────────────
  // 1. Calculate realistic dimensions for each node
  // ──────────────────────────────────────────────────────────
  nodes.forEach((n) => {
    const dims = computeNodeDimensions(n.title, n.subtitle, n.shape);

    nodeMap.set(n.id, {
      ...n,
      x: n.x ?? 0,
      y: n.y ?? 0,
      width: n.width ?? dims.width,
      height: n.height ?? dims.height,
    });
  });

  // ──────────────────────────────────────────────────────────
  // 2. Build adjacency graph for topological layer assignment
  // ──────────────────────────────────────────────────────────
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach((n) => {
    outgoing.set(n.id, []);
    incoming.set(n.id, []);
    inDegree.set(n.id, 0);
  });

  connections.forEach((c) => {
    if (nodeMap.has(c.from) && nodeMap.has(c.to) && c.from !== c.to) {
      outgoing.get(c.from)!.push(c.to);
      incoming.get(c.to)!.push(c.from);
      inDegree.set(c.to, (inDegree.get(c.to) || 0) + 1);
    }
  });

  // ──────────────────────────────────────────────────────────
  // 3. Assign layers using longest-path BFS from roots
  // ──────────────────────────────────────────────────────────
  const nodeLayer = new Map<string, number>();
  const queue: string[] = [];

  // Find root nodes (inDegree === 0)
  nodes.forEach((n) => {
    if ((inDegree.get(n.id) || 0) === 0) {
      queue.push(n.id);
      nodeLayer.set(n.id, 0);
    }
  });

  // Fallback if all nodes are in a cycle
  if (queue.length === 0 && nodes.length > 0) {
    queue.push(nodes[0].id);
    nodeLayer.set(nodes[0].id, 0);
  }

  // BFS topological layer assignment (longest path variant)
  const visited = new Set<string>();
  while (queue.length > 0) {
    const currId = queue.shift()!;
    visited.add(currId);
    const currLayer = nodeLayer.get(currId) || 0;

    const neighbors = outgoing.get(currId) || [];
    for (const nextId of neighbors) {
      const existingLayer = nodeLayer.get(nextId);
      const nextLayer = Math.max(existingLayer ?? 0, currLayer + 1);
      nodeLayer.set(nextId, nextLayer);

      if (!visited.has(nextId) && !queue.includes(nextId)) {
        queue.push(nextId);
      }
    }
  }

  // Assign layers to any disconnected/remaining nodes
  let maxLayerSoFar = 0;
  nodeLayer.forEach((layer) => {
    if (layer > maxLayerSoFar) maxLayerSoFar = layer;
  });

  nodes.forEach((n) => {
    if (!nodeLayer.has(n.id)) {
      maxLayerSoFar += 1;
      nodeLayer.set(n.id, maxLayerSoFar);
    }
  });

  // ──────────────────────────────────────────────────────────
  // 4. Group nodes by layer
  // ──────────────────────────────────────────────────────────
  const layersMap = new Map<number, string[]>();
  nodeLayer.forEach((layer, id) => {
    if (!layersMap.has(layer)) {
      layersMap.set(layer, []);
    }
    layersMap.get(layer)!.push(id);
  });

  const sortedLayerIndices = Array.from(layersMap.keys()).sort((a, b) => a - b);

  // ──────────────────────────────────────────────────────────
  // 5. Position nodes with generous spacing
  // ──────────────────────────────────────────────────────────
  const layoutMode = diagram.layout || "horizontal";

  if (layoutMode === "vertical") {
    // Vertical: layers go top-to-bottom, nodes within a layer are side-by-side
    let currentY = startY;
    sortedLayerIndices.forEach((layerIdx) => {
      const layerNodeIds = layersMap.get(layerIdx)!;
      let totalWidth = 0;
      layerNodeIds.forEach((id) => {
        totalWidth += nodeMap.get(id)!.width;
      });
      totalWidth += (layerNodeIds.length - 1) * gapX;

      // Center the layer horizontally around startX
      let currentX = startX + 200 - totalWidth / 2;
      let maxHeightInLayer = 0;

      layerNodeIds.forEach((id) => {
        const node = nodeMap.get(id)!;
        node.x = currentX;
        node.y = currentY;
        currentX += node.width + gapX;
        maxHeightInLayer = Math.max(maxHeightInLayer, node.height);
      });

      currentY += maxHeightInLayer + gapY;
    });
  } else {
    // Horizontal / Layered (Left-to-Right)
    let currentX = startX;

    // Pre-calculate the tallest layer to vertically center all layers
    let maxLayerHeight = 0;
    sortedLayerIndices.forEach((layerIdx) => {
      const layerNodeIds = layersMap.get(layerIdx)!;
      const height =
        layerNodeIds.reduce((sum, id) => sum + nodeMap.get(id)!.height, 0) +
        (layerNodeIds.length - 1) * gapY;
      if (height > maxLayerHeight) maxLayerHeight = height;
    });

    sortedLayerIndices.forEach((layerIdx) => {
      const layerNodeIds = layersMap.get(layerIdx)!;
      let maxWidthInLayer = 0;

      const layerTotalHeight =
        layerNodeIds.reduce((sum, id) => sum + nodeMap.get(id)!.height, 0) +
        (layerNodeIds.length - 1) * gapY;

      // Center this layer vertically relative to the tallest layer
      let currentY = startY + Math.max(0, (maxLayerHeight - layerTotalHeight) / 2);

      layerNodeIds.forEach((id) => {
        const node = nodeMap.get(id)!;
        node.x = currentX;
        node.y = currentY;
        currentY += node.height + gapY;
        maxWidthInLayer = Math.max(maxWidthInLayer, node.width);
      });

      currentX += maxWidthInLayer + gapX;
    });
  }

  const layoutedNodes = Array.from(nodeMap.values());

  // ──────────────────────────────────────────────────────────
  // 6. Post-layout collision sweep for nodes
  //    Nudge any overlapping nodes apart
  // ──────────────────────────────────────────────────────────
  const COLLISION_PADDING = 40;
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < layoutedNodes.length; i++) {
      for (let j = i + 1; j < layoutedNodes.length; j++) {
        const a = layoutedNodes[i];
        const b = layoutedNodes[j];

        if (
          boxesOverlap(
            { x: a.x, y: a.y, width: a.width, height: a.height },
            { x: b.x, y: b.y, width: b.width, height: b.height },
            COLLISION_PADDING
          )
        ) {
          // Push the later node down/right
          if (layoutMode === "vertical") {
            b.y = a.y + a.height + gapY;
          } else {
            // If same layer (similar X), push down. Otherwise push right.
            if (Math.abs(a.x - b.x) < a.width) {
              b.y = a.y + a.height + gapY;
            } else {
              b.x = a.x + a.width + gapX;
            }
          }
        }
      }
    }
  }

  // ──────────────────────────────────────────────────────────
  // 7. Calculate Group Bounding Boxes with generous padding
  // ──────────────────────────────────────────────────────────
  const layoutedGroups: LayoutedGroup[] = [];
  groups.forEach((g) => {
    const memberNodes = g.nodeIds
      .map((id) => nodeMap.get(id))
      .filter((n): n is LayoutedNode => !!n);

    if (memberNodes.length > 0) {
      const minX = Math.min(...memberNodes.map((n) => n.x));
      const minY = Math.min(...memberNodes.map((n) => n.y));
      const maxX = Math.max(...memberNodes.map((n) => n.x + n.width));
      const maxY = Math.max(...memberNodes.map((n) => n.y + n.height));

      const paddingX = 60;
      const paddingTop = 80;
      const paddingBottom = 55;

      layoutedGroups.push({
        ...g,
        x: minX - paddingX,
        y: minY - paddingTop,
        width: maxX - minX + paddingX * 2,
        height: maxY - minY + paddingTop + paddingBottom,
      });
    }
  });

  // ──────────────────────────────────────────────────────────
  // 8. Compute total bounds of nodes + groups
  // ──────────────────────────────────────────────────────────
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  layoutedNodes.forEach((n) => {
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x + n.width > maxX) maxX = n.x + n.width;
    if (n.y + n.height > maxY) maxY = n.y + n.height;
  });

  layoutedGroups.forEach((g) => {
    if (g.x < minX) minX = g.x;
    if (g.y < minY) minY = g.y;
    if (g.x + g.width > maxX) maxX = g.x + g.width;
    if (g.y + g.height > maxY) maxY = g.y + g.height;
  });

  if (minX === Infinity) {
    minX = 0;
    minY = 0;
    maxX = 800;
    maxY = 600;
  }

  // ──────────────────────────────────────────────────────────
  // 9. Smart Annotation Placement — find empty gutters
  //    Uses collision checking against all placed elements
  // ──────────────────────────────────────────────────────────
  const allOccupied: BoundingBox[] = [
    ...layoutedNodes.map((n) => ({ x: n.x, y: n.y, width: n.width, height: n.height })),
    ...layoutedGroups.map((g) => ({ x: g.x, y: g.y, width: g.width, height: g.height })),
  ];

  const layoutedAnnotations: LayoutedAnnotation[] = [];
  annotations.forEach((ann) => {
    const annWidth = Math.min(Math.max(ann.text.length * 7 + 50, 220), 360);
    const annHeight = 70;

    let bestX = minX;
    let bestY = minY - annHeight - 50;

    if (ann.targetNodeId && nodeMap.has(ann.targetNodeId)) {
      const target = nodeMap.get(ann.targetNodeId)!;

      // Try candidate positions: above, below, right, left of the target
      const candidates: BoundingBox[] = [
        { x: target.x, y: target.y - annHeight - 40, width: annWidth, height: annHeight }, // above
        { x: target.x, y: target.y + target.height + 40, width: annWidth, height: annHeight }, // below
        { x: target.x + target.width + 30, y: target.y, width: annWidth, height: annHeight }, // right
        { x: target.x - annWidth - 30, y: target.y, width: annWidth, height: annHeight }, // left
      ];

      let placed = false;
      for (const candidate of candidates) {
        const overlaps = allOccupied.some((occ) => boxesOverlap(candidate, occ, 15));
        if (!overlaps) {
          bestX = candidate.x;
          bestY = candidate.y;
          placed = true;
          break;
        }
      }

      // Fallback: place above with offset if all candidates overlap
      if (!placed) {
        bestX = target.x + (target.width - annWidth) / 2;
        bestY = target.y - annHeight - 60;
      }
    } else {
      // No target node — place above the diagram in a row
      const existingAnnCount = layoutedAnnotations.length;
      bestX = minX + existingAnnCount * (annWidth + 30);
      bestY = minY - annHeight - 50;
    }

    const annBox: BoundingBox = { x: bestX, y: bestY, width: annWidth, height: annHeight };
    allOccupied.push(annBox);

    layoutedAnnotations.push({
      ...ann,
      x: bestX,
      y: bestY,
      width: annWidth,
      height: annHeight,
    });
  });

  // Update bounds with annotations
  layoutedAnnotations.forEach((a) => {
    if (a.x < minX) minX = a.x;
    if (a.y < minY) minY = a.y;
    if (a.x + a.width > maxX) maxX = a.x + a.width;
    if (a.y + a.height > maxY) maxY = a.y + a.height;
  });

  // ──────────────────────────────────────────────────────────
  // 10. Position Side Info & Command Box (infoBox)
  //     Placed with 100px margin from the diagram body
  // ──────────────────────────────────────────────────────────
  let layoutedInfoBox: LayoutedInfoBox | undefined;
  if (diagram.infoBox && diagram.infoBox.items && diagram.infoBox.items.length > 0) {
    const infoItems = diagram.infoBox.items;
    const boxTitle = diagram.infoBox.title || "Quick Reference & Commands";

    const formattedLines = [
      `📌 ${boxTitle.toUpperCase()}`,
      "───────────────────────────────",
      ...infoItems.map((item) => (item.startsWith("•") || item.startsWith("-") ? item : `• ${item}`)),
    ];
    const formattedText = formattedLines.join("\n");

    // Wider box for readability
    const boxWidth = 400;
    const boxHeight = Math.max(200, formattedLines.length * 30 + 50);

    const isLeft = diagram.infoBox.side === "left";
    const infoMargin = 100;
    const infoX = isLeft ? minX - boxWidth - infoMargin : maxX + infoMargin;
    const infoY = minY;

    layoutedInfoBox = {
      ...diagram.infoBox,
      x: infoX,
      y: infoY,
      width: boxWidth,
      height: boxHeight,
      formattedText,
    };

    // Expand diagram bounds to include the info box
    if (infoX < minX) minX = infoX;
    if (infoX + boxWidth > maxX) maxX = infoX + boxWidth;
    if (infoY + boxHeight > maxY) maxY = infoY + boxHeight;
  }

  return {
    title: diagram.title,
    summary: diagram.summary,
    layout: layoutMode,
    nodes: layoutedNodes,
    connections,
    groups: layoutedGroups,
    annotations: layoutedAnnotations,
    infoBox: layoutedInfoBox,
    explanation: diagram.explanation,
    bounds: {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    },
  };
}
