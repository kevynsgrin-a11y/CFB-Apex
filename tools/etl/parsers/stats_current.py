"""The 2026 season to date — Week 0 and early Week 1.

Source: ``02-stats/03-season-2026-week0-early-stats.md``, with the Week 0
matchup table in ``02-stats/02-full-schedule-2026.md`` used to establish which
side was home. The stats document reports results as "North Carolina 15, TCU 10"
— winner first — which says nothing about venue, and the box-score column order
is a convention rather than a statement. The schedule document writes the same
games as "San José State at USC" and "North Carolina vs. TCU", which is explicit,
so that is what home/away is taken from. Where it does not cover a game, home
and away stay ``null`` rather than being guessed from column order.

This is the most time-sensitive dataset on the site: on opening weekend it is
what a visitor sees. Every artifact repeats the source's own caveat that these
are one-game samples, not season rates.
"""

from __future__ import annotations

import re
from pathlib import Path

from lib import jsonio, mdtable, textutil

SOURCE = "02-stats/03-season-2026-week0-early-stats.md"
SCHEDULE = "02-stats/02-full-schedule-2026.md"
AS_OF = "2026-09-05"
SEASON = 2026
WEEK0_DATE = "2026-08-29"

#: "North Carolina 15, TCU 10" / "No. 14 USC 42, San José State 26"
_RESULT_RE = re.compile(
    r"^(?:No\.\s*\d+\s+)?(.+?)\s+(\d{1,3})\s*,\s*(?:No\.\s*\d+\s+)?(.+?)\s+(\d{1,3})\s*$"
)
_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
_DATE_RE = re.compile(r"\*\*Date:\*\*\s*(.+?)\s*(?:—|$)", re.MULTILINE)
_MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
}

#: Box-score row label -> normalized key. Anything unmatched still survives in
#: the verbatim ``rows`` list, so no statistic is ever dropped.
_BOX_KEYS = {
    "first downs": "first_downs",
    "rushing (att–yds–td)": "rushing",
    "rushing": "rushing",
    "yards per rush": "yards_per_rush",
    "passing (cmp–att–int)": "passing",
    "passing": "passing",
    "passing yards": "passing_yards",
    "yards per attempt": "yards_per_attempt",
    "total offense (plays–yds)": "total_offense",
    "total offense": "total_offense",
    "yards per play": "yards_per_play",
    "yards/play": "yards_per_play",
    "fumbles–lost": "fumbles_lost",
    "turnovers": "turnovers",
    "penalties–yards": "penalties",
    "possession": "possession",
    "3rd down": "third_down",
    "4th down": "fourth_down",
    "red zone (scores–chances)": "red_zone",
    "sacks–yards": "sacks",
    "field goals": "field_goals",
}


def _iso_date(text: str | None) -> str | None:
    if not text:
        return None
    match = re.search(r"([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})", text)
    if not match:
        return None
    month = _MONTHS.get(match.group(1).lower())
    if month is None:
        return None
    return f"{int(match.group(3)):04d}-{month:02d}-{int(match.group(2)):02d}"


def _week0_matchups(package_root: Path, registry) -> dict[frozenset, dict]:
    """Explicit away/home (and neutral sites) for the Week 0 slate."""
    path = package_root / SCHEDULE
    if not path.exists():
        return {}
    section = mdtable.find_section(
        path.read_text(encoding="utf-8"), lambda title: title.startswith("2)"), 2
    )
    if section is None:
        return {}
    out: dict[frozenset, dict] = {}
    for table in section.tables():
        if not table.has_headers("Matchup"):
            continue
        for record in table.records():
            text = record.get("Matchup") or ""
            neutral = bool(re.search(r"\s+vs\.?\s+", text, re.IGNORECASE))
            parts = re.split(r"\s+(?:at|vs\.?)\s+", text, maxsplit=1, flags=re.IGNORECASE)
            if len(parts) != 2:
                continue
            first = registry.resolve(parts[0])
            second = registry.resolve(parts[1])
            if not (first and second):
                continue
            out[frozenset([first, second])] = {
                "away": None if neutral else first,
                "home": None if neutral else second,
                "neutral_site": neutral,
                "site": record.get("Site"),
                "tv": record.get("TV"),
                "time_et": record.get("Time (ET)"),
            }
    return out


def _parse_result(title: str, registry) -> dict | None:
    """"Virginia 34, NC State 8 (ACC opener)" -> both teams with their points."""
    text = mdtable.strip_markdown(title)
    text = re.sub(r"^\s*\d+\.\s*", "", text)
    text = re.sub(r"^Priority Feature:\s*", "", text, flags=re.IGNORECASE)
    note = None
    paren = re.search(r"\(([^)]*)\)\s*$", text)
    if paren:
        note = paren.group(1)
        text = text[: paren.start()].strip()
    match = _RESULT_RE.match(text.strip())
    if not match:
        return None
    winner, winner_points, loser, loser_points = match.groups()
    winner_slug = registry.resolve(winner)
    loser_slug = registry.resolve(loser)
    if not (winner_slug and loser_slug):
        return None
    return {
        "note": note,
        "teams": [
            {"name": winner.strip(), "slug": winner_slug, "points": int(winner_points)},
            {"name": loser.strip(), "slug": loser_slug, "points": int(loser_points)},
        ],
    }


def _line_score(section: mdtable.Section, registry) -> list[dict]:
    for table in section.tables():
        if not table.has_headers("Team", "Final"):
            continue
        rows: list[dict] = []
        for record in table.records():
            name = record.get("Team")
            if not name:
                continue
            quarters = [
                textutil.parse_int(record.get(header))
                for header in table.headers
                if header.isdigit() or header.upper() in {"OT", "2OT"}
            ]
            rows.append(
                {
                    "team": name,
                    "team_slug": _resolve_team(name, registry),
                    "quarters": quarters,
                    "final": textutil.parse_int(record.get("Final")),
                }
            )
        if rows:
            return rows
    return []


def _scoring_plays(section: mdtable.Section, registry) -> list[dict]:
    for table in section.tables():
        if not table.has_headers("Qtr", "Play"):
            continue
        plays: list[dict] = []
        score_header = next(
            (header for header in table.headers if header.lower().startswith("score")),
            None,
        )
        for record in table.records():
            play = record.get("Play")
            if not play:
                continue
            team = None
            head = play.split("—")[0].strip() if "—" in play else None
            if head:
                team = _resolve_team(head, registry)
            plays.append(
                {
                    "quarter": textutil.parse_int(record.get("Qtr")),
                    "clock": record.get("Time"),
                    "team_slug": team,
                    "description": play,
                    "score_after": record.get(score_header) if score_header else None,
                }
            )
        if plays:
            return plays
    return []


def _team_stats(section: mdtable.Section, registry) -> dict | None:
    """The Statistic | A | B box score, kept verbatim and normalized."""
    for table in section.tables():
        first = table.headers[0].lower() if table.headers else ""
        if first not in {"statistic", "stat", "category"} or len(table.headers) < 3:
            continue
        columns = table.headers[1:]
        slugs = [_resolve_team(column, registry) for column in columns]
        rows: list[dict] = []
        normalized: dict[str, dict] = {column: {} for column in columns}
        for record in table.records():
            label = record.get(table.headers[0])
            if not label:
                continue
            values = {column: record.get(column) for column in columns}
            rows.append({"statistic": label, "values": values})
            key = _BOX_KEYS.get(label.strip().lower())
            if key:
                for column in columns:
                    normalized[column][key] = values[column]
        return {
            "columns": [
                {"label": column, "team_slug": slug} for column, slug in zip(columns, slugs)
            ],
            "rows": rows,
            "normalized": normalized,
        }
    return None


def _resolve_team(name: str | None, registry) -> str | None:
    """Team columns here mix full names with leader-table codes ("UNC", "SJSU")."""
    if not name:
        return None
    return registry.resolve(name) or registry.resolve_player_code(name)


_BOLD_LABEL_RE = re.compile(r"^\*\*(.+?)\*\*\s*$")


def _leaders(section: mdtable.Section, registry) -> dict[str, list[dict]]:
    """Individual-leader tables, keyed by the bold label that introduces each."""
    lines = section.body.splitlines()
    out: dict[str, list[dict]] = {}
    for table in mdtable.tables(section.body):
        if not table.has_headers("Player"):
            continue
        label = "leaders"
        for index in range(table.line - 1, -1, -1):
            bold = _BOLD_LABEL_RE.match(lines[index].strip())
            if bold:
                label = bold.group(1).strip().lower()
                break
            if lines[index].strip().startswith("|"):
                break
        entries: list[dict] = []
        for record in table.records():
            player = record.get("Player")
            if not player:
                continue
            team_name = record.get("Team")
            entries.append(
                {
                    "player": player,
                    "team": team_name,
                    "team_slug": _resolve_team(team_name, registry),
                    "values": {
                        header: record.get(header)
                        for header in table.headers
                        if header not in {"Player", "Team"}
                    },
                }
            )
        if entries:
            out.setdefault(label, []).extend(entries)
    return out


def _narrative(body: str) -> str | None:
    """Prose recap, for the games the document covers in words rather than a table."""
    paragraphs: list[str] = []
    for block in re.split(r"\n\s*\n", body):
        text = block.strip()
        if not text or text.startswith("|") or text.startswith("#"):
            continue
        if text.startswith("**Source") or text.startswith("**Date") or text.startswith(
            "**Records"
        ):
            continue
        cleaned = mdtable.strip_markdown(text)
        if len(cleaned) > 60:
            paragraphs.append(cleaned)
    return " ".join(paragraphs) or None


def _game_id(result: dict, matchup: dict | None) -> str:
    slugs = [team["slug"] for team in result["teams"]]
    if matchup and matchup["away"] and matchup["home"]:
        return f"{WEEK0_DATE}-{matchup['away']}-at-{matchup['home']}"
    return f"{WEEK0_DATE}-" + "-vs-".join(sorted(slugs))


def _caveats(text: str) -> list[str]:
    section = mdtable.find_section(text, lambda title: "Notes and Caveats" in title, 2)
    if section is None:
        return []
    out: list[str] = []
    for line in section.body.splitlines():
        stripped = line.strip()
        if stripped.startswith("-") or stripped.startswith("*"):
            note = mdtable.strip_markdown(stripped[1:])
            if len(note) > 15:
                out.append(note)
    return out


def _sources(body: str) -> list[dict[str, str]]:
    return [
        {"title": match.group(1).strip(), "url": match.group(2).strip()}
        for line in body.splitlines()
        if "source" in line.lower()
        for match in _LINK_RE.finditer(line)
    ]


SAMPLE_CAVEAT = (
    "Sample sizes are a single game for nearly every team. These are Week 0 / early "
    "Week 1 snapshots, not season rates, and must not be presented as season averages."
)


def build(package_root: Path, out_dir: Path, registry) -> dict:
    path = package_root / SOURCE
    if not path.exists():
        return {
            "artifacts": [],
            "counts": {},
            "warnings": [f"missing source: {SOURCE}"],
        }

    text = path.read_text(encoding="utf-8")
    warnings: list[str] = []
    matchups = _week0_matchups(package_root, registry)
    caveats = _caveats(text)
    notes = [SAMPLE_CAVEAT, *caveats]

    games: list[dict] = []
    seen: set[str] = set()

    # Game detail lives at h2 (the priority feature) and h3 (every other game).
    candidates = mdtable.sections(text, 2) + mdtable.sections(text, 3)
    for section in candidates:
        result = _parse_result(section.title, registry)
        if result is None:
            continue
        matchup = matchups.get(frozenset(team["slug"] for team in result["teams"]))
        game_id = _game_id(result, matchup)
        if game_id in seen:
            continue

        stats = _team_stats(section, registry)
        line_score = _line_score(section, registry)
        narrative = _narrative(section.body)
        if not (stats or line_score or narrative):
            # A heading that only announces the result, with detail elsewhere.
            continue
        seen.add(game_id)

        date_match = _DATE_RE.search(section.body)
        games.append(
            {
                "game_id": game_id,
                "date": _iso_date(date_match.group(1)) if date_match else WEEK0_DATE,
                "title": mdtable.strip_markdown(section.title),
                "note": result["note"],
                "teams": result["teams"],
                "away_slug": matchup["away"] if matchup else None,
                "home_slug": matchup["home"] if matchup else None,
                "neutral_site": matchup["neutral_site"] if matchup else None,
                "site": matchup["site"] if matchup else None,
                "tv": matchup["tv"] if matchup else None,
                "line_score": line_score,
                "scoring_plays": _scoring_plays(section, registry),
                "team_stats": stats,
                "narrative": narrative,
                "leaders": _leaders(section, registry),
                "sources": _sources(section.body),
            }
        )

    for game in games:
        jsonio.write_json(
            out_dir / "stats" / SEASON_DIR / "games" / f"{game['game_id']}.json",
            jsonio.envelope(
                dataset="game",
                generated_from=[SOURCE, SCHEDULE],
                as_of=AS_OF,
                notes=notes,
                season=SEASON,
                **game,
            ),
        )

    # Section 3 is the authoritative list of Week 0 results.
    results: list[dict] = []
    results_section = mdtable.find_section(
        text, lambda title: title.startswith("3.") or "All Week 0 FBS Results" in title, 2
    )
    if results_section:
        for table in results_section.tables():
            if not table.has_headers("Result"):
                continue
            for record in table.records():
                parsed = _parse_result(record.get("Result") or "", registry)
                if parsed is None:
                    warnings.append(f"unparsed Week 0 result {record.get('Result')!r}")
                    continue
                matchup = matchups.get(frozenset(t["slug"] for t in parsed["teams"]))
                results.append(
                    {
                        "date": WEEK0_DATE,
                        "teams": parsed["teams"],
                        "away_slug": matchup["away"] if matchup else None,
                        "home_slug": matchup["home"] if matchup else None,
                        "neutral_site": matchup["neutral_site"] if matchup else None,
                        "site": record.get("Site / Notes"),
                        "game_id": _game_id(parsed, matchup),
                    }
                )

    # Sections 5-7: national early leaders and snapshots, each kept under its
    # own heading so nothing is flattened into a false "season leaders" table.
    extras: dict[str, dict] = {}
    for section in mdtable.sections(text, 2):
        if not re.match(r"^(5|6|7)\.", section.title):
            continue
        blocks: dict[str, list] = {}
        for sub in section.subsections(3):
            tables = sub.tables()
            if not tables:
                continue
            blocks[sub.title] = [
                {"columns": table.headers, "rows": table.records()} for table in tables
            ]
        if blocks:
            extras[section.title] = blocks

    teams_with_games = sorted(
        {team["slug"] for entry in (games + results) for team in entry["teams"]}
    )

    season_payload = jsonio.envelope(
        dataset="season-stats",
        generated_from=[SOURCE, SCHEDULE],
        as_of=AS_OF,
        notes=notes,
        season=SEASON,
        coverage_window="Week 0 (2026-08-29) through early Week 1, as of 2026-09-05",
        week0_results=results,
        games=[
            {
                "game_id": game["game_id"],
                "date": game["date"],
                "title": game["title"],
                "teams": game["teams"],
                "site": game["site"],
                "has_box_score": game["team_stats"] is not None,
                "has_narrative": game["narrative"] is not None,
            }
            for game in games
        ],
        early_leaders=extras,
        sources=_sources(text),
    )
    jsonio.write_json(out_dir / "stats" / SEASON_DIR / "season.json", season_payload)

    index = jsonio.envelope(
        dataset="season-stats-index",
        generated_from=[SOURCE, SCHEDULE],
        as_of=AS_OF,
        notes=notes,
        season=SEASON,
        games=len(games),
        results=len(results),
        teams_with_games=teams_with_games,
        teams_without_games=len(registry) - len(teams_with_games),
        coverage_note=(
            f"Only {len(teams_with_games)} of {len(registry)} FBS teams had played by "
            "2026-09-05. Every other team has no 2026 games yet — render that as "
            "'no games played', not as zeroes."
        ),
    )
    jsonio.write_json(out_dir / "stats" / SEASON_DIR / "index.json", index)

    if not games:
        warnings.append("no 2026 games parsed from the season stats document")

    return {
        "artifacts": [f"stats/{SEASON_DIR}/games/{game['game_id']}.json" for game in games]
        + [f"stats/{SEASON_DIR}/season.json", f"stats/{SEASON_DIR}/index.json"],
        "counts": {
            "games_with_detail": len(games),
            "week0_results": len(results),
            "teams_with_games": len(teams_with_games),
            "early_leader_sections": len(extras),
        },
        "warnings": warnings,
    }


SEASON_DIR = str(SEASON)
