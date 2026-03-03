export interface OverviewCard {
  label: string;
  value: string;
  change: string;
  trend_up: boolean | null;
  color: string;
  trend_data: number[];
}

export interface RiskTrendBar {
  month: string;
  high: number;
  medium: number;
  low: number;
}

export interface IndustrySegment {
  label: string;
  value: number;
  color: string;
  percentage: string;
}

export interface AlertItem {
  company: string;
  event: string;
  time: string;
  level: "high" | "medium" | "low" | "info";
}

export interface InsightItem {
  icon: string;
  title: string;
  description: string;
  type: string;
}

export interface OverviewResponse {
  cards: OverviewCard[];
  risk_trend: RiskTrendBar[];
  industry_distribution: IndustrySegment[];
  alerts: AlertItem[];
  insights: InsightItem[];
}

// NL Query → Chart
export interface NLChartResponse {
  chart_type: string;
  title: string;
  description: string;
  echarts_option: Record<string, unknown>;
}

// Relationship Graph
export interface GraphNode {
  id: string;
  name: string;
  category: string;
  value?: number;
  symbol_size: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  value?: number;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  categories: string[];
}

// Trend comparison
export interface TrendSeries {
  name: string;
  data: number[];
  color: string;
}

export interface TrendResponse {
  months: string[];
  series: TrendSeries[];
}
