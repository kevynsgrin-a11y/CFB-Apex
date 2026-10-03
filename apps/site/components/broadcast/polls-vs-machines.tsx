import { LaneHeading, TeamMark } from "./primitives";
import type { BroadcastTeam } from "@/lib/homepage";
import type { PollTable, PreseasonRating } from "@/lib/cfb-dataset";

/**
 * Polls vs Machines: the AP/Coaches No. 1 against the SP+/FPI No. 1.
 * Every number comes from the dataset (polls/latest.json + ratings file);
 * nothing is computed or invented here beyond "who is No. 1".
 */
export function PollsVsMachines({
  pollTables,
  preseasonRatings,
  teams,
}: {
  pollTables: readonly PollTable[];
  preseasonRatings: Readonly<Record<string, PreseasonRating>>;
  teams: readonly BroadcastTeam[];
}) {
  const bySlug = new Map(teams.map((team) => [team.slug, team]));
  const ap = pollTables.find((table) => table.poll === "ap");
  const coaches = pollTables.find((table) => table.poll === "coaches");
  const pollTop = ap?.rankings.find((entry) => entry.rank === 1);
  const coachesTop = coaches?.rankings.find((entry) => entry.rank === 1);
  const spTop = Object.entries(preseasonRatings)
    .filter(([, rating]) => rating?.sp?.rank === 1)
    .map(([slug]) => slug)[0];
  const fpiTop = Object.entries(preseasonRatings)
    .filter(([, rating]) => rating?.fpi?.rank === 1)
    .map(([slug]) => slug)[0];
  if (!pollTop || !spTop) return null;

  const pollTeam = bySlug.get(pollTop.team_slug ?? "");
  const machineTeam = bySlug.get(spTop);
  const pollSlug = pollTop.team_slug ?? "";
  const machinesAgree = spTop === fpiTop;
  const pollSp = preseasonRatings[pollSlug]?.sp;
  const pollFpi = preseasonRatings[pollSlug]?.fpi;

  const Side = ({
    side,
    team,
    eyebrow,
    lines,
  }: {
    side: "polls" | "machines";
    team?: BroadcastTeam;
    eyebrow: string;
    lines: (string | null)[];
  }) => (
    <div className="apex-gdc-pvm-side" data-side={side}>
      <span className="apex-gdc-pvm-eyebrow">{eyebrow}</span>
      {team ? <TeamMark team={team} size="sm" /> : null}
      <strong className="apex-gdc-pvm-team">{team?.shortName ?? "Not published"}</strong>
      <ul>
        {lines.filter((line): line is string => Boolean(line)).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );

  return (
    <section className="apex-lane" aria-labelledby="gdc-pvm-title">
      <LaneHeading
        id="gdc-pvm-title"
        eyebrow="THE DISAGREEMENT"
        title="Polls vs machines"
        href="/rankings"
        linkLabel="All ratings"
      />
      <div className="apex-gdc-pvm">
        <Side
          side="polls"
          team={pollTeam}
          eyebrow="THE POLLS · NO. 1"
          lines={[
            `AP No. 1 · ${pollTop.points != null ? `${pollTop.points.toLocaleString("en-US")} pts` : "points not published"}`,
            coachesTop
              ? `Coaches No. 1${coachesTop.points != null ? ` · ${coachesTop.points.toLocaleString("en-US")} pts` : ""}`
              : null,
            pollTop.record ? `Record ${pollTop.record}` : null,
          ]}
        />
        <div className="apex-gdc-pvm-vs" aria-hidden="true">
          SP+
        </div>
        <Side
          side="machines"
          team={machineTeam}
          eyebrow={machinesAgree ? "THE MACHINES · NO. 1" : "SP+ NO. 1"}
          lines={[
            preseasonRatings[spTop]?.sp
              ? `SP+ No. 1 · ${preseasonRatings[spTop].sp!.overall > 0 ? "+" : ""}${preseasonRatings[spTop].sp!.overall.toFixed(1)}`
              : null,
            fpiTop && machinesAgree ? "FPI No. 1 as well" : fpiTop ? `FPI No. 1: ${bySlug.get(fpiTop)?.shortName ?? fpiTop}` : null,
            pollSp ? `The polls' No. 1 sits No. ${pollSp.rank} in SP+` : null,
            pollFpi ? `and No. ${pollFpi.rank} in FPI` : null,
          ]}
        />
      </div>
      <p className="apex-data-note">
        The polls and the computers disagree at the top. SP+ &amp; FPI after Week 4 ·
        AP/Coaches polls released Sept 27.
      </p>
    </section>
  );
}
