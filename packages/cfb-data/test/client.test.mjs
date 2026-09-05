/**
 * Tests for the dataset reader, run against the real committed dataset.
 *
 * These are deliberately assertions about *data*, not just about code: the risk
 * this project is managing is a site that confidently renders wrong numbers, so
 * the tests check that real teams are present, that the fixture universe is
 * gone, and that gaps stay null instead of becoming zeros.
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";

import { CfbDataClient, FileDataSource, MemoryDataSource } from "../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const DIST = join(here, "..", "..", "..", "data", "dist");

const hasDataset = existsSync(join(DIST, "teams.json"));

describe("MemoryDataSource", () => {
  it("normalizes paths with and without the .json suffix", async () => {
    const source = new MemoryDataSource({ "teams.json": { meta: {}, teams: [] } });
    assert.ok(await source.read("teams"));
    assert.ok(await source.read("teams.json"));
    assert.ok(await source.read("/teams.json"));
  });

  it("returns null rather than throwing for a missing artifact", async () => {
    const source = new MemoryDataSource({});
    assert.equal(await source.read("nope"), null);
  });

  it("refuses to traverse outside the dataset", async () => {
    const source = new MemoryDataSource({});
    await assert.rejects(() => source.read("../../etc/passwd"));
  });
});

describe("CfbDataClient without a dataset", () => {
  it("throws a message that names the fix", async () => {
    const client = new CfbDataClient(new MemoryDataSource({}));
    await assert.rejects(() => client.teams(), /tools\/etl\/build\.py/);
  });
});

describe("the committed dataset", { skip: !hasDataset && "data/dist not built" }, () => {
  /** @type {CfbDataClient} */
  let client;

  before(() => {
    client = new CfbDataClient(new FileDataSource(DIST));
  });

  it("has all 138 FBS programs for 2026", async () => {
    const teams = await client.teams();
    assert.equal(teams.length, 138);
  });

  it("contains real programs, sorted by slug", async () => {
    const teams = await client.teams();
    const slugs = teams.map((team) => team.slug);
    assert.deepEqual(slugs, [...slugs].sort());
    for (const slug of ["ohio-state", "clemson", "texas-am", "miami-fl", "hawaii"]) {
      assert.ok(
        teams.some((team) => team.slug === slug),
        `expected ${slug} in the registry`,
      );
    }
  });

  it("contains no fixture-pack teams", async () => {
    const teams = await client.teams();
    const serialized = JSON.stringify(teams);
    for (const name of ["Red Mesa", "Blue Ridge State", "fixture-pack"]) {
      assert.ok(!serialized.includes(name), `fixture data leaked: ${name}`);
    }
  });

  it("groups every team into a conference that lists it back", async () => {
    const [teams, conferences] = await Promise.all([client.teams(), client.conferences()]);
    const total = conferences.reduce((sum, conference) => sum + conference.team_count, 0);
    assert.equal(total, teams.length);
    for (const team of teams) {
      const conference = conferences.find((entry) => entry.slug === team.conference_slug);
      assert.ok(conference, `${team.slug} has no conference entry`);
      assert.ok(
        conference.teams.includes(team.slug),
        `${conference.slug} does not list ${team.slug}`,
      );
    }
  });

  it("resolves a team by slug and by school name", async () => {
    assert.equal((await client.findTeam("clemson"))?.school, "Clemson");
    assert.equal((await client.findTeam("Ohio State"))?.slug, "ohio-state");
    assert.equal(await client.findTeam("Not A Real School"), null);
  });

  it("returns null, not a throw, for a team with no roster file", async () => {
    // The research package covers seven conferences; SEC rosters are absent and
    // that absence must surface honestly rather than as a crash or an empty lie.
    const roster = await client.roster("alabama");
    assert.equal(roster, null);
  });

  it("keeps unlisted recruiting stars as null rather than zero", async () => {
    const roster = await client.roster("clemson");
    if (!roster) return;
    const vizzina = roster.players.find((player) => player.name === "Christopher Vizzina");
    assert.ok(vizzina, "expected Christopher Vizzina on the Clemson roster");
    assert.equal(vizzina.stars, null, "unlisted stars must be null, never 0");
    assert.equal(vizzina.high_school, "Briarwood Christian");
    assert.equal(vizzina.class, "SR");

    const reynolds = roster.players.find((player) => player.name === "Tait Reynolds");
    assert.equal(reynolds?.stars, 3);
  });

  it("every artifact carries provenance", async () => {
    for (const path of ["teams", "conferences", "index"]) {
      const meta = await client.provenance(path);
      assert.ok(meta, `${path} has no meta block`);
      assert.ok(meta.sources.length > 0, `${path} names no sources`);
      assert.equal(meta.schema_version, "1.0.0");
    }
  });

  it("builds a team profile without throwing on absent datasets", async () => {
    const profile = await client.teamProfile("clemson");
    assert.ok(profile);
    assert.equal(profile.team.school, "Clemson");
    // Each of these may legitimately be null if its parser is not in the build;
    // what must not happen is a throw or a fabricated stand-in.
    for (const key of ["roster", "depth_chart", "schedule", "coaching"]) {
      assert.ok(key in profile);
    }
  });

  it("returns null for an unknown team rather than inventing one", async () => {
    assert.equal(await client.teamProfile("red-mesa"), null);
  });
});
