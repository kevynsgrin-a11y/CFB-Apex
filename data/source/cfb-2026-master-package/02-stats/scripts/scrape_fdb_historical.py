#!/usr/bin/env python3
"""Scrape Football Database FBS team and individual stats for historical compilation."""
from __future__ import annotations

import csv
import json
import re
import time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from bs4 import BeautifulSoup

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
BASE = Path("/workspace/cfb-stats-2026/historical")
RAW = BASE / "raw" / "footballdb"
CSV_DIR = BASE / "csv"
RAW.mkdir(parents=True, exist_ok=True)
CSV_DIR.mkdir(parents=True, exist_ok=True)

YEARS = list(range(2012, 2026))  # FootballDB full coverage; 2010-2011 empty


def fetch(url: str, dest: Path | None = None, sleep: float = 0.45) -> bytes:
    time.sleep(sleep)
    req = Request(url, headers={"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})
    with urlopen(req, timeout=90) as r:
        data = r.read()
    if dest is not None:
        dest.write_bytes(data)
    return data


def clean_team(name: str) -> str:
    # FootballDB duplicates short name in cell, e.g. "Ohio State Ohio St."
    name = re.sub(r"\s+", " ", name).strip()
    return name


def clean_player(name: str) -> str:
    name = name.replace("\xa0", " ")
    # Prefer longer form before abbreviated duplicate if present
    # e.g. "Kyle McCord SYR K. McCord SYR"
    m = re.match(r"^(.+?)\s+[A-Z]\.\s+\S+\s+[A-Z]{2,4}$", name)
    if m:
        # Keep "Kyle McCord SYR"
        parts = name.split()
        # Heuristic: take first occurrence of Fullname + TEAM abbrev
        # Find last all-caps team token of length 2-5 near start half
        tokens = name.split()
        # Drop trailing "X. Last TEAM"
        if len(tokens) >= 5 and re.match(r"^[A-Z]\.$", tokens[-3]):
            return " ".join(tokens[:-3])
    return name


def parse_table(html: bytes):
    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table")
    if not table:
        return [], []
    rows = table.find_all("tr")
    # Defense/scoring pages may have two header rows
    header_rows = []
    data_start = 0
    for i, tr in enumerate(rows[:3]):
        ths = tr.find_all("th")
        if ths:
            header_rows.append([c.get_text(" ", strip=True) for c in ths])
            data_start = i + 1
        else:
            break
    if not header_rows:
        headers = [c.get_text(" ", strip=True) for c in rows[0].find_all(["th", "td"])]
        data_start = 1
    elif len(header_rows) == 1:
        headers = header_rows[0]
    else:
        # Flatten multi-row headers simply using last row labels when present
        headers = header_rows[-1]
        # If first cell empty in last header, use first row category prefixes where helpful
        if headers and headers[0] == "":
            headers[0] = "Player"
    out = []
    for tr in rows[data_start:]:
        cells = [c.get_text(" ", strip=True).replace("\xa0", " ") for c in tr.find_all(["th", "td"])]
        if not cells or not any(cells):
            continue
        # skip repeated header-ish rows
        if cells[0] in {"Team", "Player", ""} and ("Gms" in cells or "Att" in cells or "Int" in cells):
            continue
        out.append(cells)
    return headers, out


def write_csv(path: Path, headers, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(headers)
        w.writerows(rows)


def scrape_team(year: int, group: str, cat: str):
    # group O/D, cat T/P/R/S
    url = (
        "https://www.footballdb.com/college-football/stats/teamstat.html"
        f"?cat={cat}&group={group}&lg=FBS&yr={year}"
    )
    dest = RAW / f"team_{group}_{cat}_{year}.html"
    html = fetch(url, dest)
    headers, rows = parse_table(html)
    # Normalize first column
    norm = []
    for row in rows:
        if not row:
            continue
        row = list(row)
        row[0] = clean_team(row[0])
        norm.append(row)
    label = "offense" if group == "O" else "defense"
    kind = {"T": "total", "P": "passing", "R": "rushing", "S": "scoring"}.get(cat, cat)
    out = CSV_DIR / "team" / f"{year}_{label}_{kind}.csv"
    if headers and norm:
        write_csv(out, headers, norm)
    return url, len(norm), str(out) if headers and norm else None


def scrape_players(year: int, mode: str, sort: str, top_n: int = 25):
    url = (
        "https://www.footballdb.com/college-football/stats/stats.html"
        f"?mode={mode}&yr={year}&lg=FBS&sort={sort}"
    )
    dest = RAW / f"ind_{mode}_{sort}_{year}.html"
    html = fetch(url, dest)
    headers, rows = parse_table(html)
    norm = []
    for row in rows[:top_n]:
        row = list(row)
        row[0] = clean_player(row[0])
        norm.append(row)
    names = {
        ("P", "passyds"): "passing_yards",
        ("P", "passrate"): "passing_rating",
        ("P", "passtd"): "passing_td",
        ("R", "rushyds"): "rushing_yards",
        ("R", "rushtd"): "rushing_td",
        ("C", "recyds"): "receiving_yards",
        ("C", "rectd"): "receiving_td",
        ("D", "deftot"): "tackles",
        ("D", "defsack"): "sacks",
        ("D", "defint"): "interceptions",
    }
    label = names.get((mode, sort), f"{mode}_{sort}")
    out = CSV_DIR / "individual" / f"{year}_{label}.csv"
    if headers and norm:
        write_csv(out, headers, norm)
    return url, len(norm), str(out) if headers and norm else None


def main():
    manifest = {"source": "Football Database", "years": {}, "notes": []}
    team_jobs = [
        ("O", "T"),
        ("D", "T"),
        ("O", "P"),
        ("D", "P"),
        ("O", "R"),
        ("D", "R"),
    ]
    player_jobs = [
        ("P", "passyds"),
        ("P", "passtd"),
        ("P", "passrate"),
        ("R", "rushyds"),
        ("R", "rushtd"),
        ("C", "recyds"),
        ("C", "rectd"),
        ("D", "deftot"),
        ("D", "defsack"),
        ("D", "defint"),
    ]

    for year in YEARS:
        yinfo = {"team": [], "individual": []}
        print(f"=== {year} team ===")
        for group, cat in team_jobs:
            try:
                url, n, path = scrape_team(year, group, cat)
                yinfo["team"].append({"group": group, "cat": cat, "url": url, "rows": n, "csv": path})
                print(f"  team {group}/{cat}: {n}")
            except Exception as e:
                yinfo["team"].append({"group": group, "cat": cat, "error": str(e)})
                print(f"  team {group}/{cat} ERR {e}")
        print(f"=== {year} individual ===")
        for mode, sort in player_jobs:
            try:
                url, n, path = scrape_players(year, mode, sort, top_n=25)
                yinfo["individual"].append({"mode": mode, "sort": sort, "url": url, "rows": n, "csv": path})
                print(f"  ind {mode}/{sort}: {n}")
            except Exception as e:
                yinfo["individual"].append({"mode": mode, "sort": sort, "error": str(e)})
                print(f"  ind {mode}/{sort} ERR {e}")
        manifest["years"][str(year)] = yinfo

    manifest["notes"].append(
        "Football Database FBS team tables for 2010–2011 returned no data tables; those years require alternate sources (Sports-Reference CFB, ESPN)."
    )
    manifest["notes"].append(
        "Team tables include Pts/G, Rush Yds/G, Pass Yds/G, Tot Yds/G. Official team turnovers/takeaways are not present on these FootballDB team pages."
    )
    (BASE / "raw" / "scrape_manifest.json").write_text(json.dumps(manifest, indent=2))
    print("Wrote manifest")


if __name__ == "__main__":
    main()
