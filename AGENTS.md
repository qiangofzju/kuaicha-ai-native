# AGENTS.md — 快查 AI 统一协作规范（对外生效）

> 适用范围：仓库根目录及其所有子目录。  
> 生效优先级：当本文件与 `CLAUDE.md` 有表述差异时，以本文件为对外统一标准；`CLAUDE.md` 仍作为背景资料。  
> 当前阶段：MVP / Phase 1（2026-02）。

---

## 1) 项目目标与阶段边界

### 项目目标
- 构建 AI-Native 企业信息平台（PC Web），包含三大模块：`Chat`、`Agent`、`Datashow`。
- 以 `Agent`（智能体工坊）作为核心竞争力，优先保证可演示、可联调、可扩展。

### MVP 边界（必须遵守）
- 禁止无需求的大重构（跨模块大搬迁、整体架构替换、一次性重写）。
- 禁止提前引入数据库/认证/缓存等 Phase 2+ 能力（MVP 以内存 + Mock 为主）。
- 禁止为“未来可能”做过度工程。
- 所有新增能力优先保证 `AGENT_DRIVER=mock` 可完整运行。

---

## 2) 从 `CLAUDE.md` 吸收的硬性约束（完整继承）

以下规则为硬约束：

### 前端
- 组件按模块分目录：`components/chat|agent|datashow|shared|layout|ui`。
- 样式优先 Tailwind；不使用 CSS Modules。
- 全局状态用 Zustand，局部状态用 React State。
- API 统一走 `services/`，HTTP 客户端使用原生 `fetch`（禁止 `axios`）。
- 导航使用 Next App Router（`next/navigation` + `Link`）。
- 默认暗色主题，不实现 light/dark 切换。
- 组件命名 PascalCase，文件名与组件名一致。

### 后端
- 分层：`api -> services -> agents`。
- API/服务函数使用 `async def`。
- 请求/响应模型统一在 `schemas/`。
- Agent 驱动通过 `AGENT_DRIVER`（`mock|cli|api`）切换，统一使用 `get_driver()`。
- 新功能先落地 Mock 路径，保证无外部依赖可运行。
- Python 文件 snake_case，类名 PascalCase。

### 通用
- 代码与注释英文；UI 文案中文。
- 错误处理：前端给用户友好中文提示，后端返回结构化错误。
- 视觉实现以 `kuaicha-ai-demo.jsx` 为准，禁止随意改色系/布局风格。

### 明确禁止
- 不引入额外 UI 库（如 Ant Design、Material UI）。
- 不引入新的图标库（保持现有自定义图标体系，不新增外部图标依赖使用）。
- 不使用 `axios`。
- 不提前引入数据库方案替代当前 Mock 主链路。

---

## 3) 相对 `CLAUDE.md` 的补充与差异

本文件新增了可执行协作规则（`CLAUDE.md` 未显式给出或不够可执行）：
- 增加“改动粒度”要求：默认小步修改，单次 PR 聚焦单一目标。
- 增加“验证门槛”要求：提交前必须完成最小本地验证（见第 8 节）。
- 增加“审计/溯源”要求：对 Agent、Prompt、数据口径变更必须记录变更依据（见第 9 节）。
- 增加“仓库卫生”要求：禁止编辑生成物与第三方目录（见第 6 节）。

---

## 4) 目录导航（高频入口）

### 根目录
- `kuaicha-ai-prd.md`：PRD + 架构总说明。
- `kuaicha-ai-demo.jsx`：视觉与交互权威参考。
- `docs/MVP-IMPLEMENTATION-PLAN.md`：MVP 分阶段计划。
- `scripts/dev.sh`：一键启动前后端。

### 前端（`frontend/`）
- 页面入口：`src/app/`
- 模块页面：`src/app/workspace/chat|agent|datashow`
- 组件：`src/components/`
- 状态：`src/stores/`
- API 调用：`src/services/`
- 类型：`src/types/`

### 后端（`backend/`）
- 入口：`app/main.py`
- 路由：`app/api/`
- 业务服务：`app/services/`
- Agent 引擎：`app/agents/`
- Schema：`app/schemas/`
- Mock 与日志：`app/utils/`

---

## 5) 开发与启动命令

### 一键启动（推荐）
```bash
bash scripts/dev.sh
```

### 手动启动
```bash
# backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# frontend
cd frontend
npm install
npm run dev
```

### 常用验证命令
```bash
# 前端静态检查
cd frontend && npm run lint

# 后端最小语法检查
cd backend && python3 -m py_compile app/main.py app/api/chat.py app/api/agent.py app/api/datashow.py app/api/ws.py
```

---

## 6) 改动边界与仓库卫生

### 允许改动
- 业务源码、配置、文档、脚本（与当前任务直接相关）。

### 默认禁止改动
- `backend/venv/`
- `frontend/node_modules/`
- `frontend/.next/`
- `frontend/.git/`
- 任何本次任务无关的大体量格式化/批量重命名

### 风险动作
- 删除文件、重命名核心目录、修改 API 协议：必须在 PR 描述中写明影响面与回滚方案。

---

## 7) 编码与提交规范（可执行）

### 编码规范
- 仅做与任务直接相关的最小改动。
- 保持现有分层边界，不跨层写业务逻辑。
- 新增 API 必须同步更新 `schemas/` 与前端 `types/`。
- 涉及 Agent：遵循 `BaseAgent` / `BaseDriver` 统一接口。

### 提交/PR 规范
- 标题建议：`feat|fix|chore(scope): summary`。
- PR 描述至少包含：
  - 变更动机
  - 变更文件清单
  - 验证结果
  - 风险点与回滚方式
- 文档与代码同改：涉及接口、流程、运行命令变化时必须更新文档。

---

## 8) 合并前最小验证清单

至少完成以下 4 项：
- `frontend`：`npm run lint` 通过。
- `backend`：关键文件 `py_compile` 通过。
- 启动链路：`/health` 返回 `status=ok`。
- 关键功能冒烟（按改动选择）：
  - Chat：`POST /api/chat/sessions/{id}/messages` 可流式返回。
  - Agent：执行后可查询 `/api/agent/tasks/{task_id}`。
  - Datashow：`GET /api/datashow/overview` 返回结构化数据。

若仓库暂无自动化测试，不强行新增测试框架；但必须在 PR 中写明“已执行的手工验证步骤”。

---

## 9) ToB / 数据产品审计与溯源要求

该项目属于企业信息/风控场景，变更需可追踪：
- **Agent 规则变更**：记录变更的 `workflow`、`prompt`、参数含义。
- **数据口径变更**：记录影响字段、样例输入输出、是否影响历史对比。
- **模型/驱动变更**：记录 `AGENT_DRIVER`、模型名、关键参数变化。
- **接口协议变更**：记录请求/响应字段 diff，并同步前后端类型。

建议在 PR 描述增加“溯源块”：
```text
Trace:
- Requirement/Issue:
- Affected APIs/Schemas:
- Prompt/Model changes:
- Validation evidence:
```

---

## 10) 协作默认策略

- 不确定需求时先最小实现，保留扩展点，不做超前设计。
- 发现文档与代码不一致时：先在 `STATUS.md` 标注，再提交修复建议。
- 对外统一口径：以本 `AGENTS.md` 为准；`CLAUDE.md` 作为历史上下文参考。

