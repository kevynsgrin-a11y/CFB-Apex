"""Field-level parsing shared by the CFB Apex ETL parsers.

Each helper returns ``None`` rather than a guess when the source did not record
a value, per the package's own data-integrity rule.
"""

from __future__ import annotations

import re

from . import mdtable

_STAR_RE = re.compile(r"(\d)\s*(?:★|\*|-?\s*star)", re.IGNORECASE)
_NUM_RE = re.compile(r"-?\d[\d,]*\.?\d*")
_TRANSFER_RE = re.compile(r"\(\s*prev\.?\s*([^)]*)\)", re.IGNORECASE)
_RECORD_RE = re.compile(r"(\d+)\s*[-–]\s*(\d+)(?:\s*[-–]\s*(\d+))?")

#: Class-year spellings seen across the roster files, mapped to a canonical form.
CLASS_YEARS: dict[str, str] = {
    "fr": "FR",
    "fr.": "FR",
    "freshman": "FR",
    "true fr": "FR",
    "r-fr": "RFR",
    "rfr": "RFR",
    "redshirt freshman": "RFR",
    "so": "SO",
    "so.": "SO",
    "sophomore": "SO",
    "r-so": "RSO",
    "rso": "RSO",
    "redshirt sophomore": "RSO",
    "jr": "JR",
    "jr.": "JR",
    "junior": "JR",
    "r-jr": "RJR",
    "rjr": "RJR",
    "redshirt junior": "RJR",
    "sr": "SR",
    "sr.": "SR",
    "senior": "SR",
    "r-sr": "RSR",
    "rsr": "RSR",
    "redshirt senior": "RSR",
    "gr": "GR",
    "gr.": "GR",
    "grad": "GR",
    "graduate": "GR",
    "5th": "5TH",
    "5th (gr.)": "5TH",
    "6th": "6TH",
    "6th (gr.)": "6TH",
}


def parse_stars(value: str | None) -> int | None:
    """Recruiting stars from cells like ``4★``, ``3-star``, ``Not listed``."""
    text = mdtable.clean(value)
    if not text:
        return None
    match = _STAR_RE.search(text)
    if match:
        stars = int(match.group(1))
        return stars if 1 <= stars <= 5 else None
    if text.isdigit() and 1 <= int(text) <= 5:
        return int(text)
    return None


def parse_class_year(value: str | None) -> tuple[str | None, str | None]:
    """Return ``(canonical_class, raw_text)``.

    The raw text is kept because the sources encode extra meaning in it —
    ``5th (Gr.)``, ``*Sr.``, ``^Sr. (Gr.)`` — that the canonical code drops.
    """
    text = mdtable.clean(value)
    if not text:
        return None, None
    probe = text.lower().strip().lstrip("*^~ ").strip()
    if probe in CLASS_YEARS:
        return CLASS_YEARS[probe], text
    # "R-Fr.*", "So./R-Fr.", "5th (Gr.)" and friends: take the leading token.
    head = re.split(r"[/(]", probe)[0].strip().rstrip(".*^ ")
    if head in CLASS_YEARS:
        return CLASS_YEARS[head], text
    compact = head.replace(".", "").replace(" ", "")
    if compact in CLASS_YEARS:
        return CLASS_YEARS[compact], text
    return None, text


def parse_hometown(value: str | None) -> dict[str, str | None]:
    """Split a ``HS / City, State (prev. School)`` cell into parts.

    Returns ``{"high_school", "city", "state", "hometown", "previous_schools",
    "raw"}`` with ``None`` for anything the source did not supply.
    """
    text = mdtable.clean(value)
    empty: dict[str, str | None] = {
        "high_school": None,
        "city": None,
        "state": None,
        "hometown": None,
        "previous_schools": None,
        "raw": None,
    }
    if not text:
        return empty

    previous: str | None = None
    transfer = _TRANSFER_RE.search(text)
    if transfer:
        previous = transfer.group(1).strip() or None
        text = _TRANSFER_RE.sub("", text).strip()
    text = text.strip(" ;,")

    high_school: str | None = None
    hometown: str | None = None
    if "/" in text:
        left, _, right = text.partition("/")
        high_school = left.strip() or None
        hometown = right.strip() or None
    else:
        # No delimiter: a bare "City, State" is a hometown, anything else a school.
        if "," in text:
            hometown = text
        else:
            high_school = text

    city = state = None
    if hometown:
        if "," in hometown:
            city_part, _, state_part = hometown.rpartition(",")
            city = city_part.strip() or None
            state = state_part.strip() or None
        else:
            city = hometown.strip() or None

    return {
        "high_school": high_school,
        "city": city,
        "state": state,
        "hometown": hometown,
        "previous_schools": previous,
        "raw": mdtable.clean(value),
    }


def parse_transfer(value: str | None) -> str | None:
    """Previous school(s) noted as ``(prev. X // Y)``, if any."""
    text = mdtable.clean(value)
    if not text:
        return None
    match = _TRANSFER_RE.search(text)
    return match.group(1).strip() if match else None


def parse_number(value: str | None) -> float | int | None:
    """First number in a cell, as ``int`` when it has no fractional part."""
    text = mdtable.clean(value)
    if text is None:
        return None
    match = _NUM_RE.search(text.replace(",", ""))
    if not match:
        return None
    raw = match.group(0)
    try:
        if "." in raw:
            return float(raw)
        return int(raw)
    except ValueError:
        return None


def parse_int(value: str | None) -> int | None:
    number = parse_number(value)
    if number is None:
        return None
    return int(number)


def parse_float(value: str | None) -> float | None:
    number = parse_number(value)
    if number is None:
        return None
    return float(number)


def parse_rank(value: str | None) -> int | None:
    """Rank cells, tolerating ``T-14`` ties and ``#12`` prefixes."""
    text = mdtable.clean(value)
    if not text:
        return None
    match = re.search(r"\d+", text)
    return int(match.group(0)) if match else None


def parse_record(value: str | None) -> dict[str, int] | None:
    """A ``W-L`` or ``W-L-T`` record."""
    text = mdtable.clean(value)
    if not text:
        return None
    match = _RECORD_RE.search(text)
    if not match:
        return None
    record = {"wins": int(match.group(1)), "losses": int(match.group(2))}
    if match.group(3) is not None:
        record["ties"] = int(match.group(3))
    return record


def split_names(value: str | None) -> list[str]:
    """Split a co-listed cell (``A OR B``, ``A; B``, ``A / B``) into names."""
    text = mdtable.clean(value)
    if not text:
        return []
    parts = re.split(r"\s+OR\s+|\s*;\s*|\s*//\s*", text, flags=re.IGNORECASE)
    return [part.strip() for part in parts if part.strip()]


def scheme_from_heading(title: str) -> str | None:
    """Scheme label from a heading like ``Defense (4-2-5 — PROJECTED Ourlads)``."""
    match = re.search(r"\(([^)]*)\)", title)
    if not match:
        return None
    inner = match.group(1).strip()
    # Drop a trailing provenance clause: "4-2-5 — Ourlads" -> "4-2-5".
    inner = re.split(r"\s+[—–]\s+", inner)[0].strip()
    return inner or None


def status_from_text(text: str) -> str | None:
    """OFFICIAL / MIXED / PROJECTED depth-chart status, if stated."""
    for label in ("OFFICIAL", "MIXED", "PROJECTED"):
        if re.search(rf"\b{label}\b", text):
            return label
    return None
