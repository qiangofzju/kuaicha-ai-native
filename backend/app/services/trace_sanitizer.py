"""Sanitization helpers for streaming agent trace events."""

from __future__ import annotations

import math
import re
from typing import Any

MAX_TRACE_DETAIL_LEN = 180

_CODE_BLOCK_RE = re.compile(r"```[\s\S]*?```", re.MULTILINE)
_INLINE_CODE_RE = re.compile(r"`[^`]+`")
_SQL_HINT_RE = re.compile(r"\b(select|with|from|join|where|group by|order by|limit)\b", re.IGNORECASE)
_CASE_NO_RE = re.compile(r"\(\d{4}\)[^\s]{2,32}号")
_CREDIT_CODE_RE = re.compile(r"\b[0-9A-Z]{18}\b")
_STOCK_CODE_RE = re.compile(r"\b\d{6}\b")
_ENTERPRISE_RE = re.compile(
    r"[\u4e00-\u9fffA-Za-z0-9()（）·\-]{2,48}"
    r"(?:股份有限公司|有限责任公司|集团有限公司|有限公司|集团|公司)"
)
_PERSON_CTX_RE = re.compile(r"(法定代表人|法人|实控人|负责人)\s*[:：]?\s*[\u4e00-\u9fffA-Za-z·]{2,12}")
_MULTI_SPACE_RE = re.compile(r"\s+")
_PARENS_VALUE_RE = re.compile(r"\(([^)]+)\)")

_ALLOWED_NUMERIC_METRICS = {
    "matched_rows",
    "selected_table_count",
    "selected_category_count",
    "processed_fields",
    "missing_fields_filled",
    "preview_rows",
    "duration_ms",
    "duration_sec",
    "fallback_used",
}


def _truncate(text: str, max_len: int = MAX_TRACE_DETAIL_LEN) -> str:
    clean = (text or "").strip()
    if len(clean) <= max_len:
        return clean
    return clean[: max_len - 1].rstrip() + "…"


def sanitize_trace_text(text: str) -> str:
    """Return sanitized trace detail text for UI streaming."""
    normalized = (text or "").strip()
    if not normalized:
        return ""

    normalized = _CODE_BLOCK_RE.sub("[代码片段已脱敏]", normalized)
    normalized = _INLINE_CODE_RE.sub("[代码片段]", normalized)

    if _SQL_HINT_RE.search(normalized):
        return _truncate(build_safe_sql_summary(normalized))

    normalized = _CASE_NO_RE.sub("[案号]", normalized)
    normalized = _CREDIT_CODE_RE.sub("[统一社会信用代码]", normalized)
    normalized = _STOCK_CODE_RE.sub("[证券代码]", normalized)
    normalized = _ENTERPRISE_RE.sub("[企业]", normalized)
    normalized = _PERSON_CTX_RE.sub(r"\1:[人员]", normalized)

    normalized = _MULTI_SPACE_RE.sub(" ", normalized).strip()
    return _truncate(normalized)


def build_safe_sql_summary(sql: str) -> str:
    """Build a safe SQL planning summary without leaking raw SQL."""
    text = (sql or "").strip()
    if not text:
        return "SQL 规划完成：已生成安全查询摘要。"

    compact = _MULTI_SPACE_RE.sub(" ", text)
    upper = compact.upper()

    statement_type = "单条查询"
    join_count = len(re.findall(r"\bJOIN\b", upper))
    has_where = bool(re.search(r"\bWHERE\b", upper))
    has_group_by = bool(re.search(r"\bGROUP\s+BY\b", upper))
    has_limit = bool(re.search(r"\bLIMIT\s+\d+\b", upper))

    clauses: list[str] = [statement_type]
    clauses.append(f"{join_count} 个关联" if join_count > 0 else "无显式关联")
    clauses.append("有条件过滤" if has_where else "无条件过滤")
    if has_group_by:
        clauses.append("含聚合分组")
    clauses.append("包含 LIMIT" if has_limit else "未检测到 LIMIT")

    return "SQL 规划完成：" + "，".join(clauses) + "。"


def sanitize_metrics(payload: dict[str, Any]) -> dict[str, Any]:
    """Keep only safe, bounded metrics for trace events."""
    if not isinstance(payload, dict):
        return {}

    cleaned: dict[str, Any] = {}
    for key, value in payload.items():
        if key not in _ALLOWED_NUMERIC_METRICS:
            continue
        if isinstance(value, bool):
            cleaned[key] = value
            continue
        if isinstance(value, (int, float)):
            if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
                continue
            bounded = max(min(float(value), 1_000_000_000), -1_000_000_000)
            cleaned[key] = int(bounded) if float(bounded).is_integer() else round(bounded, 4)
            continue
    return cleaned


def sanitize_error_message(message: str) -> str:
    """Convert internal errors to user-safe generic text."""
    text = sanitize_trace_text(message)
    if not text:
        return "执行异常，系统已进入安全处理流程。"

    lowered = text.lower()
    if any(token in lowered for token in ("sql", "query", "sqlite", "database")):
        return "SQL 执行失败，已回退到安全模式。"
    if "timeout" in lowered or "超时" in text:
        return "处理超时，请稍后重试。"
    return "执行异常，系统已进入安全处理流程。"


def summarize_routing_safe(routing: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    """Build safe routing summary text and metrics."""
    categories = routing.get("selected_categories", []) if isinstance(routing, dict) else []
    tables = routing.get("selected_tables", []) if isinstance(routing, dict) else []
    category_names = [
        str(item.get("name", "")).strip()
        for item in categories
        if isinstance(item, dict) and item.get("name")
    ]
    detail = "分层召回完成"
    if category_names:
        detail += "，命中类目：" + "、".join(category_names[:3])
    metrics = {
        "selected_table_count": len(tables) if isinstance(tables, list) else 0,
        "selected_category_count": len(categories) if isinstance(categories, list) else 0,
    }
    return _truncate(detail), sanitize_metrics(metrics)


def sanitize_trace_detail_with_metrics(detail: str, metrics: dict[str, Any] | None = None) -> tuple[str, dict[str, Any]]:
    """Sanitize detail and metrics together."""
    return sanitize_trace_text(detail), sanitize_metrics(metrics or {})


def strip_sensitive_parentheses(text: str) -> str:
    """Remove likely sensitive values inside parentheses from trace text."""
    raw = (text or "").strip()
    if not raw:
        return ""

    def _replace(match: re.Match[str]) -> str:
        val = match.group(1)
        if len(val) >= 6 or re.search(r"[0-9A-Z]{4,}", val):
            return "(*)"
        return match.group(0)

    return _PARENS_VALUE_RE.sub(_replace, raw)
