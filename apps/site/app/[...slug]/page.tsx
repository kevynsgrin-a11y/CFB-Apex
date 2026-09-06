import { notFound } from "next/navigation";
import { HubApp } from "@/components/HubApp";
import { coaches, dfsPlayers, games, portalEvents, stadiums, teams } from "@/lib/cfb-dataset";

const staticRoots = new Set([
  "scores",
  "schedule",
  "transfer-portal",
  "playoff-predictor",
  "coaches",
  "coaching-carousel",
  "dfs",
  "teams",
  "conferences",
  "stadiums",
  "watch",
  "rankings",
  "search",
  "newsletter",
  "methodology",
  "data-sources",
  "corrections",
  "about",
  "advertise",
  "partnerships",
  "media-kit",
  "privacy",
  "terms",
  "affiliate-disclosure",
  "responsible-gaming",
  "design-system",
]);

function isKnownPath(parts: string[]) {
  const [root, id] = parts;
  if (staticRoots.has(root)) {
    if (!id) return true;
    if (root === "teams" || root === "transfer-portal") return teams.some((team) => team.slug === id);
    if (root === "coaches") return coaches.some((coach) => coach.slug === id);
    if (root === "stadiums") return stadiums.some((stadium) => stadium.slug === id);
    if (root === "conferences") return teams.some((team) => team.conference.toLowerCase().replaceAll(" ", "-") === id);
    return false;
  }
  if (root === "games") return games.some((game) => game.id === id);
  if (root === "players") {
    return portalEvents.some((event) => event.playerSlug === id) || dfsPlayers.some((player) => player.slug === id);
  }
  return false;
}

export default async function RoutePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  if (!isKnownPath(slug)) notFound();
  return <HubApp path={`/${slug.join("/")}`} />;
}
