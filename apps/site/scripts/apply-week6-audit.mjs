// One-shot, 2026-10-05: apply the Week 6 verification-audit corrections to
// data/cfb-2026/refresh/verified-refresh.json. Deterministic and fail-loud —
// every team name must resolve to a teams.json slug or the script throws.
//
// Corrections (audit of the Oct 5 07:24 UTC snapshot):
//  1. New Mexico State at FIU (Wed Oct 7, ESPN2) and Old Dominion at App
//     State (Sat Oct 10, ESPN+) were wrongly excluded as "FBS–FCS"; both are
//     FBS-vs-FBS (ESPN conference ids 12/CUSA and 37/Sun Belt). Moved onto
//     the scheduled board; records published.
//  2. The three true FCS-opponent games keep their exclusion but now carry
//     the ESPN conference-id evidence instead of a free-text reason.
//  3. AP + Coaches "others receiving votes" filled from the Oct 4 releases
//     (AP 10 teams, Coaches 15 — verified against ESPN's rankings API).
//  4. Conference standings re-pulled from ESPN (Oct 5) with the fixed
//     display-name aliases; Sun Belt divisions flattened into one table.
//  5. Verified additions published: College GameDay badge data, AP movers,
//     AP-vs-Coaches gaps, ranked-vs-ranked Week 6 set, NDSU storyline.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../data/cfb-2026", import.meta.url));
const refreshPath = join(root, "refresh/verified-refresh.json");
const refresh = JSON.parse(readFileSync(refreshPath, "utf8"));
const teams = JSON.parse(readFileSync(join(root, "teams.json"), "utf8")).teams;

/* ---- slug resolution: school name, display name, or ESPN-name alias ---- */
const bySchool = new Map(teams.map((t) => [t.school.toLowerCase(), t.slug]));
const byDisplay = new Map(teams.map((t) => [t.display_name.toLowerCase(), t.slug]));
// ESPN display names that match neither our school nor display_name.
const ESPN_NAME_ALIASES = {
  "miami hurricanes": "miami-fl",
  "florida international panthers": "fiu",
  "app state mountaineers": "appalachian-state",
  "delaware blue hens": "delaware",
  "massachusetts minutemen": "umass",
  "umass minutemen": "umass",
  "ul monroe warhawks": "ulm",
  "louisiana-monroe warhawks": "ulm",
};
const slugForName = (raw) => {
  const key = String(raw ?? "").toLowerCase().trim();
  const slug = bySchool.get(key) ?? byDisplay.get(key) ?? ESPN_NAME_ALIASES[key];
  if (!slug) throw new Error(`UNRESOLVED TEAM NAME: "${raw}"`);
  return slug;
};

const now = new Date().toISOString();
const applied = [];

/* ---- 1. restore the two wrongly excluded FBS-vs-FBS games ---- */
const RESTORE = [
  {
    provider_id: "401871066",
    date: "2026-10-07",
    kickoff_utc: "2026-10-07T23:30Z",
    time_et: "19:30",
    home_slug: "fiu",
    away_slug: "new-mexico-state",
    site: "Pitbull Stadium",
    tv: "ESPN2",
    espn_conference_ids: { home: 12, away: 12 },
  },
  {
    provider_id: "401869843",
    date: "2026-10-10",
    kickoff_utc: "2026-10-10T17:00Z",
    time_et: "13:00",
    home_slug: "appalachian-state",
    away_slug: "old-dominion",
    site: "Kidd Brewer Stadium",
    tv: "ESPN+",
    espn_conference_ids: { home: 37, away: 37 },
  },
];
const keptExcluded = [];
for (const row of refresh.excludedGames ?? []) {
  const restore = RESTORE.find((r) => r.provider_id === row.provider_id);
  if (!restore) { keptExcluded.push(row); continue; }
  if (refresh.scheduledGames.some((g) => g.provider_id === restore.provider_id)) {
    throw new Error(`${restore.provider_id} is already on the board — restore would duplicate it`);
  }
  const name = row.name ?? `${restore.away_slug} at ${restore.home_slug}`;
  refresh.scheduledGames.push({
    provider_id: restore.provider_id,
    source_url: row.source_url,
    date: restore.date,
    kickoff_utc: restore.kickoff_utc,
    week: 6,
    home_slug: restore.home_slug,
    away_slug: restore.away_slug,
    site: restore.site,
    tv: restore.tv,
    neutral_site: false,
    verified_at: now,
    away: restore.away_slug,
    home: restore.home_slug,
    time_et: restore.time_et,
    status: "announced",
    game_status: "scheduled",
    correction: `Restored from excludedGames: the Oct 5 snapshot tagged ${name} as FBS–FCS, but ESPN lists both schools in FBS conferences (ids ${restore.espn_conference_ids.away}/${restore.espn_conference_ids.home}).`,
  });
  applied.push(`restored ${name} to the board`);
}
refresh.excludedGames = keptExcluded;

/* ---- 2. conference-id evidence on the true FCS exclusions ---- */
const FCS_EVIDENCE = {
  "401856706": { home: 8, away: 30 },   // LSU (SEC) vs McNeese (Southland)
  "401862793": { home: 151, away: 29 }, // UAB (American) vs Samford (SoCon)
  "401862790": { home: 151, away: 31 }, // FAU (American) vs Texas Southern (SWAC)
};
for (const row of refresh.excludedGames) {
  const ids = FCS_EVIDENCE[row.provider_id];
  if (!ids) throw new Error(`No FBS/FCS conference-id evidence staged for excluded game ${row.provider_id}`);
  row.espn_conference_ids = ids;
  row.reason = `FBS–FCS: away team sits in ESPN conference id ${ids.away}, outside the FBS conference set; current UI supports FBS vs FBS only.`;
  applied.push(`hardened exclusion evidence for ${row.name}`);
}

/* ---- 3. team records for the restored games (ESPN, Oct 5) ---- */
const RECORDS = { "appalachian-state": "3-1", fiu: "2-2" };
for (const [slug, record] of Object.entries(RECORDS)) {
  refresh.teamRecords[slug] = record;
  applied.push(`published ${slug} record ${record}`);
}

/* ---- 4. others receiving votes (Oct 4 releases, ESPN-verified) ---- */
const OTHERS = {
  ap: [
    ["Kentucky", 160], ["Wake Forest", 142], ["Wisconsin", 88], ["Duke", 83],
    ["Northwestern", 59], ["Nebraska", 48], ["Minnesota", 19], ["Arizona", 19],
    ["James Madison", 12], ["North Dakota State", 7],
  ],
  coaches: [
    ["Oklahoma State", 187], ["Boise State", 161], ["Nebraska", 117], ["Wake Forest", 87],
    ["Northwestern", 70], ["Wisconsin", 47], ["James Madison", 42], ["Minnesota", 40],
    ["North Dakota State", 29], ["Arizona", 15], ["New Mexico", 7], ["Baylor", 3],
    ["Kansas State", 1], ["Virginia Tech", 1], ["Texas A&M", 1],
  ],
};
for (const poll of refresh.polls) {
  if (!(poll.poll in OTHERS)) continue;
  poll.others = OTHERS[poll.poll].map(([team, points]) => ({ team, team_slug: slugForName(team), points }));
  applied.push(`filled ${poll.poll} others (${poll.others.length} teams)`);
}

/* ---- 5. poll notes: movers, gaps, debuts, dropouts (derived) ---- */
const ap = refresh.polls.find((p) => p.poll === "ap");
const co = refresh.polls.find((p) => p.poll === "coaches");
const apRank = new Map(ap.rankings.map((r) => [r.team_slug, r]));
const coRank = new Map(co.rankings.map((r) => [r.team_slug, r]));
const movers = ap.rankings
  .filter((r) => r.previous_rank != null && r.rank !== r.previous_rank)
  .map((r) => ({ team: r.team, team_slug: r.team_slug, from: r.previous_rank, to: r.rank, move: r.rank - r.previous_rank }))
  .sort((a, b) => a.move - b.move);
const debuts = ap.rankings
  .filter((r) => r.previous_rank == null)
  .map((r) => ({ team: r.team, team_slug: r.team_slug, rank: r.rank }));
const gaps = [...apRank.keys()]
  .filter((slug) => !coRank.has(slug))
  .map((slug) => {
    const row = apRank.get(slug);
    return { team: row.team, team_slug: slug, ap: row.rank, coaches: null, coaches_points: null };
  });
const gapsBoth = [];
for (const slug of new Set([...apRank.keys(), ...coRank.keys()])) {
  const a = apRank.get(slug)?.rank ?? null;
  const c = coRank.get(slug)?.rank ?? null;
  if (a == null || c == null || a === c) continue;
  const swing = Math.abs(a - c);
  if (swing < 2) continue;
  gapsBoth.push({ team: (apRank.get(slug) ?? coRank.get(slug)).team, team_slug: slug, ap: a, coaches: c });
}
// AP-ranked teams missing from the Coaches Top 25 (points from others).
const apOnly = gaps.map((g) => ({
  ...g,
  coaches_points: (co.others.find((o) => o.team_slug === g.team_slug)?.points) ?? null,
}));
// Coaches-ranked teams missing from the AP Top 25 (points from AP others).
const coOnly = [...coRank.keys()]
  .filter((slug) => !apRank.has(slug))
  .map((slug) => ({
    team: coRank.get(slug).team,
    team_slug: slug,
    ap: null,
    ap_points: (ap.others.find((o) => o.team_slug === slug)?.points) ?? null,
    coaches: coRank.get(slug).rank,
  }));
refresh.poll_notes = {
  as_of: "2026-10-04",
  movers_ap: movers,
  debuts_ap: debuts,
  dropped_out: {
    ap: [{ team: "Kentucky", team_slug: "kentucky", others_points: 160 }],
    coaches: [
      { team: "Penn State", team_slug: "penn-state", others_points: null },
      { team: "Michigan", team_slug: "michigan", others_points: null },
    ],
  },
  poll_gaps: { ap_only: apOnly, coaches_only: coOnly, biggest_splits: gapsBoth.sort((x, y) => Math.abs(y.ap - y.coaches) - Math.abs(x.ap - x.coaches)) },
  sources: ["https://site.api.espn.com/apis/site/v2/sports/football/college-football/rankings"],
};
applied.push(`derived poll notes (${movers.length} movers, ${debuts.length} debut, ${gapsBoth.length} splits)`);

/* ---- 6. ranked-vs-ranked Week 6 (derived from board + polls) ---- */
const apBySlug = apRank;
const rankedMatchups = [];
for (const game of refresh.scheduledGames) {
  const a = apBySlug.get(game.away);
  const h = apBySlug.get(game.home);
  const ca = coRank.get(game.away);
  const ch = coRank.get(game.home);
  if (a && h) rankedMatchups.push({ game_id: game.provider_id, matchup: `${a.team} (${a.rank}) at ${h.team} (${h.rank})`, polls: ["AP", "Coaches"] });
  else if (ca && ch) rankedMatchups.push({ game_id: game.provider_id, matchup: `${ca.team} (${ca.rank}) at ${ch.team} (${ch.rank})`, polls: ["Coaches only"] });
}
refresh.ranked_matchups = rankedMatchups;
applied.push(`derived ${rankedMatchups.length} ranked-vs-ranked matchups`);

/* ---- 7. verified additions: GameDay + NDSU storyline ---- */
refresh.broadcast_events = [
  {
    type: "college-gameday",
    game_provider_id: "401856712",
    site: "Tuscaloosa, Ala.",
    date: "2026-10-10",
    network: "ESPN",
    announced: "2026-10-03",
    badge: "College GameDay · Tuscaloosa · Sat Oct 10 · ESPN",
    note: "Announced by the show's official account Oct 3. Air time not printed until ESPN's schedule page confirms it; guest picker lists not carried.",
    sources: [
      "https://en.wikipedia.org/wiki/List_of_College_GameDay_(football_TV_program)_locations",
      "https://www.on3.com/news/college-gameday-location-week-6/",
    ],
  },
];
refresh.storylines = [
  {
    id: "ndsu-first-fbs-season",
    headline: "North Dakota State's first FBS season is 5–0 with the nation's co-lead in scoring defense",
    body: "The Bison (5–0), tied for the FBS lead in scoring defense at 9.8 points allowed per game (NCAA, through Oct 3), receive votes in both polls (AP 7, Coaches 29). They visit UNLV on Saturday, Oct 10 — 7 PM ET on The CW.",
    game_provider_id: "401864518",
    sources: ["https://www.ncaa.com/stats/football/fbs", "https://site.api.espn.com/apis/site/v2/sports/football/college-football/rankings"],
  },
];
applied.push("published GameDay badge + NDSU storyline");

/* ---- 8. holds: standings re-verified, live-scores hold added ---- */
refresh.holds = [
  "Current Week 6 SP+ and FPI not independently verified; retained ratings show their own cutoff",
  "Same-book timestamped odds and line movement not verified",
  "Week 6 fantasy/injury availability not fully verified (editorial layer last updated Sep 9)",
  "No live in-season scores feed is wired: Saturday results stay 'scheduled' until the next verified snapshot ships",
];
applied.push("updated holds list");

/* ---- 9. conference standings re-pull (ESPN, with aliases + Sun Belt) ---- */
const res = await fetch("https://site.web.api.espn.com/apis/v2/sports/football/college-football/standings", { headers: { accept: "application/json" } });
if (!res.ok) throw new Error(`ESPN standings fetch failed: ${res.status}`);
const doc = await res.json();
const fbsConferences = new Set(
  teams.map((t) => t.conference_slug),
);
const nameByConference = new Map(teams.map((t) => [t.conference_slug, { name: t.conference, short: t.conference_short }]));
const standings = [];
for (const child of doc.children ?? []) {
  const rows = [];
  const flatten = (node) => {
    for (const entry of node.standings?.entries ?? []) {
      const t = entry.team ?? {};
      const name = t.location || t.nickname || t.name;
      if (!name) continue;
      const slug = slugForName(t.displayName ?? `${t.location ?? ""} ${t.name ?? ""}`.trim());
      const our = teams.find((tm) => tm.slug === slug);
      if (!our) continue;
      const stat = (n) => (entry.stats ?? []).find((s) => s.name === n)?.displayValue ?? null;
      rows.push({
        team: our.school,
        team_slug: slug,
        w: stat("wins") ?? "0",
        l: stat("losses") ?? "0",
        t: stat("ties") ?? "0",
        pct: stat("leagueWinPercent") ?? "—",
        overall: stat("overall") ?? null,
      });
    }
    for (const sub of node.children ?? []) flatten(sub);
  };
  flatten(child);
  if (!rows.length) continue;
  // Resolve the conference via any mapped member (ESPN group → our conference_slug).
  const confSlug = rows.length ? teams.find((tm) => tm.slug === rows[0].team_slug)?.conference_slug : null;
  if (!confSlug || !fbsConferences.has(confSlug)) continue;
  const dedup = new Map(rows.map((r) => [r.team_slug, r]));
  // Keep ESPN's own standing order (seed/gamesBehind); only de-duplicate the
  // Sun Belt's two division sub-tables into one league table.
  standings.push({ slug: confSlug, name: nameByConference.get(confSlug).name, short: nameByConference.get(confSlug).short, rows: [...dedup.values()].slice(0, 20) });
}
if (!standings.length) throw new Error("ESPN standings re-pull produced no conferences");
const unlinkedCheck = standings.flatMap((c) => c.rows.filter((r) => !r.team_slug));
if (unlinkedCheck.length) throw new Error(`Standings rows without slugs: ${unlinkedCheck.map((r) => r.team).join(", ")}`);
refresh.retainedBaseline = {
  conferenceStandings: standings,
  espnInjuries: refresh.retainedBaseline?.espnInjuries ?? null,
  as_of: now.slice(0, 10),
  note: "Conference standings re-pulled from ESPN on 2026-10-05 (Sun Belt divisions flattened; every row slug-linked). ESPN injury base retained at its previous 2026-09-29 cutoff.",
};
applied.push(`re-pulled standings: ${standings.length} conferences, ${standings.reduce((n, c) => n + c.rows.length, 0)} rows`);

/* ---- write ---- */
refresh.audit_applied_at = now;
refresh.scheduledGames.sort((a, b) => a.kickoff_utc.localeCompare(b.kickoff_utc));
writeFileSync(refreshPath, JSON.stringify(refresh, null, 1) + "\n");
console.log(`verified-refresh.json patched at ${now}`);
for (const line of applied) console.log(" -", line);
console.log(`scheduled: ${refresh.scheduledGames.length} | excluded: ${refresh.excludedGames.length} | standings conferences: ${refresh.standingsCount ?? standings.length}`);
