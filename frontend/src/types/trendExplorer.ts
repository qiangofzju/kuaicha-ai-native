import type { VisualizationBlock, EntityInfo, ExplorerProgress, ExplorerQuery } from "./graphExplorer";

export type { VisualizationBlock, EntityInfo, ExplorerProgress, ExplorerQuery };

export interface TrendExplorerResult {
  task_id: string;
  agent_type: string;
  summary: string;
  query_interpretation: string;
  entities: EntityInfo[];
  trend_summary: string;
  visualizations: VisualizationBlock[];
  data_sources: string[];
  metadata: Record<string, unknown>;
}
