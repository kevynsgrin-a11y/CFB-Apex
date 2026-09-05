"""Canonical 2026 FBS team registry and name resolution.

Every source in the master package spells team names differently: the polls say
"USC (Southern California)", the ESPN SOS JSON says "Arizona St", the NCAA stat
CSVs say "Arizona State Arizona St." in a single column, and the schedules say
"Hawai'i" with any of three apostrophes. Parsers must not each invent their own
matching, so all of them resolve through :func:`resolve` here.

The registry itself is derived from the package's own coaching files (which
carry one heading per school, with nickname, for ten conferences) plus the two
independents named in the schedule file. Nothing is invented: if a name cannot
be resolved, callers get ``None`` and record the miss.
"""

from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import asdict, dataclass
from functools import lru_cache
from pathlib import Path

from . import mdtable

#: Conference file stem -> (display name, short code).
CONFERENCE_FILES: dict[str, tuple[str, str]] = {
    "aac": ("American Athletic Conference", "AAC"),
    "acc": ("Atlantic Coast Conference", "ACC"),
    "big-ten": ("Big Ten Conference", "B1G"),
    "big12": ("Big 12 Conference", "B12"),
    "cusa": ("Conference USA", "CUSA"),
    "mac": ("Mid-American Conference", "MAC"),
    "mountain-west": ("Mountain West Conference", "MW"),
    "pac12": ("Pac-12 Conference", "PAC"),
    "sec": ("Southeastern Conference", "SEC"),
    "sun-belt": ("Sun Belt Conference", "SBC"),
}

#: Roster-directory stem -> conference file stem.
ROSTER_DIR_CONFERENCE: dict[str, str] = {
    "aac-2026": "aac",
    "acc-2026": "acc",
    "big12-2026": "big12",
    "mac-2026": "mac",
    "mw-2026": "mountain-west",
    "pac12-2026": "pac12",
    "sbc-2026": "sun-belt",
}

#: Headings in the coaching files that are prose, not schools.
_NON_TEAM_HEADING_MARKERS = (
    "completeness",
    "cross-conference",
    "cross-reference",
    "conference notes",
    "notes on",
    "source",
    "key source",
    "membership used",
    "gaps",
)

#: The two FBS independents, which have no coaching file of their own.
INDEPENDENTS: list[tuple[str, str]] = [
    ("Notre Dame", "Fighting Irish"),
    ("UConn", "Huskies"),
]

#: Sun Belt divisions, as published in the schedule companion.
SUN_BELT_DIVISIONS: dict[str, str] = {
    "appalachian-state": "East",
    "coastal-carolina": "East",
    "georgia-southern": "East",
    "georgia-state": "East",
    "james-madison": "East",
    "marshall": "East",
    "old-dominion": "East",
    "arkansas-state": "West",
    "louisiana": "West",
    "louisiana-tech": "West",
    "south-alabama": "West",
    "southern-miss": "West",
    "troy": "West",
    "ulm": "West",
}

#: Football-only members, flagged so the UI can label them.
FOOTBALL_ONLY: set[str] = {"northern-illinois", "north-dakota-state", "sacramento-state"}

#: Extra spellings that :func:`_normalize` alone will not reconcile.
#: Maps a normalized alias -> canonical slug.
MANUAL_ALIASES: dict[str, str] = {
    # Abbreviated "State" forms used by ESPN and the NCAA stat exports.
    "arizona st": "arizona-state",
    "appalachian st": "appalachian-state",
    "app state": "appalachian-state",
    "app st": "appalachian-state",
    "arkansas st": "arkansas-state",
    "ball st": "ball-state",
    "boise st": "boise-state",
    "colorado st": "colorado-state",
    "florida st": "florida-state",
    "fresno st": "fresno-state",
    "georgia st": "georgia-state",
    "iowa st": "iowa-state",
    "jacksonville st": "jacksonville-state",
    "kansas st": "kansas-state",
    "kennesaw st": "kennesaw-state",
    "kent st": "kent-state",
    "michigan st": "michigan-state",
    "mississippi st": "mississippi-state",
    "missouri st": "missouri-state",
    "n dakota st": "north-dakota-state",
    "n. dakota st": "north-dakota-state",
    "north dakota st": "north-dakota-state",
    "new mexico st": "new-mexico-state",
    "ohio st": "ohio-state",
    "oklahoma st": "oklahoma-state",
    "oregon st": "oregon-state",
    "penn st": "penn-state",
    "portland st": "portland-state",
    "sacramento st": "sacramento-state",
    "san diego st": "san-diego-state",
    "san jose st": "san-jose-state",
    "texas st": "texas-state",
    "utah st": "utah-state",
    "washington st": "washington-state",
    "weber st": "weber-state",
    "wichita st": "wichita-state",
    # Directional / abbreviated school names.
    "n texas": "north-texas",
    "n. texas": "north-texas",
    "s florida": "south-florida",
    "s. florida": "south-florida",
    "s carolina": "south-carolina",
    "s. carolina": "south-carolina",
    "n carolina": "north-carolina",
    "n. carolina": "north-carolina",
    "nc state": "nc-state",
    "n.c. state": "nc-state",
    "north carolina state": "nc-state",
    "nc st": "nc-state",
    "w kentucky": "western-kentucky",
    "w. kentucky": "western-kentucky",
    "w virginia": "west-virginia",
    "w. virginia": "west-virginia",
    "w michigan": "western-michigan",
    "w. michigan": "western-michigan",
    "e michigan": "eastern-michigan",
    "e. michigan": "eastern-michigan",
    "c michigan": "central-michigan",
    "c. michigan": "central-michigan",
    "e carolina": "east-carolina",
    "e. carolina": "east-carolina",
    "middle tenn": "middle-tennessee",
    "middle tennessee state": "middle-tennessee",
    "mid tennessee": "middle-tennessee",
    "n illinois": "northern-illinois",
    "n. illinois": "northern-illinois",
    "northern ill": "northern-illinois",
    "bowling grn": "bowling-green",
    "bowling green state": "bowling-green",
    # Initialisms and their expansions.
    "ucf": "ucf",
    "central florida": "ucf",
    "usf": "south-florida",
    "uab": "uab",
    "alabama birmingham": "uab",
    "utsa": "utsa",
    "texas san antonio": "utsa",
    "utep": "utep",
    "texas el paso": "utep",
    "unlv": "unlv",
    "nevada las vegas": "unlv",
    "byu": "byu",
    "brigham young": "byu",
    "tcu": "tcu",
    "texas christian": "tcu",
    "smu": "smu",
    "southern methodist": "smu",
    "lsu": "lsu",
    "louisiana state": "lsu",
    "fiu": "fiu",
    "florida international": "fiu",
    "fau": "florida-atlantic",
    "umass": "umass",
    "massachusetts": "umass",
    "uconn": "uconn",
    "connecticut": "uconn",
    "ucla": "ucla",
    "usc": "usc",
    "southern california": "usc",
    "usc southern california": "usc",
    "southern cal": "usc",
    "pitt": "pittsburgh",
    "ole miss": "ole-miss",
    "mississippi": "ole-miss",
    "miss": "ole-miss",
    "texas a m": "texas-am",
    "texas am": "texas-am",
    "hawaii": "hawaii",
    "hawai i": "hawaii",
    "san jose state": "san-jose-state",
    "miami fl": "miami-fl",
    "miami florida": "miami-fl",
    "miami": "miami-fl",
    "miami oh": "miami-oh",
    # Depth-chart summaries head their sections "<School> <Nickname>" without
    # the state disambiguator the registry carries.
    "miami hurricanes": "miami-fl",
    "miami redhawks": "miami-oh",
    "miami ohio": "miami-oh",
    "louisiana monroe": "ulm",
    "ul monroe": "ulm",
    "louisiana lafayette": "louisiana",
    "ul lafayette": "louisiana",
    "louisiana ragin cajuns": "louisiana",
    "southern mississippi": "southern-miss",
    "southern miss": "southern-miss",
    "army west point": "army",
    "navy midshipmen": "navy",
    "charlotte 49ers": "charlotte",
    "sam houston state": "sam-houston",
    "delaware": "delaware",
    "liberty": "liberty",
    "buffalo": "buffalo",
    "akron": "akron",
    # Short forms used by the FEI / SP+ advanced-rating tables.
    "bgsu": "bowling-green",
    "boston coll": "boston-college",
    "cmu": "central-michigan",
    "coastal caro": "coastal-carolina",
    "ecu": "east-carolina",
    "emu": "eastern-michigan",
    "ga southern": "georgia-southern",
    "ga tech": "georgia-tech",
    "jville st": "jacksonville-state",
    "jmu": "james-madison",
    "la tech": "louisiana-tech",
    "mtsu": "middle-tennessee",
    "miss st": "mississippi-state",
    "nmsu": "new-mexico-state",
    "odu": "old-dominion",
    "s alabama": "south-alabama",
    "so miss": "southern-miss",
    "va tech": "virginia-tech",
    "wku": "western-kentucky",
    "wmu": "western-michigan",
    "wash st": "washington-state",
}

#: Team codes as used in the NCAA individual-leader CSVs ("Player CODE").
#: Only codes that :func:`_normalize` cannot reach on its own are listed.
PLAYER_TEAM_CODES: dict[str, str] = {
    "ALA": "alabama",
    "APP": "appalachian-state",
    "ARIZ": "arizona",
    "ARK": "arkansas",
    "ARST": "arkansas-state",
    "ASU": "arizona-state",
    "AUB": "auburn",
    "BALL": "ball-state",
    "BAY": "baylor",
    "BC": "boston-college",
    "BGSU": "bowling-green",
    "BSU": "boise-state",
    "BUFF": "buffalo",
    "BYU": "byu",
    "CAL": "california",
    "CCU": "coastal-carolina",
    "CIN": "cincinnati",
    "CLEM": "clemson",
    "CMU": "central-michigan",
    "COLO": "colorado",
    "CSU": "colorado-state",
    "DUKE": "duke",
    "ECU": "east-carolina",
    "EMU": "eastern-michigan",
    "FAU": "florida-atlantic",
    "FIU": "fiu",
    "FLA": "florida",
    "FRES": "fresno-state",
    "FSU": "florida-state",
    "GASO": "georgia-southern",
    "GAST": "georgia-state",
    "GT": "georgia-tech",
    "HAW": "hawaii",
    "HOU": "houston",
    "ILL": "illinois",
    "IND": "indiana",
    "ISU": "iowa-state",
    "IOWA": "iowa",
    "JMU": "james-madison",
    "JVST": "jacksonville-state",
    "KENN": "kennesaw-state",
    "KENT": "kent-state",
    "KSU": "kansas-state",
    "KU": "kansas",
    "KY": "kentucky",
    "LIB": "liberty",
    "LSU": "lsu",
    "LT": "louisiana-tech",
    "LOU": "louisville",
    "MAR": "marshall",
    "MD": "maryland",
    "MEM": "memphis",
    "MIA": "miami-fl",
    "MICH": "michigan",
    "MINN": "minnesota",
    "MISS": "ole-miss",
    "MIZ": "missouri",
    "MSST": "mississippi-state",
    "MSU": "michigan-state",
    "MTSU": "middle-tennessee",
    "MMKS": "missouri-state",
    "NAVY": "navy",
    "NCST": "nc-state",
    "ND": "notre-dame",
    "NDSU": "north-dakota-state",
    "NEB": "nebraska",
    "NEV": "nevada",
    "NIU": "northern-illinois",
    "NMSU": "new-mexico-state",
    "NW": "northwestern",
    "ODU": "old-dominion",
    "OHIO": "ohio",
    "OKST": "oklahoma-state",
    "OKLA": "oklahoma",
    "ORE": "oregon",
    "ORST": "oregon-state",
    "OSU": "ohio-state",
    "PITT": "pittsburgh",
    "PSU": "penn-state",
    "PUR": "purdue",
    "RICE": "rice",
    "RUTG": "rutgers",
    "SAC": "sacramento-state",
    "SC": "south-carolina",
    "SDSU": "san-diego-state",
    "SHSU": "sam-houston",
    "SJSU": "san-jose-state",
    "SMU": "smu",
    "STAN": "stanford",
    "SYR": "syracuse",
    "TAMU": "texas-am",
    "TCU": "tcu",
    "TEM": "temple",
    "TENN": "tennessee",
    "TEX": "texas",
    "TOL": "toledo",
    "TROY": "troy",
    "TTU": "texas-tech",
    "TULN": "tulane",
    "TULS": "tulsa",
    "UAB": "uab",
    "UCF": "ucf",
    "UCLA": "ucla",
    "UCONN": "uconn",
    "UGA": "georgia",
    "ULL": "louisiana",
    "ULM": "ulm",
    "UMASS": "umass",
    "UNC": "north-carolina",
    "UNLV": "unlv",
    "UNM": "new-mexico",
    "UNT": "north-texas",
    "USA": "south-alabama",
    "USC": "usc",
    "USF": "south-florida",
    "USM": "southern-miss",
    "UTAH": "utah",
    "UTEP": "utep",
    "UTSA": "utsa",
    "UVA": "virginia",
    "VAN": "vanderbilt",
    "VT": "virginia-tech",
    "WAKE": "wake-forest",
    "WASH": "washington",
    "WKU": "western-kentucky",
    "WMU": "western-michigan",
    "WSU": "washington-state",
    "WVU": "west-virginia",
    "WIS": "wisconsin",
    "WYO": "wyoming",
    # Alternate codes the NCAA leader tables use across seasons.
    "AF": "air-force",
    "AFA": "air-force",
    "AKR": "akron",
    "APST": "appalachian-state",
    "AZST": "arizona-state",
    "CCAR": "coastal-carolina",
    "CHAR": "charlotte",
    "CINN": "cincinnati",
    "COL": "colorado",
    "CONN": "uconn",
    "DEL": "delaware",
    "GSU": "georgia-state",
    "IAST": "iowa-state",
    "KAN": "kansas",
    "KSST": "kansas-state",
    "MASS": "umass",
    "MIOH": "miami-oh",
    "MIZZ": "missouri",
    "MOST": "missouri-state",
    "MRSH": "marshall",
    "NMST": "new-mexico-state",
    "RUT": "rutgers",
    "SCAR": "south-carolina",
    "TLSA": "tulsa",
    "TXST": "texas-state",
    "UK": "kentucky",
    "ULA": "louisiana",
    "UMD": "maryland",
    "USU": "utah-state",
    "WF": "wake-forest",
    "WISC": "wisconsin",
}

_SLUG_STRIP_RE = re.compile(r"[^a-z0-9]+")
_PAREN_RE = re.compile(r"\s*\(([^)]*)\)")


def _fold(text: str) -> str:
    """Lowercase, strip accents and the several apostrophe characters in use."""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.replace("’", "").replace("ʻ", "").replace("'", "")
    text = text.replace("–", "-").replace("—", "-")
    return text.lower().strip()


def slugify(name: str) -> str:
    """URL-safe slug for a school name."""
    folded = _fold(name)
    folded = folded.replace("&", "and")
    return _SLUG_STRIP_RE.sub("-", folded).strip("-")


def _normalize(name: str) -> str:
    """Aggressive normalization used for alias lookup only."""
    folded = _fold(mdtable.strip_markdown(name))
    folded = folded.replace("&", " ")
    folded = _SLUG_STRIP_RE.sub(" ", folded).strip()
    for suffix in (" football", " fbs"):
        if folded.endswith(suffix):
            folded = folded[: -len(suffix)]
    return re.sub(r"\s+", " ", folded).strip()


@dataclass(frozen=True)
class Team:
    """One canonical 2026 FBS program."""

    slug: str
    school: str
    nickname: str | None
    conference: str
    conference_slug: str
    conference_short: str
    division: str | None = None
    football_only: bool = False

    @property
    def display_name(self) -> str:
        return f"{self.school} {self.nickname}" if self.nickname else self.school

    def to_dict(self) -> dict:
        data = asdict(self)
        data["display_name"] = self.display_name
        return data


def _is_team_heading(title: str) -> bool:
    lowered = title.lower()
    if not lowered:
        return False
    return not any(marker in lowered for marker in _NON_TEAM_HEADING_MARKERS)


def _split_school_nickname(title: str, known_slugs: set[str]) -> tuple[str, str | None]:
    """Split "Georgia Tech Yellow Jackets" into school and nickname.

    The coaching headings concatenate the two with no delimiter, so the split is
    found by taking the longest leading run of words that is a school we already
    expect. Where that fails, the heuristics below cover the published forms.
    """
    # Drop an ordinal prefix ("1. Air Force Falcons") and trailing editorial notes.
    title = re.sub(r"^\s*\d+\.\s*", "", title)
    title = re.sub(r"\s*\(([^)]*)\)\s*$", lambda m: _keep_paren(m.group(1)), title)
    title = title.split("*")[0].strip()

    words = title.split()
    for count in range(len(words) - 1, 0, -1):
        candidate = " ".join(words[:count])
        if slugify(candidate) in known_slugs:
            return candidate, " ".join(words[count:]) or None
    if len(words) > 1:
        return " ".join(words[:-1]), words[-1]
    return title, None


def _keep_paren(inner: str) -> str:
    """Keep "(FL)" / "(OH)" style disambiguators, drop editorial parentheticals."""
    if len(inner) <= 3 and inner.isalpha():
        return f" ({inner})"
    return ""


#: Schools whose published heading needs an explicit split.
_HEADING_SPLITS: dict[str, tuple[str, str]] = {
    "army black knights": ("Army", "Black Knights"),
    "navy midshipmen": ("Navy", "Midshipmen"),
    "charlotte 49ers": ("Charlotte", "49ers"),
    "rice owls": ("Rice", "Owls"),
    "temple owls": ("Temple", "Owls"),
    "tulane green wave": ("Tulane", "Green Wave"),
    "tulsa golden hurricane": ("Tulsa", "Golden Hurricane"),
    "uab blazers": ("UAB", "Blazers"),
    "utsa roadrunners": ("UTSA", "Roadrunners"),
    "memphis tigers": ("Memphis", "Tigers"),
    "east carolina pirates": ("East Carolina", "Pirates"),
    "north texas mean green": ("North Texas", "Mean Green"),
    "south florida bulls": ("South Florida", "Bulls"),
    "florida atlantic owls": ("Florida Atlantic", "Owls"),
    "boston college eagles": ("Boston College", "Eagles"),
    "california golden bears": ("California", "Golden Bears"),
    "clemson tigers": ("Clemson", "Tigers"),
    "duke blue devils": ("Duke", "Blue Devils"),
    "florida state seminoles": ("Florida State", "Seminoles"),
    "georgia tech yellow jackets": ("Georgia Tech", "Yellow Jackets"),
    "louisville cardinals": ("Louisville", "Cardinals"),
    "miami (fl) hurricanes": ("Miami (FL)", "Hurricanes"),
    "nc state wolfpack": ("NC State", "Wolfpack"),
    "north carolina tar heels": ("North Carolina", "Tar Heels"),
    "pittsburgh panthers": ("Pittsburgh", "Panthers"),
    "smu mustangs": ("SMU", "Mustangs"),
    "stanford cardinal": ("Stanford", "Cardinal"),
    "syracuse orange": ("Syracuse", "Orange"),
    "virginia cavaliers": ("Virginia", "Cavaliers"),
    "virginia tech hokies": ("Virginia Tech", "Hokies"),
    "wake forest demon deacons": ("Wake Forest", "Demon Deacons"),
    "illinois fighting illini": ("Illinois", "Fighting Illini"),
    "indiana hoosiers": ("Indiana", "Hoosiers"),
    "iowa hawkeyes": ("Iowa", "Hawkeyes"),
    "maryland terrapins": ("Maryland", "Terrapins"),
    "michigan wolverines": ("Michigan", "Wolverines"),
    "michigan state spartans": ("Michigan State", "Spartans"),
    "minnesota golden gophers": ("Minnesota", "Golden Gophers"),
    "nebraska cornhuskers": ("Nebraska", "Cornhuskers"),
    "northwestern wildcats": ("Northwestern", "Wildcats"),
    "ohio state buckeyes": ("Ohio State", "Buckeyes"),
    "oregon ducks": ("Oregon", "Ducks"),
    "penn state nittany lions": ("Penn State", "Nittany Lions"),
    "purdue boilermakers": ("Purdue", "Boilermakers"),
    "rutgers scarlet knights": ("Rutgers", "Scarlet Knights"),
    "ucla bruins": ("UCLA", "Bruins"),
    "usc trojans": ("USC", "Trojans"),
    "washington huskies": ("Washington", "Huskies"),
    "wisconsin badgers": ("Wisconsin", "Badgers"),
    "arizona wildcats": ("Arizona", "Wildcats"),
    "arizona state sun devils": ("Arizona State", "Sun Devils"),
    "baylor bears": ("Baylor", "Bears"),
    "byu cougars": ("BYU", "Cougars"),
    "cincinnati bearcats": ("Cincinnati", "Bearcats"),
    "colorado buffaloes": ("Colorado", "Buffaloes"),
    "houston cougars": ("Houston", "Cougars"),
    "iowa state cyclones": ("Iowa State", "Cyclones"),
    "kansas jayhawks": ("Kansas", "Jayhawks"),
    "kansas state wildcats": ("Kansas State", "Wildcats"),
    "oklahoma state cowboys": ("Oklahoma State", "Cowboys"),
    "tcu horned frogs": ("TCU", "Horned Frogs"),
    "texas tech red raiders": ("Texas Tech", "Red Raiders"),
    "ucf knights": ("UCF", "Knights"),
    "utah utes": ("Utah", "Utes"),
    "west virginia mountaineers": ("West Virginia", "Mountaineers"),
    "delaware fightin blue hens": ("Delaware", "Fightin' Blue Hens"),
    "fiu panthers": ("FIU", "Panthers"),
    "jacksonville state gamecocks": ("Jacksonville State", "Gamecocks"),
    "kennesaw state owls": ("Kennesaw State", "Owls"),
    "liberty flames": ("Liberty", "Flames"),
    "middle tennessee blue raiders": ("Middle Tennessee", "Blue Raiders"),
    "missouri state bears": ("Missouri State", "Bears"),
    "new mexico state aggies": ("New Mexico State", "Aggies"),
    "sam houston bearkats": ("Sam Houston", "Bearkats"),
    "western kentucky hilltoppers": ("Western Kentucky", "Hilltoppers"),
    "akron zips": ("Akron", "Zips"),
    "ball state cardinals": ("Ball State", "Cardinals"),
    "bowling green falcons": ("Bowling Green", "Falcons"),
    "buffalo bulls": ("Buffalo", "Bulls"),
    "central michigan chippewas": ("Central Michigan", "Chippewas"),
    "eastern michigan eagles": ("Eastern Michigan", "Eagles"),
    "kent state golden flashes": ("Kent State", "Golden Flashes"),
    "miami (oh) redhawks": ("Miami (OH)", "RedHawks"),
    "ohio bobcats": ("Ohio", "Bobcats"),
    "sacramento state hornets": ("Sacramento State", "Hornets"),
    "toledo rockets": ("Toledo", "Rockets"),
    "umass minutemen": ("UMass", "Minutemen"),
    "western michigan broncos": ("Western Michigan", "Broncos"),
    "air force falcons": ("Air Force", "Falcons"),
    "hawaii rainbow warriors": ("Hawai'i", "Rainbow Warriors"),
    "nevada wolf pack": ("Nevada", "Wolf Pack"),
    "new mexico lobos": ("New Mexico", "Lobos"),
    "northern illinois huskies": ("Northern Illinois", "Huskies"),
    "north dakota state bison": ("North Dakota State", "Bison"),
    "san jose state spartans": ("San José State", "Spartans"),
    "unlv rebels": ("UNLV", "Rebels"),
    "utep miners": ("UTEP", "Miners"),
    "wyoming cowboys": ("Wyoming", "Cowboys"),
    "boise state broncos": ("Boise State", "Broncos"),
    "colorado state rams": ("Colorado State", "Rams"),
    "fresno state bulldogs": ("Fresno State", "Bulldogs"),
    "oregon state beavers": ("Oregon State", "Beavers"),
    "san diego state aztecs": ("San Diego State", "Aztecs"),
    "texas state bobcats": ("Texas State", "Bobcats"),
    "utah state aggies": ("Utah State", "Aggies"),
    "washington state cougars": ("Washington State", "Cougars"),
    "alabama crimson tide": ("Alabama", "Crimson Tide"),
    "arkansas razorbacks": ("Arkansas", "Razorbacks"),
    "auburn tigers": ("Auburn", "Tigers"),
    "florida gators": ("Florida", "Gators"),
    "georgia bulldogs": ("Georgia", "Bulldogs"),
    "kentucky wildcats": ("Kentucky", "Wildcats"),
    "lsu tigers": ("LSU", "Tigers"),
    "mississippi state bulldogs": ("Mississippi State", "Bulldogs"),
    "missouri tigers": ("Missouri", "Tigers"),
    "oklahoma sooners": ("Oklahoma", "Sooners"),
    "ole miss rebels": ("Ole Miss", "Rebels"),
    "south carolina gamecocks": ("South Carolina", "Gamecocks"),
    "tennessee volunteers": ("Tennessee", "Volunteers"),
    "texas longhorns": ("Texas", "Longhorns"),
    "texas a m aggies": ("Texas A&M", "Aggies"),
    "vanderbilt commodores": ("Vanderbilt", "Commodores"),
    "appalachian state mountaineers": ("Appalachian State", "Mountaineers"),
    "coastal carolina chanticleers": ("Coastal Carolina", "Chanticleers"),
    "georgia southern eagles": ("Georgia Southern", "Eagles"),
    "georgia state panthers": ("Georgia State", "Panthers"),
    "james madison dukes": ("James Madison", "Dukes"),
    "marshall thundering herd": ("Marshall", "Thundering Herd"),
    "old dominion monarchs": ("Old Dominion", "Monarchs"),
    "arkansas state red wolves": ("Arkansas State", "Red Wolves"),
    "louisiana ragin cajuns": ("Louisiana", "Ragin' Cajuns"),
    "louisiana tech bulldogs": ("Louisiana Tech", "Bulldogs"),
    "south alabama jaguars": ("South Alabama", "Jaguars"),
    "southern miss golden eagles": ("Southern Miss", "Golden Eagles"),
    "troy trojans": ("Troy", "Trojans"),
    "ulm warhawks": ("ULM", "Warhawks"),
}

#: Slug overrides where :func:`slugify` would not match the package's own slugs.
_SLUG_OVERRIDES: dict[str, str] = {
    "Miami (FL)": "miami-fl",
    "Miami (OH)": "miami-oh",
    "Hawai'i": "hawaii",
    "San José State": "san-jose-state",
    "Texas A&M": "texas-am",
}


class TeamRegistry:
    """All 2026 FBS programs, with name resolution across every source."""

    def __init__(self, teams: list[Team]):
        self.teams = sorted(teams, key=lambda team: team.slug)
        self._by_slug = {team.slug: team for team in self.teams}
        self._alias: dict[str, str] = {}
        for team in self.teams:
            self._register(team.school, team.slug)
            self._register(team.slug.replace("-", " "), team.slug)
            if team.nickname:
                self._register(f"{team.school} {team.nickname}", team.slug)
            bare = _PAREN_RE.sub("", team.school).strip()
            if bare != team.school:
                self._register(bare, team.slug)
            # "State" <-> "St." is the single most common variant.
            if " State" in team.school:
                self._register(team.school.replace(" State", " St"), team.slug)
                self._register(team.school.replace(" State", " St."), team.slug)
        for alias, slug in MANUAL_ALIASES.items():
            if slug in self._by_slug:
                self._alias[_normalize(alias)] = slug

    def _register(self, name: str, slug: str) -> None:
        key = _normalize(name)
        # First registration wins, so bare "Miami" keeps whatever MANUAL_ALIASES
        # decides rather than being claimed by Miami (OH) on iteration order.
        if key and key not in self._alias:
            self._alias[key] = slug

    def __len__(self) -> int:
        return len(self.teams)

    def __iter__(self):
        return iter(self.teams)

    def get(self, slug: str) -> Team | None:
        return self._by_slug.get(slug)

    def resolve(self, name: str | None) -> str | None:
        """Canonical slug for any spelling of a team name, or ``None``."""
        if not name:
            return None
        text = mdtable.strip_markdown(name)
        if not text:
            return None
        # Drop rank prefixes ("No. 7 Miami", "#7 Miami") and trailing records.
        text = re.sub(r"^\s*(no\.?\s*\d+|#\d+)\s+", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*\(\s*\d+\s*[-–]\s*\d+\s*\)\s*$", "", text)
        text = text.replace("*", "").strip()

        key = _normalize(text)
        if key in self._alias:
            return self._alias[key]
        # Parenthetical gloss, e.g. "USC (Southern California)".
        without_paren = _normalize(_PAREN_RE.sub("", text))
        if without_paren in self._alias:
            return self._alias[without_paren]
        inner = _PAREN_RE.search(text)
        if inner:
            inner_key = _normalize(inner.group(1))
            if inner_key in self._alias:
                return self._alias[inner_key]
        # Trailing qualifiers the sources append, e.g. "Bryant (FCS)".
        for suffix in (" fcs", " fb only", " football only"):
            if key.endswith(suffix):
                trimmed = key[: -len(suffix)].strip()
                if trimmed in self._alias:
                    return self._alias[trimmed]
        return None

    def resolve_player_code(self, code: str | None) -> str | None:
        """Slug for an NCAA individual-leader team code such as ``FRES``."""
        if not code:
            return None
        upper = code.strip().upper()
        if upper in PLAYER_TEAM_CODES:
            return PLAYER_TEAM_CODES[upper]
        return self.resolve(code)

    def resolve_stat_team(self, value: str | None) -> str | None:
        """Slug for the NCAA team CSV column, e.g. ``Arizona State Arizona St.``.

        That column concatenates the full name and the site's abbreviation. The
        longest canonical name that prefixes the cell wins; a whole-cell match is
        tried first so single-word teams ("Utah Utah") resolve cleanly.
        """
        if not value:
            return None
        text = mdtable.strip_markdown(value)
        direct = self.resolve(text)
        if direct:
            return direct
        words = text.split()
        for count in range(len(words) - 1, 0, -1):
            slug = self.resolve(" ".join(words[:count]))
            if slug:
                return slug
        return None

    def to_list(self) -> list[dict]:
        return [team.to_dict() for team in self.teams]


def _coaching_dir(package_root: Path) -> Path:
    return package_root / "03-coaching"


def build_registry(package_root: Path) -> TeamRegistry:
    """Derive the registry from the package's coaching files plus independents."""
    known_slugs = {slugify(school) for school, _ in _HEADING_SPLITS.values()}
    known_slugs |= {slug for slug in _SLUG_OVERRIDES.values()}

    teams: list[Team] = []
    seen: set[str] = set()
    for stem, (conference, short) in CONFERENCE_FILES.items():
        path = _coaching_dir(package_root) / f"{stem}.md"
        text = path.read_text(encoding="utf-8")
        for section in mdtable.iter_sections(text, level=2):
            title = section.title
            if not _is_team_heading(title):
                continue
            cleaned = re.sub(r"^\s*\d+\.\s*", "", title).split("*")[0].strip()
            split = _HEADING_SPLITS.get(_normalize(cleaned))
            if split:
                school, nickname = split
            else:
                school, nickname = _split_school_nickname(cleaned, known_slugs)
            slug = _SLUG_OVERRIDES.get(school) or slugify(school)
            if slug in seen:
                continue
            seen.add(slug)
            teams.append(
                Team(
                    slug=slug,
                    school=school,
                    nickname=nickname,
                    conference=conference,
                    conference_slug=stem,
                    conference_short=short,
                    division=SUN_BELT_DIVISIONS.get(slug),
                    football_only=slug in FOOTBALL_ONLY,
                )
            )

    for school, nickname in INDEPENDENTS:
        slug = slugify(school)
        if slug in seen:
            continue
        seen.add(slug)
        teams.append(
            Team(
                slug=slug,
                school=school,
                nickname=nickname,
                conference="FBS Independents",
                conference_slug="independents",
                conference_short="IND",
            )
        )

    return TeamRegistry(teams)


@lru_cache(maxsize=4)
def registry(package_root: str | Path) -> TeamRegistry:
    """Cached registry for a package root."""
    return build_registry(Path(package_root))


def conference_index(reg: TeamRegistry) -> list[dict]:
    """Conference summary rows, ordered by name, for the site's nav."""
    grouped: dict[str, dict] = {}
    for team in reg:
        entry = grouped.setdefault(
            team.conference_slug,
            {
                "slug": team.conference_slug,
                "name": team.conference,
                "short": team.conference_short,
                "teams": [],
            },
        )
        entry["teams"].append(team.slug)
    for entry in grouped.values():
        entry["teams"].sort()
        entry["team_count"] = len(entry["teams"])
    return sorted(grouped.values(), key=lambda entry: entry["name"])


def catalog_slugs(package_root: Path) -> dict[str, str]:
    """Roster-file slug -> canonical slug, from the package's own catalog."""
    catalog = json.loads((package_root / "catalog.json").read_text(encoding="utf-8"))
    reg = registry(package_root)
    mapping: dict[str, str] = {}
    for conference in catalog.get("conferences", {}).values():
        for team in conference.get("teams", []):
            resolved = reg.resolve(team["name"]) or team["slug"]
            mapping[team["slug"]] = resolved
    return mapping
