#!/usr/bin/env python3
import csv, json, time, re
from pathlib import Path
from urllib.request import Request, urlopen
from bs4 import BeautifulSoup

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
RAW = Path("/workspace/cfb-stats-2026/historical/raw/bcftoys")
CSV = Path("/workspace/cfb-stats-2026/historical/csv/advanced")
RAW.mkdir(parents=True, exist_ok=True)
CSV.mkdir(parents=True, exist_ok=True)

def fetch(url, dest, sleep=0.5):
    time.sleep(sleep)
    req = Request(url, headers={"User-Agent": UA})
    with urlopen(req, timeout=90) as r:
        data = r.read()
    dest.write_bytes(data)
    return data

def parse_fei(html):
    soup = BeautifulSoup(html, "lxml")
    rows_out = []
    for table in soup.find_all("table"):
        for tr in table.find_all("tr"):
            tds = tr.find_all("td")
            if len(tds) < 5:
                continue
            rk = tds[0].get_text(strip=True)
            team = tds[1].get_text(strip=True)
            if not rk.isdigit():
                continue
            rec = tds[2].get_text(strip=True)
            fei = tds[4].get_text(strip=True)
            ofei = tds[6].get_text(strip=True) if len(tds) > 6 else ""
            dfei = tds[8].get_text(strip=True) if len(tds) > 8 else ""
            rows_out.append([rk, team, rec, fei, ofei, dfei])
    # dedupe by rank
    seen = set()
    uniq = []
    for r in rows_out:
        if r[0] in seen:
            continue
        seen.add(r[0])
        uniq.append(r)
    uniq.sort(key=lambda x: int(x[0]))
    return uniq

summary = {}
for year in range(2010, 2026):
    url = f"https://bcftoys.com/{year}-fei"
    try:
        html = fetch(url, RAW / f"fei_{year}.html")
        rows = parse_fei(html)
        out = CSV / f"fei_{year}.csv"
        with out.open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["Rk", "Team", "Rec", "FEI", "OFEI", "DFEI"])
            w.writerows(rows)
        summary[str(year)] = {"rows": len(rows), "top": rows[:10], "url": url}
        print(year, len(rows), rows[0] if rows else None)
    except Exception as e:
        summary[str(year)] = {"error": str(e), "url": url}
        print(year, "ERR", e)

(RAW / "fei_summary.json").write_text(json.dumps(summary, indent=2))
print("done")
