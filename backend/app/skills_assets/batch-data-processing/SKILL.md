---
name: 批量数据处理
description: 自然语言筛选企业名单，结构化批量导出，多表衍生字段加工
app:
  id: batch
  version: 1.0.0
  display_name: 批量数据处理技能
  category: data-processing
  status: ready
  author: '@快查数据团队'
  tags:
  - 数据处理
  - 批量导出
  - 企业库
  entrypoints:
    standalone: true
    chat_invoke: true
    external_api: true
  triggers:
    mention_ids:
    - batch
    mention_aliases:
    - 批量数据处理
    - 批量数据处理技能
  execution:
    mode: script
    agent_id: batch
    driver: claude_code
  input_schema:
    type: object
    required:
    - query
    - scenario
    properties:
      query:
        type: string
        title: 数据查询需求
        description: 例如：杭州市今年的人工智能企业有哪些？
      scenario:
        type: string
        enum:
        - filter
        - export
        - derived
        title: 处理场景
      company_names:
        type: array
        items:
          type: string
        title: 企业名单数组
      company_names_text:
        type: string
        title: 企业名单文本
        description: 支持逗号、顿号或换行分隔
  output_schema:
    type: object
    required:
    - summary
    - columns
    - preview_rows
    - total_count
    properties:
      summary:
        type: string
      columns:
        type: array
      preview_rows:
        type: array
      total_count:
        type: integer
  permissions:
  - db:enterprise.read
  - export:excel
  - chat:invoke
  ui:
    theme_accent: '#F59E0B'
    stages:
    - 需求解析
    - 数据查询
    - 字段加工
    - 数据交付
    chat_card:
      show_fields:
      - scenario
      - query
      - company_names_text
      allow_file_upload: false
    standalone:
      show_trace: true
      show_export: true
  entrypoint: python3 scripts/run.py
---

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
