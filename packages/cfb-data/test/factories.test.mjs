/**
 * Tests for the client factories in `index.ts`.
 *
 * The package is consumed two ways — a bundled site build that reads off disk,
 * and an edge Worker that reads over HTTP or a static-asset binding — and both
 * go through a factory here. A factory that quietly built the wrong source would
 * send every page in the build to the network (or, worse, serve a bundle with
 * no data at all), so each one is checked against the source it is documented
 * to construct, and the `DataSource` contract every caller relies on is checked
 * once for all four implementations.
 *
 * The HTTP factory is driven with an injected `fetch`, so nothing here reaches
 * the network.
 */

import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

import {
  AssetsDataSource,
  CfbDataClient,
  FileDataSource,
  HttpDataSource,
  MemoryDataSource,
  createClient,
  createFileClient,
  createHttpClient,
  createMemoryClient,
} from "../dist/index.js";

const REGISTRY = {
  meta: { dataset: "teams", schema_version: "1.0.0", sources: ["test fixture"] },
  teams: [
    {
      slug: "clemson",
      school: "Clemson",
      nickname: "Tigers",
      display_name: "Clemson Tigers",
      conference: "Atlantic Coast Conference",
      conference_slug: "acc",
      conference_short: "ACC",
      division: null,
      football_only: false,
    },
  ],
};

describe("createMemoryClient", () => {
  it("reads an already-loaded dataset through the normal API", async () => {
    const cfb = createMemoryClient({ "teams.json": REGISTRY });
    assert.ok(cfb instanceof CfbDataClient);
    assert.deepEqual(await cfb.teams(), REGISTRY.teams);
    assert.equal((await cfb.teamProfile("clemson")).team.school, "Clemson");
  });

  it("accepts keys with and without the .json suffix", async () => {
    const cfb = createMemoryClient({ teams: REGISTRY });
    assert.equal((await cfb.team("clemson"))?.school, "Clemson");
  });
});

describe("createFileClient", () => {
  /** @type {string} */
  let root;

  before(async () => {
    root = await mkdtemp(join(tmpdir(), "cfb-apex-factory-"));
    await writeFile(join(root, "teams.json"), JSON.stringify(REGISTRY));
  });

  after(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("reads the dataset from a directory on disk", async () => {
    const cfb = createFileClient(root);
    assert.ok(cfb instanceof CfbDataClient);
    assert.ok(cfb.source instanceof FileDataSource);
    assert.equal(cfb.source.root, root);
    assert.equal((await cfb.team("clemson"))?.school, "Clemson");
  });

  it("reports an unbuilt dataset instead of an empty one", async () => {
    await assert.rejects(() => createFileClient(join(root, "missing")).teams(), /build\.py/);
  });
});

describe("createHttpClient", () => {
  it("reads through the fetch implementation it is given", async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(url);
      return new Response(JSON.stringify(REGISTRY), { status: 200 });
    };
    const cfb = createHttpClient("https://data.example.com/v1", fetchImpl);
    assert.ok(cfb instanceof CfbDataClient);
    assert.ok(cfb.source instanceof HttpDataSource);
    assert.equal((await cfb.team("clemson"))?.school, "Clemson");
    assert.deepEqual(calls, ["https://data.example.com/v1/teams.json"]);
  });

  it("returns null for an artifact the deployed API does not serve", async () => {
    const cfb = createHttpClient("https://data.example.com/v1", async () => {
      return new Response("", { status: 404 });
    });
    assert.equal(await cfb.roster("alabama"), null);
  });
});

describe("createClient", () => {
  it("uses the source it is handed, whatever its transport", async () => {
    const source = new MemoryDataSource({ "teams.json": REGISTRY });
    const cfb = createClient(source);
    assert.ok(cfb instanceof CfbDataClient);
    assert.equal(cfb.source, source, "the caller's own source is used");
    assert.equal((await cfb.team("clemson"))?.school, "Clemson");
  });
});

describe("the DataSource contract", () => {
  const notFound = () => new Response("", { status: 404 });
  const sources = [
    new MemoryDataSource({ "teams.json": REGISTRY }),
    new FileDataSource(join(tmpdir(), "cfb-apex-does-not-exist")),
    new HttpDataSource("https://data.example.com/v1", notFound),
    new AssetsDataSource({ fetch: notFound }, "https://cfb-apex.com"),
  ];

  it("gives every transport read and has", async () => {
    for (const source of sources) {
      const name = source.constructor.name;
      assert.equal(typeof source.read, "function", `${name}.read`);
      assert.equal(typeof source.has, "function", `${name}.has`);
    }
  });

  it("answers a missing artifact with null from every transport", async () => {
    for (const source of sources) {
      const name = source.constructor.name;
      assert.equal(await source.read("rosters/alabama"), null, `${name} read`);
      assert.equal(await source.has("rosters/alabama"), false, `${name} has`);
    }
  });
});
