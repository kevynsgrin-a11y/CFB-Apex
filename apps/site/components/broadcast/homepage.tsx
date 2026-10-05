"use client";

import { featuredGame, weekGames, type HomepageData } from "@/lib/homepage";
import { broadcastEventForGame, refreshStorylines, verifiedRefresh } from "@/lib/cfb-dataset";
import { MarqueeGame } from "./marquee-game";
import { WeekScoreboard } from "./week-scoreboard";
import { SaturdayBoard } from "./saturday-board";
import { LaneHeading } from "./primitives";
import { FinalsStrip } from "./finals-strip";
import { PollsVsMachines } from "./polls-vs-machines";
import { CurrentMetricsLane } from "./current-metrics";
import {
  FantasyLane,
  GamedayLane,
  PortalLane,
  PreseasonLane,
  RankingsLane,
} from "./intelligence-lanes";

export function BroadcastHomepage({
  data,
  cleanMode,
  onModeRequest,
}: {
  data: HomepageData;
  cleanMode: boolean;
  onModeRequest: () => void;
}) {
  const slate = weekGames(data.games, data.referenceDate);
  const storylines = refreshStorylines;
  const featured = featuredGame(slate, data.teams);
  const away = data.teams.find((team) => team.slug === featured?.awayTeamId);
  const home = data.teams.find((team) => team.slug === featured?.homeTeamId);
  const stadium =
    data.stadiums.find((venue) => venue.teamId === home?.slug) ??
    data.stadiums[0];
  const stadiumTeam = data.teams.find((team) => team.slug === stadium?.teamId);

  return (
    <div className="apex-home apex-container">
      <div className="apex-home-intro">
        <div>
          <h1 className="font-display text-balance">
            Every team. <span>Every angle.</span>
          </h1>
          <p>Your front-row seat to all {data.teams.length} FBS programs.</p>
        </div>
        <div className="apex-season-label">
          <span aria-hidden="true" />
          {data.referenceDate.slice(0, 4)}
          <span className="apex-season-word"> SEASON</span>
        </div>
      </div>
      {featured && away && home ? (
        <MarqueeGame
          game={featured}
          away={away}
          home={home}
          venue={
            data.stadiums.find((venue) => venue.teamId === home.slug)?.name
          }
          gameday={broadcastEventForGame(featured)}
        />
      ) : (
        <section className="apex-marquee">
          <p className="apex-empty">
            This week&apos;s marquee matchup is not published.
          </p>
        </section>
      )}
      <SaturdayBoard
        games={slate}
        teams={data.teams}
        pollTables={data.pollTables}
      />
      {storylines.length > 0 ? (
        <section className="apex-lane" aria-labelledby="storyline-title">
          <LaneHeading
            id="storyline-title"
            eyebrow="THE WEEK'S STORY"
            title="Worth a callout"
            href="/scores"
            linkLabel="Full slate"
          />
          {storylines.map((story) => {
            const row = verifiedRefresh?.scheduledGames.find((g) => g.provider_id === story.game_provider_id);
            const gameId = row ? `${row.date}-${row.away}-at-${row.home}` : null;
            return (
              <article className="apex-storyline" key={story.id}>
                <h3>{story.headline}</h3>
                <p>{story.body}</p>
                <p className="apex-data-note">
                  {gameId ? (
                    <a href={`/games/${gameId}`}>On the board this week</a>
                  ) : null}
                  {story.sources[0] ? (
                    <>
                      {" · "}
                      <a href={story.sources[0]} target="_blank" rel="noopener noreferrer">
                        Source
                      </a>
                    </>
                  ) : null}
                </p>
              </article>
            );
          })}
        </section>
      ) : null}
      <WeekScoreboard
        games={slate}
        teams={data.teams}
        referenceDate={data.referenceDate}
      />
      <FinalsStrip referenceDate={data.referenceDate} />
      <div className="apex-intelligence-grid">
        <RankingsLane pollTables={data.pollTables} teams={data.teams} />
        <PortalLane
          portalCounts={data.portalCounts}
          teams={data.teams}
          portalAsOf={data.portalAsOf}
        />
      </div>
      <PollsVsMachines
        pollTables={data.pollTables}
        preseasonRatings={data.preseasonRatings}
        teams={data.teams}
      />
      {data.metrics ? <CurrentMetricsLane metrics={data.metrics} /> : null}
      <FantasyLane
        fantasyNotes={data.fantasyNotes}
        teams={data.teams}
        fantasyAsOf={data.fantasyAsOf}
        cleanMode={cleanMode}
        onModeRequest={onModeRequest}
      />
      <PreseasonLane
        preseasonRatings={data.preseasonRatings}
        teams={data.teams}
      />
      <GamedayLane stadium={stadium} team={stadiumTeam} />
      <p className="apex-data-note">
        Independent college football intelligence · Scoreboard snapshot{" "}
        {data.datasetAsOf} · Retrieved {data.verifiedAt ?? "Not published"} · Module source dates shown separately ·{" "}
        <a href="/data-sources" className="underline underline-offset-4">
          Sources & data status
        </a>
      </p>
    </div>
  );
}
