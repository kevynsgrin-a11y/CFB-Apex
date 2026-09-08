"use client";

import { ChevronDown, Layers, ShieldCheck } from "lucide-react";
import type { TeamHubProps } from "@/lib/team-hub";
import {
  dateLabel,
  HubEmpty,
  HubHeading,
  HubLink,
  HubSection,
  published,
} from "./ui";

export function RosterSection({
  roster,
  depth,
  coach,
  injuries,
  injuriesAsOf,
  fantasy,
}: Pick<
  TeamHubProps,
  "roster" | "depth" | "coach" | "injuries" | "injuriesAsOf" | "fantasy"
>) {
  const groups =
    roster?.position_groups.filter((group) => group.players.length > 0) ?? [];
  const count = groups.reduce(
    (total, group) => total + group.players.length,
    0,
  );
  return (
    <HubSection id="roster">
      <HubHeading eyebrow="THE LOCKER ROOM" title="Meet the roster">
        <span className="hub-muted">
          {count ? `${count} players listed` : "Roster coverage unavailable"}
        </span>
      </HubHeading>
      <div className="hub-roster-layout">
        <div className="hub-card">
          <div className="hub-card-heading">
            <h3>Position groups</h3>
            <span className="hub-muted">Expand to explore</span>
          </div>
          {groups.length ? (
            groups.map((group) => (
              <details className="hub-accordion" key={group.name}>
                <summary>
                  <span className="hub-position font-display">
                    {group.name}
                  </span>
                  <span className="hub-roster-preview">
                    {group.players
                      .slice(0, 2)
                      .map((player) => player.name)
                      .join(" · ")}
                  </span>
                  <span className="hub-count">{group.players.length}</span>
                  <ChevronDown size={18} aria-hidden="true" />
                </summary>
                <div className="hub-player-list">
                  {group.players.map((player, index) => (
                    <div className="hub-player" key={`${player.name}-${index}`}>
                      <span className="hub-jersey">
                        {player.jersey == null ? "—" : `#${player.jersey}`}
                      </span>
                      <div>
                        <strong>{player.name}</strong>
                        <p>
                          {published(player.position)} ·{" "}
                          {player.class ?? "Class not published"}
                        </p>
                      </div>
                      <span className="hub-measurements">
                        {[
                          player.height,
                          player.weight
                            ? `${player.weight}${/lb/i.test(player.weight) ? "" : " lb"}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Measurements not published"}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            ))
          ) : (
            <HubEmpty title="Roster not available for this team">
              The current research package does not include a published player
              roster for this program.
            </HubEmpty>
          )}
        </div>
        <aside className="hub-roster-aside">
          <div className="hub-card hub-coach">
            <span className="hub-eyebrow">LEADING THE PROGRAM</span>
            <h3 className="font-display">
              {coach?.name ?? roster?.head_coach ?? "Coach not published"}
            </h3>
            <p>Head coach</p>
            {coach ? (
              <HubLink href={`/coaches/${coach.slug}`}>Coach profile</HubLink>
            ) : null}
          </div>
          <div className="hub-card hub-roster-note">
            <ShieldCheck size={22} aria-hidden="true" />
            <h3>A roster, not a projection.</h3>
            <p>
              Names and measurements come from the research dataset. Missing
              details stay unpublished.
            </p>
          </div>
        </aside>
      </div>
      <details className="hub-card hub-depth">
        <summary>
          <Layers size={20} aria-hidden="true" />
          <div>
            <strong>Inside the depth chart</strong>
            <span>
              {depth?.status ? `${depth.status.replaceAll("_", " ")} · ` : ""}
              First string by unit
            </span>
          </div>
          <ChevronDown size={20} aria-hidden="true" />
        </summary>
        {depth?.units.length ? (
          <div className="hub-depth-body">
            <p className="hub-muted">
              {depth.status_caveat ??
                "Depth order reflects the published chart; it is not a guarantee of playing time."}
            </p>
            <div className="hub-depth-grid">
              {depth.units.map((unit) => (
                <div key={unit.unit}>
                  <h3 className="hub-eyebrow">
                    {unit.unit.replaceAll("_", " ")}
                  </h3>
                  {unit.positions.map((position, positionIndex) => {
                    const first = position.depth.find(
                      (slot) => slot.rank === 1,
                    );
                    return (
                      <div className="hub-depth-row" key={`${position.position}-${positionIndex}`}>
                        <span>{position.position}</span>
                        <strong>
                          {first?.players
                            .map((player) => player.name)
                            .join(" / ") || "Not published"}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <HubEmpty title="Depth chart not available for this team">
            No verified first-string listing is included in the current dataset.
          </HubEmpty>
        )}
      </details>
      <details className="hub-card hub-depth">
        <summary>
          <ShieldCheck size={20} aria-hidden="true" />
          <div>
            <strong>Availability & fantasy notebook</strong>
            <span>
              Reported roles and player status · {dateLabel(injuriesAsOf)}
            </span>
          </div>
          <ChevronDown size={20} aria-hidden="true" />
        </summary>
        <div className="hub-depth-body hub-notebook">
          <div>
            <h3>Availability report</h3>
            {injuries?.players.length ? (
              injuries.players.map((player, index) => (
                <div
                  className="hub-notebook-row"
                  key={`${player.name}-${index}`}
                >
                  <strong>{player.name}</strong>
                  <p>
                    {published(player.position)} · {published(player.status)}
                    {player.injury ? ` · ${player.injury}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="hub-muted">
                {injuries
                  ? "No players listed in the latest published report."
                  : "Not published for this team."}
              </p>
            )}
          </div>
          <div>
            <h3>Fantasy notes</h3>
            {fantasy.length ? (
              fantasy.map((note) => (
                <div className="hub-notebook-row" key={note.id}>
                  <strong>
                    {note.player} · {published(note.position)}
                  </strong>
                  <p>{note.role ?? note.usage ?? "Role not published"}</p>
                  <span className="hub-muted">
                    As of {dateLabel(note.as_of)} ·{" "}
                    {published(note.availability)}
                  </span>
                </div>
              ))
            ) : (
              <p className="hub-muted">
                No published fantasy notes for this team.
              </p>
            )}
          </div>
        </div>
      </details>
    </HubSection>
  );
}
