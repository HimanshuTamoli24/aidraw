import defaultArchLib from "@/public/libraries/default-architecture.json";

export interface RegisteredLibraryItem {
  id: string;
  name: string;
  tags: string[];
  elements: any[];
}

const SYNONYM_MAP: Record<string, string[]> = {
  server: ["server", "servers", "web-server", "app-server", "nginx", "host", "backend", "api-server", "service", "node", "instance", "vm"],
  database: ["database", "db", "sql", "postgres", "mysql", "mongodb", "dynamodb", "aurora", "persistence", "datastore", "rdbms"],
  docker: ["docker", "container", "containerized", "kubernetes", "k8s", "pod"],
  user: ["user", "users", "client", "person", "human", "actor", "customer", "admin"],
  client: ["client", "browser", "device", "frontend", "desktop", "mobile", "terminal", "computer"],
  cloud: ["cloud", "vpc", "internet", "public", "subnet", "network", "aws", "gcp", "azure"],
  gateway: ["gateway", "apigateway", "api-gateway", "ingress", "reverse-proxy", "proxy", "load-balancer", "lb", "balancer", "elb"],
  firewall: ["firewall", "waf", "security", "shield", "auth", "ssl", "tls"],
  router: ["router", "route", "switch", "hub", "gateway"],
  queue: ["queue", "sqs", "sns", "stream", "kafka", "eventbridge", "message", "broker"],
  storage: ["storage", "s3", "bucket", "blob", "file", "efs", "disk"],
  lambda: ["lambda", "function", "serverless", "faas", "worker"],
  github: ["github", "git", "repo", "repository", "code", "vcs"],
  cache: ["cache", "redis", "memcached", "in-memory"],
  slack: ["slack", "notification", "email", "ses", "alert", "webhook"],
};

class ExcalidrawLibraryStore {
  private items: Map<string, RegisteredLibraryItem> = new Map();

  constructor() {
    // Automatically pre-load the 58 bundled architecture & network icons
    if (defaultArchLib && Array.isArray(defaultArchLib.libraryItems)) {
      this.registerLibraryItems(defaultArchLib.libraryItems);
    }
  }

  /**
   * Registers library items from any .excalidrawlib file structure or API response
   */
  public registerLibraryItems(libraryItems: any[]) {
    if (!Array.isArray(libraryItems)) return;

    libraryItems.forEach((item, idx) => {
      const elements: any[] = item.elements || (Array.isArray(item) ? item : []);
      if (elements.length === 0) return;

      // Extract text content if available
      const textElements = elements.filter((el) => el.type === "text" && el.text);
      const textNames = textElements.map((el) => el.text.toLowerCase());

      // Extract explicit name if available
      const rawName = item.name || textNames[0] || `component-${idx}`;
      const name = String(rawName).trim();
      const lowerName = name.toLowerCase();

      const tags = new Set<string>([
        lowerName,
        ...textNames,
        ...lowerName.split(/[\s-_]+/).filter(Boolean),
      ]);

      // Enrich with known synonyms
      for (const [key, syns] of Object.entries(SYNONYM_MAP)) {
        if (
          lowerName.includes(key) ||
          key.includes(lowerName) ||
          syns.some((s) => lowerName.includes(s) || s.includes(lowerName))
        ) {
          tags.add(key);
          syns.forEach((s) => tags.add(s));
        }
      }

      const itemId = item.id || `lib-item-${idx}-${Date.now()}`;

      this.items.set(itemId, {
        id: itemId,
        name,
        tags: Array.from(tags),
        elements,
      });
    });
  }

  /**
   * Finds the best matching library item based on node type and title
   */
  public findMatchingItem(nodeType: string, nodeTitle?: string): RegisteredLibraryItem | null {
    const queryType = nodeType.toLowerCase().trim();
    const queryTitle = (nodeTitle || "").toLowerCase().trim();

    // 1. Exact or synonym match on nodeType
    for (const item of this.items.values()) {
      if (item.tags.some((t) => t === queryType || queryType.includes(t) || t.includes(queryType))) {
        return item;
      }
    }

    // 2. Match on queryTitle words (e.g. "Nginx Server", "PostgreSQL Database", "Docker Container")
    if (queryTitle) {
      const titleWords = queryTitle.split(/[\s-_]+/).filter((w) => w.length > 2);
      for (const item of this.items.values()) {
        if (item.tags.some((t) => titleWords.some((tw) => t === tw || t.includes(tw)))) {
          return item;
        }
      }
    }

    // 3. Fallback synonym match via SYNONYM_MAP
    for (const [key, syns] of Object.entries(SYNONYM_MAP)) {
      if (key === queryType || syns.includes(queryType) || syns.some((s) => queryTitle.includes(s))) {
        for (const item of this.items.values()) {
          if (item.tags.includes(key) || item.tags.some((t) => syns.includes(t))) {
            return item;
          }
        }
      }
    }

    return null;
  }

  /**
   * Instantiates a library item inside a clean card container onto canvas coordinates
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

    // Calculate natural bounding box of original icon elements
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

    // Reserve top 55% of the card height for the icon, bottom 45% for the text
    const maxIconW = targetWidth - 36;
    const maxIconH = Math.max(targetHeight * 0.45, 40);

    const scaleX = maxIconW / origW;
    const scaleY = maxIconH / origH;
    const scale = Math.min(scaleX, scaleY, 1.2); // Don't overscale tiny icons

    const scaledW = origW * scale;
    const scaledH = origH * scale;

    // Center icon horizontally, position in top section
    const iconOffsetX = (targetWidth - scaledW) / 2;
    const iconOffsetY = 14;

    const groupId = `group-lib-${nodeId}-${Date.now()}`;
    const newElements: any[] = [];

    // 1. Clean container card as the base shape (arrows connect cleanly to this)
    const labelText = subtitle ? `${title}\n(${subtitle})` : title;
    newElements.push({
      id: `node-${nodeId}`,
      type: "rectangle",
      x,
      y,
      width: targetWidth,
      height: targetHeight,
      backgroundColor: "#ffffff",
      strokeColor: "#0284c7",
      strokeWidth: 2,
      fillStyle: "solid",
      roughness: 0,
      roundness: { type: 3 },
      groupIds: [groupId],
      label: {
        text: labelText,
        fontSize: 13,
        fontFamily: 2, // Helvetica
        textAlign: "center",
        verticalAlign: "bottom",
        strokeColor: "#0f172a",
      },
    });

    // 2. Clone and position icon elements inside the card
    rawElements.forEach((el, index) => {
      const elX = x + iconOffsetX + (el.x - minX) * scale;
      const elY = y + iconOffsetY + (el.y - minY) * scale;

      const cloned = {
        ...el,
        id: `lib-el-${nodeId}-${index}-${Date.now()}`,
        x: elX,
        y: elY,
        width: (el.width || 10) * scale,
        height: (el.height || 10) * scale,
        roughness: 0,
        groupIds: [groupId, ...(el.groupIds || [])],
      };

      newElements.push(cloned);
    });

    return newElements;
  }
}

export const libraryStore = new ExcalidrawLibraryStore();

