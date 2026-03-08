// Centralized theme constants for programmatic use (ECharts, dynamic styles, etc.)

export const theme = {
  tiers: {
    lite: {
      name: "Lite",
      accent: "#7F95B8",
      accentSoft: "rgba(127,149,184,0.2)",
      accentBorder: "rgba(127,149,184,0.35)",
    },
    pro: {
      name: "Pro",
      accent: "#A7B6D0",
      accentSoft: "rgba(167,182,208,0.22)",
      accentBorder: "rgba(167,182,208,0.36)",
    },
    max: {
      name: "Max",
      accent: "#D2AE67",
      accentSoft: "rgba(210,174,103,0.22)",
      accentBorder: "rgba(210,174,103,0.36)",
    },
  },
  colors: {
    modules: {
      chat: "#7F95B8",
      agent: "#A7B6D0",
      datashow: "#D2AE67",
      skills: "#F59E0B",
    },
    risk: {
      high: "#EF4444",
      medium: "#F59E0B",
      low: "#10B981",
    },
    logo: {
      start: "#E8A838",
      end: "#F06543",
    },
    background: {
      root: "#06080f",
      sidebar: "#0a0e1a",
      sidebarEnd: "#080c16",
      main: "#0a0f1e",
    },
    surface: {
      base: "linear-gradient(160deg, rgba(255,255,255,0.024), rgba(255,255,255,0.009))",
      elevated: "linear-gradient(160deg, rgba(255,255,255,0.032), rgba(255,255,255,0.012))",
      spotlight: "linear-gradient(160deg, rgba(255,255,255,0.042), rgba(255,255,255,0.016))",
    },
    text: {
      primary: "rgba(255,255,255,0.9)",
      secondary: "rgba(255,255,255,0.7)",
      tertiary: "rgba(255,255,255,0.5)",
      muted: "rgba(255,255,255,0.35)",
      faint: "rgba(255,255,255,0.25)",
      ghost: "rgba(255,255,255,0.15)",
    },
    border: {
      default: "rgba(255,255,255,0.06)",
      subtle: "rgba(255,255,255,0.04)",
      strong: "rgba(255,255,255,0.08)",
    },
    shadow: {
      soft: "0 10px 26px rgba(0,0,0,0.24)",
      medium: "0 16px 40px rgba(0,0,0,0.3)",
      hard: "0 22px 54px rgba(0,0,0,0.36)",
    },
  },
  agents: [
    { id: "risk", name: "企业风控尽调", description: "扫描司法、信用、舆情数据，生成风险评估报告", color: "#EF4444", tags: ["风控", "尽调"], icon: "Shield", status: "ready" as const },
    { id: "sentiment", name: "舆情风险简报", description: "采集整合舆情信息，生成周期性风险简报", color: "#F97316", tags: ["舆情", "监控"], icon: "Alert", status: "ready" as const },
    { id: "bid", name: "招采商机洞察", description: "监控招投标信息，转化结构化商机与可行动策略", color: "#F59E0B", tags: ["销售", "市场分析"], icon: "TrendUp", status: "ready" as const },
    { id: "tech", name: "科创能力评估", description: "分析知识产权与创新能力，评估技术资产质量", color: "#8B5CF6", tags: ["投资", "技术评估"], icon: "Brain", status: "ready" as const },
    { id: "map", name: "商业版图分析", description: "股权穿透与人物关联，生成可视化关系图谱", color: "#3B82F6", tags: ["商业分析", "图谱"], icon: "Network", status: "ready" as const },
    { id: "job", name: "求职背调诊断", description: "评估企业发展现状与员工成长前景", color: "#10B981", tags: ["求职", "企业评价"], icon: "Briefcase", status: "beta" as const },
    { id: "batch", name: "批量数据处理", description: "自然语言筛选企业名单，结构化批量导出，多表衍生字段加工", color: "#06B6D4", tags: ["数据处理", "批量导出"], icon: "Database", status: "ready" as const },
  ],
  skills: [
    { id: "batch", name: "批量数据处理技能", description: "自然语言筛选企业名单，结构化批量导出，多表衍生字段加工", color: "#06B6D4", tags: ["数据处理", "批量导出", "企业库"], icon: "Database", status: "ready" as const, market_status: "ready" as const, author: "@快查数据团队", price_type: "free" as const, owned: true, cover: "batch" },
    { id: "risk", name: "企业风控尽调技能", description: "扫描司法、信用、舆情数据，生成风险评估报告", color: "#EF4444", tags: ["风控", "尽调"], icon: "Shield", status: "coming" as const, market_status: "coming" as const, author: "@快查风控团队", price_type: "free" as const, owned: false, cover: "risk" },
    { id: "sentiment", name: "舆情风险简报技能", description: "采集整合舆情信息，生成周期性风险简报", color: "#F97316", tags: ["舆情", "监控"], icon: "Alert", status: "coming" as const, market_status: "coming" as const, author: "@快查情报团队", price_type: "free" as const, owned: false, cover: "sentiment" },
    { id: "bid", name: "招采商机洞察技能", description: "监控招投标信息，转化结构化商机与可行动策略", color: "#F59E0B", tags: ["销售", "市场分析"], icon: "TrendUp", status: "coming" as const, market_status: "coming" as const, author: "@快查商机团队", price_type: "free" as const, owned: false, cover: "bid" },
    { id: "tech", name: "科创能力评估技能", description: "分析知识产权与创新能力，评估技术资产质量", color: "#8B5CF6", tags: ["投资", "技术评估"], icon: "Brain", status: "coming" as const, market_status: "coming" as const, author: "@快查科创团队", price_type: "free" as const, owned: false, cover: "tech" },
    { id: "graph", name: "企业关系图谱技能", description: "自然语言查询企业关系，自动选择最佳可视化形式", color: "#06B6D4", tags: ["图谱", "关系分析"], icon: "Network", status: "coming" as const, market_status: "coming" as const, author: "@快查图谱团队", price_type: "free" as const, owned: false, cover: "graph" },
    { id: "trend", name: "趋势分析探索技能", description: "自然语言查询企业趋势数据，AI 自动选择最佳可视化", color: "#34D399", tags: ["趋势", "数据分析"], icon: "TrendUp", status: "coming" as const, market_status: "coming" as const, author: "@快查趋势团队", price_type: "free" as const, owned: false, cover: "trend" },
    { id: "map", name: "商业版图分析技能", description: "股权穿透与人物关联，生成可视化关系图谱", color: "#3B82F6", tags: ["商业分析", "图谱"], icon: "Network", status: "coming" as const, market_status: "coming" as const, author: "@快查商业团队", price_type: "free" as const, owned: false, cover: "map" },
    { id: "job", name: "求职背调诊断技能", description: "评估企业发展现状与员工成长前景", color: "#10B981", tags: ["求职", "企业评价"], icon: "Briefcase", status: "coming" as const, market_status: "coming" as const, author: "@快查人才团队", price_type: "free" as const, owned: false, cover: "job" },
  ],
} as const;

export type RiskLevel = "high" | "medium" | "low";
export type ModuleType = "chat" | "agent" | "datashow" | "skills";
