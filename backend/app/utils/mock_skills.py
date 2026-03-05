"""Mock data for the Skills marketplace module."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone


def get_mock_skill_list() -> list[dict]:
    """Return the skill catalogue mapped from existing agent planning."""
    return [
        {
            "id": "batch",
            "name": "批量数据处理技能",
            "description": "自然语言筛选企业名单，结构化批量导出，多表衍生字段加工",
            "color": "#06B6D4",
            "tags": ["数据处理", "批量导出", "企业库"],
            "icon": "Database",
            "status": "ready",
            "author": "@快查数据团队",
            "price_type": "free",
            "owned": True,
            "cover": "batch",
            "market_status": "ready",
        },
        {
            "id": "risk",
            "name": "企业风控尽调技能",
            "description": "扫描司法、信用、舆情数据，生成风险评估报告",
            "color": "#EF4444",
            "tags": ["风控", "尽调"],
            "icon": "Shield",
            "status": "coming",
            "author": "@快查风控团队",
            "price_type": "free",
            "owned": False,
            "cover": "risk",
            "market_status": "coming",
        },
        {
            "id": "sentiment",
            "name": "舆情风险简报技能",
            "description": "采集整合舆情信息，生成周期性风险简报",
            "color": "#F97316",
            "tags": ["舆情", "监控"],
            "icon": "Alert",
            "status": "coming",
            "author": "@快查情报团队",
            "price_type": "free",
            "owned": False,
            "cover": "sentiment",
            "market_status": "coming",
        },
        {
            "id": "bid",
            "name": "招采商机洞察技能",
            "description": "监控招投标信息，转化结构化商机与可行动策略",
            "color": "#F59E0B",
            "tags": ["销售", "市场分析"],
            "icon": "TrendUp",
            "status": "coming",
            "author": "@快查商机团队",
            "price_type": "free",
            "owned": False,
            "cover": "bid",
            "market_status": "coming",
        },
        {
            "id": "tech",
            "name": "科创能力评估技能",
            "description": "分析知识产权与创新能力，评估技术资产质量",
            "color": "#8B5CF6",
            "tags": ["投资", "技术评估"],
            "icon": "Brain",
            "status": "coming",
            "author": "@快查科创团队",
            "price_type": "free",
            "owned": False,
            "cover": "tech",
            "market_status": "coming",
        },
        {
            "id": "graph",
            "name": "企业关系图谱技能",
            "description": "自然语言查询企业关系，自动选择最佳可视化形式",
            "color": "#06B6D4",
            "tags": ["图谱", "关系分析"],
            "icon": "Network",
            "status": "coming",
            "author": "@快查图谱团队",
            "price_type": "free",
            "owned": False,
            "cover": "graph",
            "market_status": "coming",
        },
        {
            "id": "trend",
            "name": "趋势分析探索技能",
            "description": "自然语言查询企业趋势数据，AI 自动选择最佳可视化",
            "color": "#34D399",
            "tags": ["趋势", "数据分析"],
            "icon": "TrendUp",
            "status": "coming",
            "author": "@快查趋势团队",
            "price_type": "free",
            "owned": False,
            "cover": "trend",
            "market_status": "coming",
        },
        {
            "id": "map",
            "name": "商业版图分析技能",
            "description": "股权穿透与人物关联，生成可视化关系图谱",
            "color": "#3B82F6",
            "tags": ["商业分析", "图谱"],
            "icon": "Network",
            "status": "coming",
            "author": "@快查商业团队",
            "price_type": "free",
            "owned": False,
            "cover": "map",
            "market_status": "coming",
        },
        {
            "id": "job",
            "name": "求职背调诊断技能",
            "description": "评估企业发展现状与员工成长前景",
            "color": "#10B981",
            "tags": ["求职", "企业评价"],
            "icon": "Briefcase",
            "status": "coming",
            "author": "@快查人才团队",
            "price_type": "free",
            "owned": False,
            "cover": "job",
            "market_status": "coming",
        },
    ]


def get_mock_skill_store() -> dict:
    """Return marketplace sections for the skills home page."""
    skills = get_mock_skill_list()
    featured_ids = ["batch", "risk"]
    featured = [item for item in skills if item["id"] in featured_ids]
    curated = [item for item in skills if item["id"] not in featured_ids]
    return {
        "sections": [
            {
                "id": "featured",
                "title": "编辑推荐",
                "subtitle": "精选技能，快速启动业务流程",
                "style": "hero",
                "items": featured,
            },
            {
                "id": "curated",
                "title": "编辑精选",
                "subtitle": "覆盖风控、趋势、图谱与数据交付等典型场景",
                "style": "grid",
                "items": curated,
            },
        ]
    }


def get_mock_my_skills() -> list[dict]:
    """Return mock purchased/owned skills."""
    return [item for item in get_mock_skill_list() if item.get("owned")]


def get_mock_purchase_records() -> list[dict]:
    """Return mock purchase records for modal display."""
    now = datetime.now(timezone.utc)
    return [
        {
            "record_id": "pr-001",
            "skill_id": "batch",
            "skill_name": "批量数据处理技能",
            "price_type": "free",
            "amount": 0,
            "currency": "CNY",
            "purchased_at": (now - timedelta(days=2)).isoformat(),
            "status": "active",
        }
    ]
