#!/usr/bin/env python3
from bs4 import BeautifulSoup
from pathlib import Path
import csv, json, re

html = Path("/workspace/cfb-stats-2026/historical/raw/espn_sp_2025.html").read_text(errors="ignore")
soup = BeautifulSoup(html, "lxml")
out_dir = Path("/workspace/cfb-stats-2026/historical/csv/advanced")
out_dir.mkdir(parents=True, exist_ok=True)
rows = []
for table in soup.select("table.inline-table"):
    headers = [th.get_text(strip=True) for th in table.select("thead th")]
    if headers[:3] == ["Team", "Rating", "Offense"]:
        for tr in table.select("tbody tr"):
            tds = [td.get_text(strip=True) for td in tr.find_all("td")]
            if len(tds) >= 5:
                m = re.match(r"^(\d+)\.\s+(.*?)\s+\(([^)]+)\)$", tds[0])
                if m:
                    rows.append([m.group(1), m.group(2), m.group(3), tds[1], tds[2], tds[3], tds[4]])
        break
print("SP+ rows", len(rows), rows[:3])
with (out_dir / "spplus_2025.csv").open("w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["Rk", "Team", "Rec", "SP+", "Offense", "Defense", "SpecTms"])
    w.writerows(rows)

fei_top = {}
for year in range(2010, 2026):
    p = out_dir / f"fei_{year}.csv"
    with p.open(encoding="utf-8") as f:
        r = list(csv.DictReader(f))
    fei_top[str(year)] = r[:10]
Path("/workspace/cfb-stats-2026/historical/raw/fei_top10.json").write_text(json.dumps(fei_top, indent=2))
print("fei years", len(fei_top))
