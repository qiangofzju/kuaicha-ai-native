import { useState, useEffect, useRef } from "react";

// ==================== ICON COMPONENTS ====================
const Icons = {
  Logo: () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="8" fill="url(#logoGrad)" />
      <path d="M8 14L12 10L16 14L12 18Z" fill="white" opacity="0.9" />
      <path d="M14 10L18 14L14 18" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="28" y2="28">
          <stop stopColor="#E8A838" />
          <stop offset="1" stopColor="#F06543" />
        </linearGradient>
      </defs>
    </svg>
  ),
  Chat: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10a7 7 0 1 1 3.5 6.06L3 17l.94-3.5A7 7 0 0 1 3 10Z" />
      <path d="M8 9h4M8 12h2" />
    </svg>
  ),
  Agent: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="14" height="14" rx="3" />
      <circle cx="8" cy="9" r="1.5" />
      <circle cx="12" cy="9" r="1.5" />
      <path d="M7.5 13c.5 1 2 1.5 2.5 1.5s2-.5 2.5-1.5" />
    </svg>
  ),
  Datashow: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 16V8l4-4 3 3 4-4 3 3v10H3Z" />
      <circle cx="7" cy="12" r="1" fill="currentColor" />
      <circle cx="14" cy="9" r="1" fill="currentColor" />
    </svg>
  ),
  Send: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9h12M11 5l4 4-4 4" />
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  ),
  ArrowRight: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  ),
  Play: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M3 2.5v9l8-4.5-8-4.5Z" />
    </svg>
  ),
  Doc: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M4 2h5l4 4v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" />
      <path d="M9 2v4h4M6 9h4M6 11h2" />
    </svg>
  ),
  Shield: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2L3 5v4c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5V5L9 2Z" />
      <path d="M7 9l2 2 3-3.5" />
    </svg>
  ),
  Brain: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M9 15V9M6 6a3 3 0 0 1 6 0M4 9a3 3 0 0 0 3 3h4a3 3 0 0 0 0-6H7a3 3 0 0 0 0 6" />
    </svg>
  ),
  Network: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="9" cy="5" r="2" /><circle cx="4" cy="13" r="2" /><circle cx="14" cy="13" r="2" />
      <path d="M9 7v2M7 11l-2 1M11 11l2 1" />
    </svg>
  ),
  TrendUp: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 14l4-5 3 2 5-7" /><path d="M11 4h4v4" />
    </svg>
  ),
  Briefcase: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <rect x="2" y="6" width="14" height="9" rx="2" /><path d="M6 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Alert: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M9 2L2 15h14L9 2Z" /><path d="M9 7v4M9 13v.5" />
    </svg>
  ),
  Export: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M8 2v8M4 6l4-4 4 4M3 12h10v2H3z" />
    </svg>
  ),
  Pulse: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 10h3l2-5 3 10 2-5h6" />
    </svg>
  ),
  Star: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M7 1l1.8 3.6L13 5.3l-2.9 2.8.7 4L7 10.3 3.2 12.1l.7-4L1 5.3l4.2-.7L7 1Z" />
    </svg>
  ),
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M7 3v8M3 7h8" />
    </svg>
  ),
  Clock: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="7" cy="7" r="5.5" /><path d="M7 4v3l2 1.5" />
    </svg>
  ),
  Sparkle: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0c.2 3.3 4.7 3.8 4.7 3.8S8.2 4.3 8 8c-.2-3.7-4.7-4.2-4.7-4.2S7.8 3.3 8 0ZM4 8c.1 2 2.8 2.3 2.8 2.3S4.1 10.6 4 12.5c-.1-1.9-2.8-2.2-2.8-2.2S3.9 10 4 8Z" />
    </svg>
  ),
  Filter: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M2 3h12M4 7h8M6 11h4" />
    </svg>
  ),
  Grid: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  ),
  BarChart: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4 16V10M8 16V6M12 16V8M16 16V4" />
    </svg>
  ),
  PieChart: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M10 3a7 7 0 1 1-7 7h7V3Z" /><path d="M14 4.5A7 7 0 0 1 17 10h-5V4.5Z" />
    </svg>
  ),
  Relation: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="5" cy="5" r="2" /><circle cx="15" cy="5" r="2" /><circle cx="10" cy="15" r="2" />
      <path d="M7 5h6M6 6.5l3 7M14 6.5l-3 7" />
    </svg>
  ),
  Map: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5l5-2 4 2 5-2v12l-5 2-4-2-5 2V5Z" /><path d="M8 3v12M12 5v12" />
    </svg>
  ),
  Layers: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2L2 7l8 5 8-5-8-5Z" /><path d="M2 10l8 5 8-5" /><path d="M2 13l8 5 8-5" />
    </svg>
  ),
  User: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="8" cy="5" r="3" /><path d="M2 15c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    </svg>
  ),
  Settings: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="8" cy="8" r="2" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M13 3l-1.5 1.5M4.5 11.5L3 13" />
    </svg>
  ),
  Refresh: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M1 7a6 6 0 0 1 10.4-4M13 7a6 6 0 0 1-10.4 4" /><path d="M11 1v3h-3M3 13v-3h3" />
    </svg>
  ),
};

// ==================== MINI CHART COMPONENTS ====================
const MiniLineChart = ({ data, color, height = 40, width = 120 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`lg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#lg-${color.replace("#", "")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const MiniBarChart = ({ data, color, height = 60, width = 140 }) => {
  const max = Math.max(...data);
  const barW = (width / data.length) * 0.65;
  const gap = (width / data.length) * 0.35;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {data.map((v, i) => {
        const bh = (v / max) * (height - 4);
        return <rect key={i} x={i * (barW + gap)} y={height - bh - 2} width={barW} height={bh} rx="2" fill={color} opacity={0.5 + (v / max) * 0.5} />;
      })}
    </svg>
  );
};

const DonutChart = ({ segments, size = 80 }) => {
  const total = segments.reduce((a, s) => a + s.value, 0);
  let cum = 0;
  const radius = 30;
  const circum = 2 * Math.PI * radius;
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const offset = circum * (1 - cum / total);
        cum += seg.value;
        return (
          <circle key={i} cx="40" cy="40" r={radius} fill="none" stroke={seg.color} strokeWidth="8"
            strokeDasharray={`${circum * pct} ${circum * (1 - pct)}`} strokeDashoffset={offset}
            transform="rotate(-90 40 40)" style={{ transition: "all 0.6s ease" }} />
        );
      })}
      <text x="40" y="42" textAnchor="middle" fill="white" fontSize="13" fontWeight="600">{total}</text>
    </svg>
  );
};

// ==================== MAIN APP ====================
const TABS = [
  { id: "chat", label: "Chat", icon: Icons.Chat, accent: "#4A9EFF" },
  { id: "agent", label: "Agent", icon: Icons.Agent, accent: "#A78BFA" },
  { id: "datashow", label: "Datashow", icon: Icons.Datashow, accent: "#34D399" },
];

const AGENTS = [
  { id: "bid", name: "招采商机洞察", desc: "监控招投标信息，转化结构化商机与可行动策略", icon: Icons.TrendUp, color: "#F59E0B", tags: ["销售", "市场分析"], status: "ready" },
  { id: "risk", name: "企业风控尽调", desc: "扫描司法、信用、舆情数据，生成风险评估报告", icon: Icons.Shield, color: "#EF4444", tags: ["风控", "尽调"], status: "ready" },
  { id: "tech", name: "科创能力评估", desc: "分析知识产权与创新能力，评估技术资产质量", icon: Icons.Brain, color: "#8B5CF6", tags: ["投资", "技术评估"], status: "ready" },
  { id: "map", name: "商业版图分析", desc: "股权穿透与人物关联，生成可视化关系图谱", icon: Icons.Network, color: "#3B82F6", tags: ["商业分析", "图谱"], status: "ready" },
  { id: "job", name: "求职背调诊断", desc: "评估企业发展现状与员工成长前景", icon: Icons.Briefcase, color: "#10B981", tags: ["求职", "企业评价"], status: "beta" },
  { id: "sentiment", name: "舆情风险简报", desc: "采集整合舆情信息，生成周期性风险简报", icon: Icons.Alert, color: "#F97316", tags: ["舆情", "监控"], status: "ready" },
];

const CHAT_MESSAGES = [
  { role: "user", content: "同花顺有哪些风险信息？" },
  { role: "ai", content: "同花顺（浙江核新同花顺网络信息股份有限公司）近期存在以下风险信号：", details: [
    { label: "司法风险", value: "涉诉案件 23 起，其中知识产权纠纷 8 起", level: "medium" },
    { label: "监管风险", value: "2024年收到证监会问询函 2 份，涉及数据安全合规", level: "high" },
    { label: "舆情风险", value: "近30天负面舆情 47 条，主要集中在产品体验和数据安全", level: "medium" },
    { label: "经营风险", value: "Q3营收同比下降 5.2%，净利润率收窄至 18.3%", level: "low" },
  ]},
];

export default function KuaichaAI() {
  const [activeTab, setActiveTab] = useState("chat");
  const [chatInput, setChatInput] = useState("");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentProgress, setAgentProgress] = useState(0);
  const [datashowTab, setDatashowTab] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (agentRunning) {
      const timer = setInterval(() => {
        setAgentProgress((p) => {
          if (p >= 100) { clearInterval(timer); setAgentRunning(false); return 100; }
          return p + Math.random() * 8 + 2;
        });
      }, 400);
      return () => clearInterval(timer);
    }
  }, [agentRunning]);

  const startAgent = (agent) => {
    setSelectedAgent(agent);
    setAgentRunning(true);
    setAgentProgress(0);
  };

  const accent = TABS.find((t) => t.id === activeTab)?.accent || "#4A9EFF";

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes progressBar { from { width: 0%; } }
        @keyframes dotPulse { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
        @keyframes gradientMove { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .tab-btn { transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
        .tab-btn:hover { background: rgba(255,255,255,0.06) !important; }
        .card-hover { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .card-hover:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,0.4) !important; }
        .btn-glow:hover { box-shadow: 0 0 20px var(--glow-color, rgba(74,158,255,0.3)); }
        .sidebar-item { transition: all 0.2s ease; }
        .sidebar-item:hover { background: rgba(255,255,255,0.05); }
        .input-glow:focus { box-shadow: 0 0 0 2px rgba(74,158,255,0.2); }
      `}</style>

      {/* ===== SIDEBAR ===== */}
      <div style={{
        ...styles.sidebar,
        width: sidebarCollapsed ? 64 : 220,
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        {/* Logo */}
        <div style={{ padding: sidebarCollapsed ? "20px 0" : "20px 16px", display: "flex", alignItems: "center", gap: 10, justifyContent: sidebarCollapsed ? "center" : "flex-start", cursor: "pointer" }}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
          <Icons.Logo />
          {!sidebarCollapsed && (
            <span style={{ fontSize: 17, fontWeight: 700, background: "linear-gradient(135deg, #E8A838, #F06543)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              快查 AI
            </span>
          )}
        </div>

        {/* Nav separator */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: sidebarCollapsed ? "0 12px" : "0 16px" }} />

        {/* Tab Navigation */}
        <div style={{ padding: sidebarCollapsed ? "12px 8px" : "12px", display: "flex", flexDirection: "column", gap: 4 }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <div key={tab.id} className="tab-btn" onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: sidebarCollapsed ? "10px 0" : "10px 12px",
                  borderRadius: 10, cursor: "pointer", justifyContent: sidebarCollapsed ? "center" : "flex-start",
                  background: isActive ? `linear-gradient(135deg, ${tab.accent}18, ${tab.accent}08)` : "transparent",
                  border: isActive ? `1px solid ${tab.accent}30` : "1px solid transparent",
                  position: "relative",
                }}>
                {isActive && <div style={{ position: "absolute", left: sidebarCollapsed ? "50%" : 0, top: sidebarCollapsed ? 0 : "50%",
                  transform: sidebarCollapsed ? "translateX(-50%)" : "translateY(-50%)",
                  width: sidebarCollapsed ? 20 : 3, height: sidebarCollapsed ? 3 : 20,
                  background: tab.accent, borderRadius: 4 }} />}
                <span style={{ color: isActive ? tab.accent : "rgba(255,255,255,0.45)", transition: "color 0.2s" }}>
                  <Icon />
                </span>
                {!sidebarCollapsed && (
                  <span style={{ fontSize: 13.5, fontWeight: isActive ? 600 : 400, color: isActive ? "#fff" : "rgba(255,255,255,0.55)", letterSpacing: 0.3 }}>
                    {tab.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: sidebarCollapsed ? "0 12px" : "0 16px" }} />

        {/* Recent / History */}
        {!sidebarCollapsed && (
          <div style={{ padding: "12px 16px", flex: 1, overflow: "auto" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
              最近会话
            </div>
            {["同花顺风险查询", "宁德时代尽调报告", "新能源产业链分析", "李宁商业版图"].map((item, i) => (
              <div key={i} className="sidebar-item" style={{
                padding: "8px 10px", borderRadius: 7, cursor: "pointer", fontSize: 12.5,
                color: "rgba(255,255,255,0.5)", marginBottom: 2, display: "flex", alignItems: "center", gap: 8,
              }}>
                <Icons.Clock />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item}</span>
              </div>
            ))}
          </div>
        )}

        {/* Bottom User */}
        <div style={{
          padding: sidebarCollapsed ? "16px 0" : "16px", borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", gap: 10, justifyContent: sidebarCollapsed ? "center" : "flex-start",
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #4A9EFF, #8B5CF6)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#fff",
            flexShrink: 0,
          }}>W</div>
          {!sidebarCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>Wang Lei</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>企业版</div>
            </div>
          )}
          {!sidebarCollapsed && (
            <div style={{ cursor: "pointer", color: "rgba(255,255,255,0.3)" }}><Icons.Settings /></div>
          )}
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div style={styles.main}>
        {/* Top Bar */}
        <div style={styles.topBar}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              fontSize: 15, fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ color: accent }}>{TABS.find(t => t.id === activeTab)?.icon()}</span>
              {activeTab === "chat" && "智能对话"}
              {activeTab === "agent" && "智能体工坊"}
              {activeTab === "datashow" && "数据洞察"}
            </div>
            <div style={{
              fontSize: 11, color: "rgba(255,255,255,0.35)", padding: "3px 8px",
              background: "rgba(255,255,255,0.04)", borderRadius: 6,
            }}>
              {activeTab === "chat" && "企业信息即时问答"}
              {activeTab === "agent" && `${AGENTS.length} 个可用智能体`}
              {activeTab === "datashow" && "可视化分析工作台"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "7px 14px",
              background: "rgba(255,255,255,0.04)", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.06)", width: 240,
            }}>
              <Icons.Search />
              <input placeholder="全局搜索企业..." style={{
                background: "none", border: "none", outline: "none", color: "rgba(255,255,255,0.7)",
                fontSize: 12.5, width: "100%", fontFamily: "inherit",
              }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", padding: "2px 6px", background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>⌘K</span>
            </div>
            <div style={{
              width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(255,255,255,0.4)",
            }}>
              <Icons.Pulse />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={styles.content}>
          {/* ====== CHAT VIEW ====== */}
          {activeTab === "chat" && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", animation: "fadeIn 0.35s ease" }}>
              {/* Chat messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 0" }}>
                <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px" }}>
                  {/* Welcome */}
                  <div style={{ textAlign: "center", marginBottom: 40, animation: "fadeIn 0.5s ease" }}>
                    <div style={{ display: "inline-flex", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 }}>
                      <span style={{ color: "#E8A838", marginRight: 6 }}><Icons.Sparkle /></span>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>快查 AI · 企业智能助手</span>
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 600, color: "#fff", marginBottom: 8, letterSpacing: -0.3 }}>有什么想了解的企业信息？</h2>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
                      支持企业风险、财务、股权、舆情等多维度信息查询
                    </p>
                  </div>

                  {/* Quick prompts */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 32 }}>
                    {[
                      { q: "比亚迪最近有哪些负面舆情？", tag: "舆情" },
                      { q: "华为的核心子公司有哪些？", tag: "股权" },
                      { q: "蚂蚁集团的融资历程", tag: "融资" },
                      { q: "宁德时代 vs 比亚迪电池业务对比", tag: "对比" },
                    ].map((item, i) => (
                      <div key={i} className="card-hover" style={{
                        padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        animation: `fadeIn 0.4s ease ${i * 0.08}s both`,
                      }}
                        onClick={() => setChatInput(item.q)}>
                        <div>
                          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>{item.q}</div>
                          <span style={{ fontSize: 10, color: accent, background: `${accent}15`, padding: "2px 8px", borderRadius: 4 }}>{item.tag}</span>
                        </div>
                        <span style={{ color: "rgba(255,255,255,0.15)" }}><Icons.ArrowRight /></span>
                      </div>
                    ))}
                  </div>

                  {/* Messages */}
                  {CHAT_MESSAGES.map((msg, i) => (
                    <div key={i} style={{
                      marginBottom: 20,
                      animation: `fadeIn 0.4s ease ${0.3 + i * 0.15}s both`,
                    }}>
                      {msg.role === "user" ? (
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <div style={{
                            background: `linear-gradient(135deg, ${accent}20, ${accent}10)`,
                            border: `1px solid ${accent}25`,
                            borderRadius: "16px 16px 4px 16px", padding: "12px 18px",
                            maxWidth: "70%", fontSize: 14, color: "rgba(255,255,255,0.9)", lineHeight: 1.6,
                          }}>{msg.content}</div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 12 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                            background: "linear-gradient(135deg, #E8A838, #F06543)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            marginTop: 2,
                          }}>
                            <Icons.Sparkle />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.7, marginBottom: 12 }}>
                              {msg.content}
                            </div>
                            {msg.details && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {msg.details.map((d, j) => (
                                  <div key={j} style={{
                                    padding: "12px 16px", borderRadius: 10,
                                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                                    display: "flex", alignItems: "flex-start", gap: 12,
                                    animation: `slideIn 0.3s ease ${j * 0.1}s both`,
                                  }}>
                                    <div style={{
                                      width: 6, height: 6, borderRadius: "50%", marginTop: 6, flexShrink: 0,
                                      background: d.level === "high" ? "#EF4444" : d.level === "medium" ? "#F59E0B" : "#10B981",
                                    }} />
                                    <div>
                                      <div style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 3 }}>{d.label}</div>
                                      <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{d.value}</div>
                                    </div>
                                    <span style={{
                                      marginLeft: "auto", fontSize: 10, padding: "2px 8px", borderRadius: 4, flexShrink: 0,
                                      color: d.level === "high" ? "#EF4444" : d.level === "medium" ? "#F59E0B" : "#10B981",
                                      background: d.level === "high" ? "rgba(239,68,68,0.1)" : d.level === "medium" ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)",
                                    }}>
                                      {d.level === "high" ? "高风险" : d.level === "medium" ? "中风险" : "低风险"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Action buttons under AI response */}
                            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                              {["生成尽调报告", "查看可视化", "导出数据"].map((action, j) => (
                                <div key={j} style={{
                                  padding: "6px 12px", borderRadius: 8, fontSize: 11.5, cursor: "pointer",
                                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                                  color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 5,
                                  transition: "all 0.2s",
                                }}>
                                  {j === 0 && <Icons.Doc />}{j === 1 && <Icons.Datashow />}{j === 2 && <Icons.Export />}
                                  {action}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Chat Input */}
              <div style={{
                padding: "16px 24px 20px", borderTop: "1px solid rgba(255,255,255,0.04)",
                background: "linear-gradient(180deg, transparent, rgba(6,8,15,0.8))",
              }}>
                <div style={{ maxWidth: 780, margin: "0 auto" }}>
                  <div style={{
                    display: "flex", alignItems: "flex-end", gap: 10, padding: "12px 16px",
                    background: "rgba(255,255,255,0.03)", borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.08)",
                    transition: "border-color 0.2s",
                  }}>
                    <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                      placeholder="输入企业名称或问题，例如：比亚迪最近的经营状况如何？"
                      rows={1}
                      style={{
                        flex: 1, background: "none", border: "none", outline: "none",
                        color: "rgba(255,255,255,0.85)", fontSize: 14, resize: "none",
                        fontFamily: "inherit", lineHeight: 1.5, minHeight: 22, maxHeight: 120,
                      }}
                      onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
                    />
                    <button style={{
                      width: 36, height: 36, borderRadius: 10, border: "none", cursor: "pointer",
                      background: chatInput.trim() ? `linear-gradient(135deg, ${accent}, ${accent}cc)` : "rgba(255,255,255,0.06)",
                      color: chatInput.trim() ? "#fff" : "rgba(255,255,255,0.25)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s", flexShrink: 0,
                    }}>
                      <Icons.Send />
                    </button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>快查AI 可能会犯错，请核实重要信息</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ====== AGENT VIEW ====== */}
          {activeTab === "agent" && (
            <div style={{ height: "100%", overflowY: "auto", animation: "fadeIn 0.35s ease" }}>
              <div style={{ padding: "24px 32px", maxWidth: 1200, margin: "0 auto" }}>
                {/* Agent Hero */}
                <div style={{
                  padding: "28px 32px", borderRadius: 20, marginBottom: 28,
                  background: "linear-gradient(135deg, rgba(167,139,250,0.08), rgba(167,139,250,0.02))",
                  border: "1px solid rgba(167,139,250,0.12)",
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", top: -40, right: -40, width: 180, height: 180,
                    background: "radial-gradient(circle, rgba(167,139,250,0.12), transparent 70%)",
                    borderRadius: "50%",
                  }} />
                  <div style={{ position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ color: "#A78BFA" }}><Icons.Sparkle /></span>
                      <span style={{ fontSize: 11, color: "#A78BFA", fontWeight: 500, letterSpacing: 0.5 }}>AGENT WORKBENCH</span>
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 6 }}>选择智能体，一步到位完成任务</h2>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", maxWidth: 500 }}>
                      每个 Agent 针对特定场景深度优化，自动完成从数据采集到报告交付的全流程
                    </p>
                  </div>
                </div>

                {/* Agent Filter Bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
                    background: "rgba(255,255,255,0.03)", borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    <Icons.Filter />
                    <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)" }}>筛选</span>
                  </div>
                  {["全部", "风控", "商业分析", "市场分析", "舆情"].map((tag, i) => (
                    <div key={i} style={{
                      padding: "6px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer",
                      background: i === 0 ? "rgba(167,139,250,0.1)" : "rgba(255,255,255,0.02)",
                      border: i === 0 ? "1px solid rgba(167,139,250,0.2)" : "1px solid rgba(255,255,255,0.05)",
                      color: i === 0 ? "#A78BFA" : "rgba(255,255,255,0.4)",
                      transition: "all 0.2s",
                    }}>{tag}</div>
                  ))}
                </div>

                {/* Agent Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                  {AGENTS.map((agent, i) => {
                    const Icon = agent.icon;
                    const isSelected = selectedAgent?.id === agent.id;
                    return (
                      <div key={agent.id} className="card-hover" style={{
                        padding: "24px", borderRadius: 16, cursor: "pointer",
                        background: isSelected ? `linear-gradient(135deg, ${agent.color}12, ${agent.color}06)` : "rgba(255,255,255,0.02)",
                        border: isSelected ? `1px solid ${agent.color}35` : "1px solid rgba(255,255,255,0.06)",
                        animation: `fadeIn 0.4s ease ${i * 0.06}s both`,
                        position: "relative", overflow: "hidden",
                      }}
                        onClick={() => setSelectedAgent(agent)}>
                        {/* Glow effect */}
                        <div style={{
                          position: "absolute", top: -20, right: -20, width: 80, height: 80,
                          background: `radial-gradient(circle, ${agent.color}15, transparent 70%)`,
                          borderRadius: "50%", transition: "opacity 0.3s",
                          opacity: isSelected ? 1 : 0,
                        }} />
                        <div style={{ position: "relative" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                            <div style={{
                              width: 42, height: 42, borderRadius: 12,
                              background: `${agent.color}15`, border: `1px solid ${agent.color}25`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: agent.color,
                            }}>
                              <Icon />
                            </div>
                            {agent.status === "beta" && (
                              <span style={{
                                fontSize: 10, padding: "2px 8px", borderRadius: 6,
                                background: "rgba(245,158,11,0.1)", color: "#F59E0B",
                                border: "1px solid rgba(245,158,11,0.2)",
                              }}>Beta</span>
                            )}
                          </div>
                          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 6 }}>{agent.name}</h3>
                          <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 14, minHeight: 40 }}>{agent.desc}</p>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {agent.tags.map((tag, j) => (
                              <span key={j} style={{
                                fontSize: 10.5, padding: "3px 8px", borderRadius: 5,
                                background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)",
                                border: "1px solid rgba(255,255,255,0.06)",
                              }}>{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Agent Execution Panel */}
                {selectedAgent && (
                  <div style={{
                    marginTop: 24, padding: "24px 28px", borderRadius: 16,
                    background: `linear-gradient(135deg, ${selectedAgent.color}08, rgba(255,255,255,0.02))`,
                    border: `1px solid ${selectedAgent.color}20`,
                    animation: "fadeIn 0.35s ease",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: `${selectedAgent.color}15`, border: `1px solid ${selectedAgent.color}25`,
                          display: "flex", alignItems: "center", justifyContent: "center", color: selectedAgent.color,
                        }}>
                          {selectedAgent.icon()}
                        </div>
                        <div>
                          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{selectedAgent.name}</h3>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>配置并启动任务</span>
                        </div>
                      </div>
                    </div>

                    {/* Input area */}
                    <div style={{
                      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18,
                    }}>
                      <div>
                        <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>目标企业</label>
                        <input placeholder="输入企业名称，如：同花顺" className="input-glow" style={{
                          width: "100%", padding: "10px 14px", borderRadius: 10,
                          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                          color: "rgba(255,255,255,0.8)", fontSize: 13, outline: "none", fontFamily: "inherit",
                          transition: "all 0.2s",
                        }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>分析维度</label>
                        <div style={{
                          display: "flex", gap: 8,
                        }}>
                          {["全面分析", "风险聚焦", "财务聚焦"].map((opt, j) => (
                            <div key={j} style={{
                              flex: 1, padding: "10px", borderRadius: 10, textAlign: "center",
                              background: j === 0 ? `${selectedAgent.color}12` : "rgba(255,255,255,0.03)",
                              border: j === 0 ? `1px solid ${selectedAgent.color}30` : "1px solid rgba(255,255,255,0.06)",
                              color: j === 0 ? selectedAgent.color : "rgba(255,255,255,0.45)",
                              fontSize: 12.5, cursor: "pointer", transition: "all 0.2s",
                            }}>{opt}</div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Progress or Start */}
                    {agentRunning ? (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                            {agentProgress < 30 ? "正在采集数据..." : agentProgress < 60 ? "正在分析处理..." : agentProgress < 90 ? "正在生成报告..." : "即将完成..."}
                          </span>
                          <span style={{ fontSize: 12, color: selectedAgent.color, fontWeight: 600 }}>{Math.min(Math.round(agentProgress), 100)}%</span>
                        </div>
                        <div style={{
                          height: 4, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden",
                        }}>
                          <div style={{
                            height: "100%", borderRadius: 4, width: `${Math.min(agentProgress, 100)}%`,
                            background: `linear-gradient(90deg, ${selectedAgent.color}, ${selectedAgent.color}cc)`,
                            transition: "width 0.3s ease",
                            boxShadow: `0 0 12px ${selectedAgent.color}40`,
                          }} />
                        </div>
                        {/* Step indicators */}
                        <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
                          {["数据采集", "智能分析", "报告生成", "质量校验"].map((step, j) => {
                            const stepPct = (j + 1) * 25;
                            const done = agentProgress >= stepPct;
                            const active = agentProgress >= stepPct - 25 && agentProgress < stepPct;
                            return (
                              <div key={j} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{
                                  width: 18, height: 18, borderRadius: "50%",
                                  background: done ? `${selectedAgent.color}30` : active ? `${selectedAgent.color}15` : "rgba(255,255,255,0.04)",
                                  border: done ? `1.5px solid ${selectedAgent.color}` : active ? `1.5px solid ${selectedAgent.color}60` : "1.5px solid rgba(255,255,255,0.1)",
                                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10,
                                  color: done ? selectedAgent.color : "rgba(255,255,255,0.3)",
                                  animation: active ? "pulse 1.5s ease infinite" : "none",
                                }}>
                                  {done ? "✓" : j + 1}
                                </div>
                                <span style={{ fontSize: 11.5, color: done ? "rgba(255,255,255,0.6)" : active ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)" }}>
                                  {step}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : agentProgress >= 100 ? (
                      <div style={{ animation: "fadeIn 0.4s ease" }}>
                        <div style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "12px 16px",
                          background: "rgba(16,185,129,0.08)", borderRadius: 12,
                          border: "1px solid rgba(16,185,129,0.15)", marginBottom: 14,
                        }}>
                          <span style={{ color: "#10B981", fontSize: 16 }}>✓</span>
                          <span style={{ fontSize: 13, color: "#10B981", fontWeight: 500 }}>分析完成！</span>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginLeft: 4 }}>共处理 2,847 条数据，耗时 42 秒</span>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                          {[
                            { label: "查看报告", icon: <Icons.Doc />, primary: true },
                            { label: "导出 PDF", icon: <Icons.Export /> },
                            { label: "数据可视化", icon: <Icons.Datashow /> },
                          ].map((btn, j) => (
                            <button key={j} className="btn-glow" style={{
                              padding: "9px 18px", borderRadius: 10, border: "none", cursor: "pointer",
                              background: btn.primary ? `linear-gradient(135deg, ${selectedAgent.color}, ${selectedAgent.color}cc)` : "rgba(255,255,255,0.05)",
                              color: btn.primary ? "#fff" : "rgba(255,255,255,0.6)",
                              fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6,
                              fontFamily: "inherit", "--glow-color": `${selectedAgent.color}30`,
                              border: btn.primary ? "none" : "1px solid rgba(255,255,255,0.08)",
                            }}>
                              {btn.icon}{btn.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button className="btn-glow" onClick={() => startAgent(selectedAgent)}
                        style={{
                          padding: "12px 28px", borderRadius: 12, border: "none", cursor: "pointer",
                          background: `linear-gradient(135deg, ${selectedAgent.color}, ${selectedAgent.color}cc)`,
                          color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
                          display: "flex", alignItems: "center", gap: 8, "--glow-color": `${selectedAgent.color}40`,
                          boxShadow: `0 4px 20px ${selectedAgent.color}25`,
                        }}>
                        <Icons.Play /> 启动 {selectedAgent.name}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ====== DATASHOW VIEW ====== */}
          {activeTab === "datashow" && (
            <div style={{ height: "100%", overflowY: "auto", animation: "fadeIn 0.35s ease" }}>
              <div style={{ padding: "24px 32px", maxWidth: 1200, margin: "0 auto" }}>
                {/* Datashow Hero */}
                <div style={{
                  padding: "24px 32px", borderRadius: 20, marginBottom: 24,
                  background: "linear-gradient(135deg, rgba(52,211,153,0.06), rgba(52,211,153,0.02))",
                  border: "1px solid rgba(52,211,153,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ color: "#34D399" }}><Icons.Sparkle /></span>
                      <span style={{ fontSize: 11, color: "#34D399", fontWeight: 500, letterSpacing: 0.5 }}>DATASHOW</span>
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 4 }}>数据可视化工作台</h2>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>把复杂企业数据变成一眼看懂的图和洞察</p>
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
                    background: "rgba(255,255,255,0.03)", borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer",
                  }}>
                    <Icons.Plus />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>新建可视化</span>
                  </div>
                </div>

                {/* Datashow Tabs */}
                <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: 4 }}>
                  {[
                    { id: "overview", label: "概览面板", icon: <Icons.Grid /> },
                    { id: "trend", label: "趋势分析", icon: <Icons.BarChart /> },
                    { id: "relation", label: "关系图谱", icon: <Icons.Relation /> },
                    { id: "geo", label: "地域分布", icon: <Icons.Map /> },
                    { id: "compare", label: "多维对比", icon: <Icons.Layers /> },
                  ].map((tab) => (
                    <div key={tab.id} onClick={() => setDatashowTab(tab.id)} style={{
                      flex: 1, padding: "10px", borderRadius: 10, textAlign: "center", cursor: "pointer",
                      background: datashowTab === tab.id ? "rgba(52,211,153,0.1)" : "transparent",
                      border: datashowTab === tab.id ? "1px solid rgba(52,211,153,0.15)" : "1px solid transparent",
                      color: datashowTab === tab.id ? "#34D399" : "rgba(255,255,255,0.35)",
                      fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      transition: "all 0.2s",
                    }}>
                      {tab.icon}{tab.label}
                    </div>
                  ))}
                </div>

                {/* Prompt bar for data vis */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "12px 18px",
                  background: "rgba(255,255,255,0.02)", borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.06)", marginBottom: 24,
                }}>
                  <span style={{ color: "#34D399" }}><Icons.Sparkle /></span>
                  <input placeholder="用自然语言描述你想看的图表，例如：把这批企业按风险分布画出来，再给我变化趋势"
                    style={{
                      flex: 1, background: "none", border: "none", outline: "none",
                      color: "rgba(255,255,255,0.7)", fontSize: 13.5, fontFamily: "inherit",
                    }} />
                  <button style={{
                    padding: "7px 16px", borderRadius: 9, border: "none", cursor: "pointer",
                    background: "linear-gradient(135deg, #34D399, #34D399cc)", color: "#fff",
                    fontSize: 12.5, fontWeight: 500, fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <Icons.Sparkle /> 生成
                  </button>
                </div>

                {/* Dashboard Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
                  {[
                    { label: "监控企业", value: "2,847", change: "+124", up: true, color: "#4A9EFF", data: [20, 25, 22, 30, 28, 35, 32, 40, 38, 45] },
                    { label: "风险预警", value: "156", change: "+23", up: true, color: "#EF4444", data: [10, 12, 8, 15, 20, 18, 22, 25, 19, 23] },
                    { label: "已生成报告", value: "89", change: "+12", up: true, color: "#A78BFA", data: [5, 8, 12, 10, 15, 18, 14, 20, 22, 25] },
                    { label: "数据更新", value: "实时", change: "2s ago", up: null, color: "#34D399", data: [30, 32, 28, 35, 33, 36, 34, 38, 35, 37] },
                  ].map((card, i) => (
                    <div key={i} style={{
                      padding: "18px 20px", borderRadius: 14,
                      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                      animation: `fadeIn 0.4s ease ${i * 0.08}s both`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{card.label}</span>
                        {card.up !== null && (
                          <span style={{ fontSize: 11, color: card.up ? "#10B981" : "#EF4444", display: "flex", alignItems: "center", gap: 2 }}>
                            {card.up ? "↑" : "↓"} {card.change}
                          </span>
                        )}
                        {card.up === null && <span style={{ fontSize: 10, color: "#34D399", animation: "pulse 2s ease infinite" }}>● LIVE</span>}
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{card.value}</div>
                      <MiniLineChart data={card.data} color={card.color} />
                    </div>
                  ))}
                </div>

                {/* Main Visualization Area */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
                  {/* Large chart */}
                  <div style={{
                    padding: "24px", borderRadius: 16,
                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                    animation: "fadeIn 0.5s ease 0.2s both",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 4 }}>风险趋势分布</h3>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>近12个月风险事件趋势 · 按风险等级分类</span>
                      </div>
                      <div style={{ display: "flex", gap: 12 }}>
                        {[
                          { label: "高风险", color: "#EF4444" },
                          { label: "中风险", color: "#F59E0B" },
                          { label: "低风险", color: "#10B981" },
                        ].map((leg, j) => (
                          <div key={j} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: leg.color }} />
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{leg.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Simulated stacked bar chart */}
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 180, paddingTop: 10 }}>
                      {[
                        { h: [20, 35, 45], m: "1月" }, { h: [25, 30, 50], m: "2月" }, { h: [15, 40, 55], m: "3月" },
                        { h: [30, 25, 40], m: "4月" }, { h: [22, 38, 48], m: "5月" }, { h: [28, 32, 52], m: "6月" },
                        { h: [35, 28, 38], m: "7月" }, { h: [18, 42, 58], m: "8月" }, { h: [40, 30, 35], m: "9月" },
                        { h: [25, 35, 50], m: "10月" }, { h: [32, 28, 42], m: "11月" }, { h: [38, 34, 48], m: "12月" },
                      ].map((bar, j) => (
                        <div key={j} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 1 }}>
                            <div style={{ height: bar.h[0] * 1.2, background: "#EF4444", borderRadius: "3px 3px 0 0", opacity: 0.8, animation: `fadeIn 0.4s ease ${j * 0.05}s both` }} />
                            <div style={{ height: bar.h[1] * 1.2, background: "#F59E0B", opacity: 0.8, animation: `fadeIn 0.4s ease ${j * 0.05 + 0.1}s both` }} />
                            <div style={{ height: bar.h[2] * 1.2, background: "#10B981", borderRadius: "0 0 3px 3px", opacity: 0.8, animation: `fadeIn 0.4s ease ${j * 0.05 + 0.2}s both` }} />
                          </div>
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 6 }}>{bar.m}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Side panels */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* Donut */}
                    <div style={{
                      padding: "24px", borderRadius: 16,
                      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                      animation: "fadeIn 0.5s ease 0.3s both",
                    }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 16 }}>行业分布</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                        <DonutChart segments={[
                          { value: 35, color: "#4A9EFF" },
                          { value: 25, color: "#A78BFA" },
                          { value: 20, color: "#34D399" },
                          { value: 15, color: "#F59E0B" },
                          { value: 5, color: "#EF4444" },
                        ]} />
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                          {[
                            { label: "科技", pct: "35%", color: "#4A9EFF" },
                            { label: "金融", pct: "25%", color: "#A78BFA" },
                            { label: "制造", pct: "20%", color: "#34D399" },
                            { label: "消费", pct: "15%", color: "#F59E0B" },
                            { label: "其他", pct: "5%", color: "#EF4444" },
                          ].map((item, j) => (
                            <div key={j} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 6, height: 6, borderRadius: 2, background: item.color }} />
                                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{item.label}</span>
                              </div>
                              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{item.pct}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Risk alerts */}
                    <div style={{
                      padding: "20px", borderRadius: 16,
                      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                      flex: 1, animation: "fadeIn 0.5s ease 0.4s both",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>实时预警</h3>
                        <span style={{ fontSize: 10, color: "#34D399", animation: "pulse 2s ease infinite", display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#34D399" }} /> LIVE
                        </span>
                      </div>
                      {[
                        { company: "恒大集团", event: "新增被执行人信息", time: "2分钟前", level: "high" },
                        { company: "碧桂园", event: "评级下调至B-", time: "15分钟前", level: "high" },
                        { company: "蚂蚁集团", event: "监管问询函公告", time: "1小时前", level: "medium" },
                        { company: "字节跳动", event: "海外业务架构调整", time: "3小时前", level: "low" },
                      ].map((alert, j) => (
                        <div key={j} style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                          borderRadius: 10, marginBottom: 6, cursor: "pointer",
                          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
                          transition: "all 0.2s",
                        }}>
                          <div style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: alert.level === "high" ? "#EF4444" : alert.level === "medium" ? "#F59E0B" : "#10B981",
                            animation: alert.level === "high" ? "pulse 1.5s ease infinite" : "none",
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.7)", fontWeight: 500, marginBottom: 2 }}>{alert.company}</div>
                            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{alert.event}</div>
                          </div>
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>{alert.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom section: relationship graph + data table preview */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                  {/* Relationship graph placeholder */}
                  <div style={{
                    padding: "24px", borderRadius: 16, height: 260,
                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                    position: "relative", overflow: "hidden", animation: "fadeIn 0.5s ease 0.5s both",
                  }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 4 }}>企业关系图谱</h3>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>蚂蚁集团 · 股权关联网络</span>
                    {/* Graph nodes simulation */}
                    <svg width="100%" height="180" viewBox="0 0 400 180" style={{ marginTop: 10 }}>
                      {/* Edges */}
                      {[
                        [200, 60, 100, 120], [200, 60, 300, 120], [200, 60, 200, 150],
                        [100, 120, 50, 160], [100, 120, 150, 160],
                        [300, 120, 250, 160], [300, 120, 350, 160],
                      ].map(([x1, y1, x2, y2], j) => (
                        <line key={j} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(52,211,153,0.15)" strokeWidth="1.5" />
                      ))}
                      {/* Center node */}
                      <circle cx="200" cy="60" r="22" fill="rgba(52,211,153,0.15)" stroke="#34D399" strokeWidth="1.5">
                        <animate attributeName="r" values="22;24;22" dur="3s" repeatCount="indefinite" />
                      </circle>
                      <text x="200" y="64" textAnchor="middle" fill="#34D399" fontSize="10" fontWeight="500">蚂蚁集团</text>
                      {/* Second level */}
                      {[
                        { x: 100, y: 120, label: "支付宝", color: "#4A9EFF" },
                        { x: 300, y: 120, label: "网商银行", color: "#A78BFA" },
                        { x: 200, y: 150, label: "天弘基金", color: "#F59E0B" },
                      ].map((node, j) => (
                        <g key={j}>
                          <circle cx={node.x} cy={node.y} r="16" fill={`${node.color}15`} stroke={`${node.color}60`} strokeWidth="1" />
                          <text x={node.x} y={node.y + 3} textAnchor="middle" fill={node.color} fontSize="8">{node.label}</text>
                        </g>
                      ))}
                      {/* Third level */}
                      {[
                        { x: 50, y: 160, label: "花呗", c: "#4A9EFF" },
                        { x: 150, y: 160, label: "借呗", c: "#4A9EFF" },
                        { x: 250, y: 160, label: "余利宝", c: "#A78BFA" },
                        { x: 350, y: 160, label: "芝麻信用", c: "#F59E0B" },
                      ].map((node, j) => (
                        <g key={j}>
                          <circle cx={node.x} cy={node.y} r="12" fill={`${node.c}10`} stroke={`${node.c}30`} strokeWidth="1" />
                          <text x={node.x} y={node.y + 3} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7">{node.label}</text>
                        </g>
                      ))}
                    </svg>
                  </div>

                  {/* Quick insights */}
                  <div style={{
                    padding: "24px", borderRadius: 16,
                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                    animation: "fadeIn 0.5s ease 0.6s both",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>AI 洞察摘要</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                        <Icons.Refresh />
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>刷新</span>
                      </div>
                    </div>
                    {[
                      { icon: "📊", title: "行业集中度上升", desc: "科技板块企业占比较上月提升 4.2%，关注头部企业垄断风险", type: "trend" },
                      { icon: "⚠️", title: "地产板块风险加剧", desc: "监控企业中，12 家房企信用评级在近 30 天被下调", type: "risk" },
                      { icon: "🔗", title: "关联交易异常", desc: "发现 3 组企业存在循环担保结构，涉及金额 12.8 亿", type: "alert" },
                      { icon: "💡", title: "新能源产业链机会", desc: "上游锂矿企业 Q3 营收平均增长 18.5%，建议关注", type: "insight" },
                    ].map((insight, j) => (
                      <div key={j} style={{
                        display: "flex", gap: 12, padding: "12px 14px", borderRadius: 10,
                        marginBottom: 8, cursor: "pointer",
                        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
                        transition: "all 0.2s",
                        animation: `slideIn 0.4s ease ${j * 0.08}s both`,
                      }}>
                        <span style={{ fontSize: 18, lineHeight: 1 }}>{insight.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.75)", marginBottom: 3 }}>{insight.title}</div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>{insight.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== STYLES ====================
const styles = {
  root: {
    display: "flex",
    height: "100vh",
    width: "100%",
    background: "#06080f",
    fontFamily: "'Outfit', 'Noto Sans SC', -apple-system, sans-serif",
    color: "#fff",
    overflow: "hidden",
  },
  sidebar: {
    height: "100%",
    background: "linear-gradient(180deg, #0a0e1a, #080c16)",
    borderRight: "1px solid rgba(255,255,255,0.05)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    flexShrink: 0,
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "linear-gradient(135deg, #06080f 0%, #0a0f1e 50%, #06080f 100%)",
  },
  topBar: {
    height: 56,
    padding: "0 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    flexShrink: 0,
  },
  content: {
    flex: 1,
    overflow: "hidden",
  },
};
