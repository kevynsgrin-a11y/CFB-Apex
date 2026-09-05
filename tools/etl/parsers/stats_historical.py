"""Historical team, individual and advanced statistics.

Sources, all under ``02-stats/historical``:

  * ``csv/team/<season>_{offense,defense}_{total,passing,rushing}.csv`` — 2012-2025
  * ``csv/individual/<season>_<category>.csv``                          — 2012-2025
  * ``csv/advanced/fei_<year>.csv`` (2010-2025) and ``spplus_2025.csv``
  * ``README.md`` — provenance and caveats, carried into the envelopes

The user's ask was the previous ten seasons (2015-2025); the package holds more
than that, so everything available is shipped and ``index.json`` states the real
range per dataset rather than silently truncating.

Two source quirks drive the parsing:

  * The team CSVs put the full name and the site's abbreviation in one column —
    ``"North Texas N. Texas"``, ``"Ohio State Ohio St."`` — resolved by
    ``registry.resolve_stat_team``.
  * The individual CSVs suffix each player with a team code — ``"Drew
    Mestemaker UNT"``. Unknown codes are warned about once, not once per row,
    and the raw player string is always kept.

Values such as ``84t`` (a touchdown long) and ``--`` are not numbers. Each cell
is stored as a number where it is one and as the source's own string where it is
not, so nothing is lost to coercion and nothing is invented.
"""

from __future__ import annotations

import csv
import re
from collections import defaultdict
from pathlib import Path

from lib import jsonio

BASE = "02-stats/historical"
README = f"{BASE}/README.md"
AS_OF = "2026-09-05"

_TEAM_FILE_RE = re.compile(r"^(\d{4})_(offense|defense)_(total|passing|rushing)\.csv$")
_INDIVIDUAL_FILE_RE = re.compile(r"^(\d{4})_(.+)\.csv$")
_FEI_FILE_RE = re.compile(r"^fei_(\d{4})\.csv$")
_SPPLUS_FILE_RE = re.compile(r"^spplus_(\d{4})\.csv$")

#: FEI writes sub-1 ratings without a leading zero (".79"), so that form counts.
_NUMBER_RE = re.compile(r"^-?(?:[\d,]+(?:\.\d+)?|\.\d+)$")
#: SP+ writes "40.8 (2)" — a rating with its national rank.
_VALUE_RANK_RE = re.compile(r"^(-?[\d.]+)\s*\((\d+)\)$")


def _cell(value: str | None) -> float | int | str | None:
    """A number where the source wrote one, else its exact text, else None."""
    if value is None:
        return None
    text = value.strip()
    if not text or text in {"--", "-", "—", "N/A", "NA"}:
        return None
    if _NUMBER_RE.match(text):
        stripped = text.replace(",", "")
        if "." in stripped:
            return float(stripped)
        return int(stripped)
    return text


def _value_rank(value: str | None) -> tuple[float | None, int | None, str | None]:
    if value is None:
        return None, None, None
    text = value.strip()
    match = _VALUE_RANK_RE.match(text)
    if match:
        return float(match.group(1)), int(match.group(2)), text
    parsed = _cell(text)
    if isinstance(parsed, (int, float)):
        return float(parsed), None, text
    return None, None, text or None


_PLAYER_RE = re.compile(r"^(.*?)\s+([A-Z][A-Z0-9&.'-]{1,9})$")


def _split_player(value: str) -> tuple[str, str | None]:
    """"Drew Mestemaker UNT" -> ("Drew Mestemaker", "UNT")."""
    text = (value or "").strip()
    match = _PLAYER_RE.match(text)
    if match:
        return match.group(1).strip(), match.group(2)
    return text, None


def _read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        columns = list(reader.fieldnames or [])
        return columns, [dict(row) for row in reader]


def _readme_notes(package_root: Path) -> list[str]:
    path = package_root / README
    if not path.exists():
        return []
    notes: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped.startswith("**Principle:**") or stripped.startswith("**Compiled:**"):
            notes.append(re.sub(r"\*\*", "", stripped))
    return notes


def _build_team_seasons(
    package_root: Path, out_dir: Path, registry, warnings: list[str]
) -> dict[int, dict]:
    directory = package_root / BASE / "csv" / "team"
    if not directory.is_dir():
        warnings.append(f"missing directory: {BASE}/csv/team")
        return {}

    seasons: dict[int, dict] = defaultdict(
        lambda: {"teams": {}, "columns": {}, "sources": set()}
    )
    unresolved: dict[str, int] = defaultdict(int)

    for path in sorted(directory.glob("*.csv")):
        match = _TEAM_FILE_RE.match(path.name)
        if not match:
            warnings.append(f"unrecognised team CSV: {path.name}")
            continue
        season, side, split = int(match.group(1)), match.group(2), match.group(3)
        columns, rows = _read_csv(path)
        entry = seasons[season]
        entry["columns"].setdefault(side, {})[split] = columns
        entry["sources"].add(f"{BASE}/csv/team/{path.name}")

        for row in rows:
            raw_name = (row.get("Team") or "").strip()
            if not raw_name:
                continue
            slug = registry.resolve_stat_team(raw_name)
            if slug is None:
                unresolved[raw_name] += 1
            key = slug or f"?{raw_name}"
            team = entry["teams"].setdefault(
                key,
                {
                    "slug": slug,
                    "team_raw": raw_name,
                    "games": None,
                    "offense": {},
                    "defense": {},
                },
            )
            values = {
                column: _cell(row.get(column))
                for column in columns
                if column != "Team"
            }
            if team["games"] is None:
                team["games"] = values.get("Gms")
            team[side][split] = values

    for name, count in sorted(unresolved.items(), key=lambda item: -item[1]):
        warnings.append(f"team CSVs: unresolved team {name!r} ({count} rows)")

    notes = _readme_notes(package_root)
    for season, entry in seasons.items():
        teams = sorted(
            entry["teams"].values(),
            key=lambda team: (team["slug"] is None, team["slug"] or team["team_raw"]),
        )
        jsonio.write_json(
            out_dir / "stats" / "historical" / "team" / f"{season}.json",
            jsonio.envelope(
                dataset="historical-team-stats",
                generated_from=sorted(entry["sources"]),
                as_of=AS_OF,
                notes=notes
                + [
                    "columns preserves each CSV's own header text so a UI can render "
                    "headings it does not hard-code.",
                    "A null value means the source published none; it is never a zero.",
                ],
                season=season,
                columns=entry["columns"],
                teams=teams,
            ),
        )
    return seasons


def _build_individual_seasons(
    package_root: Path, out_dir: Path, registry, warnings: list[str]
) -> dict[int, dict]:
    directory = package_root / BASE / "csv" / "individual"
    if not directory.is_dir():
        warnings.append(f"missing directory: {BASE}/csv/individual")
        return {}

    seasons: dict[int, dict] = defaultdict(lambda: {"categories": {}, "sources": set()})
    unresolved: dict[str, int] = defaultdict(int)

    for path in sorted(directory.glob("*.csv")):
        match = _INDIVIDUAL_FILE_RE.match(path.name)
        if not match:
            warnings.append(f"unrecognised individual CSV: {path.name}")
            continue
        season, category = int(match.group(1)), match.group(2)
        columns, rows = _read_csv(path)
        entry = seasons[season]
        entry["sources"].add(f"{BASE}/csv/individual/{path.name}")

        leaders: list[dict] = []
        for position, row in enumerate(rows, start=1):
            raw_player = (row.get("Player") or "").strip()
            if not raw_player:
                continue
            name, code = _split_player(raw_player)
            slug = registry.resolve_player_code(code)
            if slug is None and code:
                unresolved[code] += 1
            leaders.append(
                {
                    "rank": position,
                    "player": name,
                    "player_raw": raw_player,
                    "team_slug": slug,
                    "team_code": code,
                    "values": {
                        column: _cell(row.get(column))
                        for column in columns
                        if column != "Player"
                    },
                }
            )
        entry["categories"][category] = {
            "columns": [column for column in columns if column != "Player"],
            "leaders": leaders,
        }

    for code, count in sorted(unresolved.items(), key=lambda item: -item[1]):
        warnings.append(
            f"individual CSVs: team code {code!r} does not map to an FBS program "
            f"({count} rows); player rows kept with a null team_slug"
        )

    notes = _readme_notes(package_root)
    for season, entry in seasons.items():
        jsonio.write_json(
            out_dir / "stats" / "historical" / "individual" / f"{season}.json",
            jsonio.envelope(
                dataset="historical-individual-leaders",
                generated_from=sorted(entry["sources"]),
                as_of=AS_OF,
                notes=notes
                + [
                    "Each category is the published top-25 extract, not a full "
                    "leaderboard.",
                    "A team_slug of null means the source's team code is not an FBS "
                    "program in the 2026 registry (an FCS school, or a program that "
                    "has since moved); the raw player string is preserved.",
                ],
                season=season,
                categories=entry["categories"],
            ),
        )
    return seasons


def _build_advanced(
    package_root: Path, out_dir: Path, registry, warnings: list[str]
) -> dict[int, dict]:
    directory = package_root / BASE / "csv" / "advanced"
    if not directory.is_dir():
        warnings.append(f"missing directory: {BASE}/csv/advanced")
        return {}

    seasons: dict[int, dict] = defaultdict(lambda: {"sources": set()})
    unresolved: dict[str, int] = defaultdict(int)

    def resolve(name: str) -> str | None:
        slug = registry.resolve(name)
        if slug is None:
            unresolved[name] += 1
        return slug

    for path in sorted(directory.glob("*.csv")):
        fei = _FEI_FILE_RE.match(path.name)
        spplus = _SPPLUS_FILE_RE.match(path.name)
        if not (fei or spplus):
            warnings.append(f"unrecognised advanced CSV: {path.name}")
            continue
        season = int((fei or spplus).group(1))
        _columns, rows = _read_csv(path)
        entry = seasons[season]
        entry["sources"].add(f"{BASE}/csv/advanced/{path.name}")

        if fei:
            entry["fei"] = [
                {
                    "rank": _cell(row.get("Rk")),
                    "slug": resolve(row.get("Team") or ""),
                    "team_raw": (row.get("Team") or "").strip() or None,
                    "record": (row.get("Rec") or "").strip() or None,
                    "fei": _cell(row.get("FEI")),
                    "ofei": _cell(row.get("OFEI")),
                    "dfei": _cell(row.get("DFEI")),
                }
                for row in rows
                if (row.get("Team") or "").strip()
            ]
        else:
            sp_rows = []
            for row in rows:
                if not (row.get("Team") or "").strip():
                    continue
                offense, offense_rank, offense_raw = _value_rank(row.get("Offense"))
                defense, defense_rank, defense_raw = _value_rank(row.get("Defense"))
                special, special_rank, special_raw = _value_rank(row.get("SpecTms"))
                sp_rows.append(
                    {
                        "rank": _cell(row.get("Rk")),
                        "slug": resolve(row.get("Team") or ""),
                        "team_raw": (row.get("Team") or "").strip() or None,
                        "record": (row.get("Rec") or "").strip() or None,
                        "sp_plus": _cell(row.get("SP+")),
                        "offense": offense,
                        "offense_rank": offense_rank,
                        "offense_raw": offense_raw,
                        "defense": defense,
                        "defense_rank": defense_rank,
                        "defense_raw": defense_raw,
                        "special_teams": special,
                        "special_teams_rank": special_rank,
                        "special_teams_raw": special_raw,
                    }
                )
            entry["sp_plus"] = sp_rows

    for name, count in sorted(unresolved.items(), key=lambda item: -item[1]):
        warnings.append(f"advanced CSVs: unresolved team {name!r} ({count} rows)")

    notes = _readme_notes(package_root)
    for season, entry in seasons.items():
        payload: dict = {"season": season}
        if "fei" in entry:
            payload["fei"] = entry["fei"]
        if "sp_plus" in entry:
            payload["sp_plus"] = entry["sp_plus"]
        jsonio.write_json(
            out_dir / "stats" / "historical" / "advanced" / f"{season}.json",
            jsonio.envelope(
                dataset="historical-advanced-stats",
                generated_from=sorted(entry["sources"]),
                as_of=AS_OF,
                notes=notes
                + [
                    "FEI and SP+ are independent ratings and are not comparable to "
                    "each other; SP+ splits carry the source's own parenthetical rank.",
                ],
                **payload,
            ),
        )
    return seasons


def build(package_root: Path, out_dir: Path, registry) -> dict:
    warnings: list[str] = []

    team_seasons = _build_team_seasons(package_root, out_dir, registry, warnings)
    individual_seasons = _build_individual_seasons(package_root, out_dir, registry, warnings)
    advanced_seasons = _build_advanced(package_root, out_dir, registry, warnings)

    all_seasons = sorted(
        set(team_seasons) | set(individual_seasons) | set(advanced_seasons), reverse=True
    )
    rows: list[dict] = []
    for season in all_seasons:
        team = team_seasons.get(season)
        individual = individual_seasons.get(season)
        advanced = advanced_seasons.get(season)
        resolved = (
            sum(1 for entry in team["teams"].values() if entry["slug"]) if team else 0
        )
        rows.append(
            {
                "season": season,
                "has_team": team is not None,
                "has_individual": individual is not None,
                "has_advanced": advanced is not None,
                "team_rows": len(team["teams"]) if team else 0,
                "teams_resolved": resolved,
                "teams_unresolved": (len(team["teams"]) - resolved) if team else 0,
                "individual_categories": len(individual["categories"]) if individual else 0,
                "advanced_tables": sorted(
                    key for key in (advanced or {}) if key in {"fei", "sp_plus"}
                ),
            }
        )

    team_years = sorted(team_seasons)
    index = jsonio.envelope(
        dataset="historical-index",
        generated_from=[README],
        as_of=AS_OF,
        notes=_readme_notes(package_root)
        + [
            "Seasons shipped: team and individual "
            + (f"{team_years[0]}-{team_years[-1]}" if team_years else "none")
            + ", advanced "
            + (
                f"{min(advanced_seasons)}-{max(advanced_seasons)}"
                if advanced_seasons
                else "none"
            )
            + ".",
            "This exceeds the ten-season window the site needs (2015-2025); nothing "
            "available in the package has been truncated.",
        ],
        seasons=rows,
        season_range={
            "team": [min(team_years), max(team_years)] if team_years else None,
            "individual": (
                [min(individual_seasons), max(individual_seasons)]
                if individual_seasons
                else None
            ),
            "advanced": (
                [min(advanced_seasons), max(advanced_seasons)] if advanced_seasons else None
            ),
        },
    )
    jsonio.write_json(out_dir / "stats" / "historical" / "index.json", index)

    artifacts = (
        [f"stats/historical/team/{season}.json" for season in sorted(team_seasons)]
        + [f"stats/historical/individual/{season}.json" for season in sorted(individual_seasons)]
        + [f"stats/historical/advanced/{season}.json" for season in sorted(advanced_seasons)]
        + ["stats/historical/index.json"]
    )

    return {
        "artifacts": artifacts,
        "counts": {
            "team_seasons": len(team_seasons),
            "individual_seasons": len(individual_seasons),
            "advanced_seasons": len(advanced_seasons),
            "team_rows": sum(len(entry["teams"]) for entry in team_seasons.values()),
            "leader_rows": sum(
                len(category["leaders"])
                for entry in individual_seasons.values()
                for category in entry["categories"].values()
            ),
        },
        "warnings": warnings,
    }
