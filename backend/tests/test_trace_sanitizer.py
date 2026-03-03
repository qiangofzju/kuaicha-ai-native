"""Unit tests for trace sanitization helpers."""

import unittest

from app.services.trace_sanitizer import (
    build_safe_sql_summary,
    sanitize_error_message,
    sanitize_metrics,
    sanitize_trace_text,
)


class TraceSanitizerTests(unittest.TestCase):
    def test_sanitize_trace_text_masks_sensitive_values(self):
        source = (
            "执行企业 杭州海康威视数字技术股份有限公司 查询，案号(2026)浙0108民初864号，"
            "统一社会信用代码 91330000142209938B，证券代码 002415，"
            "SQL: SELECT * FROM companies WHERE name='杭州海康威视数字技术股份有限公司';"
        )
        safe = sanitize_trace_text(source)
        self.assertNotIn("杭州海康威视数字技术股份有限公司", safe)
        self.assertNotIn("91330000142209938B", safe)
        self.assertNotIn("(2026)浙0108民初864号", safe)
        self.assertNotIn("SELECT *", safe.upper())
        self.assertLessEqual(len(safe), 180)

    def test_build_safe_sql_summary_hides_raw_sql(self):
        sql = "SELECT c.name FROM companies c JOIN financials f ON f.company_id=c.id WHERE c.city='杭州' LIMIT 100"
        summary = build_safe_sql_summary(sql)
        self.assertIn("SQL 规划完成", summary)
        self.assertIn("包含 LIMIT", summary)
        self.assertNotIn("companies", summary.lower())
        self.assertNotIn("杭州", summary)

    def test_sanitize_metrics_keeps_only_allowed_numeric_keys(self):
        metrics = sanitize_metrics(
            {
                "matched_rows": 12,
                "selected_table_count": 5,
                "secret_name": "杭州海康威视数字技术股份有限公司",
                "selected_category_count": "3",
                "fallback_used": True,
            }
        )
        self.assertEqual(metrics.get("matched_rows"), 12)
        self.assertEqual(metrics.get("selected_table_count"), 5)
        self.assertTrue(metrics.get("fallback_used"))
        self.assertNotIn("secret_name", metrics)
        self.assertNotIn("selected_category_count", metrics)

    def test_sanitize_error_message_generic_mapping(self):
        msg = sanitize_error_message("sqlite error: SELECT failed for 杭州海康威视数字技术股份有限公司")
        self.assertEqual(msg, "SQL 执行失败，已回退到安全模式。")


if __name__ == "__main__":
    unittest.main()
