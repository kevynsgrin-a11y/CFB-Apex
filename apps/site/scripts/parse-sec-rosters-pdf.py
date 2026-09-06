"""Parse 'SEC Football Roster Options.pdf' into depth-chart JSONs.

The PDF is a Gemini chat export: per-team tables of projected starters and
key rotation with position, class, star rating, high school, and composite
recruiting rank, each team carrying a three-source verification line.

Output: one depth-charts/<slug>.json per SEC team, matching the schema of the
existing vendored dataset files. Only facts present on the page are written;
anything not listed stays null.
"""
import json
import re
import sys
from pathlib import Path

import pdfplumber

PDF_PATH = r"C:\Users\Dell\Downloads\SEC Football Roster Options.pdf"
OUT_DIR = Path(r"C:\Users\Dell\OneDrive\Desktop\Documents\CFB Hub\data\cfb-2026\depth-charts")
TEAMS_JSON = Path(r"C:\Users\Dell\OneDrive\Desktop\Documents\CFB Hub\data\cfb-2026\teams.json")

POS_X = 175          # player-name column starts here; position tokens sit left of it
HEADER_SIZE = 9.0    # team headers render at 9.4pt, rows at 8.0pt

OFFENSE = {"QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "OL"}
DEFENSE_PREFIXES = ("DE", "DT", "NT", "DL", "EDGE", "JACK", "LB", "MLB", "WLB", "SLB",
                    "SAM", "WILL", "MIKE", "ILB", "OLB", "CB", "LCB", "RCB", "CB1", "CB2",
                    "S", "FS", "SS", "STAR", "NB", "NICKEL", "SPUR", "ROVER",
                    "BUCK", "WOLF", "BANDIT", "SAFETY")
SPECIAL = {"K", "PK", "P", "LS", "H", "KO", "KR", "PR", "HOLDER"}


def unit_for(pos: str) -> str:
    base = pos.split()[0].strip("()") if pos else ""
    base = re.sub(r"[()]", "", pos).split()[0].upper() if pos else ""
    if base in SPECIAL:
        return "special_teams"
    if pos.upper().startswith(DEFENSE_PREFIXES) or base in DEFENSE_PREFIXES:
        return "defense"
    return "offense"


def is_pos_token(token: str) -> bool:
    t = token.strip()
    if not t or len(t) > 14:
        return False
    if not re.fullmatch(r"[A-Z0-9()/\- ]+", t):
        return False
    if t in {"Pos", "Player", "Class", "Rating", "High", "Composite", "Rank", "School"}:
        return False
    core = re.sub(r"[()0-9/\- ]", "", t)
    return len(core) >= 1


def lines_of(page):
    words = page.extract_words(extra_attrs=["size"])
    rows = {}
    for w in words:
        key = round(w["top"] / 4)
        rows.setdefault(key, []).append(w)
    out = []
    for key in sorted(rows):
        ws = sorted(rows[key], key=lambda w: w["x0"])
        out.append({
            "words": ws,
            "size": round(ws[0]["size"], 1),
            "x0": ws[0]["x0"],
            "text": " ".join(w["text"] for w in ws),
        })
    return out


def column_text(words, x_min, x_max):
    return " ".join(w["text"] for w in words if x_min <= w["x0"] < x_max)


def main():
    teams_meta = {t["slug"]: t for t in json.loads(TEAMS_JSON.read_text(encoding="utf8"))["teams"]}
    sec_teams = {t["school"]: t for t in teams_meta.values() if t["conference_slug"] == "sec"}
    # Nickname/alias fixes for header names
    alias = {"Mississippi State": "Mississippi State", "Ole Miss": "Ole Miss"}

    parsed = {}   # school -> {"verification": str, "players": [...]}
    current = None
    pending = None  # last player awaiting continuation line
    # Column boundaries calibrate from each table's own header row.
    cols = {"pos": 0, "name": POS_X, "class": 262, "rating": 300, "tail": 332}
    closed = set()  # schools whose starters table ended

    with pdfplumber.open(PDF_PATH) as pdf:
        for page in pdf.pages:
            for line in lines_of(page):
                text, size, x0 = line["text"], line["size"], line["x0"]
                words = line["words"]

                if size >= HEADER_SIZE and re.match(r"^\d+\.\s+[A-Z]", text):
                    school = re.sub(r"^\d+\.\s+", "", text).strip()
                    # strip trailing nickname words until a known SEC school matches
                    school = school.replace(" Crimson Tide", "").replace(" Razorbacks", "") \
                        .replace(" Tigers", "").replace(" Gators", "").replace(" Bulldogs", "") \
                        .replace(" Wildcats", "").replace(" Rebels", "").replace(" Commodores", "") \
                        .replace(" Volunteers", "").replace(" Sooners", "").replace(" Longhorns", "") \
                        .replace(" Aggies", "").replace(" Gamecocks", "").replace(" Tigers", "").strip()
                    if school in sec_teams or school in alias:
                        current = {"school": school, "verification": "", "players": []}
                        parsed[school] = current
                        pending = None
                    continue

                def calibrate(word_list):
                    header = {w["text"]: w["x0"] for w in word_list}
                    if "Pos" in header and "Player" in header:
                        cols["pos"] = 0
                        cols["name"] = header["Player"] - 10
                        cols["class"] = header.get("Class", header["Player"] + 88) - 10
                        cols["rating"] = header.get("Rating", cols["class"] + 36) - 8
                        cols["tail"] = header.get("High", header.get("Composite", cols["rating"] + 34)) - 8
                        return True
                    return False

                if current is None:
                    calibrate(words)
                    continue
                if text.startswith("Verification:"):
                    current["verification"] = text.replace("Verification:", "").strip()
                    pending = None
                    continue
                if calibrate(words):
                    pending = None
                    continue

                first = words[0]
                starts_pos = first["x0"] < cols["name"] and is_pos_token(first["text"]) and size < HEADER_SIZE

                if starts_pos:
                    pos = column_text(words, cols["pos"], cols["name"]).strip()
                    # The export continues past each team's starters with
                    # full-roster tables in a different column layout, where
                    # the player's name lands inside the position column
                    # ("RB Trae'shawn Brown") and the class token leads the
                    # name column. Rows like that end the starters table.
                    name_probe = column_text(words, cols["name"], cols["class"]).strip()
                    class_like = re.match(r"^(RS\s+)?(Fr|So|Jr|Sr)\.?$", name_probe.split()[0] if name_probe.split() else "")
                    if len(pos.split()) >= 3 or class_like:
                        current = None
                        pending = None
                        continue
                    name = name_probe
                    cls_words = [w for w in words if cols["class"] <= w["x0"] < cols["rating"]]
                    rate_words = [w for w in words if cols["rating"] <= w["x0"] < cols["tail"]]
                    cls = " ".join(w["text"] for w in cls_words).strip()
                    rating = " ".join(w["text"] for w in rate_words).strip()
                    tail = column_text(words, cols["tail"], 10_000).strip()
                    stars = None
                    m = re.search(r"([3-5])", rating)
                    if m:
                        stars = int(m.group(1))
                    player = {
                        "pos": re.sub(r"\s+", " ", pos),
                        "name": re.sub(r"\s+", " ", name),
                        "class_raw": cls or None,
                        "stars": stars,
                        "tail": tail,
                    }
                    if player["name"]:
                        current["players"].append(player)
                        pending = player
                    continue

                # continuation line: rank text and/or a lone rating star line
                if pending is not None and size < HEADER_SIZE and first["x0"] >= cols["rating"]:
                    fragment = text.strip()
                    if fragment and not fragment.startswith("Pos"):
                        if pending["stars"] is None:
                            m = re.search(r"^([3-5])\s*★?", fragment)
                            if m and first["x0"] < cols["tail"]:
                                pending["stars"] = int(m.group(1))
                        tail_bits = [w for w in words if w["x0"] >= cols["tail"]]
                        if tail_bits:
                            extra = " ".join(w["text"] for w in tail_bits)
                            if extra and not extra.startswith("School"):
                                pending["tail"] = (pending["tail"] + " " + extra).strip()
                elif pending is not None and first["x0"] >= cols["tail"] and size < HEADER_SIZE:
                    pass  # header rows of a continued table; ignore

    # ---- emit depth charts ----
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    summary = []
    for school, data in parsed.items():
        meta = sec_teams[school]
        positions = {"offense": [], "defense": [], "special_teams": []}
        for player in data["players"]:
            unit = unit_for(player["pos"])
            positions[unit].append({
                "position": player["pos"],
                "depth": [{
                    "rank": 1,
                    "co_listed": False,
                    "players": [{
                        "name": player["name"],
                        "stars": player["stars"],
                        "class": class_code(player["class_raw"]),
                        "class_raw": player["class_raw"],
                        "high_school": None,
                        "city": None,
                        "state": None,
                        "hometown": None,
                        "previous_schools": None,
                        "note": clean_tail(player["tail"]),
                    }],
                }],
            })
        doc = {
            "team": {"slug": meta["slug"], "school": meta["school"], "conference_slug": "sec"},
            "status": "PROJECTED",
            "status_caveat": "Projected starters and rotation from the SEC roster research file, cross-checked against the sources below.",
            "status_raw": "Projected starters (verified)",
            "schemes": {"offense": None, "defense": None, "special_teams": None},
            "units": [
                {"unit": unit, "scheme": None, "positions": poss}
                for unit, poss in positions.items() if poss
            ],
            "conflicts": [],
            "injury_notes": [],
            "suspension_notes": [],
            "meta": {
                "dataset": "depth-chart",
                "schema_version": "1.0.0",
                "sources": ["SEC Football Roster Options.pdf (Gemini research export, 2026-09-06)"],
                "as_of": "2026-09-05",
                "notes": [
                    f"Verification sources: {data['verification'] or 'not stated'}",
                    "Starters-only projection; not a full roster file.",
                ],
            },
        }
        path = OUT_DIR / f"{meta['slug']}.json"
        path.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
        summary.append((school, meta["slug"], len(data["players"]), data["verification"][:60]))

    for school, slug, n, ver in summary:
        print(f"{school:20} -> {slug:18} {n:3} players | {ver}")
    print(f"\n{len(summary)} teams written to {OUT_DIR}")


def class_code(raw):
    if not raw:
        return None
    r = raw.strip().upper().rstrip(".")
    table = {
        "FR": "FR", "FRESHMAN": "FR",
        "RS FR": "RFR", "RSFRESHMAN": "RFR", "REDshirt FRESHMAN".upper(): "RFR",
        "SO": "SO", "SOPHOMORE": "SO",
        "RS SO": "RSO",
        "JR": "JR", "JUNIOR": "JR",
        "RS JR": "RJR",
        "SR": "SR", "SENIOR": "SR",
        "RS SR": "RSR",
        "5TH": "5TH", "6TH": "6TH", "7TH": "7TH",
        "GR": "GR",
    }
    return table.get(r, None)


def clean_tail(tail):
    if not tail:
        return None
    t = re.sub(r"\s+", " ", tail).strip()
    if not t or t in {"School", "Rank"}:
        return None
    return t


if __name__ == "__main__":
    sys.exit(main())
