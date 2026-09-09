"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowRight, ChevronDown, ShieldCheck, SlidersHorizontal } from "lucide-react";
import type { FantasyNote } from "@/lib/cfb-dataset";
import type { Team } from "@/lib/types";
import {
  DataBoardEmpty,
  DataBoardHero,
  DataBoardSummary,
  formatDataDate,
} from "./data-board-primitives";
import { MobileDataCard, MobileDataCardStack } from "./polish/mobile-data-card";
import { BoardSkeleton } from "./polish/skeletons";

interface FantasyNotesBoardProps {
  cleanMode: boolean;
  onModeRequest: () => void;
  notes: readonly FantasyNote[];
  teams: readonly Team[];
  asOf: string | null;
  context: string | null;
}

function availabilityTone(value: string | null) {
  if (value === "active") return "active";
  if (value === "questionable" || value === "doubtful") return "questionable";
  return "inactive";
}

function ExpandableData({ value }: { value: string | null }) {
  if (!value) return <span className="db-unpublished">Not published</span>;
  return (
    <details className="db-inline-expand">
      <summary>
        <span>{value}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </summary>
      <p>{value}</p>
    </details>
  );
}

function CleanModeGate({ onModeRequest }: { onModeRequest: () => void }) {
  return (
    <div className="db-page db-page--fantasy">
      <DataBoardHero
        eyebrow="Data board · Optional analysis"
        title="Fantasy stays behind a deliberate choice."
        description="Clean Mode keeps fantasy and market context out of view while preserving every scores, teams, rankings, and watch surface."
      />
      <section className="apex-container db-clean-gate" aria-labelledby="fantasy-gate-title">
        <div className="db-clean-gate__icon">
          <ShieldCheck size={34} aria-hidden="true" />
        </div>
        <div>
          <span className="db-eyebrow">Clean Mode active</span>
          <h2 id="fantasy-gate-title" className="font-display">
            Fantasy context, when you ask for it.
          </h2>
          <p>
            Review the optional disclosure to see reported roles, usage notes,
            availability, and published analyst ranks. CFB Apex does not invent
            salaries or point projections.
          </p>
          <button type="button" onClick={onModeRequest}>
            Review disclosure
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}

export function FantasyNotesBoard({
  cleanMode,
  onModeRequest,
  notes,
  teams,
  asOf,
  context,
}: FantasyNotesBoardProps) {
  const [position, setPosition] = useState("All positions");
  const [teamFilter, setTeamFilter] = useState("All teams");
  const [isPending, startTransition] = useTransition();
  const teamBySlug = useMemo(
    () => new Map(teams.map((team) => [team.slug, team])),
    [teams],
  );
  const representedTeams = useMemo(
    () =>
      [...new Set(notes.map((note) => note.team))]
        .map((slug) => teamBySlug.get(slug))
        .filter((team): team is Team => Boolean(team))
        .sort((a, b) => a.shortName.localeCompare(b.shortName)),
    [notes, teamBySlug],
  );
  const positions = useMemo(
    () => ["All positions", ...new Set(notes.map((note) => note.position).filter(Boolean))],
    [notes],
  );
  const filteredNotes = useMemo(
    () =>
      notes.filter(
        (note) =>
          (position === "All positions" || note.position === position) &&
          (teamFilter === "All teams" || note.team === teamFilter),
      ),
    [notes, position, teamFilter],
  );

  if (cleanMode) return <CleanModeGate onModeRequest={onModeRequest} />;

  return (
    <div className="db-page db-page--fantasy">
      <DataBoardHero
        eyebrow="Data board · Fantasy notes"
        title="Roles, usage, and availability—as reported."
        description={`Week 1 college-fantasy notes compiled ${formatDataDate(asOf)} from analyst boards, official depth charts, and beat reporting. Every projection retains its outlet label.`}
        action={
          <a className="db-hero-link" href="/responsible-gaming">
            Analysis policy
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        }
      />
      <DataBoardSummary
        label="Fantasy notes dataset summary"
        items={[
          { label: "Players noted", value: notes.length, emphasis: true },
          { label: "Programs", value: new Set(notes.map((note) => note.team)).size },
          { label: "Analyst ranks", value: notes.filter((note) => note.projection).length },
          {
            label: "Not fully available",
            value: notes.filter((note) => note.availability !== "active").length,
          },
        ]}
      />

      <section className="apex-container db-section db-section--table" aria-labelledby="fantasy-table-title">
        <div className="db-table-toolbar">
          <div>
            <span className="db-eyebrow">Week 1 intelligence</span>
            <h2 id="fantasy-table-title" className="font-display">
              Fantasy notes board
            </h2>
          </div>
          <fieldset className="db-filters">
            <legend className="sr-only">Filter fantasy notes</legend>
            <SlidersHorizontal size={18} aria-hidden="true" />
            <label>
              <span>Position</span>
              <select value={position} onChange={(event) => startTransition(() => setPosition(event.target.value))}>
                {positions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Team</span>
              <select value={teamFilter} onChange={(event) => startTransition(() => setTeamFilter(event.target.value))}>
                <option value="All teams">All teams</option>
                {representedTeams.map((team) => (
                  <option key={team.slug} value={team.slug}>
                    {team.shortName}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
        </div>
        <p className="db-result-count" aria-live="polite">
          Showing <strong>{filteredNotes.length}</strong> of {notes.length} player notes
        </p>

        {isPending ? (
          <BoardSkeleton rows={3} />
        ) : filteredNotes.length ? (
          <>
            <section className="db-table-wrap db-desktop-data-table" tabIndex={0} aria-label="Scrollable Week 1 fantasy notes table">
            <table className="db-table db-table--fantasy">
              <caption>{context ?? "Compilation context not published."}</caption>
              <thead>
                <tr>
                  <th scope="col">Player</th>
                  <th scope="col">Position</th>
                  <th scope="col">Team</th>
                  <th scope="col">Reported role</th>
                  <th scope="col">Usage note</th>
                  <th scope="col">Availability</th>
                  <th scope="col">Analyst projection</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotes.map((note) => {
                  const team = teamBySlug.get(note.team);
                  return (
                    <tr className="db-data-row" key={note.id}>
                      <td data-label="Player" className="db-primary-cell">
                        <strong>{note.player}</strong>
                        <span>{note.class ?? "Class not published"}</span>
                        {note.injury ? <small>{note.injury}</small> : null}
                      </td>
                      <td data-label="Position">
                        <span className="db-position-tag">{note.position ?? "—"}</span>
                      </td>
                      <td data-label="Team">
                        {team ? (
                          <a className="db-team-link" href={`/teams/${team.slug}`}>
                            {team.shortName}
                          </a>
                        ) : (
                          note.team
                        )}
                      </td>
                      <td data-label="Reported role">
                        <ExpandableData value={note.role} />
                      </td>
                      <td data-label="Usage note">
                        <ExpandableData value={note.usage} />
                      </td>
                      <td data-label="Availability">
                        <span className={`db-availability db-availability--${availabilityTone(note.availability)}`}>
                          {note.availability ?? "Not published"}
                        </span>
                      </td>
                      <td data-label="Analyst projection" className="db-projection">
                        <strong>{note.projection?.value ?? "Not published"}</strong>
                        {note.projection?.outlet ? <span>{note.projection.outlet}</span> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
          <MobileDataCardStack label="Fantasy player notes">
            {filteredNotes.map((note) => {
              const team = teamBySlug.get(note.team);
              return (
                <MobileDataCard
                  key={`mobile-${note.id}`}
                  title={note.player}
                  subtitle={note.class ?? "Class not published"}
                  summary={[
                    { label: "Position", value: note.position ?? "—" },
                    { label: "Team", value: team?.shortName ?? note.team },
                    { label: "Availability", value: note.availability ?? "Not published" },
                  ]}
                  details={[
                    { label: "Reported role", value: note.role ?? "Not published" },
                    { label: "Usage note", value: note.usage ?? "Not published" },
                    { label: "Injury note", value: note.injury ?? "None published" },
                    {
                      label: "Analyst projection",
                      value: note.projection
                        ? `${note.projection.value} · ${note.projection.outlet}`
                        : "Not published",
                    },
                  ]}
                  action={team ? (
                    <a href={`/teams/${team.slug}`}>
                      Open team hub
                      <ArrowRight aria-hidden="true" />
                    </a>
                  ) : undefined}
                />
              );
            })}
          </MobileDataCardStack>
          </>
        ) : (
          <DataBoardEmpty
            title="No notes match"
            description="Change the position or team filter to return to the published board."
            action={
              <button
                type="button"
                onClick={() => startTransition(() => {
                  setPosition("All positions");
                  setTeamFilter("All teams");
                })}
              >
                Clear filters
              </button>
            }
          />
        )}

        <aside className="db-responsible-note">
          <ShieldCheck size={19} aria-hidden="true" />
          <p>
            Published roles and analyst ranks are informational, not a guarantee of
            availability or performance.
          </p>
          <a href="/responsible-gaming">Responsible gaming</a>
        </aside>
      </section>
    </div>
  );
}
