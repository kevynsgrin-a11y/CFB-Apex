"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  coaches,
  dfsPlayers,
  games,
  getCoachBySlug,
  getDepthChart,
  getGame,
  getInjuries,
  getRoster,
  getStadiumBySlug,
  getTeam,
  getTeamBySlug,
  getTeamLeaders,
  getTeamRatings,
  getTeamSeasons,
  injuriesAsOf,
  modelEstimatesAvailable,
  portalEvents,
  providerHealth,
  scenarioGames,
  seasonRules,
  stadiums,
  teams,
} from "@/lib/cfb-dataset";
import {
  brand,
  disclosureVersion,
  primaryNavigation,
  utilityNavigation,
} from "@/lib/config";
import { calculateBuyout } from "@/lib/contracts";
import { normalizeForcedOutcomes, runPlayoffSimulation, type ForcedOutcomes } from "@/lib/simulation";
import type { DfsPlayer, Game, PortalEvent, Provenance, Team } from "@/lib/types";
import { SourceMeta } from "./SourceMeta";

type Mode = "clean" | "analysis";
type ScoreFilter = "All" | "P4" | "G5" | "FCS" | "Top 25" | "Favorites";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const percent = (value: number) => `${Math.round(value * 100)}%`;
const signed = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}`;

function teamFor(teamId: string) {
  return getTeam(teamId);
}

function DemoBanner() {
  return (
    <div className="demo-banner" role="status">
      <span className="demo-banner__label">2026 FBS dataset</span>
      <span>138 real programs · compiled 2026-09-05 · scores update with each dataset release</span>
      <a href="/data-sources">Inspect data status</a>
    </div>
  );
}

function Header({
  activePath,
  mode,
  onModeRequest,
  onCleanMode,
}: {
  activePath: string;
  mode: Mode;
  onModeRequest: () => void;
  onCleanMode: () => void;
}) {
  const isActive = (href: string) =>
    href === "/scores"
      ? activePath === "/scores" || activePath === "/schedule"
      : activePath.startsWith(href);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <DemoBanner />
      <header className="site-header">
        <div className="site-header__inner">
          <a className="brand" href="/" aria-label={`${brand.name} home`}>
            <span className="brand__mark" aria-hidden="true">
              H
            </span>
            <span>
              <strong>{brand.shortName}</strong>
              <small>Saturday intelligence</small>
            </span>
          </a>
          <nav className="primary-nav" aria-label="Primary navigation">
            {primaryNavigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="header-actions">
            <a className="icon-button" href="/search">
              <span aria-hidden="true">⌕</span>
              <span className="sr-only">Search {brand.name}</span>
            </a>
            {mode === "clean" ? (
              <button className="mode-button" type="button" onClick={onModeRequest}>
                <span className="mode-dot" aria-hidden="true" />
                Clean Mode
              </button>
            ) : (
              <button className="mode-button mode-button--analysis" type="button" onClick={onCleanMode}>
                <span className="mode-dot" aria-hidden="true" />
                Odds & DFS
              </button>
            )}
          </div>
        </div>
        <nav className="mobile-nav" aria-label="Mobile primary navigation">
          {primaryNavigation.slice(0, 4).map((item) => (
            <a
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              {item.label}
            </a>
          ))}
          <a href="/teams">More</a>
        </nav>
      </header>
    </>
  );
}

function ScoreRibbon() {
  return (
    <section className="score-ribbon" aria-label="Featured scores">
      <div className="score-ribbon__rail">
        <div className="score-ribbon__date">
          <span>WEEK 12</span>
          <strong>SAT · NOV 14</strong>
        </div>
        {games.slice(0, 4).map((game) => {
          const away = teamFor(game.awayTeamId);
          const home = teamFor(game.homeTeamId);
          return (
            <a className="ribbon-game" href={`/games/${game.id}`} key={game.id}>
              <span className={`status status--${game.status}`}>{game.statusDetail}</span>
              <span>
                {away.abbreviation}
                <b>{game.awayScore ?? "—"}</b>
              </span>
              <span>
                {home.abbreviation}
                <b>{game.homeScore ?? "—"}</b>
              </span>
            </a>
          );
        })}
        <a className="ribbon-all" href="/scores">
          All scores <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}

function ModeDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [jurisdiction, setJurisdiction] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
      <dialog
        ref={dialogRef}
        className="mode-dialog"
        aria-modal="true"
        aria-labelledby="mode-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
      >
        <span className="eyebrow">Optional experience</span>
        <h2 id="mode-dialog-title">Show Odds & DFS Mode?</h2>
        <p>
          Analysis mode adds model distributions and market context. It does not
          confirm legal eligibility, offer wagering, or guarantee an outcome.
        </p>
        <label className="check-row">
          <input
            type="checkbox"
            checked={ageConfirmed}
            onChange={(event) => setAgeConfirmed(event.target.checked)}
          />
          <span>I confirm I am at least 21 years old.</span>
        </label>
        <label>
          Coarse jurisdiction
          <select value={jurisdiction} onChange={(event) => setJurisdiction(event.target.value)}>
            <option value="">Choose a region</option>
            <option value="us-general">United States — general preview</option>
            <option value="outside-us">Outside the United States</option>
            <option value="unknown">Prefer not to say</option>
          </select>
        </label>
        <p className="fine-print">
          No exact birth date or precise location is collected. Operator actions remain disabled
          because no partners or jurisdiction matrix are configured.
        </p>
        <div className="dialog-actions">
          <button className="button button--ghost" type="button" onClick={onClose}>
            Stay in Clean Mode
          </button>
          <button
            className="button button--gold"
            type="button"
            disabled={!ageConfirmed || !jurisdiction}
            onClick={onConfirm}
          >
            Enable preview
          </button>
        </div>
      </dialog>
  );
}

function Monogram({ team, size = "md" }: { team: Team; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={`monogram monogram--${size}`}
      style={{ "--team-color": team.color } as React.CSSProperties}
      aria-hidden="true"
    >
      {team.monogram}
    </span>
  );
}

function Freshness({ provenance }: { provenance: Provenance }) {
  const date = new Date(provenance.sourceAsOf).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return (
    <span className="freshness">
      <span aria-hidden="true" />
      Dataset · as of {date}
    </span>
  );
}

function GameCard({
  game,
  mode,
  favoriteIds,
  onFavorite,
}: {
  game: Game;
  mode: Mode;
  favoriteIds: Set<string>;
  onFavorite: (teamId: string) => void;
}) {
  const away = teamFor(game.awayTeamId);
  const home = teamFor(game.homeTeamId);
  const isFavorite = favoriteIds.has(away.id) || favoriteIds.has(home.id);

  return (
    <article className="game-card">
      <div className="game-card__topline">
        <span className={`status status--${game.status}`}>{game.statusDetail}</span>
        <span>{game.kickoffLabel}</span>
        <button
          className="favorite-button"
          type="button"
          onClick={() => onFavorite(home.id)}
          aria-pressed={isFavorite}
          aria-label={`${isFavorite ? "Remove" : "Add"} ${home.shortName} as a favorite`}
        >
          {isFavorite ? "★" : "☆"}
        </button>
      </div>
      <a className="game-card__matchup" href={`/games/${game.id}`}>
        <div className="team-line">
          <Monogram team={away} />
          <span>
            <small>{away.rank ? `#${away.rank}` : away.conference}</small>
            <strong>{away.shortName}</strong>
            <em>{away.record}</em>
          </span>
          <b>{game.awayScore ?? "—"}</b>
        </div>
        <div className="team-line">
          <Monogram team={home} />
          <span>
            <small>{home.rank ? `#${home.rank}` : home.conference}</small>
            <strong>{home.shortName}</strong>
            <em>{home.record}</em>
          </span>
          <b>{game.homeScore ?? "—"}</b>
        </div>
      </a>
      <div className="game-card__meta">
        <span>{game.venue}</span>
        <span>
          {game.weather
            ? `${game.weather.temperature}° · ${game.weather.summary}`
            : "Weather unavailable"}
        </span>
      </div>
      <div className="game-card__actions">
        <a href={`/games/${game.id}`}>Preview</a>
        <a href="/watch">Watch status</a>
        <a href={`/stadiums/${game.venueSlug}`}>Gameday guide</a>
      </div>
      {mode === "analysis" && game.line ? (
        <div className="odds-strip">
          <span>MARKET</span>
          <strong>
            {home.abbreviation} {game.line.home}
          </strong>
          <small>Market context · no operator actions</small>
        </div>
      ) : null}
    </article>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="page-heading__actions">{actions}</div> : null}
    </header>
  );
}

function SectionHeading({
  eyebrow,
  title,
  href,
  linkLabel = "View all",
}: {
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {href ? (
        <a href={href}>
          {linkLabel} <span aria-hidden="true">→</span>
        </a>
      ) : null}
    </div>
  );
}

function HomePage({ mode, favorites, onFavorite }: HomeProps) {
  const featured = games[0];
  const away = teamFor(featured.awayTeamId);
  const home = teamFor(featured.homeTeamId);
  const featuredCoach = coaches[0];
  const coachTeam = teamFor(featuredCoach.teamId);

  return (
    <>
      <section className="hero">
        <div className="hero__copy">
          <span className="eyebrow">{brand.eyebrow}</span>
          <h1>
            Every Saturday.
            <br />
            <em>One command center.</em>
          </h1>
          <p>{brand.description}</p>
          <div className="hero__actions">
            <a className="button button--gold" href="/scores">
              Open scoreboard <span aria-hidden="true">→</span>
            </a>
            <a className="button button--ghost" href="/playoff-predictor">
              Build a playoff path
            </a>
          </div>
          <div className="trust-row">
            <span>No autoplay</span>
            <span>Clean Mode default</span>
            <span>Sources on every record</span>
          </div>
        </div>
        <article className="feature-game">
          <div className="feature-game__header">
            <span className="pulse-label">NEXT MATCHUP</span>
            <Freshness provenance={featured.provenance} />
          </div>
          <div className="feature-game__teams">
            <div>
              <Monogram team={away} size="lg" />
              <span>
                <small>#{away.rank}</small>
                <strong>{away.shortName}</strong>
                <em>{away.record}</em>
              </span>
            </div>
            <b>at</b>
            <div>
              <Monogram team={home} size="lg" />
              <span>
                <small>#{home.rank}</small>
                <strong>{home.shortName}</strong>
                <em>{home.record}</em>
              </span>
            </div>
          </div>
          <div className="feature-game__intel">
            <div>
              <span>Kickoff</span>
              <strong>{featured.kickoffLabel}</strong>
            </div>
            <div>
              <span>Venue</span>
              <strong>{featured.venue}</strong>
            </div>
            <div>
              <span>Weather</span>
              <strong>{featured.weather?.temperature}° · {featured.weather?.summary}</strong>
            </div>
          </div>
          {modelEstimatesAvailable ? (
            <div className="probability">
              <div>
                <span>{brand.shortName} model estimate</span>
                <strong>{percent(featured.modelHomeWinProbability)} {home.abbreviation}</strong>
              </div>
              <div
                className="probability__track"
                role="img"
                aria-label={`${home.shortName} has a ${percent(featured.modelHomeWinProbability)} win estimate, plus or minus ${percent(featured.modelUncertainty)}`}
              >
                <span style={{ width: percent(featured.modelHomeWinProbability) }} />
              </div>
              <small>±{percent(featured.modelUncertainty)} uncertainty</small>
            </div>
          ) : (
            <div className="probability">
              <div>
                <span>{brand.shortName} model estimate</span>
                <strong>Pending 2026 season data</strong>
              </div>
              <small>Win probabilities resume once in-season results accumulate.</small>
            </div>
          )}
          <a className="feature-game__link" href={`/games/${featured.id}`}>
            Open complete matchup intelligence <span aria-hidden="true">→</span>
          </a>
        </article>
      </section>

      <section className="quick-deck" aria-labelledby="quick-deck-title">
        <div className="quick-deck__intro">
          <span className="eyebrow">START HERE</span>
          <h2 id="quick-deck-title">What do you need?</h2>
        </div>
        {[
          ["/scores", "01", "Track the slate", "Scores, schedules, watch status, weather"],
          ["/transfer-portal", "02", "Read roster movement", "Open portal table and team impact"],
          ["/playoff-predictor", "03", "Test the playoff", "Force outcomes and rerun the field"],
          ["/coaching-carousel", "04", "Follow coaching", "Verified moves, contracts, buyouts"],
          ["/stadiums", "05", "Plan gameday", "Parking, bags, transit, visitor notes"],
        ].map(([href, number, title, copy]) => (
          <a className="quick-card" href={href} key={href}>
            <span>{number}</span>
            <strong>{title}</strong>
            <small>{copy}</small>
            <b aria-hidden="true">↗</b>
          </a>
        ))}
      </section>

      <section className="content-section">
        <SectionHeading eyebrow="2026 SEASON BOARD" title="Matchups worth your screen" href="/scores" />
        <div className="game-grid">
          {games.slice(0, 3).map((game) => (
            <GameCard
              key={game.id}
              game={game}
              mode={mode}
              favoriteIds={favorites}
              onFavorite={onFavorite}
            />
          ))}
        </div>
      </section>

      <section className="dashboard-grid content-section">
        <div className="dashboard-panel dashboard-panel--wide">
          <SectionHeading eyebrow="ROSTER VOLATILITY" title="Portal pulse" href="/transfer-portal" />
          <div className="portal-list">
            {portalEvents.length > 0 ? (
              portalEvents.slice(0, 4).map((event) => (
                <PortalRow event={event} key={event.id} />
              ))
            ) : (
              <p className="panel-note">Transfer-portal movement is not part of the 2026 research dataset.</p>
            )}
          </div>
        </div>
        <div className="dashboard-panel">
          <SectionHeading eyebrow="AP PRESEASON TOP 25" title="Bubble pressure" href="/rankings" linkLabel="Rankings" />
          <div className="rank-stack">
            {teams
              .filter((team) => team.rank != null)
              .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
              .slice(5, 9)
              .map((team) => (
                <div key={team.id}>
                  <Monogram team={team} size="sm" />
                  <span>
                    <strong>{team.shortName}</strong>
                    <small>AP No. {team.rank}</small>
                  </span>
                  <b>{team.record}</b>
                </div>
              ))}
          </div>
          <p className="panel-note">AP preseason poll · not a committee forecast</p>
        </div>
        <div className="dashboard-panel">
          <SectionHeading eyebrow="COACHING CAROUSEL" title="On the sideline" href="/coaching-carousel" />
          <div className="coach-pulse">
            <div className="coach-pulse__badge">{featuredCoach.name.split(" ").map((part) => part[0]).join("")}</div>
            <div>
              <strong>{featuredCoach.name}</strong>
              <span>{coachTeam.shortName} · {featuredCoach.record}</span>
            </div>
          </div>
          <p className="panel-note">Contract terms and hot-seat economics are not published in the 2026 dataset.</p>
        </div>
        <div className="dashboard-panel dashboard-panel--field">
          <span className="eyebrow">GAMEDAY INTELLIGENCE</span>
          <h2>Know the gate before you leave the driveway.</h2>
          <p>Stadium guides return once venue data joins the research dataset.</p>
          <a className="button button--light" href="/stadiums">Browse stadium guides</a>
        </div>
      </section>

      <NewsletterBand />
    </>
  );
}

interface HomeProps {
  mode: Mode;
  favorites: Set<string>;
  onFavorite: (teamId: string) => void;
}

function ScoresPage({ mode, favorites, onFavorite }: HomeProps) {
  const [filter, setFilter] = useState<ScoreFilter>("All");
  const filtered = games.filter((game) => {
    const away = teamFor(game.awayTeamId);
    const home = teamFor(game.homeTeamId);
    if (filter === "All") return true;
    if (filter === "Top 25") return Boolean(away.rank || home.rank);
    if (filter === "Favorites") return favorites.has(away.id) || favorites.has(home.id);
    return away.subdivision === filter || home.subdivision === filter;
  });

  return (
    <>
      <PageHeading
        eyebrow="PRIORITY 01 · SCOREBOARD"
        title="The slate, without the scavenger hunt."
        description="Scheduled, final, delayed, and postponed game states with weather, provider status, and direct route actions."
        actions={<Freshness provenance={games[0].provenance} />}
      />
      <div className="sticky-tools">
        <fieldset className="date-switcher">
          <legend className="sr-only">Score date</legend>
          <button type="button" disabled title="One scoreboard window is available" aria-label="Previous scoreboard window unavailable">←</button>
          <span><small>2026 SEASON</small><strong>{games.length} games tracked</strong></span>
          <button type="button" disabled title="One scoreboard window is available" aria-label="Next scoreboard window unavailable">→</button>
        </fieldset>
        <fieldset className="filter-chips">
          <legend className="sr-only">Score filters</legend>
          {(["All", "P4", "G5", "FCS", "Top 25", "Favorites"] as ScoreFilter[]).map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </fieldset>
      </div>
      <section className="content-section">
        <div className="scoreboard-summary">
          <div><span>{games.length}</span><small>GAMES</small></div>
          <div><span>{games.filter((game) => game.status === "final").length}</span><small>FINAL</small></div>
          <div><span>{games.filter((game) => game.status === "scheduled").length}</span><small>SCHEDULED</small></div>
          <div><span>{teams.length}</span><small>PROGRAMS</small></div>
          <a href="/schedule">Full schedule →</a>
        </div>
        {filtered.length ? (
          <div className="game-grid game-grid--two">
            {filtered.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                mode={mode}
                favoriteIds={favorites}
                onFavorite={onFavorite}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No favorite teams on this season board yet."
            copy="Add a favorite from any game card, then return to this filter."
            href="/teams"
            action="Browse teams"
          />
        )}
      </section>
    </>
  );
}

function SchedulePage(props: HomeProps) {
  return (
    <>
      <PageHeading
        eyebrow="SEASON-AWARE SCHEDULE"
        title="2026 schedule"
        description="Conference membership and postseason rules are versioned by season; the preview never hardcodes a permanent team count."
      />
      <section className="content-section schedule-board">
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            mode={props.mode}
            favoriteIds={props.favorites}
            onFavorite={props.onFavorite}
          />
        ))}
      </section>
    </>
  );
}

function GamePage({ gameId, mode, favorites, onFavorite }: HomeProps & { gameId: string }) {
  const game = getGame(gameId) ?? games[0];
  const away = teamFor(game.awayTeamId);
  const home = teamFor(game.homeTeamId);
  const homeEdge = Math.round(game.modelHomeWinProbability * 100);
  const metrics = [
    ["Play value / drive", away.strength - 65, home.strength - 65],
    ["Successful play rate", 47, 51],
    ["Explosive play index", 61, 55],
    ["Disruption created", 58, 64],
    ["Returning production", away.returningProduction, home.returningProduction],
  ] as const;

  return (
    <>
      <div className="game-hero">
        <div className="game-hero__meta">
          <span className={`status status--${game.status}`}>{game.statusDetail}</span>
          <Freshness provenance={game.provenance} />
        </div>
        <div className="game-hero__matchup">
          <TeamHero team={away} score={game.awayScore} />
          <div className="game-hero__center">
            <h1 className="sr-only">{away.name} at {home.name} game preview</h1>
            <span>{game.kickoffLabel}</span>
            <strong>{game.broadcast ?? "Broadcast provider not configured"}</strong>
            <small>{game.venue} · {game.city}</small>
          </div>
          <TeamHero team={home} score={game.homeScore} />
        </div>
        <div className="game-action-row">
          <a href="/watch">Watch status</a>
          <a href="/watch#radio">Audio status</a>
          <a href={`/stadiums/${game.venueSlug}`}>Venue guide</a>
          <button type="button" onClick={() => onFavorite(home.id)} aria-pressed={favorites.has(home.id)}>
            {favorites.has(home.id) ? "★ Favorited" : "☆ Favorite"}
          </button>
        </div>
      </div>

      <section className="content-section game-layout">
        <div className="game-main">
          {modelEstimatesAvailable ? (
            <>
              <SectionHeading eyebrow="MODEL SNAPSHOT" title="Why the model leans this way" />
              <article className="win-model-card">
                <div>
                  <span className="eyebrow">HOME WIN ESTIMATE</span>
                  <strong>{homeEdge}%</strong>
                  <small>±{percent(game.modelUncertainty)} uncertainty</small>
                </div>
                <div className="win-model-card__track" aria-hidden="true">
                  <span style={{ width: `${homeEdge}%` }} />
                </div>
                <p>
                  {home.shortName} carries the stronger strength rating and a modest
                  home-context edge. Weather and unverified availability are excluded rather than
                  invented.
                </p>
              </article>
            </>
          ) : (
            <article className="win-model-card">
              <div>
                <span className="eyebrow">MATCHUP MODEL</span>
                <strong>Pending 2026 season data</strong>
              </div>
              <p>
                Win probabilities and matchup edges resume once in-season results accumulate.
                Schedules, results, and poll data below are live from the 2026 dataset.
              </p>
            </article>
          )}

          {modelEstimatesAvailable && (
            <article className="metric-card">
              <div className="metric-card__header">
                <div><Monogram team={away} size="sm" /><strong>{away.abbreviation}</strong></div>
                <span>Original efficiency metrics</span>
                <div><strong>{home.abbreviation}</strong><Monogram team={home} size="sm" /></div>
              </div>
              <div className="metric-list">
                {metrics.map(([label, awayValue, homeValue]) => (
                  <div className="metric-row" key={label}>
                    <b>{awayValue}</b>
                    <div>
                      <span>{label}</span>
                      <div className="split-bar" role="img" aria-label={`${label}: ${away.shortName} ${awayValue}; ${home.shortName} ${homeValue}`}>
                        <i style={{ width: `${awayValue}%` }} />
                        <em style={{ width: `${homeValue}%` }} />
                      </div>
                    </div>
                    <b>{homeValue}</b>
                  </div>
                ))}
              </div>
            </article>
          )}

          {modelEstimatesAvailable && (
            <article className="mismatch-card">
              <div>
                <span className="eyebrow">POSITIONAL MATCHUPS</span>
                <h2>Where Saturday tilts</h2>
                <p>Color intensity is paired with labels and a text summary for accessibility.</p>
              </div>
              <div className="mismatch-grid" role="img" aria-label={`${home.shortName} has advantages in pass protection and secondary; ${away.shortName} has an advantage at receiver`}>
                {[
                  ["QB", 2], ["RB", -1], ["WR", -3], ["OL", 4], ["DL", 1], ["LB", 0], ["DB", 3], ["ST", -1],
                ].map(([label, edge]) => (
                  <div className={`edge edge--${Number(edge) > 1 ? "home" : Number(edge) < -1 ? "away" : "even"}`} key={label}>
                    <span>{label}</span>
                    <strong>{Number(edge) > 0 ? `+${edge} ${home.abbreviation}` : Number(edge) < 0 ? `${Math.abs(Number(edge))} ${away.abbreviation}` : "Even"}</strong>
                  </div>
                ))}
              </div>
            </article>
          )}
        </div>
        <aside className="game-sidebar">
          <article className="sidebar-card">
            <span className="eyebrow">GAMEDAY</span>
            <h2>{game.weather ? `${game.weather.temperature}° · ${game.weather.summary}` : "Weather unavailable"}</h2>
            <p>{game.weather ? `Wind ${game.weather.windMph} mph. Weather is not part of this dataset release.` : "A live weather provider is not configured."}</p>
            <a href={`/stadiums/${game.venueSlug}`}>Parking, bags & transit →</a>
          </article>
          {mode === "analysis" && game.line ? (
            <article className="sidebar-card sidebar-card--gold">
              <span className="eyebrow">MARKET CONTEXT</span>
              <h2>{home.abbreviation} {game.line.home}</h2>
              <p>No licensed odds provider or operator action is configured.</p>
              <div className="sparkline" role="img" aria-label={`Line movement from ${game.line.movement[0]} to ${game.line.movement.at(-1)}`}>
                {game.line.movement.map((point, index) => (
                  <span key={`${point}-${index}`} style={{ height: `${32 + Math.abs(point) * 10}%` }} />
                ))}
              </div>
            </article>
          ) : null}
          <article className="sidebar-card">
            <SourceMeta provenance={game.provenance} />
            <a href={`/corrections?record=${game.id}`}>Report a data issue →</a>
          </article>
        </aside>
      </section>
    </>
  );
}

function TeamHero({ team, score }: { team: Team; score?: number }) {
  return (
    <div className="team-hero">
      <Monogram team={team} size="lg" />
      <span>
        <small>{team.rank ? `#${team.rank}` : team.conference}</small>
        <strong>{team.name}</strong>
        <em>{team.record}</em>
      </span>
      {score !== undefined ? <b>{score}</b> : null}
    </div>
  );
}

function PortalRow({ event }: { event: PortalEvent }) {
  const from = teamFor(event.fromTeamId);
  const to = event.toTeamId ? teamFor(event.toTeamId) : null;
  return (
    <a className="portal-row" href={`/players/${event.playerSlug}`}>
      <span className="position-badge">{event.position}</span>
      <span>
        <strong>{event.player}</strong>
        <small>{from.shortName} → {to?.shortName ?? "Available"}</small>
      </span>
      <span className={`portal-status portal-status--${event.status}`}>{event.status}</span>
      <b>{signed(event.impact)}</b>
      <small>{percent(event.confidence)} conf.</small>
    </a>
  );
}

function PortalPage({ teamSlug }: { teamSlug?: string }) {
  const [position, setPosition] = useState("All");
  const [status, setStatus] = useState("All");
  const scopedTeam = teamSlug ? getTeamBySlug(teamSlug) : undefined;
  const filtered = portalEvents.filter((event) => {
    const teamMatch = !scopedTeam || event.fromTeamId === scopedTeam.id || event.toTeamId === scopedTeam.id;
    const positionMatch = position === "All" || event.position === position;
    const statusMatch = status === "All" || event.status === status;
    return teamMatch && positionMatch && statusMatch;
  });

  return (
    <>
      <PageHeading
        eyebrow="PRIORITY 02 · ROSTER VOLATILITY"
        title={scopedTeam ? `${scopedTeam.shortName} portal ledger` : "Roster movement, in the open."}
        description="Transfer-portal entries with snaps, position-weighted impact, and source confidence — no NIL guesswork."
        actions={<a className="button button--ghost" href="/methodology#portal">Portal methodology</a>}
      />
      {portalEvents.length === 0 ? (
        <section className="content-section">
          <article className="win-model-card">
            <div>
              <span className="eyebrow">NOT AVAILABLE IN THIS DATASET</span>
              <strong>Transfer-portal movement</strong>
            </div>
            <p>
              The 2026 research dataset covers rosters, schedules, polls, coaching staffs, and SOS —
              it does not include portal entries. This surface turns on when portal data joins a
              future dataset release.
            </p>
          </article>
        </section>
      ) : (
        <>
          <section className="portal-summary">
            {(scopedTeam ? [scopedTeam] : [...teams].sort((a, b) => b.portalImpact - a.portalImpact).slice(0, 4)).map((team) => (
              <a href={`/transfer-portal/${team.slug}`} className="impact-card" key={team.id}>
                <div><Monogram team={team} /><span><small>{team.conference}</small><strong>{team.shortName}</strong></span></div>
                <b>{signed(team.portalImpact)}</b>
                <div className="impact-track" role="img" aria-label={`${team.shortName} portal impact ${signed(team.portalImpact)}`}>
                  <span style={{ width: `${Math.min(100, Math.max(8, 50 + team.portalImpact * 4))}%` }} />
                </div>
                <small>{team.returningProduction}% returning production</small>
              </a>
            ))}
          </section>
          <section className="content-section">
        <div className="table-tools">
          <div>
            <label>Position
              <select value={position} onChange={(event) => setPosition(event.target.value)}>
                {["All", "QB", "RB", "WR", "OL", "EDGE", "CB"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>Status
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                {["All", "committed", "available", "withdrawn"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <span>{filtered.length} records</span>
        </div>
        <section className="data-table-wrap" tabIndex={0} aria-label="Scrollable portal movement table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Player</th><th>Pos.</th><th>Origin</th><th>Destination</th><th>Status</th><th>Snaps</th><th>Impact</th><th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => (
                <tr key={event.id}>
                  <td><a href={`/players/${event.playerSlug}`}>{event.player}</a></td>
                  <td>{event.position}</td>
                  <td>{teamFor(event.fromTeamId).shortName}</td>
                  <td>{event.toTeamId ? teamFor(event.toTeamId).shortName : "Open"}</td>
                  <td><span className={`portal-status portal-status--${event.status}`}>{event.status}</span></td>
                  <td>{event.snaps ?? "Unknown"}</td>
                  <td><strong>{signed(event.impact)}</strong></td>
                  <td>{percent(event.confidence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <p className="table-caption">Unknown usage is explicitly preserved and reduces confidence.</p>
          </section>
        </>
      )}
    </>
  );
}

function PlayoffPage() {
  const [forced, setForced] = useState<ForcedOutcomes>({});
  const [result, setResult] = useState(() => runPlayoffSimulation("saturday-2026", {}, 2_000));
  const [message, setMessage] = useState("Initial quick run · precision target not guaranteed");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const restored = normalizeForcedOutcomes(Object.fromEntries(params.entries()));
    if (Object.keys(restored).length === 0) return;
    setForced(restored);
    setResult(runPlayoffSimulation("saturday-2026", restored, 2_000));
    setMessage("Scenario restored from this URL · run the full simulation when ready");
  }, []);

  const run = () => {
    const next = runPlayoffSimulation("saturday-2026", forced, 20_000);
    setResult(next);
    setMessage(next.converged ? "Precision target reached" : `Bounded at ${next.iterations.toLocaleString()} runs · ±${(next.maxHalfWidth * 100).toFixed(2)} pts max sampling half-width`);
  };

  const share = async () => {
    const query = new URLSearchParams(Object.entries(forced)).toString();
    const url = `${window.location.origin}/playoff-predictor${query ? `?${query}` : ""}`;
    window.history.replaceState(null, "", url);
    if (!navigator.clipboard) {
      setMessage("Reproducible scenario URL is ready in the address bar");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Reproducible scenario URL copied");
    } catch {
      setMessage("Reproducible scenario URL is ready in the address bar");
    }
  };

  return (
    <>
      <PageHeading
        eyebrow="PRIORITY 03 · SEEDED SIMULATION"
        title="You call the Saturdays. The field moves."
        description={`${seasonRules.label}. Committee order is a clearly labeled approximation, never a claim about the real committee.`}
        actions={<Freshness provenance={teams[0].provenance} />}
      />
      <section className="simulator-layout content-section">
        <div className="scenario-builder">
          <div className="scenario-builder__header">
            <span className="eyebrow">FORCE OUTCOMES</span>
            <button type="button" onClick={() => setForced({})}>Clear all</button>
          </div>
          {scenarioGames.map((game) => {
            const away = teamFor(game.awayTeamId);
            const home = teamFor(game.homeTeamId);
            return (
              <fieldset className="scenario-game" key={game.id}>
                <legend>Week {game.week}</legend>
                {[away, home].map((team) => (
                  <label key={team.id}>
                    <input
                      type="radio"
                      name={game.id}
                      checked={forced[game.id] === team.id}
                      onChange={() => setForced((current) => ({ ...current, [game.id]: team.id }))}
                    />
                    <Monogram team={team} size="sm" />
                    <span><strong>{team.shortName}</strong><small>{team.record}</small></span>
                  </label>
                ))}
              </fieldset>
            );
          })}
          <button className="button button--gold button--full" type="button" onClick={run}>Run 20,000 simulations</button>
          <button className="button button--ghost button--full" type="button" onClick={share}>Copy scenario link</button>
          <p className="sim-message" role="status">{message}</p>
        </div>
        <div className="simulation-results">
          <div className="simulation-results__header">
            <div><span className="eyebrow">SIMULATION OUTPUT</span><h2>Projected field</h2></div>
            <span>{result.iterations.toLocaleString()} runs · seed {result.seed}</span>
          </div>
          <div className="field-list">
            {result.results.slice(0, 12).map((teamResult, index) => {
              const team = teamFor(teamResult.teamId);
              return (
                <div className="field-row" key={team.id}>
                  <b>{index + 1}</b>
                  <Monogram team={team} size="sm" />
                  <span><strong>{team.shortName}</strong><small>{team.conference}</small></span>
                  <div>
                    <span>Playoff <strong>{percent(teamResult.playoff)}</strong></span>
                    <span>Bye <strong>{percent(teamResult.bye)}</strong></span>
                    <span>Title <strong>{percent(teamResult.title)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bracket" role="img" aria-label="Accessible playoff bracket">
            <span className="eyebrow">BRACKET SNAPSHOT</span>
            <div>
              {result.results.slice(4, 12).map((entry, index) => (
                <div key={entry.teamId}><small>Seed {index + 5}</small><strong>{teamFor(entry.teamId).abbreviation}</strong></div>
              ))}
            </div>
            <p>Top four seeds receive byes under the 2026 twelve-team format. Full probabilities appear in the table above.</p>
          </div>
        </div>
      </section>
    </>
  );
}

function CoachingPage({ coachSlug }: { coachSlug?: string }) {
  const focused = coachSlug ? getCoachBySlug(coachSlug) : undefined;
  const [selectedId, setSelectedId] = useState(focused?.id ?? coaches[0].id);
  const coach = coaches.find((item) => item.id === selectedId)!;
  const team = teamFor(coach.teamId);
  const [guaranteed, setGuaranteed] = useState(coach.guaranteedRemaining);
  const [offset, setOffset] = useState(coach.offsetEstimate);
  const buyout = calculateBuyout({
    guaranteedRemaining: guaranteed,
    mitigationApplies: coach.mitigationApplies,
    estimatedOffset: offset,
  });

  const selectCoach = (item: typeof coach) => {
    setSelectedId(item.id);
    setGuaranteed(item.guaranteedRemaining);
    setOffset(item.offsetEstimate);
  };

  return (
    <>
      <PageHeading
        eyebrow="PRIORITY 04 · CONTRACT ECONOMICS"
        title={focused ? `${focused.name} contract ledger` : "Separate the contract from the carousel noise."}
        description="Verified timelines and transparent buyout math where published; hot-seat context returns with contract data."
      />
      <section className="coaching-layout content-section">
        <div className="coach-index">
          {coaches.map((item) => {
            const itemTeam = teamFor(item.teamId);
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => selectCoach(item)}
                aria-pressed={coach.id === item.id}
              >
                <span>{item.name.split(" ").map((part) => part[0]).join("")}</span>
                <div><strong>{item.name}</strong><small>{itemTeam.shortName} · {item.title}</small></div>
                <b>{item.record}</b>
              </button>
            );
          })}
        </div>
        <div className="coach-detail">
          <div className="coach-detail__hero">
            <div className="coach-avatar">{coach.name.split(" ").map((part) => part[0]).join("")}</div>
            <div><span className="eyebrow">{team.shortName} · {coach.title}</span><h2>{coach.name}</h2><p>{coach.record} record</p></div>
          </div>
          <div className="contract-grid">
            <div><span>Term</span><strong>{coach.annualSalary > 0 && coach.contractStart ? `${coach.contractStart.slice(0, 4)}–${coach.contractEnd.slice(0, 4)}` : "Not published"}</strong></div>
            <div><span>Annual salary</span><strong>{coach.annualSalary > 0 ? money.format(coach.annualSalary) : "Not published"}</strong></div>
            <div><span>Guarantee remaining</span><strong>{coach.guaranteedRemaining > 0 ? money.format(coach.guaranteedRemaining) : "Not published"}</strong></div>
            <div><span>Mitigation</span><strong>{coach.mitigationApplies ? "Applies" : "Not published"}</strong></div>
          </div>
          <p className="panel-note">Contract terms are not part of the 2026 research dataset; use the calculator with your own inputs.</p>
          <div className="timeline">
            <span className="eyebrow">VERIFIED TIMELINE</span>
            {coach.timeline.map((entry) => (
              <div key={`${entry.date}-${entry.label}`}>
                <span className={`timeline-dot timeline-dot--${entry.kind}`} />
                <time>{entry.date}</time>
                <strong>{entry.label}</strong>
              </div>
            ))}
          </div>
          <SourceMeta provenance={coach.provenance} />
        </div>
        <aside className="buyout-card">
          <span className="eyebrow">BUYOUT CALCULATOR</span>
          <h2>Verified inputs in. Explainable estimate out.</h2>
          <label>Guaranteed compensation remaining
            <input type="number" min="0" step="100000" value={guaranteed} onChange={(event) => setGuaranteed(Number(event.target.value))} />
          </label>
          <label>Estimated offset / mitigation
            <input type="number" min="0" step="100000" value={offset} onChange={(event) => setOffset(Number(event.target.value))} disabled={!coach.mitigationApplies} />
          </label>
          <div className="buyout-total">
            <span>Estimated net obligation</span>
            <strong>{money.format(buyout.estimatedNet)}</strong>
            <small>{buyout.formula}</small>
          </div>
          <p>Editorial estimate only. Real contracts require source-document and counsel review.</p>
          <a href="/methodology#coaching">Read calculation policy →</a>
        </aside>
      </section>
    </>
  );
}

function DfsPage({ mode, onModeRequest }: { mode: Mode; onModeRequest: () => void }) {
  const [position, setPosition] = useState("All");
  const [slate, setSlate] = useState("Main");
  const filtered = dfsPlayers.filter((player) =>
    (position === "All" || player.position === position) && player.slate === slate,
  );

  if (mode === "clean") {
    return (
      <>
        <PageHeading
          eyebrow="PRIORITY 05 · OPTIONAL ANALYSIS"
          title="DFS stays behind a deliberate choice."
          description="Clean Mode hides fantasy and market context. Core team win-probability models remain available elsewhere and are not betting odds."
        />
        <section className="gate-card content-section">
          <span className="gate-card__mark">21+</span>
          <div>
            <span className="eyebrow">CLEAN MODE ACTIVE</span>
            <h2>Projection distributions, when you ask for them.</h2>
            <p>Enable the optional preview to see illustrative player floor, median, ceiling, volume, availability, and model-version context.</p>
            <button className="button button--gold" type="button" onClick={onModeRequest}>Review disclosure</button>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeading
        eyebrow="PRIORITY 05 · DISTRIBUTION MODEL"
        title="Volume first. Uncertainty always."
        description="Projections are informational estimates, not promises. No operator, contest, or referral is configured."
      />
      <section className="content-section">
        <div className="table-tools">
          <div>
            <label>Slate
              <select value={slate} onChange={(event) => setSlate(event.target.value)}>
                <option>Main</option><option>Late</option>
              </select>
            </label>
            <label>Position
              <select value={position} onChange={(event) => setPosition(event.target.value)}>
                {["All", "QB", "RB", "WR", "TE"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <span>Projection model pending 2026 season data</span>
        </div>
        {filtered.length ? (
          <div className="dfs-grid">
            {filtered.map((player) => <DfsCard player={player} key={player.id} />)}
          </div>
        ) : (
          <article className="win-model-card">
            <div>
              <span className="eyebrow">NOT AVAILABLE IN THIS DATASET</span>
              <strong>DFS projections</strong>
            </div>
            <p>
              Fantasy projections are not part of the 2026 research dataset. This surface turns on
              when a projection model is trained and validated against the season.
            </p>
          </article>
        )}
        <ResponsibleGamingNotice />
      </section>
    </>
  );
}

function DfsCard({ player }: { player: DfsPlayer }) {
  const team = teamFor(player.teamId);
  return (
    <article className={`dfs-card ${player.availability === "inactive" ? "dfs-card--inactive" : ""}`}>
      <div className="dfs-card__header">
        <Monogram team={team} />
        <span><small>{player.position} · {team.abbreviation}</small><strong>{player.name}</strong><em>{player.availability}</em></span>
        <b>{money.format(player.salary)}</b>
      </div>
      <div className="distribution" role="img" aria-label={`${player.name} floor ${player.floor}, median ${player.median}, ceiling ${player.ceiling} fantasy points`}>
        <span className="distribution__range" style={{ left: `${player.floor * 2}%`, width: `${(player.ceiling - player.floor) * 2}%` }} />
        <i style={{ left: `${player.median * 2}%` }} />
      </div>
      <div className="quantiles">
        <span>Floor <strong>{player.floor}</strong></span>
        <span>Median <strong>{player.median}</strong></span>
        <span>Ceiling <strong>{player.ceiling}</strong></span>
      </div>
      <p><strong>Volume:</strong> {player.projectedVolume}</p>
      <p><strong>Matchup:</strong> {player.matchup}</p>
      <SourceMeta provenance={player.provenance} compact />
    </article>
  );
}

function TeamsPage({ teamSlug }: { teamSlug?: string }) {
  const team = teamSlug ? getTeamBySlug(teamSlug) : undefined;
  if (team) return <TeamDetail team={team} />;

  return (
    <>
      <PageHeading
        eyebrow="SEASON-AWARE MEMBERSHIP"
        title="All 138 FBS programs for 2026."
        description="Conference affiliation, AP rank, record, and a strength index derived from published SOS ratings."
      />
      <section className="team-directory content-section">
        {teams.map((item) => (
          <a href={`/teams/${item.slug}`} key={item.id}>
            <Monogram team={item} />
            <span><small>{item.conference} · {item.subdivision}</small><strong>{item.name}</strong><em>{item.record}</em></span>
            <b>{item.strength}</b>
          </a>
        ))}
      </section>
    </>
  );
}

function TeamDetail({ team }: { team: Team }) {
  const teamGames = games.filter((game) => game.awayTeamId === team.id || game.homeTeamId === team.id);
  const coach = coaches.find((item) => item.teamId === team.id);
  const stadium = stadiums.find((item) => item.teamId === team.id);
  const roster = getRoster(team.slug);
  const depth = getDepthChart(team.slug);
  const injuries = getInjuries(team.slug);
  const seasons = getTeamSeasons(team.slug);
  const ratings = getTeamRatings(team.slug);
  const ratingBySeason = new Map(ratings.map((row) => [row.season, row]));
  const leaders = getTeamLeaders(team.slug);
  return (
    <>
      <div className="team-page-hero">
        <Monogram team={team} size="lg" />
        <div><span className="eyebrow">{team.conference} · {team.subdivision}</span><h1>{team.name}</h1><p>{team.record} · strength index {team.strength}</p></div>
        <Freshness provenance={team.provenance} />
      </div>
      <section className="team-kpis">
        <div><span>AP rank</span><strong>{team.rank ? `No. ${team.rank}` : "Unranked"}</strong></div>
        <div><span>Record</span><strong>{team.record}</strong></div>
        <div><span>Strength index</span><strong>{team.strength}</strong></div>
        <div><span>Coverage</span><strong>{percent(team.provenance.confidence)}</strong></div>
      </section>
      <section className="dashboard-grid content-section">
        <div className="dashboard-panel dashboard-panel--wide">
          <SectionHeading eyebrow="SCHEDULE" title="Relevant games" />
          <div className="portal-list">
            {teamGames.length ? teamGames.map((game) => (
              <a className="portal-row" href={`/games/${game.id}`} key={game.id}>
                <span className={`status status--${game.status}`}>{game.status}</span>
                <span><strong>{teamFor(game.awayTeamId).shortName} at {teamFor(game.homeTeamId).shortName}</strong><small>{game.kickoffLabel} · {game.venue}</small></span>
                <b>{game.statusDetail}</b>
              </a>
            )) : <p className="panel-note">No games in this sample window.</p>}
          </div>
        </div>
        <div className="dashboard-panel">
          <SectionHeading eyebrow="COACHING" title={coach?.name ?? "Head coach not listed"} href={coach ? `/coaches/${coach.slug}` : "/coaches"} />
          <p>{coach ? `${coach.title} · ${coach.record}` : "The dataset does not list a head coach for this program."}</p>
        </div>
        <div className="dashboard-panel">
          <SectionHeading eyebrow={`AVAILABILITY · AS OF ${injuriesAsOf ?? "LATEST"}`} title="Injury report" />
          {injuries && injuries.players.length > 0 ? (
            <div className="portal-list">
              {injuries.players.slice(0, 8).map((player) => (
                <div className="portal-row" key={player.name}>
                  <span className={`portal-status portal-status--${player.status === "out" ? "withdrawn" : "available"}`}>{player.status}</span>
                  <span><strong>{player.name}</strong><small>{player.position}{player.injury ? ` · ${player.injury}` : ""}</small></span>
                </div>
              ))}
              {injuries.players.length > 8 ? <p className="panel-note">+{injuries.players.length - 8} more on the full report</p> : null}
            </div>
          ) : (
            <p className="panel-note">
              {injuries ? "No players listed on the latest availability report." : "No availability report published for this team in the dataset."}
            </p>
          )}
        </div>
        <div className="dashboard-panel">
          <SectionHeading eyebrow="HISTORY" title="Season by season" />
          {seasons.length ? (
            <div className="portal-list">
              {seasons.slice(0, 5).map((row) => {
                const rating = ratingBySeason.get(row.season);
                return (
                  <div className="portal-row" key={row.season}>
                    <span className="status status--final">{row.season}</span>
                    <span>
                      <strong>{row.g ?? "—"} games{rating?.record ? ` · ${rating.record}` : ""}</strong>
                      <small>
                        {row.op != null ? `${row.op} pts/g for · ${row.dp ?? "—"} against` : "rates not listed"}
                        {rating?.feiRank ? ` · FEI No. ${rating.feiRank}` : ""}
                        {rating?.spRank ? ` · SP+ No. ${rating.spRank}` : ""}
                      </small>
                    </span>
                    <b>{rating?.spPlus != null ? `SP+ ${rating.spPlus}` : row.oy != null ? `${row.oy} yds/g` : "—"}</b>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="panel-note">Historical season data is not published for this program.</p>
          )}
        </div>
        <div className="dashboard-panel">
          <SectionHeading eyebrow="LEADERBOARD HISTORY" title="Top-10 finishes" />
          {leaders.length ? (
            <div className="portal-list">
              {leaders.slice(0, 8).map((row, index) => (
                <div className="portal-row" key={`${row.season}-${row.category}-${row.player}-${index}`}>
                  <span className="status status--scheduled">{row.season}</span>
                  <span>
                    <strong>{row.player ?? "Unlisted"}</strong>
                    <small>{row.category}</small>
                  </span>
                  <b>No. {row.rank}</b>
                </div>
              ))}
              {leaders.length > 8 ? <p className="panel-note">+{leaders.length - 8} more top-10 finishes since 2012</p> : null}
            </div>
          ) : (
            <p className="panel-note">No top-10 national leaderboard finishes recorded for this program since 2012.</p>
          )}
        </div>
        <div className="dashboard-panel dashboard-panel--wide">
          <SectionHeading eyebrow="DEPTH CHART" title={depth?.status ? `${depth.status.charAt(0)}${depth.status.slice(1).toLowerCase()} two-deep` : "Projected two-deep"} />
          {depth ? (
            <div className="portal-list">
              {depth.units.map((unit) => (
                <div key={unit.unit} className="portal-row">
                  <span className="status status--scheduled">{unit.unit.replace("_", " ")}</span>
                  <span>
                    <strong>
                      {unit.positions.slice(0, 6).map((position) => {
                        const line = position.depth
                          .slice(0, 2)
                          .map((slot) => slot.players.map((player) => player.name).join(" / "))
                          .filter(Boolean)
                          .join(" · ");
                        return line ? `${position.position}: ${line}` : null;
                      })
                        .filter(Boolean)
                        .join(" · ")}
                    </strong>
                    <small>{depth.schemes?.offense ?? ""}{depth.schemes?.defense ? ` / ${depth.schemes.defense}` : ""}{depth.status_caveat ? ` · ${depth.status_caveat}` : ""}</small>
                  </span>
                </div>
              ))}
              <p className="panel-note">First six positions per unit shown; the full chart carries every listed position.</p>
            </div>
          ) : (
            <p className="panel-note">Depth chart not available for this team — the research package covers the seven rostered conferences (92 of 138 programs).</p>
          )}
        </div>
        <div className="dashboard-panel dashboard-panel--wide">
          <SectionHeading
            eyebrow="ROSTER"
            title={roster?.counts ? `${roster.counts.players} players listed` : "Roster"}
          />
          {roster ? (
            <div className="portal-list">
              {roster.position_groups.map((group) => (
                <div className="portal-row" key={group.name}>
                  <span className="status status--scheduled">{group.name}</span>
                  <span>
                    <strong>{group.players.slice(0, 5).map((player) => player.name).join(" · ")}</strong>
                    <small>{group.players.length} players{roster.head_coach ? ` · ${roster.head_coach}` : ""}</small>
                  </span>
                </div>
              ))}
              <p className="panel-note">Top names per group shown; full roster tables ship with the roster pages.</p>
            </div>
          ) : (
            <p className="panel-note">Roster not available for this team — the research package covers the seven rostered conferences (92 of 138 programs).</p>
          )}
        </div>
        <div className="dashboard-panel">
          <SectionHeading eyebrow="GAMEDAY" title={stadium?.name ?? "Venue guide pending"} href={stadium ? `/stadiums/${stadium.slug}` : "/stadiums"} />
          <p>{stadium ? `${stadium.city} · last verified ${stadium.lastVerified}` : "Venue guides return once stadium data joins the dataset."}</p>
        </div>
      </section>
    </>
  );
}

function StadiumsPage({ stadiumSlug }: { stadiumSlug?: string }) {
  const stadium = stadiumSlug ? getStadiumBySlug(stadiumSlug) : undefined;
  if (stadium) return <StadiumDetail slug={stadium.slug} />;
  return (
    <>
      <PageHeading
        eyebrow="GAMEDAY FIELD NOTES"
        title="Parking, bags, transit, and the gate."
        description="Venue guides return once stadium data joins the research dataset."
      />
      {stadiums.length === 0 ? (
        <section className="content-section">
          <article className="win-model-card">
            <div>
              <span className="eyebrow">NOT AVAILABLE IN THIS DATASET</span>
              <strong>Stadium guides</strong>
            </div>
            <p>
              Parking, bag policy, transit, and accessibility briefs are not part of the 2026
              research package. They turn on when venue data joins a future release.
            </p>
          </article>
        </section>
      ) : (
        <section className="stadium-grid content-section">
          {stadiums.map((item) => {
            const team = teamFor(item.teamId);
            return (
              <a href={`/stadiums/${item.slug}`} key={item.slug}>
                <div className="stadium-visual"><span>{team.monogram}</span><i /></div>
                <div><small>{item.city}</small><h2>{item.name}</h2><p>{item.capacity.toLocaleString()} capacity · verified {item.lastVerified}</p></div>
                <span>Open guide →</span>
              </a>
            );
          })}
        </section>
      )}
    </>
  );
}

function StadiumDetail({ slug }: { slug: string }) {
  const stadium = getStadiumBySlug(slug) ?? stadiums[0];
  const team = teamFor(stadium.teamId);
  const items = [
    ["Parking", stadium.parking],
    ["Transit & shuttle", stadium.transit],
    ["Clear-bag policy", stadium.clearBag],
    ["Tailgating", stadium.tailgating],
    ["Visitor section", stadium.visitorSection],
    ["Accessibility", stadium.accessibility],
  ];
  return (
    <>
      <div className="stadium-hero">
        <div><span className="eyebrow">{team.shortName} · VENUE GUIDE</span><h1>{stadium.name}</h1><p>{stadium.address} · {stadium.capacity.toLocaleString()} capacity</p></div>
        <div className="stadium-map" role="img" aria-label={`Stylized map placeholder for ${stadium.name}`}>
          <span>{team.monogram}</span><i /><b>MAP PROVIDER NOT CONFIGURED</b>
        </div>
      </div>
      <section className="content-section stadium-detail-grid">
        {items.map(([title, copy]) => (
          <article key={title}><span className="eyebrow">{title}</span><p>{copy}</p></article>
        ))}
        <article className="stadium-detail-grid__source">
          <SourceMeta provenance={stadium.provenance} />
          <a href={`/corrections?record=stadium-${stadium.slug}`}>Report a guide issue →</a>
        </article>
      </section>
    </>
  );
}

function RankingsPage() {
  return (
    <>
      <PageHeading
        eyebrow="STRENGTH INDEX"
        title="Strength without borrowed black boxes."
        description="This index is derived from published SOS ratings. It is not SP+, FPI, or a committee ranking."
      />
      <section className="content-section">
        <div className="rankings-list">
          {[...teams].sort((a, b) => b.strength - a.strength).map((team, index) => (
            <a href={`/teams/${team.slug}`} key={team.id}>
              <b>{index + 1}</b><Monogram team={team} size="sm" />
              <span><strong>{team.name}</strong><small>{team.conference} · {team.record}</small></span>
              <div className="rank-bar"><span style={{ width: `${team.strength}%` }} /></div>
              <em>{team.strength}</em>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}

function WatchPage() {
  return (
    <>
      <PageHeading
        eyebrow="AUTHORIZED DESTINATIONS"
        title="Know where the game is. Never fake the stream."
        description="This preview does not embed, retransmit, or invent broadcast, radio, ticket, or operator destinations."
      />
      <section className="content-section provider-cards" id="radio">
        {[
          ["Broadcast schedule", "Provider not configured", "A licensed schedule feed is required before network and streaming destinations can display."],
          ["Local radio", "Provider not configured", "Only school, network, or station-authorized destinations may appear."],
          ["Ticket inventory", "No partner active", "The preview does not invent availability, pricing, or affiliate status."],
        ].map(([title, status, copy]) => (
          <article key={title}><span className="provider-state provider-state--off">{status}</span><h2>{title}</h2><p>{copy}</p><a href="/data-sources">Review dependency →</a></article>
        ))}
      </section>
    </>
  );
}

function SearchPage() {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!normalized) return [];
    return [
      ...teams.filter((team) => team.name.toLowerCase().includes(normalized)).map((team) => ({ href: `/teams/${team.slug}`, label: team.name, type: "Team" })),
      ...coaches.filter((coach) => coach.name.toLowerCase().includes(normalized)).map((coach) => ({ href: `/coaches/${coach.slug}`, label: coach.name, type: "Coach" })),
      ...stadiums.filter((stadium) => stadium.name.toLowerCase().includes(normalized)).map((stadium) => ({ href: `/stadiums/${stadium.slug}`, label: stadium.name, type: "Stadium" })),
      ...portalEvents.filter((event) => event.player.toLowerCase().includes(normalized)).map((event) => ({ href: `/players/${event.playerSlug}`, label: event.player, type: "Player" })),
    ];
  }, [normalized]);
  return (
    <>
      <PageHeading eyebrow="SEARCH" title="Find the next useful answer." description="Search teams, coaches, and stadiums from the 2026 dataset. Internal search is always noindexed." />
      <section className="search-panel content-section">
        <label htmlFor="site-search">Search the Hub</label>
        <input id="site-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try North Coast, Mara Vance, or Harbor Field" />
        {normalized ? (
          results.length ? <div className="search-results">{results.map((result) => <a href={result.href} key={`${result.type}-${result.href}`}><span>{result.type}</span><strong>{result.label}</strong><b>→</b></a>)}</div>
          : <EmptyState title="No matching record." copy="Try another team or coach." />
        ) : <p>Start typing to search the 2026 dataset.</p>}
      </section>
    </>
  );
}

function NewsletterPage() {
  const [state, setState] = useState<"form" | "pending" | "confirmed" | "unsubscribed">("form");
  const [email, setEmail] = useState("");
  if (state === "unsubscribed") return <SimpleStatus title="You are unsubscribed in the development mail sink." copy="No live message was sent and no production email provider is connected." action={() => setState("form")} actionLabel="Start again" />;
  return (
    <>
      <PageHeading eyebrow="DEVELOPMENT MAIL SINK" title="The Saturday Brief, on your terms." description="A complete double-opt-in and preference flow with no live campaign delivery." />
      <section className="newsletter-page content-section">
        <form onSubmit={(event) => { event.preventDefault(); if (email) setState("pending"); }}>
          <label>Email address<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="fan@example.com" /></label>
          <fieldset><legend>Choose preferences</legend>
            {["Weekly scoreboard", "Portal alerts", "Playoff scenarios", "Coaching carousel", "Stadium & gameday"].map((item) => <label className="check-row" key={item}><input type="checkbox" defaultChecked={item === "Weekly scoreboard"} /><span>{item}</span></label>)}
          </fieldset>
          <label className="check-row"><input type="checkbox" required /><span>I agree to receive the selected development-mode emails. Unsubscribe is always available.</span></label>
          <button className="button button--gold" type="submit">Request confirmation</button>
        </form>
        <aside>
          <span className="eyebrow">DELIVERY STATE</span>
          {state === "pending" ? (
            <>
              <h2>Confirmation captured locally.</h2>
              <p>The development mail sink would send a confirmation link. No live provider is configured.</p>
              <button className="button button--light" type="button" onClick={() => setState("confirmed")}>Simulate confirmation</button>
            </>
          ) : state === "confirmed" ? (
            <>
              <h2>Preferences confirmed.</h2>
              <p>Your subscription is active only in this browser session.</p>
              <button className="button button--ghost" type="button" onClick={() => setState("unsubscribed")}>Unsubscribe</button>
            </>
          ) : (
            <>
              <h2>No production address stored.</h2>
              <p>Double opt-in, unsubscribe, preference segmentation, and suppression behavior are documented before provider activation.</p>
            </>
          )}
        </aside>
      </section>
    </>
  );
}

function CorrectionsPage() {
  const [submitted, setSubmitted] = useState(false);
  if (submitted) return <SimpleStatus title="Correction received." copy="Case CORR-2026-104 was created locally. No personal information was transmitted." action={() => setSubmitted(false)} actionLabel="Report another issue" />;
  return (
    <>
      <PageHeading eyebrow="TRUST WORKFLOW" title="See something wrong? Put it on the record." description="Corrections append a new version; they never silently rewrite historical predictions or source lineage." />
      <form className="correction-form content-section" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
        <label>Page or record ID<input name="record" defaultValue="Current page" maxLength={120} /></label>
        <label>Issue category<select><option>Score or schedule</option><option>Roster or transfer</option><option>Contract or coach</option><option>Stadium guide</option><option>Source or rights</option><option>Other</option></select></label>
        <label>What should we review?<textarea required minLength={20} maxLength={1200} placeholder="Describe the discrepancy and include a public source when possible." /></label>
        <label>Public source URL (optional)<input type="url" placeholder="https://..." /></label>
        <p>No sensitive medical details, private forum content, or paywalled material. High-risk identity, privacy, and rights issues are quarantined first.</p>
        <button className="button button--gold" type="submit">Submit correction</button>
      </form>
    </>
  );
}

function MethodologyPage() {
  const cards = [
    ["Matchup concept", "A future production model would combine play value, pace, continuity, context, and uncertainty; no such trained model or validation artifact ships here."],
    ["Portal concept", "This surface documents the position, usage, and continuity views. No portal-impact calculation is implemented, and NIL estimates are excluded."],
    ["Playoff simulation", "The implemented seeded Monte Carlo uses the 138-team field, bounded runs, validated ±6 forced-game adjustments, explicit precision, and an approximate committee order. It is not a season results engine."],
    ["Coaching concept", "Hot-seat context is not published in the current dataset and is never treated as a firing probability. A future production method would require performance, roster, tenure, administration, and verified contract inputs."],
    ["DFS concept", "Floor, median, ceiling, volume, and availability projections would power the gated interface; none ship in this release. No trained projection model or backtest ships in this preview."],
  ];
  return (
    <>
      <PageHeading eyebrow="MODEL GOVERNANCE" title="Understand the number before you trust it." description="Every consequential estimate carries a model version, as-of time, source state, confidence, and accessible explanation." />
      <section className="method-grid content-section">
        {cards.map(([title, copy], index) => <article id={index === 1 ? "portal" : index === 3 ? "coaching" : undefined} key={title}><span>0{index + 1}</span><h2>{title}</h2><p>{copy}</p><a href="/data-sources">Inspect source policy →</a></article>)}
      </section>
    </>
  );
}

function DesignSystemPage() {
  const tokens = [
    ["Night", "#07100D", "Primary field"],
    ["Press Box", "#10201A", "Raised surface"],
    ["Signal", "#F4C95D", "Primary action"],
    ["Field", "#9FD356", "Positive state"],
    ["Chalk", "#F1F5EC", "Primary text"],
    ["Fog", "#9BA9A1", "Secondary text"],
  ];
  return (
    <>
      <PageHeading
        eyebrow="LIVING PRODUCT LANGUAGE"
        title="Night Game Ledger"
        description="A compact system for dense Saturday information: high contrast, visible state, restrained motion, and utility before decoration."
      />
      <section className="design-system content-section">
        <article>
          <span className="eyebrow">COLOR TOKENS</span>
          <h2>One dark field, a disciplined signal palette.</h2>
          <div className="token-grid">
            {tokens.map(([name, value, use]) => (
              <div key={name}>
                <span className="token-swatch" style={{ background: value }} aria-hidden="true" />
                <strong>{name}</strong><code>{value}</code><small>{use}</small>
              </div>
            ))}
          </div>
        </article>
        <article>
          <span className="eyebrow">INTERACTION STATES</span>
          <h2>Actions say what will happen.</h2>
          <div className="component-row">
            <button className="button button--gold" type="button">Primary action</button>
            <a className="button button--ghost" href="/methodology">Secondary link</a>
            <button className="button button--ghost" type="button" disabled>Unavailable</button>
          </div>
          <p className="design-note">Keyboard focus is always visible. Disabled controls remain legible and pair with an explanation in product flows.</p>
        </article>
        <article>
          <span className="eyebrow">STATUS & PROVENANCE</span>
          <h2>State belongs next to the claim.</h2>
          <div className="component-row">
            <span className="provider-state provider-state--on">verified</span>
            <span className="provider-state provider-state--off">not configured</span>
            <span className="status status--live">demo state</span>
          </div>
          <p className="design-note">Dataset, modeled, verified, estimated, stale, and unavailable states never share the same visual treatment.</p>
        </article>
        <article>
          <span className="eyebrow">TYPE & SPACING</span>
          <h2 className="design-display">A scoreboard voice with editorial restraint.</h2>
          <p className="design-note">Display headlines compress; body copy breathes. The spacing scale is 4, 8, 12, 16, 24, 32, 48, and 72 pixels.</p>
        </article>
      </section>
    </>
  );
}

function DataSourcesPage() {
  return (
    <>
      <PageHeading eyebrow="PROVENANCE & PROVIDER HEALTH" title="No source, no silent claim." description="Production providers fail closed. The site never swaps data invisibly after an outage." />
      <section className="content-section provider-table">
        {providerHealth.map((provider) => (
          <article key={provider.id}>
            <span className={`provider-state provider-state--${provider.status === "operational" ? "on" : "off"}`}>{provider.status.replaceAll("_", " ")}</span>
            <div><h2>{provider.label}</h2><p>{provider.note}</p></div>
            <div><span>Mode</span><strong>{provider.mode}</strong></div>
            <div><span>Cadence</span><strong>{provider.cadence}</strong></div>
          </article>
        ))}
      </section>
    </>
  );
}

function PolicyPage({ kind }: { kind: string }) {
  const content: Record<string, { eyebrow: string; title: string; intro: string; sections: [string, string][] }> = {
    about: {
      eyebrow: "INDEPENDENCE STATEMENT",
      title: "Built for the Saturday task, not the scroll.",
      intro: `${brand.name} is a conference-neutral product concept for transparent utility, accessible models, and maintained gameday information.`,
      sections: [["What we value", "Speed, source visibility, corrections, calm monetization, and understandable uncertainty."], ["What we do not do", "No paywall bypasses, fabricated live states, unlicensed marks, guaranteed picks, autoplay, or commercial ranking disguised as editorial judgment."]],
    },
    privacy: {
      eyebrow: "DRAFT FOR COUNSEL",
      title: "Privacy notice — preview draft",
      intro: "This site stores only device-local mode and favorite preferences. No production analytics, email, advertising, or precise location provider is active.",
      sections: [["Data minimization", "Future services may process account identity, newsletter email, coarse consent attestation, and short-lived abuse logs only for stated purposes."], ["Your choices", "Production activation requires access, correction, deletion, consent withdrawal, and processor workflows reviewed by counsel."]],
    },
    terms: {
      eyebrow: "DRAFT FOR COUNSEL",
      title: "Terms of use — preview draft",
      intro: "Dataset information and model outputs are informational, not live facts, financial advice, legal advice, or a guarantee of any event.",
      sections: [["Permitted use", "Use the preview to evaluate product behavior. Verify critical facts against the cited sources."], ["External services", "Future destinations remain subject to their own terms and may be unavailable by jurisdiction."]],
    },
    "affiliate-disclosure": {
      eyebrow: "COMMERCIAL TRANSPARENCY",
      title: "Affiliate disclosure",
      intro: "No affiliate program or paid referral is active in this preview.",
      sections: [["Future links", "Eligible commercial links will be labeled near the action, use sponsored/nofollow attributes, and pass through an auditable allowlist."], ["Editorial firewall", "Commercial compensation will never determine model probabilities, editorial ranking, source verification, or correction outcomes."]],
    },
    "responsible-gaming": {
      eyebrow: "INFORMATIONAL MODELS ONLY",
      title: "Responsible gaming",
      intro: "The preview does not accept wagers, direct users to an operator, or guarantee a result.",
      sections: [["Optional mode", "Odds & DFS Mode requires a deliberate adult/coarse-jurisdiction attestation and can be turned off in one action."], ["Know the risk", "Probability and projection models are uncertain. Never chase losses or treat a projection as a promise. Jurisdiction-specific helplines must be supplied through an approved current source before launch."]],
    },
  };
  const page = content[kind] ?? content.about;
  return (
    <>
      <PageHeading eyebrow={page.eyebrow} title={page.title} description={page.intro} />
      <section className="policy-content content-section">
        {page.sections.map(([title, copy]) => <article key={title}><h2>{title}</h2><p>{copy}</p></article>)}
        <p className="legal-note">Generated draft language is not legal advice or final legal approval.</p>
      </section>
    </>
  );
}

function CommercialPage({ kind }: { kind: "advertise" | "partnerships" | "media-kit" }) {
  const isAdvertise = kind === "advertise";
  const isKit = kind === "media-kit";
  return (
    <>
      <PageHeading
        eyebrow="PARTNERSHIP STUDIO"
        title={isAdvertise ? "Reach fans after the utility, never before it." : isKit ? "A trust-first media system." : "Build useful Saturday partnerships."}
        description="No ads, partner IDs, official-status claims, applications, agreements, or paid campaigns are active in this preview."
      />
      <section className="commercial-grid content-section">
        {[
          ["Scoreboard adjacency", "Reserved below primary utility, never disguised as a game card, with fixed dimensions to protect layout stability."],
          ["Gameday guides", "Contextual travel, parking, transit, ticket, and tourism opportunities subject to rights and destination review."],
          ["Newsletter studio", "Consent-based weekly, portal, playoff, coaching, and stadium segments with separate optional DFS content."],
          ["Research partnerships", "Provider, conference, event, and academic opportunities with commercial/editorial separation."],
        ].map(([title, copy]) => <article key={title}><span className="sponsor-placeholder">SPONSOR-SAFE ZONE</span><h2>{title}</h2><p>{copy}</p></article>)}
      </section>
      <section className="inquiry-band"><div><span className="eyebrow">NO LIVE SUBMISSION</span><h2>Partnership inquiry workflow is staged, not activated.</h2><p>Legal entity, inventory, rates, measurement, privacy, and approval owners must be configured first.</p></div><a className="button button--light" href="/affiliate-disclosure">Read the commercial firewall</a></section>
    </>
  );
}

function GenericDirectory({ kind, conferenceSlug }: { kind: "coaches" | "conferences" | "players"; conferenceSlug?: string }) {
  if (kind === "coaches") return <CoachingPage />;
  if (kind === "conferences") {
    const conferences = [...new Set(teams.map((team) => team.conference))].filter(
      (conference) =>
        !conferenceSlug || conference.toLowerCase().replaceAll(" ", "-") === conferenceSlug,
    );
    return (
      <>
        <PageHeading eyebrow="SEASON-AWARE STRUCTURE" title="Conference membership is data, not a constant." description="Conference affiliation is versioned to the 2026 dataset, not hardcoded." />
        <section className="conference-grid content-section">{conferences.map((conference) => {
          const members = teams.filter((team) => team.conference === conference);
          return <article key={conference}><span className="eyebrow">{members.length} members</span><h2>{conference}</h2><div>{members.map((team) => <a href={`/teams/${team.slug}`} key={team.id}>{team.shortName}<b>{team.record}</b></a>)}</div></article>;
        })}</section>
      </>
    );
  }
  return <SearchPage />;
}

function PlayerPage({ slug }: { slug: string }) {
  const portal = portalEvents.find((event) => event.playerSlug === slug);
  const dfs = dfsPlayers.find((player) => player.slug === slug);
  if (!portal && !dfs) return <NotFoundPage />;
  const playerName = portal?.player ?? dfs!.name;
  const currentTeamId = portal?.toTeamId ?? dfs?.teamId ?? portal?.fromTeamId;
  const currentTeam = currentTeamId ? teamFor(currentTeamId) : null;
  return (
    <>
      <PageHeading eyebrow="PLAYER RECORD" title={playerName} description={`${portal?.position ?? dfs?.position} · ${currentTeam?.shortName ?? "Available"} · source and model states remain separate.`} />
      <section className="player-layout content-section">
        {portal ? <article><span className="eyebrow">PORTAL EVENT</span><h2>{teamFor(portal.fromTeamId).shortName} → {portal.toTeamId ? teamFor(portal.toTeamId).shortName : "Available"}</h2><p>{portal.snaps ?? "Unknown"} prior snaps · impact {signed(portal.impact)} · {percent(portal.confidence)} confidence</p><SourceMeta provenance={portal.provenance} /></article> : null}
        {dfs ? <DfsCard player={dfs} /> : <article><span className="eyebrow">DFS STATE</span><h2>No projection available.</h2><p>Missing data remains an explicit empty state.</p></article>}
        <article><span className="eyebrow">CORRECTIONS</span><h2>Identity and status issues are quarantined first.</h2><a href={`/corrections?record=player-${slug}`}>Report a data issue →</a></article>
      </section>
    </>
  );
}

function NewsletterBand() {
  return (
    <section className="newsletter-band">
      <div><span className="eyebrow">THE SATURDAY BRIEF</span><h2>One clean read before the games get loud.</h2><p>Scoreboard, playoff pressure, verified portal movement, and gameday notes. Development mail sink only.</p></div>
      <a className="button button--light" href="/newsletter">Choose your brief</a>
    </section>
  );
}

function ResponsibleGamingNotice() {
  return (
    <aside className="responsible-notice">
      <strong>Informational estimates, not promises.</strong>
      <span>No operator action is configured. Availability and legality vary by jurisdiction.</span>
      <a href="/responsible-gaming">Responsible-gaming controls →</a>
    </aside>
  );
}

function EmptyState({ title, copy, href, action }: { title: string; copy: string; href?: string; action?: string }) {
  return (
    <div className="empty-state">
      <span aria-hidden="true">—</span><h2>{title}</h2><p>{copy}</p>
      {href ? <a className="button button--ghost" href={href}>{action}</a> : null}
    </div>
  );
}

function SimpleStatus({ title, copy, action, actionLabel }: { title: string; copy: string; action: () => void; actionLabel: string }) {
  return <section className="simple-status"><span aria-hidden="true">✓</span><h1>{title}</h1><p>{copy}</p><button className="button button--gold" type="button" onClick={action}>{actionLabel}</button></section>;
}

function NotFoundPage() {
  return <EmptyState title="That route is not in the field." copy="The URL may be old, incomplete, or intentionally unavailable." href="/scores" action="Return to scores" />;
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__brand"><span className="brand__mark">H</span><div><strong>{brand.name}</strong><p>Independent utility. Transparent models. Saturday ready.</p></div></div>
      <div className="site-footer__links">
        <div><strong>Product</strong>{utilityNavigation.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}</div>
        <div><strong>Trust</strong><a href="/about">About</a><a href="/corrections">Corrections</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div>
        <div><strong>Business</strong><a href="/advertise">Advertise</a><a href="/partnerships">Partnerships</a><a href="/media-kit">Media kit</a><a href="/affiliate-disclosure">Affiliate disclosure</a></div>
      </div>
      <div className="site-footer__bottom"><span>© 2026 {brand.name} · independent analytics</span><span>2026 FBS dataset · compiled 2026-09-05</span></div>
    </footer>
  );
}

export function HubApp({ path = "/" }: { path?: string }) {
  const [mode, setMode] = useState<Mode>("clean");
  const [modeDialogOpen, setModeDialogOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    const storedMode = window.localStorage.getItem("cfb-hub:mode");
    const storedDisclosure = window.localStorage.getItem("cfb-hub:disclosure-version");
    const storedFavorites = window.localStorage.getItem("cfb-hub:favorites");
    queueMicrotask(() => {
      if (storedMode === "analysis" && storedDisclosure === disclosureVersion) setMode("analysis");
      if (storedFavorites) {
        try {
          setFavorites(new Set(JSON.parse(storedFavorites) as string[]));
        } catch {
          window.localStorage.removeItem("cfb-hub:favorites");
        }
      }
    });
  }, []);

  const enableAnalysis = () => {
    setMode("analysis");
    setModeDialogOpen(false);
    window.localStorage.setItem("cfb-hub:mode", "analysis");
    window.localStorage.setItem("cfb-hub:disclosure-version", disclosureVersion);
  };

  const enableClean = () => {
    setMode("clean");
    window.localStorage.setItem("cfb-hub:mode", "clean");
  };

  const toggleFavorite = (teamId: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      window.localStorage.setItem("cfb-hub:favorites", JSON.stringify([...next]));
      return next;
    });
  };

  const normalizedPath = `/${path.split("?")[0].split("#")[0].replace(/^\/+|\/+$/g, "")}`.replace("//", "/");
  const parts = normalizedPath.split("/").filter(Boolean);
  const root = parts[0] ?? "";
  let content: React.ReactNode;
  const common = { mode, favorites, onFavorite: toggleFavorite };

  if (!root) content = <HomePage {...common} />;
  else if (root === "scores") content = <ScoresPage {...common} />;
  else if (root === "schedule") content = <SchedulePage {...common} />;
  else if (root === "games" && parts[1]) content = <GamePage gameId={parts[1]} {...common} />;
  else if (root === "transfer-portal") content = <PortalPage teamSlug={parts[1]} />;
  else if (root === "playoff-predictor") content = <PlayoffPage />;
  else if (root === "coaching-carousel") content = <CoachingPage />;
  else if (root === "coaches") content = parts[1] ? <CoachingPage coachSlug={parts[1]} /> : <GenericDirectory kind="coaches" />;
  else if (root === "dfs") content = <DfsPage mode={mode} onModeRequest={() => setModeDialogOpen(true)} />;
  else if (root === "teams") content = <TeamsPage teamSlug={parts[1]} />;
  else if (root === "players" && parts[1]) content = <PlayerPage slug={parts[1]} />;
  else if (root === "conferences") content = <GenericDirectory kind="conferences" conferenceSlug={parts[1]} />;
  else if (root === "stadiums") content = <StadiumsPage stadiumSlug={parts[1]} />;
  else if (root === "watch") content = <WatchPage />;
  else if (root === "rankings") content = <RankingsPage />;
  else if (root === "search") content = <SearchPage />;
  else if (root === "newsletter") content = <NewsletterPage />;
  else if (root === "methodology") content = <MethodologyPage />;
  else if (root === "data-sources") content = <DataSourcesPage />;
  else if (root === "corrections") content = <CorrectionsPage />;
  else if (["about", "privacy", "terms", "affiliate-disclosure", "responsible-gaming"].includes(root)) content = <PolicyPage kind={root} />;
  else if (["advertise", "partnerships", "media-kit"].includes(root)) content = <CommercialPage kind={root as "advertise" | "partnerships" | "media-kit"} />;
  else if (root === "design-system") content = <DesignSystemPage />;
  else content = <NotFoundPage />;

  return (
    <div className="app-shell">
      <Header
        activePath={normalizedPath}
        mode={mode}
        onModeRequest={() => setModeDialogOpen(true)}
        onCleanMode={enableClean}
      />
      <ScoreRibbon />
      <main id="main-content">{content}</main>
      <Footer />
      <ModeDialog open={modeDialogOpen} onClose={() => setModeDialogOpen(false)} onConfirm={enableAnalysis} />
    </div>
  );
}
