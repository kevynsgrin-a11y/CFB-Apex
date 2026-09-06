/**
 * Aggregates the vendored dataset (data/cfb-2026) into a single TypeScript
 * module (lib/cfb-2026.generated.ts) that both the Vite build and the plain
 * Node test runner can import — no import.meta.glob, no JSON import
 * attributes, no filesystem access at runtime.
 *
 * Run automatically before dev/build/test via the package.json pre-hooks.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../data/cfb-2026", import.meta.url));

const read = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));

const teams = read("teams.json").teams;
const conferences = read("conferences.json").conferences;
const sos = read("sos/2026.json").teams.map((row) => ({
  slug: row.slug,
  phil_steele_rank: row.phil_steele_rank ?? null,
  espn_fpi_sos_rank: row.espn_fpi_sos_rank ?? null,
}));

const perTeam = (dir, pick) => {
  const out = {};
  for (const file of readdirSync(join(root, dir))) {
    if (!file.endsWith(".json") || file === "index.json") continue;
    const slug = file.replace(/\.json$/, "");
    out[slug] = pick(read(join(dir, file)));
  }
  return out;
};

const schedules = perTeam("schedules", (doc) => doc.games);
const coaching = perTeam("coaching", (doc) => ({
  head_coach: doc.head_coach ?? null,
  staff: (doc.staff ?? [])
    .filter((member) => member.name)
    .map((member) => ({ role: member.role_key ?? null, role_raw: member.role_raw ?? null, name: member.name })),
  schemes: doc.schemes
    ? { offense: doc.schemes.offense?.label ?? null, defense: doc.schemes.defense?.label ?? null }
    : null,
}));

/* Full poll tables: AP and Coaches top 25 plus others receiving votes. */
const pollsSource = read("polls/2026-preseason.json");
const polls = (pollsSource.polls ?? []).map((poll) => ({
  poll: poll.poll,
  name: poll.name,
  release_date: poll.release_date ?? null,
  rankings: (poll.rankings ?? []).map((entry) => ({
    rank: entry.rank,
    team_slug: entry.team_slug ?? null,
    team: entry.team,
    record: entry.record ? `${entry.record.wins}-${entry.record.losses}` : null,
    points: entry.points ?? null,
    first_place_votes: entry.first_place_votes ?? null,
    previous_rank: entry.previous_rank ?? null,
    tied: entry.tied ?? false,
  })),
  others: (poll.others_receiving_votes ?? []).slice(0, 12).map((entry) => ({
    team: entry.team,
    team_slug: entry.team_slug ?? null,
    points: entry.points ?? null,
  })),
}));
const pollsStatus = pollsSource.status?.note ?? null;

/* Rosters and depth charts cover the seven rostered conferences (92 of 138
   programs); teams without a file are absent, never empty. Trimmed to the
   fields the site renders. */
const rosters = perTeam("rosters", (doc) => ({
  head_coach: doc.head_coach ?? null,
  counts: doc.counts ?? null,
  position_groups: (doc.position_groups ?? []).map((group) => ({
    name: group.name,
    players: (group.players ?? []).map((player) => ({
      name: player.name,
      position: player.position ?? null,
      class: player.class ?? null,
      jersey: player.jersey ?? null,
      height: player.height ?? null,
      weight: player.weight ?? null,
      stars: player.stars ?? null,
      hometown: player.hometown ?? null,
    })),
  })),
}));

const depthCharts = perTeam("depth-charts", (doc) => ({
  status: doc.status ?? null,
  status_caveat: doc.status_caveat ?? null,
  schemes: doc.schemes ?? null,
  units: (doc.units ?? []).map((unit) => ({
    unit: unit.unit,
    positions: (unit.positions ?? []).map((position) => ({
      position: position.position,
      depth: (position.depth ?? []).map((slot) => ({
        rank: slot.rank,
        co_listed: slot.co_listed,
        players: (slot.players ?? []).map((player) => ({
          name: player.name,
          class: player.class ?? null,
          stars: player.stars ?? null,
        })),
      })),
    })),
  })),
}));

const injuriesDoc = read("injuries/latest.json");
const injuries = {
  as_of_date: injuriesDoc.as_of_date ?? null,
  teams: (injuriesDoc.teams ?? []).map((team) => ({
    slug: team.slug,
    opponent_context: team.opponent_context ?? null,
    players: (team.players ?? []).map((player) => ({
      name: player.name,
      position: player.position ?? null,
      status: player.status ?? null,
      injury: player.injury ?? null,
    })),
  })),
};

/* Historical team seasons, trimmed to the headline rates the site renders. */
const historical = {};
for (const file of readdirSync(join(root, "stats/historical/team"))) {
  if (!file.endsWith(".json") || file === "index.json") continue;
  const season = file.replace(/\.json$/, "");
  const doc = read(join("stats/historical/team", file));
  historical[season] = (doc.teams ?? []).map((team) => ({
    slug: team.slug ?? null,
    g: team.games ?? null,
    op: team.offense?.total?.["Pts/G"] ?? null,
    dp: team.defense?.total?.["Pts/G"] ?? null,
    oy: team.offense?.total?.["Yds/G"] ?? null,
    dy: team.defense?.total?.["Yds/G"] ?? null,
  }));
}

/* Advanced ratings (FEI, SP+) indexed per team slug, most recent season first. */
const teamRatings = {};
for (const file of readdirSync(join(root, "stats/historical/advanced"))) {
  if (!file.endsWith(".json") || file === "index.json") continue;
  const season = file.replace(/\.json$/, "");
  const doc = read(join("stats/historical/advanced", file));
  for (const row of doc.fei ?? []) {
    if (!row.slug) continue;
    if (!teamRatings[row.slug]) teamRatings[row.slug] = [];
    teamRatings[row.slug].push({
      season,
      feiRank: row.rank ?? null,
      fei: row.fei ?? null,
      record: row.record ?? null,
    });
  }
  for (const row of doc.sp_plus ?? []) {
    if (!row.slug) continue;
    if (!teamRatings[row.slug]) teamRatings[row.slug] = [];
    const entry = teamRatings[row.slug].find((item) => item.season === season);
    if (entry) {
      entry.spRank = row.rank ?? null;
      entry.spPlus = row.sp_plus ?? null;
    } else {
      teamRatings[row.slug].push({
        season,
        spRank: row.rank ?? null,
        spPlus: row.sp_plus ?? null,
        record: row.record ?? null,
      });
    }
  }
}
for (const rows of Object.values(teamRatings)) rows.sort((a, b) => b.season.localeCompare(a.season));

/* Individual season leaderboards, indexed by team slug (top-10 finishes only). */
const humanize = (key) => key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
const teamLeaders = {};
for (const file of readdirSync(join(root, "stats/historical/individual"))) {
  if (!file.endsWith(".json") || file === "index.json") continue;
  const season = file.replace(/\.json$/, "");
  const doc = read(join("stats/historical/individual", file));
  for (const [categoryKey, categoryData] of Object.entries(doc.categories ?? {})) {
    const category = humanize(categoryKey);
    for (const leader of categoryData.leaders ?? []) {
      if (!leader.team_slug || (leader.rank ?? 99) > 10) continue;
      if (!teamLeaders[leader.team_slug]) teamLeaders[leader.team_slug] = [];
      teamLeaders[leader.team_slug].push({
        season,
        category,
        player: leader.player ?? null,
        rank: leader.rank ?? null,
      });
    }
  }
}
for (const rows of Object.values(teamLeaders)) rows.sort((a, b) => b.season.localeCompare(a.season));

/* Roster player index for site search: name + team + position only. */
const playerIndex = [];
for (const [slug, roster] of Object.entries(rosters)) {
  for (const group of roster.position_groups ?? []) {
    for (const player of group.players ?? []) {
      if (player.name) playerIndex.push({ n: player.name, t: slug, p: player.position ?? null });
    }
  }
}

const playedGames = readdirSync(join(root, "stats/2026/games"))
  .filter((file) => file.endsWith(".json"))
  .map((file) => read(join("stats/2026/games", file)))
  .map((doc) => ({
    game_id: doc.game_id,
    date: doc.date,
    home_slug: doc.home_slug,
    away_slug: doc.away_slug,
    site: doc.site ?? null,
    tv: doc.tv ?? null,
    neutral_site: Boolean(doc.neutral_site),
    title: doc.title ?? "",
    teams: doc.teams ?? [],
  }))
  .sort((a, b) => a.date.localeCompare(b.date));

const payload = { teams, conferences, polls, pollsStatus, sos, schedules, coaching, playedGames, rosters, depthCharts, injuries, historical, teamRatings, teamLeaders, playerIndex };

const body = `// GENERATED by scripts/build-dataset.mjs from data/cfb-2026 — do not edit.
// biome-ignore lint: generated file
export default ${JSON.stringify(payload)};
`;

const target = fileURLToPath(new URL("../lib/cfb-2026.generated.ts", import.meta.url));
writeFileSync(target, body, "utf8");
console.log(
  `Wrote ${target} (${(body.length / 1024).toFixed(0)} KiB): ` +
    `${teams.length} teams, ${Object.keys(schedules).length} schedules, ` +
    `${Object.keys(coaching).length} staffs, ${playedGames.length} played games`,
);
