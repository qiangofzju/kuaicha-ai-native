# Skills 广场 vs Agent 广场：后端架构与配置修改指南（2026-03-04）

## 1. 先回答你的核心疑问

你现在的感受是对的：**前端呈现形式很像，执行体验也很像**。  
这是因为当前实现是“**Skills 作为 Agent 引擎之上的产品化门面（facade）**”，不是一套完全独立的执行内核。

结论：
- `Agent`：执行引擎的直接入口（工作流本体）。
- `Skills`：商店化/资产化/可运营化入口（对 Agent 的包装层）。
- 所以“看起来像”是刻意设计；**底层差异主要在配置治理、可运营字段、执行白名单、协议前缀与技能资产目录**。

---

## 2. 两者在后端分层的真实区别

## 2.1 API 层（入口协议不同）

Agent API：
- `backend/app/api/agent.py`
- 路由前缀：`/api/agent/*`
- 典型接口：`/list`、`/{agent_id}/schema`、`/{agent_id}/execute`

Skills API：
- `backend/app/api/skill.py`
- 路由前缀：`/api/skills/*`
- 在 Agent 能力之上新增了“商店运营接口”：
  - `/store`
  - `/mine`
  - `/purchase-records`
  - `/create`（当前 mock）

关键差异：  
Skills 除了执行，还承担“商店信息组织与运营状态”。

---

## 2.2 Service 层（Skills 是 Facade，Agent 是 Core）

Agent Service（核心执行服务）：
- `backend/app/services/agent_service.py`
- 直接从 `registry` 取 agent 实例并执行
- 执行入口：`execute_agent(agent_id, target, params)`

Skills Service（包装层）：
- `backend/app/services/skill_service.py`
- 关键能力：
  - `skill_id -> agent_id` 映射（`_skill_to_agent`）
  - 执行白名单（`_executable_skills`，当前仅 `batch`）
  - 将 `agent_*` 字段重写为 `skill_*` 字段
  - 提供技能商店数据（调用 `mock_skills`）

关键差异：  
Skills 不复制执行逻辑，而是做“路由、治理、包装”。

---

## 2.3 执行层（同一套引擎）

执行注册中心：
- `backend/app/agents/registry.py`

批量处理工作流（真实逻辑）：
- `backend/app/agents/workflows/batch_processing.py`

这说明：  
**当前 skills 的 batch 执行，底层就是同一个 `BatchProcessingAgent`**，并继续走 Claude Code -> SQL 生成/执行 -> 交付。

---

## 2.4 WebSocket 协议层（消息前缀不同）

文件：
- `backend/app/api/ws.py`

现状：
- `/ws/agent/{task_id}` 输出 `agent_*`
- `/ws/skills/{task_id}` 输出 `skill_*`

消息体本质复用同一任务源（executor），但前缀不同，便于前端模块隔离。

---

## 2.5 数据模型层（skills 多了运营字段）

Agent schema：
- `backend/app/schemas/agent.py`

Skills schema：
- `backend/app/schemas/skill.py`

Skills 比 Agent 多的典型字段：
- `author`
- `price_type`
- `owned`
- `cover`
- `market_status`
- `SkillStoreSection`
- `PurchaseRecord`

这部分正是“技能广场”而非“智能体工坊”的产品差异。

---

## 2.6 资产治理层（skills 新增）

技能资产目录（你特别关心的轻量化入口）：
- `backend/app/skills_assets/batch-data-processing/`
  - `SKILL.md`
  - `references/skill-contract.md`
  - `references/ui-trace-guideline.md`
  - `scripts/validate_skill_contract.py`
  - `scripts/smoke_batch_skill.py`

这在 Agent 模块里没有对应“商店化技能资产”结构。  
它是后续做插件化、规范化、审计化的关键支点。

---

## 3. 为什么你会觉得“二者底层几乎一样”

因为当前是 MVP 的“低风险复用策略”：
- 执行内核复用（同 workflow、同 executor、同 driver）
- 仅在门面层做 skills 化（字段、API、WS 前缀、商店数据）

好处：
- 开发快、风险低、链路稳定
- 你要求的“一比一复刻”可以快速交付

代价：
- 看起来差异不明显
- 技能独立配置能力还不够强（现在主要靠映射）

---

## 4. 如果你要改某个 skill，能不能快速改？

可以，且分三种改法，速度不同。

## 4.1 只改“展示与运营信息”（最快，5-15 分钟）

改这些文件：
- 后端主数据：`backend/app/utils/mock_skills.py`
- 前端兜底展示：`frontend/src/styles/theme.ts`（`theme.skills`）

适用：
- 改名称、描述、标签、作者、封面、是否已拥有、是否即将上线

注意：
- 当前存在“后端 + 前端 fallback”双份定义，建议改两处避免不一致。

---

## 4.2 改“是否可执行/映射到哪个执行器”（快，10-20 分钟）

改这些文件：
- `backend/app/services/skill_service.py`
  - `_skill_to_agent`：映射哪个 agent/workflow
  - `_executable_skills`：控制是否开放执行

示例：
- 让 `risk` 技能可执行：把 `"risk"` 加入 `_executable_skills`
- 把某 skill 重定向到另一个 workflow：调整 `_skill_to_agent`

---

## 4.3 改“技能执行参数或业务逻辑”（中等，30-120 分钟）

改这些文件：
- 参数表单 schema：对应 workflow 的 `get_config_schema()`  
  例如 `backend/app/agents/workflows/batch_processing.py`
- 执行逻辑：同 workflow 的 `execute/_execute_live/_execute_mock`
- 提示词与路由策略：`backend/app/agents/prompts/*`
- 技能资产文档：`backend/app/skills_assets/...`

关键点：
- 当前 skills schema 来自 agent schema 的映射（`skill_service.get_skill_config`）
- 所以你改“skill 的执行配置”，本质是在改对应 agent workflow 的配置函数

---

## 5. 快速改技能的推荐操作流程（实操版）

以“把 risk skill 从即将上线改成可执行”为例：

1. 改商店状态
- `backend/app/utils/mock_skills.py`
  - `risk.market_status: "coming" -> "ready"`
  - `risk.status: "coming" -> "ready"`

2. 开放执行
- `backend/app/services/skill_service.py`
  - `_executable_skills` 加入 `"risk"`

3. 校验 schema 是否存在
- 确认 `registry` 中已注册 `risk` workflow（已注册）
- 确认该 workflow 的 `get_config_schema()` 可用

4. 前端兜底同步（建议）
- `frontend/src/styles/theme.ts` 的 `theme.skills` 对应项改成 ready

5. 验证
- `GET /api/skills/risk/schema`
- `POST /api/skills/risk/execute`
- `GET /ws/skills/{task_id}` 看 `skill_*` 消息

---

## 6. 你现在最关心的“轻量化、优雅、可插拔”现状评估

现状评分（基于当前代码）：
- 轻量化：8/10（大量复用 agent 引擎）
- 可交付稳定性：8.5/10（少重复逻辑）
- 可插拔：6/10（有映射与白名单，但配置源仍偏分散）

主要瓶颈：
- skill 元数据存在双源（后端 mock + 前端 theme fallback）
- “skill 专属配置”还没有完全独立于 agent workflow

---

## 7. 建议的下一步（不大改架构前提）

如果要继续保持 MVP 节奏且提升可插拔，建议按优先级做这 3 件事：

1. 单一数据源（高优先）
- 让前端只消费 `/api/skills/*`，移除 `theme.skills` 业务兜底数据

2. skill manifest 化（高优先）
- 在 `backend/app/skills_assets/<skill>/manifest.json` 声明：
  - 基础元数据
  - 执行映射
  - 是否可执行
  - 默认表单字段策略

3. 解耦“skill 配置”与“agent 配置”（中优先）
- 允许 skill 覆盖部分 schema 字段（不必完全继承 agent）
- 保留执行复用，但配置可独立演进

---

## 8. 一句话总结

你现在的 skills 不是“另一套 agent 引擎”，而是“**可运营的能力门面层**”。  
要改技能，当前已经可以快速改（尤其是元数据与开关）；  
若要达到你说的“更轻量、更优雅、更可插拔”，下一步关键是把 skill 元数据与配置做成单一 manifest 源。

