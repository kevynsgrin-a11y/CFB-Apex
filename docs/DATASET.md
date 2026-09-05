# The CFB Apex 2026 dataset

Everything under `data/dist` is generated from `data/source/cfb-2026-master-package`
by `tools/etl`. It is committed so that what a reviewer reads in a pull request is
exactly what gets deployed — CI rebuilds it and fails if the two differ, so no
artifact can be hand-edited into the tree.

```
python3 tools/etl/build.py            # rebuild everything
python3 tools/etl/build.py --only sos # rebuild one dataset
python3 tools/etl/build.py --check    # verify the committed output is reproducible
python3 tools/etl/validate.py         # integrity checks
```

531 JSON files, 22.9 MiB.

## The two rules everything follows

**`null` means the source published nothing.** It never means zero, empty, or
"we didn't bother". A player with `"stars": null` is not a zero-star recruit —
he is a player whose recruiting rating the roster did not list. Render that as
"Not listed", never as `0`. The build counts these gaps rather than filling them.

**Every artifact names its sources.** Each file carries a `meta` block with the
package-relative paths it was built from, so any figure on the site can be traced
to a document:

```json
{
  "meta": {
    "dataset": "roster",
    "schema_version": "1.0.0",
    "sources": ["01-rosters/acc-2026/clemson.md"],
    "as_of": "2026-09-05",
    "notes": ["..."]
  },
  "players": [...]
}
```

## What is in it

| Dataset | Files | Coverage |
|---|---:|---|
| `teams.json`, `conferences.json` | 2 | All **138** FBS programs for 2026, 11 conferences |
| `rosters/` | 93 | **10,455 players** across 92 teams — name, position, stars, class, high school, hometown, transfers |
| `depth-charts/` | 93 | **2,665 starters** across 92 teams, with scheme labels and OFFICIAL/MIXED/PROJECTED status |
| `schedules/` | 140 | All **138** teams; 1,665 team-game rows, **917** distinct games |
| `polls/` | 3 | AP and Coaches Top 25, plus 54 others-receiving-votes entries |
| `sos/` | 3 | Strength of schedule for **106** teams, 2026 and 2025, across four metrics |
| `coaching/` | 137 | **136** teams, 1,060 staff entries, 77 offensive and 70 defensive scheme labels |
| `stats/2026/` | 10 | All **8** Week 0 games with box scores, scoring plays and leaders |
| `stats/historical/` | 45 | Team and individual **2012–2025**, FEI **2010–2025**, SP+ 2025 |
| `injuries/` | 3 | 76 players across 17 teams, with the report's coverage caveat |

## Where the sources stop

These are gaps in the research package, not in the build. Each is named
explicitly in the relevant `index.json` so the site can say "not covered"
instead of rendering an empty table that reads as "nothing to report".

| Gap | Effect | Where it is recorded |
|---|---|---|
| No rosters or depth charts for the SEC, Big Ten, Conference USA or the independents | 46 of 138 teams have no roster | `rosters/index.json` → `conferences_without_rosters` |
| No SOS for the Pac-12, Mountain West or Sun Belt | 32 of 138 teams have no SOS row | `sos/index.json` → `teams_without_sos` |
| No coaching file for Notre Dame or UConn | 2 of 138 teams have no staff | `coaching/index.json` → `teams_without_coaching_file` |
| Only 8 games had been played by 2026-09-05 | 122 of 138 teams have no 2026 stats | `stats/2026/index.json` → `coverage_note` |
| Availability reports are mandated mainly for conference games | 17 teams listed; silence ≠ healthy | `injuries/index.json` → `coverage_caveat` |
| Idaho left FBS in 2018 | 1 unresolved name in historical stats | build warnings |

`data/dist/build-report.json` lists every warning from the last build.

## Reading the trickier fields

**Depth chart status.** `OFFICIAL` is a published team two-deep. `MIXED` means
some starters are confirmed and the rest projected. `PROJECTED` is a synthesis of
Ourlads and beat reporting. The source's fuller wording ("OFFICIAL (with DL
gap)") is kept in `status_raw`. Do not present a `PROJECTED` chart as a team's
official depth chart.

**Depth chart conflicts.** 191 positions where the per-team file and the
conference summary name different starters. Both values are kept in `conflicts`
with the file each came from, because that disagreement is real information.

**Strength of schedule.** Four independent metrics — ESPN FPI, Phil Steele,
opponent win percentage, TeamRankings. The source's own instruction is "do not
mix without labels", so each has its own field, definition and direction in
`metric_definitions`. Rank 1 is the toughest schedule.

**Schemes.** A scheme `label` exists only where a source plainly named one. When
`label` is `null` and `description` is not, the source explained why no base
scheme is published — show the explanation, do not guess a scheme. A team may
carry different labels in `coaching/` (from its athletics department) and
`depth-charts/` (from Ourlads); both are real, and each names its source.

**Non-FBS opponents.** `opponent_slug: null` on a schedule game means an FCS or
other non-FBS opponent. That is correct, not a gap — the opponent's name is in
`opponent`.

**Historical values.** `"84t"` is a touchdown-long, not a number, and is stored
as the source's own string. `columns` on each historical file preserves the
original header text so a UI can render headings it does not hard-code.

## Adding or refreshing data

1. Put new or updated research under `data/source/cfb-2026-master-package/`.
2. Extend the relevant parser in `tools/etl/parsers/` — never edit `data/dist`
   by hand; CI will catch it.
3. `python3 tools/etl/build.py --clean && python3 tools/etl/validate.py`
4. Commit both the source and the regenerated `data/dist`.

Each parser exposes one function:

```python
def build(package_root: Path, out_dir: Path, registry) -> dict:
    return {"artifacts": [...], "counts": {...}, "warnings": [...]}
```

Warnings are expected and wanted — they are how the build reports honest gaps.
Suppressing one to make output look clean is the failure mode this pipeline is
built to prevent.
