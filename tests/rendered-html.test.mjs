import assert from "node:assert/strict";
import test from "node:test";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);

async function fetchRoute(path, init) {
  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html", ...(init?.headers ?? {}) },
      ...init,
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the finished home utility", async () => {
  const response = await fetchRoute("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/i);
  assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);

  const html = await response.text();
  assert.match(html, /Every Saturday/);
  assert.match(html, /2026 FBS dataset/);
  assert.match(html, /Clean Mode/);
  assert.match(html, /What do you need/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("www canonicalizes to the apex domain without losing the request target", async () => {
  const response = await worker.fetch(
    new Request("https://www.cfbapex.com/scores?week=1"),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://cfbapex.com/scores?week=1");
  assert.match(response.headers.get("strict-transport-security") ?? "", /includeSubDomains/);
});

test("critical product routes render dataset-backed content", async () => {
  const routes = [
    ["/scores", /The slate, without the scavenger hunt/],
    ["/transfer-portal", /Cole Adams/],
    ["/transfer-portal/alabama", /portal ledger/],
    ["/transfer-portal/alabama", /vanderbilt/i],
    ["/coaches/kalen-deboer", /\$12,500,000/],
    ["/coaches/kalen-deboer", /Buyout:/],
    ["/stadiums", /Bryant-Denny Stadium/],
    ["/stadiums/alabama", /Clear-bag policy/],
    ["/games/2026-09-12-oklahoma-at-michigan", /FOX/],
    ["/games/2026-09-12-oklahoma-at-michigan", /12:00 PM ET/],
    ["/teams/alabama", /SP\+/],
    ["/teams/alabama", /32\.7%/],
    ["/playoff-predictor", /You call the Saturdays/],
    ["/coaching-carousel", /Separate the contract/],
    ["/dfs", /Fantasy context, when you ask for it/],
    ["/watch", /televised games/],
    ["/watch", /WFFN/],
    ["/watch", /Crimson Tide Sports Network/],
    ["/", /hello@cfbapex\.com/],
    ["/", /privacy@cfbapex\.com/],
    ["/privacy", /privacy@cfbapex\.com/],
    ["/media-kit", /media@cfbapex\.com/],
    ["/corrections", /admin@cfbapex\.com/],
    ["/about", /socials@cfbapex\.com/],
    ["/watch", /Local radio/],
    ["/watch", /NO PARTNER BY DESIGN/],
    ["/players/arch-manning", /FANTASY NOTE/],
    ["/players/arch-manning", /Week 1 QB rank No\. 1/],
    ["/teams", /All 138 FBS programs/],
    ["/teams/clemson", /Clemson Tigers/],
    ["/teams/clemson", /players listed/],
    ["/coaches/dabo-swinney", /Dabo Swinney/],
    ["/games/2026-08-29-hawaii-at-stanford", /Stanford/],
    ["/teams/alabama", /Injury report/],
    ["/teams/alabama", /\/logos\/alabama\.png/],
    ["/teams/texas", /\/logos\/texas\.png/],
  ];

  for (const [path, pattern] of routes) {
    const response = await fetchRoute(path);
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), pattern, path);
  }
});

test("spoofed admin-identity headers never reach the app (NF-1)", async () => {
  const response = await fetchRoute("/admin", {
    headers: { "oai-authenticated-user-email": "operator@cfbapex.com" },
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  // The console must render its unauthenticated state — a spoofed identity
  // header can never authorize it.
  assert.ok(!/operator@cfbapex\.com/.test(html), "spoofed email leaked into the admin page");
});

test("health and readiness endpoints disclose dataset state", async () => {
  const health = await fetchRoute("/api/health", { headers: { accept: "application/json" } });
  assert.equal(health.status, 200);
  assert.equal((await health.json()).dataEnvironment, "dataset");

  const readiness = await fetchRoute("/api/readiness", { headers: { accept: "application/json" } });
  const data = await readiness.json();
  assert.equal(data.readyForPreview, true);
  assert.equal(data.readyForProductionLiveData, false);
  assert.match(readiness.headers.get("cache-control") ?? "", /no-store/i);
  assert.ok(data.productionGates.length >= 10);
  assert.ok(data.productionGates.some((gate) => gate.id === "LIVE_MODE" && gate.status === "blocked"));
});

test("simulation API rejects invalid scenario participants and caps work", async () => {
  // Any real scheduled game and one of its real participants.
  const board = await fetchRoute("/api/simulate", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ iterations: 100_000 }),
  });
  assert.equal(board.status, 200);
  assert.equal((await board.json()).iterations, 20_000);

  const invalid = await fetchRoute("/api/simulate", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ forced: { "scenario-1": "team-16" }, iterations: 100_000 }),
  });
  assert.equal(invalid.status, 400);

  const unknownTeam = await fetchRoute("/api/simulate", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ forced: { "scenario-1": "clemson" }, iterations: 100_000 }),
  });
  assert.equal(unknownTeam.status, 400);
});
