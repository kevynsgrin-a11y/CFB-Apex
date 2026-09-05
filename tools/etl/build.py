#!/usr/bin/env python3
"""Build the CFB Apex production dataset from the vendored research package.

    python3 tools/etl/build.py                 # build everything into data/dist
    python3 tools/etl/build.py --only rosters  # rebuild one parser
    python3 tools/etl/build.py --check         # fail if the build is not reproducible

Each parser module under ``tools/etl/parsers`` exposes::

    def build(package_root: Path, out_dir: Path, registry) -> dict

and returns ``{"artifacts": [...], "counts": {...}, "warnings": [...]}``.
Nothing here invents data: where a source records a gap, the gap is carried
through to the JSON as ``null`` and counted in the build report.
"""

from __future__ import annotations

import argparse
import importlib
import shutil
import sys
import tempfile
import traceback
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
ETL_ROOT = REPO_ROOT / "tools" / "etl"
sys.path.insert(0, str(ETL_ROOT))

from lib import jsonio, teams  # noqa: E402

DEFAULT_PACKAGE = REPO_ROOT / "data" / "source" / "cfb-2026-master-package"
DEFAULT_OUT = REPO_ROOT / "data" / "dist"

#: Parser modules, in the order the site's nav depends on them.
PARSERS: list[str] = [
    "rosters",
    "depth_charts",
    "schedules",
    "polls",
    "sos",
    "coaching",
    "stats_current",
    "stats_historical",
    "injuries",
]


def build_core(package_root: Path, out_dir: Path, registry: teams.TeamRegistry) -> dict:
    """Write the team and conference registries every other dataset keys off."""
    jsonio.write_json(
        out_dir / "teams.json",
        jsonio.envelope(
            dataset="teams",
            generated_from="03-coaching/*.md, 02-stats/02-full-schedule-2026.md",
            as_of="2026-09-05",
            notes=[
                "138 FBS programs for the 2026 season: ten conference files plus "
                "the two independents named in the schedule document.",
            ],
            teams=registry.to_list(),
        ),
    )
    jsonio.write_json(
        out_dir / "conferences.json",
        jsonio.envelope(
            dataset="conferences",
            generated_from="03-coaching/*.md",
            as_of="2026-09-05",
            conferences=teams.conference_index(registry),
        ),
    )
    return {
        "artifacts": ["teams.json", "conferences.json"],
        "counts": {"teams": len(registry)},
        "warnings": [],
    }


def load_parser(name: str):
    try:
        return importlib.import_module(f"parsers.{name}")
    except ModuleNotFoundError as exc:
        if exc.name and exc.name.endswith(name):
            return None
        raise


def run(package_root: Path, out_dir: Path, only: list[str] | None) -> dict:
    if not package_root.is_dir():
        raise SystemExit(f"source package not found: {package_root}")
    registry = teams.build_registry(package_root)

    report: dict = {
        "package": str(package_root.relative_to(REPO_ROOT)),
        "datasets": {},
        "missing_parsers": [],
        "warnings": [],
    }

    if only is None:
        out_dir.mkdir(parents=True, exist_ok=True)
        report["datasets"]["core"] = build_core(package_root, out_dir, registry)

    for name in PARSERS:
        if only is not None and name not in only:
            continue
        module = load_parser(name)
        if module is None:
            report["missing_parsers"].append(name)
            print(f"  ~ {name}: not implemented yet, skipped", file=sys.stderr)
            continue
        try:
            result = module.build(package_root, out_dir, registry)
        except Exception:  # a parser failure must name itself, not abort silently
            print(f"  ! {name}: FAILED", file=sys.stderr)
            traceback.print_exc()
            report["datasets"][name] = {"error": traceback.format_exc(limit=3)}
            continue
        report["datasets"][name] = result
        counts = result.get("counts", {})
        summary = ", ".join(f"{key}={value}" for key, value in sorted(counts.items()))
        print(f"  + {name}: {summary or 'ok'}")
        for warning in result.get("warnings", []):
            report["warnings"].append(f"{name}: {warning}")

    if only is None:
        jsonio.write_json(out_dir / "build-report.json", report)
        _write_index(out_dir, report, registry)
    return report


def _write_index(out_dir: Path, report: dict, registry: teams.TeamRegistry) -> None:
    """Top-level manifest: what exists, how much of it, and where."""
    datasets = {
        name: {
            "counts": result.get("counts", {}),
            "artifacts": len(result.get("artifacts", [])),
        }
        for name, result in report["datasets"].items()
        if "error" not in result
    }
    jsonio.write_json(
        out_dir / "index.json",
        jsonio.envelope(
            dataset="index",
            generated_from="data/source/cfb-2026-master-package",
            as_of="2026-09-05",
            notes=[
                "Real 2026 FBS data compiled from published sources. No fixtures, "
                "no placeholder teams, no invented values.",
            ],
            datasets=datasets,
            team_count=len(registry),
            missing_parsers=report["missing_parsers"],
            warning_count=len(report["warnings"]),
        ),
    )


def check_reproducible(package_root: Path, out_dir: Path) -> int:
    """Rebuild into a temp dir and diff against the committed output."""
    with tempfile.TemporaryDirectory() as tmp:
        scratch = Path(tmp) / "dist"
        run(package_root, scratch, None)
        committed = {
            path.relative_to(out_dir): path.read_bytes()
            for path in sorted(out_dir.rglob("*.json"))
        }
        fresh = {
            path.relative_to(scratch): path.read_bytes()
            for path in sorted(scratch.rglob("*.json"))
        }
        # build-report.json embeds absolute-free paths only, but keep it out of
        # the comparison anyway: it is a log, not data.
        for mapping in (committed, fresh):
            mapping.pop(Path("build-report.json"), None)

        added = sorted(set(fresh) - set(committed))
        removed = sorted(set(committed) - set(fresh))
        changed = sorted(
            path for path in set(fresh) & set(committed) if fresh[path] != committed[path]
        )
        if not (added or removed or changed):
            print("data/dist is reproducible from data/source")
            return 0
        for path in added:
            print(f"  + {path} (missing from data/dist)")
        for path in removed:
            print(f"  - {path} (stale in data/dist)")
        for path in changed:
            print(f"  ~ {path} (content differs)")
        print("\nRun: python3 tools/etl/build.py")
        return 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--package", type=Path, default=DEFAULT_PACKAGE)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument(
        "--only",
        action="append",
        help="build just this parser (repeatable)",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="delete the output directory first",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="verify data/dist matches a fresh build; exit 1 if not",
    )
    args = parser.parse_args(argv)

    if args.check:
        return check_reproducible(args.package, args.out)

    if args.clean and args.out.exists():
        shutil.rmtree(args.out)

    print(f"Building {args.out.relative_to(REPO_ROOT)} from {args.package.name}")
    report = run(args.package, args.out, args.only)

    if report["warnings"]:
        print(f"\n{len(report['warnings'])} warning(s):", file=sys.stderr)
        for warning in report["warnings"][:40]:
            print(f"  - {warning}", file=sys.stderr)
        if len(report["warnings"]) > 40:
            print(f"  ... and {len(report['warnings']) - 40} more", file=sys.stderr)

    failed = [name for name, result in report["datasets"].items() if "error" in result]
    if failed:
        print(f"\nFAILED parsers: {', '.join(failed)}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
