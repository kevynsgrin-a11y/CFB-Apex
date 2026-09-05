"""Field-level parsing shared by the CFB Apex ETL parsers.

Each helper returns ``None`` rather than a guess when the source did not record
a value, per the package's own data-integrity rule.
"""

from __future__ import annotations

import re

from . import mdtable

_STAR_RE = re.compile(r"(\d)\s*(?:★|\*|-?\s*star)", re.IGNORECASE)
_NUM_RE = re.compile(r"-?\d[\d,]*\.?\d*")
# Sources write the transfer note as "(prev. X)", "(prev: X)" or "(previous X)".
_TRANSFER_RE = re.compile(r"\(\s*prev(?:ious)?\s*[.:]?\s*([^)]*?)\s*\)", re.IGNORECASE)

# Others write it unparenthesised inside another column: "R-Jr.; prev. College
# of San Mateo / Arizona", "Acad: R-Jr.; Prev: Washington / Ventura CC". It runs
# to the next semicolon or the end of the cell.
_BARE_TRANSFER_RE = re.compile(
    r"(?:^|[;,]|\s)prev(?:ious)?\s*[.:]\s*([^;]+?)\s*(?=[;]|$)", re.IGNORECASE
)
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
    "rs-freshman": "RFR",
    "rs freshman": "RFR",
    "rs-sophomore": "RSO",
    "rs sophomore": "RSO",
    "rs-junior": "RJR",
    "rs junior": "RJR",
    "rs-senior": "RSR",
    "rs senior": "RSR",
    "5th": "5TH",
    "5th (gr.)": "5TH",
    "6th": "6TH",
    "6th (gr.)": "6TH",
}


def parse_stars(value: str | None) -> int | None:
    """Recruiting stars from cells like ``4★``, ``4*``, ``3-star``, ``Not listed``.

    The raw cell is checked first: several files write the rating with an ASCII
    asterisk ("4* (HS '26 per PuntAndRally)"), and stripping Markdown emphasis
    would remove that asterisk before the rating could be read.
    """
    if value is None:
        return None
    raw = str(value).strip()
    if raw:
        match = _STAR_RE.search(raw)
        if match:
            stars = int(match.group(1))
            if 1 <= stars <= 5:
                return stars
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


def parse_hometown(
    value: str | None, *, hometown_first: bool = False
) -> dict[str, str | None]:
    """Split a ``HS / City, State (prev. School)`` cell into parts.

    Returns ``{"high_school", "city", "state", "hometown", "previous_schools",
    "raw"}`` with ``None`` for anything the source did not supply.

    ``hometown_first`` inverts the two halves, for the files that write the
    column that way regardless of what their header calls it.
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
    # The delimiter is a spaced slash, or a spaced dash in the files that use
    # one ("Blanche Ely — Hollywood, Fla."). Splitting on a bare "/" would cut
    # "N/A" in half and turn a recorded gap into the school "N" in the city "A".
    separator = next((sep for sep in (" / ", " — ", " – ") if sep in text), None)
    if separator:
        left, _, right = text.partition(separator)
        high_school = mdtable.clean(left)
        hometown = mdtable.clean(right)
    elif "/" in text and mdtable.clean(text) is not None and "," in text:
        left, _, right = text.partition("/")
        high_school = mdtable.clean(left)
        hometown = mdtable.clean(right)
    else:
        # No delimiter: a bare "City, State" is a hometown, anything else a school.
        if "," in text:
            hometown = mdtable.clean(text)
        else:
            high_school = mdtable.clean(text)

    if hometown_first and high_school and hometown:
        high_school, hometown = hometown, high_school

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
    match = _TRANSFER_RE.search(text) or _BARE_TRANSFER_RE.search(text)
    return match.group(1).strip() if match else None


def split_transfer(value: str | None) -> tuple[str | None, str | None]:
    """Separate a cell's transfer note from the rest of its text.

    Returns ``(remainder, previous_schools)``. Callers that need both halves
    should use this rather than removing the note themselves — the sources
    write it three ways and only one regex should have to know that.
    """
    text = mdtable.clean(value)
    if not text:
        return None, None
    match = _TRANSFER_RE.search(text) or _BARE_TRANSFER_RE.search(text)
    if not match:
        return text, None
    remainder = (text[: match.start()] + text[match.end() :]).strip(" ;,/")
    return (remainder or None), (match.group(1).strip() or None)


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
