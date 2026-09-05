#!/usr/bin/env python3
"""Integrity checks for the generated CFB Apex dataset.

    python3 tools/etl/validate.py           # check data/dist, exit 1 on error
    python3 tools/etl/validate.py --strict  # treat warnings as errors too

This is the gate that stands between the research package and cfbapex.com. It
does not check that the data is *good* — the sources decide that — it checks
that the build did not lose, invent, or mangle anything on the way through:

  * every artifact carries provenance naming real source files;
  * every team-scoped file belongs to a team in the registry, and vice versa;
  * no fixture-era placeholder names survive anywhere in the output;
  * cross-dataset references (opponents, poll entries, SOS rows) point at teams
    that exist;
  * counts in each index match the files the index claims to describe.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "tools" / "etl"))

from lib import teams as teams_lib  # noqa: E402

DEFAULT_DIST = REPO_ROOT / "data" / "dist"
DEFAULT_PACKAGE = REPO_ROOT / "data" / "source" / "cfb-2026-master-package"

#: Team names from the fixture pack the site is being moved off. If any of these
#: reaches data/dist, the transition has leaked and the build must fail.
FIXTURE_MARKERS = [
    "Red Mesa",
    "Blue Ridge State",
    "fixture-pack",
    "Lorem ipsum",
    "PLACEHOLDER",
    "TODO_FILL",
]

#: Datasets whose absence means the site cannot render its core pages.
REQUIRED_ARTIFACTS = [
    "index.json",
    "teams.json",
    "conferences.json",
]


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.checks = 0

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)

    def ok(self) -> None:
        self.checks += 1


def load(path: Path) -> object | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return exc


def check_json_parses(dist: Path, report: Report) -> dict[Path, object]:
    """Every .json file must parse. Returns the parsed documents."""
    documents: dict[Path, object] = {}
    for path in sorted(dist.rglob("*.json")):
        value = load(path)
        if isinstance(value, json.JSONDecodeError):
            report.error(f"{path.relative_to(dist)}: invalid JSON ({value})")
            continue
        documents[path] = value
        report.ok()
    if not documents:
        report.error("data/dist contains no JSON artifacts — has the build run?")
    return documents


def check_required(dist: Path, report: Report) -> None:
    for name in REQUIRED_ARTIFACTS:
        if not (dist / name).exists():
            report.error(f"required artifact missing: {name}")
        else:
            report.ok()


def check_envelopes(dist: Path, documents: dict[Path, object], package: Path, report: Report) -> None:
    """Provenance must exist and must name source files that actually exist."""
    for path, document in documents.items():
        relative = path.relative_to(dist)
        if relative.name == "build-report.json":
            continue
        if not isinstance(document, dict):
            report.error(f"{relative}: top level is {type(document).__name__}, expected object")
            continue
        meta = document.get("meta")
        if not isinstance(meta, dict):
            report.error(f"{relative}: missing 'meta' provenance block")
            continue
        for field in ("dataset", "schema_version", "sources"):
            if field not in meta:
                report.error(f"{relative}: meta.{field} missing")
        for source in meta.get("sources", []):
            if not isinstance(source, str):
                report.error(f"{relative}: non-string entry in meta.sources")
                continue
            # Sources may be globs or comma-joined lists; check the literal ones.
            if any(char in source for char in "*,"):
                continue
            if not (package / source).exists():
                report.warn(f"{relative}: meta.sources names a missing file: {source}")
        report.ok()


def check_no_fixture_leakage(dist: Path, report: Report) -> None:
    """No fixture-pack team or placeholder token may survive into the payload.

    The ``meta`` block is exempt: envelope notes legitimately say things like
    "no placeholder teams", and flagging our own disclaimer would be absurd.
    """
    pattern = re.compile("|".join(re.escape(marker) for marker in FIXTURE_MARKERS), re.IGNORECASE)
    for path in sorted(dist.rglob("*.json")):
        document = json.loads(path.read_text(encoding="utf-8"))
        payload = document
        if isinstance(document, dict):
            payload = {key: value for key, value in document.items() if key != "meta"}
        match = pattern.search(json.dumps(payload, ensure_ascii=False))
        if match:
            report.error(
                f"{path.relative_to(dist)}: fixture-era placeholder {match.group(0)!r} "
                "found in production data"
            )
        else:
            report.ok()


def check_team_registry(dist: Path, package: Path, report: Report) -> set[str]:
    """teams.json must match the registry the parsers were handed."""
    path = dist / "teams.json"
    if not path.exists():
        return set()
    document = json.loads(path.read_text(encoding="utf-8"))
    listed = {team["slug"] for team in document.get("teams", [])}
    registry = teams_lib.build_registry(package)
    expected = {team.slug for team in registry}
    if listed != expected:
        for slug in sorted(expected - listed):
            report.error(f"teams.json is missing team {slug}")
        for slug in sorted(listed - expected):
            report.error(f"teams.json has unknown team {slug}")
    else:
        report.ok()

    for team in document.get("teams", []):
        for field in ("slug", "school", "conference", "conference_slug"):
            if not team.get(field):
                report.error(f"teams.json: {team.get('slug', '?')} has empty {field}")
    if len(expected) != 138:
        report.error(f"expected 138 FBS teams for 2026, registry has {len(expected)}")
    else:
        report.ok()
    return expected


def check_team_scoped_files(dist: Path, slugs: set[str], report: Report) -> None:
    """Files named by slug must name a real team."""
    for directory in ("rosters", "depth-charts", "schedules", "coaching"):
        folder = dist / directory
        if not folder.is_dir():
            continue
        for path in sorted(folder.glob("*.json")):
            if path.stem in {"index", "season"}:
                continue
            if path.stem not in slugs:
                report.error(f"{directory}/{path.name}: not a known team slug")
            else:
                report.ok()


def check_cross_references(dist: Path, slugs: set[str], report: Report) -> None:
    """Any *_slug field anywhere must point at a team that exists."""
    offenders: dict[str, set[str]] = defaultdict(set)

    def walk(node: object, origin: str) -> None:
        if isinstance(node, dict):
            for key, value in node.items():
                if key.endswith("_slug") and isinstance(value, str) and value:
                    if key == "conference_slug":
                        continue
                    if value not in slugs:
                        offenders[origin].add(f"{key}={value}")
                else:
                    walk(value, origin)
        elif isinstance(node, list):
            for item in node:
                walk(item, origin)

    for path in sorted(dist.rglob("*.json")):
        if path.name == "build-report.json":
            continue
        document = json.loads(path.read_text(encoding="utf-8"))
        walk(document, str(path.relative_to(dist)))

    for origin, bad in sorted(offenders.items()):
        sample = ", ".join(sorted(bad)[:5])
        more = f" (+{len(bad) - 5} more)" if len(bad) > 5 else ""
        report.error(f"{origin}: unknown team slug reference: {sample}{more}")
    if not offenders:
        report.ok()


def check_index_consistency(dist: Path, report: Report) -> None:
    """A directory's index.json must describe the files that are actually there."""
    for folder in sorted(p for p in dist.iterdir() if p.is_dir()):
        index_path = folder / "index.json"
        if not index_path.exists():
            continue
        index = json.loads(index_path.read_text(encoding="utf-8"))
        listed = index.get("teams")
        if not isinstance(listed, list):
            report.ok()
            continue
        indexed = {
            entry.get("slug")
            for entry in listed
            if isinstance(entry, dict) and entry.get("slug")
        }
        on_disk = {
            path.stem
            for path in folder.glob("*.json")
            if path.stem not in {"index", "season"}
        }
        missing = on_disk - indexed
        phantom = indexed - on_disk
        for slug in sorted(missing):
            report.error(f"{folder.name}/index.json does not list {slug}, but the file exists")
        for slug in sorted(phantom):
            report.error(f"{folder.name}/index.json lists {slug}, but no such file exists")
        if not missing and not phantom:
            report.ok()


def check_null_discipline(dist: Path, report: Report) -> None:
    """Catch the classic gap-filling mistakes the sources forbid."""
    banned = {"not listed", "n/a", "na", "unknown", "tbd", "—", "--", "-"}
    hits: dict[str, int] = defaultdict(int)

    def walk(node: object, origin: str) -> None:
        if isinstance(node, dict):
            for key, value in node.items():
                # Free-text fields legitimately quote the source's own wording.
                if key in {
                    "raw",
                    "notes",
                    "note",
                    "description",
                    "title_raw",
                    "role_raw",
                    "class_raw",
                    "status_raw",
                    "rank_raw",
                    "date_raw",
                    "source_row_raw",
                    "caveat",
                    "status_caveat",
                    "coverage_caveat",
                    "opponent_context",
                    "injury",
                    "team_raw",
                    "definition",
                    "timing",
                }:
                    continue
                if isinstance(value, str) and value.strip().lower() in banned:
                    hits[origin] += 1
                else:
                    walk(value, origin)
        elif isinstance(node, list):
            for item in node:
                walk(item, origin)

    for path in sorted(dist.rglob("*.json")):
        if path.name in {"build-report.json", "index.json"}:
            continue
        document = json.loads(path.read_text(encoding="utf-8"))
        walk(document, str(path.relative_to(dist)))

    for origin, count in sorted(hits.items(), key=lambda item: -item[1])[:20]:
        report.warn(
            f"{origin}: {count} field(s) hold a literal gap marker "
            "instead of null — the site will print 'N/A' twice"
        )
    if not hits:
        report.ok()


def check_determinism_markers(dist: Path, report: Report) -> None:
    """Lists that drive navigation must be sorted, or diffs churn every build."""
    teams_path = dist / "teams.json"
    if teams_path.exists():
        document = json.loads(teams_path.read_text(encoding="utf-8"))
        slugs = [team["slug"] for team in document.get("teams", [])]
        if slugs != sorted(slugs):
            report.error("teams.json: teams are not sorted by slug")
        else:
            report.ok()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--dist", type=Path, default=DEFAULT_DIST)
    parser.add_argument("--package", type=Path, default=DEFAULT_PACKAGE)
    parser.add_argument("--strict", action="store_true", help="warnings fail the run")
    args = parser.parse_args(argv)

    if not args.dist.is_dir():
        print(f"no dataset at {args.dist}; run tools/etl/build.py first", file=sys.stderr)
        return 1

    report = Report()
    documents = check_json_parses(args.dist, report)
    check_required(args.dist, report)
    check_envelopes(args.dist, documents, args.package, report)
    check_no_fixture_leakage(args.dist, report)
    slugs = check_team_registry(args.dist, args.package, report)
    check_team_scoped_files(args.dist, slugs, report)
    check_cross_references(args.dist, slugs, report)
    check_index_consistency(args.dist, report)
    check_null_discipline(args.dist, report)
    check_determinism_markers(args.dist, report)

    print(f"{report.checks} check group(s) passed over {len(documents)} artifact(s)")
    for warning in report.warnings:
        print(f"  warning: {warning}")
    for error in report.errors:
        print(f"  ERROR: {error}", file=sys.stderr)

    if report.errors:
        print(f"\n{len(report.errors)} error(s)", file=sys.stderr)
        return 1
    if args.strict and report.warnings:
        print(f"\n{len(report.warnings)} warning(s) with --strict", file=sys.stderr)
        return 1
    print("dataset OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
