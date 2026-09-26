import type { MetadataRoute } from "next";
import { coaches, conferenceHubSlugs, teams } from "@/lib/cfb-dataset";
import { environment } from "@/lib/config";
import { SITEMAP_EXCLUDED_ROOTS, STATIC_ROOTS } from "@/lib/static-roots";

/**
 * Detail routes are enumerated from the vendored 2026 dataset (138 real FBS
 * programs, their head coaches, and their conferences) so the sitemap can
 * never claim a page the data cannot fill.
 *
 * Every url must be ABSOLUTE: Next emits MetadataRoute.Sitemap entries
 * verbatim (metadataBase does not apply to the sitemap endpoint), and until
 * 2026-09-19 all 290 entries were bare paths — invalid per the sitemap spec,
 * which Search Console reported as ~289 errors.
 *
 * The homepage and every top-level route come from lib/static-roots (the same
 * list app/[...slug] serves), minus the roots excluded there.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const origin = environment.siteUrl.replace(/\/$/, "");
  const teamRoutes: MetadataRoute.Sitemap = teams.map((team) => ({
    url: `${origin}/teams/${team.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));
  const coachRoutes: MetadataRoute.Sitemap = coaches.map((coach) => ({
    url: `${origin}/coaches/${coach.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.4,
  }));
  const conferenceRoutes: MetadataRoute.Sitemap = conferenceHubSlugs().map((slug) => ({
    url: `${origin}/conferences/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));
  const homeRoute: MetadataRoute.Sitemap = [
    { url: `${origin}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
  ];
  const rootRoutes: MetadataRoute.Sitemap = STATIC_ROOTS.filter((root) => !SITEMAP_EXCLUDED_ROOTS.has(root)).map((root) => ({
    url: `${origin}/${root}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));
  return [...homeRoute, ...rootRoutes, ...teamRoutes, ...coachRoutes, ...conferenceRoutes];
}
