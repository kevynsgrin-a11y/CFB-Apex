# CFBApex — Open Research Prompts

Every research prompt still unaddressed for cfbapex.com as of 2026-09-09.
Copy each fenced block verbatim into Deep Research (or the fast agent where
noted). One prompt per block — the START/END markers bound each insertion.

## Status board

| # | Prompt | Fills | Cadence | Status |
|---|--------|-------|---------|--------|
| 1 | Heisman Watch list | /heisman | Weekly (Tue) | Open — page shows "Watch List Pending" |
| 2 | NIL Watch ledger | /nil | Weekly (Tue) | Open — page is a design shell |
| 3 | Athlete Highlight of the Week | new weekly slot | Weekly (Sun/Mon) | Open — feature page also needs building when data lands |
| 4 | Weekly Injury Report — main | /injuries | Weekly (Tue, Wed fallback) | Prompt delivered 2026-09-09, not yet run — included below |
| 5 | Weekend Injury Watch Sweep | /injuries | Saturday 8:30 AM + 12:30 PM PT | Prompt delivered, not yet run |
| 6 | Injury Cross-Check Audit | quality gate | After each Tuesday compile | Prompt delivered, not yet run |
| 7 | Weekly Fantasy/DFS Notes (Weeks 2+) | /dfs | Weekly (Wed) | Open — site carries Week 1 only |
| 8 | AI Panel Weekly Debate Brief | /panel | Weekly (Tue) | Optional — personas live, debates need weekly material |

---

## PROMPT 1 — Heisman Watch List (weekly, run Tuesdays)

```
==================== PROMPT START ====================
Compile the CFBApex Heisman Watch for Week [N] of the 2026 college football
season as of [DATE].

For 12–20 genuine contenders (no filler), report:
- player, team_slug (ESPN-style lowercase slug, e.g. "alabama", "ohio-state",
  "miami-fl" for Miami FL, "miami-oh" for Miami OH, "pittsburgh", "fiu"),
- position, class (Fr/So/Jr/Sr),
- season stat line to date exactly as published (passing/rushing/receiving,
  TDs, games played) with the source,
- Heisman odds ONLY as reported by named outlets (e.g. "DraftKings lists
  +450 via ESPN") — never computed or estimated by you; use the field
  odds_as_reported: [{outlet, value}] and always name the outlet,
- the on-field case in 2 sentences (why they're in the conversation) and
  the case against in 1 sentence,
- upcoming game that decides the next two weeks of the race,
- sources (1–2 URLs per contender) and confidence ("high" = official stats +
  multiple national outlets; "medium" = one national outlet or several local
  beat writers; "low" = single source).

RULES: reported information only. If an outlet's odds are not published,
odds entry is null — never guess a number. Two-source preference for every
"high" confidence row. No betting advice, no projections of final votes.

OUTPUT: one JSON code block, nothing else:
{"as_of": "YYYY-MM-DD", "week": N, "contenders": [{"player": "", "team_slug":
"", "position": "", "class": "", "stat_line": "", "odds_as_reported":
[{"outlet": "", "value": ""}], "case_for": "", "case_against": "",
"next_test": "", "sources": [""], "confidence": "high|medium|low"}], "notes": ""}
==================== PROMPT END ====================
```

---

## PROMPT 2 — NIL Watch Ledger (weekly, run Tuesdays)

```
==================== PROMPT START ====================
Compile the CFBApex NIL Watch for Week [N] of the 2026 season as of [DATE]:
a verified ledger of college football NIL developments REPORTED THIS WEEK
(signings, collectives announcements, valuation reports, NCAA/policy news),
plus the current reported valuations for the sport's most-covered players.

Two arrays:

"week_deals": every NIL development reported in the last 7 days — player,
team_slug (ESPN-style lowercase slug — "miami-fl" vs "miami-oh" matters),
position, deal_summary (what was announced), parties (collective/company/
school role), announced_value (ONLY if a party or major outlet published a
figure; else null), as-reported attribution (who announced it), sources,
confidence ("high" = official announcement by collective/company/player;
"medium" = major outlet (ESPN/AP/The Athletic/ON3); "low" = single local
report).

"watch_valuations": for the 15–25 most-covered players nationally, their
most recently REPORTED valuation with the reporting outlet named and the
report date — field: valuation: {amount_reported: number|null, reported_by:
"", reported_on: "YYYY-MM-DD"}. If no outlet has published a valuation,
amount_reported is null. NEVER compute, estimate, or interpolate a value —
this site reports what others published, with attribution.

RULES: public reporting only; no private financials, no family information,
no recruiting speculation. A valuation without a named outlet is invalid —
null it. Two sources for "high".

OUTPUT: one JSON code block, nothing else:
{"as_of": "YYYY-MM-DD", "week": N, "week_deals": [{"player": "", "team_slug":
"", "position": "", "deal_summary": "", "parties": "", "announced_value":
null, "announced_by": "", "sources": [""], "confidence": ""}],
"watch_valuations": [{"player": "", "team_slug": "", "valuation":
{"amount_reported": null, "reported_by": "", "reported_on": ""}, "sources":
[""], "confidence": ""}], "notes": ""}
==================== PROMPT END ====================
```

---

## PROMPT 3 — Athlete Highlight of the Week (weekly, run Sunday night or Monday)

```
==================== PROMPT START ====================
Compile the CFBApex Athlete Highlight of the Week for Week [N] of the 2026
college football season (games played [DATE RANGE] as of [DATE]).

Select ONE athlete of the week plus 4 runners-up. Selection criteria, in
order: (1) statistical dominance versus a legitimate opponent, (2) a
single defining play or performance that decided a consequential game,
(3) team success in that week. State the criteria weights you applied.

For the winner and each runner-up: player, team_slug (ESPN-style lowercase
slug), position, class, that week's exact stat line as published (with
source), opponent_slug, result of the game, why they made the list (2
sentences), and a link to officially licensed highlight footage of the
performance (the school, conference, or ESPN/official YouTube) — never a
re-upload account. If no licensed highlight exists, video_url is null.

RULES: only games actually played in the stated week. Stats must match the
box score of record (ESPN or the school). No career stats, no season
totals passed off as week stats. Two-source preference for stat lines.

OUTPUT: one JSON code block, nothing else:
{"as_of": "YYYY-MM-DD", "week": N, "athlete_of_the_week": {...same shape as
runners_up...}, "runners_up": [{"player": "", "team_slug": "", "position":
"", "class": "", "stat_line": "", "opponent_slug": "", "result": "",
"why": "", "video_url": null, "sources": [""]}], "criteria_note": ""}
==================== PROMPT END ====================
```

---

## PROMPT 4 — Weekly Injury Report, Main Compile (weekly, run Tuesdays)

```
==================== PROMPT START ====================
Compile a verified weekly college football injury intelligence report for
Week [N] of the 2026 season as of [DATE].

LEDGER (long-term only): every player who is (a) out for the season, on a
season-ending list, OR (b) officially expected to miss MORE than 2 weeks
from today. Do NOT include week-to-week or game-time decisions here —
those belong in WATCH. For each: player, team_slug, position, injury (as
publicly described), status ("IR" or "OUT"), weeks_out (best-supported
public estimate; null if not reported), detail (1–2 factual sentences),
sources (1–2 URLs), confidence ("high" = official team/school release,
"medium" = multiple beat reporters, "low" = single report).

WATCH (week-to-week): every player with a published practice status or
credible availability question for this week. For each: player, team_slug,
position, injury, practice statuses for Wednesday/Thursday/Friday/Saturday
(only "DNP", "LP", "FP", or null — null when the day hasn't happened or
wasn't reported), likelihood ("likely" | "questionable" | "doubtful" |
"unlikely"), confidence ("high" | "medium" | "low"), note (the evidence:
beat report quotes, coach statements, verified X/Instagram posts from the
player or team — link the specific post), sources (URLs), social
(verified-account post URLs).

COLLEGE ADAPTATIONS: team_slug must be the ESPN-style slug — double-check
the tricky ones ("miami-fl" vs "miami-oh", "pittsburgh", "florida-atlantic",
"fiu", "uconn", "umass", "ulm"). Where a conference availability report
exists (Big Ten/SEC weekly reports), prefer it and mark confidence "high".
Where nothing is published, the entry does not exist. Priority when
time-constrained: Power 4 ranked teams' starters and fantasy-relevant
skill players (QB/RB/WR/TE), then ranked-group depth impacts, then other
starters. Saturday decisions often break Friday night — note when each
decision is expected.

RULES: publicly published information only — school releases, official
availability reports, credentialed beat reporters, verified player/team/
coach social accounts. NEVER use unverified aggregator or fan accounts. A
likelihood grade without a citable source is invalid — null it. Null means
not published; never guess, never zero-fill.

OUTPUT: one JSON code block, nothing else:
{"week": N, "as_of": "YYYY-MM-DD", "ledger": [{"player": "", "team_slug":
"", "position": "", "injury": "", "status": "IR|OUT", "weeks_out": null,
"detail": "", "sources": [""], "confidence": ""}], "watch": [{"player": "",
"team_slug": "", "position": "", "injury": "", "practice_wed": null,
"practice_thu": null, "practice_fri": null, "practice_sat": null,
"likelihood": "", "confidence": "", "note": "", "sources": [""], "social":
[""]}]}
==================== PROMPT END ====================
```

---

## PROMPT 5 — Weekend Injury Watch Sweep (fast agent / Grok, Saturday mornings)

```
==================== PROMPT START ====================
Delta update for Week [N] college football injury WATCH entries only, as of
Saturday [DATE]. Check ONLY: (1) official game-day availability/actives
lists as schools and conferences publish them, (2) final Friday/Saturday
practice reports for starters and fantasy-relevant skill players, (3)
verified X posts from players/coaches/teams declaring status this morning,
(4) credible beat-reporter morning updates. Output ONLY players whose
status changed since Friday: JSON watch objects with the exact schema
(player, team_slug, position, injury, practice_wed, practice_thu,
practice_fri, practice_sat — each "DNP"|"LP"|"FP"|null — likelihood,
confidence, note, sources, social). If nothing material changed, output
{"week": N, "as_of": "DATE", "watch": [], "note": "no material changes
since Friday"}. Published info only, verified accounts only, likelihood
requires a source, never speculate.
==================== PROMPT END ====================
```

---

## PROMPT 6 — Injury Cross-Check Audit (quality gate, after each Tuesday compile)

```
==================== PROMPT START ====================
Audit this Week [N] college football injury compilation against primary
sources. For a random sample of at least 25 ledger entries and 25 watch
entries: (1) verify each source URL actually states what the entry claims,
(2) confirm team_slug matches the school (watch the Miami/Pitt/FAU-FIU/
UConn-UMASS slug traps), (3) flag any likelihood grade where the cited
evidence does not support the stated confidence, (4) flag any player
missing from the ledger who appears on an official out-for-season or
multi-week list, (5) check the watch for fabricated practice statuses —
any non-null practice day must cite a practice/availability report. Output:
a discrepancy table (field, claimed, actual, corrected value, source URL),
then the corrected full JSON with the same schema applying every verified
fix. State the sample size and pass rate.
==================== PROMPT END ====================
```

---

## PROMPT 7 — Weekly Fantasy/DFS Notes, Weeks 2+ (run Wednesdays)

```
==================== PROMPT START ====================
Compile CFBApex Weekly Fantasy Notes for Week [N] of the 2026 college
football season as of [DATE], for the [N] games of [DATE RANGE]. This is
the continuation of the Week 1 board — same rules: reported roles, usage
notes, availability, and analyst projections ONLY. We never invent point
projections; an analyst projection must name its outlet.

Cover every fantasy-relevant skill player with published intel (QB/RB/WR/
TE — starters, high-profile backups, returning-from-injury players) across
Power 4 programs plus ranked G5 skill players. For each player: player,
team_slug (ESPN-style lowercase slug), position, class_raw (as the school
lists it), role_note (reported role in this week's plan, with who reported
it), usage_note (carries/targets expectations AS REPORTED by coaches or
beats — not your projection), availability ("active"|"questionable"|
"doubtful"|"inactive"|"suspended"), injury_note, analyst_projection
({outlet, value} only when a named analyst/fantasy outlet published one;
else null), sources (1–2 URLs), as_of.

Include doc-level context: the week's scheduling quirks (byes, Friday/
midweek games) and any weather notes from published forecasts.

RULES: two-source preference; null means not published; never a salary,
never an invented point total, never a "source: fantasy consensus" without
a URL.

OUTPUT: one JSON code block, nothing else:
{"as_of": "YYYY-MM-DD", "week": N, "week_context": "", "players": [{"player":
"", "team_slug": "", "position": "", "class_raw": "", "role_note": "",
"usage_note": "", "availability": "", "injury_note": "", "analyst_projection":
{"outlet": "", "value": ""} | null, "sources": [""], "as_of": ""}]}
==================== PROMPT END ====================
```

---

## PROMPT 8 — AI Panel Weekly Debate Brief (optional, run Tuesdays)

```
==================== PROMPT START ====================
Compile the CFBApex AI Panel debate brief for Week [N] of the 2026 college
football season as of [DATE]. The panel is three analysts with fixed,
conflicting philosophies: THE TRADITIONALIST (eye test, blue bloods, defense
and running games win titles), THE ANALYTIST (efficiency, game scripts,
SP+/FPI-style reasoning, tempo and leverage), and THE TALENT EVALUATOR
(recruiting rankings, draft stock, NFL traits beat scheme).

Deliver 3–4 debate topics from this week's real landscape (e.g. a ranked
matchup, a playoff-resumé controversy, a Heisman disagreement, a coaching
decision that backfired). For each topic: the question in one sentence;
the TRADITIONALIST position (2–3 sentences, in character, grounded in
real results/facts); the ANALYTIST position (same, citing real efficiency
or ranking facts as reported by SP+/FPI/EPA outlets — attribute them);
the TALENT EVALUATOR position (same, grounded in real recruiting/draft
reporting — attribute it); and "what settles it" — the observable this
week that will prove one side right. Facts must be real and sourced;
only the ARGUMENTS are persona voice. Sources for every factual claim.

OUTPUT: one JSON code block, nothing else:
{"as_of": "YYYY-MM-DD", "week": N, "topics": [{"question": "", "traditionalist":
"", "analyst": "", "evaluator": "", "what_settles_it": "", "sources": [""]}]}
==================== PROMPT END ====================
```

---

## PROMPT 9 — Upset Watch (run Thursdays during the season)

```
==================== PROMPT START ====================
Compile the CFBApex Upset Watch for Week [N] of the 2026 college football
season as of [THURSDAY DATE]. Scope: the weekend's FBS slate. Pick 3-5
games where a genuine upset case exists — defined as: the underdog is
getting 6+ points per the prevailing market line (cite the line and its
source), AND at least one concrete on-field reason (turnover margin,
 QB run game vs. a weak contain, weather if verified, lookahead spot for
the favorite).

For each: away/home teams, the line with source, the upset case in two
sentences (scheme- or usage-specific, not vibes), a confidence tag
(coin-flip / live dog / long fuse), and what the result does to each
team's conference race. Then one "market trap" — a game the crowd thinks
is an upset spot but the matchup data says otherwise.

Rules: no invented lines — if a line is not published, the game is
ineligible. Two sources per game. Null means not published.

OUTPUT: one JSON code block, nothing else:
{"as_of": "YYYY-MM-DD", "week": N, "picks": [{"away_slug": "",
"home_slug": "", "line": null, "line_source": "", "case": "",
"confidence": "coin_flip|live_dog|long_fuse", "race_effect": "",
"sources": [""]}], "trap": {"away_slug": "", "home_slug": "", "why": ""}}
==================== PROMPT END ====================
```

## PROMPT 10 — Road to the Playoff, weekly resume audit (run Sundays once Week 3 begins)

```
==================== PROMPT START ====================
Compile the CFBApex Road to the Playoff audit for Week [N] of the 2026
college football season (games through [SUNDAY DATE]). Scope: every team
that can realistically reach the 12-team CFP — roughly the top 25 of the
CFB Apex Composite plus any unbeaten from a non-power league.

For each contender: record, current Composite rank, remaining schedule
strength (cite the metric source or mark null), the loss count that ends
their at-large case (0, 1, or 2 depending on league and profile), one-line
resume state (best win, worst blemish), and a tag — controls destiny /
needs help / win-out-or-out. Then three storylines: the weekend's result
that moved the needle most, the race angle to watch next week, and one
team whose case is weaker than its record.

Rules: bracket mechanics must follow the published 12-team format (five
highest-ranked conference champions + seven at-larges). Two sources per
factual claim. Null means not published.

OUTPUT: one JSON code block, nothing else:
{"as_of": "YYYY-MM-DD", "week": N, "contenders": [{"team_slug": "",
"record": "", "composite_rank": null, "remaining_sos": null,
"losses_that_end_case": 1, "resume_state": "", "tag":
"controls_destiny|needs_help|win_out_or_out"}], "storylines":
{"mover": "", "watch_next_week": "", "weaker_than_record": ""}}
==================== PROMPT END ====================
```

## After results arrive

Drop each research output JSON into `data/injury-research/inbox/` (injuries)
or paste it in chat for the other boards — ingestion and deployment follow
the established pipeline. Prompts 4–6 feed the automated Saturday slots;
the remaining five schedule automations get created on request.
