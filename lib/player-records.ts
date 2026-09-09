import { getRoster, teams } from "./cfb-dataset";

export interface RosterPlayerRecord {
  name: string;
  position: string | null;
  teamId: string;
  teamName: string;
}

export function playerSlugForName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z ]/g, "")
    .trim()
    .replaceAll(" ", "-");
}

let rosterPlayerIndex: Map<string, RosterPlayerRecord> | null = null;

function getRosterPlayerIndex() {
  if (rosterPlayerIndex) return rosterPlayerIndex;

  rosterPlayerIndex = new Map<string, RosterPlayerRecord>();
  for (const team of teams) {
    const roster = getRoster(team.slug);
    if (!roster) continue;

    for (const group of roster.position_groups) {
      for (const player of group.players) {
        const slug = playerSlugForName(player.name);
        if (rosterPlayerIndex.has(slug)) continue;
        rosterPlayerIndex.set(slug, {
          name: player.name,
          position: player.position,
          teamId: team.slug,
          teamName: team.name,
        });
      }
    }
  }

  return rosterPlayerIndex;
}

export function getRosterPlayerBySlug(slug: string) {
  return getRosterPlayerIndex().get(slug);
}
