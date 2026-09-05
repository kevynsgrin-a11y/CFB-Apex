"""Deterministic JSON output for the CFB Apex data build.

Every artifact is written byte-stably (sorted keys, fixed separators, trailing
newline) so a rebuild that changes nothing produces an empty diff, and a diff in
review is always a real data change.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

#: Written into every artifact so consumers can detect a schema change.
SCHEMA_VERSION = "1.0.0"


def write_json(path: Path, payload: Any) -> Path:
    """Write ``payload`` as pretty, sorted, deterministic JSON."""
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=False)
    path.write_text(text + "\n", encoding="utf-8")
    return path


def write_min_json(path: Path, payload: Any) -> Path:
    """Write a compact form, for artifacts the Worker serves verbatim."""
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, separators=(",", ":"), sort_keys=True, ensure_ascii=False)
    path.write_text(text + "\n", encoding="utf-8")
    return path


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def envelope(
    *,
    dataset: str,
    generated_from: str | list[str],
    as_of: str | None = None,
    notes: list[str] | None = None,
    **payload: Any,
) -> dict:
    """Wrap a dataset with the provenance every artifact carries.

    ``generated_from`` names the package file(s) the data came from, so any
    number on the site can be traced back to a source document.
    """
    sources = [generated_from] if isinstance(generated_from, str) else list(generated_from)
    meta: dict[str, Any] = {
        "dataset": dataset,
        "schema_version": SCHEMA_VERSION,
        "sources": sorted(sources),
    }
    if as_of:
        meta["as_of"] = as_of
    if notes:
        meta["notes"] = notes
    return {"meta": meta, **payload}
