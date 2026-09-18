import { z } from "zod";

export const DiagramNodeSchema = z.object({
  id: z.string().describe("Unique identifier for the node, e.g., 'browser', 'dns-resolver', 'web-server'"),
  type: z
    .string()
    .default("generic")
    .describe("Category of the component"),
  title: z.string().describe("Clear, concise display name for the node"),
  subtitle: z.string().optional().describe("Optional short technical detail, e.g., 'Port 443', 'Nginx', 'PostgreSQL'"),
  description: z.string().optional().describe("Optional brief description"),
  group: z.string().optional().describe("Optional group/zone id or name, e.g. 'Client Side', 'DMZ', 'VPC'"),
  shape: z.enum(["rectangle", "ellipse", "cloud", "diamond", "rounded"]).optional().catch("rectangle"),
  color: z
    .enum(["black", "blue", "green", "violet", "orange", "grey", "light-blue", "red", "yellow"])
    .optional()
    .catch("black"),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const DiagramConnectionSchema = z.object({
  id: z.string().describe("Unique connection ID, e.g., 'conn-1'"),
  from: z.string().describe("Source node ID"),
  to: z.string().describe("Target node ID"),
  label: z.string().optional().describe("Label on the arrow, e.g., '1. DNS Query (UDP 53)', 'HTTPS / TLS 1.3', 'SQL Query'"),
  direction: z.enum(["forward", "bidirectional", "none"]).optional().catch("forward"),
  style: z.enum(["solid", "dashed", "dotted"]).optional().catch("solid"),
  color: z
    .enum(["black", "blue", "green", "violet", "orange", "grey", "light-blue", "red", "yellow"])
    .optional()
    .catch("black"),
});

export const DiagramGroupSchema = z.object({
  id: z.string().describe("Group identifier, e.g., 'zone-public', 'zone-private'"),
  title: z.string().describe("Group/Zone title, e.g., 'Public Network', 'Internal VPC', 'Application Cluster'"),
  nodeIds: z.array(z.string()).default([]),
  color: z
    .enum(["black", "blue", "green", "violet", "orange", "grey", "light-blue", "red", "yellow"])
    .optional()
    .catch("grey"),
  style: z.enum(["dashed", "solid", "dotted", "none"]).optional().catch("dashed"),
});

export const DiagramAnnotationSchema = z.object({
  id: z.string().describe("Annotation ID"),
  text: z.string().describe("Annotation text or explanation note"),
  targetNodeId: z.string().optional().describe("Node ID this annotation points to or explains"),
  position: z.enum(["top", "bottom", "left", "right", "top-right", "standalone"]).optional().catch("top"),
  type: z.enum(["note", "callout", "step", "badge"]).optional().catch("callout"),
});

export const DiagramInfoBoxSchema = z.object({
  title: z.string().default("Architecture & Quick Commands"),
  items: z.array(z.string()).default([]).describe("Key commands, protocols, or bullet points to display in a dedicated side info card"),
  side: z.enum(["right", "left"]).optional().default("right").catch("right"),
});

export const DiagramSchema = z.object({
  title: z.string().describe("Clear title of the overall diagram"),
  summary: z.string().optional().describe("Short 1-2 sentence summary of the architecture or flow"),
  layout: z
    .enum(["horizontal", "vertical", "layered", "grouped"])
    .optional()
    .catch("horizontal"),
  nodes: z.array(DiagramNodeSchema).min(1).describe("List of diagram nodes"),
  connections: z.array(DiagramConnectionSchema).optional().default([]),
  groups: z.array(DiagramGroupSchema).optional().default([]),
  annotations: z.array(DiagramAnnotationSchema).optional().default([]),
  infoBox: DiagramInfoBoxSchema.optional().describe("Dedicated side guide / cheatsheet box with practical commands & key points"),
  explanation: z.string().optional().describe("Detailed markdown explanation of the technical concept for the chat interface"),
});

export type DiagramNode = z.infer<typeof DiagramNodeSchema>;
export type DiagramConnection = z.infer<typeof DiagramConnectionSchema>;
export type DiagramGroup = z.infer<typeof DiagramGroupSchema>;
export type DiagramAnnotation = z.infer<typeof DiagramAnnotationSchema>;
export type DiagramInfoBox = z.infer<typeof DiagramInfoBoxSchema>;
export type Diagram = z.infer<typeof DiagramSchema>;

export interface LayoutedNode extends DiagramNode {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutedGroup extends DiagramGroup {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutedAnnotation extends DiagramAnnotation {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutedInfoBox extends DiagramInfoBox {
  x: number;
  y: number;
  width: number;
  height: number;
  formattedText: string;
}

export interface LayoutedDiagram {
  title: string;
  summary?: string;
  layout: "horizontal" | "vertical" | "layered" | "grouped";
  nodes: LayoutedNode[];
  connections: DiagramConnection[];
  groups: LayoutedGroup[];
  annotations: LayoutedAnnotation[];
  infoBox?: LayoutedInfoBox;
  explanation?: string;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
}
