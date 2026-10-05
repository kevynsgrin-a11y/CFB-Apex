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
  assert.match(html, /GAME OF THE WEEK|MARQUEE MATCHUP/);
  assert.match(html, /138/);
  assert.match(html, /FBS programs/);
  assert.match(html, /Clean Mode/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("the reviewed Week 6 refresh renders current games and sourced metrics", async () => {
  const response = await fetchRoute("/");
  const html = (await response.text()).replace(/<!--[\s\S]*?-->/g, "");
  assert.match(html, /Georgia/);
  assert.match(html, /Alabama/);
  assert.match(html, /Week of Mon, Oct 5/);
  assert.match(html, /Season leaders/);
  assert.match(html, /1,851/);
  assert.doesNotMatch(html, /Rankings: AP preseason|reflect the AP preseason poll|Preseason · Points/);
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
    ["/scores", /Select scoreboard week/],
    ["/rankings", /AP and Coaches, straight from the release/],
    ["/transfer-portal", /Cole Adams/],
    ["/transfer-portal/alabama", /portal ledger/],
    ["/transfer-portal/alabama", /vanderbilt/i],
    ["/coaches/kalen-deboer", /\$12,500,000/],
    ["/coaches/kalen-deboer", /Buyout:/],
    ["/stadiums", /Bryant-Denny Stadium/],
    ["/stadiums", /138/],
    ["/stadiums/alabama", /Clear-bag policy/],
    ["/search", /Try Clemson, Dabo Swinney, or Arch Manning/],
    ["/games/2026-09-12-oklahoma-at-michigan", /FOX/],
    ["/games/2026-09-12-oklahoma-at-michigan", /12:00 PM ET/],
    ["/teams/alabama", /SP\+/],
    ["/teams/alabama", /23\.0/],
    ["/playoff-predictor", /You call the Saturdays/],
    ["/coaching-carousel", /Separate the contract/],
    ["/dfs", /Fantasy context, when you ask for it/],
    ["/injuries", /injury/i],
    ["/highlight", /Kamario Taylor/i],
    ["/upset-watch", /Upset Watch/i],
    ["/playoff-audit", /Road to the Playoff/i],
    ["/heisman", /Jeremiah Smith/i],
    ["/watch", /TicketNetwork/],
    ["/watch", /TicketSmarter/],
    ["/api/injuries", /source/],
    ["/injuries", /The injury report, on the record/],
    ["/injuries", /LONG-TERM LEDGER/],
    ["/injuries", /Research as of/],
    ["/injuries", /Heintschel/],
    ["/api/injuries", /"source": ?"ESPN college football injuries feed/],
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
    ["/players/arch-manning", /FANTASY NOTE/],
    ["/players/arch-manning", /Week 1 QB rank No\. 1/],
    ["/teams", /All 138 FBS programs/],
    ["/teams/clemson", /Clemson/],
    ["/teams/clemson", /Tigers/],
    ["/teams/clemson", /players listed|Availability/],
    ["/coaches/dabo-swinney", /Dabo Swinney/],
    ["/games/2026-08-29-hawaii-at-stanford", /Stanford/],
    ["/teams/alabama", /Availability|injur/i],
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

test("audit week 6: forbidden stale strings never ship; verified additions render", async () => {
  // The Oct 5 verification audit found these strings on production pages.
  // They must never come back; the checks run on visible text, not markup.
  const FORBIDDEN = [
    /Demonstration records/i,
    /fictional/i,
    /Pending 2026 season data/,
    /\b0\s+others receiving votes/i,
    /No change published/,
    /\bmiami fl\b/i,
    /Live standings from ESPN, refreshed on every build/,
    /refreshes live on every page load/,
  ];
  const pages = await Promise.all(
    [
      "/",
      "/rankings",
      "/injuries",
      "/data-sources",
      "/games/2026-10-10-georgia-at-alabama",
      "/scores",
    ].map(async (path) => {
      const response = await fetchRoute(path);
      assert.equal(response.status, 200, path);
      const html = await response.text();
      // Strip scripts, then tags (HTML comments included); React inserts
      // comment nodes between adjacent text segments, so collapse runs of
      // whitespace before pattern-matching visible copy.
      const text = html
        .replace(/<script[\s\S]*?<\/script>/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ");
      return [path, text];
    }),
  );
  for (const [path, text] of pages) {
    for (const pattern of FORBIDDEN) {
      assert.doesNotMatch(text, pattern, `${path} ships forbidden stale copy: ${pattern}`);
    }
  }

  // Verified additions from the same audit must render where promised.
  const byPath = new Map(pages);
  assert.match(byPath.get("/") ?? "", /College GameDay · Tuscaloosa · Sat Oct 10 · ESPN/);
  assert.match(byPath.get("/") ?? "", /WEEK 6 · OCT 6–10 · AS OF 2026-10-05/);
  assert.match(byPath.get("/") ?? "", /SNAPSHOT 07:24 UTC/);
  assert.match(byPath.get("/") ?? "", /POLLS RELEASED 2026-10-04/);
  assert.match(byPath.get("/") ?? "", /SP\+ CONTRAST · AS OF Sep 27/);
  assert.match(byPath.get("/") ?? "", /North Dakota State/);
  assert.match(byPath.get("/") ?? "", /Byes:[\s\S]*?Miami \(FL\)/);
  assert.match(byPath.get("/") ?? "", /Texas[\s\S]*?vs\.? Oklahoma|Oklahoma[\s\S]*?Cotton Bowl \(neutral site\)/);
  assert.match(byPath.get("/games/2026-10-10-georgia-at-alabama") ?? "", /College GameDay · Tuscaloosa · Sat Oct 10 · ESPN/);
  assert.match(byPath.get("/rankings") ?? "", /OTHERS RECEIVING VOTES[\s\S]*?Kentucky/);
  assert.match(byPath.get("/rankings") ?? "", /NEW/);
  assert.match(byPath.get("/rankings") ?? "", /Sun Belt/);
  assert.match(byPath.get("/rankings") ?? "", /dropped out/);
  // The Week 6 report shipped Oct 5: the staleness banner is gone and the
  // sourced desk (ledger + watch) renders instead of the collapsed table.
  assert.match(byPath.get("/injuries") ?? "", /Research as of 2026-10-05/); // collapsed-text match
  assert.match(byPath.get("/injuries") ?? "", /Heintschel/);
  assert.doesNotMatch(byPath.get("/injuries") ?? "", /report not yet published/);
  assert.match(byPath.get("/data-sources") ?? "", /VERIFIED SNAPSHOT/);
  assert.match(byPath.get("/data-sources") ?? "", /Open holds/);
});
