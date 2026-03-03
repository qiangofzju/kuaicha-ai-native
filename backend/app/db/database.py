"""SQLite database connection and initialization for batch data processing."""

import sqlite3
from pathlib import Path

from app.utils.logger import logger

DB_PATH = Path(__file__).parent.parent.parent / "data" / "kuaicha.db"

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS companies (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL UNIQUE,
    short_name      TEXT,
    region          TEXT NOT NULL,
    city            TEXT NOT NULL,
    industry        TEXT NOT NULL,
    sub_industry    TEXT,
    reg_capital     REAL,
    reg_date        TEXT,
    emp_count       INTEGER,
    credit_code     TEXT UNIQUE,
    legal_rep       TEXT,
    listing_status  TEXT DEFAULT 'unlisted',
    stock_code      TEXT,
    risk_level      TEXT DEFAULT 'low'
);

CREATE TABLE IF NOT EXISTS financials (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id      INTEGER NOT NULL REFERENCES companies(id),
    year            INTEGER NOT NULL,
    revenue         REAL,
    net_profit      REAL,
    total_assets    REAL,
    gross_margin    REAL,
    net_margin      REAL,
    roe             REAL,
    debt_ratio      REAL,
    revenue_yoy     REAL,
    profit_yoy      REAL,
    UNIQUE(company_id, year)
);

CREATE TABLE IF NOT EXISTS company_tags (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id      INTEGER NOT NULL REFERENCES companies(id),
    tag_type        TEXT NOT NULL,
    tag_value       TEXT NOT NULL,
    issued_year     INTEGER
);

CREATE TABLE IF NOT EXISTS company_ai_profiles (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id          INTEGER NOT NULL REFERENCES companies(id),
    snapshot_year       INTEGER NOT NULL,
    ai_category         TEXT NOT NULL,
    ai_capability_level TEXT NOT NULL,
    model_product       TEXT,
    application_domain  TEXT,
    is_key_ai_enterprise INTEGER DEFAULT 0,
    source_tag          TEXT,
    last_verified_at    TEXT,
    UNIQUE(company_id, snapshot_year, ai_category)
);

CREATE TABLE IF NOT EXISTS company_shareholders (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id           INTEGER NOT NULL REFERENCES companies(id),
    holder_name          TEXT NOT NULL,
    holder_type          TEXT NOT NULL,
    share_ratio          REAL,
    capital_contribution REAL,
    report_year          INTEGER NOT NULL,
    UNIQUE(company_id, holder_name, report_year)
);

CREATE TABLE IF NOT EXISTS court_announcements (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id         INTEGER NOT NULL REFERENCES companies(id),
    announcement_date  TEXT NOT NULL,
    court_name         TEXT NOT NULL,
    case_no            TEXT NOT NULL,
    role               TEXT,
    case_reason        TEXT,
    amount_involved    REAL,
    region             TEXT,
    UNIQUE(company_id, case_no, announcement_date)
);

CREATE TABLE IF NOT EXISTS operation_risk_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id  INTEGER NOT NULL REFERENCES companies(id),
    event_date  TEXT NOT NULL,
    risk_type   TEXT NOT NULL,
    severity    TEXT NOT NULL,
    authority   TEXT,
    detail      TEXT NOT NULL,
    amount      REAL,
    status      TEXT,
    UNIQUE(company_id, event_date, risk_type, detail)
);

CREATE INDEX IF NOT EXISTS idx_companies_region ON companies(region);
CREATE INDEX IF NOT EXISTS idx_companies_city ON companies(city);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);
CREATE INDEX IF NOT EXISTS idx_financials_company_year ON financials(company_id, year);
CREATE INDEX IF NOT EXISTS idx_tags_company ON company_tags(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_unique
ON company_tags(company_id, tag_type, tag_value, issued_year);
CREATE INDEX IF NOT EXISTS idx_ai_profiles_company_year
ON company_ai_profiles(company_id, snapshot_year);
CREATE INDEX IF NOT EXISTS idx_ai_profiles_year_city
ON company_ai_profiles(snapshot_year, is_key_ai_enterprise);
CREATE INDEX IF NOT EXISTS idx_shareholders_company_year
ON company_shareholders(company_id, report_year);
CREATE INDEX IF NOT EXISTS idx_court_company_date
ON court_announcements(company_id, announcement_date);
CREATE INDEX IF NOT EXISTS idx_oprisk_company_date
ON operation_risk_events(company_id, event_date);
"""


def get_db_connection() -> sqlite3.Connection:
    """Return a new SQLite connection with Row factory."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def initialize_database():
    """Create tables and apply idempotent seed data."""
    conn = get_db_connection()
    try:
        conn.executescript(SCHEMA_SQL)

        from app.db.seed_data import seed_all
        seed_all(conn)
        conn.commit()
        cur = conn.cursor()
        cur.execute("SELECT count(*) FROM companies")
        companies_count = cur.fetchone()[0]
        logger.info(
            "Database initialized/migrated at %s (companies=%d)",
            DB_PATH,
            companies_count,
        )
    finally:
        conn.close()
