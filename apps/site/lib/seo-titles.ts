// Query-shaped, length-guarded <title> builders for the catch-all route.
// Every title must stay <=60 chars INCLUDING the "| CFB Apex" layout
// template suffix so Google truncation never hides the intent-bearing tail
// (2026-09-21 crawl: 139/150 pages shared the layout default; stadium
// titles ran to 70 chars).

const BRAND_SUFFIX = " | CFB Apex";

/** Longest team shortName in the 2026 dataset ("Jacksonsville State" class). */
const FULL_TEAM_TAIL = " Football: Schedule, Roster & Portal";
const SHORT_TEAM_TAIL = " Football: Schedule & Roster";

export function teamPageTitle(shortName: string): string {
  const full = `${shortName}${FULL_TEAM_TAIL}`;
  if (full.length + BRAND_SUFFIX.length <= 60) return full;
  return `${shortName}${SHORT_TEAM_TAIL}`;
}

const STADIUM_BAG_TAIL = ": Bag Policy, Parking & Seating";
const STADIUM_GUIDE_TAIL = " Gameday Guide";
const STADIUM_TEAM_FALLBACK = " Stadium Guide: Bag Policy & Parking";

export function stadiumPageTitle(
  stadiumName: string,
  teamShortName?: string,
  options?: { disambiguate?: boolean },
): string {
  // Shared stadium names ("Memorial Stadium" x3) resolve to the team brand,
  // which is also the stronger query.
  if (options?.disambiguate && teamShortName) {
    return `${teamShortName}${STADIUM_TEAM_FALLBACK}`;
  }
  const withBag = `${stadiumName}${STADIUM_BAG_TAIL}`;
  if (withBag.length + BRAND_SUFFIX.length <= 60) return withBag;
  const guide = `${stadiumName}${STADIUM_GUIDE_TAIL}`;
  if (guide.length + BRAND_SUFFIX.length <= 60) return guide;
  // Long corporate stadium names: the team brand carries the query intent.
  return `${teamShortName ?? stadiumName}${STADIUM_TEAM_FALLBACK}`;
}

/** Titles for static roots that previously inherited the layout default. */
export const STATIC_ROOT_TITLES: Record<string, string> = {
  scores: "Live College Football Scores",
  schedule: "2026 College Football Schedule",
  "transfer-portal": "College Football Transfer Portal Board",
  "playoff-predictor": "College Football Playoff Predictor",
  "playoff-bracket": "College Football Playoff Bracket",
  "no-names": "The Names Behind the Numbers",
  heisman: "Heisman Trophy Race",
  nil: "NIL Deals & Valuations",
  panel: "CFB Apex Panel",
  coaches: "College Football Coaching Ledger",
  "coaching-carousel": "Coaching Carousel Tracker",
  dfs: "College Fantasy Notes Board",
  teams: "All 138 FBS Teams",
  conferences: "FBS Conference Hub",
  stadiums: "College Football Stadium Gameday Guides",
  watch: "Where to Watch College Football",
  rankings: "Rankings & Polls",
  search: "Search Teams, Coaches, and Players",
  newsletter: "The Saturday Newsletter",
  methodology: "Methodology",
  "data-sources": "Data Sources",
  corrections: "Corrections Policy",
  about: "About CFB Apex",
  advertise: "Advertise",
  partnerships: "Partnerships",
  "media-kit": "Media Kit",
  privacy: "Privacy Policy",
  terms: "Terms of Service",
  "affiliate-disclosure": "Affiliate Disclosure",
  "responsible-gaming": "Responsible Gaming",
  "design-system": "Design System",
};

export function staticRootTitle(root: string): string | undefined {
  return STATIC_ROOT_TITLES[root];
}
