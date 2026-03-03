# STATUS.md — 快查 AI 接力现状

> 更新时间：2026-02-10  
> 说明：基于当前仓库代码与本地最小校验结果整理；未凭空假设。

---

## 1) 当前状态摘要

- 项目已具备 MVP 骨架并可本地启动（前后端均有可运行入口）。
- 三大模块 `Chat / Agent / Datashow` 的页面、路由与后端 API 主链路已打通到 Mock 数据层。
- 当前仍属 **MVP Phase 1**：以 Mock 数据和单 Agent 可执行为主，尚未进入生产级数据与多 Agent 真实执行阶段。

---

## 2) 已确认可运行能力（实测）

### 启动与校验
- 前端 `npm run lint` 已通过（无 ESLint 报错）。
- 后端关键文件 `py_compile` 已通过（无语法错误）。

### API 与模块
- 后端路由存在：`/api/chat/*`、`/api/agent/*`、`/api/datashow/overview`、`/ws/agent/{task_id}`、`/health`。
- Chat 使用 SSE 返回流式事件（`token/details/actions/done`）。
- Agent 任务执行器可创建任务、更新进度、推送 WebSocket。
- Datashow 可返回完整概览 Mock 数据。

### 实测细节
- 使用 FastAPI `TestClient`（在 lifespan 内）执行 `risk` Agent 可成功返回 `task_id`。
- WebSocket 首帧实测返回字段：`task_id/agent_id/status/progress/stage/message/created_at`。

---

## 3) 当前进度（按模块）

### Chat
- 进度：**MVP 可用**。
- 已实现：会话创建、会话列表、SSE 流式回复、结构化风险详情与动作按钮。
- 数据来源：`ChatService` + `mock_data`（默认）。

### Agent
- 进度：**部分可用（核心链路可跑）**。
- 已实现：Agent 列表、配置 Schema、任务启动、任务状态查询、WebSocket 推送、结果查询。
- 已实现工作流：`risk_due_diligence`（1 个真实注册 Agent）。
- 限制：列表中展示 6 个 Agent（来自 mock），但注册中心当前仅注册 `risk`，其余 ID 执行会 404。

### Datashow
- 进度：**MVP 可用**。
- 已实现：概览页、图表组件、预警流与洞察卡，后端单接口 `overview` 返回全量 mock。

### 基础设施
- `scripts/dev.sh` 可一键启动前后端。
- 配置使用 `.env.local` + `pydantic-settings`。
- CI/自动化测试：**未发现仓库内 CI 工作流与项目测试用例**。

---

## 4) 未完成 TODO（优先级）

## P0（建议最先处理）
- 对齐 Agent WebSocket 协议：前端 `useAgentWebSocket` 期望 `agent_progress/agent_complete/agent_error` 包装消息；后端当前发送扁平任务状态对象。
- 对齐 Agent 列表与可执行集合：要么仅暴露已注册 Agent，要么补齐其余 Agent workflow 注册与最小执行逻辑。
- 统一/冻结 API 契约文档：SSE 与 WS 消息格式需要明确单一标准，避免前后端隐式约定漂移。

## P1（近期）
- 补充最小自动化测试（至少覆盖 Chat SSE、Agent execute+status、Datashow overview）。
- 增加错误码与错误体规范文档（404/202/500 的前端处理策略）。
- 清理仓库运行产物策略（如将本地 `venv/node_modules/.next` 保持为开发本地，不纳入版本管理）。

## P2（后续）
- Phase 2 能力：真实企业数据接入、数据库/缓存、更多 Agent 工作流。
- 导出能力、实时预警推送增强、权限体系（按 PRD 规划）。

---

## 5) 已知问题 / 失败项

- **协议不一致（高优）**：
  - 后端 WS 当前发送：`{task_id, agent_id, status, progress, stage, message, created_at}`。
  - 前端 WS 当前按 `msg.type` 分支处理（`agent_progress/agent_complete/agent_error`）。
  - 结果：前端实时进度与完成态可能无法按预期更新。

- **Agent 列表与执行能力不一致（高优）**：
  - `GET /api/agent/list` 在 Mock 模式下返回 6 个 Agent。
  - `POST /api/agent/{id}/execute` 实际依赖 `registry`，当前只注册 `risk`。
  - 实测：执行 `sentiment` 返回 404 `Agent not found`。

- **无现成测试框架与 CI（信息缺口）**：
  - 当前未发现项目自有测试文件（排除三方依赖目录）。
  - 未发现 `.github/workflows` 或同等 CI 配置。

---

## 6) 关键入口文件

### 启动与配置
- `scripts/dev.sh`（一键启动）
- `backend/app/main.py`（FastAPI 入口）
- `backend/app/config.py`（环境配置）
- `frontend/package.json`（前端脚本）

### 后端核心
- `backend/app/api/chat.py`
- `backend/app/api/agent.py`
- `backend/app/api/datashow.py`
- `backend/app/api/ws.py`
- `backend/app/services/chat_service.py`
- `backend/app/services/agent_service.py`
- `backend/app/agents/executor.py`
- `backend/app/agents/registry.py`
- `backend/app/agents/workflows/risk_due_diligence.py`
- `backend/app/utils/mock_data.py`

### 前端核心
- `frontend/src/app/workspace/chat/page.tsx`
- `frontend/src/app/workspace/agent/page.tsx`
- `frontend/src/app/workspace/agent/[agentId]/page.tsx`
- `frontend/src/app/workspace/datashow/page.tsx`
- `frontend/src/stores/chatStore.ts`
- `frontend/src/stores/agentStore.ts`
- `frontend/src/hooks/useAgentWebSocket.ts`
- `frontend/src/services/api.ts`

---

## 7) 本地复现（最小路径）

1. 配置环境：确认根目录存在 `.env.local`（可参考 `.env.example`）。
2. 一键启动：`bash scripts/dev.sh`。
3. 前端访问：`http://localhost:3000`（应重定向到 `/workspace/chat`）。
4. 后端健康：`http://localhost:8000/health`。
5. API 文档：`http://localhost:8000/docs`。
6. 最小功能验证：
   - Chat 发送问题，观察流式回复。
   - Agent 选择 `risk` 执行，观察进度/结果页。
   - Datashow 查看概览卡片与图表。

---

## 8) 下一步最小计划（建议 5 步）

1. 先统一 Agent WebSocket 消息协议（后端或前端二选一对齐）。
2. 决策 Agent 列表来源：仅 registry 或 mock+registry 融合，并修复 404 体验。
3. 固化 API 契约文档（至少覆盖 Chat SSE 与 Agent WS）。
4. 增加 3 个最小后端接口测试（chat/agent/datashow）。
5. 在文档中补齐“当前可执行 Agent 列表 + 已知限制”。

---

## 9) 未知 / 需要确认

- 未知：团队是否已有外部 CI（如私有平台）但未放在本仓库。
- 未知：`CLAUDE.md` 中“禁止引入图标库”与当前 `frontend/package.json` 的 `lucide-react` 依赖是否属于可接受历史遗留。
- 未知：多 Agent（sentiment/bid/tech/map/job）在 MVP 内是否要求“可执行”还是“仅展示占位”。

### 建议你补充的最小信息清单
- 1) MVP 里 Agent 的“展示/可执行”最终口径（尤其 6 个 Agent 的预期）。
- 2) Agent WebSocket 协议最终规范（是否采用 typed envelope）。
- 3) 期望的最小测试门槛（仅 lint + smoke，或需引入 pytest）。
- 4) 是否存在仓库外 CI/部署流水线链接。

