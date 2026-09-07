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
import { inflateSync } from "node:zlib";

const root = fileURLToPath(new URL("../data/cfb-2026", import.meta.url));
const projectRoot = fileURLToPath(new URL("..", import.meta.url));

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

/* Team logos + brand colors: scan public/logos for verified PNGs (downloaded
   from the ESPN CDN, two-source verified) and derive each team's brand color
   from the mark's dominant saturated pixel bucket. */
const logoSlugs = readdirSync(join(projectRoot, "public/logos"))
  .filter((file) => file.endsWith(".png"))
  .map((file) => file.replace(/\.png$/, ""));

function decodePng(buffer) {
  if (buffer.readUInt32BE(0) !== 0x89_50_4e_47) throw new Error("not a PNG");
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  let bitDepth = 0;
  const idat = [];
  let palette = null;
  let trns = null;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "PLTE") {
      palette = [];
      for (let i = 0; i < data.length; i += 3) palette.push([data[i], data[i + 1], data[i + 2]]);
    } else if (type === "tRNS") {
      trns = Array.from(data);
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }
  if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth}`);
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 3 ? 1 : 0;
  if (!channels) throw new Error(`unsupported color type ${colorType}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    const prior = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? out[x - channels] : 0;
      const up = prior ? prior[x] : 0;
      const ul = prior && x >= channels ? prior[x - channels] : 0;
      let value = row[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += Math.floor((left + up) / 2);
      else if (filter === 4) value += paeth(left, up, ul);
      out[x] = value & 0xff;
    }
  }
  const rgb = [];
  for (let i = 0; i < width * height; i++) {
    if (colorType === 3) {
      const index = pixels[i];
      const entry = palette?.[index];
      if (!entry) continue;
      const alpha = trns && index < trns.length ? trns[index] : 255;
      if (alpha > 40) rgb.push(entry);
    } else {
      const base = i * channels;
      if (channels < 4 || pixels[base + 3] > 40) rgb.push([pixels[base], pixels[base + 1], pixels[base + 2]]);
    }
  }
  return rgb;
}

function brandColorOf(buffer) {
  const buckets = new Map();
  for (const [r, g, b] of decodePng(buffer)) {
    const lightness = (Math.max(r, g, b) + Math.min(r, g, b)) / 510;
    if (lightness > 0.93) continue; // paper white / highlight
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bucket.count += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }
  let best = null;
  let bestScore = 0;
  for (const bucket of buckets.values()) {
    const r = bucket.r / bucket.count;
    const g = bucket.g / bucket.count;
    const b = bucket.b / bucket.count;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    // Saturated marks win; near-black marks (Iowa, Purdue trim) still qualify.
    const score = bucket.count * (saturation + 0.25) * (lightnessOf(r, g, b) > 0.85 ? 0.1 : 1);
    if (score > bestScore) {
      bestScore = score;
      best = [r, g, b];
    }
  }
  if (!best) return null;
  // Clamp lightness into a readable band for tint chips.
  let [r, g, b] = best.map(Math.round);
  const l = lightnessOf(r, g, b);
  if (l > 0.7) [r, g, b] = [r, g, b].map((v) => Math.round(v * 0.82));
  else if (l < 0.16) [r, g, b] = [r, g, b].map((v) => Math.min(255, Math.round(v * 1.6 + 14)));
  const hex = (v) => v.toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function lightnessOf(r, g, b) {
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 510;
}

const logoColors = {};
for (const slug of logoSlugs) {
  const color = brandColorOf(readFileSync(join(projectRoot, "public/logos", `${slug}.png`)));
  if (color) logoColors[slug] = color;
}

/* Transfer portal (research prompt 4) and head-coach contracts (prompt 5).
   Both use research-package slugs; a small alias table maps display variants
   onto dataset slugs. FCS origins (e.g. chattanooga) are kept verbatim — the
   site renders them as external, unlinked labels. */
const SLUG_ALIASES = {
  "louisiana-monroe": "ulm",
  pitt: "pittsburgh",
  fau: "florida-atlantic",
  miami: "miami-fl",
};

const portalDoc = read("portal/transfers-2026.json");
const portalEvents = portalDoc.transfers.map((row, index) => ({
  id: `portal-2026-${index + 1}`,
  player: row.player,
  position: row.position ?? null,
  class: row.class_raw || null,
  from: SLUG_ALIASES[row.from_team_slug] ?? row.from_team_slug,
  to: SLUG_ALIASES[row.to_team_slug] ?? row.to_team_slug,
  status: row.status,
  date: row.event_date,
  snaps: row.snaps_prior_season,
  notes: row.notes ?? null,
  confidence: row.confidence,
  sources: (row.sources ?? []).slice(0, 2),
}));

const contractsDoc = read("coaching/contracts-2026.json");
const coachContracts = {};
for (const row of contractsDoc) {
  const slug = SLUG_ALIASES[row.team_slug] ?? row.team_slug;
  if (coachContracts[slug]) continue;
  coachContracts[slug] = {
    coach: row.coach,
    salary: row.annual_salary_usd,
    start: row.contract_start,
    end: row.contract_end,
    total_value: row.total_value_usd,
    guaranteed_remaining: row.guaranteed_remaining_usd,
    buyout: row.buyout_summary ?? null,
    offset_mitigation: row.offset_mitigation,
    record_through: row.record_through ?? null,
    notes: row.notes ?? null,
    sources: (row.sources ?? []).slice(0, 3),
    as_of: row.as_of,
  };
}

/* Gameday/stadium guides (research upload) and the broadcast index produced
   by scripts/parse-broadcast-pdf.py from the broadcast-schedule PDF. */
const stadiumGuides = read("stadiums/gameday-guides-2026.json").map((row) => ({
  team_slug: SLUG_ALIASES[row.team_slug] ?? row.team_slug,
  stadium: row.stadium,
  city: row.city,
  address: row.address,
  capacity: row.capacity,
  clear_bag: row.clear_bag,
  parking: row.parking,
  transit: row.transit,
  tailgating: row.tailgating,
  visitor_section: row.visitor_section,
  accessibility: row.accessibility,
  notes: row.notes ?? null,
  last_verified: row.last_verified,
  sources: (row.sources ?? []).slice(0, 3),
}));

/* Full-season TV designations (research upload, supersedes the PDF-derived
   index): networks AND kickoff times, keyed by date + team pair. FCS-only
   matchups and "tbd" placeholder rows fall out naturally. */
const TV_ALIASES = {
  ...SLUG_ALIASES,
  miami: "miami-fl",
  "miami-ohio": "miami-oh",
  "ul-monroe": "ulm",
  "florida-international": "fiu",
  connecticut: "uconn",
  massachusetts: "umass",
  "louisiana-monroe": "ulm",
};
const datasetTeamSlugs = new Set(teams.map((team) => team.slug));

const tvDoc = read("broadcasts/tv-schedule-full-season.json");
const tvByPair = {};
let tvGameCount = 0;
for (const week of tvDoc.weeks ?? []) {
  for (const game of week.games ?? []) {
    const home = TV_ALIASES[game.home_slug] ?? game.home_slug;
    const away = TV_ALIASES[game.away_slug] ?? game.away_slug;
    if (home === "tbd" || away === "tbd") continue;
    if (!datasetTeamSlugs.has(home) || !datasetTeamSlugs.has(away)) continue;
    const key = `${game.date}:${[away, home].sort().join(":")}`;
    tvGameCount += 1;
    if (!tvByPair[key] || (game.network && !tvByPair[key].tv)) {
      tvByPair[key] = { tv: game.network, time_et: game.time_et, status: game.status, week: week.week };
    }
  }
}

/* Preseason ratings (SP+, FPI, win totals, playoff odds as reported). */
const preseasonRatings = {};
for (const row of read("ratings/preseason-2026.json")) {
  const slug = TV_ALIASES[row.team_slug] ?? row.team_slug;
  preseasonRatings[slug] = {
    sp: row.sp_plus
      ? { overall: row.sp_plus.overall, rank: row.sp_plus.rank, offense: row.sp_plus.offense, defense: row.sp_plus.defense, source: row.sp_plus.source }
      : null,
    fpi: row.fpi ? { value: row.fpi.value, rank: row.fpi.rank, source: row.fpi.source } : null,
    wins: row.win_total
      ? { projected: row.win_total.projected_wins, line: row.win_total.over_under_line, source: row.win_total.source }
      : null,
    playoff: row.playoff_odds_as_reported
      ? { outlet: row.playoff_odds_as_reported.outlet, value: row.playoff_odds_as_reported.value, source: row.playoff_odds_as_reported.source }
      : null,
    notes: row.notes ?? null,
    as_of: row.as_of,
  };
}

const payload = { teams, conferences, polls, pollsStatus, sos, schedules, coaching, playedGames, rosters, depthCharts, injuries, historical, teamRatings, teamLeaders, playerIndex, logoSlugs, logoColors, portal: { asOf: portalDoc.meta.as_of, statusNote: portalDoc.meta.completeness, events: portalEvents }, coachContracts, stadiumGuides, broadcasts: { asOf: tvDoc.as_of, note: tvDoc.notes, byPair: tvByPair, games: tvGameCount }, preseasonRatings };

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
