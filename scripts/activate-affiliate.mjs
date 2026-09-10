/**
 * Activates affiliate tracking for a ticket partner from a single pasted
 * Impact (or CJ) link. Run from the repo that should carry the tracking
 * (CFB Hub and DukeFantasy each need one run).
 *
 * Usage:
 *   node scripts/activate-affiliate.mjs ticketnetwork "<pasted link>"
 *
 * The pasted link can be any of:
 *   - A full Impact ad tag:  <a href="https://example.pxf.io/c/12345?url=https%3A%2F%2F...">...</a>
 *   - A bare tracking URL:   https://example.pxf.io/c/12345?url=https%3A%2F%2Fwww.ticketnetwork.com%2F...
 *   - A base without destination: https://example.pxf.io/c/12345  (destination param defaults to ?url=)
 *
 * The script validates the link, normalizes it into the {url} template
 * lib/affiliates.ts expects, rewrites trackedUrl in place, and prints the
 * verification step. It never prints or stores any secret — tracking URLs
 * are public destination links.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));

const ALLOWED_PARTNERS = new Set(["ticketnetwork", "ticketsmarter"]);

const [partnerArg, pastedArg] = process.argv.slice(2);
if (!ALLOWED_PARTNERS.has(partnerArg ?? "")) {
  console.error(`Partner must be one of: ${[...ALLOWED_PARTNERS].join(", ")}`);
  process.exit(1);
}
if (!pastedArg) {
  console.error("Pass the tracking link (or full ad tag) as the second argument.");
  process.exit(1);
}

// Pull the first https URL out of whatever was pasted (handles full ad tags).
const match = pastedArg.match(/https?:\/\/[^\s"'<>]+/);
if (!match) {
  console.error("No URL found in the pasted text.");
  process.exit(1);
}
let url;
try {
  url = new URL(match[0]);
} catch {
  console.error("The pasted URL is malformed.");
  process.exit(1);
}

// Detect the destination parameter the campaign uses (url= is Impact's
// common form; u= and destination= also appear). Default to url=.
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

// Sanity: tracking hosts are short-hostname redirects (pxf.io, brand hosts),
// never the partner's own storefront.
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
if (!block.includes("trackedUrl: null")) {
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
console.log(`  curl -sI "${template.replace("{url}", encodeURIComponent(`https://www.${destHost}/en/search?q=Alabama`))}" | grep -i "^location"`);
console.log("");
console.log("Then: npm run build && npx wrangler deploy --config wrangler.deploy.jsonc");
console.log("(The pill on /watch flips to PARTNER ACTIVE automatically once built.)");
