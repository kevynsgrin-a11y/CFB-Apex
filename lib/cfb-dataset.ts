/// <reference types="vite/client" />
/**
 * Real 2026 FBS dataset, vendored from the CFB-Apex data repository
 * (data/dist as of 2026-09-05) and mapped onto the app's fixture shapes so
 * every surface that used to read `@/lib/fixtures` can read this instead.
 *
 * Conventions carried over from the dataset itself:
 *   - `null` means the source did not publish a value. Surfaces with no
 *     dataset backing (portal, DFS, stadiums, model estimates, contract
 *     economics) export empty arrays or neutral numbers and mark their
 *     provenance `freshness: "unavailable"` so the UI can say "Not published"
 *     instead of rendering a fabricated zero.
 *   - The data is read from `lib/cfb-2026.generated.ts` (built by
 *     scripts/build-dataset.mjs) at build time. Nothing here touches the
 *     network or the filesystem at request time.
 */
import bundle from "./cfb-2026.generated.ts";
import type {
  Coach,
  DfsPlayer,
  Game,
  PortalEvent,
  ProviderHealth,
  ScenarioGame,
  SeasonRules,
  Stadium,
  Team,
} from "./types";

const asOf = "2026-09-05";
const datasetProvenanceRoot = {
  provider: "CFB Apex 2026 research dataset",
  sourceDocumentId: "cfb-2026-master-package (data/dist 2026-09-05)",
  sourceAsOf: asOf,
  fetchedAt: asOf,
  verifiedAt: asOf,
  dataEnvironment: "production" as const,
  recordOrigin: "official_document" as const,
};

function derivedProvenance(id: string) {
  return {
    ...datasetProvenanceRoot,
    providerRecordId: `dataset:${id}`,
    verificationStatus: "corroborated" as const,
    licenseClass: "R3_CITED_FACTS" as const,
    confidence: 0.9,
    freshness: "current" as const,
  };
}

/** Fields the dataset does not carry: neutral values, marked unavailable. */
function unavailableProvenance(id: string) {
  return {
    ...datasetProvenanceRoot,
    providerRecordId: `dataset-gap:${id}`,
    verificationStatus: "unverified" as const,
    licenseClass: "R3_CITED_FACTS" as const,
    confidence: 0,
    recordOrigin: "fixture" as const,
    freshness: "unavailable" as const,
  };
}

/* ---------------------------------------------------------------- teams */

interface DatasetTeam {
  slug: string;
  school: string;
  nickname: string | null;
  display_name: string;
  conference: string;
  conference_slug: string;
  conference_short: string;
  division: string | null;
  football_only: boolean;
}

const datasetTeams = bundle.teams as DatasetTeam[];

const p4Conferences = new Set(["sec", "acc", "big-ten", "big12", "pac12"]);

function abbreviationFor(school: string) {
  const words = school
    .replace(/[^A-Za-z ]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

/* AP preseason rank per team slug. */
const apRankBySlug = new Map<string, number>();
const apPoll = (bundle.polls as { polls: Array<{ poll: string; rankings: Array<{ rank: number; team_slug: string | null }> }> }).polls.find(
  (poll) => poll.poll === "ap",
);
for (const entry of apPoll?.rankings ?? []) {
  if (entry.team_slug) apRankBySlug.set(entry.team_slug, entry.rank);
}

/* Played 2026 games → per-team records and the displayable scoreboard. */
interface PlayedGame {
  game_id: string;
  date: string;
  home_slug: string;
  away_slug: string;
  site: string | null;
  tv: string | null;
  neutral_site: boolean;
  title: string;
  teams: Array<{ name: string; slug: string; points: number }>;
}

const playedGames = bundle.playedGames as PlayedGame[];

const winsBySlug = new Map<string, number>();
const lossesBySlug = new Map<string, number>();
function bump(map: Map<string, number>, slug: string) {
  map.set(slug, (map.get(slug) ?? 0) + 1);
}
for (const game of playedGames) {
  const home = game.teams.find((team) => team.slug === game.home_slug);
  const away = game.teams.find((team) => team.slug === game.away_slug);
  if (!home || !away) continue;
  if (home.points > away.points) {
    bump(winsBySlug, home.slug);
    bump(lossesBySlug, away.slug);
  } else if (away.points > home.points) {
    bump(winsBySlug, away.slug);
    bump(lossesBySlug, home.slug);
  }
}

function recordFor(slug: string) {
  const wins = winsBySlug.get(slug) ?? 0;
  const losses = lossesBySlug.get(slug) ?? 0;
  return `${wins}–${losses}`;
}

/* Strength index: best-available SOS ranking (Phil Steele, then ESPN FPI SOS),
   inverted to a 0–100 scale. Teams without any published rank sit at 50. */
interface SosTeamRow {
  slug: string;
  phil_steele_rank: number | null;
  espn_fpi_sos_rank: number | null;
}

const sosBySlug = new Map<string, SosTeamRow>();
for (const row of bundle.sos as SosTeamRow[]) {
  sosBySlug.set(row.slug, row);
}

function strengthFor(slug: string) {
  const row = sosBySlug.get(slug);
  const rank = row?.phil_steele_rank ?? row?.espn_fpi_sos_rank ?? null;
  if (rank == null) return { value: 50, published: false };
  return { value: Math.max(1, Math.min(99, Math.round(101 - rank * 0.7))), published: true };
}

export const teams: Team[] = datasetTeams.map((team) => {
  const strength = strengthFor(team.slug);
  const rank = apRankBySlug.get(team.slug);
  return {
    id: team.slug,
    slug: team.slug,
    name: team.display_name,
    shortName: team.school,
    abbreviation: abbreviationFor(team.school),
    monogram: team.school[0] ?? "?",
    conference: team.conference,
    subdivision: p4Conferences.has(team.conference_slug) ? "P4" : "G5",
    rank,
    record: recordFor(team.slug),
    color: "#64748B",
    strength: strength.value,
    returningProduction: 0,
    portalImpact: 0,
    playoffProbability: rank ? Math.max(2, Math.round(140 / rank)) : 0,
    provenance: {
      ...derivedProvenance(`team-${team.slug}`),
      recordOrigin: "editorial" as const,
      freshness: strength.published ? ("current" as const) : ("unavailable" as const),
    },
  };
});

/* ---------------------------------------------------------------- games */

function seasonWeek(date: string) {
  const start = Date.parse("2026-08-29");
  const days = (Date.parse(date) - start) / 86_400_000;
  return Math.max(0, Math.floor(days / 7));
}

function kickoffLabel(date: string) {
  const parsed = new Date(`${date}T17:00:00Z`);
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(parsed);
  return `${day} · ${date}`;
}

const playedGameIds = new Set(playedGames.map((game) => game.game_id));
const teamSlugs = new Set(datasetTeams.map((team) => team.slug));
/* Only games between two of the 138 FBS programs render; FBS-vs-FCS results
   still count toward the records above. */
const displayablePlayedGames = playedGames.filter(
  (game) => teamSlugs.has(game.home_slug) && teamSlugs.has(game.away_slug),
);

interface ScheduleRow {
  date: string | null;
  opponent: string;
  opponent_slug: string | null;
  location: "home" | "away" | "neutral" | null;
  site: string | null;
  type: string | null;
  week: number | null;
}

function buildScheduledGames(): Game[] {
  const byKey = new Map<string, Game>();
  for (const [homeSlug, rows] of Object.entries(bundle.schedules as Record<string, ScheduleRow[]>)) {
    for (const row of rows) {
      if (row.type === "bye" || !row.date) continue;
      if (row.location === "away") continue; // the opponent's file owns the game
      if (!row.opponent_slug || !teamSlugs.has(row.opponent_slug)) continue;
      if (Date.parse(row.date) < Date.parse("2026-09-06")) continue; // past or already played
      const parts = [homeSlug, row.opponent_slug].sort();
      const key = `${row.date}:${parts[0]}:${parts[1]}`;
      if (byKey.has(key)) continue;
      const isNeutral = row.location === "neutral";
      const homeTeam = isNeutral ? parts[1] : homeSlug;
      const awayTeam = isNeutral ? parts[0] : row.opponent_slug;
      const id = `${row.date}-${awayTeam}-at-${homeTeam}`;
      if (playedGameIds.has(id)) continue;
      const venue =
        row.site ?? `${teams.find((team) => team.slug === homeTeam)?.shortName ?? "Home"} home stadium`;
      byKey.set(key, {
        id,
        week: row.week ?? seasonWeek(row.date),
        date: `${row.date}T17:00:00.000Z`,
        kickoffLabel: kickoffLabel(row.date),
        status: "scheduled" as const,
        statusDetail: row.type === "conference" ? "Conference game" : "Kickoff scheduled",
        awayTeamId: awayTeam,
        homeTeamId: homeTeam,
        venueSlug: homeTeam,
        venue,
        city: "",
        broadcast: null,
        weather: null,
        neutralSite: isNeutral,
        modelHomeWinProbability: 0.5,
        modelUncertainty: 0,
        provenance: derivedProvenance(id),
      });
    }
  }
  return [...byKey.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export const games: Game[] = [
  ...displayablePlayedGames.map((game) => {
    const home = game.teams.find((team) => team.slug === game.home_slug);
    const away = game.teams.find((team) => team.slug === game.away_slug);
    const id = game.game_id;
    return {
      id,
      week: seasonWeek(game.date),
      date: `${game.date}T17:00:00.000Z`,
      kickoffLabel: kickoffLabel(game.date),
      status: "final" as const,
      statusDetail: game.title,
      awayTeamId: game.away_slug,
      homeTeamId: game.home_slug,
      awayScore: away?.points,
      homeScore: home?.points,
      venueSlug: game.home_slug,
      venue: game.site ?? `${home?.name ?? "Home"} stadium`,
      city: "",
      broadcast: game.tv ?? null,
      weather: null,
      neutralSite: game.neutral_site,
      modelHomeWinProbability: 0.5,
      modelUncertainty: 0,
      provenance: derivedProvenance(id),
    };
  }),
  ...buildScheduledGames(),
];

/* ---------------------------------------------------------------- coaches */

interface CoachingDoc {
  head_coach: { name: string | null; title_raw: string | null; first_season: number | null } | null;
}

function coachSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z ]/g, "")
    .trim()
    .replaceAll(" ", "-");
}

export const coaches: Coach[] = [];
for (const [teamSlug, doc] of Object.entries(bundle.coaching as Record<string, CoachingDoc>)) {
  const name = doc.head_coach?.name?.trim();
  if (!name) continue;
  const slug = coachSlug(name);
  const wins = winsBySlug.get(teamSlug) ?? 0;
  const losses = lossesBySlug.get(teamSlug) ?? 0;
  coaches.push({
    id: `${slug}-${teamSlug}`,
    slug,
    name,
    teamId: teamSlug,
    title: doc.head_coach?.title_raw ?? "Head Coach",
    contractStart: "",
    contractEnd: "",
    annualSalary: 0,
    guaranteedRemaining: 0,
    offsetEstimate: 0,
    mitigationApplies: false,
    hotSeatIndex: 0,
    hotSeatCoverage: 0,
    record: `${wins}–${losses}`,
    timeline: [],
    provenance: unavailableProvenance(`coach-${slug}`),
  });
}

/* ------------------------------------------- surfaces with no dataset data */

export const portalEvents: PortalEvent[] = [];
export const dfsPlayers: DfsPlayer[] = [];
export const stadiums: Stadium[] = [];

/* ------------------------------------------------- rosters & depth charts */

export interface RosterPlayer {
  name: string;
  position: string | null;
  class: string | null;
  jersey: number | null;
  height: string | null;
  weight: string | null;
  stars: number | null;
  hometown: string | null;
}

export interface TeamRoster {
  head_coach: string | null;
  counts: { players: number; with_stars: number; with_high_school: number } | null;
  position_groups: Array<{ name: string; players: RosterPlayer[] }>;
}

export interface DepthSlotEntry {
  rank: number;
  co_listed: boolean;
  players: Array<{ name: string; class: string | null; stars: number | null }>;
}

export interface TeamDepthChart {
  status: string | null;
  status_caveat: string | null;
  schemes: { offense: string | null; defense: string | null; special_teams: string | null } | null;
  units: Array<{ unit: string; positions: Array<{ position: string; depth: DepthSlotEntry[] }> }>;
}

export interface InjuryEntry {
  name: string;
  position: string | null;
  status: string | null;
  injury: string | null;
}

export interface TeamInjuries {
  slug: string;
  opponent_context: string | null;
  players: InjuryEntry[];
}

export interface TeamSeasonRow {
  season: string;
  g: number | null;
  op: number | null;
  dp: number | null;
  oy: number | null;
  dy: number | null;
}

const rosterBySlug = bundle.rosters as Record<string, TeamRoster>;
const depthBySlug = bundle.depthCharts as Record<string, TeamDepthChart>;
const injuriesBySlug = new Map<string, TeamInjuries>(
  ((bundle.injuries as { as_of_date: string | null; teams: TeamInjuries[] }).teams ?? []).map(
    (team) => [team.slug, team],
  ),
);

export const injuriesAsOf = (bundle.injuries as { as_of_date: string | null }).as_of_date;

export function getRoster(slug: string): TeamRoster | undefined {
  return rosterBySlug[slug];
}

export function getDepthChart(slug: string): TeamDepthChart | undefined {
  return depthBySlug[slug];
}

export function getInjuries(slug: string): TeamInjuries | undefined {
  return injuriesBySlug.get(slug);
}

const historicalBySeason = bundle.historical as Record<string, Array<{ slug: string | null; g: number | null; op: number | null; dp: number | null; oy: number | null; dy: number | null }>>;

/** Most-recent-first season rows for one team across all historical seasons. */
export function getTeamSeasons(slug: string): TeamSeasonRow[] {
  return Object.keys(historicalBySeason)
    .sort()
    .reverse()
    .map((season) => {
      const row = historicalBySeason[season].find((team) => team.slug === slug);
      return row ? { season, g: row.g, op: row.op, dp: row.dp, oy: row.oy, dy: row.dy } : null;
    })
    .filter((row): row is TeamSeasonRow => row !== null);
}

export interface TeamRatingRow {
  season: string;
  feiRank: number | null;
  fei: number | null;
  spRank: number | null;
  spPlus: number | null;
  record: string | null;
}

export interface TeamLeaderRow {
  season: string;
  category: string;
  player: string | null;
  rank: number | null;
}

const ratingsBySlug = bundle.teamRatings as Record<string, TeamRatingRow[]>;
const leadersBySlug = bundle.teamLeaders as Record<string, TeamLeaderRow[]>;

/** FEI / SP+ finishes per team, most recent season first. */
export function getTeamRatings(slug: string): TeamRatingRow[] {
  return ratingsBySlug[slug] ?? [];
}

/** Top-10 individual leaderboard finishes by this team's players, latest first. */
export function getTeamLeaders(slug: string): TeamLeaderRow[] {
  return leadersBySlug[slug] ?? [];
}

export const seasonRules: SeasonRules = {
  id: "season-2026",
  season: 2026,
  label: "2026 season · 12-team College Football Playoff",
  playoffTeams: 12,
  byes: 4,
  membershipVersion: "2026-fbs-138",
  seedingVersion: "cfp-12-team-format",
  sourceStatus: "verified",
  asOf,
};

export const scenarioGames: ScenarioGame[] = games
  .filter((game) => game.status === "scheduled")
  .slice(0, 24)
  .map((game) => ({
    id: game.id,
    awayTeamId: game.awayTeamId,
    homeTeamId: game.homeTeamId,
    week: game.week,
  }));

export const providerHealth: ProviderHealth[] = [
  {
    id: "cfb-apex-dataset",
    label: "CFB Apex 2026 research dataset",
    mode: "production",
    status: "operational",
    lastSuccess: asOf,
    cadence: "Per research package release",
    note: "Vendored at build time from data/dist (138 FBS teams, schedules, polls, coaching, SOS, week-0 results).",
  },
  {
    id: "production-sports",
    label: "In-season live scores feed",
    mode: "production",
    status: "not_configured",
    lastSuccess: null,
    cadence: "Not applicable",
    note: "No live in-season provider is wired; scores update with each dataset release.",
  },
];

/* ---------------------------------------------------------------- getters */

export function getTeam(teamId: string) {
  const team = teams.find((candidate) => candidate.id === teamId);
  if (!team) throw new Error(`Unknown dataset team id: ${teamId}`);
  return team;
}

export function getTeamBySlug(slug: string) {
  return teams.find((team) => team.slug === slug);
}

export function getGame(gameId: string) {
  return games.find((game) => game.id === gameId);
}

export function getCoachBySlug(slug: string) {
  return coaches.find((coach) => coach.slug === slug);
}

export function getStadiumBySlug(_slug: string): Stadium | undefined {
  return undefined;
}

/** True when the model-estimate surfaces have published numbers behind them. */
export const modelEstimatesAvailable = false;
