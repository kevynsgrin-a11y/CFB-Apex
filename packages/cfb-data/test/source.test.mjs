/**
 * Path normalization and transport tests for the four dataset sources.
 *
 * `normalize` is the one place a caller-supplied path becomes a filename, a URL
 * or a cache key, so every source inherits its rules. These check the spellings
 * that must address a single artifact (`teams`, `/teams.json`, `//teams//`), the
 * two outcomes callers must be able to tell apart — a missing artifact is
 * `null`, never a throw and never a fabricated empty object — and the rule that
 * a path may not leave the dataset.
 *
 * Two of the rules matter more than the rest for this project. A malformed
 * artifact must surface as a parse error rather than as "this team has no
 * roster", because the UI renders a gap as "Not listed" and would then state a
 * falsehood. And a server error must not be reported as a missing dataset.
 *
 * Nothing here touches the network: the HTTP and asset sources are driven with
 * an injected `fetch` and a fake Workers asset binding, and the disk source
 * works inside a temporary directory.
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";

import {
  AssetsDataSource,
  FileDataSource,
  HttpDataSource,
  MemoryDataSource,
} from "../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const DIST = join(here, "..", "..", "..", "data", "dist");
const skip = !existsSync(join(DIST, "teams.json")) && "data/dist not built";

/** A `fetch` double that records its URLs and replays scripted responses. */
function fakeFetch(responses) {
  const calls = [];
  const impl = async (url) => {
    calls.push(url);
    const next = responses.shift();
    if (!next) throw new Error(`unexpected fetch: ${url}`);
    return next();
  };
  impl.calls = calls;
  return impl;
}

const json = (body, status = 200) => () => new Response(JSON.stringify(body), { status });

describe("MemoryDataSource", () => {
  it("addresses one artifact through every spelling of its path", async () => {
    // Keyed without the suffix, as the client writes its paths.
    const source = new MemoryDataSource({
      "rosters/clemson": { meta: { dataset: "rosters" } },
    });
    const expected = { meta: { dataset: "rosters" } };
    assert.deepEqual(await source.read("rosters/clemson"), expected);
    assert.deepEqual(await source.read("rosters/clemson.json"), expected);
    assert.deepEqual(await source.read("/rosters/clemson.json"), expected);
  });

  it("collapses repeated separators in the path it is given", async () => {
    const source = new MemoryDataSource({ "stats/2025/team": { teams: [] } });
    assert.deepEqual(await source.read("//stats//2025//team.json"), { teams: [] });
  });

  it("returns null for an artifact it does not hold", async () => {
    const source = new MemoryDataSource({});
    assert.equal(await source.read("rosters/alabama"), null);
    assert.equal(await source.has("rosters/alabama"), false);
  });

  it("reports a held artifact through has()", async () => {
    const source = new MemoryDataSource({ teams: [] });
    assert.equal(await source.has("teams"), true);
    assert.equal(await source.has("teams.json"), true);
  });

  it("refuses to read or probe outside the dataset", async () => {
    const source = new MemoryDataSource({});
    await assert.rejects(() => source.read("../../etc/passwd"), /refusing to traverse/);
    await assert.rejects(() => source.read("rosters/../secrets"), /refusing to traverse/);
    await assert.rejects(() => source.has("../.."), /refusing to traverse/);
  });
});

describe("FileDataSource", () => {
  /** @type {string} */
  let root;

  before(async () => {
    root = await mkdtemp(join(tmpdir(), "cfb-apex-source-"));
    await writeFile(
      join(root, "teams.json"),
      JSON.stringify({ meta: { dataset: "teams" }, teams: [{ slug: "clemson" }] }),
    );
    await writeFile(join(root, "broken.json"), "{ this is not json");
  });

  after(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("reads an artifact with or without the .json suffix", async () => {
    const source = new FileDataSource(root);
    const teams = await source.read("teams");
    assert.equal(teams.teams[0].slug, "clemson");
    assert.deepEqual(await source.read("teams.json"), await source.read("/teams.json"));
  });

  it("answers has() without parsing the artifact", async () => {
    const source = new FileDataSource(root);
    assert.equal(await source.has("teams"), true);
    assert.equal(await source.has("rosters/alabama"), false);
  });

  it("returns null for a team the dataset does not carry", async () => {
    const source = new FileDataSource(root);
    assert.equal(await source.read("rosters/alabama"), null);
  });

  it("throws on a malformed artifact instead of calling it missing", async () => {
    // A truncated or corrupt file is a build problem, not a data gap; the site
    // renders a null as "Not listed", so it must never come from a parse error.
    const source = new FileDataSource(root);
    await assert.rejects(() => source.read("broken"), SyntaxError);
  });

  it("refuses to read outside the dataset directory", async () => {
    const source = new FileDataSource(root);
    await assert.rejects(() => source.read("../../../package.json"), /refusing to traverse/);
  });

  it("fails has() closed for a path it refuses to read", async () => {
    // has() answers a yes/no question, so a refused path is "no" rather than an
    // error — the check must not become a way to probe outside the dataset.
    const source = new FileDataSource(root);
    assert.equal(await source.has("../../../package.json"), false);
  });

  it("caches a parsed artifact, so a second read is not re-parsed", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cfb-apex-cache-"));
    try {
      const file = join(dir, "cached.json");
      await writeFile(file, JSON.stringify({ version: 1 }));
      const source = new FileDataSource(dir);
      assert.equal((await source.read("cached")).version, 1);

      // Rewrite on disk: a cached source must keep serving what it read first.
      await writeFile(file, JSON.stringify({ version: 2 }));
      assert.equal((await source.read("cached")).version, 1);
      assert.equal((await new FileDataSource(dir).read("cached")).version, 2);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("caches a miss, so an artifact written later is still not served", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cfb-apex-miss-"));
    try {
      const source = new FileDataSource(dir);
      assert.equal(await source.read("later"), null);
      await writeFile(join(dir, "later.json"), JSON.stringify({ later: true }));
      assert.equal(await source.read("later"), null);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("FileDataSource against the committed dataset", { skip }, () => {
  it("reads the real registry the site builds from", async () => {
    const source = new FileDataSource(DIST);
    const file = await source.read("teams");
    assert.equal(file.teams.length, 138);
    assert.equal(await source.has("teams"), true);
  });

  it("returns null for an artifact the build never produced", async () => {
    const source = new FileDataSource(DIST);
    assert.equal(await source.read("rosters/not-a-real-school"), null);
  });
});

describe("HttpDataSource", () => {
  it("requests the normalized artifact under the base URL", async () => {
    const fetchImpl = fakeFetch([json({ teams: [] })]);
    const source = new HttpDataSource("https://data.example.com/v1///", fetchImpl);
    await source.read("teams");
    assert.deepEqual(fetchImpl.calls, ["https://data.example.com/v1/teams.json"]);
  });

  it("returns null for a 404 and reuses it", async () => {
    const fetchImpl = fakeFetch([() => new Response("", { status: 404 })]);
    const source = new HttpDataSource("https://data.example.com/v1", fetchImpl);
    assert.equal(await source.read("rosters/alabama"), null);
    assert.equal(await source.read("rosters/alabama"), null);
    assert.equal(fetchImpl.calls.length, 1, "a 404 must be cached like any other read");
    assert.equal(await source.has("rosters/alabama"), false);
  });

  it("throws on a server error rather than reporting the dataset as missing", async () => {
    const fetchImpl = fakeFetch([() => new Response("boom", { status: 500 })]);
    const source = new HttpDataSource("https://data.example.com/v1", fetchImpl);
    await assert.rejects(
      () => source.read("teams"),
      /dataset fetch failed: teams\.json -> HTTP 500/,
    );
  });

  it("caches a successful read so the API is asked once", async () => {
    const fetchImpl = fakeFetch([json({ teams: [{ slug: "clemson" }] })]);
    const source = new HttpDataSource("https://data.example.com/v1", fetchImpl);
    const first = await source.read("teams.json");
    const second = await source.read("/teams");
    assert.equal(fetchImpl.calls.length, 1);
    assert.equal(first, second, "the same parsed value is served from cache");
  });

  it("refuses to read outside the dataset", async () => {
    const source = new HttpDataSource("https://data.example.com/v1", fakeFetch([]));
    await assert.rejects(() => source.read("../../etc/passwd"), /refusing to traverse/);
  });
});

describe("AssetsDataSource", () => {
  it("rebases the artifact onto the incoming origin and prefix", async () => {
    // A Workers asset binding only answers absolute URLs, so the path handed to
    // `client.read("teams")` has to be rebuilt against the request origin.
    const calls = [];
    const assets = {
      fetch: async (request) => {
        calls.push(request.url);
        return new Response(JSON.stringify({ teams: [] }), { status: 200 });
      },
    };
    const source = new AssetsDataSource(assets, "https://cfb-apex.com///", "/v1/");
    await source.read("teams");
    assert.deepEqual(calls, ["https://cfb-apex.com/v1/teams.json"]);
  });

  it("returns null when the binding cannot serve the artifact", async () => {
    const assets = { fetch: async () => new Response("not found", { status: 404 }) };
    const source = new AssetsDataSource(assets, "https://cfb-apex.com");
    assert.equal(await source.read("rosters/alabama"), null);
    assert.equal(await source.has("rosters/alabama"), false);
  });

  it("caches the parsed artifact", async () => {
    let calls = 0;
    const assets = {
      fetch: async () => {
        calls += 1;
        return new Response(JSON.stringify({ teams: [] }), { status: 200 });
      },
    };
    const source = new AssetsDataSource(assets, "https://cfb-apex.com");
    await source.read("teams");
    await source.read("teams.json");
    assert.equal(calls, 1);
  });

  it("refuses to read outside the dataset", async () => {
    const assets = { fetch: async () => new Response("{}", { status: 200 }) };
    const source = new AssetsDataSource(assets, "https://cfb-apex.com");
    await assert.rejects(() => source.read("../../etc/passwd"), /refusing to traverse/);
  });
});
