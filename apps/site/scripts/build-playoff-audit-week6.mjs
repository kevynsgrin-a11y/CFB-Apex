import fs from "node:fs";
import path from "node:path";

// Builds playoff-audit/week6-2026.json from the verified snapshot (composite
// polls, team records, played finals, remaining schedules) plus the P6
// research pass (FPI Oct 4, bracketology, futures). Writes both the site copy
// and the content-package copy. Fail-loud on any unresolvable slug.

const SITE = "C:/Users/Dell/cfbapex-deploy/apps/site";
const CONTENT = "C:/Users/Dell/CFB-Apex-Content/content";
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

const refresh = read(path.join(SITE, "data/cfb-2026/refresh/verified-refresh.json"));
const teams = read(path.join(SITE, "data/cfb-2026/teams.json")).teams;
const polls = read(path.join(COMPONENTS0(), "polls/2026-week6.json"));

function COMPONENTS0() { return CONTENT + "/data/cfb-2026"; }

const slugSet = new Set(teams.map((t) => t.slug));
const records = refresh.teamRecords;
const rec = (slug) => (records[slug] ?? "Not published").replace("-", "–");

/* ---- composite (average of AP + Coaches, unranked = 26; ties by AP) ---- */
const ap = polls.polls.find((p) => p.poll === "ap");
const co = polls.polls.find((p) => p.poll === "coaches");
const rankMaps = [
  new Map(ap.rankings.map((r) => [r.team_slug, r.rank])),
  new Map(co.rankings.map((r) => [r.team_slug, r.rank])),
];
const comp = new Map();
for (const [poll, map] of rankMaps.entries())
  for (const r of map) {
    const row = comp.get(r[0]) ?? { slug: r[0], ranks: [null, null] };
    row.ranks[poll] = r[1];
    comp.set(r[0], row);
  }
const composite = [...comp.values()]
  .map((r) => ({ ...r, avg: ((r.ranks[0] ?? 26) + (r.ranks[1] ?? 26)) / 2 }))
  .sort((a, b) => a.avg - b.avg || (a.ranks[0] ?? 26) - (b.ranks[0] ?? 26));

/* ---- played games: best win + closest call per team ---- */
const played = refresh.playedGames.map((g) => ({
  date: g.date,
  away: g.away_slug,
  home: g.home_slug,
  awayScore: g.teams.find((t) => t.slug === g.away_slug)?.points,
  homeScore: g.teams.find((t) => t.slug === g.home_slug)?.points,
  neutral: Boolean(g.neutral_site),
}));
const compRank = new Map(composite.map((r, i) => [r.slug, i + 1]));
function bestWinAndClosest(slug) {
  let best = null;
  let closest = null;
  for (const g of played) {
    const isHome = g.home === slug;
    const isAway = g.away === slug;
    if (!isHome && !isAway) continue;
    const opp = isHome ? g.away : g.home;
    const own = isHome ? Number(g.homeScore) : Number(g.awayScore);
    const oppPts = isHome ? Number(g.awayScore) : Number(g.homeScore);
    if (Number.isNaN(own) || Number.isNaN(oppPts)) continue;
    const margin = own - oppPts;
    const oppRank = compRank.get(opp);
    if (margin > 0 && oppRank && (!best || oppRank < best.oppRank)) best = { opp, oppRank, margin, score: `${own}–${oppPts}` };
    if (margin > 0 && (!closest || Math.abs(margin) < Math.abs(closest.margin))) closest = { opp, margin, score: `${own}–${oppPts}` };
  }
  return { best, closest };
}

/* ---- remaining SOS: avg current win pct of remaining FBS opponents ---- */
// Records are W-L strings; win pct = W/(W+L). Remaining = scheduled games with
// kickoff_utc on/after 2026-10-06 whose opponent is in the 138 list.
const winPct = (slug) => {
  const r = records[slug];
  if (!r) return null;
  const [w, l] = r.split("-").map(Number);
  if (!Number.isFinite(w) || !Number.isFinite(l) || w + l === 0) return null;
  return w / (w + l);
};
const sosRows = [];
for (const team of teams) {
  const schedPath = path.join(SITE, "data/cfb-2026/schedules", `${team.slug}.json`);
  if (!fs.existsSync(schedPath)) continue;
  const doc = read(schedPath);
  let sum = 0, n = 0;
  for (const row of doc.games ?? []) {
    const date = row.kickoff_utc ?? row.date;
    if (!date || date.slice(0, 10) < "2026-10-06") continue;
    const opp = row.opponent_slug;
    if (!opp || !slugSet.has(opp)) continue;
    const pct = winPct(opp);
    if (pct == null) continue;
    sum += pct; n += 1;
  }
  if (n > 0) sosRows.push({ slug: team.slug, avg: sum / n, n });
}
sosRows.sort((a, b) => b.avg - a.avg); // 1 = hardest
const sosRank = new Map(sosRows.map((r, i) => [r.slug, { rank: i + 1, avg: r.avg }]));

/* ---- week 6 board games for contenders ---- */
const boardBySlug = new Map();
for (const g of refresh.scheduledGames) {
  boardBySlug.set(g.home, g);
  boardBySlug.set(g.away, g);
}

/* ---- assemble ---- */
const taken = [...rankMaps[0].keys(), ...rankMaps[1].keys()];
const pool = composite.slice(0, 24).map((r) => r.slug);
const audit = {
  as_of: "2026-10-05",
  week: 6,
  source_engines:
    "ZCode (GLM) weekly pipeline compilation from the verified Oct 5 snapshot (October 4 AP + AFCA Coaches polls, team records, Week 1–5 finals, site schedules) plus the Gemini P6 research pass (FPI Oct 4 via The Big Lead; Athlon and Dinich/ESPN bracketology Oct 4; FanDuel + BetMGM futures Oct 4–5). Composite = average of AP + Coaches ranks (unranked = 26). Remaining-SOS is a CFB Apex computed metric: average current win percentage of remaining FBS opponents (through Week 5 results), rank 1 = hardest.",
  contenders: pool.map((slug) => {
    const row = composite.find((r) => r.slug === slug);
    const record = rec(slug);
    const { best, closest } = bestWinAndClosest(slug);
    const sos = sosRank.get(slug);
    const game = boardBySlug.get(slug);
    const weekGame = game
      ? `${game.away === slug ? "@" : "vs "}${game.away === slug ? game.home.replace(/-/g, " ") : game.away.replace(/-/g, " ")} — ${game.date}${game.neutral_site ? " (neutral)" : ""}${game.tv ? `, ${game.tv}` : ""}`
      : "Bye (AP-ranked idle)";
    const unbeaten = !record.includes("–") || record.endsWith("–0");
    const oneLoss = record.endsWith("–1");
    const rank = composite.indexOf(row) + 1;
    const tag = rank <= 8 && unbeaten ? "controls_destiny" : unbeaten ? "win_out_or_out" : oneLoss && rank <= 12 ? "win_out_or_out" : "needs_help";
    return {
      team_slug: slug,
      record,
      composite_rank: rank,
      remaining_sos: sos ? `CFB Apex remaining-SOS rank #${sos.rank} (avg opponent win pct ${sos.avg.toFixed(3)} through Week 5)` : "Not computed (no rated remaining opponents)",
      losses_that_end_case: oneLoss ? 1 : 2,
      resume_state: `Best win: ${best ? `${best.score} over ${best.opp.replace(/-/g, " ")} (composite #${best.oppRank})` : "none over a ranked team"}; closest call: ${closest ? `${closest.score} vs ${closest.opp.replace(/-/g, " ")}` : "none closer than two scores"}`,
      tag,
      week6_game: weekGame,
      sources: [
        "https://site.api.espn.com/apis/site/v2/sports/football/college-football/rankings",
        "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard",
        "CFB Hub schedules dataset",
        "Gemini P6 research pass (content/research/P6-playoff.md)",
      ],
    };
  }),
  storylines: {
    mover: "missouri-tigers swung the weekend: a 45–17 dismantling of then-No. 8 Florida in Columbia lifted the Tigers AP 25→14 and crashed Florida's title price from +2000 to +3500 at FanDuel — while setting up next week's former-flavor showdown with Texas A&M.",
    watch_next_week: "georgia-bulldogs (#2 composite) at alabama-crimson-tide (#6) in Tuscaloosa, Sat 7:30 PM ET on ABC — College GameDay site, the first meeting of the season between top-six composite teams. The loser's path reroutes through the SEC title game.",
    weaker_than_record: "pittsburgh-panthers are 5–0 and ranked for the first time since 2022, but the anchor is gone: QB Mason Heintschel (13 TD, 1 INT) tore his ACL on Oct 2 and fifth-year transfer Holden Geriner makes his first start vs North Carolina. The composite rank (25) already prices the downgrade.",
    conference_notes: [
      "SEC: Florida's 45–17 loss at Missouri narrows the league's realistic bid ceiling behind Texas, Georgia, and Alabama (Dinich still projects six SEC bids — the head-to-head math gets hostile from here).",
      "Big Ten: Ohio State's 31–14 win at Iowa re-established the Buckeyes as the league's team to beat; Indiana (5–0, defending champion) keeps winning without style questions being asked yet.",
      "Big 12: three unbeatens — BYU, Texas Tech, idle Utah — none ranked above No. 9 composite; Iowa State rebounded with a 45–42 shootout win over West Virginia.",
      "ACC: Miami's 41–13 demolition of Clemson plus Pitt's QB loss makes the Hurricanes a prohibitive favorite for the ACC's automatic bye; SMU (4–1) is the primary challenger.",
      "Group of 5: North Dakota State — 5–0 in its first FBS season after a 28–0 shutout of Wyoming — is positioned to challenge Boise State for the Mountain West crown and the G5's automatic bid.",
    ].join(" "),
  },
  outside_reference: {
    fpi: {
      as_of: "2026-10-04",
      top_10: ["Ohio State", "Georgia", "Notre Dame", "Texas", "Miami (FL)", "Alabama", "Indiana", "LSU", "Oregon", "Tennessee"],
      note: "ESPN FPI as reported by The Big Lead (Josh Sanchez, Oct 4, 2026). FPI remaining-SOS top five was not published in the syndicated update; isolated figures: Miami 38th, Notre Dame 51st, Louisville 61st (Yardbarker/247Sports).",
      source: "https://www.thebiglead.com/updated-espn-fpi-college-football-top-25-rankings-after-week-5/",
    },
    bracket_projections: [
      { outlet: "Athlon Sports", date: "2026-10-04", byes: ["Texas", "Georgia", "Notre Dame", "Indiana"], field_12: "Texas, Georgia, Notre Dame, Indiana, Ohio State, Miami, Alabama, Ole Miss, LSU, Oregon, BYU, Boise State", note: "Straight-seeding model (ignores conference-champion bye bylaws); Boise State takes the fifth-champion bid at No. 12; Florida eliminated.", source: "https://athlonsports.com/college-football/2026-bowl-projections-after-week-5-sec-chaos-shakes-up-playoff-field" },
      { outlet: "Heather Dinich / ESPN", date: "2026-10-04", byes: ["Texas", "Ohio State", "Georgia", "Miami (FL)"], field_12: "Texas, Ohio State, Georgia, Miami, Alabama, Notre Dame, Indiana, BYU, Florida, Ole Miss, LSU, Oregon", note: "Applies conference-champion bye bylaws: independent Notre Dame seeded No. 6 (first-round campus game); six SEC bids with Florida retained at No. 9 on head-to-head chains.", source: "https://www.espn.com/college-football/story/_/id/50091118/projecting-2026-college-football-playoff-top-12-week-5" },
    ],
    national_championship_odds: [
      { team: "Ohio State", fanduel: "+400/+410", betmgm: "+450", consensus: "+400 to +450" },
      { team: "Notre Dame", fanduel: "+550", betmgm: "+550", consensus: "+550" },
      { team: "Georgia", fanduel: "+550", betmgm: "+550", consensus: "+550" },
      { team: "Texas", fanduel: "+700", betmgm: "+550", consensus: "+550 to +700" },
      { team: "Miami (FL)", fanduel: "+800", betmgm: "+700", consensus: "+700 to +800" },
      { team: "Alabama", fanduel: "+900", betmgm: "+1200", consensus: "+900 to +1200" },
      { team: "Indiana", fanduel: "+1000", betmgm: "+900", consensus: "+900 to +1000" },
      { team: "LSU", fanduel: "+1600", betmgm: "+1200", consensus: "+1200 to +1600" },
      { team: "Oregon", fanduel: "+2200", betmgm: "+2000", consensus: "+2000 to +2200" },
      { team: "Florida", fanduel: "+3500", betmgm: "+3000", consensus: "+3000 to +3500" },
    ],
    odds_note: "FanDuel (Oct 4–5, 2026, FanDuel Research) and BetMGM via VegasInsider composite (Oct 4, 2026). Florida tumbled from +2000 to +3500 at FanDuel after being outgained 560–302 at Missouri.",
  },
};

if (audit.contenders.some((c) => !slugSet.has(c.team_slug))) throw new Error("unresolved slug in contenders");
for (const target of [path.join(SITE, "data/cfb-2026/playoff-audit/week6-2026.json"), path.join(CONTENT, "data/cfb-2026/playoff-audit/week6-2026.json")]) {
  fs.writeFileSync(target, JSON.stringify(audit, null, 1) + "\n");
}
console.log("playoff-audit/week6-2026.json written (both copies):", audit.contenders.length, "contenders");
console.log("top 6:", audit.contenders.slice(0, 6).map((c) => `${c.team_slug}(${c.record},${c.tag})`).join(" | "));
console.log("SOS computed for", sosRows.length, "teams; hardest 3:", sosRows.slice(0, 3).map((r) => `${r.slug} ${r.avg.toFixed(3)}`).join(", "));
