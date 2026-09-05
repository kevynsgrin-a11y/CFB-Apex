/**
 * A small server-rendered browser over the dataset.
 *
 * Its job is verification, not product: after a deploy, someone needs to open a
 * URL and see real schools, real coaches and real recruiting stars rather than
 * trust a green check. It renders from the same client the API uses, so if this
 * page looks right the data underneath is right.
 */

import type { CfbDataClient } from "@cfb-apex/data";

const STYLE = `
:root{
  --bg:#fbfaf8; --panel:#fff; --ink:#16181d; --muted:#5d636e; --line:#e3e1dc;
  --accent:#8a3324; --accent-soft:#f4ece9; --star:#b8860b;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --bg:#14161a; --panel:#1c1f25; --ink:#eceef2; --muted:#9aa2ae; --line:#2c313a;
    --accent:#e8836b; --accent-soft:#2a2020; --star:#e0b64a;
  }
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
  font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:1080px;margin:0 auto;padding:28px 20px 72px}
header.site{border-bottom:1px solid var(--line);padding-bottom:18px;margin-bottom:26px}
h1{font-size:24px;margin:0 0 6px;letter-spacing:-.01em}
h2{font-size:17px;margin:32px 0 12px;letter-spacing:-.01em}
h3{font-size:14px;margin:22px 0 8px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.sub{color:var(--muted);font-size:13px;margin:0}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px}
.card .name{font-weight:600}
.card .meta{color:var(--muted);font-size:12.5px;margin-top:3px}
table{width:100%;border-collapse:collapse;font-size:13.5px}
th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--muted);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.05em}
tbody tr:last-child td{border-bottom:none}
.scroll{overflow-x:auto;background:var(--panel);border:1px solid var(--line);border-radius:10px}
.pill{display:inline-block;padding:2px 8px;border-radius:999px;background:var(--accent-soft);
  color:var(--accent);font-size:11.5px;font-weight:600;letter-spacing:.03em}
.stars{color:var(--star);letter-spacing:1px}
.na{color:var(--muted);font-style:italic}
.rank{font-variant-numeric:tabular-nums;color:var(--muted);width:2.5em}
nav.crumbs{font-size:13px;color:var(--muted);margin-bottom:18px}
footer{margin-top:48px;padding-top:16px;border-top:1px solid var(--line);
  color:var(--muted);font-size:12.5px}
code{background:var(--accent-soft);padding:1px 5px;border-radius:4px;font-size:12.5px}
.cols{display:grid;gap:26px;grid-template-columns:1fr}
@media(min-width:760px){.cols{grid-template-columns:1fr 1fr}}
`;

function escape(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Renders a gap the way the dataset means it: absent, not zero. */
function orNotListed(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return '<span class="na">Not listed</span>';
  }
  return escape(value);
}

function stars(count: number | null): string {
  if (!count) return '<span class="na">—</span>';
  return `<span class="stars" title="${count}-star recruit">${"★".repeat(count)}</span>`;
}

function shell(title: string, body: string, crumbs = ""): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${escape(title)} — CFB Apex data</title><style>${STYLE}</style></head>
<body><div class="wrap">${crumbs}${body}
<footer>CFB Apex dataset · every value traces to a published source document ·
<a href="/api/routes">API routes</a> · <a href="/v1/index.json">raw manifest</a></footer>
</div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export async function renderPage(
  url: URL,
  client: CfbDataClient,
  extraHeaders: Record<string, string>,
): Promise<Response> {
  const segments = url.pathname.split("/").filter(Boolean);
  const response =
    segments[0] === "browse" && segments[1]
      ? await renderTeam(segments[1], client)
      : await renderHome(client);
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(extraHeaders)) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}

async function renderHome(client: CfbDataClient): Promise<Response> {
  const [index, conferences, teams, polls] = await Promise.all([
    client.index(),
    client.conferences(),
    client.teams(),
    client.polls().catch(() => null),
  ]);

  const ap = polls?.polls.find((entry) => entry.poll === "ap");
  const coaches = polls?.polls.find((entry) => entry.poll === "coaches");

  const pollTable = (title: string, rows: typeof ap) =>
    !rows
      ? ""
      : `<h3>${escape(title)}</h3><div class="scroll"><table>
<thead><tr><th class="rank">#</th><th>Team</th><th>Points</th><th>1st</th></tr></thead><tbody>
${rows.rankings
  .map(
    (row) => `<tr><td class="rank">${escape(row.rank)}${row.tied ? "T" : ""}</td>
<td>${
      row.team_slug
        ? `<a href="/browse/${escape(row.team_slug)}">${escape(row.team)}</a>`
        : escape(row.team)
    }</td>
<td>${orNotListed(row.points?.toLocaleString("en-US"))}</td>
<td>${row.first_place_votes ? escape(row.first_place_votes) : "—"}</td></tr>`,
  )
  .join("")}
</tbody></table></div>`;

  const byConference = conferences
    .map(
      (conference) => `<div class="card">
<div class="name">${escape(conference.name)} <span class="pill">${escape(conference.short)}</span></div>
<div class="meta">${conference.team_count} teams</div>
<div class="meta" style="margin-top:8px;line-height:1.9">
${conference.teams
  .map((slug) => {
    const team = teams.find((entry) => entry.slug === slug);
    return `<a href="/browse/${escape(slug)}">${escape(team?.school ?? slug)}</a>`;
  })
  .join(" · ")}
</div></div>`,
    )
    .join("");

  const datasetRows = Object.entries(index.datasets)
    .map(
      ([name, info]) => `<tr><td><code>${escape(name)}</code></td>
<td>${escape(
        Object.entries(info.counts)
          .map(([key, value]) => `${key}: ${value.toLocaleString("en-US")}`)
          .join(", ") || "—",
      )}</td><td>${escape(info.artifacts)}</td></tr>`,
    )
    .join("");

  return shell(
    "2026 FBS dataset",
    `<header class="site">
<h1>CFB Apex — 2026 FBS dataset</h1>
<p class="sub">${escape(index.team_count)} programs · research current as of
${escape(index.meta.as_of ?? "n/a")} · schema ${escape(index.meta.schema_version)}</p>
</header>

<h2>Top 25</h2>
<div class="cols">${pollTable("AP Poll", ap)}${pollTable("Coaches Poll", coaches)}</div>

<h2>Conferences</h2>
<div class="grid">${byConference}</div>

<h2>What is in this build</h2>
<div class="scroll"><table>
<thead><tr><th>Dataset</th><th>Counts</th><th>Files</th></tr></thead>
<tbody>${datasetRows}</tbody></table></div>`,
  );
}

async function renderTeam(slug: string, client: CfbDataClient): Promise<Response> {
  const profile = await client.teamProfile(slug);
  if (!profile) {
    return shell("Unknown team", `<h1>No team <code>${escape(slug)}</code></h1>
<p class="sub"><a href="/">Back to the index</a></p>`);
  }

  const { team, roster, depth_chart, schedule, coaching, sos, poll, injuries } = profile;

  const rankPill = poll.ap
    ? `<span class="pill">AP #${escape(poll.ap.rank)}</span>`
    : "";

  const staff = coaching
    ? `<div class="scroll"><table><thead><tr><th>Role</th><th>Name</th></tr></thead><tbody>
${coaching.staff
  .map(
    (member) => `<tr><td>${escape(member.role_raw)}</td>
<td>${orNotListed(member.name)}${
      member.title_raw && member.title_raw !== member.name
        ? `<div class="meta" style="color:var(--muted);font-size:12px">${escape(member.title_raw)}</div>`
        : ""
    }</td></tr>`,
  )
  .join("")}
</tbody></table></div>
<h3>Schemes</h3>
<div class="card"><div class="name">Offense — ${orNotListed(coaching.schemes.offense.label)}</div>
<div class="meta">${orNotListed(coaching.schemes.offense.description)}</div></div>
<div class="card" style="margin-top:10px"><div class="name">Defense — ${orNotListed(
        coaching.schemes.defense.label,
      )}</div>
<div class="meta">${orNotListed(coaching.schemes.defense.description)}</div></div>`
    : '<p class="na">No coaching file for this team in the research package.</p>';

  const starters = depth_chart
    ? depth_chart.units
        .map(
          (unit) => `<h3>${escape(unit.unit.replace("_", " "))}${
            unit.scheme ? ` — ${escape(unit.scheme)}` : ""
          }</h3>
<div class="scroll"><table><thead><tr><th>Pos</th><th>Starter</th><th>Stars</th><th>Class</th>
<th>High school / hometown</th></tr></thead><tbody>
${unit.positions
  .map((position) => {
    const first = position.depth.find((slot) => slot.rank === 1);
    return (first?.players ?? [])
      .map(
        (player) => `<tr><td>${escape(position.position)}</td><td>${escape(player.name)}</td>
<td>${stars(player.stars)}</td><td>${orNotListed(player.class_raw ?? player.class)}</td>
<td>${orNotListed(
          [player.high_school, player.hometown].filter(Boolean).join(" / "),
        )}</td></tr>`,
      )
      .join("");
  })
  .join("")}
</tbody></table></div>`,
        )
        .join("")
    : '<p class="na">No depth chart for this team in the research package.</p>';

  const rosterTable = roster
    ? `<div class="scroll"><table><thead><tr><th>Player</th><th>Pos</th><th>Stars</th>
<th>Class</th><th>High school / hometown</th></tr></thead><tbody>
${roster.players
  .map(
    (player) => `<tr><td>${escape(player.name)}</td><td>${orNotListed(player.position)}</td>
<td>${stars(player.stars)}</td><td>${orNotListed(player.class_raw ?? player.class)}</td>
<td>${orNotListed(
      [player.high_school, player.hometown].filter(Boolean).join(" / "),
    )}</td></tr>`,
  )
  .join("")}
</tbody></table></div>`
    : `<p class="na">The research package has no roster file for this team
(${escape(team.conference)} rosters were out of its scope).</p>`;

  const scheduleTable = schedule
    ? `<div class="scroll"><table><thead><tr><th>Date</th><th>Opponent</th><th>Site</th>
<th>Type</th></tr></thead><tbody>
${schedule.games
  .map(
    (game) => `<tr><td>${escape(game.date ?? game.date_raw)}</td>
<td>${
      game.opponent_slug
        ? `<a href="/browse/${escape(game.opponent_slug)}">${escape(game.opponent)}</a>`
        : escape(game.opponent)
    }</td>
<td>${orNotListed(game.site ?? game.location)}</td><td>${orNotListed(game.type)}</td></tr>`,
  )
  .join("")}
</tbody></table></div>`
    : '<p class="na">No schedule for this team in the research package.</p>';

  const sosCard = sos
    ? `<div class="card"><div class="name">Strength of schedule</div>
<div class="meta">ESPN FPI SOS rank ${orNotListed(sos.espn_fpi_sos_rank)} ·
remaining ${orNotListed(sos.espn_fpi_rem_sos_rank)} ·
Phil Steele ${orNotListed(sos.phil_steele_rank)} ·
TeamRankings ${orNotListed(sos.teamrankings_rank)}</div></div>`
    : "";

  const injuryList =
    injuries && injuries.players.length
      ? `<h2>Availability report</h2>
<div class="scroll"><table><thead><tr><th>Player</th><th>Pos</th><th>Status</th>
<th>Note</th></tr></thead><tbody>
${injuries.players
  .map(
    (entry) => `<tr><td>${escape(entry.name)}</td><td>${orNotListed(entry.position)}</td>
<td>${orNotListed(entry.status_raw ?? entry.status)}</td>
<td>${orNotListed(entry.injury)}</td></tr>`,
  )
  .join("")}
</tbody></table></div>`
      : "";

  return shell(
    team.display_name,
    `<header class="site">
<h1>${escape(team.display_name)} ${rankPill}</h1>
<p class="sub">${escape(team.conference)}${
      team.division ? ` · ${escape(team.division)}` : ""
    }${team.football_only ? " · football-only member" : ""}${
      coaching?.head_coach.name ? ` · ${escape(coaching.head_coach.name)}` : ""
    }</p>
</header>
${sosCard}
<h2>Projected starters${
      depth_chart?.status ? ` <span class="pill">${escape(depth_chart.status)}</span>` : ""
    }</h2>
${depth_chart?.status_caveat ? `<p class="sub">${escape(depth_chart.status_caveat)}</p>` : ""}
${starters}
<h2>Coaching staff</h2>${staff}
<h2>Schedule</h2>${scheduleTable}
${injuryList}
<h2>Roster${roster ? ` <span class="pill">${roster.counts.players} players</span>` : ""}</h2>
${rosterTable}`,
    `<nav class="crumbs"><a href="/">All teams</a> › ${escape(team.school)}</nav>`,
  );
}
