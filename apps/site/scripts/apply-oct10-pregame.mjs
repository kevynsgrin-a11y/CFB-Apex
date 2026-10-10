/** Apply the reviewed Oct 10 evidence without network access or deployment.
 * Usage: node scripts/apply-oct10-pregame.mjs [--dry-run]
 * Existing category timestamps remain unchanged; each refreshed row is dated.
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const path = new URL('../data/cfb-2026/refresh/verified-refresh.json', import.meta.url);
const evidencePath = new URL('../data/cfb-2026/refresh/evidence/2026-10-10-pregame.json', import.meta.url);
const snapshot = JSON.parse(readFileSync(path, 'utf8'));
const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
const easternDate = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
const easternTime = (iso) => new Intl.DateTimeFormat('en-GB', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
const changes = [];
assert.equal(snapshot.week, 6);
assert.equal(snapshot.reference_date, '2026-10-05');
assert.equal(evidence.finals.length, 5);
assert.equal(evidence.previous_finals.length, 7);
assert.equal(evidence.scheduled.length, 46);
assert.equal(new Set([...evidence.finals, ...evidence.previous_finals, ...evidence.scheduled].map(g => g.provider_id)).size, 58);
for (const final of evidence.previous_finals) {
  assert.equal(final.completed, true);
  assert.equal(final.state, 'post');
  const row = snapshot.playedGames.find(g => g.provider_id === final.provider_id);
  assert.ok(row);
  for (const side of final.sides) assert.equal(row.teams.find(t => t.slug === side.slug)?.points, side.points);
}
for (const final of evidence.finals) {
  assert.equal(final.completed, true);
  assert.equal(final.state, 'post');
  const prior = snapshot.playedGames.find(g => g.provider_id === final.provider_id);
  if (prior) {
    for (const side of final.sides) assert.equal(prior.teams.find(t => t.slug === side.slug)?.points, side.points);
    continue;
  }
  const row = snapshot.scheduledGames.find(g => g.provider_id === final.provider_id);
  assert.ok(row, `Missing scheduled game ${final.provider_id}`);
  const home = final.sides.find(t => t.side === 'home');
  const away = final.sides.find(t => t.side === 'away');
  assert.equal(home.slug, row.home_slug);
  assert.equal(away.slug, row.away_slug);
  assert.equal(easternDate(final.kickoff_utc), row.date);
  assert.equal(home.points, final.official.homeScore);
  assert.equal(away.points, final.official.awayScore);
  for (const side of [home, away]) {
    assert.ok(Number.isInteger(side.points) && side.points >= 0);
    assert.equal(side.line_score.reduce((a, b) => a + b, 0), side.points);
    const [w, l] = snapshot.teamRecords[side.slug].split('-').map(Number);
    const won = side.points > (side === home ? away.points : home.points);
    const after = `${w + Number(won)}-${l + Number(!won)}`;
    assert.equal(side.record, after);
    assert.equal(side.record, final.official[side === home ? 'homeRecord' : 'awayRecord']);
    assert.equal(side.conference_record, final.official[side === home ? 'homeConferenceRecord' : 'awayConferenceRecord']);
    snapshot.teamRecords[side.slug] = after;
  }
  snapshot.playedGames.push({
    provider_id: row.provider_id, source_url: row.source_url, game_id: `${row.date}-${row.away_slug}-at-${row.home_slug}`,
    date: row.date, kickoff_utc: final.kickoff_utc, week: row.week, home_slug: row.home_slug, away_slug: row.away_slug,
    site: final.site ?? row.site, tv: final.tv || row.tv, neutral_site: row.neutral_site, verified_at: final.verified_at,
    title: final.detail,
    teams: [home, away].map(t => ({ slug: t.slug, name: t.name, points: t.points })),
    meta: { as_of: easternDate(final.verified_at), sources: [final.source_url, ...final.official.sources], conference_game: final.conference_game,
      line_score: Object.fromEntries(final.sides.map(t => [t.slug, t.line_score])),
      ...(final.kickoff_utc !== row.kickoff_utc ? { originally_scheduled_kickoff_utc: row.kickoff_utc, kickoff_note: 'ESPN game summary and scoreboard list the actual start; stable Eastern game id retained.' } : {}) },
  });
  snapshot.scheduledGames = snapshot.scheduledGames.filter(g => g.provider_id !== row.provider_id);
}
const reviewedChanges = {
  '401862797': { kickoff_utc: '2026-10-10T17:00Z', tv: 'ESPN+', sources: ['https://ecupirates.com/news/2026/10/9/football-ecu-opens-american-conference-play-hosting-rice-at-1-pm', 'https://riceowls.com/news/2026/10/9/football-owls-look-to-even-conference-mark-against-pirates'], note: 'Moved to 1 PM ET due to weather; ESPN+ unchanged.' },
  '401856827': { kickoff_utc: '2026-10-11T00:00Z', tv: 'ESPN App · linear network TBD', sources: ['https://utahutes.com/news/2026/10/9/saturdays-utah-football-game-vs-kansas-moved-to-6-pm', 'https://big12sports.com/news/2026/10/10/big-12-update-on-kansas-utah-football-game.aspx'], note: 'Moved to 6 PM MDT (8 PM ET); ESPN App confirmed, linear ESPN network to be announced.' },
};
for (const check of evidence.scheduled) {
  const row = snapshot.scheduledGames.find(g => g.provider_id === check.provider_id);
  assert.ok(row);
  assert.equal(check.game_status, 'STATUS_SCHEDULED');
  assert.equal(check.home, row.home);
  assert.equal(check.away, row.away);
  assert.equal(check.site, row.site);
  assert.equal(check.neutral_site, row.neutral_site);
  const correction = reviewedChanges[row.provider_id];
  if (correction) {
    assert.equal(check.kickoff_utc, correction.kickoff_utc);
    if (row.kickoff_utc !== correction.kickoff_utc || row.tv !== correction.tv) changes.push({ provider_id: row.provider_id, before: { kickoff_utc: row.kickoff_utc, tv: row.tv }, after: { kickoff_utc: correction.kickoff_utc, tv: correction.tv }, sources: correction.sources });
    Object.assign(row, { kickoff_utc: correction.kickoff_utc, tv: correction.tv, correction: correction.note, correction_sources: correction.sources });
  } else {
    assert.equal(check.kickoff_utc, row.kickoff_utc, `${row.provider_id} unreviewed kickoff`);
    assert.equal((check.tv ?? '').toUpperCase(), (row.tv ?? '').toUpperCase(), `${row.provider_id} unreviewed TV`);
  }
  assert.equal(easternDate(row.kickoff_utc), row.date);
  row.time_et = easternTime(row.kickoff_utc);
  row.verified_at = check.verified_at;
  row.game_status = 'scheduled';
}
assert.equal(snapshot.scheduledGames.length, 46);
snapshot.scheduledGames.sort((a, b) => a.kickoff_utc.localeCompare(b.kickoff_utc));
assert.equal(evidence.standings.conferences.reduce((n, c) => n + c.rows.length, 0), 138);
for (const conf of evidence.standings.conferences) for (const row of conf.rows) {
  assert.equal(row.overall, snapshot.teamRecords[row.team_slug], `${row.team_slug} overall record`);
  const [w, l] = row.overall.split('-').map(Number);
  assert.ok(Number(row.w) <= w && Number(row.l) <= l);
  const side = evidence.finals.flatMap(g => g.sides).find(t => t.slug === row.team_slug);
  if (side) assert.equal(`${row.w}-${row.l}`, side.conference_record);
}
snapshot.retainedBaseline = { ...snapshot.retainedBaseline, conferenceStandings: evidence.standings.conferences, as_of: '2026-10-10', verified_at: evidence.standings.verified_at, note: 'Conference and overall standings rechecked October 10 against ESPN after all five Friday finals; all 138 overall records reconcile. Injury base retains its own prior cutoff.' };
snapshot.results_verified_at = evidence.checked_at;
snapshot.schedule_verified_at = evidence.checked_at;
snapshot.holds = snapshot.holds.map(hold => hold.startsWith('No live in-season scores feed') ? 'No live in-season scores feed is wired. All 12 completed Week 6 FBS-vs-FBS games through Friday October 9 were verified October 10; the remaining 46 Saturday assignments were rechecked. Status changes after this snapshot require another verified refresh.' : hold);
const fridayStory = { id: 'week6-friday-finals', headline: 'Friday finals: Louisville, Iowa, Utah State, Wyoming and BYU win', body: 'October 9 results: Louisville 44–20 Florida State; Iowa 41–24 Washington; Utah State 17–16 Washington State; Wyoming 16–13 San José State (OT); BYU 24–10 Iowa State. Verified October 10 against ESPN completed-game summaries, quarter scores and official school reports. The Saturday slate has 46 FBS-vs-FBS games.', game_provider_id: null, result_provider_ids: evidence.finals.map(g => g.provider_id), as_of: '2026-10-10', sources: evidence.finals.flatMap(g => g.official.sources) };
const alert = { id: 'oct10-kickoff-weather-updates', headline: 'Saturday changes: Rice–ECU at 1 PM ET; Kansas–Utah at 8 PM ET', body: 'Rice at East Carolina moved to 1 PM ET on ESPN+ because of weather. Kansas at Utah moved to 6 PM MDT / 8 PM ET, with ESPN App coverage and the linear ESPN network still to be announced. Georgia Tech says its 3:30 PM ET game remains scheduled; weather has canceled several campus festivities. Follow the schools’ current advisories before traveling.', game_provider_id: null, as_of: '2026-10-10', sources: [...Object.values(reviewedChanges).flatMap(c => c.sources), 'https://ramblinwreck.com/weather'] };
snapshot.storylines = [alert, fridayStory, ...snapshot.storylines.filter(s => s.id !== fridayStory.id && s.id !== alert.id)];
const sources = [...evidence.finals.flatMap(g => [g.source_url, ...g.official.sources]), ...alert.sources, evidence.standings.source_url];
snapshot.source_urls = [...new Set([...snapshot.source_urls, ...sources])];
const log = { applied_at: evidence.checked_at, script: 'scripts/apply-oct10-pregame.mjs', scope: evidence.scope, evidence: 'data/cfb-2026/refresh/evidence/2026-10-10-pregame.json', finals_added: evidence.finals.map(g => g.provider_id), previous_finals_rechecked: 7, remaining_rechecked: 46, schedule_changes: changes, untouched_cutoffs: { base_snapshot_retrieved_at: snapshot.retrieved_at, polls_released: snapshot.polls.map(p => `${p.poll} ${p.release_date}`), metrics_through_games: snapshot.metrics.through_games, injuries_as_of: snapshot.retainedBaseline.espnInjuries.asOf } };
if (!(snapshot.refresh_log ?? []).some(l => l.script === log.script)) snapshot.refresh_log = [...(snapshot.refresh_log ?? []), log];
if (!process.argv.includes('--dry-run')) writeFileSync(path, `${JSON.stringify(snapshot, null, 1)}\n`);
console.log('Verified 12 finals, 46 scheduled games, 138 records; applied two official kickoff corrections. No deploy performed.');
