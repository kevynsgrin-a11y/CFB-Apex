/**
 * Identity and lookup tests for `CfbDataClient`.
 *
 * The registry and the poll tables are the two places the client resolves a
 * name a page happens to carry — a URL segment, a search box, a card link — into
 * a team. Everything downstream (a team page, a matchup) is only as trustworthy
 * as that resolution, so the behaviour pinned here is deliberately conservative:
 * a query that does not match cleanly returns `null` rather than a plausible
 * wrong team, and a genuine tie stays a tie instead of being ordered apart.
 *
 * Fixtures are hand-built and small so each expected value below can be checked
 * by eye; the committed dataset itself is covered in `client.test.mjs` and
 * `datasets.test.mjs`.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CfbDataClient, MemoryDataSource } from "../dist/index.js";

/** A `DataSource` that records every path the client asks for. */
function countingSource(entries) {
  const inner = new MemoryDataSource(entries);
  const calls = [];
  return {
    calls,
    read: async (path) => {
      calls.push(path);
      return inner.read(path);
    },
    has: (path) => inner.has(path),
  };
}

const team = (slug, school, displayName, conferenceSlug) => ({
  slug,
  school,
  nickname: null,
  display_name: displayName,
  conference: conferenceSlug,
  conference_slug: conferenceSlug,
  conference_short: "ACC",
  division: null,
  football_only: false,
});

const REGISTRY = {
  "teams.json": {
    meta: { dataset: "teams", schema_version: "1.0.0", sources: ["test fixture"] },
    teams: [
    team("clemson", "Clemson", "Clemson", "acc"),
    team("ohio-state", "Ohio State", "Ohio State Buckeyes", "big-ten"),
    team("miami-fl", "Miami (FL)", "Miami Hurricanes", "acc"),
    team("notre-dame", "Notre Dame", "Notre Dame Fighting Irish", "independents"),
    ],
  },
};

const POLLS = {
  polls: [
    {
      poll: "ap",
      name: "AP",
      release_date: "2026-08-30",
      voters: 69,
      panel: null,
      points_system: null,
      next_release: null,
      rankings: [
        { rank: 1, rank_raw: "1", tied: false, team: "Ohio State", team_slug: "ohio-state", record: null, points: 1672, first_place_votes: 40, previous_rank: null },
        { rank: 2, rank_raw: "2", tied: true, team: "BYU", team_slug: "byu", record: null, points: 1510, first_place_votes: null, previous_rank: 3 },
        { rank: 2, rank_raw: "T-2", tied: true, team: "USC", team_slug: "usc", record: null, points: 1510, first_place_votes: null, previous_rank: 2 },
        { rank: 4, rank_raw: "4", tied: false, team: "Miami (FL)", team_slug: "miami-fl", record: null, points: 1442, first_place_votes: 2, previous_rank: 5 },
      ],
      others_receiving_votes: [
        { team: "Boston College", team_slug: "boston-college", points: 88 },
      ],
      sources: [],
    },
    {
      poll: "coaches",
      name: "Coaches",
      release_date: "2026-08-30",
      voters: 62,
      panel: null,
      points_system: null,
      next_release: null,
      rankings: [
        { rank: 1, rank_raw: "1", tied: false, team: "Ohio State", team_slug: "ohio-state", record: null, points: 1620, first_place_votes: 38, previous_rank: null },
        { rank: 2, rank_raw: "2", tied: false, team: "Clemson", team_slug: "clemson", record: null, points: 1501, first_place_votes: 0, previous_rank: 2 },
      ],
      others_receiving_votes: [],
      sources: [],
    },
  ],
};

/** A depth chart exercising every case `starters()` has to decide about. */
const DEPTH_CHART = {
  units: [
    {
      unit: "offense",
      scheme: "Air Raid",
      positions: [
        {
          position: "QB",
          depth: [
            {
              rank: 1,
              co_listed: true,
              players: [
                { name: "Christopher Vizzina", stars: 5 },
                { name: "Tait Reynolds", stars: null },
              ],
            },
            { rank: 2, co_listed: false, players: [{ name: "Trent Pearman", stars: 4 }] },
          ],
        },
        // No slot claims rank 1: the source never named a starter, so this
        // position contributes nothing rather than promoting the No. 2.
        { position: "WR", depth: [{ rank: 2, co_listed: false, players: [{ name: "Wide Two", stars: 3 }] }] },
        // An unpublished position: an empty depth list is a gap, not a throw.
        { position: "TE", depth: [] },
      ],
    },
    {
      unit: "defense",
      scheme: "4-2-5",
      positions: [
        {
          position: "CB",
          depth: [
            { rank: 1, co_listed: false, players: [{ name: "Naeem Burroughs", stars: null }] },
          ],
        },
      ],
    },
  ],
};

const client = (entries) => new CfbDataClient(new MemoryDataSource(entries));

describe("team resolution", () => {
  const cfb = client(REGISTRY);

  it("resolves a slug, a school name and a display name", async () => {
    assert.equal((await cfb.findTeam("ohio-state"))?.slug, "ohio-state");
    assert.equal((await cfb.findTeam("Ohio State"))?.slug, "ohio-state");
    assert.equal((await cfb.findTeam("Miami (FL)"))?.slug, "miami-fl");
    assert.equal((await cfb.findTeam("Notre Dame Fighting Irish"))?.slug, "notre-dame");
  });

  it("ignores surrounding whitespace and case in a school name", async () => {
    assert.equal((await cfb.findTeam("  CLEMSON \n"))?.slug, "clemson");
  });

  it("returns null rather than guessing at a near miss", async () => {
    // A partial name that matched loosely would send a reader to the wrong
    // team's page, which is worse than a not-found page.
    assert.equal(await cfb.findTeam("Clems"), null);
    assert.equal(await cfb.findTeam("Ohio St"), null);
    assert.equal(await cfb.findTeam("Ohio State Buckeye"), null);
  });

  it("returns null for a blank query without touching the registry", async () => {
    const source = countingSource(REGISTRY);
    const bare = new CfbDataClient(source);
    assert.equal(await bare.findTeam(""), null);
    assert.equal(await bare.findTeam("   "), null);
    assert.deepEqual(source.calls, [], "a blank query must not read the registry");
  });

  it("matches a slug only exactly, unlike findTeam", async () => {
    assert.equal((await cfb.team("clemson"))?.school, "Clemson");
    assert.equal(await cfb.team("Clemson"), null, "team() is the strict slug lookup");
    assert.equal(await cfb.team("not-a-team"), null);
  });

  it("groups teams by conference and reports an unknown conference as empty", async () => {
    const acc = await cfb.teamsByConference("acc");
    assert.deepEqual(acc.map((row) => row.slug), ["clemson", "miami-fl"]);
    assert.deepEqual(await cfb.teamsByConference("big-12"), []);
  });
});

describe("registry reads", () => {
  it("reads the registry once and reuses it", async () => {
    const source = countingSource(REGISTRY);
    const cfb = new CfbDataClient(source);

    const first = await cfb.teams();
    const second = await cfb.teams();
    await cfb.findTeam("clemson");

    assert.deepEqual(source.calls, ["teams"], "the registry is cached per client");
    assert.equal(first, second, "the same parsed array is served from cache");
  });

  it("names the build command when the registry is absent", async () => {
    const cfb = client({});
    await assert.rejects(() => cfb.teams(), /tools\/etl\/build\.py/);
    await assert.rejects(() => cfb.index(), /dataset artifact missing: index/);
  });
});

describe("starters", () => {
  it("flattens rank-1 slots across every unit, expanding co-listed starters", async () => {
    const starters = await client({ "depth-charts/clemson": DEPTH_CHART }).starters("clemson");
    assert.deepEqual(starters, [
      { unit: "offense", position: "QB", name: "Christopher Vizzina", stars: 5 },
      { unit: "offense", position: "QB", name: "Tait Reynolds", stars: null },
      { unit: "defense", position: "CB", name: "Naeem Burroughs", stars: null },
    ]);
  });

  it("never promotes a deeper slot into the starter list", async () => {
    const starters = await client({ "depth-charts/clemson": DEPTH_CHART }).starters("clemson");
    const names = starters.map((row) => row.name);
    assert.ok(!names.includes("Trent Pearman"), "the No. 2 QB is not a starter");
    assert.ok(!names.includes("Wide Two"), "a position with no rank 1 has no starter");
  });

  it("returns an empty list for a team with no chart at all", async () => {
    assert.deepEqual(await client({}).starters("alabama"), []);
  });

  it("returns an empty list for a chart with no units", async () => {
    assert.deepEqual(await client({ "depth-charts/clemson": { units: [] } }).starters("clemson"), []);
  });
});

describe("poll lookups", () => {
  const cfb = client({ "polls/latest": POLLS });

  it("defaults to the AP poll and returns the requested poll otherwise", async () => {
    assert.equal((await cfb.poll("ap"))?.name, "AP");
    assert.deepEqual((await cfb.top25()).map((row) => row.team_slug), [
      "ohio-state",
      "byu",
      "usc",
      "miami-fl",
    ]);
    assert.deepEqual(
      (await cfb.top25("coaches")).map((row) => row.team_slug),
      ["ohio-state", "clemson"],
    );
  });

  it("returns null for a poll the dataset does not carry", async () => {
    assert.equal(await cfb.poll("playoff"), null);
  });

  it("keeps a tie as one shared rank in both polls", async () => {
    const ranks = await cfb.ranksFor("byu");
    assert.equal(ranks.ap.rank, 2);
    assert.equal(ranks.ap.tied, true);
    assert.equal(ranks.coaches, null, "BYU is absent from the coaches fixture");
  });

  it("returns the same rank for both halves of a tie", async () => {
    const byu = await cfb.ranksFor("byu");
    const usc = await cfb.ranksFor("usc");
    assert.equal(byu.ap.rank, usc.ap.rank);
    assert.equal(byu.ap.points, usc.ap.points);
  });

  it("reports an unranked team as null in both polls", async () => {
    assert.deepEqual(await cfb.ranksFor("notre-dame"), { ap: null, coaches: null });
  });

  it("reports a missing poll file as no rankings rather than a throw", async () => {
    const empty = client({});
    assert.equal(await empty.poll("ap"), null);
    assert.deepEqual(await empty.top25(), []);
    assert.deepEqual(await empty.ranksFor("clemson"), { ap: null, coaches: null });
  });
});
