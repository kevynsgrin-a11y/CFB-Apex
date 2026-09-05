#!/usr/bin/env python3
"""Build formal historical CFB markdown compilations from scraped CSVs."""
from __future__ import annotations

import csv
import re
from pathlib import Path

BASE = Path("/workspace/cfb-stats-2026/historical")
CSV_DIR = BASE / "csv"
OUT = BASE

TEAM_METRICS = [
    ("offense", "total", "Pts/G", "Scoring offense (Pts/G)", True),
    ("offense", "total", "Yds/G", "Total offense (Yds/G)", True),
    ("offense", "total", "PYds/G", "Passing offense (Pass Yds/G)", True),
    ("offense", "total", "RYds/G", "Rushing offense (Rush Yds/G)", True),
    ("defense", "total", "Pts/G", "Scoring defense (Pts allowed/G)", False),
    ("defense", "total", "Yds/G", "Total defense (Yds allowed/G)", False),
    ("defense", "total", "PYds/G", "Pass defense (Pass Yds allowed/G)", False),
    ("defense", "total", "RYds/G", "Rush defense (Rush Yds allowed/G)", False),
]

IND_SPECS = [
    ("passing_yards", "Passing yards", ["Player", "Yds", "TD", "Rate", "Att", "Cmp", "Pct"], "Yds", True),
    ("passing_td", "Passing touchdowns", ["Player", "TD", "Yds", "Rate", "Att", "Cmp"], "TD", True),
    ("passing_rating", "Passer rating", ["Player", "Rate", "Yds", "TD", "Att", "Cmp", "Pct"], "Rate", True),
    ("rushing_yards", "Rushing yards", ["Player", "Yds", "TD", "Att", "Avg"], "Yds", True),
    ("rushing_td", "Rushing touchdowns", ["Player", "TD", "Yds", "Att", "Avg"], "TD", True),
    ("receiving_yards", "Receiving yards", ["Player", "Yds", "TD", "Rec", "Avg"], "Yds", True),
    ("receiving_td", "Receiving touchdowns", ["Player", "TD", "Yds", "Rec", "Avg"], "TD", True),
    ("tackles", "Total tackles", ["Player", "Tot", "Solo", "Ast", "Sack", "Int"], "Tot", True),
    ("sacks", "Sacks", ["Player", "Sack", "Tot", "Solo", "Ast", "Int"], "Sack", True),
    ("interceptions", "Interceptions", ["Player", "Int", "Yds", "TD", "Tot", "Sack"], "Int", True),
]


def read_csv(path: Path):
    if not path.exists():
        return [], []
    with path.open(newline="", encoding="utf-8") as f:
        rows = list(csv.reader(f))
    if not rows:
        return [], []
    return rows[0], rows[1:]


def num(x: str):
    try:
        return float(str(x).replace(",", "").replace("%", ""))
    except Exception:
        return None


def clean_team_display(name: str) -> str:
    name = re.sub(r"\s+", " ", name).strip()
    # Prefer longer left token when FootballDB duplicates short name
    # e.g. "Ohio State Ohio St." / "Miami Miami"
    parts = name.split()
    if len(parts) >= 2 and parts[0] == parts[1]:
        return parts[0]
    # "Kent State Kent St." -> Kent State
    m = re.match(r"^(.+?)\s+\1(?:\.|$)", name)
    if m:
        return m.group(1)
    # Heuristic: if last tokens look like abbreviation of earlier full name
    if " St." in name:
        left = name.split(" St.")[0]
        # "Ohio State Ohio" -> Ohio State
        toks = name.split()
        if len(toks) >= 3 and toks[-1] in {"St.", "St"}:
            # find first occurrence of State/St pattern
            if "State" in toks:
                i = toks.index("State")
                return " ".join(toks[: i + 1])
    return name


def sort_rows(headers, rows, col, descending=True):
    if col not in headers:
        return list(rows)
    i = headers.index(col)
    scored = []
    for r in rows:
        if len(r) <= i:
            continue
        v = num(r[i])
        if v is None:
            continue
        scored.append((v, r))
    scored.sort(key=lambda t: t[0], reverse=descending)
    return [r for _, r in scored]


def md_table(headers, rows, cols=None, n=25, team_col=None):
    use = cols or headers
    idxs = []
    out_headers = []
    for c in use:
        if c in headers:
            idxs.append(headers.index(c))
            out_headers.append(c)
    lines = [
        "| " + " | ".join(["Rk"] + out_headers) + " |",
        "| --- | " + " | ".join(["---"] * len(out_headers)) + " |",
    ]
    for rk, r in enumerate(rows[:n], 1):
        cells = [str(rk)]
        for j, i in enumerate(idxs):
            val = r[i] if i < len(r) else ""
            if team_col is not None and out_headers[j] == team_col:
                val = clean_team_display(val)
            cells.append(val)
        lines.append("| " + " | ".join(cells) + " |")
    return "\n".join(lines)


def fdb_url_team(year, group, cat="T"):
    return f"https://www.footballdb.com/college-football/stats/teamstat.html?cat={cat}&group={group}&lg=FBS&yr={year}"


def fdb_url_ind(year, mode, sort):
    return f"https://www.footballdb.com/college-football/stats/stats.html?mode={mode}&yr={year}&lg=FBS&sort={sort}"


def build_team_band(years, path: Path, title: str):
    parts = [f"# {title}\n"]
    parts.append(
        "Primary source: [The Football Database — FBS Team Stats](https://www.footballdb.com/college-football/stats/teamstat.html). "
        "Tables below show the **Top 25** for each metric. Full FBS season tables are archived as CSV under `csv/team/`.\n"
    )
    parts.append(
        "**Caveats:** Football Database did not publish FBS team-total tables for **2010–2011** in this scrape. "
        "Team **turnovers / takeaways** are not available on FootballDB team total pages; see gaps in README. "
        "Preferred cross-check source (Cloudflare-blocked in this environment): "
        "[Sports-Reference CFB Team Offense/Defense](https://www.sports-reference.com/cfb/years/2024-team-offense.html).\n"
    )
    for year in years:
        parts.append(f"\n---\n\n## {year} Season\n")
        if year in (2010, 2011):
            parts.append(
                f"_Gap:_ Football Database returned empty team tables for {year}. "
                f"Use Sports-Reference CFB "
                f"[offense](https://www.sports-reference.com/cfb/years/{year}-team-offense.html) / "
                f"[defense](https://www.sports-reference.com/cfb/years/{year}-team-defense.html) "
                f"or ESPN team leaders "
                f"[`/season/{year}/view/team`](https://www.espn.com/college-football/stats/_/season/{year}/view/team) "
                f"in a follow-up pass.\n"
            )
            if year == 2010:
                parts.append(
                    "\n### Partial public Top lines (Sports-Reference / ESPN snippets; not full tables)\n\n"
                    "| Metric | Leader (approx.) | Value | Source |\n"
                    "| --- | --- | --- | --- |\n"
                    "| Scoring offense | Oregon | 47.0 Pts/G | [SR team offense 2010](https://www.sports-reference.com/cfb/years/2010-team-offense.html) |\n"
                    "| Total offense | Oregon | 530.7 Yds/G | [ESPN 2010 team](https://www.espn.com/college-football/stats/_/season/2010/view/team) |\n"
                    "| Passing offense | Hawai'i | 394.3 Yds/G | ESPN 2010 team |\n"
                    "| Rushing offense | Georgia Tech | 323.3 Yds/G | ESPN 2010 team |\n"
                    "| Scoring defense | TCU | 12.0 Pts allowed/G | [SR team defense 2010](https://www.sports-reference.com/cfb/years/2010-team-defense.html) |\n"
                    "| Total defense | TCU | 228.5 Yds allowed/G | SR / NCAA ranking pages |\n"
                )
            continue
        parts.append(
            f"- Offense totals: {fdb_url_team(year, 'O')}\n"
            f"- Defense totals: {fdb_url_team(year, 'D')}\n"
            f"- Full CSV: `csv/team/{year}_offense_total.csv`, `csv/team/{year}_defense_total.csv`\n"
        )
        off_h, off_r = read_csv(CSV_DIR / "team" / f"{year}_offense_total.csv")
        def_h, def_r = read_csv(CSV_DIR / "team" / f"{year}_defense_total.csv")
        for side, kind, col, label, desc in TEAM_METRICS:
            h, r = (off_h, off_r) if side == "offense" else (def_h, def_r)
            if not r:
                continue
            sorted_rows = sort_rows(h, r, col, descending=desc)
            cols = ["Team", "Gms", col]
            if "Tot Pts" in h and col == "Pts/G":
                cols.append("Tot Pts")
            if "TotYds" in h and col == "Yds/G":
                cols.append("TotYds")
            parts.append(f"\n### {label}\n")
            parts.append(md_table(h, sorted_rows, cols=cols, n=25, team_col="Team"))
            parts.append("\n")
    path.write_text("\n".join(parts), encoding="utf-8")
    print("wrote", path)


def pick_cols(headers, preferred):
    return [c for c in preferred if c in headers] or headers[:6]


def build_individual(path: Path):
    parts = ["# Individual Statistical Leaders by Season (FBS), 2012–2025\n"]
    parts.append(
        "Primary source: [The Football Database — FBS Statistical Leaders](https://www.footballdb.com/college-football/stats/index.html). "
        "Each table lists the **Top 25** leaders for the indicated category (re-sorted locally on the target column). "
        "CSV extracts: `csv/individual/`.\n"
    )
    parts.append(
        "**Scope note:** Full Football Database individual leaderboards for **2010–2011** were not archived as CSVs in this pass. "
        "ESPN season player pages remain available, e.g. "
        "[2010 passing yards](https://www.espn.com/college-football/stats/player/_/view/offense/season/2010/table/passing/sort/passingYards/dir/desc). "
        "Sports-Reference season leaders: `https://www.sports-reference.com/cfb/years/YYYY-leaders.html`.\n"
    )
    sort_map = {
        "passing_yards": ("P", "passyds"),
        "passing_td": ("P", "passtd"),
        "passing_rating": ("P", "passrate"),
        "rushing_yards": ("R", "rushyds"),
        "rushing_td": ("R", "rushtd"),
        "receiving_yards": ("C", "recyds"),
        "receiving_td": ("C", "rectd"),
        "tackles": ("D", "deftot"),
        "sacks": ("D", "defsack"),
        "interceptions": ("D", "defint"),
    }
    for year in range(2012, 2026):
        parts.append(f"\n---\n\n## {year} Season\n")
        for key, title, preferred, sort_col, desc in IND_SPECS:
            h, r = read_csv(CSV_DIR / "individual" / f"{year}_{key}.csv")
            if not r:
                continue
            r = sort_rows(h, r, sort_col, descending=desc)
            mode, sort = sort_map[key]
            parts.append(f"\n### {title}\n")
            parts.append(f"Source: {fdb_url_ind(year, mode, sort)}\n\n")
            parts.append(md_table(h, r, cols=pick_cols(h, preferred), n=25))
            parts.append("\n")
    path.write_text("\n".join(parts), encoding="utf-8")
    print("wrote", path)


def build_index():
    text = """# Team Offense & Defense by Season — Index

This compilation is split by five-year bands for readability. Full FBS CSV tables live under `csv/team/`.

| Band | File | Coverage |
| --- | --- | --- |
| 2010–2014 | [team-offense-defense-2010-2014.md](team-offense-defense-2010-2014.md) | FootballDB Top 25 for **2012–2014**; 2010–2011 gap notes + partial 2010 leaders |
| 2015–2019 | [team-offense-defense-2015-2019.md](team-offense-defense-2015-2019.md) | FootballDB Top 25 for all seasons |
| 2020–2025 | [team-offense-defense-2020-2025.md](team-offense-defense-2020-2025.md) | FootballDB Top 25 for all seasons |

Canonical entry point for “team-offense-defense-by-season”: this index (split due to volume).
"""
    (OUT / "team-offense-defense-by-season.md").write_text(text, encoding="utf-8")
    print("wrote index")


if __name__ == "__main__":
    build_team_band(
        range(2010, 2015),
        OUT / "team-offense-defense-2010-2014.md",
        "Team Offense & Defense Rankings (FBS), 2010–2014",
    )
    build_team_band(
        range(2015, 2020),
        OUT / "team-offense-defense-2015-2019.md",
        "Team Offense & Defense Rankings (FBS), 2015–2019",
    )
    build_team_band(
        range(2020, 2026),
        OUT / "team-offense-defense-2020-2025.md",
        "Team Offense & Defense Rankings (FBS), 2020–2025",
    )
    build_index()
    build_individual(OUT / "individual-leaders-by-season.md")
