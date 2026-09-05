# Advanced College Football Metrics (Public Sources), 2010–2025

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

Source for each year: `https://bcftoys.com/{year}-fei` (scraped 2026-09-05 PT). Full FBS files: `csv/advanced/fei_{year}.csv`.

FEI is opponent-adjusted possession efficiency (scoring advantage per non-garbage possession vs an average opponent on a neutral field), per BCF Toys methodology notes on each year page.


### 2010

Source: https://bcftoys.com/2010-fei

| Rk | Team | Rec | FEI | OFEI | DFEI |
| --- | --- | --- | --- | --- | --- |
| 1 | Stanford | 12-1 | 1.68 | .83 | .70 |
| 2 | Oregon | 12-1 | 1.38 | .49 | .76 |
| 3 | Boise State | 12-1 | 1.37 | .57 | .75 |
| 4 | Alabama | 10-3 | 1.28 | .55 | .63 |
| 5 | Auburn | 14-0 | 1.15 | .68 | .40 |
| 6 | Ohio State | 12-1 | 1.07 | .34 | .77 |
| 7 | TCU | 13-0 | .98 | .34 | .63 |
| 8 | Virginia Tech | 11-3 | .97 | .36 | .46 |
| 9 | Arkansas | 10-3 | .89 | .34 | .50 |
| 10 | Wisconsin | 11-2 | .84 | .41 | .34 |

### 2011

Source: https://bcftoys.com/2011-fei

| Rk | Team | Rec | FEI | OFEI | DFEI |
| --- | --- | --- | --- | --- | --- |
| 1 | LSU | 13-1 | 1.45 | .35 | .95 |
| 2 | Alabama | 12-1 | 1.44 | .38 | .98 |
| 3 | Wisconsin | 11-3 | 1.26 | .91 | .28 |
| 4 | Oklahoma State | 12-1 | 1.26 | .47 | .69 |
| 5 | Oregon | 12-2 | 1.18 | .51 | .69 |
| 6 | Stanford | 11-2 | 1.09 | .55 | .54 |
| 7 | Oklahoma | 10-3 | .99 | .20 | .72 |
| 8 | Boise State | 12-1 | .96 | .41 | .49 |
| 9 | Michigan | 11-2 | .86 | .29 | .51 |
| 10 | USC | 10-2 | .83 | .38 | .43 |

### 2012

Source: https://bcftoys.com/2012-fei

| Rk | Team | Rec | FEI | OFEI | DFEI |
| --- | --- | --- | --- | --- | --- |
| 1 | Alabama | 13-1 | 1.67 | .65 | .87 |
| 2 | Oregon | 12-1 | 1.40 | .64 | .64 |
| 3 | Texas A&M | 11-2 | 1.33 | .88 | .45 |
| 4 | Kansas State | 11-2 | 1.15 | .43 | .63 |
| 5 | Georgia | 12-2 | 1.08 | .45 | .58 |
| 6 | Oklahoma | 10-3 | .93 | .44 | .46 |
| 7 | South Carolina | 11-2 | .90 | .17 | .71 |
| 8 | Florida | 11-2 | .90 | -.10 | .81 |
| 9 | Oklahoma State | 8-5 | .89 | .32 | .49 |
| 10 | Notre Dame | 12-1 | .85 | .23 | .67 |

### 2013

Source: https://bcftoys.com/2013-fei

| Rk | Team | Rec | FEI | OFEI | DFEI |
| --- | --- | --- | --- | --- | --- |
| 1 | Florida State | 14-0 | 1.65 | .77 | .78 |
| 2 | Alabama | 11-2 | 1.28 | .46 | .67 |
| 3 | Oregon | 11-2 | 1.27 | .65 | .58 |
| 4 | Baylor | 11-2 | 1.10 | .59 | .51 |
| 5 | Stanford | 11-3 | 1.06 | .29 | .64 |
| 6 | Auburn | 12-2 | .97 | .43 | .46 |
| 7 | Arizona State | 10-4 | .95 | .42 | .47 |
| 8 | Ohio State | 12-2 | .94 | .60 | .26 |
| 9 | Missouri | 12-2 | .94 | .36 | .61 |
| 10 | Washington | 9-4 | .92 | .33 | .54 |

### 2014

Source: https://bcftoys.com/2014-fei

| Rk | Team | Rec | FEI | OFEI | DFEI |
| --- | --- | --- | --- | --- | --- |
| 1 | Alabama | 12-2 | 1.30 | .63 | .70 |
| 2 | Oregon | 13-2 | 1.27 | .82 | .43 |
| 3 | Ohio State | 14-1 | 1.23 | .59 | .59 |
| 4 | TCU | 12-1 | 1.14 | .35 | .72 |
| 5 | Georgia | 10-3 | 1.13 | .56 | .49 |
| 6 | Ole Miss | 9-4 | .98 | .02 | .89 |
| 7 | Arkansas | 7-6 | .96 | .23 | .68 |
| 8 | Auburn | 8-5 | .92 | .57 | .33 |
| 9 | Mississippi State | 10-3 | .91 | .27 | .57 |
| 10 | Baylor | 11-2 | .87 | .52 | .31 |

### 2015

Source: https://bcftoys.com/2015-fei

| Rk | Team | Rec | FEI | OFEI | DFEI |
| --- | --- | --- | --- | --- | --- |
| 1 | Alabama | 14-1 | 1.21 | .27 | .90 |
| 2 | Stanford | 12-2 | 1.02 | .59 | .34 |
| 3 | Clemson | 14-1 | .96 | .39 | .61 |
| 4 | Oklahoma | 11-2 | .96 | .40 | .62 |
| 5 | Ohio State | 12-1 | .94 | .20 | .59 |
| 6 | Ole Miss | 10-3 | .88 | .42 | .50 |
| 7 | Tennessee | 9-4 | .80 | .24 | .38 |
| 8 | Baylor | 10-3 | .78 | .51 | .36 |
| 9 | North Carolina | 11-3 | .78 | .39 | .24 |
| 10 | Notre Dame | 10-3 | .78 | .49 | .21 |

### 2016

Source: https://bcftoys.com/2016-fei

| Rk | Team | Rec | FEI | OFEI | DFEI |
| --- | --- | --- | --- | --- | --- |
| 1 | Alabama | 14-1 | 1.57 | .36 | 1.13 |
| 2 | Washington | 12-2 | 1.26 | .46 | .68 |
| 3 | Michigan | 10-3 | 1.19 | .35 | .67 |
| 4 | Ohio State | 11-2 | 1.18 | .32 | .83 |
| 5 | Clemson | 14-1 | 1.16 | .54 | .63 |
| 6 | LSU | 8-4 | .98 | .26 | .85 |
| 7 | USC | 10-3 | .94 | .36 | .39 |
| 8 | Auburn | 8-5 | .83 | .22 | .53 |
| 9 | Wisconsin | 11-3 | .81 | .12 | .70 |
| 10 | Louisville | 9-4 | .80 | .38 | .46 |

### 2017

Source: https://bcftoys.com/2017-fei

| Rk | Team | Rec | FEI | OFEI | DFEI |
| --- | --- | --- | --- | --- | --- |
| 1 | Georgia | 13-2 | 1.43 | .56 | .87 |
| 2 | Alabama | 13-1 | 1.38 | .48 | .91 |
| 3 | Ohio State | 12-2 | 1.30 | .54 | .73 |
| 4 | Clemson | 12-2 | 1.30 | .36 | .94 |
| 5 | Penn State | 11-2 | 1.24 | .55 | .57 |
| 6 | Auburn | 10-4 | 1.19 | .31 | .86 |
| 7 | Oklahoma | 12-2 | 1.13 | .94 | .20 |
| 8 | Wisconsin | 13-1 | 1.11 | .23 | .77 |
| 9 | Washington | 10-3 | 1.02 | .41 | .56 |
| 10 | Notre Dame | 10-3 | 1.00 | .41 | .57 |

### 2018

Source: https://bcftoys.com/2018-fei

| Rk | Team | Rec | FEI | OFEI | DFEI |
| --- | --- | --- | --- | --- | --- |
| 1 | Alabama | 14-1 | 1.88 | .96 | .81 |
| 2 | Georgia | 11-3 | 1.50 | .82 | .63 |
| 3 | Clemson | 15-0 | 1.47 | .55 | .85 |
| 4 | Mississippi State | 8-5 | 1.10 | .25 | .83 |
| 5 | Oklahoma | 12-2 | 1.08 | 1.04 | -.09 |
| 6 | LSU | 10-3 | .95 | .26 | .61 |
| 7 | Florida | 10-3 | .93 | .33 | .58 |
| 8 | Michigan | 10-3 | .91 | .29 | .52 |
| 9 | Missouri | 8-5 | .90 | .39 | .55 |
| 10 | Texas A&M | 9-4 | .88 | .34 | .37 |

### 2019

Source: https://bcftoys.com/2019-fei

| Rk | Team | Rec | FEI | OFEI | DFEI |
| --- | --- | --- | --- | --- | --- |
| 1 | Ohio State | 13-1 | 1.79 | .91 | .78 |
| 2 | LSU | 15-0 | 1.70 | 1.11 | .57 |
| 3 | Alabama | 11-2 | 1.61 | .98 | .60 |
| 4 | Clemson | 14-1 | 1.53 | .63 | .92 |
| 5 | Wisconsin | 10-4 | 1.20 | .55 | .59 |
| 6 | Georgia | 12-2 | 1.05 | .29 | .71 |
| 7 | Auburn | 9-4 | 1.03 | .18 | .76 |
| 8 | Oregon | 12-2 | 1.00 | .28 | .71 |
| 9 | Utah | 11-3 | .98 | .33 | .63 |
| 10 | Penn State | 11-2 | .96 | .32 | .53 |

### 2020

Source: https://bcftoys.com/2020-fei

| Rk | Team | Rec | FEI | OFEI | DFEI |
| --- | --- | --- | --- | --- | --- |
| 1 | Alabama | 13-0 | 1.54 | 1.09 | .39 |
| 2 | BYU | 11-1 | 1.38 | .86 | .43 |
| 3 | Oklahoma | 9-2 | 1.03 | .41 | .52 |
| 4 | Clemson | 10-2 | 1.03 | .43 | .60 |
| 5 | Buffalo | 6-1 | 1.00 | .62 | .39 |
| 6 | Ohio State | 7-1 | .95 | .82 | .16 |
| 7 | Coastal Carolina | 11-1 | .86 | .53 | .38 |
| 8 | Iowa State | 9-3 | .79 | .40 | .42 |
| 9 | Ball State | 7-1 | .74 | .38 | .37 |
| 10 | Notre Dame | 10-2 | .73 | .35 | .33 |

### 2021

Source: https://bcftoys.com/2021-fei

| Rk | Team | Rec | FEI | OFEI | DFEI |
| --- | --- | --- | --- | --- | --- |
| 1 | Georgia | 14-1 | 1.86 | .68 | 1.06 |
| 2 | Alabama | 13-2 | 1.33 | .74 | .60 |
| 3 | Ohio State | 11-2 | 1.30 | .92 | .27 |
| 4 | Michigan | 12-2 | 1.05 | .48 | .43 |
| 5 | Oklahoma State | 12-2 | .91 | .14 | .73 |
| 6 | Utah | 10-4 | .81 | .43 | .38 |
| 7 | Baylor | 12-2 | .79 | .18 | .54 |
| 8 | Notre Dame | 11-2 | .79 | .26 | .50 |
| 9 | Cincinnati | 13-1 | .76 | .20 | .52 |
| 10 | Wisconsin | 9-4 | .75 | .01 | .69 |

### 2022

Source: https://bcftoys.com/2022-fei

| Rk | Team | Rec | FEI | OFEI | DFEI |
| --- | --- | --- | --- | --- | --- |
| 1 | Georgia | 15-0 | 1.69 | .85 | .82 |
| 2 | Ohio State | 11-2 | 1.37 | .80 | .53 |
| 3 | Alabama | 11-2 | 1.33 | .59 | .62 |
| 4 | Michigan | 13-1 | 1.25 | .50 | .60 |
| 5 | Tennessee | 11-2 | 1.24 | .80 | .30 |
| 6 | Texas | 8-5 | 1.05 | .37 | .57 |
| 7 | Penn State | 11-2 | .97 | .30 | .63 |
| 8 | TCU | 13-2 | .94 | .44 | .42 |
| 9 | LSU | 10-4 | .92 | .56 | .46 |
| 10 | Kansas State | 10-4 | .91 | .36 | .48 |

### 2023

Source: https://bcftoys.com/2023-fei

| Rk | Team | Rec | FEI | OFEI | DFEI |
| --- | --- | --- | --- | --- | --- |
| 1 | Oregon | 12-2 | 1.69 | 1.13 | .56 |
| 2 | Michigan | 15-0 | 1.55 | .65 | .89 |
| 3 | Georgia | 13-1 | 1.44 | .85 | .52 |
| 4 | Ohio State | 11-2 | 1.21 | .37 | .83 |
| 5 | Washington | 14-1 | 1.09 | .65 | .39 |
| 6 | Notre Dame | 10-3 | 1.07 | .31 | .67 |
| 7 | Texas | 12-2 | 1.07 | .30 | .66 |
| 8 | Penn State | 10-3 | 1.04 | .31 | .64 |
| 9 | Alabama | 12-2 | 1.04 | .29 | .63 |
| 10 | Kansas State | 9-4 | .97 | .47 | .46 |

### 2024

Source: https://bcftoys.com/2024-fei

| Rk | Team | Rec | FEI | OFEI | DFEI |
| --- | --- | --- | --- | --- | --- |
| 1 | Ohio State | 14-2 | 1.70 | .81 | .83 |
| 2 | Oregon | 13-1 | 1.31 | .76 | .52 |
| 3 | Notre Dame | 14-2 | 1.29 | .45 | .83 |
| 4 | Penn State | 13-3 | 1.24 | .59 | .67 |
| 5 | Texas | 13-3 | 1.23 | .37 | .82 |
| 6 | Ole Miss | 10-3 | 1.13 | .45 | .63 |
| 7 | Indiana | 11-2 | 1.08 | .63 | .46 |
| 8 | Georgia | 11-3 | .98 | .38 | .57 |
| 9 | Alabama | 9-4 | .93 | .28 | .59 |
| 10 | Tennessee | 10-3 | .86 | .15 | .59 |

### 2025

Source: https://bcftoys.com/2025-fei

| Rk | Team | Rec | FEI | OFEI | DFEI |
| --- | --- | --- | --- | --- | --- |
| 1 | Indiana | 16-0 | 1.86 | .79 | .95 |
| 2 | Oregon | 13-2 | 1.63 | .73 | .78 |
| 3 | Ohio State | 12-2 | 1.61 | .60 | 1.01 |
| 4 | Notre Dame | 10-2 | 1.53 | .73 | .80 |
| 5 | Miami | 13-3 | 1.29 | .49 | .82 |
| 6 | Texas Tech | 12-2 | 1.27 | .09 | 1.09 |
| 7 | Georgia | 12-2 | 1.24 | .57 | .56 |
| 8 | Utah | 11-2 | 1.22 | .71 | .42 |
| 9 | Vanderbilt | 10-3 | 1.10 | .92 | .15 |
| 10 | Ole Miss | 13-2 | 1.03 | .64 | .25 |

---

## SP+ — 2025 final rankings (Top 25 of 136)

Source: Bill Connelly, ESPN, published 2026-01-20 — [full article](https://www.espn.com/college-football/story/_/id/46128861/2025-college-football-sp+-rankings-all-136-fbs-teams).  
Local CSV (all 136): `csv/advanced/spplus_2025.csv`.

SP+ is a tempo- and opponent-adjusted efficiency rating intended to be **predictive**. Offense/defense columns include parenthetical national ranks from the source table.

| Rk | Team | Rec | SP+ | Offense | Defense | Spec Tms |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Indiana | 16-0 | 32.4 | 40.8 (2) | 9.9 (2) | 1.5 (22) |
| 2 | Ohio St. | 12-2 | 30.1 | 37.6 (13) | 7.7 (1) | 0.2 (67) |
| 3 | Texas Tech | 12-2 | 27.6 | 39.3 (8) | 12.3 (3) | 0.6 (54) |
| 4 | Oregon | 13-2 | 25.9 | 38.7 (10) | 13.5 (5) | 0.7 (50) |
| 5 | Notre Dame | 10-2 | 24.4 | 40.0 (4) | 16.3 (13) | 0.8 (47) |
| 6 | Georgia | 12-2 | 24.1 | 37.0 (14) | 14.8 (8) | 1.9 (3) |
| 7 | Ole Miss | 13-2 | 24.0 | 40.4 (3) | 18.3 (20) | 1.9 (1) |
| 8 | Utah | 11-2 | 22.2 | 39.7 (6) | 17.5 (17) | 0.0 (74) |
| 9 | Miami | 13-3 | 20.7 | 34.2 (22) | 14.3 (7) | 0.8 (42) |
| 10 | Texas A&M | 11-2 | 20.7 | 38.0 (11) | 16.4 (14) | -1.0 (97) |
| 11 | Vanderbilt | 10-3 | 20.3 | 39.9 (5) | 21.4 (39) | 1.8 (7) |
| 12 | Iowa | 9-4 | 19.7 | 32.1 (37) | 14.2 (6) | 1.7 (10) |
| 13 | Washington | 9-4 | 18.4 | 34.5 (20) | 15.3 (9) | -0.9 (94) |
| 14 | Oklahoma | 10-3 | 18.3 | 30.1 (51) | 12.9 (4) | 1.1 (33) |
| 15 | Penn St. | 7-6 | 18.1 | 35.1 (17) | 18.8 (23) | 1.8 (6) |
| 16 | USC | 9-4 | 16.9 | 38.9 (9) | 21.0 (36) | -1.0 (98) |
| 17 | Texas | 10-3 | 16.2 | 32.9 (30) | 17.9 (18) | 1.2 (31) |
| 18 | BYU | 12-2 | 15.9 | 33.9 (24) | 18.8 (22) | 0.8 (45) |
| 19 | Tennessee | 8-5 | 15.0 | 39.3 (7) | 25.4 (63) | 1.1 (34) |
| 20 | Alabama | 11-4 | 14.8 | 32.2 (36) | 16.1 (11) | -1.3 (107) |
| 21 | Missouri | 8-5 | 14.4 | 31.2 (47) | 15.4 (10) | -1.4 (116) |
| 22 | N. Texas | 12-2 | 13.8 | 43.1 (1) | 28.6 (79) | -0.7 (88) |
| 23 | SMU | 9-4 | 13.4 | 34.2 (23) | 19.5 (25) | -1.2 (102) |
| 24 | Illinois | 9-4 | 12.9 | 33.3 (27) | 21.7 (41) | 1.3 (30) |
| 25 | Michigan | 9-4 | 12.4 | 30.9 (49) | 17.0 (15) | -1.4 (111) |

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
