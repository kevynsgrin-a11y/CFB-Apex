import { isProductionLaunchReady } from "../lib/release-readiness";

const siteUrl = process.env.SITE_URL ?? "https://cfbapex.com";

/**
 * Serves /robots.txt.
 *
 * Crawling stays fully disallowed until every production launch gate in
 * lib/release-readiness.ts reports "ready". That set includes the LIVE_MODE gate
 * (DEMO_MODE === "false" && DISABLE_LIVE_PROVIDERS === "false"), so fixture data
 * can never be exposed to crawlers, plus the legal, marks, and data-rights
 * approvals.
 *
 * Going live is therefore a flag change, not a code change.
 */
export default function robots() {
	if (!isProductionLaunchReady(process.env)) {
		return {
			rules: {
				userAgent: "*",
				disallow: "/",
			},
		};
	}

	return {
		rules: {
			userAgent: "*",
			allow: "/",
			disallow: ["/admin", "/design-system", "/search"],
		},
		sitemap: `${siteUrl}/sitemap.xml`,
		host: siteUrl,
	};
}
