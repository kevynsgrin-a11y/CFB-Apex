"use client";

import { useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Switch from "@radix-ui/react-switch";
import {
  ArrowRight,
  ChevronDown,
  Menu,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import type { BroadcastTeam } from "@/lib/homepage";
import { ApexLogo, TeamMark } from "./primitives";

const navigation = [
  { label: "Scores", href: "/scores" },
  { label: "Teams", href: "/teams" },
  { label: "Rankings", href: "/rankings" },
  { label: "Watch", href: "/watch" },
  { label: "Injuries", href: "/injuries" },
  { label: "Fantasy", href: "/dfs" },
  { label: "No Names", href: "/no-names" },
  { label: "Heisman", href: "/heisman" },
  { label: "Highlight", href: "/highlight" },
  { label: "NIL", href: "/nil" },
  { label: "The Panel", href: "/panel" },
  { label: "Portal", href: "/transfer-portal" },
  { label: "Coaches", href: "/coaches" },
  { label: "Stadiums", href: "/stadiums" },
  { label: "More Sports ↗", href: "https://sports-always.com", external: true },
];

/** Drawer sections: every surface on the site, grouped for scanning. */
const navSections: Array<{ label: string; items: typeof navigation }> = [
  {
    label: "Season",
    items: [
      { label: "Scores", href: "/scores" },
      { label: "Teams", href: "/teams" },
      { label: "Rankings", href: "/rankings" },
      { label: "Watch", href: "/watch" },
      { label: "Injuries", href: "/injuries" },
    ],
  },
  {
    label: "Features",
    items: [
      { label: "Fantasy", href: "/dfs" },
      { label: "No Names", href: "/no-names" },
      { label: "Heisman", href: "/heisman" },
      { label: "Highlight", href: "/highlight" },
      { label: "NIL", href: "/nil" },
      { label: "The Panel", href: "/panel" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Transfer Portal", href: "/transfer-portal" },
      { label: "Coaches", href: "/coaches" },
      { label: "Stadiums", href: "/stadiums" },
      { label: "Search", href: "/search" },
    ],
  },
  {
    label: "Network",
    items: [
      { label: "More Sports ↗", href: "https://sports-always.com", external: true },
    ],
  },
];

interface HeaderProps {
  teams: readonly BroadcastTeam[];
  activePath: string;
  cleanMode: boolean;
  onCleanModeChange: (enabled: boolean) => void;
}

export function BroadcastHeader({
  teams,
  activePath,
  cleanMode,
  onCleanModeChange,
}: HeaderProps) {
  const [panel, setPanel] = useState<"teams" | "search" | "menu" | null>(null);
  const [query, setQuery] = useState("");
  const filteredTeams = useMemo(
    () =>
      teams.filter((team) =>
        `${team.name} ${team.abbreviation} ${team.conference}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [teams, query],
  );
  const conferences = [
    ...new Set(filteredTeams.map((team) => team.conference)),
  ].sort((a, b) => a.localeCompare(b));
  const triggerRef = useRef<HTMLElement | null>(null);
  const openPanel = (next: typeof panel) => {
    triggerRef.current = document.activeElement as HTMLElement;
    setQuery("");
    setPanel(next);
  };

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="apex-header">
        <div className="apex-header-inner apex-container">
          <button
            type="button"
            className={`apex-menu-toggle${panel === "menu" ? " is-open" : ""}`}
            onClick={() => openPanel("menu")}
            aria-haspopup="dialog"
            aria-expanded={panel === "menu"}
          >
            <Menu size={16} aria-hidden="true" />
            <span>All features</span>
            <b className="apex-menu-toggle-count">{navigation.length}</b>
          </button>
          <ApexLogo />
          <nav className="apex-primary-nav" aria-label="Primary navigation">
            {navigation.map((item) =>
              item.href === "/teams" ? (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => openPanel("teams")}
                  aria-haspopup="dialog"
                  aria-expanded={panel === "teams"}
                  className={
                    activePath.startsWith("/teams") ? "is-active" : undefined
                  }
                >
                  Teams
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
              ) : "external" in item && item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--primary)" }}
                >
                  {item.label}
                </a>
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={
                    activePath.startsWith(item.href) ? "page" : undefined
                  }
                  className={
                    activePath === "/" && item.href === "/scores"
                      ? "is-active"
                      : undefined
                  }
                >
                  {item.label}
                </a>
              ),
            )}
          </nav>
          <div className="apex-header-actions">
            <button
              className="apex-icon-button"
              type="button"
              aria-label="Search teams and CFB Apex"
              onClick={() => openPanel("search")}
            >
              <Search size={20} aria-hidden="true" />
            </button>
            <div className="apex-clean-control">
              <label htmlFor="apex-clean-mode">
                <ShieldCheck size={16} aria-hidden="true" />
                <span>Clean Mode</span>
              </label>
              <Switch.Root
                id="apex-clean-mode"
                className="apex-switch"
                checked={cleanMode}
                onCheckedChange={onCleanModeChange}
                aria-describedby="clean-mode-description"
              >
                <Switch.Thumb className="apex-switch-thumb" />
              </Switch.Root>
              <span id="clean-mode-description" className="sr-only">
                Hides betting offers and analyst fantasy ranks. Turning off
                opens an optional analysis disclosure.
              </span>
            </div>

          </div>
        </div>
      </header>
      <Dialog.Root
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="apex-dialog-overlay" />
          <Dialog.Content
            className={`apex-menu-panel${panel === "search" ? " apex-menu-panel--search" : ""}`}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              triggerRef.current?.focus();
            }}
          >
            <div className="apex-menu-heading">
              <div>
                <Dialog.Title className="font-display">
                  {panel === "search" ? "Find your edge." : panel === "menu" ? "Every feature. One panel." : "Find your team."}
                </Dialog.Title>
                <Dialog.Description>
                  {panel === "menu"
                    ? "The whole site, grouped: season coverage, weekly features, and the intelligence boards."
                    : `${teams.length} programs. Every conference. One place.`}
                </Dialog.Description>
              </div>
              <Dialog.Close
                className="apex-icon-button"
                aria-label="Close menu"
              >
                <X size={24} aria-hidden="true" />
              </Dialog.Close>
            </div>
            <div className="apex-search-field">
              <Search size={20} aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a team or conference…"
                aria-label="Search teams or conferences"
                autoComplete="off"
              />
            </div>
            {panel === "menu" && (
              <nav className="apex-drawer-nav" aria-label="All navigation">
                {navSections.map((section) => (
                  <section key={section.label} className="apex-drawer-section">
                    <h3 className="apex-eyebrow">{section.label}</h3>
                    <div className="apex-drawer-links">
                      {section.items.map((item) => (
                        <a
                          href={item.href}
                          key={item.href}
                          {...("external" in item && item.external
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                        >
                          {item.label}
                          <ArrowRight size={16} aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  </section>
                ))}
              </nav>
            )}
            <div className="apex-menu-results" aria-live="polite">
              <span className="sr-only">
                {filteredTeams.length} teams found
              </span>
              {filteredTeams.length === 0 ? (
                <p className="apex-empty">
                  No teams found for “{query}”. Try a school name or conference.
                </p>
              ) : (
                <div className="apex-conference-grid">
                  {conferences.map((conference) => (
                    <section key={conference}>
                      <h3 className="apex-eyebrow">{conference}</h3>
                      <div className="apex-conference-teams">
                        {filteredTeams
                          .filter((team) => team.conference === conference)
                          .map((team) => (
                            <a href={`/teams/${team.slug}`} key={team.slug}>
                              <TeamMark team={team} size="xs" />
                              <span>{team.shortName}</span>
                            </a>
                          ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
            <a
              className="apex-text-link apex-menu-all"
              href={
                panel === "search" && query.trim()
                  ? `/search?q=${encodeURIComponent(query.trim())}`
                  : panel === "search"
                    ? "/search"
                    : "/teams"
              }
            >
              {panel === "search"
                ? "Search all teams, coaches, and players"
                : `Explore all ${teams.length} FBS teams`}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
