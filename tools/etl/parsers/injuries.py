"""Published injury / availability report.

Source: ``02-stats/01-injury-report-2026-09-05.md`` — h2 per conference, h3 per
team, each with a table of Player | Pos | Status | Injury / notes | Source.

The document's own coverage caveat is carried into every artifact, verbatim,
because it changes how the data must be read: most conferences mandate
availability reports only for *conference* games, Big Ten reports do not start
until mid-September 2026, and therefore **absence from this report is not
evidence that a roster is healthy**. A site that renders "no injuries" for a
team the report never covered would be stating something the source explicitly
refuses to state.

Statuses are normalised to a lowercase key for filtering, and the publisher's
exact wording is always kept beside it. A status is never upgraded, downgraded
or inferred.
"""

from __future__ import annotations

import re
from pathlib import Path

from lib import jsonio, mdtable

SOURCE = "02-stats/01-injury-report-2026-09-05.md"
AS_OF = "2026-09-05"

#: Longest-first, so "out for season" is not swallowed by "out".
_STATUS_RULES: list[tuple[str, str]] = [
    ("out for season", "out_for_season"),
    ("out for the season", "out_for_season"),
    ("season-ending", "out_for_season"),
    ("doubtful", "doubtful"),
    ("questionable", "questionable"),
    ("game-time decision", "questionable"),
    ("gtd", "questionable"),
    ("probable", "probable"),
    ("available", "available"),
    ("uncertain", "uncertain"),
    ("limited", "limited"),
    ("suspended", "suspended"),
    ("out", "out"),
]

#: Sections that are prose about the document rather than a team's report.
_PROSE_MARKERS = ("executive summary", "coverage gaps", "source list", "counts")

_CAVEAT_RE = re.compile(r"\*\*Coverage note:\*\*\s*(.+?)(?:\n\n|\Z)", re.DOTALL)
_NEVER_INVENT_RE = re.compile(r"\*\*Never invent:\*\*\s*(.+?)(?:\n\n|\Z)", re.DOTALL)


def _status_key(value: str | None) -> str | None:
    if not value:
        return None
    lowered = value.lower()
    for needle, key in _STATUS_RULES:
        if needle in lowered:
            return key
    return "other"


def _is_prose(title: str) -> bool:
    lowered = title.lower()
    return any(marker in lowered for marker in _PROSE_MARKERS)


def _opponent_context(body: str) -> str | None:
    """The italic line under each team heading naming the upcoming opponent."""
    for line in body.splitlines():
        stripped = line.strip()
        if stripped.startswith("*") and not stripped.startswith("**") and len(stripped) > 3:
            return mdtable.strip_markdown(stripped)
        if stripped.startswith("|"):
            break
    return None


def _caveat(text: str) -> str | None:
    match = _CAVEAT_RE.search(text)
    if match:
        return mdtable.strip_markdown(match.group(1))
    return None


def build(package_root: Path, out_dir: Path, registry) -> dict:
    path = package_root / SOURCE
    if not path.exists():
        return {
            "artifacts": [],
            "counts": {},
            "warnings": [f"missing injury source: {SOURCE}"],
        }

    text = path.read_text(encoding="utf-8")
    warnings: list[str] = []
    teams: list[dict] = []
    conferences: set[str] = set()

    for conference_section in mdtable.iter_sections(text, level=2):
        if _is_prose(conference_section.title):
            continue
        for team_section in conference_section.subsections(3):
            slug = registry.resolve(team_section.title)
            if slug is None:
                warnings.append(f"unresolved team heading {team_section.title!r}")
                continue
            table = next(
                (t for t in team_section.tables() if t.has_headers("Player", "Status")),
                None,
            )
            if table is None:
                warnings.append(f"{slug}: no Player/Status table")
                continue

            players: list[dict] = []
            for record in table.records():
                name = record.get("Player")
                if not name:
                    continue
                status_raw = record.get("Status")
                players.append(
                    {
                        "name": name,
                        "position": record.get("Pos"),
                        "status": _status_key(status_raw),
                        "status_raw": status_raw,
                        "injury": record.get("Injury / notes") or record.get("Injury"),
                        "source": record.get("Source"),
                    }
                )

            team = registry.get(slug)
            conferences.add(team.conference_slug)
            teams.append(
                {
                    "slug": slug,
                    "team_raw": team_section.title,
                    "conference_slug": team.conference_slug,
                    "opponent_context": _opponent_context(team_section.body),
                    "players": players,
                }
            )

    teams.sort(key=lambda entry: entry["slug"])

    caveat = _caveat(text) or (
        "Coverage is uneven: most conferences mandate availability reports only for "
        "conference games. Absence from this report is not evidence that a roster is healthy."
    )
    never_invent = _NEVER_INVENT_RE.search(text)

    notes = [
        caveat,
        "Absence from this report is NOT evidence that a roster is healthy — do not "
        "render 'no injuries' for a team the report does not cover.",
        "Statuses follow the publisher's own designations; none has been inferred.",
    ]
    if never_invent:
        notes.append(mdtable.strip_markdown(never_invent.group(1)))

    payload = jsonio.envelope(
        dataset="injuries",
        generated_from=SOURCE,
        as_of=AS_OF,
        notes=notes,
        as_of_date=AS_OF,
        teams=teams,
    )

    jsonio.write_json(out_dir / "injuries" / f"{AS_OF}.json", payload)
    jsonio.write_json(out_dir / "injuries" / "latest.json", payload)

    by_status: dict[str, int] = {}
    for team in teams:
        for player in team["players"]:
            key = player["status"] or "unspecified"
            by_status[key] = by_status.get(key, 0) + 1

    total = sum(len(team["players"]) for team in teams)
    index = jsonio.envelope(
        dataset="injuries-index",
        generated_from=SOURCE,
        as_of=AS_OF,
        notes=notes,
        teams_reporting=len(teams),
        players_listed=total,
        by_status=by_status,
        conferences_covered=sorted(conferences),
        teams_not_covered=sorted(
            team.slug
            for team in registry
            if team.slug not in {entry["slug"] for entry in teams}
        ),
        coverage_caveat=caveat,
        latest="injuries/latest.json",
    )
    jsonio.write_json(out_dir / "injuries" / "index.json", index)

    return {
        "artifacts": [
            f"injuries/{AS_OF}.json",
            "injuries/latest.json",
            "injuries/index.json",
        ],
        "counts": {
            "teams_reporting": len(teams),
            "players_listed": total,
            "conferences_covered": len(conferences),
        },
        "warnings": warnings,
    }
