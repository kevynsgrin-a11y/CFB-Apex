#!/usr/bin/env node
/**
 * Post-deploy smoke test.
 *
 * Checks that the API answers, that it is serving REAL data, and — the point of
 * this whole change — that none of the fixture universe survived.
 *
 *   SMOKE_BASE_URL=https://cfb-apex-data.<subdomain>.workers.dev node scripts/smoke.mjs
 *
 * With no base URL it exits 0 and says so, rather than failing a deploy that
 * simply has not been given a hostname yet.
 */

const base = (process.env.SMOKE_BASE_URL ?? "").replace(/\/+$/, "");

if (!base) {
  console.log("SMOKE_BASE_URL not set — skipping smoke test.");
  console.log("Set the DATA_API_BASE_URL repository variable to enable it.");
  process.exit(0);
}

/** Team names from the fixture pack this dataset replaces. */
const FIXTURE_NAMES = ["Red Mesa", "Blue Ridge State", "fixture-pack"];

let failures = 0;

function check(name, condition, detail = "") {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function get(path) {
  const response = await fetch(`${base}${path}`, {
    headers: { accept: "application/json" },
  });
  return { response, body: response.ok ? await response.json() : null };
}

console.log(`Smoke-testing ${base}`);

const { response: health, body: healthBody } = await get("/api/health");
check("/api/health responds 200", health.status === 200, `got ${health.status}`);
check(
  "health reports the full FBS registry",
  healthBody?.teams === 138,
  `teams=${healthBody?.teams}`,
);

const { response: teamsResponse, body: teams } = await get("/api/teams");
check("/api/teams responds 200", teamsResponse.status === 200);
check("teams list is populated", (teams?.teams?.length ?? 0) === 138);

const serialized = JSON.stringify(teams ?? {});
for (const name of FIXTURE_NAMES) {
  check(
    `no fixture data: ${name}`,
    !serialized.includes(name),
    "the fixture universe is still being served",
  );
}

check(
  "teams are real programs",
  Boolean(teams?.teams?.some((team) => team.slug === "ohio-state")) &&
    Boolean(teams?.teams?.some((team) => team.slug === "clemson")),
);

const { response: rankings, body: rankingsBody } = await get("/api/rankings");
if (rankings.status === 200) {
  const ap = rankingsBody?.polls?.find((poll) => poll.poll === "ap");
  check("AP Top 25 has 25 or more rows", (ap?.rankings?.length ?? 0) >= 25);
  check(
    "AP rankings resolve to real teams",
    Boolean(ap?.rankings?.every((row) => row.team_slug)),
  );
} else {
  console.log("  skip /api/rankings (not present in this build)");
}

const { response: raw } = await get("/v1/teams.json");
check("raw artifacts are served", raw.status === 200, `got ${raw.status}`);

const cors = raw.headers.get("access-control-allow-origin");
check("CORS header present on raw artifacts", Boolean(cors), `got ${cors}`);

const home = await fetch(base);
check("browse page renders", home.status === 200, `got ${home.status}`);
const html = await home.text();
check("browse page shows real conferences", html.includes("Southeastern Conference"));

if (failures) {
  console.error(`\n${failures} smoke check(s) failed.`);
  process.exit(1);
}
console.log("\nAll smoke checks passed.");
