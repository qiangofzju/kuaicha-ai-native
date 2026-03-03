"""Comprehensive mock data for the 快查 AI platform.

Provides realistic Chinese enterprise risk data for development and testing.
"""

from datetime import datetime, timedelta
import random


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

def get_mock_sessions() -> list[dict]:
    """Return a list of mock chat sessions."""
    return [
        {
            "id": "s1",
            "title": "同花顺风险查询",
            "created_at": "2026-02-09T10:00:00Z",
            "message_count": 3,
        },
        {
            "id": "s2",
            "title": "宁德时代尽调报告",
            "created_at": "2026-02-08T15:00:00Z",
            "message_count": 5,
        },
        {
            "id": "s3",
            "title": "新能源产业链分析",
            "created_at": "2026-02-07T09:00:00Z",
            "message_count": 2,
        },
        {
            "id": "s4",
            "title": "李宁商业版图",
            "created_at": "2026-02-06T14:00:00Z",
            "message_count": 4,
        },
    ]


# ---------------------------------------------------------------------------
# Chat responses – per-company risk intelligence
# ---------------------------------------------------------------------------

_COMPANY_RESPONSES: dict[str, dict] = {
    "同花顺": {
        "content": (
            "同花顺（浙江核新同花顺网络信息股份有限公司）近期存在以下风险信号：\n\n"
            "该公司作为国内领先的互联网金融信息服务商，在数据安全和合规领域面临较大监管压力。"
            "近期证监会针对金融数据服务商的专项检查已对公司经营产生影响。"
            "建议重点关注其数据安全合规整改进展及知识产权诉讼进展。"
        ),
        "details": [
            {"label": "司法风险", "value": "涉诉案件 23 起，其中知识产权纠纷 8 起", "level": "medium"},
            {"label": "监管风险", "value": "2024年收到证监会问询函 2 份，涉及数据安全合规", "level": "high"},
            {"label": "舆情风险", "value": "近30天负面舆情 47 条，主要集中在产品体验和数据安全", "level": "medium"},
            {"label": "经营风险", "value": "Q3营收同比下降 5.2%，净利润率收窄至 18.3%", "level": "low"},
        ],
        "actions": ["生成尽调报告", "舆情分析", "查看可视化"],
    },
    "比亚迪": {
        "content": (
            "比亚迪股份有限公司整体经营态势良好，但在供应链和海外合规方面需关注以下风险：\n\n"
            "公司新能源汽车业务持续高速增长，但全球化布局带来的合规挑战日益突出。"
            "欧盟反补贴调查及东南亚产能落地进度值得持续跟踪。"
        ),
        "details": [
            {"label": "合规风险", "value": "欧盟反补贴调查进行中，可能影响出口定价策略", "level": "high"},
            {"label": "供应链风险", "value": "碳酸锂价格波动导致原材料成本不确定性增加", "level": "medium"},
            {"label": "司法风险", "value": "涉诉案件 56 起，主要为劳动纠纷和供应商合同争议", "level": "low"},
            {"label": "舆情风险", "value": "近30天负面舆情 32 条，涉及产品质量和售后服务", "level": "low"},
        ],
        "actions": ["生成尽调报告", "舆情分析", "查看可视化"],
    },
    "宁德时代": {
        "content": (
            "宁德时代新能源科技股份有限公司作为全球动力电池龙头，整体风险可控，"
            "但需关注以下方面：\n\n"
            "公司在技术研发领域保持领先，但市场竞争加剧和原材料价格波动构成主要挑战。"
            "海外产能建设进度和地缘政治风险需持续监控。"
        ),
        "details": [
            {"label": "市场风险", "value": "动力电池市场份额从 37% 降至 34%，竞争格局加剧", "level": "medium"},
            {"label": "合规风险", "value": "美国 IRA 法案对其北美客户供应链产生间接影响", "level": "medium"},
            {"label": "经营风险", "value": "产能利用率降至 72%，存在阶段性过剩压力", "level": "low"},
            {"label": "技术风险", "value": "固态电池技术路线存在不确定性，研发投入持续加大", "level": "low"},
        ],
        "actions": ["生成尽调报告", "舆情分析", "查看可视化"],
    },
    "恒大": {
        "content": (
            "中国恒大集团目前处于严重财务困境，存在极高风险信号：\n\n"
            "公司已进入破产重整程序，涉及大量债务违约和司法诉讼。"
            "建议相关合作方和投资者高度警惕关联风险。"
        ),
        "details": [
            {"label": "财务风险", "value": "总负债超过 2.4 万亿元，已严重资不抵债", "level": "high"},
            {"label": "司法风险", "value": "涉诉案件超过 2,800 起，多起被执行案件", "level": "high"},
            {"label": "监管风险", "value": "证监会立案调查，涉嫌财务造假", "level": "high"},
            {"label": "经营风险", "value": "多地项目停工，交付能力严重不足", "level": "high"},
        ],
        "actions": ["生成尽调报告", "舆情分析", "查看可视化"],
    },
    "华为": {

        "content": (
            "华为技术有限公司在技术创新领域表现强劲，但地缘政治风险持续存在：\n\n"
            "公司在芯片自研和鸿蒙生态建设方面取得突破性进展，但供应链受限情况仍在持续。"
            "消费者业务复苏态势良好，企业业务和云计算业务保持增长。"
        ),
        "details": [
            {"label": "地缘政治风险", "value": "美国实体清单限制仍在持续，供应链存在不确定性", "level": "high"},
            {"label": "技术风险", "value": "先进制程芯片受限，自研进度影响产品竞争力", "level": "medium"},
            {"label": "经营风险", "value": "营收恢复增长至 7,042 亿元，但利润率仍低于历史水平", "level": "low"},
            {"label": "舆情风险", "value": "近30天负面舆情 18 条，整体舆论环境偏正面", "level": "low"},
        ],
        "actions": ["生成尽调报告", "科创评估", "关系图谱"],
    },
    "李宁": {
        "content": (
            "李宁有限公司近期经营面临一定压力，品牌转型战略效果有待观察：\n\n"
            "国潮退热后品牌增长放缓，库存管理和渠道优化成为核心挑战。"
            "需关注消费降级趋势对中高端定位的影响。"
        ),
        "details": [
            {"label": "经营风险", "value": "H1营收同比下降 2.8%，净利润下滑 12.5%", "level": "medium"},
            {"label": "库存风险", "value": "库存周转天数升至 68 天，存货跌价准备增加", "level": "medium"},
            {"label": "舆情风险", "value": "近30天负面舆情 28 条，涉及产品定价争议", "level": "low"},
            {"label": "司法风险", "value": "涉诉案件 12 起，主要为商标侵权纠纷", "level": "low"},
        ],
        "actions": ["生成尽调报告", "舆情分析", "查看可视化"],
    },
    "阿里巴巴": {
        "content": (
            "阿里巴巴集团在组织架构调整后进入新阶段，需关注以下风险信号：\n\n"
            "集团拆分后各业务板块独立运营，核心电商业务面临拼多多和抖音电商的激烈竞争。"
            "云计算业务恢复增长，国际化业务投入加大。"
        ),
        "details": [
            {"label": "竞争风险", "value": "国内电商市场份额持续下滑，从 48% 降至 39%", "level": "high"},
            {"label": "监管风险", "value": "反垄断合规整改持续中，数据安全监管趋严", "level": "medium"},
            {"label": "经营风险", "value": "部分业务板块亏损，员工优化仍在进行", "level": "medium"},
            {"label": "投资风险", "value": "所投企业估值缩水，投资收益大幅下降", "level": "low"},
        ],
        "actions": ["生成尽调报告", "舆情分析", "关系图谱"],
    },
}

_DEFAULT_RESPONSE = {
    "content": (
        "已完成对该企业的风险扫描，以下为主要风险发现：\n\n"
        "基于公开数据分析，该企业在司法诉讼、监管合规、舆情动态和经营状况方面的风险评估如下。"
        "建议进一步深入尽调以获取更全面的风险画像。"
    ),
    "details": [
        {"label": "司法风险", "value": "近一年涉诉案件 15 起，无重大诉讼", "level": "low"},
        {"label": "监管风险", "value": "未发现重大监管处罚记录", "level": "low"},
        {"label": "舆情风险", "value": "近30天负面舆情 12 条，风险等级一般", "level": "low"},
        {"label": "经营风险", "value": "经营状况稳定，财务指标正常", "level": "low"},
    ],
    "actions": ["生成尽调报告", "舆情分析", "查看可视化"],
}


def get_mock_chat_response(query: str) -> dict:
    """Return a structured risk response based on the query.

    Checks for known company names in the query string and returns
    company-specific data; falls back to a generic response otherwise.
    """
    for company, response in _COMPANY_RESPONSES.items():
        if company in query:
            return response
    return _DEFAULT_RESPONSE


# ---------------------------------------------------------------------------
# Agent catalogue
# ---------------------------------------------------------------------------

def get_mock_agent_list() -> list[dict]:
    """Return the catalogue of available AI agents."""
    return [
        {
            "id": "risk",
            "name": "企业风控尽调",
            "description": "扫描司法、信用、舆情数据，生成风险评估报告",
            "color": "#EF4444",
            "tags": ["风控", "尽调"],
            "icon": "Shield",
            "status": "ready",
        },
        {
            "id": "sentiment",
            "name": "舆情风险简报",
            "description": "采集整合舆情信息，生成周期性风险简报",
            "color": "#F97316",
            "tags": ["舆情", "监控"],
            "icon": "Alert",
            "status": "ready",
        },
        {
            "id": "bid",
            "name": "招采商机洞察",
            "description": "监控招投标信息，转化结构化商机与可行动策略",
            "color": "#F59E0B",
            "tags": ["销售", "市场分析"],
            "icon": "TrendUp",
            "status": "coming",
        },
        {
            "id": "tech",
            "name": "科创能力评估",
            "description": "分析知识产权与创新能力，评估技术资产质量",
            "color": "#8B5CF6",
            "tags": ["投资", "技术评估"],
            "icon": "Brain",
            "status": "ready",
        },
        {
            "id": "graph",
            "name": "企业关系图谱",
            "description": "自然语言查询企业关系，自动选择最佳可视化形式",
            "color": "#06B6D4",
            "tags": ["图谱", "关系分析"],
            "icon": "Network",
            "status": "ready",
        },
        {
            "id": "trend",
            "name": "趋势分析探索",
            "description": "自然语言查询企业趋势数据，AI 自动选择最佳可视化",
            "color": "#34D399",
            "tags": ["趋势", "数据分析"],
            "icon": "TrendUp",
            "status": "ready",
        },
        {
            "id": "map",
            "name": "商业版图分析",
            "description": "股权穿透与人物关联，生成可视化关系图谱",
            "color": "#3B82F6",
            "tags": ["商业分析", "图谱"],
            "icon": "Network",
            "status": "coming",
        },
        {
            "id": "job",
            "name": "求职背调诊断",
            "description": "评估企业发展现状与员工成长前景",
            "color": "#10B981",
            "tags": ["求职", "企业评价"],
            "icon": "Briefcase",
            "status": "coming",
        },
        {
            "id": "batch",
            "name": "批量数据处理",
            "description": "自然语言筛选企业名单，结构化批量导出，多表衍生字段加工",
            "color": "#06B6D4",
            "tags": ["数据处理", "批量导出"],
            "icon": "Database",
            "status": "ready",
        },
    ]


# ---------------------------------------------------------------------------
# Agent execution results
# ---------------------------------------------------------------------------

def get_mock_agent_result(agent_id: str, target: str) -> dict:
    """Return a realistic agent execution result for *target* company."""
    if agent_id == "sentiment":
        return _get_mock_sentiment_result(target)
    if agent_id == "tech":
        return _get_mock_tech_result(target)
    if agent_id == "graph":
        return _get_mock_graph_explorer_result(target)
    if agent_id == "trend":
        return _get_mock_trend_explorer_result(target)
    if agent_id == "batch":
        return _get_mock_batch_result(target)
    return _get_mock_risk_result(target)


def _get_mock_batch_result(target: str) -> dict:
    """Return batch processing mock result (tabular data)."""
    return {
        "task_id": "",
        "summary": f"共筛选出 12 家杭州地区净利润持续增长企业，净利润均值 3.6 亿元。{target}",
        "query_type": "filter",
        "generated_sql": (
            "SELECT c.name, c.short_name, c.city, c.industry,\n"
            "       f22.net_profit AS net_profit_2022,\n"
            "       f23.net_profit AS net_profit_2023,\n"
            "       f24.net_profit AS net_profit_2024,\n"
            "       ROUND(f24.net_margin, 1) AS net_margin,\n"
            "       c.risk_level\n"
            "FROM companies c\n"
            "JOIN financials f22 ON f22.company_id = c.id AND f22.year = 2022\n"
            "JOIN financials f23 ON f23.company_id = c.id AND f23.year = 2023\n"
            "JOIN financials f24 ON f24.company_id = c.id AND f24.year = 2024\n"
            "WHERE c.city = '杭州'\n"
            "  AND f22.net_profit IS NOT NULL\n"
            "  AND f23.net_profit > f22.net_profit\n"
            "  AND f24.net_profit > f23.net_profit\n"
            "  AND f24.net_profit > 0\n"
            "ORDER BY f24.net_profit DESC\n"
            "LIMIT 100"
        ),
        "sql_description": "筛选杭州地区近3年净利润持续增长的企业名单",
        "columns": [
            {"key": "name", "label": "企业名称", "type": "text"},
            {"key": "short_name", "label": "简称", "type": "text"},
            {"key": "city", "label": "城市", "type": "text"},
            {"key": "industry", "label": "行业", "type": "text"},
            {"key": "net_profit_2022", "label": "净利润(2022)", "type": "number", "unit": "万元"},
            {"key": "net_profit_2023", "label": "净利润(2023)", "type": "number", "unit": "万元"},
            {"key": "net_profit_2024", "label": "净利润(2024)", "type": "number", "unit": "万元"},
            {"key": "net_margin", "label": "净利率(2024)", "type": "number", "unit": "%"},
            {"key": "risk_level", "label": "风险等级", "type": "badge"},
        ],
        "preview_rows": [
            {"name": "杭州海康威视数字技术股份有限公司", "short_name": "海康威视", "city": "杭州", "industry": "信息技术", "net_profit_2022": 128400, "net_profit_2023": 141200, "net_profit_2024": 156800, "net_margin": 16.3, "risk_level": "low"},
            {"name": "浙江大华技术股份有限公司", "short_name": "大华技术", "city": "杭州", "industry": "信息技术", "net_profit_2022": 31200, "net_profit_2023": 38600, "net_profit_2024": 45800, "net_margin": 12.6, "risk_level": "low"},
            {"name": "杭州网易互娱科技有限公司", "short_name": "网易互娱", "city": "杭州", "industry": "信息技术", "net_profit_2022": 28400, "net_profit_2023": 35200, "net_profit_2024": 41800, "net_margin": 33.3, "risk_level": "low"},
            {"name": "浙江核新同花顺网络信息股份有限公司", "short_name": "同花顺", "city": "杭州", "industry": "信息技术", "net_profit_2022": 10200, "net_profit_2023": 14800, "net_profit_2024": 19600, "net_margin": 45.8, "risk_level": "low"},
            {"name": "浙江正泰太阳能科技有限公司", "short_name": "正泰太阳能", "city": "杭州", "industry": "制造业", "net_profit_2022": 18500, "net_profit_2023": 24200, "net_profit_2024": 31500, "net_margin": 11.8, "risk_level": "low"},
            {"name": "杭州老板电器股份有限公司", "short_name": "老板电器", "city": "杭州", "industry": "制造业", "net_profit_2022": 15800, "net_profit_2023": 18200, "net_profit_2024": 21500, "net_margin": 17.1, "risk_level": "low"},
            {"name": "杭州数梦工场科技有限公司", "short_name": "数梦工场", "city": "杭州", "industry": "信息技术", "net_profit_2022": 1200, "net_profit_2023": 2100, "net_profit_2024": 3200, "net_margin": 16.7, "risk_level": "low"},
            {"name": "杭州银江技术股份有限公司", "short_name": "银江技术", "city": "杭州", "industry": "信息技术", "net_profit_2022": 1500, "net_profit_2023": 2800, "net_profit_2024": 4200, "net_margin": 10.9, "risk_level": "medium"},
            {"name": "杭州华澜微电子股份有限公司", "short_name": "华澜微", "city": "杭州", "industry": "信息技术", "net_profit_2022": 680, "net_profit_2023": 920, "net_profit_2024": 1350, "net_margin": 15.9, "risk_level": "medium"},
            {"name": "杭州远想医疗设备有限公司", "short_name": "远想医疗", "city": "杭州", "industry": "医疗健康", "net_profit_2022": 420, "net_profit_2023": 680, "net_profit_2024": 950, "net_margin": 18.3, "risk_level": "low"},
            {"name": "杭州安恒信息技术股份有限公司", "short_name": "安恒信息", "city": "杭州", "industry": "信息技术", "net_profit_2022": -5800, "net_profit_2023": -2200, "net_profit_2024": 1850, "net_margin": 6.9, "risk_level": "low"},
            {"name": "杭州当虹科技股份有限公司", "short_name": "当虹科技", "city": "杭州", "industry": "信息技术", "net_profit_2022": -2800, "net_profit_2023": -800, "net_profit_2024": 580, "net_margin": 8.1, "risk_level": "low"},
        ],
        "total_count": 12,
        "stats": {
            "count": 12,
            "avg_net_profit_2024": 27152,
            "max_net_profit_2024": 156800,
            "min_net_profit_2024": 580,
            "median_net_profit_2024": 10275,
        },
        "data_quality": {
            "total_requested": 12,
            "matched": 12,
            "missing_fields_filled": 0,
        },
        "metadata": {
            "agent_id": "batch",
            "query": target,
            "scenario": "filter",
            "total_rows": 12,
            "duration": 3.2,
        },
    }


def _get_mock_sentiment_result(target: str) -> dict:
    """Return sentiment briefing mock result."""
    return {
        "task_id": "",
        "summary": (
            f"{target} 近期舆情态势整体中性偏正面，舆情评级为 B 级（正面为主）。"
            f"新闻媒体报道量稳定，社交平台讨论以产品体验为主，未出现系统性负面事件。"
            f"建议持续关注监管政策类报道和竞品对比话题。"
        ),
        "risk_rating": "B",
        "risk_findings": [
            {
                "label": "新闻媒体舆情",
                "level": "low",
                "score": 72,
                "description": f"近30天{target}相关新闻报道 186 篇，正面占比 62%，中性 28%，负面 10%",
                "trend": "stable",
            },
            {
                "label": "社交媒体舆情",
                "level": "medium",
                "score": 58,
                "description": "微博讨论量 3,420 条，用户情感偏中性，产品体验类话题热度较高",
                "trend": "down",
            },
            {
                "label": "行业对比舆情",
                "level": "low",
                "score": 65,
                "description": "相较同行业企业，舆情表现处于中上水平，品牌认知度良好",
                "trend": "stable",
            },
            {
                "label": "政策监管舆情",
                "level": "medium",
                "score": 55,
                "description": "涉及数据安全监管相关报道 12 篇，行业政策变动引发部分讨论",
                "trend": "up",
            },
            {
                "label": "资本市场舆情",
                "level": "low",
                "score": 70,
                "description": "分析师评级以「持有」和「买入」为主，投资者社区整体情绪中性偏乐观",
                "trend": "stable",
            },
        ],
        "report_sections": [
            {
                "title": "舆情态势概览",
                "content": (
                    f"本报告覆盖期内，{target}的全网舆情信息共计 5,128 条。"
                    "其中正面信息占比 58%，中性信息占比 30%，负面信息占比 12%。"
                    "整体舆情态势健康，未出现重大声誉危机事件。"
                ),
            },
            {
                "title": "热点话题分析",
                "content": (
                    "本期热点话题 TOP3：1) 新产品发布及用户评价；"
                    "2) 行业数据安全监管新规解读；"
                    "3) 季度财报业绩表现。"
                    "热点话题整体偏正面，产品类话题传播力最强。"
                ),
            },
            {
                "title": "负面事件深度分析",
                "content": (
                    "负面舆情主要集中在：产品体验投诉（38%）、数据安全质疑（25%）、"
                    "竞品对比不利言论（22%）、其他（15%）。"
                    "负面事件均未引发大规模传播，影响范围可控。"
                ),
            },
            {
                "title": "正面事件盘点",
                "content": (
                    f"正面舆情亮点包括：{target}技术创新获行业认可、"
                    "企业社会责任活动获媒体好评、管理层战略沟通获投资者积极反馈。"
                    "品牌美誉度保持在较好水平。"
                ),
            },
            {
                "title": "同行业对比",
                "content": (
                    "与同行业主要竞争对手相比，该企业舆情健康度排名前 30%。"
                    "在媒体关注度和用户口碑维度表现优于行业均值，"
                    "但在社交媒体互动活跃度方面略低于头部竞品。"
                ),
            },
            {
                "title": "建议与行动计划",
                "content": (
                    "建议：1) 加强产品体验类负面舆情的响应速度；"
                    "2) 主动发布数据安全合规进展，消除市场疑虑；"
                    "3) 提升社交媒体运营活跃度，增加与用户的互动；"
                    "4) 制定突发舆情应急预案，确保快速响应机制。"
                ),
            },
        ],
        "timeline": [
            {"date": "2026-02-08", "event": "新产品发布会获媒体广泛正面报道", "type": "news", "level": "info"},
            {"date": "2026-02-05", "event": "社交平台出现产品体验投诉集中讨论", "type": "social", "level": "medium"},
            {"date": "2026-02-01", "event": "行业数据安全新规发布，多家企业被讨论", "type": "regulatory", "level": "medium"},
            {"date": "2026-01-28", "event": "季度财报发布，业绩超预期获积极评价", "type": "financial", "level": "info"},
            {"date": "2026-01-22", "event": "竞品发布同类产品，引发对比讨论", "type": "social", "level": "low"},
            {"date": "2026-01-15", "event": "获评行业创新企业奖项", "type": "news", "level": "info"},
            {"date": "2026-01-10", "event": "用户在论坛反馈数据安全疑虑", "type": "social", "level": "medium"},
            {"date": "2026-01-05", "event": "管理层接受媒体专访，阐述战略方向", "type": "news", "level": "info"},
        ],
        "metadata": {
            "agent_id": "sentiment",
            "target": target,
            "data_sources": [
                "新闻媒体监测（主流+行业媒体）",
                "微博舆情数据",
                "微信公众号数据",
                "抖音/快手短视频平台",
                "知乎/雪球/东方财富论坛",
                "分析师报告数据库",
            ],
            "data_coverage": "2026-01-01 至 2026-02-10",
            "confidence_score": 0.84,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "model_version": "kuaicha-sentiment-v1.0",
        },
    }


def _get_mock_tech_result(target: str) -> dict:
    """Return tech assessment mock result."""
    return {
        "task_id": "",
        "summary": (
            f"{target} 科创能力评级为 B 级（较强竞争力）。"
            f"企业在专利布局和研发投入方面表现突出，技术壁垒中等偏上。"
            f"建议关注核心技术人才储备和前沿技术布局进展。"
        ),
        "risk_rating": "B",
        "risk_findings": [
            {
                "label": "专利实力",
                "level": "high",
                "score": 82,
                "description": f"{target}累计授权专利 1,247 件，发明专利占比 68%，PCT 国际专利 89 件",
                "trend": "up",
            },
            {
                "label": "研发投入",
                "level": "high",
                "score": 76,
                "description": "研发支出占营收 12.3%，高于行业均值 8.5%，研发人员同比增长 15%",
                "trend": "up",
            },
            {
                "label": "技术壁垒",
                "level": "medium",
                "score": 65,
                "description": "拥有 3 项核心技术专利集群，参与 2 项国家标准制定，技术许可收入稳定",
                "trend": "stable",
            },
            {
                "label": "人才密度",
                "level": "medium",
                "score": 60,
                "description": "技术人员占比 42%，核心技术团队稳定，与 5 所高校建立联合实验室",
                "trend": "stable",
            },
            {
                "label": "创新指数",
                "level": "medium",
                "score": 58,
                "description": "年均新产品推出 8 项，数字化转型成熟度中等，开源生态参与度一般",
                "trend": "up",
            },
        ],
        "report_sections": [
            {
                "title": "企业技术概览",
                "content": (
                    f"{target}是一家具有较强技术实力的企业，"
                    "在核心业务领域积累了深厚的技术储备。"
                    "公司研发体系完善，形成了以核心技术为基础的多层次创新架构。"
                ),
            },
            {
                "title": "专利布局分析",
                "content": (
                    f"截至评估日，{target}累计申请专利 1,856 件，授权 1,247 件。"
                    "其中发明专利 848 件（占比 68%），实用新型 312 件，外观设计 87 件。"
                    "PCT 国际专利 89 件，覆盖美国、欧盟、日韩等主要市场。"
                    "核心技术领域专利集中度 45%，形成有效技术防线。"
                ),
            },
            {
                "title": "研发投入评估",
                "content": (
                    "最近三年研发投入持续增长，2025 年研发支出达到营收的 12.3%。"
                    "研发团队规模 680 人，同比增长 15%。"
                    "获得政府科技专项资金支持 2,800 万元。"
                    "研发资本化率 18%，处于合理范围。"
                ),
            },
            {
                "title": "核心技术壁垒",
                "content": (
                    "公司在 3 个核心技术方向上建立了专利壁垒：数据处理引擎、"
                    "智能分析算法、安全加密协议。"
                    "参与制定国家标准 2 项、行业标准 5 项。"
                    "技术许可年收入约 1,500 万元，技术输出能力良好。"
                ),
            },
            {
                "title": "创新人才评估",
                "content": (
                    "技术人员 680 人，占员工总数 42%。"
                    "核心技术骨干 45 人，平均从业年限 12 年。"
                    "与清华大学、浙江大学等 5 所高校建立联合实验室。"
                    "近一年技术人才流失率 8%，略低于行业均值 11%。"
                ),
            },
            {
                "title": "竞争定位与建议",
                "content": (
                    f"综合评估，{target}科创能力在同行业中处于中上水平。"
                    "优势：专利数量领先、研发投入持续增长。"
                    "待提升：前沿技术（AI、量化）布局需加快、开源生态参与度偏低。"
                    "建议：1) 加大前沿技术预研投入；2) 完善海外专利布局；"
                    "3) 建立技术人才期权激励计划；4) 探索产学研深度合作模式。"
                ),
            },
        ],
        "timeline": [
            {"date": "2026-01-20", "event": "获得 3 项发明专利授权", "type": "patent", "level": "info"},
            {"date": "2025-12-15", "event": "联合实验室发布年度技术报告", "type": "rd", "level": "info"},
            {"date": "2025-11-08", "event": "新一代数据处理引擎发布", "type": "product", "level": "high"},
            {"date": "2025-10-22", "event": "入选国家级专精特新企业", "type": "rd", "level": "high"},
            {"date": "2025-09-15", "event": "研发中心二期投入使用", "type": "rd", "level": "medium"},
            {"date": "2025-08-30", "event": "PCT 国际专利申请 12 件", "type": "patent", "level": "medium"},
            {"date": "2025-07-10", "event": "参与行业标准制定工作启动", "type": "rd", "level": "info"},
            {"date": "2025-06-01", "event": "完成新一轮技术人才招聘（120人）", "type": "talent", "level": "info"},
        ],
        "metadata": {
            "agent_id": "tech",
            "target": target,
            "data_sources": [
                "国家知识产权局专利数据库",
                "WIPO PCT 国际专利数据",
                "企业年报/研发披露",
                "国家科技成果转化平台",
                "高校合作项目数据库",
                "行业技术报告",
            ],
            "data_coverage": "2020-01-01 至 2026-02-10",
            "confidence_score": 0.82,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "model_version": "kuaicha-tech-v1.0",
        },
    }


def _get_mock_risk_result(target: str) -> dict:
    """Return risk due diligence mock result."""

    # Common per-company overrides
    company_summaries = {
        "同花顺": {
            "summary": (
                "同花顺（300033.SZ）综合风险评级为 B 级（中等风险）。"
                "公司在数据安全合规方面存在较高监管风险，知识产权诉讼频发。"
                "建议在合作前关注其整改进展和诉讼走向。"
            ),
            "risk_rating": "B",
        },
        "比亚迪": {
            "summary": (
                "比亚迪（002594.SZ）综合风险评级为 A 级（低风险）。"
                "公司经营稳健、增长强劲，但需关注欧盟反补贴调查和海外合规风险。"
                "整体适合作为合作伙伴或投资标的。"
            ),
            "risk_rating": "A",
        },
        "恒大": {
            "summary": (
                "中国恒大（03333.HK）综合风险评级为 E 级（极高风险）。"
                "公司已严重资不抵债，进入破产重整程序，存在大量债务违约和司法诉讼。"
                "强烈建议避免任何形式的商业合作。"
            ),
            "risk_rating": "E",
        },
    }

    info = company_summaries.get(target, {
        "summary": (
            f"{target} 综合风险评级为 B 级（中等风险）。"
            "基于公开数据分析，该企业整体经营状况稳定，但存在部分需关注的风险点。"
            "建议进一步深入尽调以完善风险评估。"
        ),
        "risk_rating": "B",
    })

    return {
        "task_id": "",  # filled by caller
        "summary": info["summary"],
        "risk_rating": info["risk_rating"],
        "risk_findings": [
            {
                "label": "司法风险",
                "level": "medium",
                "score": 65,
                "description": f"{target}近一年涉诉案件 23 起，知识产权纠纷占比 34.8%",
                "trend": "stable",
                "details": [
                    {"item": "知识产权纠纷", "count": 8, "amount": "1,250 万元"},
                    {"item": "合同纠纷", "count": 7, "amount": "890 万元"},
                    {"item": "劳动争议", "count": 5, "amount": "120 万元"},
                    {"item": "其他纠纷", "count": 3, "amount": "45 万元"},
                ],
            },
            {
                "label": "监管合规",
                "level": "high",
                "score": 78,
                "description": "存在 2 项监管问询记录，涉及数据安全与信息披露",
                "trend": "up",
                "details": [
                    {"item": "证监会问询函", "count": 2, "date": "2024-08 / 2024-11"},
                    {"item": "行政处罚", "count": 0, "date": "无"},
                    {"item": "监管整改", "count": 1, "date": "2024-09"},
                ],
            },
            {
                "label": "舆情风险",
                "level": "medium",
                "score": 58,
                "description": "近30天负面舆情 47 条，热度中等",
                "trend": "down",
                "details": [
                    {"item": "产品体验投诉", "count": 22, "sentiment": -0.6},
                    {"item": "数据安全质疑", "count": 15, "sentiment": -0.8},
                    {"item": "管理层变动", "count": 6, "sentiment": -0.3},
                    {"item": "竞品对比", "count": 4, "sentiment": -0.2},
                ],
            },
            {
                "label": "经营风险",
                "level": "low",
                "score": 35,
                "description": "营收增速放缓但利润率保持在合理区间",
                "trend": "stable",
                "details": [
                    {"item": "营收增长率", "value": "-5.2%", "benchmark": "行业均值 3.8%"},
                    {"item": "净利润率", "value": "18.3%", "benchmark": "行业均值 12.1%"},
                    {"item": "资产负债率", "value": "28.7%", "benchmark": "行业均值 42.5%"},
                    {"item": "现金流", "value": "充裕", "benchmark": "覆盖 18 个月运营"},
                ],
            },
            {
                "label": "关联风险",
                "level": "low",
                "score": 25,
                "description": "关联企业风险传导概率较低",
                "trend": "stable",
                "details": [
                    {"item": "子公司", "count": 45, "risk_count": 2},
                    {"item": "对外投资", "count": 23, "risk_count": 1},
                    {"item": "关联担保", "amount": "0 元", "risk": "无"},
                ],
            },
        ],
        "report_sections": [
            {
                "title": "企业概况",
                "content": (
                    f"{target}是一家在相关领域具有重要影响力的企业。"
                    "公司主要业务覆盖多个细分市场，在行业中处于领先地位。"
                    "注册资本充足，股权结构清晰，实际控制人信息透明。"
                ),
            },
            {
                "title": "司法诉讼分析",
                "content": (
                    "经检索裁判文书网及企业信用信息公示系统，"
                    f"{target}近三年累计涉诉 68 起，其中作为被告 31 起、原告 37 起。"
                    "案件类型以合同纠纷和知识产权纠纷为主，涉案金额合计约 3,450 万元。"
                    "未发现涉及刑事犯罪的重大案件。"
                ),
            },
            {
                "title": "监管合规审查",
                "content": (
                    "公司在报告期内收到监管问询函 2 份，均已按要求进行回复。"
                    "问询内容主要涉及数据安全管理和信息披露完整性。"
                    "未发现行政处罚记录，合规管理体系基本健全。"
                ),
            },
            {
                "title": "财务健康度评估",
                "content": (
                    f"{target}最近一期财报显示，公司资产负债率 28.7%，处于行业较低水平。"
                    "经营性现金流充裕，可覆盖约 18 个月的日常运营支出。"
                    "应收账款周转率良好，不存在大额坏账风险。"
                    "但营收增速放缓需关注，Q3 同比下降 5.2%。"
                ),
            },
            {
                "title": "舆情与声誉分析",
                "content": (
                    "基于全网舆情监测，近 30 天涉及该企业的信息共 1,247 条，"
                    "其中负面信息 47 条，占比 3.8%。"
                    "负面信息主要集中在产品体验和数据安全领域。"
                    "整体舆论态势中性偏正面，未出现系统性声誉危机。"
                ),
            },
            {
                "title": "风险总结与建议",
                "content": (
                    f"综合评估，{target}整体风险等级为中等。"
                    "主要风险点集中在监管合规和知识产权诉讼方面。"
                    "建议：1) 持续跟踪监管整改进展；"
                    "2) 关注知识产权诉讼判决结果；"
                    "3) 定期更新舆情监控数据；"
                    "4) 评估数据安全合规对业务的潜在影响。"
                ),
            },
        ],
        "timeline": [
            {"date": "2024-11-15", "event": "收到证监会年报问询函", "type": "regulatory", "level": "high"},
            {"date": "2024-10-22", "event": "被诉知识产权侵权案开庭", "type": "legal", "level": "medium"},
            {"date": "2024-09-18", "event": "完成数据安全合规整改", "type": "regulatory", "level": "info"},
            {"date": "2024-08-30", "event": "发布半年报，营收同比下降 5.2%", "type": "financial", "level": "medium"},
            {"date": "2024-08-10", "event": "收到证监会半年报问询函", "type": "regulatory", "level": "high"},
            {"date": "2024-07-05", "event": "新增劳动仲裁案件 3 起", "type": "legal", "level": "low"},
            {"date": "2024-06-20", "event": "媒体报道数据安全隐患", "type": "media", "level": "medium"},
            {"date": "2024-05-12", "event": "子公司完成工商变更", "type": "corporate", "level": "info"},
            {"date": "2024-04-28", "event": "年报发布，全年营收稳中有降", "type": "financial", "level": "low"},
            {"date": "2024-03-15", "event": "与某机构签署战略合作协议", "type": "business", "level": "info"},
        ],
        "metadata": {
            "agent_id": "risk",
            "target": target,
            "data_sources": [
                "企业信用信息公示系统",
                "中国裁判文书网",
                "国家知识产权局",
                "证监会信息披露平台",
                "全网舆情监测系统",
                "工商注册信息",
                "上市公司公告",
            ],
            "data_coverage": "2022-01-01 至 2026-02-10",
            "confidence_score": 0.87,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "model_version": "kuaicha-risk-v2.1",
        },
    }


def _get_mock_graph_explorer_result(target: str) -> dict:
    """Return relationship explorer mock result with multi-type visualizations."""
    q = target.lower()

    # --- Person business empire template ---
    person_keywords = ["马云", "张一鸣", "马化腾", "任正非", "刘强东", "雷军", "李彦宏", "商业版图"]
    if any(k in q for k in person_keywords):
        person_name = "马云"
        for k in person_keywords[:-1]:
            if k in q:
                person_name = k
                break
        return _mock_person_empire(person_name, target)

    # --- Competition/comparison template ---
    if any(k in q for k in ("竞争", "对比", "和", "vs", "VS")):
        return _mock_competition_graph(target)

    # --- Default: company equity network ---
    return _mock_company_equity(target)


def _mock_person_empire(person: str, target: str) -> dict:
    """Mock: person's business empire with 4 visualization types."""
    return {
        "task_id": "",
        "summary": f"{person}商业版图分析完成，发现关联企业 12 家，涉及多个行业领域。",
        "query_interpretation": f"查询{person}的商业版图，包括其创办、投资和关联的企业网络",
        "entities": [
            {"name": person, "type": "person"},
            {"name": "阿里巴巴集团", "type": "company"},
            {"name": "蚂蚁集团", "type": "company"},
            {"name": "云锋基金", "type": "company"},
            {"name": "湖畔大学", "type": "organization"},
            {"name": "淘宝网", "type": "company"},
            {"name": "支付宝", "type": "company"},
            {"name": "菜鸟网络", "type": "company"},
            {"name": "达摩院", "type": "organization"},
            {"name": "盒马鲜生", "type": "company"},
            {"name": "蔡崇信", "type": "person"},
            {"name": "张勇", "type": "person"},
        ],
        "relationship_summary": (
            f"{person}作为阿里巴巴集团创始人，构建了覆盖电商、金融科技、物流、"
            "云计算、本地生活等多领域的商业帝国。通过云锋基金等投资平台，"
            "其商业影响力延伸至教育、医疗、文娱等众多行业。"
        ),
        "visualizations": [
            {
                "type": "graph",
                "title": f"{person}商业关系网络",
                "description": f"{person}核心商业版图中的企业与人物关系",
                "graph_data": {
                    "nodes": [
                        {"id": "p0", "name": person, "category": "核心人物", "symbol_size": 60},
                        {"id": "c1", "name": "阿里巴巴集团", "category": "创办企业", "symbol_size": 50},
                        {"id": "c2", "name": "蚂蚁集团", "category": "创办企业", "symbol_size": 45},
                        {"id": "c3", "name": "云锋基金", "category": "投资平台", "symbol_size": 38},
                        {"id": "c4", "name": "淘宝网", "category": "创办企业", "symbol_size": 40},
                        {"id": "c5", "name": "支付宝", "category": "创办企业", "symbol_size": 42},
                        {"id": "c6", "name": "菜鸟网络", "category": "创办企业", "symbol_size": 35},
                        {"id": "c7", "name": "盒马鲜生", "category": "创办企业", "symbol_size": 32},
                        {"id": "o1", "name": "湖畔大学", "category": "关联机构", "symbol_size": 30},
                        {"id": "o2", "name": "达摩院", "category": "关联机构", "symbol_size": 30},
                        {"id": "p1", "name": "蔡崇信", "category": "关联人物", "symbol_size": 32},
                        {"id": "p2", "name": "张勇", "category": "关联人物", "symbol_size": 30},
                        {"id": "c8", "name": "阿里云", "category": "创办企业", "symbol_size": 38},
                        {"id": "c9", "name": "饿了么", "category": "投资企业", "symbol_size": 30},
                        {"id": "c10", "name": "高鑫零售", "category": "投资企业", "symbol_size": 28},
                    ],
                    "edges": [
                        {"source": "p0", "target": "c1", "label": "创始人"},
                        {"source": "p0", "target": "c2", "label": "实际控制人"},
                        {"source": "p0", "target": "c3", "label": "联合创始人"},
                        {"source": "p0", "target": "o1", "label": "创办人/校长"},
                        {"source": "c1", "target": "c4", "label": "全资子公司"},
                        {"source": "c1", "target": "c6", "label": "控股 51%"},
                        {"source": "c1", "target": "c8", "label": "全资子公司"},
                        {"source": "c1", "target": "c7", "label": "控股 100%"},
                        {"source": "c2", "target": "c5", "label": "全资子公司"},
                        {"source": "c1", "target": "o2", "label": "设立"},
                        {"source": "p1", "target": "c1", "label": "联合创始人/董事"},
                        {"source": "p2", "target": "c1", "label": "前CEO"},
                        {"source": "c1", "target": "c9", "label": "全资收购"},
                        {"source": "c1", "target": "c10", "label": "控股 72%"},
                        {"source": "c3", "target": "c9", "label": "早期投资"},
                    ],
                    "categories": ["核心人物", "创办企业", "投资平台", "投资企业", "关联机构", "关联人物"],
                },
            },
            {
                "type": "mermaid",
                "title": f"{person}商业版图层级结构",
                "description": "以思维导图形式展示商业版图层级关系",
                "mermaid_code": (
                    f"mindmap\n"
                    f"  root(({person}))\n"
                    f"    电商生态\n"
                    f"      阿里巴巴集团\n"
                    f"        淘宝网\n"
                    f"        天猫\n"
                    f"        菜鸟网络\n"
                    f"        盒马鲜生\n"
                    f"    金融科技\n"
                    f"      蚂蚁集团\n"
                    f"        支付宝\n"
                    f"        芝麻信用\n"
                    f"        花呗/借呗\n"
                    f"    云计算\n"
                    f"      阿里云\n"
                    f"      达摩院\n"
                    f"    投资布局\n"
                    f"      云锋基金\n"
                    f"        饿了么\n"
                    f"        高鑫零售\n"
                    f"    教育公益\n"
                    f"      湖畔大学\n"
                    f"      马云公益基金会\n"
                ),
                "mermaid_type": "mindmap",
            },
            {
                "type": "table",
                "title": "关键持股与任职信息",
                "description": f"{person}在核心企业中的持股与角色",
                "columns": [
                    {"key": "company", "title": "企业"},
                    {"key": "role", "title": "角色"},
                    {"key": "stake", "title": "持股比例"},
                    {"key": "industry", "title": "行业"},
                    {"key": "status", "title": "当前状态"},
                ],
                "rows": [
                    {"company": "阿里巴巴集团", "role": "创始人", "stake": "4.8%", "industry": "电子商务", "status": "已退休"},
                    {"company": "蚂蚁集团", "role": "实控人", "stake": "间接控制", "industry": "金融科技", "status": "已退出管理"},
                    {"company": "云锋基金", "role": "联合创始人", "stake": "GP", "industry": "风险投资", "status": "活跃"},
                    {"company": "湖畔大学", "role": "校长", "stake": "-", "industry": "教育", "status": "活跃"},
                    {"company": "淘宝网", "role": "创始人", "stake": "通过阿里", "industry": "电子商务", "status": "已退休"},
                    {"company": "支付宝", "role": "间接控制", "stake": "通过蚂蚁", "industry": "支付", "status": "已退出"},
                ],
            },
            {
                "type": "echarts",
                "title": "核心企业估值对比",
                "description": "阿里生态核心企业最新估值（亿美元）",
                "chart_type": "bar",
                "echarts_option": {
                    **_DARK_THEME_BASE,
                    "grid": {"left": "3%", "right": "5%", "bottom": "3%", "top": "8%", "containLabel": True},
                    "xAxis": {
                        "type": "category",
                        "data": ["阿里巴巴", "蚂蚁集团", "菜鸟网络", "阿里云", "盒马", "高鑫零售"],
                        "axisLine": {"lineStyle": {"color": "rgba(255,255,255,0.08)"}},
                        "axisLabel": {"color": "rgba(255,255,255,0.4)", "fontSize": 11},
                        "axisTick": {"show": False},
                    },
                    "yAxis": {
                        "type": "value",
                        "name": "估值 (亿美元)",
                        "nameTextStyle": {"color": "rgba(255,255,255,0.35)", "fontSize": 10},
                        "axisLine": {"show": False},
                        "axisLabel": {"color": "rgba(255,255,255,0.4)", "fontSize": 11},
                        "splitLine": {"lineStyle": {"color": "rgba(255,255,255,0.04)"}},
                    },
                    "series": [{
                        "type": "bar",
                        "data": [
                            {"value": 1850, "itemStyle": {"color": "#06B6D4"}},
                            {"value": 780, "itemStyle": {"color": "#34D399"}},
                            {"value": 260, "itemStyle": {"color": "#A78BFA"}},
                            {"value": 380, "itemStyle": {"color": "#4A9EFF"}},
                            {"value": 100, "itemStyle": {"color": "#F97316"}},
                            {"value": 45, "itemStyle": {"color": "#F59E0B"}},
                        ],
                        "barWidth": "45%",
                        "itemStyle": {"borderRadius": [6, 6, 0, 0]},
                        "label": {
                            "show": True, "position": "top",
                            "color": "rgba(255,255,255,0.6)", "fontSize": 11,
                        },
                    }],
                },
            },
        ],
        "data_sources": ["企查查", "天眼查", "Wind", "公开报道", "SEC 公告"],
        "metadata": {
            "agent_id": "graph",
            "target": target if target != person else f"{person}的商业版图",
            "confidence_score": 0.85,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "model_version": "kuaicha-graph-v1.0",
        },
    }


def _mock_competition_graph(target: str) -> dict:
    """Mock: company competition/comparison with 4 visualization types."""
    # Extract company names heuristically
    parts = target.replace("和", " ").replace("与", " ").replace("vs", " ").replace("VS", " ").split()
    companies = [p for p in parts if len(p) >= 2 and p not in ("竞争", "关系", "对比", "的")][:2]
    if len(companies) < 2:
        companies = ["腾讯", "阿里巴巴"]
    c1, c2 = companies[0], companies[1]

    return {
        "task_id": "",
        "summary": f"{c1}与{c2}竞争关系分析完成，两家企业在多个业务领域存在直接竞争。",
        "query_interpretation": f"分析{c1}和{c2}之间的竞争关系、业务重叠和市场格局",
        "entities": [
            {"name": c1, "type": "company"},
            {"name": c2, "type": "company"},
            {"name": "电子商务", "type": "event"},
            {"name": "云计算", "type": "event"},
            {"name": "金融科技", "type": "event"},
            {"name": "社交媒体", "type": "event"},
        ],
        "relationship_summary": (
            f"{c1}和{c2}是中国互联网行业的两大巨头，在电商、云计算、金融科技、"
            f"本地生活、文娱等多个领域展开激烈竞争。两家企业各自构建了庞大的生态体系，"
            f"通过投资并购不断扩展业务边界。"
        ),
        "visualizations": [
            {
                "type": "graph",
                "title": f"{c1} vs {c2} 竞争版图",
                "description": "两家企业及其子公司在各业务领域的竞争关系",
                "graph_data": {
                    "nodes": [
                        {"id": "a", "name": c1, "category": c1, "symbol_size": 55},
                        {"id": "b", "name": c2, "category": c2, "symbol_size": 55},
                        {"id": "a1", "name": f"{c1}云", "category": c1, "symbol_size": 35},
                        {"id": "b1", "name": f"{c2}云", "category": c2, "symbol_size": 35},
                        {"id": "a2", "name": "微信支付", "category": c1, "symbol_size": 35},
                        {"id": "b2", "name": "支付宝", "category": c2, "symbol_size": 35},
                        {"id": "a3", "name": "拼多多（投资）", "category": c1, "symbol_size": 30},
                        {"id": "b3", "name": "淘宝天猫", "category": c2, "symbol_size": 38},
                        {"id": "a4", "name": "美团（投资）", "category": c1, "symbol_size": 32},
                        {"id": "b4", "name": "饿了么", "category": c2, "symbol_size": 30},
                        {"id": "s1", "name": "电商赛道", "category": "竞争领域", "symbol_size": 25},
                        {"id": "s2", "name": "云计算赛道", "category": "竞争领域", "symbol_size": 25},
                        {"id": "s3", "name": "支付赛道", "category": "竞争领域", "symbol_size": 25},
                        {"id": "s4", "name": "本地生活赛道", "category": "竞争领域", "symbol_size": 25},
                    ],
                    "edges": [
                        {"source": "a", "target": "b", "label": "核心竞争"},
                        {"source": "a", "target": "a1", "label": "旗下"},
                        {"source": "b", "target": "b1", "label": "旗下"},
                        {"source": "a", "target": "a2", "label": "旗下"},
                        {"source": "b", "target": "b2", "label": "旗下"},
                        {"source": "a", "target": "a3", "label": "战略投资"},
                        {"source": "b", "target": "b3", "label": "旗下"},
                        {"source": "a", "target": "a4", "label": "战略投资"},
                        {"source": "b", "target": "b4", "label": "全资收购"},
                        {"source": "a1", "target": "s2", "label": "竞争"},
                        {"source": "b1", "target": "s2", "label": "竞争"},
                        {"source": "a2", "target": "s3", "label": "竞争"},
                        {"source": "b2", "target": "s3", "label": "竞争"},
                        {"source": "a4", "target": "s4", "label": "竞争"},
                        {"source": "b4", "target": "s4", "label": "竞争"},
                    ],
                    "categories": [c1, c2, "竞争领域"],
                },
            },
            {
                "type": "mermaid",
                "title": "竞争领域对照",
                "description": "两家企业在各业务赛道的对应关系",
                "mermaid_code": (
                    f"flowchart LR\n"
                    f"    A[{c1}] --- E[电商]\n"
                    f"    B[{c2}] --- E\n"
                    f"    A --- C[云计算]\n"
                    f"    B --- C\n"
                    f"    A --- P[支付]\n"
                    f"    B --- P\n"
                    f"    A --- L[本地生活]\n"
                    f"    B --- L\n"
                    f"    A --- M[文娱]\n"
                    f"    B --- M\n"
                ),
                "mermaid_type": "flowchart",
            },
            {
                "type": "echarts",
                "title": "多维度竞争力对比",
                "description": f"{c1}与{c2}在主要业务维度的竞争力评分",
                "chart_type": "radar",
                "echarts_option": {
                    **_DARK_THEME_BASE,
                    "legend": {
                        "data": [c1, c2],
                        "textStyle": {"color": "rgba(255,255,255,0.5)", "fontSize": 11},
                        "bottom": 0,
                    },
                    "radar": {
                        "indicator": [
                            {"name": "电商", "max": 100},
                            {"name": "云计算", "max": 100},
                            {"name": "金融科技", "max": 100},
                            {"name": "社交/内容", "max": 100},
                            {"name": "本地生活", "max": 100},
                            {"name": "国际化", "max": 100},
                        ],
                        "shape": "circle",
                        "axisLine": {"lineStyle": {"color": "rgba(255,255,255,0.08)"}},
                        "splitLine": {"lineStyle": {"color": "rgba(255,255,255,0.06)"}},
                        "splitArea": {"show": False},
                        "axisName": {"color": "rgba(255,255,255,0.5)", "fontSize": 11},
                    },
                    "series": [{
                        "type": "radar",
                        "data": [
                            {
                                "value": [55, 42, 65, 95, 70, 45],
                                "name": c1,
                                "lineStyle": {"color": "#06B6D4"},
                                "itemStyle": {"color": "#06B6D4"},
                                "areaStyle": {"color": "rgba(6,182,212,0.15)"},
                            },
                            {
                                "value": [92, 78, 88, 45, 60, 72],
                                "name": c2,
                                "lineStyle": {"color": "#F97316"},
                                "itemStyle": {"color": "#F97316"},
                                "areaStyle": {"color": "rgba(249,115,22,0.15)"},
                            },
                        ],
                    }],
                },
            },
            {
                "type": "table",
                "title": "核心业务指标对比",
                "description": "两家企业在核心业务领域的关键指标",
                "columns": [
                    {"key": "metric", "title": "指标"},
                    {"key": "company_a", "title": c1},
                    {"key": "company_b", "title": c2},
                    {"key": "leader", "title": "领先方"},
                ],
                "rows": [
                    {"metric": "总营收 (亿元)", "company_a": "6,090", "company_b": "8,687", "leader": c2},
                    {"metric": "净利润 (亿元)", "company_a": "1,577", "company_b": "725", "leader": c1},
                    {"metric": "云计算收入 (亿元)", "company_a": "422", "company_b": "1,064", "leader": c2},
                    {"metric": "支付市场份额", "company_a": "38.8%", "company_b": "54.5%", "leader": c2},
                    {"metric": "电商 GMV (万亿)", "company_a": "-", "company_b": "8.3", "leader": c2},
                    {"metric": "社交用户 (亿)", "company_a": "13.4", "company_b": "-", "leader": c1},
                ],
            },
        ],
        "data_sources": ["Wind", "公司年报", "艾瑞咨询", "QuestMobile"],
        "metadata": {
            "agent_id": "graph",
            "target": target,
            "confidence_score": 0.82,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "model_version": "kuaicha-graph-v1.0",
        },
    }


def _mock_company_equity(target: str) -> dict:
    """Mock: default company equity network with graph + table."""
    # Extract company name (remove common suffixes)
    company = target.strip()
    for suffix in ("的股权关系", "股权穿透", "的关系", "关系图谱", "关系网络"):
        company = company.replace(suffix, "")
    company = company.strip() or "同花顺"

    return {
        "task_id": "",
        "summary": f"{company}股权关系网络分析完成，发现关联实体 13 个，涉及 12 条关系链路。",
        "query_interpretation": f"查询{company}的股权结构、高管团队和商业关系网络",
        "entities": [
            {"name": company, "type": "company"},
            {"name": f"{company}科技子公司", "type": "company"},
            {"name": f"{company}投资有限公司", "type": "company"},
            {"name": "张某某", "type": "person"},
            {"name": "李某某", "type": "person"},
            {"name": "红杉资本", "type": "company"},
        ],
        "relationship_summary": (
            f"{company}股权结构清晰，实际控制人通过直接和间接方式控制公司。"
            f"公司下设 3 家主要子公司，涵盖技术研发、投资管理和数据服务等领域。"
            f"外部投资方包括知名风投机构，合作方和竞争对手关系网络健全。"
        ),
        "visualizations": [
            {
                "type": "graph",
                "title": f"{company}关系网络图",
                "description": "包含股权、人员、投资和竞争关系的综合网络",
                "graph_data": {
                    "nodes": [
                        {"id": "center", "name": company, "category": "核心企业", "symbol_size": 55},
                        {"id": "sh1", "name": f"{company}科技子公司", "category": "子公司", "symbol_size": 35},
                        {"id": "sh2", "name": f"{company}投资有限公司", "category": "子公司", "symbol_size": 35},
                        {"id": "sh3", "name": f"{company}数据服务公司", "category": "子公司", "symbol_size": 30},
                        {"id": "p1", "name": "张某某", "category": "自然人", "symbol_size": 28},
                        {"id": "p2", "name": "李某某", "category": "自然人", "symbol_size": 28},
                        {"id": "p3", "name": "王某某", "category": "自然人", "symbol_size": 25},
                        {"id": "inv1", "name": "红杉资本", "category": "投资方", "symbol_size": 32},
                        {"id": "inv2", "name": "国投创新", "category": "投资方", "symbol_size": 30},
                        {"id": "sup1", "name": "华为技术", "category": "合作方", "symbol_size": 30},
                        {"id": "sup2", "name": "阿里云", "category": "合作方", "symbol_size": 30},
                        {"id": "comp1", "name": "东方财富", "category": "竞争对手", "symbol_size": 32},
                        {"id": "comp2", "name": "大智慧", "category": "竞争对手", "symbol_size": 28},
                    ],
                    "edges": [
                        {"source": "center", "target": "sh1", "label": "控股 100%"},
                        {"source": "center", "target": "sh2", "label": "控股 80%"},
                        {"source": "center", "target": "sh3", "label": "控股 65%"},
                        {"source": "p1", "target": "center", "label": "董事长/实控人"},
                        {"source": "p2", "target": "center", "label": "总经理"},
                        {"source": "p3", "target": "sh1", "label": "法人代表"},
                        {"source": "inv1", "target": "center", "label": "B轮投资"},
                        {"source": "inv2", "target": "center", "label": "战略投资"},
                        {"source": "center", "target": "sup1", "label": "技术合作"},
                        {"source": "center", "target": "sup2", "label": "云服务采购"},
                        {"source": "center", "target": "comp1", "label": "同业竞争"},
                        {"source": "center", "target": "comp2", "label": "同业竞争"},
                    ],
                    "categories": ["核心企业", "子公司", "自然人", "投资方", "合作方", "竞争对手"],
                },
            },
            {
                "type": "table",
                "title": "股权结构明细",
                "description": f"{company}主要股东及持股信息",
                "columns": [
                    {"key": "shareholder", "title": "股东"},
                    {"key": "type", "title": "类型"},
                    {"key": "stake", "title": "持股比例"},
                    {"key": "role", "title": "关联角色"},
                    {"key": "amount", "title": "认缴金额"},
                ],
                "rows": [
                    {"shareholder": "张某某", "type": "自然人", "stake": "35.2%", "role": "董事长/实控人", "amount": "3,520 万"},
                    {"shareholder": "李某某", "type": "自然人", "stake": "18.5%", "role": "总经理", "amount": "1,850 万"},
                    {"shareholder": "红杉资本", "type": "机构", "stake": "12.0%", "role": "B 轮投资方", "amount": "1,200 万"},
                    {"shareholder": "国投创新", "type": "机构", "stake": "8.3%", "role": "战略投资方", "amount": "830 万"},
                    {"shareholder": "员工持股平台", "type": "有限合伙", "stake": "6.0%", "role": "激励平台", "amount": "600 万"},
                    {"shareholder": "其他", "type": "公众", "stake": "20.0%", "role": "-", "amount": "2,000 万"},
                ],
            },
        ],
        "data_sources": ["企查查", "天眼查", "国家企业信用信息公示系统"],
        "metadata": {
            "agent_id": "graph",
            "target": target,
            "confidence_score": 0.88,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "model_version": "kuaicha-graph-v1.0",
        },
    }


# ---------------------------------------------------------------------------
# Trend Explorer mock results
# ---------------------------------------------------------------------------

def _get_mock_trend_explorer_result(target: str) -> dict:
    """Return trend analysis mock result.

    Three templates based on query keywords:
    - "对比" / "vs" → multi-company comparison
    - "行业" → industry trend
    - default → single-company deep trend
    """
    lower = target.lower()
    if "对比" in target or "vs" in lower or "VS" in target:
        return _mock_trend_comparison(target)
    if "行业" in target:
        return _mock_trend_industry(target)
    return _mock_trend_single(target)


def _mock_trend_comparison(target: str) -> dict:
    """Multi-company comparison template."""
    return {
        "summary": f"「{target}」多维度对比分析完成，从风险趋势、经营指标和市场表现三个维度进行了横向对比。",
        "query_interpretation": f"对「{target}」进行多企业/多维度对比趋势分析",
        "entities": [
            {"name": "企业A", "type": "company"},
            {"name": "企业B", "type": "company"},
        ],
        "trend_summary": (
            f"基于{target}的对比分析：两家企业在风险评分上呈现差异化走势，"
            "企业A近半年风险评分持续走低（改善），企业B则因监管处罚有所上升。"
            "经营方面，企业A营收增速领先但利润率不及企业B。"
        ),
        "visualizations": [
            {
                "type": "echarts",
                "title": "综合风险评分对比",
                "description": "两家企业近12个月综合风险评分走势对比",
                "chart_type": "line",
                "echarts_option": {
                    "backgroundColor": "transparent",
                    "tooltip": {"trigger": "axis"},
                    "legend": {
                        "data": ["企业A", "企业B"],
                        "textStyle": {"color": "rgba(255,255,255,0.7)"},
                    },
                    "grid": {"left": "3%", "right": "4%", "bottom": "3%", "containLabel": True},
                    "xAxis": {
                        "type": "category",
                        "data": ["3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月", "1月", "2月"],
                        "axisLabel": {"color": "rgba(255,255,255,0.5)"},
                    },
                    "yAxis": {
                        "type": "value",
                        "name": "风险评分",
                        "axisLabel": {"color": "rgba(255,255,255,0.5)"},
                        "splitLine": {"lineStyle": {"color": "rgba(255,255,255,0.06)"}},
                    },
                    "series": [
                        {
                            "name": "企业A",
                            "type": "line",
                            "data": [68, 65, 62, 58, 55, 52, 48, 45, 43, 40, 38, 35],
                            "smooth": True,
                            "lineStyle": {"color": "#4A9EFF"},
                            "itemStyle": {"color": "#4A9EFF"},
                        },
                        {
                            "name": "企业B",
                            "type": "line",
                            "data": [42, 44, 43, 47, 52, 58, 62, 60, 63, 65, 61, 59],
                            "smooth": True,
                            "lineStyle": {"color": "#F59E0B"},
                            "itemStyle": {"color": "#F59E0B"},
                        },
                    ],
                },
            },
            {
                "type": "echarts",
                "title": "核心指标雷达对比",
                "description": "企业A与企业B在各维度的最新评分对比",
                "chart_type": "radar",
                "echarts_option": {
                    "backgroundColor": "transparent",
                    "legend": {
                        "data": ["企业A", "企业B"],
                        "textStyle": {"color": "rgba(255,255,255,0.7)"},
                    },
                    "radar": {
                        "indicator": [
                            {"name": "营收增速", "max": 100},
                            {"name": "利润率", "max": 100},
                            {"name": "市场份额", "max": 100},
                            {"name": "研发投入", "max": 100},
                            {"name": "风控能力", "max": 100},
                            {"name": "品牌影响", "max": 100},
                        ],
                        "axisName": {"color": "rgba(255,255,255,0.5)"},
                        "splitLine": {"lineStyle": {"color": "rgba(255,255,255,0.08)"}},
                        "splitArea": {"areaStyle": {"color": ["transparent"]}},
                    },
                    "series": [
                        {
                            "type": "radar",
                            "data": [
                                {"value": [85, 62, 70, 78, 82, 75], "name": "企业A",
                                 "lineStyle": {"color": "#4A9EFF"}, "itemStyle": {"color": "#4A9EFF"},
                                 "areaStyle": {"color": "rgba(74,158,255,0.15)"}},
                                {"value": [68, 78, 65, 55, 58, 80], "name": "企业B",
                                 "lineStyle": {"color": "#F59E0B"}, "itemStyle": {"color": "#F59E0B"},
                                 "areaStyle": {"color": "rgba(245,158,11,0.15)"}},
                            ],
                        },
                    ],
                },
            },
            {
                "type": "table",
                "title": "关键指标对比明细",
                "description": "两家企业最新财务与风险指标对比",
                "columns": [
                    {"key": "metric", "title": "指标"},
                    {"key": "companyA", "title": "企业A"},
                    {"key": "companyB", "title": "企业B"},
                    {"key": "diff", "title": "差异"},
                ],
                "rows": [
                    {"metric": "综合风险评分", "companyA": "35", "companyB": "59", "diff": "-24 (A更优)"},
                    {"metric": "营收增速", "companyA": "18.5%", "companyB": "12.3%", "diff": "+6.2pp"},
                    {"metric": "净利润率", "companyA": "14.2%", "companyB": "19.8%", "diff": "-5.6pp"},
                    {"metric": "研发投入占比", "companyA": "15.3%", "companyB": "8.7%", "diff": "+6.6pp"},
                    {"metric": "涉诉案件", "companyA": "12起", "companyB": "28起", "diff": "-16起"},
                    {"metric": "负面舆情量", "companyA": "23条/月", "companyB": "67条/月", "diff": "-44条"},
                ],
            },
        ],
        "data_sources": ["天眼查", "企查查", "巨潮资讯网", "中国裁判文书网"],
        "metadata": {
            "agent_id": "trend",
            "target": target,
            "confidence_score": 0.85,
            "generated_at": datetime.utcnow().isoformat() + "Z",
        },
    }


def _mock_trend_industry(target: str) -> dict:
    """Industry trend template."""
    return {
        "summary": f"「{target}」行业趋势分析完成，涵盖行业整体走势、头部企业表现和政策影响分析。",
        "query_interpretation": f"分析「{target}」的行业整体趋势和发展方向",
        "entities": [
            {"name": target, "type": "industry"},
        ],
        "trend_summary": (
            f"{target}整体呈现稳步增长态势，过去一年行业规模增长约12%。"
            "头部企业集中度提升，CR5从38%上升至42%。"
            "政策端持续释放利好信号，行业监管趋于规范化。"
        ),
        "visualizations": [
            {
                "type": "echarts",
                "title": "行业规模与增速趋势",
                "description": f"{target}近4个季度市场规模及同比增速",
                "chart_type": "line",
                "echarts_option": {
                    "backgroundColor": "transparent",
                    "tooltip": {"trigger": "axis"},
                    "legend": {
                        "data": ["市场规模(亿元)", "同比增速(%)"],
                        "textStyle": {"color": "rgba(255,255,255,0.7)"},
                    },
                    "grid": {"left": "3%", "right": "4%", "bottom": "3%", "containLabel": True},
                    "xAxis": {
                        "type": "category",
                        "data": ["2025Q1", "2025Q2", "2025Q3", "2025Q4"],
                        "axisLabel": {"color": "rgba(255,255,255,0.5)"},
                    },
                    "yAxis": [
                        {
                            "type": "value", "name": "规模(亿元)",
                            "axisLabel": {"color": "rgba(255,255,255,0.5)"},
                            "splitLine": {"lineStyle": {"color": "rgba(255,255,255,0.06)"}},
                        },
                        {
                            "type": "value", "name": "增速(%)",
                            "axisLabel": {"color": "rgba(255,255,255,0.5)"},
                            "splitLine": {"show": False},
                        },
                    ],
                    "series": [
                        {
                            "name": "市场规模(亿元)",
                            "type": "bar",
                            "data": [2850, 3120, 3380, 3650],
                            "itemStyle": {"color": "rgba(52,211,153,0.7)", "borderRadius": [4, 4, 0, 0]},
                        },
                        {
                            "name": "同比增速(%)",
                            "type": "line",
                            "yAxisIndex": 1,
                            "data": [8.5, 10.2, 12.1, 14.3],
                            "smooth": True,
                            "lineStyle": {"color": "#4A9EFF"},
                            "itemStyle": {"color": "#4A9EFF"},
                        },
                    ],
                },
            },
            {
                "type": "echarts",
                "title": "头部企业市场份额",
                "description": "行业TOP5企业最新市场份额分布",
                "chart_type": "bar",
                "echarts_option": {
                    "backgroundColor": "transparent",
                    "tooltip": {"trigger": "axis"},
                    "grid": {"left": "3%", "right": "4%", "bottom": "3%", "containLabel": True},
                    "xAxis": {
                        "type": "value",
                        "axisLabel": {"color": "rgba(255,255,255,0.5)", "formatter": "{value}%"},
                        "splitLine": {"lineStyle": {"color": "rgba(255,255,255,0.06)"}},
                    },
                    "yAxis": {
                        "type": "category",
                        "data": ["其他", "企业E", "企业D", "企业C", "企业B", "企业A"],
                        "axisLabel": {"color": "rgba(255,255,255,0.7)"},
                    },
                    "series": [
                        {
                            "type": "bar",
                            "data": [
                                {"value": 58, "itemStyle": {"color": "rgba(255,255,255,0.15)"}},
                                {"value": 4.2, "itemStyle": {"color": "#8B5CF6"}},
                                {"value": 5.8, "itemStyle": {"color": "#F59E0B"}},
                                {"value": 7.5, "itemStyle": {"color": "#F97316"}},
                                {"value": 10.2, "itemStyle": {"color": "#4A9EFF"}},
                                {"value": 14.3, "itemStyle": {"color": "#34D399"}},
                            ],
                            "barWidth": "60%",
                            "itemStyle": {"borderRadius": [0, 4, 4, 0]},
                        },
                    ],
                },
            },
            {
                "type": "table",
                "title": "行业关键指标追踪",
                "description": "行业核心数据季度对比",
                "columns": [
                    {"key": "metric", "title": "指标"},
                    {"key": "q1", "title": "2025Q1"},
                    {"key": "q2", "title": "2025Q2"},
                    {"key": "q3", "title": "2025Q3"},
                    {"key": "q4", "title": "2025Q4"},
                    {"key": "change", "title": "变化趋势"},
                ],
                "rows": [
                    {"metric": "市场规模(亿元)", "q1": "2,850", "q2": "3,120", "q3": "3,380", "q4": "3,650", "change": "↑ 持续增长"},
                    {"metric": "企业数量", "q1": "1,245", "q2": "1,312", "q3": "1,389", "q4": "1,456", "change": "↑ 稳步扩容"},
                    {"metric": "平均利润率", "q1": "12.3%", "q2": "11.8%", "q3": "12.5%", "q4": "13.1%", "change": "↑ 小幅改善"},
                    {"metric": "CR5集中度", "q1": "38.2%", "q2": "39.1%", "q3": "40.5%", "q4": "42.0%", "change": "↑ 加速集中"},
                    {"metric": "融资事件", "q1": "28起", "q2": "35起", "q3": "42起", "q4": "38起", "change": "→ 相对平稳"},
                ],
            },
        ],
        "data_sources": ["国家统计局", "行业协会报告", "Wind金融终端", "企查查"],
        "metadata": {
            "agent_id": "trend",
            "target": target,
            "confidence_score": 0.82,
            "generated_at": datetime.utcnow().isoformat() + "Z",
        },
    }


def _mock_trend_single(target: str) -> dict:
    """Single-company deep trend template (default)."""
    company = target.replace("趋势", "").replace("分析", "").replace("风险", "").strip() or target
    return {
        "summary": f"{company}趋势分析完成，涵盖风险评分走势、经营指标变化、行业对比和关键事件时间线。",
        "query_interpretation": f"对{company}进行全面趋势分析，追踪其风险和经营指标变化",
        "entities": [
            {"name": company, "type": "company"},
        ],
        "trend_summary": (
            f"{company}过去一年综合风险评分从62分逐步降至45分，整体风险持续改善。"
            "营收保持两位数增长，但利润率受研发投入加大影响略有下降。"
            "在行业中处于中上游水平，竞争力稳步提升。"
        ),
        "visualizations": [
            {
                "type": "echarts",
                "title": f"{company}综合风险评分趋势",
                "description": "近12个月综合风险评分走势（含各分项）",
                "chart_type": "line",
                "echarts_option": {
                    "backgroundColor": "transparent",
                    "tooltip": {"trigger": "axis"},
                    "legend": {
                        "data": ["综合评分", "司法风险", "监管风险", "舆情风险"],
                        "textStyle": {"color": "rgba(255,255,255,0.7)"},
                    },
                    "grid": {"left": "3%", "right": "4%", "bottom": "3%", "containLabel": True},
                    "xAxis": {
                        "type": "category",
                        "data": ["3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月", "1月", "2月"],
                        "axisLabel": {"color": "rgba(255,255,255,0.5)"},
                    },
                    "yAxis": {
                        "type": "value",
                        "name": "评分",
                        "axisLabel": {"color": "rgba(255,255,255,0.5)"},
                        "splitLine": {"lineStyle": {"color": "rgba(255,255,255,0.06)"}},
                    },
                    "series": [
                        {
                            "name": "综合评分", "type": "line", "smooth": True,
                            "data": [62, 60, 58, 55, 53, 52, 50, 48, 47, 46, 45, 45],
                            "lineStyle": {"color": "#34D399", "width": 3},
                            "itemStyle": {"color": "#34D399"},
                            "areaStyle": {"color": {"type": "linear", "x": 0, "y": 0, "x2": 0, "y2": 1,
                                "colorStops": [
                                    {"offset": 0, "color": "rgba(52,211,153,0.25)"},
                                    {"offset": 1, "color": "rgba(52,211,153,0)"},
                                ]}},
                        },
                        {
                            "name": "司法风险", "type": "line", "smooth": True,
                            "data": [70, 68, 65, 60, 58, 55, 52, 50, 48, 47, 45, 44],
                            "lineStyle": {"color": "#EF4444"}, "itemStyle": {"color": "#EF4444"},
                        },
                        {
                            "name": "监管风险", "type": "line", "smooth": True,
                            "data": [55, 53, 52, 50, 48, 50, 48, 46, 45, 44, 43, 42],
                            "lineStyle": {"color": "#F59E0B"}, "itemStyle": {"color": "#F59E0B"},
                        },
                        {
                            "name": "舆情风险", "type": "line", "smooth": True,
                            "data": [58, 56, 55, 52, 50, 48, 47, 45, 46, 45, 44, 43],
                            "lineStyle": {"color": "#8B5CF6"}, "itemStyle": {"color": "#8B5CF6"},
                        },
                    ],
                },
            },
            {
                "type": "echarts",
                "title": f"{company}营收与利润趋势",
                "description": "近4个季度营收规模和净利润率变化",
                "chart_type": "bar",
                "echarts_option": {
                    "backgroundColor": "transparent",
                    "tooltip": {"trigger": "axis"},
                    "legend": {
                        "data": ["营收(亿元)", "净利润率(%)"],
                        "textStyle": {"color": "rgba(255,255,255,0.7)"},
                    },
                    "grid": {"left": "3%", "right": "4%", "bottom": "3%", "containLabel": True},
                    "xAxis": {
                        "type": "category",
                        "data": ["2025Q1", "2025Q2", "2025Q3", "2025Q4"],
                        "axisLabel": {"color": "rgba(255,255,255,0.5)"},
                    },
                    "yAxis": [
                        {
                            "type": "value", "name": "营收(亿元)",
                            "axisLabel": {"color": "rgba(255,255,255,0.5)"},
                            "splitLine": {"lineStyle": {"color": "rgba(255,255,255,0.06)"}},
                        },
                        {
                            "type": "value", "name": "利润率(%)",
                            "axisLabel": {"color": "rgba(255,255,255,0.5)"},
                            "splitLine": {"show": False},
                        },
                    ],
                    "series": [
                        {
                            "name": "营收(亿元)", "type": "bar",
                            "data": [45.2, 48.7, 52.1, 56.8],
                            "itemStyle": {"color": "rgba(74,158,255,0.7)", "borderRadius": [4, 4, 0, 0]},
                        },
                        {
                            "name": "净利润率(%)", "type": "line", "yAxisIndex": 1,
                            "data": [18.5, 17.8, 16.9, 16.2],
                            "smooth": True,
                            "lineStyle": {"color": "#F59E0B"},
                            "itemStyle": {"color": "#F59E0B"},
                        },
                    ],
                },
            },
            {
                "type": "table",
                "title": f"{company}关键指标追踪",
                "description": "核心经营与风险指标季度变化",
                "columns": [
                    {"key": "metric", "title": "指标"},
                    {"key": "q1", "title": "2025Q1"},
                    {"key": "q2", "title": "2025Q2"},
                    {"key": "q3", "title": "2025Q3"},
                    {"key": "q4", "title": "2025Q4"},
                    {"key": "trend", "title": "趋势"},
                ],
                "rows": [
                    {"metric": "综合风险评分", "q1": "58", "q2": "53", "q3": "48", "q4": "45", "trend": "↓ 持续改善"},
                    {"metric": "营收(亿元)", "q1": "45.2", "q2": "48.7", "q3": "52.1", "q4": "56.8", "trend": "↑ 稳步增长"},
                    {"metric": "净利润率", "q1": "18.5%", "q2": "17.8%", "q3": "16.9%", "q4": "16.2%", "trend": "↓ 小幅收窄"},
                    {"metric": "研发投入占比", "q1": "12.3%", "q2": "13.1%", "q3": "14.2%", "q4": "15.0%", "trend": "↑ 持续加大"},
                    {"metric": "涉诉案件", "q1": "8起", "q2": "6起", "q3": "5起", "q4": "4起", "trend": "↓ 明显减少"},
                    {"metric": "行业排名", "q1": "第15位", "q2": "第13位", "q3": "第11位", "q4": "第9位", "trend": "↑ 稳步提升"},
                ],
            },
            {
                "type": "mermaid",
                "title": f"{company}关键事件时间线",
                "description": "过去一年影响趋势的重大事件",
                "mermaid_type": "timeline",
                "mermaid_code": (
                    "timeline\n"
                    f"    title {company}关键事件\n"
                    "    2025Q1 : 完成新一轮融资\n"
                    "           : 启动数字化转型\n"
                    "    2025Q2 : 获得行业资质认证\n"
                    "           : 发布新产品线\n"
                    "    2025Q3 : 签署战略合作协议\n"
                    "           : 完成合规整改\n"
                    "    2025Q4 : 营收创历史新高\n"
                    "           : 入选行业TOP10"
                ),
            },
        ],
        "data_sources": ["天眼查", "巨潮资讯网", "国家企业信用信息公示系统", "行业研究报告"],
        "metadata": {
            "agent_id": "trend",
            "target": target,
            "confidence_score": 0.88,
            "generated_at": datetime.utcnow().isoformat() + "Z",
        },
    }


# ---------------------------------------------------------------------------
# Agent config schemas
# ---------------------------------------------------------------------------

def get_mock_agent_config(agent_id: str) -> dict:
    """Return the configuration schema for a given agent."""

    _configs = {
        "risk": {
            "agent_id": "risk",
            "fields": [
                {
                    "name": "target",
                    "label": "目标企业",
                    "type": "text",
                    "required": True,
                    "placeholder": "请输入企业名称，如：同花顺",
                },
                {
                    "name": "depth",
                    "label": "尽调深度",
                    "type": "select",
                    "required": False,
                    "options": [
                        {"label": "快速扫描", "value": "quick"},
                        {"label": "标准尽调", "value": "standard"},
                        {"label": "深度尽调", "value": "deep"},
                    ],
                    "default": "standard",
                },
                {
                    "name": "include_associates",
                    "label": "包含关联企业",
                    "type": "boolean",
                    "required": False,
                    "default": True,
                },
                {
                    "name": "time_range",
                    "label": "数据时间范围",
                    "type": "select",
                    "required": False,
                    "options": [
                        {"label": "近1年", "value": "1y"},
                        {"label": "近3年", "value": "3y"},
                        {"label": "近5年", "value": "5y"},
                    ],
                    "default": "3y",
                },
            ],
        },
        "sentiment": {
            "agent_id": "sentiment",
            "fields": [
                {
                    "name": "target",
                    "label": "监控目标",
                    "type": "text",
                    "required": True,
                    "placeholder": "请输入企业名称或关键词",
                },
                {
                    "name": "period",
                    "label": "监控周期",
                    "type": "select",
                    "required": False,
                    "options": [
                        {"label": "每日", "value": "daily"},
                        {"label": "每周", "value": "weekly"},
                        {"label": "每月", "value": "monthly"},
                    ],
                    "default": "weekly",
                },
                {
                    "name": "sources",
                    "label": "数据源",
                    "type": "select",
                    "required": False,
                    "options": [
                        {"label": "全部", "value": "all"},
                        {"label": "新闻媒体", "value": "news"},
                        {"label": "社交媒体", "value": "social"},
                        {"label": "论坛社区", "value": "forum"},
                    ],
                    "default": "all",
                },
            ],
        },
        "bid": {
            "agent_id": "bid",
            "fields": [
                {
                    "name": "target",
                    "label": "目标企业/行业",
                    "type": "text",
                    "required": True,
                    "placeholder": "请输入企业名称或行业关键词",
                },
                {
                    "name": "region",
                    "label": "地区范围",
                    "type": "text",
                    "required": False,
                    "placeholder": "如：浙江省、全国",
                    "default": "全国",
                },
                {
                    "name": "min_amount",
                    "label": "最低金额（万元）",
                    "type": "number",
                    "required": False,
                    "default": 100,
                },
            ],
        },
        "tech": {
            "agent_id": "tech",
            "fields": [
                {
                    "name": "target",
                    "label": "目标企业",
                    "type": "text",
                    "required": True,
                    "placeholder": "请输入企业名称，如：同花顺",
                },
                {
                    "name": "focus",
                    "label": "评估重点",
                    "type": "select",
                    "required": False,
                    "options": [
                        {"label": "全面评估", "value": "comprehensive"},
                        {"label": "专利分析", "value": "patent"},
                        {"label": "研发能力", "value": "rd"},
                        {"label": "人才评估", "value": "talent"},
                    ],
                    "default": "comprehensive",
                },
                {
                    "name": "benchmark",
                    "label": "对标行业",
                    "type": "select",
                    "required": False,
                    "options": [
                        {"label": "自动识别", "value": "auto"},
                        {"label": "信息技术", "value": "it"},
                        {"label": "制造业", "value": "manufacturing"},
                        {"label": "医药健康", "value": "pharma"},
                    ],
                    "default": "auto",
                },
            ],
        },
        "graph": {
            "agent_id": "graph",
            "fields": [
                {
                    "name": "target",
                    "label": "查询内容",
                    "type": "text",
                    "required": True,
                    "placeholder": "例如：马云的商业版图、腾讯和阿里的竞争关系",
                },
                {
                    "name": "depth",
                    "label": "探索深度",
                    "type": "select",
                    "required": False,
                    "options": [
                        {"label": "核心关系", "value": "shallow"},
                        {"label": "标准探索", "value": "standard"},
                        {"label": "深度穿透", "value": "deep"},
                    ],
                    "default": "standard",
                },
            ],
        },
        "trend": {
            "agent_id": "trend",
            "fields": [
                {
                    "name": "target",
                    "label": "查询内容",
                    "type": "text",
                    "required": True,
                    "placeholder": "例如：同花顺近一年风险趋势、比亚迪 vs 宁德时代",
                },
                {
                    "name": "time_range",
                    "label": "时间范围",
                    "type": "select",
                    "required": False,
                    "options": [
                        {"label": "近3个月", "value": "3m"},
                        {"label": "近6个月", "value": "6m"},
                        {"label": "近1年", "value": "1y"},
                        {"label": "近3年", "value": "3y"},
                    ],
                    "default": "1y",
                },
            ],
        },
    }

    _configs["batch"] = {
        "agent_id": "batch",
        "fields": [
            {
                "name": "query",
                "label": "数据查询需求",
                "type": "text",
                "required": True,
                "placeholder": "例如：杭州地区近3年净利润持续增长的企业名单",
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

    return _configs.get(agent_id, {
        "agent_id": agent_id,
        "fields": [
            {
                "name": "target",
                "label": "目标企业",
                "type": "text",
                "required": True,
                "placeholder": "请输入企业名称",
            },
        ],
    })


# ---------------------------------------------------------------------------
# Dashboard / Overview
# ---------------------------------------------------------------------------

def get_mock_overview() -> dict:
    """Return comprehensive dashboard overview data."""
    return {
        "cards": [
            {
                "label": "监控企业",
                "value": "1,247",
                "change": "+12",
                "trend_up": True,
                "color": "#4A9EFF",
                "trend_data": [980, 1020, 1065, 1110, 1180, 1215, 1247],
            },
            {
                "label": "风险预警",
                "value": "89",
                "change": "+5",
                "trend_up": True,
                "color": "#EF4444",
                "trend_data": [62, 71, 68, 75, 82, 84, 89],
            },
            {
                "label": "生成报告",
                "value": "356",
                "change": "+23",
                "trend_up": True,
                "color": "#A78BFA",
                "trend_data": [210, 238, 265, 289, 310, 333, 356],
            },
            {
                "label": "数据更新",
                "value": "98.5%",
                "change": "+0.3%",
                "trend_up": True,
                "color": "#34D399",
                "trend_data": [96.2, 96.8, 97.1, 97.5, 97.9, 98.2, 98.5],
            },
        ],
        "risk_trend": [
            {"month": "2025-09", "high": 12, "medium": 34, "low": 56},
            {"month": "2025-10", "high": 15, "medium": 38, "low": 52},
            {"month": "2025-11", "high": 11, "medium": 41, "low": 48},
            {"month": "2025-12", "high": 18, "medium": 36, "low": 55},
            {"month": "2026-01", "high": 14, "medium": 42, "low": 51},
            {"month": "2026-02", "high": 16, "medium": 39, "low": 54},
        ],
        "industry_distribution": [
            {"label": "制造业", "value": 342, "color": "#4A9EFF", "percentage": "27.4%"},
            {"label": "信息技术", "value": 268, "color": "#A78BFA", "percentage": "21.5%"},
            {"label": "金融业", "value": 198, "color": "#F59E0B", "percentage": "15.9%"},
            {"label": "房地产", "value": 156, "color": "#EF4444", "percentage": "12.5%"},
            {"label": "医药健康", "value": 124, "color": "#34D399", "percentage": "9.9%"},
            {"label": "消费零售", "value": 98, "color": "#F97316", "percentage": "7.9%"},
            {"label": "其他", "value": 61, "color": "#6B7280", "percentage": "4.9%"},
        ],
        "alerts": [
            {
                "company": "恒大地产",
                "event": "新增被执行案件 3 起，执行标的合计 2.8 亿元",
                "time": "10 分钟前",
                "level": "high",
            },
            {
                "company": "某科技公司",
                "event": "被列入经营异常名录，原因：未按规定公示年度报告",
                "time": "25 分钟前",
                "level": "high",
            },
            {
                "company": "蔚来汽车",
                "event": "发布盈利预警公告，预计 Q4 亏损扩大",
                "time": "1 小时前",
                "level": "medium",
            },
            {
                "company": "中芯国际",
                "event": "美国商务部更新出口管制清单，可能影响设备采购",
                "time": "2 小时前",
                "level": "medium",
            },
            {
                "company": "碧桂园",
                "event": "债务重组方案获债权人初步同意",
                "time": "3 小时前",
                "level": "medium",
            },
            {
                "company": "海底捞",
                "event": "多地门店食品安全抽检不合格",
                "time": "4 小时前",
                "level": "low",
            },
            {
                "company": "贵州茅台",
                "event": "经销商大会召开，明年配额政策调整",
                "time": "5 小时前",
                "level": "low",
            },
            {
                "company": "宁德时代",
                "event": "发布新一代麒麟电池量产计划",
                "time": "6 小时前",
                "level": "info",
            },
        ],
        "insights": [
            {
                "icon": "TrendUp",
                "title": "房地产行业风险持续攀升",
                "description": "本月房地产行业高风险预警数量环比增长 23%，建议加强对该行业客户的动态监控。",
                "type": "warning",
            },
            {
                "icon": "Shield",
                "title": "数据安全监管趋严",
                "description": "近期多家互联网企业收到数据安全相关问询函，建议关注信息技术行业合规风险。",
                "type": "info",
            },
            {
                "icon": "Brain",
                "title": "AI 尽调效率提升",
                "description": "本月 AI 生成的尽调报告平均耗时缩短至 4.2 分钟，准确率提升至 94.7%。",
                "type": "success",
            },
            {
                "icon": "Alert",
                "title": "新能源补贴政策变动",
                "description": "2026年新能源补贴退坡方案出台，相关产业链企业需评估政策影响。",
                "type": "warning",
            },
        ],
    }


# ---------------------------------------------------------------------------
# NL Query → Chart mock
# ---------------------------------------------------------------------------

_DARK_THEME_BASE = {
    "backgroundColor": "transparent",
    "textStyle": {
        "color": "rgba(255,255,255,0.5)",
        "fontFamily": "'Outfit', 'Noto Sans SC', sans-serif",
    },
    "tooltip": {
        "backgroundColor": "rgba(10, 14, 26, 0.95)",
        "borderColor": "rgba(255,255,255,0.08)",
        "borderWidth": 1,
        "textStyle": {"color": "rgba(255,255,255,0.85)", "fontSize": 12},
    },
}


def get_mock_nl_chart(query: str) -> dict:
    """Map a natural-language query to a pre-built ECharts config.

    Uses keyword matching to select from several chart templates.
    """
    q = query.lower()

    # --- Risk distribution bar chart ---
    if any(k in q for k in ("风险分布", "风险等级", "高风险")):
        return {
            "chart_type": "bar",
            "title": "企业风险等级分布",
            "description": "按风险等级统计的企业数量分布，高风险企业占比 12.8%。",
            "echarts_option": {
                **_DARK_THEME_BASE,
                "xAxis": {
                    "type": "category",
                    "data": ["高风险", "中风险", "低风险", "暂无评级"],
                    "axisLine": {"lineStyle": {"color": "rgba(255,255,255,0.08)"}},
                    "axisLabel": {"color": "rgba(255,255,255,0.4)", "fontSize": 12},
                    "axisTick": {"show": False},
                },
                "yAxis": {
                    "type": "value",
                    "axisLine": {"show": False},
                    "axisLabel": {"color": "rgba(255,255,255,0.4)", "fontSize": 11},
                    "splitLine": {"lineStyle": {"color": "rgba(255,255,255,0.04)"}},
                },
                "series": [{
                    "type": "bar",
                    "data": [
                        {"value": 160, "itemStyle": {"color": "#EF4444"}},
                        {"value": 387, "itemStyle": {"color": "#F59E0B"}},
                        {"value": 542, "itemStyle": {"color": "#10B981"}},
                        {"value": 158, "itemStyle": {"color": "#6B7280"}},
                    ],
                    "barWidth": "45%",
                    "itemStyle": {"borderRadius": [6, 6, 0, 0]},
                    "label": {
                        "show": True,
                        "position": "top",
                        "color": "rgba(255,255,255,0.6)",
                        "fontSize": 12,
                    },
                }],
            },
        }

    # --- Industry distribution pie chart ---
    if any(k in q for k in ("行业分布", "行业", "产业", "占比")):
        return {
            "chart_type": "pie",
            "title": "监控企业行业分布",
            "description": "1,247 家监控企业的行业构成，制造业和信息技术合计占比近 50%。",
            "echarts_option": {
                **_DARK_THEME_BASE,
                "series": [{
                    "type": "pie",
                    "radius": ["40%", "70%"],
                    "center": ["50%", "50%"],
                    "avoidLabelOverlap": True,
                    "itemStyle": {"borderRadius": 6, "borderColor": "#06080f", "borderWidth": 2},
                    "label": {
                        "color": "rgba(255,255,255,0.6)",
                        "fontSize": 12,
                        "formatter": "{b}: {d}%",
                    },
                    "data": [
                        {"value": 342, "name": "制造业", "itemStyle": {"color": "#4A9EFF"}},
                        {"value": 268, "name": "信息技术", "itemStyle": {"color": "#A78BFA"}},
                        {"value": 198, "name": "金融业", "itemStyle": {"color": "#F59E0B"}},
                        {"value": 156, "name": "房地产", "itemStyle": {"color": "#EF4444"}},
                        {"value": 124, "name": "医药健康", "itemStyle": {"color": "#34D399"}},
                        {"value": 98, "name": "消费零售", "itemStyle": {"color": "#F97316"}},
                        {"value": 61, "name": "其他", "itemStyle": {"color": "#6B7280"}},
                    ],
                }],
            },
        }

    # --- Risk trend line chart ---
    if any(k in q for k in ("趋势", "走势", "变化", "月度")):
        return {
            "chart_type": "line",
            "title": "月度风险预警趋势",
            "description": "近 6 个月各等级风险预警数量变化趋势，中风险预警占比最高。",
            "echarts_option": {
                **_DARK_THEME_BASE,
                "legend": {
                    "data": ["高风险", "中风险", "低风险"],
                    "textStyle": {"color": "rgba(255,255,255,0.5)", "fontSize": 11},
                    "top": 0, "right": 0,
                },
                "grid": {"left": "3%", "right": "3%", "bottom": "3%", "top": "14%", "containLabel": True},
                "xAxis": {
                    "type": "category",
                    "data": ["9月", "10月", "11月", "12月", "1月", "2月"],
                    "axisLine": {"lineStyle": {"color": "rgba(255,255,255,0.08)"}},
                    "axisLabel": {"color": "rgba(255,255,255,0.4)", "fontSize": 11},
                    "axisTick": {"show": False},
                },
                "yAxis": {
                    "type": "value",
                    "axisLine": {"show": False},
                    "axisLabel": {"color": "rgba(255,255,255,0.4)", "fontSize": 11},
                    "splitLine": {"lineStyle": {"color": "rgba(255,255,255,0.04)"}},
                },
                "series": [
                    {
                        "name": "高风险", "type": "line", "smooth": True,
                        "data": [12, 15, 11, 18, 14, 16],
                        "lineStyle": {"color": "#EF4444", "width": 2},
                        "itemStyle": {"color": "#EF4444"},
                        "areaStyle": {"color": {"type": "linear", "x": 0, "y": 0, "x2": 0, "y2": 1,
                                                "colorStops": [{"offset": 0, "color": "rgba(239,68,68,0.15)"},
                                                               {"offset": 1, "color": "rgba(239,68,68,0)"}]}},
                    },
                    {
                        "name": "中风险", "type": "line", "smooth": True,
                        "data": [34, 38, 41, 36, 42, 39],
                        "lineStyle": {"color": "#F59E0B", "width": 2},
                        "itemStyle": {"color": "#F59E0B"},
                        "areaStyle": {"color": {"type": "linear", "x": 0, "y": 0, "x2": 0, "y2": 1,
                                                "colorStops": [{"offset": 0, "color": "rgba(245,158,11,0.15)"},
                                                               {"offset": 1, "color": "rgba(245,158,11,0)"}]}},
                    },
                    {
                        "name": "低风险", "type": "line", "smooth": True,
                        "data": [56, 52, 48, 55, 51, 54],
                        "lineStyle": {"color": "#10B981", "width": 2},
                        "itemStyle": {"color": "#10B981"},
                        "areaStyle": {"color": {"type": "linear", "x": 0, "y": 0, "x2": 0, "y2": 1,
                                                "colorStops": [{"offset": 0, "color": "rgba(16,185,129,0.15)"},
                                                               {"offset": 1, "color": "rgba(16,185,129,0)"}]}},
                    },
                ],
            },
        }

    # --- Company comparison radar chart ---
    if any(k in q for k in ("对比", "比较", "雷达", "评分")):
        return {
            "chart_type": "radar",
            "title": "标杆企业多维对比",
            "description": "从财务健康、法律合规、经营稳定、技术实力、市场声誉五个维度对比。",
            "echarts_option": {
                **_DARK_THEME_BASE,
                "legend": {
                    "data": ["同花顺", "东方财富", "大智慧"],
                    "textStyle": {"color": "rgba(255,255,255,0.5)", "fontSize": 11},
                    "bottom": 0,
                },
                "radar": {
                    "indicator": [
                        {"name": "财务健康", "max": 100},
                        {"name": "法律合规", "max": 100},
                        {"name": "经营稳定", "max": 100},
                        {"name": "技术实力", "max": 100},
                        {"name": "市场声誉", "max": 100},
                    ],
                    "shape": "circle",
                    "axisLine": {"lineStyle": {"color": "rgba(255,255,255,0.08)"}},
                    "splitLine": {"lineStyle": {"color": "rgba(255,255,255,0.06)"}},
                    "splitArea": {"show": False},
                    "axisName": {"color": "rgba(255,255,255,0.5)", "fontSize": 11},
                },
                "series": [{
                    "type": "radar",
                    "data": [
                        {"value": [82, 68, 75, 90, 72], "name": "同花顺",
                         "lineStyle": {"color": "#4A9EFF"}, "itemStyle": {"color": "#4A9EFF"},
                         "areaStyle": {"color": "rgba(74,158,255,0.15)"}},
                        {"value": [78, 82, 80, 70, 85], "name": "东方财富",
                         "lineStyle": {"color": "#A78BFA"}, "itemStyle": {"color": "#A78BFA"},
                         "areaStyle": {"color": "rgba(167,139,250,0.15)"}},
                        {"value": [60, 55, 65, 72, 50], "name": "大智慧",
                         "lineStyle": {"color": "#F59E0B"}, "itemStyle": {"color": "#F59E0B"},
                         "areaStyle": {"color": "rgba(245,158,11,0.15)"}},
                    ],
                }],
            },
        }

    # --- Top risky enterprises horizontal bar ---
    if any(k in q for k in ("排名", "top", "排行", "最高")):
        return {
            "chart_type": "bar",
            "title": "高风险企业 TOP 10",
            "description": "综合风险评分排名前 10 的企业，评分越高风险越大。",
            "echarts_option": {
                **_DARK_THEME_BASE,
                "grid": {"left": "3%", "right": "8%", "bottom": "3%", "top": "3%", "containLabel": True},
                "xAxis": {
                    "type": "value",
                    "axisLine": {"show": False},
                    "axisLabel": {"color": "rgba(255,255,255,0.4)", "fontSize": 11},
                    "splitLine": {"lineStyle": {"color": "rgba(255,255,255,0.04)"}},
                },
                "yAxis": {
                    "type": "category",
                    "data": ["恒大地产", "碧桂园", "某科技A", "融创中国", "某地产B",
                             "某零售C", "某制造D", "某金融E", "某科技F", "某医药G"],
                    "inverse": True,
                    "axisLine": {"lineStyle": {"color": "rgba(255,255,255,0.08)"}},
                    "axisLabel": {"color": "rgba(255,255,255,0.5)", "fontSize": 11},
                    "axisTick": {"show": False},
                },
                "series": [{
                    "type": "bar",
                    "data": [95, 88, 82, 79, 76, 72, 68, 65, 61, 58],
                    "barWidth": "50%",
                    "itemStyle": {
                        "borderRadius": [0, 4, 4, 0],
                        "color": {
                            "type": "linear", "x": 0, "y": 0, "x2": 1, "y2": 0,
                            "colorStops": [
                                {"offset": 0, "color": "#EF444480"},
                                {"offset": 1, "color": "#EF4444"},
                            ],
                        },
                    },
                    "label": {
                        "show": True, "position": "right",
                        "color": "rgba(255,255,255,0.6)", "fontSize": 11,
                    },
                }],
            },
        }

    # --- Region distribution scatter/map placeholder ---
    if any(k in q for k in ("地区", "区域", "地域", "省份", "城市")):
        return {
            "chart_type": "bar",
            "title": "企业地域分布 TOP 8",
            "description": "按注册地统计的监控企业分布，长三角和珠三角地区企业最为集中。",
            "echarts_option": {
                **_DARK_THEME_BASE,
                "xAxis": {
                    "type": "category",
                    "data": ["广东", "浙江", "江苏", "北京", "上海", "山东", "四川", "福建"],
                    "axisLine": {"lineStyle": {"color": "rgba(255,255,255,0.08)"}},
                    "axisLabel": {"color": "rgba(255,255,255,0.4)", "fontSize": 11},
                    "axisTick": {"show": False},
                },
                "yAxis": {
                    "type": "value",
                    "axisLine": {"show": False},
                    "axisLabel": {"color": "rgba(255,255,255,0.4)", "fontSize": 11},
                    "splitLine": {"lineStyle": {"color": "rgba(255,255,255,0.04)"}},
                },
                "series": [{
                    "type": "bar",
                    "data": [
                        {"value": 218, "itemStyle": {"color": "#4A9EFF"}},
                        {"value": 186, "itemStyle": {"color": "#4A9EFF"}},
                        {"value": 172, "itemStyle": {"color": "#4A9EFF"}},
                        {"value": 165, "itemStyle": {"color": "#A78BFA"}},
                        {"value": 158, "itemStyle": {"color": "#A78BFA"}},
                        {"value": 120, "itemStyle": {"color": "#34D399"}},
                        {"value": 98, "itemStyle": {"color": "#34D399"}},
                        {"value": 82, "itemStyle": {"color": "#34D399"}},
                    ],
                    "barWidth": "45%",
                    "itemStyle": {"borderRadius": [6, 6, 0, 0]},
                    "label": {
                        "show": True, "position": "top",
                        "color": "rgba(255,255,255,0.6)", "fontSize": 11,
                    },
                }],
            },
        }

    # --- Default: enterprise scale bar chart ---
    return {
        "chart_type": "bar",
        "title": "企业规模分布",
        "description": "按注册资本规模统计的企业数量分布。",
        "echarts_option": {
            **_DARK_THEME_BASE,
            "xAxis": {
                "type": "category",
                "data": ["<100万", "100-500万", "500-1000万", "1000万-1亿", "1-10亿", ">10亿"],
                "axisLine": {"lineStyle": {"color": "rgba(255,255,255,0.08)"}},
                "axisLabel": {"color": "rgba(255,255,255,0.4)", "fontSize": 11},
                "axisTick": {"show": False},
            },
            "yAxis": {
                "type": "value",
                "axisLine": {"show": False},
                "axisLabel": {"color": "rgba(255,255,255,0.4)", "fontSize": 11},
                "splitLine": {"lineStyle": {"color": "rgba(255,255,255,0.04)"}},
            },
            "series": [{
                "type": "bar",
                "data": [
                    {"value": 85, "itemStyle": {"color": "#6B7280"}},
                    {"value": 210, "itemStyle": {"color": "#34D399"}},
                    {"value": 320, "itemStyle": {"color": "#4A9EFF"}},
                    {"value": 380, "itemStyle": {"color": "#A78BFA"}},
                    {"value": 168, "itemStyle": {"color": "#F59E0B"}},
                    {"value": 84, "itemStyle": {"color": "#EF4444"}},
                ],
                "barWidth": "45%",
                "itemStyle": {"borderRadius": [6, 6, 0, 0]},
                "label": {
                    "show": True, "position": "top",
                    "color": "rgba(255,255,255,0.6)", "fontSize": 12,
                },
            }],
        },
    }


# ---------------------------------------------------------------------------
# Company Relationship Graph mock
# ---------------------------------------------------------------------------

def get_mock_company_graph(company: str) -> dict:
    """Return a relationship graph centered on *company*."""
    return {
        "nodes": [
            {"id": "center", "name": company, "category": "核心企业", "symbol_size": 55},
            {"id": "sh1", "name": f"{company}科技子公司", "category": "子公司", "symbol_size": 35},
            {"id": "sh2", "name": f"{company}投资有限公司", "category": "子公司", "symbol_size": 35},
            {"id": "sh3", "name": f"{company}数据服务公司", "category": "子公司", "symbol_size": 30},
            {"id": "p1", "name": "张某某", "category": "自然人", "symbol_size": 28},
            {"id": "p2", "name": "李某某", "category": "自然人", "symbol_size": 28},
            {"id": "p3", "name": "王某某", "category": "自然人", "symbol_size": 25},
            {"id": "inv1", "name": "红杉资本", "category": "投资方", "symbol_size": 32},
            {"id": "inv2", "name": "国投创新", "category": "投资方", "symbol_size": 30},
            {"id": "sup1", "name": "华为技术", "category": "合作方", "symbol_size": 30},
            {"id": "sup2", "name": "阿里云", "category": "合作方", "symbol_size": 30},
            {"id": "comp1", "name": "东方财富", "category": "竞争对手", "symbol_size": 32},
            {"id": "comp2", "name": "大智慧", "category": "竞争对手", "symbol_size": 28},
        ],
        "edges": [
            {"source": "center", "target": "sh1", "label": "控股 100%"},
            {"source": "center", "target": "sh2", "label": "控股 80%"},
            {"source": "center", "target": "sh3", "label": "控股 65%"},
            {"source": "p1", "target": "center", "label": "董事长 / 实控人"},
            {"source": "p2", "target": "center", "label": "总经理"},
            {"source": "p3", "target": "sh1", "label": "法人代表"},
            {"source": "inv1", "target": "center", "label": "B 轮投资"},
            {"source": "inv2", "target": "center", "label": "战略投资"},
            {"source": "center", "target": "sup1", "label": "技术合作"},
            {"source": "center", "target": "sup2", "label": "云服务采购"},
            {"source": "center", "target": "comp1", "label": "同业竞争"},
            {"source": "center", "target": "comp2", "label": "同业竞争"},
        ],
        "categories": ["核心企业", "子公司", "自然人", "投资方", "合作方", "竞争对手"],
    }


# ---------------------------------------------------------------------------
# Trend comparison mock
# ---------------------------------------------------------------------------

def get_mock_trends(companies: list[str] | None = None) -> dict:
    """Return time-series risk data for multiple companies."""
    if not companies:
        companies = ["同花顺", "东方财富", "大智慧"]

    months = ["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"]
    color_pool = ["#4A9EFF", "#A78BFA", "#F59E0B", "#EF4444", "#34D399"]
    series = []
    for i, name in enumerate(companies[:5]):
        import random
        random.seed(hash(name))
        base = random.randint(40, 75)
        data = [base + random.randint(-8, 12) for _ in months]
        series.append({
            "name": name,
            "data": data,
            "color": color_pool[i % len(color_pool)],
        })

    return {
        "months": months,
        "series": series,
    }


# ---------------------------------------------------------------------------
# SSE streaming mock
# ---------------------------------------------------------------------------

def get_mock_streaming_chunks(query: str) -> list[dict]:
    """Return a sequence of SSE-friendly chunks that simulate streaming output.

    Each chunk is a dict with ``type`` (token / details / actions / done)
    and ``data``.
    """
    response = get_mock_chat_response(query)
    content = response["content"]

    chunks: list[dict] = []

    # Simulate token-by-token text streaming (sentence-level for speed)
    sentences = content.replace("\n\n", "\n").split("\n")
    for sentence in sentences:
        if sentence.strip():
            chunks.append({"type": "token", "data": sentence + "\n"})

    # Structured details
    if response.get("details"):
        chunks.append({"type": "details", "data": response["details"]})

    # Suggested actions
    if response.get("actions"):
        chunks.append({"type": "actions", "data": response["actions"]})

    # Completion signal
    chunks.append({"type": "done", "data": None})

    return chunks
