"""Schema routing service for layered NL-to-SQL table selection."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.db.database import get_db_connection
from app.utils.logger import logger

SCHEMA_ROUTING_CATALOG = (
    Path(__file__).resolve().parent.parent
    / "agents"
    / "prompts"
    / "schema_routing_catalog.json"
)
TOKEN_PATTERN = re.compile(r"[A-Za-z0-9_]+|[\u4e00-\u9fff]{1,8}")


@dataclass
class RoutedCategory:
    category_id: str
    name: str
    score: float
    matched_keywords: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.category_id,
            "name": self.name,
            "score": round(self.score, 2),
            "matched_keywords": self.matched_keywords,
        }


@dataclass
class RoutedTable:
    name: str
    description: str
    score: float
    categories: list[str]
    matched_keywords: list[str]
    columns: list[dict[str, str]]
    ddl: str
    relations: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "score": round(self.score, 2),
            "categories": self.categories,
            "matched_keywords": self.matched_keywords,
            "columns": [col["name"] for col in self.columns],
            "relations": self.relations,
        }


@dataclass
class SchemaRoutingResult:
    strategy_version: str
    selected_categories: list[RoutedCategory]
    selected_tables: list[RoutedTable]
    schema_context: str
    relations: list[str]

    def to_trace_dict(self) -> dict[str, Any]:
        return {
            "strategy_version": self.strategy_version,
            "selected_categories": [cat.to_dict() for cat in self.selected_categories],
            "selected_tables": [table.to_dict() for table in self.selected_tables],
            "relations": self.relations,
        }


def _tokenize(text: str) -> set[str]:
    return {token.lower() for token in TOKEN_PATTERN.findall(text or "") if token.strip()}


def _keyword_match_score(
    text_lower: str, tokens: set[str], keywords: list[str]
) -> tuple[float, list[str]]:
    score = 0.0
    matched: list[str] = []
    for raw_keyword in keywords:
        keyword = (raw_keyword or "").strip().lower()
        if not keyword:
            continue
        if keyword in text_lower:
            score += 1.2 if len(keyword) >= 4 else 1.0
            matched.append(raw_keyword)
            continue
        if keyword in tokens:
            score += 0.8
            matched.append(raw_keyword)
    return score, matched


def _is_numeric_type(col_type: str) -> bool:
    text = (col_type or "").lower()
    return any(token in text for token in ("int", "real", "float", "double", "numeric", "decimal"))


@lru_cache(maxsize=1)
def load_schema_catalog() -> dict[str, Any]:
    try:
        with open(SCHEMA_ROUTING_CATALOG, encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        logger.warning("Failed to load schema routing catalog (%s), using fallback", exc)
        return {
            "strategy_version": "fallback-v1",
            "max_tables_default": 6,
            "max_columns_per_table": 24,
            "scenario_boosts": {"filter": {}, "export": {}, "derived": {}},
            "categories": [],
        }


def _normalize_table_hints(catalog: dict[str, Any]) -> dict[str, dict[str, Any]]:
    table_hints: dict[str, dict[str, Any]] = {}
    categories = catalog.get("categories", [])
    for category in categories:
        category_id = category.get("id", "")
        category_name = category.get("name", category_id)
        for hint in category.get("table_hints", []):
            table_name = hint.get("table", "")
            if not table_name:
                continue
            merged = table_hints.setdefault(
                table_name,
                {
                    "description": "",
                    "priority": 0.0,
                    "keywords": set(),
                    "categories": [],
                },
            )
            merged["description"] = merged["description"] or hint.get("description", "")
            merged["priority"] = max(float(hint.get("priority", 0.0)), merged["priority"])
            merged["keywords"].update(hint.get("keywords", []))
            if {"id": category_id, "name": category_name} not in merged["categories"]:
                merged["categories"].append({"id": category_id, "name": category_name})
    for value in table_hints.values():
        value["keywords"] = sorted(value["keywords"])
    return table_hints


@lru_cache(maxsize=1)
def _load_live_table_schema() -> dict[str, dict[str, Any]]:
    tables: dict[str, dict[str, Any]] = {}
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT name, sql
            FROM sqlite_master
            WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
            """
        )
        table_rows = cur.fetchall()
        for row in table_rows:
            name = row["name"]
            ddl = row["sql"] or ""
            cur.execute(f"PRAGMA table_info('{name}')")
            cols = [
                {
                    "name": c["name"],
                    "type": c["type"] or "TEXT",
                    "pk": bool(c["pk"]),
                }
                for c in cur.fetchall()
            ]

            cur.execute(f"PRAGMA foreign_key_list('{name}')")
            relations = [
                f"{fk['from']} -> {fk['table']}.{fk['to']}"
                for fk in cur.fetchall()
            ]

            tables[name] = {
                "name": name,
                "ddl": ddl.strip(),
                "columns": cols,
                "relations": relations,
            }
    except Exception as exc:
        logger.warning("Failed to introspect SQLite schema for routing: %s", exc)
    finally:
        conn.close()
    return tables


def _build_schema_context(
    query: str,
    scenario: str,
    selected_categories: list[RoutedCategory],
    selected_tables: list[RoutedTable],
    relations: list[str],
    max_columns_per_table: int,
) -> str:
    lines = [
        "# Schema Routing Context",
        f"Request: {query}",
        f"Scenario: {scenario}",
        "",
        "## Selected Categories",
    ]
    for category in selected_categories:
        keywords = ", ".join(category.matched_keywords[:8]) if category.matched_keywords else "none"
        lines.append(
            f"- {category.name} ({category.category_id}), score={category.score:.2f}, matched={keywords}"
        )

    lines.extend(["", "## Selected Tables"])
    for table in selected_tables:
        lines.append(
            f"- {table.name}: {table.description or 'No description'} "
            f"(score={table.score:.2f}, categories={','.join(table.categories) or 'unassigned'})"
        )
        if table.matched_keywords:
            lines.append(f"  matched_keywords: {', '.join(table.matched_keywords[:12])}")
        lines.append(f"  relations: {', '.join(table.relations) if table.relations else 'none'}")
        lines.append("  columns:")
        for column in table.columns[:max_columns_per_table]:
            pk_mark = " PRIMARY KEY" if column.get("pk") else ""
            lines.append(f"    - {column['name']} {column['type']}{pk_mark}")
        if table.ddl:
            lines.append("  ddl:")
            lines.append("    " + table.ddl.replace("\n", "\n    "))

    if relations:
        lines.extend(["", "## Join Hints"])
        lines.extend([f"- {item}" for item in relations])

    lines.extend(
        [
            "",
            "## Constraints",
            "- Use only selected tables unless the request is impossible without adding one extra bridge table.",
            "- Prefer explicit JOIN keys from Join Hints.",
        ]
    )
    return "\n".join(lines)


def route_schema_for_query(
    query: str,
    scenario: str = "filter",
    extra_context: str = "",
    max_tables: int | None = None,
    max_columns_per_table: int | None = None,
) -> SchemaRoutingResult:
    """Route a natural-language query to relevant schema categories and tables."""
    catalog = load_schema_catalog()
    table_hints = _normalize_table_hints(catalog)
    live_tables = _load_live_table_schema()

    if not live_tables:
        live_tables = {
            table_name: {
                "name": table_name,
                "ddl": "",
                "columns": [{"name": col, "type": "TEXT", "pk": col == "id"} for col in ["id"]],
                "relations": [],
            }
            for table_name in table_hints
        }

    scenario_key = (scenario or "filter").lower()
    text = " ".join([query or "", scenario_key, extra_context or ""]).strip()
    text_lower = text.lower()
    tokens = _tokenize(text)

    scenario_boosts: dict[str, float] = (
        catalog.get("scenario_boosts", {}).get(scenario_key, {}) or {}
    )
    categories = catalog.get("categories", [])

    scored_categories: list[RoutedCategory] = []
    category_score_map: dict[str, float] = {}
    for category in categories:
        category_id = category.get("id", "")
        category_name = category.get("name", category_id)
        base_score, matched = _keyword_match_score(
            text_lower,
            tokens,
            category.get("keywords", []),
        )
        scenario_boost = float(scenario_boosts.get(category_id, 0.0))
        total_score = base_score * 1.8 + scenario_boost
        if total_score > 0:
            scored_categories.append(
                RoutedCategory(
                    category_id=category_id,
                    name=category_name,
                    score=total_score,
                    matched_keywords=matched,
                )
            )
            category_score_map[category_id] = total_score

    if not scored_categories and categories:
        fallback = sorted(
            categories,
            key=lambda item: float(scenario_boosts.get(item.get("id", ""), 0.0)),
            reverse=True,
        )
        for category in fallback[:2]:
            category_id = category.get("id", "")
            category_name = category.get("name", category_id)
            score = float(scenario_boosts.get(category_id, 0.0))
            scored_categories.append(
                RoutedCategory(
                    category_id=category_id,
                    name=category_name,
                    score=score,
                    matched_keywords=[],
                )
            )
            category_score_map[category_id] = score

    scored_categories.sort(key=lambda item: item.score, reverse=True)
    selected_categories = scored_categories[:3]

    table_scores: list[tuple[str, float, list[str], list[str]]] = []
    for table_name, table_meta in live_tables.items():
        hint = table_hints.get(table_name, {})
        score = float(hint.get("priority", 0.0))
        table_keywords = list(hint.get("keywords", []))
        categories_meta = hint.get("categories", [])
        matched_keywords: list[str] = []

        for category_meta in categories_meta:
            category_id = category_meta.get("id", "")
            category_score = category_score_map.get(category_id, 0.0)
            if category_score > 0:
                score += category_score * 1.2

        keyword_score, matched = _keyword_match_score(text_lower, tokens, table_keywords)
        score += keyword_score * 1.4
        matched_keywords.extend(matched)

        direct_table_score, direct_matches = _keyword_match_score(text_lower, tokens, [table_name])
        score += direct_table_score * 1.8
        matched_keywords.extend(direct_matches)

        column_names = [col["name"] for col in table_meta.get("columns", [])]
        column_score, column_matches = _keyword_match_score(text_lower, tokens, column_names)
        score += min(column_score, 3.5)
        matched_keywords.extend(column_matches)

        if scenario_key == "derived":
            if any(_is_numeric_type(col.get("type", "")) for col in table_meta.get("columns", [])):
                score += 0.6
        if scenario_key == "export":
            export_keys = {"name", "credit_code", "city", "industry", "legal_rep"}
            if any(col["name"] in export_keys for col in table_meta.get("columns", [])):
                score += 0.5

        category_names = [cat.get("name", cat.get("id", "")) for cat in categories_meta]
        table_scores.append((table_name, score, category_names, sorted(set(matched_keywords))))

    table_scores.sort(key=lambda item: item[1], reverse=True)
    requested_max_tables = max_tables or int(catalog.get("max_tables_default", 6))
    selected_names = [name for name, score, _, _ in table_scores if score > 0][:requested_max_tables]

    if not selected_names and table_scores:
        selected_names = [table_scores[0][0]]

    # Keep `companies` as a join anchor if any selected table uses company_id.
    if "companies" in live_tables and "companies" not in selected_names:
        needs_anchor = any(
            any(col["name"] == "company_id" for col in live_tables[name].get("columns", []))
            for name in selected_names
        )
        if needs_anchor:
            selected_names = ["companies", *selected_names]
            selected_names = selected_names[:requested_max_tables]

    selected_tables: list[RoutedTable] = []
    score_lookup = {name: (score, categories, keywords) for name, score, categories, keywords in table_scores}
    relation_hints: set[str] = set()
    column_limit = max_columns_per_table or int(catalog.get("max_columns_per_table", 24))

    for name in selected_names:
        meta = live_tables[name]
        hint = table_hints.get(name, {})
        score, categories_names, matched_keywords = score_lookup.get(name, (0.0, [], []))
        relations = list(meta.get("relations", []))
        for relation in relations:
            relation_hints.add(f"{name}.{relation}")
        selected_tables.append(
            RoutedTable(
                name=name,
                description=hint.get("description", ""),
                score=score,
                categories=categories_names,
                matched_keywords=matched_keywords,
                columns=meta.get("columns", []),
                ddl=meta.get("ddl", ""),
                relations=relations,
            )
        )

    schema_context = _build_schema_context(
        query=query,
        scenario=scenario_key,
        selected_categories=selected_categories,
        selected_tables=selected_tables,
        relations=sorted(relation_hints),
        max_columns_per_table=column_limit,
    )

    return SchemaRoutingResult(
        strategy_version=catalog.get("strategy_version", "unknown"),
        selected_categories=selected_categories,
        selected_tables=selected_tables,
        schema_context=schema_context,
        relations=sorted(relation_hints),
    )
