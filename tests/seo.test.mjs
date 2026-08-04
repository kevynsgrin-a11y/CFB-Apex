import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [layout, robots, sitemap, config] = await Promise.all([
  readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/robots.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
  readFile(new URL("../lib/config.ts", import.meta.url), "utf8"),
]);

test("fixture preview is globally noindexed", () => {
  assert.match(layout, /index:\s*false/);
  assert.match(layout, /follow:\s*false/);
  assert.match(robots, /disallow:\s*"\/"/);
  assert.match(sitemap, /return \[\]/);
});

test("metadata is centralized on the brand", () => {
  assert.match(layout, /brand\.name/);
  assert.match(layout, /brand\.description/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview/);
  assert.match(config, /name:\s*"CFB Apex"/);
  assert.match(config, /https:\/\/cfbapex\.com/);
});
