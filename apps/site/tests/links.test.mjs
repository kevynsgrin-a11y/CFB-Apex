import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [component, scoreboard, footer, config] = await Promise.all([
  readFile(new URL("../components/HubApp.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/broadcast/scoreboard-page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/broadcast/footer.tsx", import.meta.url), "utf8"),
  readFile(new URL("../lib/config.ts", import.meta.url), "utf8"),
]);
const source = `${component}\n${scoreboard}\n${footer}\n${config}`;
const required = [
  "/scores",
  "/schedule",
  "/transfer-portal",
  "/playoff-predictor",
  "/coaching-carousel",
  "/dfs",
  "/stadiums",
  "/watch",
  "/methodology",
  "/data-sources",
  "/corrections",
  "/newsletter",
  "/advertise",
  "/partnerships",
  "/privacy",
  "/terms",
  "/affiliate-disclosure",
  "/responsible-gaming",
];

test("all required route families are linked or handled by the product shell", () => {
  for (const route of required) {
    const escapedRoute = route.replaceAll("/", "\\/");
    const segment = route.slice(1);
    assert.match(source, new RegExp(`(?:${escapedRoute}|root === "${segment}")`));
  }
});

test("no javascript or placeholder hrefs are used", () => {
  assert.doesNotMatch(component, /href=["'](?:#["']|javascript:)/i);
});
