# AGENTS.md — CFB 2026 Master Package

Instructions for Claude Code, GPT, Cursor, and other coding agents working against this package.

## 1. Start here

1. Read `catalog.json` — conferences → teams → relative file paths + `datasets` map.
2. Read `MANIFEST.json` — complete inventory (`path`, `size`, `category`).
3. Skim `INDEX.md` / `README.md` only if you need human navigation.

Do **not** invent research content. Only use files present in this package.

## 2. Preferred sources by task

| Task | Prefer |
|---|---|
| Conference-wide roster context | `01-rosters/<conf>/*-Complete.md` |
| Quick conference narrative | `01-rosters/<conf>/00-executive-overview.md` |
| Starters / depth snapshot | `01-rosters/<conf>/01-starter-depth-charts-summary.md` |
| Single-team roster | `01-rosters/<conf>/<team-slug>.md` |
| Coaching bulk context | `03-coaching/Coaching-Staffs-Schemes-2026-Combined.md` and `...-ACC-G5-Combined.md` |
| Coaching by conference | `03-coaching/<conference>.md` |
| Polls / injuries / schedules / week 0 | files under `02-stats/00-*.md` … `03-*.md` |
| Numeric / historical analysis | CSVs under `02-stats/historical/csv/{team,individual,advanced}/` |
| SOS | `04-sos/SOS-2026-Combined.md` (or `02-stats/sos/` twin) |
| Raw scrape dumps | `02-stats/historical/raw/` and `01-rosters/big12-2026/raw/` — optional, noisy |

## 3. Data integrity rules

- **Never invent missing fields.** If a source says `Not listed`, `N/A`, `unknown`, or omits a value, preserve that — do not fill from memory or “typical” depth charts.
- Do not merge conflicting sources silently; cite which file you used.
- Treat `*_raw.json` / `historical/raw/` as uncurated; curated Markdown and CSV win on conflict.
- Roster folders cover Pac-12, MW, MAC, ACC, AAC, Big 12, Sun Belt only — do not assume SEC/Big Ten roster folders exist here (coaching may still cover those conferences).

## 4. Suggested load order (RAG / context packing)

Use this order to maximize signal before token limits:

1. `catalog.json` (map only; tiny)
2. All conference `00-executive-overview.md` files under `01-rosters/`
3. Coaching `00-executive-overview.md` + `01-executive-overview-acc-g5.md`
4. `02-stats/00-top25-ap-coaches-2026-09-05.md`
5. `02-stats/01-injury-report-2026-09-05.md`
6. `04-sos/00-executive-overview.md` then `04-sos/SOS-2026-Combined.md` if depth needed
7. Conference `*-Complete.md` files **only for conferences in the user query**
8. Coaching combined masters **only for conferences/teams in scope**
9. Per-team roster MD files for named teams
10. `02-stats/02-full-schedule-2026.md` / `02b-g5-schedules-2026.md` as needed
11. `02-stats/03-season-2026-week0-early-stats.md`
12. Historical Markdown summaries, then **CSV slices** for numeric work
13. Raw dumps last (or never, unless debugging a scrape)

## 5. Path conventions

- All paths in `catalog.json` / `MANIFEST.json` are **relative to this package root**.
- `04-sos/` mirrors `02-stats/sos/` (same content; may be hardlinked).
- When writing outputs, prefer creating new files under a sibling `outputs/` or user-specified path — do not overwrite source research unless asked.

## 6. Quick dataset keys (`catalog.json` → `datasets`)

- `polls`, `injuries`, `schedules`, `week0_stats`
- `sos` (object with `combined`, `overview`, JSON helpers)
- `coaching_power`, `coaching_acc_g5`, `coaching_by_conference`
- `historical` (Markdown + `csv_dir` + counts)

## 7. Anti-patterns

- Loading every `*-Complete.md` plus both coaching combined files for a one-team question
- Using `historical/raw/` HTML as primary evidence
- Fabricating transfer portal / injury / depth status not present in package files
- Assuming 2025 season results equal 2026 depth charts without checking roster MD dates/content
