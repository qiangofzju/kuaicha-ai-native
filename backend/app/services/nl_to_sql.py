"""Natural Language to SQL translation service for batch data processing."""

import json
import os
import re
from dataclasses import dataclass, field
from datetime import date
from typing import Any, Literal, Optional

from app.services.schema_router import route_schema_for_query
from app.utils.logger import logger

QueryType = Literal["filter", "export", "derived"]


@dataclass
class NLToSQLResult:
    sql: str
    params: list[Any]
    query_type: QueryType
    description: str
    columns: list[dict]  # [{key, label, type, unit}]
    routing: dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Column definitions catalogue
# ---------------------------------------------------------------------------

ALL_COLUMNS = {
    "name":          {"label": "企业名称",       "type": "text"},
    "short_name":    {"label": "简称",           "type": "text"},
    "city":          {"label": "城市",           "type": "text"},
    "region":        {"label": "省份",           "type": "text"},
    "industry":      {"label": "行业",           "type": "text"},
    "sub_industry":  {"label": "细分行业",       "type": "text"},
    "reg_capital":   {"label": "注册资本",       "type": "number", "unit": "万元"},
    "reg_date":      {"label": "注册日期",       "type": "text"},
    "emp_count":     {"label": "员工人数",       "type": "number", "unit": "人"},
    "legal_rep":     {"label": "法定代表人",     "type": "text"},
    "listing_status":{"label": "上市状态",       "type": "badge"},
    "stock_code":    {"label": "证券代码",       "type": "text"},
    "risk_level":    {"label": "风险等级",       "type": "badge"},
    "credit_code":   {"label": "统一社会信用代码","type": "text"},
    "ai_category":   {"label": "AI方向",         "type": "text"},
    "ai_capability_level": {"label": "AI能力等级", "type": "badge"},
    "model_product": {"label": "AI产品/模型",    "type": "text"},
    "application_domain": {"label": "应用场景",  "type": "text"},
    "snapshot_year": {"label": "口径年份",       "type": "number"},
    "top_shareholder": {"label": "第一大股东",    "type": "text"},
    "shareholder_summary": {"label": "主要股东(Top3)", "type": "text"},
    "court_announcement_count_1y": {"label": "近1年法院公告数", "type": "number", "unit": "条"},
    "latest_court_case_no": {"label": "最新法院公告案号", "type": "text"},
    "operation_risk_count_1y": {"label": "近1年经营风险事件数", "type": "number", "unit": "条"},
    "highest_risk_severity": {"label": "最高风险等级", "type": "badge"},
    # Financial derived column aliases
    "revenue_2024":  {"label": "营收(2024)",     "type": "number", "unit": "万元"},
    "revenue_2023":  {"label": "营收(2023)",     "type": "number", "unit": "万元"},
    "revenue_2022":  {"label": "营收(2022)",     "type": "number", "unit": "万元"},
    "net_profit_2024":{"label": "净利润(2024)",  "type": "number", "unit": "万元"},
    "net_profit_2023":{"label": "净利润(2023)",  "type": "number", "unit": "万元"},
    "net_profit_2022":{"label": "净利润(2022)",  "type": "number", "unit": "万元"},
    "net_margin":    {"label": "净利率(2024)",   "type": "number", "unit": "%"},
    "gross_margin":  {"label": "毛利率(2024)",   "type": "number", "unit": "%"},
    "roe":           {"label": "ROE(2024)",      "type": "number", "unit": "%"},
    "debt_ratio":    {"label": "资产负债率(2024)","type": "number", "unit": "%"},
    "revenue_cagr":  {"label": "营收CAGR(3年)",  "type": "number", "unit": "%"},
    "profit_growth_22_23": {"label": "利润增速(22→23)", "type": "number", "unit": "%"},
    "profit_growth_23_24": {"label": "利润增速(23→24)", "type": "number", "unit": "%"},
    "net_profit_growth_2y": {"label": "净利润两年增长率", "type": "number", "unit": "%"},
    "revenue_growth_2y": {"label": "营收两年增长率", "type": "number", "unit": "%"},
    "industry_rank": {"label": "行业利润排名",   "type": "number"},
    "tags":          {"label": "标签",           "type": "text"},
    "ai_intensity_score": {"label": "AI强度评分", "type": "number"},
    "litigation_count_1y": {"label": "近1年司法公告数", "type": "number", "unit": "条"},
    "high_risk_event_count_1y": {"label": "近1年高风险事件数", "type": "number", "unit": "条"},
    "top1_share_ratio": {"label": "第一大股东持股比例", "type": "number", "unit": "%"},
}


def _col_def(keys: list[str]) -> list[dict]:
    return [{"key": k, **ALL_COLUMNS[k]} for k in keys if k in ALL_COLUMNS]


ALLOWED_QUERY_TYPES: set[str] = {"filter", "export", "derived"}
SQL_RESPONSE_SCHEMA = {
    "type": "object",
    "required": ["sql", "query_type", "description"],
    "properties": {
        "sql": {"type": "string"},
        "query_type": {"type": "string", "enum": sorted(ALLOWED_QUERY_TYPES)},
        "description": {"type": "string"},
        "params": {"type": "array"},
        "selected_tables": {"type": "array", "items": {"type": "string"}},
        "columns": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["key", "label", "type"],
                "properties": {
                    "key": {"type": "string"},
                    "label": {"type": "string"},
                    "type": {"type": "string", "enum": ["text", "number", "badge"]},
                    "unit": {"type": "string"},
                },
            },
        },
    },
}


def _load_batch_system_prompt() -> str:
    prompt_path = os.path.join(
        os.path.dirname(__file__), "..", "agents", "prompts", "batch_processing.md"
    )
    try:
        with open(prompt_path, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        logger.warning("Batch prompt file not found, using fallback system prompt")
        return "你是企业SQL专家。只输出合法JSON。"


def _parse_json_content(content: str) -> dict[str, Any]:
    text = (content or "").strip()
    if "```" in text:
        text = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("`").strip()
    return json.loads(text)


def _normalize_query_type(query_type: str, fallback: str = "filter") -> QueryType:
    normalized = (query_type or "").strip().lower()
    if normalized in ALLOWED_QUERY_TYPES:
        return normalized  # type: ignore[return-value]
    if fallback in ALLOWED_QUERY_TYPES:
        return fallback  # type: ignore[return-value]
    return "filter"


def _is_number_like(field_name: str) -> bool:
    text = (field_name or "").lower()
    return any(
        token in text
        for token in [
            "count",
            "num",
            "amount",
            "revenue",
            "profit",
            "ratio",
            "rate",
            "pct",
            "cagr",
            "score",
            "total",
            "avg",
            "sum",
            "margin",
            "roe",
            "debt",
            "capital",
            "year",
        ]
    )


def _split_projection_clause(select_clause: str) -> list[str]:
    parts: list[str] = []
    buffer: list[str] = []
    bracket_level = 0
    for ch in select_clause:
        if ch == "(":
            bracket_level += 1
        elif ch == ")" and bracket_level > 0:
            bracket_level -= 1

        if ch == "," and bracket_level == 0:
            part = "".join(buffer).strip()
            if part:
                parts.append(part)
            buffer = []
            continue
        buffer.append(ch)

    tail = "".join(buffer).strip()
    if tail:
        parts.append(tail)
    return parts


def _infer_projection_columns(sql: str) -> list[dict]:
    match = re.search(r"select\s+(.*?)\s+from\s", sql, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return []

    projection = match.group(1)
    columns: list[dict] = []
    for expr in _split_projection_clause(projection):
        alias_match = re.search(r"\bas\s+([a-zA-Z_][\w]*)\s*$", expr, flags=re.IGNORECASE)
        if alias_match:
            key = alias_match.group(1)
        else:
            tail = expr.split(".")[-1].strip()
            key = re.sub(r"[^\w]+", "_", tail).strip("_")
        if not key:
            continue

        known = ALL_COLUMNS.get(key)
        if known:
            columns.append({"key": key, **known})
            continue

        col_type = "number" if _is_number_like(key) else "text"
        columns.append({"key": key, "label": key, "type": col_type})
    return columns


def _parse_model_columns(payload: Any) -> list[dict]:
    if not isinstance(payload, list):
        return []
    columns: list[dict] = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        key = str(item.get("key", "")).strip()
        label = str(item.get("label", key)).strip()
        col_type = str(item.get("type", "text")).strip().lower()
        if not key or not label or col_type not in {"text", "number", "badge"}:
            continue
        column: dict[str, Any] = {"key": key, "label": label, "type": col_type}
        if item.get("unit"):
            column["unit"] = str(item["unit"])
        columns.append(column)
    return columns


def _ensure_limit(sql: str, limit: int = 1000) -> str:
    cleaned = (sql or "").strip().rstrip(";").strip()
    if re.search(r"\blimit\s+\d+\b", cleaned, flags=re.IGNORECASE):
        return cleaned
    return f"{cleaned}\nLIMIT {limit}"


def _build_live_prompt(
    query: str,
    scenario: str,
    routing_context: str,
    company_names: Optional[list[str]] = None,
    export_fields: Optional[list[str]] = None,
) -> str:
    lines = [
        "请根据下面的分层 schema 召回结果生成 SQL。",
        "",
        f"用户需求: {query}",
        f"场景: {scenario}",
    ]
    if company_names:
        lines.append(f"指定企业名单(最多前20个): {company_names[:20]}")
    if export_fields:
        lines.append(f"指定导出字段: {export_fields}")
    lines.extend(
        [
            "",
            routing_context,
            "",
            "输出要求：",
            "1. 只输出 JSON，不要 Markdown 或解释文字。",
            "2. 必须包含 sql/query_type/description。",
            "3. 可选输出 columns（用于前端表头）和 selected_tables。",
            "4. SQL 必须是单条 SELECT 语句，并包含 LIMIT。",
        ]
    )
    return "\n".join(lines)


def _attach_routing_trace(
    result: NLToSQLResult,
    query: str,
    scenario: str,
    company_names: Optional[list[str]] = None,
    export_fields: Optional[list[str]] = None,
) -> NLToSQLResult:
    try:
        extra_context = " ".join(
            [*(company_names or []), *(export_fields or [])]
        )
        routing = route_schema_for_query(
            query=query,
            scenario=scenario,
            extra_context=extra_context,
        )
        result.routing = routing.to_trace_dict()
    except Exception as exc:
        logger.warning("Failed to build routing trace in mock translation: %s", exc)
        result.routing = {}
    return result


# ---------------------------------------------------------------------------
# Pattern-based mock translation (no LLM required)
# ---------------------------------------------------------------------------

def _extract_city(text: str) -> Optional[str]:
    city_map = {
        "杭州": "杭州", "宁波": "宁波", "温州": "温州",
        "北京": "北京", "上海": "上海",
        "深圳": "深圳", "广州": "广州", "珠海": "珠海",
        "东莞": "东莞", "宁德": "宁德", "合肥": "合肥",
    }
    for kw, city in city_map.items():
        if kw in text:
            return city
    return None


def _extract_region(text: str) -> Optional[str]:
    region_map = {
        "浙江": "浙江省", "北京": "北京市", "广东": "广东省", "上海": "上海市",
    }
    for kw, region in region_map.items():
        if kw in text:
            return region
    return None


def _extract_industry(text: str) -> Optional[str]:
    industry_map = {
        "科技": "信息技术", "信息技术": "信息技术",
        "人工智能": "信息技术", "ai": "信息技术",
        "互联网": "信息技术", "制造": "制造业",
        "医疗": "医疗健康", "医药": "医疗健康",
        "金融": "金融业", "零售": "零售业",
    }
    for kw, ind in industry_map.items():
        if kw in text:
            return ind
    return None


def _extract_target_year(text: str) -> int:
    """Extract target year from text; default to current year for '今年'."""
    current_year = date.today().year
    text = text or ""

    explicit_match = re.search(r"(20\d{2})\s*年", text)
    if explicit_match:
        return int(explicit_match.group(1))

    if "去年" in text:
        return current_year - 1
    if "前年" in text:
        return current_year - 2
    if "今年" in text or "本年" in text:
        return current_year
    return current_year


def _contains_ai_intent(text: str) -> bool:
    lowered = (text or "").lower()
    return (
        "人工智能" in (text or "")
        or "大模型" in (text or "")
        or "智能体" in (text or "")
        or "ai" in lowered
    )


def _extract_company_names_from_query(text: str) -> list[str]:
    """Extract explicit company names from natural language query text."""
    if not text:
        return []

    segment = text
    focus_match = re.search(r"(?:导出|帮我导出|请导出)(.+?)的", text)
    if focus_match:
        segment = focus_match.group(1).strip()

    has_list_pattern = re.search(
        r"[\u4e00-\u9fffA-Za-z0-9]{2,24}\s*(?:,|，|、|;|；|和|及|以及|与)\s*[\u4e00-\u9fffA-Za-z0-9]{2,24}",
        segment,
    )
    if not has_list_pattern:
        return []

    # Common separators in Chinese requirement text.
    pieces = re.split(r"[，,、；;\n]+|和|以及|及|与", segment)
    names: list[str] = []
    blocked = {"企业", "公司", "名单", "导出", "字段", "信息", "数据"}
    for piece in pieces:
        item = piece.strip(" ：:。？！? ")
        if not item or item in blocked:
            continue
        # Keep tokens that look like names (Chinese/word chars, short-to-medium length).
        if 2 <= len(item) <= 32 and re.search(r"[\u4e00-\u9fffA-Za-z0-9]", item):
            names.append(item)

    deduped: list[str] = []
    seen: set[str] = set()
    for name in names:
        if name in seen:
            continue
        seen.add(name)
        deduped.append(name)
    return deduped[:30]


EXPORT_FIELD_KEYWORDS = {
    "name": ["企业名称", "公司名称", "名称", "name"],
    "short_name": ["简称", "short_name"],
    "city": ["城市", "city"],
    "region": ["省份", "地区", "region"],
    "industry": ["行业", "industry"],
    "sub_industry": ["细分行业", "子行业"],
    "reg_capital": ["注册资本", "资本"],
    "reg_date": ["成立日期", "注册日期"],
    "emp_count": ["员工人数", "人数", "员工"],
    "legal_rep": ["法定代表人", "法人"],
    "credit_code": ["统一社会信用代码", "信用代码"],
    "listing_status": ["上市状态", "是否上市"],
    "stock_code": ["证券代码", "股票代码"],
    "risk_level": ["风险等级", "风险级别"],
    "revenue_2024": ["营收", "营业收入", "收入"],
    "net_profit_2024": ["净利润", "利润"],
    "net_margin": ["净利率", "利润率"],
    "gross_margin": ["毛利率"],
    "roe": ["roe", "净资产收益率"],
    "debt_ratio": ["资产负债率", "负债率"],
    "tags": ["标签", "资质", "荣誉", "高新", "专精特新"],
    "ai_category": ["ai方向", "人工智能方向", "技术方向", "赛道"],
    "ai_capability_level": ["ai能力等级", "能力等级", "等级"],
    "model_product": ["模型", "模型产品", "产品名称", "大模型"],
    "application_domain": ["应用场景", "业务场景"],
    "snapshot_year": ["年份", "口径年份"],
    "top_shareholder": ["第一大股东", "最大股东", "控股股东"],
    "shareholder_summary": ["股东", "主要股东", "股东结构"],
    "court_announcement_count_1y": ["法院公告数", "司法公告数", "开庭公告数", "法院公告", "司法公告"],
    "latest_court_case_no": ["最新法院公告", "最新案号", "案号", "法院公告信息"],
    "operation_risk_count_1y": ["经营风险数", "风险事件数", "风险次数"],
    "highest_risk_severity": ["最高风险等级", "风险最高等级"],
}

DERIVED_METRIC_KEYWORDS = {
    "revenue_cagr": ["cagr", "复合增长", "复合增长率", "营收cagr"],
    "revenue_growth_2y": ["营收增长率", "收入增长率", "营收两年增长"],
    "net_profit_growth_2y": ["净利润增长率", "利润增长率", "净利润两年增长"],
    "profit_growth_22_23": ["22到23利润增量", "22-23利润增量", "2023较2022利润增量"],
    "profit_growth_23_24": ["23到24利润增量", "23-24利润增量", "2024较2023利润增量"],
    "net_margin": ["净利率"],
    "gross_margin": ["毛利率"],
    "roe": ["roe", "净资产收益率"],
    "debt_ratio": ["资产负债率", "负债率"],
    "litigation_count_1y": ["司法公告数", "法院公告数", "诉讼公告数"],
    "high_risk_event_count_1y": ["高风险事件数", "高风险次数", "重大风险次数"],
    "top1_share_ratio": ["第一大股东持股比例", "top1持股比例", "股权集中度"],
    "ai_intensity_score": ["ai强度", "智能化强度", "ai能力评分"],
}


def _extract_requested_export_fields(query: str, explicit_fields: Optional[list[str]] = None) -> list[str]:
    """Resolve requested export fields from explicit params + natural language."""
    resolved: list[str] = []
    seen: set[str] = set()

    for field in explicit_fields or []:
        key = str(field).strip()
        if key in EXPORT_FIELD_KEYWORDS and key not in seen:
            seen.add(key)
            resolved.append(key)

    text = (query or "").lower()
    for key, keywords in EXPORT_FIELD_KEYWORDS.items():
        if key in seen:
            continue
        if any(kw.lower() in text for kw in keywords):
            seen.add(key)
            resolved.append(key)

    if not resolved:
        resolved = ["name", "short_name", "city", "industry", "reg_capital", "legal_rep"]
    return resolved


def _extract_requested_derived_metrics(query: str) -> list[str]:
    metrics: list[str] = []
    seen: set[str] = set()
    text = (query or "").lower()

    for key, keywords in DERIVED_METRIC_KEYWORDS.items():
        if any(kw.lower() in text for kw in keywords):
            seen.add(key)
            metrics.append(key)

    if not metrics:
        metrics = [
            "revenue_cagr",
            "net_profit_growth_2y",
            "net_margin",
            "roe",
            "debt_ratio",
        ]
    return metrics


# ---------------------------------------------------------------------------
# SQL Templates
# ---------------------------------------------------------------------------

def _build_profit_growth_sql(city: Optional[str], region: Optional[str],
                              industry: Optional[str]) -> tuple[str, list, list]:
    """场景 1-A: 净利润持续增长企业名单"""
    wheres = [
        "f22.net_profit IS NOT NULL",
        "f23.net_profit > f22.net_profit",
        "f24.net_profit > f23.net_profit",
        "f24.net_profit > 0",
    ]
    params: list[Any] = []

    if city:
        wheres.append("c.city = ?")
        params.append(city)
    elif region:
        wheres.append("c.region = ?")
        params.append(region)
    if industry:
        wheres.append("c.industry = ?")
        params.append(industry)

    where_clause = " AND ".join(wheres)
    sql = f"""
SELECT c.name, c.short_name, c.city, c.industry,
       f22.net_profit AS net_profit_2022,
       f23.net_profit AS net_profit_2023,
       f24.net_profit AS net_profit_2024,
       ROUND(f24.net_margin, 1) AS net_margin,
       c.risk_level
FROM companies c
JOIN financials f22 ON f22.company_id = c.id AND f22.year = 2022
JOIN financials f23 ON f23.company_id = c.id AND f23.year = 2023
JOIN financials f24 ON f24.company_id = c.id AND f24.year = 2024
WHERE {where_clause}
ORDER BY f24.net_profit DESC
LIMIT 100
""".strip()

    columns = _col_def([
        "name", "short_name", "city", "industry",
        "net_profit_2022", "net_profit_2023", "net_profit_2024",
        "net_margin", "risk_level",
    ])
    return sql, params, columns


def _build_revenue_growth_sql(city: Optional[str], region: Optional[str],
                               industry: Optional[str]) -> tuple[str, list, list]:
    """场景 1-B: 营收增长企业名单"""
    wheres = [
        "f23.revenue > f22.revenue",
        "f24.revenue > f23.revenue",
    ]
    params: list[Any] = []

    if city:
        wheres.append("c.city = ?")
        params.append(city)
    elif region:
        wheres.append("c.region = ?")
        params.append(region)
    if industry:
        wheres.append("c.industry = ?")
        params.append(industry)

    where_clause = " AND ".join(wheres)
    sql = f"""
SELECT c.name, c.short_name, c.city, c.industry,
       f22.revenue AS revenue_2022,
       f23.revenue AS revenue_2023,
       f24.revenue AS revenue_2024,
       ROUND(f24.gross_margin, 1) AS gross_margin,
       c.listing_status
FROM companies c
JOIN financials f22 ON f22.company_id = c.id AND f22.year = 2022
JOIN financials f23 ON f23.company_id = c.id AND f23.year = 2023
JOIN financials f24 ON f24.company_id = c.id AND f24.year = 2024
WHERE {where_clause}
ORDER BY f24.revenue DESC
LIMIT 100
""".strip()

    columns = _col_def([
        "name", "short_name", "city", "industry",
        "revenue_2022", "revenue_2023", "revenue_2024",
        "gross_margin", "listing_status",
    ])
    return sql, params, columns


def _build_export_sql(
    company_names: list[str],
    requested_fields: list[str],
    city: Optional[str] = None,
    region: Optional[str] = None,
    industry: Optional[str] = None,
    query_text: str = "",
    target_year: Optional[int] = None,
) -> tuple[str, list[Any], list[dict]]:
    """场景 2: 指定企业名单 + 指定字段结构化导出."""
    field_expr_map: dict[str, str] = {
        "name": "c.name",
        "short_name": "c.short_name",
        "city": "c.city",
        "region": "c.region",
        "industry": "c.industry",
        "sub_industry": "c.sub_industry",
        "reg_capital": "c.reg_capital",
        "reg_date": "c.reg_date",
        "emp_count": "c.emp_count",
        "legal_rep": "c.legal_rep",
        "credit_code": "c.credit_code",
        "listing_status": "c.listing_status",
        "stock_code": "c.stock_code",
        "risk_level": "c.risk_level",
        "revenue_2024": "f24.revenue AS revenue_2024",
        "net_profit_2024": "f24.net_profit AS net_profit_2024",
        "net_margin": "ROUND(f24.net_margin, 1) AS net_margin",
        "gross_margin": "ROUND(f24.gross_margin, 1) AS gross_margin",
        "roe": "ROUND(f24.roe, 1) AS roe",
        "debt_ratio": "ROUND(f24.debt_ratio, 1) AS debt_ratio",
        "tags": "GROUP_CONCAT(DISTINCT ct.tag_value) AS tags",
        "ai_category": (
            "(SELECT ai.ai_category FROM company_ai_profiles ai "
            "WHERE ai.company_id = c.id ORDER BY ai.snapshot_year DESC LIMIT 1) AS ai_category"
        ),
        "ai_capability_level": (
            "(SELECT ai.ai_capability_level FROM company_ai_profiles ai "
            "WHERE ai.company_id = c.id ORDER BY ai.snapshot_year DESC LIMIT 1) AS ai_capability_level"
        ),
        "model_product": (
            "(SELECT ai.model_product FROM company_ai_profiles ai "
            "WHERE ai.company_id = c.id ORDER BY ai.snapshot_year DESC LIMIT 1) AS model_product"
        ),
        "application_domain": (
            "(SELECT ai.application_domain FROM company_ai_profiles ai "
            "WHERE ai.company_id = c.id ORDER BY ai.snapshot_year DESC LIMIT 1) AS application_domain"
        ),
        "snapshot_year": (
            "(SELECT ai.snapshot_year FROM company_ai_profiles ai "
            "WHERE ai.company_id = c.id ORDER BY ai.snapshot_year DESC LIMIT 1) AS snapshot_year"
        ),
        "top_shareholder": (
            "(SELECT sh.holder_name FROM company_shareholders sh "
            "WHERE sh.company_id = c.id ORDER BY sh.report_year DESC, sh.share_ratio DESC LIMIT 1) AS top_shareholder"
        ),
        "shareholder_summary": (
            "(SELECT GROUP_CONCAT(holder_name || ':' || printf('%.1f', share_ratio) || '%', '；') "
            " FROM (SELECT holder_name, share_ratio FROM company_shareholders sh2 "
            "       WHERE sh2.company_id = c.id ORDER BY sh2.report_year DESC, sh2.share_ratio DESC LIMIT 3)"
            ") AS shareholder_summary"
        ),
        "court_announcement_count_1y": (
            "(SELECT COUNT(1) FROM court_announcements ca "
            "WHERE ca.company_id = c.id AND ca.announcement_date >= date('now', '-365 day')) AS court_announcement_count_1y"
        ),
        "latest_court_case_no": (
            "(SELECT ca.case_no FROM court_announcements ca "
            "WHERE ca.company_id = c.id ORDER BY ca.announcement_date DESC LIMIT 1) AS latest_court_case_no"
        ),
        "operation_risk_count_1y": (
            "(SELECT COUNT(1) FROM operation_risk_events oe "
            "WHERE oe.company_id = c.id AND oe.event_date >= date('now', '-365 day')) AS operation_risk_count_1y"
        ),
        "highest_risk_severity": (
            "(SELECT oe.severity FROM operation_risk_events oe WHERE oe.company_id = c.id "
            "ORDER BY CASE oe.severity WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC, oe.event_date DESC LIMIT 1) AS highest_risk_severity"
        ),
    }
    normalized_fields = [f for f in requested_fields if f in field_expr_map]
    if "name" not in normalized_fields:
        normalized_fields.insert(0, "name")

    select_fields = [field_expr_map[f] for f in normalized_fields]
    joins: list[str] = []

    if any(f in normalized_fields for f in ["revenue_2024", "net_profit_2024", "net_margin", "gross_margin", "roe", "debt_ratio"]):
        joins.append("LEFT JOIN financials f24 ON f24.company_id = c.id AND f24.year = 2024")
    if "tags" in normalized_fields:
        joins.append("LEFT JOIN company_tags ct ON ct.company_id = c.id")

    params: list[Any] = []
    where_clauses: list[str] = []
    if company_names:
        pair_clauses: list[str] = []
        for name in company_names:
            pair_clauses.append("(c.name = ? OR c.short_name = ?)")
            params.extend([name, name])
        where_clauses.append("(" + " OR ".join(pair_clauses) + ")")
    else:
        if city:
            where_clauses.append("c.city = ?")
            params.append(city)
        elif region:
            where_clauses.append("c.region = ?")
            params.append(region)
        if industry:
            where_clauses.append("c.industry = ?")
            params.append(industry)

        text = (query_text or "").lower()
        if any(token in text for token in ["高新技术", "高新", "国家高新"]):
            where_clauses.append(
                "EXISTS (SELECT 1 FROM company_tags ct2 "
                "WHERE ct2.company_id = c.id AND ct2.tag_value LIKE '%高新%')"
            )
        if _contains_ai_intent(query_text):
            year_filter = target_year or date.today().year
            where_clauses.append(
                "EXISTS (SELECT 1 FROM company_ai_profiles ap2 "
                "WHERE ap2.company_id = c.id AND ap2.is_key_ai_enterprise = 1 AND ap2.snapshot_year = ?)"
            )
            params.append(year_filter)

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    group_sql = "GROUP BY c.id" if "tags" in normalized_fields else ""
    sql = f"""
SELECT {", ".join(select_fields)}
FROM companies c
{" ".join(joins)}
{where_sql}
{group_sql}
ORDER BY c.city, c.industry, c.name
LIMIT 500
""".strip()

    columns = _col_def(normalized_fields)
    return sql, params, columns


def _build_derived_sql(
    city: Optional[str],
    region: Optional[str],
    industry: Optional[str],
    requested_metrics: list[str],
    query_text: str = "",
    target_year: Optional[int] = None,
) -> tuple[str, list[Any], list[dict]]:
    """场景 3: 按需求生成多表衍生指标导出."""
    wheres = ["f22.revenue > 0"]
    params: list[Any] = []

    if city:
        wheres.append("c.city = ?")
        params.append(city)
    elif region:
        wheres.append("c.region = ?")
        params.append(region)
    if industry:
        wheres.append("c.industry = ?")
        params.append(industry)

    if _contains_ai_intent(query_text):
        wheres.append(
            "EXISTS (SELECT 1 FROM company_ai_profiles ap2 "
            "WHERE ap2.company_id = c.id AND ap2.is_key_ai_enterprise = 1 AND ap2.snapshot_year = ?)"
        )
        params.append(target_year or date.today().year)

    metric_expr_map: dict[str, str] = {
        "revenue_cagr": "ROUND((POWER(f24.revenue / f22.revenue, 0.5) - 1) * 100, 1) AS revenue_cagr",
        "revenue_growth_2y": "ROUND(((f24.revenue - f22.revenue) / f22.revenue) * 100, 1) AS revenue_growth_2y",
        "net_profit_growth_2y": (
            "ROUND(((f24.net_profit - f22.net_profit) / CASE WHEN ABS(f22.net_profit) < 0.0001 THEN NULL ELSE ABS(f22.net_profit) END) * 100, 1) AS net_profit_growth_2y"
        ),
        "profit_growth_22_23": "ROUND(f23.net_profit - f22.net_profit, 0) AS profit_growth_22_23",
        "profit_growth_23_24": "ROUND(f24.net_profit - f23.net_profit, 0) AS profit_growth_23_24",
        "net_margin": "ROUND(f24.net_margin, 1) AS net_margin",
        "gross_margin": "ROUND(f24.gross_margin, 1) AS gross_margin",
        "roe": "ROUND(f24.roe, 1) AS roe",
        "debt_ratio": "ROUND(f24.debt_ratio, 1) AS debt_ratio",
        "litigation_count_1y": (
            "(SELECT COUNT(1) FROM court_announcements ca "
            "WHERE ca.company_id = c.id AND ca.announcement_date >= date('now', '-365 day')) AS litigation_count_1y"
        ),
        "high_risk_event_count_1y": (
            "(SELECT COUNT(1) FROM operation_risk_events oe WHERE oe.company_id = c.id "
            "AND oe.severity = 'high' AND oe.event_date >= date('now', '-365 day')) AS high_risk_event_count_1y"
        ),
        "top1_share_ratio": (
            "(SELECT ROUND(sh.share_ratio, 1) FROM company_shareholders sh "
            "WHERE sh.company_id = c.id ORDER BY sh.report_year DESC, sh.share_ratio DESC LIMIT 1) AS top1_share_ratio"
        ),
        "ai_intensity_score": (
            "(SELECT CASE ai.ai_capability_level "
            "WHEN 'L5' THEN 95 WHEN 'L4' THEN 85 WHEN 'L3' THEN 72 WHEN 'L2' THEN 58 ELSE 40 END "
            "FROM company_ai_profiles ai WHERE ai.company_id = c.id ORDER BY ai.snapshot_year DESC LIMIT 1) AS ai_intensity_score"
        ),
    }
    selected_metrics = [metric for metric in requested_metrics if metric in metric_expr_map]
    if not selected_metrics:
        selected_metrics = ["revenue_cagr", "net_profit_growth_2y", "net_margin", "roe", "debt_ratio"]

    where_clause = " AND ".join(wheres)
    base_fields = ["c.name", "c.city", "c.industry", "f22.revenue AS revenue_2022", "f24.revenue AS revenue_2024"]
    metric_fields = [metric_expr_map[m] for m in selected_metrics]
    order_key = selected_metrics[0]

    sql = f"""
SELECT {", ".join(base_fields + metric_fields)},
       c.risk_level
FROM companies c
JOIN financials f22 ON f22.company_id = c.id AND f22.year = 2022
JOIN financials f23 ON f23.company_id = c.id AND f23.year = 2023
JOIN financials f24 ON f24.company_id = c.id AND f24.year = 2024
WHERE {where_clause}
ORDER BY {order_key} DESC
LIMIT 100
""".strip()

    columns = _col_def([
        "name", "city", "industry",
        "revenue_2022", "revenue_2024", *selected_metrics,
        "risk_level",
    ])
    return sql, params, columns


def _build_hightech_sql(city: Optional[str], region: Optional[str]) -> tuple[str, list, list]:
    """场景 1-C: 高新技术企业名单"""
    wheres = ["ct.tag_value LIKE '%高新技术%'"]
    params: list[Any] = []

    if city:
        wheres.append("c.city = ?")
        params.append(city)
    elif region:
        wheres.append("c.region = ?")
        params.append(region)

    where_clause = " AND ".join(wheres)
    sql = f"""
SELECT DISTINCT c.name, c.short_name, c.city, c.industry,
       ct.tag_value AS tags, ct.issued_year,
       f24.revenue AS revenue_2024,
       f24.net_profit AS net_profit_2024,
       c.listing_status, c.risk_level
FROM companies c
JOIN company_tags ct ON ct.company_id = c.id
LEFT JOIN financials f24 ON f24.company_id = c.id AND f24.year = 2024
WHERE {where_clause}
ORDER BY f24.net_profit DESC
LIMIT 100
""".strip()

    columns = _col_def([
        "name", "short_name", "city", "industry", "tags",
        "revenue_2024", "net_profit_2024", "listing_status", "risk_level",
    ])
    return sql, params, columns


def _build_ai_company_sql(
    city: Optional[str], region: Optional[str], target_year: int
) -> tuple[str, list[Any], list[dict]]:
    """场景 1-E: 人工智能企业名单（按年份快照）"""
    wheres = [
        "ap.snapshot_year = ?",
        "ap.is_key_ai_enterprise = 1",
    ]
    params: list[Any] = [target_year]

    if city:
        wheres.append("c.city = ?")
        params.append(city)
    elif region:
        wheres.append("c.region = ?")
        params.append(region)

    where_clause = " AND ".join(wheres)
    sql = f"""
SELECT c.name, c.short_name, c.city, c.industry,
       ap.ai_category,
       ap.ai_capability_level,
       ap.model_product,
       ap.application_domain,
       ap.snapshot_year
FROM companies c
JOIN company_ai_profiles ap ON ap.company_id = c.id
WHERE {where_clause}
ORDER BY
    CASE ap.ai_capability_level
        WHEN 'L5' THEN 5
        WHEN 'L4' THEN 4
        WHEN 'L3' THEN 3
        WHEN 'L2' THEN 2
        ELSE 1
    END DESC,
    c.name ASC
LIMIT 200
""".strip()

    columns = _col_def([
        "name", "short_name", "city", "industry",
        "ai_category", "ai_capability_level", "model_product",
        "application_domain", "snapshot_year",
    ])
    return sql, params, columns


def _build_listed_sql(city: Optional[str], region: Optional[str],
                      industry: Optional[str]) -> tuple[str, list, list]:
    """场景 1-D: 上市企业名单"""
    wheres = ["c.listing_status = 'listed'"]
    params: list[Any] = []

    if city:
        wheres.append("c.city = ?")
        params.append(city)
    elif region:
        wheres.append("c.region = ?")
        params.append(region)
    if industry:
        wheres.append("c.industry = ?")
        params.append(industry)

    where_clause = " AND ".join(wheres)
    sql = f"""
SELECT c.name, c.short_name, c.city, c.industry, c.stock_code,
       f24.revenue AS revenue_2024, f24.net_profit AS net_profit_2024,
       ROUND(f24.roe, 1) AS roe, c.risk_level
FROM companies c
LEFT JOIN financials f24 ON f24.company_id = c.id AND f24.year = 2024
WHERE {where_clause}
ORDER BY f24.net_profit DESC
LIMIT 100
""".strip()

    columns = _col_def([
        "name", "short_name", "city", "industry", "stock_code",
        "revenue_2024", "net_profit_2024", "roe", "risk_level",
    ])
    return sql, params, columns


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def translate_mock(
    query: str,
    scenario: str = "filter",
    company_names: Optional[list[str]] = None,
    export_fields: Optional[list[str]] = None,
) -> NLToSQLResult:
    """Keyword-based NL→SQL (no LLM required, used in mock/demo mode)."""
    city = _extract_city(query)
    region = _extract_region(query) if not city else None
    industry = _extract_industry(query)
    target_year = _extract_target_year(query)
    requested_company_names = list(company_names or [])
    if scenario == "export" and not requested_company_names:
        requested_company_names = _extract_company_names_from_query(query)

    # --- Scenario 2: structured export ---
    if scenario == "export":
        requested_fields = _extract_requested_export_fields(query, export_fields)
        sql, params, columns = _build_export_sql(
            requested_company_names,
            requested_fields,
            city=city,
            region=region,
            industry=industry,
            query_text=query,
            target_year=target_year,
        )
        if requested_company_names:
            desc = (
                f"按企业名单导出 {len(requested_company_names)} 家企业的结构化字段："
                + "、".join([ALL_COLUMNS[k]["label"] for k in requested_fields[:6] if k in ALL_COLUMNS])
            )
        else:
            desc = (
                "按自然语言条件导出结构化字段："
                + "、".join([ALL_COLUMNS[k]["label"] for k in requested_fields[:6] if k in ALL_COLUMNS])
            )
        return _attach_routing_trace(NLToSQLResult(
            sql=sql, params=params, query_type="export",
            description=desc, columns=columns,
        ), query, scenario, requested_company_names, export_fields)

    # --- Scenario 3: derived fields ---
    if scenario == "derived" or any(kw in query for kw in ["CAGR", "cagr", "复合增长", "衍生", "加工"]):
        requested_metrics = _extract_requested_derived_metrics(query)
        sql, params, columns = _build_derived_sql(
            city, region, industry, requested_metrics, query_text=query, target_year=target_year
        )
        location_desc = city or (region.replace("省", "").replace("市", "") if region else "全国")
        return _attach_routing_trace(NLToSQLResult(
            sql=sql, params=params, query_type="derived",
            description=(
                f"计算{location_desc}企业衍生指标："
                + "、".join([ALL_COLUMNS[k]["label"] for k in requested_metrics if k in ALL_COLUMNS][:6])
            ),
            columns=columns,
        ), query, scenario, requested_company_names, export_fields)

    # --- Scenario 1: filter ---
    location_desc = city or (region.replace("省", "").replace("市", "") if region else "全国")

    if _contains_ai_intent(query):
        sql, params, columns = _build_ai_company_sql(city, region, target_year)
        return _attach_routing_trace(NLToSQLResult(
            sql=sql, params=params, query_type="filter",
            description=f"筛选{location_desc}{target_year}年人工智能企业名单",
            columns=columns,
        ), query, scenario, requested_company_names, export_fields)

    if any(kw in query for kw in ["高新技术", "高新", "国家高新"]):
        sql, params, columns = _build_hightech_sql(city, region)
        return _attach_routing_trace(NLToSQLResult(
            sql=sql, params=params, query_type="filter",
            description=f"筛选{location_desc}地区国家高新技术企业名单",
            columns=columns,
        ), query, scenario, requested_company_names, export_fields)

    if any(kw in query for kw in ["上市", "A股", "港股", "纽交所"]):
        sql, params, columns = _build_listed_sql(city, region, industry)
        return _attach_routing_trace(NLToSQLResult(
            sql=sql, params=params, query_type="filter",
            description=f"筛选{location_desc}地区上市企业名单",
            columns=columns,
        ), query, scenario, requested_company_names, export_fields)

    if any(kw in query for kw in ["营收", "收入", "营业收入"]):
        sql, params, columns = _build_revenue_growth_sql(city, region, industry)
        return _attach_routing_trace(NLToSQLResult(
            sql=sql, params=params, query_type="filter",
            description=f"筛选{location_desc}地区近3年营业收入持续增长的企业名单",
            columns=columns,
        ), query, scenario, requested_company_names, export_fields)

    # Default: net profit growth
    sql, params, columns = _build_profit_growth_sql(city, region, industry)
    profit_desc = "净利润持续增长" if any(kw in query for kw in ["净利润", "利润", "盈利"]) else "净利润持续增长"
    return _attach_routing_trace(NLToSQLResult(
        sql=sql, params=params, query_type="filter",
        description=f"筛选{location_desc}地区近3年{profit_desc}的企业名单",
        columns=columns,
    ), query, scenario, requested_company_names, export_fields)


async def translate_live(
    query: str,
    scenario: str = "filter",
    company_names: Optional[list[str]] = None,
    export_fields: Optional[list[str]] = None,
    driver=None,
    system_prompt: Optional[str] = None,
) -> NLToSQLResult:
    """LLM-based NL→SQL translation (live mode). Falls back to mock on error."""
    if driver is None:
        return translate_mock(query, scenario, company_names, export_fields)

    requested_company_names = list(company_names or [])
    if scenario == "export" and not requested_company_names:
        requested_company_names = _extract_company_names_from_query(query)
    requested_export_fields = (
        _extract_requested_export_fields(query, export_fields)
        if scenario == "export"
        else list(export_fields or [])
    )

    extra_context = " ".join([*requested_company_names, *requested_export_fields])
    routing = route_schema_for_query(
        query=query,
        scenario=scenario,
        extra_context=extra_context,
    )
    prompt = _build_live_prompt(
        query=query,
        scenario=scenario,
        routing_context=routing.schema_context,
        company_names=requested_company_names,
        export_fields=requested_export_fields,
    )
    final_system_prompt = system_prompt or _load_batch_system_prompt()

    try:
        response = await driver.call(
            prompt=prompt,
            system=final_system_prompt,
            json_schema=SQL_RESPONSE_SCHEMA,
        )
        data = _parse_json_content(response.content)
        sql = _ensure_limit(str(data.get("sql", "")), limit=1000)
        query_type = _normalize_query_type(str(data.get("query_type", "")), fallback=scenario)
        description = str(data.get("description", "")).strip() or query
        model_columns = _parse_model_columns(data.get("columns"))

        params = data.get("params", [])
        if not isinstance(params, list):
            params = []
        params = list(params)

        # Require single-statement SELECT and keep placeholders consistent.
        if "?" in sql and len(params) != sql.count("?"):
            logger.warning("SQL placeholders and params mismatch, falling back to mock")
            fallback = translate_mock(query, scenario, requested_company_names, requested_export_fields)
            fallback.routing = routing.to_trace_dict()
            return fallback

        if not _is_safe_sql(sql):
            logger.warning("LLM generated unsafe SQL, falling back to mock")
            fallback = translate_mock(query, scenario, requested_company_names, requested_export_fields)
            fallback.routing = routing.to_trace_dict()
            return fallback

        columns = model_columns or _infer_projection_columns(sql)
        if not columns:
            if query_type == "derived":
                columns = _col_def(["name", "city", "industry", "revenue_cagr", "net_margin", "roe"])
            elif query_type == "export":
                columns = _col_def(["name", "city", "industry", "reg_capital", "emp_count", "listing_status"])
            else:
                columns = _col_def(["name", "city", "industry", "net_profit_2024", "risk_level"])

        return NLToSQLResult(
            sql=sql, params=params,
            query_type=query_type, description=description, columns=columns,
            routing=routing.to_trace_dict(),
        )

    except Exception as e:
        logger.warning("LLM SQL translation failed (%s), falling back to mock", e)
        fallback = translate_mock(query, scenario, requested_company_names, requested_export_fields)
        fallback.routing = routing.to_trace_dict()
        return fallback


def _is_safe_sql(sql: str) -> bool:
    """Validate that SQL is a safe SELECT-only statement."""
    sql_clean = (sql or "").strip()
    if not sql_clean:
        return False

    # Keep a single SQL statement (allow optional trailing semicolon).
    semi_index = sql_clean.find(";")
    if semi_index != -1 and semi_index != len(sql_clean) - 1:
        return False
    sql_upper = sql_clean.rstrip(";").upper().strip()
    if not (sql_upper.startswith("SELECT") or sql_upper.startswith("WITH")):
        return False
    dangerous = ["DROP", "DELETE", "INSERT", "UPDATE", "ALTER", "CREATE", "TRUNCATE", "ATTACH"]
    for keyword in dangerous:
        if re.search(r"\b" + keyword + r"\b", sql_upper):
            return False
    return True


def execute_query(
    sql: str, params: list[Any]
) -> tuple[list[dict], int]:
    """Execute SQL against the database. Returns (rows, total_count)."""
    from app.db.database import get_db_connection

    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        rows = [dict(row) for row in cur.fetchall()]
        return rows, len(rows)
    finally:
        conn.close()


def compute_stats(rows: list[dict], numeric_keys: list[str]) -> dict:
    """Compute basic descriptive stats for numeric columns."""
    if not rows or not numeric_keys:
        return {"count": len(rows)}

    stats: dict[str, Any] = {"count": len(rows)}
    for key in numeric_keys:
        values = [r[key] for r in rows if r.get(key) is not None]
        if values:
            stats[f"avg_{key}"] = round(sum(values) / len(values), 1)
            stats[f"max_{key}"] = max(values)
            stats[f"min_{key}"] = min(values)
            sorted_v = sorted(values)
            mid = len(sorted_v) // 2
            stats[f"median_{key}"] = (
                sorted_v[mid] if len(sorted_v) % 2 else
                (sorted_v[mid - 1] + sorted_v[mid]) / 2
            )
    return stats
