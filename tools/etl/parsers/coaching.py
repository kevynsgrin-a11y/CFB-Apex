"""Coaching staffs and offensive / defensive schemes.

Sources: ``03-coaching/<conference>.md`` for the ten conference files. Together
they cover 136 of the 138 programs; the two independents have no coaching file
in the package and are named in the index rather than quietly missing.

Two things the sources do that shape this parser:

* A role cell may hold several people — ``"Kyle Richardson (Co-OC / Tight Ends);
  Matt Luke (Assistant Head Coach / Co-OC / Offensive Line)"`` — so one row can
  produce several staff entries, each keeping its own published title.
* A scheme cell is usually a sentence with its attribution attached. The whole
  sentence is kept as ``description``; a short ``label`` is extracted only when
  the text plainly names a scheme. Where the source says "Not listed", the label
  is ``null`` and the explanation is preserved. No scheme is ever guessed.
"""

from __future__ import annotations

import re
from pathlib import Path

from lib import jsonio, mdtable, teams as teams_lib

AS_OF = "2026-09-05"

_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
_FIRST_SEASON_RE = re.compile(r"\((\d+)(?:st|nd|rd|th)\s+season", re.IGNORECASE)
_TRAILING_TITLE_RE = re.compile(r"\s*\(([^)]*)\)\s*$")

#: Role label (normalised) -> role key. Checked longest-first so that
#: "Co-Offensive Coordinator" never matches the "Offensive Coordinator" rule.
_ROLE_RULES: list[tuple[str, str]] = [
    ("co-offensive coordinator", "co_oc"),
    ("co offensive coordinator", "co_oc"),
    ("co-defensive coordinator", "co_dc"),
    ("co defensive coordinator", "co_dc"),
    ("associate head coach", "other"),
    ("assistant head coach", "other"),
    ("special teams coordinator", "stc"),
    ("offensive coordinator", "oc"),
    ("defensive coordinator", "dc"),
    ("head coach", "hc"),
    ("quarterback", "qb"),
    ("qb coach", "qb"),
    ("running back", "rb"),
    ("rb coach", "rb"),
    ("wide receiver", "wr"),
    ("wr coach", "wr"),
]

#: Scheme labels worth surfacing as a filterable tag, longest match first so
#: "multiple 4-2-5" yields "4-2-5" only when no longer phrase applies.
_SCHEME_LABELS = [
    "air raid",
    "triple option",
    "flexbone",
    "wing-t",
    "spread option",
    "run and shoot",
    "run-and-shoot",
    "pistol",
    "pro-style",
    "pro style",
    "pro spread",
    "west coast",
    "smashmouth spread",
    "spread",
    "multiple",
    "3-3-5",
    "3-4",
    "4-2-5",
    "4-3",
    "4-4",
    "2-4-5",
    "5-2",
    "tite front",
    "bear front",
    "nickel",
    "odd stack",
    "even front",
]

#: Headings in these files that are prose, not programs.
_PROSE_MARKERS = (
    "completeness",
    "cross-conference",
    "cross-reference",
    "conference notes",
    "notes on",
    "source",
    "key source",
    "membership used",
    "gaps",
)


def _is_prose_heading(title: str) -> bool:
    lowered = title.lower()
    return any(marker in lowered for marker in _PROSE_MARKERS)


def _role_key(role: str) -> str:
    lowered = role.lower()
    for needle, key in _ROLE_RULES:
        if needle in lowered:
            return key
    return "other"


#: The conference files that use prose scheme lines bold the scheme itself:
#: ``Cronic's hybrid **Wing-T / option** with ...``. That is the author naming
#: the scheme, and is a better signal than any keyword list.
_BOLD_RE = re.compile(r"\*\*([^*]+)\*\*")
_LABEL_TRIM_RE = re.compile(r"^[\s\"'(]+|[\s\"').,;:]+$")


def _dashes(text: str) -> str:
    """Front labels are written with en dashes as often as hyphens ("3–3–5")."""
    return text.replace("–", "-").replace("—", "-").replace("−", "-")


def _scheme_label(text: str | None, raw: str | None = None) -> str | None:
    """A short scheme tag, only when the source plainly states one."""
    if not text:
        return None
    text = _dashes(text)
    raw = _dashes(raw) if raw else raw
    lowered = text.lower()
    if lowered.startswith("not listed"):
        return None

    # Prefer the source's own emphasis, when it is emphasising a scheme rather
    # than the words "Not listed".
    for match in _BOLD_RE.finditer(raw or ""):
        candidate = _LABEL_TRIM_RE.sub("", match.group(1))
        if not candidate or candidate.lower().startswith("not listed"):
            continue
        if len(candidate) > 40:
            continue
        if any(label in candidate.lower() for label in _SCHEME_LABELS) or re.search(
            r"\d-\d", candidate
        ):
            return candidate

    for label in _SCHEME_LABELS:
        if label in lowered:
            # Report the source's own casing for word labels, canonical for fronts.
            if label[0].isdigit():
                return label
            start = lowered.index(label)
            return text[start : start + len(label)]
    return None


#: Prose scheme lines, e.g. ``**Offensive scheme / plan of attack:** ...``.
_PROSE_SCHEME_RE = re.compile(
    r"^\s*\*\*\s*(Offensive|Defensive)\s+scheme[^:*]*:?\s*\*\*:?\s*(.+?)\s*$",
    re.IGNORECASE | re.MULTILINE,
)


def _prose_schemes(body: str) -> dict[str, dict[str, str | None]]:
    """Scheme lines for the conference files that use prose instead of rows."""
    out: dict[str, dict[str, str | None]] = {}
    for match in _PROSE_SCHEME_RE.finditer(body):
        side = "offense" if match.group(1).lower().startswith("off") else "defense"
        raw = match.group(2).strip()
        description = mdtable.strip_markdown(raw)
        out[side] = {"label": _scheme_label(description, raw), "description": description}
    return out


def _split_people(cell: str) -> list[str]:
    """Split a role cell holding several named coaches.

    Splits on ``;`` at paren depth zero only. A ``/`` inside these cells
    separates the parts of one person's title ("Co-OC / Tight Ends"), never two
    people — and a ``;`` *inside* parentheses belongs to an explanatory note,
    as in Boston College's "Not listed as a separate title (HC ... compilation;
    no discrete OC on bceagles.com ...)".
    """
    parts: list[str] = []
    current: list[str] = []
    depth = 0
    for char in cell:
        if char in "([":
            depth += 1
        elif char in ")]":
            depth = max(0, depth - 1)
        if char == ";" and depth == 0:
            parts.append("".join(current))
            current = []
            continue
        current.append(char)
    parts.append("".join(current))
    return [part.strip() for part in parts if part.strip()]


def _person(entry: str) -> tuple[str | None, str | None]:
    """Split "C. J. Spiller (Run Game Coordinator / Running Backs)" into parts."""
    text = mdtable.strip_markdown(entry).strip()
    if not text:
        return None, None
    if text.lower().startswith("not listed"):
        return None, text
    match = _TRAILING_TITLE_RE.search(text)
    if match:
        name = text[: match.start()].strip()
        return (name or None), text
    return text, text


def _sources(body: str) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for line in body.splitlines():
        if "primary source" not in line.lower() and "source" not in line.lower():
            continue
        for match in _LINK_RE.finditer(line):
            out.append({"title": match.group(1).strip(), "url": match.group(2).strip()})
        if out:
            break
    return out


def _staff_table(section: mdtable.Section) -> mdtable.Table | None:
    for table in section.tables():
        headers = [header.lower() for header in table.headers]
        if headers and headers[0] == "role":
            return table
    return None


def build(package_root: Path, out_dir: Path, registry) -> dict:
    warnings: list[str] = []
    written: list[str] = []
    index_rows: list[dict] = []

    for stem in teams_lib.CONFERENCE_FILES:
        source = f"03-coaching/{stem}.md"
        path = package_root / source
        if not path.exists():
            warnings.append(f"missing coaching file: {source}")
            continue
        text = path.read_text(encoding="utf-8")

        for section in mdtable.iter_sections(text, level=2):
            if _is_prose_heading(section.title):
                continue
            heading = re.sub(r"^\s*\d+\.\s*", "", section.title).split("*")[0].strip()
            slug = registry.resolve(heading)
            if slug is None:
                warnings.append(f"{source}: unresolved team heading {section.title!r}")
                continue
            table = _staff_table(section)
            if table is None:
                warnings.append(f"{source}: {slug} has no Role table")
                continue

            staff: list[dict] = []
            schemes = {
                "offense": {"label": None, "description": None},
                "defense": {"label": None, "description": None},
            }
            head_coach = {"name": None, "title_raw": None, "first_season": None}

            # Two published shapes: "| Role | 2026 |" (ACC, SEC, Sun Belt) and
            # "| Role | Name | Source notes |" (every other conference), which
            # carries its schemes as prose lines below the table instead of rows.
            value_header = next(
                (
                    header
                    for header in table.headers
                    if header.lower() in {"2026", "name", "coach"}
                ),
                table.headers[-1],
            )
            note_header = next(
                (header for header in table.headers if "note" in header.lower()),
                None,
            )
            raw_rows = table.raw_records()

            for position, record in enumerate(table.records()):
                role = record.get("Role")
                value = record.get(value_header)
                if not role:
                    continue
                lowered = role.lower()

                if "offensive scheme" in lowered:
                    schemes["offense"] = {
                        "label": _scheme_label(value, raw_rows[position].get(value_header)),
                        "description": value,
                    }
                    continue
                if "defensive scheme" in lowered:
                    schemes["defense"] = {
                        "label": _scheme_label(value, raw_rows[position].get(value_header)),
                        "description": value,
                    }
                    continue

                source_note = record.get(note_header) if note_header else None
                key = _role_key(role)
                if value is None:
                    # The source printed the row but recorded no person; keep the
                    # row so the site can show the role as explicitly unfilled.
                    staff.append(
                        {
                            "role_key": key,
                            "role_raw": role,
                            "name": None,
                            "title_raw": None,
                            "source_note": source_note,
                        }
                    )
                    continue

                for entry in _split_people(value):
                    name, title_raw = _person(entry)
                    staff.append(
                        {
                            "role_key": key,
                            "role_raw": role,
                            "name": name,
                            "title_raw": title_raw,
                            "source_note": source_note,
                        }
                    )
                    if key == "hc" and head_coach["name"] is None:
                        season = _FIRST_SEASON_RE.search(title_raw or "")
                        head_coach = {
                            "name": name,
                            "title_raw": title_raw,
                            "first_season": int(season.group(1)) if season else None,
                        }

            # Conferences without scheme rows state them as prose below the table.
            for side, scheme in _prose_schemes(section.body).items():
                if schemes[side]["description"] is None:
                    schemes[side] = scheme

            if not staff:
                warnings.append(f"{source}: {slug} produced no staff rows")

            team = registry.get(slug)
            payload = jsonio.envelope(
                dataset="coaching",
                generated_from=source,
                as_of=AS_OF,
                notes=[
                    "Scheme labels are extracted only where the source plainly states "
                    "one. A null label with a description means the source explained "
                    "why no base scheme is published; nothing is inferred.",
                ],
                team={
                    "slug": slug,
                    "school": team.school,
                    "conference_slug": team.conference_slug,
                },
                head_coach=head_coach,
                staff=staff,
                schemes=schemes,
                sources=_sources(section.body),
            )
            jsonio.write_json(out_dir / "coaching" / f"{slug}.json", payload)
            written.append(f"coaching/{slug}.json")

            def _first(role_key: str) -> str | None:
                return next(
                    (
                        member["name"]
                        for member in staff
                        if member["role_key"] == role_key and member["name"]
                    ),
                    None,
                )

            index_rows.append(
                {
                    "slug": slug,
                    "school": team.school,
                    "conference_slug": team.conference_slug,
                    "head_coach": head_coach["name"],
                    "oc": _first("oc") or _first("co_oc"),
                    "dc": _first("dc") or _first("co_dc"),
                    "stc": _first("stc"),
                    "offense_scheme": schemes["offense"]["label"],
                    "defense_scheme": schemes["defense"]["label"],
                    "staff_size": len(staff),
                    "source": source,
                }
            )

    index_rows.sort(key=lambda row: row["slug"])
    covered = {row["slug"] for row in index_rows}
    missing = sorted(team.slug for team in registry if team.slug not in covered)

    index = jsonio.envelope(
        dataset="coaching-index",
        generated_from=[f"03-coaching/{stem}.md" for stem in teams_lib.CONFERENCE_FILES],
        as_of=AS_OF,
        notes=[
            "The package's coaching files cover ten conferences. Teams listed in "
            "teams_without_coaching_file have no source file here and no staff data "
            "has been invented for them.",
        ],
        teams=index_rows,
        teams_without_coaching_file=missing,
        coverage={
            "teams": len(index_rows),
            "with_head_coach": sum(1 for row in index_rows if row["head_coach"]),
            "with_oc": sum(1 for row in index_rows if row["oc"]),
            "with_dc": sum(1 for row in index_rows if row["dc"]),
            "with_stc": sum(1 for row in index_rows if row["stc"]),
            "with_offense_scheme": sum(1 for row in index_rows if row["offense_scheme"]),
            "with_defense_scheme": sum(1 for row in index_rows if row["defense_scheme"]),
        },
    )
    jsonio.write_json(out_dir / "coaching" / "index.json", index)
    written.append("coaching/index.json")

    return {
        "artifacts": sorted(written),
        "counts": {
            "teams": len(index_rows),
            "staff_entries": sum(row["staff_size"] for row in index_rows),
            "with_offense_scheme": index["coverage"]["with_offense_scheme"],
            "with_defense_scheme": index["coverage"]["with_defense_scheme"],
            "teams_without_file": len(missing),
        },
        "warnings": warnings,
    }
