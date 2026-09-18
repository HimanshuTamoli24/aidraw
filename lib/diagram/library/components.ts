/**
 * Pre-built Excalidraw Library Components for Technical Architecture Diagrams.
 * These provide recognizable vector compositions (Server Racks, Databases,
 * User/Client avatars, Queues, Cache, Cloud, Docker, Gateways, Terminals, etc.)
 */

export interface LibraryComponentDef {
  type: string;
  width: number;
  height: number;
  createElements: (
    nodeId: string,
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    subtitle?: string,
  ) => any[];
}

export const LIBRARY_COMPONENTS: Record<string, LibraryComponentDef> = {
  // 1. DATABASE (Cylinder / Storage Stack)
  database: {
    type: "database",
    width: 220,
    height: 120,
    createElements: (id, x, y, width, height, title, subtitle) => {
      const groupId = `group-${id}`;
      const labelText = subtitle ? `${title}\n(${subtitle})` : title;

      return [
        // Main container
        {
          id: `node-${id}`,
          type: "rectangle",
          x,
          y,
          width,
          height,
          backgroundColor: "#f3e8ff",
          strokeColor: "#7e22ce",
          fillStyle: "solid",
          strokeWidth: 2,
          roughness: 1,
          roundness: { type: 3 },
          groupIds: [groupId],
          label: {
            text: `\n${labelText}`,
            fontSize: 14,
            fontFamily: 1,
            textAlign: "center",
            verticalAlign: "middle",
            strokeColor: "#581c87",
          },
        },
        // Top Disk Ring 1
        {
          id: `${id}-disk-1`,
          type: "ellipse",
          x: x + 12,
          y: y + 8,
          width: width - 24,
          height: 18,
          backgroundColor: "#e9d5ff",
          strokeColor: "#9333ea",
          fillStyle: "solid",
          strokeWidth: 1.5,
          roughness: 1,
          groupIds: [groupId],
        },
        // Storage Tier line 2
        {
          id: `${id}-line-2`,
          type: "line",
          x: x + 16,
          y: y + 36,
          points: [
            [0, 0],
            [width - 32, 0],
          ],
          strokeColor: "#c084fc",
          strokeWidth: 1.5,
          strokeStyle: "dotted",
          groupIds: [groupId],
        },
      ];
    },
  },

  // 2. SERVER / APP SERVER / BACKEND (Server Rack with LED indicators)
  server: {
    type: "server",
    width: 230,
    height: 115,
    createElements: (id, x, y, width, height, title, subtitle) => {
      const groupId = `group-${id}`;
      const labelText = subtitle ? `${title}\n(${subtitle})` : title;

      return [
        {
          id: `node-${id}`,
          type: "rectangle",
          x,
          y,
          width,
          height,
          backgroundColor: "#dcfce7",
          strokeColor: "#15803d",
          fillStyle: "solid",
          strokeWidth: 2,
          roughness: 1,
          roundness: { type: 3 },
          groupIds: [groupId],
          label: {
            text: labelText,
            fontSize: 14,
            fontFamily: 1,
            textAlign: "center",
            verticalAlign: "middle",
            strokeColor: "#14532d",
          },
        },
        // Server Rack Tray Top Line
        {
          id: `${id}-tray-top`,
          type: "line",
          x: x + 10,
          y: y + 16,
          points: [
            [0, 0],
            [width - 20, 0],
          ],
          strokeColor: "#86efac",
          strokeWidth: 1.5,
          groupIds: [groupId],
        },
        // Status LED 1 (Green Active)
        {
          id: `${id}-led-1`,
          type: "ellipse",
          x: x + width - 28,
          y: y + 8,
          width: 6,
          height: 6,
          backgroundColor: "#22c55e",
          strokeColor: "#16a34a",
          fillStyle: "solid",
          strokeWidth: 1,
          groupIds: [groupId],
        },
        // Status LED 2
        {
          id: `${id}-led-2`,
          type: "ellipse",
          x: x + width - 18,
          y: y + 8,
          width: 6,
          height: 6,
          backgroundColor: "#3b82f6",
          strokeColor: "#2563eb",
          fillStyle: "solid",
          strokeWidth: 1,
          groupIds: [groupId],
        },
      ];
    },
  },

  // 3. CACHE / REDIS / MEMORY (In-Memory Flash Block)
  cache: {
    type: "cache",
    width: 220,
    height: 110,
    createElements: (id, x, y, width, height, title, subtitle) => {
      const groupId = `group-${id}`;
      const labelText = subtitle ? `⚡ ${title}\n(${subtitle})` : `⚡ ${title}`;

      return [
        {
          id: `node-${id}`,
          type: "rectangle",
          x,
          y,
          width,
          height,
          backgroundColor: "#fee2e2",
          strokeColor: "#b91c1c",
          fillStyle: "solid",
          strokeWidth: 2,
          roughness: 1,
          roundness: { type: 3 },
          groupIds: [groupId],
          label: {
            text: labelText,
            fontSize: 14,
            fontFamily: 1,
            textAlign: "center",
            verticalAlign: "middle",
            strokeColor: "#7f1d1d",
          },
        },
        // Top RAM Memory slots
        {
          id: `${id}-ram-1`,
          type: "rectangle",
          x: x + 15,
          y: y + 10,
          width: 24,
          height: 8,
          backgroundColor: "#fca5a5",
          strokeColor: "#ef4444",
          fillStyle: "solid",
          strokeWidth: 1,
          groupIds: [groupId],
        },
        {
          id: `${id}-ram-2`,
          type: "rectangle",
          x: x + 45,
          y: y + 10,
          width: 24,
          height: 8,
          backgroundColor: "#fca5a5",
          strokeColor: "#ef4444",
          fillStyle: "solid",
          strokeWidth: 1,
          groupIds: [groupId],
        },
      ];
    },
  },

  // 4. USER / CLIENT / BROWSER (User & Terminal Avatar)
  user: {
    type: "user",
    width: 200,
    height: 105,
    createElements: (id, x, y, width, height, title, subtitle) => {
      const groupId = `group-${id}`;
      const labelText = subtitle ? `👤 ${title}\n(${subtitle})` : `👤 ${title}`;

      return [
        {
          id: `node-${id}`,
          type: "ellipse",
          x,
          y,
          width,
          height,
          backgroundColor: "#e0f2fe",
          strokeColor: "#0369a1",
          fillStyle: "solid",
          strokeWidth: 2,
          roughness: 1,
          groupIds: [groupId],
          label: {
            text: labelText,
            fontSize: 14,
            fontFamily: 1,
            textAlign: "center",
            verticalAlign: "middle",
            strokeColor: "#0c4a6e",
          },
        },
      ];
    },
  },

  // 5. LOAD BALANCER / REVERSE PROXY / NGINX
  "load-balancer": {
    type: "load-balancer",
    width: 230,
    height: 110,
    createElements: (id, x, y, width, height, title, subtitle) => {
      const groupId = `group-${id}`;
      const labelText = subtitle ? `⚖️ ${title}\n(${subtitle})` : `⚖️ ${title}`;

      return [
        {
          id: `node-${id}`,
          type: "diamond",
          x,
          y,
          width,
          height,
          backgroundColor: "#ffedd5",
          strokeColor: "#c2410c",
          fillStyle: "solid",
          strokeWidth: 2,
          roughness: 1,
          groupIds: [groupId],
          label: {
            text: labelText,
            fontSize: 13,
            fontFamily: 1,
            textAlign: "center",
            verticalAlign: "middle",
            strokeColor: "#7c2d12",
          },
        },
      ];
    },
  },

  // 6. CLOUD / INTERNET / CDN
  cloud: {
    type: "cloud",
    width: 250,
    height: 125,
    createElements: (id, x, y, width, height, title, subtitle) => {
      const groupId = `group-${id}`;
      const labelText = subtitle ? `☁️ ${title}\n(${subtitle})` : `☁️ ${title}`;

      return [
        {
          id: `node-${id}`,
          type: "ellipse",
          x,
          y,
          width,
          height,
          backgroundColor: "#f0f9ff",
          strokeColor: "#0284c7",
          fillStyle: "solid",
          strokeWidth: 2,
          roughness: 1.5,
          groupIds: [groupId],
          label: {
            text: labelText,
            fontSize: 14,
            fontFamily: 1,
            textAlign: "center",
            verticalAlign: "middle",
            strokeColor: "#0369a1",
          },
        },
        // Cloud Puff accent 1
        {
          id: `${id}-puff-1`,
          type: "ellipse",
          x: x + 20,
          y: y - 10,
          width: 70,
          height: 40,
          backgroundColor: "#e0f2fe",
          strokeColor: "#38bdf8",
          fillStyle: "solid",
          strokeWidth: 1.5,
          roughness: 1.5,
          groupIds: [groupId],
        },
        // Cloud Puff accent 2
        {
          id: `${id}-puff-2`,
          type: "ellipse",
          x: x + width - 90,
          y: y - 12,
          width: 75,
          height: 42,
          backgroundColor: "#e0f2fe",
          strokeColor: "#38bdf8",
          fillStyle: "solid",
          strokeWidth: 1.5,
          roughness: 1.5,
          groupIds: [groupId],
        },
      ];
    },
  },

  // 7. QUEUE / MESSAGE BROKER / KAFKA / RABBITMQ
  queue: {
    type: "queue",
    width: 220,
    height: 105,
    createElements: (id, x, y, width, height, title, subtitle) => {
      const groupId = `group-${id}`;
      const labelText = subtitle ? `📬 ${title}\n(${subtitle})` : `📬 ${title}`;

      return [
        {
          id: `node-${id}`,
          type: "rectangle",
          x,
          y,
          width,
          height,
          backgroundColor: "#fef3c7",
          strokeColor: "#b45309",
          fillStyle: "solid",
          strokeWidth: 2,
          roughness: 1,
          roundness: { type: 3 },
          groupIds: [groupId],
          label: {
            text: labelText,
            fontSize: 14,
            fontFamily: 1,
            textAlign: "center",
            verticalAlign: "middle",
            strokeColor: "#78350f",
          },
        },
        // Queue stack slots (|||)
        {
          id: `${id}-slot-1`,
          type: "line",
          x: x + 25,
          y: y + 10,
          points: [
            [0, 0],
            [0, height - 20],
          ],
          strokeColor: "#f59e0b",
          strokeWidth: 1.5,
          groupIds: [groupId],
        },
        {
          id: `${id}-slot-2`,
          type: "line",
          x: x + width - 25,
          y: y + 10,
          points: [
            [0, 0],
            [0, height - 20],
          ],
          strokeColor: "#f59e0b",
          strokeWidth: 1.5,
          groupIds: [groupId],
        },
      ];
    },
  },

  // 8. DOCKER / CONTAINER / KUBERNETES
  docker: {
    type: "docker",
    width: 230,
    height: 110,
    createElements: (id, x, y, width, height, title, subtitle) => {
      const groupId = `group-${id}`;
      const labelText = subtitle ? `🐳 ${title}\n(${subtitle})` : `🐳 ${title}`;

      return [
        {
          id: `node-${id}`,
          type: "rectangle",
          x,
          y,
          width,
          height,
          backgroundColor: "#eff6ff",
          strokeColor: "#1d4ed8",
          fillStyle: "solid",
          strokeWidth: 2,
          roughness: 1,
          roundness: { type: 3 },
          groupIds: [groupId],
          label: {
            text: labelText,
            fontSize: 14,
            fontFamily: 1,
            textAlign: "center",
            verticalAlign: "middle",
            strokeColor: "#1e3a8a",
          },
        },
        // Cargo Container mini-boxes at top
        {
          id: `${id}-cargo-1`,
          type: "rectangle",
          x: x + 15,
          y: y + 8,
          width: 16,
          height: 12,
          backgroundColor: "#93c5fd",
          strokeColor: "#2563eb",
          fillStyle: "solid",
          strokeWidth: 1,
          groupIds: [groupId],
        },
        {
          id: `${id}-cargo-2`,
          type: "rectangle",
          x: x + 35,
          y: y + 8,
          width: 16,
          height: 12,
          backgroundColor: "#93c5fd",
          strokeColor: "#2563eb",
          fillStyle: "solid",
          strokeWidth: 1,
          groupIds: [groupId],
        },
        {
          id: `${id}-cargo-3`,
          type: "rectangle",
          x: x + 55,
          y: y + 8,
          width: 16,
          height: 12,
          backgroundColor: "#93c5fd",
          strokeColor: "#2563eb",
          fillStyle: "solid",
          strokeWidth: 1,
          groupIds: [groupId],
        },
      ];
    },
  },

  // 9. TERMINAL / CLI / SHELL (Command Console)
  hardware: {
    type: "hardware",
    width: 220,
    height: 110,
    createElements: (id, x, y, width, height, title, subtitle) => {
      const groupId = `group-${id}`;
      const labelText = subtitle ? `>_ ${title}\n(${subtitle})` : `>_ ${title}`;

      return [
        {
          id: `node-${id}`,
          type: "rectangle",
          x,
          y,
          width,
          height,
          backgroundColor: "#0f172a",
          strokeColor: "#334155",
          fillStyle: "solid",
          strokeWidth: 2,
          roughness: 1,
          roundness: { type: 3 },
          groupIds: [groupId],
          label: {
            text: labelText,
            fontSize: 13,
            fontFamily: 3, // Code / Monospace font
            textAlign: "center",
            verticalAlign: "middle",
            strokeColor: "#38bdf8",
          },
        },
        // Terminal Title Bar Dots
        {
          id: `${id}-dot-1`,
          type: "ellipse",
          x: x + 10,
          y: y + 8,
          width: 5,
          height: 5,
          backgroundColor: "#ef4444",
          strokeColor: "#dc2626",
          fillStyle: "solid",
          strokeWidth: 1,
          groupIds: [groupId],
        },
        {
          id: `${id}-dot-2`,
          type: "ellipse",
          x: x + 20,
          y: y + 8,
          width: 5,
          height: 5,
          backgroundColor: "#eab308",
          strokeColor: "#ca8a04",
          fillStyle: "solid",
          strokeWidth: 1,
          groupIds: [groupId],
        },
        {
          id: `${id}-dot-3`,
          type: "ellipse",
          x: x + 30,
          y: y + 8,
          width: 5,
          height: 5,
          backgroundColor: "#22c55e",
          strokeColor: "#16a34a",
          fillStyle: "solid",
          strokeWidth: 1,
          groupIds: [groupId],
        },
      ];
    },
  },
};

/**
 * Resolves the library component for a given node type.
 */
export function getLibraryComponent(
  nodeType: string,
): LibraryComponentDef | null {
  const normalized = nodeType.toLowerCase().trim();

  if (LIBRARY_COMPONENTS[normalized]) {
    return LIBRARY_COMPONENTS[normalized];
  }

  if (
    [
      "db",
      "postgres",
      "mysql",
      "mongodb",
      "sqlite",
      "dynamodb",
      "storage",
    ].some((t) => normalized.includes(t))
  ) {
    return LIBRARY_COMPONENTS.database;
  }
  if (["redis", "memcached", "cache"].some((t) => normalized.includes(t))) {
    return LIBRARY_COMPONENTS.cache;
  }
  if (
    [
      "server",
      "api",
      "backend",
      "web-server",
      "nginx",
      "node",
      "express",
      "fastapi",
    ].some((t) => normalized.includes(t))
  ) {
    return LIBRARY_COMPONENTS.server;
  }
  if (
    ["browser", "user", "client", "app", "react", "frontend", "mobile"].some(
      (t) => normalized.includes(t),
    )
  ) {
    return LIBRARY_COMPONENTS.user;
  }
  if (
    ["load-balancer", "gateway", "reverse-proxy", "router"].some((t) =>
      normalized.includes(t),
    )
  ) {
    return LIBRARY_COMPONENTS["load-balancer"];
  }
  if (
    ["cloud", "internet", "cdn", "cloudflare", "aws", "gcp", "azure"].some(
      (t) => normalized.includes(t),
    )
  ) {
    return LIBRARY_COMPONENTS.cloud;
  }
  if (
    ["queue", "kafka", "rabbitmq", "sqs", "pubsub"].some((t) =>
      normalized.includes(t),
    )
  ) {
    return LIBRARY_COMPONENTS.queue;
  }
  if (
    ["docker", "container", "kubernetes", "k8s", "pod"].some((t) =>
      normalized.includes(t),
    )
  ) {
    return LIBRARY_COMPONENTS.docker;
  }
  if (
    ["terminal", "cli", "shell", "bash", "powershell", "ssh"].some((t) =>
      normalized.includes(t),
    )
  ) {
    return LIBRARY_COMPONENTS.hardware;
  }

  return null;
}
