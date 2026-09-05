# College Football Strength of Schedule — Combined Deliverable (2026)

**Document date:** September 5, 2026 (PT)  
**Master file:** `/workspace/cfb-stats-2026/sos/SOS-2026-Combined.md`  
**Assembled from:** `00-executive-overview.md`, `00-sos-power-conferences-2026.md`, `01-sos-aac-indy-mac-cusa-2026.md`  
**Policy:** All data preserved from source files; no ranks or ratings invented.

---

# PART I — Executive Overview


**Document date:** September 5, 2026 (PT)  
**Deliverable type:** Formal combined SOS overview for FBS conferences covered in this compile  
**Companion files:** `00-sos-power-conferences-2026.md`, `01-sos-aac-indy-mac-cusa-2026.md`, `SOS-2026-Combined.md`

---

## Conferences covered

| Group | Conferences / units | Teams |
| --- | --- | ---: |
| Power | Big 12, Big Ten (B1G), SEC, ACC | 67 |
| Group of Five / other | AAC, Independents, MAC, Conference USA (CUSA) | 39 |
| **Combined** | **Big 12, B1G, SEC, ACC, AAC, Independents, MAC, CUSA** | **106** |

---

## Primary metric

**ESPN Football Power Index (FPI) Strength of Schedule (SOS)**

- **Definition:** Rank among all FBS teams of schedule strength from the perspective of an average FBS team (ESPN FPI Resume SOS / Rem SOS column).
- **Scale:** Rank **1 = toughest** … higher = easier (2026 FBS field size 138; 2025 final field 136).
- **Primary 2026 snapshot:** ESPN FPI Resume API/page last updated **2026-09-04** (Week 1 / early-season).
- **2025 final snapshot:** ESPN FPI season file last updated **2026-01-20**.

This deliverable uses ESPN FPI SOS as the **lead** ranking in all conference tables. Other systems are comparison columns only and must not be mixed without labels.

---

## Secondary metrics included

| Metric | Where used | Notes |
| --- | --- | --- |
| **Phil Steele 2026 preseason SOS** | Power + AAC/Indy/MAC/CUSA | Steele’s nine power-rating sets + home/away; not prior-year W–L |
| **Opponent Win % (2025 records)** | Power (full tables); AAC/Indy/MAC/CUSA (selected supplementary) | SI / FBSchedules method; higher opp. WP% = tougher under this method |
| **TeamRankings Season SOS** | Power conferences only | 2026 Season SOS + 2025 final SOS Power Rating (2026-01-20) |
| **CFN Spring 2026 Schedule Score** | AAC, Independents, MAC, CUSA | Spring opponent-rank method; lower score = harder |
| **ESPN FPI REM SOS** | Listed beside primary where available | Remaining-games SOS; early season tracks closely with full-season SOS |
| **ESPN FPI 2025 final (AvgInSOS / full-season)** | Both source files | End-of-2025 comparison |

**Not located / omitted (not invented):** complete Ken Pomeroy–style CFB, Sagarin, Massey, or SportSource Analytics SOS tables for these groups.

---

## Caveats

1. **Systems disagree.** The same team can rank differently under FPI, Steele, CFN, TeamRankings, and prior-year opponent win %. Always cite the labeled metric.
2. **Primary ranks are a snapshot.** ESPN FPI REM/SOS updates as games are played; figures here reflect the **2026-09-04** early-season update, not a locked magazine “final projected” print.
3. **Prior-year W–L ≠ projected strength.** Opponent win % freezes 2025 results; FPI/Steele re-rate **2026** opponent strength.
4. **Coverage gaps (documented, not filled):** Penn State missing from retrieved Opp. Win % tables; Sacramento State has no 2025 FBS final ESPN FPI SOS (FCS in 2025); Steele 2025 ranks only partial for Power teams.
5. **No invented numbers.** Cells show **—** or *N/A* only when a source did not publish that team.

---

## Hardest / easiest per conference (2026 ESPN FPI SOS)

Rank 1 = toughest nationally. Snapshot as of ESPN FPI update **2026-09-04**.

| Conference | Teams | Hardest slate (team / nat’l SOS) | Easiest slate (team / nat’l SOS) |
| --- | ---: | --- | --- |
| **SEC** | 16 | Arkansas / **1** | Georgia / **20** |
| **Big Ten** | 18 | Ohio State / **11** | Penn State / **62** |
| **ACC** | 17 | Florida State / **22** | Virginia / **66** |
| **Big 12** | 16 | Arizona State / **28** | Texas Tech / **70** |
| **Independents** | 2 | Notre Dame / **58** | UConn / **108** |
| **CUSA** | 10 | Western Kentucky / **66** | New Mexico State / **137** |
| **MAC** | 13 | Kent State / **71** | UMass / **138** |
| **AAC** | 14 | Rice / **75** | South Florida / **121** |

**National context (Power):** All 16 SEC teams sit in national SOS **1–20**. Big Ten places 16 of 18 inside the Top 42 (Penn State the conference outlier at #62). Among AAC/Indy/MAC/CUSA, Notre Dame (#58) holds the toughest slate in that four-group set; UMass (#138) is the easiest projected FPI SOS in FBS for 2026.

---

## Document map

| File | Contents |
| --- | --- |
| `00-executive-overview.md` | This overview |
| `00-sos-power-conferences-2026.md` | Big 12, B1G, SEC, ACC — full tables + 2025 rollups + sources |
| `01-sos-aac-indy-mac-cusa-2026.md` | AAC, Independents, MAC, CUSA — full tables + cross-group rank + sources |
| `SOS-2026-Combined.md` | Master combined deliverable (overview + both source files) |

---

*Compiled September 5, 2026 (PT). All figures attributed from source files; none fabricated.*

---

# PART II — Power Conferences (Big 12, Big Ten, SEC, ACC)

*Source file: `00-sos-power-conferences-2026.md`*

---

# College Football Strength of Schedule — Power Conferences, 2026

**Compiled:** September 5, 2026 (PT)  
**Scope:** Big 12 (16), Big Ten (18), SEC (16), ACC (17) — **67 teams**  
**File:** `/workspace/cfb-stats-2026/sos/00-sos-power-conferences-2026.md`

---

## Metric definitions (do not mix without labels)

| Label | Metric | Definition | Timing / notes |
| --- | --- | --- | --- |
| **ESPN FPI SOS** | Rank (1 = toughest) | ESPN: rank of schedule strength among FBS teams, from the perspective of an average FBS team (full-season / games-played SOS column on FPI Resume). Companion **REM SOS** ranks remaining games only. | **Primary 2026:** ESPN API/page last updated **2026-09-04** (Week 1). **2025 final:** ESPN 2025 season page last updated **2026-01-20**. |
| **Phil Steele SOS** | Rank (1 = toughest) | Steele’s preseason SOS combining his nine power-rating sets with home/away adjustment — **not** prior-year opponent win %. | 2026 preseason magazine/list (published summer 2026). Partial **2025 Steele SOS** ranks cited only where Steele published them alongside 2026 write-ups. |
| **Opp. Win % (2025 records)** | Rank + combined W-L / win % | Sum of 2025 season records of 2026 opponents (classic NCAA-style opponent winning percentage). Higher win % = tougher projected slate. | Published June 2026 (Sports Illustrated CFB HQ / FBSchedules W/L method). |
| **TeamRankings Season SOS** | Rank + rating | TeamRankings predictive “Season SOS” power rating (higher rating = tougher). | **2026:** current Season SOS page (early 2026 season). **2025 final:** SOS Power Rating dated **2026-01-20**. |

**Primary table metric for 2026:** ESPN FPI SOS (complete for all 67 teams).  
**Comparison columns:** Phil Steele rank; Opponent Win % rank; TeamRankings Season SOS rank/rating.  
**2025 final:** ESPN FPI SOS (complete) + TeamRankings final SOS (complete). Steele 2025 ranks only where explicitly published.

---

## Coverage completeness

| Source | 2026 projected / early-season | 2025 final | Power-conference coverage |
| --- | --- | --- | --- |
| ESPN FPI SOS | **Complete (67/67)** — Sept 4, 2026 | **Complete (67/67)** — Jan 20, 2026 snapshot | Full |
| Phil Steele SOS | **Complete (67/67)** ranks | Partial (top-10 write-ups only) | Full for 2026 |
| Opp. Win % (SI / FBSchedules) | **66/67** (Penn State not in retrieved SI/FBSchedules tables) | N/A (method uses 2025 records to rate **2026** schedules) | Near-full |
| TeamRankings Season / SOS | **Complete (67/67)** Season SOS | **Complete (67/67)** Jan 20, 2026 | Full |
| July 2026 ESPN FPI Top 25 article | Top 25 national only (preseason snapshot) | — | Used for cross-check / narrative |
| Ken Pomeroy / Sagarin / Massey / SportSource Analytics | **Not located** as usable full P4 tables for this compile | — | Unavailable here |

No SOS numbers were invented. Cells show **—** only when a source did not publish that team.

---

## National context (2026 ESPN FPI SOS)

As of the **2026-09-04** ESPN FPI Resume update:

- **SEC:** all 16 teams ranked **SOS 1–20** nationally (toughest conference slate by this metric).
- **Big Ten:** 16 of 18 teams inside the national Top 42; Penn State is the clear conference outlier at **#62**.
- **ACC:** toughest ACC slate = Florida State (**#22**); easiest among ACC = Virginia (**#66**).
- **Big 12:** toughest Big 12 slate = Arizona State (**#28**); easiest = Texas Tech (**#70**).

**July 2026 preseason Top 25 (ESPN FPI SOS)** for cross-check (FBSchedules / contemporaneous reports, ~July 10, 2026):  
1 Arkansas, 2 Oklahoma, 3 Texas, 4 Kentucky, 5 Ole Miss, 6 Mississippi State, 7 Florida, 8 Ohio State, 9 Texas A&M, 10 South Carolina, 11 LSU, 12 Missouri, 13 Auburn, 14 Tennessee, 15 Alabama, 16 Michigan, 17 Northwestern, 18 Vanderbilt, 19 USC, 20 Georgia, 21 Nebraska, 22 Florida State, 23 Purdue, 24 Boston College, 25 Washington.  
Week-1 update reordered some nearby teams (e.g., Ohio State **8→11**, South Carolina **10→8**, Missouri **12→12** with rem SOS **#4**) but kept the same SEC-heavy top of the board.

---

## SEC

**Teams:** 16  
**Primary:** ESPN FPI SOS rank (1 = toughest FBS schedule), last updated 2026-09-04.

| Team | Conf | ESPN FPI SOS 2026 | REM SOS | Phil Steele 2026 | Opp Win% Rank (2025 rec.) | Opp Win% | TR Season SOS 2026 (Rk / Rating) | ESPN FPI SOS 2025 Final | TR SOS 2025 Final (Rk / Rating) |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | ---: | --- |
| Arkansas | SEC | **1** | 1 | 4 | 13 | 92-61 (60.1%) | 23 / 9.9 | 8 | 23 / 10.7 |
| Texas | SEC | **2** | 2 | 1 | 14 | 94-63 (59.9%) | 2 / 19.5 | 9 | 7 / 13.8 |
| Oklahoma | SEC | **3** | 3 | 5 | 18 | 92-63 (59.4%) | 3 / 17.7 | 14 | 11 / 13.3 |
| Kentucky | SEC | **4** | 5 | 11 | 11 | 94-61 (60.1%) | 21 / 11.1 | 11 | 29 / 9.5 |
| Mississippi State | SEC | **5** | 6 | 8 | 5 | 100-57 (63.7%) | 22 / 10.4 | 21 | 33 / 8.1 |
| Ole Miss | SEC | **6** | 7 | 16 | 36 | 87-66 (56.9%) | 6 / 16.4 | 31 | 16 / 12.2 |
| Florida | SEC | **7** | 8 | 10 | 28 | 88-65 (57.5%) | 12 / 14.1 | 3 | 10 / 13.5 |
| South Carolina | SEC | **8** | 9 | 25 | 45 | 86-68 (55.8%) | 17 / 12.2 | 13 | 22 / 10.8 |
| Texas A&M | SEC | **9** | 10 | 28 | 50 | 84-70 (54.5%) | 7 / 15.9 | 18 | 9 / 13.6 |
| LSU | SEC | **10** | 11 | 15 | 26 | 90-66 (57.7%) | 8 / 15.5 | 12 | 19 / 11.4 |
| Missouri | SEC | **12** | 4 | 21 | 35 | 88-66 (57.1%) | 15 / 13.0 | 32 | 26 / 10.1 |
| Tennessee | SEC | **13** | 13 | 22 | 23 | 90-64 (58.4%) | 14 / 13.1 | 36 | 27 / 9.8 |
| Auburn | SEC | **14** | 14 | 35 | 58 | 85-72 (54.1%) | 19 / 12.1 | 15 | 21 / 11.0 |
| Alabama | SEC | **15** | 15 | 19 | 38 | 86-66 (56.6%) | 10 / 14.7 | 2 | 4 / 16.7 |
| Vanderbilt | SEC | **18** | 19 | 23 | 46 | 87-69 (55.8%) | 24 / 9.7 | 28 | 17 / 11.7 |
| Georgia | SEC | **20** | 21 | 18 | 42 | 87-68 (56.1%) | 5 / 16.6 | 17 | 6 / 14.0 |

*Sources for SEC rows: ESPN FPI Resume API/page; Phil Steele 2026 SOS list; SI CFB HQ / FBSchedules opponent-win% list (June 2026); TeamRankings Season SOS (2026) and SOS Power Rating (2026-01-20 for 2025).*

## Big Ten

**Teams:** 18  
**Primary:** ESPN FPI SOS rank (1 = toughest FBS schedule), last updated 2026-09-04.

| Team | Conf | ESPN FPI SOS 2026 | REM SOS | Phil Steele 2026 | Opp Win% Rank (2025 rec.) | Opp Win% | TR Season SOS 2026 (Rk / Rating) | ESPN FPI SOS 2025 Final | TR SOS 2025 Final (Rk / Rating) |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | ---: | --- |
| Ohio State | Big Ten | **11** | 12 | 6 | 2 | 102-56 (64.6%) | 1 / 20.5 | 20 | 3 / 17.3 |
| Michigan | Big Ten | **16** | 17 | 2 | 6 | 99-60 (62.3%) | 11 / 14.7 | 24 | 18 / 11.4 |
| Northwestern | Big Ten | **17** | 18 | 14 | 6 | 99-60 (62.3%) | 46 / 5.7 | 38 | 51 / 5.5 |
| USC | Big Ten | **19** | 16 | 3 | 25 | 91-66 (58.0%) | 13 / 13.7 | 30 | 15 / 12.3 |
| Nebraska | Big Ten | **21** | 23 | 26 | 4 | 102-57 (64.2%) | 32 / 6.9 | 42 | 34 / 7.8 |
| Purdue | Big Ten | **23** | 24 | 9 | 19 | 91-63 (59.1%) | 52 / 5.1 | 4 | 50 / 5.6 |
| Washington | Big Ten | **25** | 26 | 44 | 21 | 93-65 (58.9%) | 20 / 11.9 | 41 | 30 / 9.5 |
| Oregon | Big Ten | **27** | 30 | 20 | 83 | 80-74 (51.9%) | 4 / 17.0 | 6 | 2 / 18.3 |
| Michigan State | Big Ten | **29** | 32 | 7 | 28 | 88-65 (57.5%) | 57 / 4.3 | 25 | 43 / 6.3 |
| Rutgers | Big Ten | **32** | 27 | 36 | 109 | 74-79 (48.4%) | 70 / -1.1 | 26 | 39 / 6.8 |
| Minnesota | Big Ten | **33** | 29 | 31 | 86 | 79-75 (51.3%) | 27 / 8.6 | 40 | 57 / 3.9 |
| Maryland | Big Ten | **35** | 36 | 39 | 114 | 72-79 (47.7%) | 58 / 3.7 | 52 | 62 / 3.0 |
| UCLA | Big Ten | **36** | 37 | 29 | 68 | 81-72 (52.9%) | 33 / 6.9 | 5 | 31 / 8.8 |
| Illinois | Big Ten | **37** | 34 | 48 | 70 | 81-73 (52.6%) | 51 / 5.3 | 23 | 25 / 10.3 |
| Iowa | Big Ten | **38** | 38 | 57 | 63 | 81-71 (53.3%) | 25 / 9.0 | 16 | 8 / 13.7 |
| Indiana | Big Ten | **39** | 39 | 24 | 11 | 94-61 (60.1%) | 9 / 15.2 | 10 | 1 / 20.6 |
| Wisconsin | Big Ten | **42** | 42 | 32 | 124 | 69-79 (46.6%) | 45 / 5.9 | 1 | 24 / 10.6 |
| Penn State | Big Ten | **62** | 64 | 53 | — | — | 28 / 8.2 | 22 | 12 / 13.2 |

**Note:** Opponent Win % was not listed for Penn State in the retrieved SI CFB HQ / FBSchedules full FBS tables; cell left blank rather than estimated. ESPN FPI, Phil Steele, and TeamRankings cover Penn State completely.

*Sources for Big Ten rows: ESPN FPI Resume API/page; Phil Steele 2026 SOS list; SI CFB HQ / FBSchedules opponent-win% list (June 2026); TeamRankings Season SOS (2026) and SOS Power Rating (2026-01-20 for 2025).*

## ACC

**Teams:** 17  
**Primary:** ESPN FPI SOS rank (1 = toughest FBS schedule), last updated 2026-09-04.

| Team | Conf | ESPN FPI SOS 2026 | REM SOS | Phil Steele 2026 | Opp Win% Rank (2025 rec.) | Opp Win% | TR Season SOS 2026 (Rk / Rating) | ESPN FPI SOS 2025 Final | TR SOS 2025 Final (Rk / Rating) |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | ---: | --- |
| Florida State | ACC | **22** | 20 | 27 | 41 | 89-69 (56.3%) | 38 / 6.3 | 45 | 32 / 8.5 |
| Boston College | ACC | **24** | 25 | 17 | 39 | 87-67 (56.5%) | 68 / 0.8 | 54 | 63 / 2.4 |
| Stanford | ACC | **26** | 22 | 12 | 3 | 101-56 (64.3%) | 65 / 1.9 | 27 | 58 / 3.8 |
| North Carolina | ACC | **30** | 28 | 13 | 1 | 103-55 (65.2%) | 44 / 6.0 | 80 | 71 / -0.7 |
| Georgia Tech | ACC | **31** | 33 | 34 | 54 | 83-70 (54.2%) | 56 / 4.4 | 59 | 52 / 5.5 |
| Clemson | ACC | **34** | 35 | 58 | 101 | 76-78 (49.4%) | 30 / 7.6 | 57 | 35 / 7.1 |
| Syracuse | ACC | **41** | 41 | 42 | 16 | 92-62 (59.7%) | 60 / 3.3 | 19 | 64 / 2.4 |
| Virginia Tech | ACC | **43** | 43 | 40 | 51 | 85-71 (54.5%) | 42 / 6.0 | 37 | 49 / 5.7 |
| Miami | ACC | **45** | 45 | 61 | 106 | 73-77 (48.7%) | 18 / 12.2 | 7 | 5 / 16.7 |
| Duke | ACC | **46** | 47 | 47 | 14 | 94-63 (59.9%) | 63 / 2.8 | 72 | 56 / 4.4 |
| SMU | ACC | **51** | 52 | 67 | 74 | 79-72 (52.3%) | 36 / 6.6 | 61 | 45 / 6.2 |
| Wake Forest | ACC | **54** | 48 | 50 | 34 | 90-67 (57.3%) | 62 / 2.9 | 77 | 66 / 1.7 |
| Pittsburgh | ACC | **55** | 55 | 63 | 120 | 72-81 (47.1%) | 49 / 5.5 | 51 | 42 / 6.4 |
| Louisville | ACC | **59** | 59 | 41 | 31 | 89-66 (57.4%) | 34 / 6.8 | 53 | 44 / 6.3 |
| California | ACC | **61** | 63 | 43 | 79 | 80-73 (52.3%) | 59 / 3.7 | 79 | 69 / -0.1 |
| NC State | ACC | **63** | 67 | 76 | 54 | 83-70 (54.2%) | 66 / 1.3 | 34 | 38 / 7.0 |
| Virginia | ACC | **66** | 65 | 68 | 128 | 69-82 (45.7%) | 53 / 4.7 | 76 | 59 / 3.8 |

*Sources for ACC rows: ESPN FPI Resume API/page; Phil Steele 2026 SOS list; SI CFB HQ / FBSchedules opponent-win% list (June 2026); TeamRankings Season SOS (2026) and SOS Power Rating (2026-01-20 for 2025).*

## Big 12

**Teams:** 16  
**Primary:** ESPN FPI SOS rank (1 = toughest FBS schedule), last updated 2026-09-04.

| Team | Conf | ESPN FPI SOS 2026 | REM SOS | Phil Steele 2026 | Opp Win% Rank (2025 rec.) | Opp Win% | TR Season SOS 2026 (Rk / Rating) | ESPN FPI SOS 2025 Final | TR SOS 2025 Final (Rk / Rating) |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | ---: | --- |
| Arizona State | Big 12 | **28** | 31 | 33 | 53 | 82-69 (54.3%) | 31 / 7.5 | 43 | 37 / 7.0 |
| Baylor | Big 12 | **40** | 40 | 30 | 8 | 95-59 (61.7%) | 48 / 5.5 | 49 | 41 / 6.6 |
| Oklahoma State | Big 12 | **44** | 44 | 51 | 74 | 79-72 (52.3%) | 37 / 6.5 | 35 | 70 / -0.4 |
| TCU | Big 12 | **47** | 46 | 37 | 27 | 87-64 (57.6%) | 40 / 6.2 | 50 | 36 / 7.0 |
| West Virginia | Big 12 | **48** | 49 | 46 | 8 | 95-59 (61.7%) | 55 / 4.5 | 33 | 53 / 5.1 |
| Colorado | Big 12 | **49** | 51 | 45 | 44 | 85-67 (55.9%) | 50 / 5.4 | 44 | 55 / 4.6 |
| Cincinnati | Big 12 | **50** | 50 | 38 | 17 | 91-62 (59.5%) | 61 / 3.1 | 58 | 54 / 5.0 |
| BYU | Big 12 | **52** | 53 | 49 | 52 | 81-68 (54.4%) | 26 / 9.0 | 29 | 20 / 11.1 |
| Iowa State | Big 12 | **53** | 54 | 56 | 85 | 77-73 (51.3%) | 64 / 2.6 | 62 | 48 / 6.0 |
| Arizona | Big 12 | **56** | 56 | 59 | 10 | 94-59 (61.4%) | 43 / 6.0 | 63 | 46 / 6.1 |
| Houston | Big 12 | **57** | 57 | 60 | 134 | 65-84 (43.6%) | 41 / 6.2 | 70 | 60 / 3.0 |
| Kansas | Big 12 | **60** | 60 | 54 | 82 | 78-72 (52.0%) | 39 / 6.3 | 39 | 47 / 6.1 |
| UCF | Big 12 | **64** | 61 | 69 | 90 | 76-74 (50.7%) | 47 / 5.7 | 55 | 65 / 1.8 |
| Utah | Big 12 | **65** | 62 | 62 | 74 | 79-72 (52.3%) | 35 / 6.6 | 60 | 28 / 9.7 |
| Kansas State | Big 12 | **68** | 68 | 77 | 59 | 82-70 (53.9%) | 54 / 4.6 | 48 | 40 / 6.8 |
| Texas Tech | Big 12 | **70** | 70 | 81 | 128 | 69-82 (45.7%) | 29 / 8.0 | 46 | 13 / 13.1 |

*Sources for Big 12 rows: ESPN FPI Resume API/page; Phil Steele 2026 SOS list; SI CFB HQ / FBSchedules opponent-win% list (June 2026); TeamRankings Season SOS (2026) and SOS Power Rating (2026-01-20 for 2025).*

---

## 2025 final SOS — conference rollups (ESPN FPI)

ESPN FPI SOS ranks after the 2025 season (page last updated **2026-01-20**). Rank 1 = toughest schedule played.

### SEC (2025 final ESPN FPI SOS)

| Rank (nat.) | Team | Notes |
| ---: | --- | --- |
| 2 | Alabama | |
| 3 | Florida | |
| 8 | Arkansas | |
| 9 | Texas | |
| 11 | Kentucky | |
| 12 | LSU | |
| 13 | South Carolina | |
| 14 | Oklahoma | |
| 15 | Auburn | |
| 17 | Georgia | |
| 18 | Texas A&M | |
| 21 | Mississippi State | |
| 28 | Vanderbilt | |
| 31 | Ole Miss | |
| 32 | Missouri | |
| 36 | Tennessee | |

Regular-season-only ESPN SOS figures reported by Vols Wire / Yahoo (post–Week 14, before SEC title game) differed slightly for some teams (e.g., Florida **#2**, Arkansas **#5**, Ole Miss **#40**). The table above is the **full-season ESPN 2025 FPI Resume SOS** snapshot dated Jan 20, 2026 (includes postseason where applicable in ESPN’s season file).

### Big Ten (2025 final ESPN FPI SOS)

| Rank (nat.) | Team |
| ---: | --- |
| 1 | Wisconsin |
| 4 | Purdue |
| 5 | UCLA |
| 6 | Oregon |
| 10 | Indiana |
| 16 | Iowa |
| 20 | Ohio State |
| 22 | Penn State |
| 23 | Illinois |
| 24 | Michigan |
| 25 | Michigan State |
| 26 | Rutgers |
| 30 | USC |
| 38 | Northwestern |
| 40 | Minnesota |
| 41 | Washington |
| 42 | Nebraska |
| 52 | Maryland |

### ACC (2025 final ESPN FPI SOS)

| Rank (nat.) | Team |
| ---: | --- |
| 7 | Miami |
| 19 | Syracuse |
| 27 | Stanford |
| 34 | NC State |
| 37 | Virginia Tech |
| 45 | Florida State |
| 51 | Pittsburgh |
| 53 | Louisville |
| 54 | Boston College |
| 57 | Clemson |
| 59 | Georgia Tech |
| 61 | SMU |
| 72 | Duke |
| 76 | Virginia |
| 77 | Wake Forest |
| 79 | California |
| 80 | North Carolina |

### Big 12 (2025 final ESPN FPI SOS)

| Rank (nat.) | Team |
| ---: | --- |
| 29 | BYU |
| 33 | West Virginia |
| 35 | Oklahoma State |
| 39 | Kansas |
| 43 | Arizona State |
| 44 | Colorado |
| 46 | Texas Tech |
| 48 | Kansas State |
| 49 | Baylor |
| 50 | TCU |
| 55 | UCF |
| 58 | Cincinnati |
| 60 | Utah |
| 62 | Iowa State |
| 63 | Arizona |
| 70 | Houston |

---

## Optional: Phil Steele 2025 SOS ranks (partial)

Steele published prior-year SOS ranks only for selected teams in his 2026 top-10 write-ups:

| Team | Steele 2025 SOS rank | Steele 2026 SOS rank |
| --- | ---: | ---: |
| Mississippi State | 2 | 8 |
| Arkansas | 3 | 4 |
| Oklahoma | 7 | 5 |
| Florida | 12 | 10 |
| Purdue | 13 | 9 |
| Texas | 15 | 1 |
| USC | 20 | 3 |
| Ohio State | 24 | 6 |
| Michigan State | 31 | 7 |
| Michigan | 54 | 2 |

*Source: Phil Steele 2026 SOS feature (syndicated via Hispanic Business TV / FBSchedules mirrors).*

---

## Sources (URLs) and access date

Access date for all URLs below: **September 5, 2026**.

1. **ESPN College Football FPI — Resume (SOS / REM SOS)** — https://www.espn.com/college-football/fpi/_/view/resume  
   Data also retrieved via ESPN public web API (`site.web.api.espn.com` … `powerindex?view=resume`). Last updated **2026-09-04** (2026) and **2026-01-20** (2025 season file).
2. **ESPN FPI 2026 SOS Top 25 roundup** — https://fbschedules.com/espn-fpi-unveils-2026-college-football-strength-of-schedule-rankings/ (July 2026 preseason snapshot).
3. **Saturday Down South (SEC SOS context)** — https://www.saturdaydownsouth.com/news/college-football/strength-of-schedule-rankings-stacked-with-all-16-sec-teams-near-the-top/
4. **Phil Steele 2026 SOS rankings** — https://hispanicbusinesstv.com/college-football-strength-of-schedule-phil-steeles-2026-rankings/ (full 1–138 list).
5. **Opponent win % method (2026 schedules using 2025 records)** — https://www.si.com/fannation/college/cfb-hq/rankings/college-football-strength-of-schedule-rankings-2026 and https://fbschedules.com/college-football-strength-of-schedule-2026-win-loss-method/
6. **TeamRankings Season SOS (2026)** — https://www.teamrankings.com/college-football/ranking/season-sos-by-other
7. **TeamRankings SOS Power Rating (2025 final, date=2026-01-20)** — https://www.teamrankings.com/college-football/ranking/schedule-strength-by-other?date=2026-01-20
8. **2025 SEC regular-season ESPN SOS (secondary)** — https://sports.yahoo.com/articles/final-2025-sec-football-regular-154540033.html
9. **Sports-Ratings.com 2025 FBS SOS (alternate rating; not used in primary tables)** — https://www.sports-ratings.com/p/sos-fbs-only.html

---

## Methodology notes

1. **Primary vs. comparison:** Conference tables lead with **ESPN FPI SOS** because it is model-based, updated on ESPN’s FPI page, and available for every FBS team. Steele, opponent win %, and TeamRankings are labeled comparison metrics.
2. **Why metrics disagree:** Opponent win % freezes 2025 results; Steele and FPI re-rate **2026** opponent strength; TeamRankings uses its own predictive power ratings. A soft 2025 team that is projected strong in 2026 will look harder in FPI/Steele than in raw opp. win %.
3. **REM SOS:** Listed beside ESPN FPI SOS for 2026; early in the season it tracks closely with full-season SOS for most teams.
4. **Unavailable metrics:** No complete public KenPom-style CFB, Sagarin, Massey, or SportSource Analytics SOS tables for all four conferences were retrieved for this file; they are omitted rather than estimated.

---

*End of report. Raw ESPN extracts saved alongside this file as `espn-fpi-sos-2026-09-04.json` and `espn-fpi-sos-2025.json`.*

---

# PART III — AAC, Independents, MAC & Conference USA

*Source file: `01-sos-aac-indy-mac-cusa-2026.md`*

---

# Strength of Schedule — AAC, Independents, MAC & Conference USA (2026)

**Document date:** September 5, 2026 (PT)  
**Scope:** All FBS football programs in the American Athletic Conference (AAC), FBS Independents, Mid-American Conference (MAC), and Conference USA (CUSA) for the 2026 season.  
**Primary metric:** ESPN Football Power Index (FPI) Strength of Schedule.  
**Numbers policy:** All ranks below are taken from cited public sources. No ranks or ratings are invented.

---

## Metric definitions

| Metric | Definition | Scale |
| --- | --- | --- |
| **ESPN FPI SOS (2026 projected)** | ESPN label **“SOS Remaining RK” / REM SOS**: rank among all FBS teams of remaining (full-season, pre–Week 1 completion) schedule strength, from the perspective of an **average FBS team**. Lower rank = tougher schedule. | 1 = toughest … 138 = easiest (2026 FBS field) |
| **ESPN FPI AvgInSOS (2025 final)** | ESPN label **“AvgInSOS RK”**: rank among all FBS teams of **games already played** schedule strength, from the perspective of an **average Top 25 team**. Used here as the end-of-season / final 2025 SOS snapshot (Rem SOS blank after season). | 1 = toughest … 136 = easiest (2025 FBS field) |
| **Phil Steele 2026 preseason SOS** | Phil Steele’s preseason “toughest schedule” ranking combining his nine power-rating sets with home/away weighting (not prior-year W–L). | 1 = toughest … 138 = easiest |
| **CFN Spring 2026 Schedule Score** | College Football News spring method: sum of opponent ranks from CFN’s 138-team spring rankings; home = full points, road = half; FCS = 139; **lower score = harder schedule**. National rank 1–138 derived from those scores. | Rank 1 = toughest … 138 = easiest |
| **Win/Loss (prior-year) SOS** | SI / College Football HQ method: opponents’ combined 2025 W–L winning percentage. Higher opponent WP% = tougher slate under this method. | Rank 1 = toughest … 138 = easiest |

**Primary column in team tables:** ESPN FPI REM SOS as of the API snapshot dated **2026-09-04 08:00 UTC (Sept 4, 2026, 1:00 AM PT)**, accessed **September 5, 2026**. Early-season REM SOS still reflects essentially the full 2026 slate for teams that have not yet completed Week 1.

---

## Conference membership used

### American Athletic Conference — 14 teams (2026)
Army, Charlotte, East Carolina, Florida Atlantic (FAU), Memphis, Navy, North Texas, Rice, Temple, Tulane, Tulsa, UAB, South Florida (USF), UTSA.

*Source: ESPN realignment summary for 2026 ([espn.com](https://www.espn.com/college-football/story/_/id/49498819/college-football-conference-changes-realignment-fbs)).*

### FBS Independents — 2 teams (2026)
**Notre Dame, UConn.** No other FBS independents for 2026.

*Source: ESPN realignment summary; Wikipedia 2026 independents table.*

### Mid-American Conference — 13 teams (2026)
Akron, Ball State, Bowling Green, Buffalo, Central Michigan, Eastern Michigan, Kent State, Miami (OH), Ohio, **Sacramento State**, Toledo, UMass, Western Michigan.

- **Out:** Northern Illinois (to Mountain West).  
- **In:** Sacramento State (FCS → FBS, football-only MAC member, effective 2026).

*Sources: ESPN ([MAC adds Sacramento State](https://www.espn.com/college-football/story/_/id/47933760/mac-add-sacramento-state-football-only-member)); Sacramento State athletics announcement.*

### Conference USA — **10 teams** (2026) — membership confirmed
**Delaware, FIU, Jacksonville State, Kennesaw State, Liberty, Middle Tennessee, Missouri State, New Mexico State, Sam Houston, Western Kentucky (WKU).**

- **Departed for 2026:** UTEP (Mountain West), Louisiana Tech (Sun Belt).  
- **No additions** for 2026; CUSA did not replace either departure.  
- League plays eight conference games (not a full round-robin).

*Sources: ESPN realignment; Conference USA revised 2026 schedule (Phil Steele / Underdog Dynasty / CUSA release listing the same 10 institutions).*

---

## Coverage completeness

| Group | Teams in membership | ESPN FPI 2026 SOS | ESPN FPI 2025 final SOS | Phil Steele 2026 | CFN Spring 2026 |
| --- | ---: | ---: | ---: | ---: | ---: |
| AAC | 14 | **14/14** | **14/14** | **14/14** | **14/14** |
| Independents | 2 | **2/2** | **2/2** | **2/2** | **2/2** |
| MAC | 13 | **13/13** | **12/13**¹ | **13/13** | **13/13** |
| CUSA | 10 | **10/10** | **10/10** | **10/10** | **10/10** |
| **Total** | **39** | **39/39** | **38/39** | **39/39** | **39/39** |

¹ Sacramento State was FCS in 2025 and is **not** in the 2025 ESPN FPI FBS SOS table (136 FBS teams). No 2025 FBS final SOS is listed for Sac State.

**Not located as full published tables for these groups (as of access):** Sagarin SOS, Massey SOS, SportSource Analytics SOS for 2026 projected / 2025 final. TeamRankings Season SOS for end-of-2025 was not successfully retrieved in full for this compile; TeamRankings early-2026 SOS mixes played-game SOS with predictive placeholders and is **not** used as a projected-season ranking here.

---

## 1) American Athletic Conference (14)

| Team | Conference | 2026 ESPN FPI SOS rank | Metric | 2025 Final ESPN FPI SOS | Phil Steele 2026 SOS | CFN Spring 2026 SOS rank | Sources |
| --- | --- | ---: | --- | ---: | ---: | ---: | --- |
| Rice | AAC | **75** | ESPN FPI REM SOS | 94 | 52 | 73 | ESPN FPI; Phil Steele; CFN |
| UTSA | AAC | **78** | ESPN FPI REM SOS | 78 | 71 | 80 | ESPN FPI; Phil Steele; CFN |
| North Texas | AAC | **79** | ESPN FPI REM SOS | 109 | 75 | 96 | ESPN FPI; Phil Steele; CFN |
| Navy | AAC | **83** | ESPN FPI REM SOS | 75 | 82 | 82 | ESPN FPI; Phil Steele; CFN |
| East Carolina | AAC | **84** | ESPN FPI REM SOS | 83 | 96 | 95 | ESPN FPI; Phil Steele; CFN |
| Charlotte | AAC | **86** | ESPN FPI REM SOS | 71 | 79 | 74 | ESPN FPI; Phil Steele; CFN |
| Temple | AAC | **91** | ESPN FPI REM SOS | 81 | 97 | 100 | ESPN FPI; Phil Steele; CFN |
| FAU | AAC | **94** | ESPN FPI REM SOS | 97 | 87 | 88 | ESPN FPI; Phil Steele; CFN |
| Tulane | AAC | **96** | ESPN FPI REM SOS | 65 | 99 | 84 | ESPN FPI; Phil Steele; CFN |
| Memphis | AAC | **97** | ESPN FPI REM SOS | 102 | 80 | 77 | ESPN FPI; Phil Steele; CFN |
| Tulsa | AAC | **105** | ESPN FPI REM SOS | 118 | 112 | 93 | ESPN FPI; Phil Steele; CFN |
| Army | AAC | **113** | ESPN FPI REM SOS | 85 | 90 | 103 | ESPN FPI; Phil Steele; CFN |
| UAB | AAC | **114** | ESPN FPI REM SOS | 84 | 92 | 86 | ESPN FPI; Phil Steele; CFN |
| South Florida | AAC | **121** | ESPN FPI REM SOS | 67 | 100 | 112 | ESPN FPI; Phil Steele; CFN |

**AAC notes (ESPN FPI):** Within the American, Rice holds the toughest projected 2026 FPI SOS (75th nationally); South Florida the easiest among the 14 (121st). Several AAC programs that finished with softer 2025 AvgInSOS ranks (e.g., North Texas 109th, Memphis 102nd) project into the mid-tier nationally for 2026 under FPI REM SOS.

---

## 2) FBS Independents (2)

| Team | Conference | 2026 ESPN FPI SOS rank | Metric | 2025 Final ESPN FPI SOS | Phil Steele 2026 SOS | CFN Spring 2026 SOS rank | Sources |
| --- | --- | ---: | --- | ---: | ---: | ---: | --- |
| Notre Dame | Independent | **58** | ESPN FPI REM SOS | 47 | 66 | 42 | ESPN FPI; Phil Steele; CFN |
| UConn | Independent | **108** | ESPN FPI REM SOS | 132 | 111 | 92 | ESPN FPI; Phil Steele; CFN |

**Independents notes:** Notre Dame’s 2026 FPI SOS (58th) is the hardest slate among all teams in this document’s four groups. UConn’s 2025 final AvgInSOS was among the easiest in FBS (132nd of 136); FPI projects a somewhat harder 2026 path (108th of 138).

---

## 3) Mid-American Conference (13)

| Team | Conference | 2026 ESPN FPI SOS rank | Metric | 2025 Final ESPN FPI SOS | Phil Steele 2026 SOS | CFN Spring 2026 SOS rank | Sources |
| --- | --- | ---: | --- | ---: | ---: | ---: | --- |
| Kent State | MAC | **71** | ESPN FPI REM SOS | 66 | 85 | 90 | ESPN FPI; Phil Steele; CFN |
| Ball State | MAC | **81** | ESPN FPI REM SOS | 106 | 120 | 97 | ESPN FPI; Phil Steele; CFN |
| Central Michigan | MAC | **89** | ESPN FPI REM SOS | 100 | 101 | 108 | ESPN FPI; Phil Steele; CFN |
| Western Michigan | MAC | **99** | ESPN FPI REM SOS | 111 | 104 | 105 | ESPN FPI; Phil Steele; CFN |
| Buffalo | MAC | **102** | ESPN FPI REM SOS | 136 | 132 | 128 | ESPN FPI; Phil Steele; CFN |
| Bowling Green | MAC | **103** | ESPN FPI REM SOS | 113 | 122 | 119 | ESPN FPI; Phil Steele; CFN |
| Miami (OH) | MAC | **111** | ESPN FPI REM SOS | 120 | 129 | 123 | ESPN FPI; Phil Steele; CFN |
| Eastern Michigan | MAC | **115** | ESPN FPI REM SOS | 129 | 133 | 114 | ESPN FPI; Phil Steele; CFN |
| Ohio | MAC | **123** | ESPN FPI REM SOS | 88 | 130 | 126 | ESPN FPI; Phil Steele; CFN |
| Akron | MAC | **126** | ESPN FPI REM SOS | 130 | 103 | 110 | ESPN FPI; Phil Steele; CFN |
| Sacramento State | MAC | **133** | ESPN FPI REM SOS | *N/A (FCS 2025)* | 127 | 132 | ESPN FPI; Phil Steele; CFN |
| Toledo | MAC | **134** | ESPN FPI REM SOS | 114 | 136 | 127 | ESPN FPI; Phil Steele; CFN |
| UMass | MAC | **138** | ESPN FPI REM SOS | 95 | 138 | 133 | ESPN FPI; Phil Steele; CFN |

**MAC notes:** Kent State’s projected FPI SOS (71st) is the toughest in the MAC and second-toughest among all teams in this document (behind Notre Dame and ahead of most AAC/CUSA clubs). UMass ranks **138th** — easiest projected FPI SOS in FBS for 2026. Sacramento State’s first FBS season projects near the bottom of national SOS (133rd FPI; 127 Phil Steele; 132 CFN).

---

## 4) Conference USA (10)

| Team | Conference | 2026 ESPN FPI SOS rank | Metric | 2025 Final ESPN FPI SOS | Phil Steele 2026 SOS | CFN Spring 2026 SOS rank | Sources |
| --- | --- | ---: | --- | ---: | ---: | ---: | --- |
| Western Kentucky | CUSA | **66** | ESPN FPI REM SOS | 121 | 86 | 101 | ESPN FPI; Phil Steele; CFN |
| Missouri State | CUSA | **80** | ESPN FPI REM SOS | 101 | 83 | 130 | ESPN FPI; Phil Steele; CFN |
| Delaware | CUSA | **90** | ESPN FPI REM SOS | 131 | 109 | 134 | ESPN FPI; Phil Steele; CFN |
| Sam Houston | CUSA | **93** | ESPN FPI REM SOS | 107 | 110 | 116 | ESPN FPI; Phil Steele; CFN |
| Kennesaw State | CUSA | **100** | ESPN FPI REM SOS | 96 | 114 | 136 | ESPN FPI; Phil Steele; CFN |
| Middle Tennessee | CUSA | **128** | ESPN FPI REM SOS | 134 | 113 | 135 | ESPN FPI; Phil Steele; CFN |
| FIU | CUSA | **132** | ESPN FPI REM SOS | 108 | 124 | 137 | ESPN FPI; Phil Steele; CFN |
| Liberty | CUSA | **135** | ESPN FPI REM SOS | 126 | 135 | **138** | ESPN FPI; Phil Steele; CFN |
| Jacksonville State | CUSA | **136** | ESPN FPI REM SOS | 135 | 134 | 131 | ESPN FPI; Phil Steele; CFN |
| New Mexico State | CUSA | **137** | ESPN FPI REM SOS | 115 | 102 | 107 | ESPN FPI; Phil Steele; CFN |

**CUSA notes:** Under ESPN FPI, Western Kentucky has by far the toughest projected 2026 CUSA slate (66th nationally — hardest in this entire document after Notre Dame and Kent State). Liberty, Jacksonville State, and New Mexico State cluster among the easiest FBS schedules (135th–137th FPI). CFN’s spring ranking had Liberty as the **easiest** national slate (138th); Phil Steele also had Liberty near the bottom (135th). Cross-metric disagreement is largest for Missouri State and Delaware (much harder under FPI/Phil Steele than under CFN’s spring score).

**Departed programs (context only, not 2026 CUSA):** Louisiana Tech 2025 final FPI AvgInSOS **127th**; UTEP **110th**. Both appear in Phil Steele / CFN 2026 lists under their new conferences (Sun Belt / Mountain West) and are excluded from the CUSA 2026 table above.

---

## Cross-group ranking (ESPN FPI 2026 REM SOS only)

Hardest → easiest among the **39** teams in this file:

| Nat’l SOS | Team | Conf |
| ---: | --- | --- |
| 58 | Notre Dame | Ind. |
| 66 | Western Kentucky | CUSA |
| 71 | Kent State | MAC |
| 75 | Rice | AAC |
| 78 | UTSA | AAC |
| 79 | North Texas | AAC |
| 80 | Missouri State | CUSA |
| 81 | Ball State | MAC |
| 83 | Navy | AAC |
| 84 | East Carolina | AAC |
| 86 | Charlotte | AAC |
| 89 | Central Michigan | MAC |
| 90 | Delaware | CUSA |
| 91 | Temple | AAC |
| 93 | Sam Houston | CUSA |
| 94 | FAU | AAC |
| 96 | Tulane | AAC |
| 97 | Memphis | AAC |
| 99 | Western Michigan | MAC |
| 100 | Kennesaw State | CUSA |
| 102 | Buffalo | MAC |
| 103 | Bowling Green | MAC |
| 105 | Tulsa | AAC |
| 108 | UConn | Ind. |
| 111 | Miami (OH) | MAC |
| 113 | Army | AAC |
| 114 | UAB | AAC |
| 115 | Eastern Michigan | MAC |
| 121 | South Florida | AAC |
| 123 | Ohio | MAC |
| 126 | Akron | MAC |
| 128 | Middle Tennessee | CUSA |
| 132 | FIU | CUSA |
| 133 | Sacramento State | MAC |
| 134 | Toledo | MAC |
| 135 | Liberty | CUSA |
| 136 | Jacksonville State | CUSA |
| 137 | New Mexico State | CUSA |
| 138 | UMass | MAC |

---

## Supplementary: prior-year W–L method (selected)

For readers who prefer opponent prior-year winning percentage (SI / College Football HQ, published June 3, 2026). **This is a different metric** from ESPN FPI; ranks are not interchangeable.

| Team | Conf | W–L SOS rank (of 138) | Opp. 2025 W–L (as published) |
| --- | --- | ---: | --- |
| Charlotte | AAC | **20** | 92–64 (59.0%) |
| Rice | AAC | T-**23** | 90–64 (58.4%) |
| Memphis | AAC | T-**31** | 89–66 (57.4%) |
| Temple | AAC | T-**31** | 89–66 (57.4%) |
| UTSA | AAC | T-**28** | 88–65 (57.5%) |
| FAU | AAC | **48** | 84–68 (55.3%) |
| Missouri State | CUSA | T-**54** | 83–70 (54.2%) |
| Delaware | CUSA | **57** | 84–71 (54.2%) |
| Jacksonville State | CUSA | T-**60** | 82–71 (53.6%) |
| Army | AAC | T-**63** | 81–71 (53.3%) |
| Kent State | MAC | T-**63** | 81–71 (53.3%) |
| Central Michigan | MAC | **66** | 82–72 (53.2%) |
| UAB | AAC | T-**68** | 81–72 (52.9%) |
| WKU | CUSA | T-**72** | 82–74 (52.6%) |
| North Texas | AAC | T-**72** | 82–74 (52.6%) |
| USF | AAC | T-**74** | 79–72 (52.3%) |
| Sam Houston | CUSA | **81** | 81–74 (52.3%) |
| Tulane | AAC | T-**86** | 79–75 (51.3%) |
| Liberty | CUSA | T-**88** | 78–75 (51.0%) |
| Western Michigan | MAC | T-**91** | 77–75 (50.7%) |
| East Carolina | AAC | **94** | 77–76 (50.3%) |
| Akron | MAC | T-**97** | 77–77 (50.0%) |
| New Mexico State | CUSA | T-**97** | 76–76 (50.0%) |
| Ball State | MAC | **102** | 74–76 (49.3%) |
| Sacramento State | MAC | T-**106** | 73–77 (48.7%) |
| Navy | AAC | **110** | 72–77 (48.3%) |
| Notre Dame | Ind. | T-**112** | 73–80 (47.7%) |
| Miami (OH) | MAC | T-**114** | 72–79 (47.7%) |
| Kennesaw State | CUSA | T-**114** | 72–79 (47.7%) |
| UMass | MAC | **119** | 70–78 (47.3%) |
| Ohio | MAC | **123** | 71–80 (47.0%) |
| FIU | CUSA | **125** | 70–81 (46.4%) |
| Toledo | MAC | T-**126** | 69–80 (46.3%) |
| Eastern Michigan | MAC | **130** | 68–81 (45.6%) |
| UConn | Ind. | **132** | 68–82 (45.3%) |
| Middle Tennessee | CUSA | **133** | 66–85 (43.7%) |
| Tulsa | AAC | T-**135** | 66–86 (43.4%) |
| Buffalo | MAC | **138** | 64–88 (42.1%) |

*Source: [Sports Illustrated / College Football HQ — 2026 SOS rankings (W–L method)](https://www.si.com/fannation/college/cfb-hq/rankings/college-football-strength-of-schedule-rankings-2026), published June 3, 2026; access Sept 5, 2026.*

---

## Source list (URLs & access)

1. **ESPN FPI Resume API / Power Index (2026)** — SOS Remaining RK & related resume fields.  
   - UI: https://www.espn.com/college-football/fpi/_/view/resume  
   - Data snapshot via ESPN Fitt API `powerindex?view=resume&limit=200`, `lastUpdated` **2026-09-04T08:00Z**.  
   - **Accessed:** September 5, 2026.

2. **ESPN FPI Resume (2025 final)** — AvgInSOS RK for all 136 FBS teams; `season=2025`, `lastUpdated` **2026-01-20T09:00Z**.  
   - **Accessed:** September 5, 2026.

3. **ESPN FPI SOS methodology (public description)** — “Rank among all FBS teams of remaining schedule strength, from the perspective of an average FBS team.” Summarized in coverage such as https://fbschedules.com/espn-fpi-unveils-2026-college-football-strength-of-schedule-rankings/ (July 2026 preseason top-25 article; full ranks taken from ESPN, not that excerpt).

4. **Phil Steele 2026 toughest-schedule rankings** (full 1–138 list reproduced in secondary coverage):  
   https://hispanicbusinesstv.com/college-football-strength-of-schedule-phil-steeles-2026-rankings/  
   - **Accessed:** September 5, 2026. (Phil Steele methodology: nine power-rating sets + home/away.)

5. **College Football News — 2026 Spring Strength of Schedule (all 138)** via Yahoo Sports reprint:  
   https://sports.yahoo.com/articles/2026-college-football-strength-schedule-071831549.html  
   - Originally CFN, March 31, 2026. **Accessed:** September 5, 2026.

6. **SI / College Football HQ — 2026 W–L SOS rankings:**  
   https://www.si.com/fannation/college/cfb-hq/rankings/college-football-strength-of-schedule-rankings-2026  
   - Published June 3, 2026. **Accessed:** September 5, 2026.

7. **Membership / realignment:**  
   - https://www.espn.com/college-football/story/_/id/49498819/college-football-conference-changes-realignment-fbs  
   - https://www.espn.com/college-football/story/_/id/47933760/mac-add-sacramento-state-football-only-member  
   - https://philsteele.com/2026-cusa-football-revised-football-schedule/  
   - https://www.underdogdynasty.com/conference-usa/43275/conference-usa-re-releases-2026-football-schedule  
   - **Accessed:** September 5, 2026.

---

## Caveats

- **SOS systems disagree.** Notre Dame is 58th (ESPN FPI), 66th (Phil Steele), 42nd (CFN spring), and T-112th (prior-year W–L). Prefer the labeled metric when citing a single number.
- **ESPN FPI REM SOS updates** as games are played; the ranks in this file are a **preseason / early–Week 1** snapshot (API `lastUpdated` Sept 4, 2026 UTC), not a locked “final projected” magazine print.
- **Phil Steele and CFN** are preseason/spring constructions and will not match mid-season FPI remaining SOS.
- **Sacramento State** has no 2025 FBS final SOS under ESPN FPI.

---

*Compiled for `/workspace/cfb-stats-2026/sos/01-sos-aac-indy-mac-cusa-2026.md`. All figures attributed; none fabricated.*

---

# End of combined deliverable

*Assembled September 5, 2026 (PT). Parts II and III are verbatim inclusions of the source SOS reports.*
