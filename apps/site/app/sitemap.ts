import type { MetadataRoute } from "next";
import { coaches, conferenceHubSlugs, teams } from "@/lib/cfb-dataset";

/**
 * Detail routes are enumerated from the vendored 2026 dataset (138 real FBS
 * programs, their head coaches, and their conferences) so the sitemap can
 * never claim a page the data cannot fill.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const teamRoutes: MetadataRoute.Sitemap = teams.map((team) => ({
    url: `/teams/${team.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));
  const coachRoutes: MetadataRoute.Sitemap = coaches.map((coach) => ({
    url: `/coaches/${coach.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.4,
  }));
  const conferenceRoutes: MetadataRoute.Sitemap = conferenceHubSlugs().map((slug) => ({
    url: `/conferences/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));
  return [...teamRoutes, ...coachRoutes, ...conferenceRoutes];
}
