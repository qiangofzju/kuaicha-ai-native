# UI Trace Guideline (Batch Skill)

## Purpose

Display enough internal execution context to reduce waiting anxiety and increase trust,
without exposing sensitive business data.

## Must Show

- current stage and stage transitions
- routing completed and selected category/table counts
- SQL planning progress in generalized language
- query start/end and matched row count
- transformation start/end and processed metrics
- delivery start/end and preview/export readiness
- warning/error events using user-friendly generalized text

## Must Not Show

- raw SQL statement text
- full company names
- personal names, IDs, case numbers, credit/stock codes
- stack traces or low-level driver logs
- internal file paths and secrets

## Text Style

- short and action-oriented
- plain business language
- each detail message <= 180 chars
- avoid repetitive identical messages in high frequency

## Recommended Event Pace

- emit at least one event every 1s during long waits
- always emit stage start and stage done events
- keep timeline append-only and auto-scroll to latest event
