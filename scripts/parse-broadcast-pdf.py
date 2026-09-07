"""Parse the 2026 FBS broadcast-schedule PDF into a structured JSON index.

Source: research-prompt PDF "2026 FBS College Football Broadcast Schedule"
(compiled Sept 7, 2026). Rows are tokenized and parsed with a broadcast
vocabulary: optional date/day prefix ("Sat Sep 5"), optional grouping label
("Big Noon Kickoff"), a clock+meridian or lone time token, the matchup, then
TV / stream / note columns. Section context (Saturday headers, week ranges)
supplies dates for undated rows. Postseason rows without two team names and
unconfirmed flex pairings are skipped.

Output: data/cfb-2026/broadcasts/broadcast-schedule-2026.json
Run from the CFB Hub root: python scripts/parse-broadcast-pdf.py
"""

import json
import re
from datetime import date, timedelta
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parent.parent
PDF_PATH = Path.home() / "Downloads" / "2026_FBS_College_Football_Broadcast_Schedule.pdf"
OUT_PATH = ROOT / "data" / "cfb-2026" / "broadcasts" / "broadcast-schedule-2026.json"

MONTHS = {m: i + 1 for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])}
DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

TIME_TOKEN = re.compile(r"^(Noon|TBA|TBD|Flex|night)$")
CLOCK_TOKEN = re.compile(r"^\d{1,2}:\d{2}$")
MERIDIAN_TOKEN = re.compile(r"^[ap]\.m\.$")
DATE_TOKEN = re.compile(
    r"^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\s?(Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})$")
DAY_TOKEN = re.compile(r"^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$")

NETWORKS = [
    "ABC & ESPN", "ABC / ESPN family", "ABC / ESPN", "ABC or ESPN", "ABC, Peacock",
    "ESPN / ESPN2", "SEC Network", "ACC Network", "CBS Sports Network", "USA Network",
    "The CW", "FOX or FS1", "NBC, Peacock", "Host ACC window",
    "ABC", "ESPN2", "ESPNU", "ESPN", "SECN+", "SECN", "ACCNX", "ACCN", "BTN", "FS1",
    "FS2", "FOX", "CBSSN", "CBS", "NBC", "TNT", "truTV", "CW", "USA", "TBA", "TBD",
]
STREAMS = [
    "ESPN App / Disney+", "ESPN App", "FOX One", "Paramount+", "Peacock", "HBO Max",
    "NBC platforms", "Disney+", "Local CW app",
]

SKIP_HEADERS = re.compile(
    r"^(Table \d+|Compiled|2026 FBS|How to watch|Conference media|Streaming cheat|Window \(ET\)|"
    r"Date Kick|Day / kick|Day Kick|Kick \(ET\)|When Game|Round Date|Weekly check|# When|"
    r"College GameDay|Noon ABC|3:30 p\.m\. ABC|Marquee|10:00–11|Thursday / Friday|Inside this|"
    r"FBS · 2026|Kickoff 10|7:00–8|Week 1 recap|Week 0$|Week 2|Weeks 3 and 4|Week 4|"
    r"How the rest|Locked later|SEC destination|Selected other|CBS locked|College Football Playoff|"
    r"Championship Week at|CBSSN weekday|How to use this guide)",
    re.I,
)

SECTION_RESET = re.compile(
    r"week 1 recap|week 0|week 2|weeks 3 and 4|week 4|locked later|fox friday night|"
    r"sec destination|selected other locked|cbs locked", re.I)


def load_team_names() -> dict[str, str]:
    doc = json.load(open(ROOT / "data" / "cfb-2026" / "teams.json", encoding="utf-8"))
    names: dict[str, str] = {}
    for team in doc["teams"]:
        names[team["school"].lower()] = team["slug"]
        if team.get("display_name"):
            names[team["display_name"].lower()] = team["slug"]
    names.update({
        "pitt": "pittsburgh",
        "miami": "miami-fl",
        "miami (fl)": "miami-fl",
        "cal": "california",
        "southern california": "usc",
        "connecticut": "uconn",
        "unc": "north-carolina",
        "ole miss": "ole-miss",
        "fla state": "florida-state",
        "app state": "appalachian-state",
        "appalachian state": "appalachian-state",
        "jmu": "james-madison",
        "james madison": "james-madison",
        "miss state": "mississippi-state",
        "hawai'i": "hawaii",
        "louisiana-lafayette": "louisiana",
        "ul monroe": "ulm",
        "san jose state": "san-jose-state",
        "ut san antonio": "utsa",
    })
    return names


TEAM_NAMES = load_team_names()


def clean_side(side: str) -> str:
    side = side.strip()
    side = re.sub(r"^No\.\s?\d+\s+", "", side)
    side = re.sub(r"\s*\([^)]*\)\s*$", "", side)
    side = re.sub(r"\s*[—–-]+\s*[A-Z].*$", "", side)
    return side.strip(" .,")


def resolve(side: str) -> str | None:
    return TEAM_NAMES.get(clean_side(side).lower())


def match_phrase(tokens: list[str], start: int, phrases: list[str]) -> tuple[str | None, int]:
    for phrase in phrases:
        parts = phrase.split()
        if tokens[start : start + len(parts)] == parts:
            return phrase, len(parts)
    return None, 0


def weekday_in_range(day_abbr: str, start: date, end: date) -> date | None:
    target = DAY_NAMES.index(day_abbr)
    cursor = start - timedelta(days=3)  # midweek rows can precede the weekend range
    while cursor <= end:
        if cursor.weekday() == target:
            return cursor
        cursor += timedelta(days=1)
    return None


def parse_row(line: str):
    """Parse one guide row. Returns partial fields + row_date/day_abbr or None."""
    tokens = line.split()
    if len(tokens) < 4:
        return None
    row_date = None
    day_abbr = None
    i = 0
    for width in (3, 2, 1):
        if len(tokens) >= width:
            m = DATE_TOKEN.match(" ".join(tokens[:width]))
            if m:
                row_date = date(2026, MONTHS[m.group(2)], int(m.group(3)))
                i = width
                break
    if row_date is None and DAY_TOKEN.match(tokens[0]):
        day_abbr = tokens[0]
        i = 1
    # Grouping label tokens run up to the time token.
    time_index = None
    group_end = i
    for j in range(i, len(tokens)):
        if TIME_TOKEN.match(tokens[j]):
            group_end, time_index = j, j + 1
            break
        if (CLOCK_TOKEN.match(tokens[j]) and j + 1 < len(tokens)
                and MERIDIAN_TOKEN.match(tokens[j + 1])):
            group_end, time_index = j, j + 2
            break
    if time_index is None:
        return None
    grouping = tokens[i:group_end]
    i = time_index
    while i < len(tokens) and (TIME_TOKEN.match(tokens[i]) or tokens[i].lower() in {"locked"}):
        i += 1
    # Network: first network phrase after the at/vs separator.
    net_index = net_len = None
    net_phrase = None
    for j in range(i, len(tokens)):
        phrase, length = match_phrase(tokens, j, NETWORKS)
        if phrase and any(t in ("at", "vs.", "vs") for t in tokens[i:j]):
            net_index, net_phrase, net_len = j, phrase, length
            break
    if net_index is None:
        return None
    matchup = " ".join(tokens[i:net_index])
    m = re.match(r"^(?P<away>.+?)\s+(?P<kind>at|vs\.?)\s+(?P<home>.+)$", matchup)
    if not m:
        return None
    away = clean_side(m.group("away"))
    home = clean_side(m.group("home"))
    if not away or not home:
        return None
    rest = tokens[net_index + net_len :]
    stream = None
    phrase, length = match_phrase(rest, 0, STREAMS)
    if phrase:
        stream = phrase
        rest = rest[length:]
    return {
        "away": away,
        "home": home,
        "neutral": m.group("kind").startswith("vs"),
        "tv": None if net_phrase in ("TBA", "TBD") else net_phrase,
        "stream": stream,
        "note": " ".join(rest).strip() or None,
        "grouping": " ".join(grouping) or None,
        "row_date": row_date,
        "day_abbr": day_abbr,
    }


SAT_HEADER = re.compile(r"^Saturday,?\s+(Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})")
RANGE_HEADER = re.compile(
    r"^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+"
    r"(Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})\s*(?:[–—-]+|through\s+)")
RANGE_TAIL = re.compile(
    r"(?:[–—-]+\s*|through\s+)(?:\w+day,?\s+)?(Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})")


def parse_pdf():
    assignments = []
    skipped = []
    default_date = None
    week_range = None
    in_postseason = False
    with pdfplumber.open(PDF_PATH) as pdf:
        for page in pdf.pages:
            for raw in (page.extract_text() or "").splitlines():
                line = re.sub(r"\bSept\b\.?", "Sep", " ".join(raw.split()))
                if not line:
                    continue
                # Week-range headers may start "Week N —"; parse before the
                # generic skip so day-only rows inside get their dates.
                rng_line = re.sub(r"^Week \d+\s*[–—-]\s*", "", line)
                rng = RANGE_HEADER.match(rng_line)
                if rng:
                    start = date(2026, MONTHS[rng.group(2)], int(rng.group(3)))
                    tail = RANGE_TAIL.search(rng_line)
                    if tail:
                        week_range = (start, date(2026, MONTHS[tail.group(1)], int(tail.group(2))))
                        in_postseason = False
                        continue
                if SKIP_HEADERS.match(line):
                    continue
                low = line.lower()
                if "college football playoff" in low or "championship week at a glance" in low:
                    in_postseason = True
                    continue
                if SECTION_RESET.search(low):
                    in_postseason = False
                sat = SAT_HEADER.match(line)
                if sat:
                    default_date = date(2026, MONTHS[sat.group(1)], int(sat.group(2)))
                    continue
                # A true Week-0 section header anchors undated rows to Aug 29.
                if low.startswith("week 0") or ("week 0" in low and "overseas" in low):
                    default_date = date(2026, 8, 29)
                    continue
                rng = None
                if rng:
                    start = date(2026, MONTHS[rng.group(2)], int(rng.group(3)))
                    tail = RANGE_TAIL.search(line)
                    if tail:
                        week_range = (start, date(2026, MONTHS[tail.group(1)], int(tail.group(2))))
                        continue
                if in_postseason:
                    continue
                if low.endswith("possible"):
                    skipped.append(line)
                    continue
                parsed = parse_row(line)
                if not parsed:
                    skipped.append(line)
                    continue
                away = parsed.pop("away")
                home = parsed.pop("home")
                neutral = parsed.pop("neutral")
                row_date = parsed.pop("row_date")
                day_abbr = parsed.pop("day_abbr")
                if row_date is None and day_abbr and week_range:
                    row_date = weekday_in_range(day_abbr, week_range[0], week_range[1])
                if row_date is None:
                    row_date = default_date
                if row_date is None:
                    skipped.append(line)
                    continue
                if re.search(r"\bor\b", f"{away} {home}"):
                    skipped.append(line)
                    continue
                assignments.append({
                    "date": row_date.isoformat(),
                    "away": away,
                    "home": home,
                    "neutral": neutral,
                    **parsed,
                })
    return assignments, skipped


def match_to_schedule(assignments):
    index: dict[str, list] = {}
    dateless: dict[frozenset, str] = {}
    for path in sorted((ROOT / "data" / "cfb-2026" / "schedules").glob("*.json")):
        if path.stem == "index":
            continue
        team_slug = path.stem
        for row in json.load(open(path, encoding="utf-8")).get("games", []):
            if row.get("type") == "bye":
                continue
            opp = row.get("opponent_slug")
            teams = {team_slug} | ({opp} if opp else set())
            if row.get("location") == "away":
                away, home = team_slug, opp
            elif row.get("location") == "neutral":
                away, home = sorted(teams)
            else:
                away, home = opp, team_slug
            if not row.get("date"):
                # Dateless (TBD) rows match by unique team pair instead; the
                # same game appears in both teams' files with the same id.
                key = frozenset(teams)
                game_id = f"tbd-{away}-at-{home}"
                if key not in dateless:
                    dateless[key] = game_id
                elif dateless[key] not in (game_id, "ambiguous"):
                    dateless[key] = "ambiguous"
                continue
            index.setdefault(row["date"], []).append({
                "teams": teams,
                "game_id": f"{row['date']}-{away}-at-{home}",
            })

    matched = 0
    for assignment in assignments:
        away_slug = resolve(assignment["away"])
        home_slug = resolve(assignment["home"])
        assignment["away_slug"] = away_slug
        assignment["home_slug"] = home_slug
        assignment["matched_game_id"] = None
        pair = {s for s in (away_slug, home_slug) if s}
        if not pair:
            continue
        for offset in (0, -1, 1, -2, 2):
            day = date.fromisoformat(assignment["date"]) + timedelta(days=offset)
            hit = next((c for c in index.get(day.isoformat(), []) if pair <= c["teams"]), None)
            if hit:
                assignment["matched_game_id"] = hit["game_id"]
                matched += 1
                break
        else:
            if len(pair) == 2 and dateless.get(frozenset(pair)) not in (None, "ambiguous"):
                assignment["matched_game_id"] = dateless[frozenset(pair)]
                matched += 1
    return matched


def main():
    assignments, skipped = parse_pdf()
    matched = match_to_schedule(assignments)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    doc = {
        "as_of": "2026-09-07",
        "note": "Linear TV and major streaming assignments compiled from the 2026 broadcast-schedule research PDF. Times and networks flex 6-12 days out; unlisted games land on conference plus-networks. Postseason rows without two team names and unconfirmed flex pairings are excluded.",
        "assignments": assignments,
    }
    json.dump(doc, open(OUT_PATH, "w", encoding="utf-8"), indent=1)
    both_fbs = sum(1 for a in assignments if a["away_slug"] and a["home_slug"])
    print(f"assignments: {len(assignments)} | both-FBS: {both_fbs} | matched: {matched}")
    print(f"skipped: {len(skipped)}")


if __name__ == "__main__":
    main()
