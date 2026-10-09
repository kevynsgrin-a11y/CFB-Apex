#!/usr/bin/env node
/*
 * Week 6 midweek results refresh (run Oct 9, 2026).
 *
 * Applies verified midweek finals to the canonical refresh input
 * (data/cfb-2026/refresh/verified-refresh.json) through the same shape the
 * Oct 5 snapshot used, then lets scripts/build-dataset.mjs regenerate the site.
 *
 *  1. Finals. Every snapshot game whose kickoff has passed is re-read from the
 *     ESPN game summary. A game moves from scheduledGames to playedGames only
 *     when ESPN reports it completed (state "post"). Nothing is inferred from
 *     previews, odds or predictions. Each move asserts: home/away orientation
 *     matches the snapshot, the quarter line score sums to the final, and the
 *     Eastern game date is unchanged. Stable ids are kept (provider_id and the
 *     `${date}-${away}-at-${home}` game_id).
 *  2. Records. teamRecords for every team in a moved game is advanced by the
 *     result and must equal ESPN's post-game overall record, or the run fails.
 *  3. Standings. Conference tables are re-read from ESPN standings using the
 *     conference split ("vs. Conf."), not overall wins. This fixes the Oct 5
 *     re-pull, which wrote overall wins into W and a hard-coded 0 into L.
 *     Overall records in the table must agree with teamRecords.
 *  4. Remaining slate. Unfinished games are re-checked against the ESPN
 *     scoreboard (kickoff, venue, TV, neutral site, status). A difference is
 *     applied only when it is listed in CORRECTIONS with an official source
 *     that agrees with ESPN; any other difference fails the run. Rows that
 *     pass get their own verified_at (the time of this check).
 *  5. Evidence. Per-game and per-source timestamps go into the rows and into
 *     refresh_log. Snapshot-level retrieved_at / requested_cutoff /
 *     reference_date are left as the Oct 5 base snapshot so polls, metrics and
 *     injuries keep their own true cutoffs.
 *
 * Usage: node scripts/apply-week6-midweek-finals.mjs [--dry-run]
 */
import { readFileSync, writeFileSync } from "node:fs";

const DRY_RUN = process.argv.includes("--dry-run");
const refreshUrl = new URL("../data/cfb-2026/refresh/verified-refresh.json", import.meta.url);
const evidenceUrl = new URL("../data/cfb-2026/refresh/evidence/2026-10-09-midweek.json", import.meta.url);
const teamsUrl = new URL("../data/cfb-2026/teams.json", import.meta.url);

const refresh = JSON.parse(readFileSync(refreshUrl, "utf8"));
const evidence = JSON.parse(readFileSync(evidenceUrl, "utf8"));
const teamsDoc = JSON.parse(readFileSync(teamsUrl, "utf8"));
const teams = Array.isArray(teamsDoc) ? teamsDoc : teamsDoc.teams;

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/football/college-football";
const ESPN_WEB = "https://site.web.api.espn.com/apis/v2/sports/football/college-football";

/* Same alias table as apply-week6-audit.mjs and build-dataset.mjs. */
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
const byDisplay = new Map(teams.map((t) => [t.display_name.toLowerCase(), t.slug]));
const bySchool = new Map(teams.map((t) => [t.school.toLowerCase(), t.slug]));
const slugForName = (raw) => {
  const key = String(raw ?? "").toLowerCase().trim();
  const slug = byDisplay.get(key) ?? bySchool.get(key) ?? ESPN_NAME_ALIASES[key];
  if (!slug) throw new Error(`UNRESOLVED TEAM NAME: "${raw}"`);
  return slug;
};

/* Kickoff changes accepted only with an official source that agrees with ESPN. */
const CORRECTIONS = {
  "401856808": {
    kickoff_utc: "2026-10-11T02:30Z",
    time_et: "22:30",
    source: "https://thesundevils.com/sports/football/schedule",
    note: "Kickoff corrected from 01:30Z (9:30 PM ET) to 02:30Z: Arizona State lists 7:30 PM MST (Arizona does not observe DST) and ESPN agrees.",
  },
};

const easternDate = (iso) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const espnMinute = (iso) => `${new Date(iso).toISOString().slice(0, 16)}Z`;
const normRecord = (r) => String(r ?? "").replace("–", "-");
const sumLine = (competitor) => (competitor.linescores ?? []).reduce((n, q) => n + Number(q.displayValue ?? q.value ?? 0), 0);

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const doc = await res.json();
  return { doc, fetchedAt: new Date().toISOString() };
}

const runAt = new Date().toISOString();
const espnChecks = [];

/* ---------------------------------------------------------------- 1. finals */
const scoreboards = new Map();
async function scoreboard(day) {
  if (!scoreboards.has(day)) {
    const { doc, fetchedAt } = await getJson(`${ESPN}/scoreboard?dates=${day.replaceAll("-", "")}&groups=80&limit=200`);
    scoreboards.set(day, { doc, fetchedAt });
    espnChecks.push({ source: "ESPN FBS scoreboard", url: `${ESPN}/scoreboard?dates=${day.replaceAll("-", "")}&groups=80&limit=200`, checked_at: fetchedAt, finding: `${doc.events?.length ?? 0} events` });
  }
  return scoreboards.get(day);
}
const scoreboardEvent = async (row) => {
  // ESPN files late games under their UTC day; look in both days around the ET date.
  for (const day of new Set([row.date, row.kickoff_utc.slice(0, 10)])) {
    const { doc, fetchedAt } = await scoreboard(day);
    const event = doc.events?.find((e) => e.id === row.provider_id);
    if (event) return { event, fetchedAt };
  }
  return { event: null, fetchedAt: null };
};

const now = Date.now();
const finals = [];
const stillOpen = [];
for (const row of refresh.scheduledGames) {
  if (Date.parse(row.kickoff_utc) > now) continue;
  const { doc, fetchedAt } = await getJson(`${ESPN}/summary?event=${row.provider_id}`);
  const comp = doc.header?.competitions?.[0];
  const status = comp?.status?.type ?? {};
  if (!(status.completed === true && status.state === "post")) {
    stillOpen.push(`${row.provider_id} ${row.away}@${row.home}: ESPN ${status.name ?? "unknown"} (${status.detail ?? ""}) - left as scheduled`);
    continue;
  }
  const home = comp.competitors.find((c) => c.homeAway === "home");
  const away = comp.competitors.find((c) => c.homeAway === "away");
  const homeSlug = slugForName(home.team.displayName);
  const awaySlug = slugForName(away.team.displayName);
  if (homeSlug !== row.home_slug || awaySlug !== row.away_slug) {
    throw new Error(`Orientation mismatch for ${row.provider_id}: snapshot ${row.away_slug}@${row.home_slug}, ESPN ${awaySlug}@${homeSlug}`);
  }
  const homePts = Number(home.score);
  const awayPts = Number(away.score);
  if (!Number.isInteger(homePts) || !Number.isInteger(awayPts)) throw new Error(`Non-numeric score for ${row.provider_id}`);
  if (sumLine(home) !== homePts || sumLine(away) !== awayPts) {
    throw new Error(`Line score does not sum to final for ${row.provider_id}: ${sumLine(away)}-${sumLine(home)} vs ${awayPts}-${homePts}`);
  }
  if (easternDate(row.kickoff_utc) !== row.date) throw new Error(`Snapshot date ${row.date} is not the Eastern date of ${row.kickoff_utc}`);
  const { event } = await scoreboardEvent(row);
  const shortName = (slug, fallback) => {
    const c = event?.competitions?.[0]?.competitors?.find((x) => slugForName(x.team.displayName) === slug);
    return c?.team?.shortDisplayName ?? c?.team?.location ?? fallback;
  };
  const recordOf = (c) => (c.record ?? c.records ?? []).find((r) => r.type === "total")?.summary ?? null;
  const confOf = (c) => (c.record ?? c.records ?? []).find((r) => r.type === "vsconf")?.summary ?? null;
  const espnStart = comp.date ? espnMinute(comp.date) : null;
  finals.push({
    row,
    played: {
      provider_id: row.provider_id,
      source_url: row.source_url,
      date: row.date,
      kickoff_utc: row.kickoff_utc,
      week: row.week,
      home_slug: row.home_slug,
      away_slug: row.away_slug,
      site: doc.gameInfo?.venue?.fullName ?? row.site,
      tv: row.tv,
      neutral_site: row.neutral_site,
      verified_at: fetchedAt,
      game_id: `${row.date}-${row.away_slug}-at-${row.home_slug}`,
      title: /OT/.test(status.detail ?? "") ? status.detail : "Final",
      teams: [
        { slug: row.home_slug, name: shortName(row.home_slug, home.team.location), points: homePts },
        { slug: row.away_slug, name: shortName(row.away_slug, away.team.location), points: awayPts },
      ],
      meta: {
        as_of: easternDate(fetchedAt),
        sources: [
          row.source_url,
          ...evidence.official_checks.filter((c) => (c.corroborates ?? []).includes(row.provider_id)).map((c) => c.url),
        ],
        conference_game: comp.conferenceCompetition === true,
        line_score: { [row.away_slug]: (away.linescores ?? []).map((q) => Number(q.displayValue)), [row.home_slug]: (home.linescores ?? []).map((q) => Number(q.displayValue)) },
        ...(espnStart && espnStart !== row.kickoff_utc ? { espn_listed_start_utc: espnStart } : {}),
      },
    },
    espnRecords: { [row.home_slug]: recordOf(home), [row.away_slug]: recordOf(away) },
    espnConf: { [row.home_slug]: confOf(home), [row.away_slug]: confOf(away) },
  });
  espnChecks.push({ source: "ESPN game summary", url: `${ESPN}/summary?event=${row.provider_id}`, checked_at: fetchedAt, finding: `${status.detail}: ${row.away_slug} ${awayPts}, ${row.home_slug} ${homePts}` });
}

/* --------------------------------------------------------------- 2. records */
const recordChanges = [];
for (const f of finals) {
  const [h, a] = f.played.teams;
  for (const side of [h, a]) {
    const other = side === h ? a : h;
    const before = normRecord(refresh.teamRecords[side.slug]);
    const m = /^(\d+)-(\d+)$/.exec(before);
    if (!m) throw new Error(`Unparseable record for ${side.slug}: ${before}`);
    const won = side.points > other.points;
    const after = `${Number(m[1]) + (won ? 1 : 0)}-${Number(m[2]) + (won ? 0 : 1)}`;
    const espn = normRecord(f.espnRecords[side.slug]);
    if (espn !== after) throw new Error(`Record reconcile failed for ${side.slug}: ${before} + ${won ? "W" : "L"} = ${after}, ESPN says ${espn}`);
    refresh.teamRecords[side.slug] = after;
    recordChanges.push({ team_slug: side.slug, before, after, conference: f.espnConf[side.slug] });
  }
}

/* ------------------------------------------------------------- 3. standings */
const { doc: standingsDoc, fetchedAt: standingsAt } = await getJson(`${ESPN_WEB}/standings`);
espnChecks.push({ source: "ESPN conference standings", url: `${ESPN_WEB}/standings`, checked_at: standingsAt, finding: "re-read for all FBS conferences (vs. Conf. split)" });
const fbsConferences = new Set(teams.map((t) => t.conference_slug));
const nameByConference = new Map(teams.map((t) => [t.conference_slug, { name: t.conference, short: t.conference_short }]));
const standings = [];
for (const child of standingsDoc.children ?? []) {
  const rows = [];
  const walk = (node) => {
    for (const entry of node.standings?.entries ?? []) {
      const t = entry.team ?? {};
      const slug = slugForName(t.displayName ?? `${t.location ?? ""} ${t.name ?? ""}`.trim());
      const our = teams.find((tm) => tm.slug === slug);
      if (!our) continue;
      const byType = (type) => (entry.stats ?? []).find((s) => s.type === type)?.displayValue ?? null;
      const conf = byType("vsconf");
      const cm = /^(\d+)-(\d+)(?:-(\d+))?$/.exec(conf ?? "");
      if (!cm) throw new Error(`No conference split for ${slug} in ESPN standings`);
      rows.push({
        team: our.school,
        team_slug: slug,
        w: cm[1],
        l: cm[2],
        t: cm[3] ?? "0",
        pct: byType("vsconf_leaguewinpercent") ?? byType("leaguewinpercent") ?? "—",
        overall: byType("total"),
      });
    }
    for (const sub of node.children ?? []) walk(sub);
  };
  walk(child);
  if (!rows.length) continue;
  const confSlug = teams.find((tm) => tm.slug === rows[0].team_slug)?.conference_slug;
  if (!confSlug || !fbsConferences.has(confSlug)) continue;
  const dedup = new Map(rows.map((r) => [r.team_slug, r]));
  standings.push({ slug: confSlug, name: nameByConference.get(confSlug).name, short: nameByConference.get(confSlug).short, rows: [...dedup.values()].slice(0, 20) });
}
if (standings.length < 10) throw new Error(`ESPN standings produced only ${standings.length} conferences`);
const touched = new Set(recordChanges.map((r) => r.team_slug));
const overallMismatch = [];
for (const conf of standings) {
  for (const row of conf.rows) {
    const ours = normRecord(refresh.teamRecords[row.team_slug]);
    if (ours !== normRecord(row.overall)) overallMismatch.push(`${row.team_slug}: teamRecords ${ours} vs ESPN ${row.overall}`);
    if (Number(row.w) + Number(row.l) > ours.split("-").reduce((n, x) => n + Number(x), 0)) {
      throw new Error(`${row.team_slug}: conference games exceed overall games`);
    }
  }
}
const touchedMismatch = overallMismatch.filter((line) => touched.has(line.split(":")[0]));
if (touchedMismatch.length) throw new Error(`Standings disagree with reconciled records:\n${touchedMismatch.join("\n")}`);
for (const r of recordChanges) {
  const row = standings.flatMap((c) => c.rows).find((x) => x.team_slug === r.team_slug);
  if (r.conference && row && `${row.w}-${row.l}` !== r.conference) {
    throw new Error(`${r.team_slug}: standings conference ${row.w}-${row.l} vs game-summary ${r.conference}`);
  }
}
// Second source: Sun Belt official standings page, re-read now.
let sunBeltCheck = null;
try {
  const res = await fetch("https://sunbeltsports.org/standings.aspx?path=football", { headers: { "user-agent": "Mozilla/5.0" } });
  const text = (await res.text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const checkedAt = new Date().toISOString();
  const want = { "South Alabama": "2-0 2-0 4-2", Troy: "1-0 1-0 3-2", "Arkansas State": "0-2 0-2 2-4", "Southern Miss": "0-1 0-1 1-4" };
  const results = Object.entries(want).map(([team, rec]) => [team, text.includes(`${team} ${team} ${rec}`)]);
  sunBeltCheck = { source: "Sun Belt Conference official standings (re-read at apply time)", url: "https://sunbeltsports.org/standings.aspx?path=football", checked_at: checkedAt, http_status: res.status, finding: results.map(([t, ok]) => `${t} ${want[t].split(" ").slice(1).join(" / ")}: ${ok ? "matches" : "NOT FOUND"}`).join("; ") };
} catch (error) {
  sunBeltCheck = { source: "Sun Belt Conference official standings (re-read at apply time)", url: "https://sunbeltsports.org/standings.aspx?path=football", checked_at: new Date().toISOString(), finding: `unreachable: ${error.message}` };
}

/* -------------------------------------------------------- 4. remaining slate */
const moved = new Set(finals.map((f) => f.row.provider_id));
const scheduleChanges = [];
const remaining = [];
for (const row of refresh.scheduledGames) {
  if (moved.has(row.provider_id)) continue;
  const { event, fetchedAt } = await scoreboardEvent(row);
  if (!event) throw new Error(`Scheduled game ${row.provider_id} (${row.away}@${row.home}) is missing from the ESPN scoreboard`);
  const comp = event.competitions[0];
  const espn = {
    kickoff_utc: espnMinute(event.date),
    site: comp.venue?.fullName ?? null,
    tv: comp.broadcasts?.flatMap((b) => b.names ?? []).join(", ") || null,
    neutral_site: Boolean(comp.neutralSite),
    state: comp.status?.type?.state,
    status: comp.status?.type?.name,
  };
  if (espn.state === "post") throw new Error(`${row.provider_id} is final on ESPN but has not kicked off per the snapshot - rerun after investigating`);
  if (espn.status === "STATUS_POSTPONED" || espn.status === "STATUS_CANCELED") {
    throw new Error(`${row.provider_id} is ${espn.status} on ESPN - needs an explicit editorial decision`);
  }
  const diffs = [];
  if (espn.kickoff_utc !== row.kickoff_utc) diffs.push("kickoff_utc");
  if (espn.site !== row.site) diffs.push("site");
  if ((espn.tv ?? "").toUpperCase() !== (row.tv ?? "").toUpperCase()) diffs.push("tv");
  if (espn.neutral_site !== Boolean(row.neutral_site)) diffs.push("neutral_site");
  const fix = CORRECTIONS[row.provider_id];
  if (diffs.length) {
    const fixable = fix && diffs.every((d) => d === "kickoff_utc") && fix.kickoff_utc === espn.kickoff_utc;
    if (!fixable) throw new Error(`Unreviewed schedule difference for ${row.provider_id} (${row.away}@${row.home}): ${diffs.map((d) => `${d} ${row[d]} -> ${espn[d]}`).join("; ")}`);
    const before = { kickoff_utc: row.kickoff_utc, time_et: row.time_et };
    row.kickoff_utc = fix.kickoff_utc;
    row.time_et = fix.time_et;
    if (easternDate(row.kickoff_utc) !== row.date) throw new Error(`${row.provider_id}: corrected kickoff changes the Eastern date`);
    row.correction = [row.correction, `Oct 9 refresh: ${fix.note}`].filter(Boolean).join(" ");
    row.correction_sources = [fix.source, `${ESPN}/scoreboard?dates=${row.date.replaceAll("-", "")}&groups=80&limit=200`];
    scheduleChanges.push({ provider_id: row.provider_id, matchup: `${row.away} at ${row.home}`, before, after: { kickoff_utc: row.kickoff_utc, time_et: row.time_et }, source: fix.source });
  }
  row.verified_at = fetchedAt;
  row.game_status = espn.state === "in" ? "in_progress" : "scheduled";
  remaining.push(row.provider_id);
}

/* ------------------------------------------------------------ 5. write back */
const finalRows = finals.map((f) => f.played);
refresh.scheduledGames = refresh.scheduledGames.filter((row) => !moved.has(row.provider_id));
const existingIds = new Set(refresh.playedGames.map((g) => g.game_id));
// New finals are the latest dates on file, so appending (in kickoff order)
// keeps the date order without reshuffling existing rows.
const lastPlayedDate = refresh.playedGames.map((g) => g.date).sort().at(-1) ?? "";
if (finalRows.some((g) => g.date < lastPlayedDate)) throw new Error("A new final predates an existing played game; insert by date instead of appending");
for (const row of [...finalRows].sort((a, b) => a.kickoff_utc.localeCompare(b.kickoff_utc))) {
  if (existingIds.has(row.game_id)) throw new Error(`Duplicate played game id ${row.game_id}`);
  refresh.playedGames.push(row);
}
refresh.scheduledGames.sort((a, b) => a.kickoff_utc.localeCompare(b.kickoff_utc));

const priorStandingsAsOf = refresh.retainedBaseline.as_of;
refresh.retainedBaseline = {
  ...refresh.retainedBaseline,
  conferenceStandings: standings,
  as_of: easternDate(standingsAt),
  verified_at: standingsAt,
  note: `Conference standings re-read from ESPN at ${standingsAt} using each team's conference split (W/L/T) and league win percentage; overall records match teamRecords. Replaces the ${priorStandingsAsOf} pull, which carried overall wins in the W column and 0 in L. ESPN injury base retained at its previous ${refresh.retainedBaseline.espnInjuries?.asOf ?? "unknown"} cutoff.`,
};

refresh.holds = (refresh.holds ?? []).map((hold) => {
  if (/^No live in-season scores feed/.test(hold)) {
    return "No live in-season scores feed is wired: games move to final only through a verified snapshot refresh. The Oct 6-8 midweek finals were added Oct 9; Friday Oct 9 and Saturday Oct 10 games stay scheduled until the next verified refresh.";
  }
  if (/^Week 6 injury report published Oct 5/.test(hold)) {
    return `${hold.split(" Practice-participation")[0]} Conference availability filings due Oct 7-9 were not re-verified in the Oct 9 refresh (BigTen.org report pages unreachable from the verification environment); injury rows keep their Oct 5 cutoff.`;
  }
  return hold;
});

const thursday = finalRows.filter((g) => g.date === "2026-10-08");
const earlier = finalRows.filter((g) => g.date < "2026-10-08");
const recordAfter = (slug) => refresh.teamRecords[slug].replace("-", "–");
const confAfter = (slug) => {
  const r = recordChanges.find((x) => x.team_slug === slug)?.conference;
  return r ? r.replace("-", "–") : null;
};
const confShort = (slug) => teams.find((t) => t.slug === slug)?.conference_short;
const school = (slug) => teams.find((t) => t.slug === slug).school;
const leagueName = (slug) => ({ SBC: "Sun Belt" })[confShort(slug)] ?? confShort(slug);
const winnerFirst = (g) => {
  const [h, a] = g.teams;
  const [w, l] = h.points > a.points ? [h, a] : [a, h];
  return { w, l, road: w.slug === g.away_slug, text: `${school(w.slug)} ${w.points}, ${school(l.slug)} ${l.points}` };
};
const dayName = (date) => new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
if (thursday.length) {
  const lines = thursday.map((g) => {
    const { w, road, text } = winnerFirst(g);
    const conf = confAfter(w.slug);
    return `${text} (${road ? "on the road; " : ""}${school(w.slug)} ${recordAfter(w.slug)}${conf ? `, ${conf} ${leagueName(w.slug)}` : ""})`;
  });
  const earlierText = earlier.map((g) => { const { road, text } = winnerFirst(g); return `${text} (${dayName(g.date)}${road ? ", on the road" : ""})`; }).join("; ");
  const storyline = {
    id: "week6-thursday-finals",
    headline: `Thursday finals: ${thursday.map((g) => school(winnerFirst(g).w.slug)).join(", ").replace(/, ([^,]*)$/, " and $1")} win`,
    body: `Oct 8 results: ${lines.join("; ")}.${earlierText ? ` Earlier in Week 6: ${earlierText}.` : ""} Scores and records per ESPN game pages, verified ${runAt.slice(0, 16).replace("T", " ")} UTC; Conference USA and Sun Belt standings pages agree. The American's standings page had not posted UTSA–South Florida at check time.`,
    game_provider_id: null,
    result_provider_ids: finalRows.map((g) => g.provider_id),
    as_of: easternDate(runAt),
    sources: [...thursday, ...earlier].map((g) => g.source_url).concat([
      "https://conferenceusa.com/standings.aspx?path=football",
      "https://sunbeltsports.org/standings.aspx?path=football",
    ]),
  };
  refresh.storylines = [storyline, ...(refresh.storylines ?? []).filter((s) => s.id !== storyline.id)];
}

for (const url of evidence.official_checks.map((c) => c.url)) {
  if (!refresh.source_urls.includes(url)) refresh.source_urls.push(url);
}
for (const row of finalRows) if (!refresh.source_urls.includes(row.source_url)) refresh.source_urls.push(row.source_url);

refresh.results_verified_at = runAt;
refresh.refresh_log = [
  ...(refresh.refresh_log ?? []),
  {
    applied_at: runAt,
    script: "scripts/apply-week6-midweek-finals.mjs",
    scope: evidence.scope,
    finals_added: finalRows.map((g) => ({ provider_id: g.provider_id, game_id: g.game_id, date_et: g.date, kickoff_utc: g.kickoff_utc, score: `${g.away_slug} ${g.teams[1].points}, ${g.home_slug} ${g.teams[0].points}`, verified_at: g.verified_at })),
    records_changed: recordChanges,
    schedule_changes: scheduleChanges,
    remaining_rechecked: remaining.length,
    left_open: stillOpen,
    untouched_cutoffs: {
      polls_released: refresh.polls?.map((p) => `${p.poll} ${p.release_date}`) ?? [],
      metrics_through_games: refresh.metrics?.through_games ?? null,
      injuries_as_of: refresh.retainedBaseline.espnInjuries?.asOf ?? null,
      base_snapshot_retrieved_at: refresh.retrieved_at,
    },
    evidence: [...espnChecks, sunBeltCheck, ...evidence.official_checks],
    overall_record_disagreements_outside_scope: overallMismatch.filter((line) => !touched.has(line.split(":")[0])),
  },
];

console.log(`Midweek refresh ${DRY_RUN ? "(dry run) " : ""}at ${runAt}`);
console.log(` - finals moved: ${finalRows.map((g) => `${g.game_id} ${g.teams[1].points}-${g.teams[0].points}`).join(", ") || "none"}`);
console.log(` - records: ${recordChanges.map((r) => `${r.team_slug} ${r.before}->${r.after}`).join(", ")}`);
console.log(` - standings: ${standings.length} conferences re-read; outside-scope overall disagreements: ${overallMismatch.length - touchedMismatch.length}`);
console.log(` - schedule: ${remaining.length} rows re-checked, ${scheduleChanges.length} corrected`);
if (stillOpen.length) console.log(` - left open: ${stillOpen.join("; ")}`);
console.log(` - Sun Belt second source: ${sunBeltCheck?.finding}`);
if (!DRY_RUN) writeFileSync(refreshUrl, `${JSON.stringify(refresh, null, 1)}\n`);
