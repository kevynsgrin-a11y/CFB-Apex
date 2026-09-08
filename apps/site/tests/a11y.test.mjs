import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [component, header, css, scoreboardCss] = await Promise.all([
  readFile(new URL("../components/HubApp.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/broadcast/header.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  readFile(new URL("../app/scoreboard.css", import.meta.url), "utf8"),
]);
const styles = `${css}\n${scoreboardCss}`;

test("global shell includes accessibility foundations", () => {
  assert.match(header, /className="skip-link"/);
  assert.match(component, /<main id="main-content">/);
  assert.match(component, /aria-modal="true"/);
  assert.match(component, /<section className="data-table-wrap" tabIndex=\{0\} aria-label="Scrollable portal movement table"/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /forced-colors/);
});

test("visual metrics have accessible names or text equivalents", () => {
  assert.match(component, /role="img"/);
  assert.match(component, /aria-label=\{`/);
  assert.match(component, /Floor <strong>/);
  assert.match(component, /Playoff <strong>/);
});
