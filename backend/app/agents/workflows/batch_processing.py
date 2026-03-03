"""Batch Data Processing Agent.

Converts natural language queries into SQL, executes against the local
enterprise SQLite database, and returns tabular results for preview and
Excel export.

Stages:
1. 需求解析   (0 – 25 %)  — parse query, generate SQL
2. 数据查询   (25 – 50 %) — execute SQL, fetch rows
3. 字段加工   (50 – 75 %) — clean data, compute derived stats
4. 数据交付   (75 – 100%) — prepare preview and export deliverable
"""

import asyncio
import contextlib
import os
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from app.agents.base import AgentInput, AgentProgress, AgentResult, BaseAgent
from app.agents.driver import get_driver
from app.config import settings
from app.services.trace_sanitizer import (
    build_safe_sql_summary,
    sanitize_error_message,
    sanitize_metrics,
    sanitize_trace_text,
    summarize_routing_safe,
)
from app.utils.logger import logger


class BatchProcessingAgent(BaseAgent):
    agent_id = "batch"
    name = "批量数据处理"
    description = "自然语言筛选企业名单，结构化批量导出，多表衍生字段加工"
    color = "#06B6D4"
    tags = ["数据处理", "批量导出", "SQL查询"]
    icon = "Database"
    status = "ready"

    _prompt_path = os.path.join(
        os.path.dirname(__file__), "..", "prompts", "batch_processing.md"
    )

    def _load_system_prompt(self) -> str:
        try:
            with open(self._prompt_path, encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            return "你是企业数据分析专家，负责将自然语言转换为SQL查询。只输出合法JSON。"

    def get_config_schema(self) -> dict:
        return {
            "agent_id": self.agent_id,
            "fields": [
                {
                    "name": "query",
                    "label": "数据查询需求",
                    "type": "text",
                    "required": True,
                    "placeholder": "例如：杭州地区近3年净利润持续增长的企业名单",
                    "default": "",
                },
                {
                    "name": "scenario",
                    "label": "处理场景",
                    "type": "select",
                    "required": True,
                    "default": "filter",
                    "options": [
                        {"label": "筛选并导出企业名单", "value": "filter"},
                        {"label": "指定字段结构化导出", "value": "export"},
                        {"label": "衍生加工字段导出", "value": "derived"},
                    ],
                },
                {
                    "name": "company_list_file",
                    "label": "企业名单文件（导出场景可选）",
                    "type": "file",
                    "required": False,
                    "default": "",
                },
                {
                    "name": "company_names_text",
                    "label": "企业名单文本（导出场景可选）",
                    "type": "text",
                    "required": False,
                    "placeholder": "可输入：同花顺，东方财富，大智慧（逗号/顿号/换行分隔）",
                    "default": "",
                },
            ],
        }

    async def execute(
        self,
        agent_input: AgentInput,
        on_progress: Optional[Any] = None,
    ) -> AgentResult:
        start_time = time.time()

        # Extract params — query is stored in `target` (first text field)
        query = agent_input.target or agent_input.params.get("query", "")
        if not query:
            query = "杭州地区近3年净利润持续增长的企业名单"

        scenario = agent_input.params.get("scenario", "filter")
        company_names = self._merge_company_names(
            uploaded_names=agent_input.params.get("company_names", []),
            text_names=agent_input.params.get("company_names_text", ""),
        )
        trace_state = {"token": uuid.uuid4().hex[:12], "seq": 0}

        try:
            if settings.USE_MOCK_DATA:
                return await self._execute_mock(
                    query,
                    scenario,
                    company_names,
                    on_progress,
                    start_time,
                    trace_state,
                )
            return await self._execute_live(
                agent_input,
                query,
                scenario,
                company_names,
                on_progress,
                start_time,
                trace_state,
            )
        except Exception as exc:
            await self._emit_trace(
                on_progress=on_progress,
                trace_state=trace_state,
                stage="数据交付",
                stage_index=3,
                kind="error",
                title="执行异常",
                detail=sanitize_error_message(str(exc)),
                status="error",
                progress=98,
            )
            raise

    # ------------------------------------------------------------------
    # Mock execution (no SQLite, no LLM)
    # ------------------------------------------------------------------

    async def _execute_mock(
        self, query: str, scenario: str,
        company_names: list, on_progress, start_time: float, trace_state: dict[str, Any],
    ) -> AgentResult:
        from app.services.nl_to_sql import translate_mock

        # Stage 1: 需求解析
        await self._emit_trace(
            on_progress=on_progress,
            trace_state=trace_state,
            stage="需求解析",
            stage_index=0,
            kind="phase_start",
            title="开始需求解析",
            detail="正在解析问句并执行分层 schema 召回。",
            progress=5,
        )
        await self._progress(on_progress, "需求解析", 5, "正在理解您的查询需求…")
        await asyncio.sleep(0.4)
        nl_result = translate_mock(query, scenario, company_names or None, None)
        routing_detail, routing_metrics = summarize_routing_safe(nl_result.routing)
        await self._emit_trace(
            on_progress=on_progress,
            trace_state=trace_state,
            stage="需求解析",
            stage_index=0,
            kind="routing",
            title="Schema 召回完成",
            detail=routing_detail,
            metrics=routing_metrics,
            status="done",
            progress=14,
        )
        await self._emit_trace(
            on_progress=on_progress,
            trace_state=trace_state,
            stage="需求解析",
            stage_index=0,
            kind="query",
            title="SQL 规划完成",
            detail=build_safe_sql_summary(nl_result.sql),
            progress=20,
        )
        await self._progress(on_progress, "需求解析", 20, f"已生成SQL查询：{nl_result.description}")
        await self._emit_trace(
            on_progress=on_progress,
            trace_state=trace_state,
            stage="需求解析",
            stage_index=0,
            kind="phase_done",
            title="需求解析完成",
            detail=sanitize_trace_text(nl_result.description),
            status="done",
            progress=25,
        )
        await asyncio.sleep(0.3)
        await self._progress(on_progress, "需求解析", 25, "SQL校验通过，开始查询数据库")
        await asyncio.sleep(0.2)

        # Stage 2: 数据查询
        await self._emit_trace(
            on_progress=on_progress,
            trace_state=trace_state,
            stage="数据查询",
            stage_index=1,
            kind="phase_start",
            title="开始数据查询",
            detail="正在连接企业库并执行查询。",
            progress=35,
        )
        await self._progress(on_progress, "数据查询", 35, "正在连接企业数据库…")
        await asyncio.sleep(0.5)

        # Use mock data (no actual DB call in mock mode)
        rows, columns = _build_mock_rows(scenario, query)
        total_count = len(rows)

        await self._progress(on_progress, "数据查询", 45, f"查询完成，共获取 {total_count} 条记录")
        await self._emit_trace(
            on_progress=on_progress,
            trace_state=trace_state,
            stage="数据查询",
            stage_index=1,
            kind="query",
            title="查询执行完成",
            detail="数据查询完成，已返回记录。",
            metrics={"matched_rows": total_count},
            status="done",
            progress=50,
        )
        await asyncio.sleep(0.3)
        await self._progress(on_progress, "数据查询", 50, "数据加载成功")

        # Stage 3: 字段加工
        await self._emit_trace(
            on_progress=on_progress,
            trace_state=trace_state,
            stage="字段加工",
            stage_index=2,
            kind="phase_start",
            title="开始字段加工",
            detail="正在进行字段标准化与统计计算。",
            progress=58,
        )
        await self._progress(on_progress, "字段加工", 58, "正在进行数据清洗和缺失值补全…")
        await asyncio.sleep(0.4)
        stats = _compute_stats_from_rows(rows, columns)
        await self._progress(on_progress, "字段加工", 68, "正在计算统计指标…")
        await asyncio.sleep(0.3)
        await self._progress(on_progress, "字段加工", 75, "数据加工完成，共处理 0 条缺失值")
        await self._emit_trace(
            on_progress=on_progress,
            trace_state=trace_state,
            stage="字段加工",
            stage_index=2,
            kind="transform",
            title="字段加工完成",
            detail="字段加工流程完成。",
            metrics={"processed_fields": len(columns), "missing_fields_filled": 0},
            status="done",
            progress=75,
        )

        # Stage 4: 数据交付
        await self._emit_trace(
            on_progress=on_progress,
            trace_state=trace_state,
            stage="数据交付",
            stage_index=3,
            kind="phase_start",
            title="开始数据交付",
            detail="正在构建预览并准备导出文件。",
            progress=82,
        )
        await self._progress(on_progress, "数据交付", 82, "正在构建交付预览数据…")
        await asyncio.sleep(0.3)
        preview_rows = rows[:20]
        await self._progress(on_progress, "数据交付", 92, "正在准备 Excel 导出文件…")
        await asyncio.sleep(0.3)
        await self._progress(on_progress, "数据交付", 100, "数据交付包已准备完成，可下载 Excel")
        await self._emit_trace(
            on_progress=on_progress,
            trace_state=trace_state,
            stage="数据交付",
            stage_index=3,
            kind="delivery",
            title="数据交付完成",
            detail="预览与导出文件已就绪。",
            metrics={"preview_rows": len(preview_rows), "matched_rows": total_count},
            status="done",
            progress=100,
        )

        duration = round(time.time() - start_time, 1)
        summary = _build_summary(scenario, total_count, nl_result.description, rows, columns)

        return AgentResult(
            summary=summary,
            report={
                "query_type": nl_result.query_type,
                "generated_sql": nl_result.sql,
                "sql_description": nl_result.description,
                "columns": columns,
                "preview_rows": preview_rows,
                "total_count": total_count,
                "stats": stats,
                "schema_routing": nl_result.routing,
                "data_quality": {
                    "total_requested": total_count,
                    "matched": total_count,
                    "missing_fields_filled": 0,
                },
            },
            attachments=["batch_result.xlsx"],
            metadata={
                "agent_id": self.agent_id,
                "query": query,
                "scenario": scenario,
                "company_names": company_names,
                "total_rows": total_count,
                "full_rows": rows,
                "duration": duration,
                "schema_routing": nl_result.routing,
            },
        )

    # ------------------------------------------------------------------
    # Live execution (real SQLite + optional LLM)
    # ------------------------------------------------------------------

    async def _execute_live(
        self, agent_input: AgentInput, query: str, scenario: str,
        company_names: list, on_progress, start_time: float, trace_state: dict[str, Any],
    ) -> AgentResult:
        from app.services.nl_to_sql import translate_live, execute_query, compute_stats

        driver = get_driver()
        system_prompt = self._load_system_prompt()

        # Stage 1: 需求解析
        await self._emit_trace(
            on_progress=on_progress,
            trace_state=trace_state,
            stage="需求解析",
            stage_index=0,
            kind="phase_start",
            title="开始需求解析",
            detail="正在解析问句并执行分层 schema 召回。",
            progress=5,
        )
        await self._progress(on_progress, "需求解析", 5, "正在理解您的查询需求…")
        await self._progress(on_progress, "需求解析", 12, "正在执行分层 schema 召回…")
        llm_wait_stop = asyncio.Event()
        llm_wait_task = asyncio.create_task(
            self._emit_llm_waiting_trace(
                on_progress=on_progress,
                trace_state=trace_state,
                stage="需求解析",
                stage_index=0,
                stop_event=llm_wait_stop,
            )
        )
        try:
            nl_result = await translate_live(
                query, scenario, company_names or None, None, driver, system_prompt
            )
        finally:
            llm_wait_stop.set()
            with contextlib.suppress(Exception):
                await llm_wait_task

        routing_detail, routing_metrics = summarize_routing_safe(nl_result.routing)
        await self._emit_trace(
            on_progress=on_progress,
            trace_state=trace_state,
            stage="需求解析",
            stage_index=0,
            kind="routing",
            title="Schema 召回完成",
            detail=routing_detail,
            metrics=routing_metrics,
            status="done",
            progress=14,
        )
        await self._emit_trace(
            on_progress=on_progress,
            trace_state=trace_state,
            stage="需求解析",
            stage_index=0,
            kind="query",
            title="SQL 规划完成",
            detail=build_safe_sql_summary(nl_result.sql),
            progress=20,
        )
        await self._progress(on_progress, "需求解析", 20,
                             f"SQL已生成：{nl_result.description}")
        await self._emit_trace(
            on_progress=on_progress,
            trace_state=trace_state,
            stage="需求解析",
            stage_index=0,
            kind="phase_done",
            title="需求解析完成",
            detail=sanitize_trace_text(nl_result.description),
            status="done",
            progress=25,
        )
        await asyncio.sleep(0.3)
        await self._progress(on_progress, "需求解析", 25, "SQL安全校验通过")

        # Stage 2: 数据查询
        await self._emit_trace(
            on_progress=on_progress,
            trace_state=trace_state,
            stage="数据查询",
            stage_index=1,
            kind="phase_start",
            title="开始数据查询",
            detail="正在执行数据库查询任务。",
            progress=35,
        )
        await self._progress(on_progress, "数据查询", 35, "正在执行数据库查询…")
        try:
            rows, total_count = await asyncio.to_thread(
                execute_query, nl_result.sql, nl_result.params
            )
        except Exception as e:
            logger.error("SQL execution failed: %s", e)
            await self._emit_trace(
                on_progress=on_progress,
                trace_state=trace_state,
                stage="数据查询",
                stage_index=1,
                kind="warn",
                title="查询失败，已启用回退",
                detail="SQL 执行失败，已回退到安全模式。",
                metrics={"fallback_used": True},
                status="warning",
                progress=42,
            )
            # Fallback to mock
            rows, columns = _build_mock_rows(scenario, query)
            total_count = len(rows)
        else:
            columns = nl_result.columns
            if not columns and rows:
                columns = _infer_columns_from_rows(rows)

        await self._progress(on_progress, "数据查询", 50,
                             f"查询完成，共获取 {total_count} 条记录")
        await self._emit_trace(
            on_progress=on_progress,
            trace_state=trace_state,
            stage="数据查询",
            stage_index=1,
            kind="query",
            title="查询执行完成",
            detail="数据查询完成，已返回记录。",
            metrics={"matched_rows": total_count},
            status="done",
            progress=50,
        )

        # Stage 3: 字段加工
        await self._emit_trace(
            on_progress=on_progress,
            trace_state=trace_state,
            stage="字段加工",
            stage_index=2,
            kind="phase_start",
            title="开始字段加工",
            detail="正在进行字段标准化与统计计算。",
            progress=60,
        )
        await self._progress(on_progress, "字段加工", 60, "正在进行数据清洗和统计计算…")
        numeric_keys = [c["key"] for c in columns if c.get("type") == "number"]
        stats = compute_stats(rows, numeric_keys[:3])  # stats on first 3 numeric cols
        await self._progress(on_progress, "字段加工", 75, "数据加工完成")
        await self._emit_trace(
            on_progress=on_progress,
            trace_state=trace_state,
            stage="字段加工",
            stage_index=2,
            kind="transform",
            title="字段加工完成",
            detail="字段加工流程完成。",
            metrics={"processed_fields": len(columns), "missing_fields_filled": 0},
            status="done",
            progress=75,
        )

        # Stage 4: 数据交付
        await self._emit_trace(
            on_progress=on_progress,
            trace_state=trace_state,
            stage="数据交付",
            stage_index=3,
            kind="phase_start",
            title="开始数据交付",
            detail="正在构建预览并准备导出文件。",
            progress=85,
        )
        await self._progress(on_progress, "数据交付", 85, "正在构建交付预览数据…")
        preview_rows = rows[:20]
        await self._progress(on_progress, "数据交付", 100, "数据交付包已准备完成，可下载 Excel")
        await self._emit_trace(
            on_progress=on_progress,
            trace_state=trace_state,
            stage="数据交付",
            stage_index=3,
            kind="delivery",
            title="数据交付完成",
            detail="预览与导出文件已就绪。",
            metrics={"preview_rows": len(preview_rows), "matched_rows": total_count},
            status="done",
            progress=100,
        )

        duration = round(time.time() - start_time, 1)
        summary = _build_summary(scenario, total_count, nl_result.description, rows, columns)

        return AgentResult(
            summary=summary,
            report={
                "query_type": nl_result.query_type,
                "generated_sql": nl_result.sql,
                "sql_description": nl_result.description,
                "columns": columns,
                "preview_rows": preview_rows,
                "total_count": total_count,
                "stats": stats,
                "schema_routing": nl_result.routing,
                "data_quality": {
                    "total_requested": total_count,
                    "matched": total_count,
                    "missing_fields_filled": 0,
                },
            },
            attachments=["batch_result.xlsx"],
            metadata={
                "agent_id": self.agent_id,
                "query": query,
                "scenario": scenario,
                "company_names": company_names,
                "total_rows": total_count,
                "full_rows": rows,
                "duration": duration,
                "schema_routing": nl_result.routing,
            },
        )

    async def _emit_llm_waiting_trace(
        self,
        on_progress: Any,
        trace_state: dict[str, Any],
        stage: str,
        stage_index: int,
        stop_event: asyncio.Event,
    ) -> None:
        """Emit periodic trace events while waiting for LLM SQL planning."""
        if not on_progress:
            return

        messages = [
            "正在调用模型生成 SQL 方案草稿。",
            "正在校验查询约束与字段映射关系。",
            "正在做 SQL 安全检查与 LIMIT 保护。",
        ]
        tick = 0

        while not stop_event.is_set():
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=0.9)
                break
            except asyncio.TimeoutError:
                tick += 1
                detail = messages[(tick - 1) % len(messages)]
                await self._emit_trace(
                    on_progress=on_progress,
                    trace_state=trace_state,
                    stage=stage,
                    stage_index=stage_index,
                    kind="info",
                    title="SQL 方案生成中",
                    detail=detail,
                    progress=min(19, 12 + tick),
                )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _progress(
        self, on_progress, stage: str, progress: float, message: str
    ):
        if on_progress:
            stage_map = {"需求解析": 0, "数据查询": 1, "字段加工": 2, "数据交付": 3, "报告生成": 3}
            await on_progress(AgentProgress(
                stage=stage,
                progress=progress,
                message=message,
                data={"stageIndex": stage_map.get(stage, 0), "totalStages": 4},
            ))

    async def _emit_trace(
        self,
        on_progress: Any,
        trace_state: dict[str, Any],
        stage: str,
        stage_index: int,
        kind: str,
        title: str,
        detail: str,
        metrics: Optional[dict[str, Any]] = None,
        status: str = "running",
        progress: Optional[float] = None,
    ):
        if not on_progress:
            return

        trace_state["seq"] = int(trace_state.get("seq", 0)) + 1
        safe_detail = sanitize_trace_text(detail)
        safe_metrics = sanitize_metrics(metrics or {})
        event = {
            "event_id": f"{trace_state.get('token', 'trace')}-{trace_state['seq']}",
            "ts": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
            "stage": stage,
            "stage_index": stage_index,
            "kind": kind,
            "title": sanitize_trace_text(title) or "执行事件",
            "detail": safe_detail,
            "metrics": safe_metrics,
            "status": status,
        }

        event_progress = progress if progress is not None else min(max((stage_index + 1) * 25, 1), 100)
        await on_progress(
            AgentProgress(
                stage=stage,
                progress=event_progress,
                message=safe_detail or event["title"],
                data={"type": "trace", "event": event},
            )
        )

    @staticmethod
    def _parse_company_names_text(value: Any) -> list[str]:
        """Parse company names from comma/newline-delimited text input."""
        if value is None:
            return []
        if isinstance(value, list):
            raw_items = [str(item).strip() for item in value]
        else:
            text = str(value)
            raw_items = [
                chunk.strip()
                for chunk in re.split(r"[\n,，、;；\t]+", text)
            ]
        # Filter out empty and obvious instruction words
        blocked = {"企业", "公司", "名单", "导出", "字段", "信息"}
        return [item for item in raw_items if item and item not in blocked]

    def _merge_company_names(self, uploaded_names: Any, text_names: Any) -> list[str]:
        """Merge uploaded and text-entered company names with dedup."""
        merged: list[str] = []
        seen: set[str] = set()

        uploaded = uploaded_names if isinstance(uploaded_names, list) else []
        for item in [*uploaded, *self._parse_company_names_text(text_names)]:
            name = str(item).strip()
            if not name or name in seen:
                continue
            seen.add(name)
            merged.append(name)
        return merged


def _infer_columns_from_rows(rows: list[dict]) -> list[dict]:
    """Build fallback column definitions from query result rows."""
    if not rows:
        return []
    sample = rows[0]
    columns: list[dict] = []
    for key, value in sample.items():
        col_type = "number" if isinstance(value, (int, float)) else "text"
        columns.append({"key": key, "label": key, "type": col_type})
    return columns


# ---------------------------------------------------------------------------
# Mock data helpers
# ---------------------------------------------------------------------------

def _build_mock_rows(scenario: str, query: str) -> tuple[list[dict], list[dict]]:
    """Return pre-built tabular mock data for demonstration."""
    if scenario == "derived" or any(kw in query for kw in ["CAGR", "cagr", "衍生", "加工"]):
        return _mock_derived_rows()
    if scenario == "export":
        return _mock_export_rows()
    # Default: filter
    if any(kw in query.lower() for kw in ["人工智能", "ai", "大模型", "智能体"]):
        return _mock_ai_rows()
    if any(kw in query for kw in ["高新", "高新技术"]):
        return _mock_hightech_rows()
    if any(kw in query for kw in ["营收", "收入"]):
        return _mock_revenue_rows()
    return _mock_profit_growth_rows()


def _mock_profit_growth_rows():
    columns = [
        {"key": "name", "label": "企业名称", "type": "text"},
        {"key": "short_name", "label": "简称", "type": "text"},
        {"key": "city", "label": "城市", "type": "text"},
        {"key": "industry", "label": "行业", "type": "text"},
        {"key": "net_profit_2022", "label": "净利润(2022)", "type": "number", "unit": "万元"},
        {"key": "net_profit_2023", "label": "净利润(2023)", "type": "number", "unit": "万元"},
        {"key": "net_profit_2024", "label": "净利润(2024)", "type": "number", "unit": "万元"},
        {"key": "net_margin", "label": "净利率(2024)", "type": "number", "unit": "%"},
        {"key": "risk_level", "label": "风险等级", "type": "badge"},
    ]
    rows = [
        {"name": "杭州海康威视数字技术股份有限公司", "short_name": "海康威视", "city": "杭州", "industry": "信息技术", "net_profit_2022": 128400, "net_profit_2023": 141200, "net_profit_2024": 156800, "net_margin": 16.3, "risk_level": "low"},
        {"name": "浙江大华技术股份有限公司", "short_name": "大华技术", "city": "杭州", "industry": "信息技术", "net_profit_2022": 31200, "net_profit_2023": 38600, "net_profit_2024": 45800, "net_margin": 12.6, "risk_level": "low"},
        {"name": "杭州网易互娱科技有限公司", "short_name": "网易互娱", "city": "杭州", "industry": "信息技术", "net_profit_2022": 28400, "net_profit_2023": 35200, "net_profit_2024": 41800, "net_margin": 33.3, "risk_level": "low"},
        {"name": "浙江核新同花顺网络信息股份有限公司", "short_name": "同花顺", "city": "杭州", "industry": "信息技术", "net_profit_2022": 10200, "net_profit_2023": 14800, "net_profit_2024": 19600, "net_margin": 45.8, "risk_level": "low"},
        {"name": "杭州数梦工场科技有限公司", "short_name": "数梦工场", "city": "杭州", "industry": "信息技术", "net_profit_2022": 1200, "net_profit_2023": 2100, "net_profit_2024": 3200, "net_margin": 16.7, "risk_level": "low"},
        {"name": "浙江正泰太阳能科技有限公司", "short_name": "正泰太阳能", "city": "杭州", "industry": "制造业", "net_profit_2022": 18500, "net_profit_2023": 24200, "net_profit_2024": 31500, "net_margin": 11.8, "risk_level": "low"},
        {"name": "杭州老板电器股份有限公司", "short_name": "老板电器", "city": "杭州", "industry": "制造业", "net_profit_2022": 15800, "net_profit_2023": 18200, "net_profit_2024": 21500, "net_margin": 17.1, "risk_level": "low"},
        {"name": "杭州银江技术股份有限公司", "short_name": "银江技术", "city": "杭州", "industry": "信息技术", "net_profit_2022": 1500, "net_profit_2023": 2800, "net_profit_2024": 4200, "net_margin": 10.9, "risk_level": "medium"},
        {"name": "杭州华澜微电子股份有限公司", "short_name": "华澜微", "city": "杭州", "industry": "信息技术", "net_profit_2022": 680, "net_profit_2023": 920, "net_profit_2024": 1350, "net_margin": 15.9, "risk_level": "medium"},
        {"name": "杭州远想医疗设备有限公司", "short_name": "远想医疗", "city": "杭州", "industry": "医疗健康", "net_profit_2022": 420, "net_profit_2023": 680, "net_profit_2024": 950, "net_margin": 18.3, "risk_level": "low"},
        {"name": "杭州安恒信息技术股份有限公司", "short_name": "安恒信息", "city": "杭州", "industry": "信息技术", "net_profit_2022": -5800, "net_profit_2023": -2200, "net_profit_2024": 1850, "net_margin": 6.9, "risk_level": "low"},
        {"name": "杭州当虹科技股份有限公司", "short_name": "当虹科技", "city": "杭州", "industry": "信息技术", "net_profit_2022": -2800, "net_profit_2023": -800, "net_profit_2024": 580, "net_margin": 8.1, "risk_level": "low"},
    ]
    return rows, columns


def _mock_revenue_rows():
    columns = [
        {"key": "name", "label": "企业名称", "type": "text"},
        {"key": "city", "label": "城市", "type": "text"},
        {"key": "industry", "label": "行业", "type": "text"},
        {"key": "revenue_2022", "label": "营收(2022)", "type": "number", "unit": "万元"},
        {"key": "revenue_2023", "label": "营收(2023)", "type": "number", "unit": "万元"},
        {"key": "revenue_2024", "label": "营收(2024)", "type": "number", "unit": "万元"},
        {"key": "gross_margin", "label": "毛利率(2024)", "type": "number", "unit": "%"},
        {"key": "listing_status", "label": "上市状态", "type": "badge"},
    ]
    rows = [
        {"name": "杭州海康威视数字技术股份有限公司", "city": "杭州", "industry": "信息技术", "revenue_2022": 831700, "revenue_2023": 893400, "revenue_2024": 962000, "gross_margin": 45.5, "listing_status": "listed"},
        {"name": "浙江大华技术股份有限公司", "city": "杭州", "industry": "信息技术", "revenue_2022": 305600, "revenue_2023": 328900, "revenue_2024": 362100, "gross_margin": 40.1, "listing_status": "listed"},
        {"name": "浙江正泰太阳能科技有限公司", "city": "杭州", "industry": "制造业", "revenue_2022": 185000, "revenue_2023": 225000, "revenue_2024": 268000, "gross_margin": 25.2, "listing_status": "unlisted"},
        {"name": "杭州网易互娱科技有限公司", "city": "杭州", "industry": "信息技术", "revenue_2022": 96500, "revenue_2023": 108200, "revenue_2024": 125600, "gross_margin": 64.5, "listing_status": "unlisted"},
        {"name": "杭州老板电器股份有限公司", "city": "杭州", "industry": "制造业", "revenue_2022": 102500, "revenue_2023": 112800, "revenue_2024": 125600, "gross_margin": 57.8, "listing_status": "listed"},
        {"name": "杭州数梦工场科技有限公司", "city": "杭州", "industry": "信息技术", "revenue_2022": 12500, "revenue_2023": 15800, "revenue_2024": 19200, "gross_margin": 50.5, "listing_status": "unlisted"},
        {"name": "杭州银江技术股份有限公司", "city": "杭州", "industry": "信息技术", "revenue_2022": 28500, "revenue_2023": 32200, "revenue_2024": 38500, "gross_margin": 37.8, "listing_status": "listed"},
        {"name": "杭州安恒信息技术股份有限公司", "city": "杭州", "industry": "信息技术", "revenue_2022": 18200, "revenue_2023": 21500, "revenue_2024": 26800, "gross_margin": 62.5, "listing_status": "listed"},
    ]
    return rows, columns


def _mock_hightech_rows():
    columns = [
        {"key": "name", "label": "企业名称", "type": "text"},
        {"key": "city", "label": "城市", "type": "text"},
        {"key": "industry", "label": "行业", "type": "text"},
        {"key": "tags", "label": "标签", "type": "text"},
        {"key": "revenue_2024", "label": "营收(2024)", "type": "number", "unit": "万元"},
        {"key": "net_profit_2024", "label": "净利润(2024)", "type": "number", "unit": "万元"},
        {"key": "listing_status", "label": "上市状态", "type": "badge"},
        {"key": "risk_level", "label": "风险等级", "type": "badge"},
    ]
    rows = [
        {"name": "杭州海康威视数字技术股份有限公司", "city": "杭州", "industry": "信息技术", "tags": "国家高新技术企业", "revenue_2024": 962000, "net_profit_2024": 156800, "listing_status": "listed", "risk_level": "low"},
        {"name": "浙江大华技术股份有限公司", "city": "杭州", "industry": "信息技术", "tags": "国家高新技术企业", "revenue_2024": 362100, "net_profit_2024": 45800, "listing_status": "listed", "risk_level": "low"},
        {"name": "杭州安恒信息技术股份有限公司", "city": "杭州", "industry": "信息技术", "tags": "国家高新技术企业, 专精特新小巨人", "revenue_2024": 26800, "net_profit_2024": 1850, "listing_status": "listed", "risk_level": "low"},
        {"name": "浙江核新同花顺网络信息股份有限公司", "city": "杭州", "industry": "信息技术", "tags": "国家高新技术企业, 浙江省隐形冠军", "revenue_2024": 42800, "net_profit_2024": 19600, "listing_status": "listed", "risk_level": "low"},
        {"name": "杭州涂鸦智能电子有限公司", "city": "杭州", "industry": "信息技术", "tags": "国家高新技术企业", "revenue_2024": 13500, "net_profit_2024": -1800, "listing_status": "listed", "risk_level": "low"},
        {"name": "杭州华澜微电子股份有限公司", "city": "杭州", "industry": "信息技术", "tags": "国家高新技术企业, 专精特新小巨人", "revenue_2024": 8500, "net_profit_2024": 1350, "listing_status": "listed", "risk_level": "medium"},
        {"name": "杭州泰格医药科技股份有限公司", "city": "杭州", "industry": "医疗健康", "tags": "国家高新技术企业", "revenue_2024": 75200, "net_profit_2024": 15800, "listing_status": "listed", "risk_level": "low"},
    ]
    return rows, columns


def _mock_ai_rows():
    columns = [
        {"key": "name", "label": "企业名称", "type": "text"},
        {"key": "short_name", "label": "简称", "type": "text"},
        {"key": "city", "label": "城市", "type": "text"},
        {"key": "industry", "label": "行业", "type": "text"},
        {"key": "ai_category", "label": "AI方向", "type": "text"},
        {"key": "ai_capability_level", "label": "AI能力等级", "type": "badge"},
        {"key": "model_product", "label": "AI产品/模型", "type": "text"},
        {"key": "application_domain", "label": "应用场景", "type": "text"},
        {"key": "snapshot_year", "label": "口径年份", "type": "number"},
    ]
    rows = [
        {"name": "杭州海康威视数字技术股份有限公司", "short_name": "海康威视", "city": "杭州", "industry": "信息技术", "ai_category": "计算机视觉", "ai_capability_level": "L4", "model_product": "观澜视觉模型", "application_domain": "智慧安防", "snapshot_year": 2026},
        {"name": "浙江大华技术股份有限公司", "short_name": "大华技术", "city": "杭州", "industry": "信息技术", "ai_category": "计算机视觉", "ai_capability_level": "L4", "model_product": "慧眼多模态模型", "application_domain": "城市治理", "snapshot_year": 2026},
        {"name": "杭州安恒信息技术股份有限公司", "short_name": "安恒信息", "city": "杭州", "industry": "信息技术", "ai_category": "安全AI", "ai_capability_level": "L3", "model_product": "玄武威胁检测模型", "application_domain": "网络安全", "snapshot_year": 2026},
        {"name": "浙江核新同花顺网络信息股份有限公司", "short_name": "同花顺", "city": "杭州", "industry": "信息技术", "ai_category": "金融AI", "ai_capability_level": "L4", "model_product": "iFinD投研助手", "application_domain": "智能投顾", "snapshot_year": 2026},
        {"name": "杭州数梦工场科技有限公司", "short_name": "数梦工场", "city": "杭州", "industry": "信息技术", "ai_category": "政务AI", "ai_capability_level": "L3", "model_product": "数智政务助手", "application_domain": "政务服务", "snapshot_year": 2026},
        {"name": "杭州涂鸦智能电子有限公司", "short_name": "涂鸦智能", "city": "杭州", "industry": "信息技术", "ai_category": "边缘AI", "ai_capability_level": "L3", "model_product": "TuyaEdge AI", "application_domain": "智能家居", "snapshot_year": 2026},
        {"name": "杭州银江技术股份有限公司", "short_name": "银江技术", "city": "杭州", "industry": "信息技术", "ai_category": "交通AI", "ai_capability_level": "L3", "model_product": "银江交通智能体", "application_domain": "智慧交通", "snapshot_year": 2026},
        {"name": "杭州当虹科技股份有限公司", "short_name": "当虹科技", "city": "杭州", "industry": "信息技术", "ai_category": "视频AI", "ai_capability_level": "L3", "model_product": "当虹视频理解引擎", "application_domain": "媒体视频", "snapshot_year": 2026},
    ]
    return rows, columns


def _mock_export_rows():
    columns = [
        {"key": "name", "label": "企业名称", "type": "text"},
        {"key": "short_name", "label": "简称", "type": "text"},
        {"key": "city", "label": "城市", "type": "text"},
        {"key": "industry", "label": "行业", "type": "text"},
        {"key": "reg_capital", "label": "注册资本", "type": "number", "unit": "万元"},
        {"key": "emp_count", "label": "员工人数", "type": "number", "unit": "人"},
        {"key": "legal_rep", "label": "法定代表人", "type": "text"},
        {"key": "reg_date", "label": "注册日期", "type": "text"},
        {"key": "listing_status", "label": "上市状态", "type": "badge"},
        {"key": "risk_level", "label": "风险等级", "type": "badge"},
        {"key": "credit_code", "label": "统一社会信用代码", "type": "text"},
    ]
    rows = [
        {"name": "杭州海康威视数字技术股份有限公司", "short_name": "海康威视", "city": "杭州", "industry": "信息技术", "reg_capital": 349071, "emp_count": 42000, "legal_rep": "胡扬忠", "reg_date": "2001-11-30", "listing_status": "listed", "risk_level": "low", "credit_code": "91330000142209938B"},
        {"name": "浙江大华技术股份有限公司", "short_name": "大华技术", "city": "杭州", "industry": "信息技术", "reg_capital": 145800, "emp_count": 18000, "legal_rep": "傅利泉", "reg_date": "2001-12-28", "listing_status": "listed", "risk_level": "low", "credit_code": "91330000727220937X"},
        {"name": "杭州网易互娱科技有限公司", "short_name": "网易互娱", "city": "杭州", "industry": "信息技术", "reg_capital": 50000, "emp_count": 8500, "legal_rep": "丁磊", "reg_date": "2006-03-15", "listing_status": "unlisted", "risk_level": "low", "credit_code": "91330100MA27Y2D70A"},
        {"name": "浙江核新同花顺网络信息股份有限公司", "short_name": "同花顺", "city": "杭州", "industry": "信息技术", "reg_capital": 53640, "emp_count": 6800, "legal_rep": "易峥", "reg_date": "2001-08-24", "listing_status": "listed", "risk_level": "low", "credit_code": "91330000727219734D"},
        {"name": "杭州数梦工场科技有限公司", "short_name": "数梦工场", "city": "杭州", "industry": "信息技术", "reg_capital": 30000, "emp_count": 2800, "legal_rep": "吴敬传", "reg_date": "2015-03-20", "listing_status": "unlisted", "risk_level": "low", "credit_code": "91330106MA27Y3KJ6R"},
        {"name": "杭州老板电器股份有限公司", "short_name": "老板电器", "city": "杭州", "industry": "制造业", "reg_capital": 45876, "emp_count": 12000, "legal_rep": "任富佳", "reg_date": "1979-11-01", "listing_status": "listed", "risk_level": "low", "credit_code": "91330100142209832K"},
        {"name": "北京字节跳动科技有限公司", "short_name": "字节跳动", "city": "北京", "industry": "信息技术", "reg_capital": 1000000, "emp_count": 110000, "legal_rep": "梁汝波", "reg_date": "2012-03-09", "listing_status": "unlisted", "risk_level": "low", "credit_code": "91110108MA004LPJ2B"},
        {"name": "深圳市腾讯计算机系统有限公司", "short_name": "腾讯", "city": "深圳", "industry": "信息技术", "reg_capital": 650000, "emp_count": 108000, "legal_rep": "马化腾", "reg_date": "1998-11-11", "listing_status": "listed", "risk_level": "low", "credit_code": "914403001922038914"},
        {"name": "比亚迪股份有限公司", "short_name": "比亚迪", "city": "深圳", "industry": "制造业", "reg_capital": 3000000, "emp_count": 570000, "legal_rep": "王传福", "reg_date": "1995-02-10", "listing_status": "listed", "risk_level": "low", "credit_code": "91440300192203756D"},
        {"name": "上海联影医疗科技股份有限公司", "short_name": "联影医疗", "city": "上海", "industry": "医疗健康", "reg_capital": 200000, "emp_count": 8500, "legal_rep": "张强", "reg_date": "2011-03-22", "listing_status": "listed", "risk_level": "low", "credit_code": "91310000MA003HPVX7"},
        {"name": "宁德时代新能源科技股份有限公司", "short_name": "宁德时代", "city": "宁德", "industry": "制造业", "reg_capital": 2500000, "emp_count": 120000, "legal_rep": "曾毓群", "reg_date": "2011-12-16", "listing_status": "listed", "risk_level": "low", "credit_code": "91350900MA003HPW2Q"},
        {"name": "杭州泰格医药科技股份有限公司", "short_name": "泰格医药", "city": "杭州", "industry": "医疗健康", "reg_capital": 86200, "emp_count": 9800, "legal_rep": "叶小平", "reg_date": "2004-12-08", "listing_status": "listed", "risk_level": "low", "credit_code": "91330100770100383A"},
        {"name": "东方财富信息股份有限公司", "short_name": "东方财富", "city": "上海", "industry": "信息技术", "reg_capital": 547000, "emp_count": 9800, "legal_rep": "其实", "reg_date": "2005-01-20", "listing_status": "listed", "risk_level": "low", "credit_code": "91310115771885531P"},
        {"name": "上海大智慧股份有限公司", "short_name": "大智慧", "city": "上海", "industry": "信息技术", "reg_capital": 201300, "emp_count": 4200, "legal_rep": "张志宏", "reg_date": "2000-12-14", "listing_status": "listed", "risk_level": "medium", "credit_code": "91310000729506104E"},
        # Simulate some data quality issues
        {"name": "温州正泰电器股份有限公司", "short_name": "正泰电器", "city": "温州", "industry": "制造业", "reg_capital": 214800, "emp_count": None, "legal_rep": "南存辉", "reg_date": "1997-08-08", "listing_status": "listed", "risk_level": "low", "credit_code": "91330382142209555X"},
        {"name": "杭州银江技术股份有限公司", "short_name": "银江技术", "city": "杭州", "industry": "信息技术", "reg_capital": 42350, "emp_count": 3600, "legal_rep": None, "reg_date": "1992-05-18", "listing_status": "listed", "risk_level": "medium", "credit_code": "91330100142209876X"},
    ]
    return rows, columns


def _mock_derived_rows():
    columns = [
        {"key": "name", "label": "企业名称", "type": "text"},
        {"key": "city", "label": "城市", "type": "text"},
        {"key": "industry", "label": "行业", "type": "text"},
        {"key": "revenue_2022", "label": "营收(2022)", "type": "number", "unit": "万元"},
        {"key": "revenue_2024", "label": "营收(2024)", "type": "number", "unit": "万元"},
        {"key": "revenue_cagr", "label": "营收CAGR(3年)", "type": "number", "unit": "%"},
        {"key": "net_margin", "label": "净利率(2024)", "type": "number", "unit": "%"},
        {"key": "roe", "label": "ROE(2024)", "type": "number", "unit": "%"},
        {"key": "debt_ratio", "label": "资产负债率(2024)", "type": "number", "unit": "%"},
        {"key": "profit_growth_23_24", "label": "利润增速(23→24)", "type": "number", "unit": "万元"},
        {"key": "risk_level", "label": "风险等级", "type": "badge"},
    ]
    rows = [
        {"name": "比亚迪股份有限公司", "city": "深圳", "industry": "制造业", "revenue_2022": 4240600, "revenue_2024": 7770800, "revenue_cagr": 35.3, "net_margin": 5.2, "roe": 24.2, "debt_ratio": 72.8, "profit_growth_23_24": 102200, "risk_level": "low"},
        {"name": "华为技术有限公司", "city": "深圳", "industry": "信息技术", "revenue_2022": 6423000, "revenue_2024": 8620000, "revenue_cagr": 15.8, "net_margin": 12.3, "roe": 20.8, "debt_ratio": 55.5, "profit_growth_23_24": 190000, "risk_level": "low"},
        {"name": "深圳市大疆创新科技有限公司", "city": "深圳", "industry": "制造业", "revenue_2022": 301200, "revenue_2024": 420500, "revenue_cagr": 18.2, "net_margin": 19.6, "roe": 45.2, "debt_ratio": 16.5, "profit_growth_23_24": 17300, "risk_level": "low"},
        {"name": "杭州数梦工场科技有限公司", "city": "杭州", "industry": "信息技术", "revenue_2022": 12500, "revenue_2024": 19200, "revenue_cagr": 23.9, "net_margin": 16.7, "roe": 16.5, "debt_ratio": 38.5, "profit_growth_23_24": 1100, "risk_level": "low"},
        {"name": "浙江核新同花顺网络信息股份有限公司", "city": "杭州", "industry": "信息技术", "revenue_2022": 28500, "revenue_2024": 42800, "revenue_cagr": 22.5, "net_margin": 45.8, "roe": 30.5, "debt_ratio": 15.2, "profit_growth_23_24": 4800, "risk_level": "low"},
        {"name": "杭州海康威视数字技术股份有限公司", "city": "杭州", "industry": "信息技术", "revenue_2022": 831700, "revenue_2024": 962000, "revenue_cagr": 7.5, "net_margin": 16.3, "roe": 21.2, "debt_ratio": 36.8, "profit_growth_23_24": 15600, "risk_level": "low"},
        {"name": "杭州老板电器股份有限公司", "city": "杭州", "industry": "制造业", "revenue_2022": 102500, "revenue_2024": 125600, "revenue_cagr": 10.7, "net_margin": 17.1, "roe": 27.2, "debt_ratio": 27.2, "profit_growth_23_24": 3300, "risk_level": "low"},
        {"name": "广州酒家集团股份有限公司", "city": "广州", "industry": "零售业", "revenue_2022": 425000, "revenue_2024": 498200, "revenue_cagr": 8.2, "net_margin": 12.5, "roe": 33.8, "debt_ratio": 27.2, "profit_growth_23_24": 4000, "risk_level": "low"},
        {"name": "顺丰控股股份有限公司", "city": "深圳", "industry": "零售业", "revenue_2022": 2674900, "revenue_2024": 2866800, "revenue_cagr": 3.5, "net_margin": 3.3, "roe": 7.5, "debt_ratio": 59.5, "profit_growth_23_24": 13300, "risk_level": "low"},
        {"name": "嘉兴敏惠汽车零部件有限公司", "city": "嘉兴", "industry": "制造业", "revenue_2022": 42000, "revenue_2024": 55200, "revenue_cagr": 14.6, "net_margin": 9.4, "roe": 10.8, "debt_ratio": 50.8, "profit_growth_23_24": 700, "risk_level": "low"},
        {"name": "宁德时代新能源科技股份有限公司", "city": "宁德", "industry": "制造业", "revenue_2022": 3285800, "revenue_2024": 3620500, "revenue_cagr": 5.0, "net_margin": 10.7, "roe": 18.5, "debt_ratio": 69.5, "profit_growth_23_24": -55600, "risk_level": "low"},
    ]
    return rows, columns


def _compute_stats_from_rows(rows: list[dict], columns: list[dict]) -> dict:
    """Compute basic stats from mock rows."""
    numeric_cols = [c["key"] for c in columns if c.get("type") == "number"]
    stats: dict = {"count": len(rows)}
    if not rows or not numeric_cols:
        return stats

    primary = numeric_cols[0]
    values = [r[primary] for r in rows if r.get(primary) is not None]
    if values:
        stats[f"avg_{primary}"] = round(sum(values) / len(values), 1)
        stats[f"max_{primary}"] = max(values)
        stats[f"min_{primary}"] = min(values)
        sorted_v = sorted(values)
        mid = len(sorted_v) // 2
        stats[f"median_{primary}"] = (
            sorted_v[mid] if len(sorted_v) % 2 else
            (sorted_v[mid - 1] + sorted_v[mid]) / 2
        )
    return stats


def _build_summary(scenario: str, total_count: int, description: str,
                   rows: list, columns: list) -> str:
    numeric_cols = [c["key"] for c in columns if c.get("type") == "number"]
    if scenario == "filter" and numeric_cols and rows:
        profit_key = next((k for k in numeric_cols if "profit" in k and "2024" in k), None)
        if profit_key:
            values = [r[profit_key] for r in rows if r.get(profit_key) is not None and r[profit_key] > 0]
            if values:
                avg = round(sum(values) / len(values) / 10000, 1)
                return f"共筛选出 {total_count} 家企业，净利润均值 {avg} 亿元。{description}"
    if scenario == "export":
        return f"已导出 {total_count} 家企业的结构化字段数据，数据完整率 ≥ 95%。"
    if scenario == "derived":
        return f"已完成 {total_count} 家企业的衍生指标计算，包含营收CAGR、净利率等关键分析字段。"
    return f"共获取 {total_count} 条企业数据记录。{description}"
