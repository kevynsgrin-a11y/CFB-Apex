export const brand = {
  name: "CFB Apex",
  shortName: "CFB Apex",
  eyebrow: "Independent college football intelligence",
  tagline: "Every team. Every angle.",
  description:
    "College football, elevated. Scores, schedules, rankings, transfer portal moves, and gameday guides for all 138 FBS teams. Independent intelligence. Every Saturday.",
  supportEmail: "corrections@example.invalid",
} as const;

export const experienceModes = {
  clean: {
    label: "Clean Mode",
    description: "Scores, models, portal, coaching, and gameday tools without betting offers.",
  },
  analysis: {
    label: "Odds & DFS Mode",
    description:
      "Adds demonstration market context and fantasy projections after an age and jurisdiction disclosure.",
  },
} as const;

export const primaryNavigation = [
  { href: "/scores", label: "Scores" },
  { href: "/transfer-portal", label: "Portal" },
  { href: "/playoff-predictor", label: "Playoff" },
  { href: "/coaching-carousel", label: "Coaching" },
  { href: "/stadiums", label: "Gameday" },
] as const;

export const utilityNavigation = [
  { href: "/teams", label: "Teams" },
  { href: "/rankings", label: "Rankings" },
  { href: "/watch", label: "Watch" },
  { href: "/dfs", label: "DFS" },
  { href: "/methodology", label: "Methodology" },
  { href: "/data-sources", label: "Data sources" },
] as const;

export const environment = {
  dataMode: "dataset",
  isDemo: false,
  season: 2026,
  siteUrl: process.env.SITE_URL ?? "https://cfbapex.com",
} as const;

export const disclosureVersion = "2026-09-05";
