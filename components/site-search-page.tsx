"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { ArrowRight, Search as SearchIcon } from "lucide-react";
import type { PlayerIndexEntry } from "@/lib/cfb-dataset";
import { playerSlugForName } from "@/lib/player-records";
import type { Coach, Team } from "@/lib/types";
import { TeamMark } from "./broadcast/primitives";

interface PlayerSearchResult extends PlayerIndexEntry {
  teamName: string;
}

interface SiteSearchPageProps {
  teams: readonly Team[];
  coaches: readonly Coach[];
  searchPlayers: (query: string, limit?: number) => PlayerSearchResult[];
}

type SearchGroup = "TEAMS" | "COACHES" | "PLAYERS";

interface SearchResult {
  key: string;
  group: SearchGroup;
  href: string;
  primary: string;
  team?: Team;
  meta: string[];
  marker: string;
}

const suggestions = ["Clemson", "Dabo Swinney", "Arch Manning"];

export function SiteSearchPage({ teams, coaches, searchPlayers }: SiteSearchPageProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initialQuery = new URLSearchParams(window.location.search).get("q")?.trim();
    if (initialQuery) setQuery(initialQuery);
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const teamsById = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams],
  );
  const normalizedQuery = debouncedQuery.toLowerCase();

  const teamResults = useMemo<SearchResult[]>(() => {
    if (!normalizedQuery) return [];
    return teams
      .filter((team) =>
        `${team.name} ${team.shortName} ${team.abbreviation} ${team.conference}`
          .toLowerCase()
          .includes(normalizedQuery),
      )
      .slice(0, 8)
      .map((team) => ({
        key: `team-${team.id}`,
        group: "TEAMS",
        href: `/teams/${team.slug}`,
        primary: team.name,
        team,
        meta: [team.conference],
        marker: team.abbreviation,
      }));
  }, [normalizedQuery, teams]);

  const coachResults = useMemo<SearchResult[]>(() => {
    if (!normalizedQuery) return [];
    return coaches
      .filter((coach) => {
        const team = teamsById.get(coach.teamId);
        return `${coach.name} ${coach.title} ${team?.name ?? ""}`
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .slice(0, 8)
      .map((coach) => {
        const team = teamsById.get(coach.teamId);
        return {
          key: `coach-${coach.id}`,
          group: "COACHES",
          href: `/coaches/${coach.slug}`,
          primary: coach.name,
          meta: [team?.name ?? coach.teamId, coach.title],
          marker: coach.name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2),
        };
      });
  }, [coaches, normalizedQuery, teamsById]);

  const playerResults = useMemo<SearchResult[]>(() => {
    if (!debouncedQuery) return [];
    return searchPlayers(debouncedQuery, 10).map((player) => {
      const team = teamsById.get(player.t);
      return {
        key: `player-${player.n}-${player.t}`,
        group: "PLAYERS",
        href: `/players/${playerSlugForName(player.n)}`,
        primary: player.n,
        meta: [player.p ?? "Position not listed", team?.name ?? player.teamName],
        marker: player.p ?? "—",
      };
    });
  }, [debouncedQuery, searchPlayers, teamsById]);

  const allResults = useMemo(
    () => [...teamResults, ...coachResults, ...playerResults],
    [coachResults, playerResults, teamResults],
  );
  const groups = useMemo(
    () => [
      { label: "TEAMS" as const, results: teamResults },
      { label: "COACHES" as const, results: coachResults },
      { label: "PLAYERS" as const, results: playerResults },
    ],
    [coachResults, playerResults, teamResults],
  );
  const indexByKey = useMemo(
    () => new Map(allResults.map((result, index) => [result.key, index])),
    [allResults],
  );

  useEffect(() => {
    setActiveIndex(allResults.length ? 0 : -1);
  }, [allResults]);

  const activeResultId = activeIndex >= 0 ? `site-search-result-${activeIndex}` : undefined;
  const isDebouncing = query.trim() !== debouncedQuery;

  function navigateToActive() {
    const result = allResults[activeIndex];
    if (result) window.location.assign(result.href);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (!allResults.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1 + allResults.length) % allResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + allResults.length) % allResults.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(allResults.length - 1);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      navigateToActive();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigateToActive();
  }

  function chooseSuggestion(suggestion: string) {
    setQuery(suggestion);
    searchInputRef.current?.focus();
  }

  return (
    <div className="lt-page lt-search-page">
      <header className="lt-hero lt-search-hero">
        <div className="lt-hero__copy">
          <span className="lt-eyebrow">SEARCH CFB APEX</span>
          <h1 className="font-display text-balance">Find the next useful answer.</h1>
          <p>Search every FBS program, head coach, and rostered player in the verified 2026 dataset.</p>
        </div>
      </header>

      <section className="lt-search-shell lt-section" aria-labelledby="site-search-heading">
        <h2 className="sr-only" id="site-search-heading">Site-wide search</h2>
        <form className="lt-search-form" aria-label="Site-wide search" onSubmit={handleSubmit}>
          <SearchIcon aria-hidden="true" />
          <label className="sr-only" htmlFor="site-wide-search">Search teams, coaches, and players</label>
          <input
            ref={searchInputRef}
            id="site-wide-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search teams, coaches, or players"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            role="combobox"
            aria-autocomplete="list"
            aria-controls="site-search-results"
            aria-activedescendant={activeResultId}
            aria-expanded={Boolean(debouncedQuery)}
          />
          <span className="lt-search-shortcut" aria-hidden="true">↑↓ to move · Enter to open</span>
        </form>

        <div className="sr-only" aria-live="polite">
          {isDebouncing
            ? "Searching"
            : debouncedQuery
              ? `${allResults.length} results found`
              : "Enter a search query"}
        </div>

        {!debouncedQuery ? (
          <div className="lt-search-suggestions">
            <span className="lt-eyebrow">SUGGESTED SEARCHES</span>
            <p>Try Clemson, Dabo Swinney, or Arch Manning.</p>
            <div>
              {suggestions.map((suggestion) => (
                <button type="button" key={suggestion} onClick={() => chooseSuggestion(suggestion)}>
                  {suggestion}
                  <ArrowRight aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        ) : allResults.length ? (
          <div
            className="lt-search-results"
            id="site-search-results"
            role="listbox"
            aria-label="Search results"
            aria-busy={isDebouncing}
          >
            {groups.map((group) =>
              group.results.length ? (
                <div className="lt-search-group" key={group.label}>
                  <div className="lt-search-group__heading">
                    <h2 id={`search-group-${group.label.toLowerCase()}`} className="font-display">{group.label}</h2>
                    <span>{group.results.length}</span>
                  </div>
                  <div>
                    {group.results.map((result) => {
                      const resultIndex = indexByKey.get(result.key) ?? -1;
                      const isActive = resultIndex === activeIndex;
                      return (
                        <a
                          id={`site-search-result-${resultIndex}`}
                          className="lt-search-result"
                          href={result.href}
                          key={result.key}
                          role="option"
                          aria-selected={isActive}
                          data-active={isActive || undefined}
                          onMouseEnter={() => setActiveIndex(resultIndex)}
                          onFocus={() => setActiveIndex(resultIndex)}
                        >
                          <span className="lt-search-result__mark" aria-hidden="true">
                            {result.team ? <TeamMark team={result.team} size="sm" /> : <b className="font-display">{result.marker}</b>}
                          </span>
                          <span className="lt-search-result__copy">
                            <strong>{result.primary}</strong>
                            <span>{result.meta.map((item, index) => <span key={item}>{index ? " · " : ""}{item}</span>)}</span>
                          </span>
                          <ArrowRight aria-hidden="true" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        ) : (
          <div className="lt-empty-state lt-empty-state--search" role="status">
            <SearchIcon aria-hidden="true" />
            <h2 className="font-display">No results</h2>
            <p>No teams, coaches, or players match “{debouncedQuery}”.</p>
          </div>
        )}
      </section>
    </div>
  );
}
