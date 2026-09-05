"""2026 team schedules.

Sources:
  * ``02-stats/02-full-schedule-2026.md``  — season calendar, Week 0, neutral-site
    games, and the P4 + independent slates
  * ``02-stats/02b-g5-schedules-2026.md``  — AAC, CUSA, MAC, MW and Sun Belt grids

The package publishes schedules in four different shapes, and each conference
section has to be read on its own terms:

  A. ``#### <Team>`` with bullet lines — ACC, Big Ten, Big 12, Pac-12.
     The Big Ten and Big 12 write a home game as a bare opponent name
     ("Sep 5: UAB"), so "no prefix" means *home*, not "unknown".
  B. ``#### Week N`` with semicolon-separated games — the SEC, which publishes a
     week-by-week slate rather than per-team grids. Each game is assigned to
     both teams.
  C. ``#### <Team>`` with a Date | Opponent | Site table — the independents.
  D. ``### <Team>`` with a Date | Opponent | Type table — the G5 companion.

Non-FBS opponents (FCS schools) resolve to ``opponent_slug: null``. That is
correct rather than a gap: they are real opponents outside the 138-team
registry, and the raw name is always kept.
"""

from __future__ import annotations

import re
from pathlib import Path

from lib import jsonio, mdtable

MAIN = "02-stats/02-full-schedule-2026.md"
G5 = "02-stats/02b-g5-schedules-2026.md"
AS_OF = "2026-09-05"
SEASON = 2026

_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12,
}

#: "Sep 5", "Sep 5 2026", "5 Sep", "Aug 29 2026".
_DATE_MD_RE = re.compile(
    r"\b(jan|feb|mar|apr|may|jun|jul|aug|sept|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b"
    r"(?:\s*,?\s*(\d{4}))?",
    re.IGNORECASE,
)
_DATE_DM_RE = re.compile(
    r"\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sept|sep|oct|nov|dec)[a-z]*\.?"
    r"(?:\s*,?\s*(\d{4}))?",
    re.IGNORECASE,
)

_BULLET_RE = re.compile(r"^\s*[-*]\s+(.*?)\s*$")
_WEEK_HEADING_RE = re.compile(r"^week\s+(\d+)", re.IGNORECASE)
_BYE_RE = re.compile(r"^(bye|off|open|open date)\b", re.IGNORECASE)
_PAREN_RE = re.compile(r"\s*\(([^)]*)\)")
_BRACKET_RE = re.compile(r"\s*\[([^\]]*)\]")
_TRAILING_STAR_RE = re.compile(r"\s*\*+\s*$")

#: Conference sections of the main file, mapped to how they are laid out.
_SECTION_SHAPES = {
    "4.a": "per_team_bullets",
    "4.b": "per_team_bullets",
    "4.c": "per_team_bullets",
    "4.d": "per_team_bullets",
    "4.e": "weekly",
    "4.f": "per_team_table",
}


def _iso_date(text: str | None, *, season: int = SEASON) -> str | None:
    """ISO date for "Sep 5" / "5 Sep" / "Aug 29 2026".

    The season runs from August 2026 into January 2027, so a January-to-June
    date belongs to the following calendar year unless the source states one.
    """
    if not text:
        return None
    match = _DATE_MD_RE.search(text) or _DATE_DM_RE.search(text)
    if not match:
        return None
    groups = match.groups()
    if groups[0].isdigit():
        day, month_name, year = groups[0], groups[1], groups[2]
    else:
        month_name, day, year = groups[0], groups[1], groups[2]
    month = _MONTHS.get(month_name[:4].lower()) or _MONTHS.get(month_name[:3].lower())
    if month is None:
        return None
    day_number = int(day)
    if not 1 <= day_number <= 31:
        return None
    calendar_year = int(year) if year else (season + 1 if month <= 6 else season)
    return f"{calendar_year:04d}-{month:02d}-{day_number:02d}"


def _strip_notes(text: str) -> tuple[str, list[str]]:
    """Pull parenthetical and bracketed notes off an opponent string."""
    notes: list[str] = []
    for pattern in (_PAREN_RE, _BRACKET_RE):
        for match in pattern.finditer(text):
            note = match.group(1).strip()
            if note:
                notes.append(note)
        text = pattern.sub(" ", text)
    return re.sub(r"\s+", " ", text).strip(" .,;"), notes


def _parse_opponent(raw: str, registry) -> dict:
    """One opponent cell / bullet tail into location, opponent and notes."""
    text = mdtable.strip_markdown(raw).strip()
    conference_marker = bool(_TRAILING_STAR_RE.search(text))
    text = _TRAILING_STAR_RE.sub("", text).strip()

    if _BYE_RE.match(text):
        return {
            "opponent": None,
            "opponent_slug": None,
            "location": None,
            "type": "bye",
            "notes": None,
            "site": None,
            "conference_marker": False,
        }

    body, notes = _strip_notes(text)

    site: str | None = None
    location: str | None = None
    if re.match(r"^at\s+", body, re.IGNORECASE):
        location = "away"
        body = re.sub(r"^at\s+", "", body, flags=re.IGNORECASE)
    elif re.match(r"^vs\.?\s+", body, re.IGNORECASE):
        location = "home"
        body = re.sub(r"^vs\.?\s+", "", body, flags=re.IGNORECASE)
    else:
        # The Big Ten and Big 12 write home games as a bare opponent name.
        location = "home"

    # "vs Ole Miss at Nashville" and "Baylor vs. Auburn at Atlanta" name a site.
    at_split = re.split(r"\s+at\s+", body, maxsplit=1, flags=re.IGNORECASE)
    if len(at_split) == 2 and location == "home":
        candidate = at_split[1].strip()
        if registry.resolve(candidate) is None:
            body, site, location = at_split[0].strip(), candidate, "neutral"

    return {
        "opponent": body or None,
        "opponent_slug": registry.resolve(body),
        "location": location,
        "type": None,
        "notes": "; ".join(notes) or None,
        "site": site,
        "conference_marker": conference_marker,
    }


def _game(
    *,
    date_raw: str,
    opponent_raw: str,
    registry,
    source: str,
    week: int | None = None,
    site: str | None = None,
    game_type: str | None = None,
) -> dict:
    parsed = _parse_opponent(opponent_raw, registry)
    resolved_type = game_type
    if resolved_type is None and parsed["type"] == "bye":
        resolved_type = "bye"
    return {
        "date": _iso_date(date_raw),
        "date_raw": mdtable.strip_markdown(date_raw),
        "week": week,
        "opponent": parsed["opponent"],
        "opponent_slug": parsed["opponent_slug"],
        "location": parsed["location"] if resolved_type != "bye" else None,
        "site": site or parsed["site"],
        "type": resolved_type,
        "notes": parsed["notes"],
        "conference_game_marker": parsed["conference_marker"] or None,
        "source": source,
    }


# --------------------------------------------------------------------------
# Shape A / C: per-team sections
# --------------------------------------------------------------------------


def _per_team_bullets(section: mdtable.Section, registry, source: str, warnings: list[str]):
    out: dict[str, list[dict]] = {}
    for team_section in section.subsections(4):
        slug = registry.resolve(team_section.title)
        if slug is None:
            warnings.append(f"{source}: unresolved team heading {team_section.title!r}")
            continue
        games: list[dict] = []
        for line in team_section.body.splitlines():
            bullet = _BULLET_RE.match(line)
            if not bullet:
                continue
            content = mdtable.strip_markdown(bullet.group(1))
            if ":" not in content:
                continue
            date_raw, _, opponent_raw = content.partition(":")
            if not _iso_date(date_raw):
                continue
            games.append(
                _game(
                    date_raw=date_raw,
                    opponent_raw=opponent_raw,
                    registry=registry,
                    source=source,
                )
            )
        if games:
            out.setdefault(slug, []).extend(games)
    return out


def _per_team_table(section: mdtable.Section, registry, source: str, warnings: list[str]):
    out: dict[str, list[dict]] = {}
    for team_section in section.subsections(4):
        slug = registry.resolve(team_section.title)
        if slug is None:
            warnings.append(f"{source}: unresolved team heading {team_section.title!r}")
            continue
        games: list[dict] = []
        for table in team_section.tables():
            if not table.has_headers("Date", "Opponent"):
                continue
            for record in table.records():
                date_raw = record.get("Date")
                opponent_raw = record.get("Opponent")
                if not date_raw:
                    continue
                if not opponent_raw:
                    games.append(
                        _game(
                            date_raw=date_raw,
                            opponent_raw="BYE",
                            registry=registry,
                            source=source,
                            game_type="bye",
                        )
                    )
                    continue
                declared = (record.get("Type") or "").lower()
                game_type = None
                if declared.startswith("conference"):
                    game_type = "conference"
                elif declared.startswith("non"):
                    game_type = "non-conference"
                games.append(
                    _game(
                        date_raw=date_raw,
                        opponent_raw=opponent_raw,
                        registry=registry,
                        source=source,
                        site=record.get("Site"),
                        game_type=game_type,
                    )
                )
        if games:
            out.setdefault(slug, []).extend(games)
    return out


# --------------------------------------------------------------------------
# Shape B: the SEC's week-by-week slate
# --------------------------------------------------------------------------

_WEEK_DATE_RE = re.compile(r"^\s*\*\*([^*]+?):?\*\*:?\s*(.*)$")


def _weekly(section: mdtable.Section, registry, source: str, warnings: list[str]):
    """Assign each week-by-week game to both of its teams."""
    out: dict[str, list[dict]] = {}
    for week_section in section.subsections(4):
        week_match = _WEEK_HEADING_RE.match(week_section.title)
        week = int(week_match.group(1)) if week_match else None
        # A heading may carry the date for the whole week: "Week 4 (Sat Sep 26)".
        heading_date = _iso_date(week_section.title)

        for line in week_section.body.splitlines():
            bullet = _BULLET_RE.match(line)
            if not bullet:
                continue
            content = bullet.group(1)
            date_raw = week_section.title
            labelled = _WEEK_DATE_RE.match(content)
            if labelled and _iso_date(labelled.group(1)):
                date_raw, content = labelled.group(1), labelled.group(2)
            elif heading_date is None:
                # No date anywhere for this week; keep the games, date unknown.
                date_raw = week_section.title

            for chunk in content.split(";"):
                matchup = mdtable.strip_markdown(chunk).strip()
                if not matchup:
                    continue
                pair = _split_matchup(matchup, registry)
                if pair is None:
                    warnings.append(f"{source}: unparsed SEC matchup {matchup!r}")
                    continue
                away, home, site, notes = pair
                iso = _iso_date(date_raw)
                for slug, opponent_slug, location in (
                    (away["slug"], home["slug"], "neutral" if site else "away"),
                    (home["slug"], away["slug"], "neutral" if site else "home"),
                ):
                    if slug is None:
                        continue
                    out.setdefault(slug, []).append(
                        {
                            "date": iso,
                            "date_raw": mdtable.strip_markdown(date_raw),
                            "week": week,
                            "opponent": (home if slug == away["slug"] else away)["name"],
                            "opponent_slug": opponent_slug,
                            "location": location,
                            "site": site,
                            "type": None,
                            "notes": notes,
                            "conference_game_marker": None,
                            "source": source,
                        }
                    )
    return out


def _split_matchup(text: str, registry):
    """"Away at Home (TV)" / "A vs. B at Site" -> both sides plus site and notes."""
    body, notes = _strip_notes(text)
    site: str | None = None

    if re.search(r"\s+vs\.?\s+", body, re.IGNORECASE):
        left, right = re.split(r"\s+vs\.?\s+", body, maxsplit=1, flags=re.IGNORECASE)
        at_split = re.split(r"\s+at\s+", right, maxsplit=1, flags=re.IGNORECASE)
        if len(at_split) == 2:
            right, site = at_split[0].strip(), at_split[1].strip()
    elif re.search(r"\s+at\s+", body, re.IGNORECASE):
        left, right = re.split(r"\s+at\s+", body, maxsplit=1, flags=re.IGNORECASE)
    else:
        return None

    left, right = left.strip(), right.strip()
    if not left or not right:
        return None
    return (
        {"name": left, "slug": registry.resolve(left)},
        {"name": right, "slug": registry.resolve(right)},
        site,
        "; ".join(notes) or None,
    )


# --------------------------------------------------------------------------
# Season-level tables
# --------------------------------------------------------------------------


def _week0(text: str, registry) -> list[dict]:
    section = mdtable.find_section(text, lambda title: title.startswith("2)"), 2)
    if section is None:
        return []
    games: list[dict] = []
    for table in section.tables():
        if not table.has_headers("Matchup"):
            continue
        for record in table.records():
            pair = _split_matchup(record.get("Matchup") or "", registry)
            if pair is None:
                continue
            away, home, site, notes = pair
            games.append(
                {
                    "date": "2026-08-29",
                    "time_et": record.get("Time (ET)"),
                    "away": away["name"],
                    "away_slug": away["slug"],
                    "home": home["name"],
                    "home_slug": home["slug"],
                    "site": record.get("Site") or site,
                    "tv": record.get("TV"),
                    "notes": notes,
                }
            )
    return games


def _neutral_games(text: str, registry) -> list[dict]:
    section = mdtable.find_section(text, lambda title: title.startswith("3)"), 2)
    if section is None:
        return []
    games: list[dict] = []
    for table in section.tables():
        if not table.has_headers("Matchup", "Venue"):
            continue
        for record in table.records():
            pair = _split_matchup(record.get("Matchup") or "", registry)
            if pair is None:
                continue
            first, second, _, _ = pair
            games.append(
                {
                    "date": _iso_date(record.get("Date")),
                    "date_raw": record.get("Date"),
                    "teams": [first["name"], second["name"]],
                    "team_slugs": [first["slug"], second["slug"]],
                    "venue": record.get("Venue"),
                    "event": record.get("Event / notes"),
                }
            )
    return games


def _calendar(text: str) -> dict:
    """Season overview, championship dates and the CFP calendar."""
    section = mdtable.find_section(text, lambda title: title.startswith("1)"), 2)
    if section is None:
        return {}
    calendar: dict = {"overview": [], "conference_championships": [], "playoff": []}
    for table in section.tables():
        records = table.records()
        if table.has_headers("Item", "Detail"):
            calendar["overview"] = [
                {"item": row.get("Item"), "detail": row.get("Detail")} for row in records
            ]
        elif table.has_headers("Conference", "Date"):
            calendar["conference_championships"] = [
                {
                    "conference": row.get("Conference"),
                    "date": row.get("Date"),
                    "site": row.get("Site / notes"),
                }
                for row in records
            ]
        elif table.has_headers("Round", "Dates"):
            calendar["playoff"] = [
                {
                    "round": row.get("Round"),
                    "dates": row.get("Dates"),
                    "sites": row.get("Sites / TV (as announced)"),
                }
                for row in records
            ]
    return calendar


# --------------------------------------------------------------------------


def _dedupe_key(slug: str, game: dict) -> tuple:
    opponent = game.get("opponent_slug") or (game.get("opponent") or "").lower()
    pair = tuple(sorted([slug, str(opponent)]))
    return (game.get("date") or game.get("date_raw"), *pair)


def build(package_root: Path, out_dir: Path, registry) -> dict:
    warnings: list[str] = []
    by_team: dict[str, list[dict]] = {}
    coverage: list[dict] = []

    main_path = package_root / MAIN
    main_text = main_path.read_text(encoding="utf-8")

    for section in mdtable.iter_sections(main_text, level=3):
        key = section.title.split()[0].lower().rstrip(")")
        shape = _SECTION_SHAPES.get(key)
        if shape is None:
            continue
        if shape == "per_team_bullets":
            parsed = _per_team_bullets(section, registry, MAIN, warnings)
        elif shape == "weekly":
            parsed = _weekly(section, registry, MAIN, warnings)
        else:
            parsed = _per_team_table(section, registry, MAIN, warnings)
        for slug, games in parsed.items():
            by_team.setdefault(slug, []).extend(games)
        coverage.append(
            {
                "section": section.title,
                "source": MAIN,
                "shape": shape,
                "teams": len(parsed),
                "games": sum(len(games) for games in parsed.values()),
            }
        )

    g5_path = package_root / G5
    if g5_path.exists():
        g5_text = g5_path.read_text(encoding="utf-8")
        for section in mdtable.iter_sections(g5_text, level=2):
            if not re.match(r"^\d+\.", section.title):
                continue
            parsed: dict[str, list[dict]] = {}
            # Most G5 conferences put teams at h3. The Sun Belt splits into
            # "### East Division" / "### West Division" with teams at h4, so both
            # depths are searched and anything that is not a team is skipped.
            candidates = section.subsections(3) + section.subsections(4)
            for team_section in candidates:
                slug = registry.resolve(team_section.title)
                if slug is None or slug in parsed:
                    continue
                games: list[dict] = []
                for table in team_section.tables():
                    if not table.has_headers("Date", "Opponent"):
                        continue
                    for record in table.records():
                        date_raw = record.get("Date")
                        opponent_raw = record.get("Opponent")
                        if not date_raw:
                            continue
                        declared = (record.get("Type") or "").lower()
                        game_type = None
                        if declared.startswith("conference"):
                            game_type = "conference"
                        elif declared.startswith("non"):
                            game_type = "non-conference"
                        games.append(
                            _game(
                                date_raw=date_raw,
                                opponent_raw=opponent_raw or "BYE",
                                registry=registry,
                                source=G5,
                                game_type="bye" if not opponent_raw else game_type,
                            )
                        )
                if games:
                    parsed[slug] = games
            for slug, games in parsed.items():
                by_team.setdefault(slug, []).extend(games)
            if parsed:
                coverage.append(
                    {
                        "section": section.title,
                        "source": G5,
                        "shape": "per_team_table",
                        "teams": len(parsed),
                        "games": sum(len(games) for games in parsed.values()),
                    }
                )
    else:
        warnings.append(f"missing schedule source: {G5}")

    # Section 3 of the main file enumerates every neutral-site and international
    # game. A per-team grid writes those as "vs. X", which would otherwise read
    # as a home game — Notre Dame's Shamrock Series meeting with Wisconsin is at
    # Lambeau Field, not in South Bend. The source's own list settles it.
    neutral_lookup: dict[tuple, dict] = {}
    for entry in _neutral_games(main_text, registry):
        slugs = [slug for slug in entry["team_slugs"] if slug]
        if entry["date"] and len(slugs) == 2:
            neutral_lookup[(entry["date"], frozenset(slugs))] = entry
    for entry in _week0(main_text, registry):
        slugs = [slug for slug in (entry["home_slug"], entry["away_slug"]) if slug]
        if entry["date"] and len(slugs) == 2 and entry.get("site"):
            # Week 0's Dublin game is the only neutral there; the rest name a
            # campus stadium, so only mark the ones section 3 also lists.
            key = (entry["date"], frozenset(slugs))
            if key in neutral_lookup:
                neutral_lookup[key]["venue"] = neutral_lookup[key].get("venue") or entry["site"]

    for slug, games in by_team.items():
        for game in games:
            if game["type"] == "bye" or not game["opponent_slug"] or not game["date"]:
                continue
            entry = neutral_lookup.get((game["date"], frozenset([slug, game["opponent_slug"]])))
            if entry:
                game["location"] = "neutral"
                game["site"] = game["site"] or entry.get("venue")
                event = entry.get("event")
                if event and event not in (game["notes"] or ""):
                    game["notes"] = "; ".join(filter(None, [game["notes"], event]))

    # Write one file per team.
    written: list[str] = []
    index_rows: list[dict] = []
    all_games: dict[tuple, dict] = {}

    for slug in sorted(by_team):
        games = by_team[slug]
        seen: set[tuple] = set()
        unique: list[dict] = []
        for game in games:
            key = _dedupe_key(slug, game)
            if key in seen:
                continue
            seen.add(key)
            unique.append(game)
        unique.sort(key=lambda game: (game["date"] or "9999", game["date_raw"]))

        team = registry.get(slug)
        payload = jsonio.envelope(
            dataset="schedule",
            generated_from=sorted({game["source"] for game in unique}),
            as_of=AS_OF,
            notes=[
                "An opponent_slug of null is a non-FBS opponent, not a missing value.",
                "A game with no 'at' or 'vs' prefix in the source is a home game; the "
                "Big Ten and Big 12 releases write home games that way.",
            ],
            team={
                "slug": slug,
                "school": team.school,
                "conference_slug": team.conference_slug,
            },
            season=SEASON,
            games=unique,
            counts={
                "games": sum(1 for game in unique if game["type"] != "bye"),
                # Only the G5 and independent grids label conference games. Where
                # the source never states a type, the count is null — reporting 0
                # would say the team plays no conference games.
                "conference_games": (
                    sum(1 for game in unique if game["type"] == "conference")
                    if any(game["type"] in {"conference", "non-conference"} for game in unique)
                    else None
                ),
                "byes": sum(1 for game in unique if game["type"] == "bye"),
                "non_fbs_opponents": sum(
                    1
                    for game in unique
                    if game["type"] != "bye" and game["opponent_slug"] is None
                ),
            },
        )
        jsonio.write_json(out_dir / "schedules" / f"{slug}.json", payload)
        written.append(f"schedules/{slug}.json")

        played = [game for game in unique if game["type"] != "bye"]
        index_rows.append(
            {
                "slug": slug,
                "school": team.school,
                "conference_slug": team.conference_slug,
                "games": len(played),
                "conference_games": payload["counts"]["conference_games"],
                "byes": payload["counts"]["byes"],
                "first_game_date": next(
                    (game["date"] for game in played if game["date"]), None
                ),
                "sources": payload["meta"]["sources"],
            }
        )

        for game in played:
            all_games.setdefault(
                _dedupe_key(slug, game),
                {
                    "date": game["date"],
                    "date_raw": game["date_raw"],
                    "week": game["week"],
                    "teams": sorted(
                        filter(None, [slug, game["opponent_slug"]])
                    ),
                    "opponent_names": [team.school, game["opponent"]],
                    "site": game["site"],
                    "type": game["type"],
                    "location_for_first": game["location"],
                    "source": game["source"],
                },
            )

    season_payload = jsonio.envelope(
        dataset="season-schedule",
        generated_from=[MAIN, G5],
        as_of=AS_OF,
        notes=[
            "all_games is deduplicated: a game appearing on both teams' grids is "
            "one entry, keyed on its date and the pair of teams.",
        ],
        season=SEASON,
        calendar=_calendar(main_text),
        week0=_week0(main_text, registry),
        neutral_site_games=_neutral_games(main_text, registry),
        all_games=sorted(
            all_games.values(),
            key=lambda game: (game["date"] or "9999", game["teams"]),
        ),
    )
    jsonio.write_json(out_dir / "schedules" / "season.json", season_payload)
    written.append("schedules/season.json")

    missing = sorted(team.slug for team in registry if team.slug not in by_team)
    index = jsonio.envelope(
        dataset="schedule-index",
        generated_from=[MAIN, G5],
        as_of=AS_OF,
        notes=[
            "coverage records which document and layout each conference's grid came "
            "from; teams_without_schedule names any program the package did not "
            "publish a grid for.",
        ],
        teams=index_rows,
        coverage=coverage,
        teams_without_schedule=missing,
        totals={
            "teams": len(index_rows),
            "games": sum(row["games"] for row in index_rows),
            "distinct_games": len(all_games),
        },
    )
    jsonio.write_json(out_dir / "schedules" / "index.json", index)
    written.append("schedules/index.json")

    if missing:
        warnings.append(
            f"{len(missing)} teams have no schedule grid: " + ", ".join(missing[:12])
        )

    return {
        "artifacts": sorted(written),
        "counts": {
            "teams": len(index_rows),
            "team_games": sum(row["games"] for row in index_rows),
            "distinct_games": len(all_games),
            "week0_games": len(season_payload["week0"]),
            "neutral_games": len(season_payload["neutral_site_games"]),
            "teams_missing": len(missing),
        },
        "warnings": warnings,
    }
