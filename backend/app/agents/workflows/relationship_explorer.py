"""Relationship Explorer Agent – natural language relationship graph exploration.

Performs agent-driven relationship research and multi-format visualization:
1. Query Understanding  (0 – 25 %)
2. Data Research        (25 – 50 %)
3. Relationship Analysis(50 – 75 %)
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


class RelationshipExplorerAgent(BaseAgent):
    """Natural-language relationship graph exploration agent."""

    agent_id = "graph"
    name = "企业关系图谱"
    description = "自然语言查询企业关系，自动选择最佳可视化形式"
    color = "#06B6D4"
    tags = ["图谱", "关系分析"]
    icon = "Network"
    status = "ready"

    _prompt_path = os.path.join(
        os.path.dirname(__file__),
        "..",
        "prompts",
        "relationship_explorer.md",
    )

    def _load_system_prompt(self) -> str:
        """Load the system prompt from the markdown file."""
        try:
            with open(self._prompt_path, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            logger.warning("System prompt not found at %s", self._prompt_path)
            return "你是一个专业的企业关系图谱探索师。请根据用户查询，搜索并分析企业和人物之间的关系。"

    def get_config_schema(self) -> dict:
        """Return the configuration schema for the graph explorer agent."""
        return get_mock_agent_config(self.agent_id)

    async def execute(
        self,
        agent_input: AgentInput,
        on_progress: Optional[Any] = None,
    ) -> AgentResult:
        """Run the 4-stage relationship exploration pipeline."""

        target = agent_input.target
        logger.info("RelationshipExplorerAgent: starting for target=%s", target)

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
        """Simulate the pipeline with mock data and delays."""

        # Mock stream text to simulate agent "thinking" during research
        mock_stream_lines = [
            f"正在解析查询意图：「{target}」...\n",
            "识别到核心实体，开始多渠道数据检索...\n",
            f"搜索企业工商信息数据库... 找到 {target} 相关记录\n",
            "查询股权结构数据... 发现多层持股关系\n",
            "检索高管任职信息... 交叉比对中\n",
            "分析投资关系网络... 发现关联投资方\n",
            "构建实体关系图谱... 计算关系权重\n",
            "生成最佳可视化方案... 选择多维度展示\n",
        ]

        stages = [
            ("查询理解", 0.0, 0.24, "正在分析查询意图，识别核心实体和关系类型...", 1.0),
            ("数据搜索", 0.25, 0.49, "正在搜索企业工商、股权、人员等多维度数据...", 2.0),
            ("关系分析", 0.50, 0.74, "正在分析实体关系网络，构建关系图谱...", 1.5),
            ("可视化生成", 0.75, 1.0, "正在生成多维度可视化展示...", 1.0),
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

                # Send mock stream text during search/analysis stages
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
                "relationship_summary": mock_result.get("relationship_summary", ""),
                "visualizations": mock_result.get("visualizations", []),
                "data_sources": mock_result.get("data_sources", []),
            },
            metadata=mock_result.get("metadata", {}),
        )

    # ------------------------------------------------------------------
    # Live execution path (CLI or API driver)
    # ------------------------------------------------------------------

    async def _execute_live(
        self,
        agent_input: AgentInput,
        on_progress: Optional[Any] = None,
    ) -> AgentResult:
        """Run the pipeline using the configured LLM driver.

        Uses 2 LLM calls:
        - Call 1 (streaming): Research – search and analyze relationship data
        - Call 2 (non-streaming): Structured JSON with visualizations
        """

        driver = get_driver()
        system_prompt = self._load_system_prompt()
        target = agent_input.target
        depth = agent_input.params.get("depth", "standard")

        # ── Stage 1+2: Streaming Research ──

        if on_progress:
            await on_progress(AgentProgress(
                stage="查询理解",
                progress=0.02,
                message=f"正在研究「{target}」的关系网络...",
            ))

        depth_instruction = {
            "shallow": "只关注直接一层关系",
            "standard": "关注两层关系网络",
            "deep": "深入穿透至三层以上的间接关系",
        }.get(depth, "关注两层关系网络")

        research_prompt = (
            f"请对「{target}」进行全面的关系网络研究。\n\n"
            f"探索深度要求：{depth_instruction}\n\n"
            f"请搜索并分析以下关系维度：\n"
            f"1. 股权结构 - 控股/参股关系、持股比例\n"
            f"2. 高管团队 - 董事、监事、高管的身份和任职情况\n"
            f"3. 投资关系 - 投资方、被投资方、投资轮次和金额\n"
            f"4. 竞争关系 - 同行业竞争对手\n"
            f"5. 合作关系 - 战略合作、技术合作、供应链关系\n"
            f"6. 家族/人物关系 - 相关人物之间的关系\n\n"
            f"请尽可能详细地列出发现的所有实体及其关系。"
        )

        accumulated = ""
        chunk_count = 0

        try:
            async for chunk in driver.call_streaming(research_prompt, system=system_prompt):  # type: ignore[reportGeneralTypeIssues]
                normalized = (chunk or "").strip()
                if not normalized:
                    continue

                if normalized.startswith("[Error]") or normalized.startswith("[CLI Error]"):
                    logger.warning("Streaming returned error, fallback: %s", normalized[:200])
                    accumulated = ""
                    break

                accumulated += chunk
                chunk_count += 1

                if on_progress:
                    await on_progress(AgentProgress(
                        stage="数据搜索",
                        progress=0.02,
                        message="",
                        data={"type": "stream", "content": chunk},
                    ))

                if chunk_count % 25 == 0 and on_progress:
                    prog = min(0.02 + chunk_count * 0.003, 0.45)
                    stage = "查询理解" if prog < 0.25 else "数据搜索"
                    await on_progress(AgentProgress(
                        stage=stage,
                        progress=prog,
                        message="正在搜索关系数据...",
                    ))
        except Exception as exc:
            logger.warning("Streaming failed, fallback: %s", exc)
            accumulated = ""

        # ── Fallback: non-streaming call ──
        if not accumulated or accumulated.startswith("[Error]"):
            logger.info("Falling back to non-streaming driver.call()")
            if on_progress:
                await on_progress(AgentProgress(
                    stage="数据搜索",
                    progress=0.05,
                    message=f"正在分析「{target}」关系数据（非流式模式）...",
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
                        stage="数据搜索",
                        progress=0.02,
                        message="",
                        data={"type": "stream", "content": text_chunk},
                    ))
                    await asyncio.sleep(0.03)

        if on_progress:
            await on_progress(AgentProgress(
                stage="查询理解", progress=0.24, message="查询理解完成",
            ))
            await on_progress(AgentProgress(
                stage="数据搜索", progress=0.49, message="数据搜索完成",
            ))

        # ── Stage 3: Structured JSON with Visualizations ──

        if on_progress:
            await on_progress(AgentProgress(
                stage="关系分析",
                progress=0.52,
                message="正在生成结构化关系图谱数据...",
            ))

        json_system = (
            "你是一个数据格式转换工具。你只输出合法的JSON对象，"
            "不输出任何解释文字、markdown标记或代码块包裹。"
        )

        json_prompt = (
            f"将以下关于「{target}」的关系研究转换为JSON对象。\n\n"
            f"研究内容：\n{accumulated[:8000]}\n\n"
            f"请直接输出JSON对象，格式如下（不要用```包裹）：\n"
            f'{{"query_interpretation":"对查询意图的理解",'
            f'"entities":[{{"name":"实体名","type":"person或company或event或organization"}}],'
            f'"relationship_summary":"2-3句关系摘要",'
            f'"visualizations":['
            f'{{"type":"graph","title":"标题","description":"描述",'
            f'"graph_data":{{"nodes":[{{"id":"n1","name":"名称","category":"分类","symbol_size":40}}],'
            f'"edges":[{{"source":"n1","target":"n2","label":"关系标签"}}],'
            f'"categories":["分类1","分类2"]}}}},'
            f'{{"type":"table","title":"标题","description":"描述",'
            f'"columns":[{{"key":"col1","title":"列名"}}],'
            f'"rows":[{{"col1":"值"}}]}}'
            f'],'
            f'"data_sources":["来源1","来源2"]}}\n\n'
            f"可视化类型说明：\n"
            f"- graph: 关系网络图（必须包含至少一个）\n"
            f"- mermaid: mermaid图表，需提供mermaid_code和mermaid_type(flowchart/mindmap/timeline)\n"
            f"- table: 数据表格\n"
            f"- echarts: ECharts图表，需提供echarts_option(完整配置)和chart_type\n\n"
            f"根据数据特点选择1-4个最合适的可视化组合。graph类型必须始终包含。\n"
            f"所有内容使用中文。"
        )

        report_resp = await driver.call(json_prompt, system=json_system)

        if report_resp.content.startswith("[Error]") or report_resp.content.startswith("[CLI Error]"):
            raise RuntimeError(f"JSON generation failed: {report_resp.content}")

        if on_progress:
            await on_progress(AgentProgress(
                stage="关系分析", progress=0.74, message="关系分析完成",
            ))

        # ── Stage 4: Parse and validate ──

        if on_progress:
            await on_progress(AgentProgress(
                stage="可视化生成",
                progress=0.77,
                message="正在验证和优化可视化数据...",
            ))

        report_data = self._parse_report_response(report_resp.content, target)

        if on_progress:
            await on_progress(AgentProgress(
                stage="可视化生成", progress=1.0, message="可视化生成完成",
            ))

        return AgentResult(
            summary=report_data.get("relationship_summary", f"{target} 关系图谱分析完成"),
            report={
                "query_interpretation": report_data.get("query_interpretation", ""),
                "entities": report_data.get("entities", []),
                "relationship_summary": report_data.get("relationship_summary", ""),
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
    # Response parsing
    # ------------------------------------------------------------------

    def _parse_report_response(self, content: str, target: str) -> dict:
        """Parse the LLM response into a structured format.

        Multi-layer strategy:
        1. Direct JSON parse
        2. Extract from markdown code fences
        3. Find outermost { ... }
        4. Fallback to minimal structure
        """
        # Layer 1: Direct parse
        try:
            data = json.loads(content)
            return self._validate_result(data, target)
        except (json.JSONDecodeError, ValueError):
            pass

        # Layer 2: Extract from code fences
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", content)
        if json_match:
            try:
                data = json.loads(json_match.group(1))
                return self._validate_result(data, target)
            except (json.JSONDecodeError, ValueError):
                pass

        # Layer 3: Find outermost { ... }
        first_brace = content.find("{")
        last_brace = content.rfind("}")
        if first_brace != -1 and last_brace > first_brace:
            try:
                data = json.loads(content[first_brace : last_brace + 1])
                return self._validate_result(data, target)
            except (json.JSONDecodeError, ValueError):
                pass

        # Layer 4: Fallback
        logger.warning("Failed to parse graph explorer JSON for %s, using fallback", target)
        return self._build_fallback(content, target)

    def _validate_result(self, data: dict, target: str) -> dict:
        """Normalize and validate the parsed result."""
        validated = {
            "query_interpretation": data.get("query_interpretation", f"查询{target}的关系网络"),
            "entities": data.get("entities", []),
            "relationship_summary": data.get("relationship_summary", ""),
            "visualizations": [],
            "data_sources": data.get("data_sources", []),
        }

        for viz in data.get("visualizations", []):
            viz_type = viz.get("type")
            if viz_type in ("graph", "mermaid", "table", "echarts"):
                validated["visualizations"].append(viz)

        # Ensure at least one visualization exists
        if not validated["visualizations"]:
            validated["visualizations"].append(self._build_fallback_graph(target))

        return validated

    def _build_fallback_graph(self, target: str) -> dict:
        """Build a minimal graph visualization as fallback."""
        return {
            "type": "graph",
            "title": f"{target}关系网络",
            "description": "基于可获取数据生成的关系网络图",
            "graph_data": {
                "nodes": [
                    {"id": "center", "name": target, "category": "核心", "symbol_size": 50},
                ],
                "edges": [],
                "categories": ["核心"],
            },
        }

    def _build_fallback(self, raw_content: str, target: str) -> dict:
        """Build a minimal valid result when JSON parsing completely fails."""
        return {
            "query_interpretation": f"查询{target}的关系网络（数据解析异常）",
            "entities": [{"name": target, "type": "company"}],
            "relationship_summary": raw_content[:500] if raw_content else f"{target}关系分析结果",
            "visualizations": [self._build_fallback_graph(target)],
            "data_sources": [],
        }
