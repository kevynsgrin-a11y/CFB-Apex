"""Markdown parsing helpers shared by every CFB Apex ETL parser.

The master research package is hand-written GitHub-flavored Markdown. These
helpers turn it into structures without guessing at anything: a cell the source
left blank, or marked "Not listed" / "N/A" / "--", comes back as ``None`` so
downstream code preserves the gap instead of inventing a value.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Callable, Iterator

_LINK_RE = re.compile(r"\[([^\]]*)\]\([^)]*\)")
_EMPHASIS_RE = re.compile(r"(\*\*|__|\*|`)")
_FOOTNOTE_RE = re.compile(r"\[\^[^\]]+\]")
_WS_RE = re.compile(r"\s+")

#: Cell values the sources use to say "we did not find this".
MISSING_VALUES = {
    "",
    "-",
    "--",
    "---",
    "—",
    "–",
    "n/a",
    "na",
    "none",
    "not listed",
    "not listed / not listed",
    "not published",
    "not available",
    "not reported",
    "unknown",
    "tbd",
    "tba",
    "?",
}

#: Separator row of a Markdown table, e.g. ``| --- | ---: |``.
_SEPARATOR_RE = re.compile(r"^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$")

_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")


def strip_markdown(value: str | None) -> str:
    """Reduce an inline-Markdown fragment to its plain text."""
    if value is None:
        return ""
    text = _FOOTNOTE_RE.sub("", str(value))
    text = _LINK_RE.sub(r"\1", text)
    text = _EMPHASIS_RE.sub("", text)
    text = text.replace("<br>", " ").replace("<br/>", " ").replace("<br />", " ")
    text = text.replace("\\|", "|")
    return _WS_RE.sub(" ", text).strip()


def clean(value: str | None) -> str | None:
    """Plain text for a table cell, or ``None`` when the source recorded a gap."""
    text = strip_markdown(value)
    if text.lower() in MISSING_VALUES:
        return None
    return text or None


def is_missing(value: str | None) -> bool:
    return clean(value) is None


def _split_row(line: str) -> list[str]:
    """Split one pipe-delimited row, honouring backslash escapes."""
    stripped = line.strip()
    if stripped.startswith("|"):
        stripped = stripped[1:]
    if stripped.endswith("|") and not stripped.endswith("\\|"):
        stripped = stripped[:-1]
    cells: list[str] = []
    current: list[str] = []
    escaped = False
    for char in stripped:
        if escaped:
            current.append(char)
            escaped = False
            continue
        if char == "\\":
            escaped = True
            current.append(char)
            continue
        if char == "|":
            cells.append("".join(current))
            current = []
            continue
        current.append(char)
    cells.append("".join(current))
    return cells


@dataclass
class Table:
    """One Markdown table: its header cells plus its data rows."""

    headers: list[str]
    rows: list[list[str]] = field(default_factory=list)
    #: 0-based line number of the header row within the text it was parsed from.
    line: int = 0

    def records(self) -> list[dict[str, str | None]]:
        """Rows as ``{header: cleaned value}`` dicts."""
        out: list[dict[str, str | None]] = []
        for row in self.rows:
            record: dict[str, str | None] = {}
            for index, header in enumerate(self.headers):
                record[header] = clean(row[index]) if index < len(row) else None
            out.append(record)
        return out

    def raw_records(self) -> list[dict[str, str]]:
        """Rows as dicts with the original Markdown preserved."""
        return [
            {
                header: (row[index] if index < len(row) else "")
                for index, header in enumerate(self.headers)
            }
            for row in self.rows
        ]

    def has_headers(self, *names: str) -> bool:
        lowered = {h.lower() for h in self.headers}
        return all(name.lower() in lowered for name in names)

    def header_index(self, *candidates: str) -> int | None:
        """Index of the first header matching any candidate, case-insensitively."""
        lowered = [h.lower() for h in self.headers]
        for candidate in candidates:
            needle = candidate.lower()
            if needle in lowered:
                return lowered.index(needle)
        return None


def iter_tables(text: str) -> Iterator[Table]:
    """Yield every Markdown table in ``text`` in document order."""
    lines = text.splitlines()
    index = 0
    while index < len(lines) - 1:
        line = lines[index]
        following = lines[index + 1]
        if "|" in line and _SEPARATOR_RE.match(following):
            headers = [strip_markdown(cell) for cell in _split_row(line)]
            table = Table(headers=headers, line=index)
            cursor = index + 2
            while cursor < len(lines) and "|" in lines[cursor] and lines[cursor].strip():
                table.rows.append(_split_row(lines[cursor]))
                cursor += 1
            yield table
            index = cursor
            continue
        index += 1


def tables(text: str) -> list[Table]:
    return list(iter_tables(text))


@dataclass
class Section:
    """A heading and the body text running until the next heading of any level."""

    level: int
    title: str
    body: str
    line: int

    def tables(self) -> list[Table]:
        return tables(self.body)

    def subsections(self, level: int | None = None) -> list["Section"]:
        return sections(self.body, level)


def iter_sections(text: str, level: int | None = None) -> Iterator[Section]:
    """Yield document sections.

    ``level`` restricts the yielded headings to that depth; each body still runs
    to the next heading at the same *or shallower* depth, so a ``##`` section
    keeps its nested ``###`` subsections.
    """
    lines = text.splitlines()
    starts: list[tuple[int, int, str]] = []
    in_fence = False
    for number, line in enumerate(lines):
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        match = _HEADING_RE.match(line)
        if match:
            starts.append((number, len(match.group(1)), strip_markdown(match.group(2))))

    for position, (number, depth, title) in enumerate(starts):
        if level is not None and depth != level:
            continue
        end = len(lines)
        for later_number, later_depth, _ in starts[position + 1 :]:
            if later_depth <= depth:
                end = later_number
                break
        yield Section(
            level=depth,
            title=title,
            body="\n".join(lines[number + 1 : end]),
            line=number,
        )


def sections(text: str, level: int | None = None) -> list[Section]:
    return list(iter_sections(text, level))


def find_section(
    text: str,
    title_matches: Callable[[str], bool],
    level: int | None = None,
) -> Section | None:
    """First section whose title satisfies the ``title_matches`` predicate."""
    for section in iter_sections(text, level):
        if title_matches(section.title):
            return section
    return None
