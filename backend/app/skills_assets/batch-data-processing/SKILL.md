# Batch Data Processing Skill

## Goal

Provide enterprise-grade batch data delivery from natural language requirements:
- route query intent to relevant schema slices
- generate SQL through Claude Code driver
- query local SQLite enterprise tables
- produce preview rows and downloadable Excel deliverable

## Inputs

- `query` (required): natural language request
- `scenario` (required): `filter | export | derived`
- `company_names` (optional): list parsed from uploaded file
- `company_names_text` (optional): inline list in text form

## Outputs

- structured result payload:
  - `summary`
  - `query_type`
  - `columns`
  - `preview_rows`
  - `total_count`
  - `stats`
  - `schema_routing`
- export payload:
  - `.xlsx` preferred
  - `.csv` fallback when excel dependency unavailable

## Execution Stages

1. Requirement parsing (`需求解析`)
2. Data query (`数据查询`)
3. Field transformation (`字段加工`)
4. Data delivery (`数据交付`)

Each stage emits trace events with sanitized details.

## Sanitization Rules

- Never expose raw SQL text in streaming trace events.
- Never expose full company names, personal names, case numbers, IDs, or stock codes.
- Keep only aggregate metrics:
  - matched row count
  - selected category/table counts
  - processed field counts
  - fallback flags
- Trim `detail` to bounded length for UI safety.

## Error and Fallback

- SQL generation failure -> deterministic/mock translator fallback.
- SQL execution failure -> safe fallback result generation.
- Export dependency missing -> CSV fallback.
- Runtime trace always emits generalized error messages without stack traces.

## Mapping to Workflow

- Runtime implementation: `backend/app/agents/workflows/batch_processing.py`
- Skill facade:
  - API: `backend/app/api/skill.py`
  - Service: `backend/app/services/skill_service.py`
  - WS: `backend/app/api/ws.py` (`/ws/skills/{task_id}`)
