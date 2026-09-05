# CFB 2026 Master Research Package

**Date:** September 5, 2026 PT  
**Package ID:** `cfb-2026-master`  
**Scope:** Consolidated college football 2026 research — conference rosters, polls/injuries/schedules/week-0 stats, historical CSVs, strength of schedule (SOS), and coaching staffs & schemes.

This package **only indexes and copies existing research** under `/workspace/`. It does not invent roster lines, stats, or coaching attributions.

---

## What’s included

### Rosters (`01-rosters/`)
| Conference | Folder | Teams | Executive overview | Combined master |
|---|---|---:|---|---|
| Pac-12 | [01-rosters/pac12-2026](01-rosters/pac12-2026/) | 8 | [00-executive-overview.md](01-rosters/pac12-2026/00-executive-overview.md) | [Pac-12-2026-Football-Rosters-Complete.md](01-rosters/pac12-2026/Pac-12-2026-Football-Rosters-Complete.md) |
| Mountain West | [01-rosters/mw-2026](01-rosters/mw-2026/) | 10 | [00-executive-overview.md](01-rosters/mw-2026/00-executive-overview.md) | [Mountain-West-2026-Football-Rosters-Complete.md](01-rosters/mw-2026/Mountain-West-2026-Football-Rosters-Complete.md) |
| MAC | [01-rosters/mac-2026](01-rosters/mac-2026/) | 13 | [00-executive-overview.md](01-rosters/mac-2026/00-executive-overview.md) | [MAC-2026-Football-Rosters-Complete.md](01-rosters/mac-2026/MAC-2026-Football-Rosters-Complete.md) |
| ACC | [01-rosters/acc-2026](01-rosters/acc-2026/) | 17 | [00-executive-overview.md](01-rosters/acc-2026/00-executive-overview.md) | [ACC-2026-Football-Rosters-Complete.md](01-rosters/acc-2026/ACC-2026-Football-Rosters-Complete.md) |
| AAC | [01-rosters/aac-2026](01-rosters/aac-2026/) | 14 | [00-executive-overview.md](01-rosters/aac-2026/00-executive-overview.md) | [AAC-2026-Football-Rosters-Complete.md](01-rosters/aac-2026/AAC-2026-Football-Rosters-Complete.md) |
| Big 12 | [01-rosters/big12-2026](01-rosters/big12-2026/) | 16 | [00-executive-overview.md](01-rosters/big12-2026/00-executive-overview.md) | [Big12-2026-Football-Rosters-Complete.md](01-rosters/big12-2026/Big12-2026-Football-Rosters-Complete.md) |
| Sun Belt | [01-rosters/sbc-2026](01-rosters/sbc-2026/) | 14 | [00-executive-overview.md](01-rosters/sbc-2026/00-executive-overview.md) | [SunBelt-2026-Football-Rosters-Complete.md](01-rosters/sbc-2026/SunBelt-2026-Football-Rosters-Complete.md) |

Each conference folder also has per-team `*.md` files and a starter/depth-chart summary (`01-starter-depth-charts-summary.md`). Big 12 optional scrape dumps live under `01-rosters/big12-2026/raw/`.

### Stats (`02-stats/`)
- Polls: [00-top25-ap-coaches-2026-09-05.md](02-stats/00-top25-ap-coaches-2026-09-05.md)
- Injuries: [01-injury-report-2026-09-05.md](02-stats/01-injury-report-2026-09-05.md)
- Schedules: [02-full-schedule-2026.md](02-stats/02-full-schedule-2026.md), [02b-g5-schedules-2026.md](02-stats/02b-g5-schedules-2026.md)
- Week 0 / early stats: [03-season-2026-week0-early-stats.md](02-stats/03-season-2026-week0-early-stats.md)
- Historical: [historical/README.md](02-stats/historical/README.md) + Markdown summaries + **CSVs** under [historical/csv/](02-stats/historical/csv/) (team / individual / advanced)
- Scripts: [scripts/](02-stats/scripts/)
- SOS copy also mirrored at [02-stats/sos/](02-stats/sos/)

### Strength of schedule (`04-sos/` — also under `02-stats/sos/`)
- [00-executive-overview.md](04-sos/00-executive-overview.md)
- [SOS-2026-Combined.md](04-sos/SOS-2026-Combined.md)
- [00-sos-power-conferences-2026.md](04-sos/00-sos-power-conferences-2026.md)
- [01-sos-aac-indy-mac-cusa-2026.md](04-sos/01-sos-aac-indy-mac-cusa-2026.md)

### Coaching (`03-coaching/`)
- Power / primary combined: [Coaching-Staffs-Schemes-2026-Combined.md](03-coaching/Coaching-Staffs-Schemes-2026-Combined.md)
- ACC + G5 combined: [Coaching-Staffs-Schemes-2026-ACC-G5-Combined.md](03-coaching/Coaching-Staffs-Schemes-2026-ACC-G5-Combined.md)
- Overviews: [00-executive-overview.md](03-coaching/00-executive-overview.md), [01-executive-overview-acc-g5.md](03-coaching/01-executive-overview-acc-g5.md)
- Per-conference: `pac12.md`, `big12.md`, `big-ten.md`, `sec.md`, `acc.md`, `aac.md`, `mac.md`, `mountain-west.md`, `sun-belt.md`, `cusa.md`

---

## How to use with a coding agent

1. Read **[AGENTS.md](AGENTS.md)** for load order and guardrails.
2. Open **[catalog.json](catalog.json)** for machine-readable conferences → teams → paths and dataset pointers.
3. Use **[MANIFEST.json](MANIFEST.json)** for a full file inventory (path, size, category).
4. Use **[INDEX.md](INDEX.md)** as a human TOC with relative links to every major deliverable.

Prefer conference `*-Complete.md` and coaching combined masters for bulk context; prefer CSVs under `02-stats/historical/csv/` for numeric analysis. Never invent missing fields — respect source markers such as `"Not listed"`.

---

## Package layout

```
cfb-2026-master-package/
  README.md
  AGENTS.md
  MANIFEST.json
  catalog.json
  INDEX.md
  01-rosters/     # pac12, mw, mac, acc, aac, big12, sbc
  02-stats/       # polls, injuries, schedules, week0, historical, sos, scripts
  03-coaching/    # staffs & schemes (all conferences covered in source set)
  04-sos/         # SOS deliverables (hardlinked/copied from 02-stats/sos)
```

---

## Notes

- Raw historical scrape dumps (HTML/JSON) remain under `02-stats/historical/raw/` for reproducibility; prefer curated Markdown + CSV for analysis.
- Zip archive: `/workspace/cfb-2026-master-package.zip` (sibling of this folder).
