import {
  Diagram,
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

export function computeDiagramLayout(
  diagram: Diagram,
  options: LayoutOptions = {}
): LayoutedDiagram {
  const { startX = 140, startY = 180, gapX = 300, gapY = 200 } = options;

  const nodeMap = new Map<string, LayoutedNode>();
  const nodes = diagram.nodes || [];
  const connections = diagram.connections || [];
  const groups = diagram.groups || [];
  const annotations = diagram.annotations || [];

  // 1. Calculate realistic dimensions for each node based on text length
  nodes.forEach((n) => {
    let width = 240;
    let height = 100;

    const titleLen = n.title.length;
    const subLen = n.subtitle ? n.subtitle.length : 0;
    const maxLen = Math.max(titleLen, subLen);

    if (maxLen > 16) {
      width = Math.min(340, 240 + (maxLen - 16) * 6);
    }
    if (n.subtitle) {
      height = 110;
    }

    if (n.shape === "cloud") {
      width = Math.max(width, 250);
      height = Math.max(height, 125);
    } else if (n.shape === "ellipse") {
      width = Math.max(width, 230);
      height = Math.max(height, 110);
    } else if (n.shape === "diamond") {
      width = Math.max(width, 190);
      height = Math.max(height, 130);
    }

    nodeMap.set(n.id, {
      ...n,
      x: n.x ?? 0,
      y: n.y ?? 0,
      width: n.width ?? width,
      height: n.height ?? height,
    });
  });

  // 2. Build adjacency graph to find topological layers / flow order
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

  // 3. Assign layers (rank) using BFS / longest path from roots
  const nodeLayer = new Map<string, number>();
  const queue: string[] = [];

  // Find root nodes (inDegree === 0)
  nodes.forEach((n) => {
    if ((inDegree.get(n.id) || 0) === 0) {
      queue.push(n.id);
      nodeLayer.set(n.id, 0);
    }
  });

  // Fallback if there are cycles or no inDegree === 0 nodes
  if (queue.length === 0 && nodes.length > 0) {
    queue.push(nodes[0].id);
    nodeLayer.set(nodes[0].id, 0);
  }

  // BFS / topological layer assignment
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

  // Assign layers to any disconnected / remaining nodes
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

  // 4. Group nodes by layer
  const layersMap = new Map<number, string[]>();
  nodeLayer.forEach((layer, id) => {
    if (!layersMap.has(layer)) {
      layersMap.set(layer, []);
    }
    layersMap.get(layer)!.push(id);
  });

  const sortedLayerIndices = Array.from(layersMap.keys()).sort((a, b) => a - b);

  // 5. Position nodes with wide spacing and vertical alignment
  const layoutMode = diagram.layout || "horizontal";

  if (layoutMode === "vertical") {
    let currentY = startY;
    sortedLayerIndices.forEach((layerIdx) => {
      const layerNodeIds = layersMap.get(layerIdx)!;
      let totalWidth = 0;
      layerNodeIds.forEach((id) => {
        totalWidth += nodeMap.get(id)!.width;
      });
      totalWidth += (layerNodeIds.length - 1) * gapX;

      let currentX = startX - totalWidth / 2;
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

  // 6. Calculate Group Bounding Boxes
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

      const paddingX = 45;
      const paddingTop = 60;
      const paddingBottom = 40;

      layoutedGroups.push({
        ...g,
        x: minX - paddingX,
        y: minY - paddingTop,
        width: maxX - minX + paddingX * 2,
        height: maxY - minY + paddingTop + paddingBottom,
      });
    }
  });

  // 7. Calculate Callout Notes in Clean Whitespace Gutters
  const layoutedAnnotations: LayoutedAnnotation[] = [];
  annotations.forEach((ann, idx) => {
    const annWidth = Math.min(Math.max(ann.text.length * 7 + 40, 200), 320);
    const annHeight = 65;

    let annX = startX;
    let annY = startY - 110;

    if (ann.targetNodeId && nodeMap.has(ann.targetNodeId)) {
      const target = nodeMap.get(ann.targetNodeId)!;
      // Position above or below with plenty of vertical clearance
      if (target.y <= startY + 50) {
        annX = target.x + (target.width - annWidth) / 2;
        annY = target.y - annHeight - 30;
      } else {
        annX = target.x + (target.width - annWidth) / 2;
        annY = target.y + target.height + 30;
      }
    } else {
      annX = startX + idx * 320;
      annY = startY - 120;
    }

    layoutedAnnotations.push({
      ...ann,
      x: annX,
      y: annY,
      width: annWidth,
      height: annHeight,
    });
  });

  // 8. Compute total bounds of nodes, groups, annotations
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

  layoutedAnnotations.forEach((a) => {
    if (a.x < minX) minX = a.x;
    if (a.y < minY) minY = a.y;
    if (a.x + a.width > maxX) maxX = a.x + a.width;
    if (a.y + a.height > maxY) maxY = a.y + a.height;
  });

  if (minX === Infinity) {
    minX = 0;
    minY = 0;
    maxX = 800;
    maxY = 600;
  }

  // 9. Position Side Info & Command Box (infoBox)
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

    const boxWidth = 360;
    const boxHeight = Math.max(180, formattedLines.length * 28 + 40);

    const isLeft = diagram.infoBox.side === "left";
    const infoX = isLeft ? minX - boxWidth - 60 : maxX + 60;
    const infoY = minY;

    layoutedInfoBox = {
      ...diagram.infoBox,
      x: infoX,
      y: infoY,
      width: boxWidth,
      height: boxHeight,
      formattedText,
    };

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
