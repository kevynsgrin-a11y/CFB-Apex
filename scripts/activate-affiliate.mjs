/**
 * Activates affiliate tracking from a single pasted link.
 *
 * Ticket partners:
 *   node scripts/activate-affiliate.mjs ticketnetwork "<link>"
 *   node scripts/activate-affiliate.mjs ticketsmarter "<link>"
 *
 * Travel partners (hotels/flights/cars, lib/travel-affiliates.ts):
 *   node scripts/activate-affiliate.mjs travel <partner-id> --tracked "<template with {url}>"
 *   node scripts/activate-affiliate.mjs travel <partner-id> --dest "<template with {query}>"
 *
 * --tracked sets the network click wrapper; --dest sets a direct public
 * destination (link-first, untracked). Both flip every placement surface on
 * at the next deploy.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);

function extractUrl(text) {
  const match = text.match(/https?:\/\/[^\s"'<>]+/);
  if (!match) throw new Error("No URL found in the pasted text.");
  return new URL(match[0]);
}

// ---- travel mode ----
if (args[0] === "travel") {
  const partnerId = args[1];
  const flag = args[2]; // --tracked | --dest
  const pasted = args.slice(3).join(" ");
  if (!partnerId || !flag || !pasted) {
    console.error('Usage: activate-affiliate.mjs travel <partner-id> --tracked "<url with {url}>" | --dest "<url with {query}>"');
    process.exit(1);
  }
  const target = join(root, "lib", "travel-affiliates.ts");
  let source = readFileSync(target, "utf8");
  const idIndex = source.indexOf(`id: "${partnerId}",`);
  if (idIndex === -1) {
    console.error(`Partner ${partnerId} not found in lib/travel-affiliates.ts`);
    process.exit(1);
  }
  const blockEnd = source.indexOf("},", idIndex);
  const block = source.slice(idIndex, blockEnd);
  const template = pasted.trim().replace(/^["']|["']$/g, "");
  if (flag === "--tracked") {
    if (!template.includes("{url}") || !/^https?:\/\//.test(template)) {
      console.error("--tracked expects a full template like https://host/c/123?url={url}");
      process.exit(1);
    }
    const updated = block.includes("trackedUrl: null,")
      ? block.replace("trackedUrl: null,", `trackedUrl: ${JSON.stringify(template)},`)
      : block.replace(/trackedUrl: "[^"]*",/, `trackedUrl: ${JSON.stringify(template)},`);
    source = source.slice(0, idIndex) + updated + source.slice(blockEnd);
    writeFileSync(target, source, "utf8");
    console.log(`Activated ${partnerId} tracking: ${template}`);
  } else if (flag === "--dest") {
    if (!/^https?:\/\//.test(template)) {
      console.error("--dest expects a URL template");
      process.exit(1);
    }
    const updated = block.includes("destTemplate: null,")
      ? block.replace("destTemplate: null,", `destTemplate: ${JSON.stringify(template)},`)
      : block.replace(/destTemplate: "[^"]*",/, `destTemplate: ${JSON.stringify(template)},`);
    source = source.slice(0, idIndex) + updated + source.slice(blockEnd);
    writeFileSync(target, source, "utf8");
    console.log(`Activated ${partnerId} destination: ${template}`);
  } else {
    console.error("Flag must be --tracked or --dest");
    process.exit(1);
  }
  console.log("Then: npm run build && npx wrangler deploy --config wrangler.deploy.jsonc");
  process.exit(0);
}

// ---- ticket mode ----
const ALLOWED_PARTNERS = new Set(["ticketnetwork", "ticketsmarter"]);
const [partnerArg, pastedArg] = args;
if (!ALLOWED_PARTNERS.has(partnerArg ?? "")) {
  console.error(`Partner must be one of: ${[...ALLOWED_PARTNERS].join(", ")}`);
  process.exit(1);
}
if (!pastedArg) {
  console.error("Pass the tracking link (or full ad tag) as the second argument.");
  process.exit(1);
}

let url;
try {
  url = extractUrl(pastedArg);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

let param = "url";
for (const candidate of ["url", "u", "destination"]) {
  if (url.searchParams.has(candidate)) {
    param = candidate;
    break;
  }
}
url.searchParams.delete(param);
url.searchParams.delete("cjevent");
url.searchParams.delete("utm_source");
url.searchParams.delete("utm_medium");
url.searchParams.delete("utm_campaign");

const template = `${url.origin}${url.pathname}?${param}={url}`;

const destHost = partnerArg === "ticketnetwork" ? "ticketnetwork.com" : "ticketsmarter.com";
if (url.hostname === `www.${destHost}` || url.hostname === destHost) {
  console.error("That looks like the partner's storefront URL, not a tracking link. Copy the link from the network's Ads & Links tab instead.");
  process.exit(1);
}

const target = join(root, "lib", "affiliates.ts");
let source = readFileSync(target, "utf8");
const idPattern = `id: "${partnerArg}",`;
const idIndex = source.indexOf(idPattern);
if (idIndex === -1) {
  console.error(`Partner ${partnerArg} not found in lib/affiliates.ts`);
  process.exit(1);
}
const blockEnd = source.indexOf("},", idIndex);
const block = source.slice(idIndex, blockEnd);
if (!block.includes("trackedUrl: null,")) {
  console.error(`${partnerArg} already has a trackedUrl — edit lib/affiliates.ts manually to change it.`);
  process.exit(1);
}
const updatedBlock = block.replace("trackedUrl: null,", `trackedUrl: ${JSON.stringify(template)},`);
source = source.slice(0, idIndex) + updatedBlock + source.slice(blockEnd);
writeFileSync(target, source, "utf8");

console.log(`Activated ${partnerArg} tracking:`);
console.log(`  template: ${template}`);
console.log("");
console.log("Verify before shipping (should 30x to the partner):");
console.log(`  curl -sI "${template.replace("{url}", encodeURIComponent(`https://www.${destHost}/search?q=Alabama`))}" | grep -i "^location"`);
console.log("");
console.log("Then: npm run build && npx wrangler deploy --config wrangler.deploy.jsonc");
