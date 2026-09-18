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

      // REJECT composite system templates: only accept atomic single icons
      // Reject if item contains arrows or line connectors
      const hasArrows = elements.some(
        (el) => el.type === "arrow" || (el.type === "line" && (el.startArrowhead || el.endArrowhead))
      );
      if (hasArrows) return;

      const textElements = elements.filter((el) => el.type === "text" && el.text);
      // Reject if it has more than 1 text label (composite labeled diagram)
      if (textElements.length > 1) return;

      // Reject if too many elements for a single icon
      if (elements.length > 14) return;

      // Calculate bounding box and reject large multi-component scenes
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      elements.forEach((el) => {
        if (el.x < minX) minX = el.x;
        if (el.y < minY) minY = el.y;
        if (el.x + (el.width || 0) > maxX) maxX = el.x + (el.width || 0);
        if (el.y + (el.height || 0) > maxY) maxY = el.y + (el.height || 0);
      });
      const origW = maxX - minX;
      const origH = maxY - minY;
      if (origW > 250 && origH > 250) return;

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
    subtitle?: string,
    colorTheme?: { bg: string; stroke: string }
  ): any[] {
    const rawElements = item.elements;
    if (!rawElements || rawElements.length === 0) return [];

    // CRITICAL: Filter out text, arrows, and connected lines from the icon glyph so they NEVER collide with title/subtitle!
    const iconElements = rawElements.filter(
      (el) => el.type !== "text" && el.type !== "arrow" && !el.startArrowhead && !el.endArrowhead
    );
    if (iconElements.length === 0) return [];

    // Calculate natural bounding box of icon glyph elements
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    iconElements.forEach((el) => {
      if (el.x < minX) minX = el.x;
      if (el.y < minY) minY = el.y;
      if (el.x + (el.width || 0) > maxX) maxX = el.x + (el.width || 0);
      if (el.y + (el.height || 0) > maxY) maxY = el.y + (el.height || 0);
    });

    const origW = Math.max(maxX - minX, 1);
    const origH = Math.max(maxY - minY, 1);

    // Keep icon artwork compact: max 48px width, max 28px height
    const maxIconW = 48;
    const maxIconH = 28;

    const scaleX = maxIconW / origW;
    const scaleY = maxIconH / origH;
    const scale = Math.min(scaleX, scaleY, 1.0);

    const scaledW = origW * scale;
    const scaledH = origH * scale;

    // Center icon horizontally at the top of the card
    const iconOffsetX = (targetWidth - scaledW) / 2;
    const iconOffsetY = 8;

    const groupId = `group-lib-${nodeId}-${Date.now()}`;
    const newElements: any[] = [];

    // 1. Clean container card as the base shape
    const labelText = subtitle ? `${title}\n(${subtitle})` : title;
    const bg = colorTheme?.bg || "#ffffff";
    const stroke = colorTheme?.stroke || "#0284c7";

    newElements.push({
      id: `node-${nodeId}`,
      type: "rectangle",
      x,
      y,
      width: targetWidth,
      height: targetHeight,
      backgroundColor: bg,
      strokeColor: stroke,
      strokeWidth: 2,
      fillStyle: "solid",
      roughness: 0,
      roundness: { type: 3 },
      groupIds: [groupId],
      label: {
        text: labelText,
        fontSize: 12,
        fontFamily: 2, // Helvetica
        textAlign: "center",
        verticalAlign: "bottom",
        strokeColor: "#0f172a",
      },
    });

    // 2. Clone and position pure icon shapes inside the card
    iconElements.forEach((el, index) => {
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


