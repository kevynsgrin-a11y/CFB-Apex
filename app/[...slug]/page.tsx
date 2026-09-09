import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HubApp } from "@/components/HubApp";
import { coaches, fantasyNotes, games, getConferenceHub, portalEvents, stadiums, teams } from "@/lib/cfb-dataset";
import { getRosterPlayerBySlug, playerSlugForName } from "@/lib/player-records";

const staticRoots = new Set([
  "scores",
  "schedule",
  "transfer-portal",
  "playoff-predictor",
  "playoff-bracket",
  "no-names",
  "heisman",
  "nil",
  "panel",
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
    if (root === "conferences") return getConferenceHub(id) != null;
    return false;
  }
  if (root === "games") return games.some((game) => game.id === id);
  if (root === "players") {
    return (
      portalEvents.some((event) => event.playerSlug === id) ||
      fantasyNotes.some((note) => playerSlugForName(note.player) === id) ||
      Boolean(getRosterPlayerBySlug(id))
    );
  }
  return false;
}

interface RoutePageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({
  params,
}: RoutePageProps): Promise<Metadata> {
  const { slug } = await params;
  const [root, detail] = slug;
  if (root === "stadiums") {
    const stadium = detail ? stadiums.find((candidate) => candidate.slug === detail) : undefined;
    const team = stadium ? teams.find((candidate) => candidate.id === stadium.teamId) : undefined;
    return {
      title: stadium ? `${stadium.name} Gameday Guide` : "College Football Stadium Gameday Guides",
      description: stadium
        ? `Parking, transit, bag policy, tailgating, visitor seating, and accessibility guidance for ${stadium.name}, home of ${team?.name ?? "its FBS program"}.`
        : "Verified gameday guides for all 138 FBS stadiums, including parking, transit, bag policy, tailgating, visitor seating, and accessibility.",
    };
  }
  if (root === "players" && detail) {
    const portal = portalEvents.find((event) => event.playerSlug === detail);
    const fantasy = fantasyNotes.find((note) => playerSlugForName(note.player) === detail);
    const roster = getRosterPlayerBySlug(detail);
    const playerName = portal?.player ?? fantasy?.player ?? roster?.name ?? detail.replaceAll("-", " ");
    const position = portal?.position ?? fantasy?.position ?? roster?.position ?? "College football player";
    const teamId = portal?.toTeamId ?? fantasy?.team ?? roster?.teamId ?? portal?.fromTeamId;
    const team = teams.find((candidate) => candidate.id === teamId);
    return {
      title: `${playerName} — ${position} Player Record`,
      description: `${playerName} player record${team ? ` for ${team.name}` : ""}, including verified portal movement or fantasy analysis when published.`,
    };
  }
  if (root === "search") {
    return {
      title: "Search Teams, Coaches, and Players",
      description: "Search CFB Apex across all 138 FBS programs, head coaches, and rostered players.",
    };
  }
  if (root === "watch") {
    return {
      title: "Where to Watch College Football",
      description:
        "Find weekly college football TV windows, verified local radio flagships, and official team ticket destinations.",
    };
  }
  if (root === "transfer-portal") {
    const team = detail ? teams.find((candidate) => candidate.slug === detail) : null;
    return {
      title: team ? `${team.shortName} Transfer Portal Ledger` : "College Football Transfer Portal Board",
      description: team
        ? `Verified incoming and outgoing transfer movement for ${team.name}.`
        : "Track verified college football transfers by player, position, program, status, date, and source confidence.",
    };
  }
  if (root === "dfs") {
    return {
      title: "College Fantasy Notes Board",
      description:
        "Published college fantasy roles, usage notes, availability, and analyst ranks with source context.",
    };
  }
  if (root === "coaching-carousel" || root === "coaches") {
    const coach = detail ? coaches.find((candidate) => candidate.slug === detail) : null;
    return {
      title: coach ? `${coach.name} Contract Ledger` : "College Football Coaching Ledger",
      description:
        "Compare verified college football coaching contracts, source notes, and explainable buyout estimates.",
    };
  }
  return {};
}

export default async function RoutePage({ params }: RoutePageProps) {
  const { slug } = await params;
  if (!isKnownPath(slug)) notFound();
  return <HubApp path={`/${slug.join("/")}`} />;
}
