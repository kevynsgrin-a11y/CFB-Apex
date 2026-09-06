/**
 * Re-downloads every team logo listed in scripts/logo-sources.json from the
 * ESPN CDN and verifies each local file is byte-identical to the source.
 *
 * The map is the provenance record: every slug was matched to its ESPN team by
 * exact school+nickname (plus a small alias table for display-name variants)
 * and visually cross-checked. Only run with the map updated deliberately.
 *
 * Usage: node scripts/refresh-logos.mjs [--force]
 *   --force  overwrite local files that differ from the CDN (e.g. after ESPN
 *            updates a mark); without it, a diff is reported and nothing is
 *            changed.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const force = process.argv.includes("--force");
const sources = JSON.parse(readFileSync(join(root, "scripts/logo-sources.json"), "utf8"));

let ok = 0;
let missing = 0;
let differing = 0;
for (const [slug, entry] of Object.entries(sources)) {
  if (slug === "#") continue;
  const dest = join(root, "public/logos", `${slug}.png`);
  const local = existsSync(dest) ? readFileSync(dest) : null;
  const fresh = Buffer.from(await (await fetch(entry.url)).arrayBuffer());
  if (!fresh.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) {
    console.error(`${slug}: CDN response is not a PNG — skipping`);
    continue;
  }
  const same =
    local !== null &&
    createHash("sha256").update(local).digest("hex") ===
      createHash("sha256").update(fresh).digest("hex");
  if (local === null) {
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, fresh);
    missing += 1;
    console.log(`${slug}: downloaded (was missing)`);
  } else if (!same) {
    if (force) {
      writeFileSync(dest, fresh);
      differing += 1;
      console.log(`${slug}: updated (--force)`);
    } else {
      differing += 1;
      console.log(`${slug}: DIFFERS from CDN (rerun with --force to update)`);
    }
  } else {
    ok += 1;
  }
}

console.log(`\n${ok} identical, ${missing} downloaded, ${differing} ${force ? "updated" : "differing"}.`);
if (differing > 0 && !force) process.exitCode = 1;
