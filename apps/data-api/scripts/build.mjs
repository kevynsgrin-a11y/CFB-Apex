#!/usr/bin/env node
/**
 * Stage the committed dataset into the Worker's asset directory.
 *
 * `public/` is generated and git-ignored: the dataset has exactly one home,
 * `data/dist`, and copying rather than symlinking keeps `wrangler deploy`
 * working the same locally and in CI.
 */

import { cp, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, "..");
const repoRoot = join(appRoot, "..", "..");
const dist = join(repoRoot, "data", "dist");
const target = join(appRoot, "public", "v1");

/** Cloudflare rejects an asset over 25 MiB; warn well before that. */
const LARGE_FILE_BYTES = 20 * 1024 * 1024;
const MAX_ASSETS = 20000;

async function walk(directory) {
  const out = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full)));
    } else {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  try {
    await stat(dist);
  } catch {
    console.error(
      `No dataset at ${relative(repoRoot, dist)}.\n` +
        "Run: python3 tools/etl/build.py",
    );
    process.exit(1);
  }

  await rm(join(appRoot, "public"), { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await cp(dist, target, { recursive: true });

  const files = await walk(target);
  let bytes = 0;
  const oversized = [];
  for (const file of files) {
    const info = await stat(file);
    bytes += info.size;
    if (info.size > LARGE_FILE_BYTES) {
      oversized.push(`${relative(target, file)} (${(info.size / 1048576).toFixed(1)} MiB)`);
    }
  }

  // A tiny redirect page keeps `/` useful even if the Worker is bypassed.
  await writeFile(
    join(appRoot, "public", "_headers"),
    "/v1/*\n  Access-Control-Allow-Origin: *\n  Cache-Control: public, max-age=300\n",
    "utf8",
  );

  console.log(
    `Staged ${files.length} artifact(s), ${(bytes / 1048576).toFixed(2)} MiB ` +
      `into ${relative(repoRoot, target)}`,
  );

  if (oversized.length) {
    console.error("Assets over 20 MiB (Cloudflare's limit is 25 MiB):");
    for (const entry of oversized) console.error(`  ${entry}`);
    process.exit(1);
  }
  if (files.length > MAX_ASSETS) {
    console.error(`${files.length} assets exceeds the ${MAX_ASSETS} limit.`);
    process.exit(1);
  }
}

await main();
