#!/usr/bin/env python3
import csv
import json
from pathlib import Path

BASE = Path("/workspace/cfb-stats-2026/historical")
ADV = BASE / "csv" / "advanced"
FEI_TOP = json.loads((BASE / "raw" / "fei_top10.json").read_text())


def fei_table(year: int, n=10) -> str:
    rows = FEI_TOP[str(year)][:n]
    lines = [
        "| Rk | Team | Rec | FEI | OFEI | DFEI |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for r in rows:
        lines.append(
            f"| {r['Rk']} | {r['Team']} | {r['Rec']} | {r['FEI']} | {r['OFEI']} | {r['DFEI']} |"
        )
    return "\n".join(lines)


def sp_table(n=25) -> str:
    p = ADV / "spplus_2025.csv"
    with p.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))[:n]
    lines = [
        "| Rk | Team | Rec | SP+ | Offense | Defense | Spec Tms |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    for r in rows:
        lines.append(
            f"| {r['Rk']} | {r['Team']} | {r['Rec']} | {r['SP+']} | {r['Offense']} | {r['Defense']} | {r['SpecTms']} |"
        )
    return "\n".join(lines)


advanced = f"""# Advanced College Football Metrics (Public Sources), 2010–2025

This document summarizes **freely published** advanced ratings and points to full tables. No proprietary or invented figures are included. Where only linkable archives exist (or an API key is required), that limitation is stated explicitly.

## Coverage map

| Metric | Publisher | Years archived here | Local artifacts | Public URLs |
| --- | --- | --- | --- | --- |
| **FEI** (overall / OFEI / DFEI) | Brian Fremeau / BCF Toys | **2010–2025** full FBS CSVs + Top 10 summaries below | `csv/advanced/fei_YYYY.csv` | [bcftoys.com](https://bcftoys.com/) year pages, e.g. [2024 FEI](https://bcftoys.com/2024-fei), [2010 FEI](https://bcftoys.com/2010-fei) |
| **F+** (FEI + SP+) | BCF Toys | Linkable year index (not fully re-scraped) | — | [2025 F+](https://bcftoys.com/2025-fplus) (nav includes 2007–2026) |
| **SP+** | Bill Connelly / ESPN | **2025 final** full 136-team table archived | `csv/advanced/spplus_2025.csv` | [2025 final SP+](https://www.espn.com/college-football/story/_/id/46128861/2025-college-football-sp+-rankings-all-136-fbs-teams) |
| **SP+ historical** | ESPN / CFBD | Not bulk-downloaded (CFBD API requires free key) | — | [CFBD SP+ trends](https://collegefootballdata.com/sp/trends); ESPN SP+ story archive via site search |
| **FPI** | ESPN | Live portal only in this pass (2026 season page) | raw HTML snapshot `raw/espn_fpi.html` | [ESPN FPI](https://www.espn.com/college-football/fpi) |
| **Success rate / EPA** | Various (PFF, ESPN Next Gen/advanced box, CFBD) | **Not compiled** — no free, complete public season tables scraped without auth | — | CFBD advanced box scores (API key); ESPN game pages for recent seasons |
| **SRS / SOS** | Sports-Reference CFB | Preferred but **Cloudflare-blocked** in this environment | — | e.g. [2024 ratings](https://www.sports-reference.com/cfb/years/2024-ratings.html) |

---

## FEI Top 10 by season (2010–2025)

Source for each year: `https://bcftoys.com/{{year}}-fei` (scraped 2026-09-05 PT). Full FBS files: `csv/advanced/fei_{{year}}.csv`.

FEI is opponent-adjusted possession efficiency (scoring advantage per non-garbage possession vs an average opponent on a neutral field), per BCF Toys methodology notes on each year page.

"""

for year in range(2010, 2026):
    advanced += f"\n### {year}\n\n"
    advanced += f"Source: https://bcftoys.com/{year}-fei\n\n"
    advanced += fei_table(year, 10) + "\n"

advanced += """
---

## SP+ — 2025 final rankings (Top 25 of 136)

Source: Bill Connelly, ESPN, published 2026-01-20 — [full article](https://www.espn.com/college-football/story/_/id/46128861/2025-college-football-sp+-rankings-all-136-fbs-teams).  
Local CSV (all 136): `csv/advanced/spplus_2025.csv`.

SP+ is a tempo- and opponent-adjusted efficiency rating intended to be **predictive**. Offense/defense columns include parenthetical national ranks from the source table.

"""
advanced += sp_table(25) + "\n"

advanced += """
---

## FPI (Football Power Index)

ESPN publishes FPI at [espn.com/college-football/fpi](https://www.espn.com/college-football/fpi). Historical end-of-season FPI tables were **not** systematically archived in this pass (the live page reflects the current season). Follow-up: capture end-of-season FPI snapshots per year 2010–2025 from ESPN archives or CFBD (if licensed).

A raw HTML snapshot of the portal as of scrape time is stored at `raw/espn_fpi.html` for provenance only.

---

## Success rate, EPA, and related play-level metrics

No complete free public dump of season-level success rate / EPA leaderboards for 2010–2025 was ingested without authentication. Recommended **public** follow-up paths (do not invent values):

1. **CollegeFootballData.com** — advanced box scores / EPA endpoints (free API key registration): https://collegefootballdata.com/  
2. **ESPN** — recent game pages sometimes surface EPA/win probability; not a full historical team leaderboard.  
3. **BCF Toys** — FEI/F+ already capture opponent-adjusted efficiency at possession level (above).

---

## Follow-up priorities (advanced)

1. Register a CFBD API key and pull SP+ by year for 2010–2025 into `csv/advanced/spplus_YYYY.csv`.  
2. Scrape BCF Toys **F+** year pages into CSV (parallel to FEI).  
3. Archive end-of-season ESPN FPI tables per year.  
4. If Sports-Reference Cloudflare access is restored, add SRS and any published advanced columns from yearly ratings pages.
"""

(BASE / "advanced-stats.md").write_text(advanced, encoding="utf-8")
print("wrote advanced-stats.md", len(advanced))

readme = """# Historical College Football Statistics Compilation (FBS), 2010–2025

**Project path:** `/workspace/cfb-stats-2026/historical/`  
**Compiled:** 2026-09-05 (PT)  
**Principle:** Prefer public primary sources; **do not invent** missing figures. Gaps are labeled explicitly.

---

## Deliverables

| File | Contents |
| --- | --- |
| [README.md](README.md) | Methodology, sources, coverage map, completed vs remaining |
| [team-offense-defense-by-season.md](team-offense-defense-by-season.md) | Index to five-year band files |
| [team-offense-defense-2010-2014.md](team-offense-defense-2010-2014.md) | Team O/D Top 25 (2012–2014) + 2010–2011 gap notes |
| [team-offense-defense-2015-2019.md](team-offense-defense-2015-2019.md) | Team O/D Top 25 |
| [team-offense-defense-2020-2025.md](team-offense-defense-2020-2025.md) | Team O/D Top 25 |
| [individual-leaders-by-season.md](individual-leaders-by-season.md) | Passing / rushing / receiving / tackles / sacks / INT Top 25 by season (2012–2025) |
| [advanced-stats.md](advanced-stats.md) | FEI 2010–2025 Top 10 + full CSVs; SP+ 2025 full; FPI/EPA notes |
| `csv/team/` | Full FBS team offense & defense totals (+ pass/rush splits) per season 2012–2025 |
| `csv/individual/` | Top-25 extracts per category/season 2012–2025 |
| `csv/advanced/` | FEI full tables 2010–2025; SP+ 2025 |
| `raw/` | HTML provenance + scrape manifests |
| `scripts/` | Reproducible scrape/build scripts (parent: `/workspace/cfb-stats-2026/scripts/`) |

---

## Methodology

1. **Primary team & individual counting stats (2012–2025):** Scraped from [The Football Database](https://www.footballdb.com/college-football/stats/teamstat.html) FBS pages (`lg=FBS`).  
   - Team total offense/defense: Pts/G, rush Yds/G, pass Yds/G, total Yds/G (and season totals).  
   - Individual: passing (yards, TDs, rating), rushing (yards, TDs), receiving (yards, TDs), defense (tackles, sacks, interceptions).  
2. **Markdown Top 25 tables** are derived from those CSVs. Individual TD/sack/INT boards are **re-sorted locally** on the target column (FootballDB HTML sort parameters are not always authoritative).  
3. **2010–2011 team totals:** FootballDB returned **empty** tables; documented as gaps with Sports-Reference / ESPN URL pointers and a partial 2010 leader line table from public snippets.  
4. **Advanced metrics:** FEI scraped from [BCF Toys](https://bcftoys.com/); final 2025 SP+ parsed from Bill Connelly’s ESPN article; FPI/EPA noted as linkable but not fully archived.  
5. **Sports-Reference CFB** (preferred for turnovers and many historical tables) was **blocked by Cloudflare** for both automated fetch and browser automation in this environment. URLs are cited for follow-up.  
6. **No invented data.** Where a metric is unavailable, the gap is stated.

### Scripts

- `scripts/scrape_fdb_historical.py` — FootballDB team + individual scrape  
- `scripts/scrape_fei.py` — BCF Toys FEI scrape  
- `scripts/build_markdown.py` — team/individual markdown builders  
- `scripts/parse_sp_fei.py` / `scripts/build_advanced_readme.py` — SP+ parse + advanced/README generation  

---

## Coverage map

### Team offense & defense

| Season | Pts/G | Tot Yds/G | Pass/Rush Yds/G | Turnovers / Takeaways | Full FBS CSV |
| --- | --- | --- | --- | --- | --- |
| 2010 | Partial public leaders only | Partial (ESPN Top 5) | Partial (ESPN Top 5) | **Missing** (SR blocked) | No |
| 2011 | **Missing** (gap) | **Missing** | **Missing** | **Missing** | No |
| 2012–2025 | Top 25 MD + full CSV | Top 25 MD + full CSV | Top 25 MD + full CSV | **Missing** on FootballDB team pages | Yes (`csv/team/`) |

Also archived (CSV, not always rendered in MD): team **passing** and **rushing** offense/defense split pages per year 2012–2025.

### Individual leaders

| Season | Pass Yds/TD/Rate | Rush Yds/TD | Rec Yds/TD | Tackles / Sacks / INT |
| --- | --- | --- | --- | --- |
| 2010–2011 | Not fully archived (ESPN pages available; 2010 passing names captured partially) | Gap | Gap | Gap |
| 2012–2025 | Top 25 MD + CSV | Top 25 MD + CSV | Top 25 MD + CSV | Top 25 MD + CSV |

### Advanced

| Metric | Status |
| --- | --- |
| FEI | **Complete** 2010–2025 full CSV + Top 10 in `advanced-stats.md` |
| SP+ | **2025 final complete**; earlier years linkable / CFBD API follow-up |
| F+ | Link index on BCF Toys; not CSV-archived this pass |
| FPI | Portal linked; historical EOY tables not archived |
| Success rate / EPA | Not compiled (auth / incomplete free dumps) |

---

## Primary source URLs

- FootballDB team offense: `https://www.footballdb.com/college-football/stats/teamstat.html?cat=T&group=O&lg=FBS&yr=YYYY`  
- FootballDB team defense: `...?cat=T&group=D&lg=FBS&yr=YYYY`  
- FootballDB individuals: `https://www.footballdb.com/college-football/stats/stats.html?mode={P|R|C|D}&yr=YYYY&lg=FBS&sort=...`  
- Sports-Reference team offense: `https://www.sports-reference.com/cfb/years/YYYY-team-offense.html`  
- Sports-Reference leaders: `https://www.sports-reference.com/cfb/years/YYYY-leaders.html`  
- ESPN team leaders: `https://www.espn.com/college-football/stats/_/season/YYYY/view/team`  
- ESPN player leaders example: `https://www.espn.com/college-football/stats/player/_/view/offense/season/YYYY/table/passing/sort/passingYards/dir/desc`  
- NCAA.com current team stats: `https://www.ncaa.com/stats/football/fbs`  
- BCF Toys FEI: `https://bcftoys.com/YYYY-fei`  
- ESPN SP+ 2025: https://www.espn.com/college-football/story/_/id/46128861/2025-college-football-sp+-rankings-all-136-fbs-teams  
- ESPN FPI: https://www.espn.com/college-football/fpi  
- CFBD: https://collegefootballdata.com/

---

## Completed vs remaining (follow-up pass)

### Completed in this pass

- Directory structure and formal markdown outputs under `/workspace/cfb-stats-2026/historical/`.  
- Full FBS FootballDB team O/D (+ pass/rush splits) CSVs for **2012–2025**.  
- Top 25 markdown tables for key team metrics by season (banded files + index).  
- Individual Top 25 leaders for pass/rush/receiving/tackles/sacks/INT for **2012–2025**.  
- FEI full-season CSVs and Top 10 summaries for **2010–2025**.  
- Final **2025 SP+** full 136-team CSV + Top 25 in advanced doc.  
- Methodology / coverage documentation with cited URLs.  
- Explicit gap labeling (no fabricated stats).

### Remaining for a follow-up pass

1. **2010–2011 team offense/defense full tables** (and Top 25 markdown) via Sports-Reference (if Cloudflare clears) or NCAA historical ranking pages / ESPN “complete leaders” deep links.  
2. **Team turnovers & takeaways** for all seasons 2010–2025 (Sports-Reference team pages are the best free source).  
3. **2010–2011 individual leaders** full Top 25 for all requested categories (ESPN player tables or SR leaders pages).  
4. **SP+ by year 2010–2024** via CFBD API key or ESPN article archive.  
5. **F+ and end-of-season FPI** archives.  
6. **Success rate / EPA** season summaries if a free public dump is identified.  
7. Optional: clean FootballDB duplicated team-name display strings in CSVs; reconcile minor Yds/G differences vs Sports-Reference (methodology / bowl inclusion).  
8. Optional: NCAA.com / FOX Sports cross-checks for contested seasons (e.g., 2020 shortened schedules).

---

## Notes on 2020 and bowl inclusion

- **2020** schedules vary widely by conference; per-game leaders can be volatile for teams with few games (visible in Top 25 tables).  
- FootballDB and Sports-Reference may differ on bowl inclusion and sack-yard accounting; always cite the source URL when quoting a ranking.
"""

(BASE / "README.md").write_text(readme, encoding="utf-8")
print("wrote README.md", len(readme))
