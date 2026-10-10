"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { BroadcastTeam } from "@/lib/homepage";
import { DataBoardHero, DataBoardSummary } from "./data-board-primitives";
import {
  INJURY_METHOD,
  type EspnInjuryEntry,
  type InjuryStatus,
  type InjuryWatchEntry,
  espnInjuriesAsOf,
  espnLedgerEntries,
  espnWatchEntries,
  injuryResearch,
  likelihoodFromPractice,
} from "@/lib/injury-report";
import { verifiedRefresh } from "@/lib/cfb-dataset";

function StatusPill({ status }: { status: InjuryStatus }) {
  const cls =
    status === "IR" ? "inj-pill--ir" : status === "OUT" ? "inj-pill--out" : status === "SUSPENSION" ? "inj-pill--susp" : "inj-pill--q";
  return <span className={`inj-pill ${cls}`}>{status === "IR" ? "IR" : status === "OUT" ? "OUT" : status === "SUSPENSION" ? "SUSP" : status === "DOUBTFUL" ? "DOUBTFUL" : "Q"}</span>;
}

function LikelihoodPill({ likelihood, confidence }: { likelihood: string | null; confidence: string | null }) {
  if (!likelihood) return <span className="inj-pill inj-pill--none">Not graded</span>;
  const cls =
    likelihood === "likely" ? "inj-pill--likely" : likelihood === "questionable" ? "inj-pill--q" : "inj-pill--out";
  return (
    <span className={`inj-pill ${cls}`}>
      {likelihood.toUpperCase()}
      {confidence ? <small> · {confidence} conf</small> : null}
    </span>
  );
}

function PracticeCell({ status }: { status: string | null }) {
  if (!status) return <span className="inj-practice inj-practice--none">—</span>;
  const cls = status === "FP" ? "inj-practice--fp" : status === "LP" ? "inj-practice--lp" : "inj-practice--dnp";
  return <span className={`inj-practice ${cls}`}>{status}</span>;
}

interface LiveInjury {
  player: string;
  teamSlug: string | null;
  position: string | null;
  status: string;
  detail: string | null;
}

export function InjuryReportPage({ teams }: { teams: readonly BroadcastTeam[] }) {
  const teamBySlug = useMemo(() => new Map(teams.map((team) => [team.slug, team])), [teams]);
  const [teamFilter, setTeamFilter] = useState<string>("");
  const [live, setLive] = useState<LiveInjury[] | null>(null);
  const [liveAsOf, setLiveAsOf] = useState<string | null>(espnInjuriesAsOf);

  // Live refresh from the Worker feed — the posting slots stay honest because
  // the page upgrades itself whenever a visitor loads it after a slot time.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/injuries", { headers: { accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : null))
      .then((doc) => {
        if (!cancelled && doc && Array.isArray(doc.entries)) {
          setLive(doc.entries as LiveInjury[]);
          setLiveAsOf(doc.asOf ?? null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const baseLedger = useMemo<EspnInjuryEntry[]>(() => espnLedgerEntries(), []);
  const baseWatch = useMemo<EspnInjuryEntry[]>(() => espnWatchEntries(), []);

  const liveLedger = useMemo(() => {
    if (!live) return null;
    return live
      .filter((entry) => entry.status === "IR")
      .map((entry) => ({ ...entry, status: "IR" as InjuryStatus }));
  }, [live]);

  const ledgerRows = useMemo(() => {
    const rows: Array<{
      kind: "espn" | "research";
      player: string;
      teamSlug: string | null;
      position: string | null;
      injury: string | null;
      status: InjuryStatus;
      weeksOut: number | null;
      detail: string | null;
      sources: string[];
      social: string[];
      confidence: string | null;
    }> = (liveLedger ?? baseLedger).map((entry) => ({
      kind: "espn" as const,
      player: entry.player,
      teamSlug: entry.teamSlug,
      position: entry.position,
      injury: null as string | null,
      status: entry.status,
      weeksOut: null as number | null,
      detail: entry.detail,
      sources: [] as string[],
      social: [] as string[],
      confidence: null as string | null,
    }));
    const seen = new Set(rows.map((row) => `${row.player}:${row.teamSlug}`));
    for (const entry of injuryResearch.ledger) {
      const key = `${entry.player}:${entry.teamSlug}`;
      if (seen.has(key)) continue; // research detail joins the ESPN row below
      seen.add(key);
      rows.push({
        kind: "research",
        player: entry.player,
        teamSlug: entry.teamSlug,
        position: entry.position,
        injury: entry.injury,
        status: entry.status as InjuryStatus,
        weeksOut: entry.weeksOut,
        detail: entry.detail,
        sources: entry.sources,
        social: entry.social,
        confidence: entry.confidence,
      });
    }
    const filtered = teamFilter ? rows.filter((row) => row.teamSlug === teamFilter) : rows;
    return filtered.sort(
      (a, b) => (a.teamSlug ?? "").localeCompare(b.teamSlug ?? "") || a.player.localeCompare(b.player),
    );
  }, [liveLedger, baseLedger, teamFilter]);

  const watchRows = useMemo(() => {
    const espnRows = baseWatch.map((entry) => ({
      kind: "espn" as const,
      player: entry.player,
      teamSlug: entry.teamSlug,
      position: entry.position,
      injury: null as string | null,
      practice: null as InjuryWatchEntry["practice"] | null,
      likelihood: entry.status === "OUT" ? ("unlikely" as const) : entry.status === "DOUBTFUL" ? ("doubtful" as const) : null,
      confidence: null as string | null,
      note: entry.detail,
      sources: [] as string[],
      social: [] as string[],
    }));
    const researchRows = injuryResearch.watch.map((entry) => {
      const model = likelihoodFromPractice(entry.practice);
      return {
        kind: "research" as const,
        player: entry.player,
        teamSlug: entry.teamSlug,
        position: entry.position,
        injury: entry.injury,
        practice: entry.practice,
        likelihood: entry.likelihood ?? model.likelihood,
        confidence: entry.confidence ?? model.confidence,
        note: entry.note ?? model.basis,
        sources: entry.sources,
        social: entry.social,
      };
    });
    // Research rows outrank their ESPN twin; ESPN-only rows fill the board.
    const researchKeys = new Set(researchRows.map((row) => `${row.player}:${row.teamSlug}`));
    const rows = [...researchRows, ...espnRows.filter((row) => !researchKeys.has(`${row.player}:${row.teamSlug}`))];
    const filtered = teamFilter ? rows.filter((row) => row.teamSlug === teamFilter) : rows;
    return filtered.sort(
      (a, b) => (a.teamSlug ?? "").localeCompare(b.teamSlug ?? "") || a.player.localeCompare(b.player),
    );
  }, [baseWatch, teamFilter]);

  const researchLive = injuryResearch.watch.length > 0 || injuryResearch.ledger.length > 0;
  // The editorial layer is stale when it predates the dataset's reference
  // week — its rows describe games that have already been played.
  const researchStale =
    researchLive && injuryResearch.asOf != null && verifiedRefresh != null
      ? injuryResearch.asOf < verifiedRefresh.reference_date
      : false;

  return (
    <div className="db-page inj-page">
      <DataBoardHero
        eyebrow="Injury desk · Verified weekly"
        title="The injury report, on the record."
        description="A long-term ledger of every college player out for the season or more than two weeks, plus a week-to-week watch with verified practice status and likelihood to play — graded on beat reporting, team releases, and verified player accounts."
      />
      <DataBoardSummary
        label="Injury desk summary"
        caption={`${INJURY_METHOD.schedule} ESPN base as of ${liveAsOf ?? "not published"}.`}
        items={[
          { label: "Long-term ledger", value: ledgerRows.length, emphasis: true },
          { label: "Week-to-week watch", value: watchRows.length },
          { label: "Research entries", value: injuryResearch.ledger.length + injuryResearch.watch.length },
          { label: "Research as of", value: injuryResearch.asOf ?? "Not published" },
          { label: "Teams covered", value: new Set([...ledgerRows, ...watchRows].map((row) => row.teamSlug)).size },
        ]}
      />

      {verifiedRefresh?.availability_review ? (
        <div className="apex-container inj-stale-banner" role="status">
          <strong>{verifiedRefresh.availability_review.scope} · {verifiedRefresh.availability_review.checked_at.slice(0, 10)}.</strong>{" "}
          {verifiedRefresh.availability_review.note}
        </div>
      ) : null}

      {researchStale ? (
        <div className="apex-container inj-stale-banner" role="status">
          <strong>
            Week {verifiedRefresh?.week} report not yet published; last editorial update{" "}
            {injuryResearch.asOf}.
          </strong>{" "}
          The watch calls below are from that earlier report and describe games that have already
          been played — treat them as a sample of the desk&apos;s format, not current availability.
        </div>
      ) : null}

      <section className="apex-container db-section" aria-labelledby="inj-ledger-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">LONG-TERM LEDGER · IR OR 3+ WEEKS OUT</span>
            <h2 id="inj-ledger-title">Out for the long haul</h2>
          </div>
          <div className="db-filters">
            <label className="sr-only" htmlFor="inj-team-filter">
              Filter by team
            </label>
            <select
              id="inj-team-filter"
              value={teamFilter}
              onChange={(event) => setTeamFilter(event.target.value)}
              className="inj-team-select"
            >
              <option value="">All teams</option>
              {teams.map((team) => (
                <option key={team.slug} value={team.slug}>
                  {team.shortName}
                </option>
              ))}
            </select>
          </div>
        </div>
        {ledgerRows.length ? (
          <div className="db-table-wrap db-desktop-data-table">
            <table className="db-table inj-table">
              <thead>
                <tr>
                  <th scope="col">Player</th>
                  <th scope="col">Team</th>
                  <th scope="col">Pos</th>
                  <th scope="col">Status</th>
                  <th scope="col">Weeks out</th>
                  <th scope="col">Detail</th>
                  <th scope="col">Sources</th>
                </tr>
              </thead>
              <tbody>
                {ledgerRows.slice(0, 400).map((row) => {
                  const team = row.teamSlug ? teamBySlug.get(row.teamSlug) : undefined;
                  return (
                    <tr key={`${row.player}-${row.teamSlug}-${row.status}`}>
                      <td>
                        <strong>{row.player}</strong>
                        {row.confidence ? <small className="inj-conf"> · {row.confidence} confidence</small> : null}
                      </td>
                      <td>{team?.shortName ?? row.teamSlug ?? "—"}</td>
                      <td>{row.position ?? "—"}</td>
                      <td>
                        <StatusPill status={row.status} />
                      </td>
                      <td>{row.weeksOut != null ? `${row.weeksOut}+` : row.status === "IR" ? "Indefinite" : "—"}</td>
                      <td className="inj-detail">{row.injury ?? row.detail ?? "Not published"}</td>
                      <td>
                        {row.sources.length ? (
                          <a href={row.sources[0]} target="_blank" rel="noopener noreferrer">
                            Source
                          </a>
                        ) : (
                          <span className="inj-src-espn">ESPN</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="db-empty">No long-term injuries published{teamFilter ? " for this team" : ""}.</p>
        )}
      </section>

      <section className="apex-container db-section" aria-labelledby="inj-watch-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">WEEK-TO-WEEK WATCH · PRACTICE STATUS & LIKELIHOOD</span>
            <h2 id="inj-watch-title">Game-time decisions, graded</h2>
          </div>
        </div>
        {researchStale ? (
          <p className="inj-watch-note">
            Editorial watch calls (practice participation, likelihood with confidence, sentiment from beat
            reports and verified accounts) publish with the weekly research. The current research file is from{" "}
            {injuryResearch.asOf} (Week {injuryResearch.week}); the next report publishes when the desk is
            staffed for it — no schedule is promised until then.
          </p>
        ) : researchLive ? (
          <p className="inj-watch-note">{INJURY_METHOD.sentiment}</p>
        ) : (
          <p className="inj-watch-note">
            Editorial watch calls (practice participation, likelihood with confidence, sentiment from beat reports
            and verified accounts) publish with the weekly research — until then this board shows the ESPN base
            only, clearly labeled. Nothing is invented to fill the gap.
          </p>
        )}
        {watchRows.length ? (
          <details className="inj-watch-details" open={!researchStale}>
            <summary>
              {researchStale
                ? `Show the Week ${injuryResearch.week} watch table (${watchRows.length} rows, last editorial update ${injuryResearch.asOf})`
                : `Watch table — ${watchRows.length} graded rows`}
            </summary>
          <div className="db-table-wrap db-desktop-data-table">
            <table className="db-table inj-table inj-table--watch">
              <thead>
                <tr>
                  <th scope="col">Player</th>
                  <th scope="col">Team</th>
                  <th scope="col">Pos</th>
                  <th scope="col">Wed</th>
                  <th scope="col">Thu</th>
                  <th scope="col">Fri</th>
                  <th scope="col">Sat</th>
                  <th scope="col">Likelihood</th>
                  <th scope="col">Note</th>
                </tr>
              </thead>
              <tbody>
                {watchRows.slice(0, 300).map((row) => {
                  const team = row.teamSlug ? teamBySlug.get(row.teamSlug) : undefined;
                  const practice = row.practice;
                  return (
                    <tr key={`${row.player}-${row.teamSlug}-watch`}>
                      <td>
                        <strong>{row.player}</strong>
                        {row.injury ? <small className="inj-conf"> · {row.injury}</small> : null}
                      </td>
                      <td>{team?.shortName ?? row.teamSlug ?? "—"}</td>
                      <td>{row.position ?? "—"}</td>
                      <td><PracticeCell status={practice ? practice.wed : null} /></td>
                      <td><PracticeCell status={practice ? practice.thu : null} /></td>
                      <td><PracticeCell status={practice ? practice.fri : null} /></td>
                      <td><PracticeCell status={practice ? practice.sat : null} /></td>
                      <td>
                        <LikelihoodPill likelihood={row.likelihood} confidence={row.confidence} />
                      </td>
                      <td className="inj-detail">
                        {row.note ?? "Not published"}
                        {row.sources.length || row.social.length ? (
                          <>
                            {" "}
                            <a href={(row.sources[0] ?? row.social[0]) as string} target="_blank" rel="noopener noreferrer">
                              Source
                            </a>
                          </>
                        ) : row.kind === "espn" ? (
                          <>
                            {" "}
                            <span className="inj-src-espn">ESPN</span>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </details>
        ) : (
          <p className="db-empty">No week-to-week entries published{teamFilter ? " for this team" : ""}.</p>
        )}
      </section>

      <section className="apex-container db-section" aria-labelledby="inj-method-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">METHOD</span>
            <h2 id="inj-method-title">
              <ShieldCheck size={16} aria-hidden="true" /> How this desk works
            </h2>
          </div>
        </div>
        <div className="xy-primer-grid">
          <article className="xy-primer-card">
            <span className="db-position-tag">LEDGER</span>
            <h3>Long-term means long-term</h3>
            <p>{INJURY_METHOD.ledger}</p>
          </article>
          <article className="xy-primer-card">
            <span className="db-position-tag">WATCH</span>
            <h3>Participation first</h3>
            <p>{INJURY_METHOD.watch}</p>
          </article>
          <article className="xy-primer-card">
            <span className="db-position-tag">SOURCES</span>
            <h3>Sentiment is evidence</h3>
            <p>{INJURY_METHOD.sentiment}</p>
          </article>
        </div>
        <p className="apex-data-note">
          Public, published information only — no medical speculation beyond what teams and reporters have stated.
          Corrections follow the <a href="/corrections">site-wide policy</a>.
        </p>
      </section>
    </div>
  );
}
