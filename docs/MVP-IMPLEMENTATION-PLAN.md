# 快查 AI — MVP (Phase 1) 实现计划

> **版本**: v1.0
> **日期**: 2026-02-09
> **阶段**: Phase 1 — 搭建完整骨架，跑通核心链路

---

## 一、项目现状

| 项 | 状态 | 说明 |
|----|------|------|
| 产品定义 | ✅ 已完成 | `kuaicha-ai-prd.md` — 完整 PRD + 技术架构设计 |
| UI 原型 | ✅ 已完成 | `kuaicha-ai-demo.jsx` — 全功能交互原型（暗色科技风） |
| 前端工程 | ❌ 未开始 | 需初始化 Next.js 项目 |
| 后端工程 | ❌ 未开始 | 需初始化 FastAPI 项目 |
| 数据库 | ❌ 未开始 | MVP 使用内存 Mock，Phase 2 接入 PostgreSQL + Redis |
| 基础设施 | ❌ 未开始 | 需创建 .env、.gitignore、启动脚本 |

---

## 二、MVP 目标

1. 前端框架搭建（Next.js 14 + Tailwind CSS + shadcn/ui）
2. 三模块布局与路由（Chat / Agent / Datashow）
3. Chat 基础对话（SSE 流式返回，支持结构化风险回复）
4. Agent 列表展示 + 1 个 Agent 跑通（企业风控尽调）
5. Agent 执行进度 WebSocket 实时推送
6. Datashow 概览面板（Mock 数据驱动）
7. Mock 数据层（无需真实企业数据即可完整 Demo）

---

## 三、实现顺序与依赖关系

```
Step 0: 项目基础设施          ← 无依赖
Step 1: 前端框架初始化        ← 依赖 Step 0
Step 2: 前端布局骨架          ← 依赖 Step 1
Step 3: 后端框架初始化        ← 依赖 Step 0（可与 Step 1-2 并行）
Step 4: Chat 模块             ← 依赖 Step 2 + Step 3
Step 5: Agent 引擎核心        ← 依赖 Step 3
Step 6: 企业风控尽调 Agent    ← 依赖 Step 5
Step 7: Agent 模块前端        ← 依赖 Step 2 + Step 6
Step 8: Datashow 概览面板     ← 依赖 Step 2 + Step 3
Step 9: 联调与打磨            ← 依赖 Step 4 + Step 7 + Step 8
```

---

## 四、各步骤详细设计

### Step 0: 项目基础设施

**产出文件:**

| 文件 | 说明 |
|------|------|
| `.env.example` | 环境变量模板（AGENT_DRIVER=mock, 端口, API_URL） |
| `.gitignore` | node_modules, \_\_pycache\_\_, .next, venv, .env.local, .DS_Store |
| `scripts/dev.sh` | 一键启动前后端开发环境脚本 |

---

### Step 1: 前端框架初始化

#### 1.1 创建 Next.js 项目

```bash
npx create-next-app@14 frontend \
  --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

#### 1.2 安装依赖

```bash
cd frontend
npm install zustand echarts echarts-for-react
npm install -D tailwindcss-animate

# shadcn/ui 初始化
npx shadcn@latest init    # Style: Default, Base color: Slate, CSS variables: Yes
npx shadcn@latest add button input card badge progress tabs tooltip skeleton \
  textarea scroll-area separator
```

#### 1.3 关键配置文件

| 文件 | 内容 |
|------|------|
| `tailwind.config.ts` | 暗色主题配色（从 demo.jsx 提取）、自定义动画 |
| `src/app/globals.css` | shadcn CSS 变量覆盖、字体、滚动条、工具类 |
| `src/app/layout.tsx` | 根布局：Google Fonts (Outfit + Noto Sans SC)、`lang="zh-CN"` `class="dark"` |
| `src/styles/theme.ts` | 集中主题常量（供 ECharts 等非 Tailwind 场景使用） |

**主题配色（从 demo.jsx 提取）:**

```
背景色:     #06080f (root), #0a0e1a (sidebar)
模块色:     Chat #4A9EFF, Agent #A78BFA, Datashow #34D399
Logo 渐变:  #E8A838 → #F06543
风险色:     high #EF4444, medium #F59E0B, low #10B981
文本层级:   0.9 / 0.7 / 0.5 / 0.35 / 0.25 / 0.15 (白色透明度)
动画:       fadeIn, slideIn, shimmer, dotPulse, float
```

#### 1.4 TypeScript 类型定义

| 文件 | 导出类型 |
|------|----------|
| `src/types/chat.ts` | ChatSession, ChatMessage, RiskDetail, QuickPrompt |
| `src/types/agent.ts` | AgentDefinition, AgentTask, AgentProgress, AgentResult, TaskStatus |
| `src/types/datashow.ts` | OverviewCard, RiskTrendBar, IndustrySegment, AlertItem, InsightItem |
| `src/types/api.ts` | ApiResponse\<T\>, ErrorResponse |

---

### Step 2: 前端布局骨架

#### 2.1 路由结构

```
src/app/
  page.tsx                        → redirect to /workspace/chat
  workspace/
    layout.tsx                    → Sidebar + TopBar + {children}
    page.tsx                      → redirect to /workspace/chat
    chat/page.tsx                 → Chat 页面
    agent/page.tsx                → Agent 列表页
    agent/[agentId]/page.tsx      → Agent 执行页
    datashow/page.tsx             → Datashow 概览页
```

#### 2.2 布局组件

| 组件 | 文件路径 | 说明 |
|------|----------|------|
| Sidebar | `components/layout/Sidebar.tsx` | 可折叠 (220px/64px)、Logo、导航标签+激活指示条、最近会话、用户信息 |
| TopBar | `components/layout/TopBar.tsx` | 模块图标+中文标题+副标题、搜索输入框 (⌘K 占位)、通知图标 |

#### 2.3 状态管理

| Store | 文件路径 | 状态 |
|-------|----------|------|
| appStore | `stores/appStore.ts` | sidebarCollapsed |

#### 2.4 共享组件

| 组件 | 文件路径 | 说明 |
|------|----------|------|
| Icons | `components/shared/Icons.tsx` | 从 demo.jsx 提取的 30+ SVG 图标 |
| RiskBadge | `components/shared/RiskBadge.tsx` | 风险等级标签（高/中/低） |
| LoadingDots | `components/shared/LoadingDots.tsx` | AI 思考中三点动画 |
| EmptyState | `components/shared/EmptyState.tsx` | 空状态占位 |

---

### Step 3: 后端框架初始化

#### 3.1 项目结构

```
backend/
  requirements.txt
  app/
    __init__.py
    main.py                    # FastAPI 入口 + CORS + 路由挂载
    config.py                  # pydantic-settings 配置管理
    api/
      __init__.py
      router.py                # 路由汇总注册
      chat.py                  # /api/chat/* 路由
      agent.py                 # /api/agent/* 路由
      datashow.py              # /api/datashow/* 路由
      ws.py                    # WebSocket 路由
    services/
      __init__.py
      chat_service.py          # Chat 业务逻辑
      agent_service.py         # Agent 业务逻辑
      datashow_service.py      # Datashow 业务逻辑
    agents/                    # → Step 5 填充
    schemas/
      __init__.py
      chat.py                  # Chat 请求/响应 Schema
      agent.py                 # Agent 请求/响应 Schema
      datashow.py              # Datashow 请求/响应 Schema
    utils/
      __init__.py
      mock_data.py             # 全套 Mock 数据
      logger.py                # 日志配置
```

#### 3.2 Python 依赖

```
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
pydantic-settings==2.1.0
python-dotenv==1.0.0
anthropic==0.40.0
sse-starlette==1.8.2
websockets==12.0
httpx==0.26.0
python-multipart==0.0.6
```

#### 3.3 核心文件说明

| 文件 | 说明 |
|------|------|
| `main.py` | FastAPI 实例, CORS (允许 localhost:3000), 路由挂载, `/health` 端点 |
| `config.py` | Settings: AGENT_DRIVER (mock/cli/api), CLAUDE_MODEL, ANTHROPIC_API_KEY, USE_MOCK_DATA |
| `utils/mock_data.py` | Mock 数据中心 — 见下表 |

**Mock 数据函数:**

| 函数 | 返回 |
|------|------|
| `get_mock_sessions()` | 4 条历史会话（同花顺风险查询、宁德时代尽调报告...） |
| `get_mock_chat_response(query)` | 针对同花顺/比亚迪等企业的结构化风险回复 |
| `get_mock_agent_list()` | 6 个 Agent 定义（风控尽调、舆情简报、招采洞察...） |
| `get_mock_agent_result(agent_id, target)` | 完整的尽调报告 Mock 结果 |
| `get_mock_overview()` | Dashboard 全量数据（指标卡片、风险趋势、行业分布、预警、洞察） |

#### 3.4 Pydantic Schemas

| 文件 | 导出 |
|------|------|
| `schemas/chat.py` | CreateSessionRequest, SessionResponse, SendMessageRequest, RiskDetail, MessageResponse |
| `schemas/agent.py` | AgentDefinition, AgentConfigSchema, ExecuteAgentRequest, TaskStatusResponse, AgentResultResponse |
| `schemas/datashow.py` | OverviewCard, RiskTrendBar, IndustrySegment, AlertItem, InsightItem, OverviewResponse |

---

### Step 4: Chat 模块

#### 4.1 后端 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/chat/sessions` | 创建会话（内存存储） |
| GET | `/api/chat/sessions` | 会话列表 |
| POST | `/api/chat/sessions/{id}/messages` | 发送消息，**SSE 流式返回** |

SSE 实现: 使用 `sse-starlette` 的 `EventSourceResponse`
- Mock 模式: 分块返回预置回复，模拟流式效果
- CLI/API 模式: 调用 `driver.call_streaming()`

#### 4.2 前端组件

| 组件 | 文件路径 | 说明 |
|------|----------|------|
| ChatWindow | `components/chat/ChatWindow.tsx` | 对话窗口容器（滚动、消息列表） |
| MessageBubble | `components/chat/MessageBubble.tsx` | 消息气泡（用户/AI 两种样式） |
| RiskCard | `components/chat/RiskCard.tsx` | 风险结构化卡片（等级标色） |
| QuickPrompts | `components/chat/QuickPrompts.tsx` | 欢迎页快捷提问网格（2列） |
| ChatInput | `components/chat/ChatInput.tsx` | 自动增高 textarea + 发送按钮 |
| ActionButtons | `components/chat/ActionButtons.tsx` | "生成尽调报告"、"查看可视化"、"导出数据" |

#### 4.3 前端 Hooks & Store

| 文件 | 说明 |
|------|------|
| `hooks/useChat.ts` | SSE 流式消息处理，消息累积更新 |
| `stores/chatStore.ts` | 消息列表、会话列表、当前会话 ID |
| `services/chatService.ts` | API 调用封装 |

---

### Step 5: Agent 引擎核心

#### 5.1 Agent 基类

**文件:** `backend/app/agents/base.py`

| 类 | 说明 |
|----|------|
| AgentInput | Pydantic Model — target 企业名, params 参数, user_id |
| AgentProgress | Pydantic Model — stage 阶段名, progress 0-100, message |
| AgentResult | Pydantic Model — summary 摘要, report 结构化报告, charts, attachments, metadata |
| BaseAgent (ABC) | `execute(input, on_progress) → AgentResult` + `get_config_schema() → dict` |

#### 5.2 驱动层（3 种可切换驱动）

| 驱动 | 文件 | 说明 |
|------|------|------|
| MockDriver | `agents/driver/mock_driver.py` | 预置回复 + sleep 模拟延迟（**默认驱动**） |
| ClaudeCodeCLIDriver | `agents/driver/claude_cli.py` | `asyncio.create_subprocess_exec` 调用 `claude -p` |
| ClaudeAPIDriver | `agents/driver/claude_api.py` | `anthropic.AsyncAnthropic` SDK 调用 |

**驱动接口:** `agents/driver/base_driver.py` — `call()` 单次调用, `call_streaming()` 流式调用

**驱动工厂:** `agents/driver/__init__.py` — `get_driver()` 根据环境变量 `AGENT_DRIVER` 选择

#### 5.3 执行器与注册中心

| 组件 | 文件 | 说明 |
|------|------|------|
| AgentExecutor | `agents/executor.py` | 内存任务存储、异步执行、进度回调分发、WebSocket 订阅管理 |
| AgentRegistry | `agents/registry.py` | Agent 注册/获取/列表，`register_all_agents()` 在 startup 调用 |

#### 5.4 Agent API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/agent/list` | 所有 Agent 定义 |
| GET | `/api/agent/{id}/schema` | Agent 配置参数 Schema |
| POST | `/api/agent/{id}/execute` | 启动执行，返回 taskId |
| GET | `/api/agent/tasks/{taskId}` | 查询任务状态/进度 |
| GET | `/api/agent/tasks/{taskId}/result` | 获取完成结果 |

#### 5.5 WebSocket

| 协议 | 路径 | 说明 |
|------|------|------|
| WS | `/ws/agent/{taskId}` | 实时推送 `agent_progress` / `agent_complete` 消息 |

**消息格式:**

```json
{ "type": "agent_progress", "taskId": "task_xxx", "data": { "stage": "数据采集", "progress": 25.5, "message": "正在扫描司法数据..." } }
{ "type": "agent_complete", "taskId": "task_xxx", "data": { "summary": "...", "duration": 42 } }
```

---

### Step 6: 企业风控尽调 Agent

**文件:** `backend/app/agents/workflows/risk_due_diligence.py`

**4 阶段执行流程:**

| 阶段 | 进度范围 | 动作 |
|------|----------|------|
| 数据采集 | 0% → 25% | 扫描司法、信用、舆情、工商、财务数据 |
| 智能分析 | 25% → 60% | 交叉比对、风险评分、关键事件提取 |
| 报告生成 | 60% → 90% | 结构化报告撰写、图表配置 |
| 质量校验 | 90% → 100% | 数据一致性校验、结论合理性验证 |

- Mock 模式: `asyncio.sleep` + 预置数据
- CLI/API 模式: 构造 prompt 调用 driver

**System Prompt:** `backend/app/agents/prompts/risk_due_diligence.md`

---

### Step 7: Agent 模块前端

#### 7.1 组件

| 组件 | 文件路径 | 说明 |
|------|----------|------|
| AgentGrid | `components/agent/AgentGrid.tsx` | 3 列 Agent 卡片网格 |
| AgentCard | `components/agent/AgentCard.tsx` | 单个 Agent 卡片（图标、名称、描述、标签） |
| AgentFilter | `components/agent/AgentFilter.tsx` | 筛选标签栏 |
| AgentConfig | `components/agent/AgentConfig.tsx` | 参数配置面板（企业名称、分析维度） |
| AgentProgress | `components/agent/AgentProgress.tsx` | 4 阶段进度条（WebSocket 驱动） |
| AgentResult | `components/agent/AgentResult.tsx` | 结果展示（摘要 + 风险清单 + 操作按钮） |

#### 7.2 前端 Hooks & Store

| 文件 | 说明 |
|------|------|
| `hooks/useWebSocket.ts` | `useAgentWebSocket(taskId)` — WS 连接管理 |
| `hooks/useAgent.ts` | Agent 执行流程状态管理 |
| `stores/agentStore.ts` | 选中 Agent、当前 taskId、执行状态 |
| `services/agentService.ts` | API 调用封装 |

#### 7.3 页面

| 页面 | 路径 | 说明 |
|------|------|------|
| Agent 列表页 | `workspace/agent/page.tsx` | AgentGrid + AgentFilter |
| Agent 执行页 | `workspace/agent/[agentId]/page.tsx` | AgentConfig → AgentProgress → AgentResult |

---

### Step 8: Datashow 概览面板

#### 8.1 组件

| 组件 | 文件路径 | 说明 |
|------|----------|------|
| DashboardCards | `components/datashow/DashboardCards.tsx` | 4 个指标卡片 + MiniChart |
| MiniChart | `components/datashow/MiniChart.tsx` | SVG 迷你图表（折线/柱状/环形） |
| RiskDistribution | `components/datashow/RiskDistribution.tsx` | 风险分布堆叠柱状图（ECharts） |
| IndustryDonut | `components/datashow/IndustryDonut.tsx` | 行业分布环形图（ECharts） |
| AlertFeed | `components/datashow/AlertFeed.tsx` | 实时预警流（滚动列表） |
| InsightCards | `components/datashow/InsightCards.tsx` | AI 洞察摘要卡片 |
| NLQueryBar | `components/datashow/NLQueryBar.tsx` | 自然语言查询输入框（视觉占位） |

#### 8.2 后端

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/datashow/overview` | 返回 OverviewResponse（全量 Dashboard 数据） |

#### 8.3 前端

| 文件 | 说明 |
|------|------|
| `services/datashowService.ts` | API 调用封装 |
| `stores/datashowStore.ts` | Dashboard 数据状态 |
| `workspace/datashow/page.tsx` | 概览面板布局 |

---

### Step 9: 联调与打磨

- **前后端联调**: Chat SSE 流式、Agent WebSocket 进度推送、Datashow 数据加载
- **加载状态**: Skeleton 骨架屏、LoadingDots 动画
- **错误处理**: API 错误提示、WebSocket 断线重连
- **跨模块跳转**: Chat "生成尽调报告" 按钮 → Agent 模块
- **视觉打磨**: 动画时序、过渡效果、响应式适配（1440px+）

---

## 五、MVP 中明确不做的功能

| 功能 | 推迟到 | 原因 |
|------|--------|------|
| 用户认证/登录注册 | Phase 2 | Demo 不需要 |
| ⌘K 搜索实际功能 | Phase 2 | 视觉占位即可 |
| PDF/Excel 导出 | Phase 2 | 需 WeasyPrint/openpyxl |
| PostgreSQL/Redis 数据库 | Phase 2 | 内存 Mock 足够 |
| React Flow 关系图谱 | Phase 2 | 静态图即可 |
| 地域分布/多维对比 | Phase 3 | 完整 Datashow 子模块 |
| NL 生成图表实际功能 | Phase 2 | 按钮存在但功能占位 |
| 其余 5 个 Agent | Phase 2 | MVP 只跑通 1 个 |
| Docker/docker-compose | Phase 2 | 本地脚本启动即可 |
| 测试用例 | Phase 2 | 手动测试为主 |
| 多轮上下文对话 | Phase 2 | 单轮回复足够 Demo |
| 批量数据处理 | Phase 3 | 企业级功能 |

---

## 六、验证清单

| # | 验证项 | 预期结果 |
|---|--------|----------|
| 1 | 前端启动 | `cd frontend && npm run dev` → http://localhost:3000 自动跳转 /workspace/chat |
| 2 | 后端启动 | `cd backend && uvicorn app.main:app --reload --port 8000` → /health 返回 ok |
| 3 | Chat 链路 | 输入企业名称 → SSE 流式返回 → 结构化风险卡片 |
| 4 | Agent 链路 | 选择风控尽调 → 配置参数 → 启动执行 → WS 推送 4 阶段进度 → 查看报告 |
| 5 | Datashow 链路 | 概览面板展示指标卡片、风险分布图、行业图、预警流、AI 洞察 |
| 6 | 模块切换 | 侧边栏切换 Chat/Agent/Datashow，路由正确，布局保持 |
| 7 | Mock 模式 | `AGENT_DRIVER=mock` 时无需 Claude 即可完整运行 |

---

## 七、关键文件参考

| 文件 | 用途 |
|------|------|
| `kuaicha-ai-demo.jsx` | **设计参考** — 颜色、间距、组件结构、动画、Mock 数据 |
| `kuaicha-ai-prd.md` | **架构参考** — 文件结构 (L297-538), Agent 引擎 (L578-800), API 路由 (L826-898) |
