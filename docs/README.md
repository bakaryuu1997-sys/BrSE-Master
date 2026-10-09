# BrSE OS Docs

Active docs stay small. `docs/` keeps only important project docs; old phase reports, long plans, sidebar notes, and archive notes were removed after consolidation.

## Keep List

| File | Use |
| --- | --- |
| `README.md` | This index. |
| `PROJECT_SOURCE_OF_TRUTH.md` | Canonical runtime map, scope, architecture rules, data/API contracts. |
| `DEVELOPER_GUIDE.md` | Project structure, local stack, code conventions, common commands, security posture. |
| `API_CONTRACTS.md` | Shared frontend/extension/backend endpoint inventory and drift guard contract. |
| `FEATURE_GUIDE.md` | Current product features, daily BrSE workflow, glossary and extension rules. |
| `QA_RELEASE.md` | Test matrix, release gates, visual/manual QA checklist. |
| `goal.md` | Architecture audit execution backlog and KPI tasks. |
| `AI_HANDOFF_TASKS.md` | Detailed handoff tasks referenced by `goal.md`. |

Root docs still matter:

- `../README.md`: entry point and quick start.
- `goal.md`: active architecture backlog only.
- `../AGENTS.md`: agent operating rules.
- `../CLAUDE.md`: Claude Code bridge — loads `AGENTS.md` + `PROJECT_SOURCE_OF_TRUTH.md` and lists quick commands. Not a new source of rules.

## Rule

When docs disagree, follow `PROJECT_SOURCE_OF_TRUTH.md`, then update the smaller guide file that owns that topic.
