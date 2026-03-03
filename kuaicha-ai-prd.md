# 快查 AI — 完整项目 PRD 与技术架构文档

> **版本**: v1.0  
> **日期**: 2026-02-09  
> **定位**: AI-Native 企业信息平台 · PC Web 应用  

---

## 第一部分：产品需求文档（PRD）

### 1.1 产品定位

快查 AI 是一个独立的 AI-Native 企业信息平台，以 PC Web 应用形态呈现。核心能力是通过对话理解需求、使用 Agent 自动执行场景化的企业数据处理任务、借助数据可视化直观理解企业数据中的趋势、关系与风险。

**核心竞争力定位**：Agent 的智能处理与交付体验。

**产品形态**：工作台式 PC Web 应用，三大功能模块并列呈现。

### 1.2 目标用户

| 用户角色 | 典型场景 | 优先级 |
|---------|---------|-------|
| 企业风控部门 | 合作方尽调、授信审批风险排查 | P0 |
| 银行客户经理 | 企业信用评估、贷前调查 | P0 |
| 投资/并购部门 | 标的企业分析、技术能力评估 | P1 |
| 销售/BD | 拓客分析、招采商机洞察 | P1 |
| 内容创作者 | 商业版图分析、人物关系梳理 | P2 |
| 求职者 | 企业口碑与发展评估 | P2 |

### 1.3 三大功能模块

三个模块为**并列关系**，非统一入口分发模式。用户在侧边栏自主切换。

---

#### 模块一：Chat（智能对话）

**定位**：满足用户常规企业信息对话查询需求，非核心重点模块。

**功能需求**：

| 功能项 | 描述 | 优先级 |
|-------|------|-------|
| 企业信息问答 | 用户输入自然语言问句，返回企业相关信息（风险、财务、股权、舆情等） | P0 |
| 结构化回复 | AI 回复支持结构化展示（风险等级标注、分类卡片） | P0 |
| 快捷提问 | 预设高频问句模板，点击即填充 | P1 |
| 跨模块跳转 | 对话中可一键跳转至 Agent 执行或 Datashow 可视化 | P1 |
| 对话内可视化 | Chat 中可嵌入部分轻量可视化（迷你图表、风险指标卡片） | P2 |
| 会话历史 | 左侧边栏展示历史会话列表，支持切换 | P1 |
| 多轮对话 | 支持上下文连续追问 | P0 |

**Chat 回复结构定义**：

```
回复内容:
  ├── 文本摘要（结论前置）
  ├── 结构化详情卡片（按类别分组，每项含风险等级标注）
  │   ├── 司法风险: { 描述, 等级: high/medium/low }
  │   ├── 监管风险: { 描述, 等级 }
  │   ├── 舆情风险: { 描述, 等级 }
  │   └── 经营风险: { 描述, 等级 }
  ├── 关联操作按钮
  │   ├── "生成尽调报告" → 跳转 Agent
  │   ├── "查看可视化"   → 跳转 Datashow
  │   └── "导出数据"     → 触发数据导出
  └── 来源引用（数据来源标注）
```

---

#### 模块二：Agent（智能体工坊）— 核心功能

**定位**：通过构建企业查询场景下的多个 Agent，自动执行场景化的企业数据处理任务，一步到位满足用户需求。是平台的核心竞争力。

##### Agent 总览

| Agent | 面向用户 | 输入 | 交付物 | MVP 优先级 |
|-------|---------|------|-------|-----------|
| 企业风控尽调 | 风控部门/银行客户经理 | 企业名称 + 分析维度 | 尽调报告 + 风险清单 + 关键事件时间线 | P0 |
| 舆情风险简报 | 风控团队/投资者 | 目标企业 + 时间范围 + 简报类型(日/周报) | 周期性风险简报 + 事件摘要 + 行动建议 | P0 |
| 招采商机洞察 | 销售/行业研究员 | 行业/区域/关键词筛选条件 | 潜在客户清单(含联系方式) + 市场分析报告 | P1 |
| 科创能力评估 | 投资/并购/研发部门 | 企业名称 | 科技能力分析报告 + 竞争力评分 + 技术领域分布图 | P1 |
| 商业版图分析 | 内容创作者 | 企业/人物名称 | 关系图谱 + 商业版图分析报告 | P1 |
| 求职背调诊断 | 求职者 | 企业名称 | 企业口碑分析报告 + 职业发展建议 | P2 |

##### Agent 统一交互流程

```
步骤1: 选择 Agent（卡片网格展示）
步骤2: 配置参数（目标企业、分析维度、筛选条件等）
步骤3: 启动执行（四阶段进度展示: 数据采集 → 智能分析 → 报告生成 → 质量校验）
步骤4: 交付结果（标准化产出）
  ├── 摘要结论（结论前置，核心发现）
  ├── 详细报告（可在线查看、可导出 PDF/Word）
  ├── 可下载附件（Excel 数据表、PDF 报告）
  └── 可视化卡片（关键图表，可跳转 Datashow 深入查看）
```

##### Agent 详细需求：企业风控尽调（P0 示例）

**输入参数**：
- 目标企业名称（必填）
- 分析维度：全面分析 / 风险聚焦 / 财务聚焦（单选）
- 关注领域：司法风险 / 信用风险 / 舆情风险 / 经营风险 / 关联风险（多选，默认全选）

**执行流程**：
1. **数据采集**（0-25%）：扫描司法、信用、舆情、工商、财务等多维数据
2. **智能分析**（25-60%）：交叉比对、风险评分计算、关键事件提取
3. **报告生成**（60-90%）：结构化报告撰写、图表生成
4. **质量校验**（90-100%）：数据一致性校验、结论合理性验证

**交付物结构**：
```
企业风控尽调报告:
  ├── 报告概要
  │   ├── 综合风险评级: A/B/C/D/E
  │   ├── 核心风险发现（Top 3）
  │   └── 建议行动
  ├── 基本信息
  │   ├── 工商信息摘要
  │   └── 股权结构简图
  ├── 风险评估详情
  │   ├── 司法风险（涉诉案件统计 + 关键案件详情）
  │   ├── 信用风险（失信/限消/被执行人信息）
  │   ├── 舆情风险（负面舆情汇总 + 传播分析）
  │   ├── 经营风险（财务指标异常 + 经营变更）
  │   └── 关联风险（关联方风险传导评估）
  ├── 关键事件时间线
  └── 数据来源与免责声明
```

##### ToB 客户特殊需求（POC 场景）

**舆情监控场景**：

| 交付物 | 描述 | 格式 |
|-------|------|------|
| 风险动态监测简报 | 周期性(日报/周报)简报，结论前置，含核心事件摘要、风险等级判定、关联方提示、行动建议 | PDF/在线 |
| 关键事件专项分析 | 高风险事件专项报告，事件传播脉络、信源构成、核心当事人关联图谱，附原始证据链接 | PDF/在线 |
| 定制化监控预警 | 指定目标企业 + 指定信源的精准监控，风险信息实时告警（注: 此为持续型服务，非一次性任务） | 实时推送 |
| 监控台账导出 | 字段完整、时间戳准确的全量监控历史数据总表 | Excel |

**批量数据处理场景**：

| 交付物 | 描述 | 格式 |
|-------|------|------|
| 筛选企业名单 | 多维度条件组合筛选（可标签化），如"杭州地区近3年净利润持续增长企业" | Excel |
| 结构化字段导出 | 上传企业名单 → 结构化字段批量导出 + 脏数据清洗 + 缺失值补全 + 交叉核验 | Excel |
| 衍生加工字段 | 基于多表关联的加工字段定制化导出，输出标准化衍生分析指标 | Excel |
| 专项分析报告 | 标准化模板，含核心洞察总结、数据可视化图表、关键数据摘要 | PDF/在线 |

---

#### 模块三：Datashow（数据可视化）— 特色功能

**定位**：把复杂企业数据变成一眼看懂的图和洞察。自动选图、自动聚合对比、关系路径可视化、异常/变化高亮解释。作为特色功能单独拿出来重点做。

**五大可视化子模块**：

| 子模块 | 功能 | 典型场景 |
|-------|------|---------|
| 概览面板 | 核心指标卡片 + 实时预警流 + AI 洞察摘要 | "我监控的所有企业整体情况" |
| 趋势分析 | 时序趋势图（折线/面积/堆叠柱状图），支持多企业对比 | "把这批企业按风险分布画出来，再给我变化趋势" |
| 关系图谱 | 股权穿透、人物关联、企业投资轨迹的交互式网络图 | "李湘的商业版图演变" |
| 地域分布 | 区域热力图、地理分布散点图 | "我的目标客户在全国的分布情况" |
| 多维对比 | 雷达图、分组柱状图、气泡图 | "宁德时代 vs 比亚迪 多维度对比" |

**功能需求**：

| 功能项 | 描述 | 优先级 |
|-------|------|-------|
| 自然语言生成图表 | 用户用自然语言描述想看的图，AI 自动生成 | P0 |
| 概览 Dashboard | 监控企业总数、风险预警数、报告数、数据更新状态 + 迷你趋势图 | P0 |
| 风险趋势分布 | 堆叠柱状图按月展示，按高/中/低风险等级分类 | P0 |
| 行业分布环形图 | 监控企业行业分布占比 | P1 |
| 实时预警流 | 实时滚动展示最新风险事件，按等级标色 | P0 |
| AI 洞察摘要 | AI 自动生成的数据洞察卡片列表 | P1 |
| 企业关系图谱 | 交互式股权关联网络图，支持点击节点下钻 | P1 |
| 图表可交互 | 支持筛选时间范围、切换维度、点击下钻 | P1 |
| 图表导出 | 支持将图表导出为图片/PDF | P2 |

---

### 1.4 全局功能需求

| 功能项 | 描述 | 优先级 |
|-------|------|-------|
| 侧边栏导航 | 三模块切换 + 历史会话 + 用户信息，支持折叠 | P0 |
| 全局企业搜索 | 顶部搜索框，支持 ⌘K 快捷键 | P1 |
| 用户系统 | 登录/注册/权限（企业版/个人版） | P1 |
| 暗色主题 | 默认深色科技风主题 | P0 |
| 响应式布局 | 适配 1280px ~ 1920px+ 桌面分辨率 | P1 |

---

## 第二部分：技术架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    前端 (Next.js + React)                 │
│  ┌──────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │   Chat   │  │  Agent 工坊    │  │    Datashow      │  │
│  │  Module   │  │    Module     │  │     Module       │  │
│  └────┬─────┘  └───────┬───────┘  └────────┬─────────┘  │
│       └────────────────┼────────────────────┘            │
│                        │ REST API / WebSocket             │
└────────────────────────┼─────────────────────────────────┘
                         │
┌────────────────────────┼─────────────────────────────────┐
│                  后端 (FastAPI / Python)                   │
│  ┌─────────────┐  ┌───────────┐  ┌───────────────────┐  │
│  │  Chat API   │  │ Agent API │  │  Datashow API     │  │
│  │  (对话管理)  │  │ (任务调度) │  │  (数据聚合)       │  │
│  └──────┬──────┘  └─────┬─────┘  └────────┬──────────┘  │
│         └───────────────┼─────────────────┘              │
│                         │                                │
│  ┌──────────────────────┼───────────────────────────┐    │
│  │              Agent Engine (核心)                   │    │
│  │  ┌─────────┐  ┌──────────┐  ┌────────────────┐  │    │
│  │  │ LLM     │  │ Tool     │  │  Workflow       │  │    │
│  │  │ Router  │  │ Registry │  │  Orchestrator   │  │    │
│  │  └────┬────┘  └────┬─────┘  └───────┬────────┘  │    │
│  │       └─────────────┼───────────────┘            │    │
│  └─────────────────────┼────────────────────────────┘    │
│                        │                                 │
│  ┌─────────────────────┼────────────────────────────┐    │
│  │             底层 Agent 驱动                        │    │
│  │  ┌─────────────┐  ┌──────────────────────────┐   │    │
│  │  │ Claude API  │  │  Claude Code CLI (测试)   │   │    │
│  │  │ (生产环境)   │  │  (本地开发 / Demo)        │   │    │
│  │  └─────────────┘  └──────────────────────────┘   │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │              数据层                                │    │
│  │  PostgreSQL │ Redis │ 快查企业数据 API             │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### 2.2 技术栈选型

| 层级 | 技术 | 理由 |
|-----|------|------|
| **前端框架** | Next.js 14 (App Router) + React 18 | SSR 支持、文件路由、API Routes 可选 |
| **UI 框架** | Tailwind CSS + shadcn/ui | 高度可定制、暗色主题友好 |
| **可视化** | ECharts + D3.js + React Flow | ECharts 覆盖常规图表，D3 做定制可视化，React Flow 做关系图谱 |
| **状态管理** | Zustand | 轻量、TypeScript 友好 |
| **后端框架** | FastAPI (Python) | 异步支持好、类型安全、生态丰富 |
| **Agent 引擎** | 自建 (基于 Anthropic SDK) | 灵活定制 Agent workflow |
| **测试驱动** | Claude Code CLI 封装 | 本地开发测试用 |
| **数据库** | PostgreSQL + Redis | PG 存持久数据，Redis 做缓存/消息队列 |
| **实时通信** | WebSocket (FastAPI) | Agent 执行进度推送、实时预警 |
| **文件导出** | WeasyPrint (PDF) + openpyxl (Excel) | 服务端生成报告文件 |

### 2.3 Claude Code CLI 封装方案（本地测试用后端 Agent 驱动）

在本地开发和 Demo 阶段，用 Claude Code CLI 作为底层 Agent 驱动，通过 Python 子进程调用来模拟生产环境中的 Claude API 调用。

**封装思路**：

```python
# 核心思路：将 Claude Code CLI 封装为一个可调用的 Agent Driver
# 生产环境替换为 Anthropic API 直接调用，接口保持一致

class AgentDriver:
    """统一的 Agent 驱动接口，底层可切换 CLI / API"""
    
    async def execute(self, prompt: str, tools: list, system: str) -> AgentResult:
        """统一调用接口"""
        pass

class ClaudeCodeCLIDriver(AgentDriver):
    """基于 Claude Code CLI 的本地测试驱动"""
    # 通过 subprocess 调用 claude code CLI
    # claude -p "prompt" --output-format json
    
class ClaudeAPIDriver(AgentDriver):
    """基于 Anthropic API 的生产驱动"""
    # 通过 anthropic SDK 直接调用
```

**为什么这样做**：
- Claude Code CLI 本身就是一个强大的 Agent（能读写文件、执行代码、调用工具）
- 本地开发时不需要搭建复杂的 Agent 框架，直接利用 CLI 能力
- 通过统一接口抽象，生产环境可以无缝切换为 API 调用
- CLI 模式支持 `--output-format json`，方便程序化解析结果

---

## 第三部分：项目架构与文件树

### 3.1 完整项目结构

```
kuaicha-ai/
├── README.md                          # 项目说明
├── docker-compose.yml                 # 一键启动开发环境
├── .env.example                       # 环境变量模板
├── .env.local                         # 本地环境变量（git忽略）
│
├── frontend/                          # ========== 前端 ==========
│   ├── package.json
│   ├── next.config.js                 # Next.js 配置
│   ├── tailwind.config.js             # Tailwind 主题配置（暗色科技风）
│   ├── tsconfig.json
│   │
│   ├── public/
│   │   ├── favicon.ico
│   │   └── fonts/                     # 自定义字体（Outfit + Noto Sans SC）
│   │
│   ├── src/
│   │   ├── app/                       # Next.js App Router
│   │   │   ├── layout.tsx             # 根布局（全局样式、字体、Provider 注入）
│   │   │   ├── page.tsx               # 主页 → 重定向到 /workspace
│   │   │   ├── globals.css            # 全局样式（CSS 变量、滚动条、动画）
│   │   │   │
│   │   │   ├── workspace/             # 工作台主路由
│   │   │   │   ├── layout.tsx         # 工作台布局（侧边栏 + 顶部栏 + 内容区）
│   │   │   │   ├── page.tsx           # 默认重定向到 /workspace/chat
│   │   │   │   │
│   │   │   │   ├── chat/              # Chat 模块
│   │   │   │   │   └── page.tsx       # Chat 页面
│   │   │   │   │
│   │   │   │   ├── agent/             # Agent 模块
│   │   │   │   │   ├── page.tsx       # Agent 列表页（卡片网格）
│   │   │   │   │   └── [agentId]/     # Agent 详情/执行页
│   │   │   │   │       └── page.tsx   # 单个 Agent 配置与执行
│   │   │   │   │
│   │   │   │   └── datashow/          # Datashow 模块
│   │   │   │       ├── page.tsx       # Datashow 主页
│   │   │   │       ├── overview/      # 概览面板
│   │   │   │       ├── trend/         # 趋势分析
│   │   │   │       ├── relation/      # 关系图谱
│   │   │   │       ├── geo/           # 地域分布
│   │   │   │       └── compare/       # 多维对比
│   │   │   │
│   │   │   └── api/                   # Next.js API Routes (BFF 代理层，可选)
│   │   │       └── proxy/
│   │   │           └── [...path]/route.ts  # 代理转发到 FastAPI 后端
│   │   │
│   │   ├── components/                # 组件库
│   │   │   ├── ui/                    # 基础 UI 组件（shadcn/ui 扩展）
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── progress.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   ├── tooltip.tsx
│   │   │   │   └── skeleton.tsx       # 加载骨架屏
│   │   │   │
│   │   │   ├── layout/                # 布局组件
│   │   │   │   ├── Sidebar.tsx        # 侧边栏（导航 + 历史 + 用户）
│   │   │   │   ├── TopBar.tsx         # 顶部栏（标题 + 全局搜索 + 通知）
│   │   │   │   └── CommandPalette.tsx # ⌘K 全局搜索弹窗
│   │   │   │
│   │   │   ├── chat/                  # Chat 专属组件
│   │   │   │   ├── ChatWindow.tsx     # 对话窗口容器
│   │   │   │   ├── MessageBubble.tsx  # 消息气泡（用户/AI 两种样式）
│   │   │   │   ├── RiskCard.tsx       # 风险信息结构化卡片
│   │   │   │   ├── QuickPrompts.tsx   # 快捷提问网格
│   │   │   │   ├── ChatInput.tsx      # 输入框（自动增高 + 发送按钮）
│   │   │   │   └── ActionButtons.tsx  # AI 回复下方的操作按钮组
│   │   │   │
│   │   │   ├── agent/                 # Agent 专属组件
│   │   │   │   ├── AgentGrid.tsx      # Agent 卡片网格
│   │   │   │   ├── AgentCard.tsx      # 单个 Agent 卡片
│   │   │   │   ├── AgentFilter.tsx    # 筛选栏
│   │   │   │   ├── AgentConfig.tsx    # Agent 参数配置面板
│   │   │   │   ├── AgentProgress.tsx  # 四阶段执行进度条
│   │   │   │   ├── AgentResult.tsx    # 执行结果展示
│   │   │   │   └── AgentHistory.tsx   # Agent 执行历史记录
│   │   │   │
│   │   │   ├── datashow/             # Datashow 专属组件
│   │   │   │   ├── DashboardCards.tsx # 概览指标卡片
│   │   │   │   ├── TrendChart.tsx     # 趋势图（ECharts 封装）
│   │   │   │   ├── RiskDistribution.tsx # 风险分布堆叠柱状图
│   │   │   │   ├── IndustryDonut.tsx  # 行业分布环形图
│   │   │   │   ├── RelationGraph.tsx  # 关系图谱（React Flow）
│   │   │   │   ├── GeoHeatmap.tsx     # 地域分布热力图
│   │   │   │   ├── CompareRadar.tsx   # 多维对比雷达图
│   │   │   │   ├── AlertFeed.tsx      # 实时预警流
│   │   │   │   ├── InsightCards.tsx   # AI 洞察摘要
│   │   │   │   ├── NLQueryBar.tsx     # 自然语言生成图表输入框
│   │   │   │   └── MiniChart.tsx      # 迷你图表（折线/柱状/环形）
│   │   │   │
│   │   │   └── shared/               # 共享组件
│   │   │       ├── RiskBadge.tsx      # 风险等级标签（高/中/低）
│   │   │       ├── CompanyAvatar.tsx  # 企业头像/Logo
│   │   │       ├── LoadingDots.tsx    # AI 思考中动画
│   │   │       ├── EmptyState.tsx     # 空状态占位
│   │   │       └── ErrorBoundary.tsx  # 错误边界
│   │   │
│   │   ├── hooks/                    # 自定义 Hooks
│   │   │   ├── useChat.ts            # Chat 对话状态管理
│   │   │   ├── useAgent.ts           # Agent 执行状态管理
│   │   │   ├── useWebSocket.ts       # WebSocket 连接管理
│   │   │   ├── useDatashow.ts        # 可视化数据获取
│   │   │   └── useCommandPalette.ts  # ⌘K 搜索逻辑
│   │   │
│   │   ├── stores/                   # Zustand 状态管理
│   │   │   ├── chatStore.ts          # Chat 全局状态（消息列表、会话列表）
│   │   │   ├── agentStore.ts         # Agent 全局状态（执行队列、历史）
│   │   │   ├── datashowStore.ts      # Datashow 状态（当前面板、筛选条件）
│   │   │   └── appStore.ts           # App 全局状态（侧边栏、主题、用户）
│   │   │
│   │   ├── services/                 # API 调用封装
│   │   │   ├── api.ts                # Axios 实例配置
│   │   │   ├── chatService.ts        # Chat API
│   │   │   ├── agentService.ts       # Agent API
│   │   │   ├── datashowService.ts    # Datashow API
│   │   │   └── companyService.ts     # 企业搜索 API
│   │   │
│   │   ├── types/                    # TypeScript 类型定义
│   │   │   ├── chat.ts               # Chat 相关类型
│   │   │   ├── agent.ts              # Agent 相关类型
│   │   │   ├── datashow.ts           # Datashow 相关类型
│   │   │   ├── company.ts            # 企业数据类型
│   │   │   └── api.ts                # API 响应类型
│   │   │
│   │   ├── lib/                      # 工具函数
│   │   │   ├── utils.ts              # 通用工具
│   │   │   ├── formatters.ts         # 数据格式化（数字、日期、风险等级）
│   │   │   └── constants.ts          # 常量定义（Agent 列表、颜色、标签）
│   │   │
│   │   └── styles/
│   │       └── theme.ts              # 主题常量（配色方案）
│   │
│   └── tests/                        # 前端测试
│
├── backend/                           # ========== 后端 ==========
│   ├── pyproject.toml                 # Python 项目配置
│   ├── requirements.txt
│   │
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI 应用入口 + CORS + 路由挂载
│   │   ├── config.py                 # 配置管理（环境变量读取）
│   │   │
│   │   ├── api/                      # API 路由层
│   │   │   ├── __init__.py
│   │   │   ├── router.py             # 路由汇总注册
│   │   │   ├── chat.py               # /api/chat/* 路由
│   │   │   ├── agent.py              # /api/agent/* 路由
│   │   │   ├── datashow.py           # /api/datashow/* 路由
│   │   │   ├── company.py            # /api/company/* 路由（企业搜索）
│   │   │   └── ws.py                 # WebSocket 路由（实时推送）
│   │   │
│   │   ├── services/                 # 业务逻辑层
│   │   │   ├── __init__.py
│   │   │   ├── chat_service.py       # Chat 业务逻辑（对话管理、上下文）
│   │   │   ├── agent_service.py      # Agent 业务逻辑（任务调度、状态管理）
│   │   │   ├── datashow_service.py   # Datashow 业务逻辑（数据聚合、图表配置）
│   │   │   └── company_service.py    # 企业数据服务
│   │   │
│   │   ├── agents/                   # ========== Agent 引擎 ==========
│   │   │   ├── __init__.py
│   │   │   ├── base.py               # Agent 基类（统一接口定义）
│   │   │   ├── registry.py           # Agent 注册中心（自动发现与注册）
│   │   │   ├── executor.py           # Agent 执行器（异步执行、进度追踪）
│   │   │   │
│   │   │   ├── driver/               # 底层 LLM 驱动（可切换）
│   │   │   │   ├── __init__.py
│   │   │   │   ├── base_driver.py    # 驱动接口定义
│   │   │   │   ├── claude_api.py     # Anthropic API 驱动（生产）
│   │   │   │   └── claude_cli.py     # Claude Code CLI 驱动（本地测试）
│   │   │   │
│   │   │   ├── tools/                # Agent 可调用工具
│   │   │   │   ├── __init__.py
│   │   │   │   ├── company_lookup.py # 企业信息查询工具
│   │   │   │   ├── risk_scan.py      # 风险扫描工具
│   │   │   │   ├── news_search.py    # 舆情搜索工具
│   │   │   │   ├── financial_data.py # 财务数据工具
│   │   │   │   ├── equity_graph.py   # 股权关系工具
│   │   │   │   └── export_tool.py    # 数据导出工具（Excel/PDF）
│   │   │   │
│   │   │   ├── workflows/            # 场景化 Agent Workflow 定义
│   │   │   │   ├── __init__.py
│   │   │   │   ├── risk_due_diligence.py    # 企业风控尽调 Agent
│   │   │   │   ├── sentiment_briefing.py    # 舆情风险简报 Agent
│   │   │   │   ├── bid_insight.py           # 招采商机洞察 Agent
│   │   │   │   ├── tech_assessment.py       # 科创能力评估 Agent
│   │   │   │   ├── business_map.py          # 商业版图分析 Agent
│   │   │   │   └── job_diagnosis.py         # 求职背调诊断 Agent
│   │   │   │
│   │   │   └── prompts/              # Agent System Prompts
│   │   │       ├── risk_due_diligence.md
│   │   │       ├── sentiment_briefing.md
│   │   │       ├── bid_insight.md
│   │   │       ├── tech_assessment.md
│   │   │       ├── business_map.md
│   │   │       └── job_diagnosis.md
│   │   │
│   │   ├── models/                   # 数据模型
│   │   │   ├── __init__.py
│   │   │   ├── chat.py               # Chat 数据模型（会话、消息）
│   │   │   ├── agent.py              # Agent 数据模型（任务、结果）
│   │   │   ├── company.py            # 企业数据模型
│   │   │   └── user.py               # 用户模型
│   │   │
│   │   ├── schemas/                  # Pydantic 请求/响应 Schema
│   │   │   ├── __init__.py
│   │   │   ├── chat.py
│   │   │   ├── agent.py
│   │   │   ├── datashow.py
│   │   │   └── company.py
│   │   │
│   │   ├── db/                       # 数据库
│   │   │   ├── __init__.py
│   │   │   ├── database.py           # SQLAlchemy 连接配置
│   │   │   ├── redis.py              # Redis 连接配置
│   │   │   └── migrations/           # Alembic 数据库迁移
│   │   │
│   │   └── utils/                    # 工具函数
│   │       ├── __init__.py
│   │       ├── logger.py             # 日志配置
│   │       ├── export.py             # 报告导出（PDF/Excel 生成）
│   │       └── mock_data.py          # Mock 数据（Demo 阶段用）
│   │
│   └── tests/                        # 后端测试
│       ├── test_chat.py
│       ├── test_agent.py
│       └── test_drivers.py
│
├── scripts/                           # ========== 脚本 ==========
│   ├── setup.sh                      # 环境初始化脚本
│   ├── dev.sh                        # 一键启动开发环境
│   └── seed_data.py                  # 初始化 Mock 数据
│
└── docs/                              # ========== 文档 ==========
    ├── PRD.md                         # 本文档
    ├── API.md                         # API 接口文档
    ├── AGENTS.md                      # Agent 开发指南
    └── DEPLOYMENT.md                  # 部署文档
```

### 3.2 核心文件功能说明

#### 前端核心文件

| 文件 | 功能 | 为什么需要 |
|-----|------|-----------|
| `app/workspace/layout.tsx` | 工作台布局骨架 | 三模块共享侧边栏+顶栏，内容区由子路由填充 |
| `components/layout/Sidebar.tsx` | 侧边栏 | 三模块切换、历史会话、用户信息、折叠功能 |
| `components/chat/ChatWindow.tsx` | Chat 核心 | 管理消息渲染、滚动、流式输出展示 |
| `components/agent/AgentProgress.tsx` | Agent 进度 | 四阶段可视化进度条，WebSocket 驱动实时更新 |
| `components/datashow/RelationGraph.tsx` | 关系图谱 | React Flow 封装，支持节点点击下钻 |
| `components/datashow/NLQueryBar.tsx` | 自然语言图表生成 | Datashow 特色入口，输入描述→AI 生成图表配置 |
| `stores/agentStore.ts` | Agent 全局状态 | 管理执行队列（多个 Agent 可并发）、历史记录 |
| `hooks/useWebSocket.ts` | WS 连接 | Agent 进度推送、实时预警推送 |
| `services/api.ts` | HTTP 客户端 | Axios 封装，统一错误处理、Token 注入 |

#### 后端核心文件

| 文件 | 功能 | 为什么需要 |
|-----|------|-----------|
| `main.py` | 应用入口 | FastAPI 实例、CORS、路由挂载、生命周期管理 |
| `agents/base.py` | Agent 基类 | 定义统一接口 `execute(input) → result`，所有 Agent 继承 |
| `agents/registry.py` | Agent 注册中心 | 自动发现 workflows 目录下的 Agent，注册到全局 |
| `agents/executor.py` | Agent 执行器 | 异步执行 Agent，管理进度状态，通过 WS 推送进度 |
| `agents/driver/base_driver.py` | 驱动接口 | 抽象 LLM 调用，定义 `call(prompt, tools) → response` |
| `agents/driver/claude_cli.py` | CLI 驱动 | 封装 claude code CLI 为可编程调用的驱动，本地测试用 |
| `agents/driver/claude_api.py` | API 驱动 | 封装 Anthropic API，生产环境用 |
| `agents/workflows/risk_due_diligence.py` | 尽调 Agent | 定义尽调的完整工作流（数据采集→分析→报告生成） |
| `agents/tools/` | Agent 工具集 | Agent 可调用的外部工具（查企业、查风险、查舆情等） |
| `agents/prompts/` | System Prompts | 每个 Agent 的 system prompt，定义角色、输出格式 |
| `api/ws.py` | WebSocket 路由 | Agent 进度实时推送、实时预警推送 |
| `utils/mock_data.py` | Mock 数据 | Demo 阶段提供假数据，无需依赖真实数据源 |

### 3.3 Agent 引擎核心设计

#### Agent 基类定义

```python
# backend/app/agents/base.py

from abc import ABC, abstractmethod
from typing import Any, AsyncIterator
from pydantic import BaseModel

class AgentInput(BaseModel):
    """Agent 统一输入"""
    target: str                    # 目标企业名称
    params: dict = {}              # 场景化参数
    user_id: str = ""

class AgentProgress(BaseModel):
    """进度更新"""
    stage: str                     # 当前阶段名
    progress: float                # 0-100
    message: str                   # 进度描述
    data: dict = {}                # 阶段性数据

class AgentResult(BaseModel):
    """Agent 统一输出"""
    summary: str                   # 摘要结论
    report: dict                   # 结构化报告内容
    charts: list[dict] = []        # 可视化图表配置
    attachments: list[dict] = []   # 可下载附件信息
    metadata: dict = {}            # 元数据（耗时、数据量等）

class BaseAgent(ABC):
    """所有 Agent 的基类"""
    
    agent_id: str
    name: str
    description: str
    color: str
    tags: list[str]
    
    @abstractmethod
    async def execute(
        self, 
        input: AgentInput,
        on_progress: callable  # 进度回调
    ) -> AgentResult:
        pass
    
    @abstractmethod
    def get_config_schema(self) -> dict:
        """返回该 Agent 的配置参数 JSON Schema"""
        pass
```

#### Claude Code CLI 驱动封装

```python
# backend/app/agents/driver/claude_cli.py

import asyncio
import json
import subprocess
from .base_driver import BaseDriver, DriverResponse

class ClaudeCodeCLIDriver(BaseDriver):
    """
    将 Claude Code CLI 封装为可编程调用的 Agent 驱动。
    适用于本地开发和 Demo 测试。
    
    前提条件：
    - 已安装 Claude Code CLI: npm install -g @anthropic-ai/claude-code
    - 已完成 CLI 认证
    """
    
    def __init__(self, model: str = "sonnet"):
        self.model = model
    
    async def call(
        self, 
        prompt: str, 
        system_prompt: str = "",
        tools: list[dict] = None,
        max_tokens: int = 4096
    ) -> DriverResponse:
        """
        调用 Claude Code CLI 执行任务
        
        CLI 命令格式：
        claude -p "prompt" --model sonnet --output-format json
        """
        # 构造完整 prompt（system + user）
        full_prompt = f"{system_prompt}\n\n---\n\n{prompt}" if system_prompt else prompt
        
        cmd = [
            "claude",
            "-p", full_prompt,
            "--model", self.model,
            "--output-format", "json",
            "--max-turns", "10",
        ]
        
        # 如果有工具定义，写入临时文件供 CLI 使用
        # （生产环境用 API 的 tools 参数替代）
        
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        
        if proc.returncode != 0:
            raise RuntimeError(f"Claude CLI error: {stderr.decode()}")
        
        result = json.loads(stdout.decode())
        
        return DriverResponse(
            content=result.get("result", ""),
            usage=result.get("usage", {}),
            model=result.get("model", self.model),
        )
    
    async def call_streaming(
        self, 
        prompt: str,
        system_prompt: str = "",
    ) -> AsyncIterator[str]:
        """
        流式调用（用于 Chat 场景）
        使用 --output-format stream-json
        """
        full_prompt = f"{system_prompt}\n\n---\n\n{prompt}" if system_prompt else prompt
        
        cmd = [
            "claude",
            "-p", full_prompt,
            "--model", self.model,
            "--output-format", "stream-json",
        ]
        
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        
        async for line in proc.stdout:
            text = line.decode().strip()
            if text:
                try:
                    chunk = json.loads(text)
                    if chunk.get("type") == "assistant":
                        yield chunk.get("content", "")
                except json.JSONDecodeError:
                    yield text
```

#### 生产环境 API 驱动

```python
# backend/app/agents/driver/claude_api.py

import anthropic
from .base_driver import BaseDriver, DriverResponse

class ClaudeAPIDriver(BaseDriver):
    """
    基于 Anthropic API 的生产环境驱动。
    接口与 CLI 驱动完全一致，可无缝切换。
    """
    
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-5-20250929"):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)
        self.model = model
    
    async def call(
        self, 
        prompt: str,
        system_prompt: str = "",
        tools: list[dict] = None,
        max_tokens: int = 4096
    ) -> DriverResponse:
        
        kwargs = {
            "model": self.model,
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system_prompt:
            kwargs["system"] = system_prompt
        if tools:
            kwargs["tools"] = tools
        
        response = await self.client.messages.create(**kwargs)
        
        content = ""
        for block in response.content:
            if block.type == "text":
                content += block.text
        
        return DriverResponse(
            content=content,
            usage={"input": response.usage.input_tokens, "output": response.usage.output_tokens},
            model=self.model,
        )
```

#### 驱动切换配置

```python
# backend/app/agents/driver/__init__.py

from app.config import settings
from .claude_cli import ClaudeCodeCLIDriver
from .claude_api import ClaudeAPIDriver

def get_driver():
    """根据环境变量自动选择驱动"""
    if settings.AGENT_DRIVER == "cli":
        return ClaudeCodeCLIDriver(model=settings.CLAUDE_MODEL)
    else:
        return ClaudeAPIDriver(
            api_key=settings.ANTHROPIC_API_KEY,
            model=settings.CLAUDE_MODEL
        )
```

```env
# .env.local

# 驱动选择: "cli" (本地测试) | "api" (生产环境)
AGENT_DRIVER=cli

# Claude 模型
CLAUDE_MODEL=sonnet

# 生产环境 API Key（CLI 模式下不需要）
ANTHROPIC_API_KEY=sk-ant-xxx

# 数据库
DATABASE_URL=postgresql://localhost:5432/kuaicha
REDIS_URL=redis://localhost:6379/0

# 服务端口
BACKEND_PORT=8000
FRONTEND_PORT=3000
```

### 3.4 前后端通信设计

#### API 路由设计

```
# Chat
POST   /api/chat/sessions              # 创建会话
GET    /api/chat/sessions               # 会话列表
GET    /api/chat/sessions/{id}          # 会话详情（含消息）
POST   /api/chat/sessions/{id}/messages # 发送消息（SSE 流式返回）
DELETE /api/chat/sessions/{id}          # 删除会话

# Agent
GET    /api/agent/list                  # 获取 Agent 列表
GET    /api/agent/{id}/schema           # 获取 Agent 配置 Schema
POST   /api/agent/{id}/execute          # 启动 Agent 执行
GET    /api/agent/tasks/{taskId}        # 查询任务状态
GET    /api/agent/tasks/{taskId}/result # 获取任务结果
GET    /api/agent/history               # 执行历史

# Datashow
GET    /api/datashow/overview           # 概览数据
GET    /api/datashow/trend              # 趋势数据
GET    /api/datashow/distribution       # 分布数据
GET    /api/datashow/alerts             # 预警数据
POST   /api/datashow/nl-query           # 自然语言→图表配置
GET    /api/datashow/relation/{company} # 关系图谱数据

# Company
GET    /api/company/search?q=           # 企业搜索
GET    /api/company/{id}                # 企业详情

# WebSocket
WS     /ws/agent/{taskId}              # Agent 执行进度推送
WS     /ws/alerts                       # 实时预警推送
```

#### WebSocket 消息协议

```json
// Agent 进度推送
{
  "type": "agent_progress",
  "taskId": "task_xxx",
  "data": {
    "stage": "数据采集",
    "progress": 25.5,
    "message": "正在扫描司法数据...",
    "stageIndex": 0,
    "totalStages": 4
  }
}

// Agent 完成
{
  "type": "agent_complete",
  "taskId": "task_xxx",
  "data": {
    "summary": "...",
    "reportUrl": "/api/agent/tasks/task_xxx/result",
    "duration": 42,
    "dataPoints": 2847
  }
}

// 实时预警
{
  "type": "alert",
  "data": {
    "company": "恒大集团",
    "event": "新增被执行人信息",
    "level": "high",
    "timestamp": "2026-02-09T10:30:00Z"
  }
}
```

---

## 第四部分：开发路线图

### 4.1 MVP（Phase 1）

**目标**：搭建完整骨架，跑通核心链路。

```
✅ 前端框架搭建（Next.js + Tailwind + shadcn/ui）
✅ 三模块布局与路由
✅ Chat 基础对话（接入 Claude CLI/API）
✅ Agent 列表展示 + 1 个 Agent 跑通（企业风控尽调）
✅ Agent 执行进度 WebSocket 推送
✅ Datashow 概览面板（Mock 数据）
✅ Mock 数据层（无需真实企业数据即可 Demo）
```

### 4.2 Phase 2

```
✅ Chat 结构化回复 + 跨模块跳转
✅ 新增 2-3 个 Agent（舆情简报、商业版图）
✅ Agent 结果导出（PDF / Excel）
✅ Datashow 关系图谱（React Flow）
✅ Datashow 自然语言生成图表
✅ 实时预警 WebSocket 推送
✅ 接入真实企业数据 API
```

### 4.3 Phase 3 — 持续迭代

```
✅ 定制化监控预警（持续型服务）
✅ 批量数据处理 Agent
✅ Datashow 地域分布 / 多维对比
✅ 用户系统 / 权限控制
✅ 历史会话持久化
✅ 性能优化 / 部署
```

### 4.4 快速启动命令

```bash
# 1. 克隆项目
git clone <repo-url> kuaicha-ai && cd kuaicha-ai

# 2. 环境准备
cp .env.example .env.local
# 编辑 .env.local 设置 AGENT_DRIVER=cli

# 3. 启动后端
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 4. 启动前端
cd frontend
npm install
npm run dev

# 5. 访问
open http://localhost:3000
```

---

## 附录：为什么这样设计

### 为什么前后端分离而非全用 Next.js API Routes？

Agent 执行是长时间异步任务（可能 30s-2min），需要 WebSocket 推送进度。FastAPI 的异步生态更成熟，Python 在 AI/数据处理生态中更强（Anthropic SDK、pandas、数据分析库）。Next.js API Routes 做轻量 BFF 代理即可。

### 为什么 Agent 引擎要自建而不用 LangChain？

快查 AI 的 Agent 是场景高度确定的（6 个固定 Agent），每个 Agent 的 workflow 步骤是预定义的（采集→分析→报告→校验）。自建引擎更轻量、可控、易调试。LangChain 的通用抽象反而增加复杂度。

### 为什么用两套驱动（CLI + API）？

开发阶段用 CLI 驱动的优势：不消耗 API Token、可以利用 Claude Code 的文件操作能力（生成报告文件）、调试更直观。通过统一接口抽象，切换到 API 只需改一个环境变量。

### 为什么 Datashow 用 ECharts 而不全用 D3？

ECharts 开箱即用覆盖 80% 的常规图表需求（折线、柱状、饼图、地图），暗色主题支持好。D3 用于 ECharts 无法覆盖的定制场景（自定义力导向图等）。React Flow 专门处理关系图谱交互。
