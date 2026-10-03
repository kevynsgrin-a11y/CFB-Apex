// One-shot: write Week 5 (2026) polls + post-Week-4 ratings into the vendored
// dataset from the Oct 3 research report. Fails loudly on any team that does
// not resolve to a slug in teams.json — no silent "Not published" rows.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../data/cfb-2026", import.meta.url));
const teams = JSON.parse(readFileSync(join(root, "teams.json"), "utf8")).teams;

const byName = new Map(teams.map((t) => [t.school.toLowerCase(), t.slug]));
const ALIASES = {
  "miami (fl)": "miami-fl", "miami": "miami-fl",
  "miami (oh)": "miami-oh",
  "pitt": "pittsburgh", "pittsburgh": "pittsburgh",
  "ole miss": "ole-miss", "usc": "usc", "ucla": "ucla", "tcu": "tcu",
  "ucf": "ucf", "utsa": "utsa", "smu": "smu", "byu": "byu",
  "nc state": "nc-state", "unlv": "unlv", "fiu": "fiu", "uab": "uab",
  "umass": "umass", "utep": "utep", "ulm": "ulm", "odu": "old-dominion",
  "jmu": "james-madison", "boise state": "boise-state",
};
const resolved = new Map();
function slugFor(raw) {
  const key = raw.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
  const slug = byName.get(key) ?? ALIASES[key] ?? byName.get(key.replace(/ \(fl\)| \(oh\)/, ""));
  if (!slug) throw new Error(`UNRESOLVED TEAM: "${raw}"`);
  const prev = resolved.get(slug);
  if (prev && prev !== raw) throw new Error(`SLUG COLLISION ${slug}: "${prev}" vs "${raw}"`);
  resolved.set(slug, raw);
  return slug;
}
const rec = (w, l) => ({ wins: w, losses: l });

/* ---- AP Top 25, Week 5 (released Sun Sep 27, 2026) ---- */
const ap = [
  ["Texas", 62, "4-0", 1737, 1], ["Georgia", 6, "4-0", 1646, 2], ["Notre Dame", null, "4-0", 1581, 3],
  ["Miami (FL)", 1, "4-0", 1501, 6], ["Ohio State", null, "3-1", 1465, 7], ["Indiana", 1, "4-0", 1408, 5],
  ["Alabama", null, "4-0", 1305, 8], ["Florida", null, "4-0", 1272, 21], ["Ole Miss", null, "3-1", 1089, 4],
  ["BYU", null, "3-0", 1078, 9], ["LSU", null, "3-1", 1073, 10], ["Texas Tech", null, "4-0", 1053, 11],
  ["Utah", null, "4-0", 903, 15], ["Iowa", null, "4-0", 856, 17], ["Oregon", null, "3-1", 725, 20],
  ["Mississippi State", null, "4-0", 715, 24], ["Tennessee", null, "3-1", 663, 14], ["USC", null, "4-1", 410, 12],
  ["Oklahoma State", null, "3-1", 345, null], ["Houston", null, "3-1", 278, 25], ["SMU", null, "3-1", 246, 22],
  ["Boise State", null, "3-1", 221, null], ["UCLA", null, "4-0", 218, null], ["Kentucky", null, "3-1", 150, null],
  ["Missouri", null, "3-1", 118, 19],
].map(([team, fpv, r, pts, prev], i) => ({
  rank: i + 1, team_slug: slugFor(team), team,
  record: rec(...r.split("-").map(Number)), points: pts,
  first_place_votes: fpv, previous_rank: prev, tied: false,
}));
const apOthers = [
  ["Wisconsin", 102], ["Duke", 101], ["Penn State", 98], ["Wake Forest", 88], ["Virginia Tech", 86],
  ["Michigan", 54], ["Pitt", 52], ["Nebraska", 36], ["Louisville", 25], ["Cincinnati", 20],
  ["James Madison", 10], ["Arizona", 8], ["Minnesota", 7], ["North Dakota State", 6], ["Northwestern", 1],
].map(([team, points]) => ({ team, team_slug: slugFor(team), points }));

/* ---- US LBM Coaches Poll, Week 5 (released Sun Sep 27, 2026) ---- */
const coaches = [
  ["Texas", 45, "4-0", 1779, 1], ["Georgia", 17, "4-0", 1735, 2], ["Notre Dame", 3, "4-0", 1641, 3],
  ["Miami (FL)", null, "4-0", 1569, 5], ["Indiana", 8, "4-0", 1554, 4], ["Ohio State", null, "3-1", 1463, 7],
  ["Alabama", null, "4-0", 1399, 8], ["Florida", null, "4-0", 1214, 22], ["BYU", null, "3-0", 1166, 9],
  ["Texas Tech", null, "4-0", 1108, 10], ["LSU", null, "3-1", 1097, 11], ["Ole Miss", null, "3-1", 1021, 6],
  ["Utah", null, "4-0", 917, 15], ["Iowa", null, "4-0", 887, 17], ["Oregon", null, "3-1", 866, 16],
  ["Mississippi State", null, "4-0", 658, null], ["Tennessee", null, "3-1", 648, 13], ["USC", null, "4-1", 511, 12],
  ["SMU", null, "3-1", 327, 25], ["Houston", null, "3-1", 301, null], ["Duke", null, "4-0", 230, null],
  ["Penn State", null, "3-1", 207, 14], ["UCLA", null, "4-0", 183, null], ["Michigan", null, "3-1", 166, 18],
  ["Missouri", null, "3-1", 152, 21],
].map(([team, fpv, r, pts, prev], i) => ({
  rank: i + 1, team_slug: slugFor(team), team,
  record: rec(...r.split("-").map(Number)), points: pts,
  first_place_votes: fpv, previous_rank: prev, tied: false,
}));
const coachesOthers = [
  ["Oklahoma State", 126], ["Kentucky", 123], ["Boise State", 112], ["Pitt", 97], ["Virginia Tech", 84],
  ["Nebraska", 67], ["Wake Forest", 48], ["Louisville", 42], ["Wisconsin", 39], ["Cincinnati", 35],
  ["Auburn", 22], ["Washington", 20], ["James Madison", 17], ["Virginia", 15], ["Texas A&M", 14],
  ["Northwestern", 12], ["North Dakota State", 11], ["UMass", 9], ["New Mexico", 7], ["Minnesota", 7],
  ["Oklahoma", 6], ["Clemson", 5], ["Arizona", 3], ["Western Michigan", 2], ["UTSA", 2], ["West Virginia", 1],
].map(([team, points]) => ({ team, team_slug: slugFor(team), points }));

const pollsDoc = {
  comparison_notes: [
    "AP and Coaches agree on Texas at No. 1; SP+ and FPI both rank Georgia No. 1 (Texas 7th SP+, 4th FPI).",
    "Previous-rank columns use the Week 4 AP/Coaches polls; NCAA.com's prev-rank column contained errors and was not used.",
    "No CFP rankings exist yet; the selection committee's first rankings come in November 2026.",
  ],
  meta: {
    as_of: "2026-10-03", dataset: "polls", schema_version: "1.0.0",
    notes: [
      "Week 5 polls released Sunday, September 27, 2026.",
      "Dropped from AP: Penn State (13), Louisville (16), Michigan (18), Texas A&M (23).",
      "An em dash or blank in first-place votes means zero; null previous_rank means the team was not ranked the prior week.",
    ],
    sources: ["NCAA.com", "Yahoo Sports", "Legion Report", "College Football News"],
  },
  polls: [
    { poll: "ap", name: "Associated Press Top 25", release_date: "Sunday, September 27, 2026", rankings: ap, others_receiving_votes: apOthers },
    { poll: "coaches", name: "USA Today Sports / US LBM Coaches Poll (conducted with AFCA participation)", release_date: "Sunday, September 27, 2026", rankings: coaches, others_receiving_votes: coachesOthers },
  ],
  status: {
    next_update: "2026-10-04T14:00:00-04:00",
    note: "Week 5 polls (released September 27, 2026) are in effect. Week 6 polls are expected Sunday, October 4, 2026 (AP ~2 p.m. ET).",
  },
};
writeFileSync(join(root, "polls/latest.json"), JSON.stringify(pollsDoc, null, 2) + "\n");
console.log("polls/latest.json written:", ap.length, "AP +", coaches.length, "Coaches entries");

/* ---- Ratings: SP+ after Week 4 (ESPN/Bill Connelly) + FPI snapshot ---- */
const SP = {
  Georgia: 30.2, "Ohio State": 28.8, "Notre Dame": 28.1, Indiana: 26.9, "Miami (FL)": 25.7,
  Alabama: 23.0, Texas: 22.4, Oregon: 21.6, Utah: 21.5, LSU: 21.3, "Texas Tech": 20.2,
  Florida: 18.5, USC: 17.8, Tennessee: 17.7, "Penn State": 16.9, Nebraska: 16.9, BYU: 16.3,
  "Mississippi State": 15.1, Iowa: 14.8, Pitt: 14.7, Virginia: 14.4, Michigan: 14.3,
  "Kansas State": 14.0, UCLA: 13.8, Missouri: 13.7,
};
const FPI = ["Georgia", "Notre Dame", "Ohio State", "Texas", "Miami (FL)", "Alabama", "Indiana", "LSU",
  "Oregon", "Florida", "Tennessee", "Utah", "Texas Tech", "Nebraska", "Penn State", "Texas A&M",
  "BYU", "USC", "Ole Miss", "Mississippi State", "Oklahoma", "Pitt", "Michigan", "Auburn", "Iowa"];
const FPI_VALUES = { "Ohio State": 27.8, Indiana: 24.4, Oregon: 21.7, Nebraska: 16.0, "Penn State": 15.6, USC: 14.8, Michigan: 13.3, Iowa: 12.8, Northwestern: 11.2 };
const CFP_ODDS = { UCLA: 32.4, "Mississippi State": 22.3, Nebraska: 22.3, "Ole Miss": 3.1, Oklahoma: 1.1, "Texas A&M": 0.4 };
const SP_SOURCE = "https://www.espn.com/college-football/story/_/page/sppredictions26"; // via On3 summary, Sept 30, 2026
const FPI_SOURCE = "https://www.espn.com/college-football/fpi"; // snapshot Sept 27, 2026 (Saturday Down South)
const NOTES = {
  "Penn State": "SP+ predates the Week 5 loss at Northwestern; next SP+ update (~Tue Oct 6) will reflect it.",
  "Miami (FL)": "Mensah has more TD passes (14) than incompletions (12) through Week 4.",
};
const seen = new Set();
const rows = [];
for (const [team, overall] of Object.entries(SP)) {
  const slug = slugFor(team); seen.add(team);
  rows.push({
    team_slug: slug, as_of: "2026-09-27",
    sp_plus: { overall, rank: Object.keys(SP).indexOf(team) + 1, offense: null, defense: null, source: SP_SOURCE },
    fpi: null, win_total: null,
    playoff_odds_as_reported: CFP_ODDS[team] != null ? { outlet: "ESPN", value: `${CFP_ODDS[team]}%`, source: SP_SOURCE } : null,
    notes: NOTES[team] ?? null,
  });
}
for (const [i, team] of FPI.entries()) {
  const slug = slugFor(team);
  let row = rows.find((r) => r.team_slug === slug);
  if (!row) { row = { team_slug: slug, as_of: "2026-09-27", sp_plus: null, fpi: null, win_total: null, playoff_odds_as_reported: null, notes: null }; rows.push(row); }
  row.fpi = { value: FPI_VALUES[team] ?? null, rank: i + 1, source: FPI_SOURCE };
}
const ratingsDoc = rows;
writeFileSync(join(root, "ratings/2026-week5.json"), JSON.stringify(ratingsDoc, null, 2) + "\n");
console.log("ratings/2026-week5.json written:", rows.length, "rows");

/* ---- index.json as_of bump ---- */
const indexPath = join(root, "index.json");
const index = JSON.parse(readFileSync(indexPath, "utf8"));
index.meta.as_of = "2026-10-03";
index.meta.notes = [
  "Real 2026 FBS data compiled from published sources. No fixtures, no placeholder teams, no invented values.",
  "Week 5 update (Oct 3, 2026): Week 5 AP + Coaches polls and post-Week-4 SP+/FPI loaded; Saturday Oct 3 games are scheduled/in-progress until confirmed final.",
];
writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n");
console.log("index.json meta.as_of -> 2026-10-03");
console.log("resolved", resolved.size, "unique team slugs — all OK");
