#!/usr/bin/env python3
import time, json
from pathlib import Path
from urllib.request import Request, urlopen
from bs4 import BeautifulSoup

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
RAW = Path("/workspace/cfb-stats-2026/historical/raw")
RAW.mkdir(parents=True, exist_ok=True)

def fetch(url, dest=None, sleep=0.4):
    time.sleep(sleep)
    req = Request(url, headers={"User-Agent": UA})
    with urlopen(req, timeout=60) as r:
        data = r.read()
    if dest:
        Path(dest).write_bytes(data)
    return data

def parse_team_table(html):
    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table")
    if not table:
        return [], []
    rows = table.find_all("tr")
    headers = [c.get_text(" ", strip=True) for c in rows[0].find_all(["th", "td"])]
    out = []
    for tr in rows[1:]:
        cells = [c.get_text(" ", strip=True) for c in tr.find_all(["th", "td"])]
        if len(cells) >= 2 and cells[0]:
            out.append(cells)
    return headers, out

coverage = {}
for year in range(2010, 2027):
    url = f"https://www.footballdb.com/college-football/stats/teamstat.html?cat=T&group=O&lg=FBS&yr={year}"
    try:
        html = fetch(url, RAW / f"team_off_{year}.html")
        headers, rows = parse_team_table(html)
        title = BeautifulSoup(html, "lxml").title
        coverage[str(year)] = {"off_rows": len(rows), "off_headers": headers, "title": title.get_text(strip=True) if title else ""}
        print(year, "OFF", len(rows))
    except Exception as e:
        coverage[str(year)] = {"error": str(e)}
        print(year, "ERR", e)
(RAW / "coverage_probe.json").write_text(json.dumps(coverage, indent=2))
print("done")
