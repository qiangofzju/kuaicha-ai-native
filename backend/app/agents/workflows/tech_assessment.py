"""Technology & Innovation Assessment Agent – evaluates tech capability.

Performs a multi-stage technology assessment of a target company:
1. Patent Collection       (0 – 25 %)
2. Technology Analysis     (25 – 50 %)
3. Competitiveness Rating  (50 – 75 %)
4. Report Generation       (75 – 100 %)

Live mode uses 2 LLM calls (stages 1+2 combined, then stage 3)
following the same pattern as the risk due diligence agent.
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


REPORT_JSON_SCHEMA = {
    "type": "object",
    "required": ["summary", "risk_rating", "risk_findings", "report_sections", "timeline"],
    "properties": {
        "summary": {
            "type": "string",
            "description": "2-3 sentence executive summary of the technology assessment"
        },
        "risk_rating": {
            "type": "string",
            "enum": ["A", "B", "C", "D", "E"],
            "description": "Overall tech rating: A=leader, B=strong, C=average, D=below average, E=lagging"
        },
        "risk_findings": {
            "type": "array",
            "description": "Exactly 5 technology dimensions",
            "items": {
                "type": "object",
                "required": ["label", "level", "score", "description", "trend"],
                "properties": {
                    "label": {"type": "string"},
                    "level": {"type": "string", "enum": ["high", "medium", "low"]},
                    "score": {"type": "number", "minimum": 0, "maximum": 100},
                    "description": {"type": "string"},
                    "trend": {"type": "string", "enum": ["up", "down", "stable"]}
                }
            }
        },
        "report_sections": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["title", "content"],
                "properties": {
                    "title": {"type": "string"},
                    "content": {"type": "string"},
                    "level": {"type": "string", "enum": ["high", "medium", "low"]}
                }
            }
        },
        "timeline": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["date", "event"],
                "properties": {
                    "date": {"type": "string"},
                    "event": {"type": "string"},
                    "type": {"type": "string"},
                    "level": {"type": "string", "enum": ["high", "medium", "low", "info"]}
                }
            }
        }
    }
}


class TechAssessmentAgent(BaseAgent):
    """Technology and innovation capability assessment agent."""

    agent_id = "tech"
    name = "科创能力评估"
    description = "分析知识产权与创新能力，评估技术资产质量"
    color = "#8B5CF6"
    tags = ["投资", "技术评估"]
    icon = "Brain"
    status = "ready"

    _prompt_path = os.path.join(
        os.path.dirname(__file__),
        "..",
        "prompts",
        "tech_assessment.md",
    )

    def _load_system_prompt(self) -> str:
        try:
            with open(self._prompt_path, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            logger.warning("System prompt not found at %s", self._prompt_path)
            return "你是一个专业的科技创新评估分析师。请对目标企业进行全面的科创能力评估。"

    def get_config_schema(self) -> dict:
        return get_mock_agent_config(self.agent_id)

    async def execute(
        self,
        agent_input: AgentInput,
        on_progress: Optional[Any] = None,
    ) -> AgentResult:
        target = agent_input.target
        logger.info("TechAssessmentAgent: starting for target=%s", target)

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
        stages = [
            ("专利采集", 0.0, 0.24, "正在采集专利数据、研发信息和技术成果...", 1.5),
            ("技术分析", 0.25, 0.49, "正在分析技术布局、创新能力和竞争壁垒...", 2.0),
            ("竞争力评估", 0.50, 0.74, "正在生成科创能力评估报告...", 1.5),
            ("报告生成", 0.75, 1.0, "正在进行报告质量审查和数据校验...", 1.0),
        ]

        for stage_name, start, end, message, duration in stages:
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

        mock_result = get_mock_agent_result(self.agent_id, target)

        return AgentResult(
            summary=mock_result["summary"],
            report={
                "risk_rating": mock_result["risk_rating"],
                "risk_findings": mock_result["risk_findings"],
                "report_sections": mock_result["report_sections"],
                "timeline": mock_result["timeline"],
            },
            metadata=mock_result["metadata"],
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

        if on_progress:
            await on_progress(AgentProgress(
                stage="专利采集",
                progress=0.02,
                message=f"正在采集 {target} 的专利和技术数据...",
            ))

        analysis_prompt = (
            f"请对企业「{target}」进行全面的科创能力评估。\n\n"
            f"请从以下五个维度评估，每个维度给出等级(high=领先/medium=中等/low=落后)、"
            f"百分制评分(0-100)和趋势(up=提升/down=下降/stable=稳定)：\n"
            f"1. 专利实力 - 专利数量及质量、核心专利占比、国际布局\n"
            f"2. 研发投入 - 研发支出占比、研发人员增长、政府补贴\n"
            f"3. 技术壁垒 - 核心技术深度、标准参与度、技术许可收入\n"
            f"4. 人才密度 - 技术人员占比、核心人才画像、人才竞争力\n"
            f"5. 创新指数 - 新产品推出频率、技术采用速度、数字化成熟度\n\n"
            f"请详细分析每个维度，列出关键技术里程碑事件。"
        )

        accumulated = ""
        chunk_count = 0

        try:
            async for chunk in driver.call_streaming(analysis_prompt, system=system_prompt):  # type: ignore[reportGeneralTypeIssues]
                normalized = (chunk or "").strip()
                if not normalized:
                    continue
                if normalized.startswith("[Error]") or normalized.startswith("[CLI Error]"):
                    logger.warning("Streaming returned error chunk, fallback: %s", normalized[:200])
                    accumulated = ""
                    break

                accumulated += chunk
                chunk_count += 1

                if on_progress:
                    await on_progress(AgentProgress(
                        stage="专利采集",
                        progress=0.02,
                        message="",
                        data={"type": "stream", "content": chunk},
                    ))

                if chunk_count % 25 == 0 and on_progress:
                    prog = min(0.02 + chunk_count * 0.003, 0.45)
                    stage = "专利采集" if prog < 0.25 else "技术分析"
                    await on_progress(AgentProgress(
                        stage=stage,
                        progress=prog,
                        message="正在分析技术数据...",
                    ))
        except Exception as exc:
            logger.warning("Streaming failed, falling back to call(): %s", exc)
            accumulated = ""

        if not accumulated or accumulated.startswith("[Error]"):
            logger.info("Falling back to non-streaming driver.call()")
            if on_progress:
                await on_progress(AgentProgress(
                    stage="专利采集",
                    progress=0.05,
                    message=f"正在分析 {target}（非流式模式）...",
                ))

            resp = await driver.call(analysis_prompt, system=system_prompt)
            accumulated = resp.content

            if accumulated.startswith("[Error]") or accumulated.startswith("[CLI Error]"):
                raise RuntimeError(f"Analysis call failed: {accumulated[:300]}")

            chunk_size = 80
            for i in range(0, len(accumulated), chunk_size):
                text_chunk = accumulated[i : i + chunk_size]
                if on_progress:
                    await on_progress(AgentProgress(
                        stage="专利采集",
                        progress=0.02,
                        message="",
                        data={"type": "stream", "content": text_chunk},
                    ))
                    await asyncio.sleep(0.03)

        if on_progress:
            await on_progress(AgentProgress(stage="专利采集", progress=0.24, message="专利采集完成"))
            await on_progress(AgentProgress(stage="技术分析", progress=0.49, message="技术分析完成"))

        # ── Stage 3: Structured JSON Report ──

        if on_progress:
            await on_progress(AgentProgress(
                stage="竞争力评估",
                progress=0.52,
                message="正在生成结构化评估报告...",
            ))

        json_system = (
            "你是一个数据格式转换工具。你只输出合法的JSON对象，"
            "不输出任何解释文字、markdown标记或代码块包裹。"
        )

        report_prompt = (
            f"将以下「{target}」的科创能力分析转换为JSON对象。\n\n"
            f"分析内容：\n{accumulated[:8000]}\n\n"
            f"请直接输出JSON对象，格式如下（不要用```包裹）：\n"
            f'{{"summary":"2-3句科创能力评估摘要",'
            f'"risk_rating":"A或B或C或D或E(A=领先,E=落后)",'
            f'"risk_findings":['
            f'{{"label":"专利实力","level":"high或medium或low","score":0到100,"description":"一句话描述","trend":"up或down或stable"}},'
            f'...共5个维度（专利实力/研发投入/技术壁垒/人才密度/创新指数）],'
            f'"report_sections":['
            f'{{"title":"章节标题","content":"详细内容","level":"high或medium或low"}},'
            f'...至少6个章节],'
            f'"timeline":['
            f'{{"date":"2024-01-15","event":"技术里程碑事件","type":"patent或rd或product或talent","level":"high或medium或low或info"}},'
            f'...5到10个事件，按时间倒序]}}\n\n'
            f"所有内容使用中文。"
        )

        report_resp = await driver.call(report_prompt, system=json_system)

        if report_resp.content.startswith("[Error]") or report_resp.content.startswith("[CLI Error]"):
            raise RuntimeError(f"Report generation failed: {report_resp.content}")

        if on_progress:
            await on_progress(AgentProgress(stage="竞争力评估", progress=0.74, message="评估报告生成完成"))

        # ── Stage 4: Quality Check ──

        if on_progress:
            await on_progress(AgentProgress(
                stage="报告生成",
                progress=0.77,
                message="正在校验报告数据完整性...",
            ))

        report_data = self._parse_report_response(report_resp.content, target)

        if on_progress:
            await on_progress(AgentProgress(stage="报告生成", progress=1.0, message="报告生成完成"))

        return AgentResult(
            summary=report_data["summary"],
            report={
                "risk_rating": report_data["risk_rating"],
                "risk_findings": report_data["risk_findings"],
                "report_sections": report_data["report_sections"],
                "timeline": report_data["timeline"],
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
        # Layer 1: Direct parse
        try:
            data = json.loads(content)
            return self._validate_report(data, target)
        except (json.JSONDecodeError, ValueError):
            pass

        # Layer 2: Markdown code fences
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", content)
        if json_match:
            try:
                data = json.loads(json_match.group(1))
                return self._validate_report(data, target)
            except (json.JSONDecodeError, ValueError):
                pass

        # Layer 3: Outermost braces
        first_brace = content.find("{")
        last_brace = content.rfind("}")
        if first_brace != -1 and last_brace > first_brace:
            try:
                data = json.loads(content[first_brace : last_brace + 1])
                return self._validate_report(data, target)
            except (json.JSONDecodeError, ValueError):
                pass

        # Layer 4: Fallback
        logger.warning("Failed to parse tech report JSON for %s, using fallback", target)
        return self._build_fallback_report(content, target)

    def _validate_report(self, data: dict, target: str) -> dict:
        validated: dict[str, Any] = {
            "summary": data.get("summary", f"{target} 科创能力评估报告"),
            "risk_rating": data.get("risk_rating", "B"),
            "risk_findings": [],
            "report_sections": [],
            "timeline": [],
        }

        if validated["risk_rating"] not in ("A", "B", "C", "D", "E"):
            validated["risk_rating"] = "B"

        for finding in data.get("risk_findings", []):
            validated["risk_findings"].append({
                "label": finding.get("label") or finding.get("category", "未知"),
                "level": finding.get("level", "medium"),
                "score": finding.get("score", 50),
                "description": finding.get("description", ""),
                "trend": finding.get("trend", "stable"),
            })

        for section in data.get("report_sections", []):
            validated["report_sections"].append({
                "title": section.get("title", ""),
                "content": section.get("content", ""),
                "level": section.get("level") or section.get("risk_level"),
            })

        for item in data.get("timeline", []):
            validated["timeline"].append({
                "date": item.get("date", ""),
                "event": item.get("event", ""),
                "type": item.get("type", "info"),
                "level": item.get("level", "info"),
            })

        return validated

    def _build_fallback_report(self, raw_content: str, target: str) -> dict:
        return {
            "summary": f"{target} 科创能力评估已完成。由于数据解析异常，报告内容以原始文本形式呈现。",
            "risk_rating": "B",
            "risk_findings": [
                {
                    "label": "综合评估",
                    "level": "medium",
                    "score": 50,
                    "description": "报告数据解析异常，请查看原始报告内容。",
                    "trend": "stable",
                }
            ],
            "report_sections": [
                {
                    "title": "原始分析报告",
                    "content": raw_content[:5000],
                    "level": None,
                }
            ],
            "timeline": [],
        }
