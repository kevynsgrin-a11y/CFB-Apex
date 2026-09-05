"""Strength of schedule, 2026 and 2025 final.

Sources:
  * ``04-sos/00-sos-power-conferences-2026.md``  — SEC, Big Ten, ACC, Big 12
  * ``04-sos/01-sos-aac-indy-mac-cusa-2026.md``  — AAC, independents, MAC, CUSA
  * ``04-sos/espn-fpi-sos-2026-09-04.json`` and ``…-2025.json`` — ESPN's own rows
  * ``04-sos/00-executive-overview.md``          — the headline findings

These files publish **four different metrics** side by side: ESPN FPI SOS,
Phil Steele, opponent win percentage from 2025 records, and TeamRankings.
The source's own instruction is "do not mix without labels", so every metric
lands in its own field, carries its own definition, and records which file it
came from. A ``—`` means the publisher did not rank that team: it becomes
``null``, never a zero, and never a value borrowed from another metric.

Where the curated Markdown and the raw ESPN JSON disagree for a team, the
Markdown wins — the package's AGENTS.md says curated files beat raw scrapes —
and the disagreement is recorded in ``conflicts`` rather than hidden.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from lib import jsonio, mdtable, textutil

POWER_MD = "04-sos/00-sos-power-conferences-2026.md"
G5_MD = "04-sos/01-sos-aac-indy-mac-cusa-2026.md"
ESPN_2026 = "04-sos/espn-fpi-sos-2026-09-04.json"
ESPN_2025 = "04-sos/espn-fpi-sos-2025.json"
OVERVIEW = "04-sos/00-executive-overview.md"
COMBINED = "04-sos/SOS-2026-Combined.md"

AS_OF = "2026-09-05"

_PCT_RE = re.compile(r"\(([\d.]+)\s*%\)")
_RANK_RATING_RE = re.compile(r"^\s*(\d+)\s*/\s*([\d.]+)\s*$")

#: Column header (lowercased substring) -> the field it populates. Order matters:
#: the first rule whose needle appears in the header wins, so "sos 2025" is
#: checked before "sos".
_COLUMN_RULES: list[tuple[tuple[str, ...], str]] = [
    (("espn fpi sos 2025", "2025 final espn fpi sos", "espn fpi sos 2025 final"), "espn_2025"),
    (("tr sos 2025", "teamrankings 2025", "tr season sos 2025"), "tr_2025"),
    (("rem sos", "rem"), "espn_rem"),
    (("espn fpi sos", "espn fpi", "2026 espn fpi sos rank"), "espn_2026"),
    (("phil steele",), "steele"),
    (("opp win% rank", "opp win % rank"), "oppwin_rank"),
    (("opp win%", "opp win %"), "oppwin"),
    (("tr season sos", "teamrankings"), "tr_2026"),
    (("cfn spring", "cfn"), "cfn"),
    (("conference", "conf"), "conference"),
    (("metric",), "metric"),
    (("sources", "source"), "sources"),
    (("team",), "team"),
]

METRIC_DEFINITIONS = [
    {
        "key": "espn_fpi_sos_rank",
        "label": "ESPN FPI SOS",
        "definition": (
            "ESPN's rank of schedule strength among FBS teams from the perspective "
            "of an average FBS team. Rank 1 is the toughest schedule."
        ),
        "timing": "2026 rows last updated 2026-09-04; 2025 final from 2026-01-20.",
        "direction": "rank_asc",
        "source": ESPN_2026,
    },
    {
        "key": "espn_fpi_rem_sos_rank",
        "label": "ESPN FPI remaining SOS",
        "definition": "The same metric restricted to a team's remaining games.",
        "timing": "2026-09-04",
        "direction": "rank_asc",
        "source": ESPN_2026,
    },
    {
        "key": "phil_steele_rank",
        "label": "Phil Steele SOS",
        "definition": (
            "Steele's preseason SOS, combining his nine power-rating sets with a "
            "home/away adjustment. Not a prior-year opponent win percentage."
        ),
        "timing": "2026 preseason list, published summer 2026.",
        "direction": "rank_asc",
        "source": POWER_MD,
    },
    {
        "key": "opponent_win_pct_rank",
        "label": "Opponent win % (2025 records)",
        "definition": (
            "Sum of the 2025 records of a team's 2026 opponents — the classic "
            "NCAA-style opponent winning percentage. Higher win % is tougher."
        ),
        "timing": "Published June 2026 (SI CFB HQ / FBSchedules).",
        "direction": "rank_asc",
        "source": POWER_MD,
    },
    {
        "key": "teamrankings_rank",
        "label": "TeamRankings Season SOS",
        "definition": "TeamRankings' predictive Season SOS power rating; a higher rating is tougher.",
        "timing": "2026 current-season page; 2025 final dated 2026-01-20.",
        "direction": "rank_asc",
        "source": POWER_MD,
    },
    {
        "key": "cfn_spring_rank",
        "label": "CFN Spring 2026 SOS",
        "definition": "College Football News spring 2026 strength-of-schedule ranking.",
        "timing": "Spring 2026.",
        "direction": "rank_asc",
        "source": G5_MD,
    },
]


def _field_for(header: str) -> str | None:
    lowered = header.lower()
    for needles, field in _COLUMN_RULES:
        if any(needle in lowered for needle in needles):
            return field
    return None


def _rank_rating(value: str | None) -> tuple[int | None, float | None]:
    """Split a "23 / 9.9" cell into rank and rating."""
    text = mdtable.clean(value)
    if not text:
        return None, None
    match = _RANK_RATING_RE.match(text)
    if match:
        return int(match.group(1)), float(match.group(2))
    return textutil.parse_rank(text), None


def _opponent_win_pct(value: str | None) -> tuple[dict[str, int] | None, float | None]:
    """Split "92-61 (60.1%)" into a record and a percentage."""
    text = mdtable.clean(value)
    if not text:
        return None, None
    record = textutil.parse_record(text)
    match = _PCT_RE.search(text)
    return record, (round(float(match.group(1)) / 100, 5) if match else None)


def _is_sos_table(table: mdtable.Table) -> bool:
    fields = {_field_for(header) for header in table.headers}
    return "team" in fields and bool(
        fields & {"espn_2026", "espn_rem", "steele", "tr_2026", "cfn"}
    )


def _parse_markdown(
    package_root: Path, source: str, registry, warnings: list[str]
) -> dict[str, dict]:
    """Every SOS row in one Markdown file, keyed by team slug."""
    path = package_root / source
    if not path.exists():
        warnings.append(f"missing SOS source: {source}")
        return {}
    rows: dict[str, dict] = {}
    text = path.read_text(encoding="utf-8")

    for table in mdtable.tables(text):
        if not _is_sos_table(table):
            continue
        columns = {}
        for index, header in enumerate(table.headers):
            field = _field_for(header)
            if field and field not in columns:
                columns[field] = index
        records = table.records()
        for record in records:
            values = list(record.values())

            def cell(field: str) -> str | None:
                index = columns.get(field)
                return values[index] if index is not None and index < len(values) else None

            name = cell("team")
            if not name:
                continue
            # The membership and coverage tables reuse the header "Teams" for a
            # count ("14"), which is not a team name.
            if re.fullmatch(r"[\d,.]+", name):
                continue
            slug = registry.resolve(name)
            if slug is None:
                warnings.append(f"{source}: unresolved team {name!r}")
                continue

            tr_rank, tr_rating = _rank_rating(cell("tr_2026"))
            tr25_rank, tr25_rating = _rank_rating(cell("tr_2025"))
            opponent_record, opponent_pct = _opponent_win_pct(cell("oppwin"))

            entry = rows.setdefault(slug, {"slug": slug, "team_raw": name, "sources": {}})
            entry["conference"] = cell("conference") or entry.get("conference")

            def put(key: str, value, metric_source: str = source) -> None:
                if value is not None and entry.get(key) is None:
                    entry[key] = value
                    entry["sources"][key] = metric_source

            put("espn_fpi_sos_rank", textutil.parse_rank(cell("espn_2026")))
            put("espn_fpi_rem_sos_rank", textutil.parse_rank(cell("espn_rem")))
            put("phil_steele_rank", textutil.parse_rank(cell("steele")))
            put("opponent_win_pct_rank", textutil.parse_rank(cell("oppwin_rank")))
            put("opponent_record", opponent_record)
            put("opponent_win_pct", opponent_pct)
            put("teamrankings_rank", tr_rank)
            put("teamrankings_rating", tr_rating)
            put("cfn_spring_rank", textutil.parse_rank(cell("cfn")))
            put("espn_fpi_sos_rank_2025", textutil.parse_rank(cell("espn_2025")))
            put("teamrankings_rank_2025", tr25_rank)
            put("teamrankings_rating_2025", tr25_rating)
            # The G5 file names which metric its headline column actually is.
            metric = cell("metric")
            if metric and entry.get("primary_metric") is None:
                entry["primary_metric"] = metric
    return rows


def _parse_espn(package_root: Path, source: str, registry, warnings: list[str]) -> dict[str, dict]:
    path = package_root / source
    if not path.exists():
        warnings.append(f"missing SOS source: {source}")
        return {}
    document = json.loads(path.read_text(encoding="utf-8"))
    rows: dict[str, dict] = {}
    for conference, entries in (document.get("conferences") or {}).items():
        for entry in entries:
            slug = registry.resolve(entry.get("team"))
            if slug is None:
                warnings.append(f"{source}: unresolved team {entry.get('team')!r}")
                continue
            rows[slug] = {
                "slug": slug,
                "team_raw": entry.get("team"),
                "conference": entry.get("conf") or conference,
                "espn_fpi_sos_rank": entry.get("sos"),
                "espn_fpi_rem_sos_rank": entry.get("rem"),
                "espn_fpi_rank": entry.get("fpi_rk"),
                "sources": {
                    key: source
                    for key in ("espn_fpi_sos_rank", "espn_fpi_rem_sos_rank", "espn_fpi_rank")
                },
            }
    return rows


_TEMPLATE = {
    "espn_fpi_sos_rank": None,
    "espn_fpi_rem_sos_rank": None,
    "espn_fpi_rank": None,
    "phil_steele_rank": None,
    "opponent_win_pct_rank": None,
    "opponent_record": None,
    "opponent_win_pct": None,
    "teamrankings_rank": None,
    "teamrankings_rating": None,
    "cfn_spring_rank": None,
}


def _merge(markdown: dict[str, dict], espn: dict[str, dict]) -> tuple[list[dict], list[dict]]:
    """Markdown wins on conflict; the disagreement is recorded, not dropped."""
    conflicts: list[dict] = []
    merged: dict[str, dict] = {}

    for slug in sorted(set(markdown) | set(espn)):
        md = markdown.get(slug, {})
        raw = espn.get(slug, {})
        entry = dict(_TEMPLATE)
        entry.update(
            {
                "slug": slug,
                "team_raw": md.get("team_raw") or raw.get("team_raw"),
                "conference": md.get("conference") or raw.get("conference"),
                "sources": {},
            }
        )
        for key in _TEMPLATE:
            md_value = md.get(key)
            raw_value = raw.get(key)
            if md_value is not None and raw_value is not None and md_value != raw_value:
                conflicts.append(
                    {
                        "slug": slug,
                        "metric": key,
                        "markdown": md_value,
                        "espn_json": raw_value,
                        "resolution": "markdown",
                    }
                )
            if md_value is not None:
                entry[key] = md_value
                entry["sources"][key] = md["sources"].get(key)
            elif raw_value is not None:
                entry[key] = raw_value
                entry["sources"][key] = raw["sources"].get(key)
        for extra in (
            "espn_fpi_sos_rank_2025",
            "teamrankings_rank_2025",
            "teamrankings_rating_2025",
            "primary_metric",
        ):
            if md.get(extra) is not None:
                entry[extra] = md[extra]
        merged[slug] = entry
    return list(merged.values()), conflicts


def _overview_notes(package_root: Path) -> list[str]:
    path = package_root / OVERVIEW
    if not path.exists():
        return []
    notes: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped.startswith("- ") or stripped.startswith("* "):
            text = mdtable.strip_markdown(stripped[2:])
            if len(text) > 20:
                notes.append(text)
    return notes[:20]


def build(package_root: Path, out_dir: Path, registry) -> dict:
    warnings: list[str] = []

    markdown = _parse_markdown(package_root, POWER_MD, registry, warnings)
    for slug, entry in _parse_markdown(package_root, G5_MD, registry, warnings).items():
        if slug in markdown:
            for key, value in entry.items():
                if key == "sources":
                    markdown[slug]["sources"].update(value)
                elif markdown[slug].get(key) is None:
                    markdown[slug][key] = value
        else:
            markdown[slug] = entry

    espn_2026 = _parse_espn(package_root, ESPN_2026, registry, warnings)
    teams_2026, conflicts = _merge(markdown, espn_2026)

    payload_2026 = jsonio.envelope(
        dataset="strength-of-schedule",
        generated_from=[POWER_MD, G5_MD, ESPN_2026, OVERVIEW, COMBINED],
        as_of=AS_OF,
        notes=[
            "Four independent metrics. The sources' own rule is not to mix them "
            "without labels, so each keeps its own field and definition.",
            "Rank 1 is the toughest schedule for every rank metric here.",
            "Where the curated Markdown and ESPN's raw JSON disagree, the Markdown "
            "value is used and the disagreement is listed under conflicts.",
        ],
        metric_definitions=METRIC_DEFINITIONS,
        teams=sorted(teams_2026, key=lambda row: row["slug"]),
        conflicts=sorted(conflicts, key=lambda row: (row["slug"], row["metric"])),
    )

    espn_2025 = _parse_espn(package_root, ESPN_2025, registry, warnings)
    rows_2025: dict[str, dict] = {}
    for slug, entry in espn_2025.items():
        rows_2025[slug] = {
            "slug": slug,
            "team_raw": entry["team_raw"],
            "conference": entry["conference"],
            "espn_fpi_sos_rank": entry["espn_fpi_sos_rank"],
            "espn_fpi_rem_sos_rank": entry["espn_fpi_rem_sos_rank"],
            "espn_fpi_rank": entry["espn_fpi_rank"],
            "teamrankings_rank": None,
            "teamrankings_rating": None,
            "sources": entry["sources"],
        }
    # The power-conference file also carries 2025 final columns.
    for slug, entry in markdown.items():
        if entry.get("espn_fpi_sos_rank_2025") is None and entry.get("teamrankings_rank_2025") is None:
            continue
        row = rows_2025.setdefault(
            slug,
            {
                "slug": slug,
                "team_raw": entry.get("team_raw"),
                "conference": entry.get("conference"),
                "espn_fpi_sos_rank": None,
                "espn_fpi_rem_sos_rank": None,
                "espn_fpi_rank": None,
                "teamrankings_rank": None,
                "teamrankings_rating": None,
                "sources": {},
            },
        )
        if row["espn_fpi_sos_rank"] is None:
            row["espn_fpi_sos_rank"] = entry.get("espn_fpi_sos_rank_2025")
            row["sources"]["espn_fpi_sos_rank"] = POWER_MD
        row["teamrankings_rank"] = entry.get("teamrankings_rank_2025")
        row["teamrankings_rating"] = entry.get("teamrankings_rating_2025")
        if row["teamrankings_rank"] is not None:
            row["sources"]["teamrankings_rank"] = POWER_MD

    payload_2025 = jsonio.envelope(
        dataset="strength-of-schedule",
        generated_from=[ESPN_2025, POWER_MD],
        as_of="2026-01-20",
        notes=["2025 final strength of schedule, for season-over-season comparison."],
        metric_definitions=[
            definition
            for definition in METRIC_DEFINITIONS
            if definition["key"]
            in {"espn_fpi_sos_rank", "espn_fpi_rem_sos_rank", "teamrankings_rank"}
        ],
        teams=sorted(rows_2025.values(), key=lambda row: row["slug"]),
    )

    jsonio.write_json(out_dir / "sos" / "2026.json", payload_2026)
    jsonio.write_json(out_dir / "sos" / "2025.json", payload_2025)

    covered = {row["slug"] for row in teams_2026}
    missing = sorted(team.slug for team in registry if team.slug not in covered)

    def counted(key: str) -> int:
        return sum(1 for row in teams_2026 if row.get(key) is not None)

    index = jsonio.envelope(
        dataset="sos-index",
        generated_from=[POWER_MD, G5_MD, ESPN_2026, ESPN_2025, OVERVIEW],
        as_of=AS_OF,
        seasons=[
            {"season": 2026, "artifact": "sos/2026.json", "teams": len(teams_2026)},
            {"season": 2025, "artifact": "sos/2025.json", "teams": len(rows_2025)},
        ],
        coverage={
            definition["key"]: {
                "teams_with_value": counted(definition["key"]),
                "teams_missing": len(teams_2026) - counted(definition["key"]),
            }
            for definition in METRIC_DEFINITIONS
        },
        teams_without_sos=missing,
        conflicts=len(payload_2026["conflicts"]),
        headline_findings=_overview_notes(package_root),
    )
    jsonio.write_json(out_dir / "sos" / "index.json", index)

    if missing:
        warnings.append(
            f"{len(missing)} FBS teams have no 2026 SOS row in the package: "
            + ", ".join(missing[:12])
            + ("..." if len(missing) > 12 else "")
        )

    return {
        "artifacts": ["sos/2026.json", "sos/2025.json", "sos/index.json"],
        "counts": {
            "teams_2026": len(teams_2026),
            "teams_2025": len(rows_2025),
            "conflicts": len(payload_2026["conflicts"]),
            "teams_missing": len(missing),
        },
        "warnings": warnings,
    }
