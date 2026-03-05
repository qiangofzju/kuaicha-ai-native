# Batch Skill Contract

## API Contract

### Execute
- Endpoint: `POST /api/skills/batch/execute`
- Request:
  - `target: string` (optional for batch; schema field `query` is in `params`)
  - `params: object`
- Response:
  - `task_id`
  - `skill_id`
  - `status`

### Task status
- Endpoint: `GET /api/skills/tasks/{task_id}`
- Response fields:
  - `task_id`
  - `skill_id`
  - `status`
  - `progress`
  - `stage`
  - `message`
  - `created_at`

### Result
- Endpoint: `GET /api/skills/tasks/{task_id}/result`
- Response fields:
  - `task_id`
  - `skill_type`
  - `summary`
  - batch report payload (`columns`, `preview_rows`, `total_count`, etc.)

## WebSocket Contract

- Endpoint: `/ws/skills/{task_id}`
- Message types:
  - `skill_progress`
  - `skill_stream`
  - `skill_trace`
  - `skill_complete`
  - `skill_error`

### `skill_trace.data`

```json
{
  "event_id": "string",
  "ts": "ISO-8601",
  "stage": "需求解析|数据查询|字段加工|数据交付",
  "stage_index": 0,
  "kind": "phase_start|phase_done|routing|query|transform|delivery|warn|error|info",
  "title": "string",
  "detail": "sanitized text",
  "metrics": {},
  "status": "running|done|warning|error"
}
```

## Export Contract

- Endpoint: `GET /api/skills/tasks/{task_id}/export/excel`
- Preferred output: `.xlsx`
- Fallback output: `.csv` with header `X-Export-Fallback: csv`
