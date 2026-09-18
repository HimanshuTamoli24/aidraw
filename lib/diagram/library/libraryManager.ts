/**
 * Excalidraw Library Manager
 * Handles downloading, indexing, and instantiating Excalidraw library items on canvas.
 */

export interface RegisteredLibraryItem {
  id: string;
  name: string;
  tags: string[];
  elements: any[];
}

class ExcalidrawLibraryStore {
  private items: Map<string, RegisteredLibraryItem> = new Map();

  /**
   * Registers library items from a .excalidrawlib file structure
   */
  public registerLibraryItems(libraryItems: any[]) {
    if (!Array.isArray(libraryItems)) return;

    libraryItems.forEach((item, idx) => {
      const elements: any[] = item.elements || (Array.isArray(item) ? item : []);
      if (elements.length === 0) return;

      // Extract text content if available to use as name / tags
      const textElements = elements.filter((el) => el.type === "text" && el.text);
      const textNames = textElements.map((el) => el.text.toLowerCase());

      const itemId = item.id || `lib-item-${idx}-${Date.now()}`;
      const name = textNames[0] || `component-${idx}`;

      const tags = [
        name.toLowerCase(),
        ...textNames,
        ...name.split(/[\s-_]+/).map((s: string) => s.toLowerCase()),
      ];

      this.items.set(itemId, {
        id: itemId,
        name,
        tags,
        elements,
      });
    });
  }

  /**
   * Finds a matching library item based on node type and title
   */
  public findMatchingItem(nodeType: string, nodeTitle?: string): RegisteredLibraryItem | null {
    const queryType = nodeType.toLowerCase().trim();
    const queryTitle = (nodeTitle || "").toLowerCase().trim();

    // 1. Direct tag match
    for (const item of this.items.values()) {
      if (item.tags.some((t) => t.includes(queryType) || queryType.includes(t))) {
        return item;
      }
      if (queryTitle && item.tags.some((t) => t.includes(queryTitle) || queryTitle.includes(t))) {
        return item;
      }
    }

    return null;
  }

  /**
   * Instantiates a library item onto specific canvas coordinates (x, y, w, h)
   */
  public instantiateItem(
    item: RegisteredLibraryItem,
    nodeId: string,
    x: number,
    y: number,
    targetWidth: number,
    targetHeight: number,
    title: string,
    subtitle?: string
  ): any[] {
    const rawElements = item.elements;
    if (!rawElements || rawElements.length === 0) return [];

    // Calculate natural bounding box of original elements
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    rawElements.forEach((el) => {
      if (el.x < minX) minX = el.x;
      if (el.y < minY) minY = el.y;
      if (el.x + (el.width || 0) > maxX) maxX = el.x + (el.width || 0);
      if (el.y + (el.height || 0) > maxY) maxY = el.y + (el.height || 0);
    });

    const origW = Math.max(maxX - minX, 1);
    const origH = Math.max(maxY - minY, 1);

    const scaleX = targetWidth / origW;
    const scaleY = targetHeight / origH;
    const scale = Math.min(scaleX, scaleY);

    const groupId = `group-lib-${nodeId}-${Date.now()}`;
    const newElements: any[] = [];

    // Clone and reposition elements
    rawElements.forEach((el, index) => {
      const offsetX = (el.x - minX) * scale;
      const offsetY = (el.y - minY) * scale;

      const cloned = {
        ...el,
        id: `lib-el-${nodeId}-${index}-${Date.now()}`,
        x: x + offsetX,
        y: y + offsetY,
        width: (el.width || 10) * scale,
        height: (el.height || 10) * scale,
        groupIds: [groupId, ...(el.groupIds || [])],
      };

      newElements.push(cloned);
    });

    // Add a primary title label card attached to the component
    const labelText = subtitle ? `${title}\n(${subtitle})` : title;
    newElements.push({
      id: `node-${nodeId}`,
      type: "rectangle",
      x,
      y: y + targetHeight + 8,
      width: Math.max(targetWidth, labelText.length * 8 + 20),
      height: subtitle ? 48 : 36,
      backgroundColor: "transparent",
      strokeColor: "transparent",
      groupIds: [groupId],
      label: {
        text: labelText,
        fontSize: 14,
        fontFamily: 1,
        textAlign: "center",
        verticalAlign: "middle",
        strokeColor: "#0f172a",
      },
    });

    return newElements;
  }
}

export const libraryStore = new ExcalidrawLibraryStore();
