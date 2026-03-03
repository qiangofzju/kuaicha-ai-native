# 批量场景问句样例（本地 SQLite 已可查询）

> 数据库：`backend/data/kuaicha.db`  
> 校验时间：2026-03-01  
> 以下计数来自当前本地 seed 数据。

## 1) 筛选企业名单（filter）

### 问句 A
杭州市今年的人工智能企业有哪些？

```sql
SELECT c.name, c.short_name, c.city, c.industry,
       ap.ai_category, ap.ai_capability_level, ap.model_product,
       ap.application_domain, ap.snapshot_year
FROM companies c
JOIN company_ai_profiles ap ON ap.company_id = c.id
WHERE ap.snapshot_year = 2026
  AND ap.is_key_ai_enterprise = 1
  AND c.city = '杭州'
ORDER BY ap.ai_capability_level DESC, c.name
LIMIT 200;
```

当前可查：8 家。

### 问句 B
筛选杭州高新技术企业名单

```sql
SELECT DISTINCT c.name, c.short_name, c.city, c.industry,
       ct.tag_value AS tags, ct.issued_year,
       f24.revenue AS revenue_2024, f24.net_profit AS net_profit_2024
FROM companies c
JOIN company_tags ct ON ct.company_id = c.id
LEFT JOIN financials f24 ON f24.company_id = c.id AND f24.year = 2024
WHERE ct.tag_value LIKE '%高新技术%'
  AND c.city = '杭州'
ORDER BY f24.net_profit DESC
LIMIT 100;
```

当前可查：13 家。

## 2) 指定字段结构化导出（export）

### 问句 C
导出同花顺，东方财富，大智慧的股东和法院公告信息

```sql
SELECT c.name,
       (SELECT GROUP_CONCAT(holder_name || ':' || printf('%.1f', share_ratio) || '%', '；')
          FROM (SELECT holder_name, share_ratio
                  FROM company_shareholders sh
                 WHERE sh.company_id = c.id
                 ORDER BY sh.report_year DESC, sh.share_ratio DESC
                 LIMIT 3)
       ) AS shareholder_summary,
       (SELECT COUNT(1)
          FROM court_announcements ca
         WHERE ca.company_id = c.id
           AND ca.announcement_date >= date('now', '-365 day')
       ) AS court_announcement_count_1y,
       (SELECT ca.case_no
          FROM court_announcements ca
         WHERE ca.company_id = c.id
         ORDER BY ca.announcement_date DESC
         LIMIT 1
       ) AS latest_court_case_no
FROM companies c
WHERE (c.name IN ('浙江核新同花顺网络信息股份有限公司', '东方财富信息股份有限公司', '上海大智慧股份有限公司')
    OR c.short_name IN ('同花顺', '东方财富', '大智慧'))
ORDER BY c.city, c.industry, c.name
LIMIT 500;
```

当前可查：3 家。

### 问句 D
导出杭州信息技术企业的企业名称、法人、信用代码、上市状态

```sql
SELECT c.name, c.legal_rep, c.credit_code, c.listing_status
FROM companies c
WHERE c.city = '杭州'
  AND c.industry = '信息技术'
ORDER BY c.city, c.industry, c.name
LIMIT 500;
```

当前可查：11 家。

## 3) 衍生加工字段导出（derived）

### 问句 E
导出杭州信息技术企业的营收CAGR、净利润增长率、ROE、资产负债率

```sql
SELECT c.name, c.city, c.industry,
       f22.revenue AS revenue_2022,
       f24.revenue AS revenue_2024,
       ROUND((POWER(f24.revenue / f22.revenue, 0.5) - 1) * 100, 1) AS revenue_cagr,
       ROUND(((f24.net_profit - f22.net_profit) /
             CASE WHEN ABS(f22.net_profit) < 0.0001 THEN NULL ELSE ABS(f22.net_profit) END) * 100, 1)
             AS net_profit_growth_2y,
       ROUND(f24.roe, 1) AS roe,
       ROUND(f24.debt_ratio, 1) AS debt_ratio
FROM companies c
JOIN financials f22 ON f22.company_id = c.id AND f22.year = 2022
JOIN financials f23 ON f23.company_id = c.id AND f23.year = 2023
JOIN financials f24 ON f24.company_id = c.id AND f24.year = 2024
WHERE c.city = '杭州'
  AND c.industry = '信息技术'
ORDER BY revenue_cagr DESC
LIMIT 100;
```

当前可查：11 家。

### 问句 F
导出杭州AI企业的AI强度评分、近1年司法公告数和高风险事件数

```sql
SELECT c.name, c.city, c.industry,
       (SELECT CASE ai.ai_capability_level
                 WHEN 'L5' THEN 95 WHEN 'L4' THEN 85 WHEN 'L3' THEN 72
                 WHEN 'L2' THEN 58 ELSE 40 END
          FROM company_ai_profiles ai
         WHERE ai.company_id = c.id
         ORDER BY ai.snapshot_year DESC
         LIMIT 1) AS ai_intensity_score,
       (SELECT COUNT(1)
          FROM court_announcements ca
         WHERE ca.company_id = c.id
           AND ca.announcement_date >= date('now', '-365 day')) AS litigation_count_1y,
       (SELECT COUNT(1)
          FROM operation_risk_events oe
         WHERE oe.company_id = c.id
           AND oe.severity = 'high'
           AND oe.event_date >= date('now', '-365 day')) AS high_risk_event_count_1y
FROM companies c
JOIN financials f22 ON f22.company_id = c.id AND f22.year = 2022
JOIN financials f23 ON f23.company_id = c.id AND f23.year = 2023
JOIN financials f24 ON f24.company_id = c.id AND f24.year = 2024
WHERE c.city = '杭州'
  AND EXISTS (
      SELECT 1
      FROM company_ai_profiles ap
      WHERE ap.company_id = c.id
        AND ap.is_key_ai_enterprise = 1
        AND ap.snapshot_year = 2026
  )
ORDER BY ai_intensity_score DESC
LIMIT 100;
```

当前可查：8 家。
