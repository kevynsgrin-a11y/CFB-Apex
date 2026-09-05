"""Depth charts and starter rankings.

Two sources are merged per team, because neither is sufficient alone:

  * ``01-rosters/<conf>-2026/<team>.md`` -> ``## Starter Depth Chart``, whose
    ``Pos | 1st | 2nd | 3rd+`` tables give the ordered depth and whose headings
    carry the scheme label ("### Defense (4-2-5 — PROJECTED Ourlads)").
  * ``01-rosters/<conf>-2026/01-starter-depth-charts-summary.md``, whose
    per-team sections give each *starter* their stars, class, high school and
    hometown, plus the chart's OFFICIAL / MIXED / PROJECTED status and caveat.

Where the two name different starters for a position, both are kept and the
disagreement is recorded in ``conflicts`` with the file each value came from.
Silently preferring one would hide exactly the uncertainty the sources took
care to document.

Co-listed competition ("Veguer Jean-Jumeau **OR** Trevon Humphrey") is split
into separate players, with the parallel values in the other columns matched up
to them, rather than stored as one player with an impossible name.
"""

from __future__ import annotations

import re
from pathlib import Path

from lib import jsonio, mdtable, teams as teams_lib, textutil

AS_OF = "2026-09-05"

_STATUS_RE = re.compile(r"\*\*Depth chart status:\*\*\s*(.+?)\s*$", re.MULTILINE)
_CAVEAT_RE = re.compile(r"\*\*Caveat \(source\):\*\*\s*(.+?)\s*$", re.MULTILINE)
_OR_RE = re.compile(r"\s+OR\s+", re.IGNORECASE)
_BACKUP_RE = re.compile(r"Backup\(s\):\s*(.+?)\s*$", re.IGNORECASE)
_INJ_RE = re.compile(r"\*\*INJ listed:\*\*\s*(.+?)\s*$", re.MULTILINE)
_SUS_RE = re.compile(r"\*\*SUS listed:\*\*\s*(.+?)\s*$", re.MULTILINE)
_TEAM_HEADING_RE = re.compile(r"^\s*\d+\.\s*(.+)$")

#: Some Notes cells append the chart's status after the backup list
#: ("Backup(s): Tucker Kilcrease (5th); Rodge Waldrop (3rd); OFFICIAL").
_STATUS_WORDS = {"OFFICIAL", "MIXED", "PROJECTED", "UNOFFICIAL"}
_CLASS_SUFFIX_RE = re.compile(r"\s*\(([^)]*)\)\s*$")
#: Any parenthetical, wherever it sits in the cell.
_PAREN_ANY_RE = re.compile(r"\s*\(([^)]*)\)")

#: Column headers that carry no players, only commentary about the chart.
_NON_DEPTH_HEADERS = {
    "status",
    "chart status",
    "chart type",
    "notes",
    "note",
    "source",
    "depth",
    "comment",
}

#: Words that name the first string, and words that name the second.
_FIRST_WORDS = ("starter", "starters", "first", "listed", "projected", "no 1")
_SECOND_WORDS = ("backup", "backups", "second", "next", "reserve")

_HEADER_NUMBER_RE = re.compile(r"(\d+)")


def _depth_rank(header: str) -> int | None:
    """Which string a depth column names, or None if it is not a depth column.

    The 92 team files use more than thirty different spellings for the same
    three columns — "Starter | Backup", "1st | 2nd | 3rd+", "#1 | #2 | #3+",
    "Depth 1 | Depth 2 | Depth 3+", "Starter ★ | Backup | Next", "Starter (1) |
    Backup (2) | Backup (3)". Matching a fixed list of prefixes silently drops
    whole teams' charts, so the rank is derived from the header's meaning.
    """
    text = header.lower().replace("★", " ").replace("#", " ")
    text = re.sub(r"[^a-z0-9+/ ]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return None

    # "Starter / depth" is still the starter column; a bare "Depth" or "Status"
    # is commentary.
    if text in _NON_DEPTH_HEADERS:
        return None
    words = set(text.split())
    has_first = any(word in text for word in _FIRST_WORDS)
    has_second = any(word in text for word in _SECOND_WORDS)

    number = _HEADER_NUMBER_RE.search(text)
    rank = int(number.group(1)) if number else None

    if has_second:
        # "Backup (3)" is the third string, not the second.
        return rank if rank and 2 <= rank <= 6 else 2
    if has_first:
        return rank if rank and 2 <= rank <= 6 else 1
    if rank and 1 <= rank <= 6:
        # "1st", "#2 / #3" (a merged column, ranked by its first number),
        # "Depth 3+".
        return rank
    if words & {"status", "notes", "type"}:
        return None
    return None


#: Parentheticals in a unit heading that name a source or a status, not a scheme.
_NOT_A_SCHEME = {
    "ourlads",
    "official",
    "projected",
    "mixed",
    "starters",
    "media",
    "beat",
    "espn",
    "247sports",
    "on3",
}


def _scheme(title: str) -> str | None:
    """Scheme label from a unit heading, ignoring provenance parentheticals."""
    label = textutil.scheme_from_heading(title)
    if not label:
        return None
    lowered = label.lower().strip()
    if lowered in _NOT_A_SCHEME or lowered.endswith("starters"):
        return None
    # "Spread — Ourlads projected" keeps only the scheme half; a heading that is
    # nothing but provenance keeps nothing.
    if all(word.strip(" -—") in _NOT_A_SCHEME for word in lowered.split()):
        return None
    return label


def _unit_of(title: str) -> str | None:
    lowered = title.lower()
    if lowered.startswith("offense"):
        return "offense"
    if lowered.startswith("defense"):
        return "defense"
    if "special" in lowered or lowered.startswith("specialists") or lowered.startswith("kicking"):
        return "special_teams"
    return None


def _parallel(value: str | None, count: int) -> list[str | None]:
    """Line a co-listed cell up with ``count`` players.

    The sources separate parallel values with " ; " in the hometown column (whose
    values contain their own "/") and with " / " elsewhere, so the semicolon is
    tried first and a split is only accepted when it yields exactly one value
    per player.
    """
    text = mdtable.clean(value)
    if text is None:
        return [None] * count
    if count == 1:
        return [text]
    for separator in (" ; ", "; ", " / "):
        parts = [part.strip() for part in text.split(separator)]
        if len(parts) == count:
            return [mdtable.clean(part) for part in parts]
    return [text] * count


_JERSEY_RE = re.compile(r"#\s*(\d{1,2})")
_NAME_NOISE_RE = re.compile(r"[^a-z0-9 ]+")


#: Generational suffixes one source prints and the other omits.
_SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "v"}


def _name_key(name: str) -> str:
    """Match names across sources that write them differently.

    The same player appears as 'Veguer "JuJu" Jean-Jumeau' and 'Veguer
    Jean-Jumeau', as '#65 Gabe Funk' and 'Gabe Funk', and as 'Tyshon Reed Jr.'
    and 'Tyshon Reed'. Without collapsing those, every one reads as a
    disagreement between the sources and buries the real ones.
    """
    # A quoted nickname is present in one source and absent in the other.
    text = re.sub(r"[\"“”'‘’]([^\"“”'‘’]{1,20})[\"“”'‘’]", " ", name.lower())
    text = _JERSEY_RE.sub(" ", text)
    text = _NAME_NOISE_RE.sub(" ", text)
    tokens = [
        token
        for token in text.split()
        if token not in _SUFFIXES and not token.isdigit()
    ]
    return " ".join(tokens)


def _player(
    name: str,
    *,
    stars: str | None = None,
    class_year: str | None = None,
    place: str | None = None,
    note: str | None = None,
) -> dict:
    """One depth-chart entry, with any trailing "(Jr./TR)" kept as the class."""
    cleaned = mdtable.strip_markdown(name).strip()
    # A trailing parenthetical is a jersey number, a class, or both — it is
    # never part of the name, and leaving it attached makes the same player
    # look like two different people across the two sources.
    inline_class = None
    jersey = None
    leading = re.match(r"^#\s*(\d{1,2})\s+(.*)$", cleaned)
    if leading:
        jersey = int(leading.group(1))
        cleaned = leading.group(2).strip()
    # Every parenthetical is annotation — class, jersey, transfer, status — and
    # none of it belongs in the name. The first one supplies the class.
    for inner in _PAREN_ANY_RE.findall(cleaned):
        number = _JERSEY_RE.search(inner)
        if number and jersey is None:
            jersey = int(number.group(1))
        remainder = _JERSEY_RE.sub("", inner).strip(" ,;")
        if remainder and inline_class is None:
            inline_class = remainder
    cleaned = re.sub(r"\s+", " ", _PAREN_ANY_RE.sub(" ", cleaned)).strip(" ,;")
    raw_class = class_year or inline_class
    code, raw = textutil.parse_class_year(raw_class)
    hometown = textutil.parse_hometown(place)
    return {
        "name": cleaned,
        "jersey": jersey,
        "stars": textutil.parse_stars(stars),
        "class": code,
        "class_raw": raw,
        "high_school": hometown["high_school"],
        "city": hometown["city"],
        "state": hometown["state"],
        "hometown": hometown["hometown"],
        "previous_schools": hometown["previous_schools"],
        "note": mdtable.clean(note),
    }


#: The separators a depth cell uses between co-listed players. "-OR-" and a
#: spaced slash are as common as " OR " across the 92 files.
#: "OR" is written bare, bolded ("**OR**") and hyphenated ("-OR-"), and the
#: cell is read as raw Markdown, so the emphasis markers have to be tolerated.
_PLAYER_SPLIT_RE = re.compile(
    r"(?:\s+OR\s+|\s*-\s*OR\s*-\s*|\s*;\s*|\s+/\s+)", re.IGNORECASE
)

#: "**OR**" is the separator wearing emphasis. Normalising it before anything
#: else keeps the split from eating the closing "**" of the bold run in front
#: of it, which would leave that run unclosed and its text stuck in a name.
_BOLD_OR_RE = re.compile(r"\*\*\s*OR\s*\*\*", re.IGNORECASE)

_SEPARATOR_PROBE_RE = re.compile(r"\bOR\b|;|/", re.IGNORECASE)
_JERSEY_ONLY_RE = re.compile(r"^#\s*\d{1,2}$")


def _strip_note_emphasis(raw: str) -> tuple[str, list[str]]:
    """Remove emphasis that annotates a player, keep emphasis that *is* the name.

    Some files bold the starter ("**Caden Pinnick** (Rs-So.) — **confirmed**"),
    others bold a remark about him ("AJ Miller (R-So.) **co-starter**"). A bold
    run counts as a name when nothing but a jersey number stands between it and
    the start of its player — that is, the start of the cell or the last
    separator. Everything else is a note.
    """
    notes: list[str] = []
    out: list[str] = []
    last = 0
    for match in _BOLD_RE.finditer(raw):
        before = raw[last : match.start()]
        tail = _SEPARATOR_PROBE_RE.split(before)[-1].strip()
        if not tail or _JERSEY_ONLY_RE.match(tail):
            out.append(before + match.group(0))
        else:
            notes.append(match.group(1).strip())
            out.append(before + " ")
        last = match.end()
    out.append(raw[last:])
    return "".join(out), notes

#: A comma separates co-listed players in some files ("JV Gibson, Giyahni
#: Kontosis, Isaiah Johnson") and merely punctuates prose in others ("Samaj
#: Jones battling for No. 2, PROJECTED"). Splitting on it is therefore
#: all-or-nothing: the cell is only split when *every* resulting piece reads as
#: a person's name. A wrong split invents players, which is worse than leaving
#: a rare cell unsplit.
_COMMA_SPLIT_RE = re.compile(r",\s+(?!\s*(?:Jr|Sr|II|III|IV|V)\b)")
_NAME_PARTICLES = {"de", "la", "van", "von", "del", "da", "st", "jr", "sr", "ii", "iii", "iv", "v"}


def _looks_like_name(text: str) -> bool:
    text = _PAREN_ANY_RE.sub(" ", mdtable.strip_markdown(text))
    # A leading jersey number is part of the cell's formatting, not the name.
    text = re.sub(r"^\s*#\s*\d{1,2}\s+", "", text)
    tokens = [token for token in text.strip(" .").split() if token]
    if not 1 <= len(tokens) <= 5:
        return False
    if any("|" in token for token in tokens):
        return False
    for token in tokens:
        bare = token.strip(".'\u2019\"-")
        if not bare:
            return False
        if bare.lower() in _NAME_PARTICLES:
            continue
        if not bare[0].isupper():
            return False
    return True


def _comma_split(piece: str) -> list[str]:
    parts = [part.strip() for part in _COMMA_SPLIT_RE.split(piece) if part.strip()]
    if len(parts) < 2 or not all(_looks_like_name(part) for part in parts):
        return [piece]
    return parts


#: Some cells run players together with only a jersey number between them:
#: "Parker Almanza #88 Kai Wesley #43 Brody Wilhelm".
_JERSEY_BOUNDARY_RE = re.compile(r"\s+(?=#\s*\d{1,2}\s+[A-Z])")


def _jersey_split(piece: str) -> list[str]:
    parts = [part.strip() for part in _JERSEY_BOUNDARY_RE.split(piece) if part.strip()]
    return parts or [piece]

#: Emphasis in a depth cell is an annotation about the player, never the name:
#: "#84 AJ Miller (R-So.) **co-starter**", "Mitch Griffis (#12) **OFFICIAL
#: Week 1 starter** OR Emory Williams".
_BOLD_RE = re.compile(r"\*\*([^*]+)\*\*")
_STAR_RATING_RE = re.compile(r"(?:★\s*\d|\d\s*★)")


def _split_cell(cell: str | None) -> list[tuple[str, str | None]]:
    """Split one depth cell into ``(name, annotation)`` pairs.

    Operates on the raw Markdown so a bolded annotation can be told apart from
    the name. Stripping the emphasis first would leave "Mitch Griffis OFFICIAL
    Week 1 starter" as a player's name — which then reads as a different person
    from the same player in the other source file.
    """
    if cell is None:
        return []
    raw = str(cell).strip()
    if not raw:
        return []

    raw = _BOLD_OR_RE.sub(" OR ", raw)
    raw, notes = _strip_note_emphasis(raw)

    pieces: list[str] = []
    for piece in _PLAYER_SPLIT_RE.split(raw):
        piece = piece.strip()
        if not piece:
            continue
        for part in _comma_split(piece):
            pieces.extend(_jersey_split(part))

    out: list[tuple[str, str | None]] = []
    for piece in pieces:
        name = _STAR_RATING_RE.sub(" ", piece)
        name = mdtable.strip_markdown(name)
        name = name.strip(" -—–,;")
        # A piece may itself be a recorded gap — "Jones OR —", or "Not listed
        # (Ourlads)", where the parenthetical names the source of the absence.
        bare = mdtable.clean(_PAREN_ANY_RE.sub("", name))
        if bare is None:
            continue
        # Several files put commentary in the depth cell ("OFFICIAL team chart
        # lists Brock Spalding as Slot starter"). That is a note about the
        # position, not a player: emitting it as one would invent a person.
        if not _looks_like_name(bare):
            notes.append(bare)
            continue
        out.append((name, None))
    # The cell's notes describe the first-listed player ("confirmed",
    # "co-starter", "OFFICIAL Week 1 starter"), so they attach there.
    if out and notes:
        out[0] = (out[0][0], "; ".join(notes))
    return out


# --------------------------------------------------------------------------
# Per-team file: ordered depth plus scheme labels
# --------------------------------------------------------------------------


def _team_file_chart(text: str, source: str) -> dict:
    section = mdtable.find_section(
        text, lambda title: "starter depth chart" in title.lower(), 2
    )
    if section is None:
        return {"units": [], "schemes": {}}

    units: list[dict] = []
    schemes: dict[str, str | None] = {}
    for sub in section.subsections(3):
        unit = _unit_of(sub.title)
        if unit is None:
            continue
        scheme = _scheme(sub.title)
        schemes.setdefault(unit, scheme)
        positions: list[dict] = []
        for table in sub.tables():
            if not table.headers or table.headers[0].lower() not in {"pos", "position"}:
                continue
            depth_columns: list[tuple[str, int]] = []
            for header in table.headers[1:]:
                rank = _depth_rank(header)
                if rank is not None:
                    depth_columns.append((header, rank))
            # Raw rows, so a bolded annotation stays distinguishable from a name.
            for raw_record in table.raw_records():
                position = mdtable.clean(raw_record.get(table.headers[0]))
                if not position:
                    continue
                depth: list[dict] = []
                for header, rank in depth_columns:
                    cell = raw_record.get(header)
                    entries = _split_cell(cell)
                    if not entries:
                        continue
                    depth.append(
                        {
                            "rank": rank,
                            "players": [
                                _player(name, note=note) for name, note in entries
                            ],
                            "co_listed": len(entries) > 1,
                        }
                    )
                if depth:
                    positions.append({"position": position, "depth": depth})
        if positions:
            units.append({"unit": unit, "scheme": scheme, "positions": positions})

    return {
        "units": units,
        "schemes": schemes,
        "status": textutil.status_from_text(section.body),
        "injury_notes": [
            mdtable.strip_markdown(match)
            for match in _INJ_RE.findall(text)
        ],
        "suspension_notes": [
            mdtable.strip_markdown(match)
            for match in _SUS_RE.findall(text)
        ],
        "source": source,
    }


# --------------------------------------------------------------------------
# Conference summary: enriched starters, plus status and caveat
# --------------------------------------------------------------------------


def _summary_chart(section: mdtable.Section, source: str) -> dict:
    status_match = _STATUS_RE.search(section.body)
    caveat_match = _CAVEAT_RE.search(section.body)

    units: list[dict] = []
    schemes: dict[str, str | None] = {}
    for sub in section.subsections(3):
        unit = _unit_of(sub.title)
        if unit is None:
            continue
        scheme = _scheme(sub.title)
        schemes.setdefault(unit, scheme)

        positions: list[dict] = []
        for table in sub.tables():
            if not table.has_headers("Pos", "Name"):
                continue
            notes_header = next(
                (header for header in table.headers if header.lower().startswith("notes")),
                None,
            )
            class_header = next(
                (
                    header
                    for header in table.headers
                    if header.lower() in {"class year", "class"}
                ),
                None,
            )
            place_header = next(
                (
                    header
                    for header in table.headers
                    if "hometown" in header.lower() or "high school" in header.lower()
                ),
                None,
            )
            raw_rows = table.raw_records()
            for index_row, record in enumerate(table.records()):
                position = record.get("Pos")
                entries = _split_cell(raw_rows[index_row].get("Name"))
                if not position or not entries:
                    continue
                count = len(entries)
                stars = _parallel(record.get("Stars"), count)
                classes = _parallel(record.get(class_header), count) if class_header else [None] * count
                places = _parallel(record.get(place_header), count) if place_header else [None] * count
                note = record.get(notes_header) if notes_header else None

                starters = [
                    _player(
                        name,
                        stars=stars[index],
                        class_year=classes[index],
                        place=places[index],
                        note=entry_note,
                    )
                    for index, (name, entry_note) in enumerate(entries)
                ]
                depth = [
                    {"rank": 1, "players": starters, "co_listed": count > 1}
                ]
                backups = _BACKUP_RE.search(note or "")
                if backups:
                    backup_entries = [
                        entry
                        for entry in _split_cell(backups.group(1))
                        if entry[0].upper() not in _STATUS_WORDS
                    ]
                    if backup_entries:
                        depth.append(
                            {
                                "rank": 2,
                                "players": [
                                    _player(name, note=entry_note)
                                    for name, entry_note in backup_entries
                                ],
                                "co_listed": len(backup_entries) > 1,
                            }
                        )
                positions.append(
                    {"position": position, "depth": depth, "note": mdtable.clean(note)}
                )
        if positions:
            units.append({"unit": unit, "scheme": scheme, "positions": positions})

    return {
        "units": units,
        "schemes": schemes,
        "status": (
            mdtable.strip_markdown(status_match.group(1)).upper() if status_match else None
        ),
        "caveat": mdtable.strip_markdown(caveat_match.group(1)) if caveat_match else None,
        "source": source,
    }


# --------------------------------------------------------------------------


def _canonical_status(value: str | None) -> str | None:
    """OFFICIAL / MIXED / PROJECTED from the source's fuller label.

    The files write things like "OFFICIAL (with DL gap)" and "MIXED (QB
    confirmed; remainder projected)". The qualifier matters and is kept as
    status_raw; this is the value a filter can group on.
    """
    if not value:
        return None
    upper = value.upper()
    for label in ("OFFICIAL", "MIXED", "PROJECTED"):
        if upper.startswith(label):
            return label
    for label in ("OFFICIAL", "MIXED", "PROJECTED"):
        if label in upper:
            return label
    return None


def _starters(chart: dict) -> dict[tuple[str, str], list[str]]:
    out: dict[tuple[str, str], list[str]] = {}
    for unit in chart.get("units", []):
        for position in unit["positions"]:
            first = next((slot for slot in position["depth"] if slot["rank"] == 1), None)
            if first:
                out[(unit["unit"], position["position"])] = [
                    player["name"] for player in first["players"]
                ]
    return out


def _merge(team_chart: dict, summary_chart: dict) -> tuple[list[dict], list[dict]]:
    """Ordered depth from the team file, enriched with the summary's starters."""
    enrichment: dict[tuple[str, str], dict] = {}
    for unit in summary_chart.get("units", []):
        for position in unit["positions"]:
            first = next((slot for slot in position["depth"] if slot["rank"] == 1), None)
            for player in first["players"] if first else []:
                enrichment[(unit["unit"], _name_key(player["name"]))] = player

    units = team_chart.get("units") or summary_chart.get("units") or []
    for unit in units:
        for position in unit["positions"]:
            for slot in position["depth"]:
                for index, player in enumerate(slot["players"]):
                    extra = enrichment.get((unit["unit"], _name_key(player["name"])))
                    if not extra:
                        continue
                    for field in (
                        "stars",
                        "class",
                        "class_raw",
                        "high_school",
                        "city",
                        "state",
                        "hometown",
                        "previous_schools",
                    ):
                        if player.get(field) is None:
                            player[field] = extra.get(field)
                    slot["players"][index] = player

    conflicts: list[dict] = []
    team_starters = _starters(team_chart)
    summary_starters = _starters(summary_chart)
    for key, names in summary_starters.items():
        other = team_starters.get(key)
        if other is None:
            continue
        if {_name_key(name) for name in names} != {_name_key(name) for name in other}:
            conflicts.append(
                {
                    "unit": key[0],
                    "position": key[1],
                    "per_source": {
                        summary_chart["source"]: ", ".join(names),
                        team_chart["source"]: ", ".join(other),
                    },
                }
            )
    return units, conflicts


def build(package_root: Path, out_dir: Path, registry) -> dict:
    warnings: list[str] = []
    written: list[str] = []
    index_rows: list[dict] = []

    for directory, conference_stem in teams_lib.ROSTER_DIR_CONFERENCE.items():
        folder = package_root / "01-rosters" / directory
        if not folder.is_dir():
            warnings.append(f"missing roster directory: 01-rosters/{directory}")
            continue

        summary_path = folder / "01-starter-depth-charts-summary.md"
        summaries: dict[str, dict] = {}
        if summary_path.exists():
            summary_source = f"01-rosters/{directory}/01-starter-depth-charts-summary.md"
            summary_text = summary_path.read_text(encoding="utf-8")
            for section in mdtable.iter_sections(summary_text, level=1):
                heading = section.title
                numbered = _TEAM_HEADING_RE.match(heading)
                if numbered:
                    heading = numbered.group(1)
                slug = registry.resolve(heading)
                if slug is None:
                    continue
                summaries[slug] = _summary_chart(section, summary_source)
        else:
            warnings.append(f"missing depth-chart summary for {directory}")

        for path in sorted(folder.glob("*.md")):
            if path.name.startswith(("00-", "01-")) or "Complete" in path.name:
                continue
            team_source = f"01-rosters/{directory}/{path.name}"
            slug = registry.resolve(path.stem.replace("-", " "))
            if slug is None:
                warnings.append(f"{team_source}: filename does not resolve to a team")
                continue

            team_chart = _team_file_chart(path.read_text(encoding="utf-8"), team_source)
            summary_chart = summaries.get(slug) or {"units": [], "schemes": {}, "source": None}
            units, conflicts = _merge(team_chart, summary_chart)

            if not units:
                warnings.append(f"{slug}: no depth chart in either source")
                continue

            schemes = {
                "offense": team_chart["schemes"].get("offense")
                or summary_chart["schemes"].get("offense"),
                "defense": team_chart["schemes"].get("defense")
                or summary_chart["schemes"].get("defense"),
                "special_teams": team_chart["schemes"].get("special_teams")
                or summary_chart["schemes"].get("special_teams"),
            }
            status_raw = summary_chart.get("status") or team_chart.get("status")
            status = _canonical_status(status_raw)
            team = registry.get(slug)
            sources = [source for source in (team_source, summary_chart.get("source")) if source]

            payload = jsonio.envelope(
                dataset="depth-chart",
                generated_from=sources,
                as_of=AS_OF,
                notes=[
                    "status is the source's own label: OFFICIAL is a published team "
                    "two-deep, MIXED is partly confirmed, PROJECTED is a synthesis of "
                    "Ourlads and beat reporting. Do not present a PROJECTED chart as "
                    "a team's official depth chart.",
                    "Where the per-team file and the conference summary name different "
                    "starters, both are kept and the disagreement is listed in conflicts.",
                ],
                team={
                    "slug": slug,
                    "school": team.school,
                    "conference_slug": team.conference_slug,
                },
                status=status,
                status_raw=status_raw,
                status_caveat=summary_chart.get("caveat"),
                schemes=schemes,
                units=units,
                conflicts=conflicts,
                injury_notes=team_chart.get("injury_notes", []),
                suspension_notes=team_chart.get("suspension_notes", []),
            )
            jsonio.write_json(out_dir / "depth-charts" / f"{slug}.json", payload)
            written.append(f"depth-charts/{slug}.json")

            starters = sum(
                len(slot["players"])
                for unit in units
                for position in unit["positions"]
                for slot in position["depth"]
                if slot["rank"] == 1
            )
            index_rows.append(
                {
                    "slug": slug,
                    "school": team.school,
                    "conference_slug": team.conference_slug,
                    "status": status,
                    "status_raw": status_raw,
                    "offense_scheme": schemes["offense"],
                    "defense_scheme": schemes["defense"],
                    "positions": sum(len(unit["positions"]) for unit in units),
                    "starters": starters,
                    "conflicts": len(conflicts),
                    "sources": sources,
                }
            )

    index_rows.sort(key=lambda row: row["slug"])
    by_status: dict[str, int] = {}
    for row in index_rows:
        key = row["status"] or "unstated"
        by_status[key] = by_status.get(key, 0) + 1

    covered = {row["slug"] for row in index_rows}
    index = jsonio.envelope(
        dataset="depth-chart-index",
        generated_from=[
            f"01-rosters/{directory}/01-starter-depth-charts-summary.md"
            for directory in teams_lib.ROSTER_DIR_CONFERENCE
        ],
        as_of=AS_OF,
        notes=[
            "The package publishes depth charts for seven conferences only. "
            "teams_without_depth_chart names every other program; nothing has been "
            "filled in for them.",
        ],
        teams=index_rows,
        by_status=by_status,
        teams_without_depth_chart=sorted(
            team.slug for team in registry if team.slug not in covered
        ),
        totals={
            "teams": len(index_rows),
            "starters": sum(row["starters"] for row in index_rows),
            "conflicts": sum(row["conflicts"] for row in index_rows),
        },
    )
    jsonio.write_json(out_dir / "depth-charts" / "index.json", index)
    written.append("depth-charts/index.json")

    return {
        "artifacts": sorted(written),
        "counts": {
            "teams": len(index_rows),
            "starters": index["totals"]["starters"],
            "conflicts": index["totals"]["conflicts"],
            "official": by_status.get("OFFICIAL", 0),
            "projected": by_status.get("PROJECTED", 0),
        },
        "warnings": warnings,
    }
