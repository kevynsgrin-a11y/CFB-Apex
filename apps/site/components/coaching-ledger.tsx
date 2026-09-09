"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMemo, useState } from "react";
import { ArrowRight, Calculator, ChevronDown, ExternalLink, Filter, Scale, X } from "lucide-react";
import { calculateBuyout } from "@/lib/contracts";
import type { Coach, Team } from "@/lib/types";
import {
  DataBoardEmpty,
  DataBoardHero,
  formatDataDate,
  initialsFor,
} from "./data-board-primitives";

interface CoachingLedgerProps {
  coaches: readonly Coach[];
  teams: readonly Team[];
  initialCoachSlug?: string;
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function publishedMoney(value: number | null | undefined) {
  return value != null && value > 0 ? money.format(value) : "Not published";
}

function sourceLabel(source: string) {
  try {
    return new URL(source).hostname.replace(/^www\./, "");
  } catch {
    return "Contract source";
  }
}

function sliderMaximum(value: number) {
  const baseline = value > 0 ? value * 1.5 : 50_000_000;
  return Math.max(10_000_000, Math.ceil(baseline / 1_000_000) * 1_000_000);
}

function CoachAvatar({ name, large = false }: { name: string; large?: boolean }) {
  return (
    <span className="db-coach-avatar font-display" data-size={large ? "large" : "index"} aria-hidden="true">
      {initialsFor(name)}
    </span>
  );
}

export function CoachingLedger({
  coaches,
  teams,
  initialCoachSlug,
}: CoachingLedgerProps) {
  const sortedCoaches = useMemo(
    () => [...coaches].sort((a, b) => a.name.localeCompare(b.name)),
    [coaches],
  );
  const teamBySlug = useMemo(
    () => new Map(teams.map((team) => [team.slug, team])),
    [teams],
  );
  const initialCoach =
    sortedCoaches.find((coach) => coach.slug === initialCoachSlug) ?? sortedCoaches[0];
  const [selectedId, setSelectedId] = useState(initialCoach?.id ?? "");
  const [conference, setConference] = useState("All conferences");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [guaranteed, setGuaranteed] = useState(initialCoach?.guaranteedRemaining ?? 0);
  const [offset, setOffset] = useState(initialCoach?.offsetEstimate ?? 0);
  const selectedCoach =
    sortedCoaches.find((coach) => coach.id === selectedId) ?? initialCoach;
  const conferences = useMemo(
    () =>
      ["All conferences", ...new Set(teams.map((team) => team.conference))].sort(
        (a, b) =>
          a === "All conferences" ? -1 : b === "All conferences" ? 1 : a.localeCompare(b),
      ),
    [teams],
  );
  const visibleCoaches = useMemo(
    () =>
      sortedCoaches.filter((coach) => {
        const team = teamBySlug.get(coach.teamId);
        return conference === "All conferences" || team?.conference === conference;
      }),
    [conference, sortedCoaches, teamBySlug],
  );

  if (!selectedCoach) {
    return (
      <div className="db-page db-page--coaching">
        <DataBoardHero
          eyebrow="Data board · Contract economics"
          title="Coaching ledger"
          description="Verified coaching contracts will appear when they join the dataset."
        />
        <section className="apex-container db-section">
          <DataBoardEmpty
            title="Contracts not published"
            description="No coaching contract records are available in this release."
            action={<a href="/teams">Browse team hubs</a>}
          />
        </section>
      </div>
    );
  }

  const team = teamBySlug.get(selectedCoach.teamId);
  const buyout = calculateBuyout({
    guaranteedRemaining: guaranteed,
    mitigationApplies: selectedCoach.mitigationApplies,
    estimatedOffset: offset,
  });
  const guaranteeMax = sliderMaximum(
    Math.max(selectedCoach.guaranteedRemaining, guaranteed),
  );
  const offsetMax = Math.max(guaranteeMax, sliderMaximum(offset));
  const estimatedNet = guaranteed > 0 ? money.format(buyout.estimatedNet) : "Not published";

  const selectCoach = (coach: Coach) => {
    setSelectedId(coach.id);
    setGuaranteed(coach.guaranteedRemaining);
    setOffset(coach.offsetEstimate);
  };

  const changeConference = (nextConference: string) => {
    setConference(nextConference);
    const currentTeam = teamBySlug.get(selectedCoach.teamId);
    if (
      nextConference !== "All conferences" &&
      currentTeam?.conference !== nextConference
    ) {
      const firstMatch = sortedCoaches.find(
        (coach) => teamBySlug.get(coach.teamId)?.conference === nextConference,
      );
      if (firstMatch) selectCoach(firstMatch);
    }
  };

  const contractTerm =
    selectedCoach.contractStart && selectedCoach.contractEnd
      ? `${selectedCoach.contractStart} → ${selectedCoach.contractEnd}`
      : selectedCoach.contractEnd
        ? `Through ${selectedCoach.contractEnd}`
        : "Not published";
  const mitigation = selectedCoach.mitigationApplies
    ? "Applies"
    : selectedCoach.contractAsOf
      ? "No offset / mitigation"
      : "Not published";

  return (
    <div className="db-page db-page--coaching">
      <DataBoardHero
        eyebrow="Data board · Contract economics"
        title={
          initialCoachSlug
            ? `${selectedCoach.name} contract ledger`
            : "Separate the contract from the carousel noise."
        }
        description="Move from coach to coach without losing the financial context: verified terms, source links, and transparent buyout math only."
        action={
          <a className="db-hero-link" href="/methodology#coaching">
            Calculation policy
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        }
      />

      <section className="apex-container db-coaching-layout">
        <Dialog.Root open={pickerOpen} onOpenChange={setPickerOpen}>
          <Dialog.Trigger asChild>
            <button className="db-coach-picker" type="button">
              <CoachAvatar name={selectedCoach.name} />
              <span>
                <small>COACH INDEX</small>
                <strong>{selectedCoach.name}</strong>
                <em>{team?.shortName ?? selectedCoach.teamId} · {selectedCoach.record}</em>
              </span>
              <ChevronDown aria-hidden="true" />
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="polish-sheet-overlay" />
            <Dialog.Content className="polish-sheet db-coach-sheet">
              <div className="polish-sheet__handle" aria-hidden="true" />
              <header className="polish-sheet__header">
                <div>
                  <Dialog.Title>Choose a coach</Dialog.Title>
                  <Dialog.Description>
                    Compare the published contract record without losing your place.
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button type="button" aria-label="Close coach index">
                    <X aria-hidden="true" />
                  </button>
                </Dialog.Close>
              </header>
              <label className="db-coach-sheet__filter" htmlFor="coach-conference-filter-mobile">
                <span>
                  <Filter aria-hidden="true" />
                  Conference
                </span>
                <select
                  id="coach-conference-filter-mobile"
                  value={conference}
                  onChange={(event) => changeConference(event.target.value)}
                >
                  {conferences.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <div className="db-coach-sheet__list">
                {visibleCoaches.map((coach) => {
                  const coachTeam = teamBySlug.get(coach.teamId);
                  const term = coach.contractEnd
                    ? coach.contractStart
                      ? `${coach.contractStart} → ${coach.contractEnd}`
                      : `Through ${coach.contractEnd}`
                    : "Not published";
                  return (
                    <details
                      className="db-coach-card"
                      data-selected={selectedCoach.id === coach.id || undefined}
                      key={coach.id}
                    >
                      <summary>
                        <CoachAvatar name={coach.name} />
                        <span>
                          <strong>{coach.name}</strong>
                          <small>{coachTeam?.shortName ?? coach.teamId}</small>
                        </span>
                        <b>{coach.record}</b>
                        <ChevronDown aria-hidden="true" />
                      </summary>
                      <div>
                        <dl>
                          <div>
                            <dt>Term</dt>
                            <dd>{term}</dd>
                          </div>
                          <div>
                            <dt>Annual salary</dt>
                            <dd>{publishedMoney(coach.annualSalary)}</dd>
                          </div>
                          <div>
                            <dt>Guarantee</dt>
                            <dd>{publishedMoney(coach.guaranteedRemaining)}</dd>
                          </div>
                        </dl>
                        <button
                          type="button"
                          onClick={() => {
                            selectCoach(coach);
                            setPickerOpen(false);
                          }}
                        >
                          View full ledger
                          <ArrowRight aria-hidden="true" />
                        </button>
                      </div>
                    </details>
                  );
                })}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        <aside className="db-coach-index" aria-label="Coach index">
          <div className="db-coach-index__filter">
            <label htmlFor="coach-conference-filter">
              <Filter size={15} aria-hidden="true" />
              Conference
            </label>
            <select
              id="coach-conference-filter"
              value={conference}
              onChange={(event) => changeConference(event.target.value)}
            >
              {conferences.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="db-coach-index__rail">
            {visibleCoaches.map((coach) => {
              const coachTeam = teamBySlug.get(coach.teamId);
              return (
                <button
                  type="button"
                  key={coach.id}
                  onClick={() => selectCoach(coach)}
                  aria-pressed={selectedCoach.id === coach.id}
                >
                  <CoachAvatar name={coach.name} />
                  <span>
                    <strong>{coach.name}</strong>
                    <small>{coachTeam?.abbreviation ?? coach.teamId}</small>
                  </span>
                  <b>{coach.record}</b>
                </button>
              );
            })}
          </div>
        </aside>

        <article className="db-coach-detail" aria-live="polite">
          <header className="db-coach-hero">
            <CoachAvatar name={selectedCoach.name} large />
            <div>
              <span className="db-eyebrow">
                {team?.shortName ?? selectedCoach.teamId} · {selectedCoach.title}
              </span>
              <h2 className="font-display">{selectedCoach.name}</h2>
              <p>
                <strong>{selectedCoach.record}</strong> current-season record · {team?.conference ?? "Conference not published"}
              </p>
            </div>
          </header>

          <dl className="db-contract-grid">
            <div>
              <dt>Term</dt>
              <dd>{contractTerm}</dd>
            </div>
            <div>
              <dt>Annual salary</dt>
              <dd>{publishedMoney(selectedCoach.annualSalary)}</dd>
            </div>
            <div>
              <dt>Total value</dt>
              <dd>{publishedMoney(selectedCoach.totalValue)}</dd>
            </div>
            <div>
              <dt>Guarantee remaining</dt>
              <dd>{publishedMoney(selectedCoach.guaranteedRemaining)}</dd>
            </div>
            <div>
              <dt>Offset mitigation</dt>
              <dd>{mitigation}</dd>
            </div>
            <div>
              <dt>Contract record</dt>
              <dd>
                {selectedCoach.contractAsOf
                  ? `Through ${formatDataDate(selectedCoach.contractAsOf)}`
                  : "Not published"}
              </dd>
            </div>
          </dl>

          <section className="db-buyout-callout" aria-labelledby="buyout-summary-title">
            <Scale size={21} aria-hidden="true" />
            <div>
              <h3 id="buyout-summary-title" className="font-display">Buyout:</h3>
              <p>{selectedCoach.buyoutSummary ?? "Not published."}</p>
            </div>
          </section>

          <section className="db-contract-notes" aria-labelledby="contract-notes-title">
            <span className="db-eyebrow" id="contract-notes-title">Contract notes</span>
            <p>{selectedCoach.contractNote ?? "Not published."}</p>
          </section>

          <nav className="db-source-strip" aria-label={`${selectedCoach.name} contract sources`}>
            <span>Sources</span>
            <div>
              {selectedCoach.contractSources?.length ? (
                selectedCoach.contractSources.map((source) => (
                  <a href={source} target="_blank" rel="nofollow noreferrer noopener" key={source}>
                    {sourceLabel(source)}
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                ))
              ) : (
                <span>Not published</span>
              )}
            </div>
          </nav>

          <section className="db-calculator" aria-labelledby="buyout-calculator-title">
            <div className="db-calculator__heading">
              <span className="db-calculator__icon">
                <Calculator size={23} aria-hidden="true" />
              </span>
              <div>
                <span className="db-eyebrow">Interactive estimate</span>
                <h3 id="buyout-calculator-title" className="font-display">
                  Buyout calculator
                </h3>
                <p>Adjust only known or explicitly estimated inputs. The result is editorial context, not legal advice.</p>
              </div>
            </div>
            <div className="db-slider-grid">
              <label htmlFor="guarantee-slider">
                <span>
                  <span>Guarantee remaining</span>
                  <output htmlFor="guarantee-slider">{publishedMoney(guaranteed)}</output>
                </span>
                <input
                  id="guarantee-slider"
                  type="range"
                  min="0"
                  max={guaranteeMax}
                  step="250000"
                  value={guaranteed}
                  aria-valuetext={publishedMoney(guaranteed)}
                  onChange={(event) => setGuaranteed(Number(event.target.value))}
                />
              </label>
              <label htmlFor="offset-slider">
                <span>
                  <span>Estimated offset</span>
                  <output htmlFor="offset-slider">
                    {selectedCoach.mitigationApplies
                      ? publishedMoney(offset)
                      : "Not applicable"}
                  </output>
                </span>
                <input
                  id="offset-slider"
                  type="range"
                  min="0"
                  max={offsetMax}
                  step="250000"
                  value={offset}
                  disabled={!selectedCoach.mitigationApplies}
                  aria-valuetext={
                    selectedCoach.mitigationApplies
                      ? publishedMoney(offset)
                      : "Not applicable"
                  }
                  onChange={(event) => setOffset(Number(event.target.value))}
                />
              </label>
            </div>
            <div className="db-calculator__result" aria-live="polite">
              <span>Computed net obligation</span>
              <strong className="font-display">{estimatedNet}</strong>
              <small>{buyout.formula}</small>
            </div>
          </section>
        </article>
      </section>
    </div>
  );
}
