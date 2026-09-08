"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import type { Game, Team } from "@/lib/types";
import {
  appointmentGames,
  continuousWeeks,
  defaultScoreboardWeek,
  filterScoreboardGames,
  gamesForWeek,
  groupGamesByDate,
  scoreboardDateLabel,
  scoreboardFilters,
  type ScoreboardFilter,
} from "@/lib/scoreboard";
import { BroadcastGameCard } from "./game-card";

export interface ScoreboardPageProps {
  games: readonly Game[];
  teams: readonly Team[];
  publishedWeeks: readonly number[];
  broadcastAsOf: string | null;
  broadcastNote: string | null;
  favorites: ReadonlySet<string>;
  onFavorite: (teamId: string) => void;
}

function FilterOptions({
  filter,
  conference,
  conferences,
  onFilter,
  onConference,
}: {
  filter: ScoreboardFilter;
  conference: string;
  conferences: readonly string[];
  onFilter: (value: ScoreboardFilter) => void;
  onConference: (value: string) => void;
}) {
  return (
    <>
      <fieldset className="scoreboard-filter-options">
        <legend className="sr-only">Filter games</legend>
        {scoreboardFilters.map((item) => (
          <button
            type="button"
            key={item.value}
            aria-pressed={filter === item.value}
            onClick={() => onFilter(item.value)}
          >
            {item.label}
            {filter === item.value && <Check aria-hidden="true" />}
          </button>
        ))}
      </fieldset>
      {filter === "conference" && (
        <label className="scoreboard-conference-select">
          <span>Conference</span>
          <select
            value={conference}
            onChange={(event) => onConference(event.target.value)}
          >
            {conferences.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}

function ScoreboardSkeletons() {
  return (
    <div className="scoreboard-skeletons" role="status" aria-label="Updating scoreboard">
      {[0, 1, 2].map((item) => (
        <div className="scoreboard-skeleton" key={item}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

export function ScoreboardPage({
  games,
  teams,
  publishedWeeks,
  broadcastAsOf,
  broadcastNote,
  favorites,
  onFavorite,
}: ScoreboardPageProps) {
  const weeks = useMemo(
    () => continuousWeeks(publishedWeeks),
    [publishedWeeks],
  );
  const conferences = useMemo(
    () => [...new Set(teams.map((team) => team.conference))].sort(),
    [teams],
  );
  const [week, setWeek] = useState(() =>
    defaultScoreboardWeek(games, broadcastAsOf),
  );
  const [filter, setFilter] = useState<ScoreboardFilter>("all");
  const [conference, setConference] = useState(
    () => conferences[0] ?? "FBS Independents",
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const teamsById = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams],
  );

  const weekSlate = gamesForWeek(games, week);
  const filteredGames = filterScoreboardGames({
    source: weekSlate,
    teams,
    filter,
    conference,
    favorites,
  });
  const groupedGames = groupGamesByDate(filteredGames);
  const appointments = appointmentGames(filteredGames, teams, 5);
  const activeFilter =
    scoreboardFilters.find((item) => item.value === filter)?.label ?? "All";

  const updateWeek = (value: number) => {
    startTransition(() => setWeek(value));
  };
  const updateFilter = (value: ScoreboardFilter) => {
    startTransition(() => setFilter(value));
  };
  const updateConference = (value: string) => {
    startTransition(() => setConference(value));
  };

  return (
    <div className="scoreboard-page">
      <header className="scoreboard-hero">
        <div className="apex-container">
          <a className="scoreboard-eyebrow" href="/schedule">
            2026 SCORES &amp; SCHEDULE
          </a>
          <div className="scoreboard-hero__row">
            <div>
              <h1 className="font-display text-balance">
                Your Saturday, <span>sorted.</span>
              </h1>
              <p className="text-pretty">
                Kickoff, network, venue, and final states from the verified
                season dataset—nothing filled in just to make the board look busy.
              </p>
            </div>
            <div className="scoreboard-hero__week font-display">
              <small>NOW VIEWING</small>
              <strong>WEEK {week}</strong>
              <span>{weekSlate.length} published games</span>
            </div>
          </div>
        </div>
      </header>

      <nav className="scoreboard-toolbar" aria-label="Scoreboard controls">
        <div className="apex-container scoreboard-toolbar__inner">
          <fieldset className="scoreboard-week-rail">
            <legend className="sr-only">Select week</legend>
            {weeks.map((item) => (
              <button
                type="button"
                key={item}
                aria-pressed={week === item}
                onClick={() => updateWeek(item)}
              >
                <span>Week</span> {item}
              </button>
            ))}
          </fieldset>
          <div className="scoreboard-desktop-filters">
            <FilterOptions
              filter={filter}
              conference={conference}
              conferences={conferences}
              onFilter={updateFilter}
              onConference={updateConference}
            />
          </div>
          <Dialog.Root open={filterOpen} onOpenChange={setFilterOpen}>
            <Dialog.Trigger asChild>
              <button className="scoreboard-mobile-filter" type="button">
                <SlidersHorizontal aria-hidden="true" />
                <span>{activeFilter}</span>
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="scoreboard-filter-sheet__overlay" />
              <Dialog.Content className="scoreboard-filter-sheet">
                <div className="scoreboard-filter-sheet__handle" aria-hidden="true" />
                <header>
                  <div>
                    <Dialog.Title className="font-display">
                      Filter the slate
                    </Dialog.Title>
                    <Dialog.Description>
                      Show the games that matter to you this week.
                    </Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <button type="button" aria-label="Close game filters">
                      <X aria-hidden="true" />
                    </button>
                  </Dialog.Close>
                </header>
                <FilterOptions
                  filter={filter}
                  conference={conference}
                  conferences={conferences}
                  onFilter={updateFilter}
                  onConference={updateConference}
                />
                <Dialog.Close asChild>
                  <button className="scoreboard-filter-sheet__done" type="button">
                    Show {filteredGames.length} games
                    <ChevronRight aria-hidden="true" />
                  </button>
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </nav>

      <main className="apex-container scoreboard-content">
        <div className="scoreboard-results-heading">
          <div>
            <span className="scoreboard-eyebrow">CLEAR YOUR SATURDAY</span>
            <h2 className="font-display">Appointment games</h2>
          </div>
          <p aria-live="polite" aria-atomic="true">
            {filteredGames.length} {filteredGames.length === 1 ? "game" : "games"}
            {filter !== "all" ? ` · ${activeFilter}` : ""}
          </p>
        </div>

        {isPending ? (
          <ScoreboardSkeletons />
        ) : filteredGames.length === 0 ? (
          <section className="scoreboard-empty" aria-labelledby="empty-scoreboard-title">
            <span className="font-display" aria-hidden="true">0–0</span>
            <h2 id="empty-scoreboard-title" className="font-display">
              No games match this filter
            </h2>
            <p>Choose another view or add a team to My Teams from any game card.</p>
            <button type="button" onClick={() => updateFilter("all")}>
              Show all games
            </button>
          </section>
        ) : (
          <>
            <section
              className="scoreboard-appointment-rail"
              aria-label={`Appointment games for week ${week}`}
            >
              {appointments.map((game) => {
                const away = teamsById.get(game.awayTeamId);
                const home = teamsById.get(game.homeTeamId);
                if (!away || !home) return null;
                return (
                  <BroadcastGameCard
                    key={game.id}
                    game={game}
                    away={away}
                    home={home}
                    favoriteIds={favorites}
                    onFavorite={onFavorite}
                    variant="compact"
                  />
                );
              })}
            </section>

            <section className="scoreboard-day-groups" aria-label="All games by date">
              {groupedGames.map((group) => (
                <section className="scoreboard-day" key={group.date}>
                  <header>
                    <span className="font-display">
                      {scoreboardDateLabel(group.date, true)}
                    </span>
                    <small>{group.games.length} games</small>
                  </header>
                  <div className="scoreboard-day__rail">
                    {group.games.map((game) => {
                      const away = teamsById.get(game.awayTeamId);
                      const home = teamsById.get(game.homeTeamId);
                      if (!away || !home) return null;
                      return (
                        <BroadcastGameCard
                          key={game.id}
                          game={game}
                          away={away}
                          home={home}
                          favoriteIds={favorites}
                          onFavorite={onFavorite}
                          variant="wide"
                          broadcastNote={broadcastNote}
                        />
                      );
                    })}
                  </div>
                </section>
              ))}
            </section>
          </>
        )}

        <p className="scoreboard-source-note">
          TV designations compiled {broadcastAsOf ?? "date not published"}. All
          times Eastern. Unassigned games remain labeled “Network not assigned.”
        </p>
      </main>
    </div>
  );
}
