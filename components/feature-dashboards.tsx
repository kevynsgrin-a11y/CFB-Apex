/**
 * Feature dashboards: No Names, Heisman Watch, NIL Watch, AI Panel.
 * All use the broadcast design system (apex-* classes).
 */
import { useMemo, useState } from "react";
import { Trophy, Star, GraduationCap, DollarSign, Brain, Users, TrendingUp, ShieldAlert, ExternalLink } from "lucide-react";
import { noNames, noNamesByPosition, noNamesTeamCounts, type NoNamePlayer } from "@/lib/no-names";
import { teams, getTeamBySlug } from "@/lib/cfb-dataset";

/* ================================================================ No Names */

export function NoNamesPage() {
  const [position, setPosition] = useState("All");
  const [query, setQuery] = useState("");
  const positions = ["All", ...noNamesByPosition().slice(0, 12).map((p) => p.position)];
  const topTeams = noNamesTeamCounts().slice(0, 8);
  const posBreakdown = noNamesByPosition().slice(0, 8);

  const filtered = useMemo(() => {
    let rows = noNames;
    if (position !== "All") rows = rows.filter((p) => p.position === position);
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((p) => p.player.toLowerCase().includes(q) || p.team.includes(q));
    }
    return rows.slice(0, 200);
  }, [position, query]);

  return (
    <div className="apex-home" style={{ paddingTop: 32 }}>
      <div className="apex-container">
        <div className="apex-home-intro">
          <div>
            <span className="apex-eyebrow">THE BATTLE OF THE NO NAMES</span>
            <h1>Unrated. Under-recruited. Overdelivering.</h1>
            <p>Tracking every unrated and 2-star recruit on FBS rosters. At season's end, one player lifts the Breakout Star Award.</p>
          </div>
          <span className="apex-season-label"><span /><span className="apex-season-word">2026</span> SEASON</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
          <StatCard icon={<Users size={20} />} label="Qualifying players" value={noNames.length.toLocaleString()} />
          <StatCard icon={<Trophy size={20} />} label="Programs with no-names" value={noNamesTeamCounts().length.toString()} />
          <StatCard icon={<Star size={20} />} label="Highest rated qualifier" value="2-star" />
          <StatCard icon={<TrendingUp size={20} />} label="Award" value="Breakout Star" gold />
        </div>

        <div className="apex-lane">
          <div className="apex-lane-heading">
            <div>
              <span className="apex-eyebrow">BY THE NUMBERS</span>
              <h2>Where the no-names are</h2>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div className="apex-portal-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
              {topTeams.map(({ team, count }) => {
                const t = getTeamBySlug(team);
                return (
                  <div key={team} className="apex-portal-card" style={{ padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{t?.shortName ?? team}</span>
                      <b style={{ color: "var(--accent)", fontSize: 20, fontFamily: "var(--display-family)" }}>{count}</b>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="apex-rating-strip" style={{ flexWrap: "wrap" }}>
              {posBreakdown.map(({ position: pos, count }) => (
                <div key={pos} className="apex-rating-item" style={{ minWidth: 120, padding: "12px 16px" }}>
                  <div>
                    <strong style={{ fontSize: 20 }}>{count}</strong>
                    <small>{pos}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="apex-lane">
          <div className="apex-lane-heading">
            <div>
              <span className="apex-eyebrow">QUALIFYING PLAYERS</span>
              <h2>Browse the pool</h2>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <select value={position} onChange={(e) => setPosition(e.target.value)} style={{ background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 14 }}>
              {positions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search player or team…" style={{ background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 14, flex: 1, minWidth: 200 }} />
            <span style={{ color: "var(--muted-foreground)", fontSize: 14, alignSelf: "center" }}>{filtered.length} shown</span>
          </div>
          <div style={{ maxHeight: 400, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 12 }}>
            {filtered.map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: i < filtered.length - 1 ? "1px solid color-mix(in srgb, var(--border) 60%, transparent)" : "none" }}>
                <span style={{ width: 36, textAlign: "center", fontFamily: "var(--display-family)", fontSize: 18, color: "var(--muted-foreground)" }}>{p.jersey ?? "–"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.player}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                    {p.position ?? "?"} · {getTeamBySlug(p.team)?.shortName ?? p.team} {p.class ? `· ${p.class}` : ""}
                  </div>
                </div>
                <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, background: p.stars === 2 ? "rgba(245,185,66,.12)" : "var(--secondary)", color: p.stars === 2 ? "var(--primary)" : "var(--muted-foreground)", fontWeight: 600 }}>
                  {p.stars === 2 ? "2★" : "Unrated"}
                </span>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 12, fontSize: 13, color: "var(--muted-foreground)" }}>
            Performance tracking, snap counts, and breakout candidates populate as the season progresses. The Breakout Star Award is presented after the final week.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================== Heisman Watch */

const HEISMAN_METHODOLOGY = [
  { component: "Statistical Production", weight: "40%", description: "Individual offense, scrimmage yards, TDs, PFF grade, EPA contribution — weighted by position group." },
  { component: "Team Success", weight: "25%", description: "Team winning percentage, AP/Coaches ranking, conference championship likelihood. Heisman winners come from top-10 teams." },
  { component: "Expert Consensus", weight: "20%", description: "Aggregation of published Heisman watch lists from ESPN, The Athletic, CBS Sports, Yahoo, On3." },
  { component: "Public Sentiment", weight: "15%", description: "Betting odds movement, social volume, Google Trends. The Heisman is partly a narrative award." },
];

export function HeismanPage() {
  return (
    <div className="apex-home" style={{ paddingTop: 32 }}>
      <div className="apex-container">
        <div className="apex-home-intro">
          <div>
            <span className="apex-eyebrow">HEISMAN TROPHY WATCH</span>
            <h1>The most outstanding player in college football</h1>
            <p>Our top-10 ranking debuts after Week 3. Until then, here's the methodology.</p>
          </div>
          <span className="apex-season-label"><span /><span className="apex-season-word">2026</span> SEASON</span>
        </div>

        <div className="apex-lane" style={{ textAlign: "center", padding: "48px 24px", border: "1px solid var(--border)", borderRadius: 16, background: "var(--card)" }}>
          <Trophy size={48} style={{ color: "var(--primary)", marginBottom: 16 }} aria-hidden />
          <h2 style={{ fontSize: 28, textTransform: "uppercase", marginBottom: 8 }}>Watch List Pending</h2>
          <p style={{ color: "var(--muted-foreground)", maxWidth: 480, margin: "0 auto" }}>
            The first data-driven Heisman Watch ranking publishes after Week 3 concludes (September 19).
            Three weeks of film, stats, and results give every candidate a real sample size.
          </p>
          <div style={{ marginTop: 20, display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, background: "color-mix(in srgb, var(--primary) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 25%, transparent)" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)", fontFamily: "var(--display-family)", letterSpacing: 1 }}>LAUNCHES SEP 20</span>
          </div>
        </div>

        <div className="apex-lane">
          <div className="apex-lane-heading">
            <div>
              <span className="apex-eyebrow">METHODOLOGY</span>
              <h2>How we rank</h2>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
            {HEISMAN_METHODOLOGY.map((m, i) => (
              <div key={m.component} className="apex-portal-card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700 }}>{m.component}</h3>
                  <span style={{ fontSize: 22, fontFamily: "var(--display-family)", fontWeight: 700, color: "var(--accent)" }}>{m.weight}</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>{m.description}</p>
                <div style={{ marginTop: 12, height: 4, borderRadius: 2, background: "var(--secondary)" }}>
                  <div style={{ height: "100%", borderRadius: 2, background: "var(--primary)", width: m.weight }} />
                </div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 16, fontSize: 13, color: "var(--muted-foreground)" }}>
            Every score is justifiable by a cited source or public data. Components without published data are scored null — never estimated.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================ NIL Watch */

export function NILWatchPage() {
  return (
    <div className="apex-home" style={{ paddingTop: 32 }}>
      <div className="apex-container">
        <div className="apex-home-intro">
          <div>
            <span className="apex-eyebrow">NIL DEAL TRACKER</span>
            <h1>Verified deals, sourced and linked</h1>
            <p>Every NIL deal in our tracker is verified by a news source. No rumors, no estimates, no speculation.</p>
          </div>
          <span className="apex-season-label"><span /><span className="apex-season-word">2026</span> SEASON</span>
        </div>

        <div className="apex-lane" style={{ textAlign: "center", padding: "48px 24px", border: "1px solid var(--border)", borderRadius: 16, background: "var(--card)" }}>
          <DollarSign size={48} style={{ color: "var(--accent)", marginBottom: 16 }} aria-hidden />
          <h2 style={{ fontSize: 28, textTransform: "uppercase", marginBottom: 8 }}>Building the Database</h2>
          <p style={{ color: "var(--muted-foreground)", maxWidth: 480, margin: "0 auto" }}>
            We're compiling verified NIL deals from official announcements, brand press releases, and major outlet reporting.
            Each deal links to its primary news source. Deals without disclosed values are listed without values — we never estimate.
          </p>
        </div>

        <div className="apex-lane">
          <div className="apex-lane-heading">
            <div>
              <span className="apex-eyebrow">WHAT WE TRACK</span>
              <h2>Deal categories</h2>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {[
              { label: "Brand Partnerships", desc: "Endorsement deals with companies" },
              { label: "Collectives", desc: "Booster-funded NIL collectives" },
              { label: "Group Licensing", desc: "Team-wide licensing agreements" },
              { label: "Appearances", desc: "Paid events, camps, autographs" },
              { label: "Social Influence", desc: "Content creation, influencer deals" },
              { label: "Camp Instructors", desc: "Youth camp coaching deals" },
            ].map((cat) => (
              <div key={cat.label} style={{ padding: 16, border: "1px solid var(--border)", borderRadius: 12, background: "var(--card)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{cat.label}</h3>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{cat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================ AI Panel */

const AI_PANELISTS = [
  {
    name: "Frank Mitchell",
    alias: "The Bulwark",
    specialty: "Traditionalist · Trenches · Defense",
    color: "#C4B5FD",
    philosophy: "Football is won at the line of scrimmage. Everything else is noise.",
    background: "40 years covering the game. Former offensive line coach at two Power 4 programs. Believes the forward pass was a mistake the sport never corrected.",
    icon: "🛡️",
  },
  {
    name: "Quinn Vance",
    alias: "The Quant",
    specialty: "Analytics · Efficiency · SP+",
    color: "#67E8F9",
    philosophy: "Feel is just data you didn't write down. The numbers don't lie — people do.",
    background: "Former Wall Street quant who left finance for football. Lives by SP+, EPA, success rate, and PPA. Thinks the eye test is confirmation bias with confidence.",
    icon: "📊",
  },
  {
    name: "Sandra Okafor",
    alias: "The Scout",
    specialty: "Talent Evaluation · Traits · Development",
    color: "#FDA4AF",
    philosophy: "The numbers tell you what happened. They don't always tell you why, or what's coming next.",
    background: "15 years as a D1 scouting director. Evaluates through traits: arm strength, speed, frame, bend. Respects analytics but thinks they miss developmental context.",
    icon: "🔍",
  },
];

export function AIPanelPage() {
  return (
    <div className="apex-home" style={{ paddingTop: 32 }}>
      <div className="apex-container">
        <div className="apex-home-intro">
          <div>
            <span className="apex-eyebrow">THE PANEL · WEEKLY DEBATE</span>
            <h1>Three minds. One game. Zero agreement.</h1>
            <p>Three football analysts with conflicting philosophies break down the week's biggest games, make picks, and argue about it.</p>
          </div>
          <span className="apex-season-label"><span /><span className="apex-season-word">2026</span> SEASON</span>
        </div>

        <div className="apex-lane" style={{ textAlign: "center", padding: "48px 24px", border: "1px solid var(--border)", borderRadius: 16, background: "var(--card)" }}>
          <Brain size={48} style={{ color: "var(--accent)", marginBottom: 16 }} aria-hidden />
          <h2 style={{ fontSize: 28, textTransform: "uppercase", marginBottom: 8 }}>First Debate Drops After Week 1 Results</h2>
          <p style={{ color: "var(--muted-foreground)", maxWidth: 480, margin: "0 auto" }}>
            The panel analyzes the AP Top 10 teams and the five biggest games each week, using real stats from our dataset.
            Each analyst produces independent picks and rebuttals from their own philosophy.
          </p>
        </div>

        <div className="apex-lane">
          <div className="apex-lane-heading">
            <div>
              <span className="apex-eyebrow">MEET THE PANEL</span>
              <h2>Three philosophies, zero overlap</h2>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr)), gap: 16" }}>
            {AI_PANELISTS.map((p) => (
              <div key={p.alias} style={{ padding: 24, border: `1px solid ${p.color}33`, borderRadius: 16, background: `linear-gradient(135deg, ${p.color}08, transparent)`, position: "relative" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }} aria-hidden>{p.icon}</div>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: p.color, fontWeight: 600, marginBottom: 4 }}>{p.alias}</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{p.name}</h3>
                <p style={{ fontSize: 13, color: p.color, fontWeight: 600, marginBottom: 12 }}>{p.specialty}</p>
                <blockquote style={{ fontSize: 14, fontStyle: "italic", color: "var(--foreground)", borderLeft: `3px solid ${p.color}`, paddingLeft: 12, marginBottom: 12 }}>
                  "{p.philosophy}"
                </blockquote>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6 }}>{p.background}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="apex-lane">
          <div className="apex-lane-heading">
            <div>
              <span className="apex-eyebrow">HOW IT WORKS</span>
              <h2>Weekly format</h2>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            {[
              { step: "01", title: "Game Selection", desc: "Five biggest games of the week, selected by stakes, rankings, and rivalry weight." },
              { step: "02", title: "Independent Analysis", desc: "Each analyst gets the same data package (stats, SP+, betting lines) and produces their own breakdown." },
              { step: "03", title: "Picks & Predictions", desc: "Each panelist picks winners with confidence levels and key matchups to watch." },
              { step: "04", title: "Cross-Examination", desc: "Each analyst responds to the others' picks, explaining where and why they disagree." },
            ].map((s) => (
              <div key={s.step} style={{ padding: 20, border: "1px solid var(--border)", borderRadius: 12, background: "var(--card)" }}>
                <div style={{ fontFamily: "var(--display-family)", fontSize: 32, fontWeight: 800, color: "color-mix(in srgb, var(--primary) 40%, var(--card))", marginBottom: 8 }}>{s.step}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 16, fontSize: 13, color: "var(--muted-foreground)" }}>
            The panel consumes the same verified dataset that powers this site. Every stat cited in a debate links back to our sources. No fabricated analysis, ever.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================ Shared */

function StatCard({ icon, label, value, gold }: { icon: React.ReactNode; label: string; value: string; gold?: boolean }) {
  return (
    <div style={{ padding: 18, border: "1px solid var(--border)", borderRadius: 12, background: "var(--card)", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: gold ? "color-mix(in srgb, var(--primary) 15%, var(--card))" : "var(--secondary)", color: gold ? "var(--primary)" : "var(--muted-foreground)" }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: "var(--display-family)", fontSize: 24, fontWeight: 700, color: gold ? "var(--primary)" : "var(--foreground)" }}>{value}</div>
        <div style={{ fontSize: 12, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      </div>
    </div>
  );
}
