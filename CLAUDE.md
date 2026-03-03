# CLAUDE.md — 快查 AI 项目指引

本文件为 Claude Code 提供项目上下文，确保 AI 辅助开发时遵循正确的架构、风格和约定。

---

## 项目概述

**快查 AI** 是一个 AI-Native 企业信息平台（PC Web 应用），包含三大并列功能模块：

- **Chat**（智能对话）— 企业信息问答，SSE 流式返回，结构化风险卡片
- **Agent**（智能体工坊）— 场景化 Agent 自动执行企业数据处理任务，**核心竞争力**
- **Datashow**（数据可视化）— 企业数据可视化洞察，特色功能

当前处于 **Phase 2** 开发阶段（Phase 1 MVP 已完成）。

---

## 核心文档

- **PRD 与架构**: `kuaicha-ai-prd.md` — 完整产品需求 + 技术架构 + 文件树 + API 设计
- **实现计划**: `docs/MVP-IMPLEMENTATION-PLAN.md` — MVP 阶段详细实现步骤
- **UI 原型**: `kuaicha-ai-demo.jsx` — 全功能交互原型，所有视觉设计的权威参考

---

## 技术栈

### 前端 (`frontend/`)

| 项 | 选型 |
|----|------|
| 框架 | Next.js 14 (App Router) + React 18 + TypeScript |
| 样式 | Tailwind CSS + shadcn/ui |
| 状态管理 | Zustand |
| 可视化 | ECharts (`echarts-for-react`) |
| 路由 | Next.js App Router (文件系统路由) |

### 后端 (`backend/`)

| 项 | 选型 |
|----|------|
| 框架 | FastAPI (Python, 异步) |
| Schema | Pydantic v2 |
| Agent 引擎 | 自建（基于 Anthropic SDK） |
| 流式 | SSE (`sse-starlette`) + WebSocket |
| 数据 | MVP 阶段为内存 Mock，后续接 PostgreSQL + Redis |

---

## 项目结构

```
kuaicha_ai_native/
├── CLAUDE.md                         ← 你正在读的文件
├── kuaicha-ai-prd.md                 ← PRD + 架构文档
├── kuaicha-ai-demo.jsx               ← UI 原型参考
├── docs/
│   └── MVP-IMPLEMENTATION-PLAN.md    ← MVP 实现计划
├── .env.example                      ← 环境变量模板
│
├── frontend/                         ← Next.js 前端
│   ├── src/
│   │   ├── app/                      ← App Router 页面
│   │   │   └── workspace/            ← 工作台 (chat/ agent/ datashow/)
│   │   ├── components/               ← 组件 (ui/ layout/ chat/ agent/ datashow/ shared/)
│   │   ├── hooks/                    ← 自定义 Hooks
│   │   ├── stores/                   ← Zustand 状态
│   │   ├── services/                 ← API 调用
│   │   ├── types/                    ← TypeScript 类型
│   │   ├── lib/                      ← 工具函数
│   │   └── styles/                   ← 主题常量
│   └── ...
│
├── backend/                          ← FastAPI 后端
│   ├── app/
│   │   ├── main.py                   ← 应用入口
│   │   ├── config.py                 ← 配置管理
│   │   ├── api/                      ← API 路由 (chat, agent, datashow, ws)
│   │   ├── services/                 ← 业务逻辑
│   │   ├── agents/                   ← Agent 引擎
│   │   │   ├── base.py               ← Agent 基类
│   │   │   ├── executor.py           ← 异步执行器
│   │   │   ├── registry.py           ← 注册中心
│   │   │   ├── driver/               ← LLM 驱动 (mock/cli/api)
│   │   │   ├── workflows/            ← Agent 工作流
│   │   │   ├── prompts/              ← System Prompts
│   │   │   └── tools/                ← Agent 工具
│   │   ├── schemas/                  ← Pydantic 请求/响应
│   │   └── utils/                    ← 工具 (mock_data, logger)
│   └── ...
│
└── scripts/                          ← 开发脚本
```

---

## 开发约定

### 前端约定

1. **组件组织**: 按模块分目录 — `components/chat/`、`components/agent/`、`components/datashow/`、`components/shared/`
2. **样式**: 优先使用 Tailwind CSS class，复杂动态样式用 `style` 属性，**不使用 CSS Modules**
3. **状态**: 全局状态用 Zustand store，组件局部状态用 `useState`
4. **API 调用**: 统一通过 `services/` 层封装，使用原生 `fetch`（不用 axios）
5. **导航**: 使用 `next/navigation` 的 `usePathname()` + `Link`
6. **图标**: 使用 `components/shared/Icons.tsx` 中的自定义 SVG 组件，**不引入图标库**
7. **组件命名**: PascalCase，文件名与组件名一致
8. **暗色主题**: 所有组件默认暗色，不需要 light/dark 切换逻辑

### 后端约定

1. **路由分层**: `api/` (路由) → `services/` (业务逻辑) → `agents/` (Agent 引擎)
2. **异步**: 所有 API 和服务函数使用 `async def`
3. **Schema**: 请求和响应都用 Pydantic Model 定义在 `schemas/` 目录
4. **Agent 驱动**: 通过 `AGENT_DRIVER` 环境变量切换 mock/cli/api，代码中用 `get_driver()` 获取
5. **Mock 优先**: 所有新功能先实现 Mock 模式，确保无外部依赖即可运行
6. **命名**: 文件名 snake_case，类名 PascalCase

### 通用约定

1. **语言**: 代码和注释用英文，UI 文案用中文
2. **错误处理**: 前端显示友好中文提示，后端返回结构化错误
3. **不做过度工程**: MVP 阶段保持简单，不提前引入数据库、认证、缓存

---

## 暗色科技风主题

**必须严格遵循 `kuaicha-ai-demo.jsx` 中的视觉设计**，核心参数：

```
背景:
  root:     #06080f
  sidebar:  linear-gradient(180deg, #0a0e1a, #080c16)
  surface:  rgba(255,255,255,0.02)
  border:   rgba(255,255,255,0.06)

模块强调色:
  Chat:      #4A9EFF (蓝)
  Agent:     #A78BFA (紫)
  Datashow:  #34D399 (绿)

Logo 渐变: #E8A838 → #F06543

风险等级:
  高风险: #EF4444 (红)
  中风险: #F59E0B (黄)
  低风险: #10B981 (绿)

文本透明度层级 (白色基底):
  primary:   0.9
  secondary: 0.7
  tertiary:  0.5
  muted:     0.35
  faint:     0.25

字体: Outfit (英文) + Noto Sans SC (中文)

卡片圆角: 16px, 按钮圆角: 10px, 标签圆角: 6px

交互动效:
  - fadeIn: opacity 0→1, translateY 8→0, 0.35s ease
  - slideIn: opacity 0→1, translateX -12→0, 0.3s ease
  - card-hover: translateY(-3px) + box-shadow 0 12px 40px rgba(0,0,0,0.4)
  - 侧边栏折叠: width 过渡 0.3s cubic-bezier(0.4, 0, 0.2, 1)
```

---

## Agent 引擎架构

Agent 引擎是项目核心，遵循以下架构：

```
BaseAgent (抽象基类)
  ├── execute(input, on_progress) → AgentResult    # 核心执行方法
  └── get_config_schema() → dict                    # 参数配置定义

BaseDriver (抽象驱动接口)
  ├── MockDriver       ← 默认，预置回复，不需要 Claude
  ├── ClaudeCodeCLIDriver  ← 本地测试，subprocess 调用 claude CLI
  └── ClaudeAPIDriver  ← 生产环境，Anthropic API SDK

AgentExecutor (执行器)
  ├── 内存任务存储
  ├── asyncio 异步执行
  └── WebSocket 进度推送

AgentRegistry (注册中心)
  └── 自动注册所有 workflow Agent
```

**添加新 Agent 的步骤:**
1. 在 `agents/workflows/` 创建新文件，继承 `BaseAgent`
2. 在 `agents/prompts/` 添加 System Prompt
3. 在 `agents/registry.py` 的 `register_all_agents()` 中注册

---

## API 路由

```
# Chat
POST   /api/chat/sessions                    # 创建会话
GET    /api/chat/sessions                     # 会话列表
POST   /api/chat/sessions/{id}/messages       # 发送消息 (SSE 流式返回)
PATCH  /api/chat/sessions/{id}                # 重命名会话 (Phase 2)
DELETE /api/chat/sessions/{id}                # 删除会话 (Phase 2)

# Agent
GET    /api/agent/list                        # Agent 列表
GET    /api/agent/{id}/schema                 # 配置 Schema
POST   /api/agent/{id}/execute                # 启动执行
GET    /api/agent/tasks/{taskId}              # 任务状态
GET    /api/agent/tasks/{taskId}/result        # 任务结果
GET    /api/agent/tasks/{taskId}/export/{fmt}  # 导出 PDF/Excel (Phase 2)

# Datashow
GET    /api/datashow/overview                 # 概览数据
POST   /api/datashow/nl-query                 # 自然语言生成图表 (Phase 2)
GET    /api/datashow/graph/{company}           # 关系图谱数据 (Phase 2)
GET    /api/datashow/trends                    # 趋势对比数据 (Phase 2)

# WebSocket
WS     /ws/agent/{taskId}                     # Agent 进度推送
```

---

## 环境变量

```bash
# Agent 驱动: "mock" (默认, 无需 Claude) | "cli" (Claude Code CLI) | "api" (Anthropic API)
AGENT_DRIVER=mock

# Claude 模型 (cli/api 模式)
CLAUDE_MODEL=sonnet

# Anthropic API Key (仅 api 模式需要)
ANTHROPIC_API_KEY=

# 服务端口
BACKEND_PORT=8000
FRONTEND_PORT=3000

# 前端 → 后端 URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 常用命令

```bash
# 启动后端
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 启动前端
cd frontend && npm install && npm run dev

# 查看 API 文档
open http://localhost:8000/docs
```

---

## 注意事项

1. **不要引入额外 UI 库**（如 Ant Design、Material UI）— 使用 shadcn/ui + 自定义即可
2. **不要引入图标库**（如 lucide-react、react-icons）— 使用 `Icons.tsx` 中的自定义 SVG
3. **不要使用 axios** — 使用原生 fetch + 薄封装
4. **不要提前引入数据库** — Phase 2 继续使用内存存储 + Mock 数据
5. **所有新功能先实现 Mock 模式** — 确保 `AGENT_DRIVER=mock` 时系统完整可用
6. **视觉实现以 `kuaicha-ai-demo.jsx` 为准** — 不要自由发挥配色和布局
7. **Agent 接口保持统一** — 所有 Agent 继承 BaseAgent，所有驱动实现 BaseDriver
8. **关系图谱用 ECharts** — 使用 ECharts graph 图表类型（力导向布局），不引入 React Flow

---

## 开发路线图

### Phase 1 (MVP) — 已完成

搭建完整骨架，跑通核心链路：

- [x] 前端框架 + 三模块布局 (Chat / Agent / Datashow)
- [x] Chat: SSE 流式对话 + 结构化风险卡片
- [x] Agent: 引擎基础设施 (BaseAgent + 3 驱动 + 执行器 + 注册中心)
- [x] Agent: 企业风控尽调 Agent 完整跑通 (Mock + Claude Code CLI)
- [x] Datashow: 概览面板 (指标卡片 + 趋势图 + 行业分布 + 预警流)
- [x] 完整 Mock 数据层

### Phase 2 — 进行中

功能完整化，三模块并行扩展：

**Agent 模块扩展（核心）**
- [ ] Agent 结果 Schema 泛化（支持多类型 Agent 复用相同结果结构）
- [ ] 舆情风险简报 Agent (sentiment): 4 阶段 (舆情采集→事件聚类→简报生成→质量审核)
- [ ] 科创能力评估 Agent (tech): 4 阶段 (专利采集→技术分析→竞争力评估→报告生成)
- [ ] Agent 结果导出: PDF (reportlab) + Excel (openpyxl) 后端生成

**Chat 模块增强**
- [ ] 多轮对话上下文: 将历史消息拼入 prompt 传递给 LLM
- [ ] 会话管理: 删除/重命名会话 + 侧边栏接入实时数据 (替换硬编码)
- [ ] 跨模块跳转增强: Chat 操作按钮导航至新 Agent 和 Datashow

**Datashow 模块增强**
- [ ] NL 查询栏功能化: 自然语言 → AI 生成图表配置 → ECharts 动态渲染
- [ ] 关系图谱: ECharts graph 力导向图 (股权穿透、人物关联)
- [ ] 趋势分析: 多企业对比时序图

### Phase 3+ — 规划中

- 数据持久化: PostgreSQL + Redis
- 更多 Agent: 招采商机洞察 (bid)、商业版图分析 (map)、求职背调诊断 (job)
- 用户认证与权限 (RBAC)
- 实时预警订阅 (WebSocket 推送)
- 批量数据处理 (上传企业清单 → 批量 Agent 处理)
- 对话内嵌入可视化 (Chat 中的迷你图表)
- 地域分布热力图 + 多维对比雷达图
- Docker + CI/CD 部署

---

## Agent 清单

| Agent ID | 名称 | 状态 | 色彩 | 阶段 |
|----------|------|------|------|------|
| `risk` | 企业风控尽调 | **已上线** | #EF4444 (红) | Phase 1 |
| `sentiment` | 舆情风险简报 | 开发中 | #F97316 (橙) | Phase 2 |
| `tech` | 科创能力评估 | 开发中 | #8B5CF6 (紫) | Phase 2 |
| `bid` | 招采商机洞察 | 规划中 | #F59E0B (黄) | Phase 3 |
| `map` | 商业版图分析 | 规划中 | #06B6D4 (青) | Phase 3 |
| `job` | 求职背调诊断 | 规划中 | #EC4899 (粉) | Phase 3 |
