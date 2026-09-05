"""AP and USA Today / US LBM Coaches Top 25.

Source: ``02-stats/00-top25-ap-coaches-2026-09-05.md``.

Two subtleties the site depends on and that are easy to get wrong:

* The ``—`` in the AP first-place-vote column means *zero votes*, not "unknown"
  — the Coaches table writes the same thing as ``0``. Every other ``—`` in this
  document does mean "not published", so the coercion is applied to that one
  column and nowhere else.
* Previous rank is ``NR`` in the Coaches table and equal-to-current in the AP
  table, because both are first ballots. Neither is a real prior ranking, so
  both become ``null`` with the source's wording kept alongside.
"""

from __future__ import annotations

import re
from pathlib import Path

from lib import jsonio, mdtable, textutil

SOURCE = "02-stats/00-top25-ap-coaches-2026-09-05.md"
AS_OF = "2026-09-05"

#: The first in-season AP poll, from the document's own status paragraph.
NEXT_AP_RELEASE = "2026-09-08T12:00:00-04:00"

_OTHERS_RE = re.compile(r"\*\*Others receiving votes[^:]*:\*\*\s*(.+)", re.IGNORECASE)
_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
_TIE_RE = re.compile(r"^T[-\s]?(\d+)$", re.IGNORECASE)


def _poll_key(title: str) -> str | None:
    lowered = title.lower()
    if "associated press" in lowered or lowered.startswith("1."):
        return "ap"
    if "coaches" in lowered:
        return "coaches"
    return None


def _metadata(section: mdtable.Section) -> dict[str, str | None]:
    """The ``| Field | Detail |`` block above each rankings table."""
    fields: dict[str, str | None] = {}
    for table in section.tables():
        if not table.has_headers("Field", "Detail"):
            continue
        for row in table.records():
            key = (row.get("Field") or "").strip().lower().replace(" ", "_")
            if key:
                fields[key] = row.get("Detail")
    return fields


def _rankings(table: mdtable.Table, registry, warnings: list[str], poll: str) -> list[dict]:
    rows: list[dict] = []
    for record in table.records():
        raw_rank = record.get("Rank")
        team_name = record.get("Team")
        if not team_name:
            continue
        tied = bool(raw_rank and _TIE_RE.match(raw_rank.strip()))
        slug = registry.resolve(team_name)
        if slug is None:
            warnings.append(f"{poll}: unresolved ranked team {team_name!r}")

        # This column, uniquely, writes zero as an em dash.
        votes_cell = record.get("First-place votes")
        first_place = 0 if votes_cell is None else textutil.parse_int(votes_cell)

        previous_cell = table.raw_records()[len(rows)].get("Previous rank", "")
        previous = textutil.parse_rank(previous_cell)

        rows.append(
            {
                "rank": textutil.parse_rank(raw_rank),
                "rank_raw": raw_rank or "",
                "tied": tied,
                "team": team_name,
                "team_slug": slug,
                "record": textutil.parse_record(record.get("Record")),
                "points": textutil.parse_int(record.get("Points")),
                "first_place_votes": first_place,
                "previous_rank": previous,
                "previous_rank_raw": mdtable.strip_markdown(previous_cell) or None,
            }
        )
    return rows


def _others_receiving_votes(body: str, registry, warnings: list[str], poll: str) -> list[dict]:
    match = _OTHERS_RE.search(body)
    if not match:
        return []
    out: list[dict] = []
    for entry in match.group(1).split(";"):
        text = mdtable.strip_markdown(entry).strip(" .")
        if not text:
            continue
        parts = text.rsplit(" ", 1)
        if len(parts) == 2 and parts[1].replace(",", "").isdigit():
            team, points = parts[0], textutil.parse_int(parts[1])
        else:
            team, points = text, None
        slug = registry.resolve(team)
        if slug is None:
            warnings.append(f"{poll}: unresolved others-receiving-votes team {team!r}")
        out.append({"team": team, "team_slug": slug, "points": points})
    return out


def _sources(section: mdtable.Section) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for line in section.body.splitlines():
        stripped = line.strip()
        if not stripped.startswith("-"):
            continue
        match = _LINK_RE.search(stripped)
        if match:
            out.append({"title": match.group(1).strip(), "url": match.group(2).strip()})
    return out


def _status_note(text: str) -> str | None:
    for line in text.splitlines():
        if line.startswith("**Status of polls:**"):
            return mdtable.strip_markdown(line.split(":", 1)[1])
    return None


def _comparison_notes(text: str) -> list[dict[str, str | None]]:
    section = mdtable.find_section(text, lambda title: title.startswith("Comparison notes"), 2)
    if not section:
        return []
    notes: list[dict[str, str | None]] = []
    for table in section.tables():
        if table.has_headers("Topic", "Finding"):
            for row in table.records():
                notes.append({"topic": row.get("Topic"), "finding": row.get("Finding")})
    return notes


def build(package_root: Path, out_dir: Path, registry) -> dict:
    path = package_root / SOURCE
    text = path.read_text(encoding="utf-8")
    warnings: list[str] = []

    polls: list[dict] = []
    for section in mdtable.iter_sections(text, level=2):
        key = _poll_key(section.title)
        if key is None:
            continue
        rankings_table = next(
            (t for t in section.tables() if t.has_headers("Rank", "Team", "Points")),
            None,
        )
        if rankings_table is None:
            warnings.append(f"{key}: no rankings table found under {section.title!r}")
            continue
        fields = _metadata(section)
        sources_section = next(
            (s for s in section.subsections(3) if "source" in s.title.lower()),
            None,
        )
        polls.append(
            {
                "poll": key,
                "name": fields.get("poll") or section.title,
                "release_date": fields.get("release_date")
                or fields.get("release_/_published_date"),
                "voters": textutil.parse_int(fields.get("voters")),
                "panel": fields.get("panel"),
                "points_system": fields.get("points_system"),
                "next_release": fields.get("next_scheduled_release"),
                "season_designation": fields.get("season_designation"),
                "rankings": _rankings(rankings_table, registry, warnings, key),
                "others_receiving_votes": _others_receiving_votes(
                    section.body, registry, warnings, key
                ),
                "sources": _sources(sources_section) if sources_section else [],
            }
        )

    for poll in polls:
        if len(poll["rankings"]) < 25:
            warnings.append(
                f"{poll['poll']}: only {len(poll['rankings'])} ranked teams parsed, expected 25+"
            )

    notes = [
        "Preseason polls. Neither poll had published a post-Week 0 update as of 2026-09-05.",
        "An em dash in the first-place-votes column means zero votes; elsewhere in this "
        "document it means the source published no value, and is carried through as null.",
        "Previous rank is not a real prior ranking on a first ballot (AP repeats the current "
        "rank, the Coaches Poll writes NR), so it is null with the source wording preserved.",
    ]

    payload = jsonio.envelope(
        dataset="polls",
        generated_from=SOURCE,
        as_of=AS_OF,
        notes=notes,
        polls=polls,
        comparison_notes=_comparison_notes(text),
        status={
            "preseason": True,
            "next_update": NEXT_AP_RELEASE,
            "note": _status_note(text),
        },
    )

    artifacts = [
        str(jsonio.write_json(out_dir / "polls" / "2026-preseason.json", payload).relative_to(out_dir)),
        str(jsonio.write_json(out_dir / "polls" / "latest.json", payload).relative_to(out_dir)),
    ]

    index = jsonio.envelope(
        dataset="polls-index",
        generated_from=SOURCE,
        as_of=AS_OF,
        available=[
            {
                "poll": poll["poll"],
                "name": poll["name"],
                "release_date": poll["release_date"],
                "ranked": len(poll["rankings"]),
                "others_receiving_votes": len(poll["others_receiving_votes"]),
                "unresolved": sum(
                    1 for row in poll["rankings"] if row["team_slug"] is None
                ),
            }
            for poll in polls
        ],
        latest="polls/latest.json",
    )
    artifacts.append(
        str(jsonio.write_json(out_dir / "polls" / "index.json", index).relative_to(out_dir))
    )

    return {
        "artifacts": artifacts,
        "counts": {
            "polls": len(polls),
            "ranked_teams": sum(len(poll["rankings"]) for poll in polls),
            "others_receiving_votes": sum(
                len(poll["others_receiving_votes"]) for poll in polls
            ),
        },
        "warnings": warnings,
    }
