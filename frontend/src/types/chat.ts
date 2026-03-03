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

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  details?: RiskDetail[];
  actions?: string[];
  isStreaming?: boolean;
  streamStopped?: boolean;
  created_at?: string;
}

export interface QuickPrompt {
  question: string;
  tag: string;
}
