"""Per-team 2026 rosters, parsed from ``01-rosters/<conf>-2026/<team>.md``.

The research package carries one Markdown file per team for seven conferences
(92 files in all). Every file has a ``## Full Roster`` section, but the shape
below it varies a lot: some teams group players under ``### Quarterbacks`` and
friends, others publish one flat table; the column set differs per conference
("Class" vs "Class Year" vs "Recruitment / class year", "HS / Hometown" vs
"Hometown / HS" vs "High School and/or Hometown"), so every column here is
found by *header name*, never by position.

Nothing is invented. A cell the source marked "Not listed" becomes ``null`` and
is counted as a gap; a row that will not yield a name is kept in a warning
rather than dropped; players the source explicitly flagged as *not* on the
official athletics roster are carried in the same file with
``on_official_roster: false`` rather than merged into the roster proper.

SEC, Big Ten, Conference USA and the independents have no roster files in the
package at all. That is recorded in ``rosters/index.json`` under
``conferences_without_rosters`` -- it is a gap in the source, not in this build.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from lib import jsonio, mdtable, textutil

DATASET = "roster"

# --------------------------------------------------------------------------
# Front-matter extraction
# --------------------------------------------------------------------------

#: ``**Key:** value`` fields. Several files pack two or three onto one line
#: separated by ``|``, so the value runs to the next key or the end of the line.
_FIELD_KEY_RE = re.compile(r"\*\*\s*([^*\n]{1,60}?)\s*:\s*\*\*")

#: Front-matter keys carrying the file's "as of" date, normalised.
_DATE_KEYS = {
    "as of",
    "asof",
    "research date",
    "access date",
    "access date for research",
    "access research date",
    "accessed",
    "roster as of",
    "retrieved",
    "date",
}
_COACH_KEYS = {"head coach", "hc", "coach", "head football coach"}

#: Keys already promoted to their own JSON field, so not repeated in source_notes.
_PROMOTED_KEYS = _DATE_KEYS | _COACH_KEYS

#: A date stated as prose rather than as a bolded key, e.g.
#: ``Access date for all web sources: **September 4-5, 2026** (UTC / PT).``
_PROSE_DATE_RE = re.compile(
    r"^[^|\n]*\b(?:access|research)\s+date[^:\n]*:\s*(.+?)\s*$",
    re.IGNORECASE | re.MULTILINE,
)

_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}
_DATE_RE = re.compile(
    r"\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+"
    r"(\d{1,2})(?:\s*[-\u2013\u2014]\s*\d{1,2})?\s*,?\s+(\d{4})",
    re.IGNORECASE,
)
_ISO_DATE_RE = re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b")


def _norm_key(key: str) -> str:
    return re.sub(r"[^a-z ]+", " ", key.lower()).strip()


def _fields(text: str) -> list[tuple[str, str]]:
    """Every ``**Key:** value`` pair in ``text``, in document order."""
    out: list[tuple[str, str]] = []
    matches = list(_FIELD_KEY_RE.finditer(text))
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        chunk = text[match.end() : end].split("\n", 1)[0]
        out.append((match.group(1).strip(), chunk.strip().strip("|").strip()))
    return out


def _iso_date(text: str | None) -> str | None:
    """ISO date for "Sept 4, 2026 (PT)" / "September 4-5, 2026" (first day)."""
    if not text:
        return None
    iso = _ISO_DATE_RE.search(text)
    if iso:
        return iso.group(0)
    match = _DATE_RE.search(text)
    if not match:
        return None
    month = _MONTHS.get(match.group(1)[:3].lower())
    if month is None:
        return None
    day = int(match.group(2))
    if not 1 <= day <= 31:
        return None
    return f"{int(match.group(3)):04d}-{month:02d}-{day:02d}"


def _front_matter(text: str) -> str:
    """The block above the first ``## `` heading."""
    return re.split(r"^##\s", text, maxsplit=1, flags=re.MULTILINE)[0]


def _meta_zone(text: str) -> str:
    """Everything a file states about itself before the roster tables start."""
    match = re.search(r"^##\s+Full Roster", text, re.IGNORECASE | re.MULTILINE)
    zone = text[: match.start()] if match else text
    return "\n".join(line for line in zone.splitlines() if not _TABLE_LINE_RE.match(line))


def _lookup(text: str, keys: set[str]) -> str | None:
    for key, value in _fields(text):
        if _norm_key(key) in keys and value:
            return value
    return None


def _find_as_of(text: str) -> str | None:
    front = _front_matter(text)
    for zone in (front, _meta_zone(text)):
        value = _lookup(zone, _DATE_KEYS)
        if value:
            return value
        prose = _PROSE_DATE_RE.search(zone)
        if prose:
            return mdtable.strip_markdown(prose.group(1)) or None
    return None


def _find_head_coach(text: str) -> str | None:
    for zone in (_front_matter(text), _meta_zone(text)):
        value = _lookup(zone, _COACH_KEYS)
        if value:
            return mdtable.clean(value)
    return None


# --------------------------------------------------------------------------
# Roster table columns
# --------------------------------------------------------------------------


def _letters(header: str) -> str:
    return re.sub(r"[^a-z]+", "", header.lower())


def _classify(header: str) -> str | None:
    """Which roster field a column header names, or ``None`` if unrecognised."""
    raw = header.strip().lower()
    key = _letters(raw)
    if key in {"name", "player", "playername", "athlete"}:
        return "name"
    if raw in {"#", "no.", "no", "#/no"} or key in {"no", "num", "number", "jersey"}:
        return "jersey"
    if "star" in key:
        return "stars"
    # "HS / Hometown (prev. school)" carries both -- the place column wins.
    if "hometown" in key or "highschool" in key or key in {"hs", "hshometown"}:
        return "hometown"
    if "class" in key or "recruitment" in key or key in {"year", "eligibility", "elig"}:
        return "class"
    if key.startswith("pos"):
        return "pos"
    if "prev" in key or "previous" in key or "transfer" in key:
        return "prev"
    if key in {"ht", "height"}:
        return "height"
    if key in {"wt", "weight"}:
        return "weight"
    if "note" in key or "source" in key or "comment" in key:
        return "notes"
    return None


def _column_map(headers: list[str]) -> dict[str, int]:
    """First column index for each recognised field."""
    mapping: dict[str, int] = {}
    for index, header in enumerate(headers):
        field = _classify(header)
        if field and field not in mapping:
            mapping[field] = index
    return mapping


def _hometown_first(header: str) -> bool:
    """True when the column is spelled "Hometown / HS", not "HS / Hometown"."""
    lowered = header.lower()
    town = lowered.find("hometown")
    school = min(
        (pos for pos in (lowered.find("high school"), lowered.find("hs")) if pos >= 0),
        default=-1,
    )
    if town < 0 or school < 0:
        return False
    return town < school


# --------------------------------------------------------------------------
# Hometown / high-school splitting
# --------------------------------------------------------------------------

#: Tokens that mark the tail of a "City, State" hometown. AP-style abbreviations
#: plus postal codes, the states that AP never abbreviates, and the countries and
#: provinces that turn up in these rosters.
_PLACE_TAILS = {
    "ala", "ariz", "ark", "calif", "colo", "conn", "del", "fla", "ga", "ill",
    "ind", "kan", "kans", "ky", "la", "md", "mass", "mich", "minn", "miss",
    "mo", "mont", "neb", "nebr", "nev", "nh", "nj", "nm", "ny", "nc", "nd",
    "okla", "ore", "pa", "ri", "sc", "sd", "tenn", "tex", "va", "vt", "wash",
    "wva", "wis", "wisc", "wyo", "dc",
    "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "hi", "ia", "id",
    "il", "in", "ks", "ma", "me", "mi", "mn", "ms", "mt", "ne", "nv", "oh",
    "ok", "or", "sw", "tn", "tx", "ut", "vi", "wa", "wi", "wv",
    "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
    "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho",
    "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana", "maine",
    "maryland", "massachusetts", "michigan", "minnesota", "mississippi",
    "missouri", "montana", "nebraska", "nevada", "ohio", "oklahoma", "oregon",
    "pennsylvania", "tennessee", "texas", "utah", "vermont", "virginia",
    "washington", "wisconsin", "wyoming",
    "australia", "canada", "germany", "nigeria", "england", "samoa",
    "ontario", "alberta", "quebec", "britishcolumbia", "newzealand", "japan",
    "france", "sweden", "denmark", "italy", "netherlands", "ghana", "kenya",
    "brazil", "mexico", "poland", "norway", "finland", "austria", "ireland",
    "scotland", "wales", "puertorico", "americansamoa", "guam", "tonga",
    "newsouthwales", "victoria", "queensland",
}

#: Words that mark a segment as a school rather than a place.
_SCHOOL_WORDS = (
    "hs", "h.s", "high", "academy", "prep", "school", "college", "institute",
    "christian", "catholic", "military", "seminary", "univ", "university",
    "j.c", "jc", "cc", "central", "academia",
)

_PAREN_RE = re.compile(r"\(([^)]*)\)")
_SEGMENT_RE = re.compile(r"\s*(?:/|;|\s—\s|\s–\s)\s*")
_PREV_PAREN_RE = re.compile(r"\(\s*prev\.?\b", re.IGNORECASE)


def _is_place(segment: str) -> bool:
    """Does this segment read as "City, State" rather than as a school name?"""
    if "," not in segment:
        return False
    tail = segment.rsplit(",", 1)[1]
    tail_key = re.sub(r"[^a-z]+", "", tail.lower())
    if tail_key in _PLACE_TAILS:
        return True
    # "Hawai'i", "Washington, D.C." and friends: a short alphabetic tail with no
    # school word in the segment still reads as a place.
    head_key = segment.rsplit(",", 1)[0].lower()
    if len(tail_key) <= 14 and tail_key and not any(word in head_key for word in ("school", "academy", "college")):
        return True
    return False


def _mask_parens(text: str) -> tuple[str, list[str]]:
    """Replace ``(...)`` groups with placeholders so they survive splitting."""
    stash: list[str] = []

    def take(match: re.Match) -> str:
        stash.append(match.group(0))
        return f"\x00{len(stash) - 1}\x00"

    return _PAREN_RE.sub(take, text), stash


def _unmask(text: str, stash: list[str]) -> str:
    return re.sub(r"\x00(\d+)\x00", lambda m: stash[int(m.group(1))], text).strip()


def _parse_place(cell: str | None, header: str) -> dict[str, str | None]:
    """Split a hometown / high-school cell into its parts.

    ``textutil.parse_hometown`` handles the common "HS / City, State (prev. X)"
    spelling. Several conferences invert the order or append previous colleges as
    extra ``/`` segments, so the orientation is decided from the *content* -- a
    segment ending in a US state is the hometown -- and only falls back to the
    column header when the content is ambiguous.
    """
    empty: dict[str, str | None] = {
        "high_school": None,
        "city": None,
        "state": None,
        "hometown": None,
        "previous_schools": None,
        "raw": None,
    }
    raw = mdtable.clean(cell)
    if raw is None:
        return empty

    previous: list[str] = []
    working = raw

    # "(prev. Georgia Tech // Anderson)" is explicit wherever it appears.
    explicit = textutil.parse_transfer(working)
    if explicit:
        previous.append(explicit)
        working = _PREV_PAREN_RE.sub("(", working)
        working = re.sub(r"\(\s*" + re.escape(explicit) + r"\s*\)", "", working).strip(" ;,/")

    # A header that says "(prev. school)" means a trailing "(...)" is a transfer list.
    header_declares_prev = "prev" in header.lower()
    masked, stash = _mask_parens(working)
    if header_declares_prev and stash:
        trailing = re.search(r"\x00(\d+)\x00\s*$", masked)
        if trailing:
            inner = stash[int(trailing.group(1))][1:-1].strip()
            if inner:
                previous.append(" // ".join(part.strip() for part in inner.split("/") if part.strip()))
            masked = masked[: trailing.start()].strip(" ;,/")

    segments = [_unmask(part, stash) for part in _SEGMENT_RE.split(masked) if part.strip()]
    segments = [segment.strip(" ,;") for segment in segments if segment.strip(" ,;")]
    if not segments:
        return {**empty, "raw": raw, "previous_schools": " // ".join(previous) or None}

    places = [segment for segment in segments if _is_place(segment)]
    others = [segment for segment in segments if not _is_place(segment)]

    hometown: str | None = None
    high_school: str | None = None
    if len(segments) == 1:
        if places:
            hometown = segments[0]
        else:
            high_school = segments[0]
    elif places and others:
        hometown = places[0]
        high_school = others[0]
        # Extra college names trailing a "(prev ...)" column are transfers.
        leftovers = [segment for segment in others[1:] if segment not in {high_school}]
        if header_declares_prev and segments.index(places[0]) < segments.index(others[0]):
            # "Union, S.C. / FIU / Stetson": hometown first, colleges after.
            high_school = None
            leftovers = others
        if leftovers:
            previous.append(" // ".join(leftovers))
    else:
        # Every segment reads the same way: trust the column header's order.
        if _hometown_first(header):
            hometown, high_school = segments[0], segments[1]
        else:
            high_school, hometown = segments[0], segments[1]

    city = state = None
    if hometown:
        if "," in hometown:
            head, _, tail = hometown.rpartition(",")
            city = head.strip() or None
            state = tail.strip() or None
        else:
            city = hometown.strip() or None

    return {
        "high_school": high_school or None,
        "city": city,
        "state": state,
        "hometown": hometown or None,
        "previous_schools": " // ".join(dict.fromkeys(previous)) or None,
        "raw": raw,
    }


# --------------------------------------------------------------------------
# Class year
# --------------------------------------------------------------------------

#: Spellings the shared table does not carry, seen in these roster files only.
#: Nothing here changes a value -- each entry is another way the sources write a
#: class the canonical table already knows.
_EXTRA_CLASS_YEARS = {
    "fifth year": "5TH",
    "fifth-year": "5TH",
    "5th year": "5TH",
    "5th-year": "5TH",
    "sixth year": "6TH",
    "6th year": "6TH",
    "6th-year": "6TH",
    "r-fr": "RFR",
    "rs fr": "RFR",
    "rs so": "RSO",
    "rs jr": "RJR",
    "rs sr": "RSR",
    "gr student": "GR",
    "grad student": "GR",
    "grad transfer": "GR",
}

_CLASS_SPLIT_RE = re.compile(r"\s*[;,]\s*|\s+/\s+")


def _parse_class(cell: str | None) -> tuple[str | None, str | None]:
    """Canonical class plus the source's own spelling.

    The cell may be a bare "Sr.", a recruiting year ("2024"), or a compound
    ("Jr. (JC); via Iowa Western JC", "2024 HS / Jr."). Each candidate chunk is
    tried in turn; a cell that yields nothing canonical keeps ``class = null``
    and its full text in ``class_raw`` rather than being guessed at.
    """
    raw = mdtable.clean(cell)
    if raw is None:
        return None, None

    candidates: list[str] = [raw]
    candidates.extend(part for part in _CLASS_SPLIT_RE.split(raw) if part.strip())
    candidates.extend(match.group(1) for match in _PAREN_RE.finditer(raw))

    for candidate in candidates:
        canonical, _ = textutil.parse_class_year(candidate)
        if canonical:
            return canonical, raw
    for candidate in candidates:
        probe = re.sub(r"[^a-z0-9 -]+", "", candidate.lower()).strip()
        if probe in _EXTRA_CLASS_YEARS:
            return _EXTRA_CLASS_YEARS[probe], raw
    return None, raw


_STAR_GLYPH_RE = re.compile(r"★+")


def _parse_stars(cell: str | None) -> int | None:
    """Stars, including the ``★★★`` glyph runs the shared helper does not read."""
    stars = textutil.parse_stars(cell)
    if stars is not None:
        return stars
    text = mdtable.clean(cell)
    if not text:
        return None
    match = _STAR_GLYPH_RE.search(text)
    if match and 1 <= len(match.group(0)) <= 5:
        return len(match.group(0))
    return None


# --------------------------------------------------------------------------
# Section walking
# --------------------------------------------------------------------------

_HEADING_RE = re.compile(r"^#{3,6}\s", re.MULTILINE)
_TABLE_LINE_RE = re.compile(r"^\s*\|")
_COUNT_SUFFIX_RE = re.compile(r"\s*\((\d+)\)\s*$")

#: Subsection titles that mark players the source says are NOT on the official
#: roster. "Secondary" on its own is a position group (defensive backs), so the
#: match is on these phrases, never on the bare word.
_OFF_ROSTER_MARKERS = (
    "secondary source",
    "secondary list",
    "not on official",
    "not on the official",
    "not confirmed",
    "unverified",
    "additional name",
    "not on athletics",
)

_DEFAULT_GROUP = "Full Roster"


def _is_off_roster(title: str) -> bool:
    lowered = title.lower()
    return any(marker in lowered for marker in _OFF_ROSTER_MARKERS)


def _group_name(title: str) -> str:
    return _COUNT_SUFFIX_RE.sub("", title).strip() or title.strip()


def _prose_lines(body: str) -> list[str]:
    """Non-table, non-heading lines -- format notes, counts, legends."""
    out: list[str] = []
    for line in body.splitlines():
        stripped = line.strip()
        if not stripped or _TABLE_LINE_RE.match(line) or stripped.startswith("#"):
            continue
        if set(stripped) <= set("-|: "):
            continue
        text = mdtable.strip_markdown(stripped)
        if text:
            out.append(text)
    return out


def _row_markdown(cells: list[str]) -> str:
    return "|" + "|".join(cells) + "|"


def _parse_table(
    table: mdtable.Table,
    group: str,
    on_official: bool,
    warnings: list[str],
    label: str,
) -> list[dict]:
    columns = _column_map(table.headers)
    name_index = columns.get("name")
    if name_index is None:
        warnings.append(
            f"{label}: table at line {table.line} has no Name column "
            f"(headers: {' | '.join(table.headers)}) -- {len(table.rows)} row(s) not parsed"
        )
        return []
    place_header = table.headers[columns["hometown"]] if "hometown" in columns else ""

    players: list[dict] = []
    for row in table.rows:
        def cell(field: str) -> str | None:
            index = columns.get(field)
            if index is None or index >= len(row):
                return None
            return row[index]

        name = mdtable.clean(cell("name"))
        raw_row = _row_markdown(row)
        if not name:
            warnings.append(f"{label}: unparsable row (no name) in '{group}': {raw_row.strip()}")
            continue

        place = _parse_place(cell("hometown"), place_header)
        column_prev = mdtable.clean(cell("prev"))
        previous = [value for value in (column_prev, place["previous_schools"]) if value]
        class_code, class_raw = _parse_class(cell("class"))

        players.append(
            {
                "name": name,
                "position": mdtable.clean(cell("pos")),
                "position_group": group,
                "stars": _parse_stars(cell("stars")),
                "class": class_code,
                "class_raw": class_raw,
                "jersey": textutil.parse_int(cell("jersey")),
                "height": mdtable.clean(cell("height")),
                "weight": mdtable.clean(cell("weight")),
                "high_school": place["high_school"],
                "city": place["city"],
                "state": place["state"],
                "hometown": place["hometown"],
                "previous_schools": " // ".join(dict.fromkeys(previous)) or None,
                "on_official_roster": on_official,
                "notes": mdtable.clean(cell("notes")),
                "source_row_raw": raw_row,
            }
        )
    return players


def _roster_blocks(section: mdtable.Section) -> list[tuple[str, str, bool]]:
    """``(group name, body, on_official_roster)`` in the order the file lists them."""
    heading = _HEADING_RE.search(section.body)
    preamble = section.body[: heading.start()] if heading else section.body
    blocks: list[tuple[str, str, bool]] = []
    if mdtable.tables(preamble):
        blocks.append((_DEFAULT_GROUP, preamble, True))
    for sub in section.subsections(3):
        blocks.append((_group_name(sub.title), sub.body, not _is_off_roster(sub.title)))
    return blocks


# --------------------------------------------------------------------------
# Per-team build
# --------------------------------------------------------------------------


def _source_notes(text: str, roster_section: mdtable.Section | None) -> list[str]:
    """Provenance the file states about itself, in document order."""
    notes: list[str] = []
    for key, value in _fields(_meta_zone(text)):
        label = mdtable.strip_markdown(key)
        body = mdtable.strip_markdown(value)
        if not label or _norm_key(label) in _PROMOTED_KEYS:
            continue
        notes.append(f"{label}: {body}" if body else label)

    for section in mdtable.sections(text, level=2):
        if not section.title.lower().startswith("source"):
            continue
        for table in section.tables():
            for record in table.records():
                parts = [
                    f"{header}: {value}"
                    for header, value in record.items()
                    if value and header.strip()
                ]
                if parts:
                    notes.append(" | ".join(parts))
        if not section.tables():
            notes.extend(_prose_lines(section.body))

    if roster_section is not None:
        notes.append(f"Roster section heading: {roster_section.title}")
        heading = _HEADING_RE.search(roster_section.body)
        preamble = roster_section.body[: heading.start()] if heading else roster_section.body
        notes.extend(_prose_lines(preamble))
        for sub in roster_section.subsections(3):
            if not sub.tables():
                notes.append(f"{sub.title}: " + " ".join(_prose_lines(sub.body)))

    seen: set[str] = set()
    return [note for note in notes if not (note in seen or seen.add(note))]


def _team_payload(
    path: Path,
    rel_path: str,
    team,
    warnings: list[str],
) -> dict:
    text = path.read_text(encoding="utf-8")
    label = f"{team.slug} ({rel_path})"

    as_of_raw = _find_as_of(text)
    as_of = _iso_date(as_of_raw)
    if as_of_raw and not as_of:
        warnings.append(f"{label}: could not read a date from 'As of: {as_of_raw}'")
    if not as_of_raw:
        warnings.append(f"{label}: no 'As of' / access-date line in the source; as_of is null")

    head_coach = _find_head_coach(text)
    if head_coach is None:
        warnings.append(f"{label}: no head-coach line in the source; head_coach is null")

    roster_section = None
    for section in mdtable.sections(text, level=2):
        if "full roster" in section.title.lower():
            roster_section = section
            break
    if roster_section is None:
        warnings.append(f"{label}: no '## Full Roster' section found")

    groups: list[dict] = []
    players: list[dict] = []
    if roster_section is not None:
        for group, body, on_official in _roster_blocks(roster_section):
            group_players: list[dict] = []
            for table in mdtable.tables(body):
                group_players.extend(
                    _parse_table(table, group, on_official, warnings, label)
                )
            if not group_players:
                continue
            groups.append(
                {
                    "name": group,
                    "on_official_roster": on_official,
                    "players": group_players,
                }
            )
            players.extend(group_players)

    if not players:
        warnings.append(f"{label}: parsed 0 players from '## Full Roster'")

    notes = [
        "Column meanings are detected by header name; the source's own row is kept "
        "verbatim in each player's source_row_raw.",
        "No source file in 01-rosters carries height or weight, so those fields are "
        "null for every player.",
    ]
    if as_of_raw:
        notes.append(f"Source states as of: {as_of_raw}")
    off_roster = [player for player in players if not player["on_official_roster"]]
    if off_roster:
        notes.append(
            f"{len(off_roster)} player(s) the source flagged as not on the official "
            "athletics roster are included with on_official_roster: false."
        )

    counts = {
        "players": len(players),
        "on_official_roster": len(players) - len(off_roster),
        "off_official_roster": len(off_roster),
        "position_groups": len(groups),
        "with_stars": sum(1 for player in players if player["stars"] is not None),
        "with_high_school": sum(1 for player in players if player["high_school"]),
        "with_hometown": sum(1 for player in players if player["hometown"]),
        "with_class": sum(1 for player in players if player["class_raw"]),
        "with_class_code": sum(1 for player in players if player["class"]),
        "with_jersey": sum(1 for player in players if player["jersey"] is not None),
        "with_previous_schools": sum(1 for player in players if player["previous_schools"]),
    }

    return jsonio.envelope(
        dataset=DATASET,
        generated_from=rel_path,
        as_of=as_of,
        notes=notes,
        team={
            "slug": team.slug,
            "school": team.school,
            "conference": team.conference,
            "conference_slug": team.conference_slug,
        },
        head_coach=head_coach,
        source_notes=_source_notes(text, roster_section),
        position_groups=groups,
        players=players,
        counts=counts,
    )


# --------------------------------------------------------------------------
# Entry point
# --------------------------------------------------------------------------


def build(package_root: Path, out_dir: Path, registry) -> dict:
    """Write ``rosters/<slug>.json`` for every team the catalog lists."""
    warnings: list[str] = []
    catalog_path = package_root / "catalog.json"
    if not catalog_path.is_file():
        return {
            "artifacts": [],
            "counts": {"teams": 0, "players": 0},
            "warnings": [f"missing source file: {catalog_path}"],
        }

    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    entries: list[tuple[str, str, str]] = []  # (conference key, catalog name, roster path)
    for key, conference in sorted(catalog.get("conferences", {}).items()):
        for entry in conference.get("teams", []):
            entries.append((key, entry.get("name", entry.get("slug", "")), entry.get("roster", "")))

    rows: list[dict] = []
    artifacts: list[str] = []
    totals = {
        "players": 0,
        "on_official_roster": 0,
        "off_official_roster": 0,
        "with_stars": 0,
        "with_high_school": 0,
        "with_hometown": 0,
        "with_class": 0,
        "with_jersey": 0,
    }
    seen_slugs: set[str] = set()

    for conference_key, name, rel_path in entries:
        if not rel_path:
            warnings.append(f"catalog entry '{name}' ({conference_key}) has no roster path")
            continue
        path = package_root / rel_path
        if not path.is_file():
            warnings.append(f"missing source file: {rel_path}")
            continue
        slug = registry.resolve(name)
        if slug is None:
            warnings.append(
                f"unmapped team name '{name}' from {rel_path} -- not in the team registry"
            )
            continue
        team = registry.get(slug)
        if slug in seen_slugs:
            warnings.append(f"duplicate roster file for {slug}: {rel_path}")
            continue
        seen_slugs.add(slug)

        payload = _team_payload(path, rel_path, team, warnings)
        artifact = f"rosters/{slug}.json"
        jsonio.write_json(out_dir / artifact, payload)
        artifacts.append(artifact)

        counts = payload["counts"]
        for field in totals:
            totals[field] += counts.get(field, 0)
        rows.append(
            {
                "slug": slug,
                "school": team.school,
                "conference_slug": team.conference_slug,
                "players": counts["players"],
                "with_stars": counts["with_stars"],
                "with_high_school": counts["with_high_school"],
                "source": rel_path,
            }
        )

    rows.sort(key=lambda row: row["slug"])
    covered = {row["slug"] for row in rows}
    covered_conferences = {
        team.conference_slug for team in registry if team.slug in covered
    }
    without = sorted(
        {team.conference_slug for team in registry} - covered_conferences
    )
    teams_without = sorted(team.slug for team in registry if team.slug not in covered)

    index_note = (
        "The research package publishes rosters for seven conferences only "
        f"({', '.join(sorted({row['conference_slug'] for row in rows}))}). "
        f"No roster file exists for {', '.join(without)} -- that is a gap in the "
        "source package, not a build failure, and nothing has been filled in for them."
    )
    index = jsonio.envelope(
        dataset="roster-index",
        generated_from=[entry[2] for entry in entries if entry[2]] + ["catalog.json"],
        as_of="2026-09-05",
        notes=[index_note],
        teams=rows,
        conferences_without_rosters=without,
        teams_without_rosters=teams_without,
        totals={
            **totals,
            "teams": len(rows),
            "teams_in_registry": len(registry),
        },
    )
    jsonio.write_json(out_dir / "rosters" / "index.json", index)
    artifacts.append("rosters/index.json")

    return {
        "artifacts": sorted(artifacts),
        "counts": {
            "teams": len(rows),
            "players": totals["players"],
            "off_official_roster": totals["off_official_roster"],
            "with_stars": totals["with_stars"],
            "with_high_school": totals["with_high_school"],
            "with_hometown": totals["with_hometown"],
            "teams_without_rosters": len(teams_without),
        },
        "warnings": warnings,
    }
