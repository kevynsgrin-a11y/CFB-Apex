import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [layout, robots, sitemap, config] = await Promise.all([
  readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/robots.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
  readFile(new URL("../lib/config.ts", import.meta.url), "utf8"),
]);

test("indexing is gated by the Worker, not by page metadata", () => {
  // The Worker enforces X-Robots-Tag: noindex until every launch gate is
  // ready; page metadata itself must allow indexing for that flip to work.
  assert.match(layout, /index:\s*true/);
  assert.match(layout, /follow:\s*true/);
  // The build-time robots.txt disallows everything as the pre-launch default;
  // the Worker serves the real rules once launch-ready.
  assert.match(robots, /disallow:\s*"\/"/);
  // The sitemap enumerates real dataset routes, never a fixture universe.
  assert.match(sitemap, /teams\.map/);
  assert.doesNotMatch(sitemap, /return \[\]/);
});

test("metadata is centralized on the brand", () => {
  assert.match(layout, /brand\.name/);
  assert.match(layout, /brand\.description/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview/);
  assert.match(config, /name:\s*"CFB Apex"/);
  assert.match(config, /https:\/\/cfbapex\.com/);
});
