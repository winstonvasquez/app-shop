# .claude/workspace

Generated artifacts Claude Code creates while assisting on this project.
Convention defined in `~/.claude/CLAUDE.md` (global).

| Subdir | Purpose | Versioned? |
|---|---|---|
| `scripts/` | Ad-hoc scripts (bash, ps1, js, py) | yes |
| `screenshots/` | Playwright + manual captures | no |
| `playwright/tests/` | Versioned test specs | yes |
| `playwright/reports/` | Reports, traces, videos | no |
| `docs/` | Generated docs (docx, pdf, html, md) | yes |
| `tmp/` | Scratch / ephemeral | no |
| `worktrees/` | Git worktrees | no |
| `plugins/` | Claude Code plugins authored here | yes |
| `skills/` | Claude Code skills authored here | yes |
| `artifacts/` | Other outputs (zip, csv, export) | no |

The skeleton is recreated automatically on session start by
`~/.claude/scripts/ensure-workspace.sh`. Safe to delete subdirs you
don't need — they will not be recreated unless content lands there.
