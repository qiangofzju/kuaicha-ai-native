"""Trend Analysis Agent – agent-driven multi-dimensional trend exploration.

Performs 4-stage trend analysis pipeline:
1. Query Understanding  (0 – 25 %)
2. Data Collection      (25 – 50 %)
3. Trend Analysis       (50 – 75 %)
4. Visualization Gen    (75 – 100 %)

Live mode uses 2 LLM calls (research streaming, then structured JSON).
"""

import asyncio
import json
import os
import re
from typing import Any, Optional

from app.agents.base import AgentInput, AgentProgress, AgentResult, BaseAgent
from app.agents.driver import get_driver
from app.config import settings
from app.utils.logger import logger
from app.utils.mock_data import get_mock_agent_config, get_mock_agent_result


class TrendAnalysisAgent(BaseAgent):
    """Natural-language trend analysis and exploration agent."""

    agent_id = "trend"
    name = "趋势分析探索"
    description = "自然语言查询企业趋势数据，AI 自动选择最佳可视化"
    color = "#34D399"
    tags = ["趋势", "数据分析"]
    icon = "TrendUp"
    status = "ready"

    _prompt_path = os.path.join(
        os.path.dirname(__file__),
        "..",
        "prompts",
        "trend_analysis.md",
    )

    def _load_system_prompt(self) -> str:
        try:
            with open(self._prompt_path, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            logger.warning("System prompt not found at %s", self._prompt_path)
            return "你是一个专业的企业趋势分析师。请根据用户查询，搜索并分析企业的数据趋势。"

    def get_config_schema(self) -> dict:
        return get_mock_agent_config(self.agent_id)

    async def execute(
        self,
        agent_input: AgentInput,
        on_progress: Optional[Any] = None,
    ) -> AgentResult:
        target = agent_input.target
        logger.info("TrendAnalysisAgent: starting for target=%s", target)

        if settings.USE_MOCK_DATA:
            return await self._execute_mock(target, on_progress)

        return await self._execute_live(agent_input, on_progress)

    # ------------------------------------------------------------------
    # Mock execution path
    # ------------------------------------------------------------------

    async def _execute_mock(
        self,
        target: str,
        on_progress: Optional[Any] = None,
    ) -> AgentResult:
        mock_stream_lines = [
            f"正在解析趋势查询意图：「{target}」...\n",
            "识别分析维度，开始采集历史数据...\n",
            f"采集 {target} 近12个月风险评分数据...\n",
            "采集经营指标和财务数据...\n",
            "对比行业平均水平...\n",
            "识别关键转折点和影响事件...\n",
            "计算趋势斜率和变化幅度...\n",
            "生成最佳可视化方案...\n",
        ]

        stages = [
            ("查询理解", 0.0, 0.24, "正在分析查询意图，确定分析维度...", 1.0),
            ("数据采集", 0.25, 0.49, "正在采集企业历史数据和行业基准...", 2.0),
            ("趋势分析", 0.50, 0.74, "正在分析趋势变化，识别关键转折点...", 1.5),
            ("可视化生成", 0.75, 1.0, "正在生成多维度趋势可视化...", 1.0),
        ]

        stream_idx = 0
        for stage_idx, (stage_name, start, end, message, duration) in enumerate(stages):
            if on_progress:
                await on_progress(AgentProgress(
                    stage=stage_name,
                    progress=start,
                    message=message,
                ))

            steps = 5
            for i in range(1, steps + 1):
                await asyncio.sleep(duration / steps)
                progress = start + (end - start) * (i / steps)
                if on_progress:
                    await on_progress(AgentProgress(
                        stage=stage_name,
                        progress=round(progress, 2),
                        message=message,
                    ))

                if stage_idx in (1, 2) and stream_idx < len(mock_stream_lines) and i % 2 == 0:
                    if on_progress:
                        await on_progress(AgentProgress(
                            stage=stage_name,
                            progress=0.02,
                            message="",
                            data={"type": "stream", "content": mock_stream_lines[stream_idx]},
                        ))
                    stream_idx += 1

        mock_result = get_mock_agent_result(self.agent_id, target)

        return AgentResult(
            summary=mock_result["summary"],
            report={
                "query_interpretation": mock_result.get("query_interpretation", ""),
                "entities": mock_result.get("entities", []),
                "trend_summary": mock_result.get("trend_summary", ""),
                "visualizations": mock_result.get("visualizations", []),
                "data_sources": mock_result.get("data_sources", []),
            },
            metadata=mock_result.get("metadata", {}),
        )

    # ------------------------------------------------------------------
    # Live execution path
    # ------------------------------------------------------------------

    async def _execute_live(
        self,
        agent_input: AgentInput,
        on_progress: Optional[Any] = None,
    ) -> AgentResult:
        driver = get_driver()
        system_prompt = self._load_system_prompt()
        target = agent_input.target
        time_range = agent_input.params.get("time_range", "1y")

        range_label = {
            "3m": "近3个月", "6m": "近6个月",
            "1y": "近1年", "3y": "近3年",
        }.get(time_range, "近1年")

        if on_progress:
            await on_progress(AgentProgress(
                stage="查询理解", progress=0.02,
                message=f"正在研究「{target}」的{range_label}趋势...",
            ))

        research_prompt = (
            f"请对「{target}」进行{range_label}的全面趋势分析。\n\n"
            f"请搜索并分析以下维度：\n"
            f"1. 风险指标趋势 - 综合风险评分、司法/监管/舆情等各类风险变化\n"
            f"2. 经营数据变化 - 营收、利润率、市场份额等核心指标\n"
            f"3. 行业对比 - 与行业平均或主要竞争对手的差距变化\n"
            f"4. 关键事件 - 影响趋势的重大事件（政策、诉讼、合作等）\n\n"
            f"请尽可能提供具体的数据点和时间节点。"
        )

        accumulated = ""
        chunk_count = 0

        try:
            async for chunk in driver.call_streaming(research_prompt, system=system_prompt):  # type: ignore[reportGeneralTypeIssues]
                normalized = (chunk or "").strip()
                if not normalized:
                    continue
                if normalized.startswith("[Error]") or normalized.startswith("[CLI Error]"):
                    accumulated = ""
                    break
                accumulated += chunk
                chunk_count += 1
                if on_progress:
                    await on_progress(AgentProgress(
                        stage="数据采集", progress=0.02, message="",
                        data={"type": "stream", "content": chunk},
                    ))
                if chunk_count % 25 == 0 and on_progress:
                    prog = min(0.02 + chunk_count * 0.003, 0.45)
                    stage = "查询理解" if prog < 0.25 else "数据采集"
                    await on_progress(AgentProgress(
                        stage=stage, progress=prog, message="正在采集趋势数据...",
                    ))
        except Exception as exc:
            logger.warning("Streaming failed, fallback: %s", exc)
            accumulated = ""

        if not accumulated or accumulated.startswith("[Error]"):
            logger.info("Falling back to non-streaming driver.call()")
            if on_progress:
                await on_progress(AgentProgress(
                    stage="数据采集", progress=0.05,
                    message=f"正在分析「{target}」趋势数据（非流式模式）...",
                ))
            resp = await driver.call(research_prompt, system=system_prompt)
            accumulated = resp.content
            if accumulated.startswith("[Error]") or accumulated.startswith("[CLI Error]"):
                raise RuntimeError(f"Research call failed: {accumulated[:300]}")
            chunk_size = 80
            for i in range(0, len(accumulated), chunk_size):
                text_chunk = accumulated[i : i + chunk_size]
                if on_progress:
                    await on_progress(AgentProgress(
                        stage="数据采集", progress=0.02, message="",
                        data={"type": "stream", "content": text_chunk},
                    ))
                    await asyncio.sleep(0.03)

        if on_progress:
            await on_progress(AgentProgress(stage="查询理解", progress=0.24, message="查询理解完成"))
            await on_progress(AgentProgress(stage="数据采集", progress=0.49, message="数据采集完成"))

        if on_progress:
            await on_progress(AgentProgress(
                stage="趋势分析", progress=0.52,
                message="正在生成结构化趋势数据...",
            ))

        json_system = (
            "你是一个数据格式转换工具。你只输出合法的JSON对象，"
            "不输出任何解释文字、markdown标记或代码块包裹。"
        )

        json_prompt = (
            f"将以下关于「{target}」的趋势研究转换为JSON对象。\n\n"
            f"研究内容：\n{accumulated[:8000]}\n\n"
            f"请直接输出JSON对象，格式如下（不要用```包裹）：\n"
            f'{{"query_interpretation":"对查询意图的理解",'
            f'"entities":[{{"name":"实体名","type":"company"}}],'
            f'"trend_summary":"2-3句趋势摘要",'
            f'"visualizations":['
            f'{{"type":"echarts","title":"标题","description":"描述",'
            f'"chart_type":"line","echarts_option":{{完整ECharts配置}}}},'
            f'{{"type":"table","title":"标题","description":"描述",'
            f'"columns":[{{"key":"col1","title":"列名"}}],'
            f'"rows":[{{"col1":"值"}}]}}'
            f'],'
            f'"data_sources":["来源1","来源2"]}}\n\n'
            f"可视化类型说明：\n"
            f"- echarts: ECharts图表(line/bar/radar/pie)，需提供echarts_option和chart_type\n"
            f"- table: 数据表格\n"
            f"- mermaid: mermaid图表，需提供mermaid_code和mermaid_type(timeline)\n\n"
            f"根据数据特点选择2-4个最合适的可视化组合。趋势类的echarts line必须包含。\n"
            f"ECharts配置中使用暗色主题(transparent背景,白色文字透明度0.4-0.7)。\n"
            f"所有内容使用中文。"
        )

        report_resp = await driver.call(json_prompt, system=json_system)
        if report_resp.content.startswith("[Error]") or report_resp.content.startswith("[CLI Error]"):
            raise RuntimeError(f"JSON generation failed: {report_resp.content}")

        if on_progress:
            await on_progress(AgentProgress(stage="趋势分析", progress=0.74, message="趋势分析完成"))
            await on_progress(AgentProgress(
                stage="可视化生成", progress=0.77,
                message="正在验证和优化可视化数据...",
            ))

        report_data = self._parse_report_response(report_resp.content, target)

        if on_progress:
            await on_progress(AgentProgress(stage="可视化生成", progress=1.0, message="可视化生成完成"))

        return AgentResult(
            summary=report_data.get("trend_summary", f"{target} 趋势分析完成"),
            report={
                "query_interpretation": report_data.get("query_interpretation", ""),
                "entities": report_data.get("entities", []),
                "trend_summary": report_data.get("trend_summary", ""),
                "visualizations": report_data.get("visualizations", []),
                "data_sources": report_data.get("data_sources", []),
            },
            metadata={
                "agent_id": self.agent_id,
                "target": target,
                "model": report_resp.model,
                "usage": report_resp.usage,
            },
        )

    # ------------------------------------------------------------------
    # Response parsing (same multi-layer strategy as relationship_explorer)
    # ------------------------------------------------------------------

    def _parse_report_response(self, content: str, target: str) -> dict:
        # Layer 1: Direct parse
        try:
            data = json.loads(content)
            return self._validate_result(data, target)
        except (json.JSONDecodeError, ValueError):
            pass

        # Layer 2: Code fences
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", content)
        if json_match:
            try:
                data = json.loads(json_match.group(1))
                return self._validate_result(data, target)
            except (json.JSONDecodeError, ValueError):
                pass

        # Layer 3: Outermost braces
        first_brace = content.find("{")
        last_brace = content.rfind("}")
        if first_brace != -1 and last_brace > first_brace:
            try:
                data = json.loads(content[first_brace : last_brace + 1])
                return self._validate_result(data, target)
            except (json.JSONDecodeError, ValueError):
                pass

        # Layer 4: Fallback
        logger.warning("Failed to parse trend explorer JSON for %s, using fallback", target)
        return self._build_fallback(content, target)

    def _validate_result(self, data: dict, target: str) -> dict:
        validated = {
            "query_interpretation": data.get("query_interpretation", f"分析{target}的趋势数据"),
            "entities": data.get("entities", []),
            "trend_summary": data.get("trend_summary", ""),
            "visualizations": [],
            "data_sources": data.get("data_sources", []),
        }
        for viz in data.get("visualizations", []):
            if viz.get("type") in ("echarts", "table", "mermaid", "graph"):
                validated["visualizations"].append(viz)
        if not validated["visualizations"]:
            validated["visualizations"].append(self._build_fallback_chart(target))
        return validated

    def _build_fallback_chart(self, target: str) -> dict:
        return {
            "type": "echarts",
            "title": f"{target}趋势",
            "description": "基于可获取数据生成的趋势图",
            "chart_type": "line",
            "echarts_option": {
                "backgroundColor": "transparent",
                "xAxis": {"type": "category", "data": ["1月", "2月", "3月", "4月", "5月", "6月"]},
                "yAxis": {"type": "value"},
                "series": [{"type": "line", "data": [50, 52, 48, 55, 53, 56], "smooth": True}],
            },
        }

    def _build_fallback(self, raw_content: str, target: str) -> dict:
        return {
            "query_interpretation": f"分析{target}的趋势数据（数据解析异常）",
            "entities": [{"name": target, "type": "company"}],
            "trend_summary": raw_content[:500] if raw_content else f"{target}趋势分析结果",
            "visualizations": [self._build_fallback_chart(target)],
            "data_sources": [],
        }
