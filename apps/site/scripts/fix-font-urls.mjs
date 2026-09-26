import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// vinext 0.0.50 self-hosts Google Fonts by writing @font-face rules that point
// at the local cache (<root>/.vinext/fonts), then rewrites that prefix to the
// served /assets/_vinext_fonts URL. On Windows the rewrite never matches: the
// CSS holds forward-slash paths (C:/Users/...) while the cache dir it searches
// for is backslashed. The unrewritten local path then ships in every page and
// browsers cannot load the fonts. Fixed upstream only in vinext 1.0 betas, so
// apply the same rewrite here and fail the build if a local path survives.

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const SERVED = "/assets/_vinext_fonts";
const LOCAL_CACHE = /[A-Za-z]:\/[^"'`()\n\\]*?\/\.vinext\/fonts/g;
const TEXT_FILE = /\.(?:m?js|css|html|json)$/;

async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (TEXT_FILE.test(entry.name)) yield path;
  }
}

let rewritten = 0;
const leftovers = [];
for await (const file of files(dist)) {
  const text = await readFile(file, "utf8");
  if (!text.includes(".vinext/fonts")) continue;
  const fixed = text.replace(LOCAL_CACHE, SERVED);
  if (fixed !== text) {
    await writeFile(file, fixed);
    rewritten += 1;
  }
  if (fixed.includes(".vinext/fonts")) leftovers.push(file);
}

if (leftovers.length > 0) {
  throw new Error(`Local font cache paths remain in the build: ${leftovers.join(", ")}`);
}
console.log(`Font URLs: PASS (${rewritten} file(s) rewritten to ${SERVED})`);
