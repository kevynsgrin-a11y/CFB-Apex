const siteUrl = process.env.SITE_URL ?? "https://cfbapex.com";

/**
 * Routes that exist as real, static destinations today.
 *
 * Deliberately excluded:
 *   /admin          — authenticated operations console
 *   /design-system  — internal design reference
 *   /newsletter     — no real subscriber flow is configured yet
 *   /search         — query-parameter surface, not a canonical destination
 *
 * Dynamic detail routes (/teams/:slug, /games/:id, /coaches/:slug,
 * /stadiums/:slug, /conferences/:slug, /players/:slug) are intentionally NOT
 * enumerated while the data layer is fixture-backed. Add them here once
 * real, licensed entities exist — the fixture universe is fictional and must
 * never be submitted for discovery.
 */
const staticRoutes = [
	"",
	"/scores",
	"/schedule",
	"/transfer-portal",
	"/playoff-predictor",
	"/coaching-carousel",
	"/coaches",
	"/teams",
	"/conferences",
	"/stadiums",
	"/rankings",
	"/watch",
	"/dfs",
	"/methodology",
	"/data-sources",
	"/corrections",
	"/about",
	"/privacy",
	"/terms",
	"/affiliate-disclosure",
	"/responsible-gaming",
];

const DAILY = new Set(["", "/scores", "/schedule", "/rankings", "/transfer-portal"]);

/**
 * Serves /sitemap.xml.
 *
 * This is populated unconditionally, which is safe: /robots.txt only advertises
 * the sitemap once the site is launch-ready, and every response still carries
 * X-Robots-Tag: noindex until then. Populating it now allows the sitemap to be
 * validated in Search Console ahead of launch.
 */
export default function sitemap() {
	const lastModified = new Date().toISOString();

	return staticRoutes.map((path) => ({
		url: `${siteUrl}${path}`,
		lastModified,
		changeFrequency: DAILY.has(path) ? ("daily" as const) : ("weekly" as const),
		priority: path === "" ? 1 : 0.7,
	}));
}
