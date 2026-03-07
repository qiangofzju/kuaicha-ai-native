# Skill Creator

## Goal

Build a complete MVP skill package from one natural language requirement.

## Output Deliverables

- `manifest.json`
- `SKILL.md`
- `scripts/validate_input.py`
- `scripts/format_output.py`
- `references/usage.md`

## Workflow Stages

1. Requirement analysis
2. Whitelist tool execution
3. Delivery summary and artifact preview

## Runtime Notes

- Always writes files under `backend/app/skills_assets/user-generated/`.
- Rejects path traversal and non-whitelisted file actions.
- Reloads skill manifest registry and mention parser after creation.
