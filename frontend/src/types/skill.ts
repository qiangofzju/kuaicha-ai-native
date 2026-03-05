import type { BatchColumn, BatchDataQuality, BatchSchemaRouting, BatchStats } from "@/types/agent";

export type SkillTaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type SkillMarketStatus = "ready" | "coming";

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  color: string;
  tags: string[];
  icon: string;
  status: "ready" | "beta" | "coming";
  author: string;
  price_type: "free" | "paid";
  owned: boolean;
  cover: string;
  market_status: SkillMarketStatus;
}

export interface SkillStoreSection {
  id: string;
  title: string;
  subtitle: string;
  style: "hero" | "grid";
  items: SkillDefinition[];
}

export interface PurchaseRecord {
  record_id: string;
  skill_id: string;
  skill_name: string;
  price_type: "free" | "paid";
  amount: number;
  currency: string;
  purchased_at: string;
  status: string;
}

export interface SkillConfigField {
  name: string;
  label: string;
  type: "text" | "select" | "multiselect" | "file";
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  default?: string | string[];
}

export interface SkillConfigSchema {
  skill_id: string;
  fields: SkillConfigField[];
}

export interface SkillManifest {
  id: string;
  version: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  status: "ready" | "beta" | "coming";
  author: string;
  tags: string[];
  entrypoints: {
    standalone: boolean;
    chat_invoke: boolean;
    external_api: boolean;
  };
  triggers: {
    mention_ids: string[];
    mention_aliases: string[];
  };
  execution: {
    mode: "agent_workflow" | "python_callable" | "http_adapter";
    agent_id?: string;
    driver?: string;
  };
  input_schema: {
    type?: string;
    required: string[];
    properties: Record<string, Record<string, unknown>>;
  };
  output_schema: {
    type?: string;
    required: string[];
    properties?: Record<string, Record<string, unknown>>;
  };
  permissions: string[];
  ui: {
    theme_accent?: string;
    chat_card?: {
      show_fields?: string[];
      allow_file_upload?: boolean;
    };
    standalone?: {
      show_trace?: boolean;
      show_export?: boolean;
    };
  };
}

export interface SkillCatalogItem {
  id: string;
  version: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  status: "ready" | "beta" | "coming";
  author: string;
  tags: string[];
  entrypoints: {
    standalone: boolean;
    chat_invoke: boolean;
    external_api: boolean;
  };
}

export interface SkillRunRequest {
  skill_id: string;
  input: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface SkillRunCreateResponse {
  run_id: string;
  skill_id: string;
  status: SkillTaskStatus;
}

export interface SkillProgress {
  stage: string;
  progress: number;
  message: string;
  stageIndex?: number;
  totalStages?: number;
}

export interface SkillTraceEvent {
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

export interface SkillTask {
  task_id?: string;
  run_id?: string;
  skill_id: string;
  status: SkillTaskStatus;
  progress: number;
  stage: string;
  message: string;
  created_at: string;
}

export interface SkillResultData {
  task_id: string;
  run_id?: string;
  skill_id?: string;
  skill_type?: string;
  summary: string;
  metadata: { duration?: number; data_points?: number; [key: string]: unknown };
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
