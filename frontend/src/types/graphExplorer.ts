import type { GraphNode, GraphEdge } from "./datashow";

// Visualization block types (discriminated union)

export interface GraphVisualization {
  type: "graph";
  title: string;
  description?: string;
  graph_data: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    categories: string[];
  };
}

export interface MermaidVisualization {
  type: "mermaid";
  title: string;
  description?: string;
  mermaid_code: string;
  mermaid_type: "flowchart" | "mindmap" | "timeline" | "sequence" | "classDiagram";
}

export interface TableVisualization {
  type: "table";
  title: string;
  description?: string;
  columns: { key: string; title: string }[];
  rows: Record<string, unknown>[];
}

export interface EChartsVisualization {
  type: "echarts";
  title: string;
  description?: string;
  echarts_option: Record<string, unknown>;
  chart_type: string;
}

export type VisualizationBlock =
  | GraphVisualization
  | MermaidVisualization
  | TableVisualization
  | EChartsVisualization;

export interface EntityInfo {
  name: string;
  type: "person" | "company" | "event" | "organization";
}

export interface ExplorerResult {
  task_id: string;
  agent_type: string;
  summary: string;
  query_interpretation: string;
  entities: EntityInfo[];
  relationship_summary: string;
  visualizations: VisualizationBlock[];
  data_sources: string[];
  metadata: Record<string, unknown>;
}

export interface ExplorerQuery {
  query: string;
  timestamp: string;
  taskId?: string;
  status: "pending" | "running" | "completed" | "failed";
}

export interface ExplorerProgress {
  progress: number;
  stage: string;
  message: string;
  stageIndex?: number;
  totalStages?: number;
}
