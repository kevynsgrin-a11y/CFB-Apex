"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  coaches,
  dfsPlayers,
  games,
  fantasyNotes,
  fantasyNotesAsOf,
  fantasyNotesContext,
  getCoachBySlug,
  getDepthChart,
  getGame,
  getInjuries,
  getPreseasonRating,
  getRoster,
  getSchemes,
  getStaff,
  getStadiumBySlug,
  getTeam,
  getTeamBySlug,
  getTeamLeaders,
  getTeamRatings,
  getTeamSeasons,
  injuriesAsOf,
  modelEstimatesAvailable,
  broadcastAsOf,
  broadcastNote,
  timeEtLabel,
  tvRows,
  tvRowsForWeek,
  tvWeeks,
  pollTables,
  pollsStatusNote,
  portalAsOf,
  portalCountsFor,
  portalEvents,
  portalStatusNote,
  providerHealth,
  radioAsOf,
  radioForTeam,
  scenarioGames,
  searchPlayers,
  seasonRules,
  stadiums,
  teams,
} from "@/lib/cfb-dataset";
import {
  brand,
  disclosureVersion,
} from "@/lib/config";
import { calculateBuyout } from "@/lib/contracts";
import { normalizeForcedOutcomes, runPlayoffSimulation, type ForcedOutcomes } from "@/lib/simulation";
import type { DfsPlayer, Game, Provenance, Team } from "@/lib/types";
import { ticketAffiliatesConfigured, ticketLinksForTeam } from "@/lib/affiliates";
import { SourceMeta } from "./SourceMeta";
import { BroadcastHeader } from "./broadcast/header";
import { ScoreTicker } from "./broadcast/score-ticker";
import { BroadcastFooter } from "./broadcast/footer";
import { BroadcastHomepage } from "./broadcast/homepage";
import { homepageData, tickerGames } from "@/lib/homepage-data";

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

/** Dataset teams render as links; external programs (FCS origins) stay plain. */
function teamLabelFor(teamId: string) {
  const team = getTeamBySlug(teamId);
  if (team) return { label: team.shortName, slug: team.slug };
  return {
    label: teamId.replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    slug: null,
  };
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
      className={`monogram monogram--${size}${team.logo ? " monogram--img" : ""}`}
      style={{ "--team-color": team.color } as React.CSSProperties}
      aria-hidden="true"
    >
      {team.logo ? (
        <img src={team.logo} alt="" loading="lazy" decoding="async" />
      ) : (
        team.monogram
      )}
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
          {game.broadcast
            ? game.broadcast
            : game.weather
              ? `${game.weather.temperature}° · ${game.weather.summary}`
              : "Network not assigned"}
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
        description={`Scheduled, final, delayed, and postponed game states with assigned TV networks where locked (${broadcastAsOf ?? "—"} compilation; unlisted games sit on conference plus-networks or await the 6–12 day flex).`}
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

function PortalPage({ teamSlug }: { teamSlug?: string }) {
  const [position, setPosition] = useState("All");
  const [status, setStatus] = useState("All");
  const scopedTeam = teamSlug ? getTeamBySlug(teamSlug) : undefined;
  const positions = ["All", ...new Set(portalEvents.map((event) => event.position).filter(Boolean))].sort();
  const statuses = ["All", ...new Set(portalEvents.map((event) => event.status))];
  const filtered = portalEvents.filter((event) => {
    const teamMatch = !scopedTeam || event.fromTeamId === scopedTeam.id || event.toTeamId === scopedTeam.id;
    const positionMatch = position === "All" || event.position === position;
    const statusMatch = status === "All" || event.status === status;
    return teamMatch && positionMatch && statusMatch;
  });
  const scopedCounts = scopedTeam ? portalCountsFor(scopedTeam.slug) : null;
  const busiest = [...teams]
    .map((team) => ({ team, counts: portalCountsFor(team.slug) }))
    .sort((a, b) => b.counts.incoming + b.counts.outgoing - (a.counts.incoming + a.counts.outgoing))
    .slice(0, 4);

  return (
    <>
      <PageHeading
        eyebrow="PRIORITY 02 · ROSTER VOLATILITY"
        title={scopedTeam ? `${scopedTeam.shortName} portal ledger` : "Roster movement, in the open."}
        description="Verified FBS-to-FBS transfers with dates, positions, and source confidence — no NIL guesswork, no inferred destinations."
        actions={<a className="button button--ghost" href="/methodology#portal">Portal methodology</a>}
      />
      <section className="content-section">
        <article className="win-model-card">
          <div>
            <span className="eyebrow">COMPILED {portalAsOf ?? "—"}</span>
            <strong>
              {portalEvents.length} verified transfers
              {scopedTeam ? ` · ${scopedCounts?.incoming ?? 0} in / ${scopedCounts?.outgoing ?? 0} out (net ${signed(scopedCounts?.net ?? 0)})` : ""}
            </strong>
          </div>
          <p>{portalStatusNote}</p>
        </article>
      </section>
      {portalEvents.length === 0 ? (
        <section className="content-section">
          <article className="win-model-card">
            <div>
              <span className="eyebrow">NOT AVAILABLE IN THIS DATASET</span>
              <strong>Transfer-portal movement</strong>
            </div>
            <p>This surface turns on when portal data joins a future dataset release.</p>
          </article>
        </section>
      ) : (
        <>
          {!scopedTeam ? (
            <section className="portal-summary">
              {busiest.map(({ team, counts }) => (
                <a href={`/transfer-portal/${team.slug}`} className="impact-card" key={team.id}>
                  <div><Monogram team={team} /><span><small>{team.conference}</small><strong>{team.shortName}</strong></span></div>
                  <b>{counts.incoming} in · {counts.outgoing} out</b>
                  <small>Net intake {signed(counts.net)}</small>
                </a>
              ))}
            </section>
          ) : null}
          <section className="content-section">
        <div className="table-tools">
          <div>
            <label>Position
              <select value={position} onChange={(event) => setPosition(event.target.value)}>
                {positions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>Status
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                {statuses.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <span>{filtered.length} records</span>
        </div>
        <section className="data-table-wrap" tabIndex={0} aria-label="Scrollable portal movement table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Player</th><th>Pos</th><th>Origin</th><th>Destination</th><th>Status</th><th>Date</th><th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => {
                const origin = teamLabelFor(event.fromTeamId);
                const destination = event.toTeamId ? teamLabelFor(event.toTeamId) : null;
                return (
                  <tr key={event.id}>
                    <td>
                      <strong>{event.player}</strong>
                      {event.notes ? <small className="portal-note">{event.notes}</small> : null}
                    </td>
                    <td>{event.position}</td>
                    <td>{origin.slug ? <a href={`/teams/${origin.slug}`}>{origin.label}</a> : origin.label}</td>
                    <td>{destination ? (destination.slug ? <a href={`/teams/${destination.slug}`}>{destination.label}</a> : destination.label) : "Open"}</td>
                    <td><span className={`portal-status portal-status--${event.status}`}>{event.status}</span></td>
                    <td>{event.eventDate}</td>
                    <td><span className={`portal-status portal-status--conf-${event.confidence}`}>{event.confidence}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
        <p className="table-caption">
          {portalEvents.filter((event) => event.snaps == null).length} of {portalEvents.length} records have no published snap count; impact scores are not modeled for this dataset.
        </p>
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
            <div><span>Term</span><strong>{coach.contractStart && coach.contractEnd ? `${coach.contractStart} → ${coach.contractEnd}` : coach.contractEnd ? `Through ${coach.contractEnd}` : "Not published"}</strong></div>
            <div><span>Annual salary</span><strong>{coach.annualSalary > 0 ? money.format(coach.annualSalary) : "Not published"}</strong></div>
            <div><span>Total value</span><strong>{coach.totalValue ? money.format(coach.totalValue) : "Not published"}</strong></div>
            <div><span>Guarantee remaining</span><strong>{coach.guaranteedRemaining > 0 ? money.format(coach.guaranteedRemaining) : "Not published"}</strong></div>
            <div><span>Offset mitigation</span><strong>{coach.mitigationApplies ? "Applies" : coach.contractAsOf ? "No offset / not owed" : "Not published"}</strong></div>
            <div><span>Contract record</span><strong>{coach.contractAsOf ? `Through ${coach.contractAsOf}` : "Not published"}</strong></div>
          </div>
          {coach.buyoutSummary ? <p className="panel-note"><strong>Buyout:</strong> {coach.buyoutSummary}</p> : null}
          {coach.contractNote ? <p className="panel-note">{coach.contractNote}</p> : null}
          {coach.contractSources && coach.contractSources.length > 0 ? (
            <p className="panel-note">
              Sources:{" "}
              {coach.contractSources.map((source, index) => (
                <span key={source}>
                  {index > 0 ? " · " : ""}
                  <a href={source} rel="nofollow noreferrer noopener" target="_blank">{new URL(source).hostname.replace(/^www\./, "")}</a>
                </span>
              ))}
            </p>
          ) : null}
          <p className="panel-note">Buyout math below uses your own inputs; the calculator never invents unpublished guarantee figures.</p>
          <div className="timeline">
            <span className="eyebrow">STAFF &amp; SCHEMES</span>
            {(() => {
              const staff = getStaff(team.id);
              const schemes = getSchemes(team.id);
              if (!staff.length && !schemes) {
                return <p className="panel-note">Staff details beyond the head coach are not listed for this program.</p>;
              }
              const roleLabel = (role: string | null, raw: string | null) => {
                if (!role) return raw ?? "Staff";
                const map: Record<string, string> = {
                  hc: "Head Coach",
                  oc: "Offensive Coordinator",
                  co_oc: "Co-OC",
                  dc: "Defensive Coordinator",
                  co_dc: "Co-DC",
                  stc: "Special Teams Coordinator",
                  qb: "QB Coach",
                  rb: "RB Coach",
                  wr: "WR Coach",
                  other: raw ?? "Staff",
                };
                return map[role] ?? raw ?? "Staff";
              };
              return (
                <div className="portal-list">
                  {schemes && (schemes.offense || schemes.defense) ? (
                    <div className="portal-row" key="schemes">
                      <span className="status status--final">SCHEMES</span>
                      <span><strong>{schemes.offense ?? "—"} offense · {schemes.defense ?? "—"} defense</strong><small>As listed in the coaching research file</small></span>
                    </div>
                  ) : null}
                  {staff.slice(0, 10).map((member) => (
                    <div className="portal-row" key={`${member.role}-${member.name}`}>
                      <span className="position-badge">{roleLabel(member.role, member.role_raw).slice(0, 4)}</span>
                      <span><strong>{member.name}</strong><small>{roleLabel(member.role, member.role_raw)}</small></span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
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
  const [teamFilter, setTeamFilter] = useState("All");
  const filteredNotes = fantasyNotes.filter(
    (note) =>
      (position === "All" || note.position === position) &&
      (teamFilter === "All" || note.team === teamFilter),
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
            <h2>Fantasy context, when you ask for it.</h2>
            <p>Enable the optional preview to see reported roles, usage notes, availability, and analyst ranks for Week 1.</p>
            <button className="button button--gold" type="button" onClick={onModeRequest}>Review disclosure</button>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeading
        eyebrow="PRIORITY 05 · FANTASY NOTES"
        title="Roles, usage, and availability — as reported."
        description={`Week 1 college-fantasy notes compiled ${fantasyNotesAsOf ?? "—"} from published analyst boards, official depth charts, and beat reports. Salaries and point projections are never invented; every row cites its sources.`}
      />
      <section className="content-section">
        <div className="scoreboard-summary">
          <div><span>{fantasyNotes.length}</span><small>PLAYERS NOTED</small></div>
          <div><span>{new Set(fantasyNotes.map((note) => note.team)).size}</span><small>PROGRAMS</small></div>
          <div><span>{fantasyNotes.filter((note) => note.projection).length}</span><small>ANALYST RANKS</small></div>
          <div><span>{fantasyNotes.filter((note) => note.availability !== "active").length}</span><small>NOT FULLY AVAILABLE</small></div>
        </div>
        <div className="table-tools">
          <div>
            <label>Position
              <select value={position} onChange={(event) => setPosition(event.target.value)}>
                {["All", "QB", "RB", "WR", "TE"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>Team
              <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
                <option value="All">All</option>
                {[...new Set(fantasyNotes.map((note) => note.team))].sort().map((slug) => (
                  <option key={slug} value={slug}>{getTeamBySlug(slug)?.shortName ?? slug}</option>
                ))}
              </select>
            </label>
          </div>
          <span>{filteredNotes.length} notes</span>
        </div>
        {filteredNotes.length ? (
          <section className="data-table-wrap" tabIndex={0} aria-label="Week 1 fantasy notes table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Player</th><th>Pos</th><th>Team</th><th>Reported role</th><th>Usage</th><th>Status</th><th>Analyst view</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotes.map((note) => (
                  <tr key={note.id}>
                    <td>
                      <strong>{note.player}</strong>
                      {note.class ? <small className="portal-note">{note.class}</small> : null}
                      {note.injury ? <small className="portal-note">{note.injury}</small> : null}
                    </td>
                    <td>{note.position ?? "—"}</td>
                    <td><a href={`/teams/${note.team}`}>{getTeamBySlug(note.team)?.shortName ?? note.team}</a></td>
                    <td><span className="portal-note" style={{ maxWidth: 260 }}>{note.role ?? "—"}</span></td>
                    <td><span className="portal-note" style={{ maxWidth: 220 }}>{note.usage ?? "—"}</span></td>
                    <td>
                      <span className={`portal-status portal-status--${note.availability === "active" ? "committed" : note.availability === "questionable" ? "available" : "withdrawn"}`}>
                        {note.availability ?? "—"}
                      </span>
                    </td>
                    <td>
                      {note.projection?.value ?? "—"}
                      {note.projection?.outlet ? <small className="portal-note">{note.projection.outlet}</small> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : (
          <article className="win-model-card">
            <div>
              <span className="eyebrow">NO NOTES FOR THIS FILTER</span>
              <strong>Fantasy notes</strong>
            </div>
            <p>No published notes match the current position and team filter.</p>
          </article>
        )}
        <p className="table-caption">{fantasyNotesContext}</p>
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
  const rating = getPreseasonRating(team.slug);
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
                <span><strong>{teamFor(game.awayTeamId).shortName} at {teamFor(game.homeTeamId).shortName}</strong><small>{game.kickoffLabel} · {game.venue}{game.broadcast ? ` · ${game.broadcast}` : ""}</small></span>
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
          <SectionHeading eyebrow={`PORTAL · AS OF ${portalAsOf ?? "—"}`} title="Transfer ledger" href="/transfer-portal" />
          {(() => {
            const incoming = portalEvents.filter((event) => event.toTeamId === team.id);
            const outgoing = portalEvents.filter((event) => event.fromTeamId === team.id);
            if (incoming.length === 0 && outgoing.length === 0) {
              return <p className="panel-note">No verified FBS-to-FBS transfers recorded for this program.</p>;
            }
            return (
              <div className="portal-list">
                {incoming.slice(0, 6).map((event) => (
                  <div className="portal-row" key={event.id}>
                    <span className="portal-status portal-status--enrolled">in</span>
                    <span><strong>{event.player}</strong><small>{event.position} · from {teamLabelFor(event.fromTeamId).label} · {event.eventDate}</small></span>
                  </div>
                ))}
                {outgoing.slice(0, 4).map((event) => (
                  <div className="portal-row" key={event.id}>
                    <span className="portal-status portal-status--withdrawn">out</span>
                    <span><strong>{event.player}</strong><small>{event.position} · to {event.toTeamId ? teamLabelFor(event.toTeamId).label : "open"} · {event.eventDate}</small></span>
                  </div>
                ))}
                <p className="panel-note">
                  {incoming.length} in · {outgoing.length} out — <a href={`/transfer-portal/${team.slug}`}>full ledger</a>
                </p>
              </div>
            );
          })()}
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
            <p className="panel-note">Depth chart not available for this team — charts cover the seven rostered conferences plus projected SEC charts (108 of 138 programs).</p>
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
          <p>{stadium ? `${stadium.city} · ${stadium.capacity.toLocaleString()} capacity · verified ${stadium.lastVerified}` : "Venue guides return once stadium data joins the dataset."}</p>
        </div>
        <div className="dashboard-panel">
          <SectionHeading eyebrow={`PRESEASON · AS OF ${rating?.as_of ?? "—"}`} title="Published numbers" href="/rankings" />
          {rating ? (
            <div className="portal-list">
              {rating.sp ? (
                <div className="portal-row">
                  <span className="portal-status portal-status--committed">SP+</span>
                  <span><strong>No. {rating.sp.rank} · {signed(rating.sp.overall)} overall</strong><small>off {signed(rating.sp.offense)} · def {rating.sp.defense} (points per 20 possessions)</small></span>
                </div>
              ) : null}
              {rating.fpi ? (
                <div className="portal-row">
                  <span className="portal-status portal-status--committed">FPI</span>
                  <span><strong>No. {rating.fpi.rank}{rating.fpi.value != null ? ` · ${rating.fpi.value.toFixed(1)}` : ""}</strong><small>ESPN Football Power Index</small></span>
                </div>
              ) : null}
              {rating.wins && (rating.wins.line != null || rating.wins.projected != null) ? (
                <div className="portal-row">
                  <span className="portal-status portal-status--available">O/U</span>
                  <span><strong>{rating.wins.line != null ? rating.wins.line.toFixed(1) : "—"} win total</strong><small>{rating.wins.projected != null ? `projected ${rating.wins.projected.toFixed(1)} wins` : "projection not published"}</small></span>
                </div>
              ) : null}
              {rating.playoff?.value ? (
                <div className="portal-row">
                  <span className="portal-status portal-status--withdrawn">CFP</span>
                  <span><strong>{rating.playoff.value} playoff odds</strong><small>as reported by {rating.playoff.outlet}</small></span>
                </div>
              ) : null}
              {rating.notes ? <p className="panel-note">{rating.notes}</p> : null}
            </div>
          ) : (
            <p className="panel-note">No published preseason numbers for this program.</p>
          )}
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
        description={`Venue guides for all 138 FBS programs, verified ${stadiums[0]?.lastVerified ?? "—"}. Policies change; confirm with the official athletics page before you travel.`}
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
        {stadium.notes ? <article><span className="eyebrow">Venue note</span><p>{stadium.notes}</p></article> : null}
        {stadium.sources && stadium.sources.length > 0 ? (
          <article><span className="eyebrow">Sources</span><p>{stadium.sources.map((source, index) => (
            <span key={source}>{index > 0 ? " · " : ""}<a href={source} rel="nofollow noreferrer noopener" target="_blank">{new URL(source).hostname.replace(/^www\./, "")}</a></span>
          ))}</p></article>
        ) : null}
        <article className="stadium-detail-grid__source">
          <SourceMeta provenance={stadium.provenance} />
          <a href={`/corrections?record=stadium-${stadium.slug}`}>Report a guide issue →</a>
        </article>
      </section>
    </>
  );
}

function RankingsPage() {
  const [pollId, setPollId] = useState("ap");
  const table = pollTables.find((poll) => poll.poll === pollId) ?? pollTables[0];
  const ratingsRows = [...teams]
    .map((team) => ({ team, rating: getPreseasonRating(team.slug) }))
    .filter((row) => row.rating?.sp)
    .sort((a, b) => (a.rating?.sp?.rank ?? 999) - (b.rating?.sp?.rank ?? 999));
  const ratingsAsOf = ratingsRows[0]?.rating?.as_of;
  if (pollId === "ratings") {
    return (
      <>
        <PageHeading
          eyebrow="2026 PRESEASON RATINGS"
          title="SP+ and FPI, as published."
          description={`Bill Connelly's final preseason SP+ and ESPN's FPI, plus win totals and playoff odds exactly as each outlet reported them${ratingsAsOf ? ` · compiled through ${ratingsAsOf}` : ""}. Blank means the number was not published.`}
        />
        <div className="sticky-tools">
          <fieldset className="filter-chips">
            <legend className="sr-only">Board</legend>
            {pollTables.map((poll) => (
              <button type="button" key={poll.poll} aria-pressed={poll.poll === pollId} onClick={() => setPollId(poll.poll)}>
                {poll.poll === "ap" ? "AP Top 25" : "Coaches Poll"}
              </button>
            ))}
            <button type="button" aria-pressed={true} onClick={() => setPollId("ratings")}>SP+ / FPI board</button>
          </fieldset>
        </div>
        <section className="content-section">
          <div className="scoreboard-summary">
            <div><span>{ratingsRows.length}</span><small>RATED (SP+)</small></div>
            <div><span>{ratingsRows.filter((r) => r.rating?.fpi).length}</span><small>WITH FPI</small></div>
            <div><span>{ratingsRows.filter((r) => r.rating?.wins?.line != null).length}</span><small>WIN TOTALS PUBLISHED</small></div>
          </div>
          <section className="data-table-wrap" tabIndex={0} aria-label="Preseason ratings board">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SP+</th><th>Team</th><th>SP+ rating</th><th>Off.</th><th>Def.</th><th>FPI</th><th>Win total</th><th>Proj. wins</th><th>Playoff odds*</th>
                </tr>
              </thead>
              <tbody>
                {ratingsRows.map(({ team, rating }) => (
                  <tr key={team.id}>
                    <td><b>{rating?.sp?.rank}</b></td>
                    <td><a href={`/teams/${team.slug}`}>{team.shortName}</a><small> {team.conference}</small></td>
                    <td>{rating?.sp ? signed(rating.sp.overall) : "—"}</td>
                    <td>{rating?.sp ? signed(rating.sp.offense - 20) : "—"}</td>
                    <td>{rating?.sp ? signed(20 - rating.sp.defense) : "—"}</td>
                    <td>{rating?.fpi ? `#${rating.fpi.rank}` : "—"}</td>
                    <td>{rating?.wins?.line != null ? rating.wins.line.toFixed(1) : "—"}</td>
                    <td>{rating?.wins?.projected != null ? rating.wins.projected.toFixed(1) : "—"}</td>
                    <td>{rating?.playoff?.value ?? "—"}{rating?.playoff ? <small> {rating.playoff.outlet}</small> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <p className="table-caption">*Playoff odds are the outlet's reported number (ESPN FPI simulations or The Athletic model), not this site's simulation. SP+ offense/defense columns are adjusted for readability; raw figures sit on each team page.</p>
        </section>
      </>
    );
  }
  if (!table) {
    return (
      <PageHeading
        eyebrow="RANKINGS"
        title="Polls not published."
        description="No poll tables are present in this dataset release."
      />
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="2026 PRESEASON RANKINGS"
        title="AP and Coaches, straight from the release."
        description={`${table.name}${table.release_date ? ` · released ${table.release_date}` : ""}. Every row cites the poll; no composite is invented.`}
      />
      <div className="sticky-tools">
        <fieldset className="filter-chips">
          <legend className="sr-only">Poll</legend>
          {pollTables.map((poll) => (
            <button type="button" key={poll.poll} aria-pressed={poll.poll === pollId} onClick={() => setPollId(poll.poll)}>
              {poll.poll === "ap" ? "AP Top 25" : "Coaches Poll"}
            </button>
          ))}
          <button type="button" aria-pressed={pollId === "ratings"} onClick={() => setPollId("ratings")}>SP+ / FPI board</button>
        </fieldset>
      </div>
      <section className="content-section">
        <div className="scoreboard-summary">
          <div><span>{table.rankings.length}</span><small>RANKED</small></div>
          <div><span>{table.rankings[0]?.first_place_votes ?? "—"}</span><small>FIRST-PLACE VOTES (NO. 1)</small></div>
          <div><span>{table.others.length}</span><small>OTHERS RECEIVING VOTES</small></div>
        </div>
        <section className="data-table-wrap" tabIndex={0} aria-label={`${table.name} top 25 table`}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th><th>Team</th><th>Record</th><th>Points</th><th>First votes</th><th>Prev.</th>
              </tr>
            </thead>
            <tbody>
              {table.rankings.map((entry) => {
                const team = entry.team_slug ? getTeamBySlug(entry.team_slug) : undefined;
                const movement =
                  entry.previous_rank == null ? null : entry.rank - entry.previous_rank;
                return (
                  <tr key={`${entry.rank}-${entry.team_slug}`}>
                    <td><b>{entry.rank}</b>{entry.tied ? <small> T</small> : null}</td>
                    <td>
                      <a href={team ? `/teams/${team.slug}` : "/rankings"}>{team ? team.name : entry.team}</a>
                      <small> {team?.conference ?? ""}</small>
                    </td>
                    <td>{entry.record ?? "—"}</td>
                    <td>{entry.points?.toLocaleString() ?? "—"}</td>
                    <td>{entry.first_place_votes ?? "—"}</td>
                    <td>
                      {movement == null ? "—" : movement === 0 ? "—" : movement < 0 ? `▲ ${-movement}` : `▼ ${movement}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
        {table.others.length ? (
          <>
            <SectionHeading eyebrow="OTHERS RECEIVING VOTES" title="Just outside the Top 25" />
            <div className="portal-list">
              {table.others.map((entry) => (
                <a className="portal-row" href={entry.team_slug ? `/teams/${entry.team_slug}` : "/rankings"} key={entry.team}>
                  <span className="status status--scheduled">RV</span>
                  <span><strong>{entry.team}</strong></span>
                  <b>{entry.points?.toLocaleString() ?? "—"} pts</b>
                </a>
              ))}
            </div>
          </>
        ) : null}
        {pollsStatusNote ? <p className="panel-note">{pollsStatusNote}</p> : null}
      </section>
      <section className="content-section">
        <SectionHeading eyebrow="STRENGTH OF SCHEDULE" title="Published SOS ratings" />
        <p className="panel-note">
          Composite strength index derived from Phil Steele and ESPN FPI SOS ratings — not SP+, FPI, or a committee ranking.
        </p>
        <div className="rankings-list">
          {[...teams].sort((a, b) => b.strength - a.strength).slice(0, 25).map((team, index) => (
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
  const [week, setWeek] = useState(() => {
    const now = Date.now();
    const upcoming = tvRows.find((row) => Date.parse(`${row.date}T23:59:59Z`) >= now);
    return upcoming?.week ?? tvRows[tvRows.length - 1]?.week ?? 1;
  });
  const weeks = tvWeeks();
  const rows = tvRowsForWeek(week);
  const networks = [...new Set(rows.map((row) => row.tv).filter(Boolean))].sort();
  const athleticsSites = stadiums
    .map((stadium) => ({ slug: stadium.slug, name: getTeamBySlug(stadium.slug)?.shortName ?? stadium.slug, url: stadium.sources?.[0] ?? null }))
    .filter((site) => site.url && site.url.startsWith("http"));
  const [radioTeam, setRadioTeam] = useState("alabama");

  return (
    <>
      <PageHeading
        eyebrow="AUTHORIZED DESTINATIONS"
        title="Know where the game is. Never fake the stream."
        description={`National TV designations come from the research compilation dated ${broadcastAsOf ?? "—"}. Radio and tickets stay with the schools — this site embeds, retransmits, or invents none of it.`}
      />
      <section className="content-section">
        <div className="table-tools">
          <div>
            <label>Week
              <select value={week} onChange={(event) => setWeek(Number(event.target.value))}>
                {weeks.map((item) => <option key={item} value={item}>{item === 0 ? "Week 0" : `Week ${item}`}</option>)}
              </select>
            </label>
          </div>
          <span>{rows.length} televised games{networks.length ? ` · ${networks.join(" · ")}` : ""}</span>
        </div>
        {rows.length ? (
          <section className="data-table-wrap" tabIndex={0} aria-label={`Week ${week} broadcast schedule`}>
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Kickoff</th><th>Matchup</th><th>Network</th></tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.date}-${row.away}-at-${row.home}`}>
                    <td>{row.date}</td>
                    <td>{timeEtLabel(row.time_et) ?? (row.status === "time_tbd" ? "TBD" : "—")}</td>
                    <td><a href={`/teams/${row.away}`}>{getTeamBySlug(row.away)?.shortName ?? row.away}</a> at <a href={`/teams/${row.home}`}>{getTeamBySlug(row.home)?.shortName ?? row.home}</a></td>
                    <td>{row.tv ?? <span className="portal-status portal-status--withdrawn">unassigned</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : (
          <article className="win-model-card">
            <div><span className="eyebrow">NO DESIGNATIONS YET</span><strong>Week {week}</strong></div>
            <p>Later weeks sit inside the 6–12 day selection windows and appear here once networks announce them.</p>
          </article>
        )}
        <p className="table-caption">{broadcastNote}</p>
      </section>
      <section className="content-section provider-cards" id="radio">
        <article>
          <span className={`provider-state ${radioForTeam(radioTeam) ? "provider-state--on" : "provider-state--research"}`}>
            {radioForTeam(radioTeam) ? "RESEARCH VERIFIED" : "RESEARCH GAP"}
          </span>
          <h2>Local radio</h2>
          {(() => {
            const station = radioForTeam(radioTeam);
            if (station) {
              return (
                <div className="portal-list">
                  <div className="portal-row">
                    <span className="portal-status portal-status--committed">FM/AM</span>
                    <span><strong>{station.station ?? "Flagship not published"}{station.frequency ? ` · ${station.frequency}` : ""}</strong><small>{station.market ?? "Market not published"}{station.network ? ` · ${station.network}` : ""}</small></span>
                  </div>
                  {station.satellite ? (
                    <div className="portal-row">
                      <span className="portal-status portal-status--available">SAT</span>
                      <span><strong>{station.satellite}</strong><small>national carriage</small></span>
                    </div>
                  ) : null}
                  {station.notes ? <p className="panel-note">{station.notes}</p> : null}
                  {station.sources.length ? (
                    <p className="panel-note">Sources: {station.sources.map((source, index) => (
                      <span key={source}>{index > 0 ? " · " : ""}<a href={source} rel="nofollow noreferrer noopener" target="_blank">{new URL(source).hostname.replace(/^www\./, "")}</a></span>
                    ))}</p>
                  ) : null}
                  <p className="panel-note">Affiliate facts compiled {radioAsOf ?? "—"} · confidence {station.confidence ?? "—"}. Full affiliate lists live on the official athletics site:</p>
                </div>
              );
            }
            return <p>Radio affiliates are not part of the research dataset, and only station-authorized listings may appear. Each program publishes its affiliate network on its official athletics site:</p>;
          })()}
          <label>Team
            <select value={radioTeam} onChange={(event) => setRadioTeam(event.target.value)}>
              {athleticsSites.map((site) => <option key={site.slug} value={site.slug}>{site.name}</option>)}
            </select>
          </label>{" "}
          <a className="button button--ghost" href={athleticsSites.find((site) => site.slug === radioTeam)?.url ?? "#"} rel="nofollow noreferrer noopener" target="_blank">Open official athletics site →</a>
        </article>
        <article>
          <span className={`provider-state ${ticketAffiliatesConfigured ? "provider-state--on" : "provider-state--research"}`}>
            {ticketAffiliatesConfigured ? "PARTNER ACTIVE" : "NO PARTNER BY DESIGN"}
          </span>
          <h2>Ticket inventory</h2>
          <p>Schools and their athletics departments are the only ticket sources this site points to. No resale marketplace, pricing, or availability is shown, and none is invented.</p>
          {(() => {
            const team = getTeamBySlug(radioTeam);
            const links = team ? ticketLinksForTeam(team.name) : [];
            return links.length ? (
              <p>
                {links.map((link) => (
                  <a key={link.partner} className="button button--ghost" href={link.url} rel="sponsored nofollow noreferrer noopener" target="_blank" style={{ marginRight: 8 }}>
                    Compare on {link.partner} →
                  </a>
                ))}
                <small className="portal-note">Sponsored links · see the <a href="/affiliate-disclosure">affiliate disclosure</a>.</small>
              </p>
            ) : null;
          })()}
          <a href="/data-sources">Review dependency policy →</a>
        </article>
      </section>
    </>
  );
}

function SearchPage() {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const playerResults = useMemo(() => searchPlayers(normalized, 8), [normalized]);
  const results = useMemo(() => {
    if (!normalized) return [];
    return [
      ...teams.filter((team) => team.name.toLowerCase().includes(normalized)).map((team) => ({ href: `/teams/${team.slug}`, label: team.name, type: "Team" })),
      ...coaches.filter((coach) => coach.name.toLowerCase().includes(normalized)).map((coach) => ({ href: `/coaches/${coach.slug}`, label: coach.name, type: "Coach" })),
    ];
  }, [normalized]);
  return (
    <>
      <PageHeading eyebrow="SEARCH" title="Find the next useful answer." description="Search all 138 teams, 134 head coaches, and every rostered player in the 2026 dataset." />
      <section className="search-panel content-section">
        <label htmlFor="site-search">Search the Hub</label>
        <input id="site-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try Clemson, Dabo Swinney, or Bryant Wesco" />
        {normalized ? (
          <>
            {results.length ? <div className="search-results">{results.map((result) => <a href={result.href} key={`${result.type}-${result.href}`}><span>{result.type}</span><strong>{result.label}</strong><b>→</b></a>)}</div> : null}
            {playerResults.length ? (
              <>
                <SectionHeading eyebrow="PLAYERS" title="Roster matches" />
                <div className="portal-list">
                  {playerResults.map((player) => (
                    <a className="portal-row" href={`/teams/${player.t}`} key={`${player.n}-${player.t}`}>
                      <span className="position-badge">{player.p ?? "—"}</span>
                      <span><strong>{player.n}</strong><small>{player.teamName}</small></span>
                      <span aria-hidden="true">→</span>
                    </a>
                  ))}
                </div>
                <p className="panel-note">Player links open the team page; individual player pages arrive with roster page depth.</p>
              </>
            ) : null}
            {!results.length && !playerResults.length ? <EmptyState title="No matching record." copy="Try a team, coach, or player name." /> : null}
          </>
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
        <p>No sensitive medical details, private forum content, or paywalled material. High-risk identity, privacy, and rights issues are quarantined first. Data and site issues can also be reported to <a href="mailto:admin@cfbapex.com">admin@cfbapex.com</a>.</p>
        <button className="button button--gold" type="submit">Submit correction</button>
      </form>
    </>
  );
}

function MethodologyPage() {
  const cards = [
    ["Matchup concept", "A future production model would combine play value, pace, continuity, context, and uncertainty; no such trained model or validation artifact ships here."],
    ["Portal concept", "The 2026 portal ledger lists verified FBS-to-FBS transfers with dates, positions, and source confidence. Destinations are never inferred, impact scores are not modeled, and NIL estimates are excluded."],
    ["Playoff simulation", "The implemented seeded Monte Carlo uses the 138-team field, bounded runs, validated ±6 forced-game adjustments, explicit precision, and an approximate committee order. It is not a season results engine."],
    ["Coaching concept", "Contract terms come from the 2026 head-coach contract compilation (dual-sourced where possible; private-school gaps stay null). Hot-seat context is not published and is never treated as a firing probability; buyout math runs only on user-supplied guarantee inputs."],
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
  const content: Record<string, { eyebrow: string; title: string; intro: string; sections: [string, React.ReactNode][] }> = {
    about: {
      eyebrow: "INDEPENDENCE STATEMENT",
      title: "Built for the Saturday task, not the scroll.",
      intro: `${brand.name} is a conference-neutral product concept for transparent utility, accessible models, and maintained gameday information.`,
      sections: [["What we value", "Speed, source visibility, corrections, calm monetization, and understandable uncertainty."], ["What we do not do", "No paywall bypasses, fabricated live states, unlicensed marks, guaranteed picks, autoplay, or commercial ranking disguised as editorial judgment."], ["Contact", <>General: <a href="mailto:hello@cfbapex.com">hello@cfbapex.com</a> · Social and community: <a href="mailto:socials@cfbapex.com">socials@cfbapex.com</a>.</>]],
    },
    privacy: {
      eyebrow: "DRAFT FOR COUNSEL",
      title: "Privacy notice — preview draft",
      intro: "This site stores only device-local mode and favorite preferences. No production analytics, email, advertising, or precise location provider is active.",
      sections: [["Data minimization", "Future services may process account identity, newsletter email, coarse consent attestation, and short-lived abuse logs only for stated purposes."], ["Your choices", "Production activation requires access, correction, deletion, consent withdrawal, and processor workflows reviewed by counsel."], ["Privacy contact", "Privacy questions, access requests, and deletion requests: privacy@cfbapex.com."]],
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
      <section className="inquiry-band"><div><span className="eyebrow">NO LIVE SUBMISSION</span><h2>Partnership inquiry workflow is staged, not activated.</h2><p>Legal entity, inventory, rates, measurement, privacy, and approval owners must be configured first.{isKit ? <> Press and media inquiries: <a href="mailto:media@cfbapex.com">media@cfbapex.com</a>.</> : null}</p></div><a className="button button--light" href="/affiliate-disclosure">Read the commercial firewall</a></section>
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
  const fantasyBySlug = fantasyNotes.find(
    (note) =>
      note.player
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z ]/g, "")
        .trim()
        .replaceAll(" ", "-") === slug,
  );
  if (!portal && !dfs && !fantasyBySlug) return <NotFoundPage />;
  const playerName = portal?.player ?? dfs?.name ?? fantasyBySlug!.player;
  const currentTeamId = portal?.toTeamId ?? dfs?.teamId ?? fantasyBySlug?.team ?? portal?.fromTeamId;
  const currentTeam = currentTeamId ? getTeamBySlug(currentTeamId) : undefined;
  const origin = portal ? teamLabelFor(portal.fromTeamId) : null;
  const destination = portal?.toTeamId ? teamLabelFor(portal.toTeamId) : null;
  const fantasyNote = fantasyNotes.find((note) => note.player === playerName);
  return (
    <>
      <PageHeading eyebrow="PLAYER RECORD" title={playerName} description={`${portal?.position ?? fantasyBySlug?.position ?? dfs?.position} · ${currentTeam?.shortName ?? "Available"} · source and model states remain separate.`} />
      <section className="player-layout content-section">
        {portal ? <article><span className="eyebrow">PORTAL EVENT</span><h2>{origin?.label} → {destination?.label ?? "Available"}</h2><p>{portal.snaps == null ? "No published snap count" : `${portal.snaps} prior snaps`} · {portal.eventDate} · {portal.confidence} confidence</p>{portal.notes ? <p className="panel-note">{portal.notes}</p> : null}{portal.sources && portal.sources.length ? <p className="panel-note">Sources: {portal.sources.map((source, index) => <span key={source}>{index > 0 ? " · " : ""}<a href={source} rel="nofollow noreferrer noopener" target="_blank">{new URL(source).hostname.replace(/^www\./, "")}</a></span>)}</p> : null}<SourceMeta provenance={portal.provenance} /></article> : null}
        {fantasyNote ? (
          <article>
            <span className="eyebrow">FANTASY NOTE · {fantasyNote.as_of ?? "—"}</span>
            <h2>{fantasyNote.position ?? "—"} · {getTeamBySlug(fantasyNote.team)?.shortName ?? fantasyNote.team} · {fantasyNote.availability ?? "status unreported"}</h2>
            {fantasyNote.role ? <p>{fantasyNote.role}</p> : null}
            {fantasyNote.usage ? <p className="panel-note">{fantasyNote.usage}</p> : null}
            {fantasyNote.injury ? <p className="panel-note">{fantasyNote.injury}</p> : null}
            {fantasyNote.projection?.value ? <p className="panel-note"><strong>{fantasyNote.projection.outlet ?? "Analyst"}:</strong> {fantasyNote.projection.value}</p> : null}
            {fantasyNote.sources.length ? <p className="panel-note">Sources: {fantasyNote.sources.map((source, index) => <span key={source}>{index > 0 ? " · " : ""}<a href={source} rel="nofollow noreferrer noopener" target="_blank">{new URL(source).hostname.replace(/^www\./, "")}</a></span>)}</p> : null}
          </article>
        ) : (
          <article><span className="eyebrow">FANTASY NOTE</span><h2>No published Week 1 note.</h2><p>Missing notes remain an explicit empty state.</p></article>
        )}
        <article><span className="eyebrow">CORRECTIONS</span><h2>Identity and status issues are quarantined first.</h2><a href={`/corrections?record=player-${slug}`}>Report a data issue →</a></article>
      </section>
    </>
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

  if (!root) content = <BroadcastHomepage data={homepageData} cleanMode={mode === "clean"} onModeRequest={() => setModeDialogOpen(true)} />;
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
      <BroadcastHeader
        teams={teams}
        activePath={normalizedPath}
        cleanMode={mode === "clean"}
        onCleanModeChange={(enabled) => enabled ? enableClean() : setModeDialogOpen(true)}
      />
      <ScoreTicker games={tickerGames} teams={teams} />
      <main id="main-content">{content}</main>
      <BroadcastFooter />
      <ModeDialog open={modeDialogOpen} onClose={() => setModeDialogOpen(false)} onConfirm={enableAnalysis} />
    </div>
  );
}
