export type TaskStatus = "pending" | "running" | "completed" | "failed";

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  color: string;
  tags: string[];
  icon: string;
  status: "ready" | "beta" | "coming";
}

export interface AgentConfigField {
  name: string;
  label: string;
  type: "text" | "select" | "multiselect" | "file";
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  default?: string | string[];
}

export interface AgentConfigSchema {
  agent_id: string;
  fields: AgentConfigField[];
}

export interface AgentProgress {
  stage: string;
  progress: number;
  message: string;
  stageIndex?: number;
  totalStages?: number;
}

export interface AgentTraceEvent {
  event_id: string;
  ts: string;
  stage: string;
  stage_index: number;
  kind: "phase_start" | "phase_done" | "routing" | "query" | "transform" | "delivery" | "warn" | "error" | "info";
  title: string;
  detail: string;
  metrics: {
    matched_rows?: number;
    selected_table_count?: number;
    selected_category_count?: number;
    processed_fields?: number;
    missing_fields_filled?: number;
    preview_rows?: number;
    duration_ms?: number;
    duration_sec?: number;
    fallback_used?: boolean;
  };
  status: "running" | "done" | "warning" | "error";
}

export interface AgentTask {
  task_id: string;
  agent_id: string;
  status: TaskStatus;
  progress: number;
  stage: string;
  message: string;
  created_at: string;
}

export interface AgentResultData {
  task_id: string;
  agent_type?: string;
  summary: string;
  risk_rating?: string;
  risk_findings?: { label: string; description: string; level: string }[];
  report_sections?: { title: string; content: string; level?: string }[];
  timeline?: { date: string; event: string; level: string }[];
  metadata: { duration?: number; data_points?: number; [key: string]: unknown };
  // Batch agent fields (flattened from report dict by the API)
  query_type?: "filter" | "export" | "derived";
  generated_sql?: string;
  sql_description?: string;
  columns?: BatchColumn[];
  preview_rows?: Record<string, unknown>[];
  total_count?: number;
  stats?: BatchStats;
  data_quality?: BatchDataQuality;
  schema_routing?: BatchSchemaRouting;
}

// ---------------------------------------------------------------------------
// Batch data processing types
// ---------------------------------------------------------------------------

export interface BatchColumn {
  key: string;
  label: string;
  type: "text" | "number" | "badge";
  unit?: string;
}

export interface BatchStats {
  count: number;
  [key: string]: number | undefined;
}

export interface BatchDataQuality {
  total_requested: number;
  matched: number;
  missing_fields_filled: number;
}

export interface BatchSchemaRouting {
  strategy_version: string;
  selected_categories: {
    id: string;
    name: string;
    score: number;
    matched_keywords: string[];
  }[];
  selected_tables: {
    name: string;
    description: string;
    score: number;
    categories: string[];
    matched_keywords: string[];
    columns: string[];
    relations: string[];
  }[];
  relations: string[];
}
