import type { SkillResultData, SkillTraceEvent } from "@/types/skill";

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  message_count: number;
}

export interface RiskDetail {
  label: string;
  value: string;
  level: "high" | "medium" | "low";
}

export interface ChatSkillCardArtifact {
  type: "skill_card";
  skill_id: string;
  display_name: string;
  description?: string;
  message?: string;
  prefill: Record<string, unknown>;
  required_fields: string[];
  ui?: {
    theme_accent?: string;
    chat_card?: {
      show_fields?: string[];
      allow_file_upload?: boolean;
    };
  };
}

export interface ChatSkillRun {
  run_id: string;
  skill_id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress?: number;
  stage?: string;
  message?: string;
  trace_events: SkillTraceEvent[];
  result?: SkillResultData;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  details?: RiskDetail[];
  actions?: string[];
  artifacts?: ChatSkillCardArtifact[];
  skill_runs?: ChatSkillRun[];
  isStreaming?: boolean;
  streamStopped?: boolean;
  created_at?: string;
}

export interface QuickPrompt {
  question: string;
  tag: string;
}
